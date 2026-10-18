"""
Vòng train + chấm các fold người lạ dùng chung cho EmoNet và ViT.
Model cụ thể được mô tả bằng ModelSpec (cách tạo model, cách đưa ảnh vào, siêu tham số).
"""

import copy
import csv
import os
import time
from dataclasses import dataclass
from typing import Callable

import numpy as np
import torch
import torch.nn.functional as F

from augment import augment_batch
from cv_common import evaluate, lr_at, make_folds, sample_weights, summarize, write_report
from emonet import EMOTIONS

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


@dataclass
class ModelSpec:
    name: str
    make_model: Callable
    to_input: Callable   # ảnh [0,1] N×1×96×96 -> đầu vào model
    logits: Callable     # (model, đầu vào) -> logits N×5
    lr: float
    weight_decay: float
    batch: int
    epoch_size: int      # số ảnh rút mỗi epoch
    max_epochs: int
    patience: int        # dừng sớm khi điểm val không tăng sau bấy nhiêu epoch
    warmup: float
    label_smoothing: float = 0.1
    own_share: float = 0.2


def _autocast():
    return torch.autocast("cuda", dtype=torch.bfloat16, enabled=DEVICE.type == "cuda")


@torch.no_grad()
def predict(model, spec, images, idx, batch=512):
    """Xác suất 5 lớp, trung bình ảnh gốc + ảnh lật ngang (giống server)."""
    model.eval()
    idx_t = torch.as_tensor(idx, dtype=torch.long)
    out = []
    for s in range(0, len(idx_t), batch):
        x = images[idx_t[s:s + batch].to(images.device)].to(DEVICE).float() / 255
        with _autocast():
            p = (torch.softmax(spec.logits(model, spec.to_input(x)).float(), 1)
                 + torch.softmax(spec.logits(model, spec.to_input(torch.flip(x, dims=[3]))).float(), 1))
        out.append((p / 2).cpu())
    return torch.cat(out).numpy() if out else np.zeros((0, len(EMOTIONS)))


def fit(spec, images, labels, rows, train_idx, epochs, score_fn=None, seed=42, log=print):
    """Train `epochs` epoch. Có score_fn: dừng sớm + nạp lại trọng số có điểm val cao nhất."""
    torch.manual_seed(seed)
    model = spec.make_model().to(DEVICE)
    opt = torch.optim.AdamW(model.parameters(), lr=spec.lr, weight_decay=spec.weight_decay)
    weights = sample_weights(rows, train_idx, spec.own_share)
    train_t = torch.as_tensor(train_idx, dtype=torch.long)
    draw_gen = torch.Generator().manual_seed(seed)
    aug_gen = torch.Generator(device=DEVICE).manual_seed(seed)
    steps = max(1, spec.epoch_size // spec.batch)
    best_score, best_epoch, best_state, bad = -1.0, epochs, None, 0
    history = []
    for epoch in range(epochs):
        model.train()
        t0 = time.time()
        total = torch.zeros((), device=DEVICE)
        draws = train_t[torch.multinomial(weights, steps * spec.batch, replacement=True, generator=draw_gen)]
        for s in range(steps):
            idx = draws[s * spec.batch:(s + 1) * spec.batch]
            x = augment_batch(images[idx.to(images.device)].to(DEVICE).float() / 255, aug_gen)
            y = labels[idx].to(DEVICE)
            for group in opt.param_groups:
                group["lr"] = lr_at(epoch + s / steps, spec.lr, spec.warmup, epochs)
            with _autocast():
                logits = spec.logits(model, spec.to_input(x))
            loss = F.cross_entropy(logits.float(), y, label_smoothing=spec.label_smoothing)
            opt.zero_grad(set_to_none=True)
            loss.backward()
            opt.step()
            total += loss.detach()
        entry = {"epoch": epoch + 1, "loss": round(total.item() / steps, 4), "sec": round(time.time() - t0, 1)}
        if score_fn:
            entry["val"] = round(score_fn(model), 4)
            if entry["val"] > best_score:
                best_score, best_epoch, bad = entry["val"], epoch + 1, 0
                best_state = copy.deepcopy(model.state_dict())
            else:
                bad += 1
        history.append(entry)
        log(entry)
        if score_fn and bad >= spec.patience:
            break
    if best_state is not None:
        model.load_state_dict(best_state)  # sửa lỗi bản cũ: luôn chấm bằng checkpoint tốt nhất
    return model, best_epoch, history


def run_cv(spec, rows, images, labels, out_dir, folds_to_run=None, log=print):
    folds = make_folds(rows)
    if folds_to_run is not None:
        folds = [folds[k] for k in folds_to_run]
    y = labels.numpy()
    results, oof = [], []
    for f in folds:
        log(f"\n=== {spec.name} fold {f['fold'] + 1}: test {f['test_people']}, val {f['val_person']} ===")

        def score(model, f=f):
            pub = evaluate(y[f["val_public_idx"]], predict(model, spec, images, f["val_public_idx"]).argmax(1))
            per = evaluate(y[f["val_person_idx"]], predict(model, spec, images, f["val_person_idx"]).argmax(1))
            log(f"    val: công khai {pub['macro_f1']:.3f} · {f['val_person']} {per['macro_f1']:.3f}")
            return 0.5 * pub["macro_f1"] + 0.5 * per["macro_f1"]

        model, best_epoch, history = fit(spec, images, labels, rows, f["train_idx"], spec.max_epochs,
                                         score, seed=42 + f["fold"], log=log)
        probs = predict(model, spec, images, f["test_idx"])
        pred = probs.argmax(1)
        test_y = y[f["test_idx"]]
        per_person = {}
        for p in f["test_people"]:
            mask = np.array([rows[i]["person"] == p for i in f["test_idx"]])
            per_person[p] = evaluate(test_y[mask], pred[mask])
        public = evaluate(y[f["val_public_idx"]], predict(model, spec, images, f["val_public_idx"]).argmax(1))
        fold_result = {"fold": f["fold"], "test_people": f["test_people"], "val_person": f["val_person"],
                       "best_epoch": best_epoch, "history": history, "test": evaluate(test_y, pred),
                       "per_person": per_person, "public": public}
        results.append(fold_result)
        log(f"  -> test acc {fold_result['test']['accuracy']:.3f}, macro-F1 {fold_result['test']['macro_f1']:.3f}")
        for j, i in enumerate(f["test_idx"]):
            row = {"path": rows[i]["path"], "orig": rows[i]["orig"], "person": rows[i]["person"],
                   "label": rows[i]["label"], "pred": EMOTIONS[pred[j]], "prob_pred": round(float(probs[j, pred[j]]), 4)}
            row.update({f"p_{e}": round(float(probs[j, c]), 4) for c, e in enumerate(EMOTIONS)})
            oof.append(row)
        del model
        if DEVICE.type == "cuda":
            torch.cuda.empty_cache()

    config = {k: v for k, v in vars(spec).items() if isinstance(v, (int, float, str))}
    result = {"name": spec.name, "config": config, "folds": results, "summary": summarize(results)}
    write_report(f"{spec.name}_cv", result, out_dir)
    with open(os.path.join(out_dir, f"{spec.name}_oof.csv"), "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(oof[0].keys()))
        writer.writeheader()
        writer.writerows(oof)
    return result


def run_final(spec, rows, images, labels, epochs, log=print):
    """Model cuối: mọi ảnh 'train' (mọi người tự chụp), số epoch cố định, không dừng sớm."""
    train_idx = [i for i, r in enumerate(rows) if r["split_hint"] == "train"]
    model, _, history = fit(spec, images, labels, rows, train_idx, epochs, None, seed=42, log=log)
    return model, history

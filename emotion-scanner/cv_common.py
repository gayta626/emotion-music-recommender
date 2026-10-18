"""
Phần dùng chung khi train + chấm EmoNet và ViT (không phụ thuộc model nào):
đọc manifest, chia fold THEO NGƯỜI (2 người/fold), trọng số lấy mẫu, chấm điểm, ghi báo cáo.

Chia fold: người tự chụp xáo theo seed, chia đều 2 người/fold làm "đề thi"
(model không thấy họ khi train). Trong 8 người còn lại rút 1 người làm tập val
(dừng sớm) -> 2 người test chỉ dùng để chấm, không dùng để chọn model.
"""

import csv
import json
import math
import os
import random
import statistics

import cv2
import numpy as np
import torch
from sklearn.metrics import confusion_matrix, f1_score

from emonet import EMOTIONS, INPUT_SIZE


def load_manifest(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_images(rows):
    out = np.empty((len(rows), 1, INPUT_SIZE, INPUT_SIZE), np.uint8)
    for i, r in enumerate(rows):
        img = cv2.imread(r["path"], cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise FileNotFoundError(r["path"])
        out[i, 0] = img
    return torch.from_numpy(out)


def labels_of(rows):
    return torch.tensor([EMOTIONS.index(r["label"]) for r in rows], dtype=torch.long)


def make_folds(rows, n_splits=None, seed=42):
    own = [i for i, r in enumerate(rows) if r["source"] == "own"]
    people = sorted({rows[i]["person"] for i in own})
    random.Random(seed).shuffle(people)
    public_train = [i for i, r in enumerate(rows) if r["source"] != "own" and r["split_hint"] == "train"]
    public_holdout = [i for i, r in enumerate(rows) if r["split_hint"] == "public_holdout"]
    folds = []
    n_splits = n_splits or len(people) // 2  # mặc định 2 người/fold (10 người -> 5 fold, 8 người -> 4 fold)
    for k in range(n_splits):
        test_people = sorted(people[k::n_splits])
        rest = sorted(set(people) - set(test_people))
        val_person = rest[k % len(rest)]
        folds.append({
            "fold": k,
            "test_people": test_people,
            "val_person": val_person,
            "train_idx": public_train + [i for i in own if rows[i]["person"] not in test_people
                                         and rows[i]["person"] != val_person],
            "val_public_idx": public_holdout,
            "val_person_idx": [i for i in own if rows[i]["person"] == val_person],
            "test_idx": [i for i in own if rows[i]["person"] in test_people],
        })
    return folds


def sample_weights(rows, idx, own_share=0.2):
    """Trọng số rút ảnh: ảnh tự chụp chiếm own_share mỗi batch, trong từng nhóm 5 lớp ngang nhau."""
    groups = ["own" if rows[i]["source"] == "own" else "public" for i in idx]
    counts = {}
    for g, i in zip(groups, idx):
        key = (g, rows[i]["label"])
        counts[key] = counts.get(key, 0) + 1
    labels_in = {g: len({lab for (gg, lab) in counts if gg == g}) for g in set(groups)}
    share = {"own": own_share, "public": 1 - own_share} if len(labels_in) == 2 else {g: 1.0 for g in labels_in}
    w = [share[g] / (labels_in[g] * counts[(g, rows[i]["label"])]) for g, i in zip(groups, idx)]
    return torch.tensor(w, dtype=torch.double)


def evaluate(y_true, y_pred):
    y_true, y_pred = np.asarray(y_true), np.asarray(y_pred)
    present = sorted(set(y_true.tolist()))
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(EMOTIONS))))
    recall = {}
    for c, name in enumerate(EMOTIONS):
        total = cm[c].sum()
        recall[name] = float(cm[c, c] / total) if total else None
    return {
        "n": int(len(y_true)),
        "accuracy": float((y_true == y_pred).mean()) if len(y_true) else 0.0,
        # macro-F1 chỉ tính trên lớp có mặt (người thiếu 1 cảm xúc không bị tính 0 oan)
        "macro_f1": float(f1_score(y_true, y_pred, labels=present, average="macro", zero_division=0)),
        "recall": recall,
        "confusion": cm.tolist(),
    }


def lr_at(t, base_lr, warmup, total):
    """Learning rate tại epoch t (số thực): tăng tuyến tính trong warmup rồi giảm theo cosine về 0."""
    if t < warmup:
        return base_lr * max(t, 0.01) / warmup
    progress = min(1.0, (t - warmup) / max(1e-9, total - warmup))
    return base_lr * 0.5 * (1 + math.cos(math.pi * progress))


def _mean_std(values):
    return {"mean": statistics.mean(values), "std": statistics.pstdev(values)}


def summarize(fold_results):
    confusion = np.sum([f["test"]["confusion"] for f in fold_results], axis=0)
    recall = {}
    for name in EMOTIONS:
        vals = [f["test"]["recall"][name] for f in fold_results if f["test"]["recall"][name] is not None]
        recall[name] = statistics.mean(vals) if vals else None
    return {
        "test_accuracy": _mean_std([f["test"]["accuracy"] for f in fold_results]),
        "test_macro_f1": _mean_std([f["test"]["macro_f1"] for f in fold_results]),
        "public_macro_f1": _mean_std([f["public"]["macro_f1"] for f in fold_results]),
        "recall": recall,
        "confusion": confusion.tolist(),
        "best_epochs": [f["best_epoch"] for f in fold_results],
    }


def _pct(v):
    return "—" if v is None else f"{v * 100:.1f}%"


def write_report(name, result, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, f"{name}.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    s = result["summary"]
    lines = [
        f"# Kết quả {len(result['folds'])} fold người lạ — {result['name']}",
        "",
        f"**Trung bình ± độ lệch qua {len(result['folds'])} fold:** "
        f"accuracy {_pct(s['test_accuracy']['mean'])} ± {_pct(s['test_accuracy']['std'])} · "
        f"macro-F1 {_pct(s['test_macro_f1']['mean'])} ± {_pct(s['test_macro_f1']['std'])} · "
        f"macro-F1 val công khai {_pct(s['public_macro_f1']['mean'])} (cũng dùng để dừng sớm nên không phải điểm test)",
        "",
        "| Fold | Người test | Người val | Epoch tốt nhất | Acc test | Macro-F1 test | Macro-F1 val công khai |",
        "|---|---|---|---|---|---|---|",
    ]
    for f in result["folds"]:
        lines.append(f"| {f['fold'] + 1} | {', '.join(f['test_people'])} | {f['val_person']} | {f['best_epoch']} | "
                     f"{_pct(f['test']['accuracy'])} | {_pct(f['test']['macro_f1'])} | {_pct(f['public']['macro_f1'])} |")
    lines += ["", "## Từng người lạ (recall từng cảm xúc)", "",
              "| Người | Ảnh | Acc | Macro-F1 | " + " | ".join(EMOTIONS) + " |",
              "|---" * (4 + len(EMOTIONS)) + "|"]
    for f in result["folds"]:
        for person, r in f["per_person"].items():
            lines.append(f"| {person} | {r['n']} | {_pct(r['accuracy'])} | {_pct(r['macro_f1'])} | "
                         + " | ".join(_pct(r["recall"][e]) for e in EMOTIONS) + " |")
    lines += ["", "**Recall trung bình:** " + " · ".join(f"{e} {_pct(s['recall'][e])}" for e in EMOTIONS),
              "", "## Confusion matrix cộng dồn (hàng = thật, cột = đoán)", "",
              "| Thật \\ Đoán | " + " | ".join(EMOTIONS) + " |", "|---" * (1 + len(EMOTIONS)) + "|"]
    for e, row in zip(EMOTIONS, s["confusion"]):
        lines.append(f"| {e} | " + " | ".join(str(v) for v in row) + " |")
    with open(os.path.join(out_dir, f"{name}.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

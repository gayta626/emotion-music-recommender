"""
THỬ NGHIỆM tăng macro-F1 của EmoNet (14/10/2026). Không đụng tới model đang dùng (my_emonet/).
Mỗi biến thể train 3 seed trên CÙNG 4 fold người lạ -> báo điểm từng seed (độ dao động do may rủi)
và điểm GHÉP 3 seed (trung bình xác suất).

    PYTHONUTF8=1 python experiment_emonet.py base      # như hiện tại, 3 seed
    PYTHONUTF8=1 python experiment_emonet.py full      # không dừng sớm: train đủ 30 epoch, lấy bản cuối
    PYTHONUTF8=1 python experiment_emonet.py pubonly   # CHỈ ảnh công khai (đo xem ảnh tự chụp có ích không)
    PYTHONUTF8=1 python experiment_emonet.py mixup     # + mixup (trộn 2 ảnh và 2 nhãn)
    PYTHONUTF8=1 python experiment_emonet.py teacher   # train ViT làm thầy cho từng fold (không thấy người test)
    PYTHONUTF8=1 python experiment_emonet.py kd        # EmoNet học thêm theo xác suất của thầy (cần chạy teacher trước)

Kết quả: results/exp_<tên>.md / .json
    PYTHONUTF8=1 python experiment_emonet.py kd --final   # model cuối -> my_emonet/emonet_kd.pt (không ghi đè emonet.pt)
"""
import argparse
import copy
import json
import os
import statistics
import sys

import numpy as np
import torch
import torch.nn.functional as F

from augment import augment_batch
from cv_common import evaluate, labels_of, load_images, load_manifest, lr_at, make_folds, sample_weights
from cv_train import DEVICE, _autocast, fit, predict
from emonet import EMOTIONS
from train_emonet import MANIFEST, RESULTS, SPEC

SEEDS = [42, 1042, 2042]
TEACHER_DIR = os.path.join("emonet_checkpoints", "teacher")


def fit_variant(spec, images, labels, rows, train_idx, epochs, score_fn, seed, mixup=0.0, teacher=None,
                kd_weight=0.5, kd_t=2.0, select=True, log=print):
    """Bản sao cv_train.fit + mixup / học theo thầy (knowledge distillation).
    select=False: train đủ `epochs` theo lịch cosine rồi lấy bản CUỐI (không dừng sớm / chọn theo điểm val nhiễu)."""
    torch.manual_seed(seed)
    model = spec.make_model().to(DEVICE)
    opt = torch.optim.AdamW(model.parameters(), lr=spec.lr, weight_decay=spec.weight_decay)
    weights = sample_weights(rows, train_idx, spec.own_share)
    train_t = torch.as_tensor(train_idx, dtype=torch.long)
    draw_gen = torch.Generator().manual_seed(seed)
    aug_gen = torch.Generator(device=DEVICE).manual_seed(seed)
    beta = torch.distributions.Beta(mixup, mixup) if mixup else None
    steps = max(1, spec.epoch_size // spec.batch)
    best_score, best_epoch, best_state, bad = -1.0, epochs, None, 0
    for epoch in range(epochs):
        model.train()
        draws = train_t[torch.multinomial(weights, steps * spec.batch, replacement=True, generator=draw_gen)]
        for s in range(steps):
            idx = draws[s * spec.batch:(s + 1) * spec.batch]
            x = augment_batch(images[idx.to(images.device)].to(DEVICE).float() / 255, aug_gen)
            y = labels[idx].to(DEVICE)
            target = F.one_hot(y, len(EMOTIONS)).float() * (1 - spec.label_smoothing) + spec.label_smoothing / len(EMOTIONS)
            soft = teacher[idx].to(DEVICE) if teacher is not None else None
            if beta is not None:
                lam = beta.sample().item()
                perm = torch.randperm(len(idx), device=DEVICE)
                x = lam * x + (1 - lam) * x[perm]
                target = lam * target + (1 - lam) * target[perm]
                if soft is not None:
                    soft = lam * soft + (1 - lam) * soft[perm]
            for group in opt.param_groups:
                group["lr"] = lr_at(epoch + s / steps, spec.lr, spec.warmup, epochs)
            with _autocast():
                logits = spec.logits(model, spec.to_input(x)).float()
            loss = -(target * F.log_softmax(logits, 1)).sum(1).mean()
            if soft is not None:
                # thầy: xác suất ViT (đã làm mềm bằng nhiệt độ kd_t), trò bắt chước phân bố đó
                t_soft = F.softmax(torch.log(soft.clamp_min(1e-6)) / kd_t, 1)
                kd = F.kl_div(F.log_softmax(logits / kd_t, 1), t_soft, reduction="batchmean") * kd_t ** 2
                loss = (1 - kd_weight) * loss + kd_weight * kd
            opt.zero_grad(set_to_none=True)
            loss.backward()
            opt.step()
        if not select:
            log(f"  epoch {epoch + 1}")
            continue
        val = score_fn(model)
        log(f"  epoch {epoch + 1}: val {val:.4f}")
        if val > best_score:
            best_score, best_epoch, bad = val, epoch + 1, 0
            best_state = copy.deepcopy(model.state_dict())
        else:
            bad += 1
            if bad >= spec.patience:
                break
    if select:
        model.load_state_dict(best_state)
    return model, best_epoch


def score_fn_for(spec, images, y, f, public_only=False):
    def score(model):
        pub = evaluate(y[f["val_public_idx"]], predict(model, spec, images, f["val_public_idx"]).argmax(1))
        if public_only:
            return pub["macro_f1"]
        per = evaluate(y[f["val_person_idx"]], predict(model, spec, images, f["val_person_idx"]).argmax(1))
        return 0.5 * pub["macro_f1"] + 0.5 * per["macro_f1"]
    return score


def run_teacher(rows, images, labels):
    """ViT cho từng fold, train KHÔNG có 2 người test -> xác suất trên mọi ảnh (người test không dùng tới)."""
    from train_vit_baseline import SPEC as VIT_SPEC
    os.makedirs(TEACHER_DIR, exist_ok=True)
    y = labels.numpy()
    for f in make_folds(rows):
        out = os.path.join(TEACHER_DIR, f"fold{f['fold']}.npy")
        if os.path.isfile(out):
            continue
        print(f"\n=== thầy ViT fold {f['fold'] + 1}: test {f['test_people']} ===", flush=True)
        model, _, _ = fit(VIT_SPEC, images, labels, rows, f["train_idx"], VIT_SPEC.max_epochs,
                          score_fn_for(VIT_SPEC, images, y, f), seed=42 + f["fold"])
        probs = predict(model, VIT_SPEC, images, list(range(len(rows))), batch=256)
        np.save(out, probs.astype(np.float16))
        del model
        torch.cuda.empty_cache()


def run_variant(name, rows, images, labels):
    y = labels.numpy()
    folds = make_folds(rows)
    per_seed = {s: [] for s in SEEDS}
    ens_folds, best_epochs = [], []
    for f in folds:
        teacher = None
        if name == "kd":
            path = os.path.join(TEACHER_DIR, f"fold{f['fold']}.npy")
            if not os.path.isfile(path):
                raise SystemExit("Chưa có xác suất của thầy: chạy 'experiment_emonet.py teacher' trước")
            teacher = torch.from_numpy(np.load(path).astype(np.float32))
            teacher[torch.as_tensor(f["test_idx"])] = float("nan")  # chắc chắn không dùng tới người test
        train_idx = f["train_idx"]
        if name == "pubonly":  # bỏ hẳn ảnh tự chụp khỏi train và khỏi chọn checkpoint
            train_idx = [i for i in train_idx if rows[i]["source"] != "own"]
        probs_sum = 0
        for seed in SEEDS:
            print(f"\n=== {name} fold {f['fold'] + 1} seed {seed}: test {f['test_people']} ===", flush=True)
            model, best = fit_variant(SPEC, images, labels, rows, train_idx, SPEC.max_epochs,
                                      score_fn_for(SPEC, images, y, f, public_only=name == "pubonly"), seed + f["fold"],
                                      mixup=0.4 if name == "mixup" else 0.0, teacher=teacher,
                                      select=name != "full")
            probs = predict(model, SPEC, images, f["test_idx"])
            r = evaluate(y[f["test_idx"]], probs.argmax(1))
            print(f"  -> seed {seed}: acc {r['accuracy']:.3f}, macro-F1 {r['macro_f1']:.3f}", flush=True)
            per_seed[seed].append(r)
            best_epochs.append(best)
            probs_sum = probs_sum + probs
            del model
            torch.cuda.empty_cache()
        r = evaluate(y[f["test_idx"]], probs_sum.argmax(1))
        print(f"  => GHÉP 3 seed fold {f['fold'] + 1}: acc {r['accuracy']:.3f}, macro-F1 {r['macro_f1']:.3f}", flush=True)
        ens_folds.append(r)

    def mean_std(rs, key):
        v = [r[key] for r in rs]
        return statistics.mean(v), statistics.pstdev(v)

    out = {"name": name, "seeds": SEEDS, "best_epochs": best_epochs,
           "per_seed": {s: {k: mean_std(rs, k) for k in ("accuracy", "macro_f1")} for s, rs in per_seed.items()},
           "ensemble": {k: mean_std(ens_folds, k) for k in ("accuracy", "macro_f1")},
           "ensemble_folds": [{k: r[k] for k in ("accuracy", "macro_f1")} for r in ens_folds]}
    single = [out["per_seed"][s]["macro_f1"][0] for s in SEEDS]
    lines = [f"# Thử nghiệm EmoNet — {name}", "",
             "| | Acc (TB 4 fold) | Macro-F1 (TB 4 fold) |", "|---|---|---|"]
    for s in SEEDS:
        a, m = out["per_seed"][s]["accuracy"], out["per_seed"][s]["macro_f1"]
        lines.append(f"| seed {s} | {a[0]:.1%} ± {a[1]:.1%} | {m[0]:.1%} ± {m[1]:.1%} |")
    a, m = out["ensemble"]["accuracy"], out["ensemble"]["macro_f1"]
    lines += [f"| **ghép 3 seed** | **{a[0]:.1%} ± {a[1]:.1%}** | **{m[0]:.1%} ± {m[1]:.1%}** |", "",
              f"Macro-F1 1 seed: thấp nhất {min(single):.1%}, cao nhất {max(single):.1%} (dao động do may rủi). "
              f"Epoch tốt nhất: {best_epochs}"]
    os.makedirs(RESULTS, exist_ok=True)
    with open(os.path.join(RESULTS, f"exp_{name}.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
    with open(os.path.join(RESULTS, f"exp_{name}.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n" + "\n".join(lines), flush=True)


def run_final(name, rows, images, labels):
    """Model cuối của biến thể `name` trên MỌI người tự chụp, lưu RIÊNG my_emonet/emonet_<name>.pt
    (không ghi đè emonet.pt đang dùng). kd: train thầy ViT trên mọi người trước (số epoch = trung vị các fold)."""
    from emonet import save_emonet
    train_idx = [i for i, r in enumerate(rows) if r["split_hint"] == "train"]
    with open(os.path.join(RESULTS, f"exp_{name}.json"), encoding="utf-8") as fh:
        exp = json.load(fh)
    epochs = SPEC.max_epochs if name == "full" else max(1, round(statistics.median(exp["best_epochs"])))
    teacher = None
    if name == "kd":
        from train_vit_baseline import SPEC as VIT_SPEC
        path = os.path.join(TEACHER_DIR, "final.npy")
        if not os.path.isfile(path):
            with open(os.path.join(RESULTS, "vit_cv.json"), encoding="utf-8") as fh:
                vit_epochs = max(1, round(statistics.median(json.load(fh)["summary"]["best_epochs"])))
            print(f"\n=== thầy ViT cuối: {vit_epochs} epoch trên mọi người ===", flush=True)
            vit, _, _ = fit(VIT_SPEC, images, labels, rows, train_idx, vit_epochs, None, seed=42)
            np.save(path, predict(vit, VIT_SPEC, images, list(range(len(rows))), batch=256).astype(np.float16))
            del vit
            torch.cuda.empty_cache()
        teacher = torch.from_numpy(np.load(path).astype(np.float32))
    print(f"\n=== EmoNet cuối ({name}): {epochs} epoch trên mọi người ===", flush=True)
    model, _ = fit_variant(SPEC, images, labels, rows, train_idx, epochs, None, 42, teacher=teacher, select=False)
    out = os.path.join("my_emonet", f"emonet_{name}.pt")
    save_emonet(model.cpu(), out, extra={"epochs": epochs, "variant": name})
    print(f"✓ Đã lưu {out} ({os.path.getsize(out) / 1e6:.1f} MB)", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("variant", choices=["base", "full", "pubonly", "mixup", "teacher", "kd"])
    ap.add_argument("--final", action="store_true", help="train model cuối của biến thể (sau khi đã chấm các fold)")
    args = ap.parse_args()
    rows = load_manifest(MANIFEST)
    print(f"Thiết bị: {DEVICE} · {len(rows)} ảnh · đang nạp ảnh...", flush=True)
    images = load_images(rows).to(DEVICE)
    labels = labels_of(rows)
    if args.final:
        run_final(args.variant, rows, images, labels)
    elif args.variant == "teacher":
        run_teacher(rows, images, labels)
    else:
        run_variant(args.variant, rows, images, labels)


if __name__ == "__main__":
    sys.exit(main())

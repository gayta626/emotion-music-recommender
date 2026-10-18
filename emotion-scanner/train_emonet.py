"""
BƯỚC 2 (mới): Train EmoNet TỪ ĐẦU + chấm k fold người lạ (2 người/fold).

Cách chạy (trong emotion-scanner/, cần GPU cho tốc độ):
    PYTHONUTF8=1 python train_emonet.py --smoke    # thử pipeline vài phút
    PYTHONUTF8=1 python train_emonet.py            # các fold + model cuối
    PYTHONUTF8=1 python train_emonet.py --cv       # chỉ chấm các fold
    PYTHONUTF8=1 python train_emonet.py --final    # chỉ model cuối (số epoch lấy từ results/emonet_cv.json)

Yêu cầu: đã chạy prepare_data.py.
Kết quả: results/emonet_cv.md (bảng cho báo cáo), results/emonet_oof.csv (cho review_labels.py),
         my_emonet/emonet.pt (model dùng cho server).
"""

import argparse
import dataclasses
import json
import os
import statistics

from cv_common import labels_of, load_images, load_manifest
from cv_train import DEVICE, ModelSpec, run_cv, run_final
from emonet import EmoNet, normalize, save_emonet

MANIFEST = os.path.join("data_public", "manifest.csv")
RESULTS = "results"
MODEL_PATH = os.path.join("my_emonet", "emonet.pt")

SPEC = ModelSpec(
    name="emonet",
    make_model=EmoNet,
    to_input=normalize,
    logits=lambda model, x: model(x),
    lr=1e-3,
    weight_decay=5e-4,
    batch=128,
    epoch_size=40_000,
    max_epochs=30,
    patience=10,  # điểm val dao động (người val chỉ ~100 ảnh) -> chờ lâu hơn để LR cosine kịp giảm
    warmup=2,
)


def smoke_rows(rows):
    """Tập nhỏ để thử pipeline: mọi ảnh tự chụp + 400 ảnh công khai train + 100 ảnh để riêng."""
    own = [r for r in rows if r["source"] == "own"]
    pub = [r for r in rows if r["source"] != "own" and r["split_hint"] == "train"][:400]
    hold = [r for r in rows if r["split_hint"] == "public_holdout"][:100]
    return own + pub + hold


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cv", action="store_true", help="chỉ chấm các fold")
    ap.add_argument("--final", action="store_true", help="chỉ train model cuối")
    ap.add_argument("--smoke", action="store_true", help="chạy thử nhanh trên tập nhỏ")
    ap.add_argument("--epochs", type=int, help="số epoch model cuối (mặc định: trung vị epoch tốt nhất của các fold)")
    args = ap.parse_args()
    do_cv = args.cv or not args.final
    do_final = args.final or not args.cv

    rows = load_manifest(MANIFEST)
    spec, results_dir, model_path = SPEC, RESULTS, MODEL_PATH
    if args.smoke:
        rows = smoke_rows(rows)
        spec = dataclasses.replace(SPEC, epoch_size=1024, max_epochs=1, patience=1)
        results_dir = os.path.join(RESULTS, "smoke")
        model_path = os.path.join("emonet_checkpoints", "smoke.pt")

    print(f"Thiết bị: {DEVICE} · {len(rows)} ảnh · đang nạp ảnh vào bộ nhớ...")
    images = load_images(rows).to(DEVICE)
    labels = labels_of(rows)

    if do_cv:
        run_cv(spec, rows, images, labels, results_dir, folds_to_run=[0] if args.smoke else None)
        print(f"\n✓ Báo cáo: {results_dir}/emonet_cv.md")

    if do_final:
        cv_path = os.path.join(results_dir, "emonet_cv.json")
        if args.epochs:
            epochs = args.epochs
        elif os.path.isfile(cv_path):
            with open(cv_path, encoding="utf-8") as f:
                cv_result = json.load(f)
            epochs = max(1, round(statistics.median(cv_result["summary"]["best_epochs"])))
        else:
            raise SystemExit("Chưa có results/emonet_cv.json: chấm các fold trước hoặc truyền --epochs N")
        print(f"\n=== Model cuối: {epochs} epoch trên mọi người tự chụp ===")
        model, history = run_final(spec, rows, images, labels, epochs)
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        save_emonet(model.cpu(), model_path, extra={"epochs": epochs})
        metrics = {"epochs": epochs, "history": history}
        if os.path.isfile(cv_path):
            with open(cv_path, encoding="utf-8") as f:
                metrics["cv_summary"] = json.load(f)["summary"]
        with open(os.path.join(os.path.dirname(model_path), "metrics.json"), "w", encoding="utf-8") as f:
            json.dump(metrics, f, ensure_ascii=False, indent=2)
        print(f"✓ Đã lưu {model_path} ({os.path.getsize(model_path) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()

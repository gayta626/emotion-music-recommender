"""
MỐC SO SÁNH: fine-tune ViT có sẵn (trpakov/vit-face-expression, đã học FER2013)
theo ĐÚNG quy trình của EmoNet (cùng manifest, cùng các fold người lạ, cùng lấy mẫu,
augmentation, cách chấm) -> bảng so sánh "model tự xây vs transfer learning".
Chỉ chấm các fold, không xuất model (server dùng EmoNet).

Cách chạy:  PYTHONUTF8=1 python train_vit_baseline.py [--smoke]     (~1.5-3 giờ GPU)
"""

import argparse
import dataclasses
import os

import torch.nn.functional as F
from transformers import AutoModelForImageClassification

from cv_common import labels_of, load_images, load_manifest
from cv_train import DEVICE, ModelSpec, run_cv
from emonet import EMOTIONS
from train_emonet import MANIFEST, RESULTS, smoke_rows

BASE_MODEL = "trpakov/vit-face-expression"


def make_vit():
    return AutoModelForImageClassification.from_pretrained(
        BASE_MODEL,
        num_labels=len(EMOTIONS),
        id2label=dict(enumerate(EMOTIONS)),
        label2id={e: i for i, e in enumerate(EMOTIONS)},
        ignore_mismatched_sizes=True,  # thay đầu phân loại 7 lớp FER2013 bằng 5 lớp
    )


def vit_input(x01):
    """Ảnh xám 96 [0,1] -> 224x224, 3 kênh, chuẩn hoá mean/std 0.5 như preprocessor của trpakov."""
    x = F.interpolate(x01, size=(224, 224), mode="bilinear", align_corners=False)
    return (x.repeat(1, 3, 1, 1) - 0.5) / 0.5


SPEC = ModelSpec(
    name="vit",
    make_model=make_vit,
    to_input=vit_input,
    logits=lambda model, x: model(pixel_values=x).logits,
    lr=2e-5,
    weight_decay=0.05,
    batch=64,
    epoch_size=40_000,
    max_epochs=8,
    patience=2,
    warmup=1,
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--smoke", action="store_true")
    args = ap.parse_args()
    rows = load_manifest(MANIFEST)
    spec, out_dir = SPEC, RESULTS
    if args.smoke:
        rows = smoke_rows(rows)
        spec = dataclasses.replace(SPEC, epoch_size=256, max_epochs=1, patience=1)
        out_dir = os.path.join(RESULTS, "smoke")
    print(f"Thiết bị: {DEVICE} · {len(rows)} ảnh")
    images = load_images(rows).to(DEVICE)
    run_cv(spec, rows, images, labels_of(rows), out_dir, folds_to_run=[0] if args.smoke else None)
    print(f"✓ Báo cáo: {out_dir}/vit_cv.md")


if __name__ == "__main__":
    main()

"""
BƯỚC 2/4: Fine-tune model bằng Transfer Learning (đóng băng backbone)
Đề tài: Hệ thống gợi ý nhạc theo cảm xúc (phiên bản Web)

KỸ THUẬT SỬ DỤNG - TRANSFER LEARNING CHUẨN:
  1. Lấy model Vision Transformer (ViT) đã huấn luyện sẵn trên tập ảnh
     tổng quát ImageNet-21k (google/vit-base-patch16-224-in21k). Model này
     CHƯA từng biết phân biệt cảm xúc, chỉ biết trích xuất đặc trưng hình ảnh.
  2. ĐÓNG BĂNG (freeze) toàn bộ phần backbone - các trọng số trích xuất
     đặc trưng KHÔNG thay đổi trong lúc huấn luyện.
  3. Thay lớp phân loại cuối (classifier head) bằng lớp mới có số lớp ra
     = số cảm xúc của bạn, rồi CHỈ huấn luyện lớp này bằng ảnh khuôn mặt
     bạn đã thu thập ở bước 1.
  => Đây chính là "AI học" thật sự: model học cách ánh xạ đặc trưng khuôn
     mặt của RIÊNG BẠN sang các nhãn cảm xúc, không phải so sánh ngưỡng cố định.

Cách cài đặt:
    pip install transformers torch torchvision pillow scikit-learn accelerate

Cách chạy:
    python 2_finetune_model.py

Yêu cầu: đã chạy xong 1_capture_data.py và có thư mục data/ chứa ảnh.
Kết quả: thư mục my_emotion_model/ (dùng cho bước 3 và web app).
"""

import os
import random
import torch
import numpy as np
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms
from sklearn.model_selection import train_test_split
from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    TrainingArguments,
    Trainer,
)

DATA_DIR = "data"
OUTPUT_DIR = "my_emotion_model"
BASE_MODEL = "google/vit-base-patch16-224-in21k"  # model tổng quát, CHƯA biết cảm xúc

EMOTIONS = ["neutral", "happy", "sad", "angry", "fear", "disgust", "surprise"]

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)


def load_dataset_paths():
    """Đọc đường dẫn ảnh + nhãn từ thư mục data/<emotion>/*.jpg, bỏ qua lớp thiếu ảnh."""
    paths, labels = [], []
    for emo in EMOTIONS:
        emo_dir = os.path.join(DATA_DIR, emo)
        if not os.path.isdir(emo_dir):
            continue
        files = [f for f in os.listdir(emo_dir) if f.lower().endswith((".jpg", ".png"))]
        if len(files) < 5:
            print(f"⚠ Bỏ qua '{emo}': chỉ có {len(files)} ảnh (cần tối thiểu 5).")
            continue
        for f in files:
            paths.append(os.path.join(emo_dir, f))
            labels.append(emo)
    return paths, labels


class FaceEmotionDataset(Dataset):
    """Dataset ảnh khuôn mặt cá nhân, có augmentation để tránh overfit trên tập dữ liệu nhỏ."""

    def __init__(self, paths, labels, label2id, processor, augment=False):
        self.paths = paths
        self.labels = labels
        self.label2id = label2id
        self.processor = processor
        self.augment = augment

        # Augmentation nhẹ: vì dữ liệu cá nhân thường ít (vài chục ảnh/lớp),
        # augmentation giúp model không học thuộc lòng từng ảnh mà học đặc trưng chung.
        self.aug_transform = transforms.Compose([
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
        ])

    def __len__(self):
        return len(self.paths)

    def __getitem__(self, idx):
        image = Image.open(self.paths[idx]).convert("RGB")
        if self.augment:
            image = self.aug_transform(image)
        inputs = self.processor(images=image, return_tensors="pt")
        pixel_values = inputs["pixel_values"].squeeze(0)
        label_id = self.label2id[self.labels[idx]]
        return {"pixel_values": pixel_values, "labels": torch.tensor(label_id)}


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=1)
    accuracy = (preds == labels).mean()
    return {"accuracy": accuracy}


def main():
    print("=== BƯỚC 2: FINE-TUNE MODEL (TRANSFER LEARNING) ===\n")

    paths, labels = load_dataset_paths()
    if len(paths) < 30:
        print(f"LỖI: chỉ có {len(paths)} ảnh tổng cộng, quá ít để huấn luyện.")
        print("Hãy chạy lại 1_capture_data.py và chụp thêm ảnh (khuyến nghị >= 25 ảnh/cảm xúc).")
        return

    present_emotions = sorted(set(labels))
    id2label = {i: e for i, e in enumerate(present_emotions)}
    label2id = {e: i for i, e in enumerate(present_emotions)}
    print(f"Các cảm xúc sẽ huấn luyện: {present_emotions}")
    print(f"Tổng số ảnh: {len(paths)}\n")

    train_paths, val_paths, train_labels, val_labels = train_test_split(
        paths, labels, test_size=0.15, random_state=SEED, stratify=labels
    )
    print(f"Tập train: {len(train_paths)} ảnh | Tập validation: {len(val_paths)} ảnh\n")

    print(f"Đang tải model gốc '{BASE_MODEL}' (chưa biết phân loại cảm xúc)...")
    processor = AutoImageProcessor.from_pretrained(BASE_MODEL)
    model = AutoModelForImageClassification.from_pretrained(
        BASE_MODEL,
        num_labels=len(present_emotions),
        id2label=id2label,
        label2id=label2id,
        ignore_mismatched_sizes=True,  # cho phép thay lớp phân loại cuối
    )

    # ====== ĐÓNG BĂNG BACKBONE - chỉ giữ classifier head có thể huấn luyện ======
    trainable_params = 0
    frozen_params = 0
    for name, param in model.named_parameters():
        if name.startswith("classifier"):
            param.requires_grad = True
            trainable_params += param.numel()
        else:
            param.requires_grad = False
            frozen_params += param.numel()

    print(f"\nĐã đóng băng backbone: {frozen_params:,} tham số KHÔNG huấn luyện.")
    print(f"Chỉ huấn luyện classifier head: {trainable_params:,} tham số.")
    print(f"(Tỉ lệ tham số học được: {100 * trainable_params / (trainable_params + frozen_params):.3f}%)\n")

    train_dataset = FaceEmotionDataset(train_paths, train_labels, label2id, processor, augment=True)
    val_dataset = FaceEmotionDataset(val_paths, val_labels, label2id, processor, augment=False)

    training_args = TrainingArguments(
        output_dir="./train_checkpoints",
        num_train_epochs=15,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        learning_rate=1e-3,  # lr cao hơn bình thường vì chỉ train 1 lớp nhỏ (head)
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=1,
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        logging_steps=5,
        report_to=[],
        seed=SEED,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
    )

    print("Bắt đầu huấn luyện classifier head...\n")
    trainer.train()

    print("\nĐánh giá cuối cùng trên tập validation:")
    eval_result = trainer.evaluate()
    print(f"  Accuracy: {eval_result['eval_accuracy']:.2%}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model.save_pretrained(OUTPUT_DIR)
    processor.save_pretrained(OUTPUT_DIR)
    print(f"\n✓ Đã lưu model đã fine-tune vào thư mục '{OUTPUT_DIR}/'")
    print("Tiếp theo: chạy 3_test_local.py để kiểm tra, hoặc dùng ngay trong backend web (bước 4).")


if __name__ == "__main__":
    main()

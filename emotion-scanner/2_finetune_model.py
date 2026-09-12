"""
BƯỚC 2/4: Fine-tune model bằng Transfer Learning (đóng băng backbone)
Đề tài: Hệ thống gợi ý nhạc theo cảm xúc (phiên bản Web)

KỸ THUẬT SỬ DỤNG - TRANSFER LEARNING CHUẨN:
  1. Lấy model Vision Transformer (ViT) ĐÃ ĐƯỢC huấn luyện sẵn để nhận diện
     cảm xúc trên tập FER2013 (trpakov/vit-face-expression, ~35.000 ảnh,
     7 cảm xúc). Model này đã có "kiến thức nền" về cảm xúc nói chung, giúp
     việc học tiếp theo dễ dàng và ổn định hơn so với dùng model tổng quát.
  2. ĐÓNG BĂNG (freeze) phần lớn backbone - các trọng số trích xuất đặc
     trưng đã học từ FER2013 gần như giữ nguyên, chỉ mở khóa 2 lớp cuối.
  3. Thay/tinh chỉnh lớp phân loại cuối (classifier head) theo đúng 5 cảm
     xúc của bạn, rồi huấn luyện tiếp bằng ảnh khuôn mặt bạn (+ bạn bè) đã
     thu thập ở bước 1 - CÁ NHÂN HÓA model từ nền tảng cảm xúc tổng quát.
  => Đây vẫn là "AI học" thật sự: model không chỉ so sánh ngưỡng cố định,
     mà học cách tinh chỉnh kiến thức cảm xúc có sẵn theo RIÊNG khuôn mặt
     và biểu cảm của bạn - transfer learning ở 2 tầng (FER2013 -> cá nhân).

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
import torch.nn as nn

DATA_DIR = "data"
OUTPUT_DIR = "my_emotion_model"
# Đổi từ model tổng quát (ImageNet, không biết cảm xúc) sang model ĐÃ được
# huấn luyện sẵn trên FER2013 (~35.000 ảnh, 7 cảm xúc) - giúp model có sẵn
# "kiến thức nền" về cảm xúc trước khi fine-tune tiếp bằng ảnh cá nhân của
# bạn, đặc biệt hữu ích khi data cá nhân còn hạn chế (~150-200 ảnh/lớp).
BASE_MODEL = "trpakov/vit-face-expression"

EMOTIONS = ["neutral", "happy", "sad", "angry", "surprise"]

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


class WeightedTrainer(Trainer):
    """
    Trainer tùy chỉnh: phạt nặng hơn khi model đoán sai các lớp CÓ ÍT ảnh.
    Giúp chống hiện tượng "model collapse" - model học cách chỉ đoán 1 nhãn
    duy nhất (thường là nhãn có nhiều ảnh nhất) để tối thiểu hóa sai số trung
    bình, thay vì thực sự học phân biệt từng cảm xúc.
    """

    def __init__(self, *args, class_weights=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.class_weights = class_weights

    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        logits = outputs.logits
        loss_fct = nn.CrossEntropyLoss(weight=self.class_weights.to(logits.device))
        loss = loss_fct(logits, labels)
        return (loss, outputs) if return_outputs else loss


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

    print(f"Đang tải model gốc '{BASE_MODEL}' (đã biết cảm xúc từ FER2013, sẽ fine-tune tiếp theo bạn)...")
    processor = AutoImageProcessor.from_pretrained(BASE_MODEL)
    model = AutoModelForImageClassification.from_pretrained(
        BASE_MODEL,
        num_labels=len(present_emotions),
        id2label=id2label,
        label2id=label2id,
        ignore_mismatched_sizes=True,  # cho phép thay lớp phân loại cuối
    )

    # ====== ĐÓNG BĂNG BACKBONE - chỉ giữ classifier head + 2 lớp cuối có thể huấn luyện ======
    # Lưu ý: ban đầu đóng băng TOÀN BỘ backbone, chỉ train classifier head (3.845 tham số)
    # nhưng thực nghiệm cho thấy accuracy bị "chững" ở mức thấp (~25-29%) không cải thiện
    # thêm dù train nhiều epoch - dấu hiệu classifier head quá đơn giản, không đủ khả năng
    # biểu diễn để phân biệt cảm xúc từ đặc trưng backbone tổng quát (huấn luyện trên
    # ImageNet, không chuyên biệt cho khuôn mặt/cảm xúc).
    # => Mở khóa thêm 2 lớp Transformer CUỐI CÙNG (gần đầu ra nhất) để model có thể tinh
    # chỉnh đặc trưng theo hướng phù hợp hơn với bài toán cảm xúc, trong khi VẪN đóng băng
    # phần lớn backbone (10/12 lớp + phần embedding đầu vào) - vẫn đúng tinh thần transfer learning.
    UNFROZEN_LAYER_INDICES = {"10", "11"}  # 2 lớp cuối trong tổng số 12 lớp (đánh số 0-11)

    trainable_params = 0
    frozen_params = 0
    for name, param in model.named_parameters():
        # Nhận diện lớp cuối bằng cách tìm pattern ".10." hoặc ".11." trong tên tham số
        # (khớp cả 2 kiểu đặt tên: "encoder.layer.11.xxx" và "vit.layers.11.xxx")
        is_last_layers = any(f".{idx}." in name for idx in UNFROZEN_LAYER_INDICES)
        if name.startswith("classifier") or is_last_layers:
            param.requires_grad = True
            trainable_params += param.numel()
        else:
            param.requires_grad = False
            frozen_params += param.numel()

    print(f"\nĐã đóng băng phần lớn backbone: {frozen_params:,} tham số KHÔNG huấn luyện.")
    print(f"Huấn luyện classifier head + 2 lớp cuối: {trainable_params:,} tham số.")
    print(f"(Tỉ lệ tham số học được: {100 * trainable_params / (trainable_params + frozen_params):.3f}%)\n")

    train_dataset = FaceEmotionDataset(train_paths, train_labels, label2id, processor, augment=True)
    val_dataset = FaceEmotionDataset(val_paths, val_labels, label2id, processor, augment=False)

    # ====== TÍNH CLASS WEIGHTS - chống mất cân bằng dữ liệu ======
    # Lớp nào có ÍT ảnh hơn sẽ được gán trọng số CAO hơn trong hàm loss,
    # buộc model phải chú ý học nó thay vì bỏ qua để tối ưu lớp đông ảnh.
    class_counts = np.array([train_labels.count(present_emotions[i]) for i in range(len(present_emotions))])
    class_weights = class_counts.sum() / (len(class_counts) * class_counts)
    class_weights = torch.tensor(class_weights, dtype=torch.float32)

    print("Phân bố dữ liệu theo lớp (tập train):")
    for i, emo in enumerate(present_emotions):
        print(f"  {emo:<10}: {class_counts[i]:4d} ảnh  -> trọng số loss: {class_weights[i]:.2f}")
    print()

    training_args = TrainingArguments(
        output_dir="./train_checkpoints",
        num_train_epochs=25,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        learning_rate=2e-4,  # giảm thêm vì giờ train cả lớp Transformer, không chỉ classifier tuyến tính
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=1,
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        logging_steps=5,
        report_to=[],
        seed=SEED,
    )

    trainer = WeightedTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        class_weights=class_weights,
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

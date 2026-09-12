"""
CÔNG CỤ PHÂN TÍCH: Tính Confusion Matrix trên tập validation
Giúp xác định CHÍNH XÁC model đang nhầm cảm xúc nào với cảm xúc nào,
thay vì chỉ đoán qua vài lần test thủ công. Từ đó biết nên tập trung
cải thiện dữ liệu cho cảm xúc nào.

Cách chạy:
    python analyze_confusion.py

Yêu cầu: đã có my_emotion_model/ (chạy xong 2_finetune_model.py)
"""

import os
import numpy as np
import torch
from PIL import Image
from sklearn.model_selection import train_test_split
from transformers import AutoImageProcessor, AutoModelForImageClassification

DATA_DIR = "data"
MODEL_DIR = "my_emotion_model"
EMOTIONS = ["neutral", "happy", "sad", "angry", "surprise"]
SEED = 42


def load_dataset_paths():
    paths, labels = [], []
    for emo in EMOTIONS:
        emo_dir = os.path.join(DATA_DIR, emo)
        if not os.path.isdir(emo_dir):
            continue
        files = [f for f in os.listdir(emo_dir) if f.lower().endswith((".jpg", ".png"))]
        for f in files:
            paths.append(os.path.join(emo_dir, f))
            labels.append(emo)
    return paths, labels


def main():
    print("Đang tải model...")
    processor = AutoImageProcessor.from_pretrained(MODEL_DIR)
    model = AutoModelForImageClassification.from_pretrained(MODEL_DIR)
    model.eval()

    id2label = model.config.id2label
    present_emotions = [id2label[i] for i in range(len(id2label))]

    paths, labels = load_dataset_paths()
    # Lấy lại ĐÚNG tập validation như lúc train (cùng seed, cùng tỉ lệ chia)
    # để đánh giá công bằng, không lẫn ảnh đã train vào
    _, val_paths, _, val_labels = train_test_split(
        paths, labels, test_size=0.15, random_state=SEED, stratify=labels
    )

    print(f"Đang đánh giá trên {len(val_paths)} ảnh validation...\n")

    n = len(present_emotions)
    matrix = np.zeros((n, n), dtype=int)  # hàng = nhãn thật, cột = model đoán
    label2idx = {e: i for i, e in enumerate(present_emotions)}

    with torch.no_grad():
        for path, true_label in zip(val_paths, val_labels):
            image = Image.open(path).convert("RGB")
            inputs = processor(images=image, return_tensors="pt")
            logits = model(**inputs).logits
            pred_idx = int(torch.argmax(logits, dim=1)[0])
            true_idx = label2idx[true_label]
            matrix[true_idx][pred_idx] += 1

    # In bảng confusion matrix
    print("CONFUSION MATRIX (hàng = nhãn THẬT, cột = model ĐOÁN)")
    header = "Thật\\Đoán".ljust(12) + "".join(e[:8].ljust(10) for e in present_emotions)
    print(header)
    for i, emo in enumerate(present_emotions):
        row = emo.ljust(12) + "".join(str(matrix[i][j]).ljust(10) for j in range(n))
        print(row)

    # Tính accuracy từng lớp + liệt kê các cặp nhầm lẫn nhiều nhất
    print("\n=== ACCURACY TỪNG CẢM XÚC ===")
    for i, emo in enumerate(present_emotions):
        total = matrix[i].sum()
        correct = matrix[i][i]
        acc = correct / total * 100 if total > 0 else 0
        print(f"  {emo:<10}: {correct}/{total} đúng ({acc:.1f}%)")

    print("\n=== CÁC CẶP NHẦM LẪN NHIỀU NHẤT (top 5) ===")
    confusions = []
    for i in range(n):
        for j in range(n):
            if i != j and matrix[i][j] > 0:
                confusions.append((matrix[i][j], present_emotions[i], present_emotions[j]))
    confusions.sort(reverse=True)
    for count, true_emo, pred_emo in confusions[:5]:
        print(f"  Thật là '{true_emo}' nhưng đoán thành '{pred_emo}': {count} lần")

    print("\n=> Cảm xúc có accuracy thấp nhất hoặc nằm trong top nhầm lẫn nên được")
    print("   ưu tiên thu thập THÊM ảnh mới, rõ nét, biểu cảm dứt khoát hơn.")


if __name__ == "__main__":
    main()

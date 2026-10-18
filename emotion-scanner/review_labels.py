"""
SOI LẠI NHÃN ảnh tự chụp mà model nghi là sai.

Mỗi ảnh trong results/emonet_oof.csv được đoán bởi model CHƯA TỪNG THẤY người đó
(model của fold mà người đó làm người lạ). Ảnh bị nghi = model chắc >= ngưỡng vào
1 cảm xúc KHÁC nhãn hiện tại.

QUAN TRỌNG: ngưỡng không làm model tốt hơn, chỉ quyết định số ảnh phải xem.
Chỉ đổi nhãn khi CHÍNH MẮT thấy rõ là sai; phân vân thì bấm k (giữ nguyên),
nếu không sẽ bị model "dắt mũi" -> điểm tăng ảo.

Phím: k = giữ · 1-5 = đổi nhãn (1 neutral, 2 happy, 3 sad, 4 angry, 5 surprise) · d = bỏ ảnh · q = thoát
Quyết định ghi vào label_fixes.csv (ảnh gốc không bị đụng tới). Chạy lại: tiếp từ ảnh chưa xét.
Sau khi soi xong: chạy lại prepare_data.py rồi train_emonet.py.

Cách chạy: PYTHONUTF8=1 python review_labels.py [--threshold 0.8]
"""

import argparse
import csv
import os

import cv2
import numpy as np

from emonet import EMOTIONS
from prepare_data import LABEL_FIXES, is_excluded, read_label_fixes

OOF = os.path.join("results", "emonet_oof.csv")
WINDOW = "Soi nhan EmoTune"
KEYS = {ord("k"): ("keep", ""), ord("d"): ("drop", "")}
KEYS.update({ord(str(i + 1)): ("relabel", e) for i, e in enumerate(EMOTIONS)})


def suspicious(oof_rows, threshold):
    rows = [r for r in oof_rows if r["pred"] != r["label"] and float(r["prob_pred"]) >= threshold]
    return sorted(rows, key=lambda r: -float(r["prob_pred"]))


def pending(oof_rows, fixes):
    """Ảnh chưa xét; bỏ qua người đã loại hẳn (EXCLUDED_PEOPLE) vì ảnh của họ không còn được dùng."""
    return [r for r in oof_rows
            if os.path.basename(r["orig"]) not in fixes and not is_excluded(os.path.basename(r["orig"]))]


def decide(key):
    return KEYS.get(key)


def append_fix(path, file, action, new_label):
    is_new = not os.path.isfile(path)
    with open(path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if is_new:
            writer.writerow(["file", "action", "new_label"])
        writer.writerow([file, action, new_label])


def _show(row, i, n):
    img = cv2.imread(row["orig"])
    big = cv2.resize(img, (384, 384)) if img is not None else np.zeros((384, 384, 3), np.uint8)
    panel = np.zeros((130, 384, 3), np.uint8)
    lines = [f"{i}/{n}  {os.path.basename(row['orig'])[:40]}",
             f"Nhan hien tai: {row['label']}",
             f"Model doan: {row['pred']} ({float(row['prob_pred']):.0%})",
             "k=giu  1-5=doi nhan  d=bo  q=thoat",
             "1 neutral 2 happy 3 sad 4 angry 5 surprise"]
    for j, text in enumerate(lines):
        cv2.putText(panel, text, (8, 22 + j * 24), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    cv2.imshow(WINDOW, np.vstack([big, panel]))
    cv2.setWindowProperty(WINDOW, cv2.WND_PROP_TOPMOST, 1)  # luôn nổi trên VS Code / terminal


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--threshold", type=float, default=0.8)
    ap.add_argument("--oof", default=OOF)
    args = ap.parse_args()

    with open(args.oof, newline="", encoding="utf-8") as f:
        oof_rows = list(csv.DictReader(f))
    todo = pending(suspicious(oof_rows, args.threshold), read_label_fixes(LABEL_FIXES))
    print(f"Ngưỡng {args.threshold}: còn {len(todo)} ảnh bị nghi chưa xét. Cửa sổ '{WINDOW}' đang mở - bấm phím trong cửa sổ đó.", flush=True)
    for i, row in enumerate(todo, 1):
        _show(row, i, len(todo))
        while True:
            key = cv2.waitKey(0) & 0xFF
            if key == ord("q"):
                cv2.destroyAllWindows()
                print("Đã dừng, lần sau chạy lại sẽ tiếp tục.", flush=True)
                return
            choice = decide(key)
            if choice:
                append_fix(LABEL_FIXES, os.path.basename(row["orig"]), *choice)
                break
    cv2.destroyAllWindows()
    print(f"✓ Xong. Quyết định ở {LABEL_FIXES}. Tiếp: python prepare_data.py rồi python train_emonet.py")


if __name__ == "__main__":
    main()

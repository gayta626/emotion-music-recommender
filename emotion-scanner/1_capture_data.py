"""
BƯỚC 1/4: Thu thập dữ liệu huấn luyện (chụp ảnh khuôn mặt có nhãn)
Đề tài: Hệ thống gợi ý nhạc theo cảm xúc (phiên bản Web)

File này mở webcam, lần lượt yêu cầu bạn thể hiện từng cảm xúc, và chụp
nhiều ảnh khuôn mặt cho mỗi cảm xúc. Dữ liệu này sẽ dùng để fine-tune
model ở bước 2 (đóng băng backbone, chỉ huấn luyện lại lớp phân loại cuối).

Cách cài đặt:
    pip install opencv-python pillow

Cách chạy:
    python 1_capture_data.py

Điều khiển:
    - Phím 'c'      : chụp 1 ảnh cho cảm xúc hiện tại
    - Phím 'n'      : chuyển sang cảm xúc tiếp theo
    - Phím 'q'      : thoát chương trình

GHI CHÚ - THU THẬP TỪ NHIỀU NGƯỜI:
    Model chỉ học được đặc trưng cảm xúc của những khuôn mặt đã "dạy" nó.
    Nếu chỉ dùng ảnh của 1 người, model sẽ nhận diện tốt cho người đó nhưng
    có thể đoán sai với người khác. Để model tổng quát hơn, hãy chạy file
    này nhiều lần với nhiều người khác nhau (mỗi lần nhập tên khác nhau) -
    dữ liệu sẽ được gộp chung vào thư mục data/ (tên người được lưu trong
    tên file nên không bị đè lên nhau) trước khi chạy bước 2 để train.
"""

import cv2
import os
import sys
import time
import unicodedata

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Danh sách cảm xúc cần thu thập - PHẢI khớp với EMOTION_VI ở các bước sau
EMOTIONS = ["neutral", "happy", "sad", "angry", "surprise"]
EMOTION_VI = {
    "neutral": "trung tính (mặt bình thường)",
    "happy": "vui vẻ (cười)",
    "sad": "buồn",
    "angry": "giận dữ",
    "surprise": "ngạc nhiên",
}

DATA_DIR = "data"
TARGET_IMAGES_PER_EMOTION = 40  # càng nhiều ảnh, model càng học tốt (tối thiểu ~25-30)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


def detect_face_box(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
    if len(faces) == 0:
        return None
    return max(faces, key=lambda f: f[2] * f[3])


def crop_face(frame, box):
    x, y, w, h = box
    pad_w, pad_h = int(w * 0.10), int(h * 0.10)
    y1 = max(0, y - pad_h)
    y2 = min(frame.shape[0], y + h + pad_h)
    x1 = max(0, x - pad_w)
    x2 = min(frame.shape[1], x + w + pad_w)
    return frame[y1:y2, x1:x2]


def count_existing_images(emotion_dir):
    if not os.path.isdir(emotion_dir):
        return 0
    return len([f for f in os.listdir(emotion_dir) if f.lower().endswith((".jpg", ".png"))])


def remove_vietnamese_accents(text):
    """Bỏ dấu tiếng Việt - OpenCV trên Windows dễ lỗi với đường dẫn/tên file có dấu Unicode."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.replace("đ", "d").replace("Đ", "D")
    return text


def ask_person_name():
    import sys
    if len(sys.argv) > 1 and sys.argv[1].strip():
        name = remove_vietnamese_accents(sys.argv[1].strip()).lower()
        name = "".join(c for c in name if c.isalnum())
        if name:
            return name

    print("=" * 60)
    print("THU THẬP DỮ LIỆU CHO NHIỀU NGƯỜI")
    print("Nhập tên (có dấu cũng được, chương trình sẽ tự bỏ dấu) để phân")
    print("biệt ảnh của từng người khi gộp chung vào thư mục data/.")
    print("Ví dụ: An, Bình, Chi")
    print("=" * 60)
    while True:
        try:
            raw_name = input("Tên của bạn: ").strip()
        except EOFError:
            raw_name = "user"
        name = remove_vietnamese_accents(raw_name).lower()
        name = "".join(c for c in name if c.isalnum())  # chỉ giữ chữ/số thuần ASCII
        if name:
            if name != raw_name.lower():
                print(f"(Đã chuyển thành: '{name}' để tránh lỗi với OpenCV)")
            return name
        print("Tên không hợp lệ, vui lòng nhập lại.")


def main():
    person_name = ask_person_name()

    os.makedirs(DATA_DIR, exist_ok=True)
    for emo in EMOTIONS:
        os.makedirs(os.path.join(DATA_DIR, emo), exist_ok=True)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Không mở được camera.")
        return

    emo_index = 0
    last_capture_time = 0
    capture_cooldown = 0.3  # tránh chụp trùng khi giữ phím

    print("=" * 60)
    print(f"Người thu thập: {person_name}")
    print("HƯỚNG DẪN: 'c' = chụp ảnh | 'n' = cảm xúc tiếp theo | 'q' = thoát")
    print(f"Mục tiêu: ~{TARGET_IMAGES_PER_EMOTION} ảnh / cảm xúc / người")
    print("(Số đếm trên màn hình là TỔNG của TẤT CẢ người đã thu thập trong folder này)")
    print("=" * 60)

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Không đọc được khung hình từ camera.")
            break

        current_emotion = EMOTIONS[emo_index]
        emotion_dir = os.path.join(DATA_DIR, current_emotion)
        existing = count_existing_images(emotion_dir)

        box = detect_face_box(frame)
        display = frame.copy()

        if box is not None:
            x, y, w, h = box
            cv2.rectangle(display, (x, y), (x + w, y + h), (0, 255, 0), 2)

        status_color = (0, 200, 0) if existing >= TARGET_IMAGES_PER_EMOTION else (0, 0, 255)
        cv2.putText(display, f"Cam xuc: {EMOTION_VI[current_emotion]}", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2, cv2.LINE_AA)
        cv2.putText(display, f"Da chup: {existing}/{TARGET_IMAGES_PER_EMOTION}", (20, 75),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2, cv2.LINE_AA)
        cv2.putText(display, "'c'=chup  'n'=cam xuc ke  'q'=thoat", (20, display.shape[0] - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1, cv2.LINE_AA)

        cv2.imshow("Thu thap du lieu cam xuc", display)

        key = cv2.waitKey(1) & 0xFF
        now = time.time()

        if key == ord('q'):
            break
        elif key == ord('n'):
            emo_index = (emo_index + 1) % len(EMOTIONS)
            print(f"--> Chuyển sang cảm xúc: {EMOTION_VI[EMOTIONS[emo_index]]}")
        elif key == ord('c') and box is not None and (now - last_capture_time) >= capture_cooldown:
            face_img = crop_face(frame, box)
            filename = os.path.join(
                emotion_dir, f"{person_name}_{current_emotion}_{int(now * 1000)}.jpg"
            )
            cv2.imwrite(filename, face_img)
            last_capture_time = now
            existing += 1
            print(f"[{current_emotion}] Đã lưu ảnh {existing}/{TARGET_IMAGES_PER_EMOTION} -> {filename}")

    cap.release()
    cv2.destroyAllWindows()

    print("\n=== TỔNG KẾT DỮ LIỆU ===")
    total = 0
    for emo in EMOTIONS:
        n = count_existing_images(os.path.join(DATA_DIR, emo))
        total += n
        flag = "✓" if n >= 15 else "⚠ (hơi ít, nên chụp thêm)"
        print(f"  {EMOTION_VI[emo]:<30} : {n:3d} ảnh  {flag}")
    print(f"  TỔNG: {total} ảnh")
    print("\nTiếp theo: chạy 2_finetune_model.py để huấn luyện model.")


if __name__ == "__main__":
    main()

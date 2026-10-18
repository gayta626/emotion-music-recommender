"""
BƯỚC 3/4: Backend Flask - phục vụ model cảm xúc cho web app
Đề tài: Hệ thống gợi ý nhạc theo cảm xúc (phiên bản Web)

Load model MỘT LẦN lúc khởi động, sau đó nhận ảnh từ trình duyệt và trả cảm xúc.

Chọn model bằng biến môi trường EMOTION_MODEL:
    emonet (mặc định nếu có my_emonet/emonet.pt) - CNN tự thiết kế, train từ đầu (train_emonet.py)
    vit                                           - model ViT cũ (my_emotion_model/), dự phòng

Cách chạy:
    python 3_backend_server.py                       # :5000
    EMOTION_MODEL=vit python 3_backend_server.py     # quay về model cũ
    PORT=5055 python 3_backend_server.py             # đổi cổng (chạy thử khi :5000 đang bận)

API:  POST /predict  - nhận ảnh base64, trả cảm xúc
      GET  /health   - kiểm tra server + model đang dùng
"""

import base64
import io
import os
import time

import torch
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image

from emonet import detect_and_crop_face, load_emonet, predict_probs, preprocess_face

# Đường dẫn tính theo vị trí file này (không theo thư mục đang đứng) -> chạy bằng systemd vẫn tìm thấy model
HERE = os.path.dirname(os.path.abspath(__file__))
VIT_DIR = os.path.join(HERE, "my_emotion_model")
EMONET_PATH = os.path.join(HERE, "my_emonet", "emonet.pt")
MODEL_NAME = os.environ.get("EMOTION_MODEL") or ("emonet" if os.path.isfile(EMONET_PATH) else "vit")

app = Flask(__name__)
CORS(app)  # cho phép trang web (chạy ở port/domain khác) gọi API này

# ====== LOAD MODEL MỘT LẦN DUY NHẤT LÚC KHỞI ĐỘNG SERVER ======
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Đang tải model '{MODEL_NAME}'...")
processor = None
if MODEL_NAME == "emonet":
    if not os.path.isfile(EMONET_PATH):
        raise SystemExit(f"LỖI: không có '{EMONET_PATH}'. Chạy train_emonet.py trước, hoặc EMOTION_MODEL=vit.")
    model, labels = load_emonet(EMONET_PATH, device)
elif MODEL_NAME == "vit":
    from transformers import AutoImageProcessor, AutoModelForImageClassification

    if not os.path.isdir(VIT_DIR):
        raise SystemExit(f"LỖI: không tìm thấy thư mục '{VIT_DIR}/'.")
    processor = AutoImageProcessor.from_pretrained(VIT_DIR)
    model = AutoModelForImageClassification.from_pretrained(VIT_DIR).to(device).eval()
    labels = [model.config.id2label[i] for i in range(len(model.config.id2label))]
else:
    raise SystemExit(f"LỖI: EMOTION_MODEL='{MODEL_NAME}' không hợp lệ (chỉ nhận emonet | vit).")

print(f"Đã tải xong model '{MODEL_NAME}'. Chạy trên: {device}")
print(f"Các cảm xúc model nhận diện được: {labels}")


def classify(face_image):
    """Ảnh mặt đã cắt -> mảng xác suất theo thứ tự `labels`."""
    if MODEL_NAME == "emonet":
        # Cùng tiền xử lý với lúc train (emonet.preprocess_face) + đoán cả ảnh lật ngang
        return predict_probs(model, preprocess_face(face_image), device)
    inputs = processor(images=face_image, return_tensors="pt").to(device)
    with torch.no_grad():
        return torch.softmax(model(**inputs).logits, dim=1)[0].cpu().numpy()


def decode_base64_image(base64_string):
    """Chuyển chuỗi base64 (frontend gửi lên) thành ảnh PIL để đưa vào model."""
    if "," in base64_string:
        base64_string = base64_string.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(base64_string))).convert("RGB")


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "device": str(device), "model": MODEL_NAME})


MAX_FRAMES = 10  # web chụp 5 tấm / lượt; chặn request quá lớn làm chậm server


@app.route("/predict", methods=["POST"])
def predict_emotion():
    """
    Nhận JSON: { "image": "data:image/jpeg;base64,..." }  (1 tấm, kiểu cũ)
           hoặc { "images": ["data:image/jpeg;base64,...", ...] }  (nhiều tấm chụp liền nhau trong 1 lượt quét)
    Trả về JSON: { "emotion", "confidence", "all_scores", "debug_crop", "model", "inference_ms", "frames" }
    Nhiều tấm: mỗi tấm cắt mặt + đoán riêng, tấm không thấy mặt bị bỏ, kết quả = TRUNG BÌNH xác suất
    (1 khung hình có thể bắt đúng lúc chớp mắt / nói dở; gộp vài khung thì ổn định hơn).
    """
    data = request.get_json(silent=True)
    if not data or ("image" not in data and "images" not in data):
        return jsonify({"error": "Thiếu trường 'image' hoặc 'images' trong request"}), 400
    frames = data["images"] if "images" in data else [data["image"]]
    if not isinstance(frames, list) or not frames or len(frames) > MAX_FRAMES:
        return jsonify({"error": f"'images' phải là danh sách 1-{MAX_FRAMES} ảnh"}), 400

    try:
        images = [decode_base64_image(f) for f in frames]
    except Exception as e:
        return jsonify({"error": f"Không đọc được ảnh: {str(e)}"}), 400

    # Cắt khuôn mặt trước khi đưa vào model - khớp với định dạng ảnh lúc train
    faces = [face for face in (detect_and_crop_face(img) for img in images) if face is not None]
    if not faces:
        return jsonify({"error": "no_face_detected", "message": "Không phát hiện khuôn mặt trong khung hình"}), 200

    t0 = time.perf_counter()
    probs = sum(classify(face) for face in faces) / len(faces)
    inference_ms = (time.perf_counter() - t0) * 1000

    top_idx = int(probs.argmax())
    all_scores = {labels[i]: round(float(probs[i]), 4) for i in range(len(labels))}

    # Trả kèm ảnh ĐÃ CROP (tấm đầu tiên có mặt) để debug (so với ảnh trong data/ lúc train)
    debug_buffer = io.BytesIO()
    faces[0].save(debug_buffer, format="JPEG")
    debug_crop_base64 = "data:image/jpeg;base64," + base64.b64encode(debug_buffer.getvalue()).decode("utf-8")

    return jsonify({
        "emotion": labels[top_idx],
        "confidence": round(float(probs[top_idx]), 4),
        "all_scores": all_scores,
        "debug_crop": debug_crop_base64,
        "model": MODEL_NAME,
        "inference_ms": round(inference_ms, 1),
        "frames": len(faces),
    })


if __name__ == "__main__":
    # debug=False khi demo thật để tránh server tự restart giữa chừng làm mất model đã load
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)

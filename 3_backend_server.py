"""
BƯỚC 3/4: Backend Flask - phục vụ model cảm xúc cho web app
Đề tài: Hệ thống gợi ý nhạc theo cảm xúc (phiên bản Web)

File này chạy một server nhỏ, load model đã fine-tune (my_emotion_model/)
MỘT LẦN DUY NHẤT lúc khởi động, sau đó liên tục nhận ảnh gửi từ trình
duyệt (frontend web ở bước 4) để trả về cảm xúc hiện tại.

Cách cài đặt:
    pip install flask flask-cors torch transformers pillow

Cách chạy:
    python 3_backend_server.py

Sau khi chạy, server sẽ lắng nghe tại: http://localhost:5000
API chính:  POST /predict   - nhận ảnh, trả về cảm xúc
Kiểm tra:   GET  /health    - kiểm tra server còn sống không

Yêu cầu: đã chạy xong 2_finetune_model.py và có thư mục my_emotion_model/.
"""

import base64
import io
import os

import torch
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification

MODEL_DIR = "my_emotion_model"

app = Flask(__name__)
CORS(app)  # cho phép trang web (chạy ở port/domain khác) gọi API này

# ====== LOAD MODEL MỘT LẦN DUY NHẤT LÚC KHỞI ĐỘNG SERVER ======
# Đây là điểm quan trọng: nếu load model bên trong mỗi request sẽ RẤT CHẬM
# (model ViT mất vài giây để load). Load 1 lần, tái sử dụng cho mọi request.
print("Đang tải model đã fine-tune...")

if not os.path.isdir(MODEL_DIR):
    raise SystemExit(
        f"LỖI: không tìm thấy thư mục '{MODEL_DIR}/'. "
        f"Hãy chạy 2_finetune_model.py trước để tạo model."
    )

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
processor = AutoImageProcessor.from_pretrained(MODEL_DIR)
model = AutoModelForImageClassification.from_pretrained(MODEL_DIR)
model.to(device)
model.eval()  # chế độ suy luận (inference), không tính gradient -> nhanh hơn

print(f"Đã tải xong model. Chạy trên: {device}")
print(f"Các cảm xúc model nhận diện được: {list(model.config.id2label.values())}")


def decode_base64_image(base64_string):
    """Chuyển chuỗi base64 (frontend gửi lên) thành ảnh PIL để đưa vào model."""
    # Frontend thường gửi dạng "data:image/jpeg;base64,/9j/4AAQ..." -> cắt bỏ phần đầu
    if "," in base64_string:
        base64_string = base64_string.split(",", 1)[1]
    image_bytes = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return image


@app.route("/health", methods=["GET"])
def health_check():
    """Endpoint đơn giản để kiểm tra server có đang chạy không."""
    return jsonify({"status": "ok", "device": str(device)})


@app.route("/predict", methods=["POST"])
def predict_emotion():
    """
    Nhận JSON: { "image": "data:image/jpeg;base64,..." }
    Trả về JSON:
        {
            "emotion": "happy",
            "confidence": 0.87,
            "all_scores": {"happy": 0.87, "sad": 0.03, ...}
        }
    """
    data = request.get_json(silent=True)
    if not data or "image" not in data:
        return jsonify({"error": "Thiếu trường 'image' trong request"}), 400

    try:
        image = decode_base64_image(data["image"])
    except Exception as e:
        return jsonify({"error": f"Không đọc được ảnh: {str(e)}"}), 400

    # Đưa ảnh qua model để dự đoán
    inputs = processor(images=image, return_tensors="pt").to(device)
    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.softmax(logits, dim=1)[0]

    top_idx = int(torch.argmax(probs))
    emotion = model.config.id2label[top_idx]
    confidence = float(probs[top_idx])

    all_scores = {
        model.config.id2label[i]: float(probs[i])
        for i in range(len(probs))
    }

    return jsonify({
        "emotion": emotion,
        "confidence": round(confidence, 4),
        "all_scores": {k: round(v, 4) for k, v in all_scores.items()},
    })


if __name__ == "__main__":
    # debug=False khi demo thật để tránh server tự restart giữa chừng làm mất model đã load
    app.run(host="0.0.0.0", port=5000, debug=False)

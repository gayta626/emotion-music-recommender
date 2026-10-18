"""
EmoNet: CNN nhận diện cảm xúc TỰ THIẾT KẾ, train TỪ ĐẦU (không dùng trọng số có sẵn).

File này dùng chung cho lúc train (train_emonet.py) và lúc chạy thật
(3_backend_server.py) để ảnh luôn được xử lý Y HỆT nhau:
    ảnh webcam -> cắt mặt (Haar) -> ảnh xám -> 96x96 -> CLAHE -> [-1, 1] -> EmoNet

Kiến trúc (kiểu ResNet thu nhỏ, ~2.8 triệu tham số):
    Stem: Conv3x3(32, stride 2) -> BatchNorm -> ReLU            96x96 -> 48x48
    Tầng 1..4: mỗi tầng 2 khối residual, 32 -> 64 -> 128 -> 256 kênh,
               tầng 2..4 giảm kích thước 1/2                     48 -> 24 -> 12 -> 6
    Global Average Pooling -> Dropout 0.3 -> Linear -> 5 cảm xúc
"""

import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image

EMOTIONS = ["neutral", "happy", "sad", "angry", "surprise"]
INPUT_SIZE = 96
VERSION = 1

# ====== CẮT MẶT - giữ nguyên logic của bước thu thập dữ liệu (1_capture_data.py) ======
_face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def detect_and_crop_face(pil_image):
    """Tìm khuôn mặt lớn nhất, cắt sát + đệm 10% mỗi phía. Không thấy mặt -> None."""
    frame = cv2.cvtColor(np.array(pil_image.convert("RGB")), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = _face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    pad_w, pad_h = int(w * 0.10), int(h * 0.10)
    y1, y2 = max(0, y - pad_h), min(frame.shape[0], y + h + pad_h)
    x1, x2 = max(0, x - pad_w), min(frame.shape[1], x + w + pad_w)
    return Image.fromarray(cv2.cvtColor(frame[y1:y2, x1:x2], cv2.COLOR_BGR2RGB))


# ====== CHUẨN HOÁ ẢNH MẶT ======
# CLAHE = cân bằng sáng theo từng vùng nhỏ: làm rõ mắt/miệng khi phòng tối hoặc ngược sáng.
_clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))


def preprocess_face(image):
    """Ảnh mặt (PIL hoặc numpy, màu/xám, cỡ bất kỳ) -> ảnh xám uint8 96x96 đã cân bằng sáng."""
    arr = np.asarray(image)
    if arr.ndim == 3:
        gray = cv2.cvtColor(np.ascontiguousarray(arr[:, :, :3]), cv2.COLOR_RGB2GRAY)
    else:
        gray = arr
    gray = gray.astype(np.uint8)
    # Thu nhỏ dùng INTER_AREA (giữ chi tiết), phóng to dùng INTER_CUBIC (bớt răng cưa)
    interp = cv2.INTER_AREA if min(gray.shape) > INPUT_SIZE else cv2.INTER_CUBIC
    gray = cv2.resize(gray, (INPUT_SIZE, INPUT_SIZE), interpolation=interp)
    return _clahe.apply(gray)


def normalize(x01):
    """Tensor ảnh giá trị [0, 1] -> [-1, 1] (đầu vào của EmoNet)."""
    return x01 * 2 - 1


def to_tensor(gray96):
    """Ảnh xám uint8 96x96 -> tensor 1x1x96x96 giá trị [-1, 1]."""
    x = torch.from_numpy(np.ascontiguousarray(gray96)).float().div(255)
    return normalize(x)[None, None]


# ====== MODEL ======
class ResidualBlock(nn.Module):
    """Conv-BN-ReLU-Conv-BN + đường tắt: mạng sâu vẫn học được vì gradient đi thẳng qua đường tắt."""

    def __init__(self, in_ch, out_ch, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_ch, out_ch, 3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_ch)
        self.conv2 = nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_ch)
        self.relu = nn.ReLU(inplace=True)
        if stride != 1 or in_ch != out_ch:
            # Đổi số kênh / kích thước để cộng được với nhánh chính
            self.shortcut = nn.Sequential(nn.Conv2d(in_ch, out_ch, 1, stride=stride, bias=False), nn.BatchNorm2d(out_ch))
        else:
            self.shortcut = nn.Identity()

    def forward(self, x):
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        return self.relu(out + self.shortcut(x))


class EmoNet(nn.Module):
    def __init__(self, num_classes=len(EMOTIONS), widths=(32, 64, 128, 256), dropout=0.3):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(1, widths[0], 3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(widths[0]),
            nn.ReLU(inplace=True),
        )
        stages, in_ch = [], widths[0]
        for i, w in enumerate(widths):
            stride = 1 if i == 0 else 2
            stages += [ResidualBlock(in_ch, w, stride), ResidualBlock(w, w)]
            in_ch = w
        self.stages = nn.Sequential(*stages)
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(in_ch, num_classes)
        # Khởi tạo ngẫu nhiên kiểu Kaiming (phù hợp ReLU) - KHÔNG nạp trọng số có sẵn
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode="fan_out", nonlinearity="relu")
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.ones_(m.weight)
                nn.init.zeros_(m.bias)

    def forward(self, x):
        x = self.stages(self.stem(x))
        x = torch.flatten(self.pool(x), 1)
        return self.fc(self.dropout(x))


# ====== LƯU / NẠP / DỰ ĐOÁN ======
def save_emonet(model, path, extra=None):
    ckpt = {"state_dict": model.state_dict(), "emotions": EMOTIONS, "input_size": INPUT_SIZE, "version": VERSION}
    ckpt.update(extra or {})
    torch.save(ckpt, path)


def load_emonet(path, device="cpu"):
    ckpt = torch.load(path, map_location=device, weights_only=True)
    model = EmoNet(num_classes=len(ckpt["emotions"]))
    model.load_state_dict(ckpt["state_dict"])
    return model.to(device).eval(), list(ckpt["emotions"])


@torch.no_grad()
def predict_probs(model, gray96, device="cpu", tta=True):
    """Xác suất 5 cảm xúc. tta=True: đoán cả ảnh lật ngang rồi lấy trung bình (ổn định hơn)."""
    x = to_tensor(gray96).to(device)
    if tta:
        x = torch.cat([x, torch.flip(x, dims=[3])])
    probs = torch.softmax(model(x).float(), dim=1).mean(0)
    return probs.cpu().numpy()

"""
HEATMAP "AI NHÌN VÀO ĐÂU" (Grad-CAM) cho EmoNet.

Grad-CAM: lấy bản đồ đặc trưng của 1 tầng conv + gradient của điểm lớp được đoán
theo bản đồ đó -> vùng nào làm điểm lớp đó tăng nhiều nhất thì sáng (đỏ/vàng).
Dùng để giải thích model (XAI): kiểm tra model nhìn mắt / mày / miệng chứ không nhìn nền, tóc.

Cách chạy:  PYTHONUTF8=1 python gradcam_emonet.py [--person ducvinh] [--layer 4]
Kết quả:    results/gradcam/<người>_<cảm xúc>_{face,cam}.png + <người>_grid.png + <người>.json
Ảnh đi qua đúng đường của server: ảnh mặt đã cắt -> preprocess_face (xám 96, CLAHE) -> model.
Lưu ý: model cuối đã train trên cả 8 người, nên đây là ảnh MINH HOẠ cách model nhìn,
không phải ảnh để chấm độ chính xác.
"""

import argparse
import json
import os

import cv2
import numpy as np
import torch
from PIL import Image

from cv_common import load_manifest
from emonet import EMOTIONS, load_emonet, preprocess_face, to_tensor
from train_emonet import MANIFEST, RESULTS

MODEL_PATH = os.path.join("my_emonet", "emonet.pt")
OUT_DIR = os.path.join(RESULTS, "gradcam")
SIZE = 384  # cỡ ảnh xuất ra (phóng từ 96)


def grad_cam(model, x, layer, cls=None):
    """Trả về (heatmap 0..1 cỡ ảnh vào, lớp, xác suất 5 lớp)."""
    feats, grads = {}, {}
    h1 = layer.register_forward_hook(lambda m, i, o: feats.__setitem__("a", o))
    h2 = layer.register_full_backward_hook(lambda m, gi, go: grads.__setitem__("g", go[0]))
    try:
        model.zero_grad()
        logits = model(x)
        probs = torch.softmax(logits, dim=1)[0].detach().numpy()
        cls = int(probs.argmax()) if cls is None else cls
        logits[0, cls].backward()
    finally:
        h1.remove()
        h2.remove()
    a, g = feats["a"][0], grads["g"][0]            # C x h x w
    weights = g.mean(dim=(1, 2))                    # mỗi kênh quan trọng bao nhiêu
    cam = torch.relu((weights[:, None, None] * a).sum(0)).detach().numpy()
    cam = cv2.resize(cam, (x.shape[3], x.shape[2]), interpolation=cv2.INTER_CUBIC)
    cam = np.clip(cam, 0, None)
    return cam / (cam.max() + 1e-8), cls, probs


def overlay(gray96, cam):
    face = cv2.resize(gray96, (SIZE, SIZE), interpolation=cv2.INTER_CUBIC)
    face_rgb = cv2.cvtColor(face, cv2.COLOR_GRAY2RGB)
    heat = cv2.applyColorMap(np.uint8(255 * cv2.resize(cam, (SIZE, SIZE))), cv2.COLORMAP_JET)
    heat = cv2.cvtColor(heat, cv2.COLOR_BGR2RGB)
    return face_rgb, np.uint8(0.55 * face_rgb + 0.45 * heat)


_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def full_face(gray96):
    """Ảnh có thấy trọn 1 khuôn mặt không (loại ảnh chụp lỗi chỉ có 1 con mắt / nửa mặt)."""
    big = cv2.resize(gray96, (192, 192), interpolation=cv2.INTER_CUBIC)
    faces = _cascade.detectMultiScale(big, scaleFactor=1.1, minNeighbors=5, minSize=(96, 96))
    return len(faces) > 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--person", default="ducvinh")
    ap.add_argument("--layer", type=int, default=4, help="tầng residual (1-4) lấy bản đồ đặc trưng; 4 = 6x6 (gọn, rõ nhất), 3 = 12x12 (nhiễu)")
    args = ap.parse_args()

    model, _ = load_emonet(MODEL_PATH)
    layer = model.stages[args.layer * 2 - 1]  # khối thứ 2 của tầng đó
    rows = [r for r in load_manifest(MANIFEST) if r["source"] == "own" and r["person"] == args.person]
    os.makedirs(OUT_DIR, exist_ok=True)

    picked = {}
    for emo in EMOTIONS:
        best = None
        for r in (r for r in rows if r["label"] == emo):
            gray = preprocess_face(Image.open(r["orig"]).convert("RGB"))
            if not full_face(gray):
                continue
            x = to_tensor(gray)
            with torch.no_grad():
                p = torch.softmax(model(x), dim=1)[0].numpy()
            # chọn ảnh đoán đúng và chắc nhất của cảm xúc này
            if p.argmax() == EMOTIONS.index(emo) and (best is None or p.max() > best[0]):
                best = (float(p.max()), r, gray)
        if best is None:
            print(f"  {emo}: không có ảnh nào đoán đúng, bỏ qua")
            continue
        conf, r, gray = best
        cam, cls, probs = grad_cam(model, to_tensor(gray), layer)
        face, over = overlay(gray, cam)
        Image.fromarray(face).save(os.path.join(OUT_DIR, f"{args.person}_{emo}_face.png"))
        Image.fromarray(over).save(os.path.join(OUT_DIR, f"{args.person}_{emo}_cam.png"))
        picked[emo] = {"file": r["orig"], "pred": EMOTIONS[cls], "confidence": round(float(probs[cls]), 4)}
        print(f"  {emo}: {r['orig']} -> {EMOTIONS[cls]} {probs[cls]:.2f}")

    # lưới xem nhanh: hàng trên ảnh mặt, hàng dưới heatmap
    tiles = [(Image.open(os.path.join(OUT_DIR, f"{args.person}_{e}_face.png")),
              Image.open(os.path.join(OUT_DIR, f"{args.person}_{e}_cam.png"))) for e in picked]
    grid = Image.new("RGB", (SIZE * len(tiles), SIZE * 2), "black")
    for k, (face, cam) in enumerate(tiles):
        grid.paste(face, (k * SIZE, 0))
        grid.paste(cam, (k * SIZE, SIZE))
    grid.save(os.path.join(OUT_DIR, f"{args.person}_grid.png"))
    with open(os.path.join(OUT_DIR, f"{args.person}.json"), "w", encoding="utf-8") as f:
        json.dump({"layer": args.layer, "picked": picked}, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()

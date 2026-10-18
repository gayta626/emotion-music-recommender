"""
BƯỚC 1b: Chuẩn bị dữ liệu train EmoNet (chạy 1 lần, chạy lại được).

Gộp 3 nguồn:
  - Ảnh tự chụp của 10 người: data/<camxuc>/<ten>_<camxuc>_<timestamp>.jpg
  - Ảnh người dùng web đã SỬA / XÁC NHẬN cảm xúc (vòng phản hồi C15, chỉ người đồng ý trong Settings):
    ../emotune-backend/feedback_faces/<camxuc>/u<id>_<camxuc>_<thời điểm>.jpg (nguồn "feedback", luôn vào tập train)
  - 3 bộ ảnh cảm xúc công khai trên Hugging Face (giấy phép phi thương mại,
    chỉ dùng cho đồ án): RAF-DB, AffectNet (bản rút gọn), FER+

Các bước: đổi nhãn về 5 lớp -> cắt mặt -> lọc ảnh kém -> áp label_fixes.csv
-> chuẩn hoá (xám, 96x96, CLAHE - dùng chung emonet.preprocess_face)
-> lọc ảnh gần trùng -> lưu PNG + data_public/manifest.csv + data_public/stats.json

Cách chạy:  PYTHONUTF8=1 python prepare_data.py
"""

import csv
import io
import json
import os
import shutil

import cv2
import numpy as np
from PIL import Image

from emonet import EMOTIONS, detect_and_crop_face, preprocess_face

DATA_DIR = "data"
# backend ghi ảnh phản hồi vào đây (emotune-backend/src/services/faceSamples.js); đổi được bằng biến môi trường FEEDBACK_DIR
FEEDBACK_DIR = os.environ.get("FEEDBACK_DIR", os.path.join("..", "emotune-backend", "feedback_faces"))
PUBLIC_DIR = "data_public"
RAW_DIR = os.path.join(PUBLIC_DIR, "raw")
OUT_DIR = os.path.join(PUBLIC_DIR, "processed")
MANIFEST = os.path.join(PUBLIC_DIR, "manifest.csv")
STATS = os.path.join(PUBLIC_DIR, "stats.json")
LABEL_FIXES = "label_fixes.csv"

SEED = 42
HOLDOUT_FRAC = 0.05   # 5% ảnh công khai để riêng làm tập val (dừng sớm) + chấm điểm
MIN_FACE = 40         # mặt nhỏ hơn 40px: quá ít chi tiết
LIGHT_RANGE = (25, 230)  # độ sáng trung bình ngoài khoảng này: quá tối / cháy sáng
BLUR_MIN = 20.0       # phương sai Laplacian (đo ở cỡ gốc) dưới ngưỡng: ảnh nhoè
RECROP_ABOVE = 150    # ảnh công khai cạnh > 150px là ảnh cắt rộng -> cắt lại bằng Haar
OWN_DUP_DIST = 6      # ảnh tự chụp: khác nhau <= 6/64 bit dHash coi là trùng

# Loại hẳn 2 người vì NHÃN KHÔNG ĐÁNG TIN (xem ảnh ghép data_public/review_dat.png, review_phat.png):
#   dat : neutral / sad / angry gần như cùng 1 vẻ mặt, nhiều ảnh 'angry' đang cười, không có surprise
#   phat: neutral / sad / angry cùng 1 vẻ mặt cau có, ảnh 'happy' không có ảnh nào cười
# Lý do là chất lượng ảnh lúc chụp, KHÔNG phải vì model đoán sai họ (báo cáo ghi cả số 10 người lẫn 8 người).
EXCLUDED_PEOPLE = {"dat", "phat"}

# Thứ tự "names" = thứ tự số nhãn trong từng bộ trên Hugging Face
SOURCES = {
    "rafdb": {
        "repo": "deanngkl/raf-db-7emotions",
        "files": [f"data/train-0000{i}-of-00005.parquet" for i in range(5)],
        "names": ["anger", "disgust", "fear", "happiness", "neutral", "sadness", "surprise"],
    },
    "affectnet": {
        "repo": "Mauregato/affectnet_short",
        "files": [
            "data/train-00000-of-00001-7cbcbf03ccc4c14c.parquet",
            "data/val-00000-of-00001-15bd8d507ff5dd11.parquet",
        ],
        "names": ["anger", "surprise", "contempt", "happy", "neutral", "fear", "sad", "disgust"],
    },
    "ferplus": {
        "repo": "deanngkl/ferplus-7cls",
        "files": ["data/train-00000-of-00001.parquet"],
        "names": ["anger", "disgust", "fear", "happiness", "neutral", "sadness", "surprise"],
    },
}

LABEL_MAP = {
    "anger": "angry", "angry": "angry",
    "happiness": "happy", "happy": "happy",
    "neutral": "neutral",
    "sadness": "sad", "sad": "sad",
    "surprise": "surprise",
}
DROPPED = {"disgust", "fear", "contempt"}  # không có ánh xạ nhạc rõ ràng -> bỏ


def map_label(name):
    return LABEL_MAP.get(name)


def is_excluded(filename):
    return person_of(filename) in EXCLUDED_PEOPLE


def person_of(path):
    """Tên người lấy từ tên file <ten>_<camxuc>_<timestamp>.jpg."""
    return os.path.basename(path.replace("\\", "/")).rsplit("_", 2)[0]


def quality_reason(gray):
    """Lý do loại ảnh (đo trên ảnh xám cỡ gốc), None nếu ảnh dùng được."""
    if min(gray.shape[:2]) < MIN_FACE:
        return "too_small"
    if not LIGHT_RANGE[0] <= float(gray.mean()) <= LIGHT_RANGE[1]:
        return "bad_light"
    if cv2.Laplacian(gray, cv2.CV_64F).var() < BLUR_MIN:
        return "blurry"
    return None


def dhash(gray):
    """'Dấu vân tay' 64 bit: so độ sáng từng cặp điểm kề nhau trên ảnh thu nhỏ 9x8."""
    small = cv2.resize(gray, (9, 8), interpolation=cv2.INTER_AREA)
    bits = (small[:, 1:] > small[:, :-1]).flatten()
    return int("".join("1" if b else "0" for b in bits), 2)


def hamming(a, b):
    return (a ^ b).bit_count()


def dedup_near(hashes, max_dist):
    """Giữ ảnh đầu tiên của mỗi cụm ảnh gần giống nhau (so với mọi ảnh đã giữ)."""
    kept = []
    for i, h in enumerate(hashes):
        if all(hamming(h, hashes[k]) > max_dist for k in kept):
            kept.append(i)
    return kept


def dedup_exact(hashes):
    seen, kept = set(), []
    for i, h in enumerate(hashes):
        if h not in seen:
            seen.add(h)
            kept.append(i)
    return kept


def read_label_fixes(path):
    """label_fixes.csv (do review_labels.py ghi) -> {tên file: (action, new_label)}."""
    if not os.path.isfile(path):
        return {}
    with open(path, newline="", encoding="utf-8") as f:
        return {r["file"]: (r["action"], r["new_label"]) for r in csv.DictReader(f)}


def apply_label_fix(filename, label, fixes):
    """Nhãn sau khi sửa; None = bỏ ảnh. Ảnh không có trong fixes giữ nguyên nhãn."""
    action, new_label = fixes.get(filename, ("keep", ""))
    if action == "drop":
        return None
    if action == "relabel":
        return new_label
    return label


def holdout_mask(n, frac, seed):
    return (np.random.default_rng(seed).random(n) < frac).tolist()


# ====== CHẠY THẬT ======
def _count(stats, source, key, n=1):
    stats.setdefault(source, {}).setdefault(key, 0)
    stats[source][key] += n


def _save_png(gray, source, label, name):
    folder = os.path.join(OUT_DIR, source, label)
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, name)
    cv2.imwrite(path, gray)
    return path.replace("\\", "/")


def process_own(fixes, removed, data_dir=DATA_DIR, source="own"):
    """Ảnh tự chụp (hoặc ảnh phản hồi, source="feedback"): áp label_fixes -> lọc kém -> chuẩn hoá
    -> lọc trùng trong từng (người, cảm xúc). Cùng cấu trúc thư mục <camxuc>/<nguoi>_<camxuc>_<thoi diem>.jpg."""
    groups = {}
    for emo in EMOTIONS:
        folder = os.path.join(data_dir, emo)
        if not os.path.isdir(folder):
            continue
        for name in sorted(os.listdir(folder)):
            if not name.lower().endswith((".jpg", ".png")):
                continue
            if source == "own" and is_excluded(name):
                _count(removed, source, "excluded_person")
                continue
            label = apply_label_fix(name, emo, fixes)
            if label is None:
                _count(removed, source, "label_fix_drop")
                continue
            path = os.path.join(folder, name)
            rgb = np.asarray(Image.open(path).convert("RGB"))
            reason = quality_reason(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY))
            if reason:
                _count(removed, source, reason)
                continue
            groups.setdefault((person_of(name), label), []).append((name, path, preprocess_face(rgb)))

    rows = []
    for (person, label), items in sorted(groups.items()):
        keep = dedup_near([dhash(g) for _, _, g in items], OWN_DUP_DIST)
        _count(removed, source, "near_duplicate", len(items) - len(keep))
        for k in keep:
            name, path, gray = items[k]
            out = _save_png(gray, source, label, os.path.splitext(name)[0] + ".png")
            # ảnh phản hồi: split_hint "train" + source khác "own" -> cv_common luôn cho vào tập train,
            # không làm thay đổi các fold "người lạ" dùng để chấm điểm (số liệu cũ vẫn so được)
            rows.append({"path": out, "label": label, "source": source, "person": person,
                         "split_hint": "train", "orig": path.replace("\\", "/")})
    return rows


def download(repo, filename, source):
    from huggingface_hub import hf_hub_download  # nhập ở đây để test không cần mạng
    return hf_hub_download(repo_id=repo, filename=filename, repo_type="dataset",
                           local_dir=os.path.join(RAW_DIR, source))


def iter_parquet(path, names):
    import pyarrow.parquet as pq
    pf = pq.ParquetFile(path)
    for batch in pf.iter_batches(batch_size=256, columns=["image", "label"]):
        for img, lab in zip(batch.column("image").to_pylist(), batch.column("label").to_pylist()):
            yield img["bytes"], names[lab]


def load_public_face(img_bytes):
    """-> (ảnh xám 96x96, None) hoặc (None, lý do loại)."""
    pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    if max(pil.size) > RECROP_ABOVE:
        # Ảnh cắt rộng (có nền, vai...) -> cắt lại bằng Haar cho giống lúc chạy thật
        pil = detect_and_crop_face(pil)
        if pil is None:
            return None, "no_face"
    rgb = np.asarray(pil)
    reason = quality_reason(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY))
    if reason:
        return None, reason
    return preprocess_face(rgb), None


def process_public(removed):
    items = []  # (nguồn, nhãn, ảnh xám 96)
    for source, cfg in SOURCES.items():
        for fname in cfg["files"]:
            print(f"  [{source}] {fname}")
            for img_bytes, raw in iter_parquet(download(cfg["repo"], fname, source), cfg["names"]):
                label = map_label(raw)
                if label is None:
                    _count(removed, source, "other_emotion")
                    continue
                gray, reason = load_public_face(img_bytes)
                if reason:
                    _count(removed, source, reason)
                    continue
                items.append((source, label, gray))

    # Các bản trên Hugging Face có thể chép lẫn nhau -> so trùng chung cả 3 nguồn
    keep = dedup_exact([dhash(g) for _, _, g in items])
    kept_set = set(keep)
    for i, (source, _, _) in enumerate(items):
        if i not in kept_set:
            _count(removed, source, "duplicate")

    rows = []
    for n, (k, is_holdout) in enumerate(zip(keep, holdout_mask(len(keep), HOLDOUT_FRAC, SEED))):
        source, label, gray = items[k]
        out = _save_png(gray, source, label, f"{source}_{n:06d}.png")
        rows.append({"path": out, "label": label, "source": source, "person": "",
                     "split_hint": "public_holdout" if is_holdout else "train", "orig": ""})
    return rows


def main():
    print("=== CHUẨN BỊ DỮ LIỆU EMONET ===\n")
    if os.path.isdir(OUT_DIR):
        shutil.rmtree(OUT_DIR)  # chỉ xoá ảnh đã xử lý (tạo lại được), KHÔNG đụng raw/ và data/
    fixes = read_label_fixes(LABEL_FIXES)
    print(f"label_fixes.csv: {len(fixes)} dòng")
    removed = {}

    print("Ảnh tự chụp...")
    own = process_own(fixes, removed)
    feedback = []
    if os.path.isdir(FEEDBACK_DIR):
        print(f"Ảnh phản hồi người dùng ({FEEDBACK_DIR})...")
        feedback = process_own(fixes, removed, FEEDBACK_DIR, "feedback")
    print("Ảnh công khai (lần đầu phải tải ~2.6 GB)...")
    public = process_public(removed)
    rows = own + feedback + public

    with open(MANIFEST, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["path", "label", "source", "person", "split_hint", "orig"])
        writer.writeheader()
        writer.writerows(rows)

    kept = {}
    for r in rows:
        _count(kept, r["source"], r["label"])
    stats = {"kept": kept, "removed": removed, "total": len(rows),
             "own_people": sorted({r["person"] for r in own}),
             "feedback_people": len({r["person"] for r in feedback}),
             "public_holdout": sum(r["split_hint"] == "public_holdout" for r in rows)}
    with open(STATS, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    print(f"\n{'Nguồn':<10}" + "".join(f"{e:>10}" for e in EMOTIONS) + f"{'Tổng':>10}")
    for source in ["own", "feedback", *SOURCES]:
        counts = kept.get(source, {})
        print(f"{source:<10}" + "".join(f"{counts.get(e, 0):>10}" for e in EMOTIONS) + f"{sum(counts.values()):>10}")
    print("\nẢnh bị loại:", json.dumps(removed, ensure_ascii=False))
    print(f"\n✓ {len(rows)} ảnh -> {MANIFEST}")


if __name__ == "__main__":
    main()

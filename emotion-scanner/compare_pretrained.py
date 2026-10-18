"""
SO SÁNH VỚI CÁC MODEL CÓ SẴN (tải về dùng luôn, KHÔNG train thêm trên dữ liệu của nhóm).

Chấm trên đúng 778 ảnh tự chụp của 8 người (cùng manifest, cùng 4 fold người lạ
2 người/fold như EmoNet) -> điểm so được trực tiếp với EmoNet ở results/exp_full.md.
Các model này chưa từng thấy 8 người này nên mọi người đều là "người lạ" với chúng.

Model có sẵn đoán 7-8 cảm xúc; EmoTune chỉ dùng 5 -> bỏ disgust / fear / contempt
và lấy cảm xúc có xác suất cao nhất trong 5 lớp còn lại (giống cách ta bỏ 3 lớp đó lúc train).
Ảnh đầu vào = ảnh mặt đã cắt lúc chụp (data/<cảm xúc>/*.jpg, ảnh màu), mỗi model
dùng bộ tiền xử lý riêng của nó.

Cách chạy:  PYTHONUTF8=1 python compare_pretrained.py      (lần đầu tải model từ mạng)
Kết quả:    results/pretrained_compare.md + .json
"""

import json
import os
import statistics
import time

import numpy as np
import torch
from PIL import Image

from cv_common import evaluate, load_manifest, make_folds
from emonet import EMOTIONS
from train_emonet import MANIFEST, RESULTS

# đổi tên nhãn của từng model về tên 5 lớp của EmoTune
ALIASES = {"anger": "angry", "happiness": "happy", "sadness": "sad", "surprised": "surprise"}


def to_ours(label):
    name = label.lower().strip()
    return ALIASES.get(name, name)


class HFModel:
    """Model phân loại ảnh trên Hugging Face (transformers)."""

    def __init__(self, repo):
        from transformers import AutoImageProcessor, AutoModelForImageClassification
        self.processor = AutoImageProcessor.from_pretrained(repo)
        self.model = AutoModelForImageClassification.from_pretrained(repo).eval()
        labels = [to_ours(self.model.config.id2label[i]) for i in range(self.model.config.num_labels)]
        self.cols = [labels.index(e) for e in EMOTIONS]  # cột của 5 lớp ta dùng
        self.params = sum(p.numel() for p in self.model.parameters())
        self.size_mb = self.params * 4 / 1e6

    @torch.no_grad()
    def probs(self, images):
        x = self.processor(images=images, return_tensors="pt")
        logits = self.model(**x).logits[:, self.cols]
        return torch.softmax(logits, dim=1).numpy()


class HSEmotion:
    """HSEmotion (EfficientNet train trên AffectNet), bản ONNX của tác giả."""

    def __init__(self, name):
        from hsemotion_onnx.facial_emotions import HSEmotionRecognizer, get_model_path
        self.rec = HSEmotionRecognizer(model_name=name)
        labels = [to_ours(self.rec.idx_to_class[i]) for i in range(len(self.rec.idx_to_class))]
        self.cols = [labels.index(e) for e in EMOTIONS]
        self.size_mb = os.path.getsize(get_model_path(name)) / 1e6
        import onnx
        graph = onnx.load(get_model_path(name)).graph
        self.params = sum(int(np.prod(t.dims)) for t in graph.initializer)

    def probs(self, images):
        logits = np.stack([self.rec.predict_emotions(np.asarray(im), logits=True)[1] for im in images])
        z = logits[:, self.cols]
        z = np.exp(z - z.max(axis=1, keepdims=True))
        return z / z.sum(axis=1, keepdims=True)


MODELS = [
    # (tên hiển thị, đã học trên bộ nào, hàm tạo)
    ("ViT trpakov", "FER2013", lambda: HFModel("trpakov/vit-face-expression")),
    ("ViT dima806", "Hugging Face, 7 cảm xúc", lambda: HFModel("dima806/facial_emotions_image_detection")),
    ("HSEmotion EfficientNet-B0", "AffectNet", lambda: HSEmotion("enet_b0_8_best_vgaf")),
    ("HSEmotion EfficientNet-B2", "AffectNet", lambda: HSEmotion("enet_b2_8")),
]


def time_one(model, image, repeats=20):
    """ms / ảnh trên CPU, 1 ảnh mỗi lần (giống server), bỏ lần chạy đầu."""
    model.probs([image])
    t = time.perf_counter()
    for _ in range(repeats):
        model.probs([image])
    return (time.perf_counter() - t) / repeats * 1000


def main():
    torch.set_num_threads(os.cpu_count() or 4)
    rows = load_manifest(MANIFEST)
    folds = make_folds(rows)
    own = [i for i, r in enumerate(rows) if r["source"] == "own"]
    images = {i: Image.open(rows[i]["orig"]).convert("RGB") for i in own}
    y = {i: EMOTIONS.index(rows[i]["label"]) for i in own}

    out = []
    for name, trained_on, make in MODELS:
        print(f"== {name}")
        model = make()
        pred = {}
        batch = 32
        for s in range(0, len(own), batch):
            idx = own[s:s + batch]
            p = model.probs([images[i] for i in idx])
            pred.update(zip(idx, p.argmax(axis=1).tolist()))
        fold_res = []
        for f in folds:
            res = evaluate([y[i] for i in f["test_idx"]], [pred[i] for i in f["test_idx"]])
            res["test_people"] = f["test_people"]
            fold_res.append(res)
        allres = evaluate([y[i] for i in own], [pred[i] for i in own])
        ms = time_one(model, images[own[0]])
        f1s = [r["macro_f1"] for r in fold_res]
        accs = [r["accuracy"] for r in fold_res]
        item = {
            "name": name, "trained_on": trained_on,
            "macro_f1": {"mean": statistics.mean(f1s), "std": statistics.pstdev(f1s)},
            "accuracy": {"mean": statistics.mean(accs), "std": statistics.pstdev(accs)},
            "folds": fold_res, "pooled": allres,
            "params": int(model.params), "size_mb": model.size_mb, "cpu_ms": ms,
        }
        print(f"   macro-F1 {item['macro_f1']['mean']:.3f} ± {item['macro_f1']['std']:.3f}  "
              f"acc {item['accuracy']['mean']:.3f}  {ms:.0f} ms/ảnh")
        out.append(item)
        del model

    os.makedirs(RESULTS, exist_ok=True)
    with open(os.path.join(RESULTS, "pretrained_compare.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    write_md(out)


def pct(v):
    return f"{v * 100:.1f}%"


def write_md(out):
    lines = [
        "# So sánh với model có sẵn (không train thêm) — 778 ảnh tự chụp, 4 fold người lạ",
        "",
        "Cách chấm giống EmoNet: macro-F1 / accuracy trung bình 4 fold (2 người/fold).",
        "Model 7–8 lớp: bỏ disgust / fear / contempt, lấy lớp cao nhất trong 5 lớp.",
        "",
        "| Model | Học trên | Macro-F1 | Accuracy | " + " | ".join(f"Recall {e}" for e in EMOTIONS)
        + " | Tham số | File | CPU ms/ảnh |",
        "|---" * (8 + len(EMOTIONS)) + "|",
    ]
    for m in out:
        rec = m["pooled"]["recall"]
        lines.append(
            f"| {m['name']} | {m['trained_on']} | {pct(m['macro_f1']['mean'])} ± {pct(m['macro_f1']['std'])} | "
            f"{pct(m['accuracy']['mean'])} | " + " | ".join(pct(rec[e]) for e in EMOTIONS)
            + f" | {m['params'] / 1e6:.1f}M | {m['size_mb']:.0f} MB | {m['cpu_ms']:.0f} |")
    lines += ["", "Từng fold (macro-F1):", "",
              "| Model | " + " | ".join(", ".join(f["test_people"]) for f in out[0]["folds"]) + " |",
              "|---" * (1 + len(out[0]["folds"])) + "|"]
    for m in out:
        lines.append(f"| {m['name']} | " + " | ".join(pct(f["macro_f1"]) for f in m["folds"]) + " |")
    with open(os.path.join(RESULTS, "pretrained_compare.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()

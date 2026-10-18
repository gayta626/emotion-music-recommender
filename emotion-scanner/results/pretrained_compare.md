# So sánh với model có sẵn (không train thêm) — 778 ảnh tự chụp, 4 fold người lạ

Cách chấm giống EmoNet: macro-F1 / accuracy trung bình 4 fold (2 người/fold).
Model 7–8 lớp: bỏ disgust / fear / contempt, lấy lớp cao nhất trong 5 lớp.

| Model | Học trên | Macro-F1 | Accuracy | Recall neutral | Recall happy | Recall sad | Recall angry | Recall surprise | Tham số | File | CPU ms/ảnh |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ViT trpakov | FER2013 | 50.6% ± 3.4% | 53.5% | 87.2% | 74.7% | 12.8% | 21.5% | 66.0% | 85.8M | 343 MB | 73 |
| ViT dima806 | Hugging Face, 7 cảm xúc | 50.5% ± 4.4% | 53.8% | 82.7% | 91.8% | 12.8% | 15.8% | 62.6% | 85.8M | 343 MB | 75 |
| HSEmotion EfficientNet-B0 | AffectNet | 72.3% ± 10.6% | 73.4% | 62.6% | 76.0% | 58.1% | 78.5% | 95.2% | 4.0M | 16 MB | 6 |
| HSEmotion EfficientNet-B2 | AffectNet | 71.9% ± 7.9% | 72.3% | 73.2% | 90.4% | 47.3% | 66.5% | 85.0% | 7.7M | 31 MB | 10 |

Từng fold (macro-F1):

| Model | mom, nhat | phuc, trung | ducvinh, vanquynh | dung, vy |
|---|---|---|---|---|
| ViT trpakov | 49.0% | 47.0% | 50.5% | 56.0% |
| ViT dima806 | 52.7% | 46.5% | 46.2% | 56.7% |
| HSEmotion EfficientNet-B0 | 78.6% | 75.1% | 81.2% | 54.3% |
| HSEmotion EfficientNet-B2 | 74.1% | 70.2% | 82.7% | 60.7% |

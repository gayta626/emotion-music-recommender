# Kết quả 4 fold người lạ — emonet

**Trung bình ± độ lệch qua 4 fold:** accuracy 72.7% ± 6.7% · macro-F1 73.5% ± 5.7% · macro-F1 val công khai 71.9% (cũng dùng để dừng sớm nên không phải điểm test)

| Fold | Người test | Người val | Epoch tốt nhất | Acc test | Macro-F1 test | Macro-F1 val công khai |
|---|---|---|---|---|---|---|
| 1 | mom, nhat | ducvinh | 26 | 74.0% | 75.1% | 76.9% |
| 2 | phuc, trung | dung | 9 | 74.3% | 74.8% | 69.1% |
| 3 | ducvinh, vanquynh | nhat | 8 | 80.5% | 80.0% | 67.1% |
| 4 | dung, vy | phuc | 15 | 62.0% | 64.3% | 74.5% |

## Từng người lạ (recall từng cảm xúc)

| Người | Ảnh | Acc | Macro-F1 | neutral | happy | sad | angry | surprise |
|---|---|---|---|---|---|---|---|---|
| mom | 70 | 85.7% | 86.3% | 100.0% | 92.3% | 90.0% | 100.0% | 55.6% |
| nhat | 122 | 67.2% | 68.8% | 43.8% | 95.7% | 82.6% | 76.5% | 51.9% |
| phuc | 135 | 66.7% | 65.2% | 42.4% | 33.3% | 63.0% | 96.8% | 82.8% |
| trung | 87 | 86.2% | 87.2% | 88.2% | 90.0% | 60.0% | 100.0% | 100.0% |
| ducvinh | 122 | 79.5% | 78.9% | 71.4% | 91.7% | 68.2% | 69.0% | 96.2% |
| vanquynh | 63 | 82.5% | 75.3% | 92.9% | 100.0% | 84.6% | 11.1% | 100.0% |
| dung | 115 | 59.1% | 48.7% | 83.3% | 100.0% | 38.1% | 0.0% | — |
| vy | 64 | 67.2% | 66.1% | 100.0% | 72.7% | 8.3% | 63.2% | 100.0% |

**Recall trung bình:** neutral 71.6% · happy 86.7% · sad 62.0% · angry 66.5% · surprise 85.2%

## Confusion matrix cộng dồn (hàng = thật, cột = đoán)

| Thật \ Đoán | neutral | happy | sad | angry | surprise |
|---|---|---|---|---|---|
| neutral | 127 | 14 | 7 | 20 | 11 |
| happy | 6 | 127 | 0 | 5 | 8 |
| sad | 38 | 6 | 92 | 6 | 6 |
| angry | 40 | 12 | 5 | 101 | 0 |
| surprise | 11 | 8 | 1 | 7 | 120 |

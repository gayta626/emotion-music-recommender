# Kết quả 4 fold người lạ — vit

**Trung bình ± độ lệch qua 4 fold:** accuracy 71.2% ± 10.1% · macro-F1 70.2% ± 11.2% · macro-F1 val công khai 77.0% (cũng dùng để dừng sớm nên không phải điểm test)

| Fold | Người test | Người val | Epoch tốt nhất | Acc test | Macro-F1 test | Macro-F1 val công khai |
|---|---|---|---|---|---|---|
| 1 | mom, nhat | ducvinh | 4 | 70.8% | 70.3% | 78.1% |
| 2 | phuc, trung | dung | 4 | 76.1% | 75.4% | 75.0% |
| 3 | ducvinh, vanquynh | nhat | 4 | 82.7% | 82.7% | 78.0% |
| 4 | dung, vy | phuc | 3 | 55.3% | 52.4% | 76.8% |

## Từng người lạ (recall từng cảm xúc)

| Người | Ảnh | Acc | Macro-F1 | neutral | happy | sad | angry | surprise |
|---|---|---|---|---|---|---|---|---|
| mom | 70 | 78.6% | 79.2% | 57.1% | 100.0% | 100.0% | 93.3% | 55.6% |
| nhat | 122 | 66.4% | 66.0% | 31.2% | 95.7% | 82.6% | 94.1% | 51.9% |
| phuc | 135 | 81.5% | 77.9% | 78.8% | 40.0% | 70.4% | 96.8% | 100.0% |
| trung | 87 | 67.8% | 64.3% | 82.4% | 70.0% | 45.0% | 30.0% | 95.0% |
| ducvinh | 122 | 82.0% | 82.2% | 95.2% | 83.3% | 68.2% | 69.0% | 96.2% |
| vanquynh | 63 | 84.1% | 81.5% | 100.0% | 100.0% | 76.9% | 33.3% | 94.1% |
| dung | 115 | 43.5% | 30.4% | 63.9% | 86.7% | 4.8% | 0.0% | — |
| vy | 64 | 76.6% | 69.1% | 100.0% | 72.7% | 0.0% | 100.0% | 100.0% |

**Recall trung bình:** neutral 72.3% · happy 81.4% · sad 55.5% · angry 68.8% · surprise 86.7%

## Confusion matrix cộng dồn (hàng = thật, cột = đoán)

| Thật \ Đoán | neutral | happy | sad | angry | surprise |
|---|---|---|---|---|---|
| neutral | 127 | 18 | 8 | 23 | 3 |
| happy | 8 | 119 | 1 | 3 | 15 |
| sad | 54 | 5 | 83 | 4 | 2 |
| angry | 21 | 21 | 9 | 105 | 2 |
| surprise | 6 | 13 | 0 | 5 | 123 |

# Kết quả 5 fold người lạ — emonet

**Trung bình ± độ lệch qua 5 fold:** accuracy 63.0% ± 9.8% · macro-F1 62.0% ± 10.2% · macro-F1 val công khai 72.9% (cũng dùng để dừng sớm nên không phải điểm test)

| Fold | Người test | Người val | Epoch tốt nhất | Acc test | Macro-F1 test | Macro-F1 val công khai |
|---|---|---|---|---|---|---|
| 1 | phuc, trung | dat | 9 | 70.3% | 71.0% | 64.8% |
| 2 | mom, vy | ducvinh | 30 | 78.4% | 76.7% | 75.7% |
| 3 | dung, nhat | mom | 22 | 59.1% | 57.5% | 75.5% |
| 4 | dat, vanquynh | nhat | 14 | 52.8% | 49.1% | 73.9% |
| 5 | ducvinh, phat | phuc | 19 | 54.5% | 55.7% | 74.6% |

## Từng người lạ (recall từng cảm xúc)

| Người | Ảnh | Acc | Macro-F1 | neutral | happy | sad | angry | surprise |
|---|---|---|---|---|---|---|---|---|
| phuc | 135 | 67.4% | 66.0% | 17.6% | 43.8% | 85.2% | 96.7% | 92.9% |
| trung | 87 | 74.7% | 68.8% | 94.1% | 90.0% | 45.0% | 20.0% | 100.0% |
| mom | 70 | 81.4% | 81.2% | 100.0% | 92.3% | 70.0% | 100.0% | 50.0% |
| vy | 64 | 75.0% | 73.8% | 100.0% | 72.7% | 25.0% | 78.9% | 100.0% |
| dung | 114 | 51.8% | 48.7% | 52.8% | 100.0% | 59.1% | 3.3% | — |
| nhat | 123 | 65.9% | 66.7% | 43.8% | 95.2% | 87.0% | 76.5% | 46.7% |
| dat | 64 | 34.4% | 26.5% | 91.7% | 52.6% | 6.2% | 0.0% | — |
| vanquynh | 61 | 72.1% | 67.1% | 91.7% | 100.0% | 53.8% | 11.1% | 88.2% |
| ducvinh | 123 | 74.8% | 75.4% | 95.0% | 72.0% | 50.0% | 63.3% | 96.2% |
| phat | 167 | 39.5% | 37.1% | 93.9% | 25.0% | 5.6% | 6.1% | 75.9% |

**Recall trung bình:** neutral 75.5% · happy 72.8% · sad 47.4% · angry 46.5% · surprise 76.8%

## Confusion matrix cộng dồn (hàng = thật, cột = đoán)

| Thật \ Đoán | neutral | happy | sad | angry | surprise |
|---|---|---|---|---|---|
| neutral | 153 | 21 | 2 | 39 | 7 |
| happy | 44 | 138 | 1 | 8 | 6 |
| sad | 82 | 7 | 96 | 7 | 9 |
| angry | 65 | 31 | 13 | 97 | 4 |
| surprise | 9 | 10 | 1 | 17 | 141 |

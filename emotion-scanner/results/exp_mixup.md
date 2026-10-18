# Thử nghiệm EmoNet — mixup

| | Acc (TB 4 fold) | Macro-F1 (TB 4 fold) |
|---|---|---|
| seed 42 | 70.1% ± 4.1% | 70.5% ± 3.4% |
| seed 1042 | 72.5% ± 6.6% | 72.7% ± 5.7% |
| seed 2042 | 65.3% ± 2.9% | 64.2% ± 3.4% |
| **ghép 3 seed** | **71.1% ± 4.9%** | **71.2% ± 4.3%** |

Macro-F1 1 seed: thấp nhất 64.2%, cao nhất 72.7% (dao động do may rủi). Epoch tốt nhất: [22, 26, 28, 14, 19, 9, 22, 22, 6, 24, 11, 27]

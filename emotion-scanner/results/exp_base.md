# Thử nghiệm EmoNet — base

| | Acc (TB 4 fold) | Macro-F1 (TB 4 fold) |
|---|---|---|
| seed 42 | 72.7% ± 6.7% | 73.5% ± 5.7% |
| seed 1042 | 71.5% ± 9.0% | 71.6% ± 8.5% |
| seed 2042 | 67.4% ± 5.9% | 65.5% ± 8.4% |
| **ghép 3 seed** | **72.0% ± 6.1%** | **72.8% ± 4.9%** |

Macro-F1 1 seed: thấp nhất 65.5%, cao nhất 73.5% (dao động do may rủi). Epoch tốt nhất: [26, 23, 19, 9, 16, 23, 8, 10, 5, 15, 23, 7]

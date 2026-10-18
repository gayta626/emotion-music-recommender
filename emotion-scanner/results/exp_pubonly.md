# Thử nghiệm EmoNet — pubonly

| | Acc (TB 4 fold) | Macro-F1 (TB 4 fold) |
|---|---|---|
| seed 42 | 61.7% ± 6.0% | 59.5% ± 7.9% |
| seed 1042 | 63.0% ± 4.1% | 62.3% ± 5.0% |
| seed 2042 | 64.3% ± 2.7% | 63.0% ± 4.4% |
| **ghép 3 seed** | **63.4% ± 4.7%** | **62.4% ± 5.8%** |

Macro-F1 1 seed: thấp nhất 59.5%, cao nhất 63.0% (dao động do may rủi). Epoch tốt nhất: [23, 27, 21, 25, 17, 27, 20, 20, 17, 25, 15, 23]

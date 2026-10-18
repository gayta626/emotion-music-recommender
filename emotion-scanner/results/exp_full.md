# Thử nghiệm EmoNet — full

| | Acc (TB 4 fold) | Macro-F1 (TB 4 fold) |
|---|---|---|
| seed 42 | 74.8% ± 7.7% | 75.4% ± 6.6% |
| seed 1042 | 71.6% ± 6.4% | 71.6% ± 6.0% |
| seed 2042 | 72.7% ± 6.2% | 72.6% ± 6.3% |
| **ghép 3 seed** | **72.6% ± 7.2%** | **73.1% ± 6.1%** |

Macro-F1 1 seed: thấp nhất 71.6%, cao nhất 75.4% (dao động do may rủi). Epoch tốt nhất: [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]

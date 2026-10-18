# Thử nghiệm EmoNet — kd

| | Acc (TB 4 fold) | Macro-F1 (TB 4 fold) |
|---|---|---|
| seed 42 | 73.2% ± 6.4% | 72.6% ± 7.2% |
| seed 1042 | 71.2% ± 6.8% | 70.2% ± 8.3% |
| seed 2042 | 72.7% ± 8.8% | 72.4% ± 8.8% |
| **ghép 3 seed** | **74.4% ± 6.8%** | **73.7% ± 7.4%** |

Macro-F1 1 seed: thấp nhất 70.2%, cao nhất 72.6% (dao động do may rủi). Epoch tốt nhất: [22, 18, 29, 8, 11, 21, 7, 21, 26, 15, 8, 19]

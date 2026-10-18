# AI_NOTES.md — Model nhận diện cảm xúc của EmoTune

> Cập nhật 17/10/2026: model chính là **EmoNet**, một CNN **tự thiết kế, train từ đầu**. Model ViT cũ chỉ còn dùng làm mốc so sánh và để dự phòng (`EMOTION_MODEL=vit`). Nhật ký ViT cũ nằm ở **Phụ lục** cuối file.
> Đồ án HTTM chỉ có phần mềm: model chạy trên CPU / GPU của máy chủ (PC, laptop), web gửi ảnh từ webcam.
> **Số chính để báo cáo (15/10/2026), macro-F1 trên người lạ, 4 fold, trung bình 3 seed:**
> - Cách train ban đầu (dừng sớm): **70,2%**. Lần chạy may mắn nhất (seed 42) đạt 73,5%, model đó **đã được thay** ngày 15/10.
> - Cách "full" (không dừng sớm): **73,2%**. Đây là model **đang chạy**: `my_emonet/emonet.pt` = `emonet_full.pt`.
> - Mỗi lượt quét gộp 5 tấm: khoảng **80%** (ước lượng).
> - ViT train lại cùng quy trình: 70,2%.
> - ViT cũ: 72,5% accuracy trên 2 người lạ.
>
> - Ngưỡng "chưa chắc" (tin cậy < 60% → hỏi người dùng thay vì đoán) + vòng phản hồi người dùng sửa cảm xúc → dữ liệu train lại: mục 7.1–7.2 (17/10).
>
> Chi tiết ở mục 6.2–6.4 và 7.
> Thiết kế: `docs/superpowers/specs/2026-10-12-emonet-retrain-design.md` · Kế hoạch: `docs/superpowers/plans/2026-10-12-emonet-retrain.md`.

## 1. Vì sao train lại

Model ViT cũ (fine-tune `trpakov/vit-face-expression` bằng ảnh của 10 người) có các vấn đề sau:

- Chỉ đạt **72,5%** trên 2 người lạ (ducvinh, vanquynh). Lớp `angry` chỉ đúng **26%**, phần lớn bị đoán thành neutral.
- **Overfit mạnh**: loss train còn 0,004. Lý do là ảnh tự chụp được chụp liên tục nên rất nhiều ảnh gần như trùng nhau, model học thuộc từng khuôn mặt thay vì học biểu cảm.
- Lỗi code: `load_best_model_at_end` không nạp checkpoint tốt nhất.
- Chỉ chia train/val **1 lần** với 2 người. Con số 92,5% cũ còn bị ảo hơn nữa vì chia theo ảnh chứ không chia theo người.
- Model ViT nặng 343 MB, 85,8 triệu tham số, chậm khi chạy trên CPU (~90 ms/ảnh).

Mục tiêu lần này: có model **tự xây và tự train từng bước**, ít overfit, đánh giá nghiêm túc trên **người lạ** (người model chưa từng thấy), và chạy nhanh trên CPU thường (không cần GPU khi dùng thật).

Không dùng Edge Impulse vì 3 lý do: (1) phải upload ảnh mặt 10 người lên cloud; (2) gói miễn phí giới hạn thời gian train; (3) không tự kiểm soát được cách chia dữ liệu theo người và cách chấm điểm.

## 2. Dữ liệu

### 2.1 Nguồn

| Nguồn | Hugging Face | Ảnh gốc | Giữ lại (5 lớp) |
|---|---|---|---|
| RAF-DB | [`deanngkl/raf-db-7emotions`](https://huggingface.co/datasets/deanngkl/raf-db-7emotions) | 20.471 | 18.668 |
| AffectNet (bản rút gọn) | [`Mauregato/affectnet_short`](https://huggingface.co/datasets/Mauregato/affectnet_short) | 29.042 | 20.402 |
| FER+ | [`deanngkl/ferplus-7cls`](https://huggingface.co/datasets/deanngkl/ferplus-7cls) | 35.481 | 32.687 |
| Ảnh tự chụp | `emotion-scanner/data/` | 1.934 (10 người) | 778 (8 người) |

**Giấy phép:** cả 3 bộ công khai là bản sao dữ liệu nghiên cứu với giấy phép **phi thương mại**. Chỉ dùng cho đồ án, có ghi nguồn ở trên, và **không đưa vào git** (thư mục `data_public/` nằm trong `.gitignore`). Ảnh mặt của 10 người không gửi lên bất kỳ dịch vụ nào.

Số ảnh giữ lại theo lớp (lấy từ `data_public/stats.json`):

| Nguồn | neutral | happy | sad | angry | surprise | Tổng |
|---|---|---|---|---|---|---|
| ảnh tự chụp | 179 | 146 | 148 | 158 | 147 | 778 |
| rafdb | 4.736 | 5.900 | 2.453 | 3.975 | 1.604 | 18.668 |
| affectnet | 5.125 | 5.042 | 3.039 | 3.175 | 4.021 | 20.402 |
| ferplus | 12.692 | 9.128 | 4.170 | 2.965 | 3.732 | 32.687 |

Ảnh bị loại, theo lý do:

| Nguồn | Lý do |
|---|---|
| ảnh tự chụp | 788–925 ảnh **gần trùng** (chụp liên tục), 364 ảnh của 2 người bị loại hẳn (mục 2.3), 3 ảnh bỏ khi soi nhãn, 1 ảnh mờ |
| rafdb | 1.232 cảm xúc khác (disgust/fear), 314 không tìm thấy mặt, 236 mờ, 16 quá tối/sáng, 5 trùng |
| affectnet | 8.524 cảm xúc khác (disgust/fear/contempt), 113 trùng, 3 quá tối/sáng |
| ferplus | 1.079 cảm xúc khác, **1.706 trùng**, 9 quá tối/sáng |

Có 5% ảnh công khai (3.578 ảnh, cố định theo seed 42) được tách ra làm **val công khai** (`public_holdout`). Các ảnh này không bao giờ dùng để train, nhưng **có dùng để dừng sớm và chọn checkpoint**, nên điểm trên chúng là điểm val chứ không phải điểm test độc lập. Lọc trùng chỉ bỏ ảnh trùng khít: kiểm tra sau cùng cho thấy còn 298/3.578 ảnh val (8%) có ảnh train rất giống (dHash ≤ 6).

### 2.2 Tiền xử lý — `prepare_data.py`

1. Tải parquet của 3 bộ về `data_public/raw/`. Đã tải rồi thì bỏ qua.
2. **Đổi nhãn về 5 lớp:** anger→angry, happiness→happy, sadness→sad, giữ neutral và surprise; bỏ disgust, fear, contempt (không có loại nhạc nào ứng với các cảm xúc này một cách rõ ràng).
3. **Cắt mặt:** ảnh công khai có cạnh > 150px (RAF-DB có cả ảnh cắt rộng còn dính nền) được cắt lại bằng Haar, **giống hệt lúc chạy thật**. Không tìm thấy mặt thì bỏ ảnh.
4. **Lọc ảnh kém:** mặt nhỏ hơn 40px; quá mờ (phương sai Laplacian < 20); quá tối hoặc cháy sáng (độ sáng trung bình nằm ngoài khoảng 25–230).
5. **Áp `label_fixes.csv`:** đổi nhãn hoặc bỏ những ảnh tự chụp đã soi (mục 2.4). Ảnh gốc không bị sửa.
6. **Chuẩn hoá** bằng `emonet.preprocess_face`: chuyển ảnh xám → resize 96×96 → **CLAHE** (cân bằng sáng theo từng vùng nhỏ, giúp mắt và miệng rõ hơn khi phòng tối hoặc ngược sáng). Train và server **dùng chung đúng một hàm này**, nên ảnh lúc train và lúc chạy thật luôn được xử lý giống nhau.
7. **Lọc gần trùng bằng dHash** (dấu vân tay 64 bit). Ảnh tự chụp được so trong từng nhóm (người, cảm xúc), khác nhau ≤ 6/64 bit thì coi là trùng. Ảnh công khai được so chung cả 3 nguồn và chỉ bỏ khi trùng khít.
8. Ghi `data_public/manifest.csv`: `path, label, source, person, split_hint, orig`.
9. Ghi `data_public/stats.json`: số ảnh giữ lại và số ảnh bị loại theo từng lý do.

**Vì sao dùng ảnh xám 96×96:** (1) FER+ vốn là ảnh xám 48px, nếu dùng ảnh màu thì 3 bộ dữ liệu không đồng nhất; (2) cảm xúc nằm ở **hình dạng** mắt, mày, miệng, không nằm ở màu; (3) ảnh nhỏ thì model nhẹ, chạy nhanh trên CPU.

### 2.3 Loại hẳn 2 người: `dat`, `phat`

Sau lần chấm 5 fold đầu tiên, mình ghép ảnh theo từng cảm xúc của từng người để xem trực tiếp (`data_public/review_dat.png`, `review_phat.png`):

- **dat:** ảnh neutral, sad và angry gần như cùng một vẻ mặt; nhiều ảnh gắn nhãn "angry" thật ra đang cười; không có ảnh surprise.
- **phat:** neutral, sad và angry đều là cùng một vẻ mặt cau có; ảnh gắn nhãn "happy" không có ảnh nào cười.

Lý do loại là **nhãn không đáng tin vì lúc chụp biểu cảm không đúng**, không phải vì model đoán sai họ. Giữ những ảnh này thì model bị dạy sai, ví dụ "mặt cau có = happy". Vì việc bỏ 2 người khó cũng tự làm điểm trung bình đẹp lên, mục 6 báo **cả** số của 10 người lẫn số của 8 người, kèm một mốc so sánh công bằng là chấm trên cùng 8 người. Cấu hình nằm ở `EXCLUDED_PEOPLE` trong `prepare_data.py`.

### 2.4 Soi lại nhãn — `review_labels.py`

- Mỗi ảnh tự chụp được đoán bởi model của fold mà người đó là **người lạ** (gọi là dự đoán out-of-fold, lưu ở `results/emonet_oof.csv`).
- Ảnh bị nghi là ảnh mà model chắc chắn ≥ 80% vào một nhãn **khác** nhãn hiện tại. Ngưỡng này không làm model tốt hơn, nó chỉ quyết định số ảnh phải xem.
- Người dùng xem từng ảnh trong cửa sổ OpenCV. Quy tắc: **chỉ đổi nhãn khi chính mắt thấy rõ là sai, phân vân thì giữ nguyên**. Quyết định được ghi vào `label_fixes.csv`, ảnh gốc giữ nguyên.
- Kết quả ở ngưỡng 0,8 (đã bỏ qua dat và phat): **45 ảnh** bị nghi → **giữ 29, đổi nhãn 13, bỏ 3**. Ví dụ: 3 ảnh "angry" và 1 ảnh "sad" của dung thật ra đang cười; 2 ảnh "surprise" của nhat cũng đang cười; 2 ảnh "angry" của vanquynh là mặt bình thường. Đây là lỗi điển hình của chụp liên tục: nét mặt đã đổi nhưng nhãn vẫn giữ.
- **Lưu ý trung thực:** 11/13 lần đổi nhãn trùng với cảm xúc model đoán (vì model là thứ chỉ ra ảnh nghi), nên điểm sau khi sửa nhãn có thể hơi lạc quan.

## 3. Kiến trúc EmoNet — `emonet.py`

CNN kiểu ResNet thu nhỏ, **tự thiết kế, khởi tạo ngẫu nhiên (Kaiming), không dùng trọng số có sẵn**:

```
Ảnh xám 1×96×96, chuẩn hoá về [-1, 1]
 → Stem: Conv3×3 (32 kênh, stride 2) → BatchNorm → ReLU      96×96 → 48×48
 → Tầng 1: 2 khối residual, 32 kênh                           48×48
 → Tầng 2: 2 khối residual, 64 kênh, stride 2                 24×24
 → Tầng 3: 2 khối residual, 128 kênh, stride 2                12×12
 → Tầng 4: 2 khối residual, 256 kênh, stride 2                6×6
 → Global Average Pooling → Dropout 0,3 → Linear(256 → 5)
Khối residual: Conv3×3–BN–ReLU–Conv3×3–BN, cộng với đường tắt (Conv1×1 khi đổi cỡ), rồi ReLU
```

| | EmoNet | ViT cũ |
|---|---|---|
| Tham số | **2.795.749** | 85.802.501 |
| File | **11,2 MB** | 343 MB |
| Phép tính / ảnh | **0,31 GMAC** (đo bằng hook) | ~17,6 GMAC |

**Vì sao chọn kiến trúc này:** đường tắt residual giúp mạng 17 lớp vẫn học được, vì gradient đi thẳng qua đường tắt. BatchNorm giúp train ổn định. Global Average Pooling thay cho lớp fully-connected lớn nên bớt tham số và bớt overfit. Lớp stem stride 2 giảm phép tính khoảng 4 lần so với giữ nguyên 96×96 ở tầng đầu, nên model chạy nhanh trên CPU.

## 4. Huấn luyện — `train_emonet.py` (+ `cv_train.py`, `cv_common.py`, `augment.py`)

Các kỹ thuật **chống overfit**:

| Kỹ thuật | Cách làm | Vì sao |
|---|---|---|
| Thêm dữ liệu đa dạng | ~72.000 ảnh của hàng nghìn người (3 bộ công khai) + ảnh tự chụp | 10 người là quá ít, model sẽ học thuộc khuôn mặt |
| Lọc gần trùng | dHash (mục 2.2) | Ảnh chụp liên tục khiến model học thuộc |
| Lấy mẫu cân bằng | Ảnh tự chụp chiếm 20% mỗi batch, 5 lớp ngang nhau | Lớp ít ảnh (surprise, sad) không bị lấn át |
| Augmentation trên GPU | Phóng 0,9–1,15, dịch ±8%, xoay ±15°, lật ngang; sáng ±0,3, tương phản ×0,7–1,3; 30% ảnh bị làm mờ (thu nhỏ 24–48px rồi phóng lại); 50% ảnh bị che 1 hình chữ nhật 10–30% diện tích | Giả lập webcam thật: lệch góc, phòng tối, ảnh mờ, tay hoặc tóc che mặt |
| Label smoothing 0,1 | Nhãn đúng = 0,9 thay vì 1 | Model bớt "chắc chắn quá mức"; loss không thể về ~0 như ViT cũ (0,004) |
| Weight decay 5e-4 + Dropout 0,3 | AdamW | Phạt trọng số lớn |
| Warmup 2 epoch + cosine | Learning rate tăng dần rồi giảm dần về 0 | Train ổn định, cuối quá trình tinh chỉnh nhẹ |
| Dừng sớm | Tối đa 30 epoch, dừng nếu điểm val không tăng sau 10 epoch | Không train quá lâu |
| Nạp checkpoint tốt nhất | Lưu trọng số có điểm val cao nhất, nạp lại trước khi chấm | Sửa lỗi `load_best_model_at_end` của bản cũ |

Các thông số khác: batch 128; 1 epoch = 40.000 ảnh rút theo trọng số; AdamW lr 1e-3; mixed precision bf16 trên GPU RTX 5060 Ti (khoảng 7 giây/epoch); seed 42.

**Lịch sử điều chỉnh:** lần chạy đầu dùng tối đa 40 epoch và `patience` 6. Fold 1 dừng ở epoch 15 nhưng lấy bản ở epoch 9, lúc đó loss vẫn còn 0,91 (learning rate cosine tính cho 40 epoch nên chưa kịp giảm). Log tách 2 phần điểm val cho thấy điểm ảnh công khai vẫn tăng đều (0,60 → 0,74), còn điểm người val (`dat`, khoảng 100 ảnh) nhảy lung tung trong khoảng 0,22–0,49. Vì vậy đã đổi sang 30 epoch và `patience` 10.

## 5. Cách đánh giá: k fold **người lạ**

- Các người tự chụp được xáo theo seed 42 rồi chia **2 người mỗi fold**: 10 người thành 5 fold, 8 người thành 4 fold. Mỗi người được làm "đề thi" đúng 1 lần.
- Trong một fold: 2 người test **không** được dùng để train hay chọn model. 1 người khác làm **val**, cùng với val công khai. Điểm val = 0,5 × macro-F1 ảnh công khai + 0,5 × macro-F1 người val (để khoảng 3.600 ảnh công khai không lấn át khoảng 100 ảnh của người val).
- Báo **macro-F1** (trung bình F1 của 5 lớp, lớp ít ảnh cũng có trọng lượng ngang lớp nhiều ảnh) kèm accuracy, recall từng lớp, confusion matrix, và kết quả **từng người**. Người thiếu một cảm xúc (dung không có surprise) thì macro-F1 chỉ tính trên các lớp có mặt.
- **Model cuối** (`my_emonet/emonet.pt`) được train trên tất cả mọi người, với số epoch = trung vị của "epoch tốt nhất" qua các fold.

## 6. Kết quả

### 6.1 Lần 1: 10 người, chưa soi nhãn (`results/emonet_cv_before_fix.md`)

**accuracy 63,0% ± 9,8% · macro-F1 62,0% ± 10,2%** (trung bình 5 fold) · macro-F1 val công khai 72,9%.

| Người | Acc | Macro-F1 | neutral | happy | sad | angry | surprise |
|---|---|---|---|---|---|---|---|
| mom | 81,4% | 81,2% | 100% | 92,3% | 70,0% | 100% | 50,0% |
| vy | 75,0% | 73,8% | 100% | 72,7% | 25,0% | 78,9% | 100% |
| ducvinh | 74,8% | 75,4% | 95,0% | 72,0% | 50,0% | 63,3% | 96,2% |
| trung | 74,7% | 68,8% | 94,1% | 90,0% | 45,0% | 20,0% | 100% |
| vanquynh | 72,1% | 67,1% | 91,7% | 100% | 53,8% | 11,1% | 88,2% |
| phuc | 67,4% | 66,0% | 17,6% | 43,8% | 85,2% | 96,7% | 92,9% |
| nhat | 65,9% | 66,7% | 43,8% | 95,2% | 87,0% | 76,5% | 46,7% |
| dung | 51,8% | 48,7% | 52,8% | 100% | 59,1% | 3,3% | — |
| phat | 39,5% | 37,1% | 93,9% | 25,0% | 5,6% | 6,1% | 75,9% |
| dat | 34,4% | 26,5% | 91,7% | 52,6% | 6,2% | 0,0% | — |

Lỗi chính: **sad và angry bị đoán thành neutral** (82 và 65 ảnh trong confusion matrix cộng dồn).

**Mốc so sánh công bằng:**
- Chấm trên cùng 8 người còn lại (bỏ dat, phat) nhưng **chưa train lại**: accuracy **70,4%**, macro-F1 **68,5%**. Đây là phần điểm tăng lên chỉ nhờ bỏ 2 người khó ra khỏi đề thi. Mức cải thiện thật của việc làm sạch dữ liệu là phần vượt lên trên mốc này.
- Trên đúng 2 người lạ của ViT cũ (ducvinh, vanquynh): EmoNet đạt khoảng **73,9%** (tính có trọng số theo số ảnh), so với ViT cũ **72,5%**. Hai con số không khớp hoàn toàn về tập ảnh, vì EmoNet được chấm trên ảnh đã lọc trùng.

### 6.2 Lần cuối: 8 người, đã soi nhãn (`results/emonet_cv.md`)

> Lưu ý (14/10): bảng dưới là **một lần chạy (seed 42)**. Chạy lại với 3 seed (mục 6.4) cho thấy lần này may mắn: trung bình cách train này chỉ đạt **70,2%** macro-F1.

Train ngày 13/10/2026 trên GPU, mỗi epoch khoảng 7 giây, cả lượt khoảng 15 phút.

**accuracy 72,7% ± 6,7% · macro-F1 73,5% ± 5,7%** (trung bình 4 fold) · macro-F1 val công khai 71,9%.

| Fold | Người test | Người val | Epoch tốt nhất | Acc | Macro-F1 |
|---|---|---|---|---|---|
| 1 | mom, nhat | ducvinh | 26 | 74,0% | 75,1% |
| 2 | phuc, trung | dung | 9 | 74,3% | 74,8% |
| 3 | ducvinh, vanquynh | nhat | 8 | 80,5% | 80,0% |
| 4 | dung, vy | phuc | 15 | 62,0% | 64,3% |

| Người | Acc | Macro-F1 | neutral | happy | sad | angry | surprise |
|---|---|---|---|---|---|---|---|
| trung | 86,2% | 87,2% | 88,2% | 90,0% | 60,0% | 100% | 100% |
| mom | 85,7% | 86,3% | 100% | 92,3% | 90,0% | 100% | 55,6% |
| vanquynh | 82,5% | 75,3% | 92,9% | 100% | 84,6% | 11,1% | 100% |
| ducvinh | 79,5% | 78,9% | 71,4% | 91,7% | 68,2% | 69,0% | 96,2% |
| nhat | 67,2% | 68,8% | 43,8% | 95,7% | 82,6% | 76,5% | 51,9% |
| vy | 67,2% | 66,1% | 100% | 72,7% | 8,3% | 63,2% | 100% |
| phuc | 66,7% | 65,2% | 42,4% | 33,3% | 63,0% | 96,8% | 82,8% |
| dung | 59,1% | 48,7% | 83,3% | 100% | 38,1% | 0,0% | — |

Confusion matrix cộng dồn 4 fold (hàng = thật, cột = đoán):

| Thật \ Đoán | neutral | happy | sad | angry | surprise |
|---|---|---|---|---|---|
| neutral | **127** | 14 | 7 | 20 | 11 |
| happy | 6 | **127** | 0 | 5 | 8 |
| sad | 38 | 6 | **92** | 6 | 6 |
| angry | 40 | 12 | 5 | **101** | 0 |
| surprise | 11 | 8 | 1 | 7 | **120** |

**Đọc kết quả:**
- So với mốc công bằng (cùng 8 người, chưa train lại: 70,4% / 68,5%), việc làm sạch dữ liệu rồi train lại tăng **+2,3 điểm accuracy và +5,0 điểm macro-F1**. Độ lệch giữa các fold giảm từ ±10% xuống còn ±6%.
- Trên 2 người lạ của ViT cũ (ducvinh, vanquynh), EmoNet đạt **80,5%**, cao hơn ViT cũ **72,5%**.
- Lỗi còn lại vẫn là **sad và angry bị đoán thành neutral** (38 và 40 ảnh, lần 1 là 82 và 65). Có một số người yếu hẳn ở một lớp: angry của dung 0%, angry của vanquynh 11%, sad của vy 8%. Nhiều khả năng là do vẻ mặt "giận" hoặc "buồn" lúc chụp của họ quá nhẹ, gần với mặt bình thường.
- Điểm này có thể hơi lạc quan vì 11/13 nhãn sửa trùng với model đoán (mục 2.4).
- Model cuối train 12 epoch (trung vị của 26, 9, 8, 15) trên cả 8 người. Loss cuối khoảng 0,91, không về gần 0 như ViT cũ.

### 6.3 So sánh 3 model

| Model | Cách chấm | Accuracy người lạ | Macro-F1 người lạ | Recall angry | Tham số | File |
|---|---|---|---|---|---|---|
| ViT cũ (`my_emotion_model`) | 1 lần chia, 2 người | 72,5% | (không đo) | 26% | 85,8M | 343 MB |
| ViT train lại cùng quy trình | 4 fold, 8 người | 71,2% ± 10,1% | 70,2% ± 11,2% | 68,8% | 85,8M | 343 MB |
| **EmoNet tự train** | 4 fold, 8 người | **72,7% ± 6,7%** | **73,5% ± 5,7%** | 66,5% | 2,8M | 11,2 MB |

Chi tiết ViT train lại nằm ở `results/vit_cv.md`. ViT dùng cùng dữ liệu, cùng fold, cùng cách lấy mẫu và augmentation, nhưng lr 2e-5, tối đa 8 epoch, `patience` 2 (mỗi epoch khoảng 160 giây, cả lượt khoảng 1 giờ). Model này chỉ dùng để chấm, không lưu lại.

| | EmoNet | ViT train lại |
|---|---|---|
| Macro-F1 val công khai (không phải điểm test) | 71,9% | **77,0%** |
| Fold 3 (ducvinh, vanquynh) | 80,5% | **82,7%** |
| Fold 4 (dung, vy) | **62,0%** | 55,3% |
| Recall sad | **62,0%** | 55,5% |
| Thời gian 1 epoch trên GPU | **~7 giây** | ~160 giây |
| Suy luận trên CPU của PC | **~14 ms** | ~90 ms |

**Kết luận "tự xây vs học chuyển giao":** ViT có lợi thế là đã được học sẵn trên rất nhiều ảnh mặt, nên có điểm cao hơn trên val công khai (+5 điểm). Tuy vậy, con số này **không so sánh công bằng được**: gần một nửa ảnh val công khai là FER+, mà FER+ là ảnh của FER2013, chính là bộ dữ liệu `trpakov` đã được học sẵn trước đó. Trên **người lạ tự chụp**, tức đúng hoàn cảnh web dùng thật (webcam, ánh sáng phòng), EmoNet nhỉnh hơn về trung bình (+3,3 điểm macro-F1) và **ổn định hơn nhiều** (độ lệch ±5,7 so với ±11,2). ViT thắng ở 2 fold, EmoNet thắng ở 2 fold. Chênh lệch trung bình nhỏ hơn độ lệch giữa các fold, nên trung thực mà nói hai model **ngang nhau về độ chính xác**. Còn về độ nhẹ, EmoNet nhỏ hơn 30 lần, ít phép tính hơn 56 lần và chạy nhanh hơn khoảng 6 lần trên CPU. Vì vậy EmoNet là lựa chọn hợp lý: máy chủ không cần GPU, mỗi lượt quét trả lời nhanh.

### 6.4 Thử nghiệm cải thiện (14/10/2026) — `experiment_emonet.py`, `results/exp_*.md`

Mỗi biến thể được train **3 seed** (42, 1042, 2042) trên **cùng 4 fold người lạ**. Lý do: chỉ đổi seed thôi mà điểm một fold đã dao động 4–5 điểm, có lần tụt hẳn xuống 51%. Quy tắc đặt ra trước khi chạy: chỉ nhận một cách là tốt hơn nếu nó tăng **≥ 2 điểm** macro-F1.

| Biến thể | Ý tưởng | Macro-F1 TB 1 seed | Seed tệ nhất | Ghép 3 seed |
|---|---|---|---|---|
| base | Như mục 4 (dừng sớm theo điểm val) | 70,2% | 65,5% | 72,8% |
| mixup | Trộn 2 ảnh và 2 nhãn | 69,1% | 64,2% | 71,2% |
| kd | ViT (train riêng cho từng fold, không thấy người test) làm "thầy", EmoNet học thêm theo xác suất của thầy | 71,8% | 70,2% | 73,7% |
| **full** | **Không dừng sớm**: train đủ 30 epoch theo lịch cosine, lấy bản cuối | **73,2%** | **71,6%** | 73,1% |
| pubonly | Chỉ ảnh công khai, bỏ ảnh tự chụp | 61,6% | 59,5% | 62,4% |

**Rút ra:**
- **Con số 73,5% ở mục 6.2 là lần chạy may mắn nhất** (seed 42). Trung bình một seed bất kỳ của cách cũ chỉ khoảng 70,2%.
- **Nguyên nhân là dừng sớm theo điểm val nhiễu.** Người val chỉ có khoảng 100 ảnh, nên "epoch tốt nhất" nhảy từ 5 đến 26. Có lần model bị lấy ra ở epoch 5, lúc mới học được một nửa (fold 3, seed 2042: 51%). Biến thể **full** sửa đúng chỗ này. Nó tăng **+3,0 điểm** và ổn định hơn hẳn (seed tệ nhất 71,6% thay vì 65,5%), mà vẫn chỉ là **một model**, nên suy luận không chậm hơn.
- **Ghép 3 model** tăng khoảng 2–2,6 điểm cho base, mixup và kd, nhưng với full thì không tăng thêm. Vì vậy không cần chạy 3 model cùng lúc.
- **kd** tăng +1,6 điểm, chưa qua ngưỡng. Từng fold thì lệch rất mạnh (+13,7 ở ducvinh/vanquynh, −12,4 ở phuc/trung): thầy giỏi ở người nào thì trò giỏi theo ở người đó.
- **mixup** không có ích. Ảnh trộn quá khó so với một model nhỏ chỉ train 30 epoch.
- **Ảnh tự chụp có ích rõ ràng: +8,6 điểm** (70,2% so với 61,6%). Dù có vài người nhiễu, ảnh tự chụp vẫn là dữ liệu duy nhất giống hoàn cảnh thật: webcam, ánh sáng phòng, mặt người Việt, cắt mặt bằng Haar.
- **Không chụp lại dữ liệu:** không còn gặp được những người có biểu cảm quá nhẹ (dung, vy), nên lỗi sad/angry → neutral của họ được chấp nhận là hạn chế đã biết.
- **Model cuối mới: `my_emonet/emonet_full.pt`.** Train 30 epoch trên cả 8 người, không dừng sớm. Ước lượng trên người lạ khoảng **73% macro-F1 với 1 ảnh**, và cao hơn khi gộp 5 tấm mỗi lượt quét (mục 7). **15/10: đã thay vào server.** `emonet.pt` giờ chính là `emonet_full.pt`. Model cũ vẫn lấy lại được bằng `git show 340ebff:emotion-scanner/my_emonet/emonet.pt`. Thông tin model ghi trong `my_emonet/metrics.json`. Để tạo lại model này, chạy `python experiment_emonet.py full --final`, không chạy `train_emonet.py` (script đó vẫn còn dừng sớm).

### 6.5 So sánh với model có sẵn (16/10/2026) — `compare_pretrained.py`, `results/pretrained_compare.md`

Tải 4 model nhận diện cảm xúc công khai về dùng luôn, **không train thêm**, rồi chấm trên đúng 778 ảnh tự chụp, cùng 4 fold người lạ như EmoNet (các model này chưa thấy 8 người này). Model 7–8 lớp bỏ disgust / fear / contempt, lấy lớp cao nhất trong 5 lớp còn lại. Ảnh vào là ảnh mặt đã cắt lúc chụp (màu), mỗi model dùng bộ tiền xử lý riêng của nó.

| Model | Học trên | Macro-F1 người lạ | Recall sad | Recall angry | Tham số | File | CPU / ảnh |
|---|---|---|---|---|---|---|---|
| **EmoNet (full)** | tự train | **73,2%** ± ~6,3 | — | — | 2,8M | 11 MB | ~14 ms (có TTA) |
| HSEmotion EfficientNet-B0 (`enet_b0_8_best_vgaf`) | AffectNet | 72,3% ± 10,6 | 58,1% | 78,5% | 4,0M | 16 MB | ~6 ms (ONNX) |
| HSEmotion EfficientNet-B2 (`enet_b2_8`) | AffectNet | 71,9% ± 7,9 | 47,3% | 66,5% | 7,7M | 31 MB | ~10 ms (ONNX) |
| ViT train lại cùng quy trình (mục 6.3) | FER2013 + dữ liệu nhóm | 70,2% ± 11,2 | 55,5% | 68,8% | 85,8M | 343 MB | ~90 ms |
| ViT `trpakov/vit-face-expression` | FER2013 | 50,6% ± 3,4 | 12,8% | 21,5% | 85,8M | 343 MB | ~73 ms |
| ViT `dima806/facial_emotions_image_detection` | (card không ghi rõ) | 50,5% ± 4,4 | 12,8% | 15,8% | 85,8M | 343 MB | ~75 ms |

Recall của model có sẵn tính gộp 778 ảnh. ± là độ lệch giữa 4 fold.

**Đọc kết quả (trung thực):**
- Model học trên FER2013 chỉ khoảng 50% với webcam thật, gần như không nhận ra buồn và giận. Vì vậy ViT cũ phải fine-tune mới dùng được.
- HSEmotion (học trên AffectNet đầy đủ) **gần ngang EmoNet**. Chênh lệch 0,9 điểm nhỏ hơn độ lệch giữa các fold nên coi là ngang nhau. EmoNet ổn định hơn giữa các người (±6,3 so với ±10,6; fold dung + vy HSEmotion B0 chỉ được 54,3%), nhẹ nhất, và nhóm kiểm soát được toàn bộ (dữ liệu, cách cắt mặt, 5 lớp khớp với kho nhạc).
- Thời gian CPU không hoàn toàn cùng điều kiện: HSEmotion chạy ONNX Runtime 1 ảnh, EmoNet chạy PyTorch 2 ảnh (TTA lật ngang).

### 6.6 Grad-CAM: model nhìn vào đâu (16/10/2026) — `gradcam_emonet.py`, `results/gradcam/`

Grad-CAM ở tầng residual cuối (6×6, mặc định `--layer 4`), mỗi cảm xúc lấy ảnh đoán đúng và chắc nhất của `ducvinh` (bỏ ảnh chụp lỗi không thấy trọn mặt). Vùng sáng tập trung giữa mặt: mũi, má, miệng; với surprise thì sáng nhất ở miệng há; gần như không sáng ở nền, tóc, ghế. Tầng 3 (12×12) cho bản đồ nhiễu, lan ra nền, nên không dùng. Lưu ý: model cuối đã train trên người này nên đây là ảnh **minh hoạ** cách model nhìn, không dùng để chấm điểm.

## 7. Triển khai — `3_backend_server.py`

- Chọn model bằng biến môi trường `EMOTION_MODEL`: `emonet` (mặc định nếu có `my_emonet/emonet.pt`) hoặc `vit` (model cũ, dự phòng). Đổi cổng bằng `PORT`.
- **Ảnh gửi từ web (14/10):** `EmotionScanner.jsx` cắt **ô vuông ở giữa** khung webcam (đúng phần người dùng thấy trong vòng tròn) rồi thu về 224×224. Trước đó cả khung 4:3 / 16:9 bị ép thành ô vuông nên mặt bị bóp ngang 25–44%, trong khi ảnh train không bị bóp. Điểm k fold ở mục 6 chưa phản ánh lỗi này, nên với web cũ, độ chính xác khi chạy thật có thể thấp hơn. Haar dùng `minSize` 80px trên ảnh 224px, nên mặt phải cao ít nhất khoảng 36% khung hình (ngồi gần camera).
- **Gộp nhiều khung (14/10):** mỗi lượt quét, web chụp **5 tấm cách nhau 0,5 giây** rồi gửi một lần `{images: [...]}` (qua Node `/scan-and-suggest` → Flask `/predict`). Server cắt mặt và đoán từng tấm, bỏ tấm không thấy mặt, rồi lấy **trung bình xác suất**. Response có thêm `frames` là số tấm có mặt. Kiểu gửi 1 tấm `{image}` vẫn chạy như cũ. Lý do: một tấm có thể chụp đúng lúc chớp mắt hoặc đang nói dở. Thử trên dự đoán người lạ (gộp các ảnh tự chụp liền nhau, chỉ là ước lượng vì ảnh liền nhau rất giống nhau): macro-F1 mỗi lượt quét tăng từ 73,5% lên **78,0% với 3 tấm** và **80,4% với 5 tấm**. Trên CPU của PC, một request 5 tấm mất khoảng 75 ms. Cách tăng nhẹ lớp sad/angry để bớt đoán thành neutral cũng đã thử, nhưng **không** có tác dụng (+0,1 điểm).
- Luồng xử lý EmoNet: tìm mặt bằng Haar → `preprocess_face` (cùng hàm với lúc train) → **TTA lật ngang** (đoán cả ảnh gốc lẫn ảnh lật ngang, lấy trung bình xác suất) → trả JSON.
- JSON trả về giữ nguyên các trường cũ `{emotion, confidence, all_scores, debug_crop}` và thêm `model`, `inference_ms`. Backend Node và frontend **không phải sửa**.
- Thời gian suy luận (chỉ tính chuẩn hoá ảnh mặt + chạy model):

| Máy | EmoNet | ViT cũ |
|---|---|---|
| PC, GPU RTX 5060 Ti | **~4 ms** | (lần đầu ~1.360 ms) |
| PC, chỉ CPU | **~14 ms** (12–17) | ~90 ms (80–134) |

Lần gọi đầu tiên mất khoảng 340–400 ms (khởi động), các lần sau mới đạt tốc độ trên.

### 7.1 Ngưỡng "chưa chắc" (C7, 17/10/2026) — `emotune-backend/src/services/moodFixService.js`

- Độ tin cậy (xác suất trung bình của lớp cao nhất sau khi gộp 5 tấm) **< 60%** (`UNSURE_BELOW` trong `adminService.js`, dùng chung với trang `/admin`) → backend **không chọn bài**, trả `{unsure: true, scanId, emotion, confidence}`. Web tắt camera và hỏi "Not quite sure… how do you feel?", đánh dấu cảm xúc AI đoán ("NYX's guess"). Người dùng bấm đúng cảm xúc AI đoán = **xác nhận**; bấm cảm xúc khác = **sửa**.
- Vì sao 60%: 5 lớp nên đoán bừa chỉ khoảng 20%; dữ liệu thật có khoảng 12% lượt quét dưới 60%. Đây là ý của giáo trình C3 "chỉ hành động khi đủ chắc" (ví dụ TV chỉ giảm tiếng khi rất chắc): hỏi lại một câu rẻ hơn chọn sai bài.
- Lượt "chưa chắc" chỉ ghi vào `mood_history` **sau khi** người dùng trả lời (ghi cảm xúc người dùng chọn + độ tin cậy của AI). Người dùng bỏ đi không trả lời thì không ghi, nên tỉ lệ "Unsure scans" trên `/admin` có thể thấp hơn thực tế một chút.

### 7.2 Vòng phản hồi: người dùng sửa cảm xúc → dữ liệu train lại (C15, 17/10/2026)

- Mỗi lượt quét camera được nhớ tạm trong RAM của backend 30 phút (`scanId`): cảm xúc AI đoán, độ tin cậy, **ảnh mặt đã cắt** (`debug_crop` Flask trả về, cùng định dạng ảnh trong `data/`) và dòng `mood_history` vừa ghi.
- Ở màn đang phát có nút **"NYX read you as Sad · Not right?"** → chọn cảm xúc đúng → `POST /scan-feedback {scanId, emotion}`: xoá dòng gợi ý cũ (cảm xúc sai), ghi dòng mới với `emotion` = cảm xúc người dùng chọn và **`ai_emotion`** = cảm xúc AI đoán (cột mới, `db/migrate_feedback.sql`), rồi phát bài theo cảm xúc đúng.
- **Đo được AI sai bao nhiêu khi dùng thật:** `/admin` có chỉ số thứ 5 **"Mood corrections"** = số lượt quét camera bị sửa (`ai_emotion <> emotion`) / tổng lượt quét camera (mục tiêu ≤ 15%, báo động > 30%, so với kỳ trước để bắt "trôi"), có cả theo từng người dùng. Đây là thước đo trực tiếp nhất cho độ chính xác của model khi dùng thật (khác macro-F1 đo trên dữ liệu có sẵn).
- **Ảnh để train lại — chỉ khi người dùng đồng ý:** công tắc "Help NYX read moods better" ở `/settings` (cột `users.face_consent_at`, mặc định tắt). Bật → mỗi lần sửa / xác nhận lưu ảnh mặt vào `emotune-backend/feedback_faces/<camxuc>/u<id>_<camxuc>_<thời điểm>.jpg` (tên dùng id, không dùng tên đăng nhập; thư mục không đưa lên git). **Tắt → xoá ngay** mọi ảnh của người đó; admin xoá tài khoản cũng xoá ảnh. Ảnh không gửi ra ngoài máy chủ.
- **Train lại:** `prepare_data.py` đọc thêm `../emotune-backend/feedback_faces` (đổi bằng biến `FEEDBACK_DIR`) thành nguồn **"feedback"**: qua cùng bộ lọc chất lượng, chuẩn hoá, lọc trùng, áp `label_fixes.csv` như ảnh tự chụp; luôn vào **tập train**, không đổi các fold "người lạ" dùng để chấm (số liệu cũ vẫn so được). Sau đó chạy `experiment_emonet.py full --final` như mục 6.4. Trang `/admin` hiện số ảnh đã thu theo cảm xúc ("Learning from corrections").
- **Hạn chế (nói rõ khi bảo vệ):** nhãn do người dùng tự chọn có thể sai hoặc đùa → trước khi train nên xem lướt ảnh và loại bằng `label_fixes.csv`; chưa có ảnh phản hồi thật nào được train lại; train lại vẫn làm tay (cần GPU + `data_public/`), chưa tự động.

## 8. Cách chạy lại

```bash
# trong emotion-scanner/ (PC có GPU: cài torch cu130 theo ghi chú đầu requirements.txt)
PYTHONUTF8=1 python prepare_data.py              # tải 3 bộ công khai (~2.6 GB) + chuẩn hoá (+ ảnh phản hồi feedback_faces nếu có) -> data_public/manifest.csv
PYTHONUTF8=1 python train_emonet.py --smoke      # thử pipeline ~1 phút
PYTHONUTF8=1 python train_emonet.py              # các fold người lạ + model cuối my_emonet/emonet.pt
PYTHONUTF8=1 python review_labels.py             # soi nhãn nghi sai -> label_fixes.csv (rồi chạy lại 2 lệnh trên)
PYTHONUTF8=1 python train_vit_baseline.py        # mốc so sánh ViT (vài giờ GPU)
PYTHONUTF8=1 python -m unittest discover -s tests -t . -v
EMOTION_MODEL=vit python 3_backend_server.py     # quay về model ViT cũ
```

## 9. File liên quan

| File | Vai trò |
|---|---|
| `emonet.py` | Model EmoNet, cắt mặt, tiền xử lý dùng chung, lưu/nạp, dự đoán có TTA |
| `prepare_data.py` | Tải, lọc, chuẩn hoá dữ liệu (ảnh tự chụp + ảnh phản hồi người dùng + 3 bộ công khai) → `data_public/manifest.csv`, `stats.json` |
| `augment.py` | Augmentation trên GPU cho cả batch |
| `cv_common.py` | Chia fold theo người, trọng số lấy mẫu, chấm điểm, ghi báo cáo |
| `cv_train.py` | Vòng train, dự đoán, chạy các fold, model cuối (dùng chung cho EmoNet và ViT) |
| `train_emonet.py` / `train_vit_baseline.py` | Cấu hình và chạy EmoNet / ViT |
| `review_labels.py`, `label_fixes.csv` | Soi nhãn và bằng chứng sửa nhãn |
| `results/` | `emonet_cv.md/.json`, `emonet_cv_before_fix.*`, `emonet_oof.csv`, `vit_cv.*`, `exp_*`, `pretrained_compare.*`, `gradcam/`, log train |
| `compare_pretrained.py` | Chấm 4 model có sẵn (ViT trpakov, ViT dima806, HSEmotion B0/B2) trên cùng 4 fold người lạ (cần `hsemotion-onnx`) |
| `gradcam_emonet.py` | Heatmap Grad-CAM cho slide / giải thích model |
| `my_emonet/emonet.pt`, `metrics.json` | Model dùng cho server |
| `tests/` | Unit test (`python -m unittest discover -s tests -t .`, 43 test, cần `scikit-learn`) |
| `emotune-backend/src/services/moodFixService.js`, `faceSamples.js` | Ngưỡng "chưa chắc", sửa cảm xúc, lưu / xoá ảnh phản hồi (mục 7.1–7.2) |

---

# Phụ lục — Nhật ký model ViT cũ (trước 12/10/2026, giữ để đối chiếu)



## A.1. Mục tiêu

Xây dựng model nhận diện cảm xúc khuôn mặt qua webcam, dùng để gợi ý nhạc phù
hợp. Yêu cầu cốt lõi: phải là AI thực sự học (transfer learning có huấn luyện
lại), không phải chỉ so sánh ngưỡng cố định hay dùng nguyên model có sẵn.

## A.2. Kiến trúc: Transfer Learning 2 tầng

**Tầng 1 - Kiến thức nền:** dùng model Vision Transformer đã huấn luyện sẵn
trên tập FER2013 (~35.000 ảnh, 7 cảm xúc) - trpakov/vit-face-expression
(Hugging Face) - thay vì model tổng quát google/vit-base-patch16-224-in21k
(chỉ biết phân loại vật thể chung, không biết gì về cảm xúc). Lý do đổi: giúp
model có sẵn "vốn hiểu biết" về cảm xúc, học tiếp dễ và ổn định hơn.

**Tầng 2 - Cá nhân hóa:** đóng băng phần lớn backbone, chỉ mở khóa 2/12 lớp
Transformer cuối + classifier head, fine-tune tiếp bằng ảnh khuôn mặt tự thu
thập (bản thân + bạn bè) để model học đặc trưng cảm xúc của đúng người dùng
thật, không chỉ dựa trên đặc trưng cảm xúc "chung chung" của FER2013.

**5 cảm xúc phân loại:** neutral, happy, sad, angry, surprise. Ban đầu định
làm 7 cảm xúc (thêm disgust, fear) nhưng loại bỏ 2 lớp này vì: khó thể hiện
tự nhiên khi tự ngồi trước webcam diễn 1 mình, và không có ánh xạ nhạc rõ ràng
cho 2 cảm xúc này trong ngữ cảnh gợi ý nhạc.

## A.3. Bước 1 - Thu thập dữ liệu

Script 1_capture_data.py: mở webcam, lần lượt hiện tên từng cảm xúc, người
dùng bấm phím 'c' để chụp (crop mặt bằng Haar cascade, đệm 10% quanh bounding
box), phím 'n' chuyển cảm xúc kế tiếp.

**Thu thập từ nhiều người:** để tránh model chỉ nhận diện đúng 1 khuôn mặt,
script hỏi tên người trước khi chụp (tự động bỏ dấu tiếng Việt), đặt tên file
dạng ten_camxuc_timestamp.jpg để gộp nhiều người vào chung thư mục
data/<cam_xuc>/ mà không đè file lên nhau. Chạy script nhiều lần, mỗi lần một
người.

**Kết quả cuối:** 977 ảnh trên 5 lớp (~137-206 ảnh/lớp) từ khoảng 3-5 người
đóng góp.

## A.4. Bước 2 - Fine-tune (2_finetune_model.py)

### Pipeline xử lý dữ liệu
- Đọc ảnh từ data/<emotion>/*.jpg, gán nhãn theo tên thư mục.
- Chia train/validation theo tỉ lệ 85/15, stratify theo nhãn cảm xúc, seed
  cố định (42).
- Augmentation nhẹ trên tập train (lật ngang, xoay +/-10 độ, đổi màu nhẹ) để
  chống overfit trên tập dữ liệu nhỏ.
- Resize/chuẩn hóa ảnh qua AutoImageProcessor của model.

### Đóng băng / mở khóa backbone
```
UNFROZEN_LAYER_INDICES = {"10", "11"}  # 2 lop cuoi trong 12 lop (danh so 0-11)
for name, param in model.named_parameters():
    is_last_layers = any(f".{idx}." in name for idx in UNFROZEN_LAYER_INDICES)
    if name.startswith("classifier") or is_last_layers:
        param.requires_grad = True
    else:
        param.requires_grad = False
```
Nhận diện lớp cuối bằng cách tìm pattern ".10." / ".11." trong tên tham số -
khớp cả 2 kiểu đặt tên (encoder.layer.11.xxx và vit.layers.11.xxx, tùy phiên
bản thư viện transformers).

### Chống mất cân bằng dữ liệu - Class Weighting
```
class_weights = class_counts.sum() / (len(class_counts) * class_counts)
loss_fct = nn.CrossEntropyLoss(weight=class_weights)
```
Cài đặt qua WeightedTrainer (subclass của Trainer, override compute_loss).
Sau khi kiểm tra số liệu thực tế, dữ liệu khá cân bằng (161-206 ảnh/lớp) nên
class weighting không phải nguyên nhân chính của vấn đề gặp phải (xem mục 5),
nhưng vẫn giữ lại vì không gây hại và là thực hành tốt.

### Tham số huấn luyện cuối cùng
```
TrainingArguments(
    num_train_epochs=25,
    per_device_train_batch_size=8,
    learning_rate=2e-4,       # giam dan qua cac lan thu: 1e-3 -> 5e-4 -> 2e-4
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
)
```

## A.5. Nhật ký debug - hành trình từ 34% lên 85%

| Lần | Cấu hình | Accuracy | Chẩn đoán |
|---|---|---|---|
| 1 | Đóng băng toàn bộ backbone (nền ImageNet), LR=1e-3 | 34% | Model bị "collapse" - đoán bừa 1 nhãn cố định (lúc đó nghi ngờ do mất cân bằng dữ liệu) |
| 2 | + Class weighting, LR=5e-4, vẫn đóng băng toàn bộ | ~27% (chững lại 5 epoch liên tiếp, loss gần như không đổi ~1.6, xấp xỉ ln(5)=1.609 tức ngang mức đoán ngẫu nhiên) | Xác nhận không phải do mất cân bằng data - mà do classifier head (chỉ 1 lớp tuyến tính, 3.845 tham số) quá đơn giản để tách được đặc trưng cảm xúc từ backbone đóng băng hoàn toàn |
| 3 | + Mở khóa 2 lớp Transformer cuối, LR=2e-4 | 85.03% | Đột phá rõ rệt - xác nhận đúng nguyên nhân là năng lực backbone, không phải khối lượng dữ liệu. Loss giảm liên tục đến tận epoch 25 (không bị chững/overfit sớm) |
| 4 | + Đổi base model sang FER2013-pretrained (thay vì ImageNet) | Đang cải thiện thêm | Tận dụng đặc trưng cảm xúc có sẵn, giảm phụ thuộc vào khối lượng dữ liệu cá nhân |

### Lỗi domain mismatch (phát hiện sau khi có model 85%, ở bước triển khai)

Khi test model qua webcam thực tế (không phải qua tập validation offline),
model liên tục đoán sai 1 cảm xúc cố định dù đổi biểu cảm liên tục. Nguyên
nhân: backend lúc suy luận đưa nguyên khung hình webcam (có nền, tóc, vai)
vào model, trong khi ảnh lúc train đã được crop sát mặt. Hai phân phối dữ
liệu quá khác nhau khiến model không nhận ra được gì quen thuộc.

Bài học quan trọng: bất kỳ bước tiền xử lý nào áp dụng lúc thu thập dữ liệu
train, PHẢI áp dụng y hệt lúc suy luận thực tế. Đã sửa bằng cách thêm đúng
logic detect_and_crop_face() (dùng chung 1 hàm Haar cascade, đệm 10%) vào cả
script thu thập dữ liệu lẫn backend suy luận.

## A.6. Phân tích Confusion Matrix (tập validation, 147 ảnh, sau lần train 3)

```
That \ Doan   angry   happy   neutral   sad   surprise
angry           26       1         3     1          0
happy            0      31         0     0          0
neutral          4       0        25     2          0
sad              1       0         9    20          0
surprise         1       0         0     0         23
```

Accuracy từng lớp: happy 100%, surprise 95.8%, angry 83.9%, neutral 80.6%,
sad 66.7% (yếu nhất) - 9/10 lỗi là "sad" bị đoán nhầm thành "neutral". Đã
kiểm tra thủ công, xác nhận đây là do biểu cảm buồn trong data chưa đủ rõ
ràng/dứt khoát (dễ giống mặt bình thường), không phải lỗi gắn nhãn sai.

## A.7. Hạn chế đã biết, chưa khắc phục

1. Sad/Neutral/Angry vẫn là bộ 3 dễ nhầm nhất - kể cả trên tập validation
   (người có trong tập train), khi gặp người lạ hoàn toàn thì càng lộ rõ hơn.
2. "Identity leakage" trong cách chia train/validation: hiện chia theo ẢNH
   ngẫu nhiên (stratify theo nhãn), không chia theo NGƯỜI. Vì vậy cùng 1
   người có thể xuất hiện ở cả tập train lẫn validation (chỉ khác tấm ảnh) -
   khiến accuracy 85% đo được lạc quan hơn thực tế, không phản ánh đúng khả
   năng tổng quát hóa cho khuôn mặt hoàn toàn mới. Cách sửa đúng: dùng
   GroupShuffleSplit (nhóm theo tên người trong tên file) thay vì
   train_test_split thường - chưa triển khai.
3. Mở khóa 2 lớp backbone giúp tăng accuracy nhưng cũng tăng nguy cơ model
   "học thuộc" đặc điểm riêng của từng khuôn mặt trong tập train (thay vì học
   quy luật biểu cảm phổ quát) - với dataset chỉ 3-5 người, rủi ro này khá
   thật, biểu hiện rõ khi test với người ngoài dataset (nhầm sad/neutral,
   sad/angry nhiều hơn).
4. Kính mắt: không cần gỡ khi chụp (giữ nguyên vì khớp kịch bản dùng thực
   tế), trừ kính râm/kính mát che khuất mắt hoàn toàn thì cần gỡ.
5. Không cần thêm bước tiền xử lý ảnh (làm nét, cân bằng sáng...) - rủi ro
   cao hơn lợi ích vì dễ gây lệch thêm giữa train/inference. Chỉ cần đảm bảo
   điều kiện chụp tốt (ánh sáng đều từ phía trước, nhìn thẳng camera, giữ
   yên, mặt chiếm 1/3-1/2 khung hình).

## A.8. Hướng cải thiện đã thống nhất (chưa làm)

- Bổ sung thêm người đóng góp dữ liệu - ưu tiên hàng đầu đã chọn. Mục tiêu
  từ 8-10 người khác nhau trở lên (đa dạng giới tính/độ tuổi/điều kiện ánh
  sáng), chỉ cần khoảng 15-20 ảnh/cảm xúc/người (giảm so với ban đầu, vì
  model đã có nền tốt từ FER2013). Riêng lớp "sad" cần nhắc người chụp thể
  hiện rõ ràng, hơi cường điệu (khóe miệng cụp rõ, có thể cúi nhẹ/nhìn
  xuống) để tránh giống neutral.
- Sau khi có data mới: sửa train_test_split thành GroupShuffleSplit theo
  người, train lại, chạy analyze_confusion.py để so sánh số liệu trung thực
  hơn với 85% hiện tại.

## A.9. Cách chạy lại toàn bộ pipeline

```
# Cai thu vien
pip install opencv-python==4.13.0.92 pillow torch transformers torchvision scikit-learn accelerate

# Buoc 1: thu thap du lieu (chay nhieu lan, moi lan 1 nguoi)
python 1_capture_data.py

# Buoc 2: fine-tune (~45-50 phut tren CPU thuong)
python 2_finetune_model.py

# Phan tich loi nhan dien sau khi train
python analyze_confusion.py

# Kiem tra chat luong data (phat hien anh gan nham nhan) khi nghi ngo
python check_data_quality.py

# Test model qua webcam that (can bat 3_backend_server.py truoc, port 5000)
python 3_backend_server.py
# mo test_webcam.html bang trinh duyet de test truc quan
```

Lưu ý khi chạy lại sau khi train model mới: phải restart lại
3_backend_server.py - server chỉ load model 1 lần lúc khởi động, không tự
nhận model mới nếu không khởi động lại.

## A.10. Danh sách file liên quan

| File | Vai trò |
|---|---|
| 1_capture_data.py | Thu thập ảnh có nhãn qua webcam |
| 2_finetune_model.py | Transfer learning 2 tầng, đóng băng/mở khóa backbone, class weighting |
| 3_backend_server.py | Flask server suy luận real-time, crop mặt khớp lúc train, làm mượt qua nhiều khung hình, trả về ảnh debug crop |
| analyze_confusion.py | Tính confusion matrix trên tập validation |
| check_data_quality.py | Tạo bảng ảnh mẫu (contact sheet) để kiểm tra data có gắn nhầm nhãn không |
| test_webcam.html | Trang test trực quan qua webcam, hiển thị điểm số + ảnh debug crop |
| data/<emotion>/*.jpg | Dữ liệu ảnh đã gắn nhãn |
| my_emotion_model/ | Model đã fine-tune, output của bước 2 |
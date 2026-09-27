# NOTES.md — Quá trình huấn luyện AI nhận diện cảm xúc (EmoTune)

## 1. Mục tiêu

Xây dựng model nhận diện cảm xúc khuôn mặt qua webcam, dùng để gợi ý nhạc phù
hợp. Yêu cầu cốt lõi: phải là AI thực sự học (transfer learning có huấn luyện
lại), không phải chỉ so sánh ngưỡng cố định hay dùng nguyên model có sẵn.

## 2. Kiến trúc: Transfer Learning 2 tầng

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

## 3. Bước 1 - Thu thập dữ liệu

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

## 4. Bước 2 - Fine-tune (2_finetune_model.py)

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

## 5. Nhật ký debug - hành trình từ 34% lên 85%

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

## 6. Phân tích Confusion Matrix (tập validation, 147 ảnh, sau lần train 3)

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

## 7. Hạn chế đã biết, chưa khắc phục

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

## 8. Hướng cải thiện đã thống nhất (chưa làm)

- Bổ sung thêm người đóng góp dữ liệu - ưu tiên hàng đầu đã chọn. Mục tiêu
  từ 8-10 người khác nhau trở lên (đa dạng giới tính/độ tuổi/điều kiện ánh
  sáng), chỉ cần khoảng 15-20 ảnh/cảm xúc/người (giảm so với ban đầu, vì
  model đã có nền tốt từ FER2013). Riêng lớp "sad" cần nhắc người chụp thể
  hiện rõ ràng, hơi cường điệu (khóe miệng cụp rõ, có thể cúi nhẹ/nhìn
  xuống) để tránh giống neutral.
- Sau khi có data mới: sửa train_test_split thành GroupShuffleSplit theo
  người, train lại, chạy analyze_confusion.py để so sánh số liệu trung thực
  hơn với 85% hiện tại.

## 9. Cách chạy lại toàn bộ pipeline

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

## 10. Danh sách file liên quan

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
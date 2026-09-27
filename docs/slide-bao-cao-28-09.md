# Nội dung slide báo cáo — EmoTune (28/09/2026)

> 15 phút · 12 slide · trung bình ~1 phút 15 giây/slide.
> Mỗi slide gồm: **Chữ trên slide** (chép lên slide) · **Hình gợi ý** · **Lời nói** (nói, không cần ghi lên slide).
> Chỗ `[...]` là thông tin bạn tự điền.

---

## Slide 1 — Tiêu đề

**Chữ trên slide**
- **EmoTune — Hộp nhạc hiểu cảm xúc**
- Hệ thống gợi ý nhạc theo cảm xúc khuôn mặt trên Raspberry Pi
- Nhóm: [tên nhóm] — Thành viên: [tên 1], [tên 2], [tên 3]
- Giảng viên hướng dẫn: [tên thầy]

**Hình gợi ý:** ảnh thiết bị thật (Pi + webcam + loa + đèn LED) chụp gọn trên bàn.

**Lời nói:** "Nhóm em xin trình bày đồ án EmoTune — một thiết bị nhìn khuôn mặt người dùng, hiểu cảm xúc của họ và tự phát bản nhạc phù hợp."

---

## Slide 2 — Vấn đề & ý tưởng

**Chữ trên slide**
- Vấn đề: muốn nghe nhạc hợp tâm trạng phải tự tìm, tự chọn → mất công, nhất là lúc mệt hay buồn
- Ý tưởng: một thiết bị **tự nhận biết cảm xúc** qua khuôn mặt và **tự phát nhạc phù hợp**
- Thiết bị **học dần sở thích** qua cách người dùng nghe, không cần bấm like
- Đặt trong phòng như một vật dụng, không cần mở máy tính

**Hình gợi ý:** 2 cột. Bên trái "Cách cũ: mở app → tìm → chọn". Bên phải "EmoTune: ngồi xuống → nhạc tự phát".

**Lời nói:** Nhấn mạnh đây là môn tương tác người–máy: nhóm muốn người dùng **không phải thao tác nhiều**. Máy chủ động hiểu người dùng.

---

## Slide 3 — Kiến trúc hệ thống

**Chữ trên slide**
- Phần cứng: Raspberry Pi 5 · Webcam Logitech C270 · Loa Bluetooth · LED RGB + 2 nút bấm
- Phần mềm, 4 khối chạy trên Pi:
  - **Giao diện** (React): camera, phát nhạc
  - **Backend** (Node.js/Express): gợi ý nhạc, lưu lịch sử
  - **AI** (Python Flask + PyTorch): nhận diện cảm xúc
  - **GPIO** (Python gpiozero): đèn và nút
- Cơ sở dữ liệu: PostgreSQL (bài hát, điểm yêu thích, lịch sử cảm xúc)

**Hình gợi ý:** sơ đồ khối

```
 Webcam ──► [Giao diện React :5173] ──► [Backend Node :8080] ──► [AI Flask :5000]
                │      ▲                        │
                │      └──── nhạc (mp3) ────────┤
                ▼                               ▼
      [GPIO service :5001]               [PostgreSQL]
       LED RGB + 2 nút
```

**Lời nói:** Mỗi khối làm một việc riêng. Nếu khối đèn/nút lỗi thì phần nhạc vẫn chạy bình thường.

---

## Slide 4 — Flow hoạt động ⭐

**Chữ trên slide**
1. Bấm **nút 1** → bắt đầu, đèn trắng nhấp nháy (camera đang bật)
2. Cứ 3 giây chụp 1 ảnh → AI nhận diện cảm xúc
3. Backend chọn bài hợp cảm xúc → **tắt camera**, phát nhạc, đèn đổi màu theo cảm xúc
4. Người dùng nghe hết, bấm **nút 1** (bài tiếp) hoặc **nút 2** (tạm dừng)
5. Hệ thống đo **% bài đã nghe** → cộng/trừ điểm bài đó
6. Hết bài → bật camera, quét lại → lặp lại

**Hình gợi ý:** vòng tròn 6 bước có mũi tên, mỗi bước kèm icon (nút, camera, não AI, nốt nhạc, đèn, biểu đồ điểm).

**Lời nói:** Đây là slide quan trọng nhất. Điểm chính: vòng lặp **tự động hoàn toàn**. Khi đang phát nhạc thì camera tắt (tiết kiệm tài nguyên và riêng tư) và không ghi dữ liệu rác.

---

## Slide 5 — AI nhận diện cảm xúc ⭐

**Chữ trên slide**
- Model: **Vision Transformer (ViT)** đã học sẵn cảm xúc trên bộ FER2013 (~35.000 ảnh)
- **Transfer learning:** huấn luyện tiếp bằng ảnh khuôn mặt **nhóm tự chụp**
- Dữ liệu: **1.773 ảnh, 5 cảm xúc**: vui 361 · buồn 365 · giận 363 · ngạc nhiên 322 · bình thường 362
- Chia 85% huấn luyện / 15% kiểm tra, 25 epoch
- Thử nghiệm:
  - Đóng băng toàn bộ model, chỉ train lớp cuối → chỉ **25–29%**
  - Mở khóa thêm **2/12 lớp Transformer cuối** → độ chính xác **[...]%**

**Hình gợi ý:** sơ đồ `FER2013 (35k ảnh) → ViT → + ảnh nhóm (1.773) → model EmoTune`. Thêm biểu đồ cột so sánh "đóng băng hết: 27%" với "mở 2 lớp: [..]%".

**Lời nói:** Kể câu chuyện thử nghiệm: lần đầu kết quả thấp, nhóm phân tích nguyên nhân là lớp cuối quá đơn giản, nên mở thêm 2 lớp. Cách này vẫn giữ 10/12 lớp đóng băng, đúng tinh thần transfer learning.

---

## Slide 6 — Xử lý ảnh nhất quán

**Chữ trên slide**
- Phát hiện khuôn mặt bằng OpenCV (Haar Cascade) → **cắt sát khuôn mặt**
- Cắt **giống hệt nhau** lúc thu dữ liệu, lúc train và lúc chạy thật → model không bị "lạ ảnh"
- **Trọng số theo lớp:** lớp ít ảnh được phạt nặng hơn khi đoán sai → không thiên vị lớp đông ảnh
- **Tăng cường ảnh:** lật ngang, xoay ±10° → tránh học thuộc lòng

**Hình gợi ý:** ảnh gốc từ webcam → khung xanh quanh mặt → ảnh 224×224 đã cắt.

**Lời nói:** Đây là một lỗi hay gặp: train bằng ảnh đã cắt mặt nhưng lúc chạy thật lại đưa cả khung hình. Nhóm dùng chung một cách cắt cho cả hai.

---

## Slide 7 — Gợi ý nhạc

**Chữ trên slide**
- Mỗi bài có **điểm yêu thích riêng theo từng cảm xúc**
- Xếp bài theo điểm, sau đó:
  - **80%** chọn bài điểm cao nhất (khai thác)
  - **20%** chọn ngẫu nhiên (khám phá bài mới)
- Bỏ qua **3 bài vừa phát gần nhất** → không lặp lại
- Kho nhạc hiện tại: 10 bài, mỗi cảm xúc 2 bài

**Hình gợi ý:** bảng nhỏ "bài – cảm xúc – điểm", tô sáng bài được chọn. Thêm biểu đồ tròn 80/20.

**Lời nói:** Tỉ lệ 80/20 giúp máy vừa phát bài người dùng thích, vừa có cơ hội giới thiệu bài mới. Nếu chỉ chọn bài điểm cao nhất, người dùng sẽ nghe mãi một bài.

---

## Slide 8 — Học từ hành vi nghe ⭐

**Chữ trên slide**
- Đo **số giây nghe thật** (không tính đoạn tua qua)
- Nghe **≥ 80%** bài → **+1 điểm** (thích)
- Nghe **< 40%** rồi chuyển bài → **−1 điểm** (không hợp)
- Ở giữa → **+0.3 điểm**
- Người dùng **không cần bấm like/dislike**: hành vi chính là phản hồi

**Hình gợi ý:** thanh tiến trình bài hát chia 3 vùng màu (đỏ < 40% · vàng · xanh ≥ 80%) kèm điểm.

**Lời nói:** Đây là góp ý của thầy ở buổi trước và nhóm đã làm. Điểm được ghi theo đúng cảm xúc dùng để chọn bài, nên lần sau cùng cảm xúc đó sẽ ưu tiên bài người dùng nghe hết.

---

## Slide 9 — Chăm sóc cảm xúc ⭐

**Chữ trên slide**
- Hệ thống theo dõi **xu hướng cảm xúc** trong 1 ngày (hoặc 3 ngày nếu dùng ít)
- Nếu **trên 50% là buồn** và người dùng **đang buồn/giận**:
  → chuyển sang **nhạc vui** + hiện lời động viên 💛
- Không chỉ "chiều theo" cảm xúc mà còn **giúp cải thiện tâm trạng**

**Hình gợi ý:** biểu đồ đường cảm xúc nhiều ngày có vùng buồn kéo dài → mũi tên → "🎵 nhạc vui + lời động viên".

**Lời nói:** Nếu đang buồn mà cứ phát nhạc buồn mãi thì không tốt. Hệ thống nhận ra xu hướng này và chủ động đổi hướng.

---

## Slide 10 — Phần cứng & tương tác vật lý

**Chữ trên slide**
- **Đèn LED RGB** báo trạng thái:
  - Tắt: chưa bắt đầu · Trắng nhấp nháy: **camera đang bật**
  - Vàng = vui · Xanh dương = buồn · Đỏ = giận · Tím = ngạc nhiên · Trắng = bình thường
- **2 nút bấm:** Bắt đầu / Bài tiếp · Tạm dừng / Phát tiếp
- **Edge AI, riêng tư:** ảnh khuôn mặt **xử lý ngay trên Pi, không gửi lên Internet**
- Tốc độ: nhận diện **dưới 3 giây** mỗi lần quét trên Pi 5

**Hình gợi ý:** ảnh mạch thật trên breadboard, kèm bảng nối chân:

| Linh kiện | Chân Pi |
|---|---|
| LED R / G / B | GPIO17 / GPIO27 / GPIO22 (qua điện trở 220–330Ω) |
| Nút 1 / Nút 2 | GPIO5 / GPIO6 (nối GND) |

**Lời nói:** Đây là lý do dùng Pi thay vì máy tính: đồ án là **một thiết bị** người dùng tương tác bằng đèn và nút, không cần nhìn màn hình. Đèn báo camera giúp người dùng biết khi nào mình đang bị "nhìn".
> ⚠️ Nếu mạch chưa chạy kịp: đổi câu thành "đang hoàn thiện" và chỉ trình bày sơ đồ mạch.

---

## Slide 11 — Demo & kết quả

**Chữ trên slide**
- ✅ Chạy trọn vòng lặp trên Raspberry Pi 5: nhận mặt → phát nhạc → chấm điểm → quét lại
- ✅ Lịch sử cảm xúc và phản hồi được ghi đúng vào database
- ✅ Dùng hotspot laptop → demo được ở bất kỳ đâu
- **Demo trực tiếp**

**Hình gợi ý:** ảnh chụp màn hình bảng `mood_history` với các dòng `suggested`, `good`, `bad`.

**Lời nói:** Chuyển sang demo thật. Thứ tự: bấm nút 1 → đèn nhấp nháy → nhìn camera → nhạc phát, đèn đổi màu → bấm nút 1 chuyển bài → mở database cho thầy xem dòng `bad` vừa được ghi.

---

## Slide 12 — Khó khăn & hướng phát triển

**Chữ trên slide**

Khó khăn đã giải quyết:
- Accuracy ban đầu thấp (25–29%) → mở thêm 2 lớp Transformer
- Trình duyệt chặn camera khi truy cập bằng IP → chạy trình duyệt ngay trên Pi (`localhost`)
- Trình duyệt chặn tự phát nhạc → nút bắt đầu + cờ autoplay của Chromium
- Pi 5 không có jack âm thanh → dùng loa Bluetooth

Hướng phát triển:
- **Cắm điện là chạy**, không cần màn hình (tự khởi động, chế độ kiosk)
- Cảm biến chuyển động: có người → tự quét, đi khỏi → tự dừng nhạc
- Biểu đồ **Mood Journey** (hành trình cảm xúc theo ngày), điều khiển bằng giọng nói

**Hình gợi ý:** 2 cột "Khó khăn → Cách giải quyết" và "Tiếp theo".

**Lời nói:** Kết thúc bằng câu: "Mục tiêu cuối cùng của nhóm là một thiết bị cắm điện là tự chạy, đặt trong phòng như một người bạn hiểu tâm trạng." Sau đó cảm ơn thầy và mời thầy đặt câu hỏi.

---

## Câu hỏi thầy có thể hỏi (chuẩn bị trước)

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Tại sao dùng Pi mà không dùng máy tính? | Thiết bị nhỏ, đặt cố định trong phòng, có GPIO cho đèn/nút, xử lý tại chỗ nên ảnh không rời thiết bị |
| Model nhận sai thì sao? | Hệ thống học từ hành vi: bài không hợp sẽ bị chuyển sớm, trừ điểm, và lần sau ít được chọn |
| Chỉ 1.773 ảnh có đủ không? | Nhờ transfer learning từ 35.000 ảnh FER2013 nên chỉ cần ít ảnh để cá nhân hóa |
| Tại sao 80/20? | Cân bằng giữa phát bài đã biết là hay và thử bài mới (exploit/explore) |
| Người lạ dùng thì sao? | Model train chủ yếu bằng mặt nhóm nên người lạ có thể kém chính xác hơn; hướng phát triển là thu thêm dữ liệu |

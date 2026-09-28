# Kịch bản thuyết trình EmoTune — 28/09/2026

> Tổng thời gian: **15 phút** (≈ 12 phút nói + 3 phút demo). 13 slide — nếu thiếu giờ, nói nhanh slide 6 và 10.
> Chữ thường = lời nói. **[Trong ngoặc vuông]** = thao tác. ⏱ = thời gian gợi ý cho slide.
> Không cần đọc thuộc lòng — nắm ý chính in đậm, nói bằng lời của mình.

---

## Trước giờ báo cáo (15 phút trước)

- [ ] Bật hotspot laptop `gayta626` (**Power saving = Off**). Bật Pi, loa Bluetooth, cắm webcam C270. Đợi ~1 phút.
- [ ] Laptop mở 3 cửa sổ Git Bash → `ssh vinh@raspberrypi.local` → chạy 3 server (NOTES.md mục 4). Không vào được → `ipconfig /flushdns`.
- [ ] RealVNC → `raspberrypi.local` → Chromium `localhost:5173` → **bấm thử ▶ Bắt đầu 1 lần** cho chắc camera + loa chạy, rồi F5 để về màn hình đầu.
- [ ] Mở sẵn DBeaver hoặc 1 cửa sổ SSH để xem bảng `mood_history`.
- [ ] Mở `docs/EmoTune_bao_cao_28-09.pptx`, **điền tên nhóm, thành viên, tên thầy ở slide 1**.
- [ ] Chia vai (nếu nhóm nhiều người): 1 người nói, 1 người đứng máy demo.

---

## Slide 1 — Tiêu đề ⏱ 0:30

Em chào thầy và các bạn. Nhóm em xin trình bày đồ án **EmoTune — hộp nhạc hiểu cảm xúc**.

Nói ngắn gọn, đây là một **thiết bị nhìn khuôn mặt người dùng, nhận ra họ đang vui hay buồn, rồi tự phát bản nhạc phù hợp** — và càng dùng thì nó càng hiểu gu của người dùng hơn.

Hôm nay nhóm em sẽ trình bày ý tưởng, cách hệ thống hoạt động, những điểm nhóm thấy hay nhất, và cuối buổi sẽ **demo trực tiếp trên thiết bị thật**.

---

## Slide 2 — Vấn đề & ý tưởng ⏱ 1:00

Bắt đầu từ một chuyện rất quen: khi muốn nghe nhạc hợp tâm trạng, mình phải **tự mở app, tự tìm, tự chọn**. Lúc mệt hay lúc buồn thì việc đó lại càng ngại.

**[Chỉ vào 2 ô cũ / mới]** Cách cũ là mở app, tìm, chọn. Với EmoTune thì chỉ cần **ngồi xuống — nhạc tự phát**.

Ý tưởng của nhóm có bốn điểm:
- Thiết bị **tự nhận biết cảm xúc** qua khuôn mặt.
- **Tự phát nhạc** phù hợp.
- **Tự học sở thích** qua cách mình nghe — không cần bấm like.
- Và nó là **một vật dụng đặt trong phòng**, không cần mở máy tính.

Vì đây là môn tương tác người–máy, mục tiêu của nhóm là: **người dùng thao tác càng ít càng tốt, còn máy thì chủ động hiểu người dùng.**

---

## Slide 3 — Kiến trúc hệ thống ⏱ 1:15

Về kiến trúc, toàn bộ chạy trên **Raspberry Pi 5**, gồm bốn khối phần mềm.

**[Chỉ theo mũi tên]**
- Webcam đưa hình vào **giao diện React**.
- Giao diện gửi ảnh sang **backend Node.js**.
- Backend gọi **khối AI** viết bằng Flask và PyTorch để nhận diện cảm xúc.
- Backend đọc và ghi **PostgreSQL** — nơi lưu bài hát, điểm yêu thích, lịch sử cảm xúc — rồi trả file nhạc về cho giao diện phát ra **loa Bluetooth**.
- Riêng đèn và nút bấm do một **GPIO service** nhỏ điều khiển.

Điểm nhóm cố ý thiết kế: **mỗi khối làm một việc riêng**. Nếu khối đèn hay nút gặp lỗi thì nhạc vẫn chạy bình thường.

*Chuyển ý:* Vậy các khối này phối hợp với nhau thế nào trong một lần sử dụng?

---

## Slide 4 — Flow hoạt động ⏱ 1:30 (slide quan trọng nhất)

Đây là **một vòng sử dụng trọn vẹn**, gồm 6 bước:

1. Người dùng **bấm nút 1** để bắt đầu — đèn **nhấp nháy trắng** báo camera đang bật.
2. Cứ **3 giây** hệ thống chụp một ảnh, AI nhận diện cảm xúc.
3. Khi chọn được bài hợp cảm xúc: **camera tắt, nhạc phát, đèn đổi sang màu của cảm xúc đó**.
4. Người dùng nghe hết, hoặc bấm **nút 1 để sang bài**, **nút 2 để tạm dừng**.
5. Hệ thống **đo phần trăm bài đã nghe** để cộng hoặc trừ điểm bài đó.
6. Hết bài thì **bật camera, quét lại** — và vòng lặp tiếp tục.

**[Chỉ vào dải dưới cùng]** Vòng lặp này **tự động hoàn toàn**. Và khi đang phát nhạc thì camera tắt — vừa tiết kiệm tài nguyên, vừa riêng tư, lại không ghi dữ liệu rác mỗi ba giây.

---

## Slide 5 — AI nhận diện cảm xúc ⏱ 1:45

Phần AI dùng **Vision Transformer** đã được học sẵn cảm xúc trên bộ **FER2013 khoảng 35.000 ảnh**. Nhóm dùng **transfer learning**: đóng băng 10 trong 12 lớp, chỉ mở 2 lớp cuối, rồi huấn luyện tiếp bằng **1.934 ảnh khuôn mặt do 10 người tự chụp**, chia khá đều cho 5 cảm xúc.

**[Chỉ vào bảng độ chính xác — đây là điểm nhấn]** Điều nhóm học được nhiều nhất ở phần này là **phải đo trên người lạ**:
- Lúc đầu nhóm chia dữ liệu ngẫu nhiên theo ảnh, được **92,5%** — nghe rất đẹp.
- Nhưng khi thử model đó trên **4 người mới**, nó chỉ còn **71,5%**. Tức là con số 92,5% bị "ảo", vì cùng một người có mặt ở cả lúc học lẫn lúc kiểm tra.
- Nên nhóm sửa lại: **chia theo người**, để riêng 2 người mà model hoàn toàn không được học, rồi train lại. Kết quả là **72,5%** — đây là **con số trung thực**.

Model mới nhận diện **buồn và ngạc nhiên tốt hơn hẳn**, còn cảm xúc **giận vẫn yếu** nên nhóm sẽ bổ sung dữ liệu cho lớp này.

---

## Slide 6 — Xử lý ảnh nhất quán ⏱ 0:50

Một bài học khác là **xử lý ảnh phải nhất quán**.

Từ ảnh webcam, hệ thống dùng **OpenCV** tìm khuôn mặt rồi **cắt sát mặt thành ảnh 224×224**. Và cách cắt này **giống hệt nhau lúc thu dữ liệu, lúc train và lúc chạy thật**.

Nhóm từng mắc lỗi này: train bằng ảnh đã cắt mặt nhưng lúc chạy lại đưa cả khung hình vào — model đoán sai liên tục. Sửa cho giống nhau là hết.

Ngoài ra nhóm dùng **trọng số theo lớp** để lớp ít ảnh không bị lép vế, và **tăng cường ảnh** — lật ngang, xoay nhẹ — để model không học thuộc lòng.

*Chuyển ý:* Nhận diện được cảm xúc rồi, hệ thống chọn bài thế nào?

---

## Slide 7 — Gợi ý nhạc ⏱ 1:00

Backend gợi ý qua bốn bước:
1. **Lọc** bài theo cảm xúc.
2. **Bỏ qua 3 bài vừa phát** để không lặp lại.
3. **Xếp hạng** theo điểm yêu thích — mỗi bài có điểm riêng cho từng cảm xúc.
4. **Chọn theo tỉ lệ** — hệ thống hiện chạy 80/20, bản nâng cấp nhóm đang code là **65/35**.

**[Chỉ vào thanh 65/35]** 65% số lần hệ thống phát **bài người dùng đã thích**, 35% còn lại để **khám phá bài lạ — nhưng ưu tiên bài hợp gu** (slide sau sẽ nói rõ). Nếu chỉ chọn bài điểm cao nhất, người dùng sẽ nghe mãi một bài.

Bảng bên phải chỉ là **ví dụ minh họa**. Kho nhạc hiện tại có 10 bài, mỗi cảm xúc 2 bài.

---

## Slide 8 — Gợi ý theo gu (bản nâng cấp) ⏱ 1:15

Trong lúc dùng thử, nhóm thấy một hạn chế: điểm hiện chỉ lưu cho **từng bài**. Nghe hết một bài ballad cũng không giúp gì cho một bài ballad khác cùng dòng.

Nên nhóm đã **thiết kế bản nâng cấp "gợi ý theo gu"** — **đã có thiết kế và kế hoạch, đang code**.

**[Chỉ vào 3 thẻ bên trái]** Hệ thống hiểu bài hát từ **3 nguồn**:
- **Âm thanh — luôn có:** một script AI tự phân tích file nhạc, lấy nhịp, độ mạnh, độ sáng, âm sắc → một **"dấu vân tay" 17 con số**.
- **Thẻ trong file mp3 — nếu có:** tên ca sĩ, thể loại có sẵn trong file.
- **Nhãn nhóm tự điền — tùy chọn:** không điền vẫn chạy được.

**[Chỉ vào công thức]** Điểm tổng của một bài = **điểm riêng + 0,5 × mức giống các bài đã nghe + 0,3 nếu cùng ca sĩ + 0,3 nếu cùng dòng nhạc** với những bài người dùng thích.

**[Chỉ vào ví dụ]** Ví dụ em đã nghe hết hai bài ballad. Một bài ballad khác **chưa nghe bao giờ** nhưng âm thanh giống 90% sẽ được ưu tiên; còn bài EDM chỉ giống 20% thì xếp sau.

**Cảm xúc vẫn là tiêu chí chính** — gu chỉ xếp hạng bài **trong cùng cảm xúc**. Và càng nghe nhiều, gợi ý càng sát.

---

## Slide 9 — Học từ hành vi nghe ⏱ 1:00

Vậy điểm yêu thích đến từ đâu? **Từ chính hành vi nghe.**

Hệ thống đo **số giây nghe thật**, không tính đoạn tua qua.
- Nghe **dưới 40%** rồi chuyển bài → **trừ 1 điểm**, vì bài không hợp.
- Nghe **từ 80% trở lên** → **cộng 1 điểm**.
- Ở giữa → cộng **0,3**.

Nhờ vậy người dùng **không cần bấm like** — hành vi nghe chính là phản hồi. Điểm được ghi theo đúng cảm xúc lúc đó, nên lần sau với cùng cảm xúc, hệ thống ưu tiên bài được nghe hết.

Đây là **góp ý của thầy ở buổi trước và nhóm đã làm xong**.

---

## Slide 10 — Chăm sóc cảm xúc ⏱ 0:50

Hệ thống không chỉ chiều theo cảm xúc mà còn **chăm sóc cảm xúc**.

Nó theo dõi xu hướng trong 1 ngày — hoặc 3 ngày nếu dùng ít. Nếu **hơn một nửa số lần là buồn**, và người dùng lại **đang buồn hoặc giận**, hệ thống sẽ **chuyển sang nhạc vui và hiện một lời động viên**.

Lý do rất đơn giản: đang buồn mà cứ phát nhạc buồn mãi thì không tốt. Hệ thống chủ động đổi hướng để **giúp cải thiện tâm trạng**.

---

## Slide 11 — Phần cứng & tương tác vật lý ⏱ 1:00

Đây là lý do nhóm dùng **Raspberry Pi thay vì máy tính**: đồ án là **một thiết bị** người dùng tương tác bằng **đèn và nút**, không cần nhìn màn hình.

**[Chỉ vào danh sách đèn]** Đèn LED RGB tắt khi chưa bắt đầu, **nhấp nháy trắng khi camera đang bật** — để người dùng biết lúc nào mình đang được "nhìn" — và khi phát nhạc thì sáng theo cảm xúc: vàng là vui, xanh dương là buồn, đỏ là giận, tím là ngạc nhiên, trắng là bình thường.

Hai nút bấm: **nút 1** bắt đầu hoặc sang bài, **nút 2** tạm dừng hoặc phát tiếp. Bảng bên phải là sơ đồ nối chân vào GPIO của Pi.

Một điểm quan trọng là **edge AI**: ảnh khuôn mặt **xử lý ngay trên Pi, không gửi lên Internet**, mỗi lần nhận diện dưới 3 giây.

**[Chỉ vào nhãn vàng]** Về tiến độ: phần mạch đèn và nút **đã thiết kế và code xong, đã chạy thử bằng chân giả lập**. Nhóm đang chờ breadboard để lắp mạch thật và **sẽ demo phần này ở buổi sau**.

---

## Slide 12 — Demo & kết quả ⏱ 0:30 nói + 3:00 demo

Đến giờ nhóm đã đạt ba kết quả:
- Vòng lặp **chạy trọn trên Raspberry Pi 5**.
- Lịch sử cảm xúc và phản hồi **ghi đúng vào database**.
- Dùng **hotspot laptop** nên **demo được ở bất kỳ đâu**.

Bây giờ nhóm em xin **demo trực tiếp**.

### Kịch bản demo

| # | Thao tác | Nói |
|---|---|---|
| 1 | **[Chuyển màn hình sang VNC — Chromium `localhost:5173`]** | Đây là màn hình của thiết bị, em đang xem từ xa qua VNC. |
| 2 | **[Bấm ▶ Bắt đầu, nếu hỏi quyền camera thì bấm Allow]** | Em bấm bắt đầu — camera bật, hệ thống quét mỗi 3 giây. |
| 3 | **[Nhìn thẳng vào webcam, biểu cảm rõ — nên cười tươi (vui nhận diện tốt nhất)]** | Em thử cười… |
| 4 | **[Nhạc phát ra loa]** | Hệ thống nhận ra em đang vui, camera đã tắt, và phát một bài vui. |
| 5 | **[Đợi ~5 giây, bấm ⏭ Bài tiếp]** | Giả sử em không thích bài này, em chuyển bài ngay — lúc này em mới nghe chưa tới 40%. |
| 6 | **[Camera bật lại, quét tiếp]** | Hệ thống quay lại quét cảm xúc. |
| 7 | **[Mở DBeaver / SSH, chạy câu lệnh xem `mood_history`]** | Và đây là database: dòng **suggested** là lúc hệ thống gợi ý, dòng **bad** là bài em vừa bỏ sớm — bài đó vừa bị trừ 1 điểm. |

Lệnh xem database (SSH vào Pi):
```bash
sudo -u postgres psql -d emotune -c "select id, emotion, action, created_at from mood_history order by id desc limit 5"
```

**Nếu demo trục trặc:**
- AI đoán sai cảm xúc → "Model hiện đúng khoảng 72% với người lạ như em vừa trình bày — nhóm đang cải thiện." Rồi thử biểu cảm khác rõ hơn (cười, há miệng ngạc nhiên).
- Không có tiếng → kiểm tra loa Bluetooth đã kết nối (góc phải trên màn hình Pi).
- Không vào được Pi → chuyển sang giải thích bằng slide 4, nói sẽ gửi video demo sau.

---

## Slide 13 — Khó khăn & hướng phát triển ⏱ 1:15

Trong quá trình làm, nhóm đã vượt qua bốn khó khăn chính:
- **Độ chính xác ban đầu rất thấp** — 34% rồi chỉ còn khoảng 27% — nên phải mở thêm 2 lớp Transformer.
- **Trình duyệt chặn camera** khi truy cập bằng IP → chạy trình duyệt ngay trên Pi.
- **Trình duyệt chặn tự phát nhạc** → dùng nút bắt đầu và cờ autoplay của Chromium.
- **Pi 5 không có jack âm thanh** → dùng loa Bluetooth.

Hướng phát triển tiếp theo:
- **Cắm điện là chạy**, không cần màn hình.
- **Cảm biến chuyển động**: có người thì tự quét, đi khỏi thì dừng nhạc.
- **Biểu đồ Mood Journey** và điều khiển bằng giọng nói.

**[Chỉ vào dải cuối]** Mục tiêu cuối cùng của nhóm là **một thiết bị cắm điện là tự chạy — như một người bạn hiểu tâm trạng**.

Em xin cảm ơn thầy và các bạn đã lắng nghe. **Mời thầy và các bạn đặt câu hỏi.**

---

## Chuẩn bị câu hỏi

| Câu hỏi có thể gặp | Gợi ý trả lời |
|---|---|
| Tại sao dùng Pi mà không dùng máy tính? | Thiết bị nhỏ đặt cố định trong phòng, có GPIO để làm đèn và nút, ảnh xử lý tại chỗ nên không rời thiết bị. Người dùng tương tác bằng nút và đèn, không cần nhìn màn hình. |
| Độ chính xác 72,5% có thấp không? | Đây là con số đo trên **người model chưa từng thấy** — cách đo khắt khe nhất. Trên người đã học thì hơn 90%. Ngoài ra hệ thống **tự sửa sai qua hành vi nghe**: bài không hợp bị bỏ sớm, trừ điểm, lần sau ít được chọn. |
| Tại sao chia theo người lại thấp hơn? | Chia theo ảnh thì cùng một người nằm ở cả tập học lẫn tập kiểm tra, model "nhớ mặt" nên điểm cao ảo. Chia theo người mới phản ánh đúng khi gặp người dùng mới. |
| Sao cảm xúc giận lại yếu? | Với 2 người kiểm tra, ảnh "giận" hay bị đoán thành "bình thường" — biểu cảm giận khi tự diễn trước webcam thường không rõ. Nhóm sẽ chụp thêm và nhắc thể hiện rõ hơn. |
| Chỉ ~2.000 ảnh có đủ không? | Nhờ transfer learning từ 35.000 ảnh FER2013, model đã có nền về cảm xúc; ảnh nhóm tự chụp chỉ để **cá nhân hóa** theo khuôn mặt và điều kiện thật. |
| GPIO service hoạt động thế nào? | Server Python nhỏ (cổng 5001, thư viện gpiozero). Trang web gọi nó để **đổi màu đèn** theo trạng thái. Chiều ngược lại, server **đếm số lần bấm nút**, trang web hỏi mỗi 300ms, thấy số tăng thì xử lý — nhờ vậy không bỏ sót lần bấm. Nếu service lỗi, nhạc vẫn chạy bình thường. |
| Sao nút lại không gửi thẳng lên web? | Server không tự "gọi" trình duyệt được, nên trình duyệt phải tự hỏi. Dùng bộ đếm thay vì cờ "vừa bấm" để lần bấm không bị mất hay bị xử lý hai lần. |
| Tại sao 65/35 mà không chọn luôn bài điểm cao nhất? | Để cân bằng giữa phát bài đã biết là hay và cho người dùng khám phá bài mới. Hiện hệ thống chạy 80/20; bản nâng cấp **65/35** (đang code) tăng phần khám phá nhưng **ưu tiên bài lạ hợp gu** nên không bị "ngẫu nhiên lung tung". |
| Phân tích âm thanh bằng gì, có nặng không? | Thư viện **librosa** (Python). Mỗi bài chỉ phân tích **một lần** khi thêm vào kho (vài giây), lưu 17 con số vào database; lúc gợi ý chỉ so sánh các con số nên rất nhanh. |
| Kho nhạc 10 bài thì gu có tác dụng không? | Chưa rõ rệt — cần khoảng 8–10 bài mỗi cảm xúc, nhiều dòng nhạc/ca sĩ. Nhóm sẽ mở rộng kho nhạc cùng lúc với bản nâng cấp. |
| Nhiều người dùng chung một thiết bị thì sao? | Hiện hệ thống học gu chung cho thiết bị. Hướng mở rộng là nhận diện **ai** đang ngồi trước máy để lưu gu riêng từng người. |
| Riêng tư thì sao? | Ảnh không lưu lại và không gửi đi đâu; camera chỉ bật khi đang quét và có **đèn báo** trắng nhấp nháy. |

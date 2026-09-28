# NOTES.md — EmoTune Project Session Log

> Phiên gần nhất: **27–28/09/2026** (trên **laptop**, hostname `vinh`). Deadline dự án **15/10/2026**. Báo cáo tiến độ cho thầy: **28/09**.
> Trạng thái: vòng lặp cốt lõi (camera → AI → nhạc → chấm điểm) **chạy trên Pi qua hotspot laptop**. Code đèn LED + 2 nút **xong nhưng chưa lắp mạch** — **đã mua breadboard + dây, OLED, cảm biến PIR** (28/09) → lắp được rồi. Demo 28/09: không mạch, dùng **model AI cũ**.
> Người dùng: sinh viên, cần hướng dẫn từng bước rõ ràng; thường tự code theo gợi ý, nhưng phiên này nhờ Claude code trực tiếp (GPIO, script train, slide).

---

## 1. Mục tiêu của phiên này
1. Dựng laptop để điều khiển Pi khi demo ở trường (không có wifi nhà).
2. Làm Pi "có ý nghĩa phần cứng": đèn LED RGB + nút bấm.
3. Làm slide + kịch bản báo cáo 28/09.
4. Đo lại và train lại AI cho trung thực (model đang đoán sai nhiều).
5. Thiết kế tính năng "gợi ý theo gu" (65/35, dòng nhạc, ca sĩ).

## 2. Những việc đã làm xong

| Việc | File / kết quả |
|---|---|
| **Mạng demo** | Hotspot laptop `gayta626` (mật khẩu: xem Settings → Mobile hotspot, 2.4 GHz, **Share over = Wi-Fi**, **Power saving = Off**). Pi có connection NetworkManager `demo-hotspot` (priority 10) → tự vào hotspot. Gọi Pi bằng `raspberrypi.local` (IP hotspot `192.168.137.x`). Đã tập demo trọn vòng qua hotspot, OK. |
| **GPIO service** (commit `bc9eb8b`) | `gpio-service/gpio_service.py` (Flask :5001 + gpiozero: `POST /led {state}`, `GET /buttons` → bộ đếm `{next, pause}`); `emotune-frontend/src/hardware.js` (`setLed`, `useHardwareButtons` hỏi mỗi 300ms); sửa `config.js` (`GPIO_URL`), `pages/HomePage.jsx` (màu đèn theo trạng thái, nút 1 = Bắt đầu), `components/MusicPlayer.jsx` (nút 1 = bài tiếp, nút 2 = tạm dừng). Test bằng mock pin, **chưa test mạch thật**. Spec: `docs/superpowers/specs/2026-09-27-gpio-led-buttons-design.md`. |
| **Slide báo cáo** (commit `2d482ad`) | `docs/EmoTune_bao_cao_28-09.pptx` — 12 slide, có speaker notes, tạo bằng plugin **PPT Master**. Nội dung gốc `docs/slide-bao-cao-28-09.md` (⚠ slide 5 trong file .md đã cũ, .pptx mới đúng). Project PPT Master: `~/.claude/plugins/cache/ppt-master/ppt-master/projects/emotune_bao_cao_ppt169_20260927/`. |
| **Kịch bản thuyết trình** | `docs/script-thuyet-trinh-28-09.md` — checklist trước giờ, lời nói từng slide + thời gian, kịch bản demo 7 bước, 10 câu hỏi dự phòng. **Chưa commit.** |
| **Đo model cũ** (14/09, nền FER2013, 977 ảnh / 5 người) | Chia theo ảnh (cùng người): **92.5%** — ảo. Trên 4 người mới (mom, nhat, phuc, trung): **71.5%** (neutral 49%, sad 60%). |
| **Chia train/val theo người** (commit `585044a`) | `emotion-scanner/2_finetune_model.py` + `analyze_confusion.py`: `GroupShuffleSplit`, `VAL_PEOPLE = 2`, seed 42 → val = **ducvinh, vanquynh**. Tên người lấy từ tên file `<ten>_<camxuc>_<timestamp>.jpg`. |
| **Dữ liệu** (commit `c457776`) | **1.934 ảnh, 10 người** (thêm `dat`, 161 ảnh, **không có surprise**). vui 402 · buồn 405 · giận 403 · ngạc nhiên 322 · bình thường 402. |
| **Train lại** (~4h CPU) | Tốt nhất epoch 19 (`train_checkpoints/checkpoint-3629`): **72.5%** trên 2 người lạ — angry **26%** (→ neutral), happy 94, neutral 63, sad 84, surprise 95. Train loss 0.004 → overfit. |
| **Model** | `emotion-scanner/my_emotion_model/` = **model cũ** (khớp Git LFS, sha256 `3aae7340bd…`). Backup cũ: `Documents/HIC/model_backup_2026-09-14/`. Model mới: `Documents/HIC/model_new_2026-09-27_best/` (sha256 `8912cdaac7…`, **không** trong git). |
| **Thiết kế "gợi ý theo gu"** (commit `6cf8fc1`, `189a92e`) | Spec `docs/superpowers/specs/2026-09-27-taste-based-recommendation-design.md`, plan `docs/superpowers/plans/2026-09-27-taste-based-recommendation.md` (7 task). **Chưa code.** |
| Ghi chép AI | `AI_NOTES.md` (người dùng viết; số liệu 977 ảnh / 85% trong đó đã cũ). |
| Cài trên laptop | Plugin PPT Master (`/plugin install ppt-master@ppt-master`) + `pip install -r requirements.txt` của nó (cần `PYTHONUTF8=1`). |

### Phiên 28/09 (sáng)
| Việc | File / kết quả |
|---|---|
| **Slide tiếng Việt** | `docs/EmoTune_bao_cao_28-09.pptx`: điền tên (Nhóm 6 · Nguyễn Đức Vinh, Hoàng Tuấn Phát, Phạm Thế Vỹ · GV Nguyễn Trọng Kiên); slide "Gợi ý nhạc" đổi **65/35** (ghi rõ "bản nâng cấp, đang code"); thêm slide **"Gợi ý theo gu"** (3 nguồn: âm thanh / thẻ ID3 / nhãn tay + công thức điểm + ví dụ ballad). Sau đó **người dùng tự bỏ 3 slide** (AI nhận diện, Xử lý ảnh, Khó khăn) trong PowerPoint → còn **10 slide**; ⚠ số trang góc dưới vẫn ghi "/ 13", sửa tay nếu dùng. |
| **Slide tiếng Anh** | `docs/EmoTune_report_28-09_EN.pptx` — 10 slide đúng bản người dùng giữ lại, số trang "/ 10", speaker notes tiếng Anh, tiêu đề bìa "The Mood Music Box". Project PPT Master: `~/.claude/plugins/cache/ppt-master/ppt-master/projects/emotune_report_en_ppt169_20260928/` (bản VN: `.../emotune_bao_cao_ppt169_20260927/`, hiện 13 slide). |
| **Kịch bản thuyết trình** | `docs/script-thuyet-trinh-28-09.md` cập nhật theo bản 13 slide (thêm slide 8 "Gợi ý theo gu", 65/35, câu hỏi về librosa/kho nhạc). **Chưa khớp bản 10 slide**, chưa có bản tiếng Anh. |
| **Đã mua linh kiện** | Breadboard, dây đực–đực, dây đực–cái, **màn hình OLED**, **cảm biến chuyển động (PIR)** — xem "Checklist linh kiện" ở mục 4. |
| **Hỏi đáp (chưa làm gì)** | Micro: thử **micro có sẵn trong webcam C270** trước (`arecord -l`), cần thì mua mic USB mini. Loa: thay Bluetooth bằng **loa vi tính USB (tiếng qua USB)**. Edge Impulse: làm được (MobileNetV2, upload ảnh đã cắt mặt, để 2 người ở "Testing") — nên làm như **thí nghiệm so sánh** với ViT 72.5%, chưa thay model chính; lưu ý xin phép trước khi upload ảnh mặt lên cloud. |

## 3. Các quyết định quan trọng và lý do

| Quyết định | Lý do |
|---|---|
| Demo ở trường qua **hotspot laptop**, gọi Pi bằng `raspberrypi.local` | Không phụ thuộc wifi trường; IP đổi theo mạng. |
| Hướng đồ án **"hộp nhạc cảm xúc"**: thiết bị tự chạy, tương tác bằng đèn + nút, ảnh xử lý tại chỗ | Để Pi có ý nghĩa hơn một máy tính nhỏ (trả lời "tại sao dùng Pi"). |
| GPIO = **service Python riêng**, **trang web gọi thẳng** `localhost:5001` (backend Node không đổi) | Trình duyệt chạy trên Pi; service chết thì nhạc vẫn chạy. |
| Nút bấm dùng **bộ đếm + web hỏi mỗi 300ms** | Server không tự gọi được trình duyệt; bộ đếm không mất / không xử lý 2 lần lần bấm. |
| Bảng nối chân slide 10 để **SVG thường** (`pin-table=no`) | Tránh rủi ro xuất bảng native. |
| **Chia train/val theo người** | Chia theo ảnh gây identity leakage → số ảo (92.5% vs 71.5% thật). |
| Mai **demo bằng model cũ** | Model cũ đã học mặt ducvinh (người demo); model mới giữ ducvinh làm tập kiểm tra. |
| Mai **demo không mạch** | Board đang có là **board đồng cần hàn**, không phải breadboard; không mua kịp. |
| "Gợi ý theo gu": cảm xúc vẫn là tiêu chí chính; gu chỉ xếp hạng **trong** cùng cảm xúc; hiểu bài từ âm thanh (librosa) + thẻ ID3 + nhãn tay (tùy chọn); 65/35 | Giữ đúng đề tài + tính năng chăm sóc cảm xúc; chạy được cả khi không ai điền nhãn. |

## 4. Các lệnh đã chạy và cách chạy lại dự án

### Đã chạy trong phiên
```bash
# Pi: thêm wifi hotspot (chạy từng lệnh ngắn — lệnh dài dán vào Git Bash hay bị cắt)
sudo nmcli connection add type wifi con-name demo-hotspot ifname wlan0 ssid gayta626
sudo nmcli connection modify demo-hotspot wifi-sec.key-mgmt wpa-psk wifi-sec.psk <MAT_KHAU_HOTSPOT>
sudo nmcli connection modify demo-hotspot connection.autoconnect-priority 10
# Laptop: train lại (trong emotion-scanner/, ~4h CPU)
PYTHONUTF8=1 venv/Scripts/python 2_finetune_model.py
PYTHONUTF8=1 venv/Scripts/python analyze_confusion.py
# Laptop: xuất lại slide (PPT Master) — S = thư mục skill, P = thư mục project PPT Master
python $S/scripts/svg_quality_checker.py $P --canonical-authoring --stage final --json
python $S/scripts/total_md_split.py $P && python $S/scripts/finalize_svg.py $P && python $S/scripts/svg_to_pptx.py $P
```

### Chạy demo trên Pi
1. Laptop bật hotspot `gayta626` (Power saving Off). Bật Pi, loa Bluetooth, cắm webcam C270, đợi ~1 phút.
2. Laptop mở 3 Git Bash → `ssh vinh@raspberrypi.local` (không vào được → `ipconfig /flushdns`):
```bash
cd ~/emotion-music-recommender/emotion-scanner && source venv/bin/activate && python 3_backend_server.py
cd ~/emotion-music-recommender/emotune-backend && npm start
cd ~/emotion-music-recommender/emotune-frontend && npm run dev
# (khi có mạch) cd ~/emotion-music-recommender/gpio-service && python3 gpio_service.py
#   cài 1 lần: sudo apt install -y python3-flask python3-flask-cors ; LED anot chung: LED_COMMON_ANODE=1
```
3. RealVNC Viewer → `raspberrypi.local` → Chromium `localhost:5173` → ▶ Bắt đầu → Allow camera.
   (Khi dùng nút vật lý: mở `chromium-browser --autoplay-policy=no-user-gesture-required http://localhost:5173`.)
4. Xem DB: `sudo -u postgres psql -d emotune -c "select id, emotion, action, created_at from mood_history order by id desc limit 5"`

### Chạy trên PC / laptop
```bash
# DB: DBeaver Alt+X db/schema.sql rồi db/seed.sql  (.env: DB_NAME=postgres)
cd emotion-scanner && venv\Scripts\activate && python 3_backend_server.py   # :5000
cd emotune-backend && npm run dev                                           # :8080
cd emotune-frontend && npm run dev                                          # :5173
```

### Checklist linh kiện (mua / chưa mua)

| Món | Trạng thái | Ghi chú |
|---|---|---|
| Raspberry Pi 5 + nguồn, webcam Logitech C270, loa Bluetooth | ✅ có | C270 có micro sẵn |
| LED RGB 4 chân (trong suốt) | ✅ có | chân dài nhất ở vị trí 2 → R, chung, G, B |
| Điện trở 220Ω (đỏ-đỏ-nâu) | ✅ có | dải băng be; dải băng vàng (nâu-đen-…) chưa rõ giá trị, để riêng |
| Nút bấm 4 chân | ✅ có | cần 2 |
| **Breadboard nhựa 830 lỗ** | ✅ mua 28/09 | board đồng cũ (cần hàn) không dùng |
| **Dây đực–cái** | ✅ mua 28/09 | chân Pi → breadboard |
| **Dây đực–đực** | ✅ mua 28/09 | nối trên breadboard |
| **Màn hình OLED 0.96" I2C, 4 chân** (GND, VCC, SCL, SDA) | ✅ mua 28/09 | **chưa có code**; chip thường là SSD1306, địa chỉ I2C 0x3C (kiểm tra bằng `i2cdetect -y 1`) |
| **Cảm biến chuyển động PIR HC-SR501** | ✅ mua 28/09 | **chưa có code** — có người → tự quét, đi khỏi → dừng nhạc |
| Loa vi tính USB (tiếng qua USB) | ⬜ chưa mua · tùy chọn | thay loa Bluetooth cho ổn định |
| Micro USB mini | ⬜ chưa mua · tùy chọn | chỉ khi làm giọng nói và mic C270 không đủ rõ |
| Module MAX98357A + loa 3W 4Ω | ⬜ chưa mua · để sau | loa gắn liền mạch, **phải hàn** |

### Sơ đồ mạch (chưa lắp)
| Linh kiện | Chân Pi (số vật lý) |
|---|---|
| LED R / G / B | GPIO17 (11) / GPIO27 (13) / GPIO22 (15), mỗi màu 1 điện trở **220Ω** (đỏ-đỏ-nâu, dải băng be) |
| Chân chung LED (chân dài nhất) | GND (9); nếu không sáng → 3.3V (1) + `LED_COMMON_ANODE=1` |
| Nút 1 / Nút 2 | GPIO5 (29) ↔ GND (30) / GPIO6 (31) ↔ GND (34), 2 chân chéo của nút |

LED RGB trong suốt: xoay sao cho chân dài nhất ở **vị trí 2** → thứ tự R, chung, G, B. ⚠ Tắt Pi trước khi cắm dây.

## 5. Lỗi đang gặp hoặc việc còn dở
- **Mạch đèn + nút chưa lắp**, GPIO chưa test trên Pi thật (đã có đủ linh kiện từ 28/09). OLED 0.96" I2C 4 chân + PIR HC-SR501 **chưa thiết kế, chưa code**.
- **Laptop chưa chạy dự phòng được**: DB laptop còn bản cũ 15 bài, `emotune-backend/music/` trống.
- **AI**: 72.5% với người lạ; lớp **giận yếu** (26%, bị đoán thành bình thường); overfit mạnh; `load_best_model_at_end` **không nạp** bản tốt nhất (phải lấy tay từ checkpoint); `dat` thiếu ảnh surprise; `AI_NOTES.md` đã cũ, `check_data_quality.py` được nhắc nhưng không có trong repo.
- **Chưa commit:** `docs/EmoTune_bao_cao_28-09.pptx` (bản 10 slide người dùng sửa), `docs/EmoTune_report_28-09_EN.pptx`, `docs/script-thuyet-trinh-28-09.md`.
- Kịch bản thuyết trình chưa khớp bản 10 slide; slide VN còn số trang "/ 13".
- Cũ, chưa sửa: `EmotionScanner` gửi ảnh khi camera chưa mở; `mood_history` có thể ghi `suggested` 2 lần; camera CSI không nhận; mỗi lần bật Pi phải mở tay các server qua SSH.
- Global Python laptop có sẵn xung đột cũ (tensorflow-intel 2.17, facenet-pytorch) — không liên quan dự án, đừng "sửa".

### Đánh giá tiến độ phần cứng cho buổi demo trong ngày 28/09 (đã chốt)
| Phần | Đánh giá | Thời gian ước tính |
|---|---|---|
| **LED RGB + 2 nút** | ✅ **Làm hôm nay** — code đã xong + test mock | ~1–1,5 giờ (lắp 30–45 phút + cài/test Pi 20 phút + chạy thử 15 phút) |
| **OLED 0.96" I2C** | 🟡 **Chỉ làm nếu còn ≥ 1,5 giờ** — bản đơn giản: `gpio_service.py` vẽ tên cảm xúc lên OLED mỗi khi nhận `POST /led` (không sửa web) | ~1–1,5 giờ (bật I2C, cài thư viện, code) |
| **PIR HC-SR501** | ❌ **Để buổi sau** — phải đổi logic web (tự quét / tự dừng), chỉnh độ nhạy + thời gian trễ, rủi ro phá vòng lặp đang chạy | ~2–3 giờ |

Thứ tự: (1) LED + nút → (2) OLED nếu còn giờ → (3) chừa **≥ 30 phút cuối** chạy thử toàn bộ như lúc demo. Mạch lỗi thì nhạc vẫn chạy → dự phòng: demo bằng nút trên màn hình.

## 6. Bước tiếp theo nên làm
1. **28/09 — báo cáo:** theo `docs/script-thuyet-trinh-28-09.md`; demo bằng nút trên màn hình, **cười tươi** (vui nhận diện tốt nhất), tránh demo "giận".
2. **Lắp mạch đèn + nút** (đã có đủ linh kiện) theo sơ đồ mục 4, hướng dẫn **từng bước chậm** (người dùng chưa lắp mạch bao giờ) → test `curl -X POST localhost:5001/led -H "Content-Type: application/json" -d '{"state":"happy"}'` (đèn vàng) và `curl localhost:5001/buttons` → test toàn luồng với Chromium cờ autoplay.
3. **AI:** xem lại ảnh "giận" của ducvinh/vanquynh; thử giảm overfit (augmentation mạnh hơn, ít epoch, mở 1 lớp); sửa lấy best checkpoint; sau đó **train bản cuối trên đủ 10 người** → commit model (Git LFS) → trên Pi `git pull && git lfs pull` → restart `3_backend_server.py`. Cập nhật `AI_NOTES.md`.
4. **Gợi ý theo gu:** người dùng đọc plan rồi chọn cách thực hiện (Native / Subagent / tự code). Cần thêm bài hát (≥ 8–10 bài mỗi cảm xúc) thì tính năng mới có ý nghĩa.
5. **OLED 0.96" I2C + PIR HC-SR501:** brainstorm thiết kế (OLED hiện tên bài + cảm xúc; PIR tự quét / tự dừng) — mở rộng `gpio-service`, rồi spec → plan.
6. **Giai đoạn 2 phần cứng:** cắm điện là chạy (systemd cho các service + Chromium kiosk), không cần VNC.
7. (Tùy chọn) Thí nghiệm Edge Impulse so với ViT trên cùng 2 người kiểm tra.
8. Laptop dự phòng: `scp` mp3 từ Pi về, chạy lại `schema.sql` + `seed.sql`.

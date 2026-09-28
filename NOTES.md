# NOTES.md — EmoTune Project Session Log

> Phiên gần nhất: **27–28/09/2026** (trên **laptop**, hostname `vinh`). Deadline dự án **15/10/2026**. Báo cáo tiến độ cho thầy: **28/09**.
> Trạng thái: vòng lặp cốt lõi (camera → AI → nhạc → chấm điểm) **chạy trên Pi qua hotspot laptop**. **Màn OLED đã chạy trọn vòng với web** (28/09 chiều): quét → "Dang quet..." → hiện cảm xúc. **Bỏ đèn LED.** **Nút bấm cứng chưa chạy** → demo 28/09 dùng nút trên màn hình, buổi sau thay bằng module chạm **TTP223**. Model AI trên Pi vẫn là **model cũ**.
> Người dùng: sinh viên, cần hướng dẫn từng bước rõ ràng; thường tự code theo gợi ý, nhưng phiên này nhờ Claude code trực tiếp (GPIO, OLED, script train, slide). Lắp phần cứng: **mỗi tin nhắn 1 bước**, chờ người dùng báo xong.

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

### Phiên 28/09 (chiều) — lắp phần cứng
| Việc | File / kết quả |
|---|---|
| **Đèn LED RGB → bỏ** | LED là loại **anot chung** (chân chung phải nối 3.3V). Cắm trên breadboard bị lệch cột nhiều lần: chỉ lên được xanh dương, đỏ + xanh lá hở. Người dùng quyết định **bỏ đèn, dùng OLED**. |
| **OLED 0.96" I2C — chạy ✅** | `gpio-service/oled.py` (mới): tự điều khiển SSD1306 qua I2C bằng `smbus2` + vẽ chữ bằng Pillow (không cần thư viện OLED). `python3 oled.py` = hiện thử 4 cảnh. OLED mua về **chưa hàn chân** → đã nhờ tiệm hàn. Nối bằng **dây cái–cái thẳng vào Pi** (qua breadboard thì `i2cdetect` không thấy). `i2cdetect -y 1` thấy **`3c`**. |
| **`gpio_service.py` sửa** | Bỏ RGBLED; `POST /led {state}` giờ **vẽ chữ lên OLED** (giữ tên `/led` để **web không phải sửa**): off → "San sang", scanning → "Dang quet...", happy/sad/angry/surprise/neutral → VUI/BUON/GIAN/NGAC NHIEN/BINH THUONG (không dấu, chữ dài tự thu nhỏ). OLED lỗi/chưa cắm thì service vẫn chạy. Đã test mock trên laptop + chạy thật trên Pi với web: **đúng**. |
| **Nút bấm → chưa chạy ❌** | Đổi chân nút sang **GPIO17 (11) / GPIO27 (13)**, GND chung (dễ đếm hơn 29/31). `test_hardware.py` giờ chỉ thử nút + in trạng thái lúc đầu. Nối thẳng dây GPIO17 ↔ GND thì Pi **nhận được** → Pi + code tốt. Nhưng qua **breadboard** (nút 4 chân) và qua **nút xám 6 chân** (bấm không đổi mạch, `pinctrl get 17` không đổi) đều **không ăn**. Chưa rõ breadboard hỏng hay nút. → **Thay bằng module chạm TTP223** (3 chân VCC/GND/SIG, dây cái–cái, chạm xuyên vách gỗ mỏng). |
| **Thiết kế vỏ hộp** | Artifact "Hộp nhạc EmoTune": https://claude.ai/artifact/4gG9bMeum3LbByggG66QK1 — hộp gỗ nắp bản lề 22×15×12 cm; mặt trước: lưới loa trái, camera Ø15 / OLED 26×15 / 2 nút Ø12 bên phải (có bảng toạ độ tâm lỗ); Pi góc sau phải, quạt dưới khe nắp, cổng USB-C ra sau. Làm thử bằng carton trước. (Nếu dùng TTP223 thì không cần khoét lỗ nút.) Chưa biết kích thước loa Bluetooth — đang chừa ~6 cm. |
| Cách chép code sang Pi | Code OLED được **`scp` từ laptop** (`scp gpio-service/*.py vinh@raspberrypi.local:~/emotion-music-recommender/gpio-service/`), chưa qua git → xem mục 5 trước khi `git pull` trên Pi. |

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
| **Bỏ đèn LED, dùng OLED** (28/09 chiều) | LED cắm breadboard lệch cột mãi không lên đủ màu; OLED chỉ 4 dây, hiện được chữ → demo dễ hiểu hơn. |
| OLED giữ API **`POST /led`** | Web không phải sửa; chỉ `gpio_service.py` đổi từ đổi màu sang vẽ chữ. |
| Tự viết driver SSD1306 (`oled.py`) thay vì `luma.oled` | Chỉ cần gói apt (`python3-smbus2`, `python3-pil`), không phải `pip --break-system-packages` trên Pi. |
| Nối OLED bằng **dây cái–cái thẳng vào Pi** | Ít điểm tiếp xúc hơn qua breadboard; qua breadboard `i2cdetect` không thấy. |
| Nút: **thay bằng module chạm TTP223** | Nút cơ trên breadboard / nút 6 chân đều không ăn, trong khi Pi + code đã được chứng minh tốt; TTP223 cắm thẳng 3 dây cái–cái, chạm xuyên vách hộp. |
| Demo 28/09: **OLED + nút trên màn hình** | Không phí thêm giờ gỡ nút trước báo cáo. |
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
cd ~/emotion-music-recommender/gpio-service && python3 gpio_service.py   # OLED (cửa sổ thứ 4)
#   cài 1 lần: sudo raspi-config nonint do_i2c 0
#              sudo apt install -y i2c-tools python3-smbus2 python3-pil python3-flask python3-flask-cors
#   thử riêng: i2cdetect -y 1 (thấy 3c) · python3 oled.py · curl -X POST localhost:5001/led -H "Content-Type: application/json" -d '{"state":"happy"}'
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
| LED RGB 4 chân (trong suốt), điện trở 220Ω | ✅ có · **không dùng nữa** | LED là loại **anot chung** |
| Nút 4 chân núm đen, nút 6 chân xám (nhấn nhả) | ✅ có · **chưa ăn** | thay bằng TTP223 |
| Breadboard 830 lỗ, dây đực–cái, dây đực–đực | ✅ mua 28/09 | nghi breadboard có chỗ không thông |
| **Dây cái–cái** | ✅ có | nối thẳng module → Pi; mua thêm loại **dài 20 cm** khi lắp hộp |
| **Màn hình OLED 0.96" I2C** (thứ tự chân: **VCC GND SCL SDA**) | ✅ **chạy** | đã nhờ tiệm hàn chân; SSD1306, địa chỉ `0x3C` |
| **Cảm biến chuyển động PIR HC-SR501** | ✅ mua 28/09 | **chưa có code**, cần 5V — có người → tự quét, đi khỏi → dừng nhạc |
| **2 module chạm TTP223** | ⬜ **cần mua** | thay nút bấm; nhờ hàn sẵn chân |
| Hộp gỗ nắp bản lề ~22×15×12 cm | ⬜ chưa mua | xem artifact "Hộp nhạc EmoTune" (mục 2) |
| Loa vi tính USB (tiếng qua USB) | ⬜ chưa mua · tùy chọn | thay loa Bluetooth cho ổn định |
| Micro USB mini | ⬜ chưa mua · tùy chọn | chỉ khi làm giọng nói và mic C270 không đủ rõ |
| Module MAX98357A + loa 3W 4Ω | ⬜ chưa mua · để sau | loa gắn liền mạch, **phải hàn** |

### Sơ đồ nối dây
Chân 1 = đầu hàng 40 chân **gần lỗ ốc**, cổng nguồn ở dưới bên trái. **Hàng dưới** (sát tản nhiệt) = chân lẻ 1, 3, 5…; **hàng trên** (sát mép hộp) = chân chẵn. ⚠ Hàng trên chân thứ 1–2 (chân 2, 4) là **5V**.

| Linh kiện | Chân Pi (số vật lý) · vị trí đếm từ trái | Trạng thái |
|---|---|---|
| OLED VCC / SDA / SCL / GND | 3.3V (1) / GPIO2 (3) / GPIO3 (5) / GND (9) · hàng dưới thứ 1 / 2 / 3 / 5 | ✅ chạy |
| Nút 1 / Nút 2 (hoặc SIG của TTP223) | GPIO17 (11) / GPIO27 (13) · hàng dưới thứ 6 / 7 | code sẵn, phần cứng chưa ăn |
| GND cho nút | GND (39) · **chân cuối cùng hàng dưới** (dễ tìm nhất) | |

⚠ Tắt Pi (`sudo shutdown now`) và rút điện trước khi cắm/rút dây.

## 5. Lỗi đang gặp hoặc việc còn dở
- **Trên Pi, code gpio-service được chép bằng `scp`** → lần `git pull` sau sẽ báo trùng file. Trước khi pull, chạy trên Pi (từng dòng, trong `~/emotion-music-recommender`):
  `rm gpio-service/oled.py gpio-service/test_hardware.py` · `git checkout gpio-service/gpio_service.py` · `git pull` (nội dung giống hệt bản đã commit).
- **Nút bấm cứng chưa chạy** (xem mục 2, phiên chiều) → mua TTP223. Khi có: TTP223 xuất mức **cao** khi chạm → sửa `Button(17)` thành `Button(17, pull_up=None, active_state=True)` (tương tự 27); VCC TTP223 nối 3.3V (hàng trên không có 3.3V dư → dùng chân 17, hàng dưới thứ 9).
- **PIR HC-SR501 chưa thiết kế, chưa code.**
- Trang web còn comment/tên hàm cũ nói "đèn LED" (`hardware.js` `setLed`, `HomePage.jsx`) — chạy đúng, chỉ là tên cũ.
- **Laptop chưa chạy dự phòng được**: DB laptop còn bản cũ 15 bài, `emotune-backend/music/` trống.
- **AI**: 72.5% với người lạ; lớp **giận yếu** (26%, bị đoán thành bình thường); overfit mạnh; `load_best_model_at_end` **không nạp** bản tốt nhất (phải lấy tay từ checkpoint); `dat` thiếu ảnh surprise; `AI_NOTES.md` đã cũ, `check_data_quality.py` được nhắc nhưng không có trong repo.
- Kịch bản thuyết trình chưa khớp bản 10 slide; slide VN còn số trang "/ 13". Slide/kịch bản vẫn nói "đèn LED + nút" → nên sửa thành **OLED** (nút: "đang làm, dùng module chạm").
- Cũ, chưa sửa: `EmotionScanner` gửi ảnh khi camera chưa mở; `mood_history` có thể ghi `suggested` 2 lần; camera CSI không nhận; mỗi lần bật Pi phải mở tay các server qua SSH.
- Global Python laptop có sẵn xung đột cũ (tensorflow-intel 2.17, facenet-pytorch) — không liên quan dự án, đừng "sửa".

## 6. Bước tiếp theo nên làm
1. **28/09 — báo cáo:** theo `docs/script-thuyet-trinh-28-09.md`; bật thêm `gpio_service.py` để **OLED hiện cảm xúc**; bấm bằng nút trên màn hình; **cười tươi** (vui nhận diện tốt nhất), tránh demo "giận".
2. **Nút bấm bằng TTP223:** mua 2 module (nhờ hàn chân) → sửa `Button(...)` theo mục 5 → nối SIG vào GPIO17/27 bằng dây cái–cái → `python3 test_hardware.py` → test toàn luồng với Chromium cờ autoplay. Hướng dẫn **1 bước mỗi tin nhắn**.
3. **AI:** xem lại ảnh "giận" của ducvinh/vanquynh; thử giảm overfit (augmentation mạnh hơn, ít epoch, mở 1 lớp); sửa lấy best checkpoint; sau đó **train bản cuối trên đủ 10 người** → commit model (Git LFS) → trên Pi `git pull && git lfs pull` → restart `3_backend_server.py`. Cập nhật `AI_NOTES.md`.
4. **Gợi ý theo gu:** người dùng đọc plan rồi chọn cách thực hiện (Native / Subagent / tự code). Cần thêm bài hát (≥ 8–10 bài mỗi cảm xúc) thì tính năng mới có ý nghĩa.
5. **PIR HC-SR501** (tự quét khi có người / dừng khi đi khỏi) + (tùy chọn) OLED hiện thêm tên bài: brainstorm → spec → plan, mở rộng `gpio-service`.
5b. **Vỏ hộp:** theo artifact "Hộp nhạc EmoTune"; làm thử bằng carton; gửi Claude kích thước loa Bluetooth để chỉnh bản vẽ.
6. **Giai đoạn 2 phần cứng:** cắm điện là chạy (systemd cho các service + Chromium kiosk), không cần VNC.
7. (Tùy chọn) Thí nghiệm Edge Impulse so với ViT trên cùng 2 người kiểm tra.
8. Laptop dự phòng: `scp` mp3 từ Pi về, chạy lại `schema.sql` + `seed.sql`.

# NOTES.md — EmoTune Project Session Log

> Tóm tắt phiên làm việc gần nhất (**27/09/2026**) để phiên mới tiếp tục ngay. Phiên 27/09 ở mục 2 (đầu tiên).
> Deadline dự án: **15/10/2026**. Báo cáo Pi cho thầy: **Thứ 2 (28/09)**.
> Trạng thái: vòng lặp cốt lõi **chạy được trên PC và trên Pi**, tập demo qua **hotspot laptop** OK. Hướng mới: biến đồ án thành **"hộp nhạc cảm xúc"** (thiết bị vật lý). Giai đoạn 1 (LED RGB + 2 nút) **đã code, chưa test trên Pi thật**.
> Máy dev là **PC**; **laptop** (hostname `vinh`) dùng để điều khiển Pi khi demo. Laptop: DB còn bản cũ 15 bài, chưa có mp3 → chưa chạy dự phòng được.
> Người dùng muốn **tự code**, Claude hướng dẫn từng nhiệm vụ nhỏ (gợi ý, không đưa code sẵn) trừ khi được nhờ làm trực tiếp (phần GPIO 27/09: nhờ Claude code, người dùng nối mạch).

---

## 1. Mục tiêu của phiên này
- Kiểm chứng vòng lặp trên PC (DB mới + test trình duyệt), push.
- Đưa toàn bộ hệ thống lên Raspberry Pi và đo độ trễ AI.
- Bắt đầu thiết kế mạch GPIO.

## 2. Những việc đã làm xong
### Phiên 27/09 (trên laptop)
| Việc | Chi tiết |
|---|---|
| Mạng demo | Hotspot laptop: tên `gayta626`, 2.4 GHz, **Share over = Wi-Fi**, **Power saving = Off** (bật thì hotspot tự tắt). Pi có connection `demo-hotspot` (priority 10) → tự vào hotspot khi thấy. Pi trong hotspot: `192.168.137.x`. |
| Gọi Pi bằng tên | `ssh vinh@raspberrypi.local`, VNC `raspberrypi.local`. Không vào được → `ipconfig /flushdns` (laptop nhớ IP cũ). |
| Tập demo trên Pi qua hotspot | 3 server + loa BT + C270 chạy trọn vòng, không lỗi. |
| Hướng đồ án | Chọn **A + C**: thiết bị tự chạy, tương tác vật lý (đèn, nút), ảnh xử lý tại chỗ. Spec: `docs/superpowers/specs/2026-09-27-gpio-led-buttons-design.md`. |
| `gpio-service/gpio_service.py` (mới) | Flask :5001 + gpiozero. `POST /led {state}` (`off`/`scanning` = trắng nhấp nháy/5 cảm xúc), `GET /buttons` → bộ đếm `{next, pause}`. `LED_COMMON_ANODE=1` nếu LED anot chung. Đã test bằng mock pin trên laptop. |
| Frontend | `src/hardware.js` (mới: `setLed`, hook `useHardwareButtons` hỏi `/buttons` mỗi 300ms), `config.js` thêm `GPIO_URL`, `HomePage.jsx` đổi màu đèn theo trạng thái + nút 1 = Bắt đầu, `MusicPlayer.jsx` nút 1 = bài tiếp, nút 2 = tạm dừng/phát. Không có service (PC) → bỏ qua im lặng. |

### Phiên 26/09
| Việc | Chi tiết |
|---|---|
| DB trên PC | Chạy lại `emotune-backend/db/schema.sql` + `db/seed.sql` (DBeaver **Alt+X**) → 10 bài, có index UNIQUE `songs_file_path_key`. |
| Test e2e trên PC | `mood_history` ra đúng `suggested` / `good` / `bad`, mỗi bài 1 dòng `suggested`. |
| `NOTES.md` | Cập nhật + push (commit `b1b39a4`, `8b95a5e`). |
| **Pi chạy được toàn bộ** | Pi 5, user `vinh`, hostname `raspberrypi`, IP `192.168.1.191`. git pull + `git lfs pull` (model 328M), DB **`emotune`** (schema + seed, 10 bài), `music/` scp từ PC, venv Flask, backend, frontend. |
| Độ trễ AI trên Pi | Log Flask `/predict` đều mỗi 3s, trả 200 → xử lý **< 3s**, không dồn request. |
| Camera Pi | Webcam **Logitech C270** cắm USB Pi → `/dev/video0`. |
| Âm thanh Pi | **Loa Bluetooth** (Pi 5 không có jack 3.5mm). |
| Màn hình Pi | **VNC**: wayvnc (`raspi-config nonint do_vnc 0`), auto-login desktop (`do_boot_behaviour B4`); PC dùng **RealVNC Viewer** → `192.168.1.191`. |
| Test trên Pi | Chromium trên Pi → `localhost:5173`: nhận mặt → phát nhạc → Next → `mood_history` có `suggested`, `bad`, rồi quét lại. |

### Code hiện có (từ phiên 25/09, không đổi trong phiên này)
**Backend `emotune-backend/`**
| File | Nội dung |
|---|---|
| `db/schema.sql` | 4 bảng. `songs.file_path` **UNIQUE**. ⚠️ Có `DROP TABLE` ở đầu (xoá dữ liệu cũ). |
| `db/seed.sql` | 10 bài thật (2 × 5 cảm xúc), `ON CONFLICT (file_path) DO NOTHING`. |
| `scripts/rename-music.js` | `npm run rename-music [-- --apply]` đổi tên mp3. |
| `src/server.js` | `app.use("/music", express.static(...))`. |
| `music/` | 10 mp3 (**không có trong git**). |
| `src/services/suggestService.js` | `generateSuggestion` trả thêm `emotion: targetEmotion`. |
| `src/services/emotionService.js` | Gọi Flask `http://localhost:5000/predict`. |
| `src/model/suggestModel.js` | `getMoodTrend` chỉ đếm `action = 'suggested'`. |

Phân loại nhạc: happy = co_chac_yeu_la_day, muon_roi_ma_sao_con · sad = gia_nhu, kho_giu_chan_thanh · angry = meditation, reduce_stress · surprise = blank_space, cilu · neutral = giac_mo_co_that, neu_nhu_ta_chang_con_feat_a_ap_uot_mi.

**Frontend `emotune-frontend/src/`**
| File | Nội dung |
|---|---|
| `config.js` | `API_URL = "http://localhost:8080"`. |
| `components/EmotionScanner.jsx` | Quét mỗi 3s, cờ `cancelled` tắt camera về trễ. |
| `components/MusicPlayer.jsx` | Đo **giây thực nghe** (`audio.played`), gửi `/listen-report`, nút ⏭ Next. |
| `pages/HomePage.jsx` | Nút ▶ Bắt đầu; đang phát thì gỡ scanner; `prev ?? data` bỏ kết quả trễ. |

## 3. Các quyết định quan trọng và lý do
| Quyết định | Lý do |
|---|---|
| Dev trên **PC**, laptop để sau làm máy demo/dự phòng | PC mạnh hơn; code qua git nên đổi máy dễ. |
| Mở web bằng **Chromium ngay trên Pi** (`localhost:5173`), xem qua VNC | Camera chạy trong trình duyệt → phải là trình duyệt trên Pi. Chrome chặn camera với `http://192.168.1.191` (không phải localhost/https). `API_URL` giữ `localhost`. |
| Dùng **webcam USB C270**, chưa dùng camera Pi (CSI) | Chromium khó nhận CSI (libcamera); model được train bằng ảnh webcam; ảnh bị thu về 224×224 nên độ nét camera không quan trọng. |
| **VNC** thay vì màn hình riêng | Chỉ có 1 màn hình (đang cắm PC). |
| SSH bằng **Git Bash** | ssh của cmd Windows 11 (bản cũ) bị "Connection closed" với Pi. |
| **Loa Bluetooth** | Pi 5 không có jack 3.5mm. |
| Mạch GPIO: **LED RGB báo cảm xúc + 1 nút bấm**, làm LED trước | Chưa rõ thầy có bắt buộc mạch cho thứ 2 không → làm bản nhỏ, tách rời, không phá vòng lặp đang chạy. |
| GPIO bằng **service Python riêng** (`gpio-service/`, Flask + `gpiozero`, cổng 5001) — "cách 1" | Tách biệt: service chết/không chạy (trên PC) thì backend bỏ qua lỗi. Không nhét vào Flask AI (trộn trách nhiệm, LED đổi theo mọi lần quét). Không dùng Node GPIO (`onoff` không hỗ trợ tốt Pi 5). |

## 4. Các lệnh đã chạy và cách chạy lại dự án
### Đã chạy trong phiên (trên Pi, qua SSH Git Bash)
```bash
sudo apt install -y git-lfs && git lfs install && git lfs pull
sudo -u postgres psql -d emotune -f db/schema.sql
sudo -u postgres psql -d emotune -f db/seed.sql
python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
sudo raspi-config nonint do_vnc 0
sudo raspi-config nonint do_boot_behaviour B4
v4l2-ctl --list-devices          # thấy "C270 HD WEBCAM" /dev/video0
# Trên PC (Git Bash):
scp -r emotune-backend/music vinh@192.168.1.191:~/emotion-music-recommender/emotune-backend/
```

### Chạy lại trên PC
```bash
# DB (DBeaver, Alt+X): db/schema.sql rồi db/seed.sql   (.env PC: DB_NAME=postgres)
cd emotion-scanner && venv\Scripts\activate && python 3_backend_server.py   # :5000
cd emotune-backend && npm run dev                                           # :8080
cd emotune-frontend && npm run dev                                          # :5173
```

### Chạy lại trên Pi (demo)
1. Laptop bật hotspot `gayta626` (Power saving Off). Bật Pi, bật loa Bluetooth, cắm C270, đợi ~1 phút.
2. Laptop mở 4 terminal **Git Bash** → `ssh vinh@raspberrypi.local` mỗi cái:
```bash
cd ~/emotion-music-recommender/emotion-scanner && source venv/bin/activate && python 3_backend_server.py
cd ~/emotion-music-recommender/emotune-backend && npm start
cd ~/emotion-music-recommender/emotune-frontend && npm run dev
cd ~/emotion-music-recommender/gpio-service && python3 gpio_service.py   # LED anot chung: LED_COMMON_ANODE=1 python3 gpio_service.py
```
   (gpio-service chạy bằng python3 hệ thống, cài 1 lần: `sudo apt install -y python3-flask python3-flask-cors`)
3. RealVNC Viewer → `raspberrypi.local` → terminal trên Pi: `chromium-browser --autoplay-policy=no-user-gesture-required http://localhost:5173` (không có lệnh thì `chromium`) → bấm **nút 1** hoặc ▶ Bắt đầu → Allow camera. Cờ autoplay cần vì bấm nút vật lý không tính là thao tác trên trang.
4. Kiểm tra: `sudo -u postgres psql -d emotune -c "select id, emotion, action, created_at from mood_history order by id"`

## 5. Lỗi đang gặp hoặc việc còn dở
- **GPIO giai đoạn 1 chưa test trên Pi thật** (mới test mock). Chưa biết LED RGB là **catot chung hay anot chung** → thử khi nối. Chưa chắc giá trị điện trở.
- `mood_history` trên Pi: dòng 1 và 2 đều `happy suggested` cho 1 bài → chưa rõ là lần test cũ hay 2 request quét gần như cùng lúc (backend ghi cả 2, frontend bỏ 1). Xem `created_at`.
- `EmotionScanner` vẫn gửi ảnh mỗi 3s khi camera chưa mở (ảnh đen → "Không phát hiện khuôn mặt") → nên bỏ qua khi chưa có stream.
- Camera Pi (CSI) không được nhận (`v4l2-ctl` không thấy) — có thể cáp lỏng; để sau.
- 4 service phải mở tay qua 4 SSH mỗi lần bật Pi.
- Trên PC/laptop (không có gpio-service), console trình duyệt hiện lỗi kết nối `localhost:5001` mỗi 300ms — vô hại.
- ESLint warning `onResult` dependency (vô hại); chưa style player; `Setting.jsx` placeholder.
- Laptop chưa dựng.

### Thiết kế mạch đã duyệt
| Linh kiện | Chân Pi (số vật lý) |
|---|---|
| LED R / G / B | GPIO17 (11) / GPIO27 (13) / GPIO22 (15), **mỗi màu 1 điện trở 220–330Ω** |
| Chân chung LED | GND (9) nếu catot chung, 3.3V (1) nếu anot chung |
| Nút 1 (Bắt đầu khi chưa phát / Next khi đang phát) | GPIO5 (29) ↔ GND (30), dùng pull-up trong |
| Nút 2 (Tạm dừng / Phát tiếp) | GPIO6 (31) ↔ GND (34), dùng pull-up trong |

Màu: happy vàng (R+G) · sad xanh dương (B) · angry đỏ (R) · surprise tím (R+B) · neutral trắng · đang quét = trắng nhấp nháy (đèn báo camera) · chưa bắt đầu = tắt.
⚠️ Tắt Pi trước khi cắm/rút dây.

## 6. Bước tiếp theo nên làm
1. **Nối mạch + test GPIO trên Pi** (spec mục "Các bước làm" 1, 2, 4, 6): `git pull`, cài python3-flask, `curl -X POST localhost:5001/led -H "Content-Type: application/json" -d '{"state":"happy"}'` → đèn vàng; bấm nút → `curl localhost:5001/buttons` tăng; rồi test toàn luồng.
2. **Giai đoạn 2 (sau demo):** tự khởi động khi cắm điện (systemd cho 4 service + Chromium `--kiosk --autoplay-policy=no-user-gesture-required`), không cần VNC. Viết spec riêng. Có thể thêm cảm biến PIR / màn OLED nếu mua được.
3. Laptop dự phòng: scp mp3 từ Pi về, chạy lại `schema.sql` + `seed.sql` bằng DBeaver.
4. Sửa nhỏ: `EmotionScanner` bỏ qua khi chưa có stream; kiểm tra lỗi ghi `suggested` 2 lần.
5. Sau báo cáo: camera Pi, Mood Journey chart, voice control, trang Settings, style player.

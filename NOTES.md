# NOTES.md — EmoTune Project Session Log

> Tóm tắt phiên làm việc gần nhất (**26/09/2026**) để phiên mới tiếp tục ngay.
> Deadline dự án: **15/10/2026**. Báo cáo Pi cho thầy: **Thứ 2 (28/09)**.
> Trạng thái: vòng lặp cốt lõi **chạy được trên PC và trên Pi**. Đang thiết kế **mạch GPIO** (LED RGB + nút bấm) — mới duyệt xong phần phần cứng.
> Máy dev là **PC** (log cũ ghi "laptop" = PC). **Laptop chưa dựng** — sau dùng làm máy demo/dự phòng.
> Người dùng muốn **tự code**, Claude hướng dẫn từng nhiệm vụ nhỏ (gợi ý, không đưa code sẵn) trừ khi được nhờ làm trực tiếp.

---

## 1. Mục tiêu của phiên này
- Kiểm chứng vòng lặp trên PC (DB mới + test trình duyệt), push.
- Đưa toàn bộ hệ thống lên Raspberry Pi và đo độ trễ AI.
- Bắt đầu thiết kế mạch GPIO.

## 2. Những việc đã làm xong
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
1. Bật Pi, bật loa Bluetooth, cắm C270.
2. PC mở 3 terminal **Git Bash** → `ssh vinh@192.168.1.191` mỗi cái:
```bash
cd ~/emotion-music-recommender/emotion-scanner && source venv/bin/activate && python 3_backend_server.py
cd ~/emotion-music-recommender/emotune-backend && npm start
cd ~/emotion-music-recommender/emotune-frontend && npm run dev
```
3. RealVNC Viewer → `192.168.1.191` → Chromium → `localhost:5173` → ▶ Bắt đầu → Allow camera.
4. Kiểm tra: `sudo -u postgres psql -d emotune -c "select id, emotion, action, created_at from mood_history order by id"`

## 5. Lỗi đang gặp hoặc việc còn dở
- **Thiết kế GPIO dở dang**: mới duyệt **Phần 1 (phần cứng)**; còn Phần 2 (service GPIO) và Phần 3 (nối vào hệ thống + test), sau đó viết spec → kế hoạch.
- Chưa chắc có điện trở / giá trị bao nhiêu → chụp ảnh linh kiện gửi Claude đọc vạch màu. Chưa biết LED RGB là **catot chung hay anot chung** → thử khi nối.
- `mood_history` trên Pi: dòng 1 và 2 đều `happy suggested` cho 1 bài → chưa rõ là lần test cũ hay 2 request quét gần như cùng lúc (backend ghi cả 2, frontend bỏ 1). Xem `created_at`.
- `EmotionScanner` vẫn gửi ảnh mỗi 3s khi camera chưa mở (ảnh đen → "Không phát hiện khuôn mặt") → nên bỏ qua khi chưa có stream.
- Camera Pi (CSI) không được nhận (`v4l2-ctl` không thấy) — có thể cáp lỏng; để sau.
- 3 server phải mở tay qua 3 SSH mỗi lần bật Pi.
- ESLint warning `onResult` dependency (vô hại); chưa style player; `Setting.jsx` placeholder.
- Laptop chưa dựng.

### Thiết kế mạch đã duyệt (Phần 1 — phần cứng)
| Linh kiện | Chân Pi (số vật lý) |
|---|---|
| LED R / G / B | GPIO17 (11) / GPIO27 (13) / GPIO22 (15), **mỗi màu 1 điện trở 220–330Ω** |
| Chân chung LED | GND (9) nếu catot chung, 3.3V (1) nếu anot chung |
| Nút (Bắt đầu khi chưa phát / Next khi đang phát) | GPIO5 (29) ↔ GND (30), dùng pull-up trong |

Màu: happy vàng (R+G) · sad xanh dương (B) · angry đỏ (R) · surprise tím (R+B) · neutral trắng · chờ = tắt.
⚠️ Tắt Pi trước khi cắm/rút dây.

## 6. Bước tiếp theo nên làm
1. **Trước thứ 2:** tập chạy demo từ đầu 1 lượt (mục 4 "Chạy lại trên Pi"); hỏi thầy có cần mạch cho buổi thứ 2 không.
2. Tiếp tục brainstorm GPIO: **Phần 2 — service GPIO** (API `POST /led {emotion}`, nút bấm, cài `gpiozero`/`lgpio` trong venv trên Pi 5), **Phần 3 — backend gọi `/led` sau `generateSuggestion` (bỏ qua lỗi), cách nút báo sang trình duyệt, test**. Sau đó viết spec + kế hoạch.
3. Chụp ảnh linh kiện (điện trở, LED RGB) → xác định giá trị / loại.
4. Sửa nhỏ: `EmotionScanner` bỏ qua khi chưa có stream; kiểm tra lỗi ghi `suggested` 2 lần.
5. Tự khởi động 3 server khi Pi bật (systemd) — tiện cho demo.
6. Sau báo cáo: camera Pi, Mood Journey chart, voice control, trang Settings, style player, dựng laptop dự phòng.

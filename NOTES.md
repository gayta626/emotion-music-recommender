# NOTES.md — EmoTune Project Session Log

> Tóm tắt phiên làm việc gần nhất (25–26/09/2026) để phiên mới tiếp tục ngay.
> Deadline dự án: **15/10/2026**. Báo cáo Pi cho thầy: **Thứ 2 (28/09)**.
> Vòng lặp cốt lõi đã chạy được và **đã test e2e trên PC** (26/09). Việc tiếp theo: **đưa lên Pi**.
> Máy dev là **PC** (mọi chỗ ghi "laptop" trong log cũ = PC). **Laptop chưa dựng** — sau này dùng làm máy demo/dự phòng: cần copy `music/`, `.env`, `npm install` 2 bên, venv + pip, `git lfs pull`, chạy schema + seed.
> Người dùng muốn **tự code**, Claude hướng dẫn từng nhiệm vụ nhỏ (gợi ý, không đưa code sẵn) trừ khi được nhờ làm trực tiếp.

---

## 1. Mục tiêu của phiên này
- Khép vòng lặp trên PC: camera → cảm xúc → gợi ý → **phát nhạc** → đo thời gian nghe → `/listen-report` → quét lại.

## 2. Những việc đã làm xong
### Backend `emotune-backend/`
| File | Nội dung |
|---|---|
| `db/schema.sql` | 4 bảng. `songs.file_path` giờ **UNIQUE**. ⚠️ Có `DROP TABLE` ở đầu. |
| `db/seed.sql` | **10 bài thật** (2 bài × 5 cảm xúc), `ON CONFLICT (file_path) DO NOTHING` nên chạy lại không nhân đôi. |
| `scripts/rename-music.js` (mới) + `npm run rename-music [-- --apply]` | Đổi tên mp3 trong `music/` sang dạng `noi_nay_co_anh.mp3`. Mặc định chạy thử, `--apply` mới đổi thật. |
| `src/server.js` | `app.use("/music", express.static(...music))`. |
| `music/` | 10 mp3 đã đổi tên (**không có trong git**, `music/.gitignore`). |
| `src/services/suggestService.js` | `generateSuggestion` trả thêm `emotion: targetEmotion`. |
| `src/model/suggestModel.js` | `getMoodTrend` chỉ đếm `action = 'suggested'` (trước đó đếm cả good/bad nên lệch). |

Phân loại nhạc: happy = co_chac_yeu_la_day, muon_roi_ma_sao_con · sad = gia_nhu, kho_giu_chan_thanh · angry = meditation, reduce_stress (nhạc thư giãn) · surprise = blank_space, cilu · neutral = giac_mo_co_that, neu_nhu_ta_chang_con_feat_a_ap_uot_mi.

### Frontend `emotune-frontend/src/`
| File | Nội dung |
|---|---|
| `config.js` (mới) | `API_URL = "http://localhost:8080"`. Lên Pi chỉ sửa 1 chỗ này. |
| `components/EmotionScanner.jsx` | Dùng `API_URL`. Cờ `cancelled` trong cleanup để camera trả về trễ (StrictMode) vẫn bị tắt. |
| `components/MusicPlayer.jsx` (mới) | Props `{data, onFinish}`. `<audio autoPlay controls>`, nút **⏭ Bài tiếp**. `finishAndSend`: **số giây thực nghe** = tổng `audio.played` (tua không tính), `finishPercent = min(listened/duration, 1)` (NaN → 0), gửi `/listen-report`, `.finally(onFinish)`. `reportedRef` chống gửi trùng. `onError` (thiếu file) → bỏ qua, không chấm điểm. |
| `pages/HomePage.jsx` | Nút **▶ Bắt đầu** (Chrome chặn autoplay khi chưa có thao tác). `{!suggestResult && <EmotionScanner/>}`: đang phát thì gỡ scanner (cleanup tắt camera). `setSuggestResult(prev => prev ?? data)` bỏ kết quả về trễ. Không thấy mặt → hiện `notice`, không crash. `playNextSong` → `setSuggestResult(null)`. |

## 3. Các quyết định quan trọng và lý do
| Quyết định | Lý do |
|---|---|
| `finishPercent` tính theo **giây thực nghe** (`audio.played`), không phải `currentTime` | Ý của người dùng: tua tới cuối không được tính là nghe hết (good). |
| Không chia thư mục con trong `music/` | Cảm xúc lấy từ cột `songs.emotion`, file chỉ cần khớp `file_path`. |
| Tự động hoàn toàn: có bài → gỡ scanner; hết bài/Next → report → quét lại | Hợp với Pi không có người bấm, không ghi rác `suggested` mỗi 3 giây. |
| `/listen-report` gửi `targetEmotion` | `preferences` được tra theo targetEmotion. |
| Chỉ Play/Pause (controls) + Next, không có nút 👎 | Next sớm (<40%) đã là `bad`. |

## 4. Các lệnh đã chạy / cách chạy lại
Đã chạy trong phiên:
```bash
cd emotune-backend && npm run rename-music -- --apply     # đổi tên 10 mp3
# DBeaver: schema.sql + seed.sql (bản 10 bài thật)
cd emotune-frontend && npx eslint src && npx vite build    # kiểm tra frontend: pass (1 warning)
git commit 1daf1bc "Add music player loop ..."             # đã push
# 26/09: chạy lại schema + seed (DBeaver Alt+X) -> 10 bài, có UNIQUE file_path
# Test e2e trên PC: mood_history ra suggested / good / bad đúng, mỗi bài chỉ 1 dòng suggested
```
Chạy lại dự án:
```bash
# DB (DBeaver: mở file -> Alt+X): db/schema.sql rồi db/seed.sql
# Backend (.env: PORT=8080, DB_HOST=localhost, DB_PORT=5432, DB_USER=postgres, DB_NAME=postgres)
cd emotune-backend && npm run dev
# Flask AI (:5000)
cd emotion-scanner && venv\Scripts\activate && python 3_backend_server.py
# Frontend (:5173)
cd emotune-frontend && npm run dev
```
Test: bấm Bắt đầu → nhìn camera → nhạc phát, đèn webcam tắt → Next sớm → `bad` trong `mood_history`.
Console `document.querySelector("audio").playbackRate = 16` để nghe nhanh hết bài → `good`.

## 5. Lỗi đang gặp / việc còn dở
- Camera chỉ bật **sau khi bấm ▶ Bắt đầu**; video ẩn nên dấu hiệu là đèn webcam + chữ "Đang quét cảm xúc". Không quét được → F12 Console xem `Loi :` (NotAllowed / NotReadable = app khác giữ camera).
- ESLint warning: `EmotionScanner` useEffect thiếu dependency `onResult` (vô hại).
- Chưa có style/giao diện đẹp cho player; `Setting.jsx` vẫn placeholder.

## 6. Bước tiếp theo
0. ✅ Trên PC: chạy lại DB (schema + seed), test trình duyệt (ra đủ suggested / good / bad) — xong 26/09.

### ✅ Pi — vòng lặp đã chạy (26/09 tối)
Pi 5, user `vinh`, hostname `raspberrypi`, IP 192.168.1.191. DB tên **`emotune`** (khác PC).
- Bước 1–6 xong: git pull + `git lfs pull` (phải `sudo apt install git-lfs` trước), schema+seed (10 bài), scp `music/` từ PC, venv Flask, backend, frontend, **độ trễ AI < 3s** (log `/predict` đều mỗi 3s).
- Camera: webcam **Logitech C270** (`/dev/video0`). Camera Pi (CSI) chưa nhận (`v4l2-ctl` không thấy) — Chromium cũng khó dùng CSI, để sau.
- Âm thanh: **loa Bluetooth** (Pi 5 không có jack 3.5mm).
- Màn hình: **VNC** (wayvnc bật bằng `raspi-config nonint do_vnc 0`, auto-login desktop `do_boot_behaviour B4`); PC dùng RealVNC Viewer → 192.168.1.191. Chromium trên Pi mở `localhost:5173` (Chrome chặn camera nếu mở `http://192.168.1.191` từ máy khác).
- SSH từ PC: dùng **Git Bash** (`ssh vinh@192.168.1.191`); ssh của cmd Windows bị "Connection closed".

Chạy lại trên Pi (3 cửa sổ SSH):
```bash
cd ~/emotion-music-recommender/emotion-scanner && source venv/bin/activate && python 3_backend_server.py
cd ~/emotion-music-recommender/emotune-backend && npm start
cd ~/emotion-music-recommender/emotune-frontend && npm run dev
sudo -u postgres psql -d emotune -c "select id, emotion, action from mood_history order by id"   # kiểm tra
```

### Tiếp theo
1. Kiểm tra `mood_history` trên Pi có `bad`/`good` sau khi Next / nghe hết.
2. `EmotionScanner`: vẫn gửi ảnh mỗi 3s khi camera chưa mở (ảnh đen → "không phát hiện khuôn mặt") → nên bỏ qua khi chưa có stream.
3. Nếu còn thời gian: GPIO (`gpiozero`), tự khởi động 3 server khi Pi bật.
4. Sau báo cáo: camera Pi, Mood Journey chart, voice control, trang Settings, style player. Dựng laptop làm máy dự phòng.

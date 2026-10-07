# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EmoTune: "hộp nhạc cảm xúc" — webcam chụp mặt → AI nhận diện cảm xúc → backend chọn bài hát hợp cảm xúc → web phát nhạc và chấm điểm theo mức nghe hết bài. Chạy trên Raspberry Pi (OLED + 2 nút chạm TTP223 + cảm biến có người) hoặc trên PC. `NOTES.md` là nhật ký phiên làm việc (trạng thái phần cứng, sơ đồ chân, việc còn dở); đọc nó trước khi đụng tới phần cứng.

### Một codebase, hai môn học

| Môn | Yêu cầu | Hệ quả khi code |
|---|---|---|
| **HIC** (deadline 15/10/2026) | Có phần cứng (Pi, OLED, nút chạm, cảm biến) | Dùng `gpio-service/`. Model AI: **thử Edge Impulse** để so với ViT. |
| **Xây dựng hệ thống thông minh** | Hệ thống có **> 2 module** và thể hiện được "sự thông minh"; **không cần phần cứng** | Phần mềm lõi (AI, backend, gợi ý, frontend) phải chạy **độc lập, không cần `gpio-service`**. Cần cải thiện model AI nghiêm túc (xem bên dưới). |

Vì vậy: đừng làm lõi phụ thuộc phần cứng (mọi lời gọi `gpio-service` đã `.catch(() => {})`, giữ như vậy). Các module "thông minh" của môn hệ thống thông minh: (1) nhận diện cảm xúc, (2) gợi ý nhạc (xu hướng cảm xúc 1–3 ngày + điểm sở thích học từ phản hồi nghe, và thiết kế "gợi ý theo gu" 65/35 chưa code), (3) giao diện/phản hồi người dùng.

## Model AI: kế hoạch build lại (đề xuất, chưa chốt)

Hiện trạng: ViT fine-tune từ FER2013, 10 người / 1.934 ảnh; chỉ **72.5%** trên người lạ, lớp `angry` chỉ 26% (bị đoán thành neutral), overfit mạnh (train loss 0.004), `load_best_model_at_end` không nạp bản tốt nhất, `dat` thiếu `surprise`. Số 92.5% cũ là ảo (chia theo ảnh).

- **HIC — Edge Impulse (thí nghiệm):** MobileNetV2 trên ảnh đã cắt mặt, để 2 người ở tập Testing như `VAL_PEOPLE`, so với 72.5% của ViT trên **cùng 2 người**. Chạy thẳng trên Pi. Không thay model chính khi chưa so xong. Xin phép từng người trước khi upload ảnh mặt lên cloud.
- **Hệ thống thông minh — cải thiện model:**
  1. *Dữ liệu*: thêm người (≥ 30) và trộn thêm bộ công khai (RAF-DB/AffectNet/FER+); soi lại nhãn `angry`; cân bằng lớp; mọi người đủ 5 cảm xúc.
  2. *Huấn luyện*: giữ chia theo người, thêm `GroupKFold` theo người; tăng augmentation (xoay, sáng, che mặt một phần), label smoothing, ít epoch + early stopping; sửa `metric_for_best_model` để thật sự nạp checkpoint tốt nhất; có thể đóng băng các lớp đầu.
  3. *Đánh giá*: báo **macro-F1 + confusion matrix theo từng người lạ**, không chỉ accuracy; ghi vào `AI_NOTES.md` (đang cũ).
  4. *Suy luận (thể hiện thông minh)*: gộp xác suất qua N khung hình liên tiếp thay vì 1 ảnh, ngưỡng tin cậy → trả "chưa chắc" thay vì đoán bừa, test-time augmentation (lật ngang).
  5. *Tuỳ chọn*: thêm kênh thứ hai (giọng nói qua mic hoặc văn bản) rồi hợp nhất — chỉ khi còn thời gian.

## Cách làm việc với người dùng (quan trọng)

**Từ 07/10/2026: "vibe coding" — Claude tự viết toàn bộ code** (React, SCSS, route/controller/service/model, SQL, script). Người dùng đã xác nhận trực tiếp trong chat ngày 07/10 ("bạn viết code hết cho mình"). Quy tắc cũ "người dùng tự code, Claude chỉ hướng dẫn" (03–06/10) **đã bỏ**.

- Làm **từng bước/từng task**, xong mỗi bước báo ngắn gọn bằng tiếng Việt: đã làm gì, file nào, cách kiểm tra (lint/build, curl, trình duyệt). Người dùng là sinh viên cần bảo vệ đồ án → giải thích ngắn *vì sao* làm vậy khi có quyết định thiết kế.
- Tự kiểm tra trước khi báo xong: `npx eslint src` + `npm run build` (frontend), curl (backend), Playwright khi đổi giao diện (không có camera thì chặn `/scan-and-suggest` → `/suggest` với cảm xúc cố định).
- Giao diện bám Figma `lycGTr71v02BpzYgjmZZS3`; Figma MCP có giới hạn lượt gọi → xin **link frame** cụ thể, mỗi frame gọi `get_design_context` 1 lần.
- **`TIEN_DO.md` (gốc repo) là bảng tiến độ**: xong một phần (đã kiểm tra chạy đúng) thì đánh dấu ✅ + ngày, chuyển 🔄 sang việc tiếp theo, cập nhật "📍 Đang ở đâu", bảng tổng quan và "Nhật ký hoàn thành". Việc mới phát sinh thì thêm dòng vào đúng giai đoạn.
- **Không commit/push** khi người dùng chưa yêu cầu. `.env` và `.claude/settings.json` không đưa vào git.
- Vẫn giữ "cần đến đâu viết đến đó": chỉ thêm hàm/file khi bước hiện tại thật sự dùng tới.

## Kiến trúc: 4 service chạy riêng, nối bằng HTTP

```
Trình duyệt (React :5173) ──► emotune-backend (Node/Express :8080) ──► emotion-scanner (Flask :5000, model ViT)
        │                              │
        │                              └─► PostgreSQL
        └──────────────► gpio-service (Flask :5001, chỉ chạy trên Pi: OLED + nút + PIR)
```

- **emotion-scanner/** (Python): `3_backend_server.py` là Flask `POST /predict` (nhận ảnh base64 → cắt mặt bằng OpenCV → model HuggingFace ở `my_emotion_model/`, lưu bằng Git LFS). `1_capture_data.py` thu ảnh, `2_finetune_model.py` train, `analyze_confusion.py` đánh giá. Train/val **chia theo người** (tên người lấy từ tên file `<ten>_<camxuc>_<timestamp>.jpg`), không chia theo ảnh, nếu không số liệu bị ảo. Năm nhãn: neutral, happy, sad, angry, surprise. Dùng `PYTHONUTF8=1` trên Windows.
- **emotune-backend/** (Node, Express 5, `pg`): theo mẫu `routes/web.js → controllers → services → model` (model là nơi duy nhất chứa SQL, dùng `config/db.js`). Luồng chính `POST /scan-and-suggest`: `scanController` → `emotionService` (gọi Flask) → `suggestService.generateSuggestion` (xét xu hướng cảm xúc 1–3 ngày, chọn bài, bài "động viên" khi buồn/giận kéo dài) → trả `{song, message, isEncourage}`. `GET /artists` (bảng `artists`: `id, name, avatar`) cấp danh sách nghệ sĩ cho sidebar, ảnh ở `emotune-backend/avatars/` phục vụ qua `/avatars/<file>`. `GET /songs` (cả kho nhạc), `GET /songs/for-you` (cần đăng nhập; điểm nghe thật + thưởng khảo sát, hàm thuần `songService.rankForYou`); kết quả gợi ý có `detectedEmotion` (cảm xúc thật, `emotion` có thể đã đổi sang happy để động viên); playlist: `GET/POST /playlists`, `GET/PATCH/DELETE /playlists/:id`, `POST /playlists/:id/songs`, `DELETE /playlists/:id/songs/:songId`. Gợi ý cộng điểm thưởng khảo sát (`TASTE_BONUS` trong `suggestModel`); quyết định "bài động viên" là hàm thuần `suggestService.decideTarget` (buồn + giận > 50%, ≥ 4 lần quét). `POST /listen-report` cập nhật điểm sở thích (bảng `preferences`) và `recently_played` để tránh lặp 3 bài gần nhất. `/music/<file>` phục vụ mp3 từ `emotune-backend/music/`. Toàn bộ bảng + dữ liệu mẫu nằm trong **một file `db/setup.sql`**; cấu hình DB qua `.env` (xem `.evn.example`; `config/db.js` mặc định cổng 5433 nên `.env` phải ghi `DB_PORT`). 10 bảng: `artists`, `genres`, `songs` (khoá ngoại `artist_id` → `artists`, `genre_id` → `genres`; không còn cột chữ `artist`, query trả tên ca sĩ bằng `LEFT JOIN artists a ... a.name AS artist`), `preferences`, `mood_history`, `recently_played`, `survey_artists`, `survey_genres` (5 bảng này có `user_id` → **mọi câu SQL đụng tới phải lọc/ghi `user_id`**), `users` (username + `password_hash` bcrypt, `survey_done_at` NULL = chưa làm khảo sát gu; tài khoản demo `demo`/`demo1234`), `devices` (dòng `'box'`, `current_user_id` = ai đang giữ hộp nhạc). Đăng nhập bằng JWT (`JWT_SECRET` trong `.env`); đang chuyển sang nhiều tài khoản theo plan `docs/superpowers/plans/2026-10-04-multi-user-accounts.md`. Spec "gợi ý theo gu" cũ ghi `songs.genre TEXT` — nay thể loại là bảng `genres`.
- **emotune-frontend/** (React 19 + Vite + **SCSS**, svgr, react-router 6; không dùng Tailwind): `MainLayout` (CSS grid: Header / SideBar / `<main>`) bọc các trang trong `pages/`; `/login`, `/register` nằm ngoài layout; `/survey` (khảo sát gu, người chưa làm bị `MainLayout` chuyển tới) cần đăng nhập nhưng không có layout; còn lại bọc `RequireAuth` + `AuthProvider` (`useAuth()`). **`MainLayout` luôn vẽ `<PlayerHost/>`** (giữ trạng thái phát, thanh phát dưới; khung phát lớn chỉ ở `/now-playing`) nên đổi trang nhạc không tắt. Routes: `/` = `HomeRoute` (phiên chưa quét → `ScanPage` màn chào + quét; đã quét → `BrowsePage` trang chủ duyệt nhạc theo Figma `58:112`), `/scan` (icon record-circle `MoodButton` trên header), `/now-playing`, `/playlist/:id`, `/stats` (`MoodPage`; `/mood` chuyển hướng), `/settings`. "Phiên đã quét" + cảm xúc gần nhất: `utils/moodSession.js` (`sessionStorage`). Hết bài ở chế độ cảm xúc: đang ở `/scan` hoặc **rảnh ≥ 60s** (`hooks/useIdle`) → `/scan` quét lại; đang lướt → `POST /suggest {emotion: cảm xúc gần nhất, auto: true}` (không bật camera, không ghi lịch sử). `ScanPage` quét (`EmotionScanner`) → có kết quả thì `playScanResult` + chuyển `/now-playing`; `PlayerHost` phát (`MusicPlayer`). `MusicPlayer` theo Figma frame `92:301` ("screen play nhạc"): khung gradient lớn đổi màu theo **vibe của bài** (`songs.emotion` → `data-vibe`; neutral = hồng mận gốc của Figma), giữa khung là **sóng âm** `AudioVisualizer` (Web Audio `AnalyserNode` nối vào `<audio crossOrigin="anonymous">`, tự cân độ lớn, nhịp bass làm cả sóng + vòng sáng "đập"; mỗi `<audio>` chỉ nối Web Audio 1 lần → cache bằng `WeakMap` vì StrictMode chạy effect 2 lần), chỉ hiện tên bài + lời gợi ý (không còn huy hiệu cảm xúc), ảnh ca sĩ (`song.artist_avatar`, thiếu thì ô gradient + ♪) chỉ ở thanh phát cố định dưới cùng (shuffle/prev/repeat/mic/queue đang `disabled`). Hai chế độ phát trong `HomePage`: **emotion** (quét/chọn cảm xúc → AI chọn 1 bài, chấm điểm `/listen-report`) và **playlist** (SideBar tab Playlists → `PlaybackProvider.playPlaylist(id)` → phát lần lượt, không quét, **không chấm điểm**; hết playlist về emotion). Menu nút ☰ (Add to playlist / Request a song / View playlist), cột hàng đợi, thẻ "Up next" (15s cuối, kiểu YouTube) ở `components/PlayerOverlays.jsx`; nút 👎 gọi `/feed-back`. `PlaybackProvider` (`usePlayback`): `playScanResult(result)`, `playPlaylist(id, start)`, `playQueue({name, songs}, start)` (bài của 1 ca sĩ), `playSong(song)`, `registerPlayer` (PlayerHost nhận lệnh trực tiếp), `lastMood`/`setLastMood`, `nowPlaying`, `refreshPlaylists`. Tìm không dấu: `src/utils/text.js` (`plain`). Ảnh ca sĩ/chữ viết tắt: `components/ArtistAvatar`. URL các service ở `src/config.js` (`API_URL`, `GPIO_URL`). Màu/token ở `:root` trong `src/index.css`. Giao diện theo Figma file `lycGTr71v02BpzYgjmZZS3` (node `58:14`).
- **gpio-service/** (Python, gpiozero + `oled.py` tự viết driver SSD1306): trình duyệt gọi thẳng `localhost:5001`, backend Node không biết service này. `POST /led {state}` vẽ chữ lên OLED (tên `/led` giữ từ bản dùng đèn LED); `GET /buttons` trả bộ đếm `{next, pause, present}` — web hỏi mỗi 300ms (`src/hardware.js`, `useHardwareButtons`). Việc đếm 30s "vắng người" nằm trong service, web chỉ đọc `present`. Service chết thì nhạc vẫn chạy (mọi lời gọi `.catch(() => {})`).

Spec/plan thiết kế nằm ở `docs/superpowers/` (đáng chú ý: gợi ý theo "gu" 65/35 — **đã thiết kế, chưa code**).

## Lệnh thường dùng

```bash
# AI (trong emotion-scanner/): python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt
# (requirements.txt khoá opencv-python 4.x: OpenCV 5 đã bỏ cv2.CascadeClassifier dùng để cắt mặt)
# Model nằm trong Git LFS: máy mới cần `git lfs pull` để có my_emotion_model/model.safetensors
python 3_backend_server.py                       # :5000
PYTHONUTF8=1 python 2_finetune_model.py          # ~4h CPU
PYTHONUTF8=1 python analyze_confusion.py

# Backend (trong emotune-backend/)
npm run dev                                      # nodemon, :8080 (PORT trong .env; mặc định code là 8081)
npm run db:setup                                 # XOÁ và tạo lại toàn bộ DB từ db/setup.sql (bảng + dữ liệu mẫu)
npm run rename-music -- --apply                  # chuẩn hoá tên file mp3 cho khớp cột file_path trong setup.sql

# Frontend (trong emotune-frontend/)
npm run dev                                      # :5173
npm run build
npm run lint

# GPIO (trong gpio-service/)
python3 gpio_service.py                          # :5001, trên Pi
GPIOZERO_PIN_FACTORY=mock python gpio_service.py # chạy thử trên PC, không cần phần cứng
python test_presence.py                          # test tự động logic có người/vắng (mock pin), in "ALL OK"
python3 test_hardware.py                         # thử nút + PIR trên Pi thật
```

Database: máy mới chạy `npm run db:setup` một lần; DB cũ thiếu bảng playlist thì chạy `npm run db:migrate -- db/migrate_playlists.sql` (an toàn chạy lại) (cần PostgreSQL + `.env`). File này **xoá sạch** điểm và lịch sử, nên khi DB đã có dữ liệu thật thì **không chạy lại**; thay đổi schema sau này viết thành file `db/migrate_xxx.sql` riêng (dùng `ALTER TABLE ... IF NOT EXISTS`) và cập nhật luôn `setup.sql` cho lần cài mới. Backend có unit test bằng `node:test` (`npm test` chạy `emotune-backend/test/**/*.test.js`, chỉ cho hàm thuần); frontend chưa có test; `eslint` hiện **sạch** — giữ như vậy. Backend test: `authValidation`, `moodTrend` (`decideTarget`), `forYou` (`rankForYou`).

## Lưu ý

- Bốn service phải chạy cùng lúc mới có vòng lặp đầy đủ; trên Pi, Chromium cần cờ `--autoplay-policy=no-user-gesture-required` để nút chạm bắt đầu được nhạc.
- Trên Pi, code từng được chép bằng `scp` (không qua git) → trước khi `git pull` trên Pi xem mục 5 của `NOTES.md`.
- Model trong `my_emotion_model/` là model cũ (đang dùng để demo); model mới train lại không nằm trong git.
- Bình luận trong code và ghi chú dự án viết bằng tiếng Việt; người dùng là sinh viên, thích hướng dẫn từng bước rõ ràng.

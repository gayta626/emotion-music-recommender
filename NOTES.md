# NOTES.md — EmoTune Project Session Log

> File này tóm tắt phiên làm việc gần nhất, để một phiên mới (không nhớ gì) có thể tiếp tục ngay.
> Deadline dự án: **15/10/2026**. Deadline báo cáo Pi cho thầy: **Thứ 2 tuần này**.

---

## 1. Mục tiêu của phiên này

- Hoàn thiện backend Node.js (3-layer: Route → Controller → Service → Model) cho các API: `mood-history`, `feedback` (redesign), `suggest`, `listen-report` (mới), `request-song` (mới).
- Redesign lại cơ chế feedback theo góp ý của thầy: thay vì chấm điểm ngay lúc gợi ý (accept/decline), chuyển sang chấm điểm **sau khi nghe xong bài hát** dựa trên % thời gian đã nghe (`finishPercent`).
- Triển khai backend + PostgreSQL lên Raspberry Pi 5, kiểm tra kết nối từ xa qua Postman.
- Bắt đầu phần frontend (React + Vite): EmotionScanner (camera → gửi ảnh mỗi 3s → gọi API), HomePage hiển thị kết quả gợi ý.
- (Chưa hoàn thành trong phiên) Viết file NOTES.md này.

---

## 2. Những việc đã làm xong

### Backend `emotune-backend/`
- `src/config/db.js` — Postgres pool (`pg`), export `{query, pool}`.
- `schema.sql` — bảng `songs`, `preferences` (UNIQUE emotion+song_id, `score REAL`), `mood_history` (`action` CHECK IN `suggested/declined/good/neutral/bad`), `recently_played`.
- `.env` / `.env.example` — `PORT, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD`.
- `src/server.js` — entry point (dotenv, express, cors, express.json, `initWebRoutes(app)`).
- `src/routes/web.js` — route trung tâm, đã fix nhiều lỗi (thiếu `/`, callback sai, thiếu `module.exports`).
- `src/model/moodHistoryModel.js`, `services/moodHistoryService.js`, `controllers/moodHistoryController.js` — `GET /mood-history`.
- `src/model/feedBackModel.js` — `updateFeedBack(emotion, songId, delta, historyAction)`: transaction upsert preferences + insert mood_history + (điều kiện) insert recently_played. Được **tái sử dụng** bởi cả `feedBackService` và `requestSongService` (DRY).
- `src/services/feedBackService.js`, `controllers/feedBackController.js` — `/feedback` giờ chỉ xử lý **decline** (delta=-1, action="declined"). Đã fix bug De Morgan (`||` → `&&`).
- `src/model/suggestModel.js` — 4 hàm: `getMoodTrend(days)`, `getSongsByEmotion(emotion)` (có fallback query), `getSongById(id)`, `logSuggestion(...)`.
- `src/services/suggestService.js` — `checkMoodTrend(emotion)` (mood trend + cửa sổ thích ứng 1 ngày/3 ngày) và `generateSuggestion(emotion, confidence)` (explore/exploit 80/20).
- `src/controllers/suggestController.js` — validate emotion, trả 200/404/500.
- **MỚI:** `src/model/listenReportModel.js`, `services/listenReportService.js`, `controllers/listenReportController.js` — `POST /listen-report` nhận `{emotion, songId, finishPercent}`:
  - `finishPercent >= 0.8` → `"good"`, delta = +1
  - `0.4 <= finishPercent < 0.8` → `"neutral"`, delta = +0.3
  - `finishPercent < 0.4` → `"bad"`, delta = -1
- **MỚI:** `src/model/requestSongModel.js` (`getRequestSong(songName)` — `ILIKE '%'||$1||'%'`), `services/requestSongService.js` (`processRequestSong`), `controllers/requestSongController.js` — `POST /request-song`.
- `src/services/emotionService.js` — gọi Flask: `axios.post("http://localhost:5000/predict", {image})`.
- `src/controllers/scanController.js` — `scanAndSuggest`: fix quan trọng — check `emotionResult.error === "no_face_detected"` **trước** khi gọi `generateSuggestion` (tránh lỗi NOT NULL trên `mood_history.emotion`).
- `src/messages.js` — thêm `getRequestSongMessage(songTitle)` (5 mẫu câu xác nhận tìm bài).

### Database
- Đã sửa `preferences.score` từ `INTEGER` → `REAL` (chứa được delta 0.3/0.5).
- Đã update lại CHECK constraint của `mood_history.action` (5 giá trị mới), phải `TRUNCATE` 3 bảng (`mood_history`, `preferences`, `recently_played`) trước vì có data cũ vi phạm constraint mới.
- Đã bỏ tính năng `auto_play` (quyết định của user).

### Frontend `emotune-frontend/`
- `src/App.jsx` — bọc `<AIAssistantProvider>` quanh Router.
- `src/contexts/AIAssistantContext.jsx` — Context API: `{status, setStatus, result, setResult}` (status: idle/listening/thinking/speaking).
- `src/layouts/MainLayout.jsx`, `components/Header.jsx`, `SideBar.jsx`, `Footer.jsx` — theo Figma "NYX Night Music Society".
- `src/components/EmotionScanner.jsx` — mở webcam, chụp canvas 224x224 mỗi 3 giây, gửi `POST http://localhost:8080/scan-and-suggest`, cleanup đúng cách (clearInterval + stop tracks).
- `src/pages/HomePage.jsx` — hiển thị `suggestResult.song.title`, `.message`, `.isEncouragement`.
- `src/pages/Setting.jsx` — chỉ là placeholder, chưa code.
- `test_webcam.html` (repo `emotion-scanner/`) — đã sửa `API_URL` từ Flask (`:5000/predict`) sang Node (`:8080/scan-and-suggest`), interval 1000ms → 3000ms.

### Raspberry Pi 5 — deploy backend
- SSH vào Pi thành công (Node.js, Python3, PostgreSQL đã cài qua NodeSource + apt).
- `git clone` repo (chú ý: repo tên `emotion-music-recommender/`, không phải `emotune-backend/` trực tiếp — phải `cd emotion-music-recommender/emotune-backend`).
- `npm install` chạy OK trên Pi.
- Viết lại `schema.sql` trực tiếp trên Pi bằng `nano` (bản 5-action, `score REAL`) — **chưa commit vào git**.
- Test thành công: từ máy khác trong LAN, Postman gọi `GET http://192.168.1.191:8080/mood-history` → **200 OK**.

---

## 3. Các quyết định quan trọng và lý do

| Quyết định | Lý do |
|---|---|
| Node.js **chủ động gọi** Flask (không phải ngược lại) | Đúng với mô tả đề tài: "Flask không public ra ngoài, chỉ Node.js gọi nội bộ". |
| Redesign feedback: chấm điểm **sau khi nghe** (`/listen-report`) thay vì lúc accept/decline | Góp ý của thầy — phản ánh hành vi thật của người dùng (nghe hết bài mới là tín hiệu tốt, bỏ giữa bài là tín hiệu xấu) chính xác hơn accept/decline đơn thuần. |
| Ngưỡng finishPercent: ≥80% good, 40-79% neutral, <40% bad | Do user tự đề xuất, thấy hợp lý về mặt UX (nghe > 80% gần như chắc chắn thích bài). |
| Bỏ tính năng `auto_play` | User quyết định giảm phạm vi, tập trung việc cốt lõi trước deadline. |
| Tách `/request-song` thành API riêng (không gộp vào `/feedback`) | Input/schema khác nhau (song name text vs songId/action), nhưng **tái sử dụng** `feedbackModel.updateFeedBack` để tránh lặp code transaction. |
| Cửa sổ mood trend thích ứng (1 ngày nếu dùng nhiều, 3 ngày nếu dùng ít) | Ý tưởng của user: người dùng ít tương tác cần nhìn xa hơn để có đủ dữ liệu đánh giá xu hướng. |
| Sửa bug `isEncouragement` (thêm check `NEGATIVE_EMOTIONS` với emotion hiện tại) | User tự phát hiện: code cũ chỉ nhìn lịch sử buồn mà không so với cảm xúc hiện tại → luôn trả `true` sai. |
| Context API (built-in React) thay vì Redux cho AI Assistant state | Phạm vi nhỏ (chỉ 1 status global), không cần thêm dependency ngoài. |
| Voice command: xử lý chủ yếu ở **frontend** (Web Speech API), chỉ gọi backend cho `request_song` | Các lệnh play/pause/volume/next không cần dữ liệu server, xử lý trực tiếp ở client nhanh hơn và giảm tải backend. |
| Giám sát "interrupted_disliked/interrupted_kept" | **Đã hoãn** — ngoài phạm vi hiện tại theo yêu cầu user. |

---

## 4. Các lệnh đã chạy và cách chạy lại dự án

### Chạy trên máy Windows (dev)
```bash
# Backend
cd emotune-backend
npm install
# tạo file .env theo .env.example (DB_HOST=localhost, DB_USER, DB_PASSWORD, DB_NAME, PORT=8080)
node src/server.js
# hoặc: npm start (nếu package.json có script "start": "node src/server.js")

# Flask AI service (thư mục emotion-scanner, hoặc tương đương)
cd emotion-scanner
python -m venv venv
venv\Scripts\activate
pip install flask flask-cors torch transformers pillow opencv-python
python 3_backend_server.py
# chạy tại http://localhost:5000, health check: GET /health

# Frontend
cd emotune-frontend
npm install
npm run dev
# mặc định http://localhost:5173
```

### Chạy trên Raspberry Pi 5 (192.168.1.191 — IP có thể đổi, check bằng `hostname -I`)
```bash
ssh <user>@192.168.1.191

cd emotion-music-recommender/emotune-backend
npm install          # đã chạy xong
# .env trên Pi cần: DB_HOST=localhost, DB_PORT=5432, DB_NAME=..., DB_USER=..., DB_PASSWORD=..., PORT=8080
node src/server.js   # hoặc npm start

# Database: đã tạo bằng nano schema.sql trên Pi rồi chạy:
psql -U <user> -d <dbname> -f schema.sql
```

### Postman test đã xác nhận OK
```
GET http://192.168.1.191:8080/mood-history
→ 200 OK
```

---

## 5. Lỗi đang gặp / việc còn dở

- ❗ **CHƯA XÁC NHẬN**: đã chạy `INSERT INTO songs (...)` seed data vào DB trên Pi hay chưa. Cần kiểm tra bằng `SELECT * FROM songs;`.
- ❗ **CHƯA KIỂM TRA**: thư mục `my_emotion_model/` có tồn tại trong `~/emotion-music-recommender/emotion-scanner/` trên Pi không (chạy `ls ~/emotion-music-recommender/emotion-scanner/`). Nếu **không có** → phải `scp` từ laptop Windows sang Pi (model file khá nặng, đã fine-tune ViT).
- ❗ **CHƯA LÀM**: setup Python venv trên Pi, `pip install -r requirements.txt` (hoặc cài thủ công: flask, flask-cors, torch, transformers, pillow, opencv-python), chạy `python 3_backend_server.py` trên Pi.
- ❗ **CHƯA LÀM**: đo tốc độ inference AI trên Pi so với laptop (rủi ro kỹ thuật lớn nhất đã xác định trước đó — ViT có thể chạy chậm trên Pi CPU).
- ❗ **CHƯA LÀM**: test GPIO (nút bấm + LED) độc lập bằng `gpiozero`.
- ❗ **CHƯA LÀM**: pair Bluetooth speaker (Sony SRS-XB100) qua `bluetoothctl`, test phát nhạc.
- ❗ **CHƯA LÀM**: demo end-to-end thật trên Pi — trỏ `test_webcam.html` (hoặc frontend React) vào `http://192.168.1.191:8080/scan-and-suggest` để test camera → AI → gợi ý nhạc trên phần cứng thật (**cần cho báo cáo thứ 2**).
- ❗ **schema.sql bản mới (5-action, REAL score)** hiện chỉ tồn tại trên Pi (viết bằng nano) — **chưa commit lên git**, cần đồng bộ lại vào repo Windows.
- Frontend còn thiếu: tích hợp voice thật (Web Speech API + Claude function calling), trang Settings, biểu đồ Mood Journey, hiệu ứng sound-wave trên icon AI ở Header.

---

## 6. Bước tiếp theo nên làm (ưu tiên cho báo cáo thứ 2)

1. SSH vào Pi, chạy `ls ~/emotion-music-recommender/emotion-scanner/` — kiểm tra `my_emotion_model/` có sẵn chưa.
   - Nếu thiếu → `scp -r my_emotion_model <user>@192.168.1.191:~/emotion-music-recommender/emotion-scanner/` từ laptop Windows.
2. Trên Pi: tạo venv, cài dependencies Python, chạy `3_backend_server.py`, kiểm tra `GET http://localhost:5000/health`.
3. Xác nhận song seed data đã có trong DB Pi (`SELECT * FROM songs;`), nếu chưa thì chạy lại script `INSERT INTO songs (...)`.
4. Test full flow trên Pi: mở `test_webcam.html` (sửa `API_URL` thành `http://192.168.1.191:8080/scan-and-suggest`) từ máy khác trong LAN, kiểm tra camera → nhận diện cảm xúc → gợi ý nhạc chạy được hết pipeline.
5. Đo thời gian phản hồi (từ lúc gửi ảnh đến khi có kết quả) để đánh giá độ trễ AI trên Pi — ghi số liệu lại cho báo cáo.
6. Nếu còn thời gian: test GPIO + Bluetooth speaker độc lập (không cần tích hợp full vào flow chính ngay).
7. Copy `schema.sql` bản mới nhất từ Pi về máy Windows, commit vào git để đồng bộ.
8. Sau báo cáo thứ 2: quay lại frontend — voice control thật, Settings page, Mood Journey chart.

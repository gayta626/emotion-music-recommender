# NOTES.md — EmoTune Project Session Log

> Tóm tắt phiên làm việc gần nhất (25/09/2026) để phiên mới tiếp tục ngay.
> Deadline dự án: **15/10/2026**. Báo cáo Pi cho thầy: **Thứ 2 tuần này**.
> Hiện **không có Pi bên cạnh**, nên làm mọi thứ trên laptop Windows trước.

---

## 1. Mục tiêu của phiên này
- Đọc lại tình trạng dự án (NOTES cũ + `graphify-out/GRAPH_REPORT.md`).
- Vì không có Pi: chuyển sang hoàn thiện **vòng lặp cốt lõi trên laptop**: camera → cảm xúc → gợi ý → **phát nhạc** → đo % nghe → `/listen-report`.
- Bước 1: đưa schema + seed database vào repo và dựng lại DB local.
- Bước 2: backend phục vụ file nhạc.
- Bước 3: thiết kế trình phát nhạc (đã chốt thiết kế, **chưa code**).

## 2. Những việc đã làm xong
| File | Nội dung |
|---|---|
| `emotune-backend/db/schema.sql` (mới) | 4 bảng `songs`, `preferences` (UNIQUE emotion+song_id, `score REAL`), `mood_history` (CHECK action: suggested/declined/good/neutral/bad), `recently_played`. Viết lại từ các câu SQL trong code. ⚠️ Có `DROP TABLE` ở đầu, chạy file sẽ xóa dữ liệu cũ. |
| `emotune-backend/db/seed.sql` (mới) | 15 bài mẫu (3 bài × 5 cảm xúc), `file_path` dạng `happy_01.mp3`. Tên bài là placeholder. |
| `emotune-backend/src/server.js` (sửa) | Thêm `app.use("/music", express.static(path.join(__dirname, "..", "music")))`. |
| `emotune-backend/music/.gitignore` (mới) | Bỏ qua mọi file mp3 (`*`, `!.gitignore`). |

- Người dùng đã chạy `schema.sql` + `seed.sql` bằng **DBeaver** (Alt+X = Execute Script) vào DB `postgres` local.
- Đã kiểm tra: `POST /suggest {"emotion":"happy","confidence":0.9}` → 200, trả bài "Happy Song 2". `GET /mood-history` → 200. Route `/music/<file>` phục vụ file đúng (file không có thì trả 404).
- Đã đối chiếu: nhãn model `id2label` = `angry, happy, neutral, sad, surprise`, khớp CHECK `songs.emotion` và `VALID_EMOTIONS`.
- **Chưa commit** các thay đổi trên.

## 3. Các quyết định quan trọng và lý do
| Quyết định | Lý do |
|---|---|
| Không có Pi thì làm vòng lặp đầy đủ trên laptop trước | Frontend chưa hề phát nhạc, nên `/listen-report` (góp ý của thầy) chưa bao giờ được gọi. |
| **Đơn giản hóa tối đa** (làm bản nhỏ nhất chạy được) | Deadline gần, phần Pi còn nhiều việc. Người dùng đồng ý. |
| Vòng quét **phương án A: tự động hoàn toàn** | Có bài thì dừng quét và tự phát; hết bài hoặc bấm Next thì report rồi quét lại. Hợp với Pi không có người bấm, và không ghi rác `suggested` mỗi 3 giây. |
| Chỉ có nút **Play/Pause + Next** (không có nút 👎) | Next gửi `/listen-report` với % thật; bỏ sớm (<40%) đã là `bad` −1, trùng với `/feed-back`. `/feed-back` vẫn giữ ở backend. |
| `/listen-report` gửi **targetEmotion** (cảm xúc dùng để chọn bài) | `getSongsByEmotion` tra `preferences` theo targetEmotion, nên điểm phải ghi đúng key đó mới ảnh hưởng lần gợi ý sau. |
| Dùng DBeaver thay pgAdmin | Người dùng quen DBeaver. `psql` chưa có trong PATH (`C:\Program Files\PostgreSQL\17\bin\psql.exe`). |

## 4. Lệnh đã chạy / cách chạy lại
```bash
# Database (DBeaver: mở file -> Alt+X). Hoặc PowerShell trong emotune-backend:
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d postgres -f db/schema.sql
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d postgres -f db/seed.sql

# Backend (.env: PORT=8080, DB_HOST=localhost, DB_PORT=5432, DB_USER=postgres, DB_NAME=postgres)
cd emotune-backend && npm run dev          # nodemon; hoặc npm start

# Flask AI
cd emotion-scanner && venv\Scripts\activate && python 3_backend_server.py   # :5000

# Frontend
cd emotune-frontend && npm run dev         # :5173

# Test nhanh
curl -X POST http://localhost:8080/suggest -H "Content-Type: application/json" -d '{"emotion":"happy","confidence":0.9}'
# mở http://localhost:8080/music/happy_01.mp3 để nghe thử
```

## 5. Lỗi đang gặp / việc còn dở
- ❗ **Bước 3 chưa code** (thiết kế ở mục 6).
- ❗ **Chưa có file mp3** trong `emotune-backend/music/`. Cần chép vào, tên khớp `file_path`. Có thể sửa title/artist thật trực tiếp trong DBeaver.
- `seed.sql` chạy 2 lần sẽ **nhân đôi bài** (`songs` chưa có UNIQUE). Nên thêm `UNIQUE (file_path)` + `ON CONFLICT (file_path) DO NOTHING`.
- `getMoodTrend` (`src/model/suggestModel.js`) đếm **mọi** action, không riêng `suggested`, nên tỉ lệ buồn bị lệch. Nên thêm `AND action = 'suggested'`.
- `/scan-and-suggest` hiện ghi `suggested` mỗi 3 giây. Bước 3 sẽ sửa bằng cách dừng quét khi đang phát.
- `HomePage.jsx` render `isEncourage` (kiểu boolean) trong `<span>`, không hiển thị gì.
- URL `http://localhost:8080` ghi cứng trong `EmotionScanner.jsx`, `test_webcam.html`.
- `mood_history` local có 1 dòng test (`suggested`, happy). Có thể `TRUNCATE mood_history;`.
- **Việc Pi còn nguyên** (từ phiên trước): schema trên Pi là bản gõ tay bằng nano, nên **thay bằng `db/schema.sql` + `seed.sql` của repo**. Model lưu bằng **Git LFS**, nên trên Pi cần `git lfs pull` (kiểm tra `ls -lh emotion-scanner/my_emotion_model/model.safetensors` khoảng 328MB). Còn: venv + Flask trên Pi, test toàn bộ luồng, đo độ trễ, GPIO, loa Bluetooth.

## 6. Bước tiếp theo nên làm
1. **Code Bước 3** theo thiết kế đã chốt:
   - `src/services/suggestService.js`: `generateSuggestion` trả thêm `emotion: trendResult.targetEmotion`.
   - `emotune-frontend/src/config.js` (mới): `export const API_URL = "http://localhost:8080";`. `EmotionScanner.jsx` dùng hằng số này.
   - `HomePage.jsx`:
     - State `started`: nút **"Bắt đầu"**, cần vì trình duyệt chặn autoplay khi chưa có thao tác. Trên Pi dùng Chromium `--autoplay-policy=no-user-gesture-required`.
     - State `current`: null thì render `<EmotionScanner>`, có bài thì render `<MusicPlayer>`. **Dừng quét = unmount EmotionScanner** (cleanup sẵn có tự tắt camera và interval).
     - `handleResult`: bỏ qua `data.error` hoặc không có `data.song`. `setCurrent(prev => prev ?? data)` để chỉ nhận kết quả đầu.
   - `components/MusicPlayer.jsx` (mới):
     - `<audio autoPlay src={API_URL/music/file_path}>`, hiển thị title/artist/message/dòng khích lệ, `<progress>`, Play/Pause, Next.
     - `report()` dùng chung cho `onEnded` và Next: `finishPercent = min(currentTime/duration, 1)`, gửi `POST /listen-report {emotion, songId, finishPercent}`, `finally` gọi `onFinished()`. Có cờ ref để mỗi bài chỉ report 1 lần.
     - `onError` (thiếu mp3): gọi `onFinished()`, **không** report.
   - Cố ý chưa làm: queue, tua bài, nút 👎, player ở Footer, âm lượng, `.env` frontend, style.
2. Kiểm tra toàn bộ luồng:
   - Bấm Bắt đầu → có bài → camera tắt, nhạc phát.
   - Next sớm → `mood_history` có dòng `bad`, `preferences.score = -1`.
   - Nghe hết bài → `good` +1.
   - Bài thiếu mp3 → tự chuyển bài.
3. Sửa 2 lỗi nhỏ ở mục 5 (UNIQUE `file_path`, `getMoodTrend` lọc `suggested`), rồi commit.
4. Chuẩn bị cho Pi: script `setup_pi.sh`, `benchmark.py` đo độ trễ (chạy trên laptop trước để có số liệu so sánh), code GPIO với `gpiozero` MockFactory.
5. Sau báo cáo: biểu đồ Mood Journey (`/mood-history`; lưu ý `day` trả về dạng UTC, VN = +7), voice control, trang Settings.

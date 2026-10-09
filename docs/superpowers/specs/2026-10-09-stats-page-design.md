# Trang thống kê mới `/stats` (thiết kế)

> Ngày: 09/10/2026 · Trạng thái: **chờ người dùng duyệt** · Thay cho trang `MoodPage` hiện tại (F16)
> Việc liên quan, làm SAU, spec riêng: **gợi ý theo người dùng tương tự** (lọc cộng tác — "người giống bạn cũng nghe…").

## 1. Mục tiêu

Trang thống kê **riêng từng người** (mọi số liệu lọc theo `user_id`), phục vụ 2 việc:
1. **"Bạn"** — người dùng tự hiểu mình: cảm xúc theo ngày / theo buổi, nghe gì, nghe bao nhiêu, nghe gì khi vui / buồn.
2. **"Hệ thống đã học được gì về bạn"** — thể hiện sự thông minh (bảo vệ môn *Xây dựng hệ thống thông minh*): gợi ý có trúng dần lên không, điểm sở thích hệ thống học được, AI nhận diện khuôn mặt chắc tới đâu.

Thêm **script dữ liệu mẫu** để lúc demo trang có đủ số liệu (dữ liệu thật hiện chỉ 3 ngày, vài chục lần quét).

Thành công khi: tài khoản mẫu `demo30` mở `/stats` thấy đủ 8 mục có số liệu hợp lý ở cả 7 và 30 ngày; tài khoản mới tinh thấy lời nhắc thay vì khung trống; không mục nào lộ dữ liệu người khác.

## 2. Quyết định đã chốt (và lý do)

| Quyết định | Lý do |
|---|---|
| Trang phục vụ **cả người dùng lẫn bảo vệ đồ án** (2 phần) | Người dùng chọn |
| **1 API tổng hợp** `GET /stats?days=7|30`; tính toán là hàm thuần có unit test (`statsService`), SQL ở `statsModel` | Có test, lọc `user_id` 1 chỗ, gửi ít dữ liệu, dễ chỉ ra khi bảo vệ |
| Phần "Bạn": tổng quan + 7/30 ngày, theo buổi, top bài & ca sĩ, nghe gì khi…; phần "Hệ thống": gợi ý trúng, điểm sở thích, độ tự tin AI | Người dùng chọn (bỏ "dòng thời gian chế độ động viên") |
| **Dữ liệu mẫu** bằng lệnh riêng `npm run seed-demo`, tài khoản riêng | Dữ liệu thật quá ít để demo; không đụng tài khoản thật |
| Không đổi cấu trúc DB | Mọi số liệu lấy được từ bảng có sẵn (`mood_history`, `recently_played`, `preferences`, `songs.duration`) |
| Chữ trên trang tiếng Anh | Giống phần còn lại của app |

## 3. Dữ liệu từng mục

Khoảng thời gian `days` ∈ {7, 30} (mặc định 7) áp cho mọi mục **trừ** "Điểm sở thích" (cộng dồn từ trước tới nay).
"Lần quét" = dòng `mood_history` có `action = 'suggested'` (camera, chọn tay hoặc nói cảm xúc; bài tự chọn khi đang lướt không ghi lịch sử nên không tính).
"Lượt nghe" = dòng `mood_history` có `action IN ('good','neutral','bad','declined')`.

| Mục | Nguồn | Nội dung |
|---|---|---|
| **Tổng quan** | `mood_history`, `recently_played` ⨝ `songs.duration` | số lần quét · cảm xúc nhiều nhất · số bài đã nghe (`recently_played`) · **≈ thời gian nghe** = tổng `songs.duration` của các bài đã nghe (ghi rõ "≈", vì có lượt nghe dở) · ô **Cheer-up mode** giữ như cũ (vẫn tính từ `GET /mood-history` + `cheerUpStatus`, không đổi) |
| **Cảm xúc theo ngày** | `mood_history` | đếm lần quét mỗi ngày × 5 cảm xúc (biểu đồ cột chồng hiện có, nay 7 hoặc 30 ngày; ngày không quét = 0) |
| **Cảm xúc theo buổi** | `mood_history.created_at` | lưới **thứ (T2…CN) × buổi**: sáng 05–11h, chiều 11–17h, tối 17–22h, đêm 22–05h; mỗi ô: số lần quét từng cảm xúc. Giờ theo giờ máy chủ DB (cùng máy, giờ Việt Nam) |
| **Top bài & ca sĩ** | `recently_played` ⨝ `songs` ⨝ `artists` | 5 bài nghe nhiều nhất (kèm dữ liệu bài để phát được) + 5 ca sĩ nghe nhiều nhất (`id`, tên, ảnh) |
| **Nghe gì khi…** | `mood_history` `action='good'` | mỗi cảm xúc: tối đa 3 bài được nghe hết (≥ 80%) nhiều nhất khi đang ở cảm xúc đó, kèm số lần |
| **Gợi ý trúng tới đâu** | `mood_history` lượt nghe | tổng + theo từng ngày: số `good` / `neutral` / `bad` / `declined`; **tỉ lệ nghe hết** = good / tổng lượt nghe |
| **Điểm sở thích** | `preferences` | tối đa 10 bài có tổng \|điểm\| lớn nhất × 5 cảm xúc, giá trị `score` (âm / dương); chú thích luật: nghe ≥ 80% +1, 40–80% +0.3, < 40% −1, "Not for me" −1 |
| **AI đoán mặt chắc tới đâu** | `mood_history.confidence` (chỉ dòng có `confidence`, tức quét camera) | mỗi cảm xúc: độ tự tin trung bình + số lần; không có lần nào → lời nhắc "No camera scans yet" |

### API `GET /stats?days=7|30` (cần đăng nhập)
`days` khác 7/30 → dùng 7. Trả:
```json
{
  "days": 7, "from": "2026-10-03", "to": "2026-10-09",
  "overview": { "scans": 18, "topEmotion": "sad", "plays": 12, "listenSeconds": 2950 },
  "daily": [{ "date": "2026-10-03", "counts": { "happy": 1, "sad": 2, "angry": 0, "surprise": 0, "neutral": 1 } }],
  "dayparts": [{ "weekday": 1, "part": "evening", "counts": { "...": 0 } }],
  "topSongs": [{ "song": { "id": 3, "title": "...", "artist": "...", "...": "..." }, "plays": 4 }],
  "topArtists": [{ "id": 7, "name": "...", "avatar": "...", "plays": 5 }],
  "moodSongs": { "sad": [{ "song": { "...": "..." }, "times": 3 }], "happy": [] },
  "hitRate": { "total": { "good": 8, "neutral": 2, "bad": 2, "declined": 1, "rate": 0.62 },
               "daily": [{ "date": "2026-10-03", "good": 1, "neutral": 0, "bad": 1, "declined": 0 }] },
  "preferences": [{ "song": { "...": "..." }, "scores": { "happy": 0, "sad": 2.3, "angry": 0, "surprise": 0, "neutral": -1 } }],
  "confidence": [{ "emotion": "happy", "avg": 0.86, "count": 9 }]
}
```
`topEmotion`: cảm xúc có nhiều lần quét nhất, hoà thì theo thứ tự happy, sad, angry, surprise, neutral; không có lần quét → `null`. `weekday`: 1 = Thứ Hai … 7 = Chủ Nhật; `part`: `morning` / `afternoon` / `evening` / `night`. Ngày/buổi không có dữ liệu vẫn có mặt với số 0 (frontend không phải tự lấp).
Lỗi: không đăng nhập → 401; lỗi DB → 500 `{err}`.

### Chia việc backend
- `src/model/statsModel.js` — các câu SQL (mọi câu `WHERE user_id = $1`), trả dòng thô.
- `src/services/statsService.js` — hàm thuần: `buildDaily(rows, days, today)`, `buildDayparts(rows)`, `daypartOf(hour)`, `buildHitRate(rows, days, today)`, `pickMoodSongs(rows)`, `pickPreferences(rows, limit)`, `summarize(...)` + hàm `getStats(userId, days)` ghép.
- `src/controllers/statsController.js`, route `router.get('/stats', requireAuth, ...)`.
- Test: `test/stats.test.js`.

## 4. Bố cục trang

Style NYX hiện có (nền tối, thẻ bo góc, màu 5 cảm xúc trong `src/index.css`, `MoodIcon`). Biểu đồ làm theo hướng dẫn dataviz (màu cảm xúc thống nhất, có "View as table", rê chuột xem số).

Màn 1440px (từ trên xuống):
1. Tiêu đề "Your stats" + nút chuyển **7 days / 30 days** (đổi → tải lại, giữ vị trí cuộn).
2. **Bạn**: 5 ô tổng quan → [Cảm xúc theo ngày | Cảm xúc theo buổi] → [Top bài | Top ca sĩ] → "What you play when…" (5 cột theo cảm xúc).
3. **What NYX learned about you**: [Gợi ý trúng tới đâu (số % lớn + cột 100% theo ngày) | AI đoán mặt chắc tới đâu (5 thanh ngang)] → Điểm sở thích (bảng ô màu, xanh = dương, đỏ = âm, kèm luật).

≤ 1000px: các cặp xếp dọc; 5 ô thành 3 + 2. Điện thoại 390px: 1 cột, 5 ô lưới 2 cột; lưới theo buổi + bảng điểm sở thích cuộn ngang trong thẻ; không tràn ngang trang.
Tương tác: bấm bài → phát (`playSong`), bấm ca sĩ → `/artist/:id`. Mỗi mục thiếu dữ liệu → câu nhắc riêng (vd "Listen to a few songs to see your top tracks").

### Chia việc frontend
- `src/pages/MoodPage.jsx/.scss` làm lại (giữ route `/stats`, `/mood` → `/stats`), gọi `GET /stats?days=` + `GET /mood-history` (ô Cheer-up).
- Tách thẻ thành component nhỏ trong `src/components/stats/` (mỗi mục 1 file) để `MoodPage` không phình to.

## 5. Script dữ liệu mẫu `npm run seed-demo`

Tài khoản (mật khẩu `demo1234`, `survey_done_at` đã đặt):

| Tài khoản | Gu (khảo sát + nghe nhiều) | Kiểu cảm xúc |
|---|---|---|
| `demo30` (**demo chính**) | pop + ballad; Sơn Tùng M-TP, Noo Phước Thịnh | sáng hay vui, tối hay buồn; 3 ngày gần nhất buồn/giận > 50% (chế độ động viên bật) |
| `mau_ballad` | ballad; Noo Phước Thịnh, Lệ Quyên, GUrbane | hay buồn / bình thường |
| `mau_rap` | rap; Da LAB, RPT MCK | hay bất ngờ / vui |
| `mau_pop` | pop; Sơn Tùng M-TP, Taylor Swift | hay vui |
| `mau_chill` | thư giãn + ballad | hay bình thường / giận |

Cách sinh (30 ngày tới hôm nay):
- Mỗi ngày 1–4 lần quét; giờ quét theo kiểu cảm xúc từng người (quy luật hiện rõ ở lưới theo buổi).
- ~70% lần quét có `confidence` (coi như camera); giá trị bám số đo thật của model: angry thấp (~0.45–0.6), sad/surprise vừa, happy/neutral cao (~0.8–0.95).
- Bài gợi ý: bài có vibe hợp cảm xúc trong kho, ưu tiên ca sĩ / thể loại trong gu.
- Kết quả nghe: xác suất nghe hết tăng dần ~40% → ~75% trong 30 ngày (bài hợp gu nghe hết nhiều hơn); có lượt một nửa, bỏ qua, "Not for me".
- `preferences` được **tính lại bằng đúng luật hệ thống** (+1 / +0.3 / −1 / declined −1) trên các lượt vừa sinh — không bịa riêng.
- Mỗi lượt nghe (good/neutral/bad) ghi thêm `recently_played` vài phút sau lần quét.

An toàn: chỉ xoá + tạo lại đúng 5 tài khoản trên (xoá user → các bảng con tự xoá theo `ON DELETE CASCADE`), trong 1 transaction; tài khoản khác không bị đụng. Bộ sinh số ngẫu nhiên có hạt giống cố định → chạy lại ra cùng dữ liệu (ngày luôn tính tới hôm nay).
Code: hàm thuần `generateHistory(profile, catalog, { seed, now })` trong `scripts/lib/demoHistory.js` → `{ scans, listens, plays, preferences }`; `scripts/seed-demo.js` chỉ ghi DB. Test `test/demoHistory.test.js`.
**Trung thực:** NOTES + slide ghi rõ `demo30` là dữ liệu mẫu do script sinh ra để minh hoạ, không phải người dùng thật.

## 6. Xử lý lỗi / trường hợp biên

| Tình huống | Cách xử lý |
|---|---|
| Tài khoản mới, chưa có gì | Mỗi mục hiện câu nhắc riêng; ô tổng quan hiện 0 / "—" |
| Chưa quét camera lần nào | Mục độ tự tin: "No camera scans yet — scan with the camera to see how sure the AI is" |
| Bài không có thời lượng (`duration` NULL) | Không cộng vào "≈ thời gian nghe" |
| Bài trong lịch sử đã bị xoá khỏi kho | Bỏ qua (JOIN) |
| `/stats` lỗi | Thông báo lỗi trên trang + nút thử lại; ô Cheer-up vẫn hiện nếu `/mood-history` được |
| Chạy `seed-demo` khi chưa migrate `migrate_song_info.sql` | Script vẫn chạy (không dùng cột mới); chỉ "≈ thời gian nghe" thiếu |

## 7. Ngoài phạm vi

- Gợi ý theo người dùng tương tự (spec riêng, làm ngay sau; trang thống kê để sau này thêm ô "People like you").
- Ghi nguồn cảm xúc (camera / chọn tay / giọng nói) vào `mood_history`.
- Dòng thời gian chế độ động viên; xuất báo cáo; so sánh với người khác.

## 8. Kiểm tra

- `npm test`: `test/stats.test.js` (chia buổi đúng ranh giới giờ, lấp ngày trống, tỉ lệ nghe hết, chọn top, điểm sở thích top 10) + `test/demoHistory.test.js` (cùng hạt giống → cùng kết quả, điểm sở thích đúng luật, tỉ lệ nghe hết 10 ngày cuối > 10 ngày đầu, chỉ bài có trong kho, mọi dòng đúng user).
- curl `GET /stats?days=7` và `?days=30` với `demo30` (sau `seed-demo`) và với tài khoản mới (toàn 0 / mảng rỗng); không token → 401.
- Frontend: `npx eslint src` sạch + `npm run build`; Playwright 1440 / 1000 / 390px với `demo30` (đủ 8 mục, đổi 7↔30 ngày, bấm bài phát, bấm ca sĩ mở trang, không tràn ngang) và tài khoản mới (lời nhắc). Kiểm tra cổng trước, dùng chung server người dùng nếu đang chạy, không tắt.

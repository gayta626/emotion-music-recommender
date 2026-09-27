# Gợi ý nhạc theo gu (dòng nhạc, ca sĩ, âm thanh) — Design

Ngày: 2026-09-27 · Trạng thái: đã duyệt thiết kế trong chat, chờ duyệt spec · Làm **sau** buổi báo cáo 28/09.

## 1. Mục tiêu

- Đổi tỉ lệ chọn bài từ 80/20 thành **65% bài điểm cao nhất / 35% khám phá bài lạ**.
- Hệ thống **tự học gu** của người dùng ở mức rộng hơn từng bài: nghe hết nhiều bài ballad (của các ca sĩ khác nhau) → lần sau ưu tiên bài ballad **chưa nghe**; thích một ca sĩ → ưu tiên bài của ca sĩ đó.
- Phải chạy được **kể cả khi không ai điền dòng nhạc / ca sĩ** (nhãn chỉ là tùy chọn). Càng nghe nhiều, gợi ý càng **thu hẹp** về gu.

## 2. Các quyết định đã chốt

| Quyết định | Lý do |
|---|---|
| Cảm xúc vẫn là tiêu chí chính; gu chỉ **xếp hạng trong cùng cảm xúc** (phương án A) | Đồ án là gợi ý theo cảm xúc; giữ nguyên tính năng chăm sóc cảm xúc (buồn nhiều → nhạc vui) |
| Hiểu bài hát từ 3 nguồn: **đặc trưng âm thanh** (luôn có), **thẻ ID3 trong file mp3** (nếu có), **nhãn nhóm tự điền** (nếu có) | Không phụ thuộc vào việc điền tay; nhãn tay luôn được ưu tiên |
| Phân tích âm thanh bằng **script Python riêng**, chạy 1 lần mỗi bài | Backend Node gọn, không cài thư viện âm thanh; không tốn thời gian mỗi lần gợi ý |
| Tính điểm gu **trong Node** (`tasteService.js`, hàm thuần) | Kho nhạc vài chục bài → tính mỗi lần gợi ý chỉ vài ms, không cần server mới |

## 3. Dữ liệu

### 3.1 Bảng `songs` — thêm 2 cột (đều cho phép NULL)

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `genre` | `TEXT` | Dòng nhạc (ballad, pop, rap, lofi, edm, …), chữ thường. Từ ID3 hoặc nhóm tự điền |
| `features` | `REAL[]` | Vector đặc trưng âm thanh đã chuẩn hóa, do script tính |

`artist` giữ nguyên; script điền nếu đang trống và file có thẻ ID3.

### 3.2 Cập nhật không mất dữ liệu

- Mới: `emotune-backend/db/migrate_002_taste.sql` — `ALTER TABLE songs ADD COLUMN IF NOT EXISTS genre TEXT; ... features REAL[];` (chạy nhiều lần an toàn, giữ nguyên `preferences`, `mood_history`).
- Sửa: `db/schema.sql` thêm 2 cột cho lần cài mới. `seed.sql` có thể thêm cột `genre` khi nhóm biết.

## 4. Script phân tích nhạc — `music-analyzer/analyze_music.py`

- Thư viện: `librosa` (âm thanh), `mutagen` (thẻ ID3), `psycopg2` (PostgreSQL). Có `requirements.txt` riêng, venv riêng. Đọc thông tin DB từ `emotune-backend/.env`.
- Với mỗi bài có `features IS NULL`:
  1. Mở `emotune-backend/music/<file_path>`, phân tích **~60 giây giữa bài** (bài ngắn hơn thì lấy cả bài).
  2. Đặc trưng: tempo, năng lượng trung bình (RMS), độ sáng âm (spectral centroid), zero-crossing rate, **13 hệ số MFCC trung bình** → vector ~17–20 số.
  3. Đọc ID3: `artist`, `genre` — **chỉ ghi vào ô đang trống**, không bao giờ đè nhãn tay.
  4. Ghi `features` vào DB.
- Chuẩn hóa: lưu vector thô; chuẩn hóa z-score theo **toàn bộ kho** được làm ở bước tính độ giống (mục 5), để thêm bài mới không phải phân tích lại bài cũ.
- In bảng tóm tắt (bài đã phân tích, artist/genre lấy được) và tùy chọn `--similarity` in ma trận độ giống giữa các bài để kiểm tra bằng mắt.
- Lỗi (thiếu file, file hỏng): bỏ qua bài đó, in cảnh báo, `features` giữ NULL.
- Chạy lại nhiều lần an toàn (bỏ qua bài đã có `features`); `--force` để phân tích lại tất cả.

## 5. Tính điểm — `emotune-backend/src/services/tasteService.js`

Với cảm xúc mục tiêu `e` và mỗi bài ứng viên `s`:

| Thành phần | Công thức | Không có dữ liệu |
|---|---|---|
| ① `own` | `preferences.score` của (e, s) — như hiện tại | 0 |
| ② `content` | Trung bình có trọng số điểm các bài `t ≠ s` đã có phản hồi (điểm của `t` = tổng `preferences.score` mọi cảm xúc), trọng số = `sim(s, t)`, chỉ tính `t` có `sim ≥ 0.5` | 0 |
| ③ `artist` | Trung bình điểm các bài `t ≠ s` cùng `artist` (không phân biệt hoa thường) | 0 |
| ④ `genre` | Trung bình điểm các bài `t ≠ s` cùng `genre` | 0 |

**Điểm tổng = own + 0.5·content + 0.3·artist + 0.3·genre** (các hệ số là hằng số đặt tại đầu file).

- `sim(s, t)`: cosine similarity giữa 2 vector đặc trưng đã chuẩn hóa z-score theo các bài có `features` trong kho; kết quả âm coi như 0. Bài thiếu `features` → `sim = 0`.
- Điểm âm lan truyền: bài bị bỏ sớm kéo điểm các bài giống nó xuống.

Hàm xuất ra (thuần, không đụng DB, dễ test):
- `similarity(a, b)`, `normalizeFeatures(songs)`
- `scoreCandidates(candidates, history, emotion)` → mỗi ứng viên kèm `total` và các thành phần
- `pickSong(scored, rng)` → chọn theo mục 6 (nhận `rng` để test)

## 6. Chọn bài 65/35 — sửa `suggestService.generateSuggestion`

1. Ứng viên = bài thuộc cảm xúc mục tiêu, trừ 3 bài vừa phát (giữ nguyên fallback hiện có của `getSongsByEmotion`).
2. Lịch sử = mọi bài có dòng trong `preferences` (kèm `features`, `artist`, `genre`, tổng điểm) — thêm 1 query trong `suggestModel.js`.
3. `rng() < 0.65` → bài có **điểm tổng cao nhất** (hòa điểm → chọn ngẫu nhiên trong nhóm hòa).
4. Ngược lại → **khám phá**: trong các ứng viên **chưa có điểm ở cảm xúc này**, chọn ngẫu nhiên có trọng số `exp(total)` (bài lạ hợp gu có xác suất cao hơn).
   - Không còn bài lạ → chọn ngẫu nhiên trong ứng viên trừ bài điểm cao nhất; chỉ có 1 ứng viên → chọn bài đó.
5. Phần còn lại giữ nguyên: `checkMoodTrend` (buồn nhiều → nhạc vui), `logSuggestion`, message động viên, `/listen-report` chấm điểm như cũ.

## 7. Trường hợp đặc biệt

| Trường hợp | Hành vi |
|---|---|
| Chưa bài nào có `features` | ② = 0 → giống hiện tại, chỉ đổi 65/35; không lỗi |
| Bài mới chưa chạy script | Không có ②, vẫn được gợi ý |
| Người dùng mới (chưa có điểm) | Mọi bài 0 điểm → chọn ngẫu nhiên, học dần |
| Không có `artist`/`genre` | ③/④ = 0 |

## 8. Kiểm thử

1. **Unit test** `tasteService.js` bằng `node --test` (không thêm thư viện), file `emotune-backend/test/tasteService.test.js`:
   - Bài giống bài đã thích (+) có tổng cao hơn bài khác gu.
   - Bài giống bài bị bỏ sớm (−) bị trừ điểm.
   - Cùng artist / cùng genre được cộng; không phân biệt hoa thường.
   - Thiếu `features` / không có lịch sử → không lỗi, tổng = own.
   - Mô phỏng 1.000 lần `pickSong` với `rng` cố định seed → tỉ lệ ~65/35; khám phá ưu tiên bài lạ hợp gu.
   - Thêm script `"test": "node --test"` vào `package.json`.
2. **Script phân tích**: chạy trên 10 bài hiện có, xem ma trận `--similarity` có hợp lý (2 bài cùng cảm xúc/cùng kiểu giống nhau hơn).
3. **Thử thật**: thêm ≥ 3 bài cùng một dòng nhạc, nghe hết 1 bài → gợi ý bài cùng dòng xuất hiện nhiều hơn.

## 9. Ngoài phạm vi

Tự nhận diện dòng nhạc bằng AI, lấy metadata từ Internet (Spotify…), giao diện sửa dòng nhạc (dùng DBeaver), gợi ý vượt ra ngoài cảm xúc hiện tại.

## 10. Lưu ý triển khai

- Kho nhạc hiện chỉ 10 bài (2 bài/cảm xúc) → tính năng chỉ thấy rõ khi có **≥ 8–10 bài mỗi cảm xúc**, nhiều dòng nhạc / ca sĩ.
- Mỗi máy (PC, laptop, Pi) có DB riêng → chạy `migrate_002_taste.sql` và `analyze_music.py` trên từng máy. Trên Pi 5 cần venv riêng cho `librosa`.

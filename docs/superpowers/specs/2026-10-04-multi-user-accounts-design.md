# Nhiều tài khoản + đăng nhập (web và hộp nhạc) — Design

Ngày: 2026-10-04 · Trạng thái: **đã duyệt 04/10** (plan: `docs/superpowers/plans/2026-10-04-multi-user-accounts.md`) · Người code: **người dùng tự code** (Claude hướng dẫn từng file, viết `setup.sql`, SCSS, cấu hình).

## 1. Mục tiêu

- Mỗi người có **tài khoản riêng**: điểm sở thích, lịch sử cảm xúc, bài vừa nghe, kết quả khảo sát gu đều **tách theo người** → hệ thống học gu của từng người (yêu cầu "thông minh" của môn Xây dựng hệ thống thông minh).
- **Bắt buộc đăng nhập** trước khi dùng, ở cả hai cách dùng:

| Cách dùng | Đăng nhập ở đâu | Camera + nhạc ở đâu | Môn |
|---|---|---|---|
| **Web thường** | Laptop | Ngay trên laptop | Hệ thống thông minh (không cần phần cứng) |
| **Hộp nhạc** | Laptop **hoặc** điện thoại (cùng mạng Wi-Fi), rồi bấm **"Dùng hộp nhạc"** | Hộp Pi (C270, loa, OLED, nút chạm) | HIC |

- Cả hai cách dùng chung một backend + một tài khoản: nghe trên laptop thì hộp nhạc cũng biết gu và ngược lại.

**Thành công khi:** 2 tài khoản khác nhau quét cùng một cảm xúc → điểm/lịch sử ghi vào đúng người; người B không thấy điểm của người A; hộp nhạc phát nhạc theo gu của người đang "giữ hộp".

## 2. Các quyết định đã chốt

| Quyết định | Lý do |
|---|---|
| Tài khoản chỉ gồm **username + mật khẩu** (không email, không ngày sinh, không Apple/Facebook) | Người dùng chốt 04/10: đơn giản nhất. Trang Sign in / Sign up trong Figma đổi ô "Email" thành "Tên đăng nhập", bỏ ô ngày sinh và nút Apple/Facebook |
| Mật khẩu băm bằng **bcryptjs**, phiên đăng nhập bằng **JWT** gửi qua header `Authorization: Bearer <token>` | Cách phổ biến, dễ học; `bcryptjs` là JS thuần → cài được trên Windows lẫn Pi, không cần build native |
| `user_id` **lấy từ token** (middleware), **không** truyền qua URL/body | Truyền id qua URL thì ai cũng sửa số để xem/ghi dữ liệu người khác |
| Hộp nhạc nối với người dùng theo **cách A — "Dùng hộp nhạc"**: người đã đăng nhập bấm nút → backend ghi hộp đang thuộc về người đó | Đơn giản, kịp 15/10. Nâng lên **cách B (mã ghép đôi 4 số hiện trên OLED)** sau, chỉ thêm 1 bước kiểm tra mã |
| Bảng dùng chung giữ nguyên: `songs`, `artists`, `genres` | Kho nhạc là của hệ thống, không phải của từng người |
| Gộp `user_profile` vào `users` (cột `survey_done_at`) | Mỗi người một dòng hồ sơ, không cần bảng riêng |
| DB đang trống → sửa thẳng `setup.sql` và chạy lại `npm run db:setup` (cả máy mới lẫn Pi) | Chưa có dữ liệu thật cần giữ; điểm thử trên Pi chấp nhận mất (người dùng có thể phản đối khi đọc spec) |

## 3. Dữ liệu (`emotune-backend/db/setup.sql`)

### 3.1 Bảng mới

```sql
users (
    id              SERIAL PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,30}$'),  -- chữ thường, số, gạch dưới; dùng để chào: "Xin chào, vinh"
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),  -- chuẩn bị cho trang admin, chưa dùng
    survey_done_at  TIMESTAMP,                -- NULL = chưa làm/bỏ qua khảo sát gu
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
)

devices (                                     -- mỗi hộp nhạc một dòng; hiện chỉ có 'box'
    id              TEXT PRIMARY KEY,         -- 'box'
    name            TEXT NOT NULL,
    current_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- ai đang giữ hộp (NULL = trống)
    claimed_at      TIMESTAMP,
    last_active_at  TIMESTAMP                 -- lần cuối hộp quét/phát cho người này
)
```

### 3.2 Bảng thêm `user_id` (đều `NOT NULL REFERENCES users(id) ON DELETE CASCADE`)

| Bảng | Thay đổi khoá |
|---|---|
| `preferences` | `UNIQUE (emotion, song_id)` → `UNIQUE (user_id, emotion, song_id)` |
| `mood_history` | thêm `user_id`; index `(user_id, created_at)` |
| `recently_played` | thêm `user_id`; index `(user_id, played_at)` |
| `survey_artists` | khoá chính `(user_id, artist_id)` |
| `survey_genres` | khoá chính `(user_id, genre_id)` |

Xoá bảng `user_profile`.

### 3.3 Dữ liệu mẫu

- 1 tài khoản demo để thử khi chưa có trang đăng ký: username `demo` / mật khẩu `demo1234` (hash bcrypt tính sẵn, ghi thẳng vào `setup.sql`).
- 1 dòng `devices`: `('box', 'Hộp nhạc EmoTune', NULL, NULL, NULL)`.

## 4. Backend (`emotune-backend`) — theo mẫu route → controller → service → model

### 4.1 Cấu hình
- Thêm thư viện `bcryptjs`, `jsonwebtoken`.
- `.env`: `JWT_SECRET=<chuỗi ngẫu nhiên>`, `JWT_EXPIRES_IN=7d`. Thêm 2 dòng vào `.evn.example`.

### 4.2 Middleware (`src/middleware/auth.js`)
- `requireAuth`: đọc `Authorization: Bearer <token>` → kiểm tra JWT → gắn `req.userId`. Không có / sai / hết hạn → `401 { error: "unauthorized" }`.
- `resolveUser` (dùng cho các API mà hộp nhạc gọi): có token → như `requireAuth`. Không có token nhưng có header `X-Device-Id: box` → lấy `devices.current_user_id` của hộp (coi như trống nếu `last_active_at` cũ hơn **30 phút**) → gắn `req.userId` và `req.deviceId`. Hộp trống → `409 { error: "box_free", message: "Chưa có ai dùng hộp nhạc" }`. Không có cả hai → `401`.
- Giới hạn chấp nhận: trong cùng mạng, ai gửi `X-Device-Id: box` cũng hành động như người đang giữ hộp. Chấp nhận trong phạm vi một phòng; cách B (mã ghép đôi) sẽ sửa điểm này.

### 4.3 API mới

| API | Bảo vệ | Vào | Ra |
|---|---|---|---|
| `POST /auth/register` | — | `{ username, password }` | `201 { token, user }` · `400` dữ liệu sai (username không đúng dạng 3–30 ký tự `a-z 0-9 _`, mật khẩu < 6 ký tự) · `409` username đã có |
| `POST /auth/login` | — | `{ username, password }` | `200 { token, user }` · `401` sai username hoặc mật khẩu (cùng một thông báo, không nói rõ sai phần nào) |
| `GET /auth/me` | `requireAuth` | — | `{ id, username, surveyDone }` |
| `GET /profile` | `requireAuth` | — | `{ done, artistIds, genreIds }` của **chính người gọi** |
| `POST /profile` | `requireAuth` | `{ artistIds, genreIds }` (mảng rỗng = bỏ qua) | xoá lựa chọn cũ + ghi mới + đặt `survey_done_at = NOW()` trong **1 transaction** |
| `GET /genres` | — | — | danh sách thể loại (giống `/artists`) |
| `POST /devices/box/claim` | `requireAuth` | — | hộp thuộc về người gọi (`current_user_id`, `claimed_at`, `last_active_at = NOW()`); người cũ bị thay |
| `POST /devices/box/release` | `requireAuth` | — | chỉ người đang giữ hộp mới nhả được (người khác → `403`) |
| `GET /devices/box/current` | — | — | `{ user: { id, username } }` hoặc `{ user: null }` — Pi hỏi định kỳ để biết chào ai |

`user` trả về trong register/login: `{ id, username, surveyDone }` — **không bao giờ** trả `password_hash`.
Username luôn được `trim()` + chuyển chữ thường trước khi kiểm tra, lưu và so khi đăng nhập (`Vinh` = `vinh`).

### 4.4 API cũ phải đổi

| API | Đổi |
|---|---|
| `POST /scan-and-suggest` | `resolveUser`; `checkMoodTrend`, `getSongsByEmotion` (điểm + 3 bài gần nhất), `logSuggestion` đều lọc/ghi theo `userId`; khi đi qua hộp → cập nhật `devices.last_active_at` |
| `POST /listen-report` | `resolveUser`; ghi `preferences`, `mood_history`, `recently_played` kèm `userId` |
| `POST /feed-back`, `POST /request-song` | `resolveUser`; ghi kèm `userId` |
| `GET /mood-history` | `requireAuth`; chỉ trả lịch sử của người gọi |
| `GET /artists`, `/music/*`, `/avatars/*` | giữ nguyên, không cần đăng nhập |

Quy tắc: **mọi câu SQL đụng tới 5 bảng ở mục 3.2 phải có điều kiện / giá trị `user_id`**.

## 5. Frontend (`emotune-frontend`)

### 5.1 Cấu hình mạng
- `src/config.js` đọc `import.meta.env.VITE_API_URL` (mặc định `http://localhost:8080`) và `VITE_DEVICE_ID` (chỉ đặt `box` trên Pi).
- Điện thoại dùng được khi: cùng Wi-Fi, frontend chạy `npm run dev -- --host`, `VITE_API_URL` là IP của máy chạy backend (vd `http://192.168.137.1:8080`).

### 5.2 Web thường (không có `VITE_DEVICE_ID`)
- Trang **Đăng nhập** `/login` và **Đăng ký** `/register` theo Figma, chỉ gồm **Tên đăng nhập + Mật khẩu** (Sign up thêm ô *Nhập lại mật khẩu*, kiểm tra trùng ở frontend). Claude sửa Figma: đổi "Email" → "Tên đăng nhập", bỏ ngày sinh, bỏ nút Apple/Facebook.
- Đăng nhập xong: lưu token (`localStorage`), axios gắn header `Authorization` cho mọi request (1 chỗ dùng chung, vd `src/api.js`).
- Chưa đăng nhập mà vào `/` → chuyển về `/login`. Token hết hạn (API trả 401) → xoá token, về `/login`.
- Đăng nhập xong: `GET /profile` → `done = false` thì hiện **form khảo sát gu** (thiết kế Figma `255:5`) trước nút "Bắt đầu".
- Có nút **"Dùng hộp nhạc"** (gọi `/devices/box/claim`) và **"Rời hộp nhạc"** — dùng được trên laptop và điện thoại; CSS co giãn cho màn hình nhỏ.
- Header: hiện tên người dùng + nút đăng xuất (thay icon user hiện tại).

### 5.3 Hộp nhạc (Pi, `VITE_DEVICE_ID=box`)
- Không có trang đăng nhập. `HomePage` hỏi `GET /devices/box/current` mỗi 3 giây:
  - `user = null` → màn chờ: "Mở web trên điện thoại hoặc laptop, đăng nhập rồi bấm *Dùng hộp nhạc*". Nút chạm 1 không bắt đầu quét.
  - có người → "Xin chào, {username}" → luồng cũ (quét → phát) với header `X-Device-Id: box`.
  - Người giữ hộp đổi / nhả hộp khi đang phát → dừng nhạc, quay về màn chờ.
- Hộp nhạc **không hiện form khảo sát gu** (không có bàn phím/màn hình lớn). Khảo sát làm trên web (laptop/điện thoại) ngay sau khi đăng nhập; người chưa làm khảo sát vẫn dùng hộp được, chỉ là chưa có điểm thưởng khảo sát.
- OLED: thêm trạng thái chờ đăng nhập ("Dang nhap tren dien thoai") — **tuỳ chọn**, làm nếu kịp (sửa `gpio-service`).

## 6. Xử lý lỗi

| Tình huống | Hành vi |
|---|---|
| Sai mật khẩu / username không tồn tại | `401`, một thông báo chung "Tên đăng nhập hoặc mật khẩu không đúng" |
| Username đã có người dùng | `409` "Tên đăng nhập này đã có người dùng" |
| Token hết hạn khi đang dùng web | Frontend xoá token → về `/login` |
| Hộp nhạc trống mà Pi gửi quét | `409 box_free` → Pi hiện màn chờ, không quét |
| Người khác bấm "Dùng hộp nhạc" khi hộp đang có người | Người mới thay người cũ; Pi thấy đổi người ở lần hỏi kế tiếp → dừng bài, chào người mới |
| Hộp không hoạt động > 30 phút | Coi như trống (tự nhả) |

## 7. Kiểm thử

1. **Unit test** (`node --test`, thư mục `emotune-backend/test/`): hàm kiểm tra dữ liệu đăng ký (username, mật khẩu); hàm quyết định người dùng cho request (token / hộp / trống / hết 30 phút) viết thành hàm thuần để test được.
2. **Thử bằng tay** (curl/Postman):
   - Đăng ký 2 tài khoản A, B → login → `GET /auth/me` đúng người; gọi không có token → 401.
   - A và B mỗi người `POST /listen-report` cho cùng một bài → `preferences` có 2 dòng riêng.
   - A claim hộp → `GET /devices/box/current` ra A → gọi `/scan-and-suggest` với `X-Device-Id: box` → ghi vào A. B claim → ra B.
3. **Thử thật**: laptop đăng nhập A + điện thoại đăng nhập B qua hotspot; điện thoại bấm "Dùng hộp nhạc" → Pi chào B.

## 8. Ngoài phạm vi

Mã ghép đôi (cách B), đăng nhập bằng khuôn mặt, Apple/Facebook/Google, email, ngày sinh, quên/đổi mật khẩu, trang admin (chỉ chuẩn bị cột `role`), nhiều hộp nhạc trên giao diện, refresh token.

## 9. Ai làm gì

| Phần | Người làm |
|---|---|
| `setup.sql` mới (mục 3), hash tài khoản demo, cài thư viện, `.env`/`.evn.example`, cấu hình `VITE_*`, SCSS các trang mới (co giãn mobile), sửa Figma Sign in/Sign up (Email → Tên đăng nhập, bỏ ngày sinh + Apple/Facebook) | Claude |
| Middleware, API auth/profile/genres/devices, sửa các query cũ thêm `user_id`, trang Login/Register (JSX + state), `src/api.js`, route guard, màn chờ hộp nhạc, unit test | **Người dùng** (Claude hướng dẫn từng file, chú thích 📌, review) |

## 10. Thứ tự làm (chi tiết trong plan)

1. DB mới + tài khoản demo (Claude) → `npm run db:setup`.
2. Đăng ký / đăng nhập / `GET /auth/me` + middleware `requireAuth`.
3. Thêm `user_id` vào các query cũ + `resolveUser` (web trước, hộp sau).
4. `GET/POST /profile`, `GET /genres` (tiếp phần khảo sát gu đang dở).
5. Frontend: `src/api.js`, Login/Register, route guard, header tên + đăng xuất.
6. Form khảo sát gu (JSX người dùng, SCSS Claude).
7. API hộp nhạc + nút "Dùng hộp nhạc" + màn chờ trên Pi.

Nếu gấp trước 15/10: demo HIC bằng **đăng nhập trên laptop rồi bấm "Dùng hộp nhạc"**; phần điện thoại chỉ là CSS co giãn + `--host`, làm sau cùng.

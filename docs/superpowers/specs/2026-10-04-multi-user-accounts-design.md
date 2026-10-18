# Nhiều tài khoản + đăng nhập — Design

Ngày: 2026-10-04 · Trạng thái: **đã duyệt 04/10** (plan: `docs/superpowers/plans/2026-10-04-multi-user-accounts.md`) · Người code: **người dùng tự code** (Claude hướng dẫn từng file, viết `setup.sql`, SCSS, cấu hình).

## 1. Mục tiêu

- Mỗi người có **tài khoản riêng**: điểm sở thích, lịch sử cảm xúc, bài vừa nghe, kết quả khảo sát gu đều **tách theo người** → hệ thống học gu của từng người (yêu cầu "thông minh" của môn Xây dựng hệ thống thông minh).
- **Bắt buộc đăng nhập** trước khi dùng web (laptop hoặc điện thoại cùng mạng Wi-Fi).

**Thành công khi:** 2 tài khoản khác nhau quét cùng một cảm xúc → điểm/lịch sử ghi vào đúng người; người B không thấy điểm của người A.

## 2. Các quyết định đã chốt

| Quyết định | Lý do |
|---|---|
| Tài khoản chỉ gồm **username + mật khẩu** (không email, không ngày sinh, không Apple/Facebook) | Người dùng chốt 04/10: đơn giản nhất. Trang Sign in / Sign up trong Figma đổi ô "Email" thành "Tên đăng nhập", bỏ ô ngày sinh và nút Apple/Facebook |
| Mật khẩu băm bằng **bcryptjs**, phiên đăng nhập bằng **JWT** gửi qua header `Authorization: Bearer <token>` | Cách phổ biến, dễ học; `bcryptjs` là JS thuần → cài được mọi máy, không cần build native |
| `user_id` **lấy từ token** (middleware), **không** truyền qua URL/body | Truyền id qua URL thì ai cũng sửa số để xem/ghi dữ liệu người khác |
| Bảng dùng chung giữ nguyên: `songs`, `artists`, `genres` | Kho nhạc là của hệ thống, không phải của từng người |
| Gộp `user_profile` vào `users` (cột `survey_done_at`) | Mỗi người một dòng hồ sơ, không cần bảng riêng |
| DB đang trống → sửa thẳng `setup.sql` và chạy lại `npm run db:setup` | Chưa có dữ liệu thật cần giữ |

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

## 4. Backend (`emotune-backend`) — theo mẫu route → controller → service → model

### 4.1 Cấu hình
- Thêm thư viện `bcryptjs`, `jsonwebtoken`.
- `.env`: `JWT_SECRET=<chuỗi ngẫu nhiên>`, `JWT_EXPIRES_IN=7d`. Thêm 2 dòng vào `.evn.example`.

### 4.2 Middleware (`src/middleware/auth.js`)
- `requireAuth`: đọc `Authorization: Bearer <token>` → kiểm tra JWT → gắn `req.userId`. Không có / sai / hết hạn → `401 { error: "unauthorized" }`.

### 4.3 API mới

| API | Bảo vệ | Vào | Ra |
|---|---|---|---|
| `POST /auth/register` | — | `{ username, password }` | `201 { token, user }` · `400` dữ liệu sai (username không đúng dạng 3–30 ký tự `a-z 0-9 _`, mật khẩu < 6 ký tự) · `409` username đã có |
| `POST /auth/login` | — | `{ username, password }` | `200 { token, user }` · `401` sai username hoặc mật khẩu (cùng một thông báo, không nói rõ sai phần nào) |
| `GET /auth/me` | `requireAuth` | — | `{ id, username, surveyDone }` |
| `GET /profile` | `requireAuth` | — | `{ done, artistIds, genreIds }` của **chính người gọi** |
| `POST /profile` | `requireAuth` | `{ artistIds, genreIds }` (mảng rỗng = bỏ qua) | xoá lựa chọn cũ + ghi mới + đặt `survey_done_at = NOW()` trong **1 transaction** |
| `GET /genres` | — | — | danh sách thể loại (giống `/artists`) |

`user` trả về trong register/login: `{ id, username, surveyDone }` — **không bao giờ** trả `password_hash`.
Username luôn được `trim()` + chuyển chữ thường trước khi kiểm tra, lưu và so khi đăng nhập (`Vinh` = `vinh`).

### 4.4 API cũ phải đổi

| API | Đổi |
|---|---|
| `POST /scan-and-suggest` | `requireAuth`; `checkMoodTrend`, `getSongsByEmotion` (điểm + 3 bài gần nhất), `logSuggestion` đều lọc/ghi theo `userId` |
| `POST /listen-report` | `requireAuth`; ghi `preferences`, `mood_history`, `recently_played` kèm `userId` |
| `POST /feed-back`, `POST /request-song` | `requireAuth`; ghi kèm `userId` |
| `GET /mood-history` | `requireAuth`; chỉ trả lịch sử của người gọi |
| `GET /artists`, `/music/*`, `/avatars/*` | giữ nguyên, không cần đăng nhập |

Quy tắc: **mọi câu SQL đụng tới 5 bảng ở mục 3.2 phải có điều kiện / giá trị `user_id`**.

## 5. Frontend (`emotune-frontend`)

### 5.1 Cấu hình mạng
- `src/config.js` đọc `import.meta.env.VITE_API_URL` (mặc định `http://localhost:8080`).
- Điện thoại dùng được khi: cùng Wi-Fi, frontend chạy `npm run dev -- --host`, `VITE_API_URL` là IP của máy chạy backend (vd `http://192.168.137.1:8080`).

### 5.2 Trang và luồng
- Trang **Đăng nhập** `/login` và **Đăng ký** `/register` theo Figma, chỉ gồm **Tên đăng nhập + Mật khẩu** (Sign up thêm ô *Nhập lại mật khẩu*, kiểm tra trùng ở frontend). Claude sửa Figma: đổi "Email" → "Tên đăng nhập", bỏ ngày sinh, bỏ nút Apple/Facebook.
- Đăng nhập xong: lưu token (`localStorage`), axios gắn header `Authorization` cho mọi request (1 chỗ dùng chung, vd `src/api.js`).
- Chưa đăng nhập mà vào `/` → chuyển về `/login`. Token hết hạn (API trả 401) → xoá token, về `/login`.
- Đăng nhập xong: `GET /profile` → `done = false` thì hiện **form khảo sát gu** (thiết kế Figma `255:5`) trước nút "Bắt đầu".
- CSS co giãn cho màn hình nhỏ (điện thoại).
- Header: hiện tên người dùng + nút đăng xuất (thay icon user hiện tại).

## 6. Xử lý lỗi

| Tình huống | Hành vi |
|---|---|
| Sai mật khẩu / username không tồn tại | `401`, một thông báo chung "Tên đăng nhập hoặc mật khẩu không đúng" |
| Username đã có người dùng | `409` "Tên đăng nhập này đã có người dùng" |
| Token hết hạn khi đang dùng web | Frontend xoá token → về `/login` |

## 7. Kiểm thử

1. **Unit test** (`node --test`, thư mục `emotune-backend/test/`): hàm kiểm tra dữ liệu đăng ký (username, mật khẩu).
2. **Thử bằng tay** (curl/Postman):
   - Đăng ký 2 tài khoản A, B → login → `GET /auth/me` đúng người; gọi không có token → 401.
   - A và B mỗi người `POST /listen-report` cho cùng một bài → `preferences` có 2 dòng riêng.
3. **Thử thật**: laptop đăng nhập A + điện thoại đăng nhập B cùng Wi-Fi → mỗi người thấy dữ liệu của mình.

## 8. Ngoài phạm vi

Đăng nhập bằng khuôn mặt, Apple/Facebook/Google, email, ngày sinh, quên/đổi mật khẩu, trang admin (chỉ chuẩn bị cột `role`), refresh token.

## 9. Ai làm gì

| Phần | Người làm |
|---|---|
| `setup.sql` mới (mục 3), hash tài khoản demo, cài thư viện, `.env`/`.evn.example`, cấu hình `VITE_*`, SCSS các trang mới (co giãn mobile), sửa Figma Sign in/Sign up (Email → Tên đăng nhập, bỏ ngày sinh + Apple/Facebook) | Claude |
| Middleware, API auth/profile/genres, sửa các query cũ thêm `user_id`, trang Login/Register (JSX + state), `src/api.js`, route guard, unit test | **Người dùng** (Claude hướng dẫn từng file, chú thích 📌, review) |

## 10. Thứ tự làm (chi tiết trong plan)

1. DB mới + tài khoản demo (Claude) → `npm run db:setup`.
2. Đăng ký / đăng nhập / `GET /auth/me` + middleware `requireAuth`.
3. Thêm `user_id` vào các query cũ.
4. `GET/POST /profile`, `GET /genres` (tiếp phần khảo sát gu đang dở).
5. Frontend: `src/api.js`, Login/Register, route guard, header tên + đăng xuất.
6. Form khảo sát gu (JSX người dùng, SCSS Claude).

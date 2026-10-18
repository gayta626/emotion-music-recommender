# Nhiều tài khoản + đăng nhập — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠ **Ngoại lệ của dự án này (CLAUDE.md thắng skill):** người dùng **tự code** backend/frontend. Mỗi task ghi rõ **[Claude]** hay **[Người dùng]**. Ở task [Người dùng], plan chỉ đưa **giao diện hàm, test case, lệnh kiểm tra, gợi ý nhỏ** — không dán file hoàn chỉnh. Claude hướng dẫn **từng file một**, mỗi bước kèm chú thích 📌 (đang làm gì / ý nghĩa cho hệ thống), chờ người dùng gửi code → review → mới sang bước sau. Subagent **không** được tự viết code cho task [Người dùng].

> **04/10 — người dùng chọn bỏ viết unit test vì gấp deadline** (học test sau): các bước "viết test trước" ở Task 2 là **tuỳ chọn**; kiểm tra bằng curl / thử tay ở mỗi task là **bắt buộc**. `test/authValidation.test.js` (2 test mẫu Claude viết) giữ lại, chạy `npm test` là có thêm một bước kiểm tra miễn phí.

**Goal:** Mỗi người có tài khoản riêng (username + mật khẩu); điểm sở thích, lịch sử cảm xúc, bài vừa nghe, khảo sát gu tách theo người; dùng được trên web (laptop/điện thoại).

**Architecture:** Thêm bảng `users`, gắn `user_id` vào 5 bảng dữ liệu cá nhân. Backend phát JWT khi đăng nhập; middleware `requireAuth` gắn `req.userId`; mọi model nhận `userId` làm **tham số đầu tiên**. Frontend dùng một axios instance chung (`src/api.js`) tự gắn token.

**Tech Stack:** Node 24 + Express 5 + `pg`, `bcryptjs`, `jsonwebtoken`, `node:test`; React 19 + Vite + react-router 6 + axios + SCSS; PostgreSQL 17.

**Spec:** `docs/superpowers/specs/2026-10-04-multi-user-accounts-design.md`

## Global Constraints

- Username: `trim()` + chữ thường trước khi kiểm tra/lưu/so; đúng regex `^[a-z0-9_]{3,30}$`. Mật khẩu ≥ 6 ký tự.
- Mật khẩu băm bằng `bcryptjs` (cost 10). **Không bao giờ** trả `password_hash` ra API.
- JWT gửi qua `Authorization: Bearer <token>`; `.env`: `JWT_SECRET=<chuỗi ngẫu nhiên>`, `JWT_EXPIRES_IN=7d`. Payload chỉ `{ userId }`.
- `user_id` **chỉ lấy từ `req.userId`** (do middleware gắn), không bao giờ đọc từ URL/body.
- **Mọi câu SQL đụng tới `preferences`, `mood_history`, `recently_played`, `survey_artists`, `survey_genres` phải có điều kiện/giá trị `user_id`.**
- Lỗi: `400` dữ liệu sai · `401 { error: "unauthorized" }` · `401` đăng nhập sai với đúng một câu "Tên đăng nhập hoặc mật khẩu không đúng" · `409` "Tên đăng nhập này đã có người dùng".
- `user` trả về trong register/login/me: `{ id, username, surveyDone }`.
- `GET /artists`, `/music/*`, `/avatars/*`, `GET /genres` không cần đăng nhập.
- Bình luận code tiếng Việt (không dấu như code hiện tại cũng được), theo mẫu `routes/web.js → controllers → services → model`; SQL chỉ nằm trong `model/`.

## Review Focus

1. **Trùng username khác hoa/thường hoặc 2 người đăng ký cùng lúc** (`Vinh` rồi `vinh`) → `409`, không phải `500`: bắt mã lỗi Postgres `23505` thay vì chỉ "SELECT trước rồi INSERT". → test ở Task 3.
2. **Token sai chữ ký / hết hạn / thiếu chữ `Bearer`** → `401`, server không sập và không trả `500` (`jwt.verify` ném lỗi → phải bắt). → test ở Task 4.
3. **Rò dữ liệu giữa người** ở chỗ dễ quên: truy vấn con `recently_played` (3 bài gần nhất), câu **fallback** trong `getSongsByEmotion`, và xu hướng buồn 1–3 ngày → A buồn nhiều không làm B bị gợi ý "động viên"; A vừa nghe 3 bài thì B vẫn được gợi ý 3 bài đó. → test ở Task 5.

---

## Sơ đồ file

**Backend (`emotune-backend/`)**

| File | Trách nhiệm | Task |
|---|---|---|
| `db/setup.sql` (sửa) | bảng `users` + `user_id` ở 5 bảng + tài khoản demo | 1 |
| `package.json` (sửa) | thêm `bcryptjs`, `jsonwebtoken`, script `test` | 1 |
| `.env` / `.evn.example` (sửa) | `JWT_SECRET`, `JWT_EXPIRES_IN` | 1 |
| `src/services/authValidation.js` (mới) | hàm thuần chuẩn hoá + kiểm tra username/mật khẩu | 2 |
| `test/authValidation.test.js` (mới) | unit test cho file trên | 2 |
| `src/model/userModel.js` (mới) | SQL bảng `users` | 3 |
| `src/services/authService.js` (mới) | băm/so mật khẩu, ký JWT, đăng ký/đăng nhập | 3 |
| `src/controllers/authController.js` (mới) | `register`, `login`, `me` | 3, 4 |
| `src/middleware/auth.js` (mới) | `requireAuth` | 4 |
| `src/model/suggestModel.js`, `listenReportModel.js`, `feedBackModel.js`, `moodHistoryModel.js` (sửa) | thêm `userId` | 5 |
| các service/controller tương ứng (sửa) | truyền `req.userId` xuống | 5 |
| `src/model/genreModel.js`, `genreService.js`, `genreController.js` (mới) | `GET /genres` | 8 |
| `src/model/profileModel.js` (viết lại), `profileService.js`, `profileController.js` (mới) | `GET/POST /profile` | 8 |
| `src/routes/web.js` (sửa) | gắn route + middleware | 3–8 |

**Frontend (`emotune-frontend/`)**

| File | Trách nhiệm | Task |
|---|---|---|
| `src/config.js` (sửa), `.env.example` (mới) | `API_URL` từ `VITE_API_URL` | 9 |
| `src/api.js` (mới) | axios instance + token + xử lý 401 | 9 |
| `src/contexts/AuthContext.jsx` (mới) | `user`, `login`, `register`, `logout` | 10 |
| `src/components/RequireAuth.jsx` (mới) | chặn route khi chưa đăng nhập | 10 |
| `src/pages/LoginPage.jsx`, `RegisterPage.jsx` (mới) + `AuthPage.scss` (Claude) | 2 trang | 10 |
| `src/components/Header.jsx` (sửa) | tên người dùng + đăng xuất | 10 |
| `src/components/SurveyForm.jsx` (mới) + `SurveyForm.scss` (Claude) | khảo sát gu | 11 |
| `src/pages/HomePage.jsx` (sửa) | khảo sát gu | 11 |

**Mức tối thiểu:** Task 1 → 5, 9, 10. Task 8 + 11 (khảo sát gu) làm khi kịp.

---

### Task 0 [Claude]: Chốt việc dở trước khi bắt đầu

**Files:** `NOTES.md`, `.claude/settings.json` (chỉ xem)

- [ ] **Step 1:** `git diff .claude/settings.json` → cho người dùng xem, hỏi giữ hay bỏ.
- [ ] **Step 2:** Ghi vào `NOTES.md`: spec nhiều tài khoản đã duyệt; plan này.
- [ ] **Step 3 (khi người dùng đồng ý):** commit toàn bộ thay đổi phiên 03–04/10.

```bash
git add -A emotune-backend emotune-frontend docs CLAUDE.md NOTES.md
git commit -m "DB setup.sql 9 bang, GET /artists, giao dien NYX, spec + plan nhieu tai khoan"
```

---

### Task 1 [Claude]: DB mới + thư viện + cấu hình

**Files:**
- Modify: `emotune-backend/db/setup.sql`, `emotune-backend/package.json`, `emotune-backend/.env`, `emotune-backend/.evn.example`

**Interfaces — Produces:** bảng `users(id, username, password_hash, role, survey_done_at, created_at)`;  cột `user_id` ở 5 bảng; tài khoản `demo`/`demo1234` (id = 1); `npm test` chạy mọi file `test/**/*.test.js`.

- [ ] **Step 1: Cài thư viện + script test**

```bash
cd emotune-backend
npm install bcryptjs jsonwebtoken
npm pkg set scripts.test="node --test \"test/**/*.test.js\""
```
(Node 24: `node --test test/` coi `test/` là tên file → lỗi; phải dùng glob.)

- [ ] **Step 2: Tạo hash cho tài khoản demo**

```bash
node -e "console.log(require('bcryptjs').hashSync('demo1234', 10))"
```
Expected: một chuỗi bắt đầu bằng `$2b$10$` (60 ký tự). Dán vào Step 3.

- [ ] **Step 3: Sửa `db/setup.sql`**

`DROP TABLE` thêm `users` và bỏ `user_profile`:
```sql
DROP TABLE IF EXISTS
    survey_genres, survey_artists, user_profile,
    recently_played, mood_history, preferences,
    songs, genres, artists, users
CASCADE;
```

Thêm **trước** `preferences` (vì các bảng sau tham chiếu `users`):
```sql
-- Tai khoan nguoi dung. username: chu thuong, so, gach duoi (backend da trim + lowercase truoc khi luu)
-- role: chuan bi cho trang admin, chua dung. survey_done_at NULL = chua lam / chua bo qua khao sat gu
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,30}$'),
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    survey_done_at  TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

5 bảng cá nhân (thay bản cũ):
```sql
CREATE TABLE preferences (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emotion     TEXT NOT NULL,
    song_id     INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    score       REAL NOT NULL DEFAULT 0,
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, emotion, song_id)
);

CREATE TABLE mood_history (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emotion     TEXT NOT NULL,
    confidence  REAL,
    song_id     INTEGER REFERENCES songs(id) ON DELETE SET NULL,
    action      TEXT NOT NULL CHECK (action IN ('suggested', 'declined', 'good', 'neutral', 'bad')),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE recently_played (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id     INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    played_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE survey_artists (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id   INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, artist_id)
);

CREATE TABLE survey_genres (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    genre_id    INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, genre_id)
);

CREATE INDEX idx_mood_history_user_created ON mood_history (user_id, created_at);
CREATE INDEX idx_recently_played_user_played ON recently_played (user_id, played_at);
```

Xoá `CREATE TABLE user_profile` + `INSERT INTO user_profile`, thêm cuối file:
```sql
-- Tai khoan demo de thu khi chua co trang dang ky: demo / demo1234
INSERT INTO users (username, password_hash) VALUES ('demo', '<HASH_O_STEP_2>');
```

- [ ] **Step 4: `.env` + `.evn.example`**

`.env` thêm (chuỗi tạo bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`):
```
JWT_SECRET=<64 ky tu hex>
JWT_EXPIRES_IN=7d
```
`.evn.example` thêm `JWT_SECRET =` và `JWT_EXPIRES_IN = 7d`.

- [ ] **Step 5: Chạy và kiểm tra**

```bash
npm run db:setup
```
Expected: `Da tao 9 bang: artists, genres, mood_history, preferences, recently_played, songs, survey_artists, survey_genres, users` và `Da nap 10 bai hat.`

```bash
node -e "require('dotenv').config();const db=require('./src/config/db');db.query(\"select id,username,role from users\").then(r=>{console.log(r.rows);return db.pool.end()})"
```
Expected: `[ { id: 1, username: 'demo', role: 'user' } ]`

- [ ] **Step 6:** Lúc này `/scan-and-suggest`, `/listen-report` **sẽ lỗi** (cột `user_id` NOT NULL) cho đến hết Task 5 — báo trước cho người dùng. Cập nhật `CLAUDE.md` (thêm `users`, bỏ `user_profile`).
- [ ] **Step 7: Commit**

```bash
git add emotune-backend/db/setup.sql emotune-backend/package.json emotune-backend/package-lock.json emotune-backend/.evn.example CLAUDE.md
git commit -m "DB: bang users, user_id cho du lieu ca nhan, tai khoan demo"
```

---

### Task 2 [Người dùng]: Hàm kiểm tra dữ liệu đăng ký (TDD — test trước)

📌 Hàm thuần (không đụng DB) → test được ngay, dùng chung cho cả đăng ký lẫn đăng nhập, để `Vinh` và `vinh` luôn là một người.

**Files:**
- Create: `emotune-backend/src/services/authValidation.js`
- Test: `emotune-backend/test/authValidation.test.js`

**Interfaces — Produces:**
- `normalizeUsername(raw: any) → string` — không phải chuỗi thì trả `""`; còn lại `trim().toLowerCase()`.
- `validateCredentials(rawUsername, password) → { ok: true, username } | { ok: false, message }` — `username` trả về đã chuẩn hoá.

- [ ] **Step 1: Viết test trước** — tối thiểu các trường hợp:

| Vào (username, password) | Ra |
|---|---|
| `"  Vinh_01 "`, `"123456"` | `{ ok: true, username: "vinh_01" }` |
| `"ab"`, `"123456"` | `ok: false` (quá ngắn) |
| `"a".repeat(31)`, `"123456"` | `ok: false` (quá dài) |
| `"vinh nguyen"`, `"123456"` | `ok: false` (có dấu cách) |
| `"vĩnh"`, `"123456"` | `ok: false` (có dấu tiếng Việt) |
| `"vinh"`, `"12345"` | `ok: false` (mật khẩu < 6) |
| `undefined`, `"123456"` | `ok: false`, không ném lỗi |
| `"vinh"`, `undefined` | `ok: false`, không ném lỗi |

Ví dụ khung một test (bạn viết các test còn lại):
```js
const test = require("node:test");
const assert = require("node:assert");
const { validateCredentials } = require("../src/services/authValidation");

test("username duoc trim + chu thuong", () => {
    assert.deepStrictEqual(validateCredentials("  Vinh_01 ", "123456"), { ok: true, username: "vinh_01" });
});
```

- [ ] **Step 2:** `cd emotune-backend && npm test` → Expected: FAIL (`Cannot find module '../src/services/authValidation'`).
- [ ] **Step 3:** Viết `authValidation.js`. Gợi ý: regex `/^[a-z0-9_]{3,30}$/` kiểm tra **sau khi** chuẩn hoá; `typeof password === "string"`.
- [ ] **Step 4:** `npm test` → Expected: tất cả `pass`, `fail 0`.
- [ ] **Step 5:** Gửi Claude review → commit `git commit -m "authValidation: kiem tra username/mat khau + test"`.

---

### Task 3 [Người dùng]: `POST /auth/register` và `POST /auth/login`

📌 Đây là "cửa vào": từ đây mỗi người có `id` riêng trong token, các task sau dùng `id` này để tách dữ liệu.

**Files:**
- Create: `src/model/userModel.js`, `src/services/authService.js`, `src/controllers/authController.js`
- Modify: `src/routes/web.js`

**Interfaces:**
- Consumes: `validateCredentials` (Task 2).
- Produces:
  - `userModel.createUser(username, passwordHash) → { id, username, survey_done_at }` — trùng username thì để lỗi pg (mã `err.code === "23505"`) bay lên.
  - `userModel.findUserByUsername(username) → row có password_hash | undefined`
  - `authService.toPublicUser(row) → { id, username, surveyDone: row.survey_done_at !== null }`
  - `authService.signToken(userId) → string` — `jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })`
  - `authService.register(rawUsername, password) → { token, user }` và `authService.login(rawUsername, password) → { token, user }`. Lỗi nghiệp vụ ném `Error` có thêm `err.status` (400 / 401 / 409); controller trả `res.status(err.status || 500).json({ error: err.message })`.
  - Route: `router.post('/auth/register', authController.register)`, `router.post('/auth/login', authController.login)`.

- [ ] **Step 1:** `userModel.js` — 2 hàm trên (`createUser`, `findUserByUsername`). `RETURNING id, username, survey_done_at` cho `createUser`.
- [ ] **Step 2:** `authService.js`. Gợi ý: `bcrypt.hash(password, 10)`, `bcrypt.compare(password, row.password_hash)`. Đăng nhập: không có user **hoặc** sai mật khẩu → cùng một lỗi 401 "Tên đăng nhập hoặc mật khẩu không đúng". Đăng ký: bắt `err.code === "23505"` → 409 (không SELECT kiểm tra trước — Review Focus #1).
- [ ] **Step 3:** `authController.js` (`register` trả `201`, `login` trả `200`) + 2 route.
- [ ] **Step 4: Kiểm tra bằng curl** (Git Bash, backend đang chạy `npm run dev`):

```bash
curl -s -X POST localhost:8080/auth/register -H "Content-Type: application/json" -d '{"username":"  Vinh ","password":"123456"}'
```
Expected: HTTP 201, `{"token":"eyJ...","user":{"id":2,"username":"vinh","surveyDone":false}}` — **không** có `password_hash`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8080/auth/register -H "Content-Type: application/json" -d '{"username":"VINH","password":"123456"}'
```
Expected: `409`

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8080/auth/register -H "Content-Type: application/json" -d '{"username":"ab","password":"1"}'
```
Expected: `400`

```bash
curl -s -X POST localhost:8080/auth/login -H "Content-Type: application/json" -d '{"username":"demo","password":"demo1234"}'
```
Expected: `200`, `user.username = "demo"`.

```bash
curl -s -X POST localhost:8080/auth/login -H "Content-Type: application/json" -d '{"username":"demo","password":"sai"}'
curl -s -X POST localhost:8080/auth/login -H "Content-Type: application/json" -d '{"username":"khongco","password":"demo1234"}'
```
Expected: cả hai `401` và **cùng một** câu thông báo.

- [ ] **Step 5:** Review → commit `git commit -m "POST /auth/register, /auth/login"`.

---

### Task 4 [Người dùng]: Middleware `requireAuth` + `GET /auth/me`

📌 Middleware là "người gác cổng": đọc token một lần, gắn `req.userId`; controller phía sau không phải tự xử lý token và không thể bị giả `user_id`.

**Files:**
- Create: `src/middleware/auth.js`
- Modify: `src/controllers/authController.js`, `src/routes/web.js`

**Interfaces:**
- Produces:
  - `requireAuth(req, res, next)` — header phải dạng `Bearer <token>`; `jwt.verify` OK → `req.userId = payload.userId; next()`; mọi trường hợp khác → `401 { error: "unauthorized" }`.
  - `userModel.findUserById(id) → { id, username, survey_done_at } | undefined` — viết ở task này (lúc cần lần đầu), không lấy `password_hash`.
  - `authController.me` → `200 { id, username, surveyDone }` (dùng `findUserById(req.userId)`; không thấy user — tài khoản bị xoá — → 401).
  - Route: `router.get('/auth/me', requireAuth, authController.me)`.

- [ ] **Step 1:** Viết `requireAuth`. Gợi ý: `jwt.verify` **ném lỗi** khi sai/hết hạn → bọc `try/catch` (Review Focus #2).
- [ ] **Step 2:** `me` + route.
- [ ] **Step 3: Kiểm tra**

```bash
TOKEN=$(curl -s -X POST localhost:8080/auth/login -H "Content-Type: application/json" -d '{"username":"demo","password":"demo1234"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")
curl -s localhost:8080/auth/me -H "Authorization: Bearer $TOKEN"
```
Expected: `{"id":1,"username":"demo","surveyDone":false}`

```bash
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/auth/me
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/auth/me -H "Authorization: Bearer abc.def.ghi"
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/auth/me -H "Authorization: $TOKEN"
```
Expected: `401` cả ba, terminal backend **không** có stack trace sập server.

Token hết hạn: tạm đặt `JWT_EXPIRES_IN=5s` trong `.env`, restart, login, chờ 6 giây, gọi `/auth/me` → `401`. Trả lại `7d`.

- [ ] **Step 4:** Review → commit `git commit -m "requireAuth + GET /auth/me"`.

---

### Task 5 [Người dùng]: Thêm `user_id` vào các API cũ (web trước)

📌 Đây là chỗ hệ thống thật sự "học gu từng người": điểm, xu hướng buồn 1–3 ngày, 3 bài gần nhất đều tính riêng cho người đang đăng nhập.

**Files (sửa):**
- `src/model/suggestModel.js`, `src/services/suggestService.js`, `src/controllers/scanController.js`, `src/controllers/suggestController.js`
- `src/model/listenReportModel.js`, `src/services/listenReportService.js`, `src/controllers/listenReportController.js`
- `src/model/feedBackModel.js`, `src/services/feedBackService.js`, `src/controllers/feedBackController.js`
- `src/services/requestSongService.js`, `src/controllers/requestSongController.js`
- `src/model/moodHistoryModel.js`, `src/services/moodHistoryService.js`, `src/controllers/moodHistoryController.js`
- `src/routes/web.js`

**Interfaces — Produces (quy ước: `userId` luôn là tham số đầu tiên):**
- `suggestModel.getMoodTrend(userId, days)`, `suggestModel.getSongsByEmotion(userId, emotion)`, `suggestModel.logSuggestion(userId, emotion, confidence, songId)`
- `suggestService.checkMoodTrend(userId, emotion)`, `suggestService.generateSuggestion(userId, emotion, confidence)`
- `listenReportModel.feedBackSongListened(userId, emotion, songId, delta, action)`, `listenReportService.processListenReport(userId, emotion, songId, finishPercent)`
- `feedBackModel.updateFeedBack(userId, emotion, songId, delta, historyAction)`, `feedBackService.processFeedBack(userId, emotion, songId, action)`
- `requestSongService.processRequestSong(userId, emotion, songName)`
- `moodHistoryModel.getMoodHistoryData(userId)`, `moodHistoryService.getMoodHistoryTrend(userId)`
- Controller lấy `req.userId`. Tạm thời **tất cả** route này dùng `requireAuth`.

- [ ] **Step 1:** `suggestModel.js` — 4 chỗ phải thêm `user_id`: (a) `getMoodTrend` `WHERE user_id = $1`; (b) `LEFT JOIN preferences p ON p.song_id = s.id AND p.emotion = $2 AND p.user_id = $1`; (c) truy vấn con `SELECT song_id FROM recently_played WHERE user_id = $1 ORDER BY played_at DESC LIMIT 3`; (d) câu **fallback** cũng phải lọc `p.user_id`. `logSuggestion` INSERT thêm `user_id`.
- [ ] **Step 2:** `listenReportModel` + `feedBackModel`: INSERT thêm `user_id`; `ON CONFLICT (user_id, emotion, song_id)` (phải khớp đúng `UNIQUE` mới, nếu không Postgres báo lỗi). `recently_played` INSERT thêm `user_id`.
- [ ] **Step 3:** `moodHistoryModel`: `WHERE user_id = $1 AND ...`.
- [ ] **Step 4:** Service + controller truyền `userId`; `web.js` gắn `requireAuth` cho `/scan-and-suggest`, `/suggest`, `/listen-report`, `/feed-back`, `/request-song`, `/mood-history`.
- [ ] **Step 5:** Tìm sót: `grep -n "preferences\|mood_history\|recently_played" -r src/model` → mỗi câu SQL phải có `user_id`.
- [ ] **Step 6: Kiểm tra tách người (Review Focus #3)** — đăng ký `a1`, `b1`, lấy `TA`, `TB` như Task 4.

```bash
for i in 1 2 3 4; do curl -s -X POST localhost:8080/suggest -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -d '{"emotion":"sad","confidence":0.9}' > /dev/null; done
curl -s -X POST localhost:8080/suggest -H "Authorization: Bearer $TB" -H "Content-Type: application/json" -d '{"emotion":"sad","confidence":0.9}'
```
Expected: B nhận `"isEncourage":false` và `"emotion":"sad"` (A buồn 4 lần không ảnh hưởng B). Gọi lần thứ 5 cho A → `"isEncourage":true`.

```bash
curl -s -X POST localhost:8080/listen-report -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -d '{"emotion":"sad","songId":3,"finishPercent":1}'
curl -s -X POST localhost:8080/listen-report -H "Authorization: Bearer $TB" -H "Content-Type: application/json" -d '{"emotion":"sad","songId":3,"finishPercent":0.1}'
```
Rồi trong DBeaver/psql: `SELECT user_id, emotion, song_id, score FROM preferences;` → Expected: **2 dòng** (A `1`, B `-1`). `SELECT user_id, song_id FROM recently_played;` → mỗi người 1 dòng.

`curl -s localhost:8080/mood-history -H "Authorization: Bearer $TB"` → chỉ có lượt của B. Không token → `401`.

- [ ] **Step 7:** Review → commit `git commit -m "Them user_id vao goi y, cham diem, lich su"`.

---

### Task 8 [Người dùng]: `GET /genres`, `GET /profile`, `POST /profile`

📌 Nối tiếp khảo sát gu đang dở: giờ mỗi người một bộ lựa chọn riêng; `survey_done_at` nằm ở `users`.

**Files:**
- Create: `src/model/genreModel.js`, `src/services/genreService.js`, `src/controllers/genreController.js`, `src/services/profileService.js`, `src/controllers/profileController.js`
- Rewrite: `src/model/profileModel.js` (bỏ bản nháp: bảng `profiles` không tồn tại, `catch` rỗng nuốt lỗi)
- Modify: `src/routes/web.js`

**Interfaces — Produces:**
- `genreModel.getGenresData() → [{ id, name }]` — `GET /genres`, mẫu giống `artistModel`.
- `profileModel.getProfile(userId) → { done: boolean, artistIds: number[], genreIds: number[] }`
- `profileModel.saveProfile(userId, artistIds, genreIds)` — **1 transaction** (`db.pool.connect()` như `feedBackModel`): `DELETE` lựa chọn cũ của người đó → `INSERT` mới → `UPDATE users SET survey_done_at = NOW() WHERE id = $1`.
- `POST /profile` body `{ artistIds, genreIds }`: phải là mảng số nguyên (rỗng được = bỏ qua) → khác thì `400`; id không tồn tại (lỗi pg `23503`) → `400`. Thành công → `200 { done: true, artistIds, genreIds }`.
- Gợi ý INSERT nhiều dòng một câu: `INSERT INTO survey_artists (user_id, artist_id) SELECT $1, unnest($2::int[])`.

- [ ] **Step 1–3:** genres → getProfile → saveProfile + validate + route (`GET/POST /profile` dùng `requireAuth`).
- [ ] **Step 4: Kiểm tra**

```bash
curl -s localhost:8080/genres                                                       # 4 the loai
curl -s localhost:8080/profile -H "Authorization: Bearer $TA"                       # {"done":false,"artistIds":[],"genreIds":[]}
curl -s -X POST localhost:8080/profile -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -d '{"artistIds":[1,2],"genreIds":[1]}'
curl -s localhost:8080/profile -H "Authorization: Bearer $TB"                       # B van done:false
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8080/profile -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -d '{"artistIds":[999],"genreIds":[]}'   # 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8080/profile -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -d '{"artistIds":"1"}'   # 400
curl -s localhost:8080/auth/me -H "Authorization: Bearer $TA"                       # surveyDone:true
```
Gửi lại `POST /profile` với `[3]` → `GET` chỉ còn `[3]` (lựa chọn cũ bị thay).

- [ ] **Step 5:** Review → commit `git commit -m "Khao sat gu theo nguoi dung: GET /genres, GET/POST /profile"`.

---

### Task 9 [Claude + Người dùng]: Cấu hình frontend + `src/api.js`

📌 Một chỗ duy nhất gắn token cho mọi request; quên gắn ở một component là API đó trả 401.

**Files:**
- [Claude] Modify `emotune-frontend/src/config.js`; Create `emotune-frontend/.env.example`
- [Người dùng] Create `src/api.js`; Modify `EmotionScanner.jsx`, `MusicPlayer.jsx`, `SideBar.jsx` (đổi `axios.x(\`${API_URL}/...\`)` → `api.x('/...')`).

**Interfaces — Produces:**
- `config.js`: `API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"`.
- `api.js`: `export default api` (axios instance `baseURL: API_URL`); `getToken()`, `setToken(token)`, `clearToken()` (key `localStorage` `"emotune_token"`); request interceptor gắn `Authorization` nếu có token; response interceptor: `401` → `clearToken()` + `window.location.href = "/login"`.

- [ ] **Step 1 [Claude]:** `config.js` + `.env.example`:
```
# Web thuong: de trong. May khac / dien thoai: IP may chay backend
VITE_API_URL=http://localhost:8080
```
- [ ] **Step 2 [Người dùng]:** `api.js` + đổi 3 component. Gợi ý: `api.interceptors.request.use(config => { ...; return config })`.
- [ ] **Step 3:** `npm run lint` (chỉ còn 2 lỗi/cảnh báo cũ) + `npm run build` OK. Mở web khi chưa có trang login: DevTools → Application → Local Storage → đặt tay `emotune_token` = token demo → quét chạy được; xoá token → bị chuyển về `/login` (trang trắng cũng được, Task 10 làm trang).
- [ ] **Step 4:** Review → commit `git commit -m "Frontend: api.js gan token"`.

---

### Task 10 [Người dùng JSX + Claude SCSS/Figma]: Đăng nhập, đăng ký, chặn route, header

📌 Trang đăng nhập là cổng của web thường; `AuthContext` giữ `user` để header chào đúng tên và HomePage biết đã làm khảo sát chưa.

**Files:**
- [Người dùng] Create `src/contexts/AuthContext.jsx`, `src/components/RequireAuth.jsx`, `src/pages/LoginPage.jsx`, `src/pages/RegisterPage.jsx`; Modify `src/App.jsx`, `src/components/Header.jsx`
- [Claude] Create `src/pages/AuthPage.scss` (theo class người dùng đặt, co giãn tới 360px); sửa Header.scss phần tên + nút đăng xuất; sửa Figma Sign in/Sign up (Email → Tên đăng nhập, bỏ ngày sinh, bỏ Apple/Facebook)

**Interfaces — Produces:**
- `AuthProvider` + `useAuth() → { user, loading, login(username, password), register(username, password), logout(), refreshUser() }`. Lúc mở trang: có token → `GET /auth/me` → `user`; lỗi → `null`. `user` có dạng `{ id, username, surveyDone }`.
- `RequireAuth` — `loading` → chưa vẽ gì; `user = null` → `<Navigate to="/login" replace />`; còn lại `<Outlet />`.
- `App.jsx`: `/login`, `/register` nằm **ngoài** `MainLayout`; `/`, `/settings` nằm trong `RequireAuth`.
- Register: ô *Nhập lại mật khẩu* kiểm tra trùng ở frontend; hiện `err.response.data.error` của backend (409/400).

- [ ] **Step 1 [Claude]:** sửa Figma, gửi ảnh chụp để người dùng dựng JSX theo.
- [ ] **Step 2 [Người dùng]:** `AuthContext` → `RequireAuth` → `App.jsx`.
- [ ] **Step 3 [Người dùng]:** `LoginPage`, `RegisterPage` (JSX + state) → gửi class name → **[Claude]** viết `AuthPage.scss`.
- [ ] **Step 4 [Người dùng]:** Header: thay icon user bằng `user.username` + nút đăng xuất → **[Claude]** SCSS.
- [ ] **Step 5: Kiểm tra bằng tay**
  - Chưa đăng nhập mở `/` → về `/login`.
  - Đăng ký `c1` / mật khẩu nhập lại sai → báo lỗi, không gọi API. Nhập đúng → vào `/`, header "c1".
  - Đăng ký lại `C1` → hiện "Tên đăng nhập này đã có người dùng".
  - Đăng xuất → về `/login`; nút Back của trình duyệt không vào lại được `/`.
  - Sửa tay token trong Local Storage thành `abc` → F5 → về `/login`.
  - DevTools chế độ điện thoại 360px: không cuộn ngang.
- [ ] **Step 6:** `npm run lint` + `npm run build` → review → commit `git commit -m "Trang dang nhap / dang ky, chan route, header ten nguoi dung"`.

---

### Task 11 [Người dùng JSX + Claude SCSS]: Form khảo sát gu (làm khi kịp)

📌 Cold start: người mới chưa có điểm nào → khảo sát cho hệ gợi ý một điểm xuất phát; người làm xong `surveyDone = true` không bị hỏi lại.

**Files:**
- [Người dùng] Create `src/components/SurveyForm.jsx`; Modify `src/pages/HomePage.jsx`
- [Claude] Create `src/components/SurveyForm.scss` (theo Figma `255:5`, `257:114`, component `254:11`, `254:30`, `257:98`)

**Interfaces:**
- Consumes: `GET /artists`, `GET /genres`, `POST /profile`, `useAuth().refreshUser()`.
- Produces: `<SurveyForm onDone={() => void} />` — lọc tìm kiếm ở frontend, không phân biệt dấu (`str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()`, nhớ `đ` → `d`); "Xem thêm" bằng `.slice`; nút "Bỏ qua" gửi 2 mảng rỗng. Ca sĩ không có `avatar` → hiện chữ viết tắt (NP, GU…).
- `HomePage`: `user.surveyDone === false` → hiện `SurveyForm` thay nút "Bắt đầu".

- [ ] **Step 1–3:** JSX → class name → Claude SCSS.
- [ ] **Step 4: Kiểm tra:** tài khoản mới → thấy form; gõ "son tung" tìm ra "Sơn Tùng M-TP"; gõ "da" ra "Da LAB"; chọn rồi gửi → form biến mất, F5 không hiện lại; DB `survey_artists` có đúng `user_id`. Tài khoản khác vẫn thấy form. "Bỏ qua" → `surveyDone = true`, 2 bảng không có dòng nào.
- [ ] **Step 5:** commit `git commit -m "Form khao sat gu lan dau"`. (Điểm thưởng +0.5 ca sĩ / +0.5 thể loại trong `suggestService` là plan riêng, sau task này.)

---

## Self-review (đã chạy)

- **Phủ spec:** mục 3 → Task 1; 4.1 → Task 1; 4.2 → Task 4; 4.3 → Task 3, 4, 8; 4.4 → Task 5 (`/suggest` cũng thêm `requireAuth` — spec sót route này); 5.1 → Task 9; 5.2 → Task 9–11; 6 → các bước kiểm tra Task 3, 4; 7 → Task 2 (unit), 3–8 (curl); 9 → nhãn [Claude]/[Người dùng].
- **Tên hàm thống nhất:** `userId` luôn là tham số đầu; `getToken/setToken/clearToken`, `useAuth` chỉ định nghĩa một lần.
- **Lệch so với mẫu skill (cố ý):** task [Người dùng] không có code hoàn chỉnh — theo `CLAUDE.md`.

# Nhiều tài khoản + đăng nhập (web và hộp nhạc) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠ **Ngoại lệ của dự án này (CLAUDE.md thắng skill):** người dùng **tự code** backend/frontend. Mỗi task ghi rõ **[Claude]** hay **[Người dùng]**. Ở task [Người dùng], plan chỉ đưa **giao diện hàm, test case, lệnh kiểm tra, gợi ý nhỏ** — không dán file hoàn chỉnh. Claude hướng dẫn **từng file một**, mỗi bước kèm chú thích 📌 (đang làm gì / ý nghĩa cho hệ thống), chờ người dùng gửi code → review → mới sang bước sau. Subagent **không** được tự viết code cho task [Người dùng].

**Goal:** Mỗi người có tài khoản riêng (username + mật khẩu); điểm sở thích, lịch sử cảm xúc, bài vừa nghe, khảo sát gu tách theo người; dùng được trên web (laptop/điện thoại) và hộp nhạc Pi qua nút "Dùng hộp nhạc".

**Architecture:** Thêm bảng `users` + `devices`, gắn `user_id` vào 5 bảng dữ liệu cá nhân. Backend phát JWT khi đăng nhập; middleware `requireAuth` (web) và `resolveUser` (web hoặc hộp nhạc qua header `X-Device-Id: box`) gắn `req.userId`; mọi model nhận `userId` làm **tham số đầu tiên**. Frontend dùng một axios instance chung (`src/api.js`) tự gắn token/`X-Device-Id`; trên Pi (`VITE_DEVICE_ID=box`) không có trang đăng nhập mà hỏi `GET /devices/box/current` mỗi 3 giây.

**Tech Stack:** Node 24 + Express 5 + `pg`, `bcryptjs`, `jsonwebtoken`, `node:test`; React 19 + Vite + react-router 6 + axios + SCSS; PostgreSQL 17.

**Spec:** `docs/superpowers/specs/2026-10-04-multi-user-accounts-design.md`

## Global Constraints

- Username: `trim()` + chữ thường trước khi kiểm tra/lưu/so; đúng regex `^[a-z0-9_]{3,30}$`. Mật khẩu ≥ 6 ký tự.
- Mật khẩu băm bằng `bcryptjs` (cost 10). **Không bao giờ** trả `password_hash` ra API.
- JWT gửi qua `Authorization: Bearer <token>`; `.env`: `JWT_SECRET=<chuỗi ngẫu nhiên>`, `JWT_EXPIRES_IN=7d`. Payload chỉ `{ userId }`.
- `user_id` **chỉ lấy từ `req.userId`** (do middleware gắn), không bao giờ đọc từ URL/body.
- **Mọi câu SQL đụng tới `preferences`, `mood_history`, `recently_played`, `survey_artists`, `survey_genres` phải có điều kiện/giá trị `user_id`.**
- Lỗi: `400` dữ liệu sai · `401 { error: "unauthorized" }` · `401` đăng nhập sai với đúng một câu "Tên đăng nhập hoặc mật khẩu không đúng" · `403` nhả hộp của người khác · `409` "Tên đăng nhập này đã có người dùng" · `409 { error: "box_free", message: "Chưa có ai dùng hộp nhạc" }`.
- `user` trả về trong register/login/me: `{ id, username, surveyDone }`.
- Hộp nhạc không hoạt động > **30 phút** → coi như trống.
- `GET /artists`, `/music/*`, `/avatars/*`, `GET /genres`, `GET /devices/box/current` không cần đăng nhập.
- Mọi lời gọi `gpio-service` giữ `.catch(() => {})` — lõi không phụ thuộc phần cứng.
- Bình luận code tiếng Việt (không dấu như code hiện tại cũng được), theo mẫu `routes/web.js → controllers → services → model`; SQL chỉ nằm trong `model/`.

## Review Focus

1. **Trùng username khác hoa/thường hoặc 2 người đăng ký cùng lúc** (`Vinh` rồi `vinh`) → `409`, không phải `500`: bắt mã lỗi Postgres `23505` thay vì chỉ "SELECT trước rồi INSERT". → test ở Task 3.
2. **Token sai chữ ký / hết hạn / thiếu chữ `Bearer`** → `401`, server không sập và không trả `500` (`jwt.verify` ném lỗi → phải bắt). → test ở Task 4.
3. **Rò dữ liệu giữa người** ở chỗ dễ quên: truy vấn con `recently_played` (3 bài gần nhất), câu **fallback** trong `getSongsByEmotion`, và xu hướng buồn 1–3 ngày → A buồn nhiều không làm B bị gợi ý "động viên"; A vừa nghe 3 bài thì B vẫn được gợi ý 3 bài đó. → test ở Task 5.
4. **Đổi người giữ hộp khi đang phát** → Pi dừng bài, chào người mới, và bài đang dở **không** gửi `listen-report` (không cộng/trừ điểm vào người mới). → test ở Task 12.
5. **Hộp không hoạt động đúng mốc 30 phút** (29 phút vẫn của người cũ, 31 phút là trống) và hộp chưa từng có ai (`last_active_at = NULL`). → test ở Task 6.

---

## Sơ đồ file

**Backend (`emotune-backend/`)**

| File | Trách nhiệm | Task |
|---|---|---|
| `db/setup.sql` (sửa) | 10 bảng + `users`/`devices` + tài khoản demo | 1 |
| `package.json` (sửa) | thêm `bcryptjs`, `jsonwebtoken`, script `test` | 1 |
| `.env` / `.evn.example` (sửa) | `JWT_SECRET`, `JWT_EXPIRES_IN` | 1 |
| `src/services/authValidation.js` (mới) | hàm thuần chuẩn hoá + kiểm tra username/mật khẩu | 2 |
| `test/authValidation.test.js` (mới) | unit test cho file trên | 2 |
| `src/model/userModel.js` (mới) | SQL bảng `users` | 3 |
| `src/services/authService.js` (mới) | băm/so mật khẩu, ký JWT, đăng ký/đăng nhập | 3 |
| `src/controllers/authController.js` (mới) | `register`, `login`, `me` | 3, 4 |
| `src/middleware/auth.js` (mới) | `requireAuth`, `resolveUser`, hàm thuần `decideBoxUser` | 4, 6 |
| `test/decideBoxUser.test.js` (mới) | unit test hộp trống / 30 phút | 6 |
| `src/model/suggestModel.js`, `listenReportModel.js`, `feedBackModel.js`, `moodHistoryModel.js` (sửa) | thêm `userId` | 5 |
| các service/controller tương ứng (sửa) | truyền `req.userId` xuống | 5 |
| `src/model/deviceModel.js`, `src/services/deviceService.js`, `src/controllers/deviceController.js` (mới) | claim / release / current / touch | 6, 7 |
| `src/model/genreModel.js`, `genreService.js`, `genreController.js` (mới) | `GET /genres` | 8 |
| `src/model/profileModel.js` (viết lại), `profileService.js`, `profileController.js` (mới) | `GET/POST /profile` | 8 |
| `src/routes/web.js` (sửa) | gắn route + middleware | 3–8 |

**Frontend (`emotune-frontend/`)**

| File | Trách nhiệm | Task |
|---|---|---|
| `src/config.js` (sửa), `.env.example` (mới) | `API_URL`, `DEVICE_ID`, `IS_BOX` từ `VITE_*` | 9 |
| `src/api.js` (mới) | axios instance + token + `X-Device-Id` + xử lý 401 | 9 |
| `src/contexts/AuthContext.jsx` (mới) | `user`, `login`, `register`, `logout` | 10 |
| `src/components/RequireAuth.jsx` (mới) | chặn route khi chưa đăng nhập | 10 |
| `src/pages/LoginPage.jsx`, `RegisterPage.jsx` (mới) + `AuthPage.scss` (Claude) | 2 trang | 10 |
| `src/components/Header.jsx` (sửa) | tên người dùng + đăng xuất | 10 |
| `src/components/SurveyForm.jsx` (mới) + `SurveyForm.scss` (Claude) | khảo sát gu | 11 |
| `src/components/BoxControl.jsx` (mới) + `BoxControl.scss` (Claude) | nút Dùng / Rời hộp nhạc | 12 |
| `src/box.js` (mới) | hook `useBoxOwner()` hỏi chủ hộp mỗi 3s | 12 |
| `src/pages/HomePage.jsx` (sửa) | khảo sát, màn chờ hộp nhạc | 11, 12 |

**Mức tối thiểu cho demo HIC 15/10:** Task 1 → 7, 9, 10, 12, 14. Task 8 + 11 (khảo sát gu) làm khi kịp; Task 13 tuỳ chọn.

---

### Task 0 [Claude]: Chốt việc dở trước khi bắt đầu

**Files:** `NOTES.md`, `.claude/settings.json` (chỉ xem)

- [ ] **Step 1:** `git diff .claude/settings.json` → cho người dùng xem, hỏi giữ hay bỏ.
- [ ] **Step 2:** Ghi vào `NOTES.md`: người dùng **đã chốt mua LD2410C** (04/10); spec nhiều tài khoản đã duyệt; plan này.
- [ ] **Step 3 (khi người dùng đồng ý):** commit toàn bộ thay đổi phiên 03–04/10.

```bash
git add -A emotune-backend emotune-frontend docs CLAUDE.md NOTES.md
git commit -m "DB setup.sql 9 bang, GET /artists, giao dien NYX, spec + plan nhieu tai khoan"
```

---

### Task 1 [Claude]: DB mới + thư viện + cấu hình

**Files:**
- Modify: `emotune-backend/db/setup.sql`, `emotune-backend/package.json`, `emotune-backend/.env`, `emotune-backend/.evn.example`

**Interfaces — Produces:** bảng `users(id, username, password_hash, role, survey_done_at, created_at)`, `devices(id, name, current_user_id, claimed_at, last_active_at)`; cột `user_id` ở 5 bảng; tài khoản `demo`/`demo1234` (id = 1); dòng `devices` id `'box'`; `npm test` chạy mọi file `test/**/*.test.js`.

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

`DROP TABLE` thêm `devices, users` và bỏ `user_profile`:
```sql
DROP TABLE IF EXISTS
    devices, survey_genres, survey_artists, user_profile,
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

-- Hop nhac: moi hop 1 dong (hien chi co 'box'). current_user_id NULL = hop trong
-- last_active_at cu hon 30 phut -> backend coi nhu hop trong
CREATE TABLE devices (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    current_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    claimed_at      TIMESTAMP,
    last_active_at  TIMESTAMP
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

-- Hop nhac duy nhat, chua ai dung
INSERT INTO devices (id, name) VALUES ('box', 'Hộp nhạc EmoTune');
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
Expected: `Da tao 10 bang: artists, devices, genres, mood_history, preferences, recently_played, songs, survey_artists, survey_genres, users` và `Da nap 10 bai hat.`

```bash
node -e "require('dotenv').config();const db=require('./src/config/db');db.query(\"select id,username,role from users\").then(r=>{console.log(r.rows);return db.pool.end()})"
```
Expected: `[ { id: 1, username: 'demo', role: 'user' } ]`

- [ ] **Step 6:** Lúc này `/scan-and-suggest`, `/listen-report` **sẽ lỗi** (cột `user_id` NOT NULL) cho đến hết Task 5 — báo trước cho người dùng. Cập nhật `CLAUDE.md` (9 bảng → 10 bảng, bỏ `user_profile`).
- [ ] **Step 7: Commit**

```bash
git add emotune-backend/db/setup.sql emotune-backend/package.json emotune-backend/package-lock.json emotune-backend/.evn.example CLAUDE.md
git commit -m "DB: bang users + devices, user_id cho du lieu ca nhan, tai khoan demo"
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
  - `userModel.findUserById(id) → { id, username, survey_done_at } | undefined`
  - `authService.toPublicUser(row) → { id, username, surveyDone: row.survey_done_at !== null }`
  - `authService.signToken(userId) → string` — `jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })`
  - `authService.register(rawUsername, password) → { token, user }` và `authService.login(rawUsername, password) → { token, user }`. Lỗi nghiệp vụ ném `Error` có thêm `err.status` (400 / 401 / 409); controller trả `res.status(err.status || 500).json({ error: err.message })`.
  - Route: `router.post('/auth/register', authController.register)`, `router.post('/auth/login', authController.login)`.

- [ ] **Step 1:** `userModel.js` — 3 hàm trên. `RETURNING id, username, survey_done_at` cho `createUser`.
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
- Controller lấy `req.userId`. Tạm thời **tất cả** route này dùng `requireAuth` (Task 6 đổi 4 route sang `resolveUser`).

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

### Task 6 [Người dùng]: `resolveUser` cho hộp nhạc (hàm thuần trước, TDD)

📌 Hộp Pi không gõ được mật khẩu → nó "mượn" người đang giữ hộp. Tách phần quyết định ra hàm thuần để test được các mốc 30 phút mà không cần DB.

**Files:**
- Modify: `src/middleware/auth.js`, `src/routes/web.js`, `src/controllers/scanController.js`
- Create: `src/model/deviceModel.js`, `test/decideBoxUser.test.js`

**Interfaces:**
- Produces:
  - `decideBoxUser(device, now) → number | null` — `device` là `{ current_user_id, last_active_at }` hoặc `undefined`; trả `null` nếu không có device, không có người, `last_active_at` là `null`, hoặc `now - last_active_at > 30 phút`. Hằng `BOX_IDLE_MS = 30 * 60 * 1000`.
  - `deviceModel.getDevice(id) → { id, current_user_id, last_active_at } | undefined`
  - `deviceModel.touchDevice(id)` — `UPDATE devices SET last_active_at = NOW() WHERE id = $1`
  - `resolveUser(req, res, next)` — có header `Authorization` → xử lý y như `requireAuth`; không có mà có `X-Device-Id` → `getDevice` → `decideBoxUser` → có người: `req.userId`, `req.deviceId`, `next()`; trống → `409 { error: "box_free", message: "Chưa có ai dùng hộp nhạc" }`; không có cả hai → `401`. Header `X-Device-Id` không tồn tại trong bảng → coi như trống (409).

- [ ] **Step 1: Test trước** (`now = new Date("2026-10-10T10:00:00")`):

| device | Ra |
|---|---|
| `undefined` | `null` |
| `{ current_user_id: null, last_active_at: null }` | `null` |
| `{ current_user_id: 2, last_active_at: null }` | `null` |
| `{ current_user_id: 2, last_active_at: now - 29 phút }` | `2` |
| `{ current_user_id: 2, last_active_at: now - 30 phút }` | `2` (đúng mốc vẫn còn) |
| `{ current_user_id: 2, last_active_at: now - 31 phút }` | `null` |

- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** viết `decideBoxUser` + `deviceModel`. **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Viết `resolveUser`; đổi `/scan-and-suggest`, `/listen-report`, `/feed-back`, `/request-song` sang `resolveUser` (`/suggest`, `/mood-history` giữ `requireAuth`). Trong `scanController`: có `req.deviceId` → `deviceModel.touchDevice(req.deviceId)` sau khi gợi ý xong.
- [ ] **Step 6: Kiểm tra**

```bash
curl -s -X POST localhost:8080/listen-report -H "X-Device-Id: box" -H "Content-Type: application/json" -d '{"emotion":"sad","songId":3,"finishPercent":1}'
```
Expected: `409 {"error":"box_free",...}` (hộp chưa ai giữ). Với `Authorization` thì vẫn `200` như Task 5.

- [ ] **Step 7:** Review → commit `git commit -m "resolveUser: dung hop nhac theo nguoi dang giu hop"`.

---

### Task 7 [Người dùng]: API hộp nhạc — claim / release / current

📌 Nút "Dùng hộp nhạc" trên laptop/điện thoại gọi `claim`; Pi hỏi `current` mỗi 3 giây để biết chào ai.

**Files:**
- Modify: `src/model/deviceModel.js`, `src/routes/web.js`
- Create: `src/services/deviceService.js`, `src/controllers/deviceController.js`

**Interfaces — Produces:**
- `deviceModel.claimDevice(id, userId)` — `SET current_user_id = $2, claimed_at = NOW(), last_active_at = NOW()`
- `deviceModel.releaseDevice(id, userId) → số dòng đổi` — `UPDATE ... SET current_user_id = NULL WHERE id = $1 AND current_user_id = $2` (0 dòng → service ném 403)
- `deviceModel.getDeviceWithUser(id) → { current_user_id, last_active_at, username } | undefined` (LEFT JOIN `users`)
- `deviceService.getCurrentUser(id) → { id, username } | null` — dùng **lại** `decideBoxUser` (hết 30 phút → `null`)
- Route: `POST /devices/:id/claim` (`requireAuth`), `POST /devices/:id/release` (`requireAuth`), `GET /devices/:id/current` (không bảo vệ) → `{ user: { id, username } }` hoặc `{ user: null }`. Id không tồn tại → `404`.

- [ ] **Step 1–3:** model → service → controller + route.
- [ ] **Step 4: Kiểm tra**

```bash
curl -s localhost:8080/devices/box/current                                  # {"user":null}
curl -s -X POST localhost:8080/devices/box/claim -H "Authorization: Bearer $TA"
curl -s localhost:8080/devices/box/current                                  # {"user":{"id":..,"username":"a1"}}
curl -s -X POST localhost:8080/scan-and-suggest -H "X-Device-Id: box" -H "Content-Type: application/json" -d '{"image":"x"}' -o /dev/null -w "%{http_code}\n"   # khong con 409 (Flask tra loi anh / no_face)
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8080/devices/box/release -H "Authorization: Bearer $TB"   # 403
curl -s -X POST localhost:8080/devices/box/claim -H "Authorization: Bearer $TB"
curl -s localhost:8080/devices/box/current                                  # username b1
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/devices/khongco/current   # 404
```

Tự nhả 30 phút: `UPDATE devices SET last_active_at = NOW() - INTERVAL '31 minutes' WHERE id = 'box';` → `current` trả `{"user":null}`.

- [ ] **Step 5:** Review → commit `git commit -m "API hop nhac: claim, release, current"`.

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

📌 Một chỗ duy nhất gắn token / `X-Device-Id` cho mọi request; quên gắn ở một component là API đó trả 401.

**Files:**
- [Claude] Modify `emotune-frontend/src/config.js`; Create `emotune-frontend/.env.example`
- [Người dùng] Create `src/api.js`; Modify `EmotionScanner.jsx`, `MusicPlayer.jsx`, `SideBar.jsx` (đổi `axios.x(\`${API_URL}/...\`)` → `api.x('/...')`). `hardware.js` **giữ** axios thường (gọi gpio-service, không cần token).

**Interfaces — Produces:**
- `config.js`: `API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"`, `DEVICE_ID = import.meta.env.VITE_DEVICE_ID || null`, `IS_BOX = DEVICE_ID !== null`, `GPIO_URL` giữ nguyên.
- `api.js`: `export default api` (axios instance `baseURL: API_URL`); `getToken()`, `setToken(token)`, `clearToken()` (key `localStorage` `"emotune_token"`); request interceptor gắn `Authorization` nếu có token, gắn `X-Device-Id` nếu `DEVICE_ID`; response interceptor: `401` và **không phải** hộp nhạc → `clearToken()` + `window.location.href = "/login"`.

- [ ] **Step 1 [Claude]:** `config.js` + `.env.example`:
```
# Web thuong: de trong. May khac / dien thoai: IP may chay backend
VITE_API_URL=http://localhost:8080
# Chi dat tren Pi (hop nhac): VITE_DEVICE_ID=box
VITE_DEVICE_ID=
```
- [ ] **Step 2 [Người dùng]:** `api.js` + đổi 3 component. Gợi ý: `api.interceptors.request.use(config => { ...; return config })`.
- [ ] **Step 3:** `npm run lint` (chỉ còn 2 lỗi/cảnh báo cũ) + `npm run build` OK. Mở web khi chưa có trang login: DevTools → Application → Local Storage → đặt tay `emotune_token` = token demo → quét chạy được; xoá token → bị chuyển về `/login` (trang trắng cũng được, Task 10 làm trang).
- [ ] **Step 4:** Review → commit `git commit -m "Frontend: api.js gan token + X-Device-Id"`.

---

### Task 10 [Người dùng JSX + Claude SCSS/Figma]: Đăng nhập, đăng ký, chặn route, header

📌 Trang đăng nhập là cổng của web thường; `AuthContext` giữ `user` để header chào đúng tên và HomePage biết đã làm khảo sát chưa.

**Files:**
- [Người dùng] Create `src/contexts/AuthContext.jsx`, `src/components/RequireAuth.jsx`, `src/pages/LoginPage.jsx`, `src/pages/RegisterPage.jsx`; Modify `src/App.jsx`, `src/components/Header.jsx`
- [Claude] Create `src/pages/AuthPage.scss` (theo class người dùng đặt, co giãn tới 360px); sửa Header.scss phần tên + nút đăng xuất; sửa Figma Sign in/Sign up (Email → Tên đăng nhập, bỏ ngày sinh, bỏ Apple/Facebook)

**Interfaces — Produces:**
- `AuthProvider` + `useAuth() → { user, loading, login(username, password), register(username, password), logout(), refreshUser() }`. Lúc mở trang: có token → `GET /auth/me` → `user`; lỗi → `null`. `user` có dạng `{ id, username, surveyDone }`.
- `RequireAuth` — `loading` → chưa vẽ gì; `user = null` → `<Navigate to="/login" replace />`; còn lại `<Outlet />`.
- `App.jsx`: `/login`, `/register` nằm **ngoài** `MainLayout`; `/`, `/settings` nằm trong `RequireAuth`. Nếu `IS_BOX` → `/` **không** bọc `RequireAuth`.
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
- `HomePage`: web thường + `user.surveyDone === false` → hiện `SurveyForm` thay nút "Bắt đầu". Hộp nhạc (`IS_BOX`) **không bao giờ** hiện form.

- [ ] **Step 1–3:** JSX → class name → Claude SCSS.
- [ ] **Step 4: Kiểm tra:** tài khoản mới → thấy form; gõ "son tung" tìm ra "Sơn Tùng M-TP"; gõ "da" ra "Da LAB"; chọn rồi gửi → form biến mất, F5 không hiện lại; DB `survey_artists` có đúng `user_id`. Tài khoản khác vẫn thấy form. "Bỏ qua" → `surveyDone = true`, 2 bảng không có dòng nào.
- [ ] **Step 5:** commit `git commit -m "Form khao sat gu lan dau"`. (Điểm thưởng +0.5 ca sĩ / +0.5 thể loại trong `suggestService` là plan riêng, sau task này.)

---

### Task 12 [Người dùng JSX + Claude SCSS]: Nút "Dùng hộp nhạc" + màn chờ trên Pi

📌 Đây là cầu nối HIC: người đăng nhập trên laptop/điện thoại "trao" tài khoản cho hộp; Pi chỉ cần hỏi định kỳ là biết đang phục vụ ai.

**Files:**
- [Người dùng] Create `src/components/BoxControl.jsx`, `src/box.js`; Modify `src/pages/HomePage.jsx`
- [Claude] Create `src/components/BoxControl.scss`; màn chờ trong `HomePage` (class do người dùng đặt)

**Interfaces — Produces:**
- `<BoxControl />` (chỉ web thường): `GET /devices/box/current` khi mở → nếu chủ hộp là mình: nút "Rời hộp nhạc" (`POST /devices/box/release`), ngược lại "Dùng hộp nhạc" (`POST /devices/box/claim`) + dòng "Hộp đang được dùng bởi X" nếu có người khác.
- `useBoxOwner() → { owner: { id, username } | null, ready: boolean }` — hỏi `GET /devices/box/current` mỗi **3000 ms**, dọn `clearInterval` khi unmount; lỗi mạng → giữ giá trị cũ.
- `HomePage` khi `IS_BOX`:
  - `owner = null` → màn chờ "Mở web trên điện thoại hoặc laptop, đăng nhập rồi bấm *Dùng hộp nhạc*"; nút chạm 1 **không** bắt đầu quét; `setLed('off')`.
  - Có người → "Xin chào, {username}" → luồng cũ.
  - `owner.id` đổi (hoặc thành `null`) khi đang quét/phát → `setStarted(false)` + `setSuggestResult(null)` → `MusicPlayer` bị gỡ (không gọi `finishAndSend`, nên **không** gửi `listen-report`).
  - `/scan-and-suggest` trả `409 box_free` → về màn chờ.

- [ ] **Step 1–3:** `box.js` → `BoxControl` → `HomePage` → Claude SCSS.
- [ ] **Step 4: Kiểm tra trên laptop** (2 cửa sổ: thường + ẩn danh; cửa sổ hộp chạy frontend thứ hai `VITE_DEVICE_ID=box npx vite --port 5174`):
  - Hộp trống → `:5174` hiện màn chờ, nút ▶ / nút chạm không bắt đầu.
  - Cửa sổ A bấm "Dùng hộp nhạc" → ≤ 3s `:5174` chào A → quét → phát → nghe hết → DB `preferences` dòng của A.
  - **Review Focus #4:** đang phát bài cho A, cửa sổ B bấm "Dùng hộp nhạc" → ≤ 3s nhạc dừng, chào B; DB **không** có `listen-report` mới (không thêm dòng `mood_history` action `good/bad/neutral`) cho cả A lẫn B ở bài đó.
  - B bấm "Rời hộp nhạc" → hộp về màn chờ; A bấm "Rời" lúc hộp của B → báo lỗi 403 dễ hiểu.
- [ ] **Step 5:** `npm run lint` + `npm run build` → review → commit `git commit -m "Hop nhac: nut Dung/Roi hop nhac, man cho tren Pi"`.

---

### Task 13 [Claude, tuỳ chọn]: OLED chào theo người giữ hộp

**Files:** Modify `gpio-service/gpio_service.py`, `gpio-service/test_presence.py`

- [ ] Thêm trạng thái `/led {state: "login"}` → OLED "Dang nhap tren / dien thoai"; `HomePage` (IS_BOX) gửi `setLed('login')` khi `owner = null`. `test_presence.py` thêm 1 ca cho trạng thái mới → `ALL OK`. Commit `git commit -m "OLED: man cho dang nhap"`.

---

### Task 14 [Claude hướng dẫn, người dùng làm trên Pi]: Triển khai Pi + thử thật

📌 Code mới dùng bảng `users`/`devices` → DB trên Pi phải tạo lại (điểm thử cũ trên Pi mất — đã chấp nhận trong spec).

- [ ] **Step 1:** Laptop `git push`. Pi: theo mục 5 `NOTES.md` dọn bản `scp` → `git pull`.
- [ ] **Step 2:** Pi `emotune-backend`: `npm install`, thêm `JWT_SECRET`/`JWT_EXPIRES_IN` vào `.env`, `npm run db:setup`.
- [ ] **Step 3:** Pi `emotune-frontend/.env.local`: `VITE_DEVICE_ID=box` (`VITE_API_URL` để mặc định `localhost:8080`).
- [ ] **Step 4:** Laptop chạy frontend riêng (web thường) trỏ vào backend trên Pi: `emotune-frontend/.env.local` → `VITE_API_URL=http://<IP Pi>:8080` (IP lấy bằng `hostname -I` trên Pi; điện thoại Android thường **không** hiểu `raspberrypi.local`) → `npm run dev -- --host`. Điện thoại mở `http://192.168.137.1:5173`.
- [ ] **Step 5: Thử thật (spec mục 7.3):** laptop đăng nhập A, điện thoại đăng nhập B (cùng hotspot); điện thoại bấm "Dùng hộp nhạc" → Pi chào B → chạm nút 1 → quét → phát → nghe hết → `preferences` có dòng của B. Laptop A bấm "Dùng hộp nhạc" → Pi dừng, chào A.
- [ ] **Step 6 [Claude]:** cập nhật `NOTES.md` (cách chạy mới, `.env.local` trên Pi/laptop) + `CLAUDE.md` (kiến trúc: auth, `devices`). Commit.

---

## Self-review (đã chạy)

- **Phủ spec:** mục 3 → Task 1; 4.1 → Task 1; 4.2 → Task 4, 6; 4.3 → Task 3, 4, 7, 8; 4.4 → Task 5, 6 (`/suggest` cũng thêm `requireAuth` — spec sót route này); 5.1 → Task 9, 14; 5.2 → Task 9–12; 5.3 → Task 12, 13; 6 → các bước kiểm tra Task 3, 4, 6, 7, 12; 7 → Task 2, 6 (unit), 3–8 (curl), 14 (thật); 9 → nhãn [Claude]/[Người dùng].
- **Tên hàm thống nhất:** `userId` luôn là tham số đầu; `decideBoxUser` dùng chung ở Task 6 và 7; `getToken/setToken/clearToken`, `useAuth`, `useBoxOwner` chỉ định nghĩa một lần.
- **Lệch so với mẫu skill (cố ý):** task [Người dùng] không có code hoàn chỉnh — theo `CLAUDE.md`.

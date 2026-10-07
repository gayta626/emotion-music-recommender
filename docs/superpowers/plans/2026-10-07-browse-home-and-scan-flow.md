# Trang chủ duyệt nhạc + luồng quét mới — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home thành trang duyệt nhạc kiểu Spotify; màn quét chỉ hiện khi mở web (mỗi phiên), bấm icon record-circle, hoặc khi người dùng rảnh ≥ 60 giây lúc hết bài; khung phát lớn chuyển sang `/now-playing`.

**Architecture:** `HomePage` hiện tại tách thành `PlayerHost` (luôn sống trong `MainLayout`, giữ trạng thái phát + thanh phát + khung lớn ở `/now-playing`), `ScanPage` (màn chào + quét) và `BrowsePage` (trang chủ mới). Mọi yêu cầu phát (quét xong, playlist, ca sĩ, bài lẻ) đi qua một `request` duy nhất trong `PlaybackProvider`. "Cảm xúc gần nhất" và "phiên đã quét" lưu `sessionStorage`.

**Tech Stack:** React 19 + Vite + SCSS + react-router 6 (frontend), Express 5 + pg (backend), `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-07-browse-home-and-scan-flow-design.md`

## Global Constraints

- Chữ giao diện tiếng Anh; comment code tiếng Việt không dấu (theo file xung quanh).
- Không thêm thư viện mới. Font mới chỉ qua Google Fonts trong `index.html`.
- Mọi SQL đụng dữ liệu cá nhân phải lọc `user_id` (`$1` = userId, tham số đầu).
- `npx eslint src` phải sạch; `npm run build` OK; `npm test` (backend) pass.
- Ngưỡng rảnh: **60 000 ms**. Cảm xúc "cũ": **30 phút**. Khoá `sessionStorage`: `emotune_scanned`, `emotune_last_mood`.
- Thứ tự header bên phải: record-circle → Explore Premium → chuông → tài khoản → Log out.
- Không commit/push khi người dùng chưa yêu cầu (bước commit dưới đây chỉ chạy khi được đồng ý).

## Review Focus

- Quét xong khi scanner vẫn gửi thêm kết quả (ảnh đã bay đi trước khi gỡ) → chỉ phát **một** bài, không nhảy bài. *(Task 3: cờ `handledRef` trong ScanPage + thử bằng Playwright)*
- Hết bài, chưa có cảm xúc gần nhất (vào thẳng `/playlist/1` rồi phát playlist tới hết) → chuyển `/scan`, không gọi `/suggest` với `emotion: undefined`. *(Task 3)*
- `/suggest` lỗi khi tự chọn bài tiếp → chuyển `/scan`, nhạc không im lặng dừng. *(Task 3)*
- Vào thẳng `/now-playing` (gõ URL / F5) khi chưa có bài → về `/`. *(Task 3)*
- Người dùng mới chưa nghe bài nào → `/songs/for-you` vẫn trả danh sách (điểm 0, bài mới trước). *(Task 1 test `rankForYou`)*

---

### Task 1: Backend — `GET /songs/for-you` + `detectedEmotion`

**Files:**
- Modify: `emotune-backend/src/model/songModel.js` (thêm `getForYouRows(userId)`)
- Modify: `emotune-backend/src/services/songService.js` (thêm `rankForYou(rows, limit)`, `getForYou(userId)`)
- Modify: `emotune-backend/src/controllers/songController.js` (thêm `getForYou`)
- Modify: `emotune-backend/src/routes/web.js` (route `GET /songs/for-you`, requireAuth)
- Modify: `emotune-backend/src/services/suggestService.js` (trả thêm `detectedEmotion: emotion`)
- Test: `emotune-backend/test/forYou.test.js`

**Interfaces:**
- Produces: `GET /songs/for-you` → `[{ id, title, artist, artist_avatar, file_path, emotion, artist_id, genre_id, genre, score }]` (≤ 10, `score` là số). `POST /suggest` và `/scan-and-suggest` trả thêm `detectedEmotion`.

- [ ] **Step 1: Test hàm thuần** — `test/forYou.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert");
const { rankForYou } = require("../src/services/songService");

const row = (id, listen, bonus) => ({ id, title: "s" + id, listen_score: String(listen), taste_bonus: String(bonus) });

test("xep theo diem nghe that + diem thuong khao sat", () => {
    const out = rankForYou([row(1, 1, 0), row(2, 0, 1.0), row(3, 2, 0.5)], 10);
    assert.deepStrictEqual(out.map((s) => s.id), [3, 2, 1]);
    assert.strictEqual(out[0].score, 2.5);
});

test("hoa diem -> bai moi them (id lon) truoc", () => {
    assert.deepStrictEqual(rankForYou([row(1, 0, 0), row(5, 0, 0), row(3, 0, 0)], 10).map((s) => s.id), [5, 3, 1]);
});

test("nguoi moi (toan 0) van tra du danh sach, cat theo limit", () => {
    const rows = [1, 2, 3, 4].map((id) => row(id, 0, 0));
    assert.strictEqual(rankForYou(rows, 3).length, 3);
});

test("khong lo cot tinh diem noi bo ra ngoai", () => {
    const [s] = rankForYou([row(1, 1, 0.5)], 10);
    assert.strictEqual(s.listen_score, undefined);
    assert.strictEqual(s.taste_bonus, undefined);
});
```

- [ ] **Step 2:** `npm test` → FAIL (`rankForYou is not a function`).
- [ ] **Step 3: Model** — `getForYouRows(userId)`:

```js
let getForYouRows = async (userId) => {
    const result = await db.query(
        `SELECT s.id, s.title, a.name AS artist, a.avatar AS artist_avatar, s.file_path, s.emotion,
                s.artist_id, s.genre_id, g.name AS genre,
                COALESCE((SELECT SUM(p.score) FROM preferences p WHERE p.user_id = $1 AND p.song_id = s.id), 0) AS listen_score,
                (CASE WHEN EXISTS (SELECT 1 FROM survey_artists sa WHERE sa.user_id = $1 AND sa.artist_id = s.artist_id) THEN 0.5 ELSE 0 END
               + CASE WHEN EXISTS (SELECT 1 FROM survey_genres sg WHERE sg.user_id = $1 AND sg.genre_id = s.genre_id) THEN 0.5 ELSE 0 END) AS taste_bonus
         FROM songs s
         LEFT JOIN artists a ON a.id = s.artist_id
         LEFT JOIN genres g ON g.id = s.genre_id`,
        [userId]
    );
    return result.rows;
}
```

- [ ] **Step 4: Service** — `rankForYou` + `getForYou`:

```js
// Ham thuan: diem = nghe that + thuong khao sat; hoa diem -> bai moi truoc
let rankForYou = (rows, limit = 10) => rows
    .map(({ listen_score, taste_bonus, ...song }) => ({ ...song, score: Number(listen_score) + Number(taste_bonus) }))
    .sort((a, b) => b.score - a.score || b.id - a.id)
    .slice(0, limit);

let getForYou = async (userId) => rankForYou(await songModel.getForYouRows(userId), 10);
```

- [ ] **Step 5:** Controller `getForYou` (giống `getSongs`, dùng `req.userId`), route `router.get('/songs/for-you', requireAuth, songController.getForYou)` đặt **trước** `/songs`. `suggestService.generateSuggestion` thêm `detectedEmotion: emotion` vào object trả về.
- [ ] **Step 6:** `npm test` → PASS; curl `GET /songs/for-you` (có token) → 200, mảng ≤ 10; không token → 401; `POST /suggest {"emotion":"sad"}` có `detectedEmotion`.
- [ ] **Step 7 (khi được đồng ý):** commit.

---

### Task 2: Frontend — tiện ích phiên/cảm xúc + `useIdle`

**Files:**
- Create: `emotune-frontend/src/utils/moodSession.js`
- Create: `emotune-frontend/src/hooks/useIdle.js`
- Create: `emotune-frontend/src/utils/moodStats.js` (tách `EMOTIONS`, `buildDays`, `cheerUpStatus` từ `MoodPage.jsx` để trang chủ dùng lại)
- Modify: `emotune-frontend/src/pages/MoodPage.jsx` (import từ `utils/moodStats`)

**Interfaces:**
- Produces (`moodSession.js`): `hasScanned(): boolean`, `markScanned(): void`, `loadLastMood(): {emotion, at} | null`, `saveLastMood(emotion): {emotion, at}`, `STALE_MS = 30*60*1000`. Mọi truy cập `sessionStorage` bọc try/catch.
- Produces (`useIdle.js`): `useIdle(ms = 60000) → isIdle(): boolean` (đọc ref, không gây render lại).
- Produces (`moodStats.js`): `EMOTIONS` (mảng `{key,label,emoji}` thứ tự happy, surprise, neutral, sad, angry), `buildDays(rows)`, `cheerUpStatus(days)` — y nguyên logic đang chạy trong `MoodPage.jsx`.

- [ ] **Step 1:** Viết `moodSession.js`:

```js
const SCANNED = "emotune_scanned";
const LAST_MOOD = "emotune_last_mood";
export const STALE_MS = 30 * 60 * 1000;

const read = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* trinh duyet chan -> bo qua */ } };

export const hasScanned = () => read(SCANNED) === "1";
export const markScanned = () => write(SCANNED, "1");
export const loadLastMood = () => { try { return JSON.parse(read(LAST_MOOD)); } catch { return null; } };
export const saveLastMood = (emotion) => { const m = { emotion, at: Date.now() }; write(LAST_MOOD, JSON.stringify(m)); return m; };
```

- [ ] **Step 2:** Viết `useIdle.js`:

```js
import { useCallback, useEffect, useRef } from "react";
const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"];
export const useIdle = (ms = 60000) => {
    const lastRef = useRef(0);
    useEffect(() => {
        lastRef.current = Date.now();
        const mark = () => { lastRef.current = Date.now(); };
        EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));
        return () => EVENTS.forEach((e) => window.removeEventListener(e, mark));
    }, []);
    return useCallback(() => Date.now() - lastRef.current >= ms, [ms]);
};
```

- [ ] **Step 3:** Chuyển `EMOTIONS`, `NEGATIVE`, `dayKey`, `buildDays`, `cheerUpStatus` từ `MoodPage.jsx` sang `utils/moodStats.js` (export), `MoodPage.jsx` import lại.
- [ ] **Step 4:** `npx eslint src && npm run build` → sạch; mở `/mood` vẫn ra biểu đồ như cũ.

---

### Task 3: `PlaybackProvider` + `PlayerHost` + `ScanPage` + routes

**Files:**
- Modify: `emotune-frontend/src/contexts/playbackContext.js`, `PlaybackProvider.jsx`
- Create: `emotune-frontend/src/components/PlayerHost.jsx` (logic phát lấy từ `pages/HomePage.jsx`)
- Create: `emotune-frontend/src/pages/ScanPage.jsx` (màn chào + `EmotionScanner`, style dùng lại `HomePage.scss`)
- Create: `emotune-frontend/src/pages/HomeRoute.jsx` (`hasScanned() ? <BrowsePage/> : <ScanPage intro/>`; Task 5 mới có BrowsePage → tạm dùng `<div/>`)
- Delete: `emotune-frontend/src/pages/HomePage.jsx` (style `HomePage.scss` giữ, đổi tên class không cần)
- Modify: `emotune-frontend/src/layouts/MainLayout.jsx` (vẽ `<PlayerHost/>` + `<Outlet/>`), `emotune-frontend/src/App.jsx` (routes)
- Modify: `emotune-frontend/src/components/MusicPlayer.jsx` (bấm ảnh/tên bài ở thanh dưới → `/now-playing`; prop `showStage`)

**Interfaces:**
- Consumes: Task 2 (`moodSession`, `useIdle`).
- Produces (`usePlayback()`): `request` `{kind: "scan"|"queue"|"song"|"playlist", ...payload, at}`; `playScanResult(result)`, `playPlaylist(id, start=0)`, `playQueue({name, songs, playlistId=null}, start=0)`, `playSong(song)`; `lastMood`, `setLastMood(emotion)`; `nowPlaying`, `setNowPlaying`; `playlistsVersion`, `refreshPlaylists`.
- Routes: `/` → `HomeRoute`; `/scan` → `ScanPage`; `/now-playing` → `null` (PlayerHost vẽ khung lớn); `/playlist/:id`; `/stats` → `MoodPage`; `/mood` → `<Navigate to="/stats" replace/>`; `/settings`.

- [ ] **Step 1: Provider** — gộp các request thành một state:

```js
const [request, setRequest] = useState(null);
const [lastMood, setLastMoodState] = useState(() => loadLastMood());
const send = useCallback((kind, payload) => setRequest({ kind, ...payload, at: Date.now() }), []);
const playScanResult = useCallback((result) => send("scan", { result }), [send]);
const playPlaylist = useCallback((playlistId, start = 0) => send("playlist", { playlistId, start }), [send]);
const playQueue = useCallback((queue, start = 0) => send("queue", { queue, start }), [send]);
const playSong = useCallback((song) => send("song", { song }), [send]);
const setLastMood = useCallback((emotion) => setLastMoodState(saveLastMood(emotion)), []);
```

- [ ] **Step 2: PlayerHost** — chuyển từ `HomePage.jsx`: state `suggestResult`, `mode`, `queue` (`{name, songs, playlistId}`), `index`, `playKey`; một effect xử lý `request` (dùng `handledRef = useRef(null)` so `request.at`):
  - `scan` → `setMode("emotion")`, phát `result`;
  - `song` → phát `{ song, emotion: song.emotion, message: null }`;
  - `queue` → `setMode("playlist")`, phát `queue.songs[start]`;
  - `playlist` → `api.get('/playlists/:id')` rồi xử lý như `queue` (`playlistId` = id; rỗng → bỏ qua).
  - `playNextSong()`: còn bài trong queue → bài sau; ngược lại:

```js
setMode("emotion"); setQueue(null);
const goScan = () => { setSuggestResult(null); navigate("/scan"); };
if (pathname === "/scan" || isIdle() || !lastMood) { goScan(); return; }
api.post("/suggest", { emotion: lastMood.emotion })
    .then((res) => { setSuggestResult(res.data); setPlayKey((k) => k + 1); })
    .catch(goScan);
```

  - Báo `setNowPlaying` như cũ; LED: không có bài → `'off'` (đang ở `/scan` → `'scanning'`), có bài → cảm xúc.
  - Render: `suggestResult && <MusicPlayer key={playKey} … showStage={pathname === "/now-playing"} />`; `pathname === "/now-playing" && !suggestResult` → `<Navigate to="/" replace/>`.
- [ ] **Step 3: MusicPlayer** — prop `showStage` (khung lớn chỉ vẽ khi `true`; thay class `is-hidden` cũ); bấm `.bar-cover`/`.bar-text` → `navigate('/now-playing')` (nút có `aria-label="Open now playing"`).
- [ ] **Step 4: ScanPage** — prop `intro` (bool): `intro && !started` → màn chào + Start; sau đó `<EmotionScanner onResult notice/>`. `onResult(data)`:

```js
if (handledRef.current) return;               // anh gui truoc khi go scanner van co the ve tiep
if (data.error || !data.song) { setNotice(data.message || "Couldn't read your face. Try again."); return; }
handledRef.current = true;
markScanned();
setLastMood(data.detectedEmotion || data.emotion);
playScanResult(data);
navigate("/now-playing");
```

- [ ] **Step 5:** `EmotionScanner` chọn cảm xúc bằng tay: `/suggest` cũng trả `detectedEmotion` (Task 1) nên không đổi. `MainLayout`: `<PlayerHost/>` + `<Outlet/>`; `App.jsx` routes như Interfaces; `HomePage.scss` bỏ `.is-hidden`, giữ phần còn lại (ScanPage dùng class `home-page`).
- [ ] **Step 6:** lint + build; Playwright: phiên mới `/` → Start → Happy → URL `/now-playing`, nhạc phát; F5 ở `/now-playing` sau khi đóng nhạc → về `/`; Home → `/` không còn màn chào; vào `/playlist/x` phát tới hết khi chưa có `lastMood` → sang `/scan`; tua cuối bài khi đang ở `/stats` và vừa động chuột → bài mới, request `/suggest` có `emotion` = cảm xúc vừa chọn, **không** có `/scan-and-suggest`; giả lập rảnh (không động chuột 61s rồi tua tới cuối) → `/scan`; scanner trả 2 kết quả liên tiếp → chỉ 1 bài.

---

### Task 4: Header — icon quét cảm xúc, sắp lại icon, `/stats`

**Files:**
- Create: `emotune-frontend/src/assets/icons/record_circle_icon.svg` (Bootstrap Icons `record-circle`, 30×30, `fill="white"`)
- Create: `emotune-frontend/src/components/MoodButton.jsx`, `MoodButton.scss`
- Modify: `emotune-frontend/src/components/Header.jsx`, `Header.scss`

**Interfaces:**
- Consumes: `usePlayback().lastMood`, `STALE_MS`, màu vibe (`--g2` của từng vibe trong `MusicPlayer.scss`: happy `#db8a4f`, sad `#4f6d9e`, angry `#b2403a`, surprise `#9a5ec8`, neutral `#b84d67`).

- [ ] **Step 1:** SVG:

```svg
<svg width="30" height="30" viewBox="0 0 16 16" fill="white" xmlns="http://www.w3.org/2000/svg">
<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
<path d="M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
</svg>
```

- [ ] **Step 2:** `MoodButton`: nút tròn 40px chứa icon; `data-mood={lastMood?.emotion}` → viền 2px màu vibe; `title`: chưa quét → "Scan my mood", có → `Mood: Sad · scanned 12 min ago` ("just now" khi < 1 phút); cũ hơn `STALE_MS` → class `stale` (animation nhấp nháy nhẹ 2s, tắt khi `prefers-reduced-motion`); bấm → `navigate('/scan')`. Thời gian "x min ago" tính lại mỗi 30s (interval trong effect, set state `now`).
- [ ] **Step 3:** Header: `action-container` = `[MoodButton, Explore Premium, chuông, user-info (button → '/stats'), Log out]`, `gap: 20px`, `align-items: center`; logo AI bỏ `onClick` (chờ phần 2, `title="Voice assistant (coming soon)"`).
- [ ] **Step 4:** lint + build; Playwright: icon nằm trái "Explore Premium"; chưa quét → title "Scan my mood"; sau khi chọn Sad → viền xanh và title "Mood: Sad · scanned just now"; bấm → `/scan`; bấm tên tài khoản → `/stats`; màn 390px không tràn.

---

### Task 5: `BrowsePage` (trang chủ, Figma `58:112`)

**Files:**
- Create: `emotune-frontend/src/pages/BrowsePage.jsx`, `BrowsePage.scss`
- Create: `emotune-frontend/src/assets/images/create_playlist_banner.png` (tải ảnh nền banner từ asset Figma của node `60:24`)
- Modify: `emotune-frontend/index.html` (thêm font `Jomolhari`), `emotune-frontend/src/pages/HomeRoute.jsx` (dùng `BrowsePage`)

**Interfaces:**
- Consumes: `GET /songs/for-you`, `GET /songs`, `GET /artists`, `GET /genres`, `GET /playlists`, `POST /playlists`, `GET /mood-history`; `usePlayback()` (`playSong`, `playQueue`, `playPlaylist`, `refreshPlaylists`); `utils/moodStats` (`EMOTIONS`, `buildDays`, `cheerUpStatus`); `ArtistAvatar`.

- [ ] **Step 1:** Khung trang: nền `#1a1a1a`, bo 20, padding 20px 36px 40px; hàng chip `All` + từng thể loại (chip `#3f3542`, 11px semibold, chọn → nền `--accent`, chữ `--on-premium`); chip lọc **Made for you** và **Recently added** theo `genre_id`.
- [ ] **Step 2:** "Getting started": banner 426×292 bo 8 (ảnh nền, chữ "CREATE YOUR OWN PLAYLIST" Jomolhari 20px giữa, nút "Browse" `#8d7898` 98×33 bo 20 → `POST /playlists` → `refreshPlaylists()` → `/playlist/:id`; chữ "Show more tips" `#c9c9c9` Inter Bold 16 → `/survey`) + tối đa 3 thẻ playlist (bấm → `/playlist/:id`).
- [ ] **Step 3:** Thẻ bài `SongCard`: 200×200 bo 8 (ảnh ca sĩ `object-fit: cover`, không ảnh → gradient vibe + ♪), gap 20 dọc, tên DM Sans 14 Medium, ca sĩ 12 `#a79fc9`, hover → nút ▶ tím 44px góc dưới phải; bấm → `playSong(song)`. Hàng = flex cuộn ngang, gap 26px. **Made for you** (`/songs/for-you`, 5 bài đầu sau lọc) và **Recently added** (`/songs` sắp `id` giảm, 5 bài).
- [ ] **Step 4:** **Popular artists**: vòng tròn 200px (`ArtistAvatar`, chữ viết tắt 48px), tên 14, "Artist" 12; bấm → `playQueue({ name: artist.name, songs: songs.filter(s => s.artist_id === artist.id) })`; ca sĩ không có bài → mờ, không bấm được.
- [ ] **Step 5:** **Your playlists**: thẻ 200×200 gradient tím ♪ + tên + "N songs"; bấm → `/playlist/:id`; nút ▶ hover → `playPlaylist(id)` (playlist rỗng → không có nút ▶).
- [ ] **Step 6:** **Your mood this week**: thẻ 540px (tối đa 100%) nền `#471824` bo 20: số lần quét 7 ngày, cảm xúc nhiều nhất (emoji + nhãn), "Cheer-up mode On/Off" + câu giải thích (dùng `cheerUpStatus`), nút "See your stats" → `/stats`.
- [ ] **Step 7:** Mỗi hàng tự quản lỗi: API lỗi → dòng "Couldn't load …" nhỏ màu `--muted`, các hàng khác vẫn hiện.
- [ ] **Step 8:** lint + build; Playwright 1440 & 390: đủ 6 mục, chip "ballad" chỉ còn bài ballad, bấm thẻ bài → phát (URL vẫn `/`), bấm Sơn Tùng → phát 2 bài, "Browse" tạo playlist và mở trang, 390px không tràn ngang. Chụp hình so với Figma `58:112`.

---

### Task 6: Tài liệu + kiểm tra tổng

- [ ] Cập nhật `TIEN_DO.md` (mục mới "H. Trang chủ + luồng quét" với 5 dòng tương ứng Task 1–5), `NOTES.md` (phiên mới), `CLAUDE.md` (routes mới, `PlayerHost`/`ScanPage`/`BrowsePage`, `usePlayback` API, `/songs/for-you`, quy tắc rảnh 60s).
- [ ] Chạy lại toàn bộ: `npm test` (backend), `npx eslint src && npm run build` (frontend), luồng Playwright (a)–(g) của spec; xoá tài khoản thử `tmp_*`.
- [ ] (Khi được đồng ý) commit.

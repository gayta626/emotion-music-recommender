# Trang thống kê mới `/stats` + dữ liệu mẫu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm lại trang `/stats` thành 2 phần "You" + "What NYX learned about you" (8 mục, chọn 7/30 ngày) dựa trên 1 API tổng hợp `GET /stats`, kèm lệnh `npm run seed-demo` sinh 30 ngày lịch sử mẫu cho tài khoản `demo30` + 4 người dùng mẫu.

**Architecture:** Backend: `statsModel` (SQL, mọi câu lọc `user_id`) → `statsService` (hàm thuần có test + `getStats` ghép) → `statsController` → `GET /stats?days=7|30`. Dữ liệu mẫu: hàm thuần `generateHistory` (`scripts/lib/demoHistory.js`, có test) + `scripts/seed-demo.js` ghi DB trong 1 transaction. Frontend: `MoodPage` làm lại, mỗi mục 1 component trong `src/components/stats/`, style chung `Stats.scss`.

**Tech Stack:** Node 24 + Express 5 + `pg` + `node:test` + `bcryptjs`; React 19 + Vite + SCSS.

**Spec:** `docs/superpowers/specs/2026-10-09-stats-page-design.md`

## Global Constraints

- **Không commit / push** (quy tắc repo). Không chạy `npm run db:setup` (xoá DB).
- Mọi câu SQL đụng `mood_history`, `recently_played`, `preferences` phải có `WHERE ... user_id = $1`.
- Backend theo mẫu `routes → controllers → services → model`; bình luận backend tiếng Việt **không dấu**; frontend có dấu hay không đều được (theo file xung quanh).
- `days` chỉ nhận 7 hoặc 30, giá trị khác → 7. Cửa sổ thời gian = `days` ngày lịch tính cả hôm nay: `created_at >= CURRENT_DATE - ($2::int - 1)`.
- Ngày trả về dạng `"YYYY-MM-DD"` theo giờ máy chủ (SQL `to_char(..., 'YYYY-MM-DD')`, JS dùng giờ địa phương) — không dùng `toISOString()` cho ngày (lệch múi giờ UTC).
- Thứ tự hoà cảm xúc phía backend: `happy, sad, angry, surprise, neutral`. Buổi: sáng 05–11h, chiều 11–17h, tối 17–22h, đêm 22–05h. `weekday`: 1 = Thứ Hai … 7 = Chủ Nhật (`ISODOW`).
- Luật điểm sở thích (giữ đúng hệ thống): nghe ≥ 80% `good` +1, 40–80% `neutral` +0.3, < 40% `bad` −1, "Not for me" `declined` −1. `good/neutral/bad` ghi thêm `recently_played`; `declined` thì không.
- Màu (đã chạy bộ kiểm tra dataviz trên nền `#141218`): 5 cảm xúc dùng `--mood-*` có sẵn trong `MoodPage.scss` (thứ tự frontend `happy, surprise, neutral, sad, angry`); kết quả nghe `good #4a8fe0` · `neutral #6c6a66` · `bad #c27a1c` · `declined #c23a4f`; điểm sở thích dương `#4a8fe0`, âm `#c23a4f`, 0 = trong suốt. Chữ/số luôn màu chữ (trắng / `--muted`), không tô màu dữ liệu.
- Mỗi biểu đồ có nút "View as table"; rê chuột vào cột/ô hiện số. Trang chữ tiếng Anh.
- `npx eslint src` sạch (0 lỗi, 0 cảnh báo), `npm run build` OK, backend `npm test` xanh.
- Cột `songs.duration` cần migrate `db/migrate_song_info.sql` (đã chạy trên DB laptop; máy mới phải chạy trước).
- Khi thử Playwright: kiểm tra cổng 8080/5173 trước; server người dùng đang chạy thì **dùng chung, không tắt**; chỉ tắt PID mình bật.

## Review Focus

1. **Tài khoản mới tinh** (không có dòng nào) → API trả mảng đã lấp số 0 (7/30 ngày, 28 ô buổi), trang hiện lời nhắc từng mục, không lỗi JS (test `buildDaily([])`, `buildDayparts([])`, `buildHitRate([])` ở Task 1; Playwright tài khoản mới ở Task 8).
2. **Lần quét lúc 23:59 / 00:01 và ranh giới buổi 5h, 11h, 17h, 22h** → rơi đúng ngày / buổi (test `daypartOf` biên + `buildDaily` khoá ngày ở Task 1).
3. **Số liệu người khác lọt sang** → `demo30` và `demo` thấy số khác nhau; mọi câu SQL có `user_id` (curl 2 tài khoản ở Task 2).
4. **30 cột trên điện thoại** → không tràn ngang, nhãn trục thưa (Playwright 390px ở Task 8).
5. **Chạy `seed-demo` 2 lần** → cùng dữ liệu, tài khoản thật không đổi số dòng (đếm trước/sau ở Task 4).

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `emotune-backend/src/services/statsService.js` (mới) | Hàm thuần dựng số liệu + `getStats(userId, days)` |
| `emotune-backend/src/model/statsModel.js` (mới) | 9 câu SQL thống kê (lọc `user_id`) |
| `emotune-backend/src/controllers/statsController.js` (mới) | Cửa vào `GET /stats` |
| `emotune-backend/src/routes/web.js` | Route `/stats` |
| `emotune-backend/test/stats.test.js` (mới) | Test hàm thuần thống kê |
| `emotune-backend/scripts/lib/demoHistory.js` (mới) | Hàm thuần `generateHistory` + `PROFILES` |
| `emotune-backend/test/demoHistory.test.js` (mới) | Test bộ sinh dữ liệu |
| `emotune-backend/scripts/seed-demo.js` (mới), `package.json` | Ghi dữ liệu mẫu vào DB |
| `emotune-frontend/src/components/stats/statsMeta.js` (mới) | Hằng số + hàm định dạng dùng chung |
| `emotune-frontend/src/components/stats/StatsCard.jsx` (mới) | Khung thẻ + nút "View as table" + chú giải cảm xúc |
| `emotune-frontend/src/components/stats/{OverviewTiles,DailyChart,DaypartGrid,TopLists,MoodSongs,HitRateChart,ConfidenceBars,PreferenceGrid}.jsx` (mới) | 8 mục |
| `emotune-frontend/src/components/stats/Stats.scss` (mới) | Style các mục mới |
| `emotune-frontend/src/pages/MoodPage.jsx` | Làm lại: tải `/stats` + `/mood-history`, bố cục |
| `TIEN_DO.md`, `NOTES.md`, `CLAUDE.md` | Tài liệu |

---

### Task 1: Hàm thuần thống kê (`statsService`)

**Files:**
- Create: `emotune-backend/src/services/statsService.js`
- Test: `emotune-backend/test/stats.test.js`

**Interfaces:**
- Produces (export): `EMOTIONS`, `PARTS`, `OUTCOMES`, `normalizeDays(raw) → 7|30`, `dayKey(date) → "YYYY-MM-DD"`, `daypartOf(hour) → "morning"|"afternoon"|"evening"|"night"`, `buildDaily(rows, days, today) → [{date, counts}]`, `buildDayparts(rows) → [{weekday, part, counts}]` (28 ô), `topEmotionOf(daily) → string|null`, `buildHitRate(rows, days, today) → {total:{good,neutral,bad,declined,rate}, daily:[{date,good,neutral,bad,declined}]}`, `pickMoodSongs(rows, limit=3) → {happy:[{song,times}],…}`, `pickPreferences(rows, limit=10) → [{song, scores}]`, `buildConfidence(rows) → [{emotion, avg, count}]`. Task 2 thêm `getStats` vào cùng file.
- `counts` luôn đủ 5 khoá cảm xúc. Dòng SQL đầu vào: xem Task 2.

- [ ] **Step 1: Viết test (thất bại)** — tạo `emotune-backend/test/stats.test.js`:

```js
// Unit test ham thuan trang thong ke (src/services/statsService.js)
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");

const s = require("../src/services/statsService");

const today = new Date(2026, 9, 9, 15, 0);   // 09/10/2026 15:00 gio dia phuong

test("normalizeDays: chi nhan 7 hoac 30", () => {
    assert.strictEqual(s.normalizeDays("30"), 30);
    assert.strictEqual(s.normalizeDays(30), 30);
    assert.strictEqual(s.normalizeDays("7"), 7);
    assert.strictEqual(s.normalizeDays("90"), 7);
    assert.strictEqual(s.normalizeDays(undefined), 7);
});

test("daypartOf: dung ranh gioi 5h, 11h, 17h, 22h", () => {
    assert.strictEqual(s.daypartOf(4), "night");
    assert.strictEqual(s.daypartOf(5), "morning");
    assert.strictEqual(s.daypartOf(10), "morning");
    assert.strictEqual(s.daypartOf(11), "afternoon");
    assert.strictEqual(s.daypartOf(16), "afternoon");
    assert.strictEqual(s.daypartOf(17), "evening");
    assert.strictEqual(s.daypartOf(21), "evening");
    assert.strictEqual(s.daypartOf(22), "night");
    assert.strictEqual(s.daypartOf(0), "night");
});

test("buildDaily: lap ngay trong, hom nay o cuoi, khoa ngay theo gio dia phuong", () => {
    const rows = [
        { day: "2026-10-09", emotion: "sad", count: 2 },
        { day: "2026-10-03", emotion: "happy", count: "1" },
        { day: "2026-09-01", emotion: "happy", count: 5 },   // ngoai cua so -> bo
    ];
    const daily = s.buildDaily(rows, 7, today);
    assert.strictEqual(daily.length, 7);
    assert.strictEqual(daily[0].date, "2026-10-03");
    assert.strictEqual(daily[6].date, "2026-10-09");
    assert.deepStrictEqual(daily[6].counts, { happy: 0, sad: 2, angry: 0, surprise: 0, neutral: 0 });
    assert.strictEqual(daily[0].counts.happy, 1);
    assert.strictEqual(s.buildDaily([], 30, today).length, 30);
    assert.strictEqual(s.dayKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("buildDayparts: luon du 28 o, cong dung o", () => {
    const empty = s.buildDayparts([]);
    assert.strictEqual(empty.length, 28);
    const cells = s.buildDayparts([
        { weekday: 1, hour: 20, emotion: "sad", count: 3 },
        { weekday: "1", hour: "21", emotion: "sad", count: "1" },
        { weekday: 7, hour: 23, emotion: "angry", count: 1 },
    ]);
    const mondayEvening = cells.find((c) => c.weekday === 1 && c.part === "evening");
    assert.strictEqual(mondayEvening.counts.sad, 4);
    const sundayNight = cells.find((c) => c.weekday === 7 && c.part === "night");
    assert.strictEqual(sundayNight.counts.angry, 1);
});

test("topEmotionOf: nhieu nhat, hoa theo thu tu happy, sad, angry, surprise, neutral; khong co -> null", () => {
    const daily = s.buildDaily([
        { day: "2026-10-09", emotion: "neutral", count: 2 },
        { day: "2026-10-08", emotion: "sad", count: 2 },
    ], 7, today);
    assert.strictEqual(s.topEmotionOf(daily), "sad");
    assert.strictEqual(s.topEmotionOf(s.buildDaily([], 7, today)), null);
});

test("buildHitRate: tong + theo ngay + ti le nghe het", () => {
    const hr = s.buildHitRate([
        { day: "2026-10-09", action: "good", count: 3 },
        { day: "2026-10-09", action: "bad", count: 1 },
        { day: "2026-10-08", action: "declined", count: 1 },
        { day: "2026-10-08", action: "neutral", count: "1" },
        { day: "2026-10-08", action: "suggested", count: 9 },   // khong phai luot nghe -> bo
    ], 7, today);
    assert.deepStrictEqual(hr.total, { good: 3, neutral: 1, bad: 1, declined: 1, rate: 0.5 });
    assert.strictEqual(hr.daily.length, 7);
    assert.deepStrictEqual(hr.daily[6], { date: "2026-10-09", good: 3, neutral: 0, bad: 1, declined: 0 });
    assert.strictEqual(s.buildHitRate([], 7, today).total.rate, null);
});

const song = (id, extra = {}) => ({ id, title: "s" + id, artist: "a", file_path: `s${id}.mp3`, emotion: "sad", ...extra });

test("pickMoodSongs: moi cam xuc toi da 3 bai, nhieu lan truoc", () => {
    const rows = [
        { emotion: "sad", times: 1, ...song(1) },
        { emotion: "sad", times: 4, ...song(2) },
        { emotion: "sad", times: 2, ...song(3) },
        { emotion: "sad", times: 2, ...song(4) },
        { emotion: "happy", times: "5", ...song(5) },
    ];
    const out = s.pickMoodSongs(rows);
    assert.deepStrictEqual(out.sad.map((x) => x.song.id), [2, 3, 4]);
    assert.strictEqual(out.sad[0].times, 4);
    assert.strictEqual(out.happy[0].times, 5);
    assert.strictEqual(out.sad[0].song.emotion, "sad");
    assert.deepStrictEqual(out.angry, []);
    assert.strictEqual("times" in out.sad[0].song, false);
});

test("pickPreferences: gom theo bai, xep theo tong |diem|, bo bai toan 0, toi da 10", () => {
    const rows = [
        { emotion: "sad", score: 2.3, ...song(1) },
        { emotion: "happy", score: -1, ...song(1) },
        { emotion: "happy", score: 0.3, ...song(2) },
        { emotion: "angry", score: 0, ...song(3) },
    ];
    const out = s.pickPreferences(rows);
    assert.deepStrictEqual(out.map((x) => x.song.id), [1, 2]);
    assert.deepStrictEqual(out[0].scores, { happy: -1, sad: 2.3, angry: 0, surprise: 0, neutral: 0 });
    const many = Array.from({ length: 15 }, (_, i) => ({ emotion: "happy", score: i + 1, ...song(i + 1) }));
    assert.strictEqual(s.pickPreferences(many).length, 10);
    assert.strictEqual(s.pickPreferences(many)[0].song.id, 15);
});

test("buildConfidence: lam tron 2 so, theo thu tu cam xuc, bo cam xuc khong co", () => {
    const out = s.buildConfidence([
        { emotion: "neutral", avg: 0.8234, count: 3 },
        { emotion: "happy", avg: "0.9", count: "2" },
    ]);
    assert.deepStrictEqual(out, [
        { emotion: "happy", avg: 0.9, count: 2 },
        { emotion: "neutral", avg: 0.82, count: 3 },
    ]);
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run (trong `emotune-backend/`): `npm test`
Expected: FAIL — `Cannot find module '../src/services/statsService'`.

- [ ] **Step 3: Viết `emotune-backend/src/services/statsService.js`**

```js
// Trang thong ke /stats: cac HAM THUAN dung so lieu tu dong SQL tho (statsModel) -> unit test duoc.
// getStats (cuoi file, them o Task 2) ghep tat ca thanh 1 JSON cho GET /stats.

// thu tu "hoa" khi chon cam xuc nhieu nhat (spec)
const EMOTIONS = ["happy", "sad", "angry", "surprise", "neutral"];
// buoi trong ngay: sang 05-11h, chieu 11-17h, toi 17-22h, dem 22-05h
const PARTS = ["morning", "afternoon", "evening", "night"];
// ket qua 1 luot nghe (mood_history.action)
const OUTCOMES = ["good", "neutral", "bad", "declined"];

const emptyCounts = () => Object.fromEntries(EMOTIONS.map((e) => [e, 0]));

const normalizeDays = (raw) => (Number(raw) === 30 ? 30 : 7);

// "YYYY-MM-DD" theo GIO DIA PHUONG (khong dung toISOString: lech ngay vi UTC)
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// cac ngay tu (today - days + 1) toi today, cu nhat truoc
const dayRange = (days, today) => {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        out.push(dayKey(d));
    }
    return out;
};

const daypartOf = (hour) => (hour >= 5 && hour < 11 ? "morning"
    : hour >= 11 && hour < 17 ? "afternoon"
        : hour >= 17 && hour < 22 ? "evening" : "night");

// rows: [{ day: "YYYY-MM-DD", emotion, count }] -> moi ngay trong cua so 1 phan tu (ngay khong quet = 0)
const buildDaily = (rows, days, today) => {
    const map = Object.fromEntries(dayRange(days, today).map((k) => [k, emptyCounts()]));
    rows.forEach((r) => {
        if (map[r.day] && r.emotion in map[r.day]) map[r.day][r.emotion] += Number(r.count);
    });
    return Object.entries(map).map(([date, counts]) => ({ date, counts }));
};

// rows: [{ weekday 1..7, hour 0..23, emotion, count }] -> 28 o (7 thu x 4 buoi)
const buildDayparts = (rows) => {
    const cells = [];
    for (let weekday = 1; weekday <= 7; weekday++) {
        PARTS.forEach((part) => cells.push({ weekday, part, counts: emptyCounts() }));
    }
    rows.forEach((r) => {
        const cell = cells.find((c) => c.weekday === Number(r.weekday) && c.part === daypartOf(Number(r.hour)));
        if (cell && r.emotion in cell.counts) cell.counts[r.emotion] += Number(r.count);
    });
    return cells;
};

const topEmotionOf = (daily) => {
    let best = null;
    let bestN = 0;
    EMOTIONS.forEach((e) => {
        const n = daily.reduce((sum, d) => sum + d.counts[e], 0);
        if (n > bestN) {
            best = e;
            bestN = n;
        }
    });
    return best;
};

// rows: [{ day, action, count }] (chi luot nghe) -> tong + theo ngay; rate = good / tong luot nghe
const buildHitRate = (rows, days, today) => {
    const empty = () => Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
    const map = Object.fromEntries(dayRange(days, today).map((k) => [k, empty()]));
    const total = empty();
    rows.forEach((r) => {
        if (!OUTCOMES.includes(r.action)) return;
        const n = Number(r.count);
        total[r.action] += n;
        if (map[r.day]) map[r.day][r.action] += n;
    });
    const sum = OUTCOMES.reduce((acc, o) => acc + total[o], 0);
    return {
        total: { ...total, rate: sum ? Math.round((total.good / sum) * 100) / 100 : null },
        daily: Object.entries(map).map(([date, c]) => ({ date, ...c })),
    };
};

// rows: [{ emotion, times, ...cot bai hat }] -> moi cam xuc toi da `limit` bai nghe het nhieu nhat
const pickMoodSongs = (rows, limit = 3) => {
    const out = Object.fromEntries(EMOTIONS.map((e) => [e, []]));
    [...rows]
        .sort((a, b) => Number(b.times) - Number(a.times) || a.id - b.id)
        .forEach(({ emotion: mood, times, ...song }) => {
            if (out[mood] && out[mood].length < limit) out[mood].push({ song, times: Number(times) });
        });
    return out;
};

// rows: [{ emotion, score, ...cot bai hat }] -> moi bai 1 dong diem 5 cam xuc; bai co tong |diem| lon nhat truoc
const pickPreferences = (rows, limit = 10) => {
    const bySong = new Map();
    rows.forEach(({ emotion: mood, score, ...song }) => {
        if (!bySong.has(song.id)) bySong.set(song.id, { song, scores: emptyCounts() });
        const item = bySong.get(song.id);
        if (mood in item.scores) item.scores[mood] = Math.round(Number(score) * 10) / 10;
    });
    const weight = (x) => EMOTIONS.reduce((sum, e) => sum + Math.abs(x.scores[e]), 0);
    return [...bySong.values()]
        .filter((x) => weight(x) > 0)
        .sort((a, b) => weight(b) - weight(a) || a.song.id - b.song.id)
        .slice(0, limit);
};

// rows: [{ emotion, avg, count }] -> theo thu tu EMOTIONS, avg lam tron 2 so
const buildConfidence = (rows) => EMOTIONS
    .map((e) => rows.find((r) => r.emotion === e))
    .filter(Boolean)
    .map((r) => ({ emotion: r.emotion, avg: Math.round(Number(r.avg) * 100) / 100, count: Number(r.count) }));

module.exports = {
    EMOTIONS, PARTS, OUTCOMES,
    normalizeDays, dayKey, daypartOf,
    buildDaily, buildDayparts, topEmotionOf, buildHitRate, pickMoodSongs, pickPreferences, buildConfidence,
};
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npm test`
Expected: tất cả PASS (43 test cũ + 9 test mới).

---

### Task 2: SQL + API `GET /stats`

**Files:**
- Create: `emotune-backend/src/model/statsModel.js`
- Modify: `emotune-backend/src/services/statsService.js` (thêm `getStats`)
- Create: `emotune-backend/src/controllers/statsController.js`
- Modify: `emotune-backend/src/routes/web.js`

**Interfaces:**
- Consumes (Task 1): mọi hàm thuần của `statsService`.
- Produces: `GET /stats?days=7|30` (requireAuth) → JSON đúng spec mục 3: `{days, from, to, overview:{scans, topEmotion, plays, listenSeconds}, daily, dayparts, topSongs:[{song, plays}], topArtists:[{id,name,avatar,plays}], moodSongs, hitRate, preferences, confidence}`. `song` có `id, title, artist, artist_avatar, file_path, cover, emotion, artist_id, genre_id, album, duration` (đủ để `playSong`).

- [ ] **Step 1: Viết `emotune-backend/src/model/statsModel.js`**

```js
const db = require("../config/db")

// Trang thong ke: MOI cau loc theo user_id ($1). $2 = so ngay (7 / 30): tu (hom nay - $2 + 1) toi hien tai.

// cot bai hat tra ve (cung dang voi /songs -> frontend phat duoc ngay)
const SONG_COLS = `s.id, s.title, a.name AS artist, COALESCE(a.photo, a.avatar) AS artist_avatar, s.file_path, s.cover,
                   s.emotion, s.artist_id, s.genre_id, s.album, s.duration`;

// lan quet theo ngay x cam xuc
let getScanDays = async (userId, days) => (await db.query(
    `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, emotion, COUNT(*)::int AS count
     FROM mood_history
     WHERE user_id = $1 AND action = 'suggested' AND created_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY 1, 2`,
    [userId, days])).rows;

// lan quet theo thu (1 = Thu Hai) x gio x cam xuc -> chia buoi o service
let getScanHours = async (userId, days) => (await db.query(
    `SELECT EXTRACT(ISODOW FROM created_at)::int AS weekday, EXTRACT(HOUR FROM created_at)::int AS hour,
            emotion, COUNT(*)::int AS count
     FROM mood_history
     WHERE user_id = $1 AND action = 'suggested' AND created_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY 1, 2, 3`,
    [userId, days])).rows;

// so bai da nghe + tong thoi luong (bai chua co duration thi khong cong)
let getPlaySummary = async (userId, days) => (await db.query(
    `SELECT COUNT(*)::int AS plays, COALESCE(SUM(s.duration), 0)::int AS seconds
     FROM recently_played r JOIN songs s ON s.id = r.song_id
     WHERE r.user_id = $1 AND r.played_at >= CURRENT_DATE - ($2::int - 1)`,
    [userId, days])).rows[0];

let getTopSongs = async (userId, days) => (await db.query(
    `SELECT ${SONG_COLS}, COUNT(*)::int AS plays
     FROM recently_played r
     JOIN songs s ON s.id = r.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE r.user_id = $1 AND r.played_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY s.id, a.id
     ORDER BY plays DESC, s.id
     LIMIT 5`,
    [userId, days])).rows;

let getTopArtists = async (userId, days) => (await db.query(
    `SELECT a.id, a.name, COALESCE(a.photo, a.avatar) AS avatar, COUNT(*)::int AS plays
     FROM recently_played r
     JOIN songs s ON s.id = r.song_id
     JOIN artists a ON a.id = s.artist_id
     WHERE r.user_id = $1 AND r.played_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY a.id
     ORDER BY plays DESC, a.id
     LIMIT 5`,
    [userId, days])).rows;

// bai nghe het (action good) khi dang o tung cam xuc
let getMoodSongs = async (userId, days) => (await db.query(
    `SELECT m.emotion, ${SONG_COLS}, COUNT(*)::int AS times
     FROM mood_history m
     JOIN songs s ON s.id = m.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE m.user_id = $1 AND m.action = 'good' AND m.created_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY m.emotion, s.id, a.id`,
    [userId, days])).rows;

// ket qua cac luot nghe theo ngay
let getOutcomes = async (userId, days) => (await db.query(
    `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, action, COUNT(*)::int AS count
     FROM mood_history
     WHERE user_id = $1 AND action IN ('good', 'neutral', 'bad', 'declined')
       AND created_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY 1, 2`,
    [userId, days])).rows;

// diem so thich: cong don tu truoc toi nay (khong theo cua so ngay)
let getPreferences = async (userId) => (await db.query(
    `SELECT p.emotion, p.score, ${SONG_COLS}
     FROM preferences p
     JOIN songs s ON s.id = p.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE p.user_id = $1`,
    [userId])).rows;

// do tu tin cua model khi quet camera (dong co confidence)
let getConfidence = async (userId, days) => (await db.query(
    `SELECT emotion, AVG(confidence)::float AS avg, COUNT(*)::int AS count
     FROM mood_history
     WHERE user_id = $1 AND action = 'suggested' AND confidence IS NOT NULL
       AND created_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY emotion`,
    [userId, days])).rows;

module.exports = {
    getScanDays, getScanHours, getPlaySummary, getTopSongs, getTopArtists,
    getMoodSongs, getOutcomes, getPreferences, getConfidence,
}
```

- [ ] **Step 2: Thêm `getStats` vào `statsService.js`** — ngay trước `module.exports`:

```js
const statsModel = require("../model/statsModel");

// Ghep moi muc cho GET /stats (spec muc 3)
const getStats = async (userId, rawDays) => {
    const days = normalizeDays(rawDays);
    const today = new Date();
    const [scanDays, scanHours, play, topSongs, topArtists, moodRows, outcomes, prefRows, confRows] = await Promise.all([
        statsModel.getScanDays(userId, days),
        statsModel.getScanHours(userId, days),
        statsModel.getPlaySummary(userId, days),
        statsModel.getTopSongs(userId, days),
        statsModel.getTopArtists(userId, days),
        statsModel.getMoodSongs(userId, days),
        statsModel.getOutcomes(userId, days),
        statsModel.getPreferences(userId),
        statsModel.getConfidence(userId, days),
    ]);
    const daily = buildDaily(scanDays, days, today);
    return {
        days,
        from: daily[0].date,
        to: daily[daily.length - 1].date,
        overview: {
            scans: daily.reduce((sum, d) => sum + EMOTIONS.reduce((n, e) => n + d.counts[e], 0), 0),
            topEmotion: topEmotionOf(daily),
            plays: Number(play.plays),
            listenSeconds: Number(play.seconds),
        },
        daily,
        dayparts: buildDayparts(scanHours),
        topSongs: topSongs.map(({ plays, ...song }) => ({ song, plays: Number(plays) })),
        topArtists: topArtists.map((a) => ({ ...a, plays: Number(a.plays) })),
        moodSongs: pickMoodSongs(moodRows),
        hitRate: buildHitRate(outcomes, days, today),
        preferences: pickPreferences(prefRows),
        confidence: buildConfidence(confRows),
    };
};
```

và thêm `getStats` vào `module.exports`. Vì file test `require` service → service `require` model → `config/db` (tạo pool, chưa kết nối) — chạy `npm test` vẫn xong không treo (giống test `forYou`, `assistantRules`). Nếu `npm test` treo không thoát: chuyển `require("../model/statsModel")` vào bên trong `getStats`.

- [ ] **Step 3: Viết `emotune-backend/src/controllers/statsController.js`**

```js
const statsService = require("../services/statsService")

// GET /stats?days=7|30 - so lieu cua CHINH nguoi dang dang nhap (userId lay tu token)
let getStats = async (req, res) => {
    try {
        const data = await statsService.getStats(req.userId, req.query.days)
        return res.status(200).json(data)
    } catch (err) {
        console.log("Loi goi API stats :" + err)
        return res.status(500).json({ err: "Loi server khi lay thong ke" })
    }
}

module.exports = {
    getStats: getStats,
}
```

- [ ] **Step 4: Route** — `emotune-backend/src/routes/web.js`: thêm `const statsController = require('../controllers/statsController')` cạnh các require controller, và sau dòng `router.get('/mood-history', ...)`:

```js
    router.get('/stats', requireAuth, statsController.getStats);
```

- [ ] **Step 5: Test + curl**

Run (trong `emotune-backend/`): `npm test` → vẫn PASS hết.
Server: nếu cổng 8080 đang có server người dùng (`netstat -ano | grep -E ":8080 .*LISTEN"`) thì dùng luôn (nodemon tự nạp code); không có thì `node src/server.js` chạy nền, ghi PID, xong tắt đúng PID đó.
```bash
TOKEN=$(curl -s -X POST localhost:8080/auth/login -H "Content-Type: application/json" -d '{"username":"demo","password":"demo1234"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")
curl -s "localhost:8080/stats?days=7" -H "Authorization: Bearer $TOKEN" | node -pe "const d=JSON.parse(require('fs').readFileSync(0)); [d.days, d.from, d.to, JSON.stringify(d.overview), d.daily.length, d.dayparts.length, d.hitRate.daily.length].join(' | ')"
curl -s "localhost:8080/stats?days=30" -H "Authorization: Bearer $TOKEN" | node -pe "const d=JSON.parse(require('fs').readFileSync(0)); [d.days, d.daily.length, d.hitRate.daily.length].join(' | ')"
curl -s -o /dev/null -w "%{http_code}\n" "localhost:8080/stats"
```
Expected: dòng 1 `7 | <7 ngày trước> | <hôm nay> | {"scans":..,"topEmotion":..,"plays":..,"listenSeconds":..} | 7 | 28 | 7`; dòng 2 `30 | 30 | 30`; dòng 3 `401`.

---

### Task 3: Bộ sinh lịch sử mẫu (`generateHistory`)

**Files:**
- Create: `emotune-backend/scripts/lib/demoHistory.js`
- Test: `emotune-backend/test/demoHistory.test.js`

**Interfaces:**
- Produces: `PROFILES` (5 hồ sơ, `username` = `demo30`, `mau_ballad`, `mau_rap`, `mau_pop`, `mau_chill`, mỗi hồ sơ `{ username, artists:[tên], genres:[tên], moods:{morning,afternoon,evening,night}, recentNegative?:true }`), `RULES` (`{good:1, neutral:0.3, bad:-1, declined:-1}`), `generateHistory(profile, songs, { seed, now, days = 30 }) → { scans:[{emotion, confidence|null, songId, at:Date}], listens:[{emotion, songId, action, at}], plays:[{songId, at}], preferences:[{emotion, songId, score}] }`. `songs`: `[{ id, title, emotion, artist, genre }]`.

- [ ] **Step 1: Viết test (thất bại)** — tạo `emotune-backend/test/demoHistory.test.js`:

```js
// Unit test bo sinh lich su mau (scripts/lib/demoHistory.js) cho lenh npm run seed-demo
const test = require("node:test");
const assert = require("node:assert");

const { PROFILES, RULES, generateHistory } = require("../scripts/lib/demoHistory");

const songs = [
    { id: 1, title: "Có Chắc Yêu Là Đây", emotion: "happy", artist: "Sơn Tùng M-TP", genre: "pop" },
    { id: 2, title: "Muộn Rồi Mà Sao Còn", emotion: "happy", artist: "Sơn Tùng M-TP", genre: "pop" },
    { id: 3, title: "Giá Như", emotion: "sad", artist: "Noo Phước Thịnh", genre: "ballad" },
    { id: 4, title: "Khó Giữ Chân Thành", emotion: "sad", artist: "GUrbane", genre: "ballad" },
    { id: 5, title: "Meditation", emotion: "angry", artist: null, genre: "thư giãn" },
    { id: 6, title: "Reduce Stress", emotion: "angry", artist: null, genre: "thư giãn" },
    { id: 7, title: "Blank Space", emotion: "surprise", artist: "Taylor Swift", genre: "pop" },
    { id: 8, title: "CILU", emotion: "surprise", artist: "Da LAB", genre: "rap" },
    { id: 9, title: "Giấc Mơ Có Thật", emotion: "neutral", artist: "Lệ Quyên", genre: "ballad" },
    { id: 10, title: "Nếu Như Ta Chẳng Còn", emotion: "neutral", artist: "RPT MCK", genre: "rap" },
];
const now = new Date(2026, 9, 9, 15, 30);
const demo30 = PROFILES.find((p) => p.username === "demo30");
const DAY = 86400000;

test("co du 5 ho so mau, ten hop le cho bang users", () => {
    assert.deepStrictEqual(PROFILES.map((p) => p.username), ["demo30", "mau_ballad", "mau_rap", "mau_pop", "mau_chill"]);
    PROFILES.forEach((p) => assert.match(p.username, /^[a-z0-9_]{3,30}$/));
});

test("cung hat giong -> cung du lieu", () => {
    const a = generateHistory(demo30, songs, { seed: 42, now });
    const b = generateHistory(demo30, songs, { seed: 42, now });
    assert.deepStrictEqual(JSON.stringify(a), JSON.stringify(b));
    assert.ok(a.scans.length >= 30);
});

test("moi moc thoi gian nam trong 30 ngay toi hien tai, chi bai co trong kho", () => {
    const h = generateHistory(demo30, songs, { seed: 1, now });
    const ids = new Set(songs.map((x) => x.id));
    [...h.scans, ...h.listens, ...h.plays].forEach((r) => {
        assert.ok(r.at <= now, "khong co moc trong tuong lai");
        assert.ok(r.at >= new Date(now.getTime() - 30 * DAY), "khong qua 30 ngay");
        assert.ok(ids.has(r.songId));
    });
});

test("diem so thich tinh lai dung luat tu cac luot nghe", () => {
    const h = generateHistory(demo30, songs, { seed: 7, now });
    const expected = new Map();
    h.listens.forEach((l) => {
        const key = `${l.emotion}|${l.songId}`;
        expected.set(key, (expected.get(key) || 0) + RULES[l.action]);
    });
    assert.strictEqual(h.preferences.length, expected.size);
    h.preferences.forEach((p) => {
        // diem da lam tron 1 chu so (0.3 x 3 = 0.9000000001) -> sai so toi da 0.05
        assert.ok(Math.abs(p.score - expected.get(`${p.emotion}|${p.songId}`)) < 0.051);
    });
});

test("nghe het -> co recently_played; Not for me -> khong", () => {
    const h = generateHistory(demo30, songs, { seed: 3, now });
    const played = h.listens.filter((l) => l.action !== "declined").length;
    assert.strictEqual(h.plays.length, played);
});

test("ti le nghe het 10 ngay cuoi cao hon 10 ngay dau (he thong hoc dan)", () => {
    PROFILES.forEach((p) => {
        const h = generateHistory(p, songs, { seed: 11, now });
        const rate = (from, to) => {
            const ls = h.listens.filter((l) => l.at >= from && l.at < to);
            return ls.filter((l) => l.action === "good").length / Math.max(1, ls.length);
        };
        const start = new Date(now.getTime() - 30 * DAY);
        assert.ok(rate(new Date(now.getTime() - 10 * DAY), new Date(now.getTime() + 1)) > rate(start, new Date(start.getTime() + 10 * DAY)), p.username);
    });
});

test("demo30: 3 ngay gan nhat buon + gian > 50%, >= 4 lan quet (che do dong vien bat)", () => {
    const h = generateHistory(demo30, songs, { seed: 5, now });
    const since = new Date(now);
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 2);
    const recent = h.scans.filter((x) => x.at >= since);
    const neg = recent.filter((x) => x.emotion === "sad" || x.emotion === "angry").length;
    assert.ok(recent.length >= 4);
    assert.ok(neg / recent.length > 0.5);
});

test("do tu tin: angry thap hon happy; khoang 70% lan quet co confidence", () => {
    const h = generateHistory(PROFILES.find((p) => p.username === "mau_chill"), songs, { seed: 9, now });
    const withConf = h.scans.filter((x) => x.confidence !== null);
    assert.ok(withConf.length / h.scans.length > 0.5 && withConf.length / h.scans.length < 0.9);
    const avg = (e) => {
        const xs = withConf.filter((x) => x.emotion === e).map((x) => x.confidence);
        return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    assert.ok(avg("angry") < avg("neutral"));
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npm test`
Expected: FAIL — `Cannot find module '../scripts/lib/demoHistory'`.

- [ ] **Step 3: Viết `emotune-backend/scripts/lib/demoHistory.js`**

```js
// Sinh 30 ngay lich su MAU (hop ly, khong bua ngau nhien) cho lenh npm run seed-demo.
// HAM THUAN: khong dong DB -> unit test duoc. Du lieu mau chi de minh hoa trang thong ke, KHONG phai nguoi dung that.
//
// Moi ngay 1-4 lan quet, gio quet theo "kieu cam xuc" tung nguoi (de luoi theo buoi hien quy luat).
// ~70% lan quet coi nhu quet camera -> co do tu tin, bam so do that cua model (angry thap ~0.5).
// Ket qua nghe: ti le nghe het tang dan ~40% -> ~75% trong 30 ngay (he thong hoc dan), bai hop gu de nghe het hon.
// Diem so thich tinh lai bang DUNG LUAT cua he thong tren cac luot vua sinh.

const RULES = { good: 1, neutral: 0.3, bad: -1, declined: -1 };
const PARTS = ["morning", "afternoon", "evening", "night"];
// gio co the quet trong moi buoi (khop ranh gioi buoi o statsService)
const PART_HOURS = { morning: [6, 7, 8, 9, 10], afternoon: [12, 13, 14, 15, 16], evening: [18, 19, 20, 21], night: [22, 23] };
// do tu tin trung binh theo cam xuc (angry thap: model that chi dung 26% lop nay)
const CONFIDENCE = { happy: 0.88, neutral: 0.82, surprise: 0.74, sad: 0.68, angry: 0.52 };

const same = (moods) => ({ morning: moods, afternoon: moods, evening: moods, night: moods });

const PROFILES = [
    {
        username: "demo30",
        artists: ["Sơn Tùng M-TP", "Noo Phước Thịnh"],
        genres: ["pop", "ballad"],
        moods: {
            morning: { happy: 5, neutral: 2, surprise: 1 },
            afternoon: { neutral: 3, happy: 2, surprise: 1, angry: 1 },
            evening: { sad: 4, neutral: 2, happy: 1 },
            night: { sad: 4, angry: 1, neutral: 1 },
        },
        recentNegative: true,   // 3 ngay gan nhat buon / gian nhieu -> che do dong vien bat
    },
    { username: "mau_ballad", artists: ["Noo Phước Thịnh", "Lệ Quyên", "GUrbane"], genres: ["ballad"], moods: same({ sad: 4, neutral: 3, happy: 1 }) },
    { username: "mau_rap", artists: ["Da LAB", "RPT MCK"], genres: ["rap"], moods: same({ surprise: 4, happy: 3, angry: 1, neutral: 1 }) },
    { username: "mau_pop", artists: ["Sơn Tùng M-TP", "Taylor Swift"], genres: ["pop"], moods: same({ happy: 5, surprise: 2, neutral: 1 }) },
    { username: "mau_chill", artists: [], genres: ["thư giãn", "ballad"], moods: same({ neutral: 4, angry: 3, sad: 1 }) },
];
const RECENT_NEGATIVE = { sad: 5, angry: 2, neutral: 1 };

// bo sinh so ngau nhien co hat giong (mulberry32): cung seed -> cung day so
const makeRng = (seed) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const pickWeighted = (rand, weights) => {
    const entries = Object.entries(weights);
    const sum = entries.reduce((s, [, w]) => s + w, 0);
    let r = rand() * sum;
    for (const [key, w] of entries) {
        r -= w;
        if (r < 0) return key;
    }
    return entries[entries.length - 1][0];
};

const inTaste = (profile, song) => profile.artists.includes(song.artist) || profile.genres.includes(song.genre);

const generateHistory = (profile, songs, { seed, now, days = 30 }) => {
    const rand = makeRng(seed);
    const scans = [];
    const listens = [];
    const plays = [];
    const scores = new Map();   // "emotion|songId" -> diem

    for (let back = days - 1; back >= 0; back--) {
        const progress = (days - 1 - back) / Math.max(1, days - 1);   // 0 = ngay cu nhat, 1 = hom nay
        // demo30: 3 ngay gan nhat quet nhieu hon (3-4 lan) de che do dong vien chac chan du >= 4 lan quet
        const busy = profile.recentNegative && back <= 2;
        const scanCount = busy ? 3 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 4);
        for (let k = 0; k < scanCount; k++) {
            const part = PARTS[Math.floor(rand() * PARTS.length)];
            const hours = PART_HOURS[part];
            const at = new Date(now);
            at.setDate(at.getDate() - back);
            at.setHours(hours[Math.floor(rand() * hours.length)], Math.floor(rand() * 60), 0, 0);
            if (at > now) continue;   // hom nay: bo lan quet o tuong lai

            const moods = profile.recentNegative && back <= 2 ? RECENT_NEGATIVE : profile.moods[part];
            const emotion = pickWeighted(rand, moods);
            const camera = rand() < 0.7;
            const confidence = camera
                ? Math.round(Math.min(0.99, Math.max(0.3, CONFIDENCE[emotion] + (rand() - 0.5) * 0.16)) * 100) / 100
                : null;

            // bai hop vibe cam xuc, uu tien bai hop gu (x3)
            const pool = songs.filter((s) => s.emotion === emotion);
            const candidates = pool.length ? pool : songs;
            const song = songs.find((s) => s.id === Number(pickWeighted(rand,
                Object.fromEntries(candidates.map((s) => [s.id, inTaste(profile, s) ? 3 : 1])))));
            scans.push({ emotion, confidence, songId: song.id, at });

            // ket qua nghe (vai phut sau lan quet)
            const pGood = Math.min(0.95, Math.max(0.05, 0.4 + 0.35 * progress + (inTaste(profile, song) ? 0.1 : -0.1)));
            const r = rand();
            const rest = 1 - pGood;
            const action = r < pGood ? "good" : r < pGood + rest * 0.45 ? "neutral" : r < pGood + rest * 0.8 ? "bad" : "declined";
            const listenAt = new Date(Math.min(now.getTime(), at.getTime() + (3 + Math.floor(rand() * 4)) * 60000));
            listens.push({ emotion, songId: song.id, action, at: listenAt });
            if (action !== "declined") plays.push({ songId: song.id, at: listenAt });

            const key = `${emotion}|${song.id}`;
            scores.set(key, (scores.get(key) || 0) + RULES[action]);
        }
    }

    const preferences = [...scores.entries()].map(([key, score]) => {
        const [emotion, songId] = key.split("|");
        return { emotion, songId: Number(songId), score: Math.round(score * 10) / 10 };
    });
    return { scans, listens, plays, preferences };
};

module.exports = { PROFILES, RULES, generateHistory, makeRng };
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npm test`
Expected: tất cả PASS. Nếu test "tỉ lệ nghe hết 10 ngày cuối > 10 ngày đầu" FAIL với một hồ sơ do ngẫu nhiên (cỡ mẫu nhỏ), **không** sửa test: tăng chênh lệch xu hướng trong code (`0.35 * progress` → `0.45 * progress`) rồi chạy lại; ghi lại trong report.

---

### Task 4: Lệnh `npm run seed-demo`

**Files:**
- Create: `emotune-backend/scripts/seed-demo.js`
- Modify: `emotune-backend/package.json` (script `seed-demo`)

**Interfaces:**
- Consumes (Task 3): `PROFILES`, `generateHistory`.
- Produces: 5 tài khoản mẫu (mật khẩu `demo1234`) trong DB, có `survey_done_at`, `survey_artists`, `survey_genres`, `mood_history`, `recently_played`, `preferences`.

- [ ] **Step 1: Viết `emotune-backend/scripts/seed-demo.js`**

```js
// Tao DU LIEU MAU (30 ngay lich su) cho trang thong ke + goi y theo nguoi dung tuong tu.
// Chay: npm run seed-demo        (an toan chay lai: xoa + tao lai DUNG 5 tai khoan mau ben duoi)
// Tai khoan: demo30 (demo chinh), mau_ballad, mau_rap, mau_pop, mau_chill - mat khau deu la demo1234.
// KHONG dong toi tai khoan khac (demo, tai khoan that...). Tat ca trong 1 transaction: loi giua chung -> DB giu nguyen.
// Day la du lieu MAU de minh hoa, khong phai nguoi dung that.
const bcrypt = require("bcryptjs");
const db = require("../src/config/db");
const { PROFILES, generateHistory } = require("./lib/demoHistory");

const PASSWORD = "demo1234";
const SEED = 20261009;

const run = async () => {
    const client = await db.pool.connect();
    try {
        const hash = await bcrypt.hash(PASSWORD, 10);
        const songs = (await client.query(
            `SELECT s.id, s.title, s.emotion, a.name AS artist, g.name AS genre
             FROM songs s LEFT JOIN artists a ON a.id = s.artist_id LEFT JOIN genres g ON g.id = s.genre_id
             ORDER BY s.id`
        )).rows;
        if (!songs.length) throw new Error("Kho nhac trong - chay npm run db:setup tren may moi truoc");
        const artists = (await client.query(`SELECT id, name FROM artists`)).rows;
        const genres = (await client.query(`SELECT id, name FROM genres`)).rows;
        const now = new Date();

        await client.query("BEGIN");
        // xoa tai khoan mau cu -> moi bang con (ON DELETE CASCADE) tu xoa theo
        await client.query(`DELETE FROM users WHERE username = ANY($1)`, [PROFILES.map((p) => p.username)]);

        for (const [i, profile] of PROFILES.entries()) {
            const userId = (await client.query(
                `INSERT INTO users (username, password_hash, survey_done_at) VALUES ($1, $2, NOW()) RETURNING id`,
                [profile.username, hash]
            )).rows[0].id;

            const artistIds = artists.filter((a) => profile.artists.includes(a.name)).map((a) => a.id);
            const genreIds = genres.filter((g) => profile.genres.includes(g.name)).map((g) => g.id);
            if (artistIds.length) {
                await client.query(`INSERT INTO survey_artists (user_id, artist_id) SELECT $1, unnest($2::int[])`, [userId, artistIds]);
            }
            if (genreIds.length) {
                await client.query(`INSERT INTO survey_genres (user_id, genre_id) SELECT $1, unnest($2::int[])`, [userId, genreIds]);
            }

            const h = generateHistory(profile, songs, { seed: SEED + i, now });
            for (const x of h.scans) {
                await client.query(
                    `INSERT INTO mood_history (user_id, emotion, confidence, song_id, action, created_at) VALUES ($1, $2, $3, $4, 'suggested', $5)`,
                    [userId, x.emotion, x.confidence, x.songId, x.at]
                );
            }
            for (const x of h.listens) {
                await client.query(
                    `INSERT INTO mood_history (user_id, emotion, song_id, action, created_at) VALUES ($1, $2, $3, $4, $5)`,
                    [userId, x.emotion, x.songId, x.action, x.at]
                );
            }
            for (const x of h.plays) {
                await client.query(`INSERT INTO recently_played (user_id, song_id, played_at) VALUES ($1, $2, $3)`, [userId, x.songId, x.at]);
            }
            for (const x of h.preferences) {
                await client.query(
                    `INSERT INTO preferences (user_id, emotion, song_id, score) VALUES ($1, $2, $3, $4)`,
                    [userId, x.emotion, x.songId, x.score]
                );
            }
            console.log(`  ✓ ${profile.username}: ${h.scans.length} lan quet, ${h.listens.length} luot nghe, ${h.preferences.length} diem so thich`);
        }

        await client.query("COMMIT");
        console.log(`\nXong. Dang nhap ${PROFILES[0].username} / ${PASSWORD} roi mo /stats. (Du lieu MAU, khong phai nguoi dung that)`);
    } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("Loi, khong thay doi gi:", err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await db.pool.end();
    }
};

run();
```

- [ ] **Step 2: Thêm script** — `emotune-backend/package.json`, sau dòng `"fetch-song-info": ...`:

```json
    "seed-demo": "node scripts/seed-demo.js",
```

- [ ] **Step 3: Đếm dữ liệu tài khoản thật TRƯỚC** (Review Focus 5) — trong `emotune-backend/`:

```bash
node -e "require('dotenv').config();const db=require('./src/config/db');db.query(\"SELECT u.username,(SELECT count(*) FROM mood_history m WHERE m.user_id=u.id) mh,(SELECT count(*) FROM preferences p WHERE p.user_id=u.id) pr FROM users u WHERE u.username NOT IN ('demo30','mau_ballad','mau_rap','mau_pop','mau_chill') ORDER BY 1\").then(r=>{console.table(r.rows);return db.pool.end()})"
```
Ghi lại bảng.

- [ ] **Step 4: Chạy 2 lần**

```bash
npm run seed-demo
npm run seed-demo
```
Expected: mỗi lần in 5 dòng `✓ <tên>: N lần quét, …` với **cùng số** ở 2 lần; dòng cuối "Xong…". Chạy lại lệnh ở Step 3 → bảng **giống hệt** trước.

- [ ] **Step 5: curl `/stats` của `demo30`** (server như Task 2 Step 5)

```bash
TOKEN=$(curl -s -X POST localhost:8080/auth/login -H "Content-Type: application/json" -d '{"username":"demo30","password":"demo1234"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")
curl -s "localhost:8080/stats?days=30" -H "Authorization: Bearer $TOKEN" | node -pe "const d=JSON.parse(require('fs').readFileSync(0)); JSON.stringify({o:d.overview, top:d.topSongs.length, art:d.topArtists.length, rate:d.hitRate.total.rate, conf:d.confidence, pref:d.preferences.length})"
```
Expected: `scans` > 30, `plays` > 20, `listenSeconds` > 0, `top` 5, `art` ≥ 3, `rate` 0.4–0.8, `conf` có `angry` thấp nhất, `pref` ≥ 5. So với `demo` (Task 2) → số khác hẳn (Review Focus 3).

---

### Task 5: Frontend — khung trang, chọn 7/30 ngày, tổng quan, biểu đồ theo ngày

**Files:**
- Create: `emotune-frontend/src/components/stats/statsMeta.js`
- Create: `emotune-frontend/src/components/stats/StatsCard.jsx`
- Create: `emotune-frontend/src/components/stats/OverviewTiles.jsx`
- Create: `emotune-frontend/src/components/stats/DailyChart.jsx`
- Create: `emotune-frontend/src/components/stats/Stats.scss`
- Modify (thay toàn bộ): `emotune-frontend/src/pages/MoodPage.jsx`

**Interfaces:**
- Consumes: `GET /stats?days=` (Task 2), `GET /mood-history` + `buildDays`, `cheerUpStatus`, `EMOTIONS` (`src/utils/moodStats.js`), `MoodIcon` (`emotion`, `size`).
- Produces: `statsMeta.js` exports `EMOTIONS, WEEKDAYS, PARTS, OUTCOMES, sumCounts, dominant, formatListen, dayLabel, niceScale`; `StatsCard` (`title`, `note?`, `table?`, `className?`, `children`) + `MoodLegend`; trang có chỗ (`<div className="stats-pair">`) để Task 6–7 thêm mục. Task 6, 7 import các component mới vào `MoodPage.jsx` ở đúng vị trí ghi chú.

- [ ] **Step 1: `src/components/stats/statsMeta.js`**

```js
// Hằng số + hàm định dạng dùng chung cho các mục trang thống kê
import { EMOTIONS } from '../../utils/moodStats';

export { EMOTIONS };   // thứ tự màu cố định: happy, surprise, neutral, sad, angry

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];   // weekday 1..7 của API
export const PARTS = [
    { key: 'morning', label: 'Morning', hours: '5–11' },
    { key: 'afternoon', label: 'Afternoon', hours: '11–17' },
    { key: 'evening', label: 'Evening', hours: '17–22' },
    { key: 'night', label: 'Night', hours: '22–5' },
];
// kết quả 1 lượt nghe, từ tốt tới xấu (màu trong Stats.scss: .out-good …)
export const OUTCOMES = [
    { key: 'good', label: 'Played to the end' },
    { key: 'neutral', label: 'Played about half' },
    { key: 'bad', label: 'Skipped early' },
    { key: 'declined', label: 'Not for me' },
];

export const sumCounts = (counts) => EMOTIONS.reduce((s, e) => s + (counts[e.key] || 0), 0);

// cảm xúc nhiều nhất trong 1 ô (hoà: theo thứ tự EMOTIONS), không có -> null
export const dominant = (counts) => {
    let best = null;
    EMOTIONS.forEach((e) => {
        if ((counts[e.key] || 0) > (best ? counts[best] : 0)) best = e.key;
    });
    return best;
};

// 2950 -> "49m", 7260 -> "2h 1m"
export const formatListen = (seconds) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return h ? `${h}h ${m}m` : `${m}m`;
};

// "2026-10-09" -> { label: 'Thu', sub: '9 Oct' } (ngày cuối = 'Today'); không đổi múi giờ
export const dayLabel = (iso, isLast) => {
    const [y, mo, d] = iso.split('-').map(Number);
    const date = new Date(y, mo - 1, d);
    return {
        label: isLast ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'short' }),
        sub: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    };
};

// trục dọc: vạch chia số "đẹp" (1, 2, 5, 10)
export const niceScale = (max) => {
    const m = Math.max(1, max);
    const step = m <= 4 ? 1 : m <= 10 ? 2 : m <= 25 ? 5 : 10;
    const top = Math.ceil(m / step) * step;
    const ticks = [];
    for (let v = 0; v <= top; v += step) ticks.push(v);
    return { top, ticks };
};
```

- [ ] **Step 2: `src/components/stats/StatsCard.jsx`**

```jsx
import { useState } from 'react';
import { EMOTIONS } from './statsMeta';

// Khung 1 mục: tiêu đề + nút "View as table" (khi có bảng) + ghi chú
const StatsCard = ({ title, note, table, className = '', children }) => {
    const [showTable, setShowTable] = useState(false);
    return (
        <section className={`stats-card ${className}`}>
            <div className="chart-top">
                <h2>{title}</h2>
                {table && (
                    <button className="table-toggle" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
                        {showTable ? 'Show chart' : 'View as table'}
                    </button>
                )}
            </div>
            {note && <p className="stats-note">{note}</p>}
            {showTable && table ? <div className="mood-table-wrap">{table}</div> : children}
        </section>
    );
};

// chú giải màu 5 cảm xúc (luôn có chữ, không chỉ dựa vào màu)
export const MoodLegend = () => (
    <ul className="chart-legend" aria-label="Legend">
        {EMOTIONS.map((e) => (
            <li key={e.key}><span className={`swatch ${e.key}`} aria-hidden="true" />{e.label}</li>
        ))}
    </ul>
);

export default StatsCard;
```

- [ ] **Step 3: `src/components/stats/OverviewTiles.jsx`**

```jsx
import MoodIcon from '../MoodIcon';
import { formatListen } from './statsMeta';

// 5 ô tổng quan; ô Cheer-up dùng cheerUpStatus từ /mood-history (như trang cũ)
const OverviewTiles = ({ overview, days, cheer }) => (
    <section className="mood-tiles stats-tiles">
        <div className="mood-tile">
            <span className="tile-label">Scans in {days} days</span>
            <span className="tile-value">{overview.scans}</span>
        </div>
        <div className="mood-tile">
            <span className="tile-label">Most common mood</span>
            <span className="tile-value">{overview.topEmotion ? <MoodIcon emotion={overview.topEmotion} size={40} /> : '—'}</span>
        </div>
        <div className="mood-tile">
            <span className="tile-label">Songs played</span>
            <span className="tile-value">{overview.plays}</span>
        </div>
        <div className="mood-tile">
            <span className="tile-label">Listening time</span>
            <span className="tile-value" title="Sum of the full length of each song you played">≈ {formatListen(overview.listenSeconds)}</span>
        </div>
        <div className={`mood-tile status ${cheer?.on ? 'on' : ''}`}>
            <span className="tile-label">Cheer-up mode</span>
            <span className="tile-value">{cheer ? (cheer.on ? 'On' : 'Off') : '—'}</span>
            {cheer && (
                <span className="tile-note">
                    {cheer.on
                        ? `${cheer.negative} of ${cheer.total} scans ${cheer.span} were sad or angry, so when you feel down NYX plays happier songs.`
                        : cheer.total < 4
                            ? `NYX needs at least 4 scans to see a trend (${cheer.total} ${cheer.span}).`
                            : `Only ${cheer.negative} of ${cheer.total} scans ${cheer.span} were sad or angry. NYX follows your mood as it is.`}
                </span>
            )}
        </div>
    </section>
);

export default OverviewTiles;
```

- [ ] **Step 4: `src/components/stats/DailyChart.jsx`** (chuyển biểu đồ cũ thành component, nhận `daily` từ API, 7 hoặc 30 cột)

```jsx
import { useState } from 'react';
import StatsCard, { MoodLegend } from './StatsCard';
import { EMOTIONS, dayLabel, niceScale, sumCounts } from './statsMeta';

// Cột chồng: số lần quét mỗi ngày theo cảm xúc. 30 ngày -> nhãn trục thưa (mỗi 5 ngày + hôm nay)
const DailyChart = ({ daily }) => {
    const [hover, setHover] = useState(null);
    const days = daily.map((d, i) => ({ ...d, ...dayLabel(d.date, i === daily.length - 1), total: sumCounts(d.counts) }));
    const sum = days.reduce((s, d) => s + d.total, 0);
    const { top, ticks } = niceScale(Math.max(...days.map((d) => d.total)));
    const dense = days.length > 7;
    const cols = { gridTemplateColumns: `repeat(${days.length}, 1fr)` };
    const showX = (i) => !dense || i === days.length - 1 || (days.length - 1 - i) % 5 === 0;

    const table = (
        <table className="mood-table">
            <thead><tr><th>Day</th>{EMOTIONS.map((e) => <th key={e.key}>{e.label}</th>)}<th>Total</th></tr></thead>
            <tbody>
                {days.map((d) => (
                    <tr key={d.date}>
                        <td>{d.label} · {d.sub}</td>
                        {EMOTIONS.map((e) => <td key={e.key}>{d.counts[e.key] || 0}</td>)}
                        <td><b>{d.total}</b></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <StatsCard title="Scans per day, by mood" table={table}>
            <MoodLegend />
            {sum === 0 ? (
                <p className="mood-muted chart-empty">No scans in this period. Scan your face or pick a mood on the home page, and your days fill in here.</p>
            ) : (
                <div className={`chart ${dense ? 'dense' : ''}`} role="img" aria-label={`Stacked bar chart of ${sum} scans over ${days.length} days`}>
                    <div className="chart-grid" aria-hidden="true">
                        {ticks.map((t) => (
                            <div key={t} className="grid-line" style={{ bottom: `${(t / top) * 100}%` }}><span>{t}</span></div>
                        ))}
                    </div>
                    <div className="chart-cols" style={cols}>
                        {days.map((d, i) => (
                            <div
                                key={d.date}
                                className={`chart-col ${hover === i ? 'hover' : ''}`}
                                onMouseEnter={() => setHover(i)}
                                onMouseLeave={() => setHover(null)}
                                onFocus={() => setHover(i)}
                                onBlur={() => setHover(null)}
                                tabIndex={d.total ? 0 : -1}
                            >
                                <div className="stack" style={{ height: `${(d.total / top) * 100}%` }}>
                                    {EMOTIONS.filter((e) => d.counts[e.key]).map((e) => (
                                        <div key={e.key} className={`seg ${e.key}`} style={{ flexGrow: d.counts[e.key] }} />
                                    ))}
                                </div>
                                {hover === i && d.total > 0 && (
                                    <div className="chart-tip" role="tooltip">
                                        <strong>{d.label} · {d.sub}</strong>
                                        {EMOTIONS.filter((e) => d.counts[e.key]).map((e) => (
                                            <span key={e.key}><i className={`swatch ${e.key}`} />{e.label}<b>{d.counts[e.key]}</b></span>
                                        ))}
                                        <span className="tip-total">Total<b>{d.total}</b></span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="chart-x" aria-hidden="true" style={cols}>
                        {days.map((d, i) => (
                            <span key={d.date}>{showX(i) && <><b>{dense ? d.sub : d.label}</b>{dense ? '' : d.sub}</>}</span>
                        ))}
                    </div>
                </div>
            )}
        </StatsCard>
    );
};

export default DailyChart;
```

- [ ] **Step 5: `src/components/stats/Stats.scss`** (phần chung + tổng quan + biểu đồ ngày; Task 6–7 nối thêm vào cuối file)

```scss
// Trang thống kê mới — nằm trong .mood-page (dùng lại biến màu --mood-*, --card, --grid và style biểu đồ của MoodPage.scss)
.mood-page.stats-page {
  // màu kết quả nghe (đã kiểm tra dataviz trên nền #141218): xanh = nghe hết … đỏ = Not for me
  --out-good: #4a8fe0;
  --out-neutral: #6c6a66;
  --out-bad: #c27a1c;
  --out-declined: #c23a4f;

  max-width: 1200px;

  .stats-head {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }

  // nút 7 / 30 ngày
  .stats-range {
    display: inline-flex;
    padding: 3px;
    border-radius: 999px;
    background: var(--card);
    border: 1px solid var(--grid);

    button {
      padding: 7px 16px;
      border: none;
      border-radius: 999px;
      background: none;
      color: var(--search-text);
      font: 600 13px 'DM Sans', sans-serif;
      cursor: pointer;

      &[aria-pressed='true'] {
        background: var(--accent);
        color: var(--on-premium);
      }
    }
  }

  .stats-section {
    margin-top: 8px;
    font-family: 'Be Vietnam Pro', 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 700;
  }

  .stats-card {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px 22px 18px;
    border-radius: 12px;
    background: var(--card);
    border: 1px solid var(--grid);
  }

  .stats-note {
    margin-top: -6px;
    font-size: 13px;
    line-height: 1.45;
    color: var(--muted);
  }

  // 2 thẻ cạnh nhau (thẻ trái rộng hơn)
  .stats-pair {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: 16px;
  }

  .stats-tiles {
    grid-template-columns: repeat(4, minmax(0, 1fr)) minmax(0, 2fr);
  }

  // 30 cột: khe hẹp, cột mảnh
  .chart.dense {
    .chart-cols,
    .chart-x {
      gap: 3px;
    }

    .stack {
      width: 80%;
    }
  }

  .stats-error {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--muted);
  }
}

@media (max-width: 1000px) {
  .mood-page.stats-page {
    .stats-pair {
      grid-template-columns: minmax(0, 1fr);
    }

    .stats-tiles {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}

@media (max-width: 640px) {
  .mood-page.stats-page {
    .stats-tiles {
      grid-template-columns: repeat(2, minmax(0, 1fr));

      .status {
        grid-column: 1 / -1;
      }
    }

    .stats-card {
      padding: 16px 14px;
    }

    .chart.dense .chart-x span {
      font-size: 9px;
    }
  }
}
```

- [ ] **Step 6: `src/pages/MoodPage.jsx`** (thay toàn bộ)

```jsx
import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { buildDays, cheerUpStatus } from '../utils/moodStats';
import OverviewTiles from '../components/stats/OverviewTiles';
import DailyChart from '../components/stats/DailyChart';
import './MoodPage.scss';
import '../components/stats/Stats.scss';

// Trang thống kê (/stats), spec docs/superpowers/specs/2026-10-09-stats-page-design.md:
// phần "You" (người dùng tự hiểu mình) + "What NYX learned about you" (thể hiện hệ thống học được gì).
// Số liệu từ GET /stats?days=7|30; ô Cheer-up vẫn tính từ GET /mood-history như trước.
const RANGES = [7, 30];

const MoodPage = () => {
    const [days, setDays] = useState(7);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const [history, setHistory] = useState(null);

    // đổi 7/30 ngày: giữ số liệu cũ trên màn tới khi có số mới (không nhảy trang, giữ vị trí cuộn)
    useEffect(() => {
        let alive = true;
        api.get('/stats', { params: { days } })
            .then((res) => {
                if (!alive) return;
                setStats(res.data);
                setError('');
            })
            .catch(() => alive && setError("Couldn't load your stats."));
        return () => { alive = false; };
    }, [days, reload]);

    useEffect(() => {
        api.get('/mood-history').then((res) => setHistory(res.data)).catch(() => setHistory([]));
    }, []);

    const cheer = useMemo(() => (history ? cheerUpStatus(buildDays(history)) : null), [history]);
    const retry = <button className="table-toggle" onClick={() => setReload((n) => n + 1)}>Try again</button>;

    if (!stats) {
        return (
            <div className="mood-page stats-page">
                {error ? <p className="stats-error">{error} {retry}</p> : <p className="mood-muted">Loading…</p>}
            </div>
        );
    }

    return (
        <div className="mood-page stats-page">
            <header className="mood-head stats-head">
                <div>
                    <span className="mood-eyebrow">Your stats</span>
                    <h1>How you feel &amp; what you play</h1>
                    <p>Everything here comes from your own scans and listens. Nobody else can see it.</p>
                </div>
                <div className="stats-range" role="group" aria-label="Time range">
                    {RANGES.map((n) => (
                        <button key={n} aria-pressed={days === n} onClick={() => setDays(n)}>{n} days</button>
                    ))}
                </div>
            </header>
            {error && <p className="stats-error">{error} {retry}</p>}

            <h2 className="stats-section">You</h2>
            <OverviewTiles overview={stats.overview} days={stats.days} cheer={cheer} />
            <div className="stats-pair">
                <DailyChart daily={stats.daily} />
                {/* Task 6: <DaypartGrid cells={stats.dayparts} /> */}
            </div>
            {/* Task 6: <TopLists songs={stats.topSongs} artists={stats.topArtists} /> */}
            {/* Task 6: <MoodSongs data={stats.moodSongs} /> */}

            <h2 className="stats-section">What NYX learned about you</h2>
            {/* Task 7: <div className="stats-pair"><HitRateChart hitRate={stats.hitRate} /><ConfidenceBars confidence={stats.confidence} /></div> */}
            {/* Task 7: <PreferenceGrid rows={stats.preferences} /> */}
        </div>
    );
};

export default MoodPage;
```

- [ ] **Step 7: Lint + build** (trong `emotune-frontend/`): `npx eslint src && npm run build` → 0 lỗi, 0 cảnh báo, build OK. Nếu `react-hooks/set-state-in-effect` báo ở effect `/mood-history`: giữ nguyên (setState nằm trong `.then`, bất đồng bộ); nếu vẫn báo thì bọc bằng `let alive` như effect trên.

---

### Task 6: Frontend — theo buổi, top bài & ca sĩ, nghe gì khi…

**Files:**
- Create: `emotune-frontend/src/components/stats/DaypartGrid.jsx`, `TopLists.jsx`, `MoodSongs.jsx`
- Modify: `emotune-frontend/src/components/stats/Stats.scss` (nối cuối file)
- Modify: `emotune-frontend/src/pages/MoodPage.jsx` (thay 3 dòng ghi chú "Task 6")

**Interfaces:**
- Consumes: `stats.dayparts` `[{weekday, part, counts}]`, `stats.topSongs` `[{song, plays}]`, `stats.topArtists` `[{id,name,avatar,plays}]`, `stats.moodSongs` `{happy:[{song,times}],…}`; `StatsCard`, `statsMeta`; `usePlayback().playSong`; `useNavigate`; `SongThumb` (`song`, `className`); `ArtistAvatar` (`name`, `avatar`, `className`); `MoodIcon`.

- [ ] **Step 1: `DaypartGrid.jsx`**

```jsx
import { useState } from 'react';
import StatsCard, { MoodLegend } from './StatsCard';
import { EMOTIONS, PARTS, WEEKDAYS, dominant, sumCounts } from './statsMeta';

// Lưới thứ × buổi: màu = cảm xúc nhiều nhất trong ô, độ đậm = số lần quét
const DaypartGrid = ({ cells }) => {
    const [hover, setHover] = useState(null);
    const max = Math.max(1, ...cells.map((c) => sumCounts(c.counts)));
    const sum = cells.reduce((s, c) => s + sumCounts(c.counts), 0);
    const cellOf = (weekday, part) => cells.find((c) => c.weekday === weekday && c.part === part);

    const table = (
        <table className="mood-table">
            <thead><tr><th>Day</th>{PARTS.map((p) => <th key={p.key}>{p.label}</th>)}</tr></thead>
            <tbody>
                {WEEKDAYS.map((w, i) => (
                    <tr key={w}>
                        <td>{w}</td>
                        {PARTS.map((p) => {
                            const c = cellOf(i + 1, p.key);
                            const mood = dominant(c.counts);
                            return <td key={p.key}>{sumCounts(c.counts) ? `${sumCounts(c.counts)} · ${EMOTIONS.find((e) => e.key === mood).label}` : '0'}</td>;
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <StatsCard title="Mood by time of day" note="Colour = your most common mood · stronger = more scans" table={table}>
            {sum === 0 ? (
                <p className="mood-muted chart-empty">Scan at different times of day to see when you feel what.</p>
            ) : (
                <>
                    <div className="daypart-wrap">
                        <div className="daypart-grid" role="img" aria-label={`Moods by weekday and time of day, ${sum} scans`}>
                            <span />
                            {PARTS.map((p) => <span key={p.key} className="dp-head">{p.label}<small>{p.hours}h</small></span>)}
                            {WEEKDAYS.map((w, i) => (
                                <div key={w} className="dp-row">
                                    <span className="dp-day">{w}</span>
                                    {PARTS.map((p) => {
                                        const c = cellOf(i + 1, p.key);
                                        const n = sumCounts(c.counts);
                                        const mood = dominant(c.counts);
                                        const id = `${i}-${p.key}`;
                                        return (
                                            <div
                                                key={p.key}
                                                className={`dp-cell ${mood || 'empty'}`}
                                                style={{ '--level': n ? 0.3 + 0.7 * (n / max) : 0 }}
                                                tabIndex={n ? 0 : -1}
                                                onMouseEnter={() => setHover(id)}
                                                onMouseLeave={() => setHover(null)}
                                                onFocus={() => setHover(id)}
                                                onBlur={() => setHover(null)}
                                            >
                                                <span className="dp-n">{n || ''}</span>
                                                {hover === id && n > 0 && (
                                                    <div className="chart-tip" role="tooltip">
                                                        <strong>{w} · {p.label}</strong>
                                                        {EMOTIONS.filter((e) => c.counts[e.key]).map((e) => (
                                                            <span key={e.key}><i className={`swatch ${e.key}`} />{e.label}<b>{c.counts[e.key]}</b></span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                    <MoodLegend />
                </>
            )}
        </StatsCard>
    );
};

export default DaypartGrid;
```

- [ ] **Step 2: `TopLists.jsx`**

```jsx
import { useNavigate } from 'react-router-dom';
import ArtistAvatar from '../ArtistAvatar';
import SongThumb from '../SongThumb';
import { usePlayback } from '../../contexts/playbackContext';
import StatsCard from './StatsCard';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Top 5 bài (bấm = phát) + top 5 ca sĩ (bấm = mở trang ca sĩ) trong khoảng đã chọn
const TopLists = ({ songs, artists }) => {
    const { playSong } = usePlayback();
    const navigate = useNavigate();
    return (
        <div className="stats-pair even">
            <StatsCard title="Top songs">
                {songs.length ? (
                    <ol className="top-list">
                        {songs.map(({ song, plays }, i) => (
                            <li key={song.id}>
                                <button onClick={() => playSong(song)} title={`Play ${song.title}`}>
                                    <span className="rank">{i + 1}</span>
                                    <SongThumb className="top-thumb" song={song} />
                                    <span className="top-text"><b>{song.title}</b><small>{song.artist || 'Unknown artist'}</small></span>
                                    <span className="top-count">{plural(plays, 'play')}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                ) : <p className="mood-muted">Listen to a few songs to see your top tracks.</p>}
            </StatsCard>
            <StatsCard title="Top artists">
                {artists.length ? (
                    <ol className="top-list">
                        {artists.map((a, i) => (
                            <li key={a.id}>
                                <button onClick={() => navigate(`/artist/${a.id}`)} title={`Open ${a.name}`}>
                                    <span className="rank">{i + 1}</span>
                                    <ArtistAvatar className="top-thumb round" name={a.name} avatar={a.avatar} />
                                    <span className="top-text"><b>{a.name}</b><small>Artist</small></span>
                                    <span className="top-count">{plural(a.plays, 'play')}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                ) : <p className="mood-muted">Your favourite artists show up here once you listen.</p>}
            </StatsCard>
        </div>
    );
};

export default TopLists;
```

- [ ] **Step 3: `MoodSongs.jsx`**

```jsx
import MoodIcon from '../MoodIcon';
import { usePlayback } from '../../contexts/playbackContext';
import StatsCard from './StatsCard';
import { EMOTIONS } from './statsMeta';

// "What you play when you feel…": mỗi cảm xúc 3 bài bạn hay nghe hết khi đang ở cảm xúc đó
const MoodSongs = ({ data }) => {
    const { playSong } = usePlayback();
    const any = EMOTIONS.some((e) => data[e.key]?.length);
    return (
        <StatsCard title="What you play when you feel…" note="Songs you played to the end right after a scan with that mood">
            {any ? (
                <div className="mood-songs">
                    {EMOTIONS.map((e) => (
                        <div key={e.key} className="mood-col">
                            <div className="mood-col-head"><MoodIcon emotion={e.key} size={28} /><span>{e.label}</span></div>
                            {data[e.key]?.length ? (
                                <ul>
                                    {data[e.key].map(({ song, times }) => (
                                        <li key={song.id}>
                                            <button onClick={() => playSong(song)} title={`Play ${song.title}`}>
                                                <span className="ms-title">{song.title}</span>
                                                <span className="ms-times">{times}×</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="mood-muted ms-empty">Nothing yet</p>}
                        </div>
                    ))}
                </div>
            ) : <p className="mood-muted">When you finish a song after a scan, it shows up here under that mood.</p>}
        </StatsCard>
    );
};

export default MoodSongs;
```

- [ ] **Step 4: Nối vào cuối `Stats.scss`**

```scss
// ---- Task 6: theo buổi, top, nghe gì khi… ----
.mood-page.stats-page {
  .stats-pair.even {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  // lưới thứ × buổi: cuộn ngang trong thẻ khi hẹp
  .daypart-wrap {
    overflow-x: auto;
  }

  .daypart-grid {
    min-width: 320px;
    display: grid;
    grid-template-columns: 40px repeat(4, minmax(56px, 1fr));
    gap: 4px;

    .dp-row {
      display: contents;
    }

    .dp-head {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 12px;
      color: var(--search-text);

      small {
        font-size: 10px;
        color: var(--muted);
      }
    }

    .dp-day {
      align-self: center;
      font-size: 12px;
      color: var(--muted);
    }
  }

  .dp-cell {
    position: relative;
    height: 34px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
    outline: none;

    // lớp màu cảm xúc, độ đậm theo --level
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--dp-color, transparent);
      opacity: var(--level);
    }

    &.happy { --dp-color: var(--mood-happy); }
    &.surprise { --dp-color: var(--mood-surprise); }
    &.neutral { --dp-color: var(--mood-neutral); }
    &.sad { --dp-color: var(--mood-sad); }
    &.angry { --dp-color: var(--mood-angry); }

    &:hover,
    &:focus-visible {
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
    }

    .dp-n {
      position: relative;
      display: grid;
      place-items: center;
      height: 100%;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      font-variant-numeric: tabular-nums;
    }

    .chart-tip {
      bottom: calc(100% + 6px);
      transform: translateX(-50%);
    }
  }

  // top bài / ca sĩ
  .top-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;

    button {
      width: 100%;
      display: grid;
      grid-template-columns: 22px 44px minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      padding: 6px 8px;
      border: none;
      border-radius: 8px;
      background: none;
      color: #fff;
      text-align: left;
      font-family: inherit;
      cursor: pointer;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
      }
    }

    .rank {
      font-size: 14px;
      color: var(--muted);
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .top-thumb {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      object-fit: cover;
      font-size: 14px;

      &.round {
        border-radius: 50%;
      }
    }

    .top-text {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;

      b,
      small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      b {
        font-size: 14px;
        font-weight: 600;
      }

      small {
        font-size: 12px;
        color: var(--muted);
      }
    }

    .top-count {
      font-size: 12px;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }
  }

  // nghe gì khi…
  .mood-songs {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
  }

  .mood-col {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;

    ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border: none;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.04);
      color: #fff;
      font-family: inherit;
      font-size: 13px;
      text-align: left;
      cursor: pointer;

      &:hover {
        background: rgba(255, 255, 255, 0.09);
      }
    }

    .ms-title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ms-times {
      font-size: 12px;
      color: var(--muted);
    }

    .ms-empty {
      font-size: 13px;
    }
  }

  .mood-col-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
  }
}

@media (max-width: 1000px) {
  .mood-page.stats-page {
    .stats-pair.even {
      grid-template-columns: minmax(0, 1fr);
    }

    .mood-songs {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}

@media (max-width: 640px) {
  .mood-page.stats-page .mood-songs {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

- [ ] **Step 5: Gắn vào `MoodPage.jsx`** — thêm import:

```jsx
import DaypartGrid from '../components/stats/DaypartGrid';
import TopLists from '../components/stats/TopLists';
import MoodSongs from '../components/stats/MoodSongs';
```
và thay 3 dòng ghi chú `{/* Task 6: … */}` bằng:

```jsx
                <DaypartGrid cells={stats.dayparts} />
```
(trong `stats-pair`, sau `<DailyChart … />`), rồi sau `</div>` của cặp đó:

```jsx
            <TopLists songs={stats.topSongs} artists={stats.topArtists} />
            <MoodSongs data={stats.moodSongs} />
```

- [ ] **Step 6: Lint + build** — `npx eslint src && npm run build` → sạch, OK.

---

### Task 7: Frontend — gợi ý trúng, độ tự tin AI, điểm sở thích

**Files:**
- Create: `emotune-frontend/src/components/stats/HitRateChart.jsx`, `ConfidenceBars.jsx`, `PreferenceGrid.jsx`
- Modify: `emotune-frontend/src/components/stats/Stats.scss` (nối cuối file)
- Modify: `emotune-frontend/src/pages/MoodPage.jsx` (thay 2 dòng ghi chú "Task 7")

**Interfaces:**
- Consumes: `stats.hitRate` `{total:{good,neutral,bad,declined,rate}, daily:[{date,good,neutral,bad,declined}]}`, `stats.confidence` `[{emotion,avg,count}]`, `stats.preferences` `[{song, scores}]`; `StatsCard`, `statsMeta` (`OUTCOMES`, `EMOTIONS`, `dayLabel`); `MoodIcon`; `SongThumb`; `usePlayback().playSong`.

- [ ] **Step 1: `HitRateChart.jsx`**

```jsx
import { useState } from 'react';
import StatsCard from './StatsCard';
import { OUTCOMES, dayLabel } from './statsMeta';

const sumOut = (d) => OUTCOMES.reduce((s, o) => s + d[o.key], 0);
// tỉ lệ nghe hết của 1 nhóm ngày (null nếu không có lượt nghe)
const rateOf = (list) => {
    const total = list.reduce((s, d) => s + sumOut(d), 0);
    return total ? list.reduce((s, d) => s + d.good, 0) / total : null;
};
const pct = (x) => `${Math.round(x * 100)}%`;

// "Gợi ý trúng tới đâu": % nghe hết + cột 100% mỗi ngày (nghe hết / một nửa / bỏ qua / Not for me)
const HitRateChart = ({ hitRate }) => {
    const [hover, setHover] = useState(null);
    const { total, daily } = hitRate;
    const listened = sumOut(total);
    const half = Math.floor(daily.length / 2);
    const early = rateOf(daily.slice(0, half));
    const late = rateOf(daily.slice(half));
    const cols = { gridTemplateColumns: `repeat(${daily.length}, 1fr)` };

    const table = (
        <table className="mood-table">
            <thead><tr><th>Day</th>{OUTCOMES.map((o) => <th key={o.key}>{o.label}</th>)}</tr></thead>
            <tbody>
                {daily.map((d, i) => {
                    const { label, sub } = dayLabel(d.date, i === daily.length - 1);
                    return <tr key={d.date}><td>{label} · {sub}</td>{OUTCOMES.map((o) => <td key={o.key}>{d[o.key]}</td>)}</tr>;
                })}
            </tbody>
        </table>
    );

    return (
        <StatsCard title="How often NYX got it right" table={listened ? table : null}>
            {!listened ? (
                <p className="mood-muted chart-empty">Listen to a few suggested songs. NYX learns from how much of each song you play.</p>
            ) : (
                <>
                    <div className="hit-hero">
                        <span className="hit-value">{pct(total.rate)}</span>
                        <span className="hit-label">
                            of suggested songs played to the end
                            {early !== null && late !== null && (
                                <small>{late >= early ? 'Up' : 'Down'} from {pct(early)} in the first half of this period</small>
                            )}
                        </span>
                    </div>
                    <ul className="chart-legend" aria-label="Legend">
                        {OUTCOMES.map((o) => (
                            <li key={o.key}><span className={`swatch out-${o.key}`} aria-hidden="true" />{o.label} · {total[o.key]}</li>
                        ))}
                    </ul>
                    <div className="hit-chart" role="img" aria-label={`Listening outcomes per day, ${listened} listens`}>
                        <div className="hit-cols" style={cols}>
                            {daily.map((d, i) => {
                                const n = sumOut(d);
                                const { label, sub } = dayLabel(d.date, i === daily.length - 1);
                                return (
                                    <div
                                        key={d.date}
                                        className={`hit-col ${hover === i ? 'hover' : ''}`}
                                        tabIndex={n ? 0 : -1}
                                        onMouseEnter={() => setHover(i)}
                                        onMouseLeave={() => setHover(null)}
                                        onFocus={() => setHover(i)}
                                        onBlur={() => setHover(null)}
                                    >
                                        {n > 0 ? (
                                            <div className="hit-stack">
                                                {OUTCOMES.filter((o) => d[o.key]).map((o) => (
                                                    <div key={o.key} className={`seg out-${o.key}`} style={{ flexGrow: d[o.key] }} />
                                                ))}
                                            </div>
                                        ) : <div className="hit-none" />}
                                        {hover === i && n > 0 && (
                                            <div className="chart-tip" role="tooltip">
                                                <strong>{label} · {sub}</strong>
                                                {OUTCOMES.filter((o) => d[o.key]).map((o) => (
                                                    <span key={o.key}><i className={`swatch out-${o.key}`} />{o.label}<b>{d[o.key]}</b></span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </StatsCard>
    );
};

export default HitRateChart;
```

- [ ] **Step 2: `ConfidenceBars.jsx`**

```jsx
import MoodIcon from '../MoodIcon';
import StatsCard from './StatsCard';
import { EMOTIONS } from './statsMeta';

// "AI đoán mặt chắc tới đâu": độ tự tin trung bình của model nhận diện khuôn mặt cho từng cảm xúc (chỉ lần quét camera)
const ConfidenceBars = ({ confidence }) => {
    const rows = EMOTIONS.map((e) => ({ ...e, item: confidence.find((c) => c.emotion === e.key) })).filter((r) => r.item);
    const table = (
        <table className="mood-table">
            <thead><tr><th>Mood</th><th>Average confidence</th><th>Camera scans</th></tr></thead>
            <tbody>
                {rows.map((r) => <tr key={r.key}><td>{r.label}</td><td>{Math.round(r.item.avg * 100)}%</td><td>{r.item.count}</td></tr>)}
            </tbody>
        </table>
    );
    return (
        <StatsCard title="How sure the face AI was" note="Average confidence when the camera picked each mood" table={rows.length ? table : null}>
            {rows.length ? (
                <ul className="conf-list">
                    {rows.map((r) => (
                        <li key={r.key}>
                            <span className="conf-name"><MoodIcon emotion={r.key} size={24} />{r.label}</span>
                            <span className="conf-track"><span className={`conf-bar ${r.key}`} style={{ width: `${r.item.avg * 100}%` }} /></span>
                            <span className="conf-value">{Math.round(r.item.avg * 100)}%<small>{r.item.count} scans</small></span>
                        </li>
                    ))}
                </ul>
            ) : <p className="mood-muted chart-empty">No camera scans yet. Scan with the camera to see how sure the AI is.</p>}
        </StatsCard>
    );
};

export default ConfidenceBars;
```

- [ ] **Step 3: `PreferenceGrid.jsx`**

```jsx
import MoodIcon from '../MoodIcon';
import SongThumb from '../SongThumb';
import { usePlayback } from '../../contexts/playbackContext';
import StatsCard from './StatsCard';
import { EMOTIONS } from './statsMeta';

// màu phân kỳ (đã kiểm tra dataviz): dương = xanh, âm = đỏ, 0 = trong suốt; độ đậm theo |điểm| / |điểm| lớn nhất
const POS = '74, 143, 224';   // #4a8fe0
const NEG = '194, 58, 79';    // #c23a4f
const cellStyle = (score, max) => {
    if (!score) return undefined;
    const alpha = 0.18 + 0.72 * Math.min(1, Math.abs(score) / max);
    return { background: `rgba(${score > 0 ? POS : NEG}, ${alpha})` };
};
const fmt = (x) => (x > 0 ? `+${x}` : `${x}`).replace('-', '−');

// "Điểm sở thích": hệ thống học được bạn thích bài nào khi đang ở cảm xúc nào
const PreferenceGrid = ({ rows }) => {
    const { playSong } = usePlayback();
    const max = Math.max(1, ...rows.flatMap((r) => EMOTIONS.map((e) => Math.abs(r.scores[e.key] || 0))));
    const note = 'Each finished song after a scan adds +1 to that song for that mood, about half adds +0.3, skipping early or "Not for me" takes 1 away. NYX picks higher-scoring songs first.';
    return (
        <StatsCard title="What NYX thinks you like, by mood" note={note}>
            {rows.length ? (
                <div className="pref-wrap">
                    <table className="pref-table">
                        <thead>
                            <tr>
                                <th className="pref-song">Song</th>
                                {EMOTIONS.map((e) => <th key={e.key}><span className="pref-head"><MoodIcon emotion={e.key} size={22} />{e.label}</span></th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ song, scores }) => (
                                <tr key={song.id}>
                                    <td className="pref-song">
                                        <button onClick={() => playSong(song)} title={`Play ${song.title}`}>
                                            <SongThumb className="pref-thumb" song={song} />
                                            <span><b>{song.title}</b><small>{song.artist || 'Unknown artist'}</small></span>
                                        </button>
                                    </td>
                                    {EMOTIONS.map((e) => {
                                        const v = scores[e.key] || 0;
                                        return <td key={e.key} className="pref-cell" style={cellStyle(v, max)}>{v ? fmt(v) : ''}</td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : <p className="mood-muted chart-empty">NYX hasn't learned your taste yet. Listen to suggested songs and it starts scoring them.</p>}
        </StatsCard>
    );
};

export default PreferenceGrid;
```

- [ ] **Step 4: Nối vào cuối `Stats.scss`**

```scss
// ---- Task 7: gợi ý trúng, độ tự tin, điểm sở thích ----
.mood-page.stats-page {
  .swatch,
  .seg {
    &.out-good { background: var(--out-good); }
    &.out-neutral { background: var(--out-neutral); }
    &.out-bad { background: var(--out-bad); }
    &.out-declined { background: var(--out-declined); }
  }

  .hit-hero {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .hit-value {
    font-family: 'Be Vietnam Pro', 'Inter', sans-serif;
    font-size: 44px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .hit-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 14px;
    color: var(--search-text);

    small {
      font-size: 12px;
      color: var(--muted);
    }
  }

  .hit-cols {
    height: 150px;
    display: grid;
    gap: 3px;
  }

  .hit-col {
    position: relative;
    display: flex;
    align-items: stretch;
    border-radius: 4px;
    outline: none;

    &.hover,
    &:focus-visible {
      background: rgba(255, 255, 255, 0.05);
    }

    .chart-tip {
      top: 0;
      bottom: auto;
      transform: translate(-50%, -100%);
    }
  }

  .hit-stack {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-radius: 4px;
    overflow: hidden;
  }

  .hit-none {
    align-self: flex-end;
    width: 100%;
    height: 2px;
    background: var(--grid);
  }

  .conf-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;

    li {
      display: grid;
      grid-template-columns: 120px minmax(0, 1fr) 72px;
      align-items: center;
      gap: 12px;
    }
  }

  .conf-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  .conf-track {
    height: 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    overflow: hidden;
  }

  .conf-bar {
    display: block;
    height: 100%;
    border-radius: 999px;

    &.happy { background: var(--mood-happy); }
    &.surprise { background: var(--mood-surprise); }
    &.neutral { background: var(--mood-neutral); }
    &.sad { background: var(--mood-sad); }
    &.angry { background: var(--mood-angry); }
  }

  .conf-value {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;

    small {
      font-size: 11px;
      font-weight: 400;
      color: var(--muted);
    }
  }

  // bảng điểm sở thích: cuộn ngang trong thẻ khi hẹp
  .pref-wrap {
    overflow-x: auto;
  }

  .pref-table {
    width: 100%;
    min-width: 560px;
    border-collapse: separate;
    border-spacing: 4px;
    table-layout: fixed;

    th {
      font-size: 12px;
      font-weight: 500;
      color: var(--muted);
    }

    .pref-song {
      width: 34%;
      text-align: left;

      button {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 4px;
        border: none;
        border-radius: 6px;
        background: none;
        color: #fff;
        font-family: inherit;
        text-align: left;
        cursor: pointer;

        &:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        span {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        b,
        small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        b {
          font-size: 13px;
        }

        small {
          font-size: 11px;
          color: var(--muted);
        }
      }
    }
  }

  .pref-head {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .pref-thumb {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 6px;
    object-fit: cover;
    font-size: 12px;
  }

  .pref-cell {
    height: 40px;
    border-radius: 6px;
    border: 1px solid var(--grid);
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    font-variant-numeric: tabular-nums;
  }
}

@media (max-width: 640px) {
  .mood-page.stats-page .conf-list li {
    grid-template-columns: 96px minmax(0, 1fr) 60px;
  }
}
```

- [ ] **Step 5: Gắn vào `MoodPage.jsx`** — thêm import:

```jsx
import HitRateChart from '../components/stats/HitRateChart';
import ConfidenceBars from '../components/stats/ConfidenceBars';
import PreferenceGrid from '../components/stats/PreferenceGrid';
```
và thay 2 dòng ghi chú `{/* Task 7: … */}` bằng:

```jsx
            <div className="stats-pair">
                <HitRateChart hitRate={stats.hitRate} />
                <ConfidenceBars confidence={stats.confidence} />
            </div>
            <PreferenceGrid rows={stats.preferences} />
```

- [ ] **Step 6: Lint + build** — `npx eslint src && npm run build` → sạch, OK. Kiểm tra không còn dòng `Task 6`/`Task 7` trong `MoodPage.jsx` (`grep -n "Task [67]" src/pages/MoodPage.jsx` → không ra gì).

---

### Task 8: Kiểm tra trọn trang + tài liệu

**Files:**
- Modify: `TIEN_DO.md`, `NOTES.md`, `CLAUDE.md`

- [ ] **Step 1: Kiểm tra tự động**

```bash
cd emotune-backend && npm test
cd ../emotune-frontend && npx eslint src && npm run build
```
Expected: test PASS hết; lint sạch; build OK.

- [ ] **Step 2: Server** — `netstat -ano | grep -E ":(8080|5173) .*LISTEN"`. Đang có server người dùng → dùng chung, **không tắt**. Không có → bật `node src/server.js` (backend) + `npx vite --port 5173 --strictPort` (frontend) chạy nền, ghi PID, cuối task chỉ tắt 2 PID đó.

- [ ] **Step 3: Playwright 1440px — `demo30`** (đăng nhập `demo30`/`demo1234`, `sessionStorage.emotune_scanned = "1"`, mở `/stats`):
  1. Đủ 8 mục + 2 tiêu đề phần; 5 ô tổng quan có số (Scans > 0, Songs played > 0, Listening time ≠ "0m", Cheer-up **On**).
  2. Bấm "30 days" → biểu đồ ngày 30 cột, nhãn trục thưa; số Scans tăng; trang không nhảy về đầu.
  3. Rê chuột 1 cột / 1 ô theo buổi / 1 cột "got it right" → hiện chú thích số.
  4. Bấm "View as table" ở 1 biểu đồ → hiện bảng; bấm lại → biểu đồ.
  5. Bấm 1 bài trong "Top songs" → thanh phát hiện bài đó; bấm 1 ca sĩ → `/artist/<id>`.
  6. Độ tự tin: thanh `Angry` ngắn nhất.
  7. Chụp 1 ảnh toàn trang lưu `.playwright-mcp/stats-1440.png`, xem bằng mắt: không chữ đè nhau, không thẻ vỡ.

- [ ] **Step 4: Playwright tài khoản mới** — đăng ký tài khoản tạm `tmp_stats` (mật khẩu `tmp12345`, bấm Skip khảo sát) → `/stats`: mọi mục hiện lời nhắc, ô số = 0 / "—", console không lỗi JS (ngoài `localhost:5001`). **Xoá tài khoản tạm sau khi thử**:
```bash
node -e "require('dotenv').config();const db=require('./src/config/db');db.query(\"DELETE FROM users WHERE username='tmp_stats'\").then(r=>{console.log('xoa',r.rowCount);return db.pool.end()})"
```
(chạy trong `emotune-backend/`).

- [ ] **Step 5: Playwright 1000px + 390px** (`demo30`, 30 ngày): `document.documentElement.scrollWidth` ≤ độ rộng cửa sổ (390px: ≤ 390); lưới theo buổi + bảng điểm sở thích cuộn ngang trong thẻ; 5 ô xếp 3+2 (1000px) / 2 cột (390px). Chụp `.playwright-mcp/stats-390.png`.

- [ ] **Step 6: Tài liệu**
  - `TIEN_DO.md`: mục **C** thêm dòng `C12 Trang thống kê mới /stats (2 phần, 8 mục, 7/30 ngày) + npm run seed-demo` ✅ ngày; dòng `C13 Gợi ý theo người dùng tương tự (lọc cộng tác)` ⬜ "spec riêng, dùng 4 người dùng mẫu của seed-demo"; cập nhật "📍 Đang ở đâu", bảng tổng quan C, nhật ký 09/10.
  - `CLAUDE.md`: backend thêm mô tả `GET /stats?days=7|30` (`statsModel` → `statsService` hàm thuần → `statsController`), lệnh `npm run seed-demo` (5 tài khoản mẫu `demo30`, `mau_*`, mật khẩu `demo1234`, chỉ xoá/tạo lại chính chúng); frontend: `/stats` = `MoodPage` + `components/stats/*`; danh sách test thêm `stats`, `demoHistory`.
  - `NOTES.md`: thêm vào khối phiên tối 09/10 (bảng việc đã làm) 1 dòng "Trang thống kê mới + seed-demo" kèm file, kết quả kiểm tra, và câu **"`demo30` và `mau_*` là dữ liệu MẪU do script sinh, khi demo phải nói rõ"**; mục 4 thêm lệnh `npm run seed-demo`; mục 6 bước tiếp: spec "gợi ý theo người dùng tương tự".

# Gợi ý nhạc theo gu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi tỉ lệ chọn bài sang 65/35 và cho hệ thống tự học gu (âm thanh, ca sĩ, dòng nhạc) để xếp hạng bài trong cùng cảm xúc, kể cả bài chưa nghe.

**Architecture:** Một script Python riêng (`music-analyzer/`) phân tích mp3 một lần mỗi bài (librosa + thẻ ID3) và ghi `features`/`artist`/`genre` vào bảng `songs`. Trong backend Node, module thuần `tasteService.js` tính điểm tổng cho từng ứng viên từ lịch sử `preferences` và chọn bài 65/35; `suggestService.js` gọi module này thay cho logic 80/20 cũ.

**Tech Stack:** Node.js 24 (Express 5, pg, `node --test` có sẵn), PostgreSQL 17, Python 3.11 (librosa, mutagen, psycopg2-binary, numpy, pytest).

**Spec:** `docs/superpowers/specs/2026-09-27-taste-based-recommendation-design.md`

## Global Constraints

- Cảm xúc vẫn là tiêu chí chính: chỉ xếp hạng **trong** các bài thuộc cảm xúc mục tiêu; không đổi `checkMoodTrend`, `logSuggestion`, message, `/listen-report`.
- Tỉ lệ: **65%** bài điểm tổng cao nhất / **35%** khám phá bài chưa có điểm ở cảm xúc này.
- Điểm tổng = `own + 0.5·content + 0.3·artist + 0.3·genre`; chỉ tính `content` với bài có `sim ≥ 0.5`. Các hằng số đặt ở đầu `tasteService.js`.
- `genre`, `features` cho phép NULL; mọi thành phần thiếu dữ liệu = 0; **không bao giờ lỗi** vì thiếu dữ liệu.
- Script chỉ điền `artist`/`genre` vào ô **đang trống**; không đè nhãn tay. `genre` lưu chữ thường, đã trim.
- Không thêm thư viện npm (test bằng `node --test`). Không sửa `db/schema.sql` theo cách làm mất dữ liệu người đang chạy — thay đổi DB đang có đi qua `db/migrate_002_taste.sql`.
- Style: comment JS tiếng Việt không dấu (như code backend hiện có); docstring Python tiếng Việt có dấu (như `emotion-scanner/`).
- `emotune-backend/.env` có dạng `KEY = value` (có khoảng trắng quanh `=`); script Python phải đọc được dạng này.

## Review Focus

- **Vector `features` khác độ dài** (bài phân tích bằng phiên bản script khác) → `similarity` trả 0, không throw. Test ở Task 2.
- **Cột đặc trưng không đổi giữa các bài** (hoặc chỉ 1 bài có features) → chuẩn hóa z-score không được chia cho 0 / sinh `NaN`. Test ở Task 2.
- **Ca sĩ / dòng nhạc khác hoa thường, thừa khoảng trắng** (`"Sơn Tùng M-TP"` vs `" sơn tùng m-tp"`) → coi là cùng. Test ở Task 3.
- **Điểm tổng lớn khi khám phá** (`exp(total)` tràn số khi total ~ 800) → trừ max trước khi `exp`, vẫn chọn đúng. Test ở Task 4.
- **Danh sách ứng viên rỗng** → `pickSong` trả `null`, `generateSuggestion` trả `null` như cũ. Test ở Task 4.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `emotune-backend/db/migrate_002_taste.sql` (mới) | Thêm cột `genre`, `features` vào DB đang chạy, không mất dữ liệu |
| `emotune-backend/db/schema.sql` (sửa) | Thêm 2 cột cho lần cài mới |
| `emotune-backend/src/services/tasteService.js` (mới) | Hàm thuần: chuẩn hóa, độ giống, điểm tổng, chọn bài |
| `emotune-backend/test/tasteService.test.js` (mới) | Unit test cho `tasteService.js` |
| `emotune-backend/package.json` (sửa) | Thêm script `"test": "node --test"` |
| `emotune-backend/src/model/suggestModel.js` (sửa) | Trả thêm `genre`, `features`, `heard`; thêm `getListenHistory()` |
| `emotune-backend/src/services/suggestService.js` (sửa) | Dùng `tasteService` thay logic 80/20 |
| `music-analyzer/features.py` (mới) | Hàm thuần: trích đặc trưng, gộp thẻ ID3, độ giống |
| `music-analyzer/test_features.py` (mới) | pytest cho `features.py` |
| `music-analyzer/analyze_music.py` (mới) | CLI: đọc DB, phân tích mp3, ghi kết quả, in ma trận độ giống |
| `music-analyzer/requirements.txt` (mới) | Thư viện Python |
| `NOTES.md` (sửa) | Cách chạy migration + script |

---

### Task 1: Thêm cột `genre`, `features` vào database

**Files:**
- Create: `emotune-backend/db/migrate_002_taste.sql`
- Modify: `emotune-backend/db/schema.sql` (bảng `songs`)

**Interfaces:**
- Produces: `songs.genre TEXT NULL`, `songs.features REAL[] NULL` — Task 5 đọc, Task 7 ghi.

- [ ] **Step 1: Tạo file migration**

`emotune-backend/db/migrate_002_taste.sql`:

```sql
-- Migration 002: goi y theo gu (dong nhac, dac trung am thanh)
-- An toan khi chay nhieu lan, KHONG xoa du lieu cu.
-- Chay: psql -U postgres -d postgres -f db/migrate_002_taste.sql   (tren Pi: -d emotune)

ALTER TABLE songs ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS features REAL[];
```

- [ ] **Step 2: Sửa `schema.sql` cho lần cài mới**

Trong `CREATE TABLE songs`, thay dòng `energy ...` bằng:

```sql
    energy      REAL CHECK (energy BETWEEN 0 AND 1),
    -- dong nhac (ballad, pop, rap...), chu thuong; tu the ID3 hoac nhom tu dien, co the NULL
    genre       TEXT,
    -- vector dac trung am thanh do music-analyzer/analyze_music.py tinh, co the NULL
    features    REAL[]
```

- [ ] **Step 3: Chạy migration trên DB local và kiểm tra**

Run (PowerShell, trong `emotune-backend`):
```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d postgres -f db/migrate_002_taste.sql
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d postgres -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='songs' AND column_name IN ('genre','features')"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d postgres -c "SELECT count(*) FROM songs"
```
Expected: `ALTER TABLE` ×2; query trả 2 dòng `genre | text`, `features | ARRAY`; số bài không đổi. Chạy lại lệnh đầu lần 2 → vẫn `ALTER TABLE`, không lỗi.

- [ ] **Step 4: Commit**

```bash
git add emotune-backend/db/migrate_002_taste.sql emotune-backend/db/schema.sql
git commit -m "feat(db): add songs.genre and songs.features for taste-based suggestions"
```

---

### Task 2: `tasteService` — chuẩn hóa và độ giống

**Files:**
- Create: `emotune-backend/src/services/tasteService.js`
- Create: `emotune-backend/test/tasteService.test.js`
- Modify: `emotune-backend/package.json` (scripts)

**Interfaces:**
- Produces:
  - `normalizeFeatures(songs: Array<{id:number, features:number[]|null}>) → Map<number, number[]>` — z-score theo từng chiều trên các bài có `features` cùng độ dài phổ biến nhất; bài thiếu/lệch độ dài không có trong Map.
  - `similarity(a: number[]|undefined, b: number[]|undefined) → number` — cosine, âm → 0, thiếu/lệch độ dài/vector 0 → 0.

- [ ] **Step 1: Thêm script test**

Trong `emotune-backend/package.json`, mục `"scripts"` thêm:

```json
    "test": "node --test",
```

- [ ] **Step 2: Viết test (sẽ fail)**

`emotune-backend/test/tasteService.test.js`:

```js
const test = require("node:test")
const assert = require("node:assert/strict")
const taste = require("../src/services/tasteService")

test("similarity: vector giong nhau = 1, nguoc chieu = 0", () => {
    assert.equal(taste.similarity([1, 2, 3], [1, 2, 3]).toFixed(6), "1.000000")
    assert.equal(taste.similarity([1, 0], [-1, 0]), 0)
})

test("similarity: thieu vector, lech do dai, vector 0 -> 0 va khong throw", () => {
    assert.equal(taste.similarity(undefined, [1, 2]), 0)
    assert.equal(taste.similarity([1, 2, 3], [1, 2]), 0)
    assert.equal(taste.similarity([0, 0], [1, 1]), 0)
})

test("normalizeFeatures: z-score theo tung chieu", () => {
    const map = taste.normalizeFeatures([
        { id: 1, features: [0, 10] },
        { id: 2, features: [2, 10] },
        { id: 3, features: null },
    ])
    assert.deepEqual(map.get(1), [-1, 0])
    assert.deepEqual(map.get(2), [1, 0])
    assert.equal(map.has(3), false)
})

test("normalizeFeatures: chieu khong doi / chi 1 bai -> khong NaN", () => {
    const one = taste.normalizeFeatures([{ id: 7, features: [5, 5] }])
    assert.deepEqual(one.get(7), [0, 0])
    const same = taste.normalizeFeatures([{ id: 1, features: [3] }, { id: 2, features: [3] }])
    assert.ok(same.get(1).every(Number.isFinite))
})

test("normalizeFeatures: bai lech do dai bi bo qua", () => {
    const map = taste.normalizeFeatures([
        { id: 1, features: [1, 2] },
        { id: 2, features: [3, 4] },
        { id: 3, features: [1, 2, 3] },
    ])
    assert.equal(map.has(3), false)
    assert.equal(map.size, 2)
})
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `cd emotune-backend; npm test`
Expected: FAIL — `Cannot find module '../src/services/tasteService'`.

- [ ] **Step 4: Viết code**

`emotune-backend/src/services/tasteService.js`:

```js
// tasteService - tinh diem "hop gu" cho bai hat, ham thuan (khong goi DB) de de test
// Diem tong = own + W_CONTENT*content + W_ARTIST*artist + W_GENRE*genre

const W_CONTENT = 0.5      // bai co am thanh giong bai da nghe
const W_ARTIST = 0.3       // cung ca si
const W_GENRE = 0.3        // cung dong nhac
const MIN_SIMILARITY = 0.5 // chi tinh bai giong tu 50% tro len
const EXPLOIT_RATE = 0.65  // 65% chon bai diem cao nhat, 35% kham pha bai la

// z-score tung chieu tren cac bai co features, de tempo (~120) khong lan at MFCC (~-5..5)
let normalizeFeatures = (songs) => {
    const withFeatures = songs.filter(s => Array.isArray(s.features) && s.features.length > 0)
    const result = new Map()
    if (withFeatures.length === 0) return result

    // lay do dai pho bien nhat, bo qua bai phan tich bang phien ban script khac
    const lengthCount = {}
    withFeatures.forEach(s => { lengthCount[s.features.length] = (lengthCount[s.features.length] || 0) + 1 })
    const dim = Number(Object.keys(lengthCount).sort((a, b) => lengthCount[b] - lengthCount[a])[0])
    const valid = withFeatures.filter(s => s.features.length === dim)

    const mean = Array(dim).fill(0)
    valid.forEach(s => s.features.forEach((v, i) => { mean[i] += v / valid.length }))
    const std = Array(dim).fill(0)
    valid.forEach(s => s.features.forEach((v, i) => { std[i] += (v - mean[i]) ** 2 / valid.length }))

    valid.forEach(s => {
        // chieu khong doi (std = 0) -> 0 thay vi chia cho 0
        result.set(s.id, s.features.map((v, i) => {
            const sd = Math.sqrt(std[i])
            return sd > 1e-9 ? (v - mean[i]) / sd : 0
        }))
    })
    return result
}

// cosine similarity, am thi coi nhu khong giong (0)
let similarity = (a, b) => {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0
    let dot = 0, na = 0, nb = 0
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]
        na += a[i] * a[i]
        nb += b[i] * b[i]
    }
    if (na === 0 || nb === 0) return 0
    return Math.max(0, dot / Math.sqrt(na * nb))
}

module.exports = {
    W_CONTENT, W_ARTIST, W_GENRE, MIN_SIMILARITY, EXPLOIT_RATE,
    normalizeFeatures: normalizeFeatures,
    similarity: similarity
}
```

- [ ] **Step 5: Chạy test để thấy pass**

Run: `npm test`
Expected: PASS 5/5.

- [ ] **Step 6: Commit**

```bash
git add emotune-backend/package.json emotune-backend/src/services/tasteService.js emotune-backend/test/tasteService.test.js
git commit -m "feat(taste): feature normalization and cosine similarity"
```

---

### Task 3: `tasteService` — điểm tổng cho ứng viên

**Files:**
- Modify: `emotune-backend/src/services/tasteService.js`
- Test: `emotune-backend/test/tasteService.test.js`

**Interfaces:**
- Consumes: `normalizeFeatures`, `similarity`, hằng số `W_*`, `MIN_SIMILARITY` (Task 2).
- Produces: `scoreCandidates(candidates, history) → Array<candidate & {total:number, parts:{own, content, artist, genre}}>`
  - `candidates`: `Array<{id, artist, genre, features, score:number (own, theo cảm xúc), heard:boolean, ...}>` (giữ nguyên mọi field khác).
  - `history`: `Array<{id, artist, genre, features, score:number (tổng mọi cảm xúc)}>`.

- [ ] **Step 1: Viết test (sẽ fail)**

Thêm vào cuối `test/tasteService.test.js`:

```js
const ballad = [1, 1, 0, 0]
const edm = [0, 0, 1, 1]
const song = (id, extra = {}) => ({ id, artist: null, genre: null, features: null, score: 0, heard: false, ...extra })

test("scoreCandidates: bai la giong bai da thich duoc diem cao hon bai khac gu", () => {
    const history = [song(1, { features: [1, 1.1, 0, 0], score: 2 }), song(2, { features: [0, 0, 1, 1.2], score: 0 })]
    const cands = [song(10, { features: ballad }), song(11, { features: edm })]
    const [b, e] = taste.scoreCandidates(cands, history)
    assert.ok(b.parts.content > 0)
    assert.ok(b.total > e.total)
})

test("scoreCandidates: bai giong bai bi bo som bi tru diem", () => {
    const history = [song(1, { features: [1, 1.1, 0, 0], score: -1 }), song(2, { features: [0, 0, 1, 1.2], score: 0 })]
    const [b] = taste.scoreCandidates([song(10, { features: ballad }), song(11, { features: edm })], history)
    assert.ok(b.total < 0)
})

test("scoreCandidates: cung ca si / dong nhac, khong phan biet hoa thuong va khoang trang", () => {
    const history = [song(1, { artist: "Sơn Tùng M-TP", genre: "Ballad", score: 1 })]
    const [c] = taste.scoreCandidates([song(10, { artist: "  sơn tùng m-tp ", genre: "ballad" })], history)
    assert.equal(c.parts.artist, 1)
    assert.equal(c.parts.genre, 1)
    assert.equal(c.total, 0.3 + 0.3)
})

test("scoreCandidates: khong tinh chinh bai do vao diem gu cua no", () => {
    const history = [song(10, { artist: "A", score: 5 })]
    const [c] = taste.scoreCandidates([song(10, { artist: "A", score: 5, heard: true })], history)
    assert.equal(c.parts.artist, 0)
    assert.equal(c.total, 5)
})

test("scoreCandidates: khong co features / lich su -> total = own, khong loi", () => {
    const [c] = taste.scoreCandidates([song(10, { score: 1.3, heard: true })], [])
    assert.deepEqual(c.parts, { own: 1.3, content: 0, artist: 0, genre: 0 })
    assert.equal(c.total, 1.3)
})
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `npm test`
Expected: FAIL — `taste.scoreCandidates is not a function`.

- [ ] **Step 3: Viết code**

Trong `tasteService.js`, thêm trước `module.exports`:

```js
// "Sơn Tùng M-TP " va "sơn tùng m-tp" la cung 1 ca si
let normalizeText = (text) => (text || "").trim().toLowerCase()

let average = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0

// diem trung binh cua cac bai (tru chinh no) co cung gia tri o truong field
let sameFieldScore = (song, history, field) => {
    const key = normalizeText(song[field])
    if (!key) return 0
    return average(history.filter(h => h.id !== song.id && normalizeText(h[field]) === key).map(h => Number(h.score)))
}

let scoreCandidates = (candidates, history) => {
    const normalized = normalizeFeatures([...candidates, ...history])
    return candidates.map(song => {
        let weighted = 0, weightSum = 0
        history.forEach(h => {
            if (h.id === song.id) return
            const sim = similarity(normalized.get(song.id), normalized.get(h.id))
            if (sim >= MIN_SIMILARITY) {
                weighted += sim * Number(h.score)
                weightSum += sim
            }
        })
        const parts = {
            own: Number(song.score) || 0,
            content: weightSum > 0 ? weighted / weightSum : 0,
            artist: sameFieldScore(song, history, "artist"),
            genre: sameFieldScore(song, history, "genre"),
        }
        const total = parts.own + W_CONTENT * parts.content + W_ARTIST * parts.artist + W_GENRE * parts.genre
        return { ...song, total, parts }
    })
}
```

và thêm `scoreCandidates: scoreCandidates` vào `module.exports`.

- [ ] **Step 4: Chạy test để thấy pass**

Run: `npm test`
Expected: PASS 10/10. (Test "cùng ca sĩ" so `c.total` với `0.3 + 0.3` — cùng phép cộng float nên bằng nhau tuyệt đối.)

- [ ] **Step 5: Commit**

```bash
git add emotune-backend/src/services/tasteService.js emotune-backend/test/tasteService.test.js
git commit -m "feat(taste): score candidates by own, audio similarity, artist and genre"
```

---

### Task 4: `tasteService` — chọn bài 65/35

**Files:**
- Modify: `emotune-backend/src/services/tasteService.js`
- Test: `emotune-backend/test/tasteService.test.js`

**Interfaces:**
- Consumes: kết quả `scoreCandidates` (Task 3), `EXPLOIT_RATE`.
- Produces: `pickSong(scored: Array<{total:number, heard:boolean}>, rng?: () => number) → item | null` (mặc định `rng = Math.random`).

- [ ] **Step 1: Viết test (sẽ fail)**

Thêm vào cuối `test/tasteService.test.js`:

```js
// rng co seed de test lap lai duoc
const seeded = (seed) => () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

test("pickSong: rong -> null", () => {
    assert.equal(taste.pickSong([], seeded(1)), null)
})

test("pickSong: ~65% chon bai diem cao nhat, con lai kham pha bai la", () => {
    const scored = [
        { id: 1, total: 3, heard: true },
        { id: 2, total: 0, heard: false },
        { id: 3, total: 0, heard: false },
    ]
    const rng = seeded(42)
    let best = 0
    for (let i = 0; i < 2000; i++) if (taste.pickSong(scored, rng).id === 1) best++
    assert.ok(best / 2000 > 0.60 && best / 2000 < 0.70, `best rate ${best / 2000}`)
})

test("pickSong: kham pha uu tien bai la hop gu", () => {
    const scored = [
        { id: 1, total: 5, heard: true },
        { id: 2, total: 1.5, heard: false },
        { id: 3, total: -1, heard: false },
    ]
    const rng = seeded(7)
    const count = { 1: 0, 2: 0, 3: 0 }
    for (let i = 0; i < 3000; i++) count[taste.pickSong(scored, rng).id]++
    assert.ok(count[2] > count[3] * 3, JSON.stringify(count))
})

test("pickSong: diem rat lon khong tran so", () => {
    const scored = [{ id: 1, total: 900, heard: true }, { id: 2, total: 800, heard: false }, { id: 3, total: 799, heard: false }]
    const rng = seeded(3)
    for (let i = 0; i < 200; i++) assert.ok([1, 2, 3].includes(taste.pickSong(scored, rng).id))
})

test("pickSong: het bai la -> kham pha chon bai khac bai cao nhat", () => {
    const scored = [{ id: 1, total: 3, heard: true }, { id: 2, total: 1, heard: true }]
    const rng = seeded(11)
    const ids = new Set()
    for (let i = 0; i < 300; i++) ids.add(taste.pickSong(scored, rng).id)
    assert.deepEqual([...ids].sort(), [1, 2])
})

test("pickSong: chi 1 ung vien -> luon chon bai do", () => {
    assert.equal(taste.pickSong([{ id: 9, total: -2, heard: true }], seeded(5)).id, 9)
})
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `npm test`
Expected: FAIL — `taste.pickSong is not a function`.

- [ ] **Step 3: Viết code**

Trong `tasteService.js`, thêm trước `module.exports`:

```js
let randomItem = (items, rng) => items[Math.floor(rng() * items.length)]

// chon ngau nhien co trong so exp(total): bai hop gu de duoc chon hon
// tru max truoc khi exp de khong tran so khi diem lon
let weightedPick = (items, rng) => {
    const max = Math.max(...items.map(s => s.total))
    const weights = items.map(s => Math.exp(s.total - max))
    let r = rng() * weights.reduce((a, b) => a + b, 0)
    for (let i = 0; i < items.length; i++) {
        r -= weights[i]
        if (r <= 0) return items[i]
    }
    return items[items.length - 1]
}

let pickSong = (scored, rng = Math.random) => {
    if (scored.length === 0) return null
    const bestTotal = Math.max(...scored.map(s => s.total))
    const best = scored.filter(s => s.total === bestTotal)

    if (rng() < EXPLOIT_RATE) return randomItem(best, rng)

    // 35%: kham pha bai chua co diem o cam xuc nay
    const unheard = scored.filter(s => !s.heard)
    if (unheard.length > 0) return weightedPick(unheard, rng)

    // het bai la: chon bai khac bai diem cao nhat (neu con)
    const topId = best[0].id
    const others = scored.filter(s => s.id !== topId)
    return others.length > 0 ? randomItem(others, rng) : scored[0]
}
```

và thêm `pickSong: pickSong` vào `module.exports`.

- [ ] **Step 4: Chạy test để thấy pass**

Run: `npm test`
Expected: PASS 16/16.

- [ ] **Step 5: Commit**

```bash
git add emotune-backend/src/services/tasteService.js emotune-backend/test/tasteService.test.js
git commit -m "feat(taste): 65/35 pick with taste-weighted exploration"
```

---

### Task 5: Nối `tasteService` vào gợi ý

**Files:**
- Modify: `emotune-backend/src/model/suggestModel.js` (`getSongsByEmotion`, thêm `getListenHistory`)
- Modify: `emotune-backend/src/services/suggestService.js` (`generateSuggestion`)

**Interfaces:**
- Consumes: `scoreCandidates`, `pickSong` (Task 3–4); cột `genre`, `features` (Task 1).
- Produces: `suggestModel.getListenHistory() → Promise<Array<{id, artist, genre, features, score}>>`; `getSongsByEmotion` trả thêm `genre`, `features`, `heard`. Response `/suggest` và `/scan-and-suggest` giữ nguyên hình dạng (`song`, `emotion`, `message`, `isEncourage`); `song` **không** kèm `features`.

- [ ] **Step 1: Sửa 2 câu SELECT trong `getSongsByEmotion`**

Trong **cả hai** query (chính và fallback) của `suggestModel.js`, đổi phần SELECT thành:

```sql
SELECT s.id, s.title, s.artist, s.file_path, s.emotion, s.energy, s.genre, s.features,
       COALESCE(p.score, 0) AS score,
       (p.song_id IS NOT NULL) AS heard
```

(giữ nguyên `FROM ... LEFT JOIN preferences p ...`, `WHERE`, `ORDER BY`).

- [ ] **Step 2: Thêm `getListenHistory`**

Trong `suggestModel.js`, thêm trước `module.exports`:

```js
// cac bai nguoi dung da co phan hoi (moi cam xuc), dung de hoc gu
let getListenHistory = async () => {
    try {
        const result = await db.query(
            `SELECT s.id, s.artist, s.genre, s.features, SUM(p.score) AS score
             FROM preferences p
             JOIN songs s ON s.id = p.song_id
             GROUP BY s.id, s.artist, s.genre, s.features`
        );
        return result.rows.map(r => ({ ...r, score: Number(r.score) }))
    } catch (err) {
        throw (err)
    }
}
```

và thêm `getListenHistory: getListenHistory` vào `module.exports`.

- [ ] **Step 3: Sửa `generateSuggestion`**

Trong `suggestService.js`: thêm ở đầu file `const tasteService = require("./tasteService")`, và thay khối chọn bài:

```js
    const chosenSong =
        Math.random() < 0.8 ? songSuggested[0]
            : songSuggested[Math.floor(Math.random() * songSuggested.length)]
```

bằng:

```js
    // xep hang trong cung cam xuc theo gu (am thanh, ca si, dong nhac), chon 65/35
    const history = await suggestModel.getListenHistory();
    const scored = tasteService.scoreCandidates(songSuggested, history);
    const { features, total, parts, heard, ...chosenSong } = tasteService.pickSong(scored);
    console.log(`[TASTE] ${chosenSong.title}: total=${total.toFixed(2)}`, parts);
```

(các dòng sau — `getRandomMessage`, `logSuggestion(emotion, confidence, chosenSong.id)`, `return { song: chosenSong, ... }` — giữ nguyên.)

- [ ] **Step 4: Chạy lại unit test**

Run: `npm test`
Expected: PASS 16/16.

- [ ] **Step 5: Test tích hợp với DB thật**

Bật backend (`npm run dev`), rồi ở PowerShell khác:

```powershell
1..3 | ForEach-Object { (Invoke-RestMethod -Method Post -Uri http://localhost:8080/suggest -ContentType "application/json" -Body '{"emotion":"happy","confidence":0.9}').song | Select-Object id,title,artist,genre }
```
Expected: 3 kết quả, mỗi kết quả có `id`, `title`, không có trường `features`; log backend in dòng `[TASTE] ... total=...` kèm `parts`. Chưa chạy analyzer thì `content` = 0 — hệ thống vẫn gợi ý bình thường.

Dọn dữ liệu thử: `DELETE FROM mood_history WHERE created_at > NOW() - interval '10 minutes';` (DBeaver).

- [ ] **Step 6: Commit**

```bash
git add emotune-backend/src/model/suggestModel.js emotune-backend/src/services/suggestService.js
git commit -m "feat(suggest): rank by taste and pick 65/35 instead of 80/20"
```

---

### Task 6: `features.py` — trích đặc trưng và gộp thẻ ID3 (hàm thuần)

**Files:**
- Create: `music-analyzer/requirements.txt`
- Create: `music-analyzer/features.py`
- Create: `music-analyzer/test_features.py`

**Interfaces:**
- Produces:
  - `extract_features(y: np.ndarray, sr: int) -> list[float]` — đúng `FEATURE_DIM = 17` số hữu hạn: `[tempo, rms, centroid, zcr, mfcc1..13]`.
  - `merge_tags(current: dict, tags: dict) -> dict` — trả các cột cần UPDATE (`artist`, `genre`), chỉ khi `current` trống và `tags` có giá trị; `genre` chữ thường, trim.
  - `similarity_matrix(vectors: list[list[float]]) -> np.ndarray` — z-score từng chiều rồi cosine, âm → 0 (cùng quy tắc với `tasteService.js`).

- [ ] **Step 1: Tạo venv và requirements**

`music-analyzer/requirements.txt`:

```
librosa>=0.10
mutagen>=1.47
psycopg2-binary>=2.9
numpy>=1.24
pytest>=8
```

Run (PowerShell, trong `music-analyzer`):
```powershell
python -m venv venv
venv\Scripts\python -m pip install -r requirements.txt
```
Expected: cài xong không lỗi. Thêm `music-analyzer/venv/` vào `.gitignore` ở gốc repo (dòng mới `music-analyzer/venv/`).

- [ ] **Step 2: Viết test (sẽ fail)**

`music-analyzer/test_features.py`:

```python
import numpy as np
from features import FEATURE_DIM, extract_features, merge_tags, similarity_matrix

SR = 22050


def tone(freq, seconds=3.0, amp=0.5):
    t = np.linspace(0, seconds, int(SR * seconds), endpoint=False)
    return (amp * np.sin(2 * np.pi * freq * t)).astype(np.float32)


def test_extract_features_do_dai_va_huu_han():
    f = extract_features(tone(440), SR)
    assert len(f) == FEATURE_DIM
    assert all(np.isfinite(f))


def test_am_to_co_rms_lon_hon_am_nho():
    assert extract_features(tone(440, amp=0.8), SR)[1] > extract_features(tone(440, amp=0.1), SR)[1]


def test_am_cao_sang_hon_am_tram():
    assert extract_features(tone(3000), SR)[2] > extract_features(tone(200), SR)[2]


def test_merge_tags_chi_dien_o_trong():
    current = {"artist": "Nhóm tự điền", "genre": None}
    tags = {"artist": "Ca sĩ trong file", "genre": "  Ballad "}
    assert merge_tags(current, tags) == {"genre": "ballad"}


def test_merge_tags_khong_co_the():
    assert merge_tags({"artist": None, "genre": ""}, {}) == {}


def test_similarity_matrix_giong_hon_khac():
    m = similarity_matrix([[1, 1, 0, 0], [1, 1.1, 0, 0], [0, 0, 1, 1]])
    assert m[0][1] > m[0][2]
    assert m.min() >= 0
```

- [ ] **Step 3: Chạy test để thấy fail**

Run: `venv\Scripts\python -m pytest -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'features'`.

- [ ] **Step 4: Viết code**

`music-analyzer/features.py`:

```python
"""
Hàm thuần cho bước phân tích nhạc (không đụng database, dễ test).

- extract_features: "dấu vân tay âm thanh" 17 số của 1 đoạn nhạc
- merge_tags: gộp thẻ ID3 vào bài hát, KHÔNG đè thông tin nhóm đã tự điền
- similarity_matrix: độ giống giữa các bài (cùng quy tắc với tasteService.js)
"""

import librosa
import numpy as np

N_MFCC = 13
FEATURE_DIM = 4 + N_MFCC  # tempo, rms, centroid, zcr + 13 MFCC


def extract_features(y, sr):
    """Trả về [tempo, rms, spectral centroid, zero-crossing rate, mfcc1..mfcc13]."""
    tempo = librosa.beat.beat_track(y=y, sr=sr)[0]
    tempo = float(np.atleast_1d(tempo)[0])  # librosa mới trả mảng, bản cũ trả số
    rms = float(np.mean(librosa.feature.rms(y=y)))
    centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))
    mfcc = np.mean(librosa.feature.mfcc(y=y, sr=sr, n_mfcc=N_MFCC), axis=1)
    values = [tempo, rms, centroid, zcr, *[float(v) for v in mfcc]]
    return [v if np.isfinite(v) else 0.0 for v in values]


def merge_tags(current, tags):
    """Chỉ điền artist/genre khi ô đang trống và thẻ ID3 có giá trị; genre chữ thường."""
    updates = {}
    for field in ("artist", "genre"):
        value = (tags.get(field) or "").strip()
        if field == "genre":
            value = value.lower()
        if value and not (current.get(field) or "").strip():
            updates[field] = value
    return updates


def similarity_matrix(vectors):
    """Chuẩn hóa z-score từng chiều rồi tính cosine; âm coi như 0."""
    x = np.asarray(vectors, dtype=float)
    std = x.std(axis=0)
    z = np.where(std > 1e-9, (x - x.mean(axis=0)) / np.where(std > 1e-9, std, 1), 0.0)
    norm = np.linalg.norm(z, axis=1, keepdims=True)
    unit = np.divide(z, norm, out=np.zeros_like(z), where=norm > 0)
    return np.clip(unit @ unit.T, 0, 1)
```

- [ ] **Step 5: Chạy test để thấy pass**

Run: `venv\Scripts\python -m pytest -q`
Expected: `6 passed`.

- [ ] **Step 6: Commit**

```bash
git add music-analyzer/requirements.txt music-analyzer/features.py music-analyzer/test_features.py .gitignore
git commit -m "feat(analyzer): audio feature extraction, ID3 merge, similarity"
```

---

### Task 7: `analyze_music.py` — CLI đọc/ghi database

**Files:**
- Create: `music-analyzer/analyze_music.py`
- Modify: `NOTES.md` (mục "Chạy lại trên PC" và "Chạy lại trên Pi")

**Interfaces:**
- Consumes: `extract_features`, `merge_tags`, `similarity_matrix`, `FEATURE_DIM` (Task 6); cột `genre`, `features` (Task 1).
- Produces: dữ liệu `songs.features` (17 số), `songs.artist`/`songs.genre` (chỉ điền ô trống) cho Task 5 dùng.

- [ ] **Step 1: Viết script**

`music-analyzer/analyze_music.py`:

```python
"""
Phân tích nhạc cho tính năng "gợi ý theo gu".

Với mỗi bài trong bảng songs chưa có features:
  1. Lấy ~60 giây giữa bài trong emotune-backend/music/<file_path>
  2. Tính "dấu vân tay âm thanh" (17 số) -> cột features
  3. Đọc thẻ ID3 (ca sĩ, thể loại) -> chỉ điền vào ô đang TRỐNG

Cách chạy (trong music-analyzer/, sau khi thêm bài mới):
    venv\\Scripts\\python analyze_music.py                 # phân tích bài chưa có features
    venv\\Scripts\\python analyze_music.py --force         # phân tích lại tất cả
    venv\\Scripts\\python analyze_music.py --similarity    # in bảng độ giống giữa các bài

Thông tin database đọc từ emotune-backend/.env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).
"""

import argparse
import os
import sys

import librosa
import mutagen
import psycopg2

from features import FEATURE_DIM, extract_features, merge_tags, similarity_matrix

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(HERE, "..", "emotune-backend")
MUSIC_DIR = os.path.join(BACKEND_DIR, "music")
CLIP_SECONDS = 60


def read_env(path):
    """Đọc .env dạng 'KEY = value' (có thể có khoảng trắng quanh dấu =)."""
    env = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip()
    return env


def connect():
    env = read_env(os.path.join(BACKEND_DIR, ".env"))
    return psycopg2.connect(
        host=env.get("DB_HOST", "localhost"),
        port=env.get("DB_PORT", "5432"),
        user=env.get("DB_USER"),
        password=env.get("DB_PASSWORD"),
        dbname=env.get("DB_NAME"),
    )


def load_middle(path):
    """Lấy ~60 giây giữa bài (bỏ đoạn dạo đầu); bài ngắn hơn thì lấy cả bài."""
    duration = librosa.get_duration(path=path)
    offset = max(0.0, (duration - CLIP_SECONDS) / 2)
    return librosa.load(path, sr=22050, mono=True, offset=offset, duration=CLIP_SECONDS)


def read_tags(path):
    audio = mutagen.File(path, easy=True)
    if not audio or not audio.tags:
        return {}
    return {k: (audio.tags.get(k) or [""])[0] for k in ("artist", "genre")}


def analyze(conn, force):
    with conn.cursor() as cur:
        where = "" if force else "WHERE features IS NULL"
        cur.execute(f"SELECT id, title, file_path, artist, genre FROM songs {where} ORDER BY id")
        rows = cur.fetchall()

    if not rows:
        print("Không có bài nào cần phân tích (dùng --force để phân tích lại).")
        return

    for song_id, title, file_path, artist, genre in rows:
        path = os.path.join(MUSIC_DIR, file_path)
        if not os.path.isfile(path):
            print(f"⚠ Bỏ qua #{song_id} '{title}': không thấy file {file_path}")
            continue
        try:
            y, sr = load_middle(path)
            vector = extract_features(y, sr)
            updates = merge_tags({"artist": artist, "genre": genre}, read_tags(path))
        except Exception as err:  # file hỏng: bỏ qua bài này, bài khác vẫn chạy
            print(f"⚠ Bỏ qua #{song_id} '{title}': {err}")
            continue

        sets = ["features = %s"] + [f"{k} = %s" for k in updates]
        with conn.cursor() as cur:
            cur.execute(f"UPDATE songs SET {', '.join(sets)} WHERE id = %s",
                        [vector, *updates.values(), song_id])
        conn.commit()
        extra = ", ".join(f"{k}={v}" for k, v in updates.items()) or "không có thẻ mới"
        print(f"✓ #{song_id} '{title}': tempo {vector[0]:.0f} BPM · {extra}")


def print_similarity(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id, title, features FROM songs "
                    "WHERE array_length(features, 1) = %s ORDER BY id", [FEATURE_DIM])
        rows = cur.fetchall()
    if len(rows) < 2:
        print("Cần ít nhất 2 bài đã phân tích.")
        return
    m = similarity_matrix([r[2] for r in rows])
    print("\nĐỘ GIỐNG (0 = khác hẳn, 1 = rất giống)")
    print("      " + "".join(f"#{r[0]:<5}" for r in rows))
    for i, r in enumerate(rows):
        print(f"#{r[0]:<5}" + "".join(f"{v:<6.2f}" for v in m[i]) + f"  {r[1]}")


def main():
    parser = argparse.ArgumentParser(description="Phân tích nhạc cho gợi ý theo gu")
    parser.add_argument("--force", action="store_true", help="phân tích lại cả bài đã có features")
    parser.add_argument("--similarity", action="store_true", help="in bảng độ giống giữa các bài")
    args = parser.parse_args()

    conn = connect()
    try:
        analyze(conn, args.force)
        if args.similarity:
            print_similarity(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # in tiếng Việt trên terminal Windows
    main()
```

- [ ] **Step 2: Chạy trên DB local**

Chép 10 file mp3 vào `emotune-backend/music/` nếu máy chưa có (từ Pi: `scp "vinh@raspberrypi.local:~/emotion-music-recommender/emotune-backend/music/*.mp3" emotune-backend/music/`), rồi:

```powershell
cd music-analyzer
venv\Scripts\python analyze_music.py --similarity
venv\Scripts\python analyze_music.py
```
Nếu mọi bài đều báo `⚠ Bỏ qua ... NoBackendError` thì máy không giải mã được mp3: cài ffmpeg (`winget install Gyan.FFmpeg`, Pi: `sudo apt install -y ffmpeg`), mở terminal mới rồi chạy lại.

Expected lần 1: 10 dòng `✓ #id 'Tên bài': tempo ... BPM · ...` (bài thiếu file in `⚠ Bỏ qua`), sau đó bảng độ giống 10×10, đường chéo = 1.00. Lần 2: `Không có bài nào cần phân tích`. Kiểm tra bằng mắt: 2 bài `angry` (Meditation, Reduce Stress — nhạc thư giãn) giống nhau hơn so với với `Blank Space`.

- [ ] **Step 3: Kiểm tra DB và đường gợi ý có `content`**

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d postgres -c "SELECT id, title, artist, genre, array_length(features,1) FROM songs ORDER BY id"
```
Expected: mọi bài có file đều `array_length = 17`; `artist` nhóm đã điền không đổi.

Sau đó bật backend, gửi `/listen-report` 1 lần với `finishPercent: 1` cho 1 bài, gọi `/suggest` như Task 5 Step 5 → log `[TASTE]` có `content` khác 0 với ít nhất một ứng viên (nếu độ giống ≥ 0.5). Dọn `mood_history`, `preferences`, `recently_played` thử trong DBeaver sau khi xong.

- [ ] **Step 4: Cập nhật NOTES.md**

Thêm vào mục "Chạy lại trên PC" và "Chạy lại trên Pi (demo)":

```markdown
### Gợi ý theo gu (sau khi thêm bài mới)
1. DB đã có từ trước: chạy 1 lần `db/migrate_002_taste.sql` (DBeaver Alt+X, hoặc psql; Pi dùng `-d emotune`).
2. Thêm bài: chép mp3 vào `emotune-backend/music/`, thêm dòng vào `songs` (có thể điền `artist`, `genre` — không bắt buộc).
3. `cd music-analyzer && venv\Scripts\python analyze_music.py --similarity` (Pi: `venv/bin/python`). Lần đầu: `python -m venv venv` + `pip install -r requirements.txt`.
4. Test backend: `cd emotune-backend && npm test`.
```

- [ ] **Step 5: Commit**

```bash
git add music-analyzer/analyze_music.py NOTES.md
git commit -m "feat(analyzer): CLI to analyze songs into the database"
```

# H6 Trợ lý giọng nói — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bấm logo AI → nói tiếng Việt → trợ lý điều khiển nhạc, phát bài/ca sĩ/playlist, gợi ý bài theo cảm xúc trong câu nói, chuyển tới mọi trang (trùng tên thì hỏi lại), trả lời bằng chữ + giọng nói.

**Architecture:** Frontend nhận giọng bằng Web Speech API (`vi-VN`) → `POST /assistant {text, pending?, pick?}`. Backend chạy bộ luật thuần `parseCommand` (từ khoá + tìm tên không dấu), không hiểu thì gọi Claude Haiku 5.5 (đầu ra JSON theo schema) rồi `validateLlmAction` kiểm tra lại với danh mục. Frontend thực hiện `action` (navigate / play / mood / control / choose / unknown), đọc to câu trả lời bằng `speechSynthesis`, giảm nhạc khi đang nghe/nói.

**Tech Stack:** Node 24 + Express 5 + `pg` + `node:test`; `@anthropic-ai/sdk` (model `claude-haiku-5-5`); React 19 + Vite + SCSS + svgr; Web Speech API, Web Audio API.

**Spec:** `docs/superpowers/specs/2026-10-09-voice-assistant-design.md`

## Global Constraints

- **Không commit / push** (quy tắc người dùng) — mỗi task kết thúc bằng bước kiểm tra, không có bước commit.
- Bình luận trong code: tiếng Việt (backend viết không dấu như các file hiện có).
- Mọi câu SQL đụng bảng có `user_id` phải lọc theo `user_id` (playlist lấy qua `playlistModel.getPlaylists(userId)` có sẵn — task này không viết SQL mới).
- Backend theo mẫu `routes/web.js → controllers → services → model`.
- LLM: model `claude-haiku-5-5`, `output_config.effort: "low"`, đầu ra `output_config.format` JSON schema; key `ANTHROPIC_API_KEY` trong `.env`; không key / lỗi / hết giờ → trả `unknown`, không sập.
- Nhận giọng: Web Speech `vi-VN` (Chrome/Edge); gói trong `src/utils/speech.js` để sau thay bằng Whisper/PhoWhisper.
- Giao diện bám Figma `284:120`: nền `#261925`, logo AI 92 px, micro 111 px, sóng vạch `#d9d9d9` rộng 13 px.
- Trợ lý nói tiếng Việt; phần còn lại của giao diện giữ tiếng Anh.
- `npx eslint src` phải **sạch** (0 lỗi, 0 cảnh báo); `npm test` backend phải xanh.
- Không sửa `db/setup.sql` (không đổi schema).

## Review Focus

1. **Người dùng nói/gõ lượt mới khi trợ lý còn đang đọc câu trả lời cũ** → câu cũ đọc xong không được tự đóng overlay hay bật mic chen vào lượt mới (bộ đếm lượt `turnRef`, kiểm tra ở Task 7 bước 4).
2. **Từ vô tình trùng từ khoá sau khi bỏ dấu** ("tiếp tục" chứa "tục", "đơn giản" chứa "giản") → không hiểu nhầm thành giận (test Task 2).
3. **Câu kể cảm xúc có vài chữ trùng tên bài** ("hôm nay có chắc là mình buồn" vs *Có Chắc Yêu Là Đây*) → `mood sad`, không phát bài (ngưỡng tên trần 0.8, test Task 2).
4. **`pending` cũ hoặc bị sửa từ client** (id không còn trong danh mục) → bỏ qua, xử lý như câu mới (test Task 2).
5. **LLM trả id / đường dẫn bịa** → `unknown`, không chuyển tới trang không tồn tại (test Task 3).

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `emotune-backend/src/services/assistantRules.js` (mới) | Hàm thuần: `normalize`, `parseCommand`, `sanitizePending`, `validateLlmAction` + bảng từ khoá, danh sách trang |
| `emotune-backend/test/assistantRules.test.js` (mới) | Unit test bộ luật + kiểm tra kết quả LLM |
| `emotune-backend/src/services/assistantLlm.js` (mới) | `classifyWithLlm(text, catalog)` gọi Claude, trả object thô hoặc `null` |
| `emotune-backend/src/services/assistantService.js` (mới) | Lấy danh mục (3 model có sẵn) → luật → LLM → `{action, reply, source}` |
| `emotune-backend/src/controllers/assistantController.js` (mới) | Kiểm tra body, gọi service, mã lỗi |
| `emotune-backend/src/routes/web.js` | `POST /assistant` (requireAuth) |
| `emotune-backend/.evn.example`, `package.json` | `ANTHROPIC_API_KEY`, dependency `@anthropic-ai/sdk` |
| `emotune-frontend/src/contexts/{playbackContext.js,PlaybackProvider.jsx}` | Lệnh mới `control(command)` |
| `emotune-frontend/src/components/{PlayerHost.jsx,MusicPlayer.jsx}` | Chuyển `control` tới `<audio>` (pause/resume/next/volume/mute/not_for_me/duck/unduck) |
| `emotune-frontend/src/utils/speech.js` (mới) | `isSpeechSupported`, `listen`, `speak`, `stopSpeaking` |
| `emotune-frontend/src/components/VoiceWave.jsx` (mới) | 43 vạch sóng (theo mic / nhịp giả khi nói / gần phẳng khi rảnh) |
| `emotune-frontend/src/components/VoiceAssistant.jsx/.scss` (mới) | Overlay trợ lý |
| `emotune-frontend/src/contexts/AIAssistantContext.jsx` | `isOpen / openAssistant / closeAssistant` |
| `emotune-frontend/src/components/Header.jsx`, `layouts/MainLayout.jsx`, `index.css` | Logo AI mở trợ lý; vẽ overlay; token `--assistant-bg` |
| `emotune-frontend/src/assets/icons/assistant_mic.svg`, `assistant_logo.svg` (mới) | Asset Figma `198:258`, `194:63` |
| `TIEN_DO.md`, `CLAUDE.md`, `NOTES.md` | Tiến độ + tài liệu |

---

### Task 1: Bộ luật — chuẩn hoá, điều khiển, trang, tìm tên

**Files:**
- Create: `emotune-backend/src/services/assistantRules.js`
- Test: `emotune-backend/test/assistantRules.test.js`

**Interfaces:**
- Produces: `parseCommand(text, catalog, options = {}) → {action, reply}`; `normalize(text) → string`; nội bộ dùng tiếp ở Task 2–3: `findPhrase`, `has`, `scoreName`, `entityOf(catalog, kind, id) → {kind,id,name}|null`, `playAction`, `navigateAction`, `runIntent(intent, catalog, entity)`, `controlAction(command)`, `unknownAction()`, hằng `PAGES`, `EMOTIONS`, `CONTROLS`, `MIN_SCORE`.
- `catalog`: `{ songs: [{id, title, artist, artist_id, file_path, cover, emotion, ...}], artists: [{id, name}], playlists: [{id, name}] }` (đúng dạng `songModel.getAllSongs()`, `artistModel.getArtistsData()`, `playlistModel.getPlaylists()`).
- `action`: `{type:"navigate", path}` · `{type:"play", kind:"song", song}` · `{type:"play", kind:"artist", queue:{name, songs}}` · `{type:"play", kind:"playlist", playlistId}` · `{type:"mood", emotion}` · `{type:"control", command}` · `{type:"choose", intent, candidates:[{kind,id,name,detail}]}` · `{type:"unknown"}`.

- [ ] **Step 1: Viết test (thất bại)** — tạo `emotune-backend/test/assistantRules.test.js`:

```js
// Unit test bo luat hieu lenh cua tro ly giong noi (src/services/assistantRules.js)
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");

const rules = require("../src/services/assistantRules");
const { parseCommand, normalize } = rules;

// danh muc thu: giong du lieu that + 2 ca si TRUNG TEN (40, 41) de thu hoi lai
const catalog = {
    songs: [
        { id: 1, title: "Có Chắc Yêu Là Đây", artist: "Sơn Tùng M-TP", artist_id: 4, file_path: "co_chac_yeu_la_day.mp3", emotion: "happy" },
        { id: 2, title: "Muộn Rồi Mà Sao Còn", artist: "Sơn Tùng M-TP", artist_id: 4, file_path: "muon_roi_ma_sao_con.mp3", emotion: "happy" },
        { id: 3, title: "Giá Như", artist: "Noo Phước Thịnh", artist_id: 7, file_path: "gia_nhu.mp3", emotion: "sad" },
        { id: 7, title: "Blank Space", artist: "Taylor Swift", artist_id: 9, file_path: "blank_space.mp3", emotion: "surprise" },
        { id: 10, title: "Nếu Như Ta Chẳng Còn (feat. A$AP Ướt Mi)", artist: "RPT MCK", artist_id: 11, file_path: "neu_nhu.mp3", emotion: "neutral" },
    ],
    artists: [
        { id: 4, name: "Sơn Tùng M-TP" }, { id: 6, name: "HIEUTHUHAI" }, { id: 7, name: "Noo Phước Thịnh" },
        { id: 9, name: "Taylor Swift" }, { id: 11, name: "RPT MCK" },
        { id: 40, name: "Bảo Anh" }, { id: 41, name: "Bảo Anh" },
    ],
    playlists: [{ id: 1, name: "My Playlist" }, { id: 7, name: "Nhạc Buồn" }],
};

const act = (text, options) => parseCommand(text, catalog, options).action;

test("normalize: bo dau, chu thuong, bo dau cau va (feat ...)", () => {
    assert.strictEqual(normalize("Sơn Tùng M-TP!"), "son tung m tp");
    assert.strictEqual(normalize("Đi đâu"), "di dau");
    assert.strictEqual(normalize("Nếu Như Ta Chẳng Còn (feat. A$AP Ướt Mi)"), "neu nhu ta chang con");
});

test("dieu khien nhac", () => {
    assert.deepStrictEqual(act("bài tiếp đi"), { type: "control", command: "next" });
    assert.deepStrictEqual(act("tạm dừng"), { type: "control", command: "pause" });
    assert.deepStrictEqual(act("dừng"), { type: "control", command: "pause" });
    assert.deepStrictEqual(act("phát tiếp"), { type: "control", command: "resume" });
    assert.deepStrictEqual(act("tiếp tục đi"), { type: "control", command: "resume" });
    assert.deepStrictEqual(act("to lên chút"), { type: "control", command: "volume_up" });
    assert.deepStrictEqual(act("nhỏ lại"), { type: "control", command: "volume_down" });
    assert.deepStrictEqual(act("tắt tiếng"), { type: "control", command: "mute" });
    assert.deepStrictEqual(act("không thích bài này"), { type: "control", command: "not_for_me" });
});

test("chuyen toi trang co dinh", () => {
    assert.deepStrictEqual(act("mở trang thống kê"), { type: "navigate", path: "/stats" });
    assert.deepStrictEqual(act("lời bài hát"), { type: "navigate", path: "/lyrics" });
    assert.deepStrictEqual(act("về trang chủ"), { type: "navigate", path: "/" });
    assert.deepStrictEqual(act("mở cài đặt"), { type: "navigate", path: "/settings" });
});

test("xem ca si -> trang ca si (khop ban dinh lien 'MTP')", () => {
    const r = parseCommand("cho tôi xem ca sĩ Sơn Tùng MTP đi", catalog);
    assert.deepStrictEqual(r.action, { type: "navigate", path: "/artist/4" });
    assert.match(r.reply, /Sơn Tùng M-TP/);
});

test("phat bai / ca si / playlist theo ten", () => {
    const song = act("phát bài Giá Như");
    assert.strictEqual(song.type, "play");
    assert.strictEqual(song.kind, "song");
    assert.strictEqual(song.song.id, 3);

    const artist = act("mở nhạc của Taylor Swift");
    assert.strictEqual(artist.kind, "artist");
    assert.strictEqual(artist.queue.name, "Taylor Swift");
    assert.deepStrictEqual(artist.queue.songs.map((s) => s.id), [7]);

    assert.deepStrictEqual(act("phát playlist nhạc buồn"), { type: "play", kind: "playlist", playlistId: 7 });
    assert.strictEqual(act("phát bài nếu như ta chẳng còn").song.id, 10);
});

test("ca si chua co bai -> mo trang ca si (ten dinh lien HIEUTHUHAI)", () => {
    const r = parseCommand("nghe hiếu thứ hai", catalog);
    assert.deepStrictEqual(r.action, { type: "navigate", path: "/artist/6" });
    assert.match(r.reply, /chưa có bài/);
});

test("chi noi ten (khong dong tu) du ro -> phat", () => {
    assert.strictEqual(act("Sơn Tùng MTP").kind, "artist");
});

test("trung ten -> hoi lai (choose) kem chi tiet de phan biet", () => {
    const r = parseCommand("xem ca sĩ Bảo Anh", catalog);
    assert.strictEqual(r.action.type, "choose");
    assert.strictEqual(r.action.intent, "navigate");
    assert.deepStrictEqual(r.action.candidates.map((c) => c.id), [40, 41]);
    assert.ok(r.action.candidates.every((c) => typeof c.detail === "string"));
    assert.match(r.reply, /Bảo Anh/);
});

test("cau rong / khong hieu -> unknown", () => {
    assert.deepStrictEqual(act(""), { type: "unknown" });
    assert.deepStrictEqual(act("nay sếp mắng, chẳng muốn làm gì"), { type: "unknown" });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run (trong `emotune-backend/`): `npm test`
Expected: FAIL — `Cannot find module '../src/services/assistantRules'`.

- [ ] **Step 3: Viết `emotune-backend/src/services/assistantRules.js`**

```js
// Bo luat hieu lenh cua tro ly giong noi (H6). HAM THUAN: khong goi DB / mang -> unit test duoc.
// Vao: cau noi (chu, Web Speech da chuyen tu giong) + danh muc { songs, artists, playlists } cua nguoi dung
// Ra: { action, reply }  - dang action: docs/superpowers/specs/2026-10-09-voice-assistant-design.md muc 4.1
// Thu tu xet: (cau tra loi cho lan hoi lai) -> dieu khien nhac -> trang co dinh -> ten bai/ca si/playlist -> cam xuc -> unknown

const EMOTIONS = ["happy", "sad", "angry", "surprise", "neutral"];
const CONTROLS = ["pause", "resume", "next", "volume_up", "volume_down", "mute", "not_for_me"];

// trang hop le cho navigate; words = cum tu (khong dau) nhan ra trang do
const PAGES = [
    { path: "/", name: "trang chủ", words: ["trang chu", "home"] },
    { path: "/scan", name: "màn quét cảm xúc", words: ["quet", "scan"] },
    { path: "/now-playing", name: "màn đang phát", words: ["dang phat", "now playing"] },
    { path: "/lyrics", name: "lời bài hát", words: ["loi bai hat", "loi bai", "lyrics"] },
    { path: "/stats", name: "trang thống kê", words: ["thong ke", "tam trang", "stats"] },
    { path: "/settings", name: "trang cài đặt", words: ["cai dat", "settings"] },
    { path: "/survey", name: "khảo sát gu nhạc", words: ["khao sat", "survey"] },
];

// xet theo DUNG thu tu nay: cum dai / de nham dung truoc ("khong thich bai nay" truoc "bai")
const CONTROL_WORDS = [
    ["not_for_me", ["khong thich bai nay", "khong thich bai", "bai nay chan", "not for me"]],
    ["next", ["bai tiep", "bai khac", "bai sau", "chuyen bai", "qua bai", "doi bai", "next"]],
    ["resume", ["tiep tuc", "phat tiep", "phat lai", "choi tiep", "resume"]],
    ["pause", ["tam dung", "dung lai", "dung nhac", "dung di", "ngung", "pause"]],
    ["volume_up", ["to len", "lon len", "tang am", "to hon", "lon hon"]],
    ["volume_down", ["nho lai", "be lai", "giam am", "nho hon", "nho xuong", "nho di"]],
    ["mute", ["tat tieng", "tat am", "im lang", "mute"]],
];

const CONTROL_REPLIES = {
    pause: "Đã tạm dừng.",
    resume: "Phát tiếp nhé.",
    next: "Chuyển sang bài tiếp theo.",
    volume_up: "Đã tăng âm lượng.",
    volume_down: "Đã giảm âm lượng.",
    mute: "Đã tắt tiếng.",
    not_for_me: "Ok, mình bỏ qua bài này.",
};

// "xem / vao / trang ..." = muon MO TRANG; "phat / nghe / bat / mo ..." = muon NGHE
const NAV_VERBS = ["xem", "trang", "vao", "di toi", "di den", "chuyen sang", "chuyen toi", "mo trang", "mo man"];
const PLAY_VERBS = ["phat", "nghe", "bat", "mo bai", "mo nhac", "cho nghe", "play", "mo"];

const MIN_SCORE = 0.6;       // ty le chu trong ten co mat trong cau de thanh ung vien
const BARE_MIN_SCORE = 0.8;  // chi noi ten, khong dong tu -> doi khop chac hon (tranh cau ke cam xuc trung vai chu ten bai)
const CLOSE_GAP = 0.15;      // ung vien cach diem cao nhat <= 0.15 -> coi la trung, hoi lai
const MAX_CANDIDATES = 4;

// bo dau (d/D -> d), chu thuong, bo "(feat. ...)" va dau cau -> "son tung m tp"
const normalize = (text) => (text || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toWords = (text) => normalize(text).split(" ").filter(Boolean);

// vi tri bat dau cua cum tu trong mang chu (so khop tron chu, khong khop nua chu), -1 neu khong co
const findPhrase = (words, phrase) => {
    const parts = phrase.split(" ");
    for (let i = 0; i + parts.length <= words.length; i++) {
        if (parts.every((p, j) => words[i + j] === p)) return i;
    }
    return -1;
};

const has = (words, phrases) => phrases.some((p) => findPhrase(words, p) !== -1);

// diem khop ten: ca ten dinh lien nam trong cau dinh lien = 1 ("hieuthuhai", "sontungmtp");
// nguoc lai = ty le chu (>= 2 ky tu) cua ten co trong cau
const scoreName = (words, compact, name) => {
    const all = toWords(name);
    const nameCompact = all.join("");
    if (nameCompact.length >= 4 && compact.includes(nameCompact)) return 1;
    const nameWords = all.filter((w) => w.length >= 2);
    if (!nameWords.length) return 0;
    const set = new Set(words);
    return nameWords.filter((w) => set.has(w)).length / nameWords.length;
};

const songsOf = (catalog, artistId) => catalog.songs.filter((s) => s.artist_id === artistId);

// muc that trong danh muc (null neu khong co) - dung cho ket qua luat, pending tu client va LLM
const entityOf = (catalog, kind, id) => {
    const list = kind === "song" ? catalog.songs
        : kind === "artist" ? catalog.artists
            : kind === "playlist" ? catalog.playlists : null;
    const item = list && list.find((x) => x.id === id);
    if (!item) return null;
    return { kind, id, name: kind === "song" ? item.title : item.name };
};

const kindHintOf = (words) => (has(words, ["ca si", "nghe si"]) ? "artist"
    : has(words, ["playlist", "danh sach phat"]) ? "playlist"
        : has(words, ["bai", "bai hat"]) ? "song" : null);

// cac muc khop ten, diem giam dan; chi giu nhom "sat nut" voi muc cao nhat
const findEntities = (words, catalog) => {
    const compact = words.join("");
    const all = [
        ...catalog.songs.map((s) => ({ kind: "song", id: s.id, name: s.title, detail: s.artist || "" })),
        ...catalog.artists.map((a) => ({ kind: "artist", id: a.id, name: a.name, detail: `${songsOf(catalog, a.id).length} bài` })),
        ...catalog.playlists.map((p) => ({ kind: "playlist", id: p.id, name: p.name, detail: "playlist" })),
    ]
        .map((c) => ({ ...c, score: scoreName(words, compact, c.name) }))
        .filter((c) => c.score >= MIN_SCORE);
    const hint = kindHintOf(words);
    const hinted = hint ? all.filter((c) => c.kind === hint) : [];
    const list = (hinted.length ? hinted : all).sort((a, b) => b.score - a.score);
    if (!list.length) return [];
    return list.filter((c) => c.score >= list[0].score - CLOSE_GAP).slice(0, MAX_CANDIDATES);
};

const unknownAction = () => ({
    action: { type: "unknown" },
    reply: "Mình chưa hiểu. Bạn thử nói: “phát nhạc Sơn Tùng”, “bài tiếp” hoặc “mở trang thống kê” nhé.",
});

const controlAction = (command) => ({ action: { type: "control", command }, reply: CONTROL_REPLIES[command] });

const playAction = (catalog, entity) => {
    if (entity.kind === "song") {
        const song = catalog.songs.find((s) => s.id === entity.id);
        return { action: { type: "play", kind: "song", song }, reply: `Đang phát ${song.title}.` };
    }
    if (entity.kind === "artist") {
        const songs = songsOf(catalog, entity.id);
        if (!songs.length) {
            return { action: { type: "navigate", path: `/artist/${entity.id}` }, reply: `${entity.name} chưa có bài nào, mình mở trang ca sĩ nhé.` };
        }
        return { action: { type: "play", kind: "artist", queue: { name: entity.name, songs } }, reply: `Đang phát nhạc của ${entity.name}.` };
    }
    return { action: { type: "play", kind: "playlist", playlistId: entity.id }, reply: `Đang phát playlist ${entity.name}.` };
};

// bai hat khong co trang rieng -> "xem bai X" = phat bai X
const navigateAction = (catalog, entity) => {
    if (entity.kind === "song") return playAction(catalog, entity);
    const path = entity.kind === "artist" ? `/artist/${entity.id}` : `/playlist/${entity.id}`;
    return { action: { type: "navigate", path }, reply: `Đang mở trang ${entity.name}.` };
};

const runIntent = (intent, catalog, entity) => (intent === "navigate"
    ? navigateAction(catalog, entity)
    : playAction(catalog, entity));

const chooseAction = (intent, found) => {
    const candidates = found.map(({ kind, id, name, detail }) => ({ kind, id, name, detail }));
    const list = candidates.map((c) => `${c.name} (${c.detail})`).join(", ");
    return { action: { type: "choose", intent, candidates }, reply: `Mình thấy ${candidates.length} kết quả: ${list}. Bạn chọn cái nào?` };
};

const parseCommand = (text, catalog, options = {}) => {
    const words = toWords(text);
    if (!words.length) return unknownAction();

    // 1. dieu khien nhac
    for (const [command, phrases] of CONTROL_WORDS) {
        if (has(words, phrases)) return controlAction(command);
    }
    if (words.length === 1 && words[0] === "dung") return controlAction("pause");

    // 2. trang co dinh: can dong tu mo trang, hoac cau ngan ("lời bài hát")
    const page = PAGES.find((p) => has(words, p.words));
    if (page && (has(words, NAV_VERBS) || has(words, ["mo"]) || words.length <= 4)) {
        return { action: { type: "navigate", path: page.path }, reply: `Đang mở ${page.name}.` };
    }

    // 3. ten bai / ca si / playlist
    const wantsPage = has(words, NAV_VERBS);
    const hasVerb = wantsPage || has(words, PLAY_VERBS);
    const found = findEntities(words, catalog);
    if (found.length && (hasVerb || found[0].score >= BARE_MIN_SCORE)) {
        const intent = wantsPage ? "navigate" : "play";
        if (found.length >= 2) return chooseAction(intent, found);
        return runIntent(intent, catalog, found[0]);
    }

    return unknownAction();
};

module.exports = {
    EMOTIONS, CONTROLS, PAGES, MIN_SCORE,
    normalize, toWords, findPhrase, has, scoreName, entityOf,
    playAction, navigateAction, runIntent, controlAction, unknownAction,
    parseCommand,
};
```

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npm test`
Expected: tất cả test PASS (15 test cũ + 9 test mới).

---

### Task 2: Bộ luật — cảm xúc (có phủ định) + trả lời câu hỏi lại

**Files:**
- Modify: `emotune-backend/src/services/assistantRules.js`
- Test: `emotune-backend/test/assistantRules.test.js`

**Interfaces:**
- Consumes (Task 1): `toWords`, `findPhrase`, `has`, `scoreName`, `entityOf`, `runIntent`, `unknownAction`, `MIN_SCORE`, `EMOTIONS`.
- Produces: `parseCommand(text, catalog, { pending, pick })` — `pending = {intent: "navigate"|"play", candidates: [{kind, id, name}]}`, `pick` = số thứ tự (0..3) khi bấm nút; `sanitizePending(raw) → pending | null`; action `mood` = `{type:"mood", emotion}`.

- [ ] **Step 1: Thêm test (thất bại)** — nối vào cuối `emotune-backend/test/assistantRules.test.js`:

```js
test("cam xuc tu cau noi, co phu dinh", () => {
    assert.deepStrictEqual(act("mình buồn quá"), { type: "mood", emotion: "sad" });
    assert.deepStrictEqual(act("hôm nay mình không vui lắm"), { type: "mood", emotion: "sad" });
    assert.deepStrictEqual(act("không buồn lắm"), { type: "mood", emotion: "neutral" });
    assert.deepStrictEqual(act("tức quá đi"), { type: "mood", emotion: "angry" });
    assert.deepStrictEqual(act("bất ngờ ghê"), { type: "mood", emotion: "surprise" });
    assert.deepStrictEqual(act("thấy bình thường"), { type: "mood", emotion: "neutral" });
    assert.match(parseCommand("mình buồn quá", catalog).reply, /buồn/);
});

test("chu trung tu khoa sau khi bo dau khong bi hieu nham", () => {
    assert.deepStrictEqual(act("tiếp tục đi"), { type: "control", command: "resume" });   // "tuc" khong phai "tuc gian"
    assert.deepStrictEqual(act("đơn giản thôi"), { type: "unknown" });                    // "gian" khong phai "gian du"
});

test("cau ke cam xuc trung vai chu ten bai -> van la cam xuc", () => {
    assert.deepStrictEqual(act("hôm nay có chắc là mình buồn"), { type: "mood", emotion: "sad" });
});

test("tra loi cau hoi lai: theo so thu tu, theo nut bam", () => {
    const { action } = parseCommand("xem ca sĩ Bảo Anh", catalog);
    const pending = { intent: action.intent, candidates: action.candidates };
    assert.deepStrictEqual(act("cái thứ hai", { pending }), { type: "navigate", path: "/artist/41" });
    assert.deepStrictEqual(act("", { pending, pick: 0 }), { type: "navigate", path: "/artist/40" });
});

test("pending bi sua (id khong ton tai) -> bo qua, xu ly nhu cau moi", () => {
    const pending = { intent: "navigate", candidates: [{ kind: "artist", id: 999, name: "X" }] };
    assert.deepStrictEqual(act("bài tiếp", { pending }), { type: "control", command: "next" });
    assert.deepStrictEqual(act("cái đầu tiên", { pending }), { type: "unknown" });
});

test("sanitizePending: chi giu du lieu dung dang", () => {
    const { sanitizePending } = rules;
    assert.strictEqual(sanitizePending(null), null);
    assert.strictEqual(sanitizePending({ intent: "delete", candidates: [] }), null);
    assert.deepStrictEqual(
        sanitizePending({ intent: "play", candidates: [{ kind: "song", id: 3, name: "Giá Như", extra: 1 }, { kind: "x", id: 1 }, { kind: "song", id: "3" }] }),
        { intent: "play", candidates: [{ kind: "song", id: 3, name: "Giá Như" }] },
    );
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npm test`
Expected: FAIL ở các test mới (cảm xúc ra `unknown`; `cái thứ hai` ra `unknown`; `rules.sanitizePending is not a function`).

- [ ] **Step 3: Thêm từ điển cảm xúc** — trong `assistantRules.js`, ngay sau khối `PLAY_VERBS`, thêm:

```js
// tu dien cam xuc (khong dau). Xet theo thu tu nay; cum de nham (vd "tuc" trong "tiep tuc") chi dung dang cum
const MOOD_WORDS = [
    ["surprise", ["bat ngo", "ngac nhien", "khong ngo", "soc", "wow"]],
    ["angry", ["tuc gian", "tuc qua", "tuc minh", "gian du", "gian qua", "dang gian", "buc minh", "buc qua", "buc boi",
        "cau qua", "cau gat", "kho chiu", "dien qua", "phat dien"]],
    ["sad", ["buon", "chan qua", "chan nan", "chan doi", "met", "co don", "khoc", "that tinh", "nan long", "stress", "ap luc"]],
    ["happy", ["vui", "yeu doi", "phan khoi", "hanh phuc", "sung suong", "hao hung", "tuyet voi"]],
    ["neutral", ["binh thuong", "chill", "thu gian", "binh yen"]],
];
// "khong vui" -> buon; "khong buon / khong gian" -> binh thuong
const NEGATORS = ["khong", "chang", "cha", "dau", "chua"];
const NEGATED = { happy: "sad", sad: "neutral", angry: "neutral", surprise: "neutral", neutral: "neutral" };
const MOOD_LABELS = { happy: "vui", sad: "buồn", angry: "bực bội", surprise: "bất ngờ", neutral: "bình thường" };

// so thu tu khi tra loi cau hoi lai ("cai thu hai")
const ORDINALS = [
    [0, ["dau tien", "thu nhat", "so 1", "thu 1", "cai 1", "so mot"]],
    [1, ["thu hai", "so 2", "thu 2", "cai 2", "so hai"]],
    [2, ["thu ba", "so 3", "thu 3", "cai 3", "so ba"]],
    [3, ["thu tu", "so 4", "thu 4", "cai 4", "so bon"]],
];
```

- [ ] **Step 4: Thêm các hàm** — trong `assistantRules.js`, ngay trước `const parseCommand = ...`, thêm:

```js
const detectEmotion = (words) => {
    for (const [emotion, phrases] of MOOD_WORDS) {
        for (const phrase of phrases) {
            const at = findPhrase(words, phrase);
            if (at === -1) continue;
            // phu dinh: "khong / chang / chua ..." trong 2 chu ngay truoc
            const before = words.slice(Math.max(0, at - 2), at);
            const negated = phrase !== "khong ngo" && before.some((w) => NEGATORS.includes(w));
            return negated ? NEGATED[emotion] : emotion;
        }
    }
    return null;
};

const moodAction = (emotion) => ({
    action: { type: "mood", emotion },
    reply: `Bạn đang thấy ${MOOD_LABELS[emotion]}, để mình chọn bài hợp tâm trạng nhé.`,
});

// pending gui tu client: chi giu dung dang, toi da 4 ung vien (id kiem lai voi danh muc o resolvePending)
const sanitizePending = (raw) => {
    if (!raw || !["navigate", "play"].includes(raw.intent) || !Array.isArray(raw.candidates)) return null;
    const candidates = raw.candidates.slice(0, MAX_CANDIDATES)
        .filter((c) => c && ["song", "artist", "playlist"].includes(c.kind) && Number.isInteger(c.id))
        .map((c) => ({ kind: c.kind, id: c.id, name: String(c.name || "") }));
    return candidates.length ? { intent: raw.intent, candidates } : null;
};

// cau tra loi cho lan hoi lai -> muc that trong danh muc (null = khong phai cau tra loi -> xu ly nhu cau moi)
const resolvePending = (words, pending, catalog, pick) => {
    const list = pending.candidates;
    let index = Number.isInteger(pick) ? pick : -1;
    if (index < 0) {
        // noi lai ten: chi nhan khi 1 ung vien khop hon han (trung ten hoan toan -> phai noi so thu tu)
        const compact = words.join("");
        const scored = list.map((c, i) => ({ i, score: scoreName(words, compact, c.name) }))
            .sort((a, b) => b.score - a.score);
        if (scored[0] && scored[0].score >= MIN_SCORE && (scored.length === 1 || scored[1].score < scored[0].score)) {
            index = scored[0].i;
        }
    }
    if (index < 0 && has(words, ["cuoi", "cuoi cung"])) index = list.length - 1;
    for (const [i, phrases] of ORDINALS) {
        if (index < 0 && has(words, phrases)) index = i;
    }
    const c = list[index];
    return c ? entityOf(catalog, c.kind, c.id) : null;
};
```

- [ ] **Step 5: Nối vào `parseCommand`** — thay phần đầu và phần cuối của `parseCommand`:

Thay:
```js
const parseCommand = (text, catalog, options = {}) => {
    const words = toWords(text);
    if (!words.length) return unknownAction();
```
bằng:
```js
const parseCommand = (text, catalog, { pending = null, pick = null } = {}) => {
    const words = toWords(text);

    // 0. dang hoi lai "ban chon cai nao?" -> thu hieu cau nay la cau tra loi
    if (pending) {
        const picked = resolvePending(words, pending, catalog, pick);
        if (picked) return runIntent(pending.intent, catalog, picked);
    }
    if (!words.length) return unknownAction();
```

Thay đoạn cuối:
```js
        return runIntent(intent, catalog, found[0]);
    }

    return unknownAction();
};
```
bằng:
```js
        return runIntent(intent, catalog, found[0]);
    }

    // 4. ke cam xuc -> goi y bai
    const emotion = detectEmotion(words);
    if (emotion) return moodAction(emotion);

    return unknownAction();
};
```

Và thêm `sanitizePending, moodAction` vào `module.exports`.

- [ ] **Step 6: Chạy test, phải PASS**

Run: `npm test`
Expected: tất cả PASS.

---

### Task 3: LLM dự phòng — kiểm tra kết quả + gọi Claude Haiku 5.5

**Files:**
- Modify: `emotune-backend/src/services/assistantRules.js` (thêm `validateLlmAction`)
- Create: `emotune-backend/src/services/assistantLlm.js`
- Modify: `emotune-backend/package.json` (qua `npm install`), `emotune-backend/.evn.example`
- Test: `emotune-backend/test/assistantRules.test.js`

**Interfaces:**
- Consumes (Task 1–2): `PAGES`, `EMOTIONS`, `CONTROLS`, `entityOf`, `navigateAction`, `playAction`, `controlAction`, `moodAction`, `unknownAction`.
- Produces: `validateLlmAction(raw, catalog) → {action, reply}`; `classifyWithLlm(text, catalog) → Promise<object|null>` với object thô `{type, path, kind, id, emotion, command, reply}`.

- [ ] **Step 1: Thêm test (thất bại)** — nối vào cuối file test:

```js
test("validateLlmAction: chi nhan hanh dong va id co that", () => {
    const { validateLlmAction } = rules;
    const base = { path: "", kind: "none", id: 0, emotion: "none", command: "none", reply: "" };

    const play = validateLlmAction({ ...base, type: "play", kind: "song", id: 3, reply: "Phát Giá Như cho bạn nè" }, catalog);
    assert.strictEqual(play.action.song.id, 3);
    assert.strictEqual(play.reply, "Phát Giá Như cho bạn nè");   // cung loai hanh dong -> dung cau cua LLM

    assert.deepStrictEqual(validateLlmAction({ ...base, type: "navigate", path: "/stats" }, catalog).action, { type: "navigate", path: "/stats" });
    assert.deepStrictEqual(validateLlmAction({ ...base, type: "navigate", path: "/artist/4" }, catalog).action, { type: "navigate", path: "/artist/4" });
    assert.deepStrictEqual(validateLlmAction({ ...base, type: "mood", emotion: "sad" }, catalog).action, { type: "mood", emotion: "sad" });
    assert.deepStrictEqual(validateLlmAction({ ...base, type: "control", command: "next" }, catalog).action, { type: "control", command: "next" });

    // id / duong dan / lenh bia -> unknown
    assert.deepStrictEqual(validateLlmAction({ ...base, type: "navigate", path: "/artist/999" }, catalog).action, { type: "unknown" });
    assert.deepStrictEqual(validateLlmAction({ ...base, type: "navigate", path: "/admin" }, catalog).action, { type: "unknown" });
    assert.deepStrictEqual(validateLlmAction({ ...base, type: "play", kind: "song", id: 999 }, catalog).action, { type: "unknown" });
    assert.deepStrictEqual(validateLlmAction({ ...base, type: "control", command: "explode" }, catalog).action, { type: "unknown" });
    assert.deepStrictEqual(validateLlmAction(null, catalog).action, { type: "unknown" });
});
```

- [ ] **Step 2: Chạy test, phải FAIL**

Run: `npm test`
Expected: FAIL — `rules.validateLlmAction is not a function`.

- [ ] **Step 3: Thêm `validateLlmAction`** — trong `assistantRules.js`, ngay trước `module.exports`:

```js
// Ket qua LLM KHONG duoc tin thang: chi nhan loai hanh dong, trang, id co trong danh muc; sai -> unknown
// Cau tra loi cua LLM chi dung khi hanh dong giu nguyen loai (vd ca si chua co bai -> mo trang, dung cau cua luat)
const validateLlmAction = (raw, catalog) => {
    if (!raw || typeof raw !== "object") return unknownAction();
    const reply = typeof raw.reply === "string" ? raw.reply.trim().slice(0, 200) : "";
    const withReply = (result) => (reply && result.action.type === raw.type ? { ...result, reply } : result);

    switch (raw.type) {
        case "navigate": {
            const page = PAGES.find((p) => p.path === raw.path);
            if (page) return withReply({ action: { type: "navigate", path: page.path }, reply: `Đang mở ${page.name}.` });
            const m = /^\/(artist|playlist)\/(\d+)$/.exec(raw.path || "");
            const entity = m && entityOf(catalog, m[1], Number(m[2]));
            return entity ? withReply(navigateAction(catalog, entity)) : unknownAction();
        }
        case "play": {
            const entity = entityOf(catalog, raw.kind, raw.id);
            return entity ? withReply(playAction(catalog, entity)) : unknownAction();
        }
        case "mood":
            return EMOTIONS.includes(raw.emotion) ? withReply(moodAction(raw.emotion)) : unknownAction();
        case "control":
            return CONTROLS.includes(raw.command) ? withReply(controlAction(raw.command)) : unknownAction();
        default:
            return unknownAction();
    }
};
```

Thêm `validateLlmAction` vào `module.exports`.

- [ ] **Step 4: Chạy test, phải PASS**

Run: `npm test`
Expected: tất cả PASS.

- [ ] **Step 5: Cài SDK + kiểm tra cách `require` (backend dùng CommonJS)**

Run (trong `emotune-backend/`):
```bash
npm install @anthropic-ai/sdk
node -e "const { Anthropic } = require('@anthropic-ai/sdk'); console.log(typeof Anthropic)"
```
Expected: in `function`. (Nếu in `undefined`: dùng `const Anthropic = require('@anthropic-ai/sdk').default` ở bước 6.)

- [ ] **Step 6: Viết `emotune-backend/src/services/assistantLlm.js`**

```js
// LLM du phong cho tro ly giong noi: chi goi khi bo luat (assistantRules) khong hieu cau noi.
// Claude Haiku 5.5 (re + nhanh), tra JSON theo schema co dinh. KHONG tin thang ket qua:
// assistantRules.validateLlmAction kiem lai voi danh muc truoc khi dung.
// Khong co ANTHROPIC_API_KEY / loi mang / qua 6s -> tra null (tro ly noi "chua hieu", khong sap)
const { Anthropic } = require("@anthropic-ai/sdk");

const MODEL = "claude-haiku-5-5";

// moi truong deu bat buoc (structured outputs) -> truong khong dung thi LLM dien "", "none", 0
const ACTION_SCHEMA = {
    type: "object",
    properties: {
        type: { type: "string", enum: ["navigate", "play", "mood", "control", "unknown"] },
        path: { type: "string" },
        kind: { type: "string", enum: ["song", "artist", "playlist", "none"] },
        id: { type: "integer" },
        emotion: { type: "string", enum: ["happy", "sad", "angry", "surprise", "neutral", "none"] },
        command: { type: "string", enum: ["pause", "resume", "next", "volume_up", "volume_down", "mute", "not_for_me", "none"] },
        reply: { type: "string" },
    },
    required: ["type", "path", "kind", "id", "emotion", "command", "reply"],
    additionalProperties: false,
};

const SYSTEM_PROMPT = `Bạn là bộ hiểu lệnh của trợ lý giọng nói trong web nghe nhạc EmoTune.
Người dùng nói tiếng Việt; câu đã được chuyển thành chữ nên có thể sai chính tả hoặc thiếu dấu.
Chọn ĐÚNG MỘT hành động:
- navigate: mở một trang. path là một trong: "/" (trang chủ), "/scan" (quét cảm xúc bằng camera), "/now-playing" (màn đang phát), "/lyrics" (lời bài hát), "/stats" (thống kê cảm xúc), "/settings" (cài đặt), "/survey" (khảo sát gu nhạc), "/artist/<id>" (trang ca sĩ), "/playlist/<id>" (trang playlist).
- play: phát nhạc; kind là song, artist hoặc playlist; id lấy từ danh mục.
- mood: người dùng đang kể về cảm xúc, tâm trạng, một ngày của họ; emotion là happy, sad, angry, surprise hoặc neutral.
- control: điều khiển bài đang phát; command là pause, resume, next, volume_up, volume_down, mute hoặc not_for_me.
- unknown: không thuộc các loại trên.
Chỉ dùng id có trong danh mục. Trường không dùng: path "", kind "none", id 0, emotion "none", command "none".
reply: một câu tiếng Việt ngắn (dưới 20 từ), thân thiện, nói điều bạn sẽ làm.`;

const buildUserMessage = (text, catalog) => {
    const songs = catalog.songs.map((s) => `[${s.id}] ${s.title}${s.artist ? ` — ${s.artist}` : ""}`).join("\n");
    const artists = catalog.artists.map((a) => `[${a.id}] ${a.name}`).join("\n");
    const playlists = catalog.playlists.map((p) => `[${p.id}] ${p.name}`).join("\n");
    return `Danh mục\nBài hát:\n${songs}\nCa sĩ:\n${artists}\nPlaylist:\n${playlists || "(chưa có)"}\n\nCâu nói: "${text}"`;
};

let client = null;
const getClient = () => {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    if (!client) client = new Anthropic({ timeout: 6000, maxRetries: 1 });
    return client;
};

const classifyWithLlm = async (text, catalog) => {
    const anthropic = getClient();
    if (!anthropic) return null;
    try {
        const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 2048,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: buildUserMessage(text, catalog) }],
            output_config: { effort: "low", format: { type: "json_schema", schema: ACTION_SCHEMA } },
        });
        if (response.stop_reason !== "end_turn") return null;
        const block = response.content.find((b) => b.type === "text");
        return block ? JSON.parse(block.text) : null;
    } catch (err) {
        if (err instanceof Anthropic.APIError) console.log(`Loi goi Claude (${err.status}):`, err.message);
        else console.log("Loi goi Claude:", err.message);
        return null;
    }
};

module.exports = {
    classifyWithLlm: classifyWithLlm,
};
```

- [ ] **Step 7: Thêm key mẫu** — cuối `emotune-backend/.evn.example`:

```
# Tro ly giong noi (H6): key Claude API cho phan du phong (bo trong = chi dung bo luat)
ANTHROPIC_API_KEY = 
```

- [ ] **Step 8: Kiểm tra file nạp được và test vẫn xanh**

Run:
```bash
node -e "require('./src/services/assistantLlm'); console.log('ok')"
npm test
```
Expected: in `ok`; test PASS.

---

### Task 4: API `POST /assistant`

**Files:**
- Create: `emotune-backend/src/services/assistantService.js`
- Create: `emotune-backend/src/controllers/assistantController.js`
- Modify: `emotune-backend/src/routes/web.js`

**Interfaces:**
- Consumes: `songModel.getAllSongs()`, `artistModel.getArtistsData()`, `playlistModel.getPlaylists(userId)`; `parseCommand`, `validateLlmAction`, `sanitizePending` (Task 1–3); `classifyWithLlm` (Task 3).
- Produces: `POST /assistant` body `{text: string, pending?: object, pick?: number}` → `200 {action, reply, source: "rules"|"llm"|"none"}`; `400 {err}` khi `text` rỗng (và không có `pick`) hoặc > 300 ký tự; `401` khi chưa đăng nhập.

- [ ] **Step 1: Viết `emotune-backend/src/services/assistantService.js`**

```js
const songModel = require("../model/songModel")
const artistModel = require("../model/artistModel")
const playlistModel = require("../model/playlistModel")
const { parseCommand, validateLlmAction } = require("./assistantRules")
const { classifyWithLlm } = require("./assistantLlm")

// danh muc de tro ly tim ten: ca kho nhac + ca si + playlist CUA NGUOI NAY
let getCatalog = async (userId) => {
    const [songs, artists, playlists] = await Promise.all([
        songModel.getAllSongs(),
        artistModel.getArtistsData(),
        playlistModel.getPlaylists(userId),
    ]);
    return { songs, artists, playlists };
}

// luat truoc (nhanh, mien phi, co test); luat khong hieu -> hoi LLM; LLM tra sai / khong co -> "chua hieu"
let ask = async (userId, text, options) => {
    const catalog = await getCatalog(userId);
    const ruled = parseCommand(text, catalog, options);
    if (ruled.action.type !== "unknown") return { ...ruled, source: "rules" };
    if (!text) return { ...ruled, source: "none" };

    const raw = await classifyWithLlm(text, catalog);
    const llm = validateLlmAction(raw, catalog);
    if (llm.action.type === "unknown") return { ...ruled, source: "none" };
    return { ...llm, source: "llm" };
}

module.exports = {
    ask: ask,
}
```

- [ ] **Step 2: Viết `emotune-backend/src/controllers/assistantController.js`**

```js
const assistantService = require("../services/assistantService")
const { sanitizePending } = require("../services/assistantRules")

const MAX_TEXT = 300

// body: { text, pending?, pick? } - pending/pick chi co khi tra loi cau hoi lai "ban chon cai nao?"
let ask = async (req, res) => {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : ""
    const pending = sanitizePending(req.body?.pending)
    const pick = pending && Number.isInteger(req.body?.pick) ? req.body.pick : null
    if ((!text && pick === null) || text.length > MAX_TEXT) {
        return res.status(400).json({ err: "Cau noi rong hoac qua dai" })
    }
    try {
        const data = await assistantService.ask(req.userId, text, { pending, pick })
        return res.status(200).json(data)
    } catch (err) {
        console.log("Loi goi API assistant :" + err)
        return res.status(500).json({ err: "Loi server tro ly giong noi" })
    }
}

module.exports = {
    ask: ask,
}
```

- [ ] **Step 3: Thêm route** — `emotune-backend/src/routes/web.js`:

Thêm cạnh các `require` controller:
```js
const assistantController = require('../controllers/assistantController')
```
Thêm sau dòng `router.post('/scan-and-suggest', ...)`:
```js
    router.post('/assistant', requireAuth, assistantController.ask)
```

- [ ] **Step 4: Thử bằng curl** (backend chạy `npm run dev`, PostgreSQL đang chạy; Git Bash, trong `emotune-backend/`):

```bash
TOKEN=$(curl -s -X POST localhost:8080/auth/login -H "Content-Type: application/json" -d '{"username":"demo","password":"demo1234"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")
curl -s -X POST localhost:8080/assistant -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"text":"cho tôi xem ca sĩ Sơn Tùng MTP"}'
curl -s -X POST localhost:8080/assistant -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"text":"bài tiếp"}'
curl -s -X POST localhost:8080/assistant -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"text":"hôm nay mình không vui lắm"}'
curl -s -X POST localhost:8080/assistant -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"text":"nay sếp mắng, chẳng muốn làm gì"}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8080/assistant -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"text":""}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8080/assistant -H "Content-Type: application/json" -d '{"text":"bài tiếp"}'
```
Expected:
1. `{"action":{"type":"navigate","path":"/artist/4"},"reply":"Đang mở trang Sơn Tùng M-TP.","source":"rules"}` (id ca sĩ theo DB thật).
2. `control next`, `source:"rules"`.
3. `mood sad`, `source:"rules"`.
4. Không có key → `unknown`, `source:"none"`. Có `ANTHROPIC_API_KEY` trong `.env` → thường `mood sad` (hoặc angry), `source:"llm"`.
5. `400`. 6. `401`.

Nếu có key mà câu 4 vẫn `source:"none"`: xem log backend (`Loi goi Claude (...)`) — sai tham số `output_config` thì sửa theo thông báo lỗi của API.

---

### Task 5: Kênh điều khiển nhạc `control(command)`

**Files:**
- Modify: `emotune-frontend/src/contexts/playbackContext.js`
- Modify: `emotune-frontend/src/contexts/PlaybackProvider.jsx`
- Modify: `emotune-frontend/src/components/PlayerHost.jsx`
- Modify: `emotune-frontend/src/components/MusicPlayer.jsx`

**Interfaces:**
- Produces: `usePlayback().control(command)` với `command ∈ {"pause","resume","next","volume_up","volume_down","mute","not_for_me","duck","unduck"}`. Chưa có bài → không làm gì (trợ lý tự kiểm tra `nowPlaying` trước).

- [ ] **Step 1: `playbackContext.js`** — thêm vào chú thích đầu file dòng:
```js
// - control(command): tro ly giong noi dieu khien bai dang phat (pause/resume/next/volume_up/volume_down/mute/not_for_me/duck/unduck)
```
và thêm vào object mặc định (sau `playSong: () => {},`):
```js
    control: () => {},
```

- [ ] **Step 2: `PlaybackProvider.jsx`** — sau dòng `const playSong = ...`:
```js
    const control = useCallback((command) => send({ kind: "control", command }), [send]);
```
thêm `control` vào object trong `useMemo` và vào mảng phụ thuộc:
```js
    const value = useMemo(() => ({
        playScanResult, playPlaylist, playQueue, playSong, control, registerPlayer,
        lastMood, setLastMood, nowPlaying, setNowPlaying, playlistsVersion, refreshPlaylists,
    }), [playScanResult, playPlaylist, playQueue, playSong, control, registerPlayer,
        lastMood, setLastMood, nowPlaying, playlistsVersion, refreshPlaylists]);
```

- [ ] **Step 3: `PlayerHost.jsx`** — sau dòng `const isIdle = useIdle(IDLE_MS);` thêm:
```js
    // MusicPlayer dang phat dat ham nhan lenh dieu khien vao day (tro ly giong noi: dung, bai tiep, to/nho...)
    const controlRef = useRef(null);
```
trong `handleCommand`, thêm nhánh cuối (sau nhánh `playlist`):
```js
        } else if (cmd.kind === "control") {
            controlRef.current?.(cmd.command);
        }
```
(nhớ bỏ dấu `}` thừa của nhánh `playlist` cũ để chuỗi `else if` liền mạch), và truyền prop cho `MusicPlayer`:
```jsx
                showLyrics={onLyrics}
                controlRef={controlRef}
```

- [ ] **Step 4: `MusicPlayer.jsx`** — import thêm `useEffect`:
```js
import { useCallback, useEffect, useRef, useState } from 'react'
```
lấy prop: thay `const { data, onFinish, playlist, onJump, onRequest, showLyrics } = props;` bằng:
```js
    const { data, onFinish, playlist, onJump, onRequest, showLyrics, controlRef } = props;
```
Ngay sau hàm `toggleMute` thêm:
```js
    // tro ly dang nghe / dang noi -> nhac nho con 20% ("duck"), xong tra lai ("unduck")
    const duckedRef = useRef(false);

    const changeVolume = (value) => {
        const audio = audioRef.current;
        audio.volume = duckedRef.current ? value * 0.2 : value;
        audio.muted = false;
        setVolume(value);
        setMuted(false);
    }

    // lenh tu tro ly giong noi (PlayerHost chuyen toi qua controlRef)
    const runControl = (command) => {
        const audio = audioRef.current;
        if (!audio) return;
        if (command === "pause") audio.pause();
        else if (command === "resume") { if (!loadError) audio.play().catch(() => {}); }
        else if (command === "next") finishAndSend();
        else if (command === "not_for_me") dislike();
        else if (command === "volume_up") changeVolume(Math.min(1, volume + 0.2));
        else if (command === "volume_down") changeVolume(Math.max(0.1, volume - 0.2));
        else if (command === "mute") { audio.muted = true; setMuted(true); }
        else if (command === "duck") { duckedRef.current = true; audio.volume = volume * 0.2; }
        else if (command === "unduck") { duckedRef.current = false; audio.volume = volume; }
    }
    // luon de ban moi nhat (dung state volume moi)
    useEffect(() => {
        if (controlRef) controlRef.current = runControl;
    });
```

- [ ] **Step 5: Lint + build**

Run (trong `emotune-frontend/`): `npx eslint src && npm run build`
Expected: không lỗi, không cảnh báo; build OK.

---

### Task 6: Nhận giọng / đọc to + overlay trợ lý theo Figma

**Files:**
- Create: `emotune-frontend/src/utils/speech.js`
- Create: `emotune-frontend/src/components/VoiceWave.jsx`
- Create: `emotune-frontend/src/components/VoiceAssistant.jsx`
- Create: `emotune-frontend/src/components/VoiceAssistant.scss`
- Create: `emotune-frontend/src/assets/icons/assistant_mic.svg`, `assistant_logo.svg`
- Modify: `emotune-frontend/src/contexts/AIAssistantContext.jsx`
- Modify: `emotune-frontend/src/components/Header.jsx`
- Modify: `emotune-frontend/src/layouts/MainLayout.jsx`
- Modify: `emotune-frontend/src/index.css`

**Interfaces:**
- Consumes: `POST /assistant` (Task 4); `usePlayback()` → `playSong(song)`, `playQueue({name, songs}, 0)`, `playPlaylist(id, 0)`, `playScanResult(result)`, `setLastMood(emotion)`, `control(command)` (Task 5), `nowPlaying`; `markScanned()` từ `utils/moodSession`; `useAIAssistant()` từ `contexts/aiAssistantStore`.
- Produces: `useAIAssistant() → { isOpen, openAssistant, closeAssistant }`; `speech.js`: `isSpeechSupported(): boolean`, `listen({onInterim, onFinal, onError, onEnd}) → stop()`, `speak(text) → Promise<boolean>`, `stopSpeaking()`.

- [x] **Step 1: Tải asset Figma** — ĐÃ XONG 09/10 (2 file đã có trong `src/assets/icons/`, có `width`/`height` gốc 111 và 60). Lệnh để tham khảo (URL hết hạn 7 ngày kể từ 09/10/2026; trong `emotune-frontend/`):

```bash
curl -s -o src/assets/icons/assistant_mic.svg "https://www.figma.com/api/mcp/asset/3c8b87a8-6acd-4dcb-ad88-5e89d26a8e63.svg"
curl -s -o src/assets/icons/assistant_logo.svg "https://www.figma.com/api/mcp/asset/2da7f30a-fc63-43ff-b7a6-8d141a8fd6a9.svg"
head -c 300 src/assets/icons/assistant_mic.svg; echo; head -c 300 src/assets/icons/assistant_logo.svg
```
Expected: hai file bắt đầu bằng `<svg` có `width`/`height`. Nếu URL đã hết hạn: gọi Figma MCP `get_design_context` cho node `198:258` (micro) và `194:63` (logo) để lấy URL mới.

- [ ] **Step 2: Viết `emotune-frontend/src/utils/speech.js`**

```js
// Nhan giong noi + doc to cho tro ly (H6).
// Nhan giong: Web Speech API cua Chrome/Edge (gui am thanh len may chu Google -> can Internet).
// Tach rieng file nay: sau nay tren Pi (Chromium khong co Web Speech) chi can thay bang ban goi Whisper/PhoWhisper.
const Recognition = typeof window !== "undefined"
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

export const isSpeechSupported = () => Boolean(Recognition);

// Nghe 1 cau tieng Viet. onInterim: chu tam (hien dan khi dang noi); onFinal: cau hoan chinh;
// onError(code): "no-speech" | "not-allowed" | "network" | ...; onEnd: ket thuc (ke ca loi).
// Tra ve ham huy (dong overlay / bam micro lan nua) - huy thi KHONG goi onFinal/onEnd.
export const listen = ({ onInterim, onFinal, onError, onEnd }) => {
    const rec = new Recognition();
    rec.lang = "vi-VN";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    let cancelled = false;

    rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) finalText += r[0].transcript;
            else interim += r[0].transcript;
        }
        onInterim?.((finalText + interim).trim());
    };
    rec.onerror = (e) => {
        if (!cancelled) onError?.(e.error);
    };
    rec.onend = () => {
        if (cancelled) return;
        if (finalText.trim()) onFinal?.(finalText.trim());
        onEnd?.();
    };

    try {
        rec.start();
    } catch {
        onError?.("start-failed");
        onEnd?.();
    }
    return () => {
        cancelled = true;
        rec.abort();
    };
};

// giong tieng Viet co san cua trinh duyet (Chrome tai danh sach giong cham -> nghe "voiceschanged")
let viVoice = null;
const pickVoice = () => {
    const voices = window.speechSynthesis?.getVoices() || [];
    viVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("vi")) || null;
};
if (typeof window !== "undefined" && window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
}

// Doc to; Promise xong khi doc het (true) hoac khong doc duoc (false: khong co giong Viet / bi huy)
export const speak = (text) => new Promise((resolve) => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth || !text) return resolve(false);
    if (!viVoice) pickVoice();
    if (!viVoice) return resolve(false);

    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "vi-VN";
    utter.voice = viVoice;
    utter.rate = 1.05;
    // Chrome doi khi khong ban "end" -> tu xong sau khoang thoi gian uoc luong
    const timer = setTimeout(() => resolve(true), 2000 + text.length * 120);
    const done = (ok) => () => {
        clearTimeout(timer);
        resolve(ok);
    };
    utter.onend = done(true);
    utter.onerror = done(false);
    synth.speak(utter);
});

export const stopSpeaking = () => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
};
```

- [ ] **Step 3: Viết `emotune-frontend/src/components/VoiceWave.jsx`**

```jsx
import { useEffect, useRef } from 'react';

// Song am cua tro ly (Figma 284:120): chieu cao tung vach lay tu ban ve (cao nhat 420px), 2 "dinh" lon + 1 dinh nho.
// mode: "mic" = nhap nho theo giong nguoi dung (micro that), "speaking" = nhip gia khi tro ly doc, "idle" = gan phang.
// Cap nhat thang style tung vach moi khung hinh (khong setState 60 lan/giay).
const PROFILE = [18, 18, 18, 60, 107, 182, 232, 306, 380, 420, 380, 306, 232, 182, 107, 60, 89, 60, 60, 107, 148, 182,
    232, 182, 107, 60, 60, 60, 48, 87, 147, 169, 224, 278, 307, 278, 224, 170, 133, 79, 18, 18, 18].map((h) => h / 420);

const VoiceWave = ({ mode }) => {
    const barsRef = useRef([]);

    useEffect(() => {
        let raf = 0;
        let stopped = false;
        let stream = null;
        let ctx = null;
        let analyser = null;
        let samples = null;

        if (mode === "mic" && navigator.mediaDevices?.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then((s) => {
                    if (stopped) {
                        s.getTracks().forEach((t) => t.stop());
                        return;
                    }
                    stream = s;
                    ctx = new AudioContext();
                    analyser = ctx.createAnalyser();
                    analyser.fftSize = 512;
                    ctx.createMediaStreamSource(s).connect(analyser);
                    samples = new Uint8Array(analyser.fftSize);
                })
                .catch(() => {});   // khong co / chan micro -> song gan phang, tro ly van chay
        }

        const tick = (t) => {
            let level = 0.06;
            if (mode === "mic" && analyser) {
                analyser.getByteTimeDomainData(samples);
                let sum = 0;
                for (const v of samples) {
                    const x = (v - 128) / 128;
                    sum += x * x;
                }
                level = Math.min(1, Math.sqrt(sum / samples.length) * 5);
            } else if (mode === "speaking") {
                level = 0.45 + 0.3 * Math.sin(t / 180);
            }
            barsRef.current.forEach((bar, i) => {
                if (!bar) return;
                const wobble = mode === "idle" ? 1 : 0.75 + 0.25 * Math.sin(t / 120 + i * 0.7);
                bar.style.transform = `scaleY(${Math.max(0.04, PROFILE[i] * level * wobble)})`;
            });
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            stopped = true;
            cancelAnimationFrame(raf);
            stream?.getTracks().forEach((track) => track.stop());
            ctx?.close();
        };
    }, [mode]);

    return (
        <div className="voice-wave" aria-hidden="true">
            {PROFILE.map((_, i) => (
                <span key={i} ref={(el) => { barsRef.current[i] = el; }} />
            ))}
        </div>
    );
};

export default VoiceWave;
```

- [ ] **Step 4: Sửa `emotune-frontend/src/contexts/AIAssistantContext.jsx`** (thay toàn bộ):

```jsx
import { useCallback, useMemo, useState } from 'react';
import { AIAssistantContext } from './aiAssistantStore';

// Hook useAIAssistant() nằm ở ./aiAssistantStore.js
// Trợ lý giọng nói (H6): bấm logo AI trên header -> mở lớp phủ VoiceAssistant (MainLayout vẽ khi isOpen)
export const AIAssistantProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const openAssistant = useCallback(() => setIsOpen(true), []);
    const closeAssistant = useCallback(() => setIsOpen(false), []);

    const value = useMemo(() => ({ isOpen, openAssistant, closeAssistant }), [isOpen, openAssistant, closeAssistant]);

    return (
        <AIAssistantContext.Provider value={value}>
            {children}
        </AIAssistantContext.Provider>
    )
}
```

- [ ] **Step 5: Viết `emotune-frontend/src/components/VoiceAssistant.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { usePlayback } from '../contexts/playbackContext';
import { useAIAssistant } from '../contexts/aiAssistantStore';
import { markScanned } from '../utils/moodSession';
import { isSpeechSupported, listen, speak, stopSpeaking } from '../utils/speech';
import VoiceWave from './VoiceWave';
import LogoIcon from '../assets/icons/assistant_logo.svg?react';
import MicIcon from '../assets/icons/assistant_mic.svg?react';
import './VoiceAssistant.scss';

// Tro ly giong noi (H6, Figma 284:120): mo -> nghe ngay; noi xong -> POST /assistant -> lam lenh + doc cau tra loi.
// Lam xong lenh (chuyen trang / phat / cam xuc / dieu khien) -> tu dong sau 1.5s; hoi lai / chua hieu -> nghe tiep.
const CLOSE_DELAY = 1500;
const SUGGESTIONS = ["Phát nhạc Sơn Tùng", "Hôm nay mình hơi buồn", "Mở trang thống kê"];
const NO_SONG = "Chưa có bài nào đang phát.";
const UNSUPPORTED = "Trình duyệt này không nhận giọng nói, bạn gõ giúp mình nhé.";
const SPEECH_ERRORS = {
    "no-speech": "Mình không nghe thấy gì, bấm micro để nói lại nhé.",
    "audio-capture": "Không tìm thấy micro, bạn gõ giúp mình nhé.",
    "not-allowed": "Bạn chưa cho phép dùng micro, bạn gõ giúp mình nhé.",
    "service-not-allowed": "Bạn chưa cho phép dùng micro, bạn gõ giúp mình nhé.",
    network: "Nhận giọng nói cần Internet, bạn gõ giúp mình nhé.",
    "start-failed": "Không bật được micro, bạn gõ giúp mình nhé.",
};

const VoiceAssistant = () => {
    const { closeAssistant } = useAIAssistant();
    const { playSong, playQueue, playPlaylist, playScanResult, setLastMood, control, nowPlaying } = usePlayback();
    const navigate = useNavigate();

    const [phase, setPhase] = useState("idle");   // idle | listening | thinking | replying
    const [heard, setHeard] = useState("");
    const [reply, setReply] = useState("");
    const [notice, setNotice] = useState(isSpeechSupported() ? "" : UNSUPPORTED);
    const [choices, setChoices] = useState(null);
    const [typed, setTyped] = useState("");

    const stopListenRef = useRef(null);
    const closeTimerRef = useRef(null);
    const aliveRef = useRef(true);
    // moi luot hoi tang 1: cau tra loi / doc to cua luot CU xong muon thi khong duoc dong overlay hay bat mic
    const turnRef = useRef(0);
    const pendingRef = useRef(null);              // { intent, candidates } khi dang hoi lai
    const nowPlayingRef = useRef(nowPlaying);

    const stopListening = () => {
        stopListenRef.current?.();
        stopListenRef.current = null;
    };

    const startListening = () => {
        if (!isSpeechSupported() || !aliveRef.current) return;
        stopListening();
        setNotice("");
        setHeard("");
        setPhase("listening");
        stopListenRef.current = listen({
            onInterim: setHeard,
            onFinal: (text) => send({ text }),
            onError: (code) => setNotice(SPEECH_ERRORS[code] || ""),
            onEnd: () => setPhase((p) => (p === "listening" ? "idle" : p)),
        });
    };

    // thuc hien hanh dong backend tra ve; close = lam xong thi tu dong overlay; reply = cau thay the
    const runAction = (action) => {
        const playing = Boolean(nowPlayingRef.current);
        switch (action.type) {
            case "navigate":
                if ((action.path === "/now-playing" || action.path === "/lyrics") && !playing) {
                    return { close: false, reply: NO_SONG };
                }
                navigate(action.path);
                return { close: true };
            case "play":
                if (action.kind === "song") playSong(action.song);
                else if (action.kind === "artist") playQueue(action.queue, 0);
                else playPlaylist(action.playlistId, 0);
                return { close: true };
            case "mood":
                // cam xuc tu cau noi = kenh thu 2 ben canh khuon mat: giong het chon cam xuc bang tay
                api.post('/suggest', { emotion: action.emotion })
                    .then((res) => {
                        markScanned();
                        setLastMood(res.data.detectedEmotion || res.data.emotion);
                        playScanResult(res.data);
                        navigate("/now-playing");
                    })
                    .catch((err) => console.log("Loi goi /suggest:", err));
                return { close: true };
            case "control":
                if (!playing) return { close: false, reply: NO_SONG };
                control(action.command);
                return { close: true };
            default:
                return { close: false };
        }
    };

    const respond = (turn, { action, reply: text }) => {
        if (!aliveRef.current || turn !== turnRef.current) return;
        const isChoice = action.type === "choose";
        pendingRef.current = isChoice ? { intent: action.intent, candidates: action.candidates } : null;
        setChoices(isChoice ? action.candidates : null);

        const result = runAction(action);
        const say = result.reply || text;
        setReply(say);
        setPhase("replying");
        speak(say).then(() => {
            if (!aliveRef.current || turn !== turnRef.current) return;
            if (result.close) closeTimerRef.current = setTimeout(closeAssistant, CLOSE_DELAY);
            else startListening();
        });
    };

    // body: { text } hoac { text: "", pick } (bam nut khi hoi lai)
    const send = (body) => {
        const turn = ++turnRef.current;
        stopListening();
        stopSpeaking();
        clearTimeout(closeTimerRef.current);
        setNotice("");
        if (body.text) setHeard(body.text);
        setPhase("thinking");
        api.post('/assistant', { ...body, pending: pendingRef.current })
            .then((res) => respond(turn, res.data))
            .catch(() => respond(turn, { action: { type: "unknown" }, reply: "Mình đang gặp lỗi, bạn thử lại sau nhé." }));
    };

    const toggleMic = () => {
        turnRef.current += 1;
        stopSpeaking();
        clearTimeout(closeTimerRef.current);
        if (phase === "listening") {
            stopListening();
            setPhase("idle");
        } else {
            startListening();
        }
    };

    const submitTyped = (e) => {
        e.preventDefault();
        const text = typed.trim();
        if (!text) return;
        setTyped("");
        send({ text });
    };

    const pickChoice = (i) => {
        setHeard(choices[i].name);
        send({ text: "", pick: i });
    };

    // ham moi nhat cho effect mo/dong (effect chi chay 1 lan)
    const startRef = useRef(startListening);
    useEffect(() => {
        startRef.current = startListening;
        nowPlayingRef.current = nowPlaying;
    });

    // mo overlay: giam nhac + nghe ngay; dong (go component): dung nghe, dung doc, tra am luong
    useEffect(() => {
        aliveRef.current = true;
        control("duck");
        startRef.current();
        return () => {
            aliveRef.current = false;
            stopListenRef.current?.();
            stopSpeaking();
            clearTimeout(closeTimerRef.current);
            control("unduck");
        };
    }, [control]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") closeAssistant();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [closeAssistant]);

    const waveMode = phase === "listening" ? "mic" : phase === "replying" ? "speaking" : "idle";
    const showSuggestions = !heard && !reply && phase !== "thinking";

    return (
        <div className="voice-assistant" role="dialog" aria-modal="true" aria-label="Voice assistant">
            <button className="va-close" onClick={closeAssistant} aria-label="Close voice assistant">✕</button>
            <LogoIcon className="va-logo" aria-hidden="true" />

            <div className="va-main">
                <button
                    className={`va-mic ${phase === "listening" ? "is-listening" : ""}`}
                    onClick={toggleMic}
                    disabled={!isSpeechSupported()}
                    aria-label={phase === "listening" ? "Stop listening" : "Start listening"}
                >
                    <MicIcon />
                </button>

                <div className="va-text" aria-live="polite">
                    <p className="va-heard">{heard || (phase === "listening" ? "Mình đang nghe…" : "")}</p>
                    {phase === "thinking" && <p className="va-reply is-thinking">Đang nghĩ…</p>}
                    {reply && phase !== "thinking" && <p className="va-reply">{reply}</p>}
                    {notice && <p className="va-notice">{notice}</p>}
                    {choices && (
                        <div className="va-choices">
                            {choices.map((c, i) => (
                                <button key={`${c.kind}-${c.id}`} onClick={() => pickChoice(i)}>
                                    {c.name}<span>{c.detail}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {showSuggestions && (
                        <div className="va-suggestions">
                            {SUGGESTIONS.map((s) => (
                                <button key={s} onClick={() => send({ text: s })}>“{s}”</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <VoiceWave mode={waveMode} />

            <form className="va-type" onSubmit={submitTyped}>
                <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder="Hoặc gõ yêu cầu…"
                    aria-label="Type a request"
                    maxLength={300}
                />
                <button type="submit" disabled={!typed.trim()}>Gửi</button>
            </form>
        </div>
    );
};

export default VoiceAssistant;
```

- [ ] **Step 6: Viết `emotune-frontend/src/components/VoiceAssistant.scss`**

```scss
// Tro ly giong noi - Figma 284:120 (1440 x 1024): nen #261925, logo AI 92px tren cung,
// micro 111px giua man, song 43 vach #d9d9d9 rong 13px (cao nhat 420px) o nua duoi.
.voice-assistant {
    position: fixed;
    inset: 0;
    z-index: 50;                       // tren header, thanh phat (20), man loi bai hat (19)
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 52px 16px 24px;
    background: var(--assistant-bg);
    color: #f6ecf2;
    overflow-y: auto;
    animation: va-in 0.25s ease-out;

    .va-close {
        position: absolute;
        top: 24px;
        right: 28px;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        color: inherit;
        font-size: 18px;
        cursor: pointer;

        &:hover { background: rgba(255, 255, 255, 0.16); }
    }

    .va-logo {
        flex: none;
        width: 92px;
        height: 92px;
    }

    .va-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 24px;
        width: 100%;
        min-height: 300px;
    }

    .va-mic {
        display: grid;
        place-items: center;
        padding: 18px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: inherit;
        cursor: pointer;
        transition: background 0.2s;

        svg {
            width: 111px;
            height: 111px;
        }

        &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.06); }
        &:disabled { opacity: 0.4; cursor: default; }

        &.is-listening {
            background: rgba(232, 197, 220, 0.08);
            animation: va-pulse 1.6s ease-out infinite;
        }
    }

    .va-text {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        max-width: 760px;
        text-align: center;
    }

    .va-heard {
        min-height: 1.3em;
        margin: 0;
        font-family: "Be Vietnam Pro", "DM Sans", sans-serif;
        font-size: 28px;
        font-weight: 700;
        line-height: 1.3;
    }

    .va-reply {
        margin: 0;
        font-size: 18px;
        color: #e3c9d9;

        &.is-thinking { opacity: 0.7; }
    }

    .va-notice {
        margin: 0;
        font-size: 15px;
        color: #f5b3c6;
    }

    .va-choices,
    .va-suggestions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
        margin-top: 6px;

        button {
            display: inline-flex;
            align-items: baseline;
            gap: 8px;
            padding: 10px 18px;
            border: 1px solid rgba(255, 255, 255, 0.22);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.06);
            color: inherit;
            font-size: 15px;
            cursor: pointer;

            &:hover { background: rgba(255, 255, 255, 0.14); }

            span {
                font-size: 13px;
                opacity: 0.65;
            }
        }
    }

    .voice-wave {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 17px;
        width: min(1260px, 100%);
        height: 260px;
        margin: 8px 0 20px;

        span {
            flex: 0 1 13px;
            min-width: 3px;
            height: 100%;
            border-radius: 2px;
            background: #d9d9d9;
            transform: scaleY(0.04);
            transform-origin: center;
            will-change: transform;
        }
    }

    .va-type {
        flex: none;
        display: flex;
        gap: 8px;
        width: min(520px, 100%);

        input {
            flex: 1;
            min-width: 0;
            padding: 12px 18px;
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.07);
            color: inherit;
            font-size: 15px;

            &::placeholder { color: rgba(246, 236, 242, 0.5); }
            &:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
        }

        button {
            padding: 0 20px;
            border: none;
            border-radius: 999px;
            background: var(--accent);
            color: var(--on-premium);
            font-weight: 700;
            cursor: pointer;

            &:disabled { opacity: 0.5; cursor: default; }
        }
    }

    @media (max-width: 900px) {
        padding-top: 32px;

        .va-logo { width: 64px; height: 64px; }
        .va-mic svg { width: 80px; height: 80px; }
        .va-heard { font-size: 22px; }

        .voice-wave {
            gap: 3px;
            height: 140px;

            span { flex: 1 1 0; }
        }
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;

        .va-mic.is-listening { animation: none; }
    }
}

@keyframes va-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes va-pulse {
    0% { box-shadow: 0 0 0 0 rgba(232, 197, 220, 0.35); }
    100% { box-shadow: 0 0 0 28px rgba(232, 197, 220, 0); }
}
```

- [ ] **Step 7: Token màu** — trong `emotune-frontend/src/index.css`, khối `:root`, thêm sau `--on-premium: #27003c;`:
```css
  --assistant-bg: #261925;
```

- [ ] **Step 8: Header mở trợ lý** — `emotune-frontend/src/components/Header.jsx`:

Thêm import:
```js
import { useAIAssistant } from '../contexts/aiAssistantStore'
```
Trong component, sau `const navigate = useNavigate()`:
```js
    const { openAssistant } = useAIAssistant()
```
Thay khối nút AI:
```jsx
                {/* bieu tuong AI: tro ly giong noi (phan 2, chua lam) */}
                <button className="ai-btn" title="Voice assistant (coming soon)" aria-label="Voice assistant (coming soon)">
                    <AIIcon className="ai-icon" />
                </button>
```
bằng:
```jsx
                {/* bieu tuong AI: mo tro ly giong noi (H6) */}
                <button className="ai-btn" onClick={openAssistant} title="Voice assistant" aria-label="Voice assistant">
                    <AIIcon className="ai-icon" />
                </button>
```

- [ ] **Step 9: Vẽ overlay** — `emotune-frontend/src/layouts/MainLayout.jsx`:

Thêm import:
```js
import VoiceAssistant from '../components/VoiceAssistant';
import { useAIAssistant } from '../contexts/aiAssistantStore';
```
Sau `const { user } = useAuth();`:
```js
    const { isOpen: assistantOpen } = useAIAssistant();
```
Trong JSX, ngay sau `</div>` đóng `app-shell` (vẫn bên trong `PlaybackProvider`):
```jsx
            {/* tro ly giong noi: phu toan man hinh, can usePlayback + router nen nam trong PlaybackProvider */}
            {assistantOpen && <VoiceAssistant />}
```

- [ ] **Step 10: Lint + build**

Run (trong `emotune-frontend/`): `npx eslint src && npm run build`
Expected: không lỗi, không cảnh báo; build OK. Nếu eslint báo `react-hooks/set-state-in-effect` ở effect mở overlay: giữ cách gọi qua `startRef.current()` (đã dùng) — nếu vẫn báo, bọc `startRef.current()` trong `queueMicrotask(() => startRef.current())`.

---

### Task 7: Kiểm tra trọn luồng + tài liệu

**Files:**
- Modify: `TIEN_DO.md`, `CLAUDE.md`, `NOTES.md`

- [ ] **Step 1: Chạy toàn bộ kiểm tra tự động**

```bash
cd emotune-backend && npm test
cd ../emotune-frontend && npx eslint src && npm run build
```
Expected: test PASS hết; lint sạch; build OK.

- [ ] **Step 2: Chạy app** — backend `npm run dev` (:8080), frontend `npm run dev` (:5173), đăng nhập `demo`/`demo1234`.

- [ ] **Step 3: Playwright 1440 px — các luồng gõ chữ** (Playwright không có mic → dùng ô gõ). Với mỗi câu: bấm logo AI → gõ vào ô "Hoặc gõ yêu cầu…" → Gửi:
  1. "cho tôi xem ca sĩ Sơn Tùng MTP" → overlay tự đóng, URL `/artist/<id>`.
  2. "phát bài Giá Như" → thanh phát hiện *Giá Như*.
  3. "tạm dừng" → nút Play hiện lại (đang dừng). "phát tiếp" → đang phát. "bài tiếp" → bài khác.
  4. "hôm nay mình không vui lắm" → `/now-playing`, header "Mood: Sad".
  5. "mở trang thống kê" → `/stats`.
  6. Chưa phát bài nào (tải lại trang, chưa chọn bài) → "bài tiếp" → câu "Chưa có bài nào đang phát." và overlay vẫn mở.
  7. "nay sếp mắng, chẳng muốn làm gì" → không key: "Mình chưa hiểu…" và overlay vẫn mở; có key: hành động hợp lý.
  8. Esc → overlay đóng, âm lượng nhạc trở lại như trước.
  9. Trùng tên: tạm đổi tên 1 playlist thành "Sơn Tùng M-TP" (trang playlist) → gõ "xem Sơn Tùng M-TP" → hiện 2 nút chọn → bấm nút → mở đúng trang; đổi lại tên playlist.

- [ ] **Step 4: Review Focus 1 — lượt chồng nhau**: gõ "mở trang thống kê" rồi **ngay lập tức** (trước 1.5 s) gõ "bài tiếp" → overlay không bị đóng giữa chừng bởi lượt 1; lượt 2 trả lời bình thường.

- [ ] **Step 5: Playwright 390 px** — mở trợ lý: không tràn ngang (`document.documentElement.scrollWidth <= 390`), sóng còn vạch, ô gõ dùng được.

- [ ] **Step 6: Nhờ người dùng thử nói thật trên Chrome** (cho phép micro): "phát nhạc Sơn Tùng", "bài tiếp", "mình buồn quá", "cho tôi xem ca sĩ Taylor Swift". Ghi lại câu nào nhận sai.

- [ ] **Step 7: Cập nhật tài liệu**
  - `TIEN_DO.md`: H6 → ✅ + ngày + tóm tắt; "📍 Đang ở đâu"; bảng tổng quan H 12/12; dòng nhật ký hoàn thành; C11 ghi "một phần: cảm xúc từ câu nói (luật + LLM)".
  - `CLAUDE.md`: mô tả `POST /assistant` (luật `assistantRules` + Haiku 5.5 dự phòng, `ANTHROPIC_API_KEY`), `VoiceAssistant` / `utils/speech.js` / `control(command)` trong `PlaybackProvider`; test backend thêm `assistantRules`.
  - `NOTES.md`: phiên mới theo mẫu (mục tiêu, việc đã làm + file, quyết định + lý do, lệnh, lỗi/việc dở, bước tiếp).

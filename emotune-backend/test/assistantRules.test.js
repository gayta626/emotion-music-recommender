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

// loi dan noi TRUOC khi phat (tro ly dong man hinh roi moi phat) -> "Minh se phat ...", khong phai "Dang phat"
test("loi dan khi phat: noi ten bai + ca si, thi tuong lai", () => {
    assert.strictEqual(parseCommand("phát bài Giá Như", catalog).reply, "Mình sẽ phát bài “Giá Như” của Noo Phước Thịnh nhé.");
    assert.strictEqual(parseCommand("mở nhạc của Taylor Swift", catalog).reply, "Mình sẽ phát nhạc của Taylor Swift nhé.");
    assert.strictEqual(parseCommand("phát playlist nhạc buồn", catalog).reply, "Mình sẽ phát playlist “Nhạc Buồn” nhé.");
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

// fixture mo rong (fix round 1): ten bai trung cum lenh ("Tiep Tuc Yeu", "Lon Len") va ca si "Ha Anh"
// tach rieng de khong doi ket qua cua cac test tren
const extended = {
    songs: [
        ...catalog.songs,
        { id: 50, title: "Tiếp Tục Yêu", artist: "Sơn Tùng M-TP", artist_id: 4, file_path: "tiep_tuc_yeu.mp3", emotion: "happy" },
        { id: 51, title: "Lớn Lên", artist: "RPT MCK", artist_id: 11, file_path: "lon_len.mp3", emotion: "happy" },
    ],
    artists: [...catalog.artists, { id: 60, name: "Hà Anh" }],
    playlists: catalog.playlists,
};

const actX = (text) => parseCommand(text, extended).action;

test("ten bai trung cum lenh: 'phat bai Tiep Tuc Yeu' -> phat bai 50 (khong phai 'bai tiep')", () => {
    const r = actX("phát bài Tiếp Tục Yêu");
    assert.strictEqual(r.type, "play");
    assert.strictEqual(r.kind, "song");
    assert.strictEqual(r.song.id, 50);
    assert.deepStrictEqual(actX("bài tiếp đi"), { type: "control", command: "next" });
});

test("ten bai trung cum lenh: 'phat bai Lon Len' -> phat bai 51 (khong phai 'lon len' am luong)", () => {
    const r = actX("phát bài Lớn Lên");
    assert.strictEqual(r.type, "play");
    assert.strictEqual(r.kind, "song");
    assert.strictEqual(r.song.id, 51);
    assert.deepStrictEqual(actX("to lên chút"), { type: "control", command: "volume_up" });
});

test("ten ca si ghep khong lien tu ('nha anh' != 'Ha Anh') -> khong khop", () => {
    assert.deepStrictEqual(actX("tôi muốn nghe nhà anh hát"), { type: "unknown" });
});

test("ghep ten van dung khi dung cum tu lien tiep (sau fix round 1)", () => {
    assert.strictEqual(actX("Sơn Tùng MTP").kind, "artist");
    assert.deepStrictEqual(parseCommand("nghe hiếu thứ hai", extended).action, { type: "navigate", path: "/artist/6" });
});

// ===== Task 2: cam xuc (co phu dinh) + tra loi cau hoi lai =====
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

test("cau ngan co 'tam trang' + cam xuc -> cam xuc, khong phai trang thong ke", () => {
    assert.deepStrictEqual(act("tôi tâm trạng buồn"), { type: "mood", emotion: "sad" });
    assert.deepStrictEqual(act("mở trang tâm trạng"), { type: "navigate", path: "/stats" });
    assert.deepStrictEqual(act("lời bài hát"), { type: "navigate", path: "/lyrics" });
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

// ===== Final fix wave (F1-F5): danh muc giong seed that (db/setup.sql) + playlist ten la tu cam xuc =====
const seedArtists = ["Phạm Hoài Nam", "Lân Nhã", "Lệ Quyên", "Sơn Tùng M-TP", "Obito", "HIEUTHUHAI",
    "Noo Phước Thịnh", "GUrbane", "Taylor Swift", "Da LAB", "RPT MCK"].map((name, i) => ({ id: i + 1, name }));
const seedSongs = [
    [1, "Có Chắc Yêu Là Đây", 4], [2, "Muộn Rồi Mà Sao Còn", 4], [3, "Giá Như", 7], [4, "Khó Giữ Chân Thành", 8],
    [5, "Meditation", null], [6, "Reduce Stress", null], [7, "Blank Space", 9], [8, "CILU", 10],
    [9, "Giấc Mơ Có Thật", 3], [10, "Nếu Như Ta Chẳng Còn (feat. A$AP Ướt Mi)", 11],
].map(([id, title, artistId]) => ({
    id, title, artist_id: artistId, artist: artistId ? seedArtists[artistId - 1].name : null,
}));
const seed = {
    songs: seedSongs,
    artists: seedArtists,
    playlists: [
        { id: 1, name: "My Playlist", songCount: 0 },
        { id: 2, name: "Nhạc Buồn", songCount: 2 },
        { id: 3, name: "Buồn", songCount: 1 },
    ],
};
const actS = (text) => parseCommand(text, seed).action;

test("F1: ten ghep tu cac chu thong dung roi rac khong duoc tinh la khop ten", () => {
    assert.deepStrictEqual(actS("phát tiếp lần nữa nha"), { type: "control", command: "resume" });
    assert.deepStrictEqual(actS("phát lại lần nữa nha"), { type: "control", command: "resume" });
    assert.notStrictEqual(actS("giờ mình muốn nghe gì đó vui, sao còn buồn").type, "play");
    assert.notStrictEqual(actS("nếu như chẳng còn buồn thì nghe nhạc vui").type, "play");
    assert.notStrictEqual(actS("mở bài nào có chắc là hay").type, "play");
});

test("F1: ten 1 chu va ten thieu chu van khop", () => {
    assert.deepStrictEqual(actS("nghe Obito"), { type: "navigate", path: "/artist/5" });
    const a = actS("phát nhạc Sơn Tùng");
    assert.strictEqual(a.kind, "artist");
    assert.strictEqual(a.queue.name, "Sơn Tùng M-TP");
});

test("F2: 'trang' trong 'tam trang' khong phai dong tu mo trang; cam xuc thang ten playlist la tu cam xuc", () => {
    for (const text of ["tâm trạng mình buồn, nghe nhạc đi", "tâm trạng buồn quá muốn nghe nhạc", "mình buồn", "mình buồn quá, bật nhạc đi"]) {
        assert.deepStrictEqual(actS(text), { type: "mood", emotion: "sad" }, text);
    }
    assert.deepStrictEqual(actS("phát playlist nhạc buồn"), { type: "play", kind: "playlist", playlistId: 2 });
    assert.deepStrictEqual(actS("mở trang tâm trạng"), { type: "navigate", path: "/stats" });
    const a = actS("tâm trạng chán quá, phát nhạc Taylor Swift");
    assert.strictEqual(a.type, "play");
    assert.strictEqual(a.kind, "artist");
});

test("F3: cum dieu khien thuong dung", () => {
    assert.deepStrictEqual(actS("tắt nhạc"), { type: "control", command: "pause" });
    assert.deepStrictEqual(actS("thôi đừng phát nữa"), { type: "control", command: "pause" });
    assert.deepStrictEqual(actS("đừng phát nữa"), { type: "control", command: "pause" });
    assert.deepStrictEqual(actS("bật tiếng"), { type: "control", command: "volume_up" });
    assert.deepStrictEqual(actS("mở tiếng"), { type: "control", command: "volume_up" });
    for (const text of ["bật nhạc", "bật nhạc lên", "phát nhạc", "mở nhạc", "phát nhạc đi"]) {
        assert.deepStrictEqual(actS(text), { type: "control", command: "resume" }, text);
    }
    assert.strictEqual(actS("phát nhạc Sơn Tùng").kind, "artist");
    assert.strictEqual(actS("mở nhạc của Taylor Swift").kind, "artist");
});

test("F4: them cum cam xuc, 'tuc'/'chan' le van khong bi hieu nham", () => {
    assert.deepStrictEqual(actS("mình tức"), { type: "mood", emotion: "angry" });
    assert.deepStrictEqual(actS("hơi chán"), { type: "mood", emotion: "sad" });
    assert.deepStrictEqual(actS("tiếp tục đi"), { type: "control", command: "resume" });
});

test("F5: playlist rong -> mo trang playlist thay vi bao dang phat", () => {
    const r = parseCommand("phát playlist My Playlist", seed);
    assert.deepStrictEqual(r.action, { type: "navigate", path: "/playlist/1" });
    assert.match(r.reply, /chưa có bài/);
    const llm = rules.validateLlmAction({ type: "play", kind: "playlist", id: 1, reply: "" }, seed);
    assert.deepStrictEqual(llm.action, { type: "navigate", path: "/playlist/1" });
    // songCount khong co (fixture cu) -> van phat
    assert.deepStrictEqual(act("phát playlist My Playlist"), { type: "play", kind: "playlist", playlistId: 1 });
});

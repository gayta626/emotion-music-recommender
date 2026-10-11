// Unit test cho cac ham thuan cua import-music (scripts/lib/importMusic.js):
// lam sach ten bai / ca si tu the ID3, gop ca si viet khac nhau, doan the loai, doan vibe tu loi + ten bai.
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");

const {
    cleanTitle, primaryArtist, canonicalArtists, cleanAlbum, mapGenre, guessVibe, lyricsText,
} = require("../scripts/lib/importMusic");

test("ten bai: bo duoi ' - <ca si>' ma NCT gan vao", () => {
    assert.strictEqual(cleanTitle({ tag: "Lạ Lùng - Vũ", file: "Lạ Lùng", artist: "Vũ" }), "Lạ Lùng");
    assert.strictEqual(cleanTitle({ tag: "Nơi Này Có Anh - Sơn Tùng M-TP", file: "Nơi Này Có Anh", artist: "Sơn Tùng M-TP" }), "Nơi Này Có Anh");
});

test("ten bai: ten file giong the (khong dau) -> lay ten file (viet hoa dung hon, '_' la '?')", () => {
    assert.strictEqual(cleanTitle({ tag: "Apt.", file: "APT.", artist: "ROSÉ" }), "APT.");
    assert.strictEqual(cleanTitle({ tag: "Không Yêu Em Thì Yêu Ai?", file: "Không Yêu Em Thì Yêu Ai_", artist: "Vũ." }), "Không Yêu Em Thì Yêu Ai?");
    assert.strictEqual(cleanTitle({ tag: "Thinking Out Loud", file: "Thinking Out Loud (1)", artist: "Ed Sheeran" }), "Thinking Out Loud");
});

test("ten bai: sua chu hoa sau dau nhay (Don'T -> Don't), thieu the thi lay ten file", () => {
    assert.strictEqual(cleanTitle({ tag: "We Don'T Talk Anymore", file: "x", artist: "Charlie Puth" }), "We Don't Talk Anymore");
    assert.strictEqual(cleanTitle({ tag: null, file: "Chắc Ai Đó Sẽ Về ", artist: null }), "Chắc Ai Đó Sẽ Về");
});

test("ca si chinh: lay nguoi dau tien khi co nhieu ca si", () => {
    assert.strictEqual(primaryArtist("Vũ. & Binz"), "Vũ.");
    assert.strictEqual(primaryArtist("Justin Bieber, Ludacris"), "Justin Bieber");
    assert.strictEqual(primaryArtist("Mark Ronson feat. Bruno Mars"), "Mark Ronson");
    assert.strictEqual(primaryArtist("Ha Nhi x A.C Xuan Tai"), "Ha Nhi");
    assert.strictEqual(primaryArtist("Sơn Tùng (M-TP)"), "Sơn Tùng (M-TP)");
    assert.strictEqual(primaryArtist(null), null);
});

test("gop ca si: trung ten trong DB thi dung ten DB; khong thi lay cach viet pho bien nhat, uu tien co dau", () => {
    const map = canonicalArtists(
        ["Sơn Tùng (M-TP)", "Vũ.", "Vũ.", "Vũ", "VU", "Ha Nhi", "Hà Nhi"],
        ["Sơn Tùng M-TP", "RPT MCK"],
    );
    assert.strictEqual(map.get("Sơn Tùng (M-TP)"), "Sơn Tùng M-TP");
    assert.strictEqual(map.get("VU"), "Vũ.");
    assert.strictEqual(map.get("Vũ"), "Vũ.");
    assert.strictEqual(map.get("Ha Nhi"), "Hà Nhi");
});

test("album: 'NhacCuaTui.com' khong phai album that", () => {
    assert.strictEqual(cleanAlbum("NhacCuaTui.Com"), null);
    assert.strictEqual(cleanAlbum("Bình Yên"), "Bình Yên");
    assert.strictEqual(cleanAlbum(null), null);
});

test("the loai: the NCT -> pop / rap / ballad; khong co the thi theo ca si, roi theo vibe", () => {
    assert.strictEqual(mapGenre({ tag: "Rap Việt" }), "rap");
    assert.strictEqual(mapGenre({ tag: "R&B/Hip Hop/Rap" }), "rap");
    assert.strictEqual(mapGenre({ tag: "Âu Mỹ khác" }), "pop");
    assert.strictEqual(mapGenre({ tag: "Nhạc Trẻ", vibe: "sad" }), "ballad");
    assert.strictEqual(mapGenre({ tag: "Nhạc Trẻ", vibe: "happy" }), "pop");
    assert.strictEqual(mapGenre({ tag: null, artistGenre: "rap", vibe: "sad" }), "rap");
    assert.strictEqual(mapGenre({ tag: null, vibe: "sad" }), "ballad");
    assert.strictEqual(mapGenre({ tag: null, vibe: "neutral" }), "pop");
});

test("loi LRC: bo moc thoi gian", () => {
    assert.strictEqual(lyricsText("[00:12.30]Anh khóc\n[00:15.00]Em cười"), "Anh khóc\nEm cười");
    assert.strictEqual(lyricsText(null), "");
});

test("vibe: loi nhieu tu buon -> sad, co ghi tu khoa lam bang chung", () => {
    const v = guessVibe({ title: "Phôi Pha", lyrics: "Nước mắt rơi, anh cô đơn một mình\nNỗi đau chia tay, anh khóc\nAnh khóc trong mưa" });
    assert.strictEqual(v.vibe, "sad");
    assert.strictEqual(v.source, "lyrics");
    assert.ok(v.evidence.includes("khóc"));
});

test("vibe: dem toi da 3 lan moi tu (diep khuc lap lai khong lan at)", () => {
    const chorus = Array(20).fill("dance dance party").join("\n");
    const v = guessVibe({ title: "x", lyrics: chorus + "\nI cry, tears, lonely, alone, goodbye" });
    // happy: dance 3 + party 3 = 6 > sad 5
    assert.strictEqual(v.vibe, "happy");
});

test("vibe: ten bai nang gap 3 (Summertime Sadness)", () => {
    const v = guessVibe({ title: "Summertime Sadness", lyrics: "" });
    assert.strictEqual(v.vibe, "sad");
    assert.strictEqual(v.source, "title");
});

test("vibe: tu manh + ten bai thang tu yeu lap lai (Summertime Sadness ra sad du loi co dancing, kiss)", () => {
    const lyrics = "Kiss me hard before you go\nSummertime sadness\nI'm feelin' electric tonight\nDancing, dancing, kiss, kiss, baby\nI'm happy";
    assert.strictEqual(guessVibe({ title: "Summertime Sadness", lyrics }).vibe, "sad");
    assert.strictEqual(guessVibe({ title: "Chiều Nay Không Có Em", lyrics: "" }).vibe, "sad");
});

test("vibe: tu chui -> angry; tu 'cuoi' khong nham voi 'cuoi cung'", () => {
    assert.strictEqual(guessVibe({ title: "IDK", lyrics: "fuck that, I hate you, damn\nghét" }).vibe, "angry");
    const v = guessVibe({ title: "Lời Cuối Cho Em", lyrics: "lời cuối cho em, anh khóc" });
    assert.strictEqual(v.vibe, "sad");
});

test("vibe: qua it bang chung -> neutral + can xem lai", () => {
    const v = guessVibe({ title: "Wtf Bby I'm Lit", lyrics: "" });
    assert.strictEqual(v.vibe, "neutral");
    assert.strictEqual(v.source, "default");
    assert.strictEqual(v.review, true);
});

// Ham thuan cua trang admin quan ly: luat doi quyen / khoa / xoa tai khoan, mat khau tam, gom du lieu 1 nguoi, form bai hat.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
    checkUserAction, makeTempPassword, groupPlaylists, summarizeMoods, TEMP_ALPHABET,
} = require("../src/services/adminUserService");
const {
    parseYoutubeId, validateSongFields, uniqueBase, findDuplicate, artistGenreOf,
} = require("../src/services/adminLibraryService");

const ADMIN_ID = 1;
const user = { id: 2, role: "user" };
const otherAdmin = { id: 3, role: "admin" };
const me = { id: ADMIN_ID, role: "admin" };

test("checkUserAction: khong co tai khoan -> 404", () => {
    assert.equal(checkUserAction(ADMIN_ID, undefined, "role").status, 404);
});

test("checkUserAction: khong tu doi quyen / khoa / xoa chinh minh, nhung duoc dat lai mat khau", () => {
    for (const a of ["role", "lock", "delete"]) assert.equal(checkUserAction(ADMIN_ID, me, a).status, 409, a);
    assert.equal(checkUserAction(ADMIN_ID, me, "reset"), null);
});

test("checkUserAction: admin khac phai go quyen truoc khi khoa / xoa; doi quyen thi duoc", () => {
    assert.equal(checkUserAction(ADMIN_ID, otherAdmin, "lock").status, 409);
    assert.equal(checkUserAction(ADMIN_ID, otherAdmin, "delete").status, 409);
    assert.equal(checkUserAction(ADMIN_ID, otherAdmin, "role"), null);
});

test("checkUserAction: nguoi dung thuong -> moi thao tac deu duoc", () => {
    for (const a of ["role", "lock", "unlock", "reset", "delete"]) assert.equal(checkUserAction(ADMIN_ID, user, a), null, a);
});

test("makeTempPassword: 10 ky tu, chi dung bang chu khong de nham, moi lan khac nhau", () => {
    const a = makeTempPassword();
    assert.equal(a.length, 10);
    assert.ok([...a].every((c) => TEMP_ALPHABET.includes(c)));
    assert.ok(!/[01lIO]/.test(TEMP_ALPHABET));
    assert.notEqual(a, makeTempPassword());
});

test("groupPlaylists: gom bai theo playlist, playlist rong van giu", () => {
    const rows = [
        { id: 1, name: "Chill", created_at: "t1", song_id: 5, title: "A", artist: "X" },
        { id: 1, name: "Chill", created_at: "t1", song_id: 6, title: "B", artist: null },
        { id: 2, name: "Empty", created_at: "t2", song_id: null, title: null, artist: null },
    ];
    assert.deepEqual(groupPlaylists(rows), [
        { id: 1, name: "Chill", createdAt: "t1", songs: [{ id: 5, title: "A", artist: "X" }, { id: 6, title: "B", artist: null }] },
        { id: 2, name: "Empty", createdAt: "t2", songs: [] },
    ]);
});

test("summarizeMoods: dem lan quet theo cam xuc + ket qua nghe + ti le nghe het", () => {
    const s = summarizeMoods([
        { emotion: "sad", action: "suggested", count: 3 },
        { emotion: "happy", action: "suggested", count: 1 },
        { emotion: "sad", action: "good", count: 2 },
        { emotion: "sad", action: "declined", count: 2 },
    ]);
    assert.equal(s.scans, 4);
    assert.deepEqual(s.scansByEmotion, { sad: 3, happy: 1 });
    assert.equal(s.listens, 4);
    assert.equal(s.completion, 0.5);
    assert.equal(summarizeMoods([]).completion, null);
});

test("parseYoutubeId: nhan id hoac link, rong -> null, sai -> undefined", () => {
    assert.equal(parseYoutubeId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(parseYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"), "dQw4w9WgXcQ");
    assert.equal(parseYoutubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(parseYoutubeId(" "), null);
    assert.equal(parseYoutubeId("https://vimeo.com/123"), undefined);
});

test("validateSongFields: them bai can ten + vibe; energy trong -> muc mac dinh theo vibe; the loai viet thuong", () => {
    assert.match(validateSongFields({ emotion: "sad" }).error, /Title/);
    assert.match(validateSongFields({ title: "A", emotion: "buon" }).error, /Vibe/);
    const { fields } = validateSongFields({ title: "  Giá Như ", emotion: "sad", artist: " Noo Phước Thịnh ", genre: "Ballad", energy: "", album: "", youtube_id: "" });
    assert.deepEqual(fields, { title: "Giá Như", emotion: "sad", artist: "Noo Phước Thịnh", genre: "ballad", energy: 0.3, album: null, youtube_id: null });
    assert.equal(validateSongFields({ title: "A", emotion: "sad", artist: "", genre: "" }).fields.artist, null);
});

test("validateSongFields: sua bai chi lay truong co gui; so sai bi tu choi", () => {
    assert.deepEqual(validateSongFields({ album: "X" }, { partial: true }).fields, { album: "X" });
    assert.match(validateSongFields({ energy: "1.5" }, { partial: true }).error, /Energy/);
    assert.match(validateSongFields({ genre: "x".repeat(31) }, { partial: true }).error, /Genre/);
    assert.match(validateSongFields({ title: "" }, { partial: true }).error, /Title/);
});

test("findDuplicate: trung ten bai + ca si khong phan biet dau / hoa thuong, bo qua chinh bai dang sua", () => {
    const rows = [{ id: 3, title: "Giá Như", artist: "Noo Phước Thịnh" }, { id: 4, title: "Lạ Lùng", artist: null }];
    assert.equal(findDuplicate(rows, "gia nhu", "NOO PHUOC THINH").id, 3);
    assert.equal(findDuplicate(rows, "Giá Như", "Noo Phước Thịnh", 3), null);
    assert.equal(findDuplicate(rows, "Giá Như", "Vũ"), null);
    assert.equal(findDuplicate(rows, "La Lung", "").id, 4);
});

test("artistGenreOf: the loai nhieu nhat cua ca si, khong co -> null", () => {
    const rows = [
        { artist: "Vũ.", genre: "ballad" }, { artist: "vu", genre: "ballad" }, { artist: "Vũ.", genre: "pop" },
        { artist: "Obito", genre: "rap" },
    ];
    assert.equal(artistGenreOf(rows, "Vu"), "ballad");
    assert.equal(artistGenreOf(rows, "Đen"), null);
    assert.equal(artistGenreOf(rows, null), null);
});

test("uniqueBase: ten khong dau, trung thi them ca si roi so", () => {
    assert.equal(uniqueBase("Giá Như", "Noo", new Set()), "gia_nhu");
    assert.equal(uniqueBase("Giá Như", "Noo", new Set(["gia_nhu.mp3"])), "gia_nhu_noo");
    assert.equal(uniqueBase("Giá Như", "", new Set(["gia_nhu.mp3"])), "gia_nhu_2");
    assert.equal(uniqueBase("!!!", "", new Set()), "bai_hat");
});

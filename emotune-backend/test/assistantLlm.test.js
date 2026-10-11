// Unit test phan ghep yeu cau gui Gemini (src/services/assistantLlm.js -> buildRequest, ham thuan, khong goi mang)
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");

const { buildRequest } = require("../src/services/assistantLlm");

const catalog = {
    songs: [
        { id: 3, title: "Giá Như", artist: "Noo Phước Thịnh", emotion: "sad", genre: "ballad", youtube_id: "" },
        { id: 46, title: "Perfect", artist: "Ed Sheeran", emotion: "happy", genre: "pop", youtube_id: "2Vv-BfVoq4g" },
    ],
    artists: [{ id: 7, name: "Noo Phước Thịnh" }],
    playlists: [],
};

test("kho nhac nam trong system instruction, moi bai co vibe + the loai + co MV", () => {
    const { system } = buildRequest("nhạc cho tối mưa", catalog);
    assert.strictEqual(typeof system, "string");
    assert.match(system, /\[3\] Giá Như — Noo Phước Thịnh · sad · ballad\n/);
    assert.match(system, /\[46\] Perfect — Ed Sheeran · happy · pop · có MV/);
    assert.match(system, /Playlist:\n\(chưa có\)/);
});

test("phan thay doi moi cau (bai dang phat, cam xuc, lich su, cau noi) nam trong input", () => {
    const history = [{ role: "user", text: "bài này của ai?" }, { role: "assistant", text: "Bài Perfect của Ed Sheeran." }];
    const { system, input } = buildRequest("còn bài nào khác của họ không", catalog, { nowPlaying: catalog.songs[1], mood: "sad" }, history);
    assert.match(input, /Đang phát: \[46\] Perfect — Ed Sheeran/);
    assert.match(input, /Cảm xúc quét gần nhất: sad/);
    assert.match(input, /Người dùng: bài này của ai\?\nTrợ lý: Bài Perfect của Ed Sheeran\./);
    assert.match(input, /Câu nói: "còn bài nào khác của họ không"$/);
    // system khong doi theo cau hoi -> Gemini cache duoc phan nay
    assert.strictEqual(system, buildRequest("câu khác hẳn", catalog).system);
});

test("chua phat bai / chua quet / khong co lich su", () => {
    const { input } = buildRequest("chào", catalog);
    assert.match(input, /Đang phát: không có bài nào/);
    assert.match(input, /Cảm xúc quét gần nhất: chưa quét/);
    assert.doesNotMatch(input, /Hội thoại trước/);
});

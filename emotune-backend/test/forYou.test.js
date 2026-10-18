// Unit test cho rankForYou (src/services/songService.js): muc "Made for you" tren trang chu
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");

const { rankForYou } = require("../src/services/songService");

// pg tra SUM/CASE dang chuoi -> du lieu thu cung de chuoi cho giong that
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

test("bai da ♥ duoc cong like_bonus (+1), cot noi bo khong lo ra", () => {
    const liked = { ...row(1, 0, 0), like_bonus: "1" };
    const out = rankForYou([liked, row(2, 0.5, 0)], 10);
    assert.deepStrictEqual(out.map((s) => s.id), [1, 2]);
    assert.strictEqual(out[0].score, 1);
    assert.strictEqual(out[0].like_bonus, undefined);
});

test("dong khong co like_bonus (du lieu cu) van tinh duoc", () => {
    assert.strictEqual(rankForYou([row(1, 1, 0.5)], 10)[0].score, 1.5);
});

// C13 kNN: lang gieng (nguoi co gu giong) thich bai -> cong toi da KNN_WEIGHT (0.5)
const knnOf = (songValues) => ({
    neighbors: [{ userId: 2, sim: 0.9 }],
    vectors: new Map([[2, new Map(Object.entries(songValues))]]),
});

test("bai lang gieng thich duoc cong diem kNN", () => {
    const out = rankForYou([row(1, 0.3, 0), row(2, 0, 0)], 10, knnOf({ s2: 2 }));
    assert.deepStrictEqual(out.map((s) => s.id), [2, 1]);
    assert.strictEqual(out[0].score, 0.5);
});

test("kNN khong vuot qua 1 lan tu nghe het bai (hanh vi cua chinh minh quyet dinh)", () => {
    const out = rankForYou([row(1, 1, 0), row(2, 0, 0)], 10, knnOf({ s2: 5 }));
    assert.deepStrictEqual(out.map((s) => s.id), [1, 2]);
});

test("khong co lang gieng / khong truyen kNN -> nhu cu", () => {
    const rows = [row(1, 1, 0), row(2, 0, 0.5)];
    assert.deepStrictEqual(rankForYou(rows, 10, { neighbors: [], vectors: new Map() }), rankForYou(rows, 10));
});

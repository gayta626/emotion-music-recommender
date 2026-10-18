const test = require("node:test");
const assert = require("node:assert");
const k = require("../src/services/similarUsers");

// 4 nguoi: 1 va 2 cung thich bai 10, 11 + cung chon ca si 3; 3 thich bai khac han; 4 ghet bai 10
const rows = [
    { user_id: 1, key: "s10", value: 3 }, { user_id: 1, key: "s11", value: 1 }, { user_id: 1, key: "a3", value: 1 },
    { user_id: 2, key: "s10", value: 2 }, { user_id: 2, key: "s11", value: 2 }, { user_id: 2, key: "a3", value: 1 },
    { user_id: 2, key: "s12", value: 4 },
    { user_id: 3, key: "s20", value: 5 }, { user_id: 3, key: "g1", value: 1 },
    { user_id: 4, key: "s10", value: -2 }, { user_id: 4, key: "s12", value: 1 },
];

test("buildVectors: cong cac dong cung key (diem nghe + ♥ cung 1 bai)", () => {
    const v = k.buildVectors([{ user_id: 1, key: "s5", value: 2 }, { user_id: "1", key: "s5", value: 1 }]);
    assert.strictEqual(v.get(1).get("s5"), 3);
});

test("cosine: giong het = 1, khong chung gi = 0, nguoc nhau = -1, vector rong = 0", () => {
    const a = new Map([["s1", 1], ["s2", 2]]);
    assert.strictEqual(Math.round(k.cosine(a, new Map([["s1", 2], ["s2", 4]])) * 1000) / 1000, 1);
    assert.strictEqual(k.cosine(a, new Map([["s9", 1]])), 0);
    assert.strictEqual(Math.round(k.cosine(a, new Map([["s1", -1], ["s2", -2]])) * 1000) / 1000, -1);
    assert.strictEqual(k.cosine(a, new Map()), 0);
});

test("nearestNeighbors: nguoi giong nhat truoc, bo chinh minh, bo nguoi do giong < MIN_SIM (ke ca am)", () => {
    const vectors = k.buildVectors(rows);
    const n = k.nearestNeighbors(1, vectors);
    assert.deepStrictEqual(n.map((x) => x.userId), [2]);   // 3: khong chung gi; 4: ghet bai 1 thich -> am
    assert.ok(n[0].sim > 0.5);
    assert.deepStrictEqual(k.nearestNeighbors(99, vectors), []);   // nguoi chua co du lieu
});

test("nearestNeighbors: lay toi da K nguoi", () => {
    const many = [{ user_id: 1, key: "s1", value: 1 }];
    for (let u = 2; u <= 8; u++) many.push({ user_id: u, key: "s1", value: u });
    assert.strictEqual(k.nearestNeighbors(1, k.buildVectors(many)).length, k.K);
});

test("neighborSupport: chi bai lang gieng thich (diem > 0) moi duoc cong, toi da KNN_WEIGHT", () => {
    const vectors = k.buildVectors(rows);
    const ctx = { neighbors: k.nearestNeighbors(1, vectors), vectors };
    const s12 = k.neighborSupport(12, ctx);
    assert.strictEqual(s12.fans, 1);
    assert.strictEqual(s12.bonus, k.KNN_WEIGHT);       // nguoi 2 cho bai 12 diem 4 >= STRONG_SCORE -> ung ho tron ven
    assert.deepStrictEqual(k.neighborSupport(20, ctx), { bonus: 0, fans: 0 });
    assert.deepStrictEqual(k.neighborSupport(12, null), { bonus: 0, fans: 0 });
});

test("rankSongs: bai lang gieng thich vuot len khi diem cua minh bang nhau; diem nghe that cua minh van quan trong hon", () => {
    const vectors = k.buildVectors(rows);
    const ctx = { neighbors: k.nearestNeighbors(1, vectors), vectors };
    const songs = [
        { id: 30, score: 0, taste_bonus: 0, like_bonus: 0 },
        { id: 12, score: 0, taste_bonus: 0, like_bonus: 0 },
        { id: 31, score: 1, taste_bonus: 0, like_bonus: 0 },
    ];
    const ranked = k.rankSongs(songs, ctx);
    assert.deepStrictEqual(ranked.map((s) => s.id), [31, 12, 30]);
    assert.strictEqual(ranked[1].knn_fans, 1);
    // khong co lang gieng -> giu nguyen thu tu SQL
    assert.deepStrictEqual(k.rankSongs(songs, { neighbors: [], vectors }).map((s) => s.id), [31, 30, 12]);
});

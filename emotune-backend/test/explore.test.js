const test = require("node:test");
const assert = require("node:assert");
const { rankExplore, guScore, OLDEST_POOL } = require("../src/services/exploreService");
const { explainPick } = require("../src/services/explainService");

// 1 dong ket qua getExploreSongs: heard = da tung nghe / cham diem / ♥; artist_affinity / genre_affinity = muc nguoi nay hay nghe
const row = (id, extra) => ({
    id, title: `Bai ${id}`, artist: "Ca si", genre: "pop", score: 0,
    taste_artist: 0, taste_genre: 0, taste_bonus: 0, like_bonus: 0,
    heard: false, last_played: null, artist_affinity: 0, genre_affinity: 0, ...extra,
});
const ids = (list) => list.map((s) => s.id);

test("rankExplore: bai chua tung nghe luon dung truoc, du bai da nghe hop gu hon", () => {
    const ranked = rankExplore([
        row(1, { heard: true, last_played: "2026-10-01", artist_affinity: 10, like_bonus: 1 }),
        row(2),
    ]);
    assert.deepStrictEqual(ids(ranked), [2]);
    assert.strictEqual(ranked[0].is_new, true);
});

test("rankExplore: trong bai chua nghe, ca si hay nghe xep truoc the loai hay nghe, roi moi toi bai la", () => {
    const ranked = rankExplore([
        row(1),
        row(2, { genre_affinity: 10 }),
        row(3, { artist_affinity: 3 }),
    ]);
    assert.deepStrictEqual(ids(ranked), [3, 2, 1]);
});

test("guScore: ca si nang hon the loai, co tran (nghe nhieu 1 ca si khong lan at moi thu)", () => {
    assert.strictEqual(guScore(row(1, { artist_affinity: 3 })), 1);
    assert.strictEqual(guScore(row(1, { artist_affinity: 30 })), 1);
    assert.strictEqual(guScore(row(1, { genre_affinity: 5 })), 0.5);
    assert.strictEqual(guScore(row(1, { artist_affinity: 30, genre_affinity: 50 })), 1.5);
});

test("rankExplore: khao sat gu va lang gieng kNN van duoc cong", () => {
    const ctx = { neighbors: [{ userId: 9, sim: 1 }], vectors: new Map([[9, new Map([["s2", 2]])]]) };
    const ranked = rankExplore([row(1, { taste_bonus: 0.5 }), row(2), row(3, { taste_bonus: 1 })], ctx);
    // 3: khao sat +1 · 1: khao sat +0.5 · 2: lang gieng rat thich +0.5 (bang diem thi giu thu tu cu)
    assert.deepStrictEqual(ids(ranked), [3, 1, 2]);
    assert.strictEqual(ranked.find((s) => s.id === 2).knn_fans, 1);
});

test("rankExplore: nghe het kho roi -> chon trong cac bai lau nhat chua nghe lai, van theo gu", () => {
    const rows = Array.from({ length: OLDEST_POOL + 2 }, (_, i) =>
        row(i + 1, { heard: true, last_played: `2026-10-${String(i + 1).padStart(2, "0")}` }));
    rows[0].artist_affinity = 0;
    rows[1].artist_affinity = 3; // cu thu 2, hop gu -> len dau
    rows[OLDEST_POOL + 1].artist_affinity = 30; // moi nghe gan day -> khong nam trong nhom "lau chua nghe"
    const ranked = rankExplore(rows);
    assert.strictEqual(ranked.length, OLDEST_POOL);
    assert.strictEqual(ranked[0].id, 2);
    assert.ok(!ids(ranked).includes(OLDEST_POOL + 2));
    assert.strictEqual(ranked[0].is_new, false);
});

test("explainPick che do Explore: noi bai moi + ca si / the loai hay nghe", () => {
    const pick = { ...row(1, { artist: "Sơn Tùng M-TP", genre: "pop" }), is_new: true, explore_artist: 1, explore_genre: 0.5 };
    const why = explainPick(pick, { emotion: "surprise", source: "scan", explore: true });
    assert.deepStrictEqual(why.map((r) => r.text), [
        "You look in the mood to explore",
        "New to you: you've never played it",
        "By Sơn Tùng M-TP, an artist you play often",
    ]);
    const genreOnly = explainPick({ ...pick, explore_artist: 0 }, { emotion: "surprise", source: "scan", explore: true });
    assert.strictEqual(genreOnly[2].text, "Pop is a genre you play a lot");
    const old = explainPick({ ...pick, is_new: false }, { emotion: "surprise", source: "scan", explore: true });
    assert.strictEqual(old[1].text, "You haven't played it in a long time");
});

// Che do Explore (cam xuc 'surprise'): mat ngac nhien / "muon kham pha" la 1 LENH hon la tam trang that
// -> uu tien bai nguoi nay CHUA TUNG NGHE trong CA KHO (khong loc theo vibe), nhung van xep theo gu:
// ca si / the loai nguoi nay hay nghe + khao sat gu + lang gieng kNN. Nghe het kho roi -> bai lau nhat chua nghe lai.
// rankExplore, guScore la HAM THUAN -> unit test duoc (test/explore.test.js).
const similarUsers = require("./similarUsers");

// muc "hay nghe" (tong diem nghe duong + so bai ♥ cua ca si / the loai) de coi la thich tron ven
const ARTIST_FULL = 3;
const GENRE_FULL = 5;
// the loai rong hon ca si (vai the loai cho ca kho) -> nhe hon
const GENRE_WEIGHT = 0.5;
// het bai moi: chon trong N bai lau nhat chua nghe lai
const OLDEST_POOL = 10;

// diem gu cua 1 bai: ca si hay nghe (toi da 1) + the loai hay nghe (toi da 0.5)
const guParts = (s) => ({
    artist: Math.min(1, Number(s.artist_affinity || 0) / ARTIST_FULL),
    genre: GENRE_WEIGHT * Math.min(1, Number(s.genre_affinity || 0) / GENRE_FULL),
});
const guScore = (s) => {
    const { artist, genre } = guParts(s);
    return Math.round((artist + genre) * 100) / 100;
};

// rows: ket qua suggestModel.getExploreSongs (da bo 3 bai vua nghe); knn: ket qua similarUsers.loadNeighbors
// -> danh sach bai da xep (diem cao truoc), moi bai them is_new, explore_artist, explore_genre, knn_bonus, knn_fans
const rankExplore = (rows, knn) => {
    const fresh = rows.filter((s) => !s.heard);
    const pool = fresh.length
        ? fresh
        : [...rows].sort((a, b) => new Date(a.last_played || 0) - new Date(b.last_played || 0)).slice(0, OLDEST_POOL);
    return pool
        .map((s, i) => {
            const { artist, genre } = guParts(s);
            const { bonus, fans } = similarUsers.neighborSupport(s.id, knn);
            const total = artist + genre + Number(s.taste_bonus || 0) + Number(s.like_bonus || 0) + bonus;
            return { s: { ...s, is_new: !s.heard, explore_artist: artist, explore_genre: genre, knn_bonus: bonus, knn_fans: fans }, i, total };
        })
        .sort((x, y) => y.total - x.total || x.i - y.i)
        .map((x) => x.s);
};

module.exports = { ARTIST_FULL, GENRE_FULL, OLDEST_POOL, guScore, rankExplore };

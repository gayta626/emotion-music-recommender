// C13 - Goi y theo NGUOI DUNG TUONG TU (loc cong tac, thuat toan k lang gieng gan nhat - kNN, chuong 2 giao trinh).
// Moi nguoi = 1 vector "gu":
//   s<id bai>   : tong diem nghe bai do (preferences, moi cam xuc cong lai; nghe het +, bo qua -) + 1 neu da bam ♥
//   a<id ca si> : 1 neu chon ca si do o khao sat gu
//   g<id the loai>: 1 neu chon the loai do o khao sat gu
// (nguoi moi chi lam khao sat van tim duoc lang gieng nho a/g; nghe nhieu roi thi diem bai chiem phan lon vector)
// Do giong = cosine giua 2 vector. Lay K nguoi giong nhat (>= MIN_SIM) -> bai ho nghe het / thich duoc cong
// toi da KNN_WEIGHT diem khi xep hang (bang khao sat gu, nho hon 1 lan nghe that: hanh vi cua CHINH minh van quyet dinh).
// Cac ham o day la HAM THUAN -> unit test duoc; loadNeighbors (cuoi file) doc DB.

const K = 3;
const MIN_SIM = 0.1;
const KNN_WEIGHT = 0.5;
// diem bai cua lang gieng >= muc nay coi la "rat thich" (ung ho tron ven); nho hon thi ung ho 1 phan
const STRONG_SCORE = 2;

// rows: [{ user_id, key, value }] (1 key co the lap lai: diem nghe + ♥ cung bai) -> Map(userId -> Map(key -> value))
const buildVectors = (rows) => {
    const vectors = new Map();
    for (const r of rows) {
        const id = Number(r.user_id);
        if (!vectors.has(id)) vectors.set(id, new Map());
        const v = vectors.get(id);
        v.set(r.key, (v.get(r.key) || 0) + Number(r.value));
    }
    return vectors;
};

const norm = (v) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));

// cosine trong [-1, 1]; vector rong (chua co du lieu) -> 0
const cosine = (a, b) => {
    const na = norm(a);
    const nb = norm(b);
    if (!na || !nb) return 0;
    const [small, big] = a.size <= b.size ? [a, b] : [b, a];
    let dot = 0;
    for (const [k, x] of small) {
        if (big.has(k)) dot += x * big.get(k);
    }
    return dot / (na * nb);
};

// K nguoi giong nhat (khong tinh chinh minh), do giong >= minSim, giong nhat truoc
const nearestNeighbors = (userId, vectors, k = K, minSim = MIN_SIM) => {
    const me = vectors.get(Number(userId));
    if (!me) return [];
    const scored = [];
    for (const [other, v] of vectors) {
        if (other === Number(userId)) continue;
        const sim = cosine(me, v);
        if (sim >= minSim) scored.push({ userId: other, sim: Math.round(sim * 1000) / 1000 });
    }
    return scored.sort((x, y) => y.sim - x.sim || x.userId - y.userId).slice(0, k);
};

// muc lang gieng ung ho 1 bai: { bonus (0..KNN_WEIGHT), fans (so lang gieng thich bai) }
// bonus = KNN_WEIGHT x trung binh co trong so (do giong) cua muc thich cua tung lang gieng (0..1, chi tinh diem duong)
const neighborSupport = (songId, ctx) => {
    const neighbors = ctx?.neighbors || [];
    if (!neighbors.length) return { bonus: 0, fans: 0 };
    const key = `s${songId}`;
    let weighted = 0;
    let simSum = 0;
    let fans = 0;
    for (const n of neighbors) {
        const value = ctx.vectors.get(n.userId)?.get(key) || 0;
        simSum += n.sim;
        if (value > 0) {
            fans += 1;
            weighted += n.sim * Math.min(1, value / STRONG_SCORE);
        }
    }
    const bonus = simSum ? KNN_WEIGHT * (weighted / simSum) : 0;
    return { bonus: Math.round(bonus * 100) / 100, fans };
};

// tong diem 1 bai khi chon (diem nghe cua minh + khao sat gu + ♥ + lang gieng)
const totalScore = (s) => Number(s.score || 0) + Number(s.taste_bonus || 0) + Number(s.like_bonus || 0) + Number(s.knn_bonus || 0);

// songs: ket qua getSongsByEmotion (da xep theo diem cua minh) -> them knn_bonus / knn_fans roi xep lai theo tong diem.
// sort on dinh: bang diem thi giu thu tu cu
const rankSongs = (songs, ctx) => songs
    .map((s) => {
        const { bonus, fans } = neighborSupport(s.id, ctx);
        return { ...s, knn_bonus: bonus, knn_fans: fans };
    })
    .map((s, i) => ({ s, i, total: totalScore(s) }))
    .sort((x, y) => y.total - x.total || x.i - y.i)
    .map((x) => x.s);

const similarModel = require("../model/similarModel");

// doc vector cua moi nguoi tu DB + tim lang gieng cua userId -> { neighbors, vectors } (truyen vao rankSongs)
const loadNeighbors = async (userId) => {
    const vectors = buildVectors(await similarModel.getTasteRows());
    return { neighbors: nearestNeighbors(userId, vectors), vectors };
};

module.exports = {
    K, MIN_SIM, KNN_WEIGHT,
    buildVectors, cosine, nearestNeighbors, neighborSupport, totalScore, rankSongs,
    loadNeighbors,
};

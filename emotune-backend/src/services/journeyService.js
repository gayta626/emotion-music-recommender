const suggestModel = require("../model/suggestModel")
const similarUsers = require("./similarUsers")

// I4 - Hanh trinh cam xuc theo NGUYEN LY DONG DIEU (iso principle, am nhac tri lieu):
// dang buon ma bat ngay nhac qua vui thi kho chiu -> bat dau bang bai KHOP tam trang, roi chuyen dan sang tam trang muon dat.
// Chi bat khi buon/gian KEO DAI (cung dieu kien che do dong vien, decideTarget), thay cho viec nhay thang sang 1 bai vui.
const JOURNEY_STEPS = {
    sad: ["sad", "sad", "neutral", "happy", "happy"],
    // gian: 1 bai khop con gian (xa bot) roi diu xuong trung tinh, ket thuc vui
    angry: ["angry", "neutral", "neutral", "happy", "happy"],
};
const JOURNEY_TARGET = "happy";
const MIN_SONGS = 3;
// moi buoc chon ngau nhien trong 3 bai xep hang cao nhat con lai -> uu tien bai hop gu nhung khong lan nao cung y het
const TOP_PICK = 3;

// bai thieu energy (NULL) coi nhu muc giua
const energyOf = (song) => (song.energy == null ? 0.5 : Number(song.energy));

// Ham thuan (de viet unit test).
// from: cam xuc luc quet; pools: { emotion: [bai da xep hang, diem cao truoc] } (nhu getSongsByEmotion tra ve);
// rand: ham ngau nhien [0, 1) (test truyen ham co dinh).
// Tra ve mang bai theo thu tu phat, hoac [] khi khong du bai (noi goi quay ve 1 bai dong vien nhu cu).
let buildJourney = (from, pools, rand = Math.random) => {
    const steps = JOURNEY_STEPS[from];
    if (!steps) return [];

    const used = new Set();
    const picked = [];
    for (const emotion of steps) {
        const available = (pools[emotion] || []).filter((s) => !used.has(s.id));
        if (!available.length) continue;   // thieu bai o buoc nay -> bo buoc, hanh trinh ngan lai
        const song = available[Math.floor(rand() * Math.min(TOP_PICK, available.length))];
        used.add(song.id);
        picked.push(song);
    }

    if (picked.length < MIN_SONGS || picked[picked.length - 1].emotion !== JOURNEY_TARGET) return [];

    // trong cung 1 cam xuc: xep theo do soi dong de chuyen muot hon - buon / trung tinh / vui TANG dan,
    // gian GIAM dan (diu xuong). Thu tu cac cam xuc (buoc) giu nguyen.
    const order = steps.filter((e, i) => steps.indexOf(e) === i);
    return order.flatMap((emotion) => picked
        .filter((s) => s.emotion === emotion)
        .sort((a, b) => (emotion === "angry" ? energyOf(b) - energyOf(a) : energyOf(a) - energyOf(b))));
}

// lay kho bai cho tung buoc (da xep hang theo diem nghe + gu + bai da thich cua CHINH nguoi nay
// + bai nguoi co gu giong thich - C13, knn = { neighbors, vectors } cua similarUsers.loadNeighbors) roi dung hanh trinh
let createJourney = async (userId, from, knn = null) => {
    const steps = JOURNEY_STEPS[from];
    if (!steps) return [];
    const emotions = [...new Set(steps)];
    const lists = await Promise.all(emotions.map(async (e) => similarUsers.rankSongs(await suggestModel.getSongsByEmotion(userId, e), knn)));
    const pools = Object.fromEntries(emotions.map((e, i) => [e, lists[i]]));
    return buildJourney(from, pools);
}

module.exports = {
    JOURNEY_STEPS: JOURNEY_STEPS,
    JOURNEY_TARGET: JOURNEY_TARGET,
    buildJourney: buildJourney,
    createJourney: createJourney
}

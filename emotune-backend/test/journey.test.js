// Unit test cho buildJourney (src/services/journeyService.js): hanh trinh cam xuc I4 (nguyen ly dong dieu - iso principle)
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");

const { buildJourney, JOURNEY_STEPS } = require("../src/services/journeyService");

// kho gia: moi cam xuc vai bai, da xep hang san (nhu getSongsByEmotion tra ve: diem cao truoc)
const pool = (emotion, energies) => energies.map((energy, i) => ({ id: `${emotion}-${i}`, emotion, energy }));
const POOLS = {
    sad: pool("sad", [0.3, 0.2, 0.4, 0.3]),
    angry: pool("angry", [0.6, 0.9, 0.7]),
    neutral: pool("neutral", [0.5, 0.4, 0.45]),
    happy: pool("happy", [0.8, 0.6, 0.7, 0.9]),
};
// rand = 0 -> luon lay bai xep hang cao nhat con lai (de test ket qua co dinh)
const first = () => 0;

test("buon: 5 bai theo thu tu buon -> buon -> trung tinh -> vui -> vui", () => {
    const songs = buildJourney("sad", POOLS, first);
    assert.deepStrictEqual(songs.map((s) => s.emotion), JOURNEY_STEPS.sad);
    assert.deepStrictEqual(JOURNEY_STEPS.sad, ["sad", "sad", "neutral", "happy", "happy"]);
});

test("gian: bat dau bang bai gian roi diu xuong trung tinh, ket thuc vui", () => {
    const songs = buildJourney("angry", POOLS, first);
    assert.deepStrictEqual(songs.map((s) => s.emotion), ["angry", "neutral", "neutral", "happy", "happy"]);
});

test("khong lap bai trong 1 hanh trinh", () => {
    for (const from of ["sad", "angry"]) {
        const ids = buildJourney(from, POOLS, Math.random).map((s) => s.id);
        assert.strictEqual(new Set(ids).size, ids.length);
    }
});

test("trong cung 1 cam xuc: buon / trung tinh / vui xep do soi dong TANG dan, gian GIAM dan (diu xuong)", () => {
    const sad = buildJourney("sad", POOLS, first);
    const happy = sad.filter((s) => s.emotion === "happy").map((s) => s.energy);
    assert.deepStrictEqual(happy, [...happy].sort((a, b) => a - b));
    const sadPart = sad.filter((s) => s.emotion === "sad").map((s) => s.energy);
    assert.deepStrictEqual(sadPart, [...sadPart].sort((a, b) => a - b));

    const angry = buildJourney("angry", { ...POOLS, angry: pool("angry", [0.6, 0.9]) }, first);
    // chi 1 bai gian trong hanh trinh -> van dung dau
    assert.strictEqual(angry[0].emotion, "angry");
    const neutral = angry.filter((s) => s.emotion === "neutral").map((s) => s.energy);
    assert.deepStrictEqual(neutral, [...neutral].sort((a, b) => a - b));
});

test("chon trong 3 bai xep hang cao nhat (co ngau nhien nhung van uu tien bai hop gu)", () => {
    const big = { ...POOLS, happy: pool("happy", [0.6, 0.6, 0.6, 0.6, 0.6, 0.6]) };
    for (let i = 0; i < 50; i++) {
        const songs = buildJourney("sad", big, Math.random);
        for (const s of songs.filter((x) => x.emotion === "happy")) {
            // 2 bai vui: bai 1 trong top 3, bai 2 trong top 3 cua phan con lai -> chi so <= 3
            assert.ok(Number(s.id.split("-")[1]) <= 3, s.id);
        }
    }
});

test("thieu bai o 1 buoc -> bo buoc do, khong loi", () => {
    const songs = buildJourney("sad", { ...POOLS, neutral: [] }, first);
    assert.deepStrictEqual(songs.map((s) => s.emotion), ["sad", "sad", "happy", "happy"]);
});

test("khong co bai vui de ket thuc -> tra mang rong (noi goi quay ve 1 bai dong vien nhu cu)", () => {
    assert.deepStrictEqual(buildJourney("sad", { ...POOLS, happy: [] }, first), []);
});

test("qua it bai (< 3) -> tra mang rong", () => {
    const tiny = { sad: pool("sad", [0.3]), neutral: [], happy: pool("happy", [0.8]) };
    assert.deepStrictEqual(buildJourney("sad", tiny, first), []);
});

test("cam xuc khong co hanh trinh (vui, trung tinh, kham pha) -> mang rong", () => {
    assert.deepStrictEqual(buildJourney("happy", POOLS, first), []);
    assert.deepStrictEqual(buildJourney("surprise", POOLS, first), []);
});

test("bai thieu energy (NULL) van xep duoc, coi nhu 0.5", () => {
    const songs = buildJourney("sad", { ...POOLS, happy: [{ id: "h-a", emotion: "happy", energy: null }, { id: "h-b", emotion: "happy", energy: 0.9 }] }, first);
    assert.deepStrictEqual(songs.slice(-2).map((s) => s.id), ["h-a", "h-b"]);
});

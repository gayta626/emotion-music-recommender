// Unit test ham thuan trang thong ke (src/services/statsService.js)
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");

const s = require("../src/services/statsService");

const today = new Date(2026, 9, 9, 15, 0);   // 09/10/2026 15:00 gio dia phuong

test("normalizeDays: chi nhan 7 hoac 30", () => {
    assert.strictEqual(s.normalizeDays("30"), 30);
    assert.strictEqual(s.normalizeDays(30), 30);
    assert.strictEqual(s.normalizeDays("7"), 7);
    assert.strictEqual(s.normalizeDays("90"), 7);
    assert.strictEqual(s.normalizeDays(undefined), 7);
});

test("daypartOf: dung ranh gioi 5h, 11h, 17h, 22h", () => {
    assert.strictEqual(s.daypartOf(4), "night");
    assert.strictEqual(s.daypartOf(5), "morning");
    assert.strictEqual(s.daypartOf(10), "morning");
    assert.strictEqual(s.daypartOf(11), "afternoon");
    assert.strictEqual(s.daypartOf(16), "afternoon");
    assert.strictEqual(s.daypartOf(17), "evening");
    assert.strictEqual(s.daypartOf(21), "evening");
    assert.strictEqual(s.daypartOf(22), "night");
    assert.strictEqual(s.daypartOf(0), "night");
});

test("buildDaily: lap ngay trong, hom nay o cuoi, khoa ngay theo gio dia phuong", () => {
    const rows = [
        { day: "2026-10-09", emotion: "sad", count: 2 },
        { day: "2026-10-03", emotion: "happy", count: "1" },
        { day: "2026-09-01", emotion: "happy", count: 5 },   // ngoai cua so -> bo
    ];
    const daily = s.buildDaily(rows, 7, today);
    assert.strictEqual(daily.length, 7);
    assert.strictEqual(daily[0].date, "2026-10-03");
    assert.strictEqual(daily[6].date, "2026-10-09");
    assert.deepStrictEqual(daily[6].counts, { happy: 0, sad: 2, angry: 0, surprise: 0, neutral: 0 });
    assert.strictEqual(daily[0].counts.happy, 1);
    assert.strictEqual(s.buildDaily([], 30, today).length, 30);
    assert.strictEqual(s.dayKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("buildDayparts: luon du 28 o, cong dung o", () => {
    const empty = s.buildDayparts([]);
    assert.strictEqual(empty.length, 28);
    const cells = s.buildDayparts([
        { weekday: 1, hour: 20, emotion: "sad", count: 3 },
        { weekday: "1", hour: "21", emotion: "sad", count: "1" },
        { weekday: 7, hour: 23, emotion: "angry", count: 1 },
    ]);
    const mondayEvening = cells.find((c) => c.weekday === 1 && c.part === "evening");
    assert.strictEqual(mondayEvening.counts.sad, 4);
    const sundayNight = cells.find((c) => c.weekday === 7 && c.part === "night");
    assert.strictEqual(sundayNight.counts.angry, 1);
});

test("topEmotionOf: nhieu nhat, hoa theo thu tu happy, sad, angry, surprise, neutral; khong co -> null", () => {
    const daily = s.buildDaily([
        { day: "2026-10-09", emotion: "neutral", count: 2 },
        { day: "2026-10-08", emotion: "sad", count: 2 },
    ], 7, today);
    assert.strictEqual(s.topEmotionOf(daily), "sad");
    assert.strictEqual(s.topEmotionOf(s.buildDaily([], 7, today)), null);
});

test("buildHitRate: tong + theo ngay + ti le nghe het", () => {
    const hr = s.buildHitRate([
        { day: "2026-10-09", action: "good", count: 3 },
        { day: "2026-10-09", action: "bad", count: 1 },
        { day: "2026-10-08", action: "declined", count: 1 },
        { day: "2026-10-08", action: "neutral", count: "1" },
        { day: "2026-10-08", action: "suggested", count: 9 },   // khong phai luot nghe -> bo
    ], 7, today);
    assert.deepStrictEqual(hr.total, { good: 3, neutral: 1, bad: 1, declined: 1, rate: 0.5 });
    assert.strictEqual(hr.daily.length, 7);
    assert.deepStrictEqual(hr.daily[6], { date: "2026-10-09", good: 3, neutral: 0, bad: 1, declined: 0 });
    assert.strictEqual(s.buildHitRate([], 7, today).total.rate, null);
});

const song = (id, extra = {}) => ({ id, title: "s" + id, artist: "a", file_path: `s${id}.mp3`, emotion: "sad", ...extra });

test("pickMoodSongs: moi cam xuc toi da 3 bai, nhieu lan truoc", () => {
    const rows = [
        { mood: "sad", times: 1, ...song(1) },
        { mood: "sad", times: 4, ...song(2) },
        { mood: "sad", times: 2, ...song(3) },
        { mood: "sad", times: 2, ...song(4) },
        { mood: "happy", times: "5", ...song(5) },
    ];
    const out = s.pickMoodSongs(rows);
    assert.deepStrictEqual(out.sad.map((x) => x.song.id), [2, 3, 4]);
    assert.strictEqual(out.sad[0].times, 4);
    assert.strictEqual(out.happy[0].times, 5);
    assert.strictEqual(out.sad[0].song.emotion, "sad");
    assert.strictEqual(s.pickMoodSongs([{ mood: "happy", times: 2, ...song(9) }]).happy[0].song.emotion, "sad");
    assert.deepStrictEqual(out.angry, []);
    assert.strictEqual("times" in out.sad[0].song, false);
    assert.strictEqual("mood" in out.sad[0].song, false);
});

test("pickPreferences: gom theo bai, xep theo tong |diem|, bo bai toan 0, toi da 10", () => {
    const rows = [
        { mood: "sad", score: 2.3, ...song(1) },
        { mood: "happy", score: -1, ...song(1) },
        { mood: "happy", score: 0.3, ...song(2) },
        { mood: "angry", score: 0, ...song(3) },
    ];
    const out = s.pickPreferences(rows);
    assert.deepStrictEqual(out.map((x) => x.song.id), [1, 2]);
    assert.deepStrictEqual(out[0].scores, { happy: -1, sad: 2.3, angry: 0, surprise: 0, neutral: 0 });
    const many = Array.from({ length: 15 }, (_, i) => ({ mood: "happy", score: i + 1, ...song(i + 1) }));
    assert.strictEqual(s.pickPreferences(many).length, 10);
    assert.strictEqual(s.pickPreferences(many)[0].song.id, 15);
});

test("buildConfidence: lam tron 2 so, theo thu tu cam xuc, bo cam xuc khong co", () => {
    const out = s.buildConfidence([
        { emotion: "neutral", avg: 0.8234, count: 3 },
        { emotion: "happy", avg: "0.9", count: "2" },
    ]);
    assert.deepStrictEqual(out, [
        { emotion: "happy", avg: 0.9, count: 2 },
        { emotion: "neutral", avg: 0.82, count: 3 },
    ]);
});

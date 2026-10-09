// Trang thong ke /stats: cac HAM THUAN dung so lieu tu dong SQL tho (statsModel) -> unit test duoc.
// getStats (cuoi file, them o Task 2) ghep tat ca thanh 1 JSON cho GET /stats.

// thu tu "hoa" khi chon cam xuc nhieu nhat (spec)
const EMOTIONS = ["happy", "sad", "angry", "surprise", "neutral"];
// buoi trong ngay: sang 05-11h, chieu 11-17h, toi 17-22h, dem 22-05h
const PARTS = ["morning", "afternoon", "evening", "night"];
// ket qua 1 luot nghe (mood_history.action)
const OUTCOMES = ["good", "neutral", "bad", "declined"];

const emptyCounts = () => Object.fromEntries(EMOTIONS.map((e) => [e, 0]));

const normalizeDays = (raw) => (Number(raw) === 30 ? 30 : 7);

// "YYYY-MM-DD" theo GIO DIA PHUONG (khong dung toISOString: lech ngay vi UTC)
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// cac ngay tu (today - days + 1) toi today, cu nhat truoc
const dayRange = (days, today) => {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        out.push(dayKey(d));
    }
    return out;
};

const daypartOf = (hour) => (hour >= 5 && hour < 11 ? "morning"
    : hour >= 11 && hour < 17 ? "afternoon"
        : hour >= 17 && hour < 22 ? "evening" : "night");

// rows: [{ day: "YYYY-MM-DD", emotion, count }] -> moi ngay trong cua so 1 phan tu (ngay khong quet = 0)
const buildDaily = (rows, days, today) => {
    const map = Object.fromEntries(dayRange(days, today).map((k) => [k, emptyCounts()]));
    rows.forEach((r) => {
        if (map[r.day] && r.emotion in map[r.day]) map[r.day][r.emotion] += Number(r.count);
    });
    return Object.entries(map).map(([date, counts]) => ({ date, counts }));
};

// rows: [{ weekday 1..7, hour 0..23, emotion, count }] -> 28 o (7 thu x 4 buoi)
const buildDayparts = (rows) => {
    const cells = [];
    for (let weekday = 1; weekday <= 7; weekday++) {
        PARTS.forEach((part) => cells.push({ weekday, part, counts: emptyCounts() }));
    }
    rows.forEach((r) => {
        const cell = cells.find((c) => c.weekday === Number(r.weekday) && c.part === daypartOf(Number(r.hour)));
        if (cell && r.emotion in cell.counts) cell.counts[r.emotion] += Number(r.count);
    });
    return cells;
};

const topEmotionOf = (daily) => {
    let best = null;
    let bestN = 0;
    EMOTIONS.forEach((e) => {
        const n = daily.reduce((sum, d) => sum + d.counts[e], 0);
        if (n > bestN) {
            best = e;
            bestN = n;
        }
    });
    return best;
};

// rows: [{ day, action, count }] (chi luot nghe) -> tong + theo ngay; rate = good / tong luot nghe
const buildHitRate = (rows, days, today) => {
    const empty = () => Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
    const map = Object.fromEntries(dayRange(days, today).map((k) => [k, empty()]));
    const total = empty();
    rows.forEach((r) => {
        if (!OUTCOMES.includes(r.action)) return;
        const n = Number(r.count);
        total[r.action] += n;
        if (map[r.day]) map[r.day][r.action] += n;
    });
    const sum = OUTCOMES.reduce((acc, o) => acc + total[o], 0);
    return {
        total: { ...total, rate: sum ? Math.round((total.good / sum) * 100) / 100 : null },
        daily: Object.entries(map).map(([date, c]) => ({ date, ...c })),
    };
};

// rows: [{ mood, times, ...cot bai hat }] -> moi cam xuc toi da `limit` bai nghe het nhieu nhat
// (song.emotion la VIBE cua bai, giu nguyen trong cot bai hat; mood la cam xuc nguoi dung luc nghe)
const pickMoodSongs = (rows, limit = 3) => {
    const out = Object.fromEntries(EMOTIONS.map((e) => [e, []]));
    [...rows]
        .sort((a, b) => Number(b.times) - Number(a.times) || a.id - b.id)
        .forEach(({ mood, times, ...song }) => {
            if (out[mood] && out[mood].length < limit) out[mood].push({ song, times: Number(times) });
        });
    return out;
};

// rows: [{ mood, score, ...cot bai hat }] -> moi bai 1 dong diem 5 cam xuc; bai co tong |diem| lon nhat truoc
// (song.emotion la VIBE cua bai, giu nguyen trong cot bai hat; mood la cam xuc cua diem so)
const pickPreferences = (rows, limit = 10) => {
    const bySong = new Map();
    rows.forEach(({ mood, score, ...song }) => {
        if (!bySong.has(song.id)) bySong.set(song.id, { song, scores: emptyCounts() });
        const item = bySong.get(song.id);
        if (mood in item.scores) item.scores[mood] = Math.round(Number(score) * 10) / 10;
    });
    const weight = (x) => EMOTIONS.reduce((sum, e) => sum + Math.abs(x.scores[e]), 0);
    return [...bySong.values()]
        .filter((x) => weight(x) > 0)
        .sort((a, b) => weight(b) - weight(a) || a.song.id - b.song.id)
        .slice(0, limit);
};

// rows: [{ emotion, avg, count }] -> theo thu tu EMOTIONS, avg lam tron 2 so
const buildConfidence = (rows) => EMOTIONS
    .map((e) => rows.find((r) => r.emotion === e))
    .filter(Boolean)
    .map((r) => ({ emotion: r.emotion, avg: Math.round(Number(r.avg) * 100) / 100, count: Number(r.count) }));

const statsModel = require("../model/statsModel");

// Ghep moi muc cho GET /stats (spec muc 3)
const getStats = async (userId, rawDays) => {
    const days = normalizeDays(rawDays);
    const today = new Date();
    const [scanDays, scanHours, play, topSongs, topArtists, moodRows, outcomes, prefRows, confRows] = await Promise.all([
        statsModel.getScanDays(userId, days),
        statsModel.getScanHours(userId, days),
        statsModel.getPlaySummary(userId, days),
        statsModel.getTopSongs(userId, days),
        statsModel.getTopArtists(userId, days),
        statsModel.getMoodSongs(userId, days),
        statsModel.getOutcomes(userId, days),
        statsModel.getPreferences(userId),
        statsModel.getConfidence(userId, days),
    ]);
    const daily = buildDaily(scanDays, days, today);
    return {
        days,
        from: daily[0].date,
        to: daily[daily.length - 1].date,
        overview: {
            scans: daily.reduce((sum, d) => sum + EMOTIONS.reduce((n, e) => n + d.counts[e], 0), 0),
            topEmotion: topEmotionOf(daily),
            plays: Number(play.plays),
            listenSeconds: Number(play.seconds),
        },
        daily,
        dayparts: buildDayparts(scanHours),
        topSongs: topSongs.map(({ plays, ...song }) => ({ song, plays: Number(plays) })),
        topArtists: topArtists.map((a) => ({ ...a, plays: Number(a.plays) })),
        moodSongs: pickMoodSongs(moodRows),
        hitRate: buildHitRate(outcomes, days, today),
        preferences: pickPreferences(prefRows),
        confidence: buildConfidence(confRows),
    };
};

module.exports = {
    EMOTIONS, PARTS, OUTCOMES,
    normalizeDays, dayKey, daypartOf,
    buildDaily, buildDayparts, topEmotionOf, buildHitRate, pickMoodSongs, pickPreferences, buildConfidence,
    getStats,
};

// Trang thong ke /stats: cac HAM THUAN dung so lieu tu dong SQL tho (statsModel) -> unit test duoc.
// getStats (cuoi file, them o Task 2) ghep tat ca thanh 1 JSON cho GET /stats.

// thu tu "hoa" khi chon cam xuc nhieu nhat (spec)
const EMOTIONS = ["happy", "sad", "angry", "surprise", "neutral"];
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

// rows: [{ day: "YYYY-MM-DD", emotion, count }] -> moi ngay trong cua so 1 phan tu (ngay khong quet = 0)
const buildDaily = (rows, days, today) => {
    const map = Object.fromEntries(dayRange(days, today).map((k) => [k, emptyCounts()]));
    rows.forEach((r) => {
        if (map[r.day] && r.emotion in map[r.day]) map[r.day][r.emotion] += Number(r.count);
    });
    return Object.entries(map).map(([date, counts]) => ({ date, counts }));
};

// rows: [{ hour 0..23, emotion, count }] (cong don moi thu trong tuan) -> du 24 gio, gio khong quet = 0
const buildHourly = (rows) => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, counts: emptyCounts() }));
    rows.forEach((r) => {
        const h = hours[Number(r.hour)];
        if (h && r.emotion in h.counts) h.counts[r.emotion] += Number(r.count);
    });
    return hours;
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

// so lan quet gan nhat moi cam xuc gui ve de ve "canh hoa" (moi lan quet 1 canh)
const MAX_VALUES = 60;

// rows: tung lan quet camera [{ emotion, confidence }], cu truoc moi sau
// -> theo thu tu EMOTIONS: { emotion, avg (lam tron 2 so), count, values (toi da MAX_VALUES lan gan nhat) }
const buildConfidence = (rows) => EMOTIONS
    .map((e) => rows.filter((r) => r.emotion === e).map((r) => Number(r.confidence)))
    .map((list, i) => ({ emotion: EMOTIONS[i], list }))
    .filter(({ list }) => list.length)
    .map(({ emotion, list }) => ({
        emotion,
        avg: Math.round((list.reduce((sum, x) => sum + x, 0) / list.length) * 100) / 100,
        count: list.length,
        values: list.slice(-MAX_VALUES).map((x) => Math.round(x * 100) / 100),
    }));

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
        hourly: buildHourly(scanHours),
        topSongs: topSongs.map(({ plays, ...song }) => ({ song, plays: Number(plays) })),
        topArtists: topArtists.map((a) => ({ ...a, plays: Number(a.plays) })),
        moodSongs: pickMoodSongs(moodRows),
        hitRate: buildHitRate(outcomes, days, today),
        preferences: pickPreferences(prefRows),
        confidence: buildConfidence(confRows),
    };
};

module.exports = {
    EMOTIONS, OUTCOMES,
    normalizeDays, dayKey,
    buildDaily, buildHourly, topEmotionOf, buildHitRate, pickMoodSongs, pickPreferences, buildConfidence,
    getStats,
};

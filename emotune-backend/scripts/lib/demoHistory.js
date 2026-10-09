// Sinh 30 ngay lich su MAU (hop ly, khong bua ngau nhien) cho lenh npm run seed-demo.
// HAM THUAN: khong dong DB -> unit test duoc. Du lieu mau chi de minh hoa trang thong ke, KHONG phai nguoi dung that.
//
// Moi ngay 1-4 lan quet, gio quet theo "kieu cam xuc" tung nguoi (de luoi theo buoi hien quy luat).
// ~70% lan quet coi nhu quet camera -> co do tu tin, bam so do that cua model (angry thap ~0.5).
// Ket qua nghe: ti le nghe het tang dan ~40% -> ~75% trong 30 ngay (he thong hoc dan), bai hop gu de nghe het hon.
// Diem so thich tinh lai bang DUNG LUAT cua he thong tren cac luot vua sinh.

const RULES = { good: 1, neutral: 0.3, bad: -1, declined: -1 };
const PARTS = ["morning", "afternoon", "evening", "night"];
// gio co the quet trong moi buoi (khop ranh gioi buoi o statsService: gio 0-4 cung la night)
// night co 0-1h sang de co lan quet sau nua dem (day la gio cua "ngay hom qua" khi nhin tu cua so 24h)
const PART_HOURS = { morning: [6, 7, 8, 9, 10], afternoon: [12, 13, 14, 15, 16], evening: [18, 19, 20, 21], night: [22, 23, 0, 1] };
// do tu tin trung binh theo cam xuc (angry thap: model that chi dung 26% lop nay)
const CONFIDENCE = { happy: 0.88, neutral: 0.82, surprise: 0.74, sad: 0.68, angry: 0.52 };

const same = (moods) => ({ morning: moods, afternoon: moods, evening: moods, night: moods });

const PROFILES = [
    {
        username: "demo30",
        artists: ["Sơn Tùng M-TP", "Noo Phước Thịnh"],
        genres: ["pop", "ballad"],
        moods: {
            morning: { happy: 5, neutral: 2, surprise: 1 },
            afternoon: { neutral: 3, happy: 2, surprise: 1, angry: 1 },
            evening: { sad: 4, neutral: 2, happy: 1 },
            night: { sad: 4, angry: 1, neutral: 1 },
        },
        recentNegative: true,   // 3 ngay gan nhat buon / gian nhieu -> che do dong vien bat
    },
    { username: "mau_ballad", artists: ["Noo Phước Thịnh", "Lệ Quyên", "GUrbane"], genres: ["ballad"], moods: same({ sad: 4, neutral: 3, happy: 1 }) },
    { username: "mau_rap", artists: ["Da LAB", "RPT MCK"], genres: ["rap"], moods: same({ surprise: 4, happy: 3, angry: 1, neutral: 1 }) },
    { username: "mau_pop", artists: ["Sơn Tùng M-TP", "Taylor Swift"], genres: ["pop"], moods: same({ happy: 5, surprise: 2, neutral: 1 }) },
    { username: "mau_chill", artists: [], genres: ["thư giãn", "ballad"], moods: same({ neutral: 4, angry: 3, sad: 1 }) },
];
// demo30: 3 ngay gan nhat (back <= 2) chi buon/gian. Ly do: luat that (checkMoodTrend) doc cua so 72h;
// luc 00:30 cua so 72h tro lai toi day back=3 (ngay co mood binh thuong). Neu ngay back=2 con trung tinh
// thi ti le buon+gian co the bang dung 0.5 -> khong dat > 0.5. Ca 3 ngay chi buon/gian thi on dinh.
const RECENT_NEGATIVE_ONLY = { sad: 5, angry: 2 };

// bo sinh so ngau nhien co hat giong (mulberry32): cung seed -> cung day so
const makeRng = (seed) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const pickWeighted = (rand, weights) => {
    const entries = Object.entries(weights);
    const sum = entries.reduce((s, [, w]) => s + w, 0);
    let r = rand() * sum;
    for (const [key, w] of entries) {
        r -= w;
        if (r < 0) return key;
    }
    return entries[entries.length - 1][0];
};

const inTaste = (profile, song) => profile.artists.includes(song.artist) || profile.genres.includes(song.genre);

const generateHistory = (profile, songs, { seed, now, days = 30 }) => {
    const rand = makeRng(seed);
    const scans = [];
    const listens = [];
    const plays = [];
    const scores = new Map();   // "emotion|songId" -> diem

    for (let back = days - 1; back >= 0; back--) {
        const progress = (days - 1 - back) / Math.max(1, days - 1);   // 0 = ngay cu nhat, 1 = hom nay
        // demo30: 3 ngay gan nhat quet nhieu hon (3-4 lan) de co du so lan quet cho luat dong vien.
        // Luat that (suggestService.checkMoodTrend) doc cua so 24h truoc; neu < 4 lan quet thi doc 72h.
        // Viec bat che do dong vien KHONG duoc bao dam tuyet doi cho moi seed/gio: so lan quet va cam xuc
        // deu ngau nhien, va cua so 24h co the thua lan quet
        // (vi du gio dau ngay). Vi vay test "demo30 + luat that" kiem tra 4 gio x 50 seed, khong phai moi gia tri.
        const busy = profile.recentNegative && back <= 2;
        const scanCount = busy ? 3 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 4);
        for (let k = 0; k < scanCount; k++) {
            const part = PARTS[Math.floor(rand() * PARTS.length)];
            const hours = PART_HOURS[part];
            const at = new Date(now);
            at.setDate(at.getDate() - back);
            at.setHours(hours[Math.floor(rand() * hours.length)], Math.floor(rand() * 60), 0, 0);
            if (at > now) continue;   // hom nay: bo lan quet o tuong lai

            const moods = profile.recentNegative && back <= 2 ? RECENT_NEGATIVE_ONLY : profile.moods[part];
            const emotion = pickWeighted(rand, moods);
            const camera = rand() < 0.7;
            const confidence = camera
                ? Math.round(Math.min(0.99, Math.max(0.3, CONFIDENCE[emotion] + (rand() - 0.5) * 0.16)) * 100) / 100
                : null;

            // bai hop vibe cam xuc, uu tien bai hop gu (x3)
            const pool = songs.filter((s) => s.emotion === emotion);
            const candidates = pool.length ? pool : songs;
            // chon 1 lan (khong dat trong predicate cua find: neu khong se goi rand nhieu lan va co the khong khop bai nao)
            const pickedId = Number(pickWeighted(rand,
                Object.fromEntries(candidates.map((s) => [s.id, inTaste(profile, s) ? 3 : 1]))));
            const song = songs.find((s) => s.id === pickedId);
            scans.push({ emotion, confidence, songId: song.id, at });

            // ket qua nghe (vai phut sau lan quet)
            const pGood = Math.min(0.95, Math.max(0.05, 0.4 + 0.35 * progress + (inTaste(profile, song) ? 0.1 : -0.1)));
            const r = rand();
            const rest = 1 - pGood;
            const action = r < pGood ? "good" : r < pGood + rest * 0.45 ? "neutral" : r < pGood + rest * 0.8 ? "bad" : "declined";
            const listenAt = new Date(Math.min(now.getTime(), at.getTime() + (3 + Math.floor(rand() * 4)) * 60000));
            listens.push({ emotion, songId: song.id, action, at: listenAt });
            if (action !== "declined") plays.push({ songId: song.id, at: listenAt });

            const key = `${emotion}|${song.id}`;
            scores.set(key, (scores.get(key) || 0) + RULES[action]);
        }
    }

    const preferences = [...scores.entries()].map(([key, score]) => {
        const [emotion, songId] = key.split("|");
        return { emotion, songId: Number(songId), score: Math.round(score * 10) / 10 };
    });
    return { scans, listens, plays, preferences };
};

module.exports = { PROFILES, RULES, generateHistory, makeRng };

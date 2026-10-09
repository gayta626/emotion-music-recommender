// Unit test bo sinh lich su mau (scripts/lib/demoHistory.js) cho lenh npm run seed-demo
const test = require("node:test");
const assert = require("node:assert");

const { PROFILES, RULES, generateHistory } = require("../scripts/lib/demoHistory");

const songs = [
    { id: 1, title: "Có Chắc Yêu Là Đây", emotion: "happy", artist: "Sơn Tùng M-TP", genre: "pop" },
    { id: 2, title: "Muộn Rồi Mà Sao Còn", emotion: "happy", artist: "Sơn Tùng M-TP", genre: "pop" },
    { id: 3, title: "Giá Như", emotion: "sad", artist: "Noo Phước Thịnh", genre: "ballad" },
    { id: 4, title: "Khó Giữ Chân Thành", emotion: "sad", artist: "GUrbane", genre: "ballad" },
    { id: 5, title: "Meditation", emotion: "angry", artist: null, genre: "thư giãn" },
    { id: 6, title: "Reduce Stress", emotion: "angry", artist: null, genre: "thư giãn" },
    { id: 7, title: "Blank Space", emotion: "surprise", artist: "Taylor Swift", genre: "pop" },
    { id: 8, title: "CILU", emotion: "surprise", artist: "Da LAB", genre: "rap" },
    { id: 9, title: "Giấc Mơ Có Thật", emotion: "neutral", artist: "Lệ Quyên", genre: "ballad" },
    { id: 10, title: "Nếu Như Ta Chẳng Còn", emotion: "neutral", artist: "RPT MCK", genre: "rap" },
];
const now = new Date(2026, 9, 9, 15, 30);
const demo30 = PROFILES.find((p) => p.username === "demo30");
const DAY = 86400000;

test("co du 5 ho so mau, ten hop le cho bang users", () => {
    assert.deepStrictEqual(PROFILES.map((p) => p.username), ["demo30", "mau_ballad", "mau_rap", "mau_pop", "mau_chill"]);
    PROFILES.forEach((p) => assert.match(p.username, /^[a-z0-9_]{3,30}$/));
});

test("cung hat giong -> cung du lieu", () => {
    const a = generateHistory(demo30, songs, { seed: 42, now });
    const b = generateHistory(demo30, songs, { seed: 42, now });
    assert.deepStrictEqual(JSON.stringify(a), JSON.stringify(b));
    assert.ok(a.scans.length >= 30);
});

test("moi moc thoi gian nam trong 30 ngay toi hien tai, chi bai co trong kho", () => {
    const h = generateHistory(demo30, songs, { seed: 1, now });
    const ids = new Set(songs.map((x) => x.id));
    [...h.scans, ...h.listens, ...h.plays].forEach((r) => {
        assert.ok(r.at <= now, "khong co moc trong tuong lai");
        assert.ok(r.at >= new Date(now.getTime() - 30 * DAY), "khong qua 30 ngay");
        assert.ok(ids.has(r.songId));
    });
});

test("diem so thich tinh lai dung luat tu cac luot nghe", () => {
    const h = generateHistory(demo30, songs, { seed: 7, now });
    const expected = new Map();
    h.listens.forEach((l) => {
        const key = `${l.emotion}|${l.songId}`;
        expected.set(key, (expected.get(key) || 0) + RULES[l.action]);
    });
    assert.strictEqual(h.preferences.length, expected.size);
    h.preferences.forEach((p) => {
        // diem da lam tron 1 chu so (0.3 x 3 = 0.9000000001) -> sai so toi da 0.05
        assert.ok(Math.abs(p.score - expected.get(`${p.emotion}|${p.songId}`)) < 0.051);
    });
});

test("nghe het -> co recently_played; Not for me -> khong", () => {
    const h = generateHistory(demo30, songs, { seed: 3, now });
    const played = h.listens.filter((l) => l.action !== "declined").length;
    assert.strictEqual(h.plays.length, played);
});

test("ti le nghe het 10 ngay cuoi cao hon 10 ngay dau (he thong hoc dan)", () => {
    PROFILES.forEach((p) => {
        const h = generateHistory(p, songs, { seed: 11, now });
        const rate = (from, to) => {
            const ls = h.listens.filter((l) => l.at >= from && l.at < to);
            return ls.filter((l) => l.action === "good").length / Math.max(1, ls.length);
        };
        const start = new Date(now.getTime() - 30 * DAY);
        assert.ok(rate(new Date(now.getTime() - 10 * DAY), new Date(now.getTime() + 1)) > rate(start, new Date(start.getTime() + 10 * DAY)), p.username);
    });
});

test("demo30: 3 ngay gan nhat buon + gian > 50%, >= 4 lan quet (che do dong vien bat)", () => {
    const h = generateHistory(demo30, songs, { seed: 5, now });
    const since = new Date(now);
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 2);
    const recent = h.scans.filter((x) => x.at >= since);
    const neg = recent.filter((x) => x.emotion === "sad" || x.emotion === "angry").length;
    assert.ok(recent.length >= 4);
    assert.ok(neg / recent.length > 0.5);
});

test("do tu tin: angry thap hon happy; khoang 70% lan quet co confidence", () => {
    const h = generateHistory(PROFILES.find((p) => p.username === "mau_chill"), songs, { seed: 9, now });
    const withConf = h.scans.filter((x) => x.confidence !== null);
    assert.ok(withConf.length / h.scans.length > 0.5 && withConf.length / h.scans.length < 0.9);
    const avg = (e) => {
        const xs = withConf.filter((x) => x.emotion === e).map((x) => x.confidence);
        return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    assert.ok(avg("angry") < avg("neutral"));
});

test("demo30 + luat that (checkMoodTrend): 24h >= 4 lan quet thi dung 24h, khong thi 72h; buon+gian > 50% (4 gio x seed 1-50)", () => {
    const H = 3600000;
    [[0, 30], [8, 0], [15, 30], [23, 30]].forEach(([hh, mm]) => {
        for (let seed = 1; seed <= 50; seed++) {
            const t = new Date(2026, 9, 9, hh, mm);
            const h = generateHistory(demo30, songs, { seed, now: t });
            // dung dung cua so SQL cua suggestModel.getMoodTrend: created_at >= NOW() - interval
            const win24 = h.scans.filter((x) => x.at >= new Date(t.getTime() - 24 * H));
            const used = win24.length >= 4 ? win24 : h.scans.filter((x) => x.at >= new Date(t.getTime() - 72 * H));
            const neg = used.filter((x) => x.emotion === "sad" || x.emotion === "angry").length;
            const label = `now=${hh}:${mm} seed=${seed}`;
            assert.ok(used.length >= 4, label);
            assert.ok(neg / used.length > 0.5, label);
        }
    });
});

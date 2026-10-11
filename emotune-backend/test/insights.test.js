// Unit test buildInsights (src/services/insightService.js): nhan xet cua NYX o chuong thong bao (I1)
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");

const { buildInsights } = require("../src/services/insightService");
const { buildDaily, buildHourly } = require("../src/services/statsService");

const today = new Date(2026, 9, 10, 20, 0);   // 10/10/2026 20:00 gio dia phuong
// 14 ngay, hom nay o cuoi: 7 ngay cuoi = "tuan nay" (04/10..10/10), 7 ngay truoc do = "tuan truoc"
const daily14 = (rows) => buildDaily(rows, 14, today);
const day = (offset) => {   // offset 0 = hom nay, 7 = cung thu tuan truoc
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const base = { hourly: buildHourly([]), topSong: null, cheerUp: false };
const kinds = (list) => list.map((i) => i.kind);

test("nguoi moi (chua quet lan nao): chi nhac quet hom nay", () => {
    const out = buildInsights({ ...base, daily: daily14([]) });
    assert.deepStrictEqual(kinds(out), ["no-scan"]);
    assert.strictEqual(out[0].link, "/scan");
});

test("buon/gian tang >= 10 diem so voi tuan truoc -> canh bao 'down more'", () => {
    const rows = [
        { day: day(8), emotion: "happy", count: 3 }, { day: day(9), emotion: "sad", count: 1 },     // tuan truoc 1/4 = 25%
        { day: day(0), emotion: "sad", count: 3 }, { day: day(1), emotion: "happy", count: 1 },     // tuan nay 3/4 = 75%
    ];
    const [shift] = buildInsights({ ...base, daily: daily14(rows) });
    assert.strictEqual(shift.kind, "shift");
    assert.match(shift.title, /down more/);
    assert.match(shift.body, /75%.*25%/);
});

test("buon/gian giam -> 'brighter week'; thay doi < 10 diem -> tom tat tuan", () => {
    const better = [
        { day: day(8), emotion: "sad", count: 3 }, { day: day(9), emotion: "happy", count: 1 },
        { day: day(0), emotion: "happy", count: 3 }, { day: day(1), emotion: "sad", count: 1 },
    ];
    assert.match(buildInsights({ ...base, daily: daily14(better) })[0].title, /brighter/i);

    const same = [
        { day: day(8), emotion: "sad", count: 2 }, { day: day(9), emotion: "happy", count: 3 },          // 40% buon/gian
        { day: day(0), emotion: "surprise", count: 2 }, { day: day(1), emotion: "sad", count: 2 }, { day: day(2), emotion: "surprise", count: 1 },
    ];
    const [week] = buildInsights({ ...base, daily: daily14(same) });
    assert.strictEqual(week.kind, "week");
    // nhan hien thi cua 'surprise' la Explore
    assert.match(week.body, /Explore: 3 of 5/);
});

test("tuan nay < 3 lan quet -> khong so sanh / tom tat (it du lieu de ket luan)", () => {
    const rows = [{ day: day(8), emotion: "sad", count: 5 }, { day: day(0), emotion: "happy", count: 2 }];
    assert.deepStrictEqual(kinds(buildInsights({ ...base, daily: daily14(rows) })), []);
});

test("dong vien dang bat dung dau; bai nghe >= 2 lan + gio hay quet (>= 5 lan) co nhan xet", () => {
    const rows = [{ day: day(0), emotion: "sad", count: 3 }];
    const hourly = buildHourly([{ hour: 21, emotion: "sad", count: 4 }, { hour: 9, emotion: "happy", count: 2 }]);
    const song = { id: 7, title: "Perfect" };
    const out = buildInsights({ daily: daily14(rows), hourly, topSong: { song, plays: 3 }, cheerUp: true });
    assert.deepStrictEqual(kinds(out), ["cheer-up", "week", "top-song", "peak-hour"]);
    assert.strictEqual(out[2].song, song);
    assert.match(out[2].title, /Perfect/);
    // khung 3 gio, gio dong nhat nam giua: 20:00-23:00
    assert.match(out[3].title, /8 PM and 11 PM/);
    assert.match(out[3].body, /4 of your 6 scans.*mostly Sad/);
});

test("gio quet rai rac (khung 3 gio dong nhat < 40%) -> khong ket luan thoi quen", () => {
    const hourly = buildHourly([1, 5, 9, 13, 17, 21].map((hour) => ({ hour, emotion: "sad", count: 2 })));
    const out = buildInsights({ ...base, daily: daily14([{ day: day(0), emotion: "sad", count: 1 }]), hourly });
    assert.deepStrictEqual(kinds(out), []);
});

test("bai nghe 1 lan / gio quet it -> khong noi; da quet hom nay -> khong nhac quet", () => {
    const rows = [{ day: day(0), emotion: "happy", count: 1 }];
    const hourly = buildHourly([{ hour: 21, emotion: "happy", count: 4 }]);
    const out = buildInsights({ daily: daily14(rows), hourly, topSong: { song: { id: 1, title: "x" }, plays: 1 }, cheerUp: false });
    assert.deepStrictEqual(kinds(out), []);
});

test("id on dinh trong tuan (de danh dau 'da xem'), doi khi noi dung chinh doi", () => {
    const rows = [{ day: day(0), emotion: "sad", count: 3 }];
    const a = buildInsights({ ...base, daily: daily14(rows) })[0];
    const b = buildInsights({ ...base, daily: daily14([...rows, { day: day(1), emotion: "sad", count: 1 }]) })[0];
    const c = buildInsights({ ...base, daily: daily14([{ day: day(0), emotion: "happy", count: 3 }]) })[0];
    assert.strictEqual(a.id, b.id);      // them 1 lan quet buon: van "Mostly Sad" -> van la nhan xet cu
    assert.notStrictEqual(a.id, c.id);   // doi sang "Mostly Happy" -> nhan xet moi (chua xem)
});

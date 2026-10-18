// Unit test ham thuan trang admin theo doi he thong (src/services/adminService.js)
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");

const a = require("../src/services/adminService");

const today = new Date(2026, 9, 17, 15, 0);   // 17/10/2026 15:00 gio dia phuong

// 1 dong SQL theo ngay (giong adminModel.getDailyRows)
const row = (day, x = {}) => ({ day, scans: 0, cam: 0, conf_sum: 0, unsure: 0, listens: 0, good: 0, ...x });

test("splitPeriods: chia 2 ky lien nhau, ky hien tai ket thuc hom nay", () => {
    const rows = [
        row("2026-10-17", { scans: 2 }),
        row("2026-10-11", { scans: 3 }),   // ngay dau ky hien tai (7 ngay)
        row("2026-10-10", { scans: 4 }),   // ngay cuoi ky truoc
        row("2026-10-04", { scans: 5 }),   // ngay dau ky truoc
        row("2026-10-03", { scans: 9 }),   // ngoai ca 2 ky -> bo
    ];
    const { current, previous, dates } = a.splitPeriods(rows, 7, today);
    assert.strictEqual(dates.length, 7);
    assert.strictEqual(dates[0], "2026-10-11");
    assert.strictEqual(dates[6], "2026-10-17");
    assert.strictEqual(current.length, 2);
    assert.strictEqual(previous.length, 2);
});

test("sumRows + metricValues: ti le chi tinh khi du mau, so tu chuoi SQL van cong dung", () => {
    const t = a.sumRows([
        row("2026-10-16", { scans: "6", cam: 4, conf_sum: 3.2, unsure: 1, listens: 5, good: 3 }),
        row("2026-10-17", { scans: 4, cam: "2", conf_sum: "1.0", unsure: 1, listens: 1, good: 0 }),
    ]);
    assert.deepStrictEqual(t, { scans: 10, cam: 6, conf_sum: 4.2, unsure: 2, corrected: 0, listens: 6, good: 3 });
    const v = a.metricValues(t);
    assert.strictEqual(v.completion, 0.5);
    assert.strictEqual(v.confidence, 0.7);
    assert.strictEqual(v.unsure, 0.33);
    assert.strictEqual(v.scans, 10);

    // it hon MIN_SAMPLES lan quet camera / luot nghe -> chua du du lieu (null), khong doan
    const few = a.metricValues(a.sumRows([row("2026-10-17", { scans: 3, cam: 3, conf_sum: 1.5, listens: 2, good: 2 })]));
    assert.strictEqual(few.confidence, null);
    assert.strictEqual(few.unsure, null);
    assert.strictEqual(few.completion, null);
    assert.strictEqual(few.scans, 3);
});

test("judge: ti le nghe het - dat / theo doi / bao dong theo nguong", () => {
    assert.strictEqual(a.judge("completion", 0.62, null).status, "ok");
    assert.strictEqual(a.judge("completion", 0.45, null).status, "warn");
    assert.strictEqual(a.judge("completion", 0.3, null).status, "alert");
    assert.strictEqual(a.judge("completion", null, 0.6).status, "nodata");
});

test("judge: tut so voi ky truoc (drift) -> bao dong du van tren nguong", () => {
    const j = a.judge("completion", 0.55, 0.7);   // tut 15 diem
    assert.strictEqual(j.status, "alert");
    assert.match(j.reasons.join(" "), /15 pts/);
    // tut it hon nguong drift -> giu muc theo nguong
    assert.strictEqual(a.judge("completion", 0.66, 0.7).status, "ok");
    // do tin cay: tut 0.08 > 0.05
    assert.strictEqual(a.judge("confidence", 0.72, 0.8).status, "alert");
});

test("judge: ti le chua chac - cang THAP cang tot", () => {
    assert.strictEqual(a.judge("unsure", 0.1, null).status, "ok");
    assert.strictEqual(a.judge("unsure", 0.2, null).status, "warn");
    assert.strictEqual(a.judge("unsure", 0.3, null).status, "alert");
    // tang 12 diem so voi ky truoc -> bao dong
    assert.strictEqual(a.judge("unsure", 0.14, 0.02).status, "alert");
    // giam (tot len) thi khong bao dong
    assert.strictEqual(a.judge("unsure", 0.05, 0.2).status, "ok");
});

test("judge: luot quet - chi so voi ky truoc khi ky truoc du nhieu", () => {
    assert.strictEqual(a.judge("scans", 40, 50).status, "ok");      // giam 20%
    assert.strictEqual(a.judge("scans", 30, 50).status, "warn");    // giam 40%
    assert.strictEqual(a.judge("scans", 20, 50).status, "alert");   // giam 60%
    assert.strictEqual(a.judge("scans", 0, 3).status, "alert");     // khong ai quet
    assert.strictEqual(a.judge("scans", 2, 4).status, "ok");        // ky truoc qua it -> khong so
});

test("buildHealth: 4 chi so, chuoi theo ngay du ngay, canh bao + muc chung = muc te nhat", () => {
    const rows = [
        // ky truoc: nghe het 80%
        row("2026-10-05", { scans: 10, cam: 10, conf_sum: 8, unsure: 0, listens: 10, good: 8 }),
        // ky nay: nghe het 40%, tin cay 0.75, chua chac 10%
        row("2026-10-12", { scans: 6, cam: 5, conf_sum: 3.75, unsure: 1, listens: 5, good: 2 }),
        row("2026-10-16", { scans: 6, cam: 5, conf_sum: 3.75, unsure: 0, listens: 5, good: 2 }),
    ];
    const h = a.buildHealth(rows, 7, today);
    assert.deepStrictEqual(h.metrics.map((m) => m.key), ["completion", "confidence", "unsure", "corrections", "scans"]);
    const completion = h.metrics[0];
    assert.strictEqual(completion.value, 0.4);
    assert.strictEqual(completion.previous, 0.8);
    assert.strictEqual(completion.status, "alert");
    assert.strictEqual(completion.daily.length, 7);
    // ngay khong co luot nghe -> null (bieu do de trong, khong ve 0)
    assert.strictEqual(completion.daily.find((d) => d.date === "2026-10-13").value, null);
    assert.strictEqual(completion.daily.find((d) => d.date === "2026-10-12").value, 0.4);

    assert.strictEqual(h.metrics[1].value, 0.75);
    assert.strictEqual(h.metrics[2].value, 0.1);
    assert.strictEqual(h.metrics[4].value, 12);
    assert.strictEqual(h.overall, "alert");
    assert.ok(h.alerts.some((x) => x.metric === "completion" && x.status === "alert"));
    assert.strictEqual(h.from, "2026-10-11");
    assert.strictEqual(h.to, "2026-10-17");
});

test("buildHealth: khong co du lieu -> nodata, khong bao dong ti le", () => {
    const h = a.buildHealth([], 30, today);
    assert.strictEqual(h.metrics[0].status, "nodata");
    assert.strictEqual(h.metrics[0].daily.length, 30);
    // khong ai quet ca 2 ky -> luot quet = 0 la bao dong (he thong khong duoc dung)
    assert.strictEqual(h.metrics[4].status, "alert");
});

test("buildUsers: ti le tung nguoi + danh dau tai khoan mau + muc te nhat cua nguoi do", () => {
    const users = a.buildUsers([
        { id: 1, username: "gayta626", scans: 10, cam: 8, conf_sum: 4, unsure: 4, listens: 6, good: 5, last_at: "2026-10-16T10:00:00" },
        { id: 2, username: "mau_rap", scans: 3, cam: 3, conf_sum: 2.7, unsure: 0, listens: 0, good: 0, last_at: null },
    ]);
    assert.strictEqual(users[0].confidence, 0.5);
    assert.strictEqual(users[0].unsure, 0.5);
    assert.strictEqual(users[0].completion, 0.83);
    assert.strictEqual(users[0].sample, false);
    assert.strictEqual(users[0].status, "alert");   // tin cay 0.5 < 0.6
    // corrected thieu (dong SQL cu) -> 0 lan sua
    assert.deepStrictEqual(users[0].levels, { completion: "ok", confidence: "alert", unsure: "alert", corrections: "ok" });
    assert.strictEqual(users[1].sample, true);
    assert.strictEqual(users[1].confidence, null);   // 3 lan quet < MIN_SAMPLES
    assert.strictEqual(users[1].status, "nodata");
});

test("chi so Mood corrections (C15): lan quet camera bi nguoi dung sua / tong lan quet camera", () => {
    const v = a.metricValues(a.sumRows([{ scans: 12, cam: 10, conf_sum: 7, unsure: 2, corrected: 4, listens: 0, good: 0 }]));
    assert.strictEqual(v.corrections, 0.4);
    assert.strictEqual(a.judge("corrections", 0.4, null).status, "alert");    // > 30%
    assert.strictEqual(a.judge("corrections", 0.2, null).status, "warn");     // giua 15% va 30%
    assert.strictEqual(a.judge("corrections", 0.1, null).status, "ok");
    // it hon 5 lan quet camera -> chua du du lieu
    assert.strictEqual(a.metricValues(a.sumRows([{ cam: 3, corrected: 3 }])).corrections, null);
});

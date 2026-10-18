// Trang admin theo doi he thong (C14, tai lieu mon C3-2 "Monitoring success criteria"):
// 5 chi so thanh cong cua CA HE THONG (moi nguoi dung) + so voi ky truoc de phat hien "tut" (drift) + canh bao.
// Cac ham o day la HAM THUAN (nhan dong SQL tho tu adminModel) -> unit test duoc. getHealth (cuoi file) ghep lai cho GET /admin/health.
const { dayRange, normalizeDays } = require("./statsService");
const { PROFILES } = require("../../scripts/lib/demoHistory");

// Lan quet camera co do tin cay < nguong nay = AI "chua chac" (5 lop -> doan bua chi ~20%).
// Dung lai cho C7 (tra "chua chac" thay vi doan) de 2 noi cung 1 dinh nghia.
const UNSURE_BELOW = 0.6;
// it hon so mau nay thi ti le chua dang tin -> bao "chua du du lieu" thay vi tinh
const MIN_SAMPLES = 5;
// ky truoc it hon so lan quet nay thi khong so luot quet (tang/giam vai lan khong co y nghia)
const MIN_PREV_SCANS = 10;

// tai khoan MAU do `npm run seed-demo` sinh (khong phai nguoi dung that) -> trang admin co the an di
const SAMPLE_USERNAMES = PROFILES.map((p) => p.username);

// Nguong tung chi so (ti le 0..1). better: chieu "tot". ok / alert: moc dat / bao dong; giua 2 moc = "theo doi".
// drift: thay doi theo chieu XAU so voi ky truoc tu muc nay tro len -> bao dong (du van tren nguong).
// scans khong co moc tuyet doi (tuy so nguoi dung): chi so voi ky truoc, giam >= warnDrop / alertDrop.
const TARGETS = {
    completion: { better: "higher", ok: 0.5, alert: 0.4, drift: 0.1 },
    confidence: { better: "higher", ok: 0.7, alert: 0.6, drift: 0.05 },
    unsure: { better: "lower", ok: 0.15, alert: 0.25, drift: 0.1 },
    // C15: ti le lan quet camera nguoi dung phai SUA cam xuc AI doan (AI sai ma nguoi dung bao lai)
    corrections: { better: "lower", ok: 0.15, alert: 0.3, drift: 0.1 },
    scans: { better: "higher", warnDrop: 0.25, alertDrop: 0.5 },
};
const METRIC_KEYS = Object.keys(TARGETS);
const LABELS = {
    completion: "Songs finished",
    confidence: "AI confidence",
    unsure: "Unsure scans",
    corrections: "Mood corrections",
    scans: "Scans",
};

const STATUS_RANK = { nodata: 0, ok: 1, warn: 2, alert: 3 };
const worst = (list) => list.reduce((w, s) => (STATUS_RANK[s] > STATUS_RANK[w] ? s : w), "nodata");

const round2 = (x) => Math.round(x * 100) / 100;
// so sanh theo "diem phan tram" nguyen -> tranh loi so thuc (0.7 - 0.6 = 0.0999…)
const pts = (x) => Math.round(x * 100);
const pct = (x) => `${pts(x)}%`;

const NUM_COLS = ["scans", "cam", "conf_sum", "unsure", "corrected", "listens", "good"];
const zero = () => Object.fromEntries(NUM_COLS.map((c) => [c, 0]));

// cong don cac dong (so tu SQL co the la chuoi) -> { scans, cam, conf_sum, unsure, corrected, listens, good }
const sumRows = (rows) => rows.reduce((t, r) => {
    NUM_COLS.forEach((c) => { t[c] = round2(t[c] + Number(r[c] || 0)); });
    return t;
}, zero());

// tong -> gia tri cac chi so; ti le can >= minSamples mau, khong du = null (chua du du lieu)
const metricValues = (t, minSamples = MIN_SAMPLES) => ({
    completion: t.listens >= minSamples ? round2(t.good / t.listens) : null,
    confidence: t.cam >= minSamples ? round2(t.conf_sum / t.cam) : null,
    unsure: t.cam >= minSamples ? round2(t.unsure / t.cam) : null,
    corrections: t.cam >= minSamples ? round2(t.corrected / t.cam) : null,
    scans: t.scans,
});

// rows: dong SQL theo ngay trong 2 ky lien nhau -> ky hien tai (ket thuc hom nay) va ky truoc, moi ky `days` ngay
const splitPeriods = (rows, days, today) => {
    const all = dayRange(days * 2, today);
    const prevDates = new Set(all.slice(0, days));
    const dates = all.slice(days);
    const curDates = new Set(dates);
    return {
        dates,
        current: rows.filter((r) => curDates.has(r.day)),
        previous: rows.filter((r) => prevDates.has(r.day)),
    };
};

// Xet 1 chi so: { status: ok | warn | alert | nodata, reasons: [cau giai thich] }
const judge = (key, value, previous) => {
    const t = TARGETS[key];
    if (key === "scans") {
        if (!value) return { status: "alert", reasons: ["No scans in this period"] };
        if (previous == null || previous < MIN_PREV_SCANS) return { status: "ok", reasons: [] };
        const drop = 1 - value / previous;
        if (pts(drop) >= pts(t.alertDrop)) return { status: "alert", reasons: [`Down ${pct(drop)} vs previous period`] };
        if (pts(drop) >= pts(t.warnDrop)) return { status: "warn", reasons: [`Down ${pct(drop)} vs previous period`] };
        return { status: "ok", reasons: [] };
    }
    if (value == null) return { status: "nodata", reasons: [] };

    const higher = t.better === "higher";
    // "xau hon moc" theo chieu cua chi so
    const worseThan = (mark) => (higher ? pts(value) < pts(mark) : pts(value) > pts(mark));
    let status = "ok";
    const reasons = [];
    if (worseThan(t.alert)) {
        status = "alert";
        reasons.push(`${higher ? "Below" : "Above"} the ${pct(t.alert)} alert line`);
    } else if (worseThan(t.ok)) {
        status = "warn";
        reasons.push(`${higher ? "Below" : "Above"} the ${pct(t.ok)} target`);
    }
    if (previous != null) {
        const change = higher ? previous - value : value - previous;   // > 0 = xau di
        if (pts(change) >= pts(t.drift)) {
            status = "alert";
            reasons.push(`${higher ? "Down" : "Up"} ${pts(change)} pts vs previous period`);
        }
    }
    return { status, reasons };
};

// gia tri 1 ngay cho bieu do (ngay khong co mau = null -> de trong, khong ve 0)
const dayValue = (key, r) => {
    if (key === "scans") return { value: r.scans, n: r.scans };
    if (key === "completion") return { value: r.listens ? round2(r.good / r.listens) : null, n: r.listens };
    const v = key === "confidence" ? r.conf_sum / r.cam : key === "unsure" ? r.unsure / r.cam : r.corrected / r.cam;
    return { value: r.cam ? round2(v) : null, n: r.cam };
};

// rows: dong SQL theo ngay (2 ky) -> cac chi so (gia tri, ky truoc, muc, ly do, chuoi theo ngay) + danh sach canh bao
const buildHealth = (rows, days, today) => {
    const { dates, current, previous } = splitPeriods(rows, days, today);
    const curTotals = sumRows(current);
    const cur = metricValues(curTotals);
    const prev = metricValues(sumRows(previous));
    const byDay = new Map(current.map((r) => [r.day, sumRows([r])]));

    const metrics = METRIC_KEYS.map((key) => {
        const { status, reasons } = judge(key, cur[key], prev[key]);
        return {
            key,
            label: LABELS[key],
            value: cur[key],
            previous: prev[key],
            samples: key === "completion" ? curTotals.listens : key === "scans" ? curTotals.scans : curTotals.cam,
            status,
            reasons,
            target: TARGETS[key],
            daily: dates.map((date) => ({ date, ...dayValue(key, byDay.get(date) || zero()) })),
        };
    });
    return {
        from: dates[0],
        to: dates[dates.length - 1],
        metrics,
        alerts: metrics
            .filter((m) => m.status === "warn" || m.status === "alert")
            .map((m) => ({ metric: m.key, status: m.status, text: `${m.label}: ${m.reasons.join(" · ")}` })),
        overall: worst(metrics.map((m) => m.status)),
    };
};

// rows: moi nguoi 1 dong (cung cot so nhu theo ngay + id, username, last_at) -> ti le tung nguoi + muc te nhat
// (chi xet cac ti le, khong xet luot quet: so luot quet moi nguoi khac nhau la binh thuong)
const buildUsers = (rows) => rows.map((r) => {
    const v = metricValues(sumRows([r]));
    const levels = Object.fromEntries(["completion", "confidence", "unsure", "corrections"].map((k) => [k, judge(k, v[k], null).status]));
    return {
        id: r.id,
        username: r.username,
        sample: SAMPLE_USERNAMES.includes(r.username),
        scans: Number(r.scans),
        cam: Number(r.cam),
        listens: Number(r.listens),
        completion: v.completion,
        confidence: v.confidence,
        unsure: v.unsure,
        corrections: v.corrections,
        lastAt: r.last_at,
        levels,
        status: worst(Object.values(levels)),
    };
});

const adminModel = require("../model/adminModel");
const faceSamples = require("./faceSamples");

// GET /admin/health?days=7|30&sample=0|1
const getHealth = async (rawDays, includeSample) => {
    const days = normalizeDays(rawDays);
    const excluded = includeSample ? [] : SAMPLE_USERNAMES;
    const [dailyRows, userRows] = await Promise.all([
        adminModel.getDailyRows(days, UNSURE_BELOW, excluded),
        adminModel.getUserRows(days, UNSURE_BELOW, excluded),
    ]);
    const users = buildUsers(userRows);
    return {
        days,
        includeSample,
        unsureBelow: UNSURE_BELOW,
        minSamples: MIN_SAMPLES,
        ...buildHealth(dailyRows, days, new Date()),
        activeUsers: users.filter((u) => u.scans > 0).length,
        users,
        // C15: anh mat + nhan dung nguoi dung da gop (de train lai model), dem tren dia
        faces: faceSamples.countFaces(),
    };
};

module.exports = {
    UNSURE_BELOW, MIN_SAMPLES, SAMPLE_USERNAMES, TARGETS,
    sumRows, metricValues, splitPeriods, judge, buildHealth, buildUsers,
    getHealth,
};

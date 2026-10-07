// Tinh toan cho trang thong ke cam xuc (/stats) va the "Your mood this week" tren trang chu

// thu tu co dinh (mau theo cam xuc, khong theo thu hang) — mau da kiem tra mu mau tren nen toi
export const EMOTIONS = [
    { key: 'happy', label: 'Happy', emoji: '😊' },
    { key: 'surprise', label: 'Surprised', emoji: '😲' },
    { key: 'neutral', label: 'Neutral', emoji: '😐' },
    { key: 'sad', label: 'Sad', emoji: '😢' },
    { key: 'angry', label: 'Angry', emoji: '😠' },
];
export const NEGATIVE = ['sad', 'angry'];

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

// 7 ngay gan nhat (hom nay o cuoi), ngay khong quet van co cot rong
export const buildDays = (rows) => {
    const byDay = {};
    rows.forEach((r) => {
        const key = dayKey(new Date(r.day));
        byDay[key] = byDay[key] || {};
        byDay[key][r.emotion] = (byDay[key][r.emotion] || 0) + parseInt(r.count);
    });
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const counts = byDay[dayKey(d)] || {};
        const total = EMOTIONS.reduce((s, e) => s + (counts[e.key] || 0), 0);
        days.push({
            date: d,
            label: i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' }),
            sub: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            counts,
            total,
        });
    }
    return days;
}

// cung quy tac voi backend (suggestService.decideTarget): hom nay >= 4 lan thi xet hom nay, khong thi 3 ngay;
// >= 4 lan va hon nua la buon/gian -> che do dong vien
export const cheerUpStatus = (days) => {
    const today = days[days.length - 1];
    const windowDays = today.total >= 4 ? [today] : days.slice(-3);
    const total = windowDays.reduce((s, d) => s + d.total, 0);
    const negative = windowDays.reduce((s, d) => s + NEGATIVE.reduce((n, k) => n + (d.counts[k] || 0), 0), 0);
    return { on: total >= 4 && negative / total > 0.5, total, negative, span: today.total >= 4 ? 'today' : 'in the last 3 days' };
}

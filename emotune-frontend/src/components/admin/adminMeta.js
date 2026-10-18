// Hằng số + hàm định dạng dùng chung cho trang admin theo dõi hệ thống (/admin).
// Ngưỡng của từng chỉ số do backend gửi kèm (metrics[].target) — frontend chỉ hiển thị, không tự đặt ngưỡng.

// mức của 1 chỉ số: chữ + icon (màu không bao giờ đứng một mình)
export const STATUS = {
    ok: { label: 'Healthy', icon: 'M5 12.5 10 17.5 19 7' },
    warn: { label: 'Watch', icon: 'M12 7v6M12 17h.01' },
    alert: { label: 'Alert', icon: 'M12 6v8M12 18h.01' },
    nodata: { label: 'Low data', icon: 'M7 12h10' },
};

// mô tả ngắn từng chỉ số (dưới tiêu đề biểu đồ + mục "How these are measured")
export const METRIC_INFO = {
    completion: {
        short: 'of AI-picked songs played to the end',
        how: 'Share of songs NYX picked in mood mode that were played at least 80% through. "Not for me" counts as not finished.',
        unit: 'listens',
    },
    confidence: {
        short: 'average certainty of camera scans',
        how: 'Average probability the emotion model gave its own answer, over camera scans only (manual mood picks have no confidence).',
        unit: 'camera scans',
    },
    unsure: {
        short: 'of camera scans the AI was unsure about',
        how: 'Share of camera scans where the model was less than {unsure} sure. These are the scans most likely to be wrong.',
        unit: 'camera scans',
    },
    corrections: {
        short: 'of camera scans people corrected',
        how: 'Share of camera scans where the person said NYX read the wrong mood ("Not right?" after a scan, or a different answer when NYX was unsure). The most direct measure of how often the emotion model is wrong in real use.',
        unit: 'camera scans',
    },
    scans: {
        short: 'camera scans + manual mood picks',
        how: 'How often people use the mood loop. No fixed target: it is compared with the previous period to catch drop-offs.',
        unit: 'scans',
    },
};

const RATE_KEYS = ['completion', 'confidence', 'unsure', 'corrections'];
export const isRate = (key) => RATE_KEYS.includes(key);

export const pct = (x) => `${Math.round(x * 100)}%`;

// giá trị hiển thị của 1 chỉ số (null = chưa đủ dữ liệu)
export const formatValue = (key, v) => {
    if (v == null) return '—';
    return isRate(key) ? pct(v) : v.toLocaleString('en-GB');
};

// "Target ≥ 50% · alert < 40%" (tỉ lệ) / "Alert if down ≥ 50%" (lượt quét)
export const targetText = (key, t) => {
    if (!isRate(key)) return `Watch if down ${pct(t.warnDrop)} · alert ${pct(t.alertDrop)}`;
    return t.better === 'higher'
        ? `Target ≥ ${pct(t.ok)} · alert < ${pct(t.alert)}`
        : `Target ≤ ${pct(t.ok)} · alert > ${pct(t.alert)}`;
};

// thay đổi so với kỳ trước: { text, good } — good = đổi theo chiều tốt (null = không đổi / không so được)
export const deltaOf = (m, days) => {
    if (m.value == null || m.previous == null) return { text: `No data for the ${days} days before`, good: null };
    if (isRate(m.key)) {
        const d = Math.round((m.value - m.previous) * 100);
        if (!d) return { text: `Same as previous ${days} days`, good: null };
        return {
            text: `${d > 0 ? '+' : '−'}${Math.abs(d)} pts vs previous ${days} days`,
            good: m.target.better === 'higher' ? d > 0 : d < 0,
            up: d > 0,
        };
    }
    if (!m.previous) return { text: `None in the ${days} days before`, good: null };
    const d = Math.round(((m.value - m.previous) / m.previous) * 100);
    if (!d) return { text: `Same as previous ${days} days`, good: null };
    return { text: `${d > 0 ? '+' : '−'}${Math.abs(d)}% vs previous ${days} days`, good: d > 0, up: d > 0 };
};

// "2026-10-09" -> "9 Oct" (không đổi múi giờ)
export const shortDay = (iso) => {
    const [y, mo, d] = iso.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// thời điểm hoạt động gần nhất: "Today 14:05" / "3 days ago"
export const lastActive = (iso) => {
    if (!iso) return '—';
    const t = new Date(iso);
    const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86400000);
    if (days <= 0) return `Today ${t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
};

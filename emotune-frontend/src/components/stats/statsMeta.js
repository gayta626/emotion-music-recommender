// Hằng số + hàm định dạng dùng chung cho các mục trang thống kê
import { EMOTIONS } from '../../utils/moodStats';

export { EMOTIONS };   // thứ tự màu cố định: happy, surprise, neutral, sad, angry

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];   // weekday 1..7 của API
export const PARTS = [
    { key: 'morning', label: 'Morning', hours: '5–11' },
    { key: 'afternoon', label: 'Afternoon', hours: '11–17' },
    { key: 'evening', label: 'Evening', hours: '17–22' },
    { key: 'night', label: 'Night', hours: '22–5' },
];
// kết quả 1 lượt nghe, từ tốt tới xấu (màu trong Stats.scss: .out-good …)
export const OUTCOMES = [
    { key: 'good', label: 'Played to the end' },
    { key: 'neutral', label: 'Played about half' },
    { key: 'bad', label: 'Skipped early' },
    { key: 'declined', label: 'Not for me' },
];

export const sumCounts = (counts) => EMOTIONS.reduce((s, e) => s + (counts[e.key] || 0), 0);

// cảm xúc nhiều nhất trong 1 ô (hoà: theo thứ tự EMOTIONS), không có -> null
export const dominant = (counts) => {
    let best = null;
    EMOTIONS.forEach((e) => {
        if ((counts[e.key] || 0) > (best ? counts[best] : 0)) best = e.key;
    });
    return best;
};

// 2950 -> "49m", 7260 -> "2h 1m"
export const formatListen = (seconds) => {
    if (!seconds) return '0m';
    // làm tròn ra phút trước rồi mới tách giờ/phút, tránh "60m" hoặc "1h 60m"
    const mins = Math.round(seconds / 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
};

// "2026-10-09" -> { label: 'Thu', sub: '9 Oct' } (ngày cuối = 'Today'); không đổi múi giờ
export const dayLabel = (iso, isLast) => {
    const [y, mo, d] = iso.split('-').map(Number);
    const date = new Date(y, mo - 1, d);
    return {
        label: isLast ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'short' }),
        sub: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    };
};

// trục dọc: vạch chia số "đẹp" (1, 2, 5, 10)
export const niceScale = (max) => {
    const m = Math.max(1, max);
    const step = m <= 4 ? 1 : m <= 10 ? 2 : m <= 25 ? 5 : 10;
    const top = Math.ceil(m / step) * step;
    const ticks = [];
    for (let v = 0; v <= top; v += step) ticks.push(v);
    return { top, ticks };
};

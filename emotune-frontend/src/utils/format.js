// Định dạng dùng chung cho bảng bài kiểu Spotify (trang mix, trang playlist)

// 232 -> "3:52"; chưa có thời lượng -> "—"
export const formatDuration = (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '—';
    const total = Math.round(seconds);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// Giống cột "Date added" của Spotify: gần đây thì "6 hours ago", "2 weeks ago"; lâu hơn 1 tháng thì "Aug 11, 2026"
export const formatAdded = (iso, now = Date.now()) => {
    if (!iso) return '—';
    const at = new Date(iso);
    const diff = (now - at.getTime()) / 1000;
    if (!Number.isFinite(diff)) return '—';
    const ago = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return ago(Math.floor(diff / 60), 'minute');
    if (diff < 86400) return ago(Math.floor(diff / 3600), 'hour');
    if (diff < 7 * 86400) return ago(Math.floor(diff / 86400), 'day');
    if (diff < 30 * 86400) return ago(Math.floor(diff / (7 * 86400)), 'week');
    return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

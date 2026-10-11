import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/authContext';
import { usePlayback } from '../contexts/playbackContext';
import NotificationIcon from '../assets/icons/notification_icon.svg?react';
import './NotificationMenu.scss';

// Chuông thông báo (I1) = "nhận xét của NYX" (GET /insights: backend tự rút ra từ lịch sử quét + nghe).
// Chấm đỏ = số nhận xét chưa xem; "đã xem" lưu theo id trong localStorage (mỗi tài khoản 1 khoá, chỉ là tiện ích:
// mất đi thì chỉ hiện lại chấm đỏ). Bấm 1 nhận xét -> mở trang liên quan, hoặc phát bài "On repeat".

const Icon = ({ d }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
    </svg>
);
const ICONS = {
    'cheer-up': 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    shift: 'M3 17l6-6 4 4 8-8M15 7h6v6',
    week: 'M4 20V11M10 20V5M16 20v-6M21 20H3',
    'no-scan': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    'top-song': 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    'peak-hour': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
};

const seenKey = (username) => `nyx-seen-insights:${username}`;
const loadSeen = (username) => {
    try { return new Set(JSON.parse(localStorage.getItem(seenKey(username)) || '[]')); } catch { return new Set(); }
};
const saveSeen = (username, ids) => {
    try { localStorage.setItem(seenKey(username), JSON.stringify(ids)); } catch { /* chế độ riêng tư: bỏ qua */ }
};

const NotificationMenu = () => {
    const { user } = useAuth();
    const { playSong, lastMood } = usePlayback();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const rootRef = useRef(null);
    const username = user?.username;
    // id đã xem: chỉ cập nhật lúc ĐÓNG menu -> trong lúc mở, mục chưa xem vẫn có chấm "mới".
    // Đọc theo username (lúc header vừa hiện, tài khoản có thể chưa tải xong); seenVersion tăng = vừa lưu -> đọc lại
    const [seenVersion, setSeenVersion] = useState(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const seen = useMemo(() => (username ? loadSeen(username) : new Set()), [username, seenVersion]);

    // tải khi vào trang, khi mở menu, và sau mỗi lần quét (lastMood đổi) -> nhận xét luôn theo số liệu mới
    useEffect(() => {
        api.get('/insights').then((res) => setItems(res.data)).catch(() => { });
    }, [open, lastMood?.at]);

    // đóng menu = đã xem hết những gì vừa hiện (chỉ giữ id còn hiện -> danh sách đã xem không phình mãi)
    const close = () => {
        setOpen(false);
        if (items.every((i) => seen.has(i.id))) return;
        const ids = items.map((i) => i.id);
        saveSeen(username, ids);
        setSeenVersion((v) => v + 1);
    };
    const closeRef = useRef(close);
    useEffect(() => { closeRef.current = close; });

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) closeRef.current(); };
        const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const choose = (item) => {
        close();
        if (item.song) playSong(item.song);
        else if (item.link) navigate(item.link);
    };

    const unread = items.filter((i) => !seen.has(i.id)).length;

    return (
        <div className="notification-menu" ref={rootRef}>
            <button
                className="notification-btn"
                onClick={() => (open ? close() : setOpen(true))}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
                title="What NYX noticed"
            >
                <NotificationIcon />
                {unread > 0 && !open && <span className="notif-badge" aria-hidden="true">{unread}</span>}
            </button>
            {open && (
                <div className="notif-dropdown" role="menu" aria-label="What NYX noticed">
                    <div className="notif-head">
                        <b>What NYX noticed</b>
                        <small>Based on your scans &amp; listening</small>
                    </div>
                    {items.length === 0 && (
                        <p className="notif-empty">Nothing yet. Scan your mood a few times and NYX will tell you what it notices.</p>
                    )}
                    {items.map((item) => (
                        <button key={item.id} role="menuitem" className={`notif-item kind-${item.kind}`} onClick={() => choose(item)}>
                            <span className="notif-icon"><Icon d={ICONS[item.kind] || ICONS.week} /></span>
                            <span className="notif-text">
                                <b>{item.title}</b>
                                <small>{item.body}</small>
                            </span>
                            {!seen.has(item.id) && <span className="notif-new" aria-label="New" />}
                        </button>
                    ))}
                    <hr />
                    <button role="menuitem" className="notif-all" onClick={() => { close(); navigate('/stats'); }}>
                        See all your stats →
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationMenu;

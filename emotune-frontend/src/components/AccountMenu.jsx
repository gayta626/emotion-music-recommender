import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/authContext';
import UserAvatar from './UserAvatar';
import UserIcon from '../assets/icons/user_icon.svg?react';
import './AccountMenu.scss';

// Menu tài khoản trên header (Figma 329:300): bấm tên / icon tài khoản -> xổ xuống Your stats / Settings / Log out.
// Đóng khi bấm ra ngoài, nhấn Esc hoặc chọn 1 mục.

const Icon = ({ d }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
    </svg>
);
const ICONS = {
    stats: 'M4 20V11M10 20V5M16 20v-6M21 20H3',
    settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.9 1.9M17.5 17.5l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.9-1.9M17.5 6.5l1.9-1.9',
    admin: 'M12 3 4 6v6c0 4.4 3.4 8.3 8 9 4.6-.7 8-4.6 8-9V6l-8-3ZM8.5 12.5l2.4 2.4 4.6-4.8',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    chevron: 'm9 6 6 6-6 6',
};

const formatDay = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const AccountMenu = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [tasteAt, setTasteAt] = useState(null);   // ngày lưu gu gần nhất (null = chưa lưu / chưa biết)
    const rootRef = useRef(null);

    // mỗi lần mở menu mới hỏi ngày cập nhật gu (vừa sửa ở Settings thì ngày đúng ngay), không gọi API khi chưa mở
    useEffect(() => {
        if (!open) return;
        api.get('/profile').then((res) => setTasteAt(res.data.updatedAt)).catch(() => {});
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const go = (path) => {
        setOpen(false);
        navigate(path);
    };

    return (
        <div className="account-menu" ref={rootRef}>
            <button
                className="user-info"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                title="Account"
            >
                <UserIcon />
                <span className="username">{user?.username}</span>
            </button>
            {open && (
                <div className="account-dropdown" role="menu" aria-label="Account">
                    <div className="account-who">
                        <UserAvatar username={user?.username} size={40} />
                        <div>
                            <b>{user?.username}</b>
                            <small>{tasteAt ? `Taste updated ${formatDay(tasteAt)}` : 'Signed in'}</small>
                        </div>
                    </div>
                    <hr />
                    <button role="menuitem" onClick={() => go('/stats')}>
                        <Icon d={ICONS.stats} />
                        <span><b>Your stats</b><small>Moods, top songs &amp; more</small></span>
                        <Icon d={ICONS.chevron} />
                    </button>
                    <button role="menuitem" onClick={() => go('/settings')}>
                        <Icon d={ICONS.settings} />
                        <span><b>Settings</b><small>Account &amp; music taste</small></span>
                        <Icon d={ICONS.chevron} />
                    </button>
                    {user?.isAdmin && (
                        <button role="menuitem" onClick={() => go('/admin')}>
                            <Icon d={ICONS.admin} />
                            <span><b>Admin</b><small>Health · users · library</small></span>
                            <Icon d={ICONS.chevron} />
                        </button>
                    )}
                    <hr />
                    <button role="menuitem" className="danger" onClick={() => { setOpen(false); logout(); }}>
                        <Icon d={ICONS.logout} />
                        <span><b>Log out</b></span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default AccountMenu;

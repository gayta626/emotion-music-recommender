import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import '../stats/Stats.scss';
import '../../pages/MoodPage.scss';
import '../../pages/AdminPage.scss';
import '../../pages/AdminManage.scss';

// Khung chung các trang admin (/admin, /admin/users, /admin/library): chặn người không phải admin.
// Chặn thật nằm ở backend (requireAdmin -> 403); ở đây chỉ để không hiện trang trống / lỗi.
const AdminLayout = () => {
    const { user } = useAuth();
    if (!user) {
        return <div className="mood-page stats-page admin-page"><p className="mood-muted">Loading…</p></div>;
    }
    if (!user.isAdmin) {
        return (
            <div className="mood-page stats-page admin-page">
                <section className="stats-card admin-locked">
                    <h1>Admins only</h1>
                    <p className="mood-muted">These pages show and change data of every account. Ask an admin to give you the admin role.</p>
                </section>
            </div>
        );
    }
    return <Outlet />;
};

const TABS = [
    { to: '/admin', label: 'Health', end: true },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/library', label: 'Library' },
];

// thanh tab đầu mỗi trang admin
export const AdminTabs = () => (
    <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}>{t.label}</NavLink>
        ))}
    </nav>
);

export default AdminLayout;

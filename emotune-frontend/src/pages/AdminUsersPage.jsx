import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/authContext';
import UserAvatar from '../components/UserAvatar';
import UserActions from '../components/admin/UserActions';
import AdminDialog from '../components/admin/AdminDialog';
import { AdminTabs } from '../components/admin/AdminLayout';
import { lastActive } from '../components/admin/adminMeta';
import { plain } from '../utils/text';

// Quản lý tài khoản (/admin/users): mọi tài khoản + đổi quyền, khoá, đặt lại mật khẩu, xoá; bấm tên -> trang chi tiết.
// Số liệu từ GET /admin/users (chỉ admin).
const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'admin', label: 'Admins' },
    { key: 'locked', label: 'Locked' },
    { key: 'sample', label: 'Sample' },
];

const joined = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const AdminUsersPage = () => {
    const { user: me } = useAuth();
    const [users, setUsers] = useState(null);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [notice, setNotice] = useState('');
    const [managing, setManaging] = useState(null);   // id tài khoản đang mở hộp thoại Manage

    useEffect(() => {
        let alive = true;
        api.get('/admin/users')
            .then((res) => { if (alive) { setUsers(res.data); setError(''); } })
            .catch((err) => { if (alive) setError(err.response?.data?.error || "Couldn't load accounts."); });
        return () => { alive = false; };
    }, [reload]);

    const shown = useMemo(() => {
        if (!users) return [];
        const q = plain(query.trim());
        return users.filter((u) => {
            if (filter === 'admin' && u.role !== 'admin') return false;
            if (filter === 'locked' && !u.locked) return false;
            if (filter === 'sample' && !u.sample) return false;
            return !q || plain(u.username).includes(q);
        });
    }, [users, query, filter]);

    const replace = (u) => setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, ...u } : x)));
    const drop = (u) => {
        setManaging(null);
        setUsers((list) => list.filter((x) => x.id !== u.id));
        setNotice(`Deleted ${u.username}.`);
    };

    const managed = users?.find((u) => u.id === managing);

    const counts = users && {
        all: users.length,
        admin: users.filter((u) => u.role === 'admin').length,
        locked: users.filter((u) => u.locked).length,
        sample: users.filter((u) => u.sample).length,
    };

    return (
        <div className="mood-page stats-page admin-page admin-manage">
            <AdminTabs />
            <header className="mood-head stats-head">
                <div>
                    <span className="mood-eyebrow">Admin · Users</span>
                    <h1>Accounts</h1>
                    <p>Change roles, lock accounts, reset passwords or delete an account. Open a name to see that person&apos;s data.</p>
                </div>
            </header>

            {error && <p className="stats-error">{error} <button className="table-toggle" onClick={() => setReload((n) => n + 1)}>Try again</button></p>}
            {notice && <p className="admin-notice" role="status">{notice}</p>}

            {!users ? (!error && <p className="mood-muted">Loading…</p>) : (
                <section className="stats-card">
                    <div className="manage-bar">
                        <input
                            className="admin-search"
                            type="search"
                            placeholder="Search username…"
                            aria-label="Search username"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <div className="stats-range" role="group" aria-label="Filter accounts">
                            {FILTERS.map((f) => (
                                <button key={f.key} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                                    {f.label} <span className="count">{counts[f.key]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {!shown.length ? <p className="mood-muted chart-empty">No account matches.</p> : (
                        <div className="mood-table-wrap">
                            <table className="mood-table manage-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Joined</th>
                                        <th>Last active</th>
                                        <th>Scans</th>
                                        <th>Listens</th>
                                        <th>Playlists</th>
                                        <th>Liked</th>
                                        <th><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shown.map((u) => (
                                        <tr key={u.id} className={u.locked ? 'is-locked' : ''}>
                                            <td>
                                                <Link className="user-name" to={`/admin/users/${u.id}`}>
                                                    <UserAvatar username={u.username} size={28} />
                                                    {u.username}
                                                    {u.id === me?.id && <span className="sample-tag">you</span>}
                                                    {u.sample && <span className="sample-tag" title="Generated by npm run seed-demo, not a real person">sample</span>}
                                                </Link>
                                            </td>
                                            <td><span className={`role-tag ${u.role}`}>{u.role === 'admin' ? 'Admin' : 'User'}</span></td>
                                            <td><span className={`state-tag ${u.locked ? 'locked' : 'active'}`}>{u.locked ? 'Locked' : 'Active'}</span></td>
                                            <td>{joined(u.createdAt)}</td>
                                            <td>{lastActive(u.lastAt)}</td>
                                            <td>{u.scans}</td>
                                            <td>{u.listens}</td>
                                            <td>{u.playlists}</td>
                                            <td>{u.likes}</td>
                                            <td>
                                                <button className="ua-btn" onClick={() => setManaging(u.id)}>Manage</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {managed && (
                <AdminDialog title={`Manage ${managed.username}`} onClose={() => setManaging(null)}>
                    <p className="ad-text">
                        {managed.role === 'admin' ? 'Admin' : 'User'} · {managed.locked ? 'Locked' : 'Active'} · joined {joined(managed.createdAt)}.{' '}
                        <Link to={`/admin/users/${managed.id}`}>View their data</Link>
                    </p>
                    <UserActions user={managed} meId={me?.id} onChange={replace} onDeleted={drop} />
                </AdminDialog>
            )}
        </div>
    );
};

export default AdminUsersPage;

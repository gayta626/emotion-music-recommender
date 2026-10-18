import { useState } from 'react';
import api from '../../api';
import AdminDialog from './AdminDialog';

// Các nút quản lý 1 tài khoản (bảng Users + trang chi tiết): đổi quyền, khoá / mở khoá, đặt lại mật khẩu, xoá.
// Luật (không tự đổi / khoá / xoá mình, admin phải bị gỡ quyền trước khi khoá / xoá) do backend quyết định;
// ở đây chỉ làm mờ nút + ghi lý do để admin khỏi bấm rồi mới thấy lỗi.
// onChange(user) sau khi sửa, onDeleted(user) sau khi xoá.
const UserActions = ({ user, meId, onChange, onDeleted, compact = false }) => {
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [dialog, setDialog] = useState(null);   // 'delete' | { password }
    const [confirmName, setConfirmName] = useState('');
    const [copied, setCopied] = useState(false);

    const self = user.id === meId;
    const isAdmin = user.role === 'admin';
    const guardedReason = self ? "You can't do this to your own account" : isAdmin ? 'Remove the admin role first' : '';

    const run = async (key, request, done) => {
        setBusy(key);
        setError('');
        try {
            const res = await request();
            done(res.data);
        } catch (err) {
            setError(err.response?.data?.error || "Couldn't reach the server");
        } finally {
            setBusy('');
        }
    };

    const patch = (key, body) => run(key, () => api.patch(`/admin/users/${user.id}`, body), (u) => onChange({ ...user, ...u }));
    const reset = () => run('reset', () => api.post(`/admin/users/${user.id}/reset-password`), (d) => { setCopied(false); setDialog({ password: d.password }); });
    const remove = () => run('delete', () => api.delete(`/admin/users/${user.id}`), () => { setDialog(null); onDeleted(user); });

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(dialog.password);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className={`user-actions ${compact ? 'compact' : ''}`}>
            <button
                className="ua-btn"
                disabled={self || !!busy}
                title={self ? "You can't change your own role" : undefined}
                onClick={() => patch('role', { role: isAdmin ? 'user' : 'admin' })}
            >{busy === 'role' ? '…' : isAdmin ? 'Remove admin' : 'Make admin'}</button>
            <button
                className="ua-btn"
                disabled={!!guardedReason || !!busy}
                title={guardedReason || undefined}
                onClick={() => patch('lock', { locked: !user.locked })}
            >{busy === 'lock' ? '…' : user.locked ? 'Unlock' : 'Lock'}</button>
            <button className="ua-btn" disabled={!!busy} onClick={reset}>{busy === 'reset' ? '…' : 'Reset password'}</button>
            <button
                className="ua-btn danger"
                disabled={!!guardedReason || !!busy}
                title={guardedReason || undefined}
                onClick={() => { setConfirmName(''); setError(''); setDialog('delete'); }}
            >Delete</button>
            {error && !dialog && <p className="ua-error" role="alert">{error}</p>}

            {dialog === 'delete' && (
                <AdminDialog title={`Delete ${user.username}?`} onClose={() => setDialog(null)}>
                    <p className="ad-text">
                        This permanently removes the account and everything that belongs to it: scan history, listening scores,
                        playlists, liked songs and music taste. It can't be undone.
                    </p>
                    <label className="ad-field">
                        <span>Type <b>{user.username}</b> to confirm</span>
                        <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" autoFocus />
                    </label>
                    {error && <p className="ua-error" role="alert">{error}</p>}
                    <div className="ad-actions">
                        <button className="ua-btn" onClick={() => setDialog(null)}>Cancel</button>
                        <button className="ua-btn danger solid" disabled={confirmName.trim().toLowerCase() !== user.username || !!busy} onClick={remove}>
                            {busy === 'delete' ? 'Deleting…' : 'Delete account'}
                        </button>
                    </div>
                </AdminDialog>
            )}

            {dialog?.password && (
                <AdminDialog title="New temporary password" onClose={() => setDialog(null)}>
                    <p className="ad-text">
                        Give this password to <b>{user.username}</b>. It is shown only once — NYX stores just a scrambled version (bcrypt hash).
                        The old password no longer works.
                    </p>
                    <div className="ad-password">
                        <code>{dialog.password}</code>
                        <button className="ua-btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
                    </div>
                    <div className="ad-actions">
                        <button className="ua-btn solid" onClick={() => setDialog(null)}>Done</button>
                    </div>
                </AdminDialog>
            )}
        </div>
    );
};

export default UserActions;

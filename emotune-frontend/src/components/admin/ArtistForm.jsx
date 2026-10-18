import { useState } from 'react';
import api from '../../api';
import AdminDialog from './AdminDialog';

// Form thêm / sửa 1 ca sĩ (trang Library, tab Artists): tên + ảnh lớn (avatars/photos/).
const ArtistForm = ({ artist, onClose, onSaved }) => {
    const editing = !!artist;
    const [name, setName] = useState(artist?.name || '');
    const [photo, setPhoto] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        const body = new FormData();
        if (!editing || name !== artist.name) body.append('name', name);
        if (photo) body.append('photo', photo);
        setBusy(true);
        setError('');
        try {
            if (editing) await api.patch(`/admin/artists/${artist.id}`, body);
            else await api.post('/admin/artists', body);
            // thêm ca sĩ không có ảnh -> server chạy nền fetch-images tìm ảnh
            onSaved(editing ? `Saved ${name}.` : `Added ${name}.`, !editing && !photo);
        } catch (err) {
            setError(err.response?.data?.error || "Couldn't reach the server");
            setBusy(false);
        }
    };

    return (
        <AdminDialog title={editing ? `Edit ${artist.name}` : 'Add an artist'} onClose={onClose}>
            <form className="ad-form" onSubmit={submit}>
                <label className="ad-field full">
                    <span>Name *</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
                </label>
                <label className="ad-field full">
                    <span>{editing ? 'New photo' : 'Photo'}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files[0])} />
                    <small>Square, at least 300 × 300 px. {editing ? 'Empty = keep the current photo.' : 'Empty = NYX looks for a photo online.'}</small>
                </label>
                {error && <p className="ua-error full" role="alert">{error}</p>}
                <div className="ad-actions full">
                    <button type="button" className="ua-btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="ua-btn solid" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save' : 'Add artist'}</button>
                </div>
            </form>
        </AdminDialog>
    );
};

export default ArtistForm;

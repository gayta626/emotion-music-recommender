import { useState } from 'react';
import api from '../../api';
import AdminDialog from './AdminDialog';
import { EMOTIONS } from '../../utils/moodStats';
import { plain } from '../../utils/text';

// Form thêm / sửa 1 bài (trang Library).
// Thêm bài = quy trình của `npm run import-music` cho 1 file:
//   chọn mp3 -> POST /admin/songs/analyze (đọc thẻ ID3, tìm lời LRCLIB, đoán vibe + thể loại) -> điền sẵn để admin xem lại
//   -> POST /admin/songs (lưu mp3 + bìa trong file + lời, ca sĩ / thể loại mới tự tạo) -> server tự chạy nền
//   fetch-images / fetch-song-info / fetch-mv lấy ảnh ca sĩ, bìa, album, MV còn thiếu.
// song có -> sửa (chỉ gửi trường đã đổi; không chọn file mới thì giữ file cũ).
const FIELDS = ['title', 'artist', 'genre', 'emotion', 'energy', 'album', 'youtube_id'];
const LABEL = Object.fromEntries(EMOTIONS.map((e) => [e.key, e.label]));

const initial = (song) => ({
    title: song?.title || '',
    artist: song?.artist || '',
    genre: song?.genre || '',
    emotion: song?.emotion || 'happy',
    energy: song?.energy == null ? '' : String(song.energy),
    album: song?.album || '',
    youtube_id: song?.youtube_id || '',
});

const fromAnalysis = (a) => ({
    title: a.title || '',
    artist: a.artist || '',
    genre: a.genre || '',
    emotion: a.emotion,
    energy: '',
    album: a.album || '',
    youtube_id: '',
});

// "Guessed from the lyrics (buồn, nước mắt…) · 58% sure" / chưa chắc -> nhắc admin xem lại
const vibeHint = (v) => {
    if (!v || v.source === 'default') return { text: 'No clue in the title or lyrics — please pick the vibe yourself.', warn: true };
    const from = v.source === 'title' ? 'the title' : 'the lyrics';
    const words = v.evidence.length ? ` (${v.evidence.join(', ')})` : '';
    return { text: `Guessed from ${from}${words} · ${Math.round(v.confidence * 100)}% sure${v.review ? ' — please check' : ''}.`, warn: v.review };
};

const SongForm = ({ song, artists, genres, onClose, onSaved }) => {
    const editing = !!song;
    const [form, setForm] = useState(() => initial(song));
    const [start, setStart] = useState(() => initial(song));
    const [files, setFiles] = useState({});
    const [analysis, setAnalysis] = useState(null);
    const [reading, setReading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const pick = (k) => (e) => setFiles((f) => ({ ...f, [k]: e.target.files[0] }));

    // chọn mp3 -> đọc thẻ + đoán sẵn (giống bước xem trước của import-music)
    const pickMp3 = async (e) => {
        const file = e.target.files[0];
        setFiles((f) => ({ ...f, file }));
        setAnalysis(null);
        setError('');
        if (!file) return;
        const body = new FormData();
        body.append('file', file);
        setReading(true);
        try {
            const res = await api.post('/admin/songs/analyze', body);
            setAnalysis(res.data);
            const next = fromAnalysis(res.data);
            setForm(next);
            setStart(next);
        } catch (err) {
            setError(err.response?.data?.error || "Couldn't read this file");
        } finally {
            setReading(false);
        }
    };

    const isNewArtist = form.artist.trim() && !artists.some((a) => plain(a.name) === plain(form.artist.trim()));
    const isNewGenre = form.genre.trim() && !genres.some((g) => g.name === form.genre.trim().toLowerCase());
    // bài trùng chỉ tính khi tên bài + ca sĩ vẫn như file (admin sửa tên thì server kiểm tra lại)
    const duplicate = analysis?.duplicate && form.title === start.title && form.artist === start.artist ? analysis.duplicate : null;
    const hint = analysis && form.emotion === analysis.emotion ? vibeHint(analysis.vibe) : null;
    const ready = editing || (analysis && !reading);

    const submit = async (e) => {
        e.preventDefault();
        if (!editing && !files.file) {
            setError('Choose an MP3 file');
            return;
        }
        const body = new FormData();
        FIELDS.forEach((k) => {
            if (!editing || form[k] !== start[k]) body.append(k, form[k]);
        });
        Object.entries(files).forEach(([k, f]) => { if (f) body.append(k, f); });
        setBusy(true);
        setError('');
        try {
            if (editing) {
                await api.patch(`/admin/songs/${song.id}`, body);
                onSaved(`Saved “${form.title}”.`, isNewArtist);
            } else {
                await api.post('/admin/songs', body);
                onSaved(`Added “${form.title}”.`, true);
            }
        } catch (err) {
            setError(err.response?.data?.error || "Couldn't reach the server");
            setBusy(false);
        }
    };

    return (
        <AdminDialog title={editing ? `Edit “${song.title}”` : 'Add a song'} onClose={onClose} wide>
            <form className="ad-form" onSubmit={submit}>
                {!editing && (
                    <label className="ad-field full">
                        <span>MP3 file *</span>
                        <input type="file" accept=".mp3,audio/mpeg" onChange={pickMp3} required />
                        <small>
                            {reading ? 'Reading the tags and looking for lyrics…'
                                : analysis ? `Read from the file · ${Math.floor(analysis.duration / 60)}:${String(analysis.duration % 60).padStart(2, '0')}. Check the fields below.`
                                    : 'NYX reads the title, artist and cover from the file, finds lyrics and guesses the vibe — like npm run import-music.'}
                        </small>
                    </label>
                )}

                {duplicate && (
                    <p className="ad-warn full" role="alert">
                        “{duplicate.title}”{duplicate.artist ? ` by ${duplicate.artist}` : ''} is already in the library. Change the title or artist if this is a different song.
                    </p>
                )}

                <fieldset className="ad-fields full" disabled={!ready}>
                    <label className="ad-field full">
                        <span>Title *</span>
                        <input value={form.title} onChange={set('title')} maxLength={200} required />
                    </label>
                    <label className="ad-field">
                        <span>Artist</span>
                        <input value={form.artist} onChange={set('artist')} list="admin-artists" maxLength={100} />
                        <small>{isNewArtist ? 'New artist — NYX will look for a photo online.' : 'Pick from the list or type a new name.'}</small>
                    </label>
                    <label className="ad-field">
                        <span>Genre</span>
                        <input value={form.genre} onChange={set('genre')} list="admin-genres" maxLength={30} />
                        <small>{isNewGenre ? 'New genre — it will be created.' : analysis && form.genre === analysis.genre ? 'Guessed from the file tag / artist.' : 'Pick from the list or type a new one.'}</small>
                    </label>
                    <label className="ad-field">
                        <span>Vibe *</span>
                        <select value={form.emotion} onChange={set('emotion')}>
                            {EMOTIONS.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
                        </select>
                        <small className={hint?.warn ? 'warn' : ''}>
                            {hint ? hint.text : analysis ? `Changed from ${LABEL[analysis.emotion]} (NYX's guess).` : 'The mood this song fits — NYX picks it for this mood.'}
                        </small>
                    </label>
                    <label className="ad-field">
                        <span>Energy (0–1)</span>
                        <input type="number" min="0" max="1" step="0.05" value={form.energy} onChange={set('energy')} placeholder="Auto from vibe" />
                    </label>
                    <label className="ad-field">
                        <span>Album</span>
                        <input value={form.album} onChange={set('album')} maxLength={200} placeholder={editing ? '' : 'Empty = looked up on iTunes'} />
                    </label>
                    <label className="ad-field">
                        <span>Music video</span>
                        <input
                            value={form.youtube_id}
                            onChange={set('youtube_id')}
                            placeholder={!editing && analysis?.mvSearch ? 'Empty = NYX searches YouTube' : 'YouTube link or video id'}
                        />
                    </label>
                    <div className="ad-field">
                        <span>{editing ? 'New cover' : 'Cover'}</span>
                        {analysis?.coverPreview && !files.cover && (
                            <span className="ad-cover"><img src={analysis.coverPreview} alt="" />From the MP3 file</span>
                        )}
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick('cover')} aria-label={editing ? 'New cover' : 'Cover'} />
                        <small>
                            {editing ? (song.cover ? 'Leave empty to keep the current cover.' : 'Empty = NYX draws one from the vibe.')
                                : analysis?.coverPreview ? 'Choose a file only to replace it.' : 'Empty = NYX looks for the cover online.'}
                        </small>
                    </div>
                    <div className="ad-field">
                        <span>{editing ? 'New lyrics (.lrc)' : 'Lyrics (.lrc)'}</span>
                        <input type="file" accept=".lrc" onChange={pick('lyrics')} aria-label={editing ? 'New lyrics' : 'Lyrics'} />
                        <small>
                            {editing ? 'Synced lyrics enable the lyrics screen + karaoke.'
                                : !analysis ? 'Found automatically on LRCLIB when possible.'
                                    : analysis.lyrics === 'synced' ? 'Found synced lyrics on LRCLIB ✓ — choose a file only to replace them.'
                                        : analysis.lyrics === 'plain' ? 'Found plain lyrics (no timing) on LRCLIB.'
                                            : 'No lyrics found on LRCLIB — attach an .lrc file if you have one.'}
                        </small>
                    </div>
                </fieldset>

                <datalist id="admin-artists">{artists.map((a) => <option key={a.id} value={a.name} />)}</datalist>
                <datalist id="admin-genres">{genres.map((g) => <option key={g.id} value={g.name} />)}</datalist>

                {error && <p className="ua-error full" role="alert">{error}</p>}
                <div className="ad-actions full">
                    <button type="button" className="ua-btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="ua-btn solid" disabled={busy || !ready || !!duplicate}>
                        {busy ? 'Saving…' : editing ? 'Save' : 'Add song'}
                    </button>
                </div>
            </form>
        </AdminDialog>
    );
};

export default SongForm;

import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import ArtistAvatar from '../components/ArtistAvatar';
import SongThumb from '../components/SongThumb';
import AdminDialog from '../components/admin/AdminDialog';
import SongForm from '../components/admin/SongForm';
import ArtistForm from '../components/admin/ArtistForm';
import { AdminTabs } from '../components/admin/AdminLayout';
import { EMOTIONS } from '../utils/moodStats';
import { formatDuration } from '../utils/format';
import { plain } from '../utils/text';

// Quản lý kho nhạc (/admin/library): thêm bài bằng cách tải mp3 lên, sửa thông tin / bìa / lời / MV, xoá bài;
// thêm / sửa / xoá ca sĩ. Thay cho chạy `npm run import-music` với từng bài lẻ. Số liệu: GET /admin/library.
const LABEL = Object.fromEntries(EMOTIONS.map((e) => [e.key, e.label]));
const added = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const AdminLibraryPage = () => {
    const [lib, setLib] = useState(null);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const [tab, setTab] = useState('songs');
    const [query, setQuery] = useState('');
    const [vibe, setVibe] = useState('all');
    const [dialog, setDialog] = useState(null);   // { kind: 'song'|'artist'|'delete-song'|'delete-artist', item? }
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [dialogError, setDialogError] = useState('');

    const [enrich, setEnrich] = useState(null);   // trạng thái script chạy nền (fetch-images / song-info / mv)
    const [showLog, setShowLog] = useState(false);
    const [sawRun, setSawRun] = useState(false);   // chỉ báo 'xong' cho lượt chạy admin thấy trên trang này

    useEffect(() => {
        let alive = true;
        api.get('/admin/library')
            .then((res) => {
                if (!alive) return;
                setLib(res.data);
                setEnrich(res.data.enrich);
                if (res.data.enrich?.running) setSawRun(true);
                setError('');
            })
            .catch((err) => { if (alive) setError(err.response?.data?.error || "Couldn't load the library."); });
        return () => { alive = false; };
    }, [reload]);

    // script đang chạy nền -> hỏi lại mỗi 3s; xong thì tải lại kho (bìa, ảnh ca sĩ, album, MV mới)
    const enrichRunning = !!enrich?.running;
    useEffect(() => {
        if (!enrichRunning) return undefined;
        const timer = setInterval(() => {
            api.get('/admin/library/enrich')
                .then((res) => {
                    setEnrich(res.data);
                    if (!res.data.running) setReload((n) => n + 1);
                })
                .catch(() => {});
        }, 3000);
        return () => clearInterval(timer);
    }, [enrichRunning]);

    const q = plain(query.trim());
    const songs = useMemo(() => (lib?.songs || []).filter((s) => (vibe === 'all' || s.emotion === vibe)
        && (!q || plain(`${s.title} ${s.artist || ''} ${s.album || ''}`).includes(q))), [lib, q, vibe]);
    const artists = useMemo(() => (lib?.artists || []).filter((a) => !q || plain(a.name).includes(q)), [lib, q]);

    const open = (kind, item = null) => { setDialogError(''); setDialog({ kind, item }); };
    // fetching = server vừa chạy nền các script lấy ảnh / album / MV -> hiện dải trạng thái ngay
    const saved = (message, fetching = false) => {
        setDialog(null);
        setNotice(message);
        if (fetching) {
            setEnrich((s) => ({ ...s, running: true, step: null }));
            setSawRun(true);
        }
        setReload((n) => n + 1);
    };

    const remove = async () => {
        const { kind, item } = dialog;
        setBusy(true);
        setDialogError('');
        try {
            await api.delete(kind === 'delete-song' ? `/admin/songs/${item.id}` : `/admin/artists/${item.id}`);
            saved(`Deleted ${kind === 'delete-song' ? `“${item.title}”` : item.name}.`);
        } catch (err) {
            setDialogError(err.response?.data?.error || "Couldn't reach the server");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mood-page stats-page admin-page admin-manage">
            <AdminTabs />
            <header className="mood-head stats-head">
                <div>
                    <span className="mood-eyebrow">Admin · Library</span>
                    <h1>Music library</h1>
                    <p>
                        {lib ? `${lib.songs.length} songs · ${lib.artists.length} artists. ` : ''}
                        Upload an MP3 to add a song — NYX reads its tags, finds lyrics, guesses the vibe, then fetches the cover,
                        artist photo, album, MV and AI karaoke track like <code>npm run import-music</code>. The vibe decides which mood NYX plays it for.
                    </p>
                </div>
                <button className="admin-primary" onClick={() => open(tab === 'songs' ? 'song' : 'artist')} disabled={!lib}>
                    + {tab === 'songs' ? 'Add song' : 'Add artist'}
                </button>
            </header>

            {error && <p className="stats-error">{error} <button className="table-toggle" onClick={() => setReload((n) => n + 1)}>Try again</button></p>}
            {notice && <p className="admin-notice" role="status">{notice}</p>}
            {enrich && (enrich.running || sawRun) && (
                <section className={`enrich-bar ${enrich.running ? 'is-running' : ''}`} aria-live="polite">
                    <div>
                        <b>
                            {enrich.running
                                ? `Fetching artist photos, covers, albums${enrich.mvSearch ? ', MVs' : ''}${enrich.karaoke ? ' and making karaoke tracks (AI vocal removal)' : ''} in the background…`
                                : `Background fetch finished${enrich.results?.some((r) => !r.ok) ? ' with errors' : ''}`}
                        </b>
                        <small>
                            {enrich.running
                                ? (enrich.step ? `Running ${enrich.step.replace('.js', '')}` : 'Starting…')
                                : `Ran ${enrich.results?.map((r) => r.script.replace('.js', '')).join(', ')} · only fills what is missing.`}
                            {!enrich.mvSearch && ' No YOUTUBE_API_KEY in .env, so MVs are not searched.'}
                            {!enrich.karaoke && ' No .venv-karaoke on the server, so new songs use the basic karaoke (no scoring).'}
                        </small>
                    </div>
                    {enrich.log?.length > 0 && (
                        <button className="table-toggle" onClick={() => setShowLog((v) => !v)} aria-expanded={showLog}>
                            {showLog ? 'Hide log' : 'Show log'}
                        </button>
                    )}
                    {showLog && <pre className="enrich-log">{enrich.log.join('\n')}</pre>}
                </section>
            )}

            {!lib ? (!error && <p className="mood-muted">Loading…</p>) : (
                <section className="stats-card">
                    <div className="manage-bar">
                        <div className="stats-range" role="tablist" aria-label="Library">
                            <button role="tab" aria-selected={tab === 'songs'} aria-pressed={tab === 'songs'} onClick={() => setTab('songs')}>
                                Songs <span className="count">{lib.songs.length}</span>
                            </button>
                            <button role="tab" aria-selected={tab === 'artists'} aria-pressed={tab === 'artists'} onClick={() => setTab('artists')}>
                                Artists <span className="count">{lib.artists.length}</span>
                            </button>
                        </div>
                        <input
                            className="admin-search"
                            type="search"
                            placeholder={tab === 'songs' ? 'Search title, artist, album…' : 'Search artist…'}
                            aria-label="Search library"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {tab === 'songs' && (
                            <select className="admin-select" value={vibe} onChange={(e) => setVibe(e.target.value)} aria-label="Filter by vibe">
                                <option value="all">All vibes</option>
                                {EMOTIONS.map((e) => (
                                    <option key={e.key} value={e.key}>{e.label} ({lib.songs.filter((s) => s.emotion === e.key).length})</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {tab === 'songs' ? (
                        !songs.length ? <p className="mood-muted chart-empty">No song matches.</p> : (
                            <div className="mood-table-wrap">
                                <table className="mood-table manage-table library-table">
                                    <thead>
                                        <tr>
                                            <th>Song</th><th>Vibe</th><th>Genre</th><th>Length</th><th>MV</th>
                                            <th>Plays</th><th>Liked</th><th>Added</th><th><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {songs.map((s) => (
                                            <tr key={s.id}>
                                                <td>
                                                    <span className="song-row">
                                                        <SongThumb key={s.cover || 'none'} className="lib-thumb" song={s} />
                                                        <span><b>{s.title}</b><small>{s.artist || 'Unknown artist'}{s.album ? ` · ${s.album}` : ''}</small></span>
                                                    </span>
                                                </td>
                                                <td><span className={`vibe-tag ${s.emotion}`}>{LABEL[s.emotion]}</span></td>
                                                <td>{s.genre || '—'}</td>
                                                <td>{s.duration ? formatDuration(s.duration) : '—'}</td>
                                                <td>{s.youtube_id ? <span className="yes" title={s.youtube_id}>Yes</span> : '—'}</td>
                                                <td>{s.plays}</td>
                                                <td>{s.likes}</td>
                                                <td>{added(s.added_at)}</td>
                                                <td>
                                                    <div className="user-actions compact">
                                                        <button className="ua-btn" onClick={() => open('song', s)}>Edit</button>
                                                        <button className="ua-btn danger" onClick={() => open('delete-song', s)}>Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        !artists.length ? <p className="mood-muted chart-empty">No artist matches.</p> : (
                            <ul className="artist-grid">
                                {artists.map((a) => (
                                    <li key={a.id} className="artist-item">
                                        <ArtistAvatar key={a.photo || a.avatar || 'none'} className="lib-artist" name={a.name} avatar={a.photo || a.avatar} />
                                        <b>{a.name}</b>
                                        <small>{a.songs} song{a.songs === 1 ? '' : 's'}</small>
                                        <div className="user-actions compact">
                                            <button className="ua-btn" onClick={() => open('artist', a)}>Edit</button>
                                            <button
                                                className="ua-btn danger"
                                                disabled={a.songs > 0}
                                                title={a.songs > 0 ? 'Move or delete this artist’s songs first' : undefined}
                                                onClick={() => open('delete-artist', a)}
                                            >Delete</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )
                    )}
                </section>
            )}

            {dialog?.kind === 'song' && (
                <SongForm song={dialog.item} artists={lib.artists} genres={lib.genres} onClose={() => setDialog(null)} onSaved={saved} />
            )}
            {dialog?.kind === 'artist' && (
                <ArtistForm artist={dialog.item} onClose={() => setDialog(null)} onSaved={saved} />
            )}
            {(dialog?.kind === 'delete-song' || dialog?.kind === 'delete-artist') && (
                <AdminDialog
                    title={dialog.kind === 'delete-song' ? `Delete “${dialog.item.title}”?` : `Delete ${dialog.item.name}?`}
                    onClose={() => setDialog(null)}
                >
                    <p className="ad-text">
                        {dialog.kind === 'delete-song'
                            ? <>The song leaves the library and every playlist, liked list and listening score ({dialog.item.plays} plays, {dialog.item.likes} likes).
                                Past scan history keeps the row without the song. The file <code>music/{dialog.item.file_path}</code> stays on disk.</>
                            : 'The artist is removed from the library and from everyone’s taste survey.'}
                    </p>
                    {dialogError && <p className="ua-error" role="alert">{dialogError}</p>}
                    <div className="ad-actions">
                        <button className="ua-btn" onClick={() => setDialog(null)}>Cancel</button>
                        <button className="ua-btn danger solid" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete'}</button>
                    </div>
                </AdminDialog>
            )}
        </div>
    );
};

export default AdminLibraryPage;

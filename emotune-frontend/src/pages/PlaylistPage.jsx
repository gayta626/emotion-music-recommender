import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import SongThumb from '../components/SongThumb';
import { useAuth } from '../contexts/authContext';
import { usePlayback } from '../contexts/playbackContext';
import { plain } from '../utils/text';
import SearchIcon from '../assets/icons/search_icon.svg?react';
import './PlaylistPage.scss';

// Trang 1 playlist (theo Figma "Page playlist khi da co nhac"):
// dau trang (anh bia, ten bam de doi, nut Play) -> bang bai hat -> tim bai de them -> "Recommended" goi y theo gu cua playlist

// Goi y bai hop voi playlist: cung ca si +2, cung the loai +1, cung vibe +0.5 (chi lay bai chua co trong playlist)
const recommend = (allSongs, playlistSongs, limit = 4) => {
    const inList = new Set(playlistSongs.map((s) => s.id));
    const artists = new Set(playlistSongs.map((s) => s.artist_id).filter(Boolean));
    const genres = new Set(playlistSongs.map((s) => s.genre_id).filter(Boolean));
    const vibes = new Set(playlistSongs.map((s) => s.emotion));
    return allSongs
        .filter((s) => !inList.has(s.id))
        .map((s) => {
            const reasons = [];
            let score = 0;
            if (artists.has(s.artist_id)) { score += 2; reasons.push('Same artist'); }
            if (genres.has(s.genre_id)) { score += 1; reasons.push(`Same genre · ${s.genre}`); }
            if (vibes.has(s.emotion)) { score += 0.5; reasons.push(`Same vibe · ${s.emotion}`); }
            return { song: s, score, reason: reasons[0] };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const SongCell = ({ song }) => (
    <div className="song-cell">
        <SongThumb className="song-thumb" song={song} />
        <div className="song-text">
            <span className="song-title">{song.title}</span>
            <span className="song-artist">{song.artist || 'Unknown artist'}</span>
        </div>
    </div>
)

const PlaylistView = ({ id }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { playPlaylist, refreshPlaylists, nowPlaying } = usePlayback();
    const [playlist, setPlaylist] = useState(null);   // { id, name, songs }
    const [allSongs, setAllSongs] = useState([]);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const [nameError, setNameError] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const load = () => {
        api.get(`/playlists/${id}`)
            .then((res) => { setPlaylist(res.data); setError(''); })
            .catch((err) => setError(err.response?.status === 404 ? "This playlist doesn't exist." : "Couldn't load this playlist."));
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        api.get('/songs').then((res) => setAllSongs(res.data)).catch(() => { });
    }, []);

    // bam ra ngoai -> dong menu ⋯
    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [menuOpen]);

    const songs = useMemo(() => playlist?.songs ?? [], [playlist]);
    const inList = useMemo(() => new Set(songs.map((s) => s.id)), [songs]);
    const results = useMemo(() => {
        const q = plain(query.trim());
        if (!q) return [];
        return allSongs.filter((s) => plain(`${s.title} ${s.artist || ''}`).includes(q)).slice(0, 6);
    }, [allSongs, query]);
    const recommended = useMemo(() => recommend(allSongs, songs), [allSongs, songs]);

    const addSong = (songId) => {
        api.post(`/playlists/${id}/songs`, { songId })
            .then(() => { load(); refreshPlaylists(); })
            .catch(() => setError("Couldn't add this song. Try again."));
    }

    const removeSong = (songId) => {
        api.delete(`/playlists/${id}/songs/${songId}`)
            .then(() => { load(); refreshPlaylists(); })
            .catch(() => setError("Couldn't remove this song. Try again."));
    }

    const startRename = () => {
        setNameDraft(playlist.name);
        setNameError('');
        setEditing(true);
        setMenuOpen(false);
    }

    const saveName = () => {
        const name = nameDraft.trim();
        if (!name || name === playlist.name) { setEditing(false); return; }
        api.patch(`/playlists/${id}`, { name })
            .then((res) => {
                setPlaylist((p) => ({ ...p, name: res.data.name }));
                setEditing(false);
                refreshPlaylists();
            })
            .catch((err) => setNameError(err.response?.data?.error || "Couldn't rename this playlist."));
    }

    const deletePlaylist = () => {
        setMenuOpen(false);
        if (!window.confirm(`Delete "${playlist.name}"? Its song list will be removed.`)) return;
        api.delete(`/playlists/${id}`)
            .then(() => { refreshPlaylists(); navigate('/'); })
            .catch(() => setError("Couldn't delete this playlist."));
    }

    if (error && !playlist) return <div className="playlist-page"><p className="pl-error">{error}</p></div>;
    if (!playlist) return <div className="playlist-page"><p className="pl-loading">Loading…</p></div>;

    const playingHere = nowPlaying?.playlistId === playlist.id;

    return (
        <div className="playlist-page">
            <header className="pl-hero">
                <div className="pl-cover" aria-hidden="true">♪</div>
                <div className="pl-heading">
                    <span className="pl-eyebrow">Playlist</span>
                    {editing ? (
                        <form className="pl-rename" onSubmit={(e) => { e.preventDefault(); saveName(); }}>
                            <input
                                id="playlist-name"
                                autoFocus
                                maxLength={50}
                                value={nameDraft}
                                onChange={(e) => setNameDraft(e.target.value)}
                                onBlur={saveName}
                                onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
                                aria-label="Playlist name"
                            />
                            {nameError && <span className="pl-name-error">{nameError}</span>}
                        </form>
                    ) : (
                        <h1 className="pl-name" onClick={startRename} title="Click to rename">{playlist.name}</h1>
                    )}
                    <span className="pl-meta">{user?.username} · {songs.length} {songs.length === 1 ? 'song' : 'songs'}</span>
                </div>
            </header>

            <div className="pl-actions">
                <button
                    className="pl-play"
                    disabled={songs.length === 0}
                    onClick={() => playPlaylist(playlist.id, 0)}
                    aria-label={`Play ${playlist.name}`}
                >▶</button>
                <div className="pl-more" ref={menuRef}>
                    <button className="pl-more-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="More options" aria-expanded={menuOpen}>⋯</button>
                    {menuOpen && (
                        <div className="pl-menu" role="menu">
                            <button role="menuitem" onClick={startRename}>Rename</button>
                            <button role="menuitem" className="danger" onClick={deletePlaylist}>Delete playlist</button>
                        </div>
                    )}
                </div>
            </div>

            {error && <p className="pl-error inline">{error}</p>}

            {songs.length > 0 && (
                <div className="pl-table-wrap">
                    <table className="pl-table">
                        <thead>
                            <tr>
                                <th className="col-num">#</th>
                                <th>Title</th>
                                <th className="col-genre">Genre</th>
                                <th className="col-date">Date added</th>
                                <th className="col-act"><span className="sr-only">Remove</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {songs.map((s, i) => {
                                const isNow = playingHere && nowPlaying.songId === s.id;
                                return (
                                    <tr key={s.id} className={isNow ? 'now' : ''} onDoubleClick={() => playPlaylist(playlist.id, i)}>
                                        <td className="col-num">
                                            <span className="num">{isNow ? <span className="eq" aria-label="Now playing"><i /><i /><i /></span> : i + 1}</span>
                                            <button className="row-play" onClick={() => playPlaylist(playlist.id, i)} aria-label={`Play ${s.title}`}>▶</button>
                                        </td>
                                        <td><SongCell song={s} /></td>
                                        <td className="col-genre">{s.genre}</td>
                                        <td className="col-date">{formatDate(s.added_at)}</td>
                                        <td className="col-act">
                                            <button className="row-remove" onClick={() => removeSong(s.id)} aria-label={`Remove ${s.title}`} title="Remove from playlist">✕</button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <section className="pl-find">
                <h2>Let's find something for your playlist</h2>
                <label className="pl-search">
                    <SearchIcon aria-hidden="true" />
                    <input
                        id="playlist-search"
                        type="search"
                        placeholder="Search for songs or artists"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </label>
                {query.trim() && (
                    <ul className="pl-results">
                        {results.length === 0 && <li className="pl-empty">No song matches "{query}".</li>}
                        {results.map((s) => (
                            <li key={s.id} className="pl-result">
                                <SongCell song={s} />
                                {inList.has(s.id)
                                    ? <span className="added">Added</span>
                                    : <button className="pl-add" onClick={() => addSong(s.id)}>Add</button>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {recommended.length > 0 && (
                <section className="pl-recommend">
                    <h2>Recommended</h2>
                    <p className="pl-sub">Based on what's in this playlist</p>
                    <ul className="pl-results">
                        {recommended.map(({ song, reason }) => (
                            <li key={song.id} className="pl-result">
                                <SongCell song={song} />
                                <span className="pl-reason">{reason}</span>
                                <button className="pl-add" onClick={() => addSong(song.id)}>Add</button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}

// key={id}: sang playlist khac -> React tao trang moi tu dau (state cu nhu o tim kiem, dang doi ten bi xoa sach)
const PlaylistPage = () => {
    const { id } = useParams();
    return <PlaylistView key={id} id={id} />
}

export default PlaylistPage

// Cac phan noi tren trinh phat: anh bia, the "Up next", cot hang doi, menu nut ☰
import { useEffect, useRef, useState } from 'react'
import api from '../api'
import { API_URL } from '../config'
import { usePlayback } from '../contexts/playbackContext'

const UP_NEXT_SECONDS = 15;   // con bao nhieu giay thi the "Up next" bat dau hien
const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R;

const avatarUrl = (song) => song?.artist_avatar ? `${API_URL}/avatars/${song.artist_avatar}` : null;

// anh bia = anh ca si; ca si chua co anh (hoac file loi) -> o gradient co not nhac
export const Cover = ({ src, className }) => {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return <div className={`${className} cover-fallback`} aria-hidden="true">♪</div>
    }
    return <img className={className} src={src} alt="" onError={() => setFailed(true)} />
}

// Giong YouTube: gan het bai thi the bai tiep theo hien mo dan, vong tron dem nguoc quanh anh.
// Chi dung o che do playlist (che do cam xuc chua biet bai sau, AI chon sau khi quet lai).
export const UpNextCard = ({ remaining, duration, nextSong, onPlayNow }) => {
    const [dismissed, setDismissed] = useState(false);
    if (dismissed || !duration || duration < UP_NEXT_SECONDS * 2 || remaining > UP_NEXT_SECONDS) return null;

    // 0 -> 1 trong 15 giay cuoi: cang gan het bai cang ro
    const progress = Math.min(1, Math.max(0, 1 - remaining / UP_NEXT_SECONDS));
    const style = {
        opacity: (0.12 + 0.88 * Math.min(1, progress * 1.6)).toFixed(3),
        transform: `translateY(${((1 - progress) * 12).toFixed(1)}px)`,
    };
    const seconds = Math.max(0, Math.ceil(remaining));

    // bai cuoi playlist -> bao se quay ve che do cam xuc
    if (!nextSong) {
        return (
            <div className="up-next end" style={style} role="status">
                <div className="up-next-text">
                    <div className="up-next-label">End of playlist · {seconds}s</div>
                    <div className="up-next-title">Next song picked from your mood</div>
                </div>
                <button className="up-next-close" onClick={() => setDismissed(true)} aria-label="Hide">✕</button>
            </div>
        )
    }

    return (
        <div className="up-next" style={style}>
            <button className="up-next-main" onClick={onPlayNow} aria-label={`Play ${nextSong.title} now`}>
                <span className="up-next-thumb">
                    <Cover className="up-next-cover" src={avatarUrl(nextSong)} />
                    {/* vong dem nguoc: day dan khi sap chuyen bai */}
                    <svg className="up-next-ring" viewBox="0 0 68 68" aria-hidden="true">
                        <circle cx="34" cy="34" r={RING_R} className="ring-track" />
                        <circle cx="34" cy="34" r={RING_R} className="ring-fill"
                            strokeDasharray={RING_C}
                            strokeDashoffset={(RING_C * (1 - progress)).toFixed(2)} />
                    </svg>
                </span>
                <span className="up-next-text">
                    <span className="up-next-label">Up next · {seconds}s</span>
                    <span className="up-next-title">{nextSong.title}</span>
                    <span className="up-next-artist">{nextSong.artist || "Unknown artist"}</span>
                </span>
            </button>
            <button className="up-next-close" onClick={() => setDismissed(true)} aria-label="Hide">✕</button>
        </div>
    )
}

// Cot hang doi (mo tu menu ☰ -> "View playlist"): bai dang phat + cac bai con lai
export const QueuePanel = ({ playlist, onJump, onClose }) => {
    const current = playlist.songs[playlist.index];
    const upcoming = playlist.songs.slice(playlist.index + 1);

    return (
        <aside className="queue-panel" aria-label="Queue">
            <div className="queue-head">
                <h3>Queue</h3>
                <button className="queue-close" onClick={onClose} aria-label="Close queue">✕</button>
            </div>

            <div className="queue-group">Now playing</div>
            <div className="queue-item playing">
                <Cover className="queue-cover" src={avatarUrl(current)} />
                <span className="queue-text">
                    <span className="queue-title">{current.title}</span>
                    <span className="queue-artist">{current.artist || "Unknown artist"}</span>
                </span>
            </div>

            <div className="queue-group">Next from {playlist.name}</div>
            {upcoming.length === 0 && <div className="queue-empty">This is the last song. After it, NYX picks songs from your mood.</div>}
            {upcoming.map((song, i) => (
                <button className="queue-item" key={song.id} onClick={() => onJump(playlist.index + 1 + i)}>
                    <Cover className="queue-cover" src={avatarUrl(song)} />
                    <span className="queue-text">
                        <span className="queue-title">{song.title}</span>
                        <span className="queue-artist">{song.artist || "Unknown artist"}</span>
                    </span>
                </button>
            ))}
        </aside>
    )
}

// Menu nut ☰: dang phat playlist -> "View playlist"; khong -> "Add to playlist"
export const QueueMenu = ({ inPlaylist, songId, onViewPlaylist, onClose }) => {
    const [step, setStep] = useState("main");     // main -> pick (chon playlist de them)
    const [playlists, setPlaylists] = useState([]);
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const menuRef = useRef(null);
    const { refreshPlaylists } = usePlayback();

    // bam ra ngoai hoac Esc -> dong menu
    useEffect(() => {
        const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    const openPicker = () => {
        setStep("pick");
        setStatus("");
        // GET /playlists tu tao "My Playlist" neu nguoi dung chua co playlist nao
        api.get("/playlists")
            .then((res) => setPlaylists(res.data))
            .catch(() => setStatus("Couldn't load your playlists."));
    }

    const addTo = (pl) => {
        setBusy(true);
        api.post(`/playlists/${pl.id}/songs`, { songId })
            .then((res) => {
                setStatus(res.data.added ? `Added to ${pl.name}` : `Already in ${pl.name}`);
                if (res.data.added) {
                    setPlaylists((list) => list.map((p) => p.id === pl.id ? { ...p, songCount: p.songCount + 1 } : p));
                }
                refreshPlaylists();
            })
            .catch(() => setStatus("Couldn't add this song. Try again."))
            .finally(() => setBusy(false));
    }

    return (
        <div className="queue-menu" ref={menuRef} role="menu">
            {step === "main" && inPlaylist && (
                <button className="menu-item" role="menuitem" onClick={onViewPlaylist}>
                    <span aria-hidden="true">☰</span> View playlist
                </button>
            )}
            {step === "main" && !inPlaylist && (
                <button className="menu-item" role="menuitem" onClick={openPicker}>
                    <span aria-hidden="true">＋</span> Add to playlist
                </button>
            )}

            {step === "pick" && (
                <>
                    <div className="menu-title">Add to playlist</div>
                    {playlists.map((pl) => (
                        <button className="menu-item" role="menuitem" key={pl.id} disabled={busy} onClick={() => addTo(pl)}>
                            <span className="menu-cover" aria-hidden="true">♪</span>
                            <span className="menu-text">{pl.name}<small>{pl.songCount} {pl.songCount === 1 ? "song" : "songs"}</small></span>
                        </button>
                    ))}
                    {status && <div className="menu-status" role="status">{status}</div>}
                </>
            )}
        </div>
    )
}

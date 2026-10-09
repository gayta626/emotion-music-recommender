import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import { activeLineIndex, lyricsFileName, parseLrc } from '../utils/lyrics';
import { hueFromText, lyricsPalette } from '../utils/coverColor';
import { useCoverColor } from '../hooks/useCoverColor';
import { Cover } from './PlayerOverlays';
import './LyricsView.scss';

// nguoi dung tu cuon loi -> 3 giay khong tu cuon theo nhac (khong giat ve dong dang hat)
const USER_SCROLL_PAUSE_MS = 3000;
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Man loi bai hat toan man hinh (Figma 91:283, kieu NhacCuaTui): nen = mau chu dao cua anh bia
// (moi bai 1 mau) + anh bia mo; trai: anh bia, ten bai, ca si; phai: loi chu to, dong dang hat sang len.
// Thanh phat duoi cung van la thanh cua MusicPlayer (nam tren lop nay).
const LyricsView = ({ song, coverSrc, currentTime, onSeek, onClose, actions }) => {
    const file = song.file_path;
    const [loaded, setLoaded] = useState({ file: null, lyrics: null });
    const listRef = useRef(null);
    const userScrollAt = useRef(0);
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; });

    // tai file loi: /lyrics/<ten file mp3>.lrc; 404 = bai chua co loi
    useEffect(() => {
        let alive = true;
        fetch(`${API_URL}/lyrics/${encodeURIComponent(lyricsFileName(song))}`)
            .then((res) => (res.ok ? res.text() : null))
            .then((text) => { if (alive) setLoaded({ file, lyrics: text ? parseLrc(text) : null }); })
            .catch(() => { if (alive) setLoaded({ file, lyrics: null }); });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- chi tai lai khi doi bai (file), khong theo object song
    }, [file]);

    const loading = loaded.file !== file;
    const lyrics = loading ? null : loaded.lyrics;
    const active = lyrics?.synced ? activeLineIndex(lyrics.lines, currentTime) : -1;

    // mau nen: anh bia co mau -> mau do; chua tai xong / anh den trang / khong co anh -> mau theo ten bai
    const cover = useCoverColor(coverSrc);
    const palette = lyricsPalette(cover && cover.s >= 0.08 ? cover : { h: hueFromText(song.title), s: 0.55 });

    // dong dang hat luon nam o khoang 1/3 tren cua cot loi
    useEffect(() => {
        const list = listRef.current;
        if (!list || !lyrics?.synced) return;
        if (Date.now() - userScrollAt.current < USER_SCROLL_PAUSE_MS) return;
        const el = active >= 0 ? list.children[active] : null;
        const top = el ? el.offsetTop + el.offsetHeight / 2 - list.clientHeight * 0.35 : 0;
        list.scrollTo({ top, behavior: reduceMotion() ? "auto" : "smooth" });
    }, [active, lyrics]);

    // Esc -> dong (tru khi menu ☰ cua thanh phat dang mo: Esc do de dong menu)
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape" && !document.querySelector(".queue-menu")) closeRef.current();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const markUserScroll = () => { userScrollAt.current = Date.now(); };
    const artist = song.artist || "Unknown artist";

    return (
        <div className="lyrics-view" style={palette} role="dialog" aria-label={`Lyrics: ${song.title}`}>
            {coverSrc && <div className="lyrics-backdrop" style={{ backgroundImage: `url("${coverSrc}")` }} aria-hidden="true" />}

            <button className="lyrics-close" onClick={onClose} aria-label="Close lyrics" title="Close lyrics (Esc)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            <div className="lyrics-content">
                <aside className="lyrics-song">
                    <Cover className="lyrics-cover" src={coverSrc} />
                    <div className="lyrics-meta">
                        <h2 className="lyrics-title">{song.title}</h2>
                        {song.artist_id
                            ? <Link className="lyrics-artist" to={`/artist/${song.artist_id}`}>{artist}</Link>
                            : <p className="lyrics-artist">{artist}</p>}
                    </div>
                    {actions && <div className="lyrics-actions">{actions}</div>}
                </aside>

                <section className="lyrics-text" aria-live="off">
                    {loading ? (
                        <p className="lyrics-note">Loading lyrics…</p>
                    ) : !lyrics || !lyrics.lines.length ? (
                        <p className="lyrics-note">
                            {song.artist ? "No lyrics for this song yet." : "Instrumental: no lyrics, just enjoy the music."}
                        </p>
                    ) : (
                        <ol ref={listRef}
                            className={`lyrics-lines ${lyrics.synced ? "is-synced" : ""}`}
                            onWheel={markUserScroll}
                            onTouchMove={markUserScroll}>
                            {lyrics.lines.map((line, i) => {
                                const state = i === active ? "is-active" : i < active ? "is-past" : "";
                                if (!line.text) return <li key={i} className={`gap ${state}`} aria-hidden="true">♪</li>;
                                return (
                                    <li key={i} className={state}>
                                        {/* loi co moc thoi gian: bam 1 dong -> tua toi dong do */}
                                        {lyrics.synced
                                            ? <button type="button" onClick={() => onSeek(line.time)}>{line.text}</button>
                                            : line.text}
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                    {lyrics && !lyrics.synced && lyrics.lines.length > 0 && (
                        <p className="lyrics-hint">These lyrics aren't time-synced with the music.</p>
                    )}
                </section>
            </div>
        </div>
    );
};

export default LyricsView;

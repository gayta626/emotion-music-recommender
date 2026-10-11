import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import { hueFromText, lyricsPalette } from '../utils/coverColor';
import { useCoverColor } from '../hooks/useCoverColor';
import { Cover } from './PlayerOverlays';
import CloseToggle from '../assets/icons/close_toggle.svg?react';
import './NowPlayingPanel.scss';

// Cot phai kieu Spotify: CHI de xem tiep MV khi nguoi dung luot sang trang khac (o /now-playing MV nam trong
// khung lon). MusicPlayer ve vao o trong cua MainLayout bang portal. Co:
//   - nut thu gon (kieu Spotify): cot bien mat, chi con dai mong co nut mo lai (NowPlayingStrip)
//   - video (khong bam duoc: lop trong suot chan chuot, dieu khien bang thanh phat duoi) + ten bai
//   - the Lyrics (loi tinh: MV co doan dao khac mp3 nen khong to theo thoi gian) + the About the artist
// Khung video VUONG: YouTube yeu cau khung trinh phat nhung toi thieu 200x200px.
const NowPlayingPanel = (props) => {
    // videoRef: o video (MV that nam o lop noi cua MusicPlayer, tu bam theo o nay); poster: anh thumbnail khi MV dung
    const { song, artist, coverSrc, context, lyrics, videoRef, poster, onCollapse, onClose, onOpenLyrics } = props;
    const artistPhoto = song.artist_avatar ? `${API_URL}/avatars/${song.artist_avatar}` : null;
    const cover = useCoverColor(coverSrc);
    const palette = lyricsPalette(cover && cover.s >= 0.08 ? cover : { h: hueFromText(song.title), s: 0.55 });
    const lines = lyrics?.lines.filter((line) => line.text) || [];

    // doi bai -> cuon the loi ve dau
    const listRef = useRef(null);
    useEffect(() => { listRef.current?.scrollTo({ top: 0 }); }, [song.id]);

    return (
        <aside className="np-panel" aria-label="Music video">
            <header className="np-head">
                <button className="np-icon-btn" onClick={onCollapse} aria-label="Collapse panel" title="Collapse">
                    <CloseToggle />
                </button>
                <span className="np-context">{context}</span>
                <button className="np-icon-btn" onClick={onClose} aria-label="Close music video" title="Close MV (back to the song)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
            </header>

            {/* ten bai nam DUOI video (quy dinh YouTube: khong ve gi de len trinh phat) */}
            <section className="np-media">
                <div ref={videoRef} className="np-video" style={{ backgroundImage: `url(${poster})` }} />
                <div className="np-titles">
                    <h3 className="np-title">{song.title}</h3>
                    <p className="np-artist">{artist}</p>
                </div>
            </section>

            {lines.length > 0 && (
                <section className="np-card np-lyrics" style={palette}>
                    <button className="np-card-head" onClick={onOpenLyrics} title="Open full lyrics">
                        <span>Lyrics</span>
                        <span className="np-card-link">Show full</span>
                    </button>
                    <ol ref={listRef} className="np-lyrics-lines">
                        {lines.map((line, i) => <li key={i}>{line.text}</li>)}
                    </ol>
                </section>
            )}

            {song.artist_id && (
                <section className="np-card np-about">
                    <span className="np-card-title">About the artist</span>
                    <Link to={`/artist/${song.artist_id}`} className="np-about-link">
                        <Cover className="np-about-photo" src={artistPhoto} />
                        <span className="np-about-name">{artist}</span>
                        <span className="np-card-link">View artist →</span>
                    </Link>
                </section>
            )}
        </aside>
    );
};

// cot phai da thu gon: dai mong o mep phai, nut ‹ o giua de mo lai (nhu Spotify)
export const NowPlayingStrip = ({ onExpand }) => (
    <div className="np-strip">
        <button className="np-icon-btn" onClick={onExpand} aria-label="Show music video panel" title="Show music video">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    </div>
);

export default NowPlayingPanel;

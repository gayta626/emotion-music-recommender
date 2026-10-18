import SongThumb from '../components/SongThumb';
import HeartIcon from '../components/HeartIcon';
import { useAuth } from '../contexts/authContext';
import { usePlayback } from '../contexts/playbackContext';
import PlayingBars from '../components/PlayingBars';
import { formatAdded, formatDuration } from '../utils/format';
import ClockIcon from '../assets/icons/clock.svg?react';
import './PlaylistPage.scss';

// Trang "Liked Songs" (/liked): cac bai da bam ♥, moi thich truoc. Dung chung giao dien trang playlist.
// Danh sach lay tu PlaybackProvider (likedSongs) -> bam ♥ o thanh phat la trang nay cap nhat ngay.
// Phat = 1 hang doi (playlistId "liked" de to sang dong dang phat), khong cham diem nhu playlist.
const LIKED_ID = 'liked';

const LikedPage = () => {
    const { user } = useAuth();
    const { likedSongs, toggleLike, playQueue, nowPlaying } = usePlayback();
    const playFrom = (i) => playQueue({ name: 'Liked Songs', songs: likedSongs, playlistId: LIKED_ID }, i);
    const playingHere = nowPlaying?.playlistId === LIKED_ID;
    const count = likedSongs.length;

    return (
        <div className="playlist-page liked-page">
            <header className="pl-hero">
                <div className="pl-cover liked-cover" aria-hidden="true"><HeartIcon filled /></div>
                <div className="pl-heading">
                    <span className="pl-eyebrow">Playlist</span>
                    <h1 className="pl-name">Liked Songs</h1>
                    <span className="pl-meta">{user?.username} · {count} {count === 1 ? 'song' : 'songs'}</span>
                </div>
            </header>

            <div className="pl-actions">
                <button className="pl-play" disabled={count === 0} onClick={() => playFrom(0)} aria-label="Play Liked Songs">▶</button>
            </div>

            {count === 0 ? (
                <p className="pl-sub liked-empty">
                    Songs you like will show up here. Tap the ♥ next to a song on the player — NYX will also pick it more often for that mood.
                </p>
            ) : (
                <div className="pl-table-wrap">
                    <table className="pl-table">
                        <thead>
                            <tr>
                                <th className="col-num">#</th>
                                <th>Title</th>
                                <th className="col-album">Album</th>
                                <th className="col-date">Date added</th>
                                <th className="col-time"><ClockIcon aria-label="Duration" /></th>
                                <th className="col-act"><span className="sr-only">Unlike</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {likedSongs.map((s, i) => {
                                const isNow = playingHere && nowPlaying.songId === s.id;
                                return (
                                    <tr key={s.id} className={isNow ? 'now' : ''} onDoubleClick={() => playFrom(i)}>
                                        <td className="col-num">
                                            <span className="num">{isNow ? <PlayingBars /> : i + 1}</span>
                                            <button className="row-play" onClick={() => playFrom(i)} aria-label={`Play ${s.title}`}>▶</button>
                                        </td>
                                        <td>
                                            <div className="song-cell">
                                                <SongThumb className="song-thumb" song={s} />
                                                <div className="song-text">
                                                    <span className="song-title">{s.title}</span>
                                                    <span className="song-artist">{s.artist || 'Unknown artist'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="col-album" title={s.album || ''}>{s.album || '—'}</td>
                                        <td className="col-date">{formatAdded(s.added_at)}</td>
                                        <td className="col-time">{formatDuration(s.duration)}</td>
                                        <td className="col-act">
                                            <button className="row-unlike" onClick={() => toggleLike(s)} aria-label={`Remove ${s.title} from Liked Songs`} title="Remove from Liked Songs">
                                                <HeartIcon filled />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default LikedPage

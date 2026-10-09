import { useNavigate } from 'react-router-dom';
import ArtistAvatar from '../ArtistAvatar';
import SongThumb from '../SongThumb';
import { usePlayback } from '../../contexts/playbackContext';
import StatsCard from './StatsCard';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Top 5 bài (bấm = phát) + top 5 ca sĩ (bấm = mở trang ca sĩ) trong khoảng đã chọn
const TopLists = ({ songs, artists }) => {
    const { playSong } = usePlayback();
    const navigate = useNavigate();
    return (
        <div className="stats-pair even">
            <StatsCard title="Top songs">
                {songs.length ? (
                    <ol className="top-list">
                        {songs.map(({ song, plays }, i) => (
                            <li key={song.id}>
                                <button onClick={() => playSong(song)} title={`Play ${song.title}`}>
                                    <span className="rank">{i + 1}</span>
                                    <SongThumb className="top-thumb" song={song} />
                                    <span className="top-text"><b>{song.title}</b><small>{song.artist || 'Unknown artist'}</small></span>
                                    <span className="top-count">{plural(plays, 'play')}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                ) : <p className="mood-muted">Listen to a few songs to see your top tracks.</p>}
            </StatsCard>
            <StatsCard title="Top artists">
                {artists.length ? (
                    <ol className="top-list">
                        {artists.map((a, i) => (
                            <li key={a.id}>
                                <button onClick={() => navigate(`/artist/${a.id}`)} title={`Open ${a.name}`}>
                                    <span className="rank">{i + 1}</span>
                                    <ArtistAvatar className="top-thumb round" name={a.name} avatar={a.avatar} />
                                    <span className="top-text"><b>{a.name}</b><small>Artist</small></span>
                                    <span className="top-count">{plural(a.plays, 'play')}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                ) : <p className="mood-muted">Your favourite artists show up here once you listen.</p>}
            </StatsCard>
        </div>
    );
};

export default TopLists;

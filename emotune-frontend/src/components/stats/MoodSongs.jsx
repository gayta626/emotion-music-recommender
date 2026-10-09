import MoodIcon from '../MoodIcon';
import { usePlayback } from '../../contexts/playbackContext';
import StatsCard from './StatsCard';
import { EMOTIONS } from './statsMeta';

// "What you play when you feel…": mỗi cảm xúc 3 bài bạn hay nghe hết khi đang ở cảm xúc đó
const MoodSongs = ({ data }) => {
    const { playSong } = usePlayback();
    const any = EMOTIONS.some((e) => data[e.key]?.length);
    return (
        <StatsCard title="What you play when you feel…" note="Songs you played to the end while NYX had you down as that mood">
            {any ? (
                <div className="mood-songs">
                    {EMOTIONS.map((e) => (
                        <div key={e.key} className="mood-col">
                            <div className="mood-col-head"><MoodIcon emotion={e.key} size={28} /><span>{e.label}</span></div>
                            {data[e.key]?.length ? (
                                <ul>
                                    {data[e.key].map(({ song, times }) => (
                                        <li key={song.id}>
                                            <button onClick={() => playSong(song)} title={`Play ${song.title}`}>
                                                <span className="ms-title">{song.title}</span>
                                                <span className="ms-times">{times}×</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="mood-muted ms-empty">Nothing yet</p>}
                        </div>
                    ))}
                </div>
            ) : <p className="mood-muted">When you finish a song after a scan, it shows up here under that mood.</p>}
        </StatsCard>
    );
};

export default MoodSongs;

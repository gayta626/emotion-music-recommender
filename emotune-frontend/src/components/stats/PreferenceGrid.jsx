import MoodIcon from '../MoodIcon';
import SongThumb from '../SongThumb';
import { usePlayback } from '../../contexts/playbackContext';
import StatsCard from './StatsCard';
import { EMOTIONS } from './statsMeta';

// màu phân kỳ (đã kiểm tra dataviz trên nền thẻ #24253e): dương = xanh, âm = hồng đỏ, 0 = trong suốt; độ đậm theo |điểm| / |điểm| lớn nhất
const POS = '77, 116, 240';   // #4d74f0
const NEG = '232, 69, 110';   // #e8456e
const cellStyle = (score, max) => {
    if (!score) return undefined;
    const alpha = 0.18 + 0.72 * Math.min(1, Math.abs(score) / max);
    const c = score > 0 ? POS : NEG;
    // ô mạnh phát sáng nhẹ theo màu của nó (giống các khối sáng trong ảnh mẫu)
    return { background: `rgba(${c}, ${alpha})`, boxShadow: `0 0 ${Math.round(16 * alpha)}px rgba(${c}, ${alpha * 0.6})` };
};
const fmt = (x) => (x > 0 ? `+${x}` : `${x}`).replace('-', '−');

// "Điểm sở thích": hệ thống học được bạn thích bài nào khi đang ở cảm xúc nào
const PreferenceGrid = ({ rows }) => {
    const { playSong } = usePlayback();
    const max = Math.max(1, ...rows.flatMap((r) => EMOTIONS.map((e) => Math.abs(r.scores[e.key] || 0))));
    const note = 'Each finished song after a scan adds +1 to that song for that mood, about half adds +0.3, skipping early or "Not for me" takes 1 away. NYX picks higher-scoring songs first.';
    return (
        <StatsCard title="What NYX thinks you like, by mood" note={note}>
            {rows.length ? (
                <div className="pref-wrap">
                    <table className="pref-table">
                        <thead>
                            <tr>
                                <th className="pref-song">Song</th>
                                {EMOTIONS.map((e) => <th key={e.key}><span className="pref-head"><MoodIcon emotion={e.key} size={22} />{e.label}</span></th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ song, scores }) => (
                                <tr key={song.id}>
                                    <td className="pref-song">
                                        <button onClick={() => playSong(song)} title={`Play ${song.title}`}>
                                            <SongThumb className="pref-thumb" song={song} />
                                            <span className="pref-text"><b>{song.title}</b><small>{song.artist || 'Unknown artist'}</small></span>
                                        </button>
                                    </td>
                                    {EMOTIONS.map((e) => {
                                        const v = scores[e.key] || 0;
                                        return <td key={e.key} className="pref-cell" style={cellStyle(v, max)}>{v ? fmt(v) : ''}</td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : <p className="mood-muted chart-empty">NYX hasn't learned your taste yet. Listen to suggested songs and it starts scoring them.</p>}
        </StatsCard>
    );
};

export default PreferenceGrid;

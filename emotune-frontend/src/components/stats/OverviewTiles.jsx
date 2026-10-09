import { useId } from 'react';
import MoodIcon from '../MoodIcon';
import CheerTile from './CheerTile';
import Donut from './Donut';
import { EMOTIONS, formatListen, sumCounts } from './statsMeta';

// đường xu hướng nhỏ (số lần quét mỗi ngày) dưới số ở ô "Scans": vùng tô gradient + nét sáng, kiểu ảnh mẫu
const Sparkline = ({ values }) => {
    const id = useId();
    if (values.length < 2) return null;
    const max = Math.max(1, ...values);
    const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 28 - (v / max) * 24]);
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    return (
        <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id={`${id}-l`} x1="0" x2="1">
                    <stop offset="0" stopColor="#f08a3c" />
                    <stop offset="0.55" stopColor="#e8456e" />
                    <stop offset="1" stopColor="#a35cf0" />
                </linearGradient>
                <linearGradient id={`${id}-a`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#e8456e" stopOpacity="0.35" />
                    <stop offset="1" stopColor="#e8456e" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={`${line} L100 30 L0 30 Z`} fill={`url(#${id}-a)`} />
            <path d={line} fill="none" stroke={`url(#${id}-l)`} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
    );
};

// 5 ô tổng quan; ô Cheer-up (CheerTile) dùng cheerUpStatus từ /mood-history (như trang cũ)
const OverviewTiles = ({ overview, days, daily, cheer }) => {
    // tỉ lệ cảm xúc cả kỳ (cộng các ngày) cho vòng donut ở ô "Most common mood"
    const mix = EMOTIONS.map((e) => ({ key: e.key, className: e.key, value: daily.reduce((s, d) => s + (d.counts[e.key] || 0), 0) }));
    const mixLabel = mix.filter((m) => m.value).map((m) => `${EMOTIONS.find((e) => e.key === m.key).label} ${m.value}`).join(', ');
    return (
        <section className="mood-tiles stats-tiles">
            <div className="mood-tile">
                <span className="tile-label">Scans in {days} days</span>
                <span className="tile-value">{overview.scans}</span>
                <Sparkline values={daily.map((d) => sumCounts(d.counts))} />
            </div>
            <div className="mood-tile mood-mix">
                <span className="tile-label">Most common mood</span>
                {overview.topEmotion ? (
                    <Donut parts={mix} size={72} thickness={8} label={`Mood mix: ${mixLabel}`}>
                        <MoodIcon emotion={overview.topEmotion} size={30} />
                    </Donut>
                ) : <span className="tile-value">—</span>}
            </div>
            <div className="mood-tile">
                <span className="tile-label">Songs played</span>
                <span className="tile-value">{overview.plays}</span>
            </div>
            <div className="mood-tile">
                <span className="tile-label">Listening time</span>
                <span className="tile-value" title="Sum of the full length of each song you played">≈ {formatListen(overview.listenSeconds)}</span>
            </div>
            <CheerTile cheer={cheer} />
        </section>
    );
};

export default OverviewTiles;

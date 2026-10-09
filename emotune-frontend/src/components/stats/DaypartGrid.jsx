import { useState } from 'react';
import StatsCard, { MoodLegend } from './StatsCard';
import { EMOTIONS, PARTS, WEEKDAYS, dominant, sumCounts } from './statsMeta';

// Lưới chấm thứ × buổi (kiểu lưới chấm trong ảnh mẫu): màu = cảm xúc nhiều nhất trong ô,
// chấm càng to = càng nhiều lần quét (diện tích tỉ lệ số lần quét: đường kính theo căn bậc hai)
const DaypartGrid = ({ cells }) => {
    const [hover, setHover] = useState(null);
    const max = Math.max(1, ...cells.map((c) => sumCounts(c.counts)));
    const sum = cells.reduce((s, c) => s + sumCounts(c.counts), 0);
    const cellOf = (weekday, part) => cells.find((c) => c.weekday === weekday && c.part === part);

    const table = (
        <table className="mood-table">
            <thead><tr><th>Day</th>{PARTS.map((p) => <th key={p.key}>{p.label}</th>)}</tr></thead>
            <tbody>
                {WEEKDAYS.map((w, i) => (
                    <tr key={w}>
                        <td>{w}</td>
                        {PARTS.map((p) => {
                            const c = cellOf(i + 1, p.key);
                            const mood = dominant(c.counts);
                            return <td key={p.key}>{sumCounts(c.counts) ? `${sumCounts(c.counts)} · ${EMOTIONS.find((e) => e.key === mood).label}` : '0'}</td>;
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <StatsCard title="Mood by time of day" note="Colour = your most common mood · bigger dot = more scans" table={table}>
            {sum === 0 ? (
                <p className="mood-muted chart-empty">Scan at different times of day to see when you feel what.</p>
            ) : (
                <>
                    <div className="daypart-wrap">
                        <div className="daypart-grid" role="group" aria-label={`Moods by weekday and time of day, ${sum} scans`}>
                            <span />
                            {PARTS.map((p) => <span key={p.key} className="dp-head">{p.label}<small>{p.hours}h</small></span>)}
                            {WEEKDAYS.map((w, i) => (
                                <div key={w} className="dp-row">
                                    <span className="dp-day">{w}</span>
                                    {PARTS.map((p, pi) => {
                                        const c = cellOf(i + 1, p.key);
                                        const n = sumCounts(c.counts);
                                        const mood = dominant(c.counts);
                                        const id = `${i}-${p.key}`;
                                        const tipPos = `${i < 3 ? ' tip-below' : ''}${pi === 0 ? ' tip-left' : ''}${pi === PARTS.length - 1 ? ' tip-right' : ''}`;
                                        return (
                                            <div
                                                key={p.key}
                                                className={`dp-cell ${mood || 'empty'}`}
                                                tabIndex={n ? 0 : -1}
                                                aria-label={n ? `${w} ${p.label}: ${n} scans, mostly ${EMOTIONS.find((e) => e.key === mood).label}` : undefined}
                                                onMouseEnter={() => setHover(id)}
                                                onMouseLeave={() => setHover(null)}
                                                onFocus={() => setHover(id)}
                                                onBlur={() => setHover(null)}
                                            >
                                                <span className="dp-dot" style={n ? { '--size': `${14 + 20 * Math.sqrt(n / max)}px` } : undefined}>
                                                    <span className="dp-n">{n || ''}</span>
                                                </span>
                                                {hover === id && n > 0 && (
                                                    <div className={`chart-tip${tipPos}`} role="tooltip">
                                                        <strong>{w} · {p.label}</strong>
                                                        {EMOTIONS.filter((e) => c.counts[e.key]).map((e) => (
                                                            <span key={e.key}><i className={`swatch ${e.key}`} />{e.label}<b>{c.counts[e.key]}</b></span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                    <MoodLegend />
                </>
            )}
        </StatsCard>
    );
};

export default DaypartGrid;

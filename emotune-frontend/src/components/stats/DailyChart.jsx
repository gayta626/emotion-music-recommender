import { useState } from 'react';
import StatsCard, { MoodLegend } from './StatsCard';
import { EMOTIONS, dayLabel, niceScale, sumCounts } from './statsMeta';

// Cột chồng: số lần quét mỗi ngày theo cảm xúc. 30 ngày -> nhãn trục thưa (mỗi 5 ngày + hôm nay)
const DailyChart = ({ daily }) => {
    const [hover, setHover] = useState(null);
    const days = daily.map((d, i) => ({ ...d, ...dayLabel(d.date, i === daily.length - 1), total: sumCounts(d.counts) }));
    const sum = days.reduce((s, d) => s + d.total, 0);
    const { top, ticks } = niceScale(Math.max(...days.map((d) => d.total)));
    const dense = days.length > 7;
    const cols = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` };
    const showX = (i) => !dense || i === days.length - 1 || (days.length - 1 - i) % 5 === 0;

    const table = (
        <table className="mood-table">
            <thead><tr><th>Day</th>{EMOTIONS.map((e) => <th key={e.key}>{e.label}</th>)}<th>Total</th></tr></thead>
            <tbody>
                {days.map((d) => (
                    <tr key={d.date}>
                        <td>{d.label} · {d.sub}</td>
                        {EMOTIONS.map((e) => <td key={e.key}>{d.counts[e.key] || 0}</td>)}
                        <td><b>{d.total}</b></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <StatsCard title="Scans per day, by mood" table={table}>
            <MoodLegend />
            {sum === 0 ? (
                <p className="mood-muted chart-empty">No scans in this period. Scan your face or pick a mood on the home page, and your days fill in here.</p>
            ) : (
                <div className={`chart ${dense ? 'dense' : ''}`} role="img" aria-label={`Stacked bar chart of ${sum} scans over ${days.length} days`}>
                    <div className="chart-grid" aria-hidden="true">
                        {ticks.map((t) => (
                            <div key={t} className="grid-line" style={{ bottom: `${(t / top) * 100}%` }}><span>{t}</span></div>
                        ))}
                    </div>
                    <div className="chart-cols" style={cols}>
                        {days.map((d, i) => (
                            <div
                                key={d.date}
                                className={`chart-col ${hover === i ? 'hover' : ''}`}
                                onMouseEnter={() => setHover(i)}
                                onMouseLeave={() => setHover(null)}
                                onFocus={() => setHover(i)}
                                onBlur={() => setHover(null)}
                                tabIndex={d.total ? 0 : -1}
                            >
                                <div className="stack" style={{ height: `${(d.total / top) * 100}%` }}>
                                    {EMOTIONS.filter((e) => d.counts[e.key]).map((e) => (
                                        <div key={e.key} className={`seg ${e.key}`} style={{ flexGrow: d.counts[e.key] }} />
                                    ))}
                                </div>
                                {hover === i && d.total > 0 && (
                                    <div className={`chart-tip${i < 3 ? ' tip-left' : i >= days.length - 3 ? ' tip-right' : ''}`} role="tooltip">
                                        <strong>{d.label} · {d.sub}</strong>
                                        {EMOTIONS.filter((e) => d.counts[e.key]).map((e) => (
                                            <span key={e.key}><i className={`swatch ${e.key}`} />{e.label}<b>{d.counts[e.key]}</b></span>
                                        ))}
                                        <span className="tip-total">Total<b>{d.total}</b></span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="chart-x" aria-hidden="true" style={cols}>
                        {days.map((d, i) => (
                            <span key={d.date}>{showX(i) && <><b>{dense ? d.sub : d.label}</b>{dense ? '' : d.sub}</>}</span>
                        ))}
                    </div>
                </div>
            )}
        </StatsCard>
    );
};

export default DailyChart;

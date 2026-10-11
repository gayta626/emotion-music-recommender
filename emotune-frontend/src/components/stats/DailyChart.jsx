import { useState } from 'react';
import StatsCard from './StatsCard';
import { EMOTIONS, dayLabel, niceScale, sumCounts } from './statsMeta';

// Thanh ngang chồng (kiểu ảnh mẫu "Infographic Chart"): mỗi hàng 1 ngày, mỗi đoạn 1 cảm xúc,
// đoạn chuyển tối -> sáng của chính màu đó, số lần quét ghi trong đoạn (đủ rộng mới ghi).
// Dưới cùng: chú giải + % mỗi cảm xúc trong cả khoảng. 30 ngày -> hàng mảnh, không ghi số, nhãn thưa.
const DailyChart = ({ daily }) => {
    const [hover, setHover] = useState(null);
    const days = daily.map((d, i) => ({ ...d, ...dayLabel(d.date, i === daily.length - 1), total: sumCounts(d.counts) }));
    const sum = days.reduce((s, d) => s + d.total, 0);
    const { top, ticks } = niceScale(Math.max(...days.map((d) => d.total)));
    const dense = days.length > 7;
    const showY = (i) => !dense || i === days.length - 1 || (days.length - 1 - i) % 5 === 0;
    const shares = EMOTIONS.map((e) => ({ ...e, n: days.reduce((s, d) => s + (d.counts[e.key] || 0), 0) }));

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
            {sum === 0 ? (
                <p className="mood-muted chart-empty">No scans in this period. Scan your face or pick a mood on the home page, and your days fill in here.</p>
            ) : (
                <>
                    <div className={`hbar ${dense ? 'dense' : ''}`} role="img" aria-label={`Stacked bar chart of ${sum} scans over ${days.length} days`}>
                        <div className="hbar-plot">
                            <div className="hbar-grid" aria-hidden="true">
                                {ticks.map((t) => <span key={t} style={{ left: `${(t / top) * 100}%` }} />)}
                            </div>
                            {days.map((d, i) => (
                                <div
                                    key={d.date}
                                    className={`hbar-row ${hover === i ? 'hover' : ''}`}
                                    tabIndex={d.total ? 0 : -1}
                                    onMouseEnter={() => setHover(i)}
                                    onMouseLeave={() => setHover(null)}
                                    onFocus={() => setHover(i)}
                                    onBlur={() => setHover(null)}
                                >
                                    <span className="hbar-day">{showY(i) && (dense ? d.sub : <><b>{d.label}</b> {d.sub}</>)}</span>
                                    <div className="hbar-track">
                                        {d.total > 0 ? (
                                            <div className="hbar-stack" style={{ width: `${(d.total / top) * 100}%` }}>
                                                {EMOTIONS.filter((e) => d.counts[e.key]).map((e) => (
                                                    <div key={e.key} className={`hbar-seg ${e.key}`} style={{ flexGrow: d.counts[e.key] }}>
                                                        {!dense && d.counts[e.key] / top >= 0.08 && <span>{d.counts[e.key]}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <div className="hbar-none" />}
                                        {hover === i && d.total > 0 && (
                                            <div
                                                className={`chart-tip${i >= days.length - 4 ? ' tip-up' : ''}`}
                                                role="tooltip"
                                                style={{ left: `min(${(d.total / top) * 100}% + 10px, calc(100% - 150px))` }}
                                            >
                                                <strong>{d.label} · {d.sub}</strong>
                                                {EMOTIONS.filter((e) => d.counts[e.key]).map((e) => (
                                                    <span key={e.key}><i className={`swatch ${e.key}`} />{e.label}<b>{d.counts[e.key]}</b></span>
                                                ))}
                                                <span className="tip-total">Total<b>{d.total}</b></span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="hbar-x" aria-hidden="true">
                            {ticks.map((t) => <span key={t} style={{ left: `${(t / top) * 100}%` }}>{t}</span>)}
                        </div>
                    </div>
                    <ul className="hbar-legend" aria-label="Legend: share of scans by mood">
                        {shares.map((e) => (
                            <li key={e.key} className={e.key}>
                                <i aria-hidden="true" />
                                <span>{e.label}</span>
                                <b>{Math.round((e.n / sum) * 100)}%</b>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </StatsCard>
    );
};

export default DailyChart;

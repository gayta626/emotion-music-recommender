import { useState } from 'react';
import StatsCard from './StatsCard';
import Donut from './Donut';
import { OUTCOMES, dayLabel } from './statsMeta';

const sumOut = (d) => OUTCOMES.reduce((s, o) => s + d[o.key], 0);
// tỉ lệ nghe hết của 1 nhóm ngày (null nếu không có lượt nghe)
const rateOf = (list) => {
    const total = list.reduce((s, d) => s + sumOut(d), 0);
    return total ? list.reduce((s, d) => s + d.good, 0) / total : null;
};
const pct = (x) => `${Math.round(x * 100)}%`;

// "Gợi ý trúng tới đâu": vòng donut (tỉ lệ 4 kết quả, giữa là % nghe hết) + cột 100% mảnh mỗi ngày (nghe hết / một nửa / bỏ qua / Not for me)
const HitRateChart = ({ hitRate }) => {
    const [hover, setHover] = useState(null);
    const { total, daily } = hitRate;
    const listened = sumOut(total);
    const half = Math.floor(daily.length / 2);
    const early = rateOf(daily.slice(0, half));
    const late = rateOf(daily.slice(half));
    const cols = { gridTemplateColumns: `repeat(${daily.length}, minmax(0, 1fr))` };

    const table = (
        <table className="mood-table">
            <thead><tr><th>Day</th>{OUTCOMES.map((o) => <th key={o.key}>{o.label}</th>)}</tr></thead>
            <tbody>
                {daily.map((d, i) => {
                    const { label, sub } = dayLabel(d.date, i === daily.length - 1);
                    return <tr key={d.date}><td>{label} · {sub}</td>{OUTCOMES.map((o) => <td key={o.key}>{d[o.key]}</td>)}</tr>;
                })}
            </tbody>
        </table>
    );

    return (
        <StatsCard title="How often NYX got it right" table={listened ? table : null}>
            {!listened ? (
                <p className="mood-muted chart-empty">Listen to a few suggested songs. NYX learns from how much of each song you play.</p>
            ) : (
                <>
                    <div className="hit-hero">
                        <Donut
                            className="hit-donut"
                            parts={OUTCOMES.map((o) => ({ key: o.key, value: total[o.key], className: `out-${o.key}` }))}
                            size={132}
                            thickness={13}
                            label={`Listening outcomes: ${OUTCOMES.map((o) => `${o.label} ${total[o.key]}`).join(', ')}`}
                        >
                            <span className="hit-value">{pct(total.rate)}</span>
                        </Donut>
                        <div className="hit-side">
                            <span className="hit-label">
                                of songs played in mood mode, played to the end
                                {early !== null && late !== null && (
                                    <small>
                                        {pct(late) === pct(early) ? 'Same as' : `${late > early ? 'Up' : 'Down'} from`} {pct(early)} in the first half of this period
                                    </small>
                                )}
                            </span>
                            <ul className="chart-legend hit-legend" aria-label="Legend">
                                {OUTCOMES.map((o) => (
                                    <li key={o.key}><span className={`swatch out-${o.key}`} aria-hidden="true" />{o.label}<b>{total[o.key]}</b></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="hit-chart" role="img" aria-label={`Listening outcomes per day, ${listened} listens`}>
                        <div className="hit-cols" style={cols}>
                            {daily.map((d, i) => {
                                const n = sumOut(d);
                                const { label, sub } = dayLabel(d.date, i === daily.length - 1);
                                // 3 cột đầu/cuối: tooltip căn mép để không tràn khỏi thẻ
                                const tipPos = i < 3 ? ' tip-left' : i >= daily.length - 3 ? ' tip-right' : '';
                                return (
                                    <div
                                        key={d.date}
                                        className={`hit-col ${hover === i ? 'hover' : ''}`}
                                        tabIndex={n ? 0 : -1}
                                        onMouseEnter={() => setHover(i)}
                                        onMouseLeave={() => setHover(null)}
                                        onFocus={() => setHover(i)}
                                        onBlur={() => setHover(null)}
                                    >
                                        {n > 0 ? (
                                            <div className="hit-stack">
                                                {OUTCOMES.filter((o) => d[o.key]).map((o) => (
                                                    <div key={o.key} className={`seg out-${o.key}`} style={{ flexGrow: d[o.key] }} />
                                                ))}
                                            </div>
                                        ) : <div className="hit-none" />}
                                        {hover === i && n > 0 && (
                                            <div className={`chart-tip${tipPos}`} role="tooltip">
                                                <strong>{label} · {sub}</strong>
                                                {OUTCOMES.filter((o) => d[o.key]).map((o) => (
                                                    <span key={o.key}><i className={`swatch out-${o.key}`} />{o.label}<b>{d[o.key]}</b></span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </StatsCard>
    );
};

export default HitRateChart;

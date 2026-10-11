import { useId, useState } from 'react';
import StatsCard from './StatsCard';
import { OUTCOMES, dayLabel } from './statsMeta';
import { monotoneSample, polar, smoothPath } from './chartMath';

const sumOut = (d) => OUTCOMES.reduce((s, o) => s + d[o.key], 0);
// tỉ lệ nghe hết của 1 nhóm ngày (null nếu không có lượt nghe)
const rateOf = (list) => {
    const total = list.reduce((s, d) => s + sumOut(d), 0);
    return total ? list.reduce((s, d) => s + d.good, 0) / total : null;
};
const pct = (x) => `${Math.round(x * 100)}%`;

// Vòng đường cong (kiểu ảnh mẫu "63k"): mỗi ngày 1 điểm quanh vòng (bắt đầu từ chấm gần 12 giờ, theo chiều kim đồng hồ,
// chừa khe ở đỉnh). Điểm càng xa tâm = ngày đó càng nhiều lượt. 2 đường: nghe hết (xanh) và bỏ qua sớm (vàng).
// Giữa vòng: % nghe hết của cả khoảng (rê lên 1 ngày -> số của ngày đó). Dưới: 4 ô sparkline cho 4 kết quả.
const RI = 80;    // vòng "0 lượt"
const RO = 140;   // vòng lượt nhiều nhất
const SUB = 16;   // số mẫu giữa 2 ngày: nội suy bán kính theo góc -> đường đi theo cung tròn, không cắt dây cung vào giữa
const A0 = 18;    // góc ngày đầu
const A1 = 342;   // góc hôm nay
const RING = ['good', 'bad'];

const Sparkline = ({ values, gid }) => {
    const max = Math.max(1, ...values);
    const pts = values.map((v, i) => [values.length > 1 ? (i / (values.length - 1)) * 120 : 60, 32 - (v / max) * 28]);
    return (
        <svg className="hit-spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true">
            <path d={smoothPath(pts)} stroke={`url(#${gid})`} vectorEffect="non-scaling-stroke" />
        </svg>
    );
};

const HitRateChart = ({ hitRate }) => {
    const id = useId();
    const [hover, setHover] = useState(null);
    const { total, daily } = hitRate;
    const listened = sumOut(total);
    const half = Math.floor(daily.length / 2);
    const early = rateOf(daily.slice(0, half));
    const late = rateOf(daily.slice(half));
    const max = Math.max(1, ...daily.flatMap((d) => RING.map((k) => d[k])));
    const angle = (i) => (daily.length > 1 ? A0 + (i / (daily.length - 1)) * (A1 - A0) : 180);
    const step = daily.length > 1 ? (A1 - A0) / (daily.length - 1) : 40;
    const radius = (v) => RI + (RO - RI) * (v / max);
    const ringPath = (k) => {
        if (daily.length < 2) return '';
        const steps = (daily.length - 1) * SUB;
        const rs = monotoneSample(daily.map((d) => radius(d[k])), steps);
        return rs.map((r, j) => {
            const [x, y] = polar(r, A0 + (j / steps) * (A1 - A0));
            return `${j ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
        }).join(' ');
    };
    const days = daily.map((d, i) => ({ ...d, ...dayLabel(d.date, i === daily.length - 1), n: sumOut(d) }));
    const cur = hover !== null ? days[hover] : null;

    const table = (
        <table className="mood-table">
            <thead><tr><th>Day</th>{OUTCOMES.map((o) => <th key={o.key}>{o.label}</th>)}</tr></thead>
            <tbody>
                {days.map((d) => <tr key={d.date}><td>{d.label} · {d.sub}</td>{OUTCOMES.map((o) => <td key={o.key}>{d[o.key]}</td>)}</tr>)}
            </tbody>
        </table>
    );

    // hình quạt mỏng quanh 1 ngày: vùng rê chuột (lớn hơn đường vẽ)
    const wedge = (i) => {
        const a0 = angle(i) - step / 2;
        const a1 = angle(i) + step / 2;
        const p = (r, a) => polar(r, a).map((n) => n.toFixed(2)).join(' ');
        return `M${p(RI - 26, a0)} L${p(RO + 16, a0)} A${RO + 16} ${RO + 16} 0 0 1 ${p(RO + 16, a1)} L${p(RI - 26, a1)} A${RI - 26} ${RI - 26} 0 0 0 ${p(RI - 26, a0)} Z`;
    };

    return (
        <StatsCard title="How often NYX got it right" table={listened ? table : null}>
            {!listened ? (
                <p className="mood-muted chart-empty">Listen to a few suggested songs. NYX learns from how much of each song you play.</p>
            ) : (
                <div className="hit-wrap">
                    <div className="hit-ring">
                        <svg viewBox="-168 -168 336 336" role="img" aria-label={`Listening outcomes per day around a circle, ${listened} listens, ${pct(total.rate)} played to the end`}>
                            <defs>
                                {OUTCOMES.map((o) => (
                                    // toạ độ tuyệt đối (khung sparkline 120 rộng): đường phẳng (toàn 0) có hộp bao cao 0 -> kiểu tỉ lệ sẽ không vẽ
                                    <linearGradient key={o.key} id={`${id}-${o.key}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="120" y2="0">
                                        <stop offset="0" className={`hit-stop-a out-${o.key}`} />
                                        <stop offset="1" className={`hit-stop-b out-${o.key}`} />
                                    </linearGradient>
                                ))}
                            </defs>
                            {/* lưới: 3 vòng + tia mỗi ngày */}
                            <circle className="hit-grid" r={RI} />
                            <circle className="hit-grid" r={(RI + RO) / 2} />
                            <circle className="hit-grid" r={RO} />
                            {days.map((d, i) => {
                                const [x1, y1] = polar(RI - 10, angle(i));
                                const [x2, y2] = polar(RO + 8, angle(i));
                                return <line key={d.date} className={`hit-spoke ${hover === i ? 'on' : ''}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
                            })}
                            {RING.map((k) => (
                                <path key={k} className={`hit-line out-${k}`} d={ringPath(k)} />
                            ))}
                            {RING.map((k) => {
                                const [x, y] = polar(radius(daily[0][k]), angle(0));
                                return <circle key={k} className={`hit-start out-${k}`} cx={x} cy={y} r="3.5" />;
                            })}
                            {cur && RING.map((k) => {
                                const [x, y] = polar(radius(cur[k]), angle(hover));
                                return <circle key={k} className={`hit-dot out-${k}`} cx={x} cy={y} r="4.5" />;
                            })}
                            {days.map((d, i) => (
                                <path
                                    key={d.date}
                                    className="hit-wedge"
                                    d={wedge(i)}
                                    tabIndex={d.n ? 0 : -1}
                                    aria-label={`${d.label} ${d.sub}: ${OUTCOMES.map((o) => `${o.label} ${d[o.key]}`).join(', ')}`}
                                    onMouseEnter={() => setHover(i)}
                                    onMouseLeave={() => setHover(null)}
                                    onFocus={() => setHover(i)}
                                    onBlur={() => setHover(null)}
                                />
                            ))}
                        </svg>
                        <div className="hit-center" aria-live="polite">
                            {cur ? (
                                <>
                                    <small>{cur.label} · {cur.sub}</small>
                                    <b className="day">{cur.n ? pct(cur.good / cur.n) : '—'}</b>
                                    <small>{cur.n ? `${cur.good} of ${cur.n} to the end` : 'no listens'}</small>
                                </>
                            ) : (
                                <>
                                    <b>{pct(total.rate)}</b>
                                    <small>played to the end</small>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="hit-side">
                        <p className="hit-label">
                            Of songs NYX picked in mood mode, how much you played. Each point on the circle is one day, from the dot to today; further out = more songs.
                            {early !== null && late !== null && (
                                <small>
                                    {pct(late) === pct(early) ? 'Same as' : `${late > early ? 'Up' : 'Down'} from`} {pct(early)} in the first half of this period
                                </small>
                            )}
                        </p>
                        <ul className="hit-tiles" aria-label="Legend">
                            {OUTCOMES.map((o) => (
                                <li key={o.key} className={`out-${o.key} ${RING.includes(o.key) ? 'on-ring' : ''}`}>
                                    <Sparkline values={daily.map((d) => d[o.key])} gid={`${id}-${o.key}`} />
                                    <b>{total[o.key]}</b>
                                    <span><i className={`swatch out-${o.key}`} aria-hidden="true" />{o.label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </StatsCard>
    );
};

export default HitRateChart;

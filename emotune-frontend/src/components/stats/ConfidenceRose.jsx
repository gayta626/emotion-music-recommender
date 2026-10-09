import { useId, useState } from 'react';
import MoodIcon from '../MoodIcon';
import StatsCard from './StatsCard';
import { EMOTIONS } from './statsMeta';

// Biểu đồ hoa hồng (polar area) kiểu ảnh mẫu: mỗi cảm xúc 1 cánh cố định (72°), cánh càng dài = AI càng tự tin.
// Độ dài tính từ mép lỗ giữa (RI) tới vòng 100% (RO). Giữa vòng: độ tự tin trung bình của mọi lần quét camera.
const RI = 44;
const RO = 118;
const SPAN = 360 / EMOTIONS.length;
const PAD = 2.5;   // khe giữa 2 cánh (độ)

const pt = (r, deg) => {
    const a = (deg * Math.PI) / 180;
    return `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
};
// hình quạt khuyết từ bán kính ri tới ro, góc a0 -> a1 (0° = hướng 12 giờ, theo chiều kim đồng hồ)
const sector = (ri, ro, a0, a1) =>
    `M${pt(ri, a0)} L${pt(ro, a0)} A${ro} ${ro} 0 0 1 ${pt(ro, a1)} L${pt(ri, a1)} A${ri} ${ri} 0 0 0 ${pt(ri, a0)} Z`;
const pct = (x) => `${Math.round(x * 100)}%`;

const ConfidenceRose = ({ confidence }) => {
    const id = useId();
    const [active, setActive] = useState(null);
    const rows = EMOTIONS.map((e, i) => ({ ...e, i, item: confidence.find((c) => c.emotion === e.key) }));
    const have = rows.filter((r) => r.item);
    const scans = have.reduce((s, r) => s + r.item.count, 0);
    const avg = scans ? have.reduce((s, r) => s + r.item.avg * r.item.count, 0) / scans : 0;

    const table = (
        <table className="mood-table">
            <thead><tr><th>Mood</th><th>Average confidence</th><th>Camera scans</th></tr></thead>
            <tbody>
                {have.map((r) => <tr key={r.key}><td>{r.label}</td><td>{pct(r.item.avg)}</td><td>{r.item.count}</td></tr>)}
            </tbody>
        </table>
    );
    const summary = have.map((r) => `${r.label} ${pct(r.item.avg)}`).join(', ');
    const hoverProps = (key) => ({
        onMouseEnter: () => setActive(key),
        onMouseLeave: () => setActive(null),
        onFocus: () => setActive(key),
        onBlur: () => setActive(null),
    });

    return (
        <StatsCard title="How sure the face AI was" note="Average confidence when the camera picked each mood · longer petal = more sure" table={have.length ? table : null}>
            {have.length ? (
                <div className={`rose-wrap ${active ? 'has-active' : ''}`}>
                    <div className="rose">
                        <svg viewBox="-150 -150 300 300" role="img" aria-label={`Rose chart of average confidence: ${summary}`}>
                            <defs>
                                {have.map((r) => (
                                    <radialGradient key={r.key} id={`${id}-${r.key}`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={RO}>
                                        <stop offset={RI / RO} style={{ stopColor: `var(--mood-${r.key})`, stopOpacity: 0.35 }} />
                                        <stop offset="1" style={{ stopColor: `var(--mood-${r.key})` }} />
                                    </radialGradient>
                                ))}
                            </defs>
                            {/* vòng tham chiếu 50% và 100% */}
                            <circle className="rose-ring" r={RI + (RO - RI) * 0.5} />
                            <circle className="rose-ring" r={RO} />
                            {rows.map((r) => {
                                const a0 = r.i * SPAN - SPAN / 2 + PAD;
                                const a1 = r.i * SPAN + SPAN / 2 - PAD;
                                const ro = r.item ? RI + (RO - RI) * Math.min(1, r.item.avg) : RI;
                                const mid = r.i * SPAN;
                                return (
                                    <g key={r.key} className={`rose-petal ${r.key} ${active === r.key ? 'active' : ''}`} {...(r.item ? hoverProps(r.key) : {})}>
                                        <path className="rose-track" d={sector(RI, RO, a0, a1)} />
                                        {r.item && <path className="rose-fill" d={sector(RI, ro, a0, a1)} fill={`url(#${id}-${r.key})`} />}
                                        {r.item && (
                                            <text className="rose-label" transform={`translate(${pt(Math.min(ro + 14, RO + 16), mid)})`}>
                                                {pct(r.item.avg)}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                        <div className="rose-center">
                            <b>{pct(avg)}</b>
                            <small>avg. sure</small>
                        </div>
                    </div>
                    <ul className="rose-list">
                        {rows.map((r) => (
                            <li
                                key={r.key}
                                className={`${r.key} ${r.item ? '' : 'none'} ${active === r.key ? 'active' : ''}`}
                                tabIndex={r.item ? 0 : -1}
                                {...(r.item ? hoverProps(r.key) : {})}
                            >
                                <span className="rose-dot" aria-hidden="true" />
                                <span className="rose-name"><MoodIcon emotion={r.key} size={20} /><span className="rose-text">{r.label}</span></span>
                                {r.item ? (
                                    <span className="rose-value">{pct(r.item.avg)}<small>{r.item.count} {r.item.count === 1 ? 'scan' : 'scans'}</small></span>
                                ) : <span className="rose-value" title="No camera scans with this mood yet"><small>—</small></span>}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : <p className="mood-muted chart-empty">No camera scans yet. Scan with the camera to see how sure the AI is.</p>}
        </StatsCard>
    );
};

export default ConfidenceRose;

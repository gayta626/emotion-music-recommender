import { useId, useState } from 'react';
import MoodIcon from '../MoodIcon';
import StatsCard from './StatsCard';
import { EMOTIONS } from './statsMeta';
import { polar } from './chartMath';

// Hoa hồng nhiều cánh (kiểu ảnh mẫu "2438"): MỖI LẦN QUÉT CAMERA = 1 cánh, cánh càng dài = AI càng chắc lần đó.
// Mỗi cảm xúc 1 múi, độ rộng múi theo số lần quét cảm xúc đó. Vòng cung ngoài + số % = độ chắc trung bình của múi.
// Giữa: độ chắc trung bình mọi lần quét.
const RI = 50;      // mép lỗ giữa (= 0%)
const RO = 124;     // 100%
const R_ARC = 136;  // vòng cung ngoài
const R_LABEL = 154;
const GAP = 4;      // khe giữa 2 múi (độ)
const PAD = 0.7;    // khe giữa 2 cánh trong 1 múi (độ)

const pct = (x) => `${Math.round(x * 100)}%`;
const p = (r, a) => polar(r, a).map((n) => n.toFixed(2)).join(' ');
// hình quạt khuyết từ bán kính ri tới ro, góc a0 -> a1
const sector = (ri, ro, a0, a1) => {
    const big = a1 - a0 > 180 ? 1 : 0;
    return `M${p(ri, a0)} L${p(ro, a0)} A${ro} ${ro} 0 ${big} 1 ${p(ro, a1)} L${p(ri, a1)} A${ri} ${ri} 0 ${big} 0 ${p(ri, a0)} Z`;
};
const arc = (r, a0, a1) => `M${p(r, a0)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(r, a1)}`;

// chia vòng: múi rộng theo số cánh (tối thiểu 4% vòng để múi 1 lần quét vẫn thấy rõ), khe GAP giữa các múi
const layoutGroups = (have) => {
    const petals = have.reduce((s, r) => s + r.item.values.length, 0);
    const weights = have.map((r) => Math.max(r.item.values.length, petals * 0.04));
    const wSum = weights.reduce((s, w) => s + w, 0);
    const many = have.length > 1;
    const free = many ? 360 - GAP * have.length : 359.9;
    const out = [];
    let at = many ? GAP / 2 : 0;
    have.forEach((r, i) => {
        const span = (weights[i] / wSum) * free;
        out.push({ ...r, a0: at, a1: at + span });
        at += span + (many ? GAP : 0);
    });
    return out;
};

const ConfidenceRose = ({ confidence }) => {
    const id = useId();
    const [active, setActive] = useState(null);
    const rows = EMOTIONS.map((e) => ({ ...e, item: confidence.find((c) => c.emotion === e.key) }));
    const have = rows.filter((r) => r.item);
    const scans = have.reduce((s, r) => s + r.item.count, 0);
    const avg = scans ? have.reduce((s, r) => s + r.item.avg * r.item.count, 0) / scans : 0;

    const groups = layoutGroups(have);

    const table = (
        <table className="mood-table">
            <thead><tr><th>Mood</th><th>Average confidence</th><th>Camera scans</th></tr></thead>
            <tbody>
                {have.map((r) => <tr key={r.key}><td>{r.label}</td><td>{pct(r.item.avg)}</td><td>{r.item.count}</td></tr>)}
            </tbody>
        </table>
    );
    const summary = have.map((r) => `${r.label} ${pct(r.item.avg)} over ${r.item.count} scans`).join(', ');
    const hoverProps = (key) => ({
        onMouseEnter: () => setActive(key),
        onMouseLeave: () => setActive(null),
        onFocus: () => setActive(key),
        onBlur: () => setActive(null),
    });

    return (
        <StatsCard title="How sure the face AI was" note="Each petal is one camera scan · longer petal = the AI was more sure" table={have.length ? table : null}>
            {have.length ? (
                <div className={`rose-wrap ${active ? 'has-active' : ''}`}>
                    <div className="rose">
                        <svg viewBox="-172 -172 344 344" role="img" aria-label={`Rose chart of how sure the face AI was: ${summary}`}>
                            <defs>
                                {have.map((r) => (
                                    <radialGradient key={r.key} id={`${id}-${r.key}`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={RO}>
                                        <stop offset={RI / RO} className={`rose-stop-in ${r.key}`} />
                                        <stop offset="0.75" className={`rose-stop-mid ${r.key}`} />
                                        <stop offset="1" className={`rose-stop-out ${r.key}`} />
                                    </radialGradient>
                                ))}
                            </defs>
                            {/* nền: tia mờ + vòng 50% / 100% */}
                            {Array.from({ length: 72 }, (_, i) => {
                                const [x1, y1] = polar(RI, i * 5);
                                const [x2, y2] = polar(R_ARC + 6, i * 5);
                                return <line key={i} className="rose-ray" x1={x1} y1={y1} x2={x2} y2={y2} />;
                            })}
                            <circle className="rose-ring" r={(RI + RO) / 2} />
                            <circle className="rose-ring" r={RO} />
                            {groups.map((g) => {
                                const vals = g.item.values;
                                const w = (g.a1 - g.a0) / vals.length;
                                const mid = (g.a0 + g.a1) / 2;
                                const [lx, ly] = polar(R_LABEL, mid);
                                return (
                                    <g key={g.key} className={`rose-petal ${g.key} ${active === g.key ? 'active' : ''}`} {...hoverProps(g.key)}>
                                        <path className="rose-track" d={sector(RI, RO, g.a0, g.a1)} />
                                        {vals.map((v, i) => {
                                            const a0 = g.a0 + i * w + (vals.length > 1 ? PAD / 2 : 0);
                                            const a1 = g.a0 + (i + 1) * w - (vals.length > 1 ? PAD / 2 : 0);
                                            return <path key={i} className="rose-fill" d={sector(RI, RI + (RO - RI) * Math.min(1, v), a0, a1)} fill={`url(#${id}-${g.key})`} />;
                                        })}
                                        <path className="rose-arc" d={arc(R_ARC, g.a0, g.a1)} />
                                        <text className="rose-label" x={lx.toFixed(1)} y={ly.toFixed(1)}>{pct(g.item.avg)}</text>
                                    </g>
                                );
                            })}
                            <circle className="rose-hole" r={RI - 4} />
                        </svg>
                        <div className="rose-center">
                            <b>{pct(avg)}</b>
                            <small>{scans} {scans === 1 ? 'scan' : 'scans'}</small>
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
                                <span className="rose-name"><MoodIcon emotion={r.key} size={18} /><span className="rose-text">{r.label}</span></span>
                                <span className="rose-value" title={r.item ? undefined : 'No camera scans with this mood yet'}>{r.item ? pct(r.item.avg) : '—'}</span>
                                <span className="rose-bar" aria-hidden="true"><i style={{ width: r.item ? pct(r.item.avg) : 0 }} /></span>
                                <small className="rose-scans">{r.item ? `${r.item.count} ${r.item.count === 1 ? 'scan' : 'scans'}` : 'no scans'}</small>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : <p className="mood-muted chart-empty">No camera scans yet. Scan with the camera to see how sure the AI is.</p>}
        </StatsCard>
    );
};

export default ConfidenceRose;

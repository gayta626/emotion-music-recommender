import { useId, useState } from 'react';
import StatsCard, { MoodLegend } from './StatsCard';
import { EMOTIONS, dominant, niceScale, sumCounts } from './statsMeta';
import { monotoneSample } from './chartMath';

// "Mood by time of day" kiểu ảnh mẫu (các lớp sóng mượt phát sáng): trục ngang = giờ trong ngày (mỗi bước 2 giờ),
// mỗi lớp 1 cảm xúc chồng lên nhau -> độ cao cả khối = số lần quét lúc đó. Vòng sáng = khung giờ quét nhiều nhất.
const W = 600;
const H = 240;
const STEPS = 132;   // số mẫu dọc trục ngang khi vẽ đường cong
const SLOTS = Array.from({ length: 12 }, (_, i) => i * 2);   // 0h, 2h, … 22h
const X_LABELS = [3, 6, 9, 12, 15, 18, 21];

const hourText = (h) => {
    const x = h % 24;
    if (x === 0) return '12am';
    if (x === 12) return '12pm';
    return x < 12 ? `${x}am` : `${x - 12}pm`;
};
const slotText = (h) => `${hourText(h)}–${hourText(h + 2)}`;
// điểm giữa mỗi khung 2 giờ nằm ở giờ h+1 -> trục ngang chạy từ 1h tới 23h
const xOfHour = (h) => ((h - 1) / 22) * 100;

// cộng dồn độ dày các lớp: lớp i nằm từ tổng (0..i-1) tới tổng (0..i)
const stackLayers = (thick) => {
    const out = [];
    let lower = thick[0].map(() => 0);
    thick.forEach((t) => {
        const upper = lower.map((b, k) => b + Math.max(0, t[k]));
        out.push({ lower, upper });
        lower = upper;
    });
    return out;
};

const HourlyChart = ({ hours }) => {
    const id = useId();
    const [hover, setHover] = useState(null);
    // gộp 24 giờ thành 12 khung 2 giờ
    const slots = SLOTS.map((h) => {
        const counts = Object.fromEntries(EMOTIONS.map((e) => [e.key, (hours[h]?.counts[e.key] || 0) + (hours[h + 1]?.counts[e.key] || 0)]));
        return { h, counts, total: sumCounts(counts) };
    });
    const sum = slots.reduce((s, x) => s + x.total, 0);
    const peak = slots.reduce((best, x) => (x.total > best.total ? x : best), slots[0]);
    const { top, ticks } = niceScale(peak.total);
    const scaleTop = top * 1.45;   // chừa khoảng trên cho vòng sáng

    // mỗi cảm xúc: nội suy độ dày lớp rồi cộng dồn -> các lớp không bao giờ cắt nhau
    const thick = EMOTIONS.map((e) => monotoneSample(slots.map((x) => x.counts[e.key]), STEPS));
    const layers = stackLayers(thick)
        .map((l, i) => ({ ...EMOTIONS[i], ...l, has: slots.some((x) => x.counts[EMOTIONS[i].key]) }))
        .filter((l) => l.has);
    const px = (k) => (k / STEPS) * W;
    const py = (v) => H - (v / scaleTop) * H;
    const line = (arr) => arr.map((v, k) => `${k ? 'L' : 'M'}${px(k).toFixed(1)} ${py(v).toFixed(1)}`).join(' ');
    const area = (l) => `${line(l.upper)} ${[...l.lower].reverse().map((v, k) => `L${px(STEPS - k).toFixed(1)} ${py(v).toFixed(1)}`).join(' ')} Z`;
    const peakMood = dominant(peak.counts);   // cảm xúc chính của khung giờ đông nhất -> màu vòng sáng

    const table = (
        <table className="mood-table">
            <thead><tr><th>Time</th>{EMOTIONS.map((e) => <th key={e.key}>{e.label}</th>)}<th>Total</th></tr></thead>
            <tbody>
                {slots.map((x) => (
                    <tr key={x.h}>
                        <td>{slotText(x.h)}</td>
                        {EMOTIONS.map((e) => <td key={e.key}>{x.counts[e.key]}</td>)}
                        <td><b>{x.total}</b></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <StatsCard title="Mood by time of day" note="Your scans across the day in 2-hour steps, stacked by mood" table={table}>
            {sum === 0 ? (
                <p className="mood-muted chart-empty">Scan at different times of day to see when you feel what.</p>
            ) : (
                <>
                    <div className="wave" role="img" aria-label={`Stacked area chart of ${sum} scans by time of day; most scans ${slotText(peak.h)}`}>
                        <div className="wave-y" aria-hidden="true">
                            {ticks.map((t) => <span key={t} style={{ bottom: `${(t / scaleTop) * 100}%` }}>{t}</span>)}
                        </div>
                        <div className="wave-plot">
                            <div className="wave-grid" aria-hidden="true">
                                {ticks.map((t) => <i key={t} className="h" style={{ bottom: `${(t / scaleTop) * 100}%` }} />)}
                                {X_LABELS.map((h) => <i key={h} className="v" style={{ left: `${xOfHour(h)}%` }} />)}
                            </div>
                            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                                <defs>
                                    {layers.map((l) => (
                                        <linearGradient key={l.key} id={`${id}-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0" className={`wave-stop-top ${l.key}`} />
                                            <stop offset="1" className={`wave-stop-bottom ${l.key}`} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                {layers.map((l) => (
                                    <g key={l.key} className={`wave-layer ${l.key}`}>
                                        <path className="wave-area" d={area(l)} fill={`url(#${id}-${l.key})`} />
                                        <path className="wave-edge" d={line(l.upper)} vectorEffect="non-scaling-stroke" />
                                    </g>
                                ))}
                            </svg>
                            {peakMood && (
                                <div
                                    className={`wave-peak ${peakMood}`}
                                    style={{ left: `clamp(48px, ${xOfHour(peak.h + 1)}%, calc(100% - 48px))`, bottom: `${(peak.total / scaleTop) * 100}%` }}
                                    aria-hidden="true"
                                >
                                    <b>{Math.round((peak.total / sum) * 100)}%</b>
                                    <small>{slotText(peak.h)}</small>
                                </div>
                            )}
                            {hover !== null && <i className="wave-cross" style={{ left: `${xOfHour(slots[hover].h + 1)}%` }} aria-hidden="true" />}
                            <div className="wave-hits">
                                {slots.map((x, i) => (
                                    <div
                                        key={x.h}
                                        className="wave-hit"
                                        // vùng rê chuột của mỗi khung: nửa bước 2 bên điểm giữa khung (2 khung đầu/cuối chỉ nửa bên trong)
                                        style={{ left: `${Math.max(0, ((i - 0.5) / 11) * 100)}%`, width: `${((i === 0 || i === 11 ? 0.5 : 1) / 11) * 100}%` }}
                                        tabIndex={x.total ? 0 : -1}
                                        aria-label={`${slotText(x.h)}: ${x.total} scans`}
                                        onMouseEnter={() => setHover(i)}
                                        onMouseLeave={() => setHover(null)}
                                        onFocus={() => setHover(i)}
                                        onBlur={() => setHover(null)}
                                    >
                                        {hover === i && (
                                            <div className={`chart-tip${i < 3 ? ' tip-left' : i > 8 ? ' tip-right' : ''}`} role="tooltip">
                                                <strong>{slotText(x.h)}</strong>
                                                {x.total ? EMOTIONS.filter((e) => x.counts[e.key]).map((e) => (
                                                    <span key={e.key}><i className={`swatch ${e.key}`} />{e.label}<b>{x.counts[e.key]}</b></span>
                                                )) : <span>No scans</span>}
                                                {x.total > 0 && <span className="tip-total">Total<b>{x.total}</b></span>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="wave-x" aria-hidden="true">
                            {X_LABELS.map((h) => <span key={h} style={{ left: `${xOfHour(h)}%` }}>{hourText(h)}</span>)}
                        </div>
                    </div>
                    <MoodLegend />
                </>
            )}
        </StatsCard>
    );
};

export default HourlyChart;

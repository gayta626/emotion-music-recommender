import { useEffect, useRef, useState } from 'react';
import MoodIcon from './MoodIcon';
import { EMOTIONS } from '../utils/moodStats';
import './HomeMood.scss';

// 2 bieu do cua 2 the cuoi trang chu (22/10 nguoi dung chon tu trang xem truoc: D cho the tuan, C cho the quet).
// Mau lay tu bien cua khoi cha (.browse-page .features -> @include neon-mood): --mood-*, --c, --grid, --tip-bg.

const weekCounts = (days) => EMOTIONS.map((e) => ({ ...e, n: days.reduce((s, d) => s + (d.counts[e.key] || 0), 0) }));

// do be rong that cua khung ve -> SVG ve theo pixel that (chu khong bi co nho khi the hep)
const useWidth = () => {
    const ref = useRef(null);
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, width];
};

// duong cong muot qua cac diem (Catmull-Rom -> Bezier), khong vong xuong duoi day bieu do
const smoothPath = (pts, floor) => pts.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x} ${y}`;
    const p0 = pts[i - 2] || pts[i - 1];
    const p1 = pts[i - 1];
    const p3 = pts[i + 1] || [x, y];
    const c1 = [p1[0] + (x - p0[0]) / 6, Math.min(floor, p1[1] + (y - p0[1]) / 6)];
    const c2 = [x - (p3[0] - p1[0]) / 6, Math.min(floor, y - (p3[1] - p1[1]) / 6)];
    return `${d} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${x} ${y}`;
}, '');

const niceTop = (n) => (n <= 4 ? 4 : Math.ceil(n / 2) * 2);   // dinh truc y chan, it nhat 4

// vong % nho cua 1 cam xuc (cung mau --c)
const PctRing = ({ value, size = 54, th = 6 }) => {
    const r = (size - th) / 2;
    const C = 2 * Math.PI * r;
    return (
        <svg className="hm-pct-ring" width={size} height={size} aria-hidden="true">
            <circle className="track" cx={size / 2} cy={size / 2} r={r} strokeWidth={th} />
            <circle className="arc" cx={size / 2} cy={size / 2} r={r} strokeWidth={th}
                strokeDasharray={`${value * C} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </svg>
    );
};

// ---------- the tuan (D): duong sang tong so lan quet moi ngay + cot mo theo cam xuc phia sau + vong % tung cam xuc ----------
const PAD = { l: 30, r: 12, t: 34, b: 26 };
const H = 230;

export const MoodWeekChart = ({ days }) => {
    const [boxRef, width] = useWidth();
    const [hover, setHover] = useState(null);
    const total = days.reduce((s, d) => s + d.total, 0);
    const week = weekCounts(days).filter((e) => e.n > 0);
    const top = niceTop(Math.max(...days.map((d) => d.total)));
    const peak = days.reduce((best, d, i) => (d.total > days[best].total ? i : best), 0);

    const pw = Math.max(0, width - PAD.l - PAD.r);
    const ph = H - PAD.t - PAD.b;
    const floor = PAD.t + ph;
    const colW = pw / days.length;
    const xs = days.map((_, i) => PAD.l + (i + 0.5) * colW);
    const ys = days.map((d) => floor - (d.total / top) * ph);
    const pts = xs.map((x, i) => [x, ys[i]]);
    const line = width ? smoothPath(pts, floor) : '';
    const barW = Math.min(18, colW * 0.4);

    return (
        <div className="hm-week">
            <div className="hm-line" ref={boxRef}>
                {width > 0 && (
                    <svg width={width} height={H} role="img"
                        aria-label={`Scans per day this week: ${days.map((d) => `${d.label} ${d.total}`).join(', ')}`}>
                        <defs>
                            <linearGradient id="hm-line-grad" x1="0" x2="1">
                                <stop offset="0" stopColor="#f08a3c" />
                                <stop offset="0.55" stopColor="#e8456e" />
                                <stop offset="1" stopColor="#a35cf0" />
                            </linearGradient>
                            <linearGradient id="hm-area-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#e8456e" stopOpacity="0.35" />
                                <stop offset="1" stopColor="#e8456e" stopOpacity="0" />
                            </linearGradient>
                            <radialGradient id="hm-glow">
                                <stop offset="0" stopColor="#ffb347" stopOpacity="0.45" />
                                <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
                            </radialGradient>
                        </defs>
                        {/* luoi ngang + so truc y (0, giua, dinh) */}
                        {[0, top / 2, top].map((v) => {
                            const y = floor - (v / top) * ph;
                            return (
                                <g key={v}>
                                    <line className="hm-gridline" x1={PAD.l} x2={width - PAD.r} y1={y} y2={y} />
                                    <text className="hm-axis" x={PAD.l - 8} y={y + 4} textAnchor="end">{v}</text>
                                </g>
                            );
                        })}
                        {/* cot mo phia sau: chong theo cam xuc */}
                        {days.map((d, i) => {
                            let y = floor;
                            return EMOTIONS.filter((e) => d.counts[e.key]).map((e) => {
                                const h = (d.counts[e.key] / top) * ph;
                                y -= h;
                                return <rect key={`${d.sub}-${e.key}`} className={`hm-ghost ${e.key}`} x={xs[i] - barW / 2} y={y + 1} width={barW} height={Math.max(2, h - 2)} rx="3" />;
                            });
                        })}
                        {/* quang sang am o moi ngay co quet (to theo so lan) */}
                        {days.map((d, i) => d.total > 0 && <circle key={d.sub} cx={xs[i]} cy={ys[i]} r={16 + Math.min(d.total, 10) * 3} fill="url(#hm-glow)" />)}
                        <path d={`${line} L${xs[xs.length - 1]} ${floor} L${xs[0]} ${floor} Z`} fill="url(#hm-area-grad)" />
                        <path className="hm-line-path" d={line} stroke="url(#hm-line-grad)" />
                        {days.map((d, i) => d.total > 0 && (
                            <circle key={d.sub} className={`hm-point ${i === peak ? 'peak' : ''}`} cx={xs[i]} cy={ys[i]} r={i === peak ? 6 : 4} />
                        ))}
                        {total > 0 && <text className="hm-peak" x={xs[peak]} y={ys[peak] - 16} textAnchor="middle">{days[peak].total}</text>}
                        {days.map((d, i) => (
                            <text key={d.sub} className={`hm-axis ${d.label === 'Today' ? 'today' : ''}`} x={xs[i]} y={H - 6} textAnchor="middle">
                                {d.label === 'Today' ? 'Today' : d.label.slice(0, 3)}
                            </text>
                        ))}
                        {hover !== null && <line className="hm-cross" x1={xs[hover]} x2={xs[hover]} y1={PAD.t - 10} y2={floor} />}
                    </svg>
                )}
                {/* vung re chuot / Tab moi ngay -> bang so */}
                <div className="hm-hits" style={{ left: PAD.l, right: PAD.r }}>
                    {days.map((d, i) => (
                        <div key={d.sub} className="hm-hit" tabIndex={d.total ? 0 : -1}
                            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                            onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                            {hover === i && d.total > 0 && (
                                <div className={`hm-tip ${i < days.length / 2 ? 'to-right' : 'to-left'}`} role="tooltip">
                                    <b>{d.label} · {d.sub}</b>
                                    {EMOTIONS.filter((e) => d.counts[e.key]).map((e) => (
                                        <span key={e.key} className={e.key}><i className="hm-swatch" />{e.label}<em>{d.counts[e.key]}</em></span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            {/* vong % tung cam xuc co mat trong tuan (nhu 3 vong nho duoi duong cong cua anh mau) */}
            {total > 0 && (
                <ul className="hm-rings" aria-label="Share of scans by mood this week">
                    {week.map((e) => (
                        <li key={e.key} className={e.key}>
                            <span className="hm-ring-box">
                                <PctRing value={e.n / total} />
                                <MoodIcon emotion={e.key} size={22} />
                            </span>
                            <span><b>{Math.round((e.n / total) * 100)}%</b><small>{e.label} · {e.n}</small></span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// ---------- the quet (C): vong sang, moi cung = 1 lan quet (moi nhat o dinh, sang nhat), icon cam xuc gan nhat o giua ----------
const RING = 230;
const R = 96;

export const ScanRing = ({ scans, latest, ago }) => {
    if (!scans.length && !latest) return <p className="hm-empty">No scans yet — scan your face and each scan shows up here as a glowing arc.</p>;
    const n = scans.length;
    const step = (2 * Math.PI) / Math.max(n, 1);
    const gap = n > 1 ? Math.min(0.07, step * 0.25) : 0;
    const c = RING / 2;
    const pt = (a, r) => [c + r * Math.sin(a), c - r * Math.cos(a)];
    const counts = EMOTIONS.map((e) => ({ ...e, n: scans.filter((s) => s.emotion === e.key).length })).filter((e) => e.n > 0);
    const center = latest || scans[0];

    return (
        <div className="hm-scan">
            <div className="hm-ring">
                {/* class cam xuc tren <svg> -> cac <stop> ben trong nhan --c (mau quang sang giua vong) */}
                <svg className={center.emotion} width={RING} height={RING} role="img" aria-label={`Last ${n} scans, newest first: ${scans.map((s) => s.emotion).join(', ')}`}>
                    <defs>
                        <radialGradient id="hm-ring-glow">
                            <stop offset="0" className="hm-glow-in" />
                            <stop offset="1" className="hm-glow-out" />
                        </radialGradient>
                    </defs>
                    <circle cx={c} cy={c} r="72" fill="url(#hm-ring-glow)" />
                    {/* vong hat mo ben trong, xoay rat cham */}
                    <g className="hm-ring-dots">
                        {Array.from({ length: 60 }, (_, i) => {
                            const [x, y] = pt((i / 60) * 2 * Math.PI, 76);
                            return <circle key={i} cx={x} cy={y} r={i % 5 ? 1 : 1.8} className={i % 5 ? 'dot' : 'dot big'} />;
                        })}
                    </g>
                    {n === 1 ? (
                        <circle className={`hm-arc newest ${scans[0].emotion}`} cx={c} cy={c} r={R} />
                    ) : scans.map((s, i) => {
                        const a0 = i * step - step / 2 + gap / 2;
                        const a1 = a0 + step - gap;
                        const r = i === 0 ? R + 2 : R;
                        const [x0, y0] = pt(a0, r);
                        const [x1, y1] = pt(a1, r);
                        return (
                            <path key={i} className={`hm-arc ${i === 0 ? 'newest' : ''} ${s.emotion}`}
                                d={`M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`}
                                style={{ opacity: i === 0 ? 1 : 1 - (i / n) * 0.45 }}>
                                <title>{EMOTIONS.find((e) => e.key === s.emotion)?.label}{s.at ? ` · ${new Date(s.at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</title>
                            </path>
                        );
                    })}
                </svg>
                <div className="hm-ring-center">
                    <MoodIcon emotion={center.emotion} size={70} />
                    <b>{EMOTIONS.find((e) => e.key === center.emotion)?.label}</b>
                    {ago && <small>{ago}</small>}
                </div>
            </div>
            <div className="hm-scan-side">
                <h4>{n ? `Your last ${n} ${n === 1 ? 'scan' : 'scans'}` : 'Your last scan'}</h4>
                <p>Each arc is one scan, newest at the top. The bright one is the latest.</p>
                <ul className="hm-scan-legend">
                    {counts.map((e) => (
                        <li key={e.key}><MoodIcon emotion={e.key} size={20} /><span>{e.label}</span><b>{e.n}</b></li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

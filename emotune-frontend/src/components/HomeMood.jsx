import { useEffect, useId, useRef, useState } from 'react';
import MoodIcon from './MoodIcon';
import { EMOTIONS } from '../utils/moodStats';
import './HomeMood.scss';

// 2 bieu do cua 2 the cuoi trang chu, vibe am nhac + neon (23/10 nguoi dung chon tu trang xem truoc: A1 bo can bang
// am LED cho the tuan, B3 mam DJ cho the quet; ban 2 cung ngay: den manh hon, so lon lam diem nhin, dep ca khi it du lieu).
// Mau den LED: bien --led theo class cam xuc (HomeMood.scss, sang hon --mood-* giong icon cam xuc).
// Khong chi bao bang mau: dong ho muc co icon + ten + %, so tren dau cot, bang so khi re chuot / Tab vao ngay.

const weekCounts = (days) => EMOTIONS.map((e) => ({ ...e, n: days.reduce((s, d) => s + (d.counts[e.key] || 0), 0) }));
const labelOf = (key) => EMOTIONS.find((e) => e.key === key)?.label;

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

// ---------- o icon dau 2 the (23/10 thay o vuong cam mat cuoi / xanh vong tron "hoi cui"): o toi, vien + net neon ----------
// mau vien / quang sang = --led cua cam xuc (the tuan: cam xuc nhieu nhat tuan, the quet: lan quet gan nhat)
const EQ_BARS = [0.5, 0.85, 0.62, 1, 0.72];
const EQ_COLORS = ['happy', 'surprise', 'neutral', 'sad', 'angry'];

export const WeekBadge = ({ emotion = 'neutral' }) => (
    <span className={`feature-thumb hm-badge ${emotion}`} aria-hidden="true">
        <svg viewBox="0 0 64 64">
            {EQ_BARS.map((h, i) => (
                <rect key={i} className={`hm-badge-bar ${EQ_COLORS[i]}`} x={8.5 + i * 10} y={49 - h * 36} width="7" height={h * 36} rx="3.5"
                    style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
            <rect className="hm-badge-floor" x="7" y="53" width="50" height="2.2" rx="1.1" />
        </svg>
    </span>
);

export const ScanBadge = ({ emotion = 'neutral' }) => (
    <span className={`feature-thumb hm-badge ${emotion}`} aria-hidden="true">
        <svg viewBox="0 0 64 64">
            {Array.from({ length: 12 }, (_, i) => {
                const a = (i / 12) * 2 * Math.PI;
                return <circle key={i} className={`hm-badge-led ${i < 5 ? 'on' : ''}`} cx={32 + 26 * Math.sin(a)} cy={32 - 26 * Math.cos(a)} r={i === 0 ? 2.8 : 1.8} />;
            })}
            <g className="hm-badge-spin">
                <circle className="hm-badge-disc" cx="32" cy="32" r="18" />
                <circle className="hm-badge-groove" cx="32" cy="32" r="12.5" />
                <circle className="hm-badge-mark" cx="32" cy="17.5" r="1.8" />
            </g>
            <circle className="hm-badge-hub" cx="32" cy="32" r="5" />
        </svg>
    </span>
);

// ---------- the tuan (A1): moi ngay 1 cot den LED nhu dan hi-fi, moi o sang = 1 lan quet (mau cam xuc) + dong ho muc ----------
const H = 184;
const BASE = 160;           // san cua cac cot (vach neon), duoi la ten ngay
const PLOT = 136;           // chieu cao cot LED
const GAP = 4;
const SIDE = 8;             // le trai / phai cua khung ve
const METER_TICKS = 24;     // khung hep (< 360px) chi 12 vach, khong thi vach mong toi bien mat

// mau tung lan quet trong 1 ngay, xep tu duoi len theo thu tu cam xuc co dinh
const stackOf = (day) => EMOTIONS.flatMap((e) => Array.from({ length: day.counts[e.key] || 0 }, () => e.key));

export const MoodWeekChart = ({ days }) => {
    const uid = useId();
    const [boxRef, width] = useWidth();
    const [hover, setHover] = useState(null);
    const total = days.reduce((s, d) => s + d.total, 0);
    const week = weekCounts(days).filter((e) => e.n > 0).sort((a, b) => b.n - a.n);
    const peak = days.reduce((best, d, i) => (d.total > days[best].total ? i : best), 0);
    // so o moi cot: it nhat 6, luon du cho ngay nhieu nhat + 1 o trong (cho vach dinh "nhun" + so tren dau)
    const rows = Math.max(6, Math.max(...days.map((d) => d.total)) + 1);
    const segH = (PLOT - (rows - 1) * GAP) / rows;
    const colW = Math.max(0, width - SIDE * 2) / days.length;
    const barW = Math.min(colW * 0.46, 28);
    const segY = (r) => BASE - 6 - (r + 1) * segH - r * GAP;
    const narrow = colW < 44;     // cot hep: ten ngay chi con chu cai dau (Today giu nguyen)
    const ticks = width && width < 360 ? 12 : METER_TICKS;
    const floorId = `${uid}-floor`;

    return (
        <div className="hm-week">
            {total > 0 && (
                <div className="hm-week-head">
                    <p className="hm-big"><b>{total}</b> {total === 1 ? 'scan' : 'scans'} this week</p>
                    <p className="hm-peak-note">Busiest: <b>{days[peak].label === 'Today' ? 'today' : days[peak].label}</b> · {days[peak].total}</p>
                </div>
            )}
            <div className="hm-eq" ref={boxRef}>
                {width > 0 && (
                    <svg width={width} height={H} role="img"
                        aria-label={`Scans per day this week: ${days.map((d) => `${d.label} ${d.total}`).join(', ')}`}>
                        <defs>
                            <linearGradient id={floorId} x1="0" x2="1">
                                <stop offset="0" stopColor="#f2a53a" stopOpacity="0" />
                                <stop offset="0.2" stopColor="#f2a53a" />
                                <stop offset="0.55" stopColor="#f0587e" />
                                <stop offset="0.8" stopColor="#b57bf5" />
                                <stop offset="1" stopColor="#b57bf5" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {/* san san khau: vach neon duoi cac cot */}
                        <rect className="hm-floor" x={SIDE} y={BASE - 1} width={Math.max(0, width - SIDE * 2)} height="2" rx="1" fill={`url(#${floorId})`} />
                        {days.map((d, i) => {
                            const x = SIDE + i * colW + (colW - barW) / 2;
                            const cx = SIDE + (i + 0.5) * colW;
                            const stack = stackOf(d);
                            const today = d.label === 'Today';
                            return (
                                <g key={d.sub}>
                                    {hover === i && <rect className="hm-col-hl" x={x - 8} y={segY(rows - 1) - 10} width={barW + 16} height={PLOT + 14} rx="10" />}
                                    {stack.length === 0 ? (
                                        // ngay khong quet: 1 vach mo sat san (doan "lang")
                                        <rect className="hm-led-idle" x={x} y={segY(0) + segH - 3} width={barW} height="3" rx="1.5" />
                                    ) : Array.from({ length: rows }, (_, r) => (r < stack.length ? (
                                        <rect key={r} className={`hm-led ${stack[r]} ${r === stack.length - 1 ? 'top' : ''}`}
                                            x={x} y={segY(r)} width={barW} height={segH} rx={Math.min(4, segH / 2)}
                                            style={{ animationDelay: `${i * 70 + r * 45}ms` }} />
                                    ) : (
                                        <rect key={r} className="hm-led-off" x={x} y={segY(r)} width={barW} height={segH} rx={Math.min(4, segH / 2)} />
                                    )))}
                                    {/* vach dinh trang nhun + so lan quet tren dau cot */}
                                    {stack.length > 0 && (
                                        <>
                                            <rect className="hm-cap" x={x} y={segY(stack.length) + segH - 3} width={barW} height="2.5" rx="1.25" />
                                            <text className="hm-count" x={cx} y={segY(stack.length) + segH - 10} textAnchor="middle">{d.total}</text>
                                        </>
                                    )}
                                    {today && <rect className="hm-today-pill" x={cx - 23} y={H - 19} width="46" height="18" rx="9" />}
                                    <text className={`hm-axis ${today ? 'today' : ''}`} x={cx} y={H - 6} textAnchor="middle">
                                        {today ? 'Today' : d.label.slice(0, narrow ? 1 : 3)}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                )}
                {/* vung re chuot / Tab moi ngay -> bang so */}
                <div className="hm-hits" style={{ left: SIDE, right: SIDE }}>
                    {days.map((d, i) => (
                        <div key={d.sub} className="hm-hit" tabIndex={d.total ? 0 : -1}
                            aria-label={d.total ? `${d.label}: ${EMOTIONS.filter((e) => d.counts[e.key]).map((e) => `${e.label} ${d.counts[e.key]}`).join(', ')}` : undefined}
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
            {/* dong ho muc kieu VU: % tung cam xuc trong tuan, 24 vach manh */}
            {total > 0 && (
                <ul className="hm-meters" aria-label="Share of scans by mood this week">
                    {week.map((e) => {
                        const share = e.n / total;
                        const lit = Math.max(1, Math.round(share * ticks));
                        return (
                            <li key={e.key} className={e.key}>
                                <span className="hm-meter-name"><MoodIcon emotion={e.key} size={18} />{e.label}</span>
                                <span className="hm-meter-ticks" aria-hidden="true">
                                    {Array.from({ length: ticks }, (_, k) => <i key={k} className={k < lit ? 'on' : ''} style={{ animationDelay: `${k * 25}ms` }} />)}
                                </span>
                                <b>{Math.round(share * 100)}%<small> · {e.n}</small></b>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

// ---------- the quet (B3): mam DJ, vong 24 den LED quanh mam, moi den sang = 1 lan quet (moi nhat o dinh), mam quay cham ----------
const RING = 250;
const LED_R = 114;
const SLOTS = 24;

export const ScanRing = ({ scans, latest, ago }) => {
    const uid = useId();
    if (!scans.length && !latest) return <p className="hm-empty">No scans yet — scan your face and each scan lights up here.</p>;
    const n = scans.length;
    const lit = Math.min(n, SLOTS);
    const c = RING / 2;
    const pt = (a, r) => [c + r * Math.sin(a), c - r * Math.cos(a)];
    const counts = EMOTIONS.map((e) => ({ ...e, n: scans.filter((s) => s.emotion === e.key).length })).filter((e) => e.n > 0).sort((a, b) => b.n - a.n);
    const most = Math.max(1, ...counts.map((e) => e.n));
    const center = latest || scans[0];
    // cung "cue" noi cac den da sang (tu dinh, theo chieu kim dong ho)
    const cueEnd = ((lit - 1) / SLOTS) * 2 * Math.PI;
    const [ax, ay] = pt(cueEnd, LED_R);
    const platterId = `${uid}-platter`;
    const capId = `${uid}-cap`;

    return (
        <div className="hm-scan">
            <div className="hm-jog">
                {/* class cam xuc tren <svg> -> vanh mam + cung cue + cham danh dau nhan --led cua cam xuc gan nhat */}
                <svg className={center.emotion} width={RING} height={RING} role="img" aria-label={`Last ${n} scans, newest first: ${scans.map((s) => s.emotion).join(', ')}`}>
                    <defs>
                        <radialGradient id={platterId} cx="50%" cy="40%" r="65%">
                            <stop offset="0" stopColor="#262744" />
                            <stop offset="1" stopColor="#0f0f1c" />
                        </radialGradient>
                        <radialGradient id={capId} cx="40%" cy="30%" r="80%">
                            <stop offset="0" className="hm-cap-in" />
                            <stop offset="1" stopColor="#15162a" />
                        </radialGradient>
                    </defs>
                    {/* ray mo cho 24 den + cung cue sang qua cac den da sang */}
                    <circle className="hm-track" cx={c} cy={c} r={LED_R} />
                    {lit > 1 && <path className="hm-cue" d={`M${c} ${c - LED_R} A${LED_R} ${LED_R} 0 ${cueEnd > Math.PI ? 1 : 0} 1 ${ax} ${ay}`} />}
                    {Array.from({ length: SLOTS }, (_, i) => {
                        const [x, y] = pt((i / SLOTS) * 2 * Math.PI, LED_R);
                        const s = scans[i];
                        if (!s) return <circle key={i} className="hm-dot-off" cx={x} cy={y} r="1.8" />;
                        return (
                            <g key={i}>
                                {i === 0 && <circle className={`hm-halo ${s.emotion}`} cx={x} cy={y} r="11" />}
                                <circle className={`hm-dot ${s.emotion} ${i === 0 ? 'newest' : ''}`} cx={x} cy={y} r={i === 0 ? 6.5 : 4.8}
                                    style={{ opacity: i === 0 ? 1 : 1 - (i / SLOTS) * 0.4, animationDelay: `${i * 40}ms` }}>
                                    <title>{labelOf(s.emotion)}{s.at ? ` · ${new Date(s.at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</title>
                                </circle>
                            </g>
                        );
                    })}
                    <circle className="hm-platter" cx={c} cy={c} r="96" fill={`url(#${platterId})`} />
                    {/* ranh mam + cham danh dau, quay cham nhu mam DJ dang chay */}
                    <g className="hm-platter-spin">
                        {[88, 80, 72].map((r) => <circle key={r} className="hm-groove" cx={c} cy={c} r={r} />)}
                        {Array.from({ length: 36 }, (_, i) => {
                            const a = (i / 36) * 2 * Math.PI;
                            const [x1, y1] = pt(a, 66);
                            const [x2, y2] = pt(a, i % 3 ? 70 : 74);
                            return <line key={i} className="hm-ridge" x1={x1} y1={y1} x2={x2} y2={y2} />;
                        })}
                        <circle className="hm-marker" cx={c} cy={c - 84} r="3" />
                    </g>
                    <circle className="hm-cap-ring" cx={c} cy={c} r="58" />
                    <circle cx={c} cy={c} r="55" fill={`url(#${capId})`} />
                </svg>
                <div className="hm-ring-center">
                    <MoodIcon emotion={center.emotion} size={46} />
                    <b>{labelOf(center.emotion)}</b>
                    {ago && <small>{ago}</small>}
                </div>
            </div>
            <div className="hm-scan-side">
                <h4>{n ? `Your last ${n} ${n === 1 ? 'scan' : 'scans'}` : 'Your last scan'}</h4>
                <p>Each light on the deck is one scan, newest at the top.</p>
                <ul className="hm-scan-legend">
                    {counts.map((e) => (
                        <li key={e.key} className={e.key}>
                            <MoodIcon emotion={e.key} size={20} />
                            <span className="hm-legend-name">{e.label}</span>
                            <span className="hm-legend-bar" aria-hidden="true"><i style={{ width: `${(e.n / most) * 100}%` }} /></span>
                            <b>{e.n}</b>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

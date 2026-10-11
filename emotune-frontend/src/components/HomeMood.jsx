import { useState } from 'react';
import Donut from './stats/Donut';
import { EMOTIONS } from '../utils/moodStats';
import './HomeMood.scss';

// 2 bieu do cua 2 the cuoi trang chu, ve theo anh mau "Infographic Chart" (cung bang mau neon voi /stats).
// Du lieu: days = buildDays(/mood-history) -> 7 ngay, moi ngay { label, sub, counts: { happy: 2, ... }, total }

const nice = (n) => (n <= 4 ? 4 : Math.ceil(n / 2) * 2);   // dinh truc y chan, it nhat 4 -> 2 vach chia deu
const weekCounts = (days) => EMOTIONS.map((e) => ({ ...e, n: days.reduce((s, d) => s + (d.counts[e.key] || 0), 0) }));

// ---------- 7 cot mong + vong so lan quet + donut ca tuan ----------
export const MoodWeekChart = ({ days }) => {
    const total = days.reduce((s, d) => s + d.total, 0);
    const top = nice(Math.max(...days.map((d) => d.total)));
    const peak = days.reduce((best, d) => (d.total > best.total ? d : best), days[0]);
    const week = weekCounts(days);
    const present = week.filter((e) => e.n > 0);

    return (
        <div className="hm-week">
            <div className="hm-chart-wrap">
                {/* chu thich: o vuong nho cho cam xuc co mat trong tuan (mau khong bao gio dung 1 minh) */}
                {present.length > 0 && (
                    <ul className="hm-legend">
                        {present.map((e) => (
                            <li key={e.key} className={e.key}><span className="hm-swatch" aria-hidden="true" />{e.label}</li>
                        ))}
                    </ul>
                )}
                <div className="hm-plot" role="img" aria-label={`Scans per day this week: ${days.map((d) => `${d.label} ${d.total}`).join(', ')}`}>
                    {/* luoi cham ngang + so truc y (0, giua, dinh) */}
                    <div className="hm-grid" aria-hidden="true">
                        {[top, top / 2, 0].map((v) => <div key={v} className="hm-gridline"><span>{v}</span></div>)}
                    </div>
                    <div className="hm-cols">
                        {days.map((d) => {
                            const pct = (d.total / top) * 100;
                            const segs = EMOTIONS.filter((e) => d.counts[e.key]);
                            const topMood = segs.reduce((best, e) => (d.counts[e.key] > (d.counts[best?.key] || 0) ? e : best), null);
                            return (
                                <div key={d.sub} className={`hm-col ${d.total ? '' : 'is-empty'}`} tabIndex={d.total ? 0 : -1}>
                                    {/* vong so lan quet o hang tren, vach trang noi xuong dau cot (nhu vong "46%" trong anh mau) */}
                                    {d.total > 0 && <span className="hm-badge">{d.total}</span>}
                                    {/* vung ve (trung voi luoi): cot + vach noi + quang sang ngay dong nhat */}
                                    <div className="hm-track">
                                        {d.total > 0 && <span className="hm-stem" style={{ bottom: `calc(${pct}% + 6px)` }} aria-hidden="true" />}
                                        {d === peak && d.total > 0 && <span className={`hm-halo ${topMood.key}`} style={{ bottom: `${pct / 2}%` }} aria-hidden="true" />}
                                        <div className="hm-bar" style={{ height: `${pct}%` }}>
                                            {segs.map((e) => (
                                                <span key={e.key} className={`hm-seg ${e.key}`} style={{ flexGrow: d.counts[e.key] }} />
                                            ))}
                                        </div>
                                    </div>
                                    {/* bang so khi re chuot / focus */}
                                    {d.total > 0 && (
                                        <div className="hm-tip" role="tooltip">
                                            <b>{d.label} · {d.sub}</b>
                                            {segs.map((e) => (
                                                <span key={e.key} className={e.key}><i className="hm-swatch" />{e.label}<em>{d.counts[e.key]}</em></span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="hm-days" aria-hidden="true">
                        {days.map((d) => <span key={d.sub}>{d.label === 'Today' ? 'Today' : d.label.slice(0, 3)}</span>)}
                    </div>
                </div>
            </div>
            {/* donut ti le cam xuc ca tuan, giua la tong so lan quet (nhu so "358" trong anh mau) */}
            <Donut
                className="hm-donut"
                size={150}
                thickness={14}
                label={`${total} scans this week: ${present.map((e) => `${e.label} ${e.n}`).join(', ') || 'none'}`}
                parts={week.map((e) => ({ key: e.key, value: e.n, className: e.key }))}
            >
                <span className="hm-total"><b>{total}</b><small>{total === 1 ? 'scan' : 'scans'}</small></span>
            </Donut>
        </div>
    );
};

// ---------- luoi cham: moi cham = 1 lan quet trong tuan, mau theo cam xuc, cu -> moi ----------
const MAX_DOTS = 70;

export const ScanDots = ({ days }) => {
    const [hover, setHover] = useState(null);
    const all = days.flatMap((d) => EMOTIONS.flatMap((e) =>
        Array.from({ length: d.counts[e.key] || 0 }, () => ({ emotion: e, day: d }))));
    // qua nhieu lan quet -> moi cham dai dien cho "per" lan (lay deu theo thu tu thoi gian)
    const per = Math.max(1, Math.ceil(all.length / MAX_DOTS));
    const dots = all.filter((_, i) => i % per === 0);
    const week = weekCounts(days).filter((e) => e.n > 0);

    if (!all.length) return <p className="hm-empty">No scans this week yet — your scans will show up here as colored dots.</p>;

    return (
        <div className="hm-dots-wrap">
            <div
                className="hm-dots"
                role="img"
                aria-label={`${all.length} scans this week: ${week.map((e) => `${e.label} ${e.n}`).join(', ')}`}
                onMouseLeave={() => setHover(null)}
            >
                {dots.map((dot, i) => (
                    <span key={i} className={`hm-dot ${dot.emotion.key}`} onMouseEnter={() => setHover(dot)} />
                ))}
            </div>
            <p className="hm-dots-caption" aria-hidden="true">
                {hover
                    ? <><i className={`hm-swatch ${hover.emotion.key}`} />{hover.emotion.label} · {hover.day.label} {hover.day.sub}</>
                    : per > 1 ? `Every scan this week · 1 dot ≈ ${per} scans` : 'Every scan this week · 1 dot = 1 scan'}
            </p>
            <ul className="hm-legend">
                {week.map((e) => (
                    <li key={e.key} className={e.key}><span className="hm-swatch" aria-hidden="true" />{e.label} <b>{e.n}</b></li>
                ))}
            </ul>
        </div>
    );
};

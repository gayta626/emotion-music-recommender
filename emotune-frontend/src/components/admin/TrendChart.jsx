import { useEffect, useId, useRef, useState } from 'react';
import StatsCard from '../stats/StatsCard';
import { METRIC_INFO, formatValue, isRate, pct, shortDay } from './adminMeta';
import { segmentPath, segments, yDomain } from './trendMath';

const H = 240;                                            // cao vùng vẽ (px)
const PAD = { top: 14, right: 16, bottom: 28, left: 44 };

// vạch chia trục y: 4 khoảng đều, số "đẹp"
const ticksOf = (key, lo, hi) => {
    if (isRate(key)) {
        const step = hi - lo > 0.5 ? 0.25 : hi - lo > 0.25 ? 0.1 : 0.05;
        const out = [];
        for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
        return out;
    }
    const step = Math.max(1, Math.ceil(hi / 4));
    return Array.from({ length: Math.floor(hi / step) + 1 }, (_, i) => i * step);
};

// Biểu đồ lớn của chỉ số đang chọn: 1 đường theo ngày + vạch mục tiêu / báo động + vùng báo động tô mờ.
// Rê chuột / Tab vào 1 ngày -> đường dọc + hộp số liệu. Ngày không có dữ liệu = đứt nét.
const TrendChart = ({ metric, unsureBelow, minSamples }) => {
    const id = useId();
    const wrapRef = useRef(null);
    const [w, setW] = useState(640);
    const [hover, setHover] = useState(null);

    // vẽ theo đúng bề rộng thật (chữ trục không bị kéo giãn như viewBox co giãn)
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return undefined;
        const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const { key, daily, target } = metric;
    const values = daily.map((d) => d.value);
    const [lo, hi] = yDomain(key, values, target);
    const n = daily.length;
    const innerW = w - PAD.left - PAD.right;
    const x = (i) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
    const y = (v) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
    const slot = n > 1 ? innerW / (n - 1) : innerW;
    const every = n <= 7 ? 1 : Math.ceil(n / Math.max(2, Math.floor(innerW / 64)));   // nhãn ngày không chồng nhau
    const info = METRIC_INFO[key];
    const has = values.some((v) => v != null);
    const cur = hover != null ? daily[hover] : null;
    const higher = target.better === 'higher';

    const table = (
        <table className="mood-table">
            <thead><tr><th>Day</th><th>{metric.label}</th><th>Based on</th></tr></thead>
            <tbody>
                {daily.map((d) => (
                    <tr key={d.date}><td>{shortDay(d.date)}</td><td>{formatValue(key, d.value)}</td><td>{d.n} {info.unit}</td></tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <StatsCard
            className="trend-card"
            title={`${metric.label} per day`}
            note={info.how.replace('{unsure}', pct(unsureBelow))}
            table={has ? table : null}
        >
            <div className="trend-wrap" ref={wrapRef}>
                {!has ? (
                    <p className="mood-muted chart-empty">No data in this period yet.</p>
                ) : (
                    <svg width={w} height={H} role="img" aria-label={`${metric.label} per day, ${shortDay(daily[0].date)} to ${shortDay(daily[n - 1].date)}`}>
                        <defs>
                            <linearGradient id={`${id}-l`} gradientUnits="userSpaceOnUse" x1={PAD.left} x2={w - PAD.right} y1="0" y2="0">
                                <stop offset="0" stopColor="#f08a3c" />
                                <stop offset="0.55" stopColor="#e8456e" />
                                <stop offset="1" stopColor="#a35cf0" />
                            </linearGradient>
                        </defs>
                        {/* lưới + nhãn trục y */}
                        {ticksOf(key, lo, hi).map((t) => (
                            <g key={t} className="trend-grid">
                                <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} />
                                <text x={PAD.left - 8} y={y(t)} dy="0.35em" textAnchor="end">{formatValue(key, t)}</text>
                            </g>
                        ))}
                        {/* vùng báo động + 2 vạch ngưỡng (chỉ tỉ lệ) */}
                        {isRate(key) && (
                            <>
                                <rect
                                    className="trend-alert-zone"
                                    x={PAD.left}
                                    width={innerW}
                                    y={higher ? y(target.alert) : PAD.top}
                                    height={higher ? H - PAD.bottom - y(target.alert) : y(target.alert) - PAD.top}
                                />
                                <line className="trend-ref ok" x1={PAD.left} x2={w - PAD.right} y1={y(target.ok)} y2={y(target.ok)} />
                                <text className="trend-ref-label ok" x={w - PAD.right} y={y(target.ok)} dy="-0.5em" textAnchor="end">Target {pct(target.ok)}</text>
                                <line className="trend-ref alert" x1={PAD.left} x2={w - PAD.right} y1={y(target.alert)} y2={y(target.alert)} />
                                <text className="trend-ref-label alert" x={w - PAD.right} y={y(target.alert)} dy={higher ? '1.2em' : '-0.5em'} textAnchor="end">Alert {pct(target.alert)}</text>
                            </>
                        )}
                        {/* nhãn trục x */}
                        {daily.map((d, i) => ((n - 1 - i) % every === 0) && (
                            <text key={d.date} className="trend-x" x={x(i)} y={H - 8} textAnchor="middle">{i === n - 1 ? 'Today' : shortDay(d.date)}</text>
                        ))}
                        {cur && <line className="trend-cross" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} />}
                        {segments(values).map((seg) => seg.length > 1 && (
                            <path key={seg[0][0]} className="trend-line" d={segmentPath(seg, x, y)} stroke={`url(#${id}-l)`} />
                        ))}
                        {daily.map((d, i) => d.value != null && (
                            // chấm rỗng = ngày có ít mẫu (1 lượt nghe là 0% hoặc 100%) -> đừng đọc như ngày nhiều mẫu
                            <circle key={d.date} className={`trend-dot ${d.n < minSamples ? 'thin' : ''} ${hover === i ? 'on' : ''}`} cx={x(i)} cy={y(d.value)} r={hover === i ? 5.5 : 4} />
                        ))}
                        {/* vùng rê chuột: cả cột của 1 ngày (lớn hơn chấm) */}
                        {daily.map((d, i) => (
                            <rect
                                key={d.date}
                                className="trend-hit"
                                x={x(i) - slot / 2}
                                width={slot}
                                y={PAD.top}
                                height={H - PAD.top - PAD.bottom}
                                tabIndex={d.value != null ? 0 : -1}
                                aria-label={`${shortDay(d.date)}: ${formatValue(key, d.value)}, ${d.n} ${info.unit}`}
                                onMouseEnter={() => setHover(i)}
                                onMouseLeave={() => setHover(null)}
                                onFocus={() => setHover(i)}
                                onBlur={() => setHover(null)}
                            />
                        ))}
                    </svg>
                )}
                {has && isRate(key) && (
                    <ul className="chart-legend trend-legend" aria-label="Legend">
                        <li><span className="trend-key" aria-hidden="true" />{minSamples}+ {info.unit} that day</li>
                        <li><span className="trend-key thin" aria-hidden="true" />Fewer — one or two {info.unit} swing the rate a lot</li>
                        <li><span className="trend-key zone" aria-hidden="true" />Alert zone</li>
                    </ul>
                )}
                {cur && (
                    <div
                        className="chart-tip trend-tip"
                        style={{ left: Math.min(Math.max(x(hover), 90), w - 90), top: cur.value != null ? y(cur.value) : PAD.top }}
                    >
                        <strong>{hover === n - 1 ? 'Today' : shortDay(cur.date)}</strong>
                        <span>{metric.label}<b>{formatValue(key, cur.value)}</b></span>
                        <span>Based on<b>{cur.n} {info.unit}</b></span>
                    </div>
                )}
            </div>
        </StatsCard>
    );
};

export default TrendChart;

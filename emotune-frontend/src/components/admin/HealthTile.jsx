import { useId } from 'react';
import { METRIC_INFO, STATUS, deltaOf, formatValue, isRate, targetText } from './adminMeta';
import { segmentPath, segments, yDomain } from './trendMath';

// nhãn mức: icon + chữ (màu chỉ là lớp thêm, không bao giờ đứng một mình)
export const StatusPill = ({ status }) => (
    <span className={`status-pill s-${status}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={STATUS[status].icon} /></svg>
        {STATUS[status].label}
    </span>
);

// sparkline nhỏ trong ô: nét neon + vạch đứt = mục tiêu (chỉ tỉ lệ)
const TileSpark = ({ metric }) => {
    const id = useId();
    const values = metric.daily.map((d) => d.value);
    const [lo, hi] = yDomain(metric.key, values, metric.target);
    const n = values.length;
    const x = (i) => (n > 1 ? (i / (n - 1)) * 100 : 50);
    const y = (v) => 34 - ((v - lo) / (hi - lo || 1)) * 30;
    const segs = segments(values);
    return (
        <svg className="ht-spark" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id={`${id}-l`} x1="0" x2="1">
                    <stop offset="0" stopColor="#f08a3c" />
                    <stop offset="0.55" stopColor="#e8456e" />
                    <stop offset="1" stopColor="#a35cf0" />
                </linearGradient>
            </defs>
            {isRate(metric.key) && <line className="ht-target-line" x1="0" x2="100" y1={y(metric.target.ok)} y2={y(metric.target.ok)} />}
            {segs.map((seg) => (
                seg.length > 1
                    ? <path key={seg[0][0]} d={segmentPath(seg, x, y)} stroke={`url(#${id}-l)`} className="ht-line" />
                    // 1 ngày đứng riêng: đoạn rất ngắn + đầu tròn = 1 chấm (hình tròn sẽ bị méo vì preserveAspectRatio none)
                    : <path key={seg[0][0]} className="ht-line ht-dot" d={`M${x(seg[0][0])} ${y(seg[0][1])}h0.01`} stroke="#e8456e" />
            ))}
        </svg>
    );
};

// 1 ô chỉ số: tên + mức, số lớn, thay đổi so với kỳ trước, sparkline theo ngày, ngưỡng. Bấm = xem biểu đồ lớn bên dưới.
const HealthTile = ({ metric, days, selected, onSelect }) => {
    const delta = deltaOf(metric, days);
    const info = METRIC_INFO[metric.key];
    const tone = delta.good == null ? 'flat' : delta.good ? 'better' : 'worse';
    return (
        <button className={`health-tile s-${metric.status}`} aria-pressed={selected} onClick={onSelect}>
            <span className="ht-top">
                <span className="ht-label">{metric.label}</span>
                <StatusPill status={metric.status} />
            </span>
            <span className="ht-value">{formatValue(metric.key, metric.value)}</span>
            <span className="ht-short">
                {metric.value == null && isRate(metric.key)
                    ? `Only ${metric.samples} ${info.unit} — not enough to judge`
                    : `${info.short} · ${metric.samples.toLocaleString('en-GB')} ${info.unit}`}
            </span>
            <span className={`ht-delta ${tone}`}>
                {delta.up != null && (
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d={delta.up ? 'M12 19V5M6 11l6-6 6 6' : 'M12 5v14M6 13l6 6 6-6'} /></svg>
                )}
                {delta.text}
            </span>
            <TileSpark metric={metric} />
            <span className="ht-target">{targetText(metric.key, metric.target)}</span>
        </button>
    );
};

export default HealthTile;

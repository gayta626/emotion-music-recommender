// Vòng donut (SVG): mỗi phần là 1 cung, độ dài theo tỉ lệ; màu lấy từ class (vd "happy", "out-good" -> biến --c trong Stats.scss).
// parts: [{ key, value, className }]; children: nội dung ở giữa vòng (số, icon)
const Donut = ({ parts, size = 120, thickness = 12, label, className = '', children }) => {
    const r = (size - thickness) / 2;
    const C = 2 * Math.PI * r;
    const total = parts.reduce((s, p) => s + p.value, 0);
    const shown = parts.filter((p) => p.value > 0);
    const gap = shown.length > 1 ? 3 : 0;   // khe nhỏ giữa các cung (cùng màu nền thẻ)
    let offset = 0;
    return (
        <div className={`donut ${className}`} style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
                <circle className="donut-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={thickness} />
                {total > 0 && shown.map((p) => {
                    const len = (p.value / total) * C;
                    const dash = Math.max(0.5, len - gap);
                    const el = (
                        <circle
                            key={p.key}
                            className={`donut-arc ${p.className}`}
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            strokeWidth={thickness}
                            strokeDasharray={`${dash} ${C - dash}`}
                            strokeDashoffset={-offset}
                            transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        />
                    );
                    offset += len;
                    return el;
                })}
            </svg>
            {children && <div className="donut-center">{children}</div>}
        </div>
    );
};

export default Donut;

// Hàm toán dùng chung cho các biểu đồ SVG trang thống kê (đường cong mượt, toạ độ cực)

// toạ độ trên vòng tròn: 0° = hướng 12 giờ, quay theo chiều kim đồng hồ
export const polar = (r, deg) => {
    const a = (deg * Math.PI) / 180;
    return [r * Math.sin(a), -r * Math.cos(a)];
};

const f = (n) => n.toFixed(2);

// đường cong mượt đi QUA mọi điểm (Catmull-Rom -> Bézier bậc 3), dùng cho đường tròn + sparkline
export const smoothPath = (pts) => {
    if (pts.length < 2) return '';
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d;
};

// nội suy đơn điệu (Fritsch–Carlson) cho dãy cách đều, lấy `steps + 1` mẫu.
// Giữa 2 điểm đường cong không vượt ra ngoài 2 giá trị đó -> số lần quét không bao giờ âm, các lớp chồng không cắt nhau.
export const monotoneSample = (ys, steps) => {
    const n = ys.length;
    if (n === 1) return Array(steps + 1).fill(ys[0]);
    const d = ys.slice(0, -1).map((y, i) => ys[i + 1] - y);
    const m = ys.map((_, i) => {
        if (i === 0) return d[0];
        if (i === n - 1) return d[n - 2];
        return d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    });
    for (let i = 0; i < n - 1; i++) {
        if (d[i] === 0) {
            m[i] = 0;
            m[i + 1] = 0;
            continue;
        }
        const a = m[i] / d[i];
        const b = m[i + 1] / d[i];
        const s = a * a + b * b;
        if (s > 9) {
            const t = 3 / Math.sqrt(s);
            m[i] = t * a * d[i];
            m[i + 1] = t * b * d[i];
        }
    }
    const out = [];
    for (let k = 0; k <= steps; k++) {
        const x = (k / steps) * (n - 1);
        const i = Math.min(Math.floor(x), n - 2);
        const t = x - i;
        const t2 = t * t;
        const t3 = t2 * t;
        out.push(
            (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * m[i]
            + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * m[i + 1],
        );
    }
    return out;
};

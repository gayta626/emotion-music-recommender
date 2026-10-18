// Hàm vẽ đường theo ngày dùng chung cho sparkline trong ô chỉ số và biểu đồ lớn trang admin
import { monotoneSample } from '../stats/chartMath';
import { isRate } from './adminMeta';

// miền trục y: tỉ lệ thì ôm sát dữ liệu + vạch mục tiêu (để thấy rõ lên xuống), lượt quét thì từ 0
export const yDomain = (key, values, target) => {
    const vals = values.filter((v) => v != null);
    if (!isRate(key)) return [0, Math.max(4, ...vals)];
    const all = [...vals, target.ok, target.alert];
    return [Math.max(0, Math.min(...all) - 0.08), Math.min(1, Math.max(...all) + 0.08)];
};

// các đoạn liền nhau không có ngày trống (ngày trống = đứt nét, không vẽ như 0)
export const segments = (values) => {
    const out = [];
    let cur = [];
    values.forEach((v, i) => {
        if (v == null) {
            if (cur.length) out.push(cur);
            cur = [];
        } else cur.push([i, v]);
    });
    if (cur.length) out.push(cur);
    return out;
};

// đường cong đơn điệu qua các điểm của 1 đoạn (không vọt quá giá trị thật giữa 2 ngày)
export const segmentPath = (seg, x, y) => {
    if (seg.length === 1) return '';
    const steps = (seg.length - 1) * 8;
    const ys = monotoneSample(seg.map(([, v]) => v), steps);
    const i0 = seg[0][0];
    const span = seg[seg.length - 1][0] - i0;
    return ys.map((v, j) => `${j ? 'L' : 'M'}${x(i0 + (j / steps) * span).toFixed(2)} ${y(v).toFixed(2)}`).join(' ');
};

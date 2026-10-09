// Mau nen man loi bai hat: lay MAU CHU DAO cua anh bia -> moi bai 1 mau (kieu Spotify / NhacCuaTui).
// Chi giu sac do (hue) + do dam (saturation); do sang do CSS tu dat (nen toi vua du de chu trang de doc).

export const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return { h: h * 60, s, l };
};

// pixels: mang RGBA (ImageData.data). Chia diem anh vao 12 "o mau" theo hue (moi o 30 do),
// diem cang dam mau + sang vua thi cang nang ky; bo diem gan den / trang / xam (khong mang mau).
// O nang nhat = mau chu dao -> lay trung binh RGB cua o do. Anh gan nhu den trang -> trung binh ca anh.
export const dominantColor = (pixels) => {
    const buckets = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
    const all = { w: 0, r: 0, g: 0, b: 0 };
    for (let i = 0; i < pixels.length; i += 4) {
        const [r, g, b, a] = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
        if (a < 128) continue;
        all.w += 1; all.r += r; all.g += g; all.b += b;
        const { h, s, l } = rgbToHsl(r, g, b);
        if (s < 0.2 || l < 0.1 || l > 0.9) continue;
        const w = s * (1 - Math.abs(l - 0.5) * 1.4);
        const box = buckets[Math.floor(h / 30) % 12];
        box.w += w; box.r += r * w; box.g += g * w; box.b += b * w;
    }
    const best = buckets.reduce((a, b) => (b.w > a.w ? b : a));
    // it hon ~3% diem anh co mau -> coi nhu anh den trang
    const pick = best.w > all.w * 0.03 ? best : all;
    if (!pick.w) return null;
    return rgbToHsl(pick.r / pick.w, pick.g / pick.w, pick.b / pick.w);
};

// bai khong co anh / anh den trang: sac do co dinh theo ten bai (cung bai -> cung mau, bai khac -> mau khac)
export const hueFromText = (text) => {
    let h = 0;
    for (const ch of text || "") h = (h * 31 + ch.codePointAt(0)) % 360;
    return h;
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// -> bien CSS cho .lyrics-view. Vang / xanh la (hue 40-190) sang hon cac mau khac o cung do sang
// -> ha do sang vet sang xuong de chu trang van ro
export const lyricsPalette = ({ h, s }) => ({
    "--ly-h": Math.round(h),
    "--ly-s": `${Math.round(clamp(s, 0.35, 0.8) * 100)}%`,
    "--ly-glow-l": h >= 40 && h <= 190 ? "26%" : "36%",
});

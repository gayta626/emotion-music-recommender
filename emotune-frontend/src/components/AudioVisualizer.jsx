import { useEffect, useRef } from 'react'
import { getGraph } from '../utils/audioGraph'

// Song am chay theo nhac that: Web Audio API doc tan so cua <audio> moi khung hinh roi ve len canvas.
// Am tram (bass) o giua, am cao ra hai ben; cot doi xung tren / duoi duong giua; vong sang phia sau "dap" theo bass.
// Cot trang sang o giua, nga nhe sang mau vibe o 2 dau + quang sang cung mau (bien CSS --viz-1, --viz-glow
// tren .player[data-vibe]).
// DO CAO THEO DO TO THAT CUA BAI: so voi doan to nhat cua bai (thang dB, nho ~30 giay) -> doan dao nho thi cot thap,
// len dien khuc to thi cot vot cao; hinh dang (cot nao cao, cot nao thap) theo pho am tung luc.

const BARS_PER_SIDE = 32;
const MIN_FREQ = 50;      // Hz
const MAX_FREQ = 10000;   // Hz
const BASS_MAX_FREQ = 250;
// muc to nhat "nho" lau: moi khung hinh chi quen 0.05% (~30 giay o 60 khung/giay) -> giu duoc chenh lech doan nho / doan to
const SONG_PEAK_DECAY = 0.9995;
// analyser tra so theo thang dB (-90..-12 dB -> 0..1): 0.3 ~ 23 dB. Nho hon doan to nhat >= 23 dB -> cot thap nhat
const LOUD_RANGE = 0.3;

// chia dai tan 40Hz–10kHz thanh cac cot theo thang log (bass co nhieu cot hon, giong tai nguoi nghe)
const buildBands = (sampleRate, binCount) => {
    const hzPerBin = sampleRate / 2 / binCount;
    const bands = [];
    for (let i = 0; i < BARS_PER_SIDE; i++) {
        const f1 = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, i / BARS_PER_SIDE);
        const f2 = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, (i + 1) / BARS_PER_SIDE);
        const start = Math.max(1, Math.floor(f1 / hzPerBin));
        const end = Math.max(start + 1, Math.ceil(f2 / hzPerBin));
        bands.push([start, Math.min(end, binCount)]);
    }
    return { bands, bassEnd: Math.max(2, Math.ceil(BASS_MAX_FREQ / hzPerBin)) };
}

// "#ffb347" -> "255 179 71" (de ghep rgb(r g b / alpha))
const hexToRgb = (hex, fallback) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return fallback;
    const n = parseInt(m[1], 16);
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

const AudioVisualizer = ({ audioRef, vibe }) => {
    const canvasRef = useRef(null);
    const themeRef = useRef(null);

    // doi bai -> doc lai mau tu CSS (effect chay sau khi CSS cua data-vibe moi da ap dung)
    useEffect(() => {
        const cs = getComputedStyle(canvasRef.current);
        const read = (name) => cs.getPropertyValue(name).trim();
        themeRef.current = {
            tint: hexToRgb(read('--viz-1'), '255 255 255'),
            glow: read('--viz-glow') || '255 255 255',
        };
    }, [vibe]);

    useEffect(() => {
        const audio = audioRef.current;
        const canvas = canvasRef.current;
        if (!audio || !canvas) return;

        const graph = getGraph(audio);
        // trinh duyet de AudioContext o trang thai "suspended" -> phai resume moi co tieng
        const resume = () => { graph?.ctx.resume().catch(() => { }); };
        audio.addEventListener('play', resume);
        resume();

        const analyser = graph?.analyser;
        const data = new Uint8Array(analyser ? analyser.frequencyBinCount : 0);
        const { bands, bassEnd } = analyser
            ? buildBands(graph.ctx.sampleRate, analyser.frequencyBinCount)
            : { bands: [], bassEnd: 2 };
        const levels = new Array(BARS_PER_SIDE).fill(0);
        const raw = new Array(BARS_PER_SIDE).fill(0);
        let bass = 0;
        let bassPeak = 0.3;
        let loudness = 0;        // do to chung luc nay (0..1 so voi doan to nhat cua bai), lam muot
        let loudPeak = 0.15;

        const ctx2d = canvas.getContext('2d');
        // ve net tren man hinh do phan giai cao
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.round(canvas.clientWidth * dpr);
            canvas.height = Math.round(canvas.clientHeight * dpr);
            ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);

        // doc tan so -> levels[] (hinh dang 0..1), loudness (do cao chung 0..1), bass (0..1, "dap" theo trong)
        const analyse = () => {
            if (analyser) analyser.getByteFrequencyData(data);

            // muc bass 0..1 (trung binh cac bin < 250Hz)
            let bassSum = 0;
            for (let b = 1; b < bassEnd && b < data.length; b++) bassSum += data[b];
            const bassNow = data.length ? bassSum / ((bassEnd - 1) * 255) : 0;
            bassPeak = Math.max(bassNow, bassPeak * 0.997, 0.15);
            // luy thua 3: chi nhung nhip trong manh moi day len; len nhanh, xuong cham -> "dap" ro
            const kick = Math.pow(bassNow / bassPeak, 3);
            bass = kick > bass ? bass + (kick - bass) * 0.7 : bass * 0.9;

            let frameMax = 0;
            let sum = 0;
            for (let i = 0; i < BARS_PER_SIDE; i++) {
                let v = 0;
                if (bands[i]) {
                    const [start, end] = bands[i];
                    let s = 0;
                    for (let b = start; b < end; b++) s += data[b];
                    v = s / ((end - start) * 255);
                }
                // am cao thuong nho hon -> nang len cho deu
                raw[i] = v * (1 + (i / BARS_PER_SIDE) * 0.8);
                frameMax = Math.max(frameMax, raw[i]);
                sum += raw[i];
            }

            // DO CAO CHUNG = do to luc nay thap hon doan to nhat cua bai bao nhieu dB
            const loudNow = sum / BARS_PER_SIDE;
            loudPeak = Math.max(loudNow, loudPeak * SONG_PEAK_DECAY, 0.08);
            const target = Math.max(0, Math.min(1, 1 - (loudPeak - loudNow) / LOUD_RANGE));
            loudness = target > loudness ? loudness + (target - loudness) * 0.25 : loudness * 0.96 + target * 0.04;

            // HINH DANG = pho am luc nay (dai nao to hon dai nao)
            for (let i = 0; i < BARS_PER_SIDE; i++) {
                const v = Math.pow(raw[i] / Math.max(frameMax, 0.05), 1.8);
                // len nhanh, xuong em -> muot, khong giat tung khung hinh
                levels[i] = v > levels[i] ? levels[i] + (v - levels[i]) * 0.55 : levels[i] * 0.86 + v * 0.14;
            }
        };

        let frameId;
        const draw = () => {
            frameId = requestAnimationFrame(draw);
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            ctx2d.clearRect(0, 0, w, h);
            analyse();
            const theme = themeRef.current;
            if (!theme) return;

            const cx = w / 2;
            const cy = h / 2;

            // vong sang mau vibe phia sau (elip be ngang), phong to theo bass.
            // Ban kinh doc <= nua chieu cao canvas -> mo han truoc khi cham mep (khong lo khung chu nhat)
            const STRETCH = 1.8;
            const glowR = Math.min(h / 2, w / 2 / STRETCH) * (0.55 + bass * 0.45);
            ctx2d.save();
            ctx2d.translate(cx, cy);
            ctx2d.scale(STRETCH, 1);
            const glow = ctx2d.createRadialGradient(0, 0, 0, 0, 0, glowR);
            glow.addColorStop(0, `rgb(${theme.glow} / ${0.16 + bass * 0.3})`);
            glow.addColorStop(0.55, `rgb(${theme.glow} / ${0.05 + bass * 0.08})`);
            glow.addColorStop(1, `rgb(${theme.glow} / 0)`);
            ctx2d.fillStyle = glow;
            ctx2d.fillRect(-glowR, -glowR, glowR * 2, glowR * 2);
            ctx2d.restore();

            // cac cot: doi xung trai/phai, keo dai len/xuong tu duong giua
            const areaW = Math.min(w * 0.66, 1100);
            const slot = areaW / (BARS_PER_SIDE * 2);
            const barW = Math.max(2, slot * 0.62);
            // doan nho ~30% chieu cao, doan to nhat gan het khung (theo khung, khong chan cung px -> laptop / man to deu cung ti le); ca dai song phong len theo bass -> "dap" theo trong
            const maxH = Math.min(h * 0.62, 420) * (0.3 + 0.7 * Math.pow(loudness, 1.2)) * (0.88 + bass * 0.12);

            // to mau doc: trang sang o giua, nga nhe sang mau vibe o 2 dau cot
            const fill = ctx2d.createLinearGradient(0, cy - maxH / 2, 0, cy + maxH / 2);
            fill.addColorStop(0, `rgb(${theme.tint} / 0.9)`);
            fill.addColorStop(0.5, 'rgb(255 255 255 / 0.97)');
            fill.addColorStop(1, `rgb(${theme.tint} / 0.9)`);
            ctx2d.fillStyle = fill;
            ctx2d.shadowColor = `rgb(${theme.glow} / 0.75)`;
            ctx2d.shadowBlur = 10 + bass * 20;

            for (let i = 0; i < BARS_PER_SIDE; i++) {
                const barH = Math.max(4, levels[i] * maxH);
                const offset = (i + 0.5) * slot;
                for (const x of [cx - offset, cx + offset]) {
                    ctx2d.beginPath();
                    if (ctx2d.roundRect) ctx2d.roundRect(x - barW / 2, cy - barH / 2, barW, barH, barW / 2);
                    else ctx2d.rect(x - barW / 2, cy - barH / 2, barW, barH);
                    ctx2d.fill();
                }
            }
        };
        draw();

        return () => {
            cancelAnimationFrame(frameId);
            observer.disconnect();
            audio.removeEventListener('play', resume);
        };
    }, [audioRef]);

    return <canvas ref={canvasRef} className="visualizer" aria-hidden="true" />
}

export default AudioVisualizer

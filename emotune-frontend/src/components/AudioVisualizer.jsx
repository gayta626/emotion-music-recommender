import { useEffect, useRef } from 'react'

// Song am chay theo nhac that: Web Audio API doc tan so cua <audio> moi khung hinh roi ve len canvas.
// Am tram (bass) o giua, am cao ra hai ben; vong sang phia sau "dap" theo bass.

const BARS_PER_SIDE = 32;
const MIN_FREQ = 50;      // Hz
const MAX_FREQ = 10000;   // Hz
const BASS_MAX_FREQ = 250;

// 1 AudioContext dung chung; moi the <audio> chi duoc noi vao Web Audio 1 lan
// (StrictMode chay effect 2 lan -> lan 2 lay lai tu WeakMap thay vi tao moi, tao lai se bao loi)
let sharedCtx = null;
const graphs = new WeakMap();

const getGraph = (audio) => {
    let graph = graphs.get(audio);
    if (graph) return graph;
    try {
        if (!sharedCtx) sharedCtx = new AudioContext();
        const source = sharedCtx.createMediaElementSource(audio);
        const analyser = sharedCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.75;
        // khoang dB rong hon mac dinh -> cot it bi cham tran khi nhac to
        analyser.minDecibels = -90;
        analyser.maxDecibels = -12;
        // audio -> analyser -> loa (khong noi ra loa thi mat tieng)
        source.connect(analyser);
        analyser.connect(sharedCtx.destination);
        graph = { ctx: sharedCtx, analyser };
        graphs.set(audio, graph);
        return graph;
    } catch (err) {
        // trinh duyet khong ho tro -> van phat nhac binh thuong, song am nam yen
        console.log("Khong tao duoc song am:", err);
        return null;
    }
}

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

const AudioVisualizer = ({ audioRef }) => {
    const canvasRef = useRef(null);

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
        // "tu can do lon": nho muc to nhat gan day roi chia cho no -> bai nho tieng van nhay ro, bai to khong cham tran
        let peak = 0.3;
        let bassPeak = 0.3;

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

        let frameId;
        const draw = () => {
            frameId = requestAnimationFrame(draw);
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            ctx2d.clearRect(0, 0, w, h);

            if (analyser) analyser.getByteFrequencyData(data);

            // muc bass 0..1 (trung binh cac bin < 250Hz)
            let bassSum = 0;
            for (let b = 1; b < bassEnd && b < data.length; b++) bassSum += data[b];
            const bassNow = data.length ? bassSum / ((bassEnd - 1) * 255) : 0;
            bassPeak = Math.max(bassNow, bassPeak * 0.997, 0.15);
            // luy thua 3: chi nhung nhip trong manh moi day len; len nhanh, xuong cham -> "dap" ro
            const kick = Math.pow(bassNow / bassPeak, 3);
            bass = kick > bass ? kick : bass * 0.88;

            const cx = w / 2;
            const cy = h / 2;

            // vong sang phia sau, phong to theo bass
            const glowR = Math.min(w, h) * (0.28 + bass * 0.32);
            const glow = ctx2d.createRadialGradient(cx, cy, 0, cx, cy, glowR);
            glow.addColorStop(0, `rgba(255, 255, 255, ${0.1 + bass * 0.3})`);
            glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx2d.fillStyle = glow;
            ctx2d.fillRect(0, 0, w, h);

            // cac cot: doi xung trai/phai, keo dai len/xuong tu duong giua
            const areaW = Math.min(w * 0.9, 960);
            const slot = areaW / (BARS_PER_SIDE * 2);
            const barW = Math.max(2, slot * 0.62);
            // ca dai song phong len theo bass -> cam giac "dap" theo nhip trong
            const maxH = Math.min(h * 0.82, 380) * (0.7 + bass * 0.3);

            ctx2d.fillStyle = 'rgba(255, 255, 255, 0.92)';
            ctx2d.shadowColor = 'rgba(255, 255, 255, 0.55)';
            ctx2d.shadowBlur = 8 + bass * 18;

            let frameMax = 0;
            for (let i = 0; i < BARS_PER_SIDE; i++) {
                let v = 0;
                if (bands[i]) {
                    const [start, end] = bands[i];
                    let sum = 0;
                    for (let b = start; b < end; b++) sum += data[b];
                    v = sum / ((end - start) * 255);
                }
                // am cao thuong nho hon -> nang len cho deu
                raw[i] = v * (1 + (i / BARS_PER_SIDE) * 0.8);
                frameMax = Math.max(frameMax, raw[i]);
            }
            peak = Math.max(frameMax, peak * 0.997, 0.12);

            for (let i = 0; i < BARS_PER_SIDE; i++) {
                // chia cho muc to nhat gan day; luy thua de cot cao/thap chenh nhau ro
                const v = Math.pow(Math.min(1, raw[i] / peak), 1.5);
                levels[i] = v > levels[i] ? v : levels[i] * 0.85 + v * 0.15;

                const barH = Math.max(4, levels[i] * maxH);
                const offset = (i + 0.5) * slot;
                for (const x of [cx - offset, cx + offset]) {
                    ctx2d.beginPath();
                    if (ctx2d.roundRect) ctx2d.roundRect(x - barW / 2, cy - barH / 2, barW, barH, barW / 2);
                    else ctx2d.rect(x - barW / 2, cy - barH / 2, barW, barH);
                    ctx2d.fill();
                }
            }
            ctx2d.shadowBlur = 0;
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

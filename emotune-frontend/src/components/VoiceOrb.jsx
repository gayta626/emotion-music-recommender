import { useEffect, useRef } from 'react';
import { isSpeechSupported } from '../utils/speech';

// Qua cau song cua tro ly (theo anh mau "Infographic Chart", hinh ben phai): luoi tron mo + 2 dai nhieu soi song
// 3 canh dan cheo nhau (dai am cam -> hong, dai lanh tim -> xanh) + vien trang gon song. Lo tron giua de nut micro.
// Ca qua cau "phap phong" theo giong noi:
//   mode "mic"      = theo micro nguoi dung (dai am theo am tram, dai lanh theo am cao),
//   mode "speaking" = nhip gia khi tro ly doc loi tra loi,
//   mode "idle"     = tho cham.
// activityRef: thoi diem (performance.now) Web Speech vua nghe ra chu -> du phong khi khong doc duoc micro (cham hon).
// Micro mo 1 lan khi overlay mo va giu suot: vua bat dau noi la qua cau nhay ngay (khong cho mo micro / cho Web Speech
// ra chu), luc chua noi thi do san tieng on nen cua tung may.
// Ve lai canvas moi khung hinh (khong setState 60 lan/giay).
const LINES = 22;          // so soi trong 1 dai
const POINTS = 160;        // so diem tren 1 vong
const BASE = 0.55;         // ban kinh trung binh cua dai song (theo ban kinh canvas)
const HOLE = 0.24;         // vong tron giua (lo dat nut micro)
const MIN_FREQ = 90;       // Hz - giong noi nam khoang 90Hz..5kHz, am tram / am cao chia o 500Hz
const SPLIT_FREQ = 500;
const MAX_FREQ = 5000;
const ACTIVITY_MS = 450;   // Web Speech vua nghe ra chu trong 450ms -> coi nhu dang noi

// 2 dai song: lech pha PI -> 2 tam giac nguoc nhau dan thanh hinh sao nhu anh mau; quay nguoc chieu nhau
const RIBBONS = [
    {
        phase: 0, speed: 0.00035, twist: 1.6,
        stops: [[0, "#ff9d57"], [0.3, "#ff6fa8"], [0.55, "#c35be8"], [0.8, "#ff8a5c"], [1, "#ff9d57"]],
    },
    {
        phase: Math.PI, speed: -0.00028, twist: 1.8,
        stops: [[0, "#7b6cff"], [0.35, "#c063f0"], [0.6, "#5d7dff"], [0.85, "#e070c8"], [1, "#7b6cff"]],
    },
];

// 1 dai tan cua micro: tu do "nen on" cua may nay (muc trung binh khi im lang + do dao dong cua no)
// thay cho 1 nguong co dinh -> micro laptop thu nho van nhay theo giong, phong on (quat may) thi khong nhay lung tung.
const makeBand = (boost) => ({ range: [1, 2], boost, floor: 0, dev: 0.02, frames: 0, peak: 0.03 });
const CALIBRATE_FRAMES = 30;   // ~0.5s dau: do nen on nhanh

const VoiceOrb = ({ mode, activityRef }) => {
    const canvasRef = useRef(null);
    const modeRef = useRef(mode);

    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx2d = canvas.getContext("2d");
        const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        let raf = 0;
        let stopped = false;
        let stream = null;
        let audioCtx = null;
        let analyser = null;
        let data = null;
        const bands = [makeBand(1), makeBand(1.6)];   // [am tram, am cao]; am cao thuong nho hon -> nang len cho deu
        const levels = [0.1, 0.1];      // [dai am, dai lanh] 0..1, da lam muot
        let size = 0;

        // giu canvas net tren man hinh mat do cao: kich thuoc that = kich thuoc CSS x devicePixelRatio
        const resize = () => {
            size = canvas.clientWidth;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.round(size * dpr);
            canvas.height = Math.round(size * dpr);
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);

        // trinh duyet khong nhan giong duoc (Firefox...) -> chi go chu, khong xin micro chi de ve
        if (isSpeechSupported() && navigator.mediaDevices?.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then((s) => {
                    if (stopped) {
                        s.getTracks().forEach((t) => t.stop());
                        return;
                    }
                    stream = s;
                    audioCtx = new AudioContext();
                    // trinh duyet hay tao AudioContext o trang thai "suspended" -> khong resume thi chi doc ra im lang
                    audioCtx.resume().catch(() => {});
                    analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 1024;
                    analyser.smoothingTimeConstant = 0.3;   // it lam muot -> vua phat ra tieng la bat duoc
                    analyser.minDecibels = -95;
                    analyser.maxDecibels = -25;
                    audioCtx.createMediaStreamSource(s).connect(analyser);
                    data = new Uint8Array(analyser.frequencyBinCount);
                    const hzPerBin = audioCtx.sampleRate / 2 / analyser.frequencyBinCount;
                    const bin = (hz) => Math.max(1, Math.round(hz / hzPerBin));
                    bands[0].range = [bin(MIN_FREQ), bin(SPLIT_FREQ)];
                    bands[1].range = [bin(SPLIT_FREQ), Math.min(bin(MAX_FREQ), analyser.frequencyBinCount)];
                })
                .catch(() => {});   // khong co / chan micro -> chi con nhip theo Web Speech (activityRef)
        }

        // muc 0..1 cua 1 dai = phan vuot len tren nen on, chia cho muc to nhat gan day
        const readBand = (band) => {
            const [start, end] = band.range;
            let sum = 0;
            for (let b = start; b < end; b++) sum += data[b];
            const v = (sum / ((end - start) * 255)) * band.boost;
            if (sum === 0) return 0;   // micro vua mo, AudioContext chua co du lieu -> khong tinh vao nen on
            band.frames++;
            // muc vuot nen on hon 3 lan do dao dong -> la giong noi; con lai la on: cap nhat nen on + do dao dong
            // (luc dau do nhanh; khi dang noi nen chi nhich rat cham -> noi lien vai giay khong bi tinh thanh nen)
            if (band.frames === 1) band.floor = v;
            const gate = band.floor + 3 * band.dev + 0.005;
            if (v < gate || band.frames < CALIBRATE_FRAMES) {
                const rate = band.frames < CALIBRATE_FRAMES ? 0.2 : 0.05;
                band.floor += (v - band.floor) * rate;
                band.dev += (Math.abs(v - band.floor) - band.dev) * rate;
            } else {
                band.floor += (v - band.floor) * 0.002;
            }
            const signal = Math.max(0, v - gate);
            band.peak = Math.max(signal, band.peak * 0.995, 0.03);
            return Math.min(1, signal / band.peak);
        };

        // doc micro MOI khung hinh (ca luc chua nghe) de nen on luon dung; null = chua co micro
        const readMic = () => {
            if (!analyser) return null;
            analyser.getByteFrequencyData(data);
            return [readBand(bands[0]), readBand(bands[1])];
        };

        const targetLevels = (t) => {
            const idle = 0.08 + 0.05 * Math.sin(t / 900);       // tho cham
            const mic = readMic() ?? [0, 0];
            const mode = modeRef.current;
            if (mode === "speaking") {
                // tung "tieng" mot: |sin| tao nhip len xuong ~0.4s, song cham hon lam cau to nho khac nhau
                const syllable = Math.abs(Math.sin(t / 130)) * (0.6 + 0.4 * Math.sin(t / 410));
                return [0.3 + 0.6 * syllable, 0.25 + 0.6 * Math.abs(Math.sin(t / 150 + 0.8)) * (0.6 + 0.4 * Math.sin(t / 370))];
            }
            if (mode === "mic") {
                const heard = t - (activityRef?.current ?? -Infinity) < ACTIVITY_MS;
                const speech = heard ? 0.5 + 0.25 * Math.sin(t / 90) : 0;
                return [Math.max(idle, mic[0], speech), Math.max(idle, mic[1], speech * 0.9)];
            }
            return [idle, idle];
        };

        // luoi tron mo phia sau: vong dong tam, nan hoa, vach chia quanh mep (dung yen)
        const drawGrid = (R) => {
            ctx2d.lineWidth = 1;
            ctx2d.strokeStyle = "rgba(255, 255, 255, 0.09)";
            for (const r of [0.5, 0.7, 0.9]) {
                ctx2d.beginPath();
                ctx2d.arc(0, 0, R * r, 0, Math.PI * 2);
                ctx2d.stroke();
            }
            ctx2d.beginPath();
            for (let i = 0; i < 24; i++) {
                const a = (i / 24) * Math.PI * 2;
                ctx2d.moveTo(Math.cos(a) * R * HOLE, Math.sin(a) * R * HOLE);
                ctx2d.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92);
            }
            ctx2d.stroke();
            ctx2d.strokeStyle = "rgba(255, 255, 255, 0.18)";
            ctx2d.beginPath();
            for (let i = 0; i < 120; i++) {
                const a = (i / 120) * Math.PI * 2;
                const inner = i % 5 === 0 ? 0.94 : 0.96;
                ctx2d.moveTo(Math.cos(a) * R * inner, Math.sin(a) * R * inner);
                ctx2d.lineTo(Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98);
            }
            ctx2d.stroke();
            // vong sang quanh lo micro
            ctx2d.strokeStyle = "rgba(255, 255, 255, 0.28)";
            ctx2d.beginPath();
            ctx2d.arc(0, 0, R * HOLE, 0, Math.PI * 2);
            ctx2d.stroke();
        };

        // 1 dai = LINES soi cung dang song 3 canh, lech pha nhau mot chut -> cac soi cat nhau thanh dai xoan
        const drawRibbon = (ribbon, level, t, R, scale) => {
            const turn = ribbon.phase + t * ribbon.speed;
            const grad = ctx2d.createConicGradient
                ? ctx2d.createConicGradient(turn, 0, 0)
                : ctx2d.createLinearGradient(-R, 0, R, 0);
            ribbon.stops.forEach(([offset, color]) => grad.addColorStop(offset, color));
            ctx2d.strokeStyle = grad;
            ctx2d.lineWidth = 0.9;
            for (let j = 0; j < LINES; j++) {
                const k = j / (LINES - 1) - 0.5;                    // -0.5..0.5: vi tri soi trong dai
                const phase = turn + k * ribbon.twist;
                const amp = (0.08 + level * 0.24) * (1 + 0.35 * k * Math.sin(t * 0.0007 + j));
                ctx2d.globalAlpha = 0.3 + 0.6 * (1 - Math.abs(k) * 2);   // soi o mep dai mo hon
                ctx2d.beginPath();
                for (let p = 0; p <= POINTS; p++) {
                    const a = (p / POINTS) * Math.PI * 2;
                    const r = R * scale * (BASE + amp * Math.sin(3 * a + phase)
                        + 0.05 * Math.sin(2 * a - phase * 0.7 + k * 1.5) + 0.02 * k);
                    const x = Math.cos(a) * r;
                    const y = Math.sin(a) * r;
                    if (p === 0) ctx2d.moveTo(x, y);
                    else ctx2d.lineTo(x, y);
                }
                ctx2d.stroke();
            }
            ctx2d.globalAlpha = 1;
        };

        // 3 vien trang gon song ngoai cung
        const drawContours = (level, t, R, scale) => {
            ctx2d.lineWidth = 0.8;
            ctx2d.strokeStyle = "rgba(255, 255, 255, 0.35)";
            for (let i = 0; i < 3; i++) {
                ctx2d.beginPath();
                for (let p = 0; p <= POINTS; p++) {
                    const a = (p / POINTS) * Math.PI * 2;
                    const r = R * scale * (0.84 + 0.02 * Math.sin(7 * a + t * 0.0011 + i)
                        + 0.015 * Math.sin(13 * a - t * 0.0017 + i * 2)
                        + level * 0.08 * Math.sin(3 * a + t * 0.0005 + i));
                    const x = Math.cos(a) * r;
                    const y = Math.sin(a) * r;
                    if (p === 0) ctx2d.moveTo(x, y);
                    else ctx2d.lineTo(x, y);
                }
                ctx2d.stroke();
            }
        };

        const tick = (now) => {
            const [warm, cool] = targetLevels(now);
            // len nhanh, xuong cham -> phap phong ro ma khong giat
            levels[0] += (warm - levels[0]) * (warm > levels[0] ? 0.5 : 0.08);
            levels[1] += (cool - levels[1]) * (cool > levels[1] ? 0.5 : 0.08);

            const t = still ? 0 : now;   // "giam chuyen dong": khong quay, chi phap phong theo giong
            const dpr = canvas.width / (size || 1);
            const R = size / 2;
            const scale = 0.8 + 0.22 * Math.max(levels[0], levels[1]);   // nghi: thu nho, noi to: no ra gan mep
            ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx2d.clearRect(0, 0, size, size);
            ctx2d.translate(R, R);
            drawGrid(R);
            ctx2d.globalCompositeOperation = "lighter";   // cho soi chong nhau sang len nhu anh mau
            drawRibbon(RIBBONS[0], levels[0], t, R, scale);
            drawRibbon(RIBBONS[1], levels[1], t, R, scale);
            ctx2d.globalCompositeOperation = "source-over";
            drawContours(Math.max(levels[0], levels[1]), t, R, scale);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            stopped = true;
            cancelAnimationFrame(raf);
            observer.disconnect();
            stream?.getTracks().forEach((track) => track.stop());
            audioCtx?.close();
        };
    }, [activityRef]);

    return <canvas ref={canvasRef} className="voice-orb" aria-hidden="true" />;
};

export default VoiceOrb;

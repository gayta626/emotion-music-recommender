import { useEffect, useRef } from 'react';

// Song am cua tro ly (Figma 284:120): 43 vach, dang song lay tu ban ve (cao nhat 420px).
// mode: "mic" = nhay theo giong nguoi dung, "speaking" = nhip gia khi tro ly doc, "idle" = gan phang (cham nhu Figma).
// Khi nghe mic: doc TUNG DAI TAN cho tung vach giong AudioVisualizer cua trinh phat (am tram o giua, am cao ra 2 ben,
// tu can theo muc to nhat gan day) -> nhay nhay nhu luc phat nhac, khong chi phong to ca song theo 1 muc am luong.
// activityRef: thoi diem (performance.now) Web Speech vua nghe ra chu -> khong doc duoc micro thi van nhay theo nguoi noi.
// Cap nhat thang style tung vach moi khung hinh (khong setState 60 lan/giay).
const PROFILE = [18, 18, 18, 60, 107, 182, 232, 306, 380, 420, 380, 306, 232, 182, 107, 60, 89, 60, 60, 107, 148, 182,
    232, 182, 107, 60, 60, 60, 48, 87, 147, 169, 224, 278, 307, 278, 224, 170, 133, 79, 18, 18, 18].map((h) => h / 420);

const CENTER = Math.floor(PROFILE.length / 2);      // vach giua = am tram nhat
const BANDS = CENTER + 1;                           // so dai tan (doi xung 2 ben)
const MIN_FREQ = 90;      // Hz - giong noi nam khoang 90Hz..5kHz
const MAX_FREQ = 5000;
const IDLE_LEVEL = 0.05;
const SILENCE = 0.07;     // ca khung hinh nho hon muc nay -> coi la im lang (tieng on nen)
const ACTIVITY_MS = 450;  // Web Speech vua nghe ra chu trong 450ms -> coi nhu dang noi

// chia 90Hz..5kHz thanh BANDS dai theo thang log (giong tai nguoi nghe)
const buildBands = (sampleRate, binCount) => {
    const hzPerBin = sampleRate / 2 / binCount;
    const bands = [];
    for (let i = 0; i < BANDS; i++) {
        const f1 = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, i / BANDS);
        const f2 = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, (i + 1) / BANDS);
        const start = Math.max(1, Math.floor(f1 / hzPerBin));
        const end = Math.max(start + 1, Math.ceil(f2 / hzPerBin));
        bands.push([start, Math.min(end, binCount)]);
    }
    return bands;
};

const VoiceWave = ({ mode, activityRef }) => {
    const barsRef = useRef([]);

    useEffect(() => {
        let raf = 0;
        let stopped = false;
        let stream = null;
        let ctx = null;
        let analyser = null;
        let data = null;
        let bands = [];
        let peak = 0.25;                                   // tu can do lon theo muc to nhat gan day
        const raw = new Array(BANDS).fill(0);
        const levels = new Array(PROFILE.length).fill(IDLE_LEVEL);

        if (mode === "mic" && navigator.mediaDevices?.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then((s) => {
                    if (stopped) {
                        s.getTracks().forEach((t) => t.stop());
                        return;
                    }
                    stream = s;
                    ctx = new AudioContext();
                    // trinh duyet hay tao AudioContext o trang thai "suspended" -> khong resume thi chi doc ra im lang
                    ctx.resume().catch(() => {});
                    analyser = ctx.createAnalyser();
                    analyser.fftSize = 1024;
                    analyser.smoothingTimeConstant = 0.55;   // thap hon trinh phat -> bat kip tung tieng noi
                    analyser.minDecibels = -90;
                    analyser.maxDecibels = -20;
                    ctx.createMediaStreamSource(s).connect(analyser);
                    data = new Uint8Array(analyser.frequencyBinCount);
                    bands = buildBands(ctx.sampleRate, analyser.frequencyBinCount);
                })
                .catch(() => {});   // khong co / chan micro -> chi con nhip theo Web Speech (activityRef)
        }

        // muc 0..1 cho tung dai tan tu micro; false = chua co micro
        const readMic = () => {
            if (!analyser) return false;
            analyser.getByteFrequencyData(data);
            let frameMax = 0;
            for (let i = 0; i < BANDS; i++) {
                const [start, end] = bands[i];
                let sum = 0;
                for (let b = start; b < end; b++) sum += data[b];
                // am cao thuong nho hon -> nang len cho deu
                raw[i] = (sum / ((end - start) * 255)) * (1 + (i / BANDS) * 0.8);
                frameMax = Math.max(frameMax, raw[i]);
            }
            peak = Math.max(frameMax, peak * 0.996, 0.15);
            if (frameMax < SILENCE) raw.fill(0);
            return true;
        };

        const tick = (t) => {
            const hasMic = mode === "mic" && readMic();
            const heardRecently = mode === "mic" && t - (activityRef?.current ?? -Infinity) < ACTIVITY_MS;

            barsRef.current.forEach((bar, i) => {
                if (!bar) return;
                let target = IDLE_LEVEL;
                if (mode === "speaking") {
                    target = PROFILE[i] * (0.45 + 0.3 * Math.sin(t / 180)) * (0.75 + 0.25 * Math.sin(t / 120 + i * 0.7));
                } else if (mode === "mic") {
                    const band = Math.abs(i - CENTER);
                    // chia cho muc to nhat gan day, luy thua -> cot cao/thap chenh nhau ro (giong trinh phat)
                    const mic = hasMic ? Math.pow(Math.min(1, raw[band] / peak), 1.4) : 0;
                    // khong doc duoc mic nhung Web Speech dang nghe ra chu -> song gia theo dang Figma
                    const speech = heardRecently ? PROFILE[i] * (0.55 + 0.3 * Math.sin(t / 90 + i * 0.6)) : 0;
                    target = Math.max(IDLE_LEVEL, mic, speech);
                }
                // len nhanh, xuong cham -> nhay ro ma khong giat
                levels[i] = target > levels[i] ? target : levels[i] * 0.82 + target * 0.18;
                bar.style.transform = `scaleY(${Math.max(0.04, levels[i])})`;
            });
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            stopped = true;
            cancelAnimationFrame(raf);
            stream?.getTracks().forEach((track) => track.stop());
            ctx?.close();
        };
    }, [mode, activityRef]);

    return (
        <div className="voice-wave" aria-hidden="true">
            {PROFILE.map((_, i) => (
                <span key={i} ref={(el) => { barsRef.current[i] = el; }} />
            ))}
        </div>
    );
};

export default VoiceWave;

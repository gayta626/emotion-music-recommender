import { useCallback, useEffect, useRef, useState } from 'react';
import { detectPitch, emptyStats, hzToMidi, judgeFrame, KARAOKE_HOP, scoreFromStats } from '../utils/karaokeScore';

// nen on (tieng phong / tieng loa lot vao micro) = muc NHO NHAT gan day: im lang thi ha nhanh, co tieng thi chi nhich len
// rat cham -> nguoi dung hat ngay tu dau cung khong bi tinh thanh nen (giua cac cau luon co luc lay hoi)
const FLOOR_DOWN = 0.3;
const FLOOR_UP = 0.003;
// to hon nen 3 lan (~10dB) va tren muc toi thieu moi xet la co the dang hat
const LOUD_RATIO = 3;
const MIN_RMS = 0.004;

// Cham diem karaoke: mo micro, moi 50ms do cao do giong nguoi hat (YIN) va so voi cao do ca si cung luc
// (track tu useKaraokeTrack). Am thanh micro CHI xu ly tren trinh duyet, khong gui di dau, khong luu.
// active = dang bat "Score me" (+ karaoke AI, dang o man loi). Tat -> dong micro ngay.
// -> { status: "idle" | "listening" | "blocked", hearing (dang nghe thay giong), getResult(), reset() }
export const useSingScore = ({ active, audioRef, track }) => {
    const [status, setStatus] = useState("idle");
    const [hearing, setHearing] = useState(false);
    // thong ke cong don ca bai (tat / bat lai giua bai van giu; "Sing again" moi xoa)
    const statsRef = useRef(emptyStats());

    useEffect(() => {
        if (!active || !track) return;
        let stopped = false;
        let stream = null;
        let ctx = null;
        let timer = null;

        if (!navigator.mediaDevices?.getUserMedia) {
            Promise.resolve().then(() => { if (!stopped) setStatus("blocked"); });
            return () => { stopped = true; };
        }

        // khu vong (echoCancellation): bot tieng nhac tu loa lot vao micro; tat loc on / tu chinh am luong
        // vi 2 bo nay coi tieng hat keo dai la "on" va nen nho di
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } })
            .then((s) => {
                if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
                stream = s;
                ctx = new AudioContext();
                ctx.resume().catch(() => { });
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 2048;            // ~43ms o 48kHz: du dai cho not thap nhat (70Hz)
                ctx.createMediaStreamSource(s).connect(analyser);
                const buf = new Float32Array(analyser.fftSize);
                setStatus("listening");

                let floor = null;
                let lastT = null;
                let wasHearing = false;
                timer = setInterval(() => {
                    analyser.getFloatTimeDomainData(buf);
                    let sum = 0;
                    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
                    const rms = Math.sqrt(sum / buf.length);
                    floor = floor === null ? rms : floor + (rms - floor) * (rms < floor ? FLOOR_DOWN : FLOOR_UP);
                    const loud = rms > Math.max(floor * LOUD_RATIO, MIN_RMS);
                    // co tieng + co cao do ro (YIN) moi la giong hat; tieng nhac lot vao nhieu not cung luc thuong khong qua duoc YIN
                    const hz = loud ? detectPitch(buf, ctx.sampleRate) : null;
                    const voice = hz !== null;
                    if (voice !== wasHearing) { wasHearing = voice; setHearing(voice); }

                    // chi cham luc nhac dang chay lien mach (tam dung / tua -> bo qua khung do)
                    const audio = audioRef.current;
                    if (!audio || audio.paused || audio.seeking) { lastT = null; return; }
                    const t = audio.currentTime;
                    const jumped = lastT !== null && (t < lastT || t - lastT > 0.5);
                    lastT = t;
                    if (jumped) return;
                    judgeFrame(statsRef.current, track, t, voice ? hzToMidi(hz) : null);
                }, KARAOKE_HOP * 1000);
            })
            .catch(() => { if (!stopped) setStatus("blocked"); });

        return () => {
            stopped = true;
            clearInterval(timer);
            stream?.getTracks().forEach((t) => t.stop());
            ctx?.close().catch(() => { });
            setStatus("idle");
            setHearing(false);
        };
    }, [active, track, audioRef]);

    const getResult = useCallback(() => scoreFromStats(statsRef.current), []);
    const reset = useCallback(() => { statsRef.current = emptyStats(); }, []);
    return { status, hearing, getResult, reset };
};

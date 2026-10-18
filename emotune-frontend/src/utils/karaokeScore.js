// Cham diem karaoke (H15 phan 3) — ham thuan, khong dung React / Web Audio (de thu bang node).
//
// Du lieu ca si: karaoke/<ten mp3>.json do `npm run make-karaoke` tao (Demucs tach giong -> YIN do cao do),
//   { v: 1, hop: 0.05, pitch: [MIDI x 10 | 0 = ca si khong hat] }  -> 20 diem / giay.
// Giong nguoi hat: micro -> YIN (detectPitch) moi 50ms -> so voi ca si cung luc do (judgeFrame).
//
// 2 phan diem:
// - On time (60%): luc ca si hat, ban co hat khong (ti le khung ca si hat ma micro nghe thay giong ban).
// - On key  (40%): luc ban hat, not ban hat co trung not ca si khong. So theo TEN NOT (bo qua quang tam:
//   nam hat thap hon nu 1 quang tam van tinh dung), lech <= 1 cung van tinh dung (cham kieu may karaoke, de tinh).
// Diem hien thi duoc "noi tay" (hat 80% thoi gian = du 100 On time, trung not 70% = du 100 On key) cho vui.

export const KARAOKE_HOP = 0.05;
// ca si hat truoc / sau 1 chut van tinh (nguoi hat theo thuong cham hon ca si ~0.2s)
const LOOK_BEHIND_S = 0.3;
const LOOK_AHEAD_S = 0.1;
// On time: xet khung ca si tre 0.3s so voi hien tai -> nhin duoc giong nguoi hat ca truoc lan sau khung do (+-0.3s)
const TIMING_LAG_S = 0.3;
const KEY_TOLERANCE = 1;           // cung (semitone)
const FULL_TIMING = 0.8;
const FULL_KEY = 0.7;
const MIN_SINGER_FRAMES = 100;     // ca si phai hat >= 5 giay trong luc cham moi du de cho diem
const MIN_TIMING = 0.3;            // hat it hon 30% thoi gian ca si hat -> "chua du de cham"

export const karaokeBaseName = (song) => song.file_path.replace(/\.[^.]+$/, "");

// json tu server -> { hop, pitch } hoac null (file sai dinh dang)
export const parseKaraokeTrack = (json) =>
    json && json.v === 1 && Array.isArray(json.pitch) && json.hop > 0 ? { hop: json.hop, pitch: json.pitch } : null;

// cao do ca si (MIDI) luc t giay; 0 = khong hat
export const singerMidiAt = (track, t) => {
    const v = track.pitch[Math.round(t / track.hop)];
    return v ? v / 10 : 0;
};

export const hzToMidi = (hz) => 69 + 12 * Math.log2(hz / 440);

// khoang cach 2 not theo ten not (0..6 cung), khong ke quang tam
export const pitchClassDistance = (a, b) => {
    const d = Math.abs(a - b) % 12;
    return Math.min(d, 12 - d);
};

// YIN (de Cheveigne & Kawahara 2002) tren 1 doan song am (Float32Array).
// Tra ve tan so (Hz) hoac null neu doan nay khong co cao do ro (im lang, tieng on, phu am "s", "x"...).
export const detectPitch = (buf, sampleRate, { fmin = 70, fmax = 1000, threshold = 0.15 } = {}) => {
    // ha tan so lay mau 2 lan (trung binh 2 mau): giong nguoi < 1kHz, tinh nhanh gap 4
    const n = buf.length >> 1;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = (buf[2 * i] + buf[2 * i + 1]) * 0.5;
    const sr = sampleRate / 2;
    const tauMax = Math.min(Math.floor(sr / fmin), n >> 1);
    const tauMin = Math.max(2, Math.floor(sr / fmax));
    const w = n - tauMax;
    if (w <= tauMin) return null;

    // ham hieu chuan hoa tich luy (CMND)
    const cmnd = new Float32Array(tauMax + 1);
    cmnd[0] = 1;
    let running = 0;
    for (let tau = 1; tau <= tauMax; tau++) {
        let sum = 0;
        for (let j = 0; j < w; j++) {
            const diff = x[j] - x[j + tau];
            sum += diff * diff;
        }
        running += sum;
        cmnd[tau] = running > 0 ? (sum * tau) / running : 1;
    }

    // tau dau tien duoi nguong roi truot xuong day thung lung
    let tau = -1;
    for (let t = tauMin; t <= tauMax; t++) {
        if (cmnd[t] < threshold) {
            while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
            tau = t;
            break;
        }
    }
    if (tau < 0) return null;

    // noi suy parabol -> cao do min hon 1 mau
    const left = cmnd[tau - 1];
    const right = tau + 1 <= tauMax ? cmnd[tau + 1] : cmnd[tau];
    const denom = left - 2 * cmnd[tau] + right;
    const shift = Math.abs(denom) > 1e-9 ? Math.max(-1, Math.min(1, (0.5 * (left - right)) / denom)) : 0;
    const hz = sr / (tau + shift);
    return hz >= fmin && hz <= fmax ? hz : null;
};

// recent: cac khung gan day { t, voiced } cua nguoi hat (cho phan On time)
export const emptyStats = () => ({ singerFrames: 0, sungFrames: 0, keyFrames: 0, keyHits: 0, recent: [] });

// cong 1 khung (50ms) vao thong ke: t = thoi gian bai, userMidi = not nguoi hat (null = khong hat)
export const judgeFrame = (stats, track, t, userMidi) => {
    const singing = userMidi !== null && userMidi !== undefined;
    // On time: ca si hat luc ts = t - 0.3s -> nguoi hat co cat giong trong khoang ts +- 0.3s khong
    stats.recent = stats.recent.filter((r) => r.t > t - 2 * TIMING_LAG_S - 1e-9 && r.t <= t);
    stats.recent.push({ t, voiced: singing });
    const ts = t - TIMING_LAG_S;
    if (ts >= 0 && singerMidiAt(track, ts)) {
        stats.singerFrames++;
        if (stats.recent.some((r) => r.voiced && Math.abs(r.t - ts) <= TIMING_LAG_S + 1e-9)) stats.sungFrames++;
    }
    if (!singing) return stats;
    // so voi moi not ca si hat quanh luc do, lay not gan nhat
    let best = Infinity;
    for (let s = t - LOOK_BEHIND_S; s <= t + LOOK_AHEAD_S + 1e-9; s += track.hop) {
        const m = singerMidiAt(track, s);
        if (m) best = Math.min(best, pitchClassDistance(userMidi, m));
    }
    if (best !== Infinity) {
        stats.keyFrames++;
        if (best <= KEY_TOLERANCE) stats.keyHits++;
    }
    return stats;
};

// thong ke -> diem hien len the
// { enough, score 0..100, onTime 0..100, onKey 0..100, comment }
export const scoreFromStats = (stats) => {
    const timing = stats.singerFrames ? stats.sungFrames / stats.singerFrames : 0;
    const key = stats.keyFrames ? stats.keyHits / stats.keyFrames : 0;
    const onTime = Math.round(100 * Math.min(1, timing / FULL_TIMING));
    const onKey = Math.round(100 * Math.min(1, key / FULL_KEY));
    const enough = stats.singerFrames >= MIN_SINGER_FRAMES && timing >= MIN_TIMING;
    const score = Math.round(0.6 * onTime + 0.4 * onKey);
    return { enough, score, onTime, onKey, comment: enough ? commentFor(score) : "Not enough singing to score. Give it another go!" };
};

const commentFor = (score) =>
    score >= 90 ? "Superstar! The crowd goes wild."
        : score >= 75 ? "Nice! You really felt that one."
            : score >= 60 ? "Not bad at all, keep it going!"
                : "Warm-up round. Try another one!";

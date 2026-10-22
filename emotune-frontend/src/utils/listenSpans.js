// Cham diem nghe: cac doan da nghe ghi tren CUNG 1 truc tien do bai (0 = dau bai, 1 = het bai),
// du nghe bang mp3, nhac dem karaoke hay MV (MV: quy ve giay cua bai bang mvTime.mvToSong — co do lech MV / mp3 thi bo canh mo dau / ket MV).
// Nghe 100s dau bang mp3 + 100s cuoi bang MV (bai 200s) -> 2 doan [0, 0.5] + [0.5, 1] -> da nghe 100%;
// nghe lai cung 1 doan (mp3 roi MV) thi chi tinh 1 lan.
import { mvToSong } from './mvTime.js';

// them doan [a, b] (theo giay) cua 1 nguon dai `duration` giay vao danh sach (khong sua mang cu)
export const addSpan = (spans, a, b, duration) => {
    if (!(duration > 0) || !(b > a)) return spans;
    const start = Math.max(0, a / duration);
    const end = Math.min(1, b / duration);
    if (end <= start) return spans;
    return [...spans, [start, end]];
};

// doan MV [a, b] (giay cua MV) -> doan tren truc bai (mvTime.mvToSong: co do lech thi bo canh mo dau / ket MV,
// chua do thi quy theo ti le do dai)
export const addMvSpan = (spans, a, b, sync) => addSpan(spans, mvToSong(a, sync), mvToSong(b, sync), sync.songDur);

// tong phan bai da nghe (0..1): gop cac doan chong nhau truoc khi cong
export const coveredFraction = (spans) => {
    const sorted = [...spans].sort((x, y) => x[0] - y[0]);
    let total = 0;
    let cur = null;
    for (const [a, b] of sorted) {
        if (cur && a <= cur[1]) cur[1] = Math.max(cur[1], b);
        else {
            if (cur) total += cur[1] - cur[0];
            cur = [a, b];
        }
    }
    if (cur) total += cur[1] - cur[0];
    return Math.min(total, 1);
};

// TimeRanges cua the <audio> (audio.played) -> danh sach doan
export const spansFromPlayed = (played, duration) => {
    let spans = [];
    for (let i = 0; i < played.length; i++) spans = addSpan(spans, played.start(i), played.end(i), duration);
    return spans;
};

// Doi thoi diem giua mp3 va MV YouTube cua cung 1 bai, de bat / tat MV ma nhac NOI TIEP dung doan.
// sync = { offset, songDur, mvDur }:
//   offset = songs.mv_offset (giay, `npm run align-mv` do bang so cao do 2 ban): MV giay (t + offset) = mp3 giay t
//            (MV hay co canh phim mo dau / ket thuc -> quy theo ti le do dai bi lech vai giay toi vai chuc giay)
//   offset null (chua do / do khong chac) -> quy theo ti le do dai nhu cu
// Ham thuan -> test/mvTime.test.js

const hasOffset = (sync) => sync.offset !== null && sync.offset !== undefined && Number.isFinite(Number(sync.offset));
const clamp = (t, max) => Math.max(0, max > 0 ? Math.min(t, max) : t);

export const songToMv = (t, sync) => {
    if (hasOffset(sync)) return clamp(Math.round((t + Number(sync.offset)) * 100) / 100, sync.mvDur);
    return sync.songDur > 0 && sync.mvDur > 0 ? t * sync.mvDur / sync.songDur : t;
};

export const mvToSong = (t, sync) => {
    if (hasOffset(sync)) return clamp(Math.round((t - Number(sync.offset)) * 100) / 100, sync.songDur);
    return sync.songDur > 0 && sync.mvDur > 0 ? t * sync.songDur / sync.mvDur : t;
};

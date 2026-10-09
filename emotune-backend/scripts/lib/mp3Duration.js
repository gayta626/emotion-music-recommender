// Do dai file mp3 (giay) doc tu header, khong can cai ffmpeg.
// Dung chung cho fetch-lyrics (chon ban loi khop do dai) va fetch-song-info (cot thoi luong).
const fs = require('fs');

// MPEG-1 / MPEG-2(.5) Layer III: bang bitrate (kbps) va tan so lay mau
const BITRATES = {
    v1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
    v2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

const mp3Duration = (file) => {
    const buf = fs.readFileSync(file);
    let off = 0;
    // bo qua the ID3v2 (ten bai, anh bia...) o dau file
    if (buf.toString("latin1", 0, 3) === "ID3") {
        const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
        off = 10 + size + ((buf[5] & 0x10) ? 10 : 0);
    }
    // tim khung am thanh dau tien (11 bit dau = 1)
    while (off < buf.length - 4 && !(buf[off] === 0xff && (buf[off + 1] & 0xe0) === 0xe0)) off++;
    if (off >= buf.length - 4) return null;
    const h = buf.readUInt32BE(off);
    const version = (h >> 19) & 3;        // 3 = MPEG-1, 2 = MPEG-2, 0 = MPEG-2.5
    const bitrate = (version === 3 ? BITRATES.v1 : BITRATES.v2)[(h >> 12) & 15];
    const sampleRate = SAMPLE_RATES[version]?.[(h >> 10) & 3];
    if (!bitrate || !sampleRate) return null;
    const samplesPerFrame = version === 3 ? 1152 : 576;
    const mono = ((h >> 6) & 3) === 3;
    // file VBR co the "Xing"/"Info" (hoac "VBRI") ghi san so khung -> tinh chinh xac
    const x = off + 4 + (version === 3 ? (mono ? 17 : 32) : (mono ? 9 : 17));
    const tag = buf.toString("latin1", x, x + 4);
    if ((tag === "Xing" || tag === "Info") && (buf.readUInt32BE(x + 4) & 1)) {
        return buf.readUInt32BE(x + 8) * samplesPerFrame / sampleRate;
    }
    if (buf.toString("latin1", off + 36, off + 40) === "VBRI") {
        return buf.readUInt32BE(off + 36 + 14) * samplesPerFrame / sampleRate;
    }
    // CBR: dung luong / bitrate
    return (buf.length - off) * 8 / (bitrate * 1000);
};

module.exports = { mp3Duration };

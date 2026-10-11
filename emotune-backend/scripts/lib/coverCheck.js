// Nhan ra anh bia "gia": trang tai nhac (vd NhacCuaTui) nhung LOGO CUA HO vao the ID3 cua moi bai khong co bia that.
// import-music tung chep thang anh nay vao covers/ -> 41 bai hien logo tai nghe xanh thay vi bia album.
// Hai cach nhan ra (ham thuan, co test):
//  1. md5 nam trong danh sach logo da biet
//  2. cung 1 anh nhung trong >= 3 bai cua dot nhap -> anh mac dinh (2 bai chung 1 album van giu bia chung)
const crypto = require("crypto");

const KNOWN_PLACEHOLDERS = new Set([
    "0baadc14708d2c666cd874b6782977cc",   // logo NhacCuaTui (tai nghe + nut play, nen xanh 600x600)
]);
const SAME_IMAGE_LIMIT = 3;

const imageHash = (buf) => crypto.createHash("md5").update(buf).digest("hex");

// anh (Buffer, null bo qua) -> Map md5 -> so lan xuat hien
const countHashes = (images) => {
    const counts = new Map();
    images.filter(Boolean).forEach((buf) => {
        const h = imageHash(buf);
        counts.set(h, (counts.get(h) || 0) + 1);
    });
    return counts;
};

const isPlaceholderCover = (buf, counts = new Map()) => {
    if (!buf) return false;
    const h = imageHash(buf);
    return KNOWN_PLACEHOLDERS.has(h) || (counts.get(h) || 0) >= SAME_IMAGE_LIMIT;
};

module.exports = { KNOWN_PLACEHOLDERS, imageHash, countHashes, isPlaceholderCover };

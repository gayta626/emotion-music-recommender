// Doc the ID3 trong file mp3 (khong can thu vien): ten bai, ca si, album, the loai, nam, anh bia.
// ID3v2.3 / v2.4 nam o dau file; thieu thi thu ID3v1 (128 byte cuoi file, chi co chu Latin).
// Tra ve { title, artist, album, genre, year, cover: { mime, data } | null } (truong nao khong co = null).
const fs = require('fs');

const syncsafe = (b, i) => (b[i] << 21) | (b[i + 1] << 14) | (b[i + 2] << 7) | b[i + 3];

// chu trong frame: byte dau = cach ma hoa (0 Latin-1, 1 UTF-16 co BOM, 2 UTF-16BE, 3 UTF-8)
const decodeText = (enc, buf) => {
    let text;
    if (enc === 1 || enc === 2) {
        let le = enc === 1;
        let start = 0;
        if (enc === 1 && buf.length >= 2) {
            if (buf[0] === 0xff && buf[1] === 0xfe) { le = true; start = 2; }
            else if (buf[0] === 0xfe && buf[1] === 0xff) { le = false; start = 2; }
        }
        let body = Buffer.from(buf.subarray(start, start + ((buf.length - start) & ~1)));
        if (!le) body.swap16();
        text = body.toString('utf16le');
    } else {
        text = buf.toString(enc === 3 ? 'utf8' : 'latin1');
    }
    // nhieu gia tri ngan bang \0 (v2.4) -> lay gia tri dau
    return text.split('\0')[0].trim() || null;
};

// APIC: ma hoa, kieu anh (chu Latin, ket thuc \0), loai anh (1 byte), mo ta (ket thuc \0 hoac \0\0), du lieu anh
const decodePicture = (buf) => {
    const enc = buf[0];
    let i = 1;
    const mimeEnd = buf.indexOf(0, i);
    if (mimeEnd < 0) return null;
    const mime = buf.toString('latin1', i, mimeEnd) || 'image/jpeg';
    i = mimeEnd + 2;   // bo \0 + byte loai anh
    if (enc === 1 || enc === 2) {
        while (i + 1 < buf.length && !(buf[i] === 0 && buf[i + 1] === 0)) i += 2;
        i += 2;
    } else {
        while (i < buf.length && buf[i] !== 0) i++;
        i += 1;
    }
    const data = buf.subarray(i);
    return data.length > 100 ? { mime: mime.includes('/') ? mime : `image/${mime.toLowerCase()}`, data } : null;
};

const readV2 = (fd) => {
    const head = Buffer.alloc(10);
    fs.readSync(fd, head, 0, 10, 0);
    if (head.toString('latin1', 0, 3) !== 'ID3') return null;
    const version = head[3];
    if (version < 3 || version > 4) return null;   // v2.2 rat hiem, bo qua
    const size = syncsafe(head, 6);
    const tag = Buffer.alloc(size);
    fs.readSync(fd, tag, 0, size, 10);

    let pos = 0;
    if (head[5] & 0x40) {   // co extended header -> bo qua
        pos = version === 4 ? syncsafe(tag, 0) : tag.readUInt32BE(0) + 4;
    }
    const frames = {};
    while (pos + 10 <= tag.length) {
        const id = tag.toString('latin1', pos, pos + 4);
        if (!/^[A-Z0-9]{4}$/.test(id)) break;   // het frame (vung dem \0)
        const len = version === 4 ? syncsafe(tag, pos + 4) : tag.readUInt32BE(pos + 4);
        const body = tag.subarray(pos + 10, pos + 10 + len);
        pos += 10 + len;
        if (len <= 0 || frames[id]) continue;
        if (id === 'APIC') frames.APIC = decodePicture(body);
        else if (id[0] === 'T') frames[id] = decodeText(body[0], body.subarray(1));
    }
    // the loai kieu "(13)" hoac "(13)Pop" (so cua ID3v1) -> giu phan chu neu co
    let genre = frames.TCON || null;
    if (genre) genre = genre.replace(/^\(\d+\)/, '').trim() || null;
    return {
        title: frames.TIT2 || null,
        artist: frames.TPE1 || frames.TPE2 || null,
        album: frames.TALB || null,
        genre,
        year: (frames.TDRC || frames.TYER || '').slice(0, 4) || null,
        cover: frames.APIC || null,
    };
};

const readV1 = (fd, fileSize) => {
    if (fileSize < 128) return null;
    const buf = Buffer.alloc(128);
    fs.readSync(fd, buf, 0, 128, fileSize - 128);
    if (buf.toString('latin1', 0, 3) !== 'TAG') return null;
    const field = (a, b) => buf.toString('latin1', a, b).split('\0')[0].trim() || null;
    return { title: field(3, 33), artist: field(33, 63), album: field(63, 93), genre: null, year: field(93, 97), cover: null };
};

const readTags = (file) => {
    const fd = fs.openSync(file, 'r');
    try {
        const v2 = readV2(fd);
        const v1 = readV1(fd, fs.fstatSync(fd).size);
        const pick = (k) => v2?.[k] || v1?.[k] || null;
        return { title: pick('title'), artist: pick('artist'), album: pick('album'), genre: pick('genre'), year: pick('year'), cover: v2?.cover || null };
    } finally {
        fs.closeSync(fd);
    }
};

module.exports = { readTags };

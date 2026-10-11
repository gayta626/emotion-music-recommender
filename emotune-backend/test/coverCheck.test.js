// Unit test nhan ra anh bia "gia" (logo trang nhac nhung san trong mp3) — scripts/lib/coverCheck.js
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const { imageHash, isPlaceholderCover, countHashes, KNOWN_PLACEHOLDERS } = require("../scripts/lib/coverCheck");

const img = (text) => Buffer.from(text);

test("logo NhacCuaTui (md5 da biet) la anh gia", () => {
    assert.ok(KNOWN_PLACEHOLDERS.has("0baadc14708d2c666cd874b6782977cc"));
    // file that tren may (neu con) phai bi nhan ra
    const real = path.join(__dirname, "..", "covers", "perfect.png");
    if (fs.existsSync(real) && imageHash(fs.readFileSync(real)) === "0baadc14708d2c666cd874b6782977cc") {
        assert.strictEqual(isPlaceholderCover(fs.readFileSync(real)), true);
    }
});

test("cung 1 anh nhung trong >= 3 bai khac nhau -> anh mac dinh cua trang tai, khong phai bia album", () => {
    const logo = img("logo-trang-nhac-khac");
    const counts = countHashes([logo, logo, logo, img("bia-that-1"), img("bia-that-2")]);
    assert.strictEqual(isPlaceholderCover(logo, counts), true);
    assert.strictEqual(isPlaceholderCover(img("bia-that-1"), counts), false);
});

test("2 bai chung 1 album (cung bia) van giu", () => {
    const album = img("bia-album-chung");
    assert.strictEqual(isPlaceholderCover(album, countHashes([album, album])), false);
});

test("khong co anh / khong co bang dem -> chi xet danh sach da biet", () => {
    assert.strictEqual(isPlaceholderCover(null), false);
    assert.strictEqual(isPlaceholderCover(img("bia-bat-ky")), false);
});

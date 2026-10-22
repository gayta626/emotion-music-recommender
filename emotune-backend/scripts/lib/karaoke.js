// Duong dan Python cua venv rieng .venv-karaoke (Demucs + torch) — dung chung cho `npm run make-karaoke`,
// `import-music --apply` va chay nen khi admin them bai (src/services/libraryEnrich.js).
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");

const karaokePython = () => (process.platform === "win32"
    ? path.join(ROOT, ".venv-karaoke", "Scripts", "python.exe")
    : path.join(ROOT, ".venv-karaoke", "bin", "python"));

// may nay da cai venv chua (chua cai -> bo qua buoc tach giong, bai van dung karaoke L − R tren trinh duyet)
const karaokeReady = () => fs.existsSync(karaokePython());

// do lech MV / mp3 (align-mv) can them yt-dlp trong cung venv (pip install yt-dlp); chua cai -> web quy theo ti le do dai
const alignReady = () => karaokeReady() && fs.existsSync(path.join(path.dirname(karaokePython()),
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"));

module.exports = { karaokePython, karaokeReady, alignReady };

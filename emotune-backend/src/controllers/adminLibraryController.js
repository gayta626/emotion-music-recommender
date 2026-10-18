const multer = require("multer")
const adminLibraryService = require("../services/adminLibraryService")

// Quan ly kho nhac (route da qua requireAuth + requireAdmin).
// Upload giu trong RAM (memoryStorage): service kiem tra xong het moi ghi ra dia -> form sai khong de lai file rac.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 40 * 1024 * 1024, files: 3 } });
const songFiles = upload.fields([{ name: "file", maxCount: 1 }, { name: "cover", maxCount: 1 }, { name: "lyrics", maxCount: 1 }]);
const artistFiles = upload.fields([{ name: "photo", maxCount: 1 }]);

// chay multer truoc controller; file qua lon / sai ten truong -> 400 de admin doc duoc
const withFiles = (parser) => (req, res, next) => parser(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 40 MB)" : "Upload failed: " + err.message;
    return res.status(400).json({ error: message });
});

const send = (res, status, promise, label) => promise
    .then((data) => res.status(status).json(data))
    .catch((err) => {
        if (!err.status) console.error(`Loi ${label}:`, err);
        return res.status(err.status || 500).json({ error: err.status ? err.message : "Server error" });
    });

const id = (req) => Number(req.params.id) || 0;

// GET /admin/library -> { songs, artists, genres, vibes }
let getLibrary = (req, res) => send(res, 200, adminLibraryService.getLibrary(), "kho nhac");

// POST /admin/songs/analyze (multipart: file .mp3) -> goi y ten bai, ca si, vibe, the loai, album, bia, loi (khong luu gi)
let analyzeSong = (req, res) => send(res, 200, adminLibraryService.analyzeSong(req.files), "doc file mp3");

// GET /admin/library/enrich -> trang thai cac script chay nen (fetch-images, fetch-song-info, fetch-mv)
let getEnrich = (req, res) => send(res, 200, adminLibraryService.enrichStatus(), "trang thai script nen");

// POST /admin/songs (multipart: file .mp3 bat buoc, cover / lyrics tuy chon + cac truong; artist / genre la TEN)
let createSong = (req, res) => send(res, 201, adminLibraryService.createSong(req.body || {}, req.files), "them bai");

// PATCH /admin/songs/:id (multipart, chi gui truong muon doi)
let updateSong = (req, res) => send(res, 200, adminLibraryService.updateSong(id(req), req.body || {}, req.files), "sua bai");

// DELETE /admin/songs/:id
let deleteSong = (req, res) => send(res, 200, adminLibraryService.deleteSong(id(req)), "xoa bai");

// POST /admin/artists, PATCH /admin/artists/:id (multipart: name, photo tuy chon)
let createArtist = (req, res) => send(res, 201, adminLibraryService.createArtist(req.body || {}, req.files), "them ca si");
let updateArtist = (req, res) => send(res, 200, adminLibraryService.updateArtist(id(req), req.body || {}, req.files), "sua ca si");

// DELETE /admin/artists/:id (chi khi khong con bai)
let deleteArtist = (req, res) => send(res, 200, adminLibraryService.deleteArtist(id(req)), "xoa ca si");

module.exports = {
    songUpload: withFiles(songFiles), artistUpload: withFiles(artistFiles),
    getLibrary, analyzeSong, getEnrich, createSong, updateSong, deleteSong,
    createArtist, updateArtist, deleteArtist,
}

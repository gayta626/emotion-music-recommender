const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const adminLibraryModel = require("../model/adminLibraryModel");
const genreModel = require("../model/genreModel");
const { enrichLibrary, getEnrichStatus } = require("./libraryEnrich");
const { slugify } = require("../../scripts/rename-music");
const { mp3Duration } = require("../../scripts/lib/mp3Duration");
const { readTags } = require("../../scripts/lib/id3");
const { findLyrics } = require("../../scripts/lib/lrclib");
const { isPlaceholderCover } = require("../../scripts/lib/coverCheck");
const {
    plain, primaryArtist, cleanTitle, canonicalArtists, cleanAlbum, mapGenre, VIBE_ENERGY, lyricsText, guessVibe,
} = require("../../scripts/lib/importMusic");

// Quan ly kho nhac tren trang admin: them bai (upload mp3), sua thong tin, xoa; them / sua / xoa ca si.
// Them bai tren web = quy trinh cua `npm run import-music` cho 1 bai:
//   1. analyze: doc the ID3, lam sach ten bai / ca si, tim loi LRCLIB, DOAN vibe + the loai -> admin xem lai tren form
//   2. create: luu mp3 + bia trong file + loi, them ca si / the loai moi neu chua co,
//      roi chay nen fetch-images + fetch-song-info + fetch-mv (libraryEnrich) de lay anh ca si, bia, album, MV.

const ROOT = path.join(__dirname, "..", "..");
const DIRS = {
    music: path.join(ROOT, "music"),
    covers: path.join(ROOT, "covers"),
    lyrics: path.join(ROOT, "lyrics"),
    photos: path.join(ROOT, "avatars", "photos"),
};
const VIBES = ["happy", "sad", "angry", "neutral", "surprise"];
const IMAGE_EXT = { "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const TITLE_MAX = 200;
const NAME_MAX = 100;
const GENRE_MAX = 30;
const LYRICS_TIMEOUT_MS = 10000;
// ket qua buoc analyze (the ID3 + loi tim duoc) giu 30 phut theo md5 file -> buoc create khong phai len LRCLIB lan nua
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 20;
const analyzed = new Map();

const fail = (status, message) => {
    const err = new Error(message);
    err.status = status;
    return err;
};

const toText = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

// Ham thuan: nhan id 11 ky tu hoac link YouTube (watch?v=, youtu.be/, /embed/, /shorts/) -> id; rong -> null; sai -> undefined
const parseYoutubeId = (raw) => {
    const s = toText(raw);
    if (!s) return null;
    if (/^[\w-]{11}$/.test(s)) return s;
    const m = s.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{11})/);
    return m ? m[1] : undefined;
};

// Ham thuan: kiem tra form bai hat (multipart -> moi gia tri la chuoi).
// artist / genre la TEN (chua co thi service tao moi, giong import-music); the loai viet thuong (bang genres bat buoc).
// partial = true (sua bai): chi kiem tra truong co gui len. -> { fields } hoac { error }
const validateSongFields = (body = {}, { partial = false } = {}) => {
    const has = (k) => body[k] !== undefined;
    const fields = {};
    if (!partial || has("title")) {
        const title = toText(body.title);
        if (!title) return { error: "Title is required" };
        if (title.length > TITLE_MAX) return { error: `Title must be at most ${TITLE_MAX} characters` };
        fields.title = title;
    }
    if (!partial || has("emotion")) {
        if (!VIBES.includes(body.emotion)) return { error: "Vibe must be one of: " + VIBES.join(", ") };
        fields.emotion = body.emotion;
    }
    if (!partial || has("artist")) {
        const artist = toText(body.artist);
        if (artist.length > NAME_MAX) return { error: `Artist must be at most ${NAME_MAX} characters` };
        fields.artist = artist || null;
    }
    if (!partial || has("genre")) {
        const genre = toText(body.genre).toLowerCase();
        if (genre.length > GENRE_MAX) return { error: `Genre must be at most ${GENRE_MAX} characters` };
        fields.genre = genre || null;
    }
    if (!partial || has("energy")) {
        const raw = toText(body.energy);
        if (raw === "") {
            // de trong khi them bai -> muc mac dinh theo vibe (giong import-music); khi sua -> bo trong
            fields.energy = partial ? null : (VIBE_ENERGY[fields.emotion] ?? null);
        } else {
            const e = Number(raw);
            if (!Number.isFinite(e) || e < 0 || e > 1) return { error: "Energy must be a number from 0 to 1" };
            fields.energy = e;
        }
    }
    if (!partial || has("album")) {
        const album = toText(body.album);
        if (album.length > TITLE_MAX) return { error: `Album must be at most ${TITLE_MAX} characters` };
        fields.album = album || null;
    }
    if (!partial || has("youtube_id")) {
        const id = parseYoutubeId(body.youtube_id);
        if (id === undefined) return { error: "MV must be a YouTube link or an 11-character video id" };
        fields.youtube_id = id;
    }
    return { fields };
};

// Ham thuan: ten file khong dau, khong trung voi `used` (Set ten file .mp3 da co) -> "ten_bai" / "ten_bai_ca_si" / "ten_bai_2"
const uniqueBase = (title, artist, used) => {
    let base = slugify(title) || "bai_hat";
    if (used.has(base + ".mp3") && artist) base = slugify(`${title} ${artist}`) || base;
    let name = base;
    for (let i = 2; used.has(name + ".mp3"); i++) name = `${base}_${i}`;
    return name;
};

// Ham thuan: bai trung (cung ten bai + ca si, khong dau, giong import-music) trong `rows` [{ id, title, artist }] -> dong do / null
const findDuplicate = (rows, title, artist, exceptId = null) => {
    const key = `${plain(title)}|${plain(artist)}`;
    return rows.find((r) => r.id !== exceptId && `${plain(r.title)}|${plain(r.artist)}` === key) || null;
};

// Ham thuan: the loai nhieu nhat cua cac bai cung ca si (bai khong co the loai trong the ID3 thi theo ca si) -> ten / null
const artistGenreOf = (rows, artist) => {
    if (!artist) return null;
    const votes = {};
    rows.forEach((r) => { if (r.genre && plain(r.artist) === plain(artist)) votes[r.genre] = (votes[r.genre] || 0) + 1; });
    const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : null;
};

// file anh upload (multer) -> duoi file theo kieu anh; khong phai anh -> loi 400
const imageExt = (file, label) => {
    const ext = IMAGE_EXT[file.mimetype];
    if (!ext) throw fail(400, `${label} must be a JPG, PNG or WebP image`);
    return ext;
};

const writeFile = (dir, name, data) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), data);
};

const checkMp3 = (mp3) => {
    if (!mp3) throw fail(400, "Choose an MP3 file");
    if (path.extname(mp3.originalname).toLowerCase() !== ".mp3") throw fail(400, "Only .mp3 files are supported");
    const duration = mp3Duration(mp3.buffer);
    if (!duration) throw fail(400, "This file doesn't look like a valid MP3");
    return duration;
};

// readTags doc theo duong dan -> ghi tam ra thu muc tam cua he dieu hanh roi xoa
const readTagsFromBuffer = (buffer) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emotune-"));
    const file = path.join(dir, "upload.mp3");
    try {
        fs.writeFileSync(file, buffer);
        return readTags(file);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
};

// LRCLIB khong co han cho -> toi da 10s, het gio / loi mang = coi nhu khong co loi
const lyricsFor = async (title, artist, duration) => {
    if (!artist) return null;
    let timer;
    const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(null), LYRICS_TIMEOUT_MS); });
    try {
        const hit = await Promise.race([findLyrics({ title, artist }, duration), timeout]);
        return hit ? hit.text.trim() + "\n" : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
};

const cacheKey = (buffer) => crypto.createHash("md5").update(buffer).digest("hex");
const cacheGet = (key) => {
    const hit = analyzed.get(key);
    if (!hit || Date.now() - hit.at > CACHE_TTL_MS) return null;
    return hit;
};
const cacheSet = (key, value) => {
    analyzed.set(key, { ...value, at: Date.now() });
    while (analyzed.size > CACHE_MAX) analyzed.delete(analyzed.keys().next().value);
};

// anh bia nhung san trong file mp3; logo NhacCuaTui / anh mac dinh thi bo (de fetch-images tim bia that)
const embeddedCover = (tags) => {
    const pic = tags.cover;
    const ext = pic && IMAGE_EXT[pic.mime.toLowerCase()];
    return ext && !isPlaceholderCover(pic.data) ? { ext, data: pic.data, mime: pic.mime } : null;
};

const getLibrary = async () => {
    const [songs, artists, genres] = await Promise.all([
        adminLibraryModel.getSongs(), adminLibraryModel.getArtists(), genreModel.getGenresData(),
    ]);
    return { songs, artists, genres, vibes: VIBES, enrich: getEnrichStatus() };
};

// POST /admin/songs/analyze — buoc "xem truoc" cua import-music cho 1 file: KHONG ghi gi vao DB / music/
const analyzeSong = async (files = {}) => {
    const mp3 = files.file?.[0];
    const duration = checkMp3(mp3);
    const key = cacheKey(mp3.buffer);
    const tags = readTagsFromBuffer(mp3.buffer);

    const [rows, dbArtists] = await Promise.all([adminLibraryModel.getSongKeys(), adminLibraryModel.getArtistNames()]);
    const rawArtist = primaryArtist(tags.artist);
    // "Vũ" / "Vũ." / "VU" -> dung cach viet da co trong DB
    const artist = rawArtist ? canonicalArtists([rawArtist], dbArtists).get(rawArtist) : null;
    const title = cleanTitle({ tag: tags.title, file: path.parse(mp3.originalname).name, artist: tags.artist });

    const cached = cacheGet(key);
    const lyrics = cached && cached.title === title && cached.artist === artist
        ? cached.lyrics
        : await lyricsFor(title, artist, duration);
    cacheSet(key, { title, artist, lyrics });

    const vibe = guessVibe({ title, lyrics: lyricsText(lyrics || "") });
    const genre = mapGenre({ tag: tags.genre, artistGenre: artistGenreOf(rows, artist), vibe: vibe.vibe });
    const cover = embeddedCover(tags);
    const genres = await genreModel.getGenresData();
    const duplicate = findDuplicate(rows, title, artist);

    return {
        title,
        artist,
        artistIsNew: !!artist && !dbArtists.includes(artist),
        genre,
        genreIsNew: !genres.some((g) => g.name === genre),
        emotion: vibe.vibe,
        vibe: { source: vibe.source, confidence: vibe.confidence, evidence: vibe.evidence, review: vibe.review },
        album: cleanAlbum(tags.album),
        duration: Math.round(duration),
        lyrics: !lyrics ? null : /^\[\d/m.test(lyrics) ? "synced" : "plain",
        // anh nho de admin nhin thay ngay tren form (data URL)
        coverPreview: cover ? `data:${cover.mime};base64,${cover.data.toString("base64")}` : null,
        duplicate: duplicate && { id: duplicate.id, title: duplicate.title, artist: duplicate.artist },
        mvSearch: !!process.env.YOUTUBE_API_KEY,
    };
};

// ten ca si / the loai (da kiem tra) -> id; chua co thi tao moi (giong import-music)
const resolveRefs = async (fields) => {
    const out = { ...fields };
    if ("artist" in fields) {
        delete out.artist;
        let artistId = null;
        if (fields.artist) {
            const name = canonicalArtists([fields.artist], await adminLibraryModel.getArtistNames()).get(fields.artist);
            artistId = await adminLibraryModel.findOrCreateArtist(name);
        }
        out.artist_id = artistId;
    }
    if ("genre" in fields) {
        delete out.genre;
        out.genre_id = fields.genre ? await adminLibraryModel.findOrCreateGenre(fields.genre) : null;
    }
    return out;
};

// files = { file: [mp3], cover?: [anh], lyrics?: [.lrc] } (multer .fields)
const createSong = async (body, files = {}) => {
    const { fields, error } = validateSongFields(body);
    if (error) throw fail(400, error);
    const mp3 = files.file?.[0];
    const duration = checkMp3(mp3);
    const coverFile = files.cover?.[0];
    const coverExt = coverFile && imageExt(coverFile, "Cover");
    const lrcFile = files.lyrics?.[0];
    if (lrcFile && path.extname(lrcFile.originalname).toLowerCase() !== ".lrc") throw fail(400, "Lyrics must be an .lrc file");

    const dup = findDuplicate(await adminLibraryModel.getSongKeys(), fields.title, fields.artist);
    if (dup) throw fail(409, `“${dup.title}”${dup.artist ? ` by ${dup.artist}` : ""} is already in the library`);

    // bia: file admin chon > anh nhung trong mp3 (khong phai logo) > de fetch-images tim tren mang
    // loi: file .lrc admin chon > loi tim duoc o buoc analyze (hoac tim lai) > khong co
    const tags = readTagsFromBuffer(mp3.buffer);
    const cover = coverFile ? { ext: coverExt, data: coverFile.buffer } : embeddedCover(tags);
    let lyrics = lrcFile ? lrcFile.buffer : null;
    if (!lyrics) {
        const cached = cacheGet(cacheKey(mp3.buffer));
        lyrics = cached && cached.title === fields.title && cached.artist === fields.artist
            ? cached.lyrics
            : await lyricsFor(fields.title, fields.artist, duration);
    }

    const refs = await resolveRefs(fields);
    const used = new Set([...fs.readdirSync(DIRS.music), ...(await adminLibraryModel.getFilePaths())]);
    const base = uniqueBase(fields.title, fields.artist, used);
    const filePath = base + ".mp3";
    const coverName = cover ? base + cover.ext : null;

    writeFile(DIRS.music, filePath, mp3.buffer);
    if (cover) writeFile(DIRS.covers, coverName, cover.data);
    if (lyrics) writeFile(DIRS.lyrics, base + ".lrc", lyrics);
    let id;
    try {
        id = await adminLibraryModel.insertSong(refs, filePath, Math.round(duration), coverName);
    } catch (err) {
        // DB tu choi -> xoa file vua ghi
        for (const [dir, name] of [[DIRS.music, filePath], [DIRS.covers, coverName], [DIRS.lyrics, lyrics && base + ".lrc"]]) {
            if (name) fs.rmSync(path.join(dir, name), { force: true });
        }
        throw err;
    }
    // anh ca si moi, bia / album con thieu, MV: chay nen cac script san co (giong cuoi import-music --apply)
    enrichLibrary();
    return { id, file_path: filePath, cover: !!cover, lyrics: !!lyrics, enrich: getEnrichStatus() };
};

const updateSong = async (songId, body, files = {}) => {
    const song = await adminLibraryModel.findSong(songId);
    if (!song) throw fail(404, "Song not found");
    const { fields, error } = validateSongFields(body, { partial: true });
    if (error) throw fail(400, error);
    if (fields.title !== undefined || fields.artist !== undefined) {
        const dup = findDuplicate(await adminLibraryModel.getSongKeys(),
            fields.title ?? song.title, fields.artist !== undefined ? fields.artist : song.artist, songId);
        if (dup) throw fail(409, `“${dup.title}”${dup.artist ? ` by ${dup.artist}` : ""} is already in the library`);
    }

    const base = song.file_path.replace(/\.[^.]+$/, "");
    const coverFile = files.cover?.[0];
    const coverExt = coverFile && imageExt(coverFile, "Cover");
    const lrcFile = files.lyrics?.[0];
    if (lrcFile && path.extname(lrcFile.originalname).toLowerCase() !== ".lrc") throw fail(400, "Lyrics must be an .lrc file");
    const refs = await resolveRefs(fields);
    if (coverFile) {
        // ten moi moi lan doi -> trinh duyet khong hien anh cu da luu cache
        refs.cover = `${base}_${Date.now().toString(36)}${coverExt}`;
        writeFile(DIRS.covers, refs.cover, coverFile.buffer);
    }
    if (lrcFile) writeFile(DIRS.lyrics, base + ".lrc", lrcFile.buffer);
    await adminLibraryModel.updateSong(songId, refs);
    // doi sang ca si moi -> fetch-images lay anh ca si do
    if (refs.artist_id) enrichLibrary();
    return { id: songId };
};

// chi xoa dong trong DB; file mp3 / anh / loi van giu trong thu muc (lo tay xoa nham thi them lai bang file cu)
const deleteSong = async (songId) => {
    const song = await adminLibraryModel.findSong(songId);
    if (!song) throw fail(404, "Song not found");
    await adminLibraryModel.deleteSong(songId);
    return { deleted: song.title, file_path: song.file_path };
};

const validateArtistName = (raw) => {
    const name = toText(raw);
    if (!name) throw fail(400, "Artist name is required");
    if (name.length > NAME_MAX) throw fail(400, `Artist name must be at most ${NAME_MAX} characters`);
    return name;
};

// anh ca si -> avatars/photos/<ten>.<duoi>, cot photo luu "photos/<file>" (giong fetch-images)
const savePhoto = (name, file) => {
    const fileName = `${slugify(name).replace(/_/g, "-") || "artist"}-${Date.now().toString(36)}${imageExt(file, "Photo")}`;
    writeFile(DIRS.photos, fileName, file.buffer);
    return "photos/" + fileName;
};

const duplicateName = (err) => {
    if (err.code === "23505") return fail(409, "An artist with this name already exists");
    return err;
};

const createArtist = async (body, files = {}) => {
    const name = validateArtistName(body.name);
    const photoFile = files.photo?.[0];
    if (photoFile) imageExt(photoFile, "Photo");
    let id;
    try {
        id = await adminLibraryModel.insertArtist(name, photoFile ? savePhoto(name, photoFile) : null);
    } catch (err) {
        throw duplicateName(err);
    }
    // khong chon anh -> fetch-images tu tim anh ca si tren mang
    if (!photoFile) enrichLibrary();
    return { id };
};

const updateArtist = async (artistId, body, files = {}) => {
    const artist = await adminLibraryModel.findArtist(artistId);
    if (!artist) throw fail(404, "Artist not found");
    const fields = {};
    if (body.name !== undefined) fields.name = validateArtistName(body.name);
    const photoFile = files.photo?.[0];
    if (photoFile) fields.photo = savePhoto(fields.name || artist.name, photoFile);
    try {
        await adminLibraryModel.updateArtist(artistId, fields);
    } catch (err) {
        throw duplicateName(err);
    }
    return { id: artistId };
};

// con bai thi khong cho xoa (khoa ngoai se dat artist_id = NULL -> bai mat ten ca si ma admin khong de y)
const deleteArtist = async (artistId) => {
    const artist = await adminLibraryModel.findArtist(artistId);
    if (!artist) throw fail(404, "Artist not found");
    if (artist.songs > 0) {
        throw fail(409, `${artist.name} still has ${artist.songs} song${artist.songs > 1 ? "s" : ""}. Move or delete them first`);
    }
    await adminLibraryModel.deleteArtist(artistId);
    return { deleted: artist.name };
};

// GET /admin/library/enrich — trang Library hoi dinh ky khi script dang chay nen
const enrichStatus = async () => getEnrichStatus();

module.exports = {
    VIBES,
    parseYoutubeId, validateSongFields, uniqueBase, findDuplicate, artistGenreOf,
    getLibrary, analyzeSong, createSong, updateSong, deleteSong,
    createArtist, updateArtist, deleteArtist, enrichStatus,
}

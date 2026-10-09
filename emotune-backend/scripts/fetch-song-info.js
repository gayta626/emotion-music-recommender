// Dien thong tin con thieu cho bang bai kieu Spotify: thoi luong (cot ⏱) va ten album (cot Album).
// Chay: npm run fetch-song-info      (truoc do 1 lan: npm run db:migrate -- db/migrate_song_info.sql)
//
// Chi dien bai dang THIEU -> chay lai bao nhieu lan cung duoc:
//   - duration: doc tu header file music/<file_path> (khong can mang). Thieu file mp3 -> bo qua.
//   - album: tim tren iTunes theo TEN BAI + TEN CA SI (cung cach chon ket qua voi fetch-images), bo duoi
//     " - Single" / " - EP". Bai khong co ca si / khong tim thay -> de trong, web hien "—".
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');
const { mp3Duration } = require('./lib/mp3Duration');
const { findTrack } = require('./lib/itunes');

const MUSIC_DIR = path.join(__dirname, "..", "music");

// "Có Chắc Yêu Là Đây - Single" -> "Có Chắc Yêu Là Đây"
const cleanAlbum = (name) => (name || "").replace(/\s+-\s+(Single|EP)$/i, "").trim() || null;

const run = async () => {
    const songs = (await db.query(
        `SELECT s.id, s.title, s.file_path, s.album, s.duration, a.name AS artist
         FROM songs s LEFT JOIN artists a ON a.id = s.artist_id
         WHERE s.duration IS NULL OR s.album IS NULL
         ORDER BY s.id`
    )).rows;
    console.log(`\n== ${songs.length} bai con thieu thoi luong / album ==`);
    const missing = [];

    for (const song of songs) {
        const notes = [];
        if (song.duration === null) {
            const mp3 = path.join(MUSIC_DIR, song.file_path);
            const seconds = fs.existsSync(mp3) ? mp3Duration(mp3) : null;
            if (seconds) {
                await db.query(`UPDATE songs SET duration = $1 WHERE id = $2`, [Math.round(seconds), song.id]);
                notes.push(`${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`);
            } else {
                missing.push(`"${song.title}": khong doc duoc thoi luong (thieu music/${song.file_path}?)`);
            }
        }
        if (song.album === null && song.artist) {
            try {
                const hit = await findTrack(song.title, song.artist);
                const album = cleanAlbum(hit?.collectionName);
                if (album) {
                    await db.query(`UPDATE songs SET album = $1 WHERE id = $2`, [album, song.id]);
                    notes.push(`album "${album}"`);
                } else {
                    missing.push(`"${song.title}": khong tim thay tren iTunes -> tu ghi: UPDATE songs SET album = '...' WHERE id = ${song.id};`);
                }
            } catch (err) {
                missing.push(`"${song.title}": loi tim album (${err.message})`);
            }
        }
        console.log(`  ${notes.length ? "✓" : "-"} ${song.title}${notes.length ? ": " + notes.join(", ") : ""}`);
    }

    if (missing.length) {
        console.log(`\n== Con thieu ${missing.length} muc ==`);
        missing.forEach((m) => console.log("  - " + m));
    } else {
        console.log("\nDu thoi luong va album.");
    }
};

run()
    .catch((err) => {
        console.error("Loi:", err.message);
        process.exitCode = 1;
    })
    .finally(() => db.pool.end());

// Tim MV chinh thuc tren YouTube cho tung bai -> songs.youtube_id (nut "MV" o man dang phat).
// Chay: npm run fetch-mv      (truoc do 1 lan: npm run db:migrate -- db/migrate_mv.sql; can YOUTUBE_API_KEY trong .env)
//       npm run fetch-mv -- --retry   tim lai ca nhung bai lan truoc khong thay MV (youtube_id = '')
//
// Chi tim bai CHUA tim (youtube_id NULL) -> chay lai bao nhieu lan cung duoc, khong ton han muc cho bai da co.
// Moi lan tim ton 100 / 10.000 don vi mien phi moi ngay; het han muc -> dung, mai chay tiep.
// Bai khong co ca si (nhac thien...) bo qua. Tim sai -> tu sua: UPDATE songs SET youtube_id = '<id>' WHERE id = ...;
require('dotenv').config({ quiet: true });
const db = require('../src/config/db');
const { pickVideo, searchVideos, mainArtist } = require('./lib/youtube');

const run = async () => {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
        console.error("Thieu YOUTUBE_API_KEY trong .env (xem .evn.example)");
        process.exitCode = 1;
        return;
    }
    const retry = process.argv.includes("--retry");
    const songs = (await db.query(
        `SELECT s.id, s.title, a.name AS artist
         FROM songs s LEFT JOIN artists a ON a.id = s.artist_id
         WHERE (s.youtube_id IS NULL ${retry ? "OR s.youtube_id = ''" : ""}) AND a.name IS NOT NULL
         ORDER BY s.id`
    )).rows;
    console.log(`\n== Tim MV cho ${songs.length} bai (ton ~${songs.length * 100} / 10.000 don vi han muc hom nay) ==`);

    let found = 0;
    const missing = [];
    for (const song of songs) {
        let items;
        try {
            items = await searchVideos(`${mainArtist(song.artist)} ${song.title} official MV`, key);
        } catch (err) {
            if (err.quotaExceeded) {
                console.log("\nHet han muc YouTube hom nay -> dung. Mai chay lai `npm run fetch-mv` (chi tim bai con thieu).");
                break;
            }
            missing.push(`"${song.title}": loi tim (${err.message})`);
            continue;
        }
        const hit = pickVideo(items, song.title, song.artist);
        await db.query(`UPDATE songs SET youtube_id = $1 WHERE id = $2`, [hit ? hit.id : "", song.id]);
        if (hit) {
            found++;
            const video = items.find((it) => it.id === hit.id);
            console.log(`  ✓ ${song.title} — ${song.artist}  ->  ${video.title}  [${video.channel}]`);
        } else {
            missing.push(`"${song.title}" — ${song.artist}: khong thay MV chac dung bai`);
        }
    }

    console.log(`\nTim duoc ${found} MV.`);
    if (missing.length) {
        console.log(`\n== Khong co MV (${missing.length}) ==`);
        missing.forEach((m) => console.log("  - " + m));
        console.log("Tu them: UPDATE songs SET youtube_id = '<id video>' WHERE title = '...';");
    }
};

run()
    .catch((err) => {
        console.error("Loi:", err.message);
        process.exitCode = 1;
    })
    .finally(() => db.pool.end());

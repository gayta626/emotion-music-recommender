// Lay loi bai hat cho moi bai trong DB, luu thanh file lyrics/<ten file mp3>.lrc (web doc qua /lyrics/<file>).
// Chay: npm run fetch-lyrics
//
// Cach lam (chi dien bai dang THIEU loi -> chay lai bao nhieu lan cung duoc):
//   1. Da co file lyrics/<ten>.lrc tren may (tai lan truoc, hoac ban tu bo vao) -> bo qua, khong len mang.
//   2. Chua co -> tim tren LRCLIB (lrclib.net: kho loi bai mien phi, khong can key) theo TEN BAI + TEN CA SI.
//      - Uu tien loi CO MOC THOI GIAN ([mm:ss.xx] dau moi dong) cua ban co DO DAI KHOP file mp3 (lech <= 3 giay)
//        -> web to sang dong dang hat. Moi bai tren LRCLIB co nhieu ban (ban radio, ban MV dai hon...);
//        lay nham ban thi loi chay lech nhac.
//      - Khong co ban khop -> luu loi THUONG (khong moc thoi gian): web hien ca bai, khong to sang theo nhac.
//   3. Khong tim thay -> in ra cuoi de ban tu bo file vao (dong nao co "[mm:ss.xx]" o dau thi web tu chay theo nhac).
// Bai khong co ca si (nhac thien, khong loi) -> bo qua.
// Loi bai hat co ban quyen: chi dung cho do an, demo -> thu muc lyrics/ khong dua len git (giong music/).
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');
const { mp3Duration } = require('./lib/mp3Duration');
const { findLyrics } = require('./lib/lrclib');

const LYRICS_DIR = path.join(__dirname, "..", "lyrics");
const MUSIC_DIR = path.join(__dirname, "..", "music");

const run = async () => {
    fs.mkdirSync(LYRICS_DIR, { recursive: true });
    const songs = (await db.query(
        `SELECT s.id, s.title, s.file_path, a.name AS artist
         FROM songs s LEFT JOIN artists a ON a.id = s.artist_id
         ORDER BY s.id`)).rows;
    const missing = [];

    console.log(`== Loi bai hat: ${songs.length} bai ==`);
    for (const song of songs) {
        const name = path.parse(song.file_path).name + ".lrc";
        const file = path.join(LYRICS_DIR, name);
        if (fs.existsSync(file)) {
            console.log(`  = ${song.title}: da co lyrics/${name}`);
            continue;
        }
        if (!song.artist) {
            console.log(`  - ${song.title}: bo qua (khong co ca si, nhac khong loi)`);
            continue;
        }
        try {
            const mp3 = path.join(MUSIC_DIR, song.file_path);
            const duration = fs.existsSync(mp3) ? mp3Duration(mp3) : null;
            const hit = await findLyrics(song, duration);
            if (!hit) {
                missing.push(`"${song.title}" -> lyrics/${name}`);
                console.log(`  x ${song.title}: LRCLIB khong co loi phu hop`);
                continue;
            }
            fs.writeFileSync(file, hit.text.trim() + "\n", "utf8");
            const len = duration ? ` (mp3 dai ${duration.toFixed(0)}s)` : "";
            console.log(`  ✓ ${song.title} -> lyrics/${name}   [${hit.kind}]${len}`);
        } catch (err) {
            missing.push(`"${song.title}" (loi: ${err.message}) -> lyrics/${name}`);
            console.log(`  x ${song.title}: ${err.message}`);
        }
    }

    if (missing.length) {
        console.log(`\n== Con thieu ${missing.length} bai: tu bo loi vao dung ten file duoi day roi tai lai trang ==`);
        console.log("   (moi dong 1 cau; muon chay theo nhac thi them moc \"[mm:ss.xx]\" o dau dong)");
        missing.forEach((m) => console.log("  - " + m));
    } else {
        console.log("\nDu loi cho tat ca bai co ca si.");
    }
};

run()
    .catch((err) => {
        console.error("Loi:", err.message);
        process.exitCode = 1;
    })
    .finally(() => db.pool.end());

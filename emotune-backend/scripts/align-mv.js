// npm run align-mv [-- --only ten.mp3] [-- --force]
// Do do lech giua MV YouTube va file mp3 cua tung bai -> songs.mv_offset (giay; MV giay t + offset = mp3 giay t).
// Web dung so nay de doi qua lai mp3 <-> MV ma nhac noi tiep DUNG DOAN (MV hay co canh phim mo dau / ket thuc,
// quy theo ti le do dai thi lech vai giay toi vai chuc giay). Cach do: scripts/align_mv.py (chroma + tuong quan cheo).
// Chi do bai co MV ma chua do (mv_offset NULL); --force do lai tat ca; --only <file mp3> chi 1 bai.
// Do khong chac (diem < MIN_SCORE: MV la ban live / remix, cat ghep nhieu) -> de NULL, web quy theo ti le nhu cu.
//
// Can venv .venv-karaoke (xem scripts/make-karaoke.js) + yt-dlp + ffmpeg:
//   .venv-karaoke\Scripts\pip install yt-dlp
// Moi bai tai rieng phan tieng cua MV vao thu muc tam roi xoa ngay (~3s / bai).
require("dotenv").config({ quiet: true });
const { execFile } = require("child_process");
const path = require("path");
const db = require("../src/config/db");
const { karaokePython, karaokeReady } = require("./lib/karaoke");

const MIN_SCORE = 8;
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

const measure = (file, youtubeId) => new Promise((resolve, reject) => {
    execFile(karaokePython(), [path.join(__dirname, "align_mv.py"), path.join(__dirname, "..", "music", file), youtubeId],
        { env: { ...process.env, PYTHONUTF8: "1" }, timeout: 180000, maxBuffer: 1 << 20 },
        (err, stdout, stderr) => {
            if (err) return reject(new Error((stderr || err.message).trim().split(/\r?\n/).pop()));
            resolve(JSON.parse(stdout.trim().split(/\r?\n/).pop()));
        });
});

const main = async () => {
    if (!karaokeReady()) {
        console.log("Chua co venv .venv-karaoke (xem scripts/make-karaoke.js), roi: .venv-karaoke\\Scripts\\pip install yt-dlp");
        process.exit(1);
    }
    const { rows } = await db.query(
        `SELECT id, title, file_path, youtube_id FROM songs
         WHERE youtube_id IS NOT NULL AND youtube_id <> ''
           ${force ? "" : "AND mv_offset IS NULL"} ${only ? "AND file_path = $1" : ""}
         ORDER BY id`, only ? [only] : []);
    console.log(`Do lech MV cho ${rows.length} bai...`);
    let saved = 0;
    const unsure = [];
    for (const song of rows) {
        try {
            const r = await measure(song.file_path, song.youtube_id);
            if (r.score >= MIN_SCORE) {
                await db.query(`UPDATE songs SET mv_offset = $1 WHERE id = $2`, [r.offset, song.id]);
                saved++;
                console.log(`  ${song.title}: ${r.offset >= 0 ? "+" : ""}${r.offset}s (diem ${r.score})`);
            } else {
                // khong chac -> bo so cu (neu co), web quy theo ti le do dai
                await db.query(`UPDATE songs SET mv_offset = NULL WHERE id = $1`, [song.id]);
                unsure.push(`"${song.title}": khong chac (diem ${r.score}, lech ${r.offset}s)`);
            }
        } catch (err) {
            unsure.push(`"${song.title}": loi (${err.message})`);
        }
    }
    console.log(`Xong: ${saved}/${rows.length} bai co do lech.`);
    if (unsure.length) {
        console.log("Chua do duoc (web quy doi theo ti le do dai):");
        unsure.forEach((line) => console.log("  " + line));
    }
    await db.pool.end();
};

main().catch((err) => {
    console.error("Loi align-mv:", err);
    process.exit(1);
});

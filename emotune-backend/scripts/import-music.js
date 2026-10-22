// Nhap nhieu bai hat moi 1 lan tu 1 thu muc file mp3 (thay cho viec sua setup.sql + doi ten + chay tung script bang tay).
//
// Buoc 1 — XEM TRUOC (khong dong vao DB / music/):
//   npm run import-music -- --from "C:/Users/Hi/Downloads"      (bo --from = lay thu muc import/)
//   Doc the ID3 trong tung file (ten bai, ca si, album, the loai, anh bia), lam sach, tim loi tren LRCLIB,
//   DOAN VIBE tu loi + ten bai (scripts/lib/importMusic.js) va the loai -> in bang + ghi import/plan.json.
//   Muon sua vibe / the loai thi sua "vibe" / "genre" trong import/plan.json truoc buoc 2.
//
// Buoc 2 — NHAP THAT:
//   npm run import-music -- --apply
//   Chep mp3 vao music/ (ten khong dau), anh bia co san trong file -> covers/, loi -> lyrics/,
//   them ca si moi + bai moi vao DB (chi THEM, khong xoa / sua bai cu; bai da co thi bo qua),
//   roi tu chay fetch-images (anh ca si moi, bia con thieu), fetch-song-info (album con thieu)
//   va fetch-mv (MV YouTube cho bai moi — chi khi .env co YOUTUBE_API_KEY; ~100 bai/ngay theo han muc free),
//   make-karaoke (AI tach giong cho karaoke — chi khi da cai venv .venv-karaoke).
// Chay lai bao nhieu lan cung duoc: bai trung (cung ten bai + ca si, khong dau) voi DB hoac trong thu muc thi bo qua.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { karaokeReady, alignReady } = require('./lib/karaoke');
const db = require('../src/config/db');
const { readTags } = require('./lib/id3');
const { mp3Duration } = require('./lib/mp3Duration');
const { findLyrics } = require('./lib/lrclib');
const { slugify } = require('./rename-music');
const { countHashes, isPlaceholderCover } = require('./lib/coverCheck');
const {
    plain, primaryArtist, cleanTitle, canonicalArtists, cleanAlbum, mapGenre, VIBE_ENERGY, lyricsText, guessVibe,
} = require('./lib/importMusic');

const ROOT = path.join(__dirname, "..");
const IMPORT_DIR = path.join(ROOT, "import");
const CACHE_DIR = path.join(IMPORT_DIR, "cache");        // loi tim duoc o buoc 1, buoc 2 chep sang lyrics/
const PLAN_FILE = path.join(IMPORT_DIR, "plan.json");
const MUSIC_DIR = path.join(ROOT, "music");
const COVERS_DIR = path.join(ROOT, "covers");
const LYRICS_DIR = path.join(ROOT, "lyrics");
const VIBES = ["happy", "sad", "angry", "neutral", "surprise"];

const key = (title, artist) => `${plain(title)}|${plain(artist)}`;
const pad = (s, n) => String(s ?? "").slice(0, n).padEnd(n);

// ten file khong dau, khong trung: "Dĩ Vãng Nhạt Nhòa" da co -> them ten ca si
const uniqueFileName = (title, artist, used) => {
    let base = slugify(title) || "bai_hat";
    if (used.has(base + ".mp3")) base = slugify(`${title} ${artist || ""}`);
    let name = base + ".mp3";
    for (let i = 2; used.has(name); i++) name = `${base}_${i}.mp3`;
    used.add(name);
    return name;
};

// ---------------- buoc 1: xem truoc ----------------
const plan = async (fromDir) => {
    if (!fs.existsSync(fromDir)) throw new Error(`Khong co thu muc ${fromDir}`);
    const files = fs.readdirSync(fromDir).filter((f) => f.toLowerCase().endsWith(".mp3")).sort();
    if (!files.length) throw new Error(`Thu muc ${fromDir} khong co file .mp3 nao`);
    fs.mkdirSync(CACHE_DIR, { recursive: true });

    const dbSongs = (await db.query(
        `SELECT s.title, s.file_path, a.name AS artist, g.name AS genre
         FROM songs s LEFT JOIN artists a ON a.id = s.artist_id LEFT JOIN genres g ON g.id = s.genre_id`)).rows;
    const dbArtists = (await db.query(`SELECT name FROM artists`)).rows.map((r) => r.name);

    // the loai quen thuoc cua tung ca si (bai da co trong DB) -> bai khong co the loai thi theo ca si
    const genreVotes = new Map();
    for (const s of dbSongs) {
        if (!s.artist || !s.genre) continue;
        const votes = genreVotes.get(s.artist) || {};
        votes[s.genre] = (votes[s.genre] || 0) + 1;
        genreVotes.set(s.artist, votes);
    }
    const artistGenre = (artist) => {
        const votes = genreVotes.get(artist);
        return votes ? Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0] : null;
    };

    const raw = files.map((file) => {
        const src = path.join(fromDir, file);
        const tags = readTags(src);
        return {
            src,
            tags,
            artist: primaryArtist(tags.artist),
            title: cleanTitle({ tag: tags.title, file: path.parse(file).name, artist: tags.artist }),
        };
    });
    const canonical = canonicalArtists(raw.map((r) => r.artist), dbArtists);

    const seen = new Set(dbSongs.map((s) => key(s.title, s.artist)));
    const usedFiles = new Set([...fs.readdirSync(MUSIC_DIR), ...dbSongs.map((s) => s.file_path)]);
    const dbKeys = new Set(seen);
    const songs = [];

    console.log(`== Xem truoc: ${files.length} file trong ${fromDir} ==`);
    for (const r of raw) {
        const artist = r.artist ? canonical.get(r.artist) : null;
        const k = key(r.title, artist);
        const base = { src: r.src, title: r.title, artist };
        if (seen.has(k)) {
            songs.push({ ...base, status: dbKeys.has(k) ? "exists" : "duplicate" });
            continue;
        }
        seen.add(k);

        const file = uniqueFileName(r.title, artist, usedFiles);
        const duration = mp3Duration(r.src);
        // loi: da tim o lan chay truoc (import/cache/) thi dung lai, khong len LRCLIB nua
        const cached = path.join(CACHE_DIR, path.parse(file).name + ".lrc");
        let lyricsError = null;
        if (artist && !fs.existsSync(cached)) {
            try {
                const hit = await findLyrics({ title: r.title, artist }, duration);
                if (hit) fs.writeFileSync(cached, hit.text.trim() + "\n", "utf8");
            } catch (err) {
                lyricsError = err.message;
            }
        }
        const text = fs.existsSync(cached) ? fs.readFileSync(cached, "utf8") : "";
        const lyrics = !text ? null : /^\[\d/m.test(text) ? "synced" : "plain";
        const vibe = guessVibe({ title: r.title, lyrics: lyricsText(text) });
        const genre = mapGenre({ tag: r.tags.genre, artistGenre: artistGenre(artist), vibe: vibe.vibe });

        const song = {
            ...base, status: "new", file, genre,
            vibe: vibe.vibe, vibeSource: vibe.source, confidence: vibe.confidence, evidence: vibe.evidence, review: vibe.review,
            album: cleanAlbum(r.tags.album), duration: duration ? Math.round(duration) : null,
            cover: !!r.tags.cover, lyrics, lyricsError,
        };
        songs.push(song);
        console.log(`  ${song.review ? "?" : "✓"} ${song.title} — ${artist || "?"} · ${genre} · ${song.vibe}`
            + ` (${song.vibeSource}${song.evidence.length ? ": " + song.evidence.join(", ") : ""})`);
    }

    fs.writeFileSync(PLAN_FILE, JSON.stringify({ from: fromDir, createdAt: new Date().toISOString(), songs }, null, 2), "utf8");

    const fresh = songs.filter((s) => s.status === "new");
    console.log(`\n${pad("#", 3)} ${pad("Bai", 32)} ${pad("Ca si", 18)} ${pad("The loai", 9)} ${pad("Vibe", 9)} ${pad("Nguon", 7)} Loi    Anh`);
    fresh.forEach((s, i) => console.log(
        `${pad(i + 1, 3)} ${pad(s.title, 32)} ${pad(s.artist, 18)} ${pad(s.genre, 9)} ${pad(s.vibe + (s.review ? "?" : ""), 9)} `
        + `${pad(s.vibeSource, 7)} ${pad(s.lyrics || "-", 6)} ${s.cover ? "co" : "-"}`));
    const skipped = songs.filter((s) => s.status !== "new");
    if (skipped.length) {
        console.log(`\nBo qua ${skipped.length} file:`);
        skipped.forEach((s) => console.log(`  - ${path.basename(s.src)}: ${s.status === "exists" ? "da co trong DB" : "trung bai khac trong thu muc"}`));
    }
    const review = fresh.filter((s) => s.review).length;
    const byVibe = VIBES.map((v) => `${v} ${fresh.filter((s) => s.vibe === v).length}`).join(" · ");
    console.log(`\n${fresh.length} bai moi (${byVibe}); ${review} bai vibe chua chac (dau "?").`);
    console.log(`Ke hoach: ${path.relative(ROOT, PLAN_FILE)} — sua "vibe" / "genre" o day neu muon, roi chay:`);
    console.log(`  npm run import-music -- --apply`);
};

// ---------------- buoc 2: nhap that ----------------
const COVER_EXT = { "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const apply = async () => {
    if (!fs.existsSync(PLAN_FILE)) throw new Error("Chua co import/plan.json — chay buoc xem truoc truoc (bo --apply)");
    const { songs } = JSON.parse(fs.readFileSync(PLAN_FILE, "utf8"));
    const fresh = songs.filter((s) => s.status === "new");
    for (const s of fresh) {
        if (!VIBES.includes(s.vibe)) throw new Error(`"${s.title}": vibe "${s.vibe}" khong hop le (chi: ${VIBES.join(", ")})`);
        if (!s.genre) throw new Error(`"${s.title}": thieu genre`);
    }
    fs.mkdirSync(COVERS_DIR, { recursive: true });
    fs.mkdirSync(LYRICS_DIR, { recursive: true });
    // dem anh bia nhung san de nhan ra logo trang tai nhac (cung 1 anh o nhieu bai) -> bo, de fetch-images tim bia that
    const coverCounts = countHashes(fresh.map((s) => readTags(s.src).cover?.data));

    const client = await db.pool.connect();
    let added = 0;
    try {
        await client.query("BEGIN");
        for (const s of fresh) {
            const name = path.parse(s.file).name;
            // file: chep (khong di chuyen) -> file goc van con
            const dest = path.join(MUSIC_DIR, s.file);
            if (!fs.existsSync(dest)) fs.copyFileSync(s.src, dest);
            // anh bia nam san trong the ID3 -> covers/<ten>.jpg (fetch-images se bo qua bai da co bia).
            // Logo NhacCuaTui / anh mac dinh thi KHONG chep (truoc day 41 bai bi hien logo thay bia that)
            let cover = null;
            const pic = readTags(s.src).cover;
            const ext = pic && !isPlaceholderCover(pic.data, coverCounts) && COVER_EXT[pic.mime.toLowerCase()];
            if (ext) {
                cover = name + ext;
                fs.writeFileSync(path.join(COVERS_DIR, cover), pic.data);
            }
            const cached = path.join(CACHE_DIR, name + ".lrc");
            const lrc = path.join(LYRICS_DIR, name + ".lrc");
            if (fs.existsSync(cached) && !fs.existsSync(lrc)) fs.copyFileSync(cached, lrc);

            let artistId = null;
            if (s.artist) {
                await client.query(`INSERT INTO artists (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [s.artist]);
                artistId = (await client.query(`SELECT id FROM artists WHERE name = $1`, [s.artist])).rows[0].id;
            }
            const genre = s.genre.toLowerCase();
            await client.query(`INSERT INTO genres (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [genre]);
            const genreId = (await client.query(`SELECT id FROM genres WHERE name = $1`, [genre])).rows[0].id;

            const res = await client.query(
                `INSERT INTO songs (title, artist_id, genre_id, file_path, emotion, energy, cover, album, duration)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (file_path) DO NOTHING`,
                [s.title, artistId, genreId, s.file, s.vibe, VIBE_ENERGY[s.vibe], cover, s.album, s.duration]);
            added += res.rowCount;
            console.log(`  ${res.rowCount ? "+" : "="} ${s.title} — ${s.artist || "?"} -> music/${s.file}`);
        }
        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
    console.log(`\nDa them ${added} bai vao DB.`);

    // anh ca si moi + bia con thieu, album con thieu, MV: dung lai cac script co san (chi dien cho cho thieu)
    const scripts = ["fetch-images.js", "fetch-song-info.js"];
    if (process.env.YOUTUBE_API_KEY) scripts.push("fetch-mv.js");
    else console.log("\n(Chua co YOUTUBE_API_KEY trong .env -> bo qua tim MV; co key roi thi chay: npm run fetch-mv)");
    // do lech MV / mp3 (doi qua lai nhac noi tiep dung doan) — can yt-dlp trong .venv-karaoke
    if (alignReady()) scripts.push("align-mv.js");
    // AI tach giong cho karaoke (chi khi da cai venv .venv-karaoke, xem scripts/make-karaoke.js)
    if (karaokeReady()) scripts.push("make-karaoke.js");
    else console.log("(Chua cai .venv-karaoke -> bo qua tach giong karaoke; cai xong thi chay: npm run make-karaoke)");
    for (const script of scripts) {
        console.log(`\n== ${script} ==`);
        spawnSync(process.execPath, [path.join(__dirname, script)], { stdio: "inherit", cwd: ROOT });
    }
};

const run = async () => {
    const args = process.argv.slice(2);
    if (args.includes("--apply")) return apply();
    const i = args.indexOf("--from");
    return plan(i >= 0 && args[i + 1] ? path.resolve(args[i + 1]) : IMPORT_DIR);
};

run()
    .catch((err) => {
        console.error("Loi:", err.message);
        process.exitCode = 1;
    })
    .finally(() => db.pool.end());

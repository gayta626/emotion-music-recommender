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

const LYRICS_DIR = path.join(__dirname, "..", "lyrics");
const MUSIC_DIR = path.join(__dirname, "..", "music");
const MAX_DIFF_S = 3;

// "Sơn Tùng M-TP" -> "son tung m tp" (so khop khong dau, khong phan biet hoa thuong)
const plain = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// bo phan trong ngoac: "Nếu Như Ta Chẳng Còn (feat. A$AP Ướt Mi)" -> "Nếu Như Ta Chẳng Còn"
const baseTitle = (s) => s.replace(/[([].*?[)\]]/g, "").trim();
// ban phu (remix, live, mashup...) -> khong lay loi cua ban do
const ALT_VERSION = /remix|live|speed|slowed|lofi|lo-fi|acoustic|instrumental|karaoke|beat|mashup/i;

// do dai file mp3 (giay): dung de chon ban loi co moc thoi gian khop nhac

const lrclibSearch = async (params) => {
    const res = await fetch("https://lrclib.net/api/search?" + new URLSearchParams(params), {
        headers: { "User-Agent": "EmoTune student project (fetch-lyrics)" },
    });
    if (!res.ok) throw new Error(`LRCLIB tra loi ${res.status}`);
    return res.json();
};

// Chon ket qua: ca si khop, ten bai khop (bo phan trong ngoac), khong phai ban phu, co loi.
// Uu tien loi co moc thoi gian cua ban dai gan bang file mp3; khong co -> loi thuong cua ban gan nhat.
const pickLyrics = (results, song, duration) => {
    const artist = plain(song.artist);
    const title = plain(baseTitle(song.title));
    const ok = results.filter((r) =>
        (plain(r.artistName).includes(artist) || artist.includes(plain(r.artistName)))
        && plain(baseTitle(r.trackName)) === title
        && !ALT_VERSION.test(r.trackName)
        && !r.instrumental
        && (r.syncedLyrics || r.plainLyrics));
    const diff = (r) => (duration ? Math.abs(r.duration - duration) : Infinity);
    ok.sort((a, b) => diff(a) - diff(b));

    const synced = ok.find((r) => r.syncedLyrics && diff(r) <= MAX_DIFF_S);
    if (synced) return { text: synced.syncedLyrics, kind: `co moc thoi gian, lech ${diff(synced).toFixed(1)}s` };
    const plainHit = ok.find((r) => r.plainLyrics);
    if (plainHit) return { text: plainHit.plainLyrics, kind: "loi thuong (khong co ban dai khop file mp3)" };
    return null;
};

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
            let results = await lrclibSearch({ track_name: baseTitle(song.title), artist_name: song.artist });
            if (!results.length) results = await lrclibSearch({ q: `${baseTitle(song.title)} ${song.artist}` });
            const hit = pickLyrics(results, song, duration);
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

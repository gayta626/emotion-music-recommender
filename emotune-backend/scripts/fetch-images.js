// Lay anh cho moi bai hat (anh bia) va moi ca si (anh chan dung co lon) roi ghi ten file vao DB.
// Chay: npm run fetch-images
//
// Cach lam (chi dien cho bai / ca si dang THIEU anh -> chay lai bao nhieu lan cung duoc):
//   1. Da co san file anh tren may (tai lan truoc, hoac ban tu bo vao) -> chi ghi ten file vao DB, khong len mang.
//      Bai hat:  covers/<ten file mp3>.jpg        vd covers/gia_nhu.jpg
//      Ca si:    avatars/photos/<ten khong dau>.jpg  vd avatars/photos/son-tung-m-tp.jpg
//   2. Chua co -> tim tren iTunes Search API (mien phi, khong can key) theo TEN BAI + TEN CA SI,
//      tai anh ve, luu file roi ghi vao DB. Anh ca si lay tu trang ca si tren Apple Music.
//      iTunes khong co -> thu Deezer API (mien phi, khong can key; anh ca si 1000x1000, anh bia album 1000x1000).
//   3. Khong tim thay / khong chac dung -> in ra cuoi de ban tu bo anh vao dung ten file roi chay lai.
// Anh tai ve co ban quyen cua hang dia / ca si: chi dung cho do an, demo.
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const COVERS_DIR = path.join(__dirname, "..", "covers");
const PHOTOS_DIR = path.join(__dirname, "..", "avatars", "photos");
const EXTS = [".jpg", ".jpeg", ".png", ".webp"];

const { plain, baseTitle, ALT_VERSION, itunesSearch, findTrack } = require('./lib/itunes');
const slug = (s) => plain(s).replace(/ /g, "-");

// file anh da co san tren may (bat ky duoi nao trong EXTS) -> ten file, khong co -> null
const findLocal = (dir, name) => {
    const ext = EXTS.find((e) => fs.existsSync(path.join(dir, name + e)));
    return ext ? name + ext : null;
};

// Deezer: khong gioi han chat nhu iTunes. Co the bi chan DNS o 1 so mang nha (api.deezer.com -> 127.0.0.1) -> loi thi bo qua.
const deezerSearch = async (what, query) => {
    const res = await fetch(`https://api.deezer.com/search/${what}?` + new URLSearchParams({ q: query, limit: "10" }));
    if (!res.ok) throw new Error(`Deezer tra loi ${res.status}`);
    return (await res.json()).data || [];
};
// Deezer tra link anh co "//" (khong co ma anh) khi ca si/album chua co anh -> khong dung
const hasImage = (url) => !!url && !/\/(artist|cover)\/\//.test(url);

const download = async (url, file) => {
    const res = await fetch(url);
    const type = res.headers.get("content-type") || "";
    if (!res.ok || !type.startsWith("image/")) throw new Error(`tai anh loi (${res.status} ${type})`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
};

// Deezer: ca si khop, ten bai khop (khong lay ban remix/live) -> anh bia album 1000x1000
const fetchSongCoverDeezer = async (song) => {
    const results = await deezerSearch("track", `artist:"${song.artist}" track:"${baseTitle(song.title)}"`);
    const byArtist = results.filter((r) => plain(r.artist.name).includes(plain(song.artist)) || plain(song.artist).includes(plain(r.artist.name)));
    const hit = byArtist.find((r) => plain(r.title) === plain(song.title))
        || byArtist.find((r) => plain(baseTitle(r.title)) === plain(baseTitle(song.title)) && !ALT_VERSION.test(r.title));
    const url = hit?.album?.cover_xl;
    if (!hit || !hasImage(url)) return null;
    const file = path.basename(song.file_path, path.extname(song.file_path)) + ".jpg";
    await download(url, path.join(COVERS_DIR, file));
    return { file, source: `Deezer: ${hit.title} — ${hit.artist.name} (album: ${hit.album.title})` };
};

const fetchSongCover = async (song) => {
    const hit = await findTrack(song.title, song.artist);
    if (!hit) {
        const dz = await fetchSongCoverDeezer(song).catch(() => null);
        return dz || { error: "khong tim thay ban goc tren iTunes lan Deezer" };
    }
    // artworkUrl100 la anh 100x100 -> doi so trong link de lay ban 600x600 (du net cho the lon nhat)
    const url = hit.artworkUrl100.replace(/\/\d+x\d+bb\./, "/600x600bb.");
    const file = path.basename(song.file_path, path.extname(song.file_path)) + ".jpg";
    await download(url, path.join(COVERS_DIR, file));
    return { file, source: `${hit.trackName} — ${hit.artistName} (album: ${hit.collectionName})` };
};

// Deezer co anh chan dung ca si (picture_xl 1000x1000): lay ket qua trung ten (khong dau, khong phan biet hoa thuong)
const fetchArtistPhotoDeezer = async (artist) => {
    const results = await deezerSearch("artist", artist.name);
    const hit = results.find((r) => plain(r.name) === plain(artist.name));
    if (!hit || !hasImage(hit.picture_xl)) return null;
    const file = slug(artist.name) + ".jpg";
    await download(hit.picture_xl, path.join(PHOTOS_DIR, file));
    return { file, source: `Deezer: ${hit.link}` };
};

// iTunes truoc, khong co thi thu Deezer
const fetchArtistPhoto = async (artist) => {
    const viaItunes = await fetchArtistPhotoItunes(artist);
    if (!viaItunes.error) return viaItunes;
    const dz = await fetchArtistPhotoDeezer(artist).catch(() => null);
    return dz || { error: viaItunes.error + " (Deezer cung khong co)" };
};

const fetchArtistPhotoItunes = async (artist) => {
    const results = await itunesSearch({ term: artist.name, entity: "musicArtist", limit: "5" });
    const hit = results.find((r) => plain(r.artistName) === plain(artist.name));
    if (!hit?.artistLinkUrl) return { error: "khong co ca si nay tren iTunes" };
    // API khong tra anh ca si -> doc the og:image cua trang ca si tren Apple Music
    const html = await (await fetch(hit.artistLinkUrl)).text();
    const og = html.match(/property="og:image" content="([^"]+)"/)?.[1];
    // trang ca si khong co anh chan dung thi Apple dung anh bia album -> bo, giu avatar cu
    if (!og || !/AMCArtistImages|Features/.test(og)) return { error: "Apple Music chi co anh album, khong co anh chan dung" };
    // ".../1200x630cw.png" (anh ngang) -> ".../1000x1000cc.jpg" (vuong, cat giua)
    const url = og.replace(/\/\d+x\d+\w*\.(png|jpg)$/, "/1000x1000cc.jpg");
    const file = slug(artist.name) + ".jpg";
    await download(url, path.join(PHOTOS_DIR, file));
    return { file, source: hit.artistLinkUrl.replace(/\?.*$/, "") };
};

const run = async () => {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
    const missing = [];   // can ban tu bo anh vao

    const songs = (await db.query(
        `SELECT s.id, s.title, s.file_path, a.name AS artist
         FROM songs s LEFT JOIN artists a ON a.id = s.artist_id
         WHERE s.cover IS NULL ORDER BY s.id`
    )).rows;
    console.log(`\n== Anh bia: ${songs.length} bai chua co ==`);
    for (const song of songs) {
        const name = path.basename(song.file_path, path.extname(song.file_path));
        try {
            let file = findLocal(COVERS_DIR, name);
            let note = "file co san tren may";
            if (!file) {
                if (!song.artist) {
                    missing.push(`bai "${song.title}" (khong co ca si) -> covers/${name}.jpg`);
                    console.log(`  - ${song.title}: bo qua, khong co ca si de tim`);
                    continue;
                }
                const r = await fetchSongCover(song);
                if (r.error) {
                    missing.push(`bai "${song.title}" (${r.error}) -> covers/${name}.jpg`);
                    console.log(`  x ${song.title}: ${r.error}`);
                    continue;
                }
                file = r.file;
                note = r.source;
            }
            await db.query(`UPDATE songs SET cover = $1 WHERE id = $2`, [file, song.id]);
            console.log(`  ✓ ${song.title} -> covers/${file}   [${note}]`);
        } catch (err) {
            missing.push(`bai "${song.title}" (loi: ${err.message}) -> covers/${name}.jpg`);
            console.log(`  x ${song.title}: ${err.message}`);
        }
    }

    const artists = (await db.query(`SELECT id, name FROM artists WHERE photo IS NULL ORDER BY id`)).rows;
    console.log(`\n== Anh ca si: ${artists.length} ca si chua co ==`);
    for (const artist of artists) {
        const name = slug(artist.name);
        try {
            let file = findLocal(PHOTOS_DIR, name);
            let note = "file co san tren may";
            if (!file) {
                const r = await fetchArtistPhoto(artist);
                if (r.error) {
                    missing.push(`ca si "${artist.name}" (${r.error}) -> avatars/photos/${name}.jpg`);
                    console.log(`  x ${artist.name}: ${r.error}`);
                    continue;
                }
                file = r.file;
                note = r.source;
            }
            // luu duong dan tinh tu avatars/ -> web goi /avatars/photos/<file> giong anh avatar cu
            await db.query(`UPDATE artists SET photo = $1 WHERE id = $2`, ["photos/" + file, artist.id]);
            console.log(`  ✓ ${artist.name} -> avatars/photos/${file}   [${note}]`);
        } catch (err) {
            missing.push(`ca si "${artist.name}" (loi: ${err.message}) -> avatars/photos/${name}.jpg`);
            console.log(`  x ${artist.name}: ${err.message}`);
        }
    }

    if (missing.length) {
        console.log(`\n== Con thieu ${missing.length} anh: tu bo anh vao dung ten file duoi day roi chay lai lenh ==`);
        missing.forEach((m) => console.log("  - " + m));
    } else {
        console.log("\nDu anh cho tat ca bai hat va ca si.");
    }
};

run()
    .catch((err) => {
        console.error("Loi:", err.message);
        process.exitCode = 1;
    })
    .finally(() => db.pool.end());

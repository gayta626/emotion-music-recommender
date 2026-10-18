const db = require("../config/db")

// Quan ly kho nhac tren trang admin (bai hat + ca si) -> chi route co requireAdmin duoc goi.

// moi bai kem so luot nghe / so nguoi thich cua CA HE THONG (de admin biet xoa bai nao thi anh huong bao nhieu)
let getSongs = async () => (await db.query(
    `SELECT s.id, s.title, s.artist_id, a.name AS artist, COALESCE(a.photo, a.avatar) AS artist_avatar,
            s.genre_id, g.name AS genre, s.emotion, s.energy, s.album, s.duration, s.youtube_id, s.cover,
            s.file_path, s.added_at,
            (SELECT COUNT(*) FROM recently_played rp WHERE rp.song_id = s.id)::int AS plays,
            (SELECT COUNT(*) FROM liked_songs l WHERE l.song_id = s.id)::int AS likes
     FROM songs s
     LEFT JOIN artists a ON a.id = s.artist_id
     LEFT JOIN genres g ON g.id = s.genre_id
     ORDER BY s.added_at DESC, s.id DESC`
)).rows;

let getArtists = async () => (await db.query(
    `SELECT a.id, a.name, a.avatar, a.photo,
            (SELECT COUNT(*) FROM songs s WHERE s.artist_id = a.id)::int AS songs
     FROM artists a
     ORDER BY a.name`
)).rows;

let findSong = async (songId) => (await db.query(
    `SELECT s.id, s.title, s.file_path, s.cover, a.name AS artist
     FROM songs s LEFT JOIN artists a ON a.id = s.artist_id WHERE s.id = $1`, [songId]
)).rows[0];

// ten file da dung trong DB (ke ca bai co file mp3 bi mat) -> dat ten file moi khong trung
let getFilePaths = async () => (await db.query(`SELECT file_path FROM songs`)).rows.map((r) => r.file_path);

// moi bai: ten bai + ten ca si + the loai -> bao trung bai (giong import-music) + the loai quen thuoc cua ca si
let getSongKeys = async () => (await db.query(
    `SELECT s.id, s.title, a.name AS artist, g.name AS genre
     FROM songs s LEFT JOIN artists a ON a.id = s.artist_id LEFT JOIN genres g ON g.id = s.genre_id`
)).rows;

let getArtistNames = async () => (await db.query(`SELECT name FROM artists`)).rows.map((r) => r.name);

// ten da chuan hoa o service; co roi thi lay id cu (giong import-music: ON CONFLICT DO NOTHING roi SELECT)
let findOrCreateArtist = async (name) => {
    await db.query(`INSERT INTO artists (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name]);
    return (await db.query(`SELECT id FROM artists WHERE name = $1`, [name])).rows[0].id;
}

let findOrCreateGenre = async (name) => {
    await db.query(`INSERT INTO genres (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name]);
    return (await db.query(`SELECT id FROM genres WHERE name = $1`, [name])).rows[0].id;
}

// f = cac cot da kiem tra o service (title, artist_id, genre_id, emotion, energy, album, youtube_id)
let insertSong = async (f, filePath, duration, cover) => (await db.query(
    `INSERT INTO songs (title, artist_id, genre_id, file_path, emotion, energy, album, youtube_id, duration, cover)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [f.title, f.artist_id, f.genre_id, filePath, f.emotion, f.energy, f.album, f.youtube_id, duration, cover]
)).rows[0].id;

// chi sua cac cot co trong `fields` (ten cot da duoc service gioi han trong SONG_COLUMNS, khong lay tu client)
let updateSong = async (songId, fields) => {
    const cols = Object.keys(fields);
    if (!cols.length) return;
    const sets = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
    await db.query(`UPDATE songs SET ${sets} WHERE id = $1`, [songId, ...cols.map((c) => fields[c])]);
}

// playlist / thich / diem so thich / bai vua nghe: ON DELETE CASCADE; lich su cam xuc giu lai (song_id -> NULL)
let deleteSong = async (songId) => {
    await db.query(`DELETE FROM songs WHERE id = $1`, [songId]);
}

let findArtist = async (artistId) => (await db.query(
    `SELECT a.id, a.name, a.photo, (SELECT COUNT(*) FROM songs s WHERE s.artist_id = a.id)::int AS songs
     FROM artists a WHERE a.id = $1`, [artistId]
)).rows[0];

let insertArtist = async (name, photo) => (await db.query(
    `INSERT INTO artists (name, photo) VALUES ($1, $2) RETURNING id`, [name, photo]
)).rows[0].id;

let updateArtist = async (artistId, fields) => {
    const cols = Object.keys(fields);
    if (!cols.length) return;
    const sets = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
    await db.query(`UPDATE artists SET ${sets} WHERE id = $1`, [artistId, ...cols.map((c) => fields[c])]);
}

let deleteArtist = async (artistId) => {
    await db.query(`DELETE FROM artists WHERE id = $1`, [artistId]);
}

module.exports = {
    getSongs, getArtists, findSong, getFilePaths,
    getSongKeys, getArtistNames, findOrCreateArtist, findOrCreateGenre,
    insertSong, updateSong, deleteSong,
    findArtist, insertArtist, updateArtist, deleteArtist,
}

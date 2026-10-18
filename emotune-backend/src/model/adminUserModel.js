const db = require("../config/db")

// Quan ly tai khoan tren trang admin: doc / sua tai khoan CUA NGUOI KHAC -> chi route co requireAdmin duoc goi.

// moi tai khoan 1 dong + so lieu tong (tu truoc toi nay), moi tao truoc
let listUsers = async () => (await db.query(
    `SELECT u.id, u.username, u.role, u.locked_at, u.survey_done_at, u.created_at,
            (SELECT COUNT(*) FROM mood_history m WHERE m.user_id = u.id AND m.action = 'suggested')::int AS scans,
            (SELECT COUNT(*) FROM mood_history m WHERE m.user_id = u.id AND m.action IN ('good', 'neutral', 'bad', 'declined'))::int AS listens,
            (SELECT COUNT(*) FROM playlists p WHERE p.user_id = u.id)::int AS playlists,
            (SELECT COUNT(*) FROM liked_songs l WHERE l.user_id = u.id)::int AS likes,
            (SELECT MAX(m.created_at) FROM mood_history m WHERE m.user_id = u.id) AS last_at
     FROM users u
     ORDER BY u.created_at DESC, u.id DESC`
)).rows;

let findUser = async (userId) => (await db.query(
    `SELECT id, username, role, locked_at, survey_done_at, created_at FROM users WHERE id = $1`,
    [userId]
)).rows[0];

let setRole = async (userId, role) => {
    await db.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, userId]);
}

// locked = true -> ghi thoi diem khoa (giu thoi diem cu neu da khoa), false -> mo khoa
let setLocked = async (userId, locked) => {
    await db.query(
        `UPDATE users SET locked_at = CASE WHEN $1 THEN COALESCE(locked_at, NOW()) ELSE NULL END WHERE id = $2`,
        [locked, userId]
    );
}

let setPasswordHash = async (userId, hash) => {
    await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId]);
}

// cac bang ca nhan deu ON DELETE CASCADE -> xoa 1 dong users la xoa het du lieu cua nguoi do
let deleteUser = async (userId) => {
    await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
}

// ---- trang chi tiet 1 nguoi (/admin/users/:id) ----

let getTaste = async (userId) => {
    const artists = await db.query(
        `SELECT a.name FROM survey_artists sa JOIN artists a ON a.id = sa.artist_id WHERE sa.user_id = $1 ORDER BY a.name`,
        [userId]);
    const genres = await db.query(
        `SELECT g.name FROM survey_genres sg JOIN genres g ON g.id = sg.genre_id WHERE sg.user_id = $1 ORDER BY g.name`,
        [userId]);
    return { artists: artists.rows.map((r) => r.name), genres: genres.rows.map((r) => r.name) };
}

// moi dong mood_history: 'suggested' = 1 lan quet / chon cam xuc, con lai = ket qua nghe
let getMoodCounts = async (userId) => (await db.query(
    `SELECT emotion, action, COUNT(*)::int AS count FROM mood_history WHERE user_id = $1 GROUP BY emotion, action`,
    [userId]
)).rows;

// nhat ky gan nhat (quet + nghe), kem ten bai
let getHistory = async (userId, limit) => (await db.query(
    `SELECT m.id, m.created_at, m.emotion, m.confidence, m.action, m.song_id, s.title, a.name AS artist
     FROM mood_history m
     LEFT JOIN songs s ON s.id = m.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE m.user_id = $1
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT $2`,
    [userId, limit]
)).rows;

// bai nghe nhieu nhat (recently_played: moi lan nghe xong 1 dong)
let getTopSongs = async (userId, limit) => (await db.query(
    `SELECT s.id, s.title, a.name AS artist, COUNT(*)::int AS plays, MAX(rp.played_at) AS last_played
     FROM recently_played rp
     JOIN songs s ON s.id = rp.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE rp.user_id = $1
     GROUP BY s.id, a.name
     ORDER BY plays DESC, last_played DESC
     LIMIT $2`,
    [userId, limit]
)).rows;

// diem so thich cao nhat AI hoc duoc (preferences, tach theo cam xuc)
let getTopPreferences = async (userId, limit) => (await db.query(
    `SELECT p.emotion, p.score, s.id, s.title, a.name AS artist
     FROM preferences p
     JOIN songs s ON s.id = p.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE p.user_id = $1 AND p.score <> 0
     ORDER BY p.score DESC
     LIMIT $2`,
    [userId, limit]
)).rows;

// playlist + bai trong do (1 dong / bai; playlist rong van co 1 dong voi song_id NULL)
let getPlaylists = async (userId) => (await db.query(
    `SELECT p.id, p.name, p.created_at, s.id AS song_id, s.title, a.name AS artist
     FROM playlists p
     LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
     LEFT JOIN songs s ON s.id = ps.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE p.user_id = $1
     ORDER BY p.created_at, p.id, ps.position`,
    [userId]
)).rows;

let getLiked = async (userId) => (await db.query(
    `SELECT s.id, s.title, a.name AS artist, l.liked_at
     FROM liked_songs l
     JOIN songs s ON s.id = l.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE l.user_id = $1
     ORDER BY l.liked_at DESC`,
    [userId]
)).rows;

module.exports = {
    listUsers, findUser, setRole, setLocked, setPasswordHash, deleteUser,
    getTaste, getMoodCounts, getHistory, getTopSongs, getTopPreferences, getPlaylists, getLiked,
}

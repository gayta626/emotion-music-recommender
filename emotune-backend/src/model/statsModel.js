const db = require("../config/db")

// Trang thong ke: MOI cau loc theo user_id ($1). $2 = so ngay (7 / 30): tu (hom nay - $2 + 1) toi hien tai.

// cot bai hat tra ve (cung dang voi /songs -> frontend phat duoc ngay)
const SONG_COLS = `s.id, s.title, a.name AS artist, COALESCE(a.photo, a.avatar) AS artist_avatar, s.file_path, s.cover,
                   s.emotion, s.artist_id, s.genre_id, s.album, s.duration`;

// lan quet theo ngay x cam xuc
let getScanDays = async (userId, days) => (await db.query(
    `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, emotion, COUNT(*)::int AS count
     FROM mood_history
     WHERE user_id = $1 AND action = 'suggested' AND created_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY 1, 2`,
    [userId, days])).rows;

// lan quet theo thu (1 = Thu Hai) x gio x cam xuc -> chia buoi o service
let getScanHours = async (userId, days) => (await db.query(
    `SELECT EXTRACT(ISODOW FROM created_at)::int AS weekday, EXTRACT(HOUR FROM created_at)::int AS hour,
            emotion, COUNT(*)::int AS count
     FROM mood_history
     WHERE user_id = $1 AND action = 'suggested' AND created_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY 1, 2, 3`,
    [userId, days])).rows;

// so bai da nghe + tong thoi luong (bai chua co duration thi khong cong)
let getPlaySummary = async (userId, days) => (await db.query(
    `SELECT COUNT(*)::int AS plays, COALESCE(SUM(s.duration), 0)::int AS seconds
     FROM recently_played r JOIN songs s ON s.id = r.song_id
     WHERE r.user_id = $1 AND r.played_at >= CURRENT_DATE - ($2::int - 1)`,
    [userId, days])).rows[0];

let getTopSongs = async (userId, days) => (await db.query(
    `SELECT ${SONG_COLS}, COUNT(*)::int AS plays
     FROM recently_played r
     JOIN songs s ON s.id = r.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE r.user_id = $1 AND r.played_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY s.id, a.id
     ORDER BY plays DESC, s.id
     LIMIT 5`,
    [userId, days])).rows;

let getTopArtists = async (userId, days) => (await db.query(
    `SELECT a.id, a.name, COALESCE(a.photo, a.avatar) AS avatar, COUNT(*)::int AS plays
     FROM recently_played r
     JOIN songs s ON s.id = r.song_id
     JOIN artists a ON a.id = s.artist_id
     WHERE r.user_id = $1 AND r.played_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY a.id
     ORDER BY plays DESC, a.id
     LIMIT 5`,
    [userId, days])).rows;

// bai nghe het (action good) khi dang o tung cam xuc
let getMoodSongs = async (userId, days) => (await db.query(
    `SELECT m.emotion AS mood, ${SONG_COLS}, COUNT(*)::int AS times
     FROM mood_history m
     JOIN songs s ON s.id = m.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE m.user_id = $1 AND m.action = 'good' AND m.created_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY m.emotion, s.id, a.id`,
    [userId, days])).rows;

// ket qua cac luot nghe theo ngay
let getOutcomes = async (userId, days) => (await db.query(
    `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, action, COUNT(*)::int AS count
     FROM mood_history
     WHERE user_id = $1 AND action IN ('good', 'neutral', 'bad', 'declined')
       AND created_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY 1, 2`,
    [userId, days])).rows;

// diem so thich: cong don tu truoc toi nay (khong theo cua so ngay)
let getPreferences = async (userId) => (await db.query(
    `SELECT p.emotion AS mood, p.score, ${SONG_COLS}
     FROM preferences p
     JOIN songs s ON s.id = p.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE p.user_id = $1`,
    [userId])).rows;

// do tu tin cua model khi quet camera (dong co confidence)
let getConfidence = async (userId, days) => (await db.query(
    `SELECT emotion, AVG(confidence)::float AS avg, COUNT(*)::int AS count
     FROM mood_history
     WHERE user_id = $1 AND action = 'suggested' AND confidence IS NOT NULL
       AND created_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY emotion`,
    [userId, days])).rows;

module.exports = {
    getScanDays, getScanHours, getPlaySummary, getTopSongs, getTopArtists,
    getMoodSongs, getOutcomes, getPreferences, getConfidence,
}

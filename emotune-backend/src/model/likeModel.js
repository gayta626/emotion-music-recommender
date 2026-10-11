const db = require("../config/db")

// Bai da thich (♥) cua 1 nguoi, moi thich truoc. Cung dang du lieu bai nhu playlist -> frontend phat nhu 1 hang doi
const getLikedSongs = async (userId) => {
    const result = await db.query(
        `SELECT s.id, s.title, a.name AS artist, COALESCE(a.photo, a.avatar) AS artist_avatar, s.file_path, s.cover, s.youtube_id, s.emotion,
                s.artist_id, s.genre_id, g.name AS genre, s.album, s.duration, l.liked_at AS added_at
         FROM liked_songs l
         JOIN songs s ON s.id = l.song_id
         LEFT JOIN artists a ON a.id = s.artist_id
         LEFT JOIN genres g ON g.id = s.genre_id
         WHERE l.user_id = $1
         ORDER BY l.liked_at DESC, s.id DESC`,
        [userId]
    );
    return result.rows;
}

// Da thich roi thi bo qua (PRIMARY KEY) -> tra false
const likeSong = async (userId, songId) => {
    const result = await db.query(
        `INSERT INTO liked_songs (user_id, song_id) VALUES ($1, $2)
         ON CONFLICT (user_id, song_id) DO NOTHING`,
        [userId, songId]
    );
    return result.rowCount > 0;
}

// Chua thich thi khong co gi de xoa -> tra false
const unlikeSong = async (userId, songId) => {
    const result = await db.query(
        `DELETE FROM liked_songs WHERE user_id = $1 AND song_id = $2`,
        [userId, songId]
    );
    return result.rowCount > 0;
}

module.exports = { getLikedSongs, likeSong, unlikeSong }

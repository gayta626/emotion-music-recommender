const db = require("../config/db")

// Toan bo kho nhac (de tim bai them vao playlist, goi y "Recommended")
// cung dang voi `song` cua /suggest + artist_id, genre_id, genre de frontend so khop gu
let getAllSongs = async () => {
    const result = await db.query(
        `SELECT s.id, s.title, a.name AS artist, COALESCE(a.photo, a.avatar) AS artist_avatar, s.file_path, s.cover, s.emotion,
                s.artist_id, s.genre_id, g.name AS genre
         FROM songs s
         LEFT JOIN artists a ON a.id = s.artist_id
         LEFT JOIN genres g ON g.id = s.genre_id
         ORDER BY s.title`
    );
    return result.rows;
}

// "Made for you" tren trang chu: moi bai kem 2 thanh phan diem cua CHINH nguoi nay
// - listen_score: tong diem nghe that (preferences, moi cam xuc)
// - taste_bonus: thuong khao sat gu (+0.5 cung ca si, +0.5 cung the loai)
let getForYouRows = async (userId) => {
    const result = await db.query(
        `SELECT s.id, s.title, a.name AS artist, COALESCE(a.photo, a.avatar) AS artist_avatar, s.file_path, s.cover, s.emotion,
                s.artist_id, s.genre_id, g.name AS genre,
                COALESCE((SELECT SUM(p.score) FROM preferences p WHERE p.user_id = $1 AND p.song_id = s.id), 0) AS listen_score,
                (CASE WHEN EXISTS (SELECT 1 FROM survey_artists sa WHERE sa.user_id = $1 AND sa.artist_id = s.artist_id) THEN 0.5 ELSE 0 END
               + CASE WHEN EXISTS (SELECT 1 FROM survey_genres sg WHERE sg.user_id = $1 AND sg.genre_id = s.genre_id) THEN 0.5 ELSE 0 END) AS taste_bonus
         FROM songs s
         LEFT JOIN artists a ON a.id = s.artist_id
         LEFT JOIN genres g ON g.id = s.genre_id`,
        [userId]
    );
    return result.rows;
}

module.exports = {
    getAllSongs: getAllSongs,
    getForYouRows: getForYouRows,
}

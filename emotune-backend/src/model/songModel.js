const db = require("../config/db")

// Toan bo kho nhac (de tim bai them vao playlist, goi y "Recommended")
// cung dang voi `song` cua /suggest + artist_id, genre_id, genre de frontend so khop gu
let getAllSongs = async () => {
    const result = await db.query(
        `SELECT s.id, s.title, a.name AS artist, a.avatar AS artist_avatar, s.file_path, s.emotion,
                s.artist_id, s.genre_id, g.name AS genre
         FROM songs s
         LEFT JOIN artists a ON a.id = s.artist_id
         LEFT JOIN genres g ON g.id = s.genre_id
         ORDER BY s.title`
    );
    return result.rows;
}

module.exports = {
    getAllSongs: getAllSongs,
}

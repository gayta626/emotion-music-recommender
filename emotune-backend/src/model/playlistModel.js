const db = require("../config/db")

// Mọi hàm nhận userId đầu tiên và chỉ đụng tới playlist CỦA NGƯỜI ĐÓ (WHERE ... user_id = $1)

// Người chưa có playlist nào thì tạo sẵn "My Playlist" để nút "Add to playlist" luôn có chỗ thêm
const ensureDefaultPlaylist = async (userId) => {
    await db.query(
        `INSERT INTO playlists (user_id, name)
         SELECT $1, 'My Playlist'
         WHERE NOT EXISTS (SELECT 1 FROM playlists WHERE user_id = $1)`,
        [userId]
    );
}

const getPlaylists = async (userId) => {
    const result = await db.query(
        `SELECT p.id, p.name, COUNT(ps.song_id)::int AS "songCount"
         FROM playlists p
         LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
         WHERE p.user_id = $1
         GROUP BY p.id
         ORDER BY p.id`,
        [userId]
    );
    return result.rows;
}

// undefined nếu playlist không tồn tại hoặc không phải của userId
const getPlaylistInfo = async (userId, playlistId) => {
    const result = await db.query(
        `SELECT id, name FROM playlists WHERE id = $1 AND user_id = $2`,
        [playlistId, userId]
    );
    return result.rows[0];
}

// Các bài theo đúng thứ tự phát; cùng dạng với `song` của /scan-and-suggest (id, title, artist, file_path, emotion)
const getPlaylistSongs = async (playlistId) => {
    const result = await db.query(
        `SELECT s.id, s.title, a.name AS artist, COALESCE(a.photo, a.avatar) AS artist_avatar, s.file_path, s.cover, s.emotion,
                s.artist_id, s.genre_id, g.name AS genre, s.album, s.duration, ps.position, ps.added_at
         FROM playlist_songs ps
         JOIN songs s ON s.id = ps.song_id
         LEFT JOIN artists a ON a.id = s.artist_id
         LEFT JOIN genres g ON g.id = s.genre_id
         WHERE ps.playlist_id = $1
         ORDER BY ps.position`,
        [playlistId]
    );
    return result.rows;
}

// Thêm vào cuối playlist. Bài đã có sẵn thì bỏ qua (PRIMARY KEY) -> trả false
const addSong = async (playlistId, songId) => {
    const result = await db.query(
        `INSERT INTO playlist_songs (playlist_id, song_id, position)
         SELECT $1, $2, COALESCE(MAX(position), 0) + 1
         FROM playlist_songs WHERE playlist_id = $1
         ON CONFLICT (playlist_id, song_id) DO NOTHING`,
        [playlistId, songId]
    );
    return result.rowCount === 1;
}

const removeSong = async (playlistId, songId) => {
    const result = await db.query(
        `DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2`,
        [playlistId, songId]
    );
    return result.rowCount === 1;
}

// Ten trung voi playlist khac cua cung nguoi -> Postgres bao loi 23505 (UNIQUE user_id, name)
const createPlaylist = async (userId, name) => {
    const result = await db.query(
        `INSERT INTO playlists (user_id, name) VALUES ($1, $2) RETURNING id, name`,
        [userId, name]
    );
    return result.rows[0];
}

const renamePlaylist = async (userId, playlistId, name) => {
    const result = await db.query(
        `UPDATE playlists SET name = $3 WHERE id = $2 AND user_id = $1 RETURNING id, name`,
        [userId, playlistId, name]
    );
    return result.rows[0];
}

// playlist_songs co ON DELETE CASCADE -> cac bai trong playlist tu xoa theo
const deletePlaylist = async (userId, playlistId) => {
    const result = await db.query(
        `DELETE FROM playlists WHERE id = $2 AND user_id = $1`,
        [userId, playlistId]
    );
    return result.rowCount === 1;
}

module.exports = {
    ensureDefaultPlaylist, getPlaylists, getPlaylistInfo, getPlaylistSongs, addSong, removeSong,
    createPlaylist, renamePlaylist, deletePlaylist
}

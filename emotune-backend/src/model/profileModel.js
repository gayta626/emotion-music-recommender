const db = require("../config/db")

// Khảo sát gu của MỘT người: ca sĩ + thể loại đã chọn, và đã làm / bỏ qua khảo sát chưa
const getProfile = async (userId) => {
    const [user, artists, genres] = await Promise.all([
        db.query(`SELECT survey_done_at FROM users WHERE id = $1`, [userId]),
        db.query(`SELECT artist_id FROM survey_artists WHERE user_id = $1 ORDER BY artist_id`, [userId]),
        db.query(`SELECT genre_id FROM survey_genres WHERE user_id = $1 ORDER BY genre_id`, [userId]),
    ]);
    return {
        done: Boolean(user.rows[0]?.survey_done_at),
        artistIds: artists.rows.map((r) => r.artist_id),
        genreIds: genres.rows.map((r) => r.genre_id),
    };
}

// Ghi đè lựa chọn cũ bằng lựa chọn mới trong 1 transaction (lỗi giữa chừng thì không mất lựa chọn cũ)
const saveProfile = async (userId, artistIds, genreIds) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`DELETE FROM survey_artists WHERE user_id = $1`, [userId]);
        await client.query(`DELETE FROM survey_genres WHERE user_id = $1`, [userId]);
        await client.query(
            `INSERT INTO survey_artists (user_id, artist_id) SELECT $1, unnest($2::int[])`,
            [userId, artistIds]
        );
        await client.query(
            `INSERT INTO survey_genres (user_id, genre_id) SELECT $1, unnest($2::int[])`,
            [userId, genreIds]
        );
        await client.query(`UPDATE users SET survey_done_at = NOW() WHERE id = $1`, [userId]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { getProfile, saveProfile }

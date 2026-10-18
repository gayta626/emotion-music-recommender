const db = require("../config/db")

// Khảo sát gu của MỘT người: ca sĩ + thể loại đã chọn, đã làm / bỏ qua khảo sát chưa và lưu lúc nào
const getProfile = async (userId) => {
    const [user, artists, genres] = await Promise.all([
        db.query(`SELECT survey_done_at, face_consent_at FROM users WHERE id = $1`, [userId]),
        db.query(`SELECT artist_id FROM survey_artists WHERE user_id = $1 ORDER BY artist_id`, [userId]),
        db.query(`SELECT genre_id FROM survey_genres WHERE user_id = $1 ORDER BY genre_id`, [userId]),
    ]);
    return {
        done: Boolean(user.rows[0]?.survey_done_at),
        updatedAt: user.rows[0]?.survey_done_at || null,   // lần lưu gu gần nhất (trang Settings hiện ngày này)
        artistIds: artists.rows.map((r) => r.artist_id),
        genreIds: genres.rows.map((r) => r.genre_id),
        shareFaces: Boolean(user.rows[0]?.face_consent_at),   // C15: dong y luu anh mat khi sua cam xuc
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

// C15: dong y (on) / rut lai dong y luu anh mat khi sua cam xuc
const setFaceConsent = async (userId, on) => {
    await db.query(`UPDATE users SET face_consent_at = ${on ? "NOW()" : "NULL"} WHERE id = $1`, [userId]);
}

const hasFaceConsent = async (userId) => {
    const result = await db.query(`SELECT face_consent_at FROM users WHERE id = $1`, [userId]);
    return Boolean(result.rows[0]?.face_consent_at);
}

module.exports = { getProfile, saveProfile, setFaceConsent, hasFaceConsent }

const db = require("../config/db")

let getMoodTrend = async (userId, days) => {
    try {
        const result = await db.query(
            `SELECT emotion, COUNT(*) AS cnt
             FROM mood_history
             WHERE user_id = $1
               AND created_at >= NOW() - ($2 || ' days')::interval
               AND action = 'suggested'
             GROUP BY emotion`,
            [userId, days]
        )
        return result.rows
    } catch (err) {
        throw (err)
    }
}

let getSongsByEmotion = async (userId, emotion) => {
    try {
        const result = await db.query(
            `SELECT s.id, s.title, a.name AS artist, a.avatar AS artist_avatar, s.file_path, s.emotion, s.energy,
                    COALESCE(p.score, 0) AS score
             FROM songs s
             LEFT JOIN artists a ON a.id = s.artist_id
             -- diem cua CHINH nguoi nay; dat trong ON (khong dat o WHERE) de bai chua co diem van duoc chon
             LEFT JOIN preferences p
                    ON p.song_id = s.id AND p.emotion = $2 AND p.user_id = $1
             WHERE s.emotion = $2
               -- bo 3 bai CHINH nguoi nay vua nghe
               AND s.id NOT IN (
                   SELECT song_id FROM recently_played
                   WHERE user_id = $1
                   ORDER BY played_at DESC
                   LIMIT 3
               )
             ORDER BY score DESC`,
            [userId, emotion]
        );

        let candidates = result.rows;

        if (candidates.length === 0) {
            const fallback = await db.query(
                `SELECT s.id, s.title, a.name AS artist, a.avatar AS artist_avatar, s.file_path, s.emotion, s.energy,
                        COALESCE(p.score, 0) AS score
                 FROM songs s
                 LEFT JOIN artists a ON a.id = s.artist_id
                 LEFT JOIN preferences p ON p.song_id = s.id AND p.emotion = $2 AND p.user_id = $1
                 WHERE s.emotion = $2
                 ORDER BY score DESC`,
                [userId, emotion]
            );
            candidates = fallback.rows;
        }
        return candidates;
    } catch (err) {
        throw (err)
    }

}

let logSuggestion = async (userId, emotion, confidence, songId) => {
    try {
        await db.query(
            `INSERT INTO mood_history (user_id, emotion, confidence, song_id, action)
             VALUES ($1, $2, $3, $4, 'suggested')`,
            [userId, emotion, confidence || null, songId]
        );
    } catch (err) {
        throw err;
    }
}
module.exports = {
    getMoodTrend: getMoodTrend,
    getSongsByEmotion: getSongsByEmotion,
    logSuggestion: logSuggestion

}
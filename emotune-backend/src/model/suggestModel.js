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

// Diem thuong tu khao sat gu (cold start): +0.5 neu ca si nam trong survey_artists, +0.5 neu the loai nam trong survey_genres.
// Nho hon 1 lan nghe that (+-1) -> hanh vi nghe that van lan at duoc khai bao ban dau.
const TASTE_BONUS = `(CASE WHEN EXISTS (SELECT 1 FROM survey_artists sa WHERE sa.user_id = $1 AND sa.artist_id = s.artist_id) THEN 0.5 ELSE 0 END
                    + CASE WHEN EXISTS (SELECT 1 FROM survey_genres sg WHERE sg.user_id = $1 AND sg.genre_id = s.genre_id) THEN 0.5 ELSE 0 END)`;

let getSongsByEmotion = async (userId, emotion) => {
    try {
        const result = await db.query(
            `SELECT s.id, s.title, a.name AS artist, a.avatar AS artist_avatar, s.file_path, s.emotion, s.energy,
                    COALESCE(p.score, 0) AS score,
                    ${TASTE_BONUS} AS taste_bonus
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
             ORDER BY COALESCE(p.score, 0) + ${TASTE_BONUS} DESC`,
            [userId, emotion]
        );

        let candidates = result.rows;

        if (candidates.length === 0) {
            const fallback = await db.query(
                `SELECT s.id, s.title, a.name AS artist, a.avatar AS artist_avatar, s.file_path, s.emotion, s.energy,
                        COALESCE(p.score, 0) AS score,
                        ${TASTE_BONUS} AS taste_bonus
                 FROM songs s
                 LEFT JOIN artists a ON a.id = s.artist_id
                 LEFT JOIN preferences p ON p.song_id = s.id AND p.emotion = $2 AND p.user_id = $1
                 WHERE s.emotion = $2
                 ORDER BY COALESCE(p.score, 0) + ${TASTE_BONUS} DESC`,
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
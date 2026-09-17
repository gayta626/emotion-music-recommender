const db = require("../config/db")

let getMoodTrend = async (days) => {
    try {
        const result = await db.query(
            `SELECT emotion, COUNT(*) AS cnt
             FROM mood_history
             WHERE created_at >= NOW() - ($1 || ' days')::interval
             GROUP BY emotion`,
            [days]
        )
        return result.rows
    } catch (err) {
        throw (err)
    }
}

let getSongsByEmotion = async (emotion) => {
    try {
        const result = await db.query(
            `SELECT s.id, s.title, s.artist, s.file_path, s.emotion, s.energy,
                    COALESCE(p.score, 0) AS score
             FROM songs s
             LEFT JOIN preferences p
                    ON p.song_id = s.id AND p.emotion = $1
             WHERE s.emotion = $1
               AND s.id NOT IN (
                   SELECT song_id FROM recently_played
                   ORDER BY played_at DESC
                   LIMIT 3
               )
             ORDER BY score DESC`,
            [emotion]
        );

        let candidates = result.rows;

        if (candidates.length === 0) {
            const fallback = await db.query(
                `SELECT s.id, s.title, s.artist, s.file_path, s.emotion, s.energy,
                        COALESCE(p.score, 0) AS score
                 FROM songs s
                 LEFT JOIN preferences p ON p.song_id = s.id AND p.emotion = $1
                 WHERE s.emotion = $1
                 ORDER BY score DESC`,
                [emotion]
            );
            candidates = fallback.rows;
        }
        return candidates;
    } catch (err) {
        throw (err)
    }

}

let logSuggestion = async (emotion, confidence, songId) => {
    try {
        await db.query(
            `INSERT INTO mood_history (emotion, confidence, song_id, action)
             VALUES ($1, $2, $3, 'suggested')`,
            [emotion, confidence || null, songId]
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
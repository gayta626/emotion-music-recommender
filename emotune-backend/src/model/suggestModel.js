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
// Tach 2 phan (ca si / the loai) de I2 "Vi sao NYX chon bai nay?" noi duoc ly do nao.
const TASTE_ARTIST = `(CASE WHEN EXISTS (SELECT 1 FROM survey_artists sa WHERE sa.user_id = $1 AND sa.artist_id = s.artist_id) THEN 0.5 ELSE 0 END)`;
const TASTE_GENRE = `(CASE WHEN EXISTS (SELECT 1 FROM survey_genres sg WHERE sg.user_id = $1 AND sg.genre_id = s.genre_id) THEN 0.5 ELSE 0 END)`;
const TASTE_BONUS = `(${TASTE_ARTIST} + ${TASTE_GENRE})`;

// Diem thuong bai nguoi dung bam ♥: +1 = bang 1 lan nghe het bai. Phan hoi tich cuc ro rang nen manh hon khao sat (+0.5),
// nhung van chi xet trong cac bai hop cam xuc dang quet (WHERE s.emotion = ...) -> khong phat bai vui khi dang buon chi vi da thich.
const LIKE_BONUS = `(CASE WHEN EXISTS (SELECT 1 FROM liked_songs l WHERE l.user_id = $1 AND l.song_id = s.id) THEN 1 ELSE 0 END)`;

// cac cot chung cua 2 cau SELECT duoi (bai + diem nghe + tung loai diem thuong)
const SONG_COLS = `s.id, s.title, s.artist_id, a.name AS artist, COALESCE(a.photo, a.avatar) AS artist_avatar, s.file_path, s.cover, s.youtube_id,
                    s.emotion, s.energy, g.name AS genre,
                    COALESCE(p.score, 0) AS score,
                    ${TASTE_BONUS} AS taste_bonus,
                    ${TASTE_ARTIST} AS taste_artist,
                    ${TASTE_GENRE} AS taste_genre,
                    ${LIKE_BONUS} AS like_bonus`;

let getSongsByEmotion = async (userId, emotion) => {
    try {
        const result = await db.query(
            `SELECT ${SONG_COLS}
             FROM songs s
             LEFT JOIN artists a ON a.id = s.artist_id
             LEFT JOIN genres g ON g.id = s.genre_id
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
             ORDER BY COALESCE(p.score, 0) + ${TASTE_BONUS} + ${LIKE_BONUS} DESC`,
            [userId, emotion]
        );

        let candidates = result.rows;

        if (candidates.length === 0) {
            const fallback = await db.query(
                `SELECT ${SONG_COLS}
                 FROM songs s
                 LEFT JOIN artists a ON a.id = s.artist_id
                 LEFT JOIN genres g ON g.id = s.genre_id
                 LEFT JOIN preferences p ON p.song_id = s.id AND p.emotion = $2 AND p.user_id = $1
                 WHERE s.emotion = $2
                 ORDER BY COALESCE(p.score, 0) + ${TASTE_BONUS} + ${LIKE_BONUS} DESC`,
                [userId, emotion]
            );
            candidates = fallback.rows;
        }
        return candidates;
    } catch (err) {
        throw (err)
    }

}

// aiEmotion: cam xuc AI doan khi nguoi dung da sua / xac nhan lai (C15), NULL = khong sua. Tra ve id dong vua ghi
// (lan quet camera nho id nay -> nguoi dung sua cam xuc thi thay dong nay bang dong moi)
let logSuggestion = async (userId, emotion, confidence, songId, aiEmotion = null) => {
    const result = await db.query(
        `INSERT INTO mood_history (user_id, emotion, confidence, song_id, action, ai_emotion)
         VALUES ($1, $2, $3, $4, 'suggested', $5)
         RETURNING id`,
        [userId, emotion, confidence || null, songId, aiEmotion]
    );
    return result.rows[0].id;
}

// nguoi dung sua cam xuc sau khi AI da chon bai -> bo dong goi y cu (cam xuc sai) de xu huong / thong ke khong dem 2 lan
// tra ve dong vua xoa (null = khong co) -> tao bai moi loi thi restoreSuggestion tra lai dung dong cu
let deleteSuggestion = async (userId, historyId) => {
    const result = await db.query(
        `DELETE FROM mood_history WHERE id = $1 AND user_id = $2 AND action = 'suggested'
         RETURNING id, user_id, emotion, confidence, ai_emotion, song_id, action, created_at`,
        [historyId, userId]
    );
    return result.rows[0] || null;
}

// ghi lai dong da xoa (giu nguyen id + thoi diem) khi sua cam xuc that bai -> lich su khong bi mat
let restoreSuggestion = async (row) => {
    await db.query(
        `INSERT INTO mood_history (id, user_id, emotion, confidence, ai_emotion, song_id, action, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.user_id, row.emotion, row.confidence, row.ai_emotion, row.song_id, row.action, row.created_at]
    );
}

module.exports = {
    getMoodTrend: getMoodTrend,
    getSongsByEmotion: getSongsByEmotion,
    logSuggestion: logSuggestion,
    deleteSuggestion: deleteSuggestion,
    restoreSuggestion: restoreSuggestion
}

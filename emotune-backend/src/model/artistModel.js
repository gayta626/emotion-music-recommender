const db = require("../config/db")

let getArtistsData = async () => {
    try {
        const result = await db.query(
            `SELECT id, name, COALESCE(photo, avatar) AS avatar FROM artists ORDER BY id`
        );
        return result.rows;
    } catch (err) {
        throw (err)
    }
}

// Số lần NGƯỜI NÀY nghe từng bài của 1 ca sĩ (bảng recently_played: mỗi lần nghe xong 1 dòng)
// total = từ trước tới nay, month = từ đầu tháng này
let getPlayCounts = async (userId, artistId) => {
    const result = await db.query(
        `SELECT rp.song_id,
                COUNT(*)::int AS total,
                (COUNT(*) FILTER (WHERE rp.played_at >= date_trunc('month', NOW())))::int AS month
         FROM recently_played rp
         JOIN songs s ON s.id = rp.song_id
         WHERE rp.user_id = $1 AND s.artist_id = $2
         GROUP BY rp.song_id`,
        [userId, artistId]
    );
    return result.rows;
}

// Người này nghe nhạc của ca sĩ khi đang cảm xúc gì: mood_history với action good/neutral/bad
// (= lần nghe có kết quả) → emotion là cảm xúc lúc quét, không phải cảm xúc của bài
let getMoodCounts = async (userId, artistId) => {
    const result = await db.query(
        `SELECT mh.emotion, COUNT(*)::int AS count
         FROM mood_history mh
         JOIN songs s ON s.id = mh.song_id
         WHERE mh.user_id = $1 AND s.artist_id = $2 AND mh.action IN ('good', 'neutral', 'bad')
         GROUP BY mh.emotion
         ORDER BY count DESC`,
        [userId, artistId]
    );
    return result.rows;
}

let artistExists = async (artistId) => {
    const result = await db.query(`SELECT 1 FROM artists WHERE id = $1`, [artistId]);
    return result.rowCount > 0;
}

module.exports = {
    getArtistsData: getArtistsData,
    getPlayCounts: getPlayCounts,
    getMoodCounts: getMoodCounts,
    artistExists: artistExists,
}

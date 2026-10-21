
const db = require("../config/db")

let getMoodHistoryData = async (userId) => {
    try {
        const result = await db.query(
            `SELECT DATE(created_at) AS day, emotion, COUNT(*) AS count
       FROM mood_history
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '7 days'
         AND action = 'suggested'
       GROUP BY DATE(created_at), emotion
       ORDER BY day ASC`,
            [userId]

        );
        return result.rows;
    } catch (err) {
        throw (err)

    }

}


// N lan quet / chon cam xuc gan nhat (moi nhat truoc) -> vong sang "How do you feel right now?" tren trang chu
let getRecentScans = async (userId, limit) => {
    const result = await db.query(
        `SELECT emotion, created_at
         FROM mood_history
         WHERE user_id = $1 AND action = 'suggested'
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
}

module.exports = {
    getMoodHistoryData: getMoodHistoryData,
    getRecentScans: getRecentScans,
}



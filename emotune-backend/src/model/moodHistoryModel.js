
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


module.exports = {
    getMoodHistoryData: getMoodHistoryData,
}



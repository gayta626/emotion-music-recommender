const db = require("../config/db")

let updateFeedBack = async (userId, emotion, songId, delta, historyAction) => {

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // cap nhat feedback dua tren accept va decline
        await client.query(
            `INSERT INTO preferences (user_id, emotion , song_id , score)
            VALUES($1 , $2 , $3 , $4)
            ON CONFLICT (user_id, emotion , song_id)
            DO UPDATE SET score = preferences.score + $4 , updated_at =NOW()
            `,
            [userId, emotion, songId, delta]
        );

        // cap nhat mood history
        await client.query(
            `
            INSERT INTO mood_history (user_id, emotion , song_id ,action)
            VALUES($1 ,$2 , $3 , $4)
            `,
            [userId, emotion, songId, historyAction]
        )


        await client.query('COMMIT');
        return { status: "ok", delta }
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Loi API feedback", err)
        throw (err)
    } finally {
        client.release();
    }
}

module.exports = {
    updateFeedBack: updateFeedBack
}
const db = require("../config/db")

let updateFeedBack = async (emotion, songId, delta, historyAction) => {

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // cap nhat feedback dua tren accept va decline
        await client.query(
            `INSERT INTO preferences (emotion , song_id , score)
            VALUES($1 , $2 , $3)
            ON CONFLICT (emotion , song_id)
            DO UPDATE SET score = preferences.score + $3 , updated_at =NOW()
            `,
            [emotion, songId, delta]
        );

        // cap nhat mood history
        await client.query(
            `
            INSERT INTO mood_history (emotion , song_id ,action)
            VALUES($1 ,$2 , $3)
            `,
            [emotion, songId, historyAction]
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
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
        //cap nhat them dong vao bang recently_played
        if (historyAction === "accepted" || historyAction === "auto_played") {
            await client.query(
                `
            INSERT INTO recently_played(song_id) VALUES($1)
            `,
                [songId]
            )
        }

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
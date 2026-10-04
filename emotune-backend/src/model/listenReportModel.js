const db = require("../config/db")

let feedBackSongListened = async (userId, emotion, songId, delta, action) => {
    const client = await db.pool.connect();
    try {

        await client.query('BEGIN')

        await client.query(
            `
            INSERT INTO preferences (user_id, emotion ,song_id, score)
            VALUES ($1 , $2 , $3 , $4)
            ON CONFLICT (user_id, emotion , song_id)
            DO UPDATE SET score = preferences.score + $4 , updated_at =NOW()
            `
            ,
            [userId, emotion, songId, delta]
        )

        // cap nhat mood history
        await client.query(
            `
            INSERT INTO mood_history(user_id, emotion ,song_id , action)
            VALUES ($1 , $2 , $3 , $4)
            `,
            [userId, emotion, songId, action]
        )

        //cap nhat recently_played
        await client.query(
            `
            INSERT INTO recently_played(user_id, song_id) VALUES($1, $2)
            `,
            [userId, songId]
        )
        await client.query("COMMIT")
        return { status: "ok", delta }
    } catch (err) {
        await client.query("ROLLBACK")
        console.error("Loi API feedback", err)
        throw (err);
    } finally {
        client.release();
    }
}

module.exports = {
    feedBackSongListened: feedBackSongListened
}
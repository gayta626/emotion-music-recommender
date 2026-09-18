const db = require("../config/db")

let feedBackSongListened = async (emotion, songId, score, action) => {
    const client = await db.pool.connect();
    try {
        await client.query(
            `
            INSERT INTO preferences (emotion ,song_id, score)
            VALUES ($1 , $2 , $3)
            ON CONFLICT (emotion , song_id)
            DO UPDATE SET score = preferences.score + $3 , updated_at =NOW()
            `
            [emotion, songId, score]
        )

        // cap nhat mood history
        await client.query(
            `
            INSERT INTO mood_history(emotion ,song_id , action)
            VALUE ($1 , $2 , $3)
            `,
            [emotion, songId, action]
        )

        //cap nhat recently_played
        await client.query(
            `
            INSERT INTO recently_played(song_id) VALUES($1)
            `,
            [songId]
        )
        await client.query("COMMIT")
        return { status: "ok", score }
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
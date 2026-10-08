const db = require("../config/db")

let getRequestSong = async (songName) => {
    try {
        const result = await db.query(
            `
        SELECT s.id , s.title , a.name AS artist , COALESCE(a.photo, a.avatar) AS artist_avatar , s.file_path, s.cover, s.emotion , s.energy
        FROM songs s
        LEFT JOIN artists a ON a.id = s.artist_id
        WHERE s.title ILIKE '%' || $1 || '%' 
        LIMIT 1
        `,
            [songName]
        )

        return result.rows[0];
    } catch (err) {
        throw (err);
    }
}

module.exports = {
    getRequestSong: getRequestSong,

}
const db = require("../config/db")

let getRequestSong = async (songName) => {
    try {
        const result = await db.query(
            `
        SELECT s.id , s.title ,s.artist , s.file_path, s.emotion , s.energy
        FROM songs s
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
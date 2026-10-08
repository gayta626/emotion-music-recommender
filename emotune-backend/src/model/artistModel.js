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

module.exports = {
    getArtistsData: getArtistsData,
}

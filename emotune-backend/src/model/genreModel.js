const db = require("../config/db")

const getGenresData = async () => {
    const result = await db.query(`SELECT id, name FROM genres ORDER BY id`);
    return result.rows;
}

module.exports = { getGenresData }

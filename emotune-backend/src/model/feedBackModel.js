const db = require("../config/db")

let updateFeedBack = async (songId, emotion, action) => {
    const delta = action === "accept" ? 1 : -1;

    const client = await db.pool.connect();
}

module.exports = {
    updateFeedBack: updateFeedBack
}
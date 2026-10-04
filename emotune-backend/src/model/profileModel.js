const db = require("../config/db");

let getProfilesData = async () => {
    try{
        const profile = await db.query(
            `SELECT id FROM profiles ORDER BY id`
        );
        const aritst = await db.query(
            ``
        );
        return profile.rows;
    }catch(err){

    }
}

module.exports = {
    getProfilesData: getProfilesData,
}
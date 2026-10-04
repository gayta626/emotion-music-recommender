const db = require('../config/db');

// Dang ky: luu nguoi moi. passwordHash la mat khau DA BAM (bcrypt), khong phai mat khau goc.
// Trung username -> Postgres nem loi err.code = "23505" -> de loi bay len service tu xu ly (tra 409)
const createUser = async (username, passwordHash) => {
    const result = await db.query(
        `INSERT INTO users (username, password_hash)
         VALUES ($1, $2)
         RETURNING id, username, survey_done_at`,
        [username, passwordHash]
    );
    return result.rows[0];
}

// Dang nhap: tim nguoi theo ten vua go, lay ca password_hash de so mat khau.
// Khong co nguoi nay -> tra undefined
const findUserByUsername = async (username) => {
    const result = await db.query(
        `SELECT id, username, password_hash, survey_done_at
         FROM users
         WHERE username = $1`,
        [username]
    );
    return result.rows[0];
}

module.exports = {
    createUser, findUserByUsername
}

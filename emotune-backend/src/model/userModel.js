const db = require('../config/db');

const createUser = async (username, passwordHash) => {
    const result = await db.query(
        `INSERT INTO users (username, password_hash)
         VALUES ($1, $2)
         RETURNING id, username, survey_done_at`,
        [username, passwordHash]
    );
    return result.rows[0];
}


const findUserByUsername = async (username) => {
    const result = await db.query(
        `SELECT id, username, password_hash, survey_done_at
         FROM users
         WHERE username = $1`,
        [username]
    );
    return result.rows[0];
}

const findUserById = async (userId) => {
    const result = await db.query(
        `
        SELECT id ,username , survey_done_at 
        FROM users
        WHERE id = $1
        `,
        [userId]
    )
    return result.rows[0];
}

module.exports = {
    createUser, findUserByUsername, findUserById
}

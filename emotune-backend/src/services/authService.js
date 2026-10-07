const { validateCredentials, normalizeUsername } = require('./authValidation');
const { createUser, findUserByUsername } = require('../model/userModel');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


const signToken = (userId) => {
    return jwt.sign(
        { userId: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
}

const toPublicUser = (row) => {
    return { id: row.id, username: row.username, surveyDone: row.survey_done_at ? true : false }
}

const register = async (rawUsername, password) => {
    const validData = validateCredentials(rawUsername, password);
    if (!validData.ok) {
        const err = new Error(validData.message)
        err.status = 400;
        throw err;
    }
    const passwordHash = await bcrypt.hash(password, 10)

    let row;
    try {
        row = await createUser(validData.username, passwordHash)
    } catch (err) {
        if (err.code === "23505") {
            const err = new Error("Username is already taken")
            err.status = 409;
            throw err;
        }
        throw err;
    }
    return { token: signToken(row.id), user: toPublicUser(row) }
}

const login = async (rawUsername, password) => {
    const checkUsername = normalizeUsername(rawUsername)
    const row = await findUserByUsername(checkUsername);
    if (!row || typeof (password) !== 'string') {
        const err = new Error("Wrong username or password")
        err.status = 401;
        throw err;
    }
    const checkPassword = await bcrypt.compare(password, row.password_hash)
    if (!checkPassword) {
        const err = new Error("Wrong username or password")
        err.status = 401;
        throw err;
    }
    return {
        token: signToken(row.id),
        user: toPublicUser(row)
    }
}

module.exports = {
    register: register,
    login: login,
    toPublicUser: toPublicUser
}
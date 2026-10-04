const userModel = require('../model/userModel')
const authService = require('../services/authService');

const register = async (req, res) => {
    const { username, password } = req.body || {};
    try {
        const result = await authService.register(username, password);
        return res.status(201).json(result)
    } catch (err) {
        if (!err.status) console.error("Loi dang ky:", err);
        return res.status(err.status || 500).json({ error: err.status ? err.message : "Lỗi server" });
    }
}

const login = async (req, res) => {
    const { username, password } = req.body || {};
    try {
        const result = await authService.login(username, password)
        return res.status(200).json(result)
    } catch (err) {
        if (!err.status) console.error("Loi dang nhap:", err);
        return res.status(err.status || 500).json({ error: err.status ? err.message : "Lỗi server" });
    }
}


// GET /auth/me: "token nay la cua ai?" - requireAuth da gan req.userId tu token
const getUserByJWT = async (req, res) => {
    try {
        const row = await userModel.findUserById(req.userId);
        // token con han nhung tai khoan da bi xoa -> coi nhu chua dang nhap
        if (!row) {
            return res.status(401).json({ error: "unauthorized" })
        }
        return res.status(200).json(authService.toPublicUser(row));
    } catch (err) {
        console.error("Loi lay thong tin nguoi dung:", err);
        return res.status(500).json({ error: "Lỗi server" });
    }
}

module.exports = {
    register, login, getUserByJWT
}
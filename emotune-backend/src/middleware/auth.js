const jwt = require("jsonwebtoken");
const { findUserById } = require("../model/userModel");


// Token hop le CHUA DU: con hoi DB tai khoan con khong + co bi admin khoa khong
// -> admin xoa / khoa la co hieu luc ngay, khong phai doi token het han (7 ngay)
const requireAuth = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
        return res.status(401).json({ error: "unauthorized" });
    }

    const [type, token] = header.split(' ');
    if (type !== "Bearer" || !token) {
        return res.status(401).json({ error: "unauthorized" })
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
        return res.status(401).json({ error: "unauthorized" })
    }

    try {
        const user = await findUserById(payload.userId);
        if (!user) {
            return res.status(401).json({ error: "unauthorized" })
        }
        // 401 (khong phai 403): web tu xoa token + ve trang dang nhap, trang dang nhap bao "bi khoa"
        if (user.locked_at) {
            return res.status(401).json({ error: "locked" })
        }
        req.userId = user.id;
        req.user = user;
        next();
    } catch (err) {
        console.error("Loi kiem tra dang nhap:", err);
        return res.status(500).json({ error: "Server error" })
    }
}

// Dat SAU requireAuth: chi tai khoan role = 'admin' moi qua (requireAuth vua doc role tu DB -> go quyen la co hieu luc ngay)
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "forbidden" })
    }
    next();
}

module.exports = {
    requireAuth, requireAdmin
}

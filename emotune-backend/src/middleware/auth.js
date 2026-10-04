const jwt = require("jsonwebtoken");


const requireAuth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
        return res.status(401).json({ error: "unauthorized" });
    }

    const [type, token] = header.split(' ');
    if (type !== "Bearer" || !token) {
        return res.status(401).json({ error: "unauthorized" })
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        req.userId = payload.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: "unauthorized" })
    }
}

module.exports = {
    requireAuth
}
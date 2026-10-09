const statsService = require("../services/statsService")

// GET /stats?days=7|30 - so lieu cua CHINH nguoi dang dang nhap (userId lay tu token)
let getStats = async (req, res) => {
    try {
        const data = await statsService.getStats(req.userId, req.query.days)
        return res.status(200).json(data)
    } catch (err) {
        console.log("Loi goi API stats :" + err)
        return res.status(500).json({ err: "Loi server khi lay thong ke" })
    }
}

module.exports = {
    getStats: getStats,
}

const insightService = require("../services/insightService")

// GET /insights - nhan xet cua NYX (chuong thong bao) cho CHINH nguoi dang dang nhap (userId lay tu token)
let getInsights = async (req, res) => {
    try {
        return res.status(200).json(await insightService.getInsights(req.userId))
    } catch (err) {
        console.error("Loi API insights:", err)
        return res.status(500).json({ error: "Server error" })
    }
}

module.exports = { getInsights }

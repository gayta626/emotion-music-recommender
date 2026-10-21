const moodHistoryService = require("../services/moodHistoryService")


let getMoodHistory = async (req, res) => {
    try {
        const data = await moodHistoryService.getMoodHistoryTrend(req.userId)
        return res.status(200).json(data)
    } catch (err) {
        console.log("Loi goi API moodHistory :" + err)
        return res.status(500).json({ err: "Loi server khi lay lich su camr xuc" })
    }
}

// GET /mood-history/recent -> [{ emotion, created_at }] moi nhat truoc
let getRecentScans = async (req, res) => {
    try {
        return res.status(200).json(await moodHistoryService.getRecentScans(req.userId))
    } catch (err) {
        console.log("Loi goi API moodHistory/recent :" + err)
        return res.status(500).json({ err: "Loi server khi lay cac lan quet gan day" })
    }
}

module.exports = {
    getMoodHistory: getMoodHistory,
    getRecentScans: getRecentScans,
}
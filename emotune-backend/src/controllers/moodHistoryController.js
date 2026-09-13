const moodHistoryService = require("../services/moodHistoryService")


let getMoodHistory = async (req, res) => {
    try {
        const data = await moodHistoryService.getMoodHistoryTrend()
        return res.status(200).json(data)
    } catch (err) {
        console.log("Loi goi API moodHistory :" + err)
        return res.status(500).json({ err: "Loi server khi lay lich su camr xuc" })
    }
}

module.exports = {
    getMoodHistory: getMoodHistory,
}
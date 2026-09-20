const listenReportService = require("../services/listenReportService")

let submitListenReport = async (req, res) => {
    const { emotion, songId, finishPercent, action } = req.body;
    if (finishPercent < 0 || finishPercent > 1) {
        return res.status(400).json({ error: "tien do nghe phai nam trong khoang tu 0 -> 1.00" })
    }
    try {
        const result = await listenReportService.processListenReport(emotion, songId, finishPercent, action);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ error: "loi server" })
    }
}

module.exports = {
    submitListenReport: submitListenReport
}
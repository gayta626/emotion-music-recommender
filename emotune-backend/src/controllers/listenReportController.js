const listenReportService = require("../services/listenReportService")

let submitListenReport = async (req, res) => {
    const { emotion, songId, finishPercent } = req.body || {};
    const invalid = listenReportService.checkListenReport({ emotion, songId, finishPercent });
    if (invalid) {
        return res.status(400).json({ error: invalid })
    }
    try {
        const result = await listenReportService.processListenReport(req.userId, emotion, songId, finishPercent);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ error: "loi server" })
    }
}

module.exports = {
    submitListenReport: submitListenReport
}
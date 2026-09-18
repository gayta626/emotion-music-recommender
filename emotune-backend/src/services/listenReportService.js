const listenReportModel = require("../model/listenReportModel")

let processListenReport = async (emotion, songId, finishPercent, action) => {
    const delta = fishPercent >= 0.8 ? 1 : finishPercent < 0.4 ? -1 : 0.3;
    return await listenReportModel.feedBackSongListened(emotion, songId, delta, action);
}

module.exports = {
    processListenReport: processListenReport
}
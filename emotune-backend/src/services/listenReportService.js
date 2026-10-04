const listenReportModel = require("../model/listenReportModel")

let processListenReport = async (userId, emotion, songId, finishPercent) => {
    let delta, action;
    if (finishPercent >= 0.8) {
        delta = 1; action = "good";
    } else if (finishPercent < 0.4) {
        delta = -1; action = "bad";
    } else {
        delta = 0.3; action = "neutral";
    }
    return await listenReportModel.feedBackSongListened(userId, emotion, songId, delta, action);
}

module.exports = {
    processListenReport: processListenReport
}
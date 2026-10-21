const moodHistoryModel = require("../model/moodHistoryModel")

let getMoodHistoryTrend = (userId) => {
    return moodHistoryModel.getMoodHistoryData(userId);
}


const RECENT_SCANS = 24;   // vong tren trang chu: toi da 24 cung (nhieu hon thi cung qua manh)

let getRecentScans = (userId) => moodHistoryModel.getRecentScans(userId, RECENT_SCANS);

module.exports = {
    getMoodHistoryTrend: getMoodHistoryTrend,
    getRecentScans: getRecentScans,
}
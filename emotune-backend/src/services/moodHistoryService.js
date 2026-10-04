const moodHistoryModel = require("../model/moodHistoryModel")

let getMoodHistoryTrend = (userId) => {
    return moodHistoryModel.getMoodHistoryData(userId);
}


module.exports = {
    getMoodHistoryTrend: getMoodHistoryTrend,
}
const moodHistoryModel = require("../model/moodHistoryModel")

let getMoodHistoryTrend = () => {
    return moodHistoryModel.getMoodHistoryData();
}


module.exports = {
    getMoodHistoryTrend: getMoodHistoryTrend,
}
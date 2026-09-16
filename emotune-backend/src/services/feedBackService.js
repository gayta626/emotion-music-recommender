const feedBackModel = require('../model/feedBackModel')

let processFeedBack = async (emotion, songId, action) => {
    const delta = action === "accepted" ? 1 : action === "auto_played" ? 0.5 : -1;
    const historyAction = action === "accepted" ? "accepted" : action === "auto_played" ? "auto_played" : "declined";
    return await feedBackModel.updateFeedBack(emotion, songId, delta, historyAction);
}


module.exports = {
    processFeedBack: processFeedBack,
}
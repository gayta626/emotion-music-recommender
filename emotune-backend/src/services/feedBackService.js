const feedBackModel = require('../model/feedBackModel')

let processFeedBack = async (emotion, songId, action) => {
    const delta = action === "accepted" ? 1 : -1;
    const historyAction = action === "accepted" ? "accepted" : "declined";
    return await feedBackModel.updateFeedBack(emotion, songId, delta, historyAction);
}


module.exports = {
    processFeedBack: processFeedBack,
}
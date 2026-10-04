const feedBackModel = require('../model/feedBackModel')

let processFeedBack = async (userId, emotion, songId, action) => {
    const delta = -1;
    const historyAction = "declined";
    return await feedBackModel.updateFeedBack(userId, emotion, songId, delta, historyAction);
}


module.exports = {
    processFeedBack: processFeedBack,
}
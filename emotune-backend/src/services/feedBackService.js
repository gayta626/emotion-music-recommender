const feedBackModel = require('../model/feedBackModel')

let processFeedBack = async (emotion, songId, action) => {
    const delta = -1;
    const historyAction = "declined";
    return await feedBackModel.updateFeedBack(emotion, songId, delta, historyAction);
}


module.exports = {
    processFeedBack: processFeedBack,
}
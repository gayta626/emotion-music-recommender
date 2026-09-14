const feedBackService = require('../services/feedBackService');


let submitFeedBack = async (req, res) => {
    const { emotion, songId, action } = req.body;

    if (action !== "accepted" && action !== "declined") {
        return res.status(400).json({ error: "action phải là 'accept' hoặc 'decline'" })
    }
    try {
        const result = await feedBackService.processFeedBack(emotion, songId, action);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ error: "Loi server" })
    }

}

module.exports = {
    submitFeedBack: submitFeedBack,
}
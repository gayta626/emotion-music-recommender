const express = require("express");
const moodHistoryController = require("../controllers/moodHistoryController")
const feedBackController = require("../controllers/feedBackController")
const suggestController = require("../controllers/suggestController")

let router = express.Router()

let initWebRoutes = (app) => {
    router.get('/', (req, res) => {
        return res.send("Hello world with vinh1310 va vanquynh2603")
    });

    router.get('/mood-history', moodHistoryController.getMoodHistory);

    router.post('/feed-back', feedBackController.submitFeedBack);
    router.post('/suggest', suggestController.getSuggest)
    return app.use("/", router);
}


module.exports = initWebRoutes;
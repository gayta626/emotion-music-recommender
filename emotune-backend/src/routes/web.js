const express = require("express");
const moodHistoryController = require("../controllers/moodHistoryController")
const feedBackControlller = require("../controllers/feedBackController")

let router = express.Router()

let initWebRoutes = (app) => {
    router.get('/', (req, res) => {
        return res.send("Hello world with vinh1310 va vanquynh2603")
    });

    router.get('/mood-history', moodHistoryController.getMoodHistory);

    router.post('/feed-back', feedBackControlller.submitFeedBack)
    return app.use("/", router);
}


module.exports = initWebRoutes;
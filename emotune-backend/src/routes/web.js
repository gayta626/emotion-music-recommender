const express = require("express");
const moodHistoryController = require("../controllers/moodHistoryController")

let router = express.Router()

let initWebRoutes = (app) => {
    router.get('/', (req, res) => {
        return res.send("Hello world with vinh1310 va vanquynh2603")
    });

    router.get('/mood-history', moodHistoryController.getMoodHistory);

    return app.use("/", router);
}


module.exports = initWebRoutes;
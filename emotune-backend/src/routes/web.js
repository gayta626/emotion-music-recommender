const express = require("express");
const moodHistoryController = require("../controllers/moodHistoryController")
const feedBackController = require("../controllers/feedBackController")
const suggestController = require("../controllers/suggestController")
const listenReportController = require("../controllers/listenReportController")
const requestSongController = require("../controllers/requestSongController")
const artistController = require("../controllers/artistController")
const scanController = require("../controllers/scanController")
const authController = require('../controllers/authController')
const { requireAuth } = require('../middleware/auth')

let router = express.Router()

let initWebRoutes = (app) => {
    router.get('/', (req, res) => {
        return res.send("Hello world with vinh1310 va vanquynh2603")
    });

    router.get('/artists', artistController.getArtists);
    router.get('/mood-history', moodHistoryController.getMoodHistory);

    router.post('/feed-back', feedBackController.submitFeedBack);
    router.post('/suggest', suggestController.getSuggest)
    router.post('/listen-report', listenReportController.submitListenReport)
    router.post('/request-song', requestSongController.postRequestSong)
    router.post('/scan-and-suggest', scanController.scanAndSuggest)
    router.post('/auth/register', authController.register)
    router.post('/auth/login', authController.login)
    router.get('/auth/me', requireAuth, authController.getUserByJWT)
    return app.use("/", router);
}


module.exports = initWebRoutes;
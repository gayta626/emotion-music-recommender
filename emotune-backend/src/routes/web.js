const express = require("express");
const moodHistoryController = require("../controllers/moodHistoryController")
const feedBackController = require("../controllers/feedBackController")
const suggestController = require("../controllers/suggestController")
const listenReportController = require("../controllers/listenReportController")
const requestSongController = require("../controllers/requestSongController")
const artistController = require("../controllers/artistController")
const scanController = require("../controllers/scanController")
const authController = require('../controllers/authController')
const genreController = require('../controllers/genreController')
const profileController = require('../controllers/profileController')
const playlistController = require('../controllers/playlistController')
const songController = require('../controllers/songController')
const { requireAuth } = require('../middleware/auth')

let router = express.Router()

let initWebRoutes = (app) => {
    router.get('/', (req, res) => {
        return res.send("Hello world with vinh1310 va vanquynh2603")
    });

    router.get('/artists', artistController.getArtists);
    router.get('/artists/:id/stats', requireAuth, artistController.getArtistStats);
    router.get('/genres', genreController.getGenres);
    router.get('/profile', requireAuth, profileController.getProfile);
    router.post('/profile', requireAuth, profileController.saveProfile);
    router.get('/songs/for-you', requireAuth, songController.getForYou);
    router.get('/songs', songController.getSongs);
    router.get('/playlists', requireAuth, playlistController.getPlaylists);
    router.post('/playlists', requireAuth, playlistController.createPlaylist);
    router.get('/playlists/:id', requireAuth, playlistController.getPlaylist);
    router.patch('/playlists/:id', requireAuth, playlistController.renamePlaylist);
    router.delete('/playlists/:id', requireAuth, playlistController.deletePlaylist);
    router.post('/playlists/:id/songs', requireAuth, playlistController.addSong);
    router.delete('/playlists/:id/songs/:songId', requireAuth, playlistController.removeSong);
    router.get('/mood-history', requireAuth, moodHistoryController.getMoodHistory);

    router.post('/feed-back', requireAuth, feedBackController.submitFeedBack);
    router.post('/suggest', requireAuth, suggestController.getSuggest)
    router.post('/listen-report', requireAuth, listenReportController.submitListenReport)
    router.post('/request-song', requireAuth, requestSongController.postRequestSong)
    router.post('/scan-and-suggest', requireAuth, scanController.scanAndSuggest)
    router.post('/auth/register', authController.register)
    router.post('/auth/login', authController.login)
    router.get('/auth/me', requireAuth, authController.getUserByJWT)
    return app.use("/", router);
}


module.exports = initWebRoutes;
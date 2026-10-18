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
const assistantController = require('../controllers/assistantController')
const statsController = require('../controllers/statsController')
const likeController = require('../controllers/likeController')
const insightController = require('../controllers/insightController')
const adminController = require('../controllers/adminController')
const adminUserController = require('../controllers/adminUserController')
const adminLibraryController = require('../controllers/adminLibraryController')
const { requireAuth, requireAdmin } = require('../middleware/auth')

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
    router.put('/profile/faces', requireAuth, profileController.setFaceConsent);
    router.get('/songs/for-you', requireAuth, songController.getForYou);
    router.get('/songs', songController.getSongs);
    router.get('/playlists', requireAuth, playlistController.getPlaylists);
    router.post('/playlists', requireAuth, playlistController.createPlaylist);
    router.get('/playlists/:id', requireAuth, playlistController.getPlaylist);
    router.patch('/playlists/:id', requireAuth, playlistController.renamePlaylist);
    router.delete('/playlists/:id', requireAuth, playlistController.deletePlaylist);
    router.post('/playlists/:id/songs', requireAuth, playlistController.addSong);
    router.delete('/playlists/:id/songs/:songId', requireAuth, playlistController.removeSong);
    router.get('/likes', requireAuth, likeController.getLikedSongs);
    router.post('/likes/:songId', requireAuth, likeController.likeSong);
    router.delete('/likes/:songId', requireAuth, likeController.unlikeSong);
    router.get('/mood-history', requireAuth, moodHistoryController.getMoodHistory);
    router.get('/stats', requireAuth, statsController.getStats);
    router.get('/insights', requireAuth, insightController.getInsights);
    router.get('/admin/health', requireAuth, requireAdmin, adminController.getHealth);
    router.get('/admin/users', requireAuth, requireAdmin, adminUserController.listUsers);
    router.get('/admin/users/:id', requireAuth, requireAdmin, adminUserController.getUser);
    router.patch('/admin/users/:id', requireAuth, requireAdmin, adminUserController.updateUser);
    router.post('/admin/users/:id/reset-password', requireAuth, requireAdmin, adminUserController.resetPassword);
    router.delete('/admin/users/:id', requireAuth, requireAdmin, adminUserController.deleteUser);
    router.get('/admin/library', requireAuth, requireAdmin, adminLibraryController.getLibrary);
    router.get('/admin/library/enrich', requireAuth, requireAdmin, adminLibraryController.getEnrich);
    router.post('/admin/songs/analyze', requireAuth, requireAdmin, adminLibraryController.songUpload, adminLibraryController.analyzeSong);
    router.post('/admin/songs', requireAuth, requireAdmin, adminLibraryController.songUpload, adminLibraryController.createSong);
    router.patch('/admin/songs/:id', requireAuth, requireAdmin, adminLibraryController.songUpload, adminLibraryController.updateSong);
    router.delete('/admin/songs/:id', requireAuth, requireAdmin, adminLibraryController.deleteSong);
    router.post('/admin/artists', requireAuth, requireAdmin, adminLibraryController.artistUpload, adminLibraryController.createArtist);
    router.patch('/admin/artists/:id', requireAuth, requireAdmin, adminLibraryController.artistUpload, adminLibraryController.updateArtist);
    router.delete('/admin/artists/:id', requireAuth, requireAdmin, adminLibraryController.deleteArtist);

    router.post('/feed-back', requireAuth, feedBackController.submitFeedBack);
    router.post('/suggest', requireAuth, suggestController.getSuggest)
    router.post('/listen-report', requireAuth, listenReportController.submitListenReport)
    router.post('/request-song', requireAuth, requestSongController.postRequestSong)
    router.post('/scan-and-suggest', requireAuth, scanController.scanAndSuggest)
    router.post('/scan-feedback', requireAuth, scanController.fixMood)
    router.post('/assistant', requireAuth, assistantController.ask)
    router.post('/voice-mood', requireAuth, assistantController.voiceMood)
    router.post('/auth/register', authController.register)
    router.post('/auth/login', authController.login)
    router.get('/auth/me', requireAuth, authController.getUserByJWT)
    return app.use("/", router);
}


module.exports = initWebRoutes;
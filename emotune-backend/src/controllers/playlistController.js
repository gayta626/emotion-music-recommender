const playlistService = require("../services/playlistService")

// userId lấy từ token (requireAuth gán req.userId), không nhận từ client
const handle = (action, okStatus = 200) => async (req, res) => {
    try {
        const result = await action(req);
        return res.status(typeof okStatus === "function" ? okStatus(result) : okStatus).json(result);
    } catch (err) {
        if (!err.status) console.error("Loi API playlist:", err);
        return res.status(err.status || 500).json({ error: err.status ? err.message : "Server error" });
    }
}

const getPlaylists = handle((req) => playlistService.getPlaylists(req.userId));

const getPlaylist = handle((req) => playlistService.getPlaylist(req.userId, req.params.id));

// 201 khi thêm mới, 200 khi bài đã có sẵn trong playlist
const addSong = handle(
    (req) => playlistService.addSong(req.userId, req.params.id, req.body?.songId),
    (result) => (result.added ? 201 : 200)
);

const removeSong = handle((req) => playlistService.removeSong(req.userId, req.params.id, req.params.songId));

module.exports = { getPlaylists, getPlaylist, addSong, removeSong }

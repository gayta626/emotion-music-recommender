const likeService = require("../services/likeService")

// userId lấy từ token (requireAuth gán req.userId), không nhận từ client
const handle = (action, okStatus = 200) => async (req, res) => {
    try {
        const result = await action(req);
        return res.status(typeof okStatus === "function" ? okStatus(result) : okStatus).json(result);
    } catch (err) {
        if (!err.status) console.error("Loi API likes:", err);
        return res.status(err.status || 500).json({ error: err.status ? err.message : "Server error" });
    }
}

const getLikedSongs = handle((req) => likeService.getLikedSongs(req.userId));

// 201 khi vừa thích, 200 khi đã thích từ trước
const likeSong = handle(
    (req) => likeService.likeSong(req.userId, req.params.songId),
    (result) => (result.added ? 201 : 200)
);

const unlikeSong = handle((req) => likeService.unlikeSong(req.userId, req.params.songId));

module.exports = { getLikedSongs, likeSong, unlikeSong }

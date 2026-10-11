const likeModel = require("../model/likeModel")

const fail = (status, message) => {
    const err = new Error(message);
    err.status = status;
    return err;
}

// id tren URL luon la chuoi -> phai la so nguyen duong
const toSongId = (value) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) throw fail(400, "Invalid song id");
    return n;
}

const getLikedSongs = (userId) => likeModel.getLikedSongs(userId);

const likeSong = async (userId, rawSongId) => {
    const songId = toSongId(rawSongId);
    try {
        const added = await likeModel.likeSong(userId, songId);
        return { songId, liked: true, added };
    } catch (err) {
        // 23503 = vi pham khoa ngoai: bai khong ton tai
        if (err.code === "23503") throw fail(404, "Song not found");
        throw err;
    }
}

const unlikeSong = async (userId, rawSongId) => {
    const songId = toSongId(rawSongId);
    const removed = await likeModel.unlikeSong(userId, songId);
    return { songId, liked: false, removed };
}

module.exports = { getLikedSongs, likeSong, unlikeSong }

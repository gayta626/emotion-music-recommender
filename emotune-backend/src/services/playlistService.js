const playlistModel = require("../model/playlistModel")

const fail = (status, message) => {
    const err = new Error(message);
    err.status = status;
    return err;
}

// id trên URL luôn là chuỗi -> phải là số nguyên dương
const toId = (value, label) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) throw fail(400, `Invalid ${label}`);
    return n;
}

// Playlist không có / của người khác đều báo 404 (không tiết lộ playlist đó có tồn tại)
const requireOwnPlaylist = async (userId, rawPlaylistId) => {
    const playlistId = toId(rawPlaylistId, "playlist id");
    const info = await playlistModel.getPlaylistInfo(userId, playlistId);
    if (!info) throw fail(404, "Playlist not found");
    return info;
}

const getPlaylists = async (userId) => {
    await playlistModel.ensureDefaultPlaylist(userId);
    return playlistModel.getPlaylists(userId);
}

const getPlaylist = async (userId, rawPlaylistId) => {
    const info = await requireOwnPlaylist(userId, rawPlaylistId);
    const songs = await playlistModel.getPlaylistSongs(info.id);
    return { id: info.id, name: info.name, songs };
}

const addSong = async (userId, rawPlaylistId, rawSongId) => {
    const info = await requireOwnPlaylist(userId, rawPlaylistId);
    const songId = toId(rawSongId, "songId");
    try {
        const added = await playlistModel.addSong(info.id, songId);
        return { playlistId: info.id, songId, added };
    } catch (err) {
        if (err.code === "23503") throw fail(404, "Song not found"); // songId không có trong bảng songs
        throw err;
    }
}

const removeSong = async (userId, rawPlaylistId, rawSongId) => {
    const info = await requireOwnPlaylist(userId, rawPlaylistId);
    const songId = toId(rawSongId, "songId");
    const removed = await playlistModel.removeSong(info.id, songId);
    if (!removed) throw fail(404, "Song is not in this playlist");
    return { playlistId: info.id, songId, removed: true };
}

module.exports = { getPlaylists, getPlaylist, addSong, removeSong }

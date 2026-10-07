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

// Ten playlist: bo khoang trang thua, 1-50 ky tu
const cleanName = (raw) => {
    const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
    if (!name || name.length > 50) throw fail(400, "Playlist name must be 1-50 characters");
    return name;
}

const duplicateName = (err) => {
    if (err.code === "23505") return fail(409, "You already have a playlist with this name");
    return err;
}

// Khong gui ten -> tu dat "My Playlist #2", "#3"... (so dau tien chua dung)
const createPlaylist = async (userId, rawName) => {
    let name;
    if (rawName === undefined || rawName === null || rawName === "") {
        const taken = new Set((await playlistModel.getPlaylists(userId)).map((p) => p.name));
        let n = taken.size + 1;
        while (taken.has(`My Playlist #${n}`)) n++;
        name = `My Playlist #${n}`;
    } else {
        name = cleanName(rawName);
    }
    try {
        const created = await playlistModel.createPlaylist(userId, name);
        return { ...created, songCount: 0 };
    } catch (err) {
        throw duplicateName(err);
    }
}

const renamePlaylist = async (userId, rawPlaylistId, rawName) => {
    const info = await requireOwnPlaylist(userId, rawPlaylistId);
    const name = cleanName(rawName);
    try {
        return await playlistModel.renamePlaylist(userId, info.id, name);
    } catch (err) {
        throw duplicateName(err);
    }
}

const deletePlaylist = async (userId, rawPlaylistId) => {
    const info = await requireOwnPlaylist(userId, rawPlaylistId);
    await playlistModel.deletePlaylist(userId, info.id);
    return { id: info.id, deleted: true };
}

module.exports = { getPlaylists, getPlaylist, addSong, removeSong, createPlaylist, renamePlaylist, deletePlaylist }

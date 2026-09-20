const requestSongModel = require("../model/requestSongModel")
const feedbackModel = require("../model/feedBackModel")
const { getRequestSongMessage } = require("../messages")

let processRequestSong = async (emotion, songName) => {
    const song = await requestSongModel.getRequestSong(songName);

    if (!song) {
        return null;
    }

    await feedbackModel.updateFeedBack(emotion, song.id, 1, "good");

    const message = getRequestSongMessage(song.title);
    return { song, message, status: "ok" };
}

module.exports = {
    processRequestSong,
}
const requestSongModel = require("../model/requestSongModel")

let processRequestSong = (songName) => {
    return requestSongModel.getRequestSong(songName);
}

module.exports = {
    processRequestSong: processRequestSong
}
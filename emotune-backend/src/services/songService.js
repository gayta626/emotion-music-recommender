const songModel = require("../model/songModel")

let getSongs = () => {
    return songModel.getAllSongs();
}

module.exports = {
    getSongs: getSongs,
}

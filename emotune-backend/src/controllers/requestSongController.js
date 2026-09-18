const requestSongService = require("../services/requestSongService")

let postRequestSong = async () => {
    const { songName } = req.body;
    try {
        const result = await requestSongService.processRequestSong(songName)
        res.status(200).json(result)
    } catch (err) {
        console.error("Loi :" + err);
        res.status(500).json({ error: "Loi server" })
    }
}

module.exports = {
    postRequestSong: postRequestSong
}
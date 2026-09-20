const requestSongService = require("../services/requestSongService")

let postRequestSong = async (req, res) => {
    const { emotion, songName } = req.body;

    try {
        const result = await requestSongService.processRequestSong(emotion, songName);

        if (!result) {
            return res.status(404).json({ error: `Không tìm thấy bài hát nào khớp '${songName}'` });
        }

        return res.status(200).json(result);
    } catch (err) {
        console.error("Loi :" + err);
        return res.status(500).json({ error: "Loi server" });
    }
}

module.exports = {
    postRequestSong: postRequestSong,
}
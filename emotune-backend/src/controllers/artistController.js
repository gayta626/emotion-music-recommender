const artistService = require("../services/artistService")

let getArtists = async (req, res) => {
    try {
        const data = await artistService.getArtists()
        return res.status(200).json(data)
    } catch (err) {
        console.log("Loi goi API artists :" + err)
        return res.status(500).json({ err: "Loi server khi lay danh sach nghe si" })
    }
}

module.exports = {
    getArtists: getArtists,
}

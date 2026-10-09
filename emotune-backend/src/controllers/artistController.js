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

let getArtistStats = async (req, res) => {
    const artistId = Number(req.params.id)
    if (!Number.isInteger(artistId) || artistId <= 0) {
        return res.status(400).json({ err: "Invalid artist id" })
    }
    try {
        const data = await artistService.getArtistStats(req.userId, artistId)
        return res.status(200).json(data)
    } catch (err) {
        if (err.status) return res.status(err.status).json({ err: err.message })
        console.log("Loi goi API artist stats :" + err)
        return res.status(500).json({ err: "Loi server khi lay so lieu nghe si" })
    }
}

module.exports = {
    getArtists: getArtists,
    getArtistStats: getArtistStats,
}

const genreService = require("../services/genreService")

const getGenres = async (req, res) => {
    try {
        return res.status(200).json(await genreService.getGenres())
    } catch (err) {
        console.error("Loi goi API genres:", err);
        return res.status(500).json({ error: "Server error" })
    }
}

module.exports = { getGenres }

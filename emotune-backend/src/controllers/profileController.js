const profileService = require("../services/profileService")

// userId lấy từ token (requireAuth gán req.userId), không nhận từ client
const getProfile = async (req, res) => {
    try {
        return res.status(200).json(await profileService.getProfile(req.userId))
    } catch (err) {
        console.error("Loi lay profile:", err);
        return res.status(500).json({ error: "Server error" })
    }
}

const saveProfile = async (req, res) => {
    const { artistIds, genreIds } = req.body || {};
    try {
        const result = await profileService.saveProfile(req.userId, artistIds, genreIds)
        return res.status(200).json(result)
    } catch (err) {
        if (!err.status) console.error("Loi luu profile:", err);
        return res.status(err.status || 500).json({ error: err.status ? err.message : "Server error" })
    }
}

module.exports = { getProfile, saveProfile }

const profileModel = require("../model/profileModel")

const isIntArray = (a) => Array.isArray(a) && a.every((n) => Number.isInteger(n) && n > 0);

const getProfile = (userId) => profileModel.getProfile(userId);

const saveProfile = async (userId, artistIds, genreIds) => {
    if (!isIntArray(artistIds) || !isIntArray(genreIds)) {
        const err = new Error("artistIds and genreIds must be arrays of positive integers");
        err.status = 400;
        throw err;
    }
    // bỏ id trùng (chọn 2 lần cùng 1 ca sĩ sẽ vi phạm khoá chính)
    const artists = [...new Set(artistIds)];
    const genres = [...new Set(genreIds)];
    try {
        await profileModel.saveProfile(userId, artists, genres);
    } catch (err) {
        if (err.code === "23503") { // id ca sĩ / thể loại không tồn tại
            const e = new Error("Unknown artist or genre id");
            e.status = 400;
            throw e;
        }
        throw err;
    }
    return { done: true, artistIds: artists, genreIds: genres };
}

module.exports = { getProfile, saveProfile }

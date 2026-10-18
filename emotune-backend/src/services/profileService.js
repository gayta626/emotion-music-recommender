const profileModel = require("../model/profileModel")
const faceSamples = require("./faceSamples")

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

// C15: bat / tat dong y luu anh mat. Tat -> xoa ngay moi anh da luu cua nguoi nay (rut lai dong y = du lieu cung di)
const setFaceConsent = async (userId, on) => {
    if (typeof on !== "boolean") {
        const err = new Error("on must be true or false");
        err.status = 400;
        throw err;
    }
    await profileModel.setFaceConsent(userId, on);
    const removed = on ? 0 : faceSamples.removeUserFaces(userId);
    return { shareFaces: on, removed };
}

module.exports = { getProfile, saveProfile, setFaceConsent }

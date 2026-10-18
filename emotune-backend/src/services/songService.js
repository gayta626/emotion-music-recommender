const songModel = require("../model/songModel")
const similarUsers = require("./similarUsers")

let getSongs = () => {
    return songModel.getAllSongs();
}

// Ham thuan (de viet unit test): diem = nghe that + thuong khao sat + thuong ♥ (like_bonus)
// + thuong lang gieng kNN (C13, knn = ket qua similarUsers.loadNeighbors; khong truyen = 0); hoa diem -> bai moi them (id lon) truoc.
// Bo cac cot tinh diem noi bo, chi tra `score` (so).
let rankForYou = (rows, limit = 10, knn = null) => rows
    .map(({ listen_score, taste_bonus, like_bonus, ...song }) => ({
        ...song,
        score: Number(listen_score) + Number(taste_bonus) + Number(like_bonus || 0)
            + similarUsers.neighborSupport(song.id, knn).bonus,
    }))
    .sort((a, b) => b.score - a.score || b.id - a.id)
    .slice(0, limit);

let getForYou = async (userId) => {
    const [rows, knn] = await Promise.all([
        songModel.getForYouRows(userId),
        similarUsers.loadNeighbors(userId),
    ]);
    return rankForYou(rows, 10, knn);
}

module.exports = {
    getSongs: getSongs,
    rankForYou: rankForYou,
    getForYou: getForYou,
}

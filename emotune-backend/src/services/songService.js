const songModel = require("../model/songModel")

let getSongs = () => {
    return songModel.getAllSongs();
}

// Ham thuan (de viet unit test): diem = nghe that + thuong khao sat; hoa diem -> bai moi them (id lon) truoc.
// Bo 2 cot tinh diem noi bo, chi tra `score` (so).
let rankForYou = (rows, limit = 10) => rows
    .map(({ listen_score, taste_bonus, ...song }) => ({ ...song, score: Number(listen_score) + Number(taste_bonus) }))
    .sort((a, b) => b.score - a.score || b.id - a.id)
    .slice(0, limit);

let getForYou = async (userId) => {
    const rows = await songModel.getForYouRows(userId);
    return rankForYou(rows, 10);
}

module.exports = {
    getSongs: getSongs,
    rankForYou: rankForYou,
    getForYou: getForYou,
}

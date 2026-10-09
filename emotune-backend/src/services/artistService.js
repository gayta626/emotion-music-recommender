const artistModel = require("../model/artistModel")

let getArtists = () => {
    return artistModel.getArtistsData();
}

// Ham thuan (de viet unit test): gom danh sach theo bai thanh { plays: { [songId]: {total, month} }, monthTotal, total }
let summarizePlays = (rows) => {
    const plays = {};
    let monthTotal = 0;
    let total = 0;
    rows.forEach((r) => {
        plays[r.song_id] = { total: r.total, month: r.month };
        monthTotal += r.month;
        total += r.total;
    });
    return { plays, monthTotal, total };
}

// Số liệu cá nhân của 1 ca sĩ cho trang ca sĩ: lượt nghe từng bài + khi nào hay nghe (theo cảm xúc)
let getArtistStats = async (userId, artistId) => {
    if (!(await artistModel.artistExists(artistId))) {
        const err = new Error("Artist not found");
        err.status = 404;
        throw err;
    }
    const [playRows, moods] = await Promise.all([
        artistModel.getPlayCounts(userId, artistId),
        artistModel.getMoodCounts(userId, artistId),
    ]);
    return { ...summarizePlays(playRows), moods };
}

module.exports = {
    getArtists: getArtists,
    summarizePlays: summarizePlays,
    getArtistStats: getArtistStats,
}

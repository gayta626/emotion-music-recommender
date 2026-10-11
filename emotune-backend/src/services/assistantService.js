const songModel = require("../model/songModel")
const artistModel = require("../model/artistModel")
const playlistModel = require("../model/playlistModel")
const { parseCommand, validateLlmAction, checkMv } = require("./assistantRules")
const { classifyWithLlm } = require("./assistantLlm")

// danh muc de tro ly tim ten: ca kho nhac + ca si + playlist CUA NGUOI NAY
let getCatalog = async (userId) => {
    const [songs, artists, playlists] = await Promise.all([
        songModel.getAllSongs(),
        artistModel.getArtistsData(),
        playlistModel.getPlaylists(userId),
    ]);
    return { songs, artists, playlists };
}

// luat truoc (nhanh, mien phi, co test); luat khong hieu -> hoi LLM; LLM tra sai / khong co -> "chua hieu".
// options: { pending, pick } (tra loi cau hoi lai), history (cac cau truoc trong lan mo tro ly nay),
// nowPlayingId (bai dang phat: "bai nay", mo MV), mood (cam xuc quet gan nhat)
let ask = async (userId, text, options = {}) => {
    const { pending = null, pick = null, history = [], nowPlayingId = null, mood = null } = options;
    const catalog = await getCatalog(userId);
    // "mo MV" khi bai khong co MV -> bo buoc do va noi ro (ca ket qua luat lan LLM)
    const finish = (result, source) => ({ ...checkMv(result, catalog, nowPlayingId), source });

    const ruled = parseCommand(text, catalog, { pending, pick });
    if (ruled.action.type !== "unknown") return finish(ruled, "rules");
    if (!text) return { ...ruled, source: "none" };

    const nowPlaying = catalog.songs.find((s) => s.id === nowPlayingId) || null;
    const raw = await classifyWithLlm(text, catalog, { nowPlaying, mood }, history);
    const llm = validateLlmAction(raw, catalog);
    if (llm.action.type === "unknown") return { ...ruled, source: "none" };
    return finish(llm, "llm");
}

module.exports = {
    ask: ask,
}

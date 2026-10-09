const songModel = require("../model/songModel")
const artistModel = require("../model/artistModel")
const playlistModel = require("../model/playlistModel")
const { parseCommand, validateLlmAction } = require("./assistantRules")
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

// luat truoc (nhanh, mien phi, co test); luat khong hieu -> hoi LLM; LLM tra sai / khong co -> "chua hieu"
let ask = async (userId, text, options) => {
    const catalog = await getCatalog(userId);
    const ruled = parseCommand(text, catalog, options);
    if (ruled.action.type !== "unknown") return { ...ruled, source: "rules" };
    if (!text) return { ...ruled, source: "none" };

    const raw = await classifyWithLlm(text, catalog);
    const llm = validateLlmAction(raw, catalog);
    if (llm.action.type === "unknown") return { ...ruled, source: "none" };
    return { ...llm, source: "llm" };
}

module.exports = {
    ask: ask,
}

const assistantService = require("../services/assistantService")
const { sanitizePending, sanitizeHistory, EMOTIONS } = require("../services/assistantRules")

const MAX_TEXT = 300

// body: { text, pending?, pick?, history?, nowPlayingId?, mood? }
// - pending/pick chi co khi tra loi cau hoi lai "ban chon cai nao?"
// - history: cac cau truoc trong lan mo tro ly nay (client giu, server khong luu); nowPlayingId, mood: ngu canh cho Gemini
let ask = async (req, res) => {
    const body = req.body || {}
    const text = typeof body.text === "string" ? body.text.trim() : ""
    const pending = sanitizePending(body.pending)
    const pick = pending && Number.isInteger(body.pick) ? body.pick : null
    if ((!text && pick === null) || text.length > MAX_TEXT) {
        return res.status(400).json({ err: "Cau noi rong hoac qua dai" })
    }
    const options = {
        pending,
        pick,
        history: sanitizeHistory(body.history),
        nowPlayingId: Number.isInteger(body.nowPlayingId) && body.nowPlayingId > 0 ? body.nowPlayingId : null,
        mood: EMOTIONS.includes(body.mood) ? body.mood : null,
    }
    try {
        const data = await assistantService.ask(req.userId, text, options)
        return res.status(200).json(data)
    } catch (err) {
        console.log("Loi goi API assistant :" + err)
        return res.status(500).json({ err: "Loi server tro ly giong noi" })
    }
}

// C11 - POST /voice-mood { text }: micro an luc quet mat nghe duoc 1 cau -> cam xuc trong cau (null = khong phai cau ke cam xuc)
let voiceMood = async (req, res) => {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : ""
    if (!text || text.length > MAX_TEXT) {
        return res.status(400).json({ err: "Cau noi rong hoac qua dai" })
    }
    try {
        return res.status(200).json(await assistantService.moodOf(text))
    } catch (err) {
        console.log("Loi hieu cam xuc tu cau noi :" + err)
        return res.status(500).json({ err: "Loi server" })
    }
}

module.exports = {
    ask: ask,
    voiceMood: voiceMood,
}

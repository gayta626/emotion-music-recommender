const assistantService = require("../services/assistantService")
const { sanitizePending } = require("../services/assistantRules")

const MAX_TEXT = 300

// body: { text, pending?, pick? } - pending/pick chi co khi tra loi cau hoi lai "ban chon cai nao?"
let ask = async (req, res) => {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : ""
    const pending = sanitizePending(req.body?.pending)
    const pick = pending && Number.isInteger(req.body?.pick) ? req.body.pick : null
    if ((!text && pick === null) || text.length > MAX_TEXT) {
        return res.status(400).json({ err: "Cau noi rong hoac qua dai" })
    }
    try {
        const data = await assistantService.ask(req.userId, text, { pending, pick })
        return res.status(200).json(data)
    } catch (err) {
        console.log("Loi goi API assistant :" + err)
        return res.status(500).json({ err: "Loi server tro ly giong noi" })
    }
}

module.exports = {
    ask: ask,
}

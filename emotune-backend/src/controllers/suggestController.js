const suggestService = require("../services/suggestService")

const VALID_EMOTIONS = [
    "happy",
    "sad",
    "angry",
    "surprise",
    "neutral"
];


let getSuggest = async (req, res) => {
    // auto = true: web tu chon bai tiep (khong phai lan quet/chon cam xuc moi) -> khong ghi lich su
    // via = "voice": C11 nguoi dung noi cam xuc luc quet ma camera khong thay mat
    const { emotion, confidence, auto, via } = req.body;
    if (!VALID_EMOTIONS.includes(emotion)) {
        return res.status(400).json({
            error: "Loi truyen sai du lieu emotion"
        })
    }
    try {
        // auto: web tu chon bai tiep; khong thi nguoi dung tu chon cam xuc (I2 noi "You said you feel ...")
        const result = await suggestService.generateSuggestion(req.userId, emotion, confidence,
            { log: auto !== true, source: auto === true ? "auto" : via === "voice" ? "voice" : "pick" });
        if (!result) {
            return res.status(404).json({
                error: "Loi : Khong tim thay"
            })
        }
        return res.status(200).json(suggestService.publicResult(result));


    } catch (err) {
        console.error("Lỗi getSuggest:", err);
        return res.status(500).json({ err: "Loi server" });
    }

}

module.exports = {
    getSuggest: getSuggest,

}
const suggestService = require("../services/suggestService")

const VALID_EMOTIONS = [
    "happy",
    "sad",
    "angry",
    "neutral"
];


let getSuggest = async (req, res) => {
    const { emotion, confidence } = req.body;
    if (!VALID_EMOTIONS.includes(emotion)) {
        return res.status(400).json({
            error: "Loi truyen sai du lieu emotion"
        })
    }
    try {
        const result = await suggestService.generateSuggestion(emotion, confidence);
        if (!result) {
            return res.status(404).json({
                error: "Loi : Khong tim thay"
            })
        }
        return res.status(200).json(result);


    } catch (err) {
        console.error("Lỗi getSuggest:", err);
        return res.status(500).json({ err: "Loi server" });
    }

}

module.exports = {
    getSuggest: getSuggest,

}
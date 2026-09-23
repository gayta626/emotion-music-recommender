const emotionService = require("../services/emotionService")
const suggestService = require("../services/suggestService")

let scanAndSuggest = async (req, res) => {
    const { image } = req.body;
    try {
        const emotionResult = await emotionService.getEmotionFromImage(image);
        if (emotionResult.error === "no_face_detected") {
            return res.status(200).json({
                error: "no_face_detected",
                message: "Không phát hiện khuôn mặt, vui lòng nhìn vào camera"
            });
        }
        const result = await suggestService.generateSuggestion(emotionResult.emotion, emotionResult.confidence)
        if (!result) {
            return res.status(404).json({ error: "Loi khong tim thay" })
        }
        console.log(`[SCAN] Emotion: ${emotionResult.emotion} (Confidence: ${emotionResult.confidence})`);
        console.log(`[SCAN] Suggested: ${result.song.title} (isEncourage: ${result.isEncourage})`);

        return res.status(200).json(result)
    } catch (err) {
        console.error("Loi :" + err);
        return res.status(500).json({ error: "Loi server" })
    }
}


module.exports = {
    scanAndSuggest: scanAndSuggest
}
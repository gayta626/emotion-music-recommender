const emotionService = require("../services/emotionService")
const suggestService = require("../services/suggestService")
const moodFixService = require("../services/moodFixService")

let scanAndSuggest = async (req, res) => {
    const { image, images } = req.body;
    try {
        const emotionResult = await emotionService.getEmotionFromImage({ image, images });
        if (emotionResult.error === "no_face_detected") {
            return res.status(200).json({
                error: "no_face_detected",
                message: "Không phát hiện khuôn mặt, vui lòng nhìn vào camera"
            });
        }
        const { emotion, confidence } = emotionResult;
        // C15: nho tam lan quet (kem anh mat Flask da cat) -> nguoi dung sua cam xuc sau duoc (POST /scan-feedback)
        const scanId = moodFixService.rememberScan(req.userId, { emotion, confidence, face: emotionResult.debug_crop });

        // C7: AI chua chac -> khong doan bua, web hoi lai nguoi dung (chua ghi lich su, chua chon bai)
        if (moodFixService.isUnsure(confidence)) {
            console.log(`[SCAN] Chua chac: ${emotion} (Confidence: ${confidence}) -> hoi nguoi dung`);
            return res.status(200).json({ unsure: true, scanId, emotion, confidence, scores: emotionResult.all_scores || null });
        }

        const result = await suggestService.generateSuggestion(req.userId, emotion, confidence, { source: "scan" })
        if (!result) {
            return res.status(404).json({ error: "Loi khong tim thay" })
        }
        moodFixService.attachHistory(scanId, result.historyId);
        console.log(`[SCAN] Emotion: ${emotion} (Confidence: ${confidence}, ${emotionResult.frames ?? 1} khung)`);
        console.log(`[SCAN] Suggested: ${result.song.title} (isEncourage: ${result.isEncourage})`);

        return res.status(200).json({ ...suggestService.publicResult(result), scanId, confidence })
    } catch (err) {
        console.error("Loi :" + err);
        return res.status(500).json({ error: "Loi server" })
    }
}

// C15: nguoi dung chon cam xuc khi AI chua chac, hoac sua cam xuc AI doan sai -> bai moi theo cam xuc ho chon
// C11: via = "voice" -> cam xuc nghe duoc tu cau noi luc quet (mat tu tin >= 75% thi khong luu anh)
let fixMood = async (req, res) => {
    const { scanId, emotion, via } = req.body || {};
    try {
        return res.status(200).json(await moodFixService.fixMood(req.userId, scanId, emotion, via === "voice" ? "voice" : "tap"));
    } catch (err) {
        if (!err.status) console.error("Loi sua cam xuc:", err);
        return res.status(err.status || 500).json({ error: err.status ? err.message : "Loi server" });
    }
}


module.exports = {
    scanAndSuggest: scanAndSuggest,
    fixMood: fixMood
}

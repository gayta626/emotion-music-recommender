const suggestModel = require("../model/suggestModel")
const { getRandomMessage } = require("../messages")

const NEGATIVE_EMOTIONS = ["sad", "angry"];

// Ham thuan (de viet unit test): tu so lan moi cam xuc gan day -> co nen doi sang bai vui de dong vien khong.
// trend: [{ emotion, cnt }]. Dong vien khi: >= 4 lan quet, hon nua la buon/gian, VA luc nay cung dang buon/gian.
let decideTarget = (trend, emotion) => {
    const totalCount = trend.reduce((sum, row) => sum + parseInt(row.cnt), 0);
    const negativeCount = trend
        .filter((row) => NEGATIVE_EMOTIONS.includes(row.emotion))
        .reduce((sum, row) => sum + parseInt(row.cnt), 0);
    const negativeRatio = totalCount > 0 ? negativeCount / totalCount : 0;

    if (negativeRatio > 0.5 && totalCount >= 4 && NEGATIVE_EMOTIONS.includes(emotion)) {
        return { targetEmotion: "happy", isEncourage: true };
    }
    return { targetEmotion: emotion, isEncourage: false };
}

// xu huong cam xuc 1-3 ngay cua CHINH nguoi dung nay
let checkMoodTrend = async (userId, emotion) => {
    let trend1Day = await suggestModel.getMoodTrend(userId, 1);
    let totalCount1Day = trend1Day.reduce((sum, row) => {
        return sum + parseInt(row.cnt);
    }, 0);

    // neu nguoi dung su dung web >= 4 lan/ngay thi lay du lieu ngay hom do, khong thi lay 3 ngay
    const trend = totalCount1Day >= 4 ? trend1Day : await suggestModel.getMoodTrend(userId, 3);
    return decideTarget(trend, emotion);
}


// options.log = false: web tu chon bai tiep theo cam xuc cu (nguoi dung dang luot, khong quet moi)
// -> KHONG ghi mood_history, neu khong thong ke + xu huong cam xuc bi 1 lan quet nhan len nhieu lan
let generateSuggestion = async (userId, emotion, confidence, options = {}) => {
    const trendResult = await checkMoodTrend(userId, emotion);
    const songSuggested = await suggestModel.getSongsByEmotion(userId, trendResult.targetEmotion);
    //kiem tra xem con bai hat de goi y khong
    if (songSuggested.length === 0) {
        return null;
    }
    const chosenSong =
        Math.random() < 0.8 ? songSuggested[0]
            : songSuggested[Math.floor(Math.random() * songSuggested.length)]

    const suggestMessage = getRandomMessage(trendResult.targetEmotion, trendResult.isEncourage);

    if (options.log !== false) {
        await suggestModel.logSuggestion(userId, emotion, confidence, chosenSong.id)
    }
    return {
        song: chosenSong,
        emotion: trendResult.targetEmotion,
        // cam xuc THAT cua nguoi dung (emotion o tren co the da doi sang "happy" de dong vien)
        detectedEmotion: emotion,
        message: suggestMessage,
        isEncourage: trendResult.isEncourage
    }

}

module.exports = {
    decideTarget: decideTarget,
    checkMoodTrend: checkMoodTrend,
    generateSuggestion: generateSuggestion
}
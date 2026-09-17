const suggestModel = require("../model/suggestModel")
const { getRandomMessage } = require("../messages")

let checkMoodTrend = async (emotion) => {
    let trend1Day = await suggestModel.getMoodTrend(1);
    let totalCount1Day = trend1Day.reduce((sum, row) => {
        return sum + parseInt(row.cnt);
    }, 0);

    let trend, totalCount;
    // neu nguoi dung su dung web 4/ngay thi lay du lieu ngay hom do de quyet dinh emtion
    if (totalCount1Day >= 4) {
        trend = trend1Day;
        totalCount = totalCount1Day;
    } else {
        trend = await suggestModel.getMoodTrend(3);
        totalCount = trend.reduce((sum, row) => {
            return sum + parseInt(row.cnt);
        }, 0);

    }
    const sadRow = trend.find((row) => row.emotion === "sad")
    const sadRatio = totalCount > 0 && sadRow ? parseInt(sadRow.cnt) / totalCount : 0;

    let targetEmotion = emotion;
    let isEncourage = false;
    if (sadRatio > 0.5) {
        targetEmotion = "happy";
        isEncourage = true;
    }
    return { targetEmotion: targetEmotion, isEncourage: isEncourage }
}


let generateSuggestion = async (emotion, confidence) => {
    const trendResult = await checkMoodTrend(emotion);
    const songSuggested = await suggestModel.getSongsByEmotion(trendResult.targetEmotion);
    //kiem tra xem con bai hat de goi y khong
    if (songSuggested.length === 0) {
        return null;
    }
    const chosenSong =
        Math.random() < 0.8 ? songSuggested[0]
            : songSuggested[Math.floor(Math.random() * songSuggested.length)]

    const suggestMessage = getRandomMessage(trendResult.targetEmotion, trendResult.isEncourage);

    await suggestModel.logSuggestion(emotion, confidence, chosenSong.id)
    return {
        song: chosenSong,
        message: suggestMessage,
        isEncourage: trendResult.isEncourage
    }

}

module.exports = {
    checkMoodTrend: checkMoodTrend,
    generateSuggestion: generateSuggestion
}
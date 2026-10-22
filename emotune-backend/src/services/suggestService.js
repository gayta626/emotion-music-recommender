const suggestModel = require("../model/suggestModel")
const journeyService = require("./journeyService")
const similarUsers = require("./similarUsers")
const explainService = require("./explainService")
const exploreService = require("./exploreService")
const { getRandomMessage, getJourneyMessage } = require("../messages")

const NEGATIVE_EMOTIONS = ["sad", "angry"];
// cam xuc hien la "Explore" tren giao dien -> chon bai theo exploreService, khong theo vibe
const EXPLORE = "surprise";

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
// options.source: scan | pick | fix | auto -> cach noi ly do I2 ("You look ..." / "You said you feel ...")
// options.aiEmotion: nguoi dung vua sua / xac nhan cam xuc AI doan (C15) -> ghi kem vao mood_history.ai_emotion
// Ket qua co historyId (dong mood_history vua ghi, null neu khong ghi): controller giu lai de nguoi dung sua cam xuc sau,
// KHONG tra ve web (publicResult)
let generateSuggestion = async (userId, emotion, confidence, options = {}) => {
    const log = options.log !== false;
    const source = options.source || (log ? "pick" : "auto");
    const [trendResult, knn] = await Promise.all([
        checkMoodTrend(userId, emotion),
        // C13: nguoi co gu giong (kNN) -> cong diem bai ho thich khi xep hang
        similarUsers.loadNeighbors(userId),
    ]);

    // I4: buon/gian keo dai + lan quet / chon cam xuc MOI -> hanh trinh ~5 bai chuyen dan sang vui thay vi nhay thang sang 1 bai vui.
    // Web tu chon bai tiep (auto, log = false) thi KHONG mo hanh trinh moi: het hanh trinh ma van dang luot web
    // -> tiep tuc bai vui dong vien nhu cu, khong lap lai hanh trinh mai
    if (trendResult.isEncourage && log) {
        const journey = await journeyService.createJourney(userId, emotion, knn);
        if (journey.length) {
            const historyId = await suggestModel.logSuggestion(userId, emotion, confidence, journey[0].id, options.aiEmotion);
            // I2: moi bai trong hanh trinh 1 bo ly do (buoc may / tong)
            const songs = journey.map((song, step) => ({
                ...song,
                why: explainService.explainPick(song, { emotion, source, journey: { step, total: journey.length } }),
            }));
            return {
                song: songs[0],
                emotion: songs[0].emotion,
                detectedEmotion: emotion,
                message: getJourneyMessage(emotion),
                isEncourage: true,
                journey: { from: emotion, to: journeyService.JOURNEY_TARGET, songs },
                historyId
            }
        }
    }

    // 'surprise' (Explore) = lenh "muon kham pha": bai CHUA TUNG NGHE trong ca kho, xep theo ca si / the loai hay nghe
    const explore = trendResult.targetEmotion === EXPLORE;
    const songSuggested = explore
        ? exploreService.rankExplore(await suggestModel.getExploreSongs(userId), knn)
        : similarUsers.rankSongs(await suggestModel.getSongsByEmotion(userId, trendResult.targetEmotion), knn);
    //kiem tra xem con bai hat de goi y khong
    if (songSuggested.length === 0) {
        return null;
    }
    const picked =
        Math.random() < 0.8 ? songSuggested[0]
            : songSuggested[Math.floor(Math.random() * songSuggested.length)]
    const chosenSong = {
        ...picked,
        why: explainService.explainPick(picked, { emotion, source, isEncourage: trendResult.isEncourage, explore }),
    };

    const suggestMessage = getRandomMessage(trendResult.targetEmotion, trendResult.isEncourage);

    const historyId = log
        ? await suggestModel.logSuggestion(userId, emotion, confidence, chosenSong.id, options.aiEmotion)
        : null;
    return {
        song: chosenSong,
        emotion: trendResult.targetEmotion,
        // cam xuc THAT cua nguoi dung (emotion o tren co the da doi sang "happy" de dong vien)
        detectedEmotion: emotion,
        message: suggestMessage,
        isEncourage: trendResult.isEncourage,
        historyId
    }

}

// bo cot noi bo truoc khi tra ve web
const publicResult = (result) => {
    if (!result) return result;
    const { historyId, ...rest } = result;
    return rest;
}

module.exports = {
    decideTarget: decideTarget,
    checkMoodTrend: checkMoodTrend,
    generateSuggestion: generateSuggestion,
    publicResult: publicResult
}
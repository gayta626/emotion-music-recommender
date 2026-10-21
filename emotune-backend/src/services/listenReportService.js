const listenReportModel = require("../model/listenReportModel")

const VALID_EMOTIONS = ["happy", "sad", "angry", "surprise", "neutral"];

// Ham thuan: kiem tra body cua POST /listen-report truoc khi cham diem. Tra ve chuoi loi, hop le thi null.
// Truoc day chi so `< 0` / `> 1` -> thieu truong, null, "abc", {} van lot qua (null bi coi la 0 -> tru 1 diem)
const checkListenReport = ({ emotion, songId, finishPercent } = {}) => {
    if (!VALID_EMOTIONS.includes(emotion)) return "cam xuc khong hop le";
    if (!Number.isInteger(songId) || songId <= 0) return "songId phai la so nguyen duong";
    if (typeof finishPercent !== "number" || !Number.isFinite(finishPercent) || finishPercent < 0 || finishPercent > 1) {
        return "tien do nghe phai nam trong khoang tu 0 -> 1.00";
    }
    return null;
}

let processListenReport = async (userId, emotion, songId, finishPercent) => {
    let delta, action;
    if (finishPercent >= 0.8) {
        delta = 1; action = "good";
    } else if (finishPercent < 0.4) {
        delta = -1; action = "bad";
    } else {
        delta = 0.3; action = "neutral";
    }
    return await listenReportModel.feedBackSongListened(userId, emotion, songId, delta, action);
}

module.exports = {
    checkListenReport: checkListenReport,
    processListenReport: processListenReport
}
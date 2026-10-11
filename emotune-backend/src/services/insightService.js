// Chuong thong bao (I1): "nhan xet cua NYX" rut ra tu lich su quet + nghe cua CHINH nguoi dung.
// buildInsights la HAM THUAN (unit test duoc); getInsights lay so lieu bang lai cac cau SQL cua trang thong ke.
const { EMOTIONS, buildDaily, buildHourly } = require("./statsService");

const NEGATIVE = ["sad", "angry"];
// nhan hien thi (giong frontend utils/moodStats.js): ma 'surprise' hien la "Explore"
const LABEL = { happy: "Happy", sad: "Sad", angry: "Angry", surprise: "Explore", neutral: "Neutral" };
// it hon so lan quet nay thi chua du de ket luan
const MIN_WEEK_SCANS = 3;
const MIN_HOUR_SCANS = 5;
// "thoi quen" = khung 3 gio chiem it nhat 40% so lan quet trong tuan
const WINDOW_HOURS = 3;
const MIN_WINDOW_SHARE = 0.4;
// buon/gian thay doi it nhat 10 diem phan tram moi bao "tang/giam"
const SHIFT_POINTS = 10;

const total = (counts) => EMOTIONS.reduce((n, e) => n + counts[e], 0);
const sumCounts = (days) => {
    const out = Object.fromEntries(EMOTIONS.map((e) => [e, 0]));
    days.forEach((d) => EMOTIONS.forEach((e) => { out[e] += d.counts[e]; }));
    return out;
};
const negativeShare = (counts) => NEGATIVE.reduce((n, e) => n + counts[e], 0) / total(counts);
// cam xuc nhieu nhat (hoa -> theo thu tu EMOTIONS)
const topOf = (counts) => EMOTIONS.reduce((best, e) => (counts[e] > counts[best] ? e : best), EMOTIONS[0]);
const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

// daily: 14 ngay (buildDaily(..., 14, today)), hom nay o cuoi; hourly: 24 gio cua 7 ngay gan nhat (buildHourly);
// topSong: { song, plays } bai nghe nhieu nhat 7 ngay (hoac null); cheerUp: luat dong vien dang bat (decideTarget).
// Tra ve toi da 5 nhan xet { id, kind, title, body, link?, song? }; id giu nguyen trong tuan neu y chinh khong doi
// -> frontend danh dau "da xem" theo id, noi dung chinh doi thi thanh nhan xet moi.
const buildInsights = ({ daily, hourly, topSong, cheerUp }) => {
    const out = [];
    const lastWeek = sumCounts(daily.slice(0, 7));
    const thisWeekDays = daily.slice(7);
    const thisWeek = sumCounts(thisWeekDays);
    const weekStart = thisWeekDays[0].date;
    const todayKey = daily[daily.length - 1].date;
    const nThis = total(thisWeek);
    const nLast = total(lastWeek);

    if (cheerUp) {
        out.push({
            id: `cheer-up:${todayKey}`, kind: "cheer-up", link: "/stats",
            title: "Cheer-up mode is on",
            body: "Most of your recent scans were sad or angry, so NYX is mixing in happier songs for you.",
        });
    }

    if (nThis >= MIN_WEEK_SCANS) {
        const pThis = Math.round(negativeShare(thisWeek) * 100);
        const pLast = nLast >= MIN_WEEK_SCANS ? Math.round(negativeShare(lastWeek) * 100) : null;
        if (pLast !== null && Math.abs(pThis - pLast) >= SHIFT_POINTS) {
            const up = pThis > pLast;
            out.push({
                id: `shift:${weekStart}:${up ? "up" : "down"}`, kind: "shift", link: "/stats",
                title: up ? "You've felt down more this week" : "A brighter week",
                body: `Sad or angry made up ${pThis}% of your scans, ${up ? "up" : "down"} from ${pLast}% last week.`,
            });
        } else {
            const top = topOf(thisWeek);
            out.push({
                id: `week:${weekStart}:${top}`, kind: "week", link: "/stats",
                title: "Your week in moods",
                body: `Mostly ${LABEL[top]}: ${thisWeek[top]} of ${nThis} scans this week.`,
            });
        }
    }

    if (total(daily[daily.length - 1].counts) === 0) {
        out.push({
            id: `no-scan:${todayKey}`, kind: "no-scan", link: "/scan",
            title: "No mood check today",
            body: "Scan your face so NYX can pick songs for how you feel right now.",
        });
    }

    if (topSong && topSong.plays >= 2) {
        out.push({
            id: `top-song:${weekStart}:${topSong.song.id}`, kind: "top-song", song: topSong.song,
            title: `On repeat: ${topSong.song.title}`,
            body: `You played it ${topSong.plays} times this week. Tap to play it again.`,
        });
    }

    // khung 3 gio dong nhat (vong qua nua dem); hoa -> khung co gio GIUA dong hon (gio dong nhat nam giua khung)
    const hourTotals = hourly.map((h) => total(h.counts));
    const nHours = hourTotals.reduce((a, b) => a + b, 0);
    const at = (h) => hourTotals[h % 24];
    let start = 0;
    let inWindow = -1;
    for (let h = 0; h < 24; h++) {
        const sum = at(h) + at(h + 1) + at(h + 2);
        if (sum > inWindow || (sum === inWindow && at(h + 1) > at(start + 1))) { inWindow = sum; start = h; }
    }
    if (nHours >= MIN_HOUR_SCANS && inWindow / nHours >= MIN_WINDOW_SHARE) {
        const windowDays = [0, 1, 2].map((i) => hourly[(start + i) % 24]);
        out.push({
            id: `peak-hour:${weekStart}:${start}`, kind: "peak-hour", link: "/stats",
            title: `You check in most between ${hourLabel(start)} and ${hourLabel((start + WINDOW_HOURS) % 24)}`,
            body: `${inWindow} of your ${nHours} scans this week, mostly ${LABEL[topOf(sumCounts(windowDays))]}.`,
        });
    }

    return out.slice(0, 5);
};

const statsModel = require("../model/statsModel");
const suggestService = require("./suggestService");

const getInsights = async (userId) => {
    const today = new Date();
    const [scanDays, scanHours, topSongs, trend] = await Promise.all([
        statsModel.getScanDays(userId, 14),
        statsModel.getScanHours(userId, 7),
        statsModel.getTopSongs(userId, 7),
        // cung luat voi luc chon bai: gia su luc nay dang buon -> co doi sang bai vui khong
        suggestService.checkMoodTrend(userId, "sad"),
    ]);
    const top = topSongs[0];
    return buildInsights({
        daily: buildDaily(scanDays, 14, today),
        hourly: buildHourly(scanHours),
        topSong: top ? { song: (({ plays, ...song }) => song)(top), plays: Number(top.plays) } : null,
        cheerUp: trend.isEncourage,
    });
};

module.exports = { buildInsights, getInsights };

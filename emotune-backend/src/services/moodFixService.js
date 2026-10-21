const crypto = require("crypto");
const suggestModel = require("../model/suggestModel");
const profileModel = require("../model/profileModel");
const suggestService = require("./suggestService");
const faceSamples = require("./faceSamples");
const { UNSURE_BELOW } = require("./adminService");

// C7 + C15 - Ngung doan bua + vong phan hoi:
// - Moi lan quet camera duoc nho TAM trong RAM (scanId): cam xuc AI doan, do tin cay, anh mat da cat, dong mood_history.
// - Tin cay < UNSURE_BELOW (cung nguong voi trang admin) -> KHONG chon bai, hoi nguoi dung "ban dang thay the nao?".
// - Nguoi dung chon / sua cam xuc (POST /scan-feedback) -> bai moi theo cam xuc ho chon, ghi mood_history.ai_emotion = AI doan
//   (do duoc "AI sai bao nhieu lan" tren /admin), va NEU ho dong y o Settings: luu anh mat + nhan dung -> du lieu train lai model.
// Anh chi nam trong RAM toi da SCAN_TTL_MS, khong ghi dia neu nguoi dung khong dong y.

const SCAN_TTL_MS = 30 * 60 * 1000;
const MAX_SCANS = 500;
const VALID_EMOTIONS = ["happy", "sad", "angry", "surprise", "neutral"];

// C11: nguoi dung NOI cam xuc trong luc quet (micro an) -> bai van phat theo loi noi, nhung neu mat da tu tin
// >= muc nay thi KHONG luu anh mat voi nhan theo loi noi (loi noi co the la noi dua / nghe nham -> nhieu du lieu train)
const VOICE_TRUST_FACE_ABOVE = 0.75;

const scans = new Map();

// Ham thuan: AI co "chua chac" khong (khong co do tin cay -> coi la chac, vd model cu)
const isUnsure = (confidence) => typeof confidence === "number" && confidence < UNSURE_BELOW;

// Ham thuan: nhan nguoi dung dua (via: "tap" = bam chon, "voice" = noi luc quet) co duoc dung lam nhan anh train khong
const canLabelFace = (via, confidence) => via !== "voice"
    || !(typeof confidence === "number" && confidence >= VOICE_TRUST_FACE_ABOVE);

const isExpired = (scan, now = Date.now()) => now - scan.at > SCAN_TTL_MS;

const prune = (now = Date.now()) => {
    for (const [id, s] of scans) {
        if (isExpired(s, now)) scans.delete(id);
    }
    // Map giu thu tu them vao -> xoa cai cu nhat truoc
    while (scans.size > MAX_SCANS) scans.delete(scans.keys().next().value);
};

// don dinh ky: khong co luot quet moi thi anh mat cu cung khong nam trong RAM qua 30 phut
// (unref: khong giu tien trinh song chi vi bo hen gio nay, vd khi chay test)
setInterval(prune, 60 * 1000).unref();

// nho 1 lan quet -> scanId (gui ve web)
const rememberScan = (userId, { emotion, confidence, face }) => {
    prune();
    const scanId = crypto.randomUUID();
    scans.set(scanId, { userId, emotion, confidence, face: face || null, historyId: null, at: Date.now() });
    return scanId;
};

// AI da chon bai cho lan quet nay -> nho dong mood_history (sua cam xuc thi thay dong nay)
const attachHistory = (scanId, historyId) => {
    const scan = scans.get(scanId);
    if (scan && !isExpired(scan)) scan.historyId = historyId;
};

const fail = (status, message) => Object.assign(new Error(message), { status });

// POST /scan-feedback { scanId, emotion, via? }  (via "voice" = C11 nguoi dung noi cam xuc luc quet)
// Chi "dung het" luot quet khi tao bai moi THANH CONG; loi (khong co bai / loi DB) -> tra lai dong lich su cu,
// giu luot quet de bam lai duoc. 2 lan sua cung luc cung 1 luot quet -> lan sau 409.
const fixMood = async (userId, scanId, emotion, via = "tap") => {
    if (!VALID_EMOTIONS.includes(emotion)) throw fail(400, "Invalid emotion");
    const scan = scans.get(scanId);
    if (scan && isExpired(scan)) scans.delete(scanId);
    // het han (backend khoi dong lai / qua 30 phut) hoac khong phai cua minh -> web tu goi /suggest
    if (!scan || scan.userId !== userId || isExpired(scan)) throw fail(410, "scan_expired");
    if (scan.busy) throw fail(409, "scan_busy");
    scan.busy = true;

    let result;
    let removed = null;
    try {
        if (scan.historyId) removed = await suggestModel.deleteSuggestion(userId, scan.historyId);
        result = await suggestService.generateSuggestion(userId, emotion, scan.confidence,
            { source: via === "voice" ? "voice" : "fix", aiEmotion: scan.emotion });
        if (!result) throw fail(404, "No song for this mood");
    } catch (err) {
        if (removed) {
            await suggestModel.restoreSuggestion(removed)
                .catch((e) => console.error("Khong tra lai duoc dong lich su cu:", e.message));
        }
        throw err;
    } finally {
        scan.busy = false;
    }
    scans.delete(scanId);

    // luu anh la phan phu: loi o day khong lam hong bai vua chon
    let faceSaved = false;
    try {
        if (scan.face && canLabelFace(via, scan.confidence) && await profileModel.hasFaceConsent(userId)) {
            faceSaved = !!faceSamples.saveFace(userId, emotion, scan.face);
        }
    } catch (err) {
        console.error("Khong luu duoc anh mat phan hoi:", err.message);
    }
    return {
        ...suggestService.publicResult(result),
        aiEmotion: scan.emotion,
        corrected: emotion !== scan.emotion,
        faceSaved,
        via,
    };
};

module.exports = { SCAN_TTL_MS, VOICE_TRUST_FACE_ABOVE, isUnsure, canLabelFace, rememberScan, attachHistory, fixMood };

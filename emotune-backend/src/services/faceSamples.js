const fs = require("fs");
const path = require("path");

// C15 - Anh mat nguoi dung da SUA / XAC NHAN cam xuc -> du lieu de train lai model cam xuc.
// Chi luu khi nguoi dung BAT dong y o Settings (users.face_consent_at). Tat dong y / bi xoa tai khoan -> xoa het anh cua ho.
// Cau truc giong emotion-scanner/data: feedback_faces/<camxuc>/u<userId>_<camxuc>_<thoi diem>.jpg
// -> emotion-scanner/prepare_data.py doc thu muc nay (nguon "feedback"). Ten file dung id, khong dung ten dang nhap.
// Anh la khuon mat DA CAT san (Flask tra ve debug_crop) -> cung dinh dang anh tu chup trong data/.

const FACE_DIR = path.join(__dirname, "..", "..", "feedback_faces");
const EMOTIONS = ["neutral", "happy", "sad", "angry", "surprise"];

// thoi diem kieu 20261017T153012345 (khong co ":" de dat ten file tren Windows, khong co "_" vi prepare_data.py
// lay ten nguoi bang cach tach 2 dau "_" cuoi cung: u3_sad_<thoi diem>.jpg -> "u3")
const stamp = (date) => date.toISOString().replace(/[-:.Z]/g, "");

// Ham thuan: ten file anh cua 1 lan sua
const faceFileName = (userId, emotion, date = new Date()) => `u${userId}_${emotion}_${stamp(date)}.jpg`;

// Ham thuan: "data:image/jpeg;base64,..." -> Buffer (null neu khong phai anh jpeg/png base64)
const decodeDataUrl = (dataUrl) => {
    const m = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
    return m ? Buffer.from(m[2], "base64") : null;
};

// luu 1 anh -> duong dan tuong doi (vd "sad/u3_sad_....jpg"), null neu khong co anh hop le
const saveFace = (userId, emotion, dataUrl, dir = FACE_DIR) => {
    const data = decodeDataUrl(dataUrl);
    if (!data || !EMOTIONS.includes(emotion)) return null;
    const name = faceFileName(userId, emotion);
    fs.mkdirSync(path.join(dir, emotion), { recursive: true });
    fs.writeFileSync(path.join(dir, emotion, name), data);
    return `${emotion}/${name}`;
};

const listFaces = (dir = FACE_DIR) => EMOTIONS.flatMap((emotion) => {
    const folder = path.join(dir, emotion);
    if (!fs.existsSync(folder)) return [];
    return fs.readdirSync(folder).filter((f) => f.endsWith(".jpg")).map((file) => ({ emotion, file }));
});

// xoa moi anh cua 1 nguoi (tat dong y / xoa tai khoan) -> so anh da xoa
const removeUserFaces = (userId, dir = FACE_DIR) => {
    const prefix = `u${userId}_`;
    const mine = listFaces(dir).filter((f) => f.file.startsWith(prefix));
    mine.forEach((f) => fs.unlinkSync(path.join(dir, f.emotion, f.file)));
    return mine.length;
};

// dem cho trang admin: tong, theo cam xuc, so nguoi da dong gop
const countFaces = (dir = FACE_DIR) => {
    const faces = listFaces(dir);
    return {
        total: faces.length,
        byEmotion: Object.fromEntries(EMOTIONS.map((e) => [e, faces.filter((f) => f.emotion === e).length])),
        people: new Set(faces.map((f) => f.file.split("_")[0])).size,
    };
};

module.exports = { FACE_DIR, faceFileName, decodeDataUrl, saveFace, removeUserFaces, countFaces };

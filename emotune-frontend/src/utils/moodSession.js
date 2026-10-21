// "Phien nay da quet chua" + "cam xuc quet gan nhat" — luu sessionStorage (dong tab la quen,
// lan mo web sau se hien man quet truoc, dung y "moi lan mo web quet 1 lan").
import { getToken } from "../api";

const SCANNED = "emotune_scanned";
const LAST_MOOD = "emotune_last_mood";

// cam xuc cu hon 30 phut -> icon quet tren header nhap nhay nhac quet lai
export const STALE_MS = 30 * 60 * 1000;

// phien thuoc ve token dang nhap nao (16 ky tu cuoi = chu ky JWT, moi lan dang nhap 1 khac).
// Dang xuat roi dang nhap tai khoan khac (hoac tab khac dang nhap nguoi khac) -> token doi -> phien cu bo,
// khong de nguoi sau dung cam xuc / "da quet" cua nguoi truoc
const OWNER = "emotune_session_owner";
const owner = () => (getToken() || "").slice(-16);

// trinh duyet chan sessionStorage (che do an danh / chan cookie) -> doc ra null, ghi thi bo qua
const read = (key) => {
    try {
        if (sessionStorage.getItem(OWNER) !== owner()) return null;
        return sessionStorage.getItem(key);
    } catch { return null; }
};
const write = (key, value) => {
    try {
        if (sessionStorage.getItem(OWNER) !== owner()) {
            sessionStorage.removeItem(SCANNED);
            sessionStorage.removeItem(LAST_MOOD);
            sessionStorage.setItem(OWNER, owner());
        }
        sessionStorage.setItem(key, value);
    } catch { /* bo qua */ }
};

// "da quet" = da bat dau phien: quet mat / noi cam xuc voi tro ly / TU CHON 1 bai (PlaybackProvider) -> "/" la trang chu
export const hasScanned = () => read(SCANNED) === "1";
export const markScanned = () => write(SCANNED, "1");

export const loadLastMood = () => {
    try { return JSON.parse(read(LAST_MOOD)); } catch { return null; }
};

export const saveLastMood = (emotion) => {
    const mood = { emotion, at: Date.now() };
    write(LAST_MOOD, JSON.stringify(mood));
    return mood;
};

// "just now" / "12 min ago" / "2 h ago" (icon quet tren header + the quet tren trang chu)
export const timeAgo = (ms) => {
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min} min ago`;
    return `${Math.floor(min / 60)} h ago`;
};

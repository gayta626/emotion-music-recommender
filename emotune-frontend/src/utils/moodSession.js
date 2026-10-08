// "Phien nay da quet chua" + "cam xuc quet gan nhat" — luu sessionStorage (dong tab la quen,
// lan mo web sau se hien man quet truoc, dung y "moi lan mo web quet 1 lan").
const SCANNED = "emotune_scanned";
const LAST_MOOD = "emotune_last_mood";

// cam xuc cu hon 30 phut -> icon quet tren header nhap nhay nhac quet lai
export const STALE_MS = 30 * 60 * 1000;

// trinh duyet chan sessionStorage (che do an danh / chan cookie) -> doc ra null, ghi thi bo qua
const read = (key) => {
    try { return sessionStorage.getItem(key); } catch { return null; }
};
const write = (key, value) => {
    try { sessionStorage.setItem(key, value); } catch { /* bo qua */ }
};

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

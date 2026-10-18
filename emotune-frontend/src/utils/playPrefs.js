// Tuy chon phat nhac cua nguoi dung, luu localStorage theo tung tai khoan (chi la tien ich tren trinh duyet nay,
// giong "da xem" cua chuong thong bao). Trinh duyet chan localStorage -> dung mac dinh.
// rescan: het bai luc nguoi dung ranh (>= 60s) / chua tung quet -> mo camera quet lai (mac dinh, nhu truoc).
//   Tat -> NYX tu chon bai ke: theo cam xuc quet gan nhat, chua quet thi theo gu (/songs/for-you).
const rescanKey = (username) => `emotune_rescan_${username}`;

export const loadRescan = (username) => {
    try { return localStorage.getItem(rescanKey(username)) !== "0"; } catch { return true; }
};

export const saveRescan = (username, on) => {
    try { localStorage.setItem(rescanKey(username), on ? "1" : "0"); } catch { /* che do rieng tu: bo qua */ }
};

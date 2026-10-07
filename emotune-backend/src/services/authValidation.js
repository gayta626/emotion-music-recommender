// Kiem tra du lieu dang ky / dang nhap truoc khi dung toi DB.
// Ham thuan (khong goi DB) -> test duoc ngay bang npm test

// Chuan hoa username: bo khoang trang 2 dau + chu thuong -> " Vinh " va "vinh" la 1 nguoi
const normalizeUsername = (raw) => {
    if (typeof raw !== "string") return "";
    return raw.trim().toLowerCase();
}

const validateCredentials = (rawUsername, password) => {
    const nameRegex = /^[a-z0-9_]{3,30}$/;
    const username = normalizeUsername(rawUsername);

    if (!nameRegex.test(username)) {
        return { ok: false, message: "Username must be 3–30 characters: letters, digits or underscore (_)" };
    }
    // kiem tra kieu truoc: password undefined thi dung luon, khong cham toi .length
    if (typeof password !== "string" || password.length < 6) {
        return { ok: false, message: "Password must be at least 6 characters" };
    }
    // tra username DA CHUAN HOA de luu DB; khong tra password
    return { ok: true, username: username };
}

module.exports = {
    validateCredentials: validateCredentials,
    normalizeUsername: normalizeUsername
}

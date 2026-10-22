// Doi mat khau 1 tai khoan da co (vd truoc khi chia se web ra ngoai: tai khoan admin "demo" dang dung demo1234).
// Chay: npm run set-password -- demo <mat-khau-moi>
// Mat khau toi thieu 10 ky tu (dai hon luat dang ky 6 ky tu: day thuong la tai khoan admin).
// Phien dang nhap cu van dung tiep (token khong phu thuoc mat khau); dang nhap moi phai dung mat khau moi.
const bcrypt = require("bcryptjs");
const db = require("../src/config/db");

const MIN_LENGTH = 10;

const run = async () => {
    const username = (process.argv[2] || "").trim().toLowerCase();
    const password = process.argv[3] || "";
    if (!username || !password) {
        console.error("Thieu ten tai khoan / mat khau. Vi du: npm run set-password -- demo MatKhauRatDai123");
        process.exitCode = 1;
        return;
    }
    if (password.length < MIN_LENGTH) {
        console.error(`Mat khau qua ngan (can it nhat ${MIN_LENGTH} ky tu).`);
        process.exitCode = 1;
        return;
    }
    try {
        const { rowCount } = await db.query(`UPDATE users SET password_hash = $1 WHERE username = $2`,
            [await bcrypt.hash(password, 10), username]);
        if (!rowCount) {
            console.error(`Khong co tai khoan "${username}"`);
            process.exitCode = 1;
        } else {
            console.log(`${username}: da doi mat khau.`);
        }
    } finally {
        await db.pool.end();
    }
};

run();

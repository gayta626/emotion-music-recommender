// Cap / go quyen admin (mo trang /admin theo doi he thong) cho 1 tai khoan da co.
// Chay: npm run set-admin -- gayta626          (cap quyen)
//       npm run set-admin -- gayta626 --off    (go quyen)
const db = require("../src/config/db");

const run = async () => {
    const username = (process.argv[2] || "").trim().toLowerCase();
    if (!username || username.startsWith("--")) {
        console.error("Thieu ten tai khoan. Vi du: npm run set-admin -- gayta626");
        process.exitCode = 1;
        return;
    }
    const role = process.argv.includes("--off") ? "user" : "admin";
    try {
        const { rowCount } = await db.query(`UPDATE users SET role = $1 WHERE username = $2`, [role, username]);
        if (!rowCount) {
            console.error(`Khong co tai khoan "${username}"`);
            process.exitCode = 1;
        } else {
            console.log(`${username}: role = ${role}. Tai lai trang web de thay thay doi.`);
        }
    } finally {
        await db.pool.end();
    }
};

run();

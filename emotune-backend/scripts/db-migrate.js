// Chay 1 file migrate (them bang / cot moi) len DB dang co, KHONG xoa du lieu.
// Chay: npm run db:migrate -- db/migrate_playlists.sql
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const migrate = async () => {
    const file = process.argv[2];
    if (!file) {
        console.error("Thieu ten file. Vi du: npm run db:migrate -- db/migrate_playlists.sql");
        process.exitCode = 1;
        return;
    }
    const sql = fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
    const client = await db.pool.connect();
    try {
        // 1 transaction: loi giua chung thi DB giu nguyen
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");
        console.log(`Da chay ${file}`);
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Loi khi migrate, khong thay doi gi:", err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await db.pool.end();
    }
}

migrate();

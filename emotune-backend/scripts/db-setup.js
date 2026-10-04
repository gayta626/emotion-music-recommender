// Tao lai toan bo DB (bang + du lieu mau) tu db/setup.sql, dung thong tin ket noi trong .env
// Chay: npm run db:setup
// CANH BAO: xoa het du lieu cu (diem, lich su) - chi dung khi cai may moi / muon lam lai tu dau
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const SETUP_FILE = path.join(__dirname, "..", "db", "setup.sql");

let setupDatabase = async () => {
    const sql = fs.readFileSync(SETUP_FILE, "utf8");
    const client = await db.pool.connect();
    try {
        // chay ca file trong 1 transaction: loi giua chung thi DB giu nguyen nhu cu
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");

        const tables = await client.query(
            `SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' ORDER BY table_name`
        );
        const songs = await client.query(`SELECT COUNT(*) AS cnt FROM songs`);
        console.log(`Da tao ${tables.rows.length} bang: ${tables.rows.map(r => r.table_name).join(", ")}`);
        console.log(`Da nap ${songs.rows[0].cnt} bai hat.`);
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Loi khi tao DB, khong thay doi gi:", err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await db.pool.end();
    }
}

setupDatabase();

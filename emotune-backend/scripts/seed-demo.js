// Tao DU LIEU MAU (30 ngay lich su) cho trang thong ke + goi y theo nguoi dung tuong tu.
// Chay: npm run seed-demo        (an toan chay lai: xoa + tao lai DUNG 5 tai khoan mau ben duoi)
// Tai khoan: demo30 (demo chinh), mau_ballad, mau_rap, mau_pop, mau_chill - mat khau deu la demo1234.
// KHONG dong toi tai khoan khac (demo, tai khoan that...). Tat ca trong 1 transaction: loi giua chung -> DB giu nguyen.
// Day la du lieu MAU de minh hoa, khong phai nguoi dung that.
const bcrypt = require("bcryptjs");
const db = require("../src/config/db");
const { PROFILES, generateHistory } = require("./lib/demoHistory");

const PASSWORD = "demo1234";
const SEED = 20261009;

const run = async () => {
    let client = null;
    try {
        client = await db.pool.connect();
        const hash = await bcrypt.hash(PASSWORD, 10);
        const songs = (await client.query(
            `SELECT s.id, s.title, s.emotion, a.name AS artist, g.name AS genre
             FROM songs s LEFT JOIN artists a ON a.id = s.artist_id LEFT JOIN genres g ON g.id = s.genre_id
             ORDER BY s.id`
        )).rows;
        if (!songs.length) throw new Error("Kho nhac trong - chay npm run db:setup tren may moi truoc");
        const artists = (await client.query(`SELECT id, name FROM artists`)).rows;
        const genres = (await client.query(`SELECT id, name FROM genres`)).rows;
        const now = new Date();

        await client.query("BEGIN");
        // xoa tai khoan mau cu -> moi bang con (ON DELETE CASCADE) tu xoa theo
        await client.query(`DELETE FROM users WHERE username = ANY($1)`, [PROFILES.map((p) => p.username)]);

        for (const [i, profile] of PROFILES.entries()) {
            const userId = (await client.query(
                `INSERT INTO users (username, password_hash, survey_done_at) VALUES ($1, $2, NOW()) RETURNING id`,
                [profile.username, hash]
            )).rows[0].id;

            const artistIds = artists.filter((a) => profile.artists.includes(a.name)).map((a) => a.id);
            const genreIds = genres.filter((g) => profile.genres.includes(g.name)).map((g) => g.id);
            if (artistIds.length) {
                await client.query(`INSERT INTO survey_artists (user_id, artist_id) SELECT $1, unnest($2::int[])`, [userId, artistIds]);
            }
            if (genreIds.length) {
                await client.query(`INSERT INTO survey_genres (user_id, genre_id) SELECT $1, unnest($2::int[])`, [userId, genreIds]);
            }

            const h = generateHistory(profile, songs, { seed: SEED + i, now });
            for (const x of h.scans) {
                await client.query(
                    `INSERT INTO mood_history (user_id, emotion, confidence, song_id, action, created_at) VALUES ($1, $2, $3, $4, 'suggested', $5)`,
                    [userId, x.emotion, x.confidence, x.songId, x.at]
                );
            }
            for (const x of h.listens) {
                await client.query(
                    `INSERT INTO mood_history (user_id, emotion, song_id, action, created_at) VALUES ($1, $2, $3, $4, $5)`,
                    [userId, x.emotion, x.songId, x.action, x.at]
                );
            }
            for (const x of h.plays) {
                await client.query(`INSERT INTO recently_played (user_id, song_id, played_at) VALUES ($1, $2, $3)`, [userId, x.songId, x.at]);
            }
            for (const x of h.preferences) {
                await client.query(
                    `INSERT INTO preferences (user_id, emotion, song_id, score) VALUES ($1, $2, $3, $4)`,
                    [userId, x.emotion, x.songId, x.score]
                );
            }
            console.log(`  + ${profile.username}: ${h.scans.length} lan quet, ${h.listens.length} luot nghe, ${h.preferences.length} diem so thich`);
        }

        await client.query("COMMIT");
        console.log(`\nXong. Dang nhap ${PROFILES[0].username} / ${PASSWORD} roi mo /stats. (Du lieu MAU, khong phai nguoi dung that)`);
        console.log("Luu y: id cac tai khoan mau da doi -> neu trinh duyet dang dang nhap bang chung, hay dang xuat roi dang nhap lai.");
    } catch (err) {
        if (client) await client.query("ROLLBACK").catch(() => {});
        console.error("Loi, khong thay doi gi:", err.message || err.code || String(err));
        process.exitCode = 1;
    } finally {
        client?.release();
        await db.pool.end().catch(() => {});
    }
};

run();

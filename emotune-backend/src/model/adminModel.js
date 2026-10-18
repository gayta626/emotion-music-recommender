const db = require("../config/db")

// Trang admin theo doi he thong: so lieu CUA MOI NGUOI DUNG (khong loc 1 user_id) -> chi route co requireAdmin duoc goi.
// $1 = so ngay 1 ky (7 / 30), $2 = nguong "chua chac" (UNSURE_BELOW), $3 = username bi bo qua (tai khoan mau; [] = giu het).

// cac cot dem dung chung: luot quet (camera + chon tay), quet camera (co confidence), tong do tin cay,
// so lan "chua chac", so lan nguoi dung sua cam xuc AI doan (C15: ai_emotion khac emotion),
// luot nghe (moi ket qua sau khi nghe + Not for me), luot nghe het (good)
const COUNT_COLS = `
    COUNT(*) FILTER (WHERE m.action = 'suggested')::int AS scans,
    COUNT(*) FILTER (WHERE m.action = 'suggested' AND m.confidence IS NOT NULL)::int AS cam,
    COALESCE(SUM(m.confidence) FILTER (WHERE m.action = 'suggested'), 0)::float AS conf_sum,
    COUNT(*) FILTER (WHERE m.action = 'suggested' AND m.confidence < $2)::int AS unsure,
    COUNT(*) FILTER (WHERE m.action = 'suggested' AND m.confidence IS NOT NULL
                       AND m.ai_emotion IS NOT NULL AND m.ai_emotion <> m.emotion)::int AS corrected,
    COUNT(*) FILTER (WHERE m.action IN ('good', 'neutral', 'bad', 'declined'))::int AS listens,
    COUNT(*) FILTER (WHERE m.action = 'good')::int AS good`;

// theo ngay, 2 ky lien nhau (ky truoc + ky nay = 2 x $1 ngay, ket thuc hom nay) -> service so sanh 2 ky
let getDailyRows = async (days, unsureBelow, excluded) => (await db.query(
    `SELECT to_char(m.created_at, 'YYYY-MM-DD') AS day, ${COUNT_COLS}
     FROM mood_history m
     JOIN users u ON u.id = m.user_id
     WHERE m.created_at >= CURRENT_DATE - ($1::int * 2 - 1) AND NOT (u.username = ANY($3))
     GROUP BY 1`,
    [days, unsureBelow, excluded])).rows;

// moi nguoi dung co hoat dong trong ky nay 1 dong, nguoi quet nhieu truoc
let getUserRows = async (days, unsureBelow, excluded) => (await db.query(
    `SELECT u.id, u.username, ${COUNT_COLS}, MAX(m.created_at) AS last_at
     FROM mood_history m
     JOIN users u ON u.id = m.user_id
     WHERE m.created_at >= CURRENT_DATE - ($1::int - 1) AND NOT (u.username = ANY($3))
     GROUP BY u.id
     ORDER BY scans DESC, u.id`,
    [days, unsureBelow, excluded])).rows;

module.exports = {
    getDailyRows, getUserRows,
}

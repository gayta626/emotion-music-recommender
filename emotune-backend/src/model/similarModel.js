const db = require("../config/db")

// C13 kNN: du lieu "gu" cua MOI nguoi dung (khong loc 1 user_id - can tat ca de tim nguoi giong).
// Chi tra ve so (id + diem), khong tra ten / thong tin ca nhan; ket qua chi dung de cong diem bai cho nguoi dang dung.
// Moi dong { user_id, key, value }: s<bai> = diem nghe (cong moi cam xuc) hoac ♥, a<ca si> / g<the loai> = khao sat gu.
let getTasteRows = async () => (await db.query(
    `SELECT user_id, 's' || song_id AS key, SUM(score)::float AS value
     FROM preferences GROUP BY user_id, song_id
     UNION ALL
     SELECT user_id, 's' || song_id, 1 FROM liked_songs
     UNION ALL
     SELECT user_id, 'a' || artist_id, 1 FROM survey_artists
     UNION ALL
     SELECT user_id, 'g' || genre_id, 1 FROM survey_genres`
)).rows;

module.exports = { getTasteRows }

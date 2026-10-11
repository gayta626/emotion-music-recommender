-- Migrate I1: bang bai da thich (nut ♥). An toan chay nhieu lan, KHONG dong toi du lieu dang co.
-- Chay: npm run db:migrate -- db/migrate_likes.sql
-- (cung noi dung da duoc them vao setup.sql cho lan cai moi)

CREATE TABLE IF NOT EXISTS liked_songs (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id     INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    liked_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, song_id)
);

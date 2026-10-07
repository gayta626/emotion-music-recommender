-- Migrate: them playlist ca nhan. An toan chay nhieu lan, KHONG dong toi du lieu dang co.
-- Chay: npm run db:migrate -- db/migrate_playlists.sql
-- (cung noi dung da duoc them vao setup.sql cho lan cai moi)

-- Moi playlist thuoc ve 1 nguoi. Ten khong trung trong cung 1 nguoi
CREATE TABLE IF NOT EXISTS playlists (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

-- Bai nam trong playlist. position = thu tu phat (1, 2, 3...). Moi bai chi xuat hien 1 lan / playlist
CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id     INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    added_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (playlist_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_songs_order ON playlist_songs (playlist_id, position);

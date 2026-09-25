-- EmoTune database schema
-- CANH BAO: file nay XOA va TAO LAI toan bo bang (mat het du lieu cu).
-- Chay: psql -U postgres -d postgres -f db/schema.sql
-- Sau do chay tiep db/seed.sql de nap bai hat mau.

DROP TABLE IF EXISTS recently_played, mood_history, preferences, songs CASCADE;

-- Danh sach bai hat. file_path la ten file nam trong thu muc emotune-backend/music/
CREATE TABLE songs (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    artist      TEXT,
    file_path   TEXT NOT NULL,
    emotion     TEXT NOT NULL CHECK (emotion IN ('neutral', 'happy', 'sad', 'angry', 'surprise')),
    energy      REAL CHECK (energy BETWEEN 0 AND 1)
);

-- Diem "so thich" cua nguoi dung voi tung bai, tach theo cam xuc.
-- score la REAL vi delta co the la 0.3 (neutral)
CREATE TABLE preferences (
    id          SERIAL PRIMARY KEY,
    emotion     TEXT NOT NULL,
    song_id     INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    score       REAL NOT NULL DEFAULT 0,
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (emotion, song_id)
);

-- Nhat ky moi lan goi y / phan hoi.
-- suggested: he thong goi y | declined: nguoi dung tu choi
-- good/neutral/bad: ket qua sau khi nghe (theo finishPercent)
CREATE TABLE mood_history (
    id          SERIAL PRIMARY KEY,
    emotion     TEXT NOT NULL,
    confidence  REAL,
    song_id     INTEGER REFERENCES songs(id) ON DELETE SET NULL,
    action      TEXT NOT NULL CHECK (action IN ('suggested', 'declined', 'good', 'neutral', 'bad')),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Cac bai vua nghe, dung de tranh goi y lap lai 3 bai gan nhat
CREATE TABLE recently_played (
    id          SERIAL PRIMARY KEY,
    song_id     INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    played_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mood_history_created_at ON mood_history (created_at);
CREATE INDEX idx_recently_played_played_at ON recently_played (played_at);

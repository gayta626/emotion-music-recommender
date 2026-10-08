-- EmoTune database: tao bang + nap du lieu mau trong 1 lan chay.
-- CANH BAO: file nay XOA va TAO LAI toan bo bang (mat het diem, lich su cu).
-- Chay: npm run db:setup   (doc thong tin DB tu emotune-backend/.env)
-- Khi DB da co du lieu that: KHONG chay lai file nay, viet file migrate_xxx.sql rieng.

-- user_profile: bang cu (truoc khi co tai khoan), van xoa de DB cu khong con sot lai
DROP TABLE IF EXISTS
    playlist_songs, playlists,
    devices, survey_genres, survey_artists, user_profile,
    recently_played, mood_history, preferences,
    songs, genres, artists, users
CASCADE;

-- ============================ BANG ============================

-- Tai khoan nguoi dung. username: chu thuong, so, gach duoi (backend da trim + chuyen chu thuong truoc khi luu)
-- role: chuan bi cho trang admin, chua dung. survey_done_at NULL = chua lam / chua bo qua khao sat gu
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,30}$'),
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    survey_done_at  TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Hop nhac: moi hop 1 dong (hien chi co 'box'). current_user_id NULL = hop trong.
-- last_active_at cu hon 30 phut -> backend coi nhu hop trong (tu nha)
CREATE TABLE devices (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    current_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    claimed_at      TIMESTAMP,
    last_active_at  TIMESTAMP
);

-- Nghe si. avatar la ten file trong emotune-backend/avatars/ (NULL = chua co anh)
CREATE TABLE artists (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    avatar      TEXT,   -- anh tron nho tu cat (avatars/), co the NULL
    photo       TEXT    -- anh vuong co lon (avatars/), do `npm run fetch-images` dien; uu tien hon avatar
);

-- The loai nhac. name viet thuong de khong bi trung kieu "Ballad" / "ballad"
CREATE TABLE genres (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE CHECK (name = LOWER(name))
);

-- Danh sach bai hat. file_path la ten file trong emotune-backend/music/
-- artist_id / genre_id NULL = chua biet (vd nhac khong loi)
CREATE TABLE songs (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    artist_id   INTEGER REFERENCES artists(id) ON DELETE SET NULL,
    genre_id    INTEGER REFERENCES genres(id) ON DELETE SET NULL,
    file_path   TEXT NOT NULL UNIQUE,
    emotion     TEXT NOT NULL CHECK (emotion IN ('neutral', 'happy', 'sad', 'angry', 'surprise')),
    energy      REAL CHECK (energy BETWEEN 0 AND 1),
    cover       TEXT    -- anh bia (covers/), do `npm run fetch-images` dien; NULL -> web tu ve bia
);

-- ===== Du lieu ca nhan: 5 bang duoi deu co user_id -> moi cau SQL dung toi phai loc / ghi user_id =====

-- Diem "so thich" cua TUNG NGUOI voi tung bai, tach theo cam xuc.
-- score la REAL vi delta co the la 0.3 (neutral)
CREATE TABLE preferences (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emotion     TEXT NOT NULL,
    song_id     INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    score       REAL NOT NULL DEFAULT 0,
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, emotion, song_id)
);

-- Nhat ky moi lan goi y / phan hoi.
-- suggested: he thong goi y | declined: nguoi dung tu choi
-- good/neutral/bad: ket qua sau khi nghe (theo finishPercent)
CREATE TABLE mood_history (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emotion     TEXT NOT NULL,
    confidence  REAL,
    song_id     INTEGER REFERENCES songs(id) ON DELETE SET NULL,
    action      TEXT NOT NULL CHECK (action IN ('suggested', 'declined', 'good', 'neutral', 'bad')),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Cac bai vua nghe, dung de tranh goi y lap lai 3 bai gan nhat (cua chinh nguoi do)
CREATE TABLE recently_played (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id     INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    played_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ket qua khao sat gu: ca si va the loai moi nguoi chon (moi muc 1 dong)
CREATE TABLE survey_artists (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id   INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, artist_id)
);

CREATE TABLE survey_genres (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    genre_id    INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, genre_id)
);

-- Playlist ca nhan: moi playlist thuoc 1 nguoi; position = thu tu phat (giong db/migrate_playlists.sql)
CREATE TABLE playlists (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);

CREATE TABLE playlist_songs (
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id     INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    added_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (playlist_id, song_id)
);

CREATE INDEX idx_playlist_songs_order ON playlist_songs (playlist_id, position);
CREATE INDEX idx_mood_history_user_created ON mood_history (user_id, created_at);
CREATE INDEX idx_recently_played_user_played ON recently_played (user_id, played_at);

-- ========================== DU LIEU ==========================

INSERT INTO artists (name, avatar) VALUES
    ('Phạm Hoài Nam',    'pham-hoai-nam.png'),
    ('Lân Nhã',          'lan-nha.png'),
    ('Lệ Quyên',         'le-quyen.png'),
    ('Sơn Tùng M-TP',    'son-tung.png'),
    ('Obito',            'obito.png'),
    ('HIEUTHUHAI',       'hieuthuhai.png'),
    -- ca si cua cac bai hat, chua co anh
    ('Noo Phước Thịnh',  NULL),
    ('GUrbane',          NULL),
    ('Taylor Swift',     NULL),
    ('Da LAB',           NULL),
    ('RPT MCK',          NULL);

INSERT INTO genres (name) VALUES
    ('pop'),
    ('ballad'),
    ('rap'),
    ('thư giãn');

-- Bai hat mau: 2 bai cho moi cam xuc. Ca si lay tu the ID3 trong file mp3, the loai do doan:
-- "Khó Giữ Chân Thành" va "Giấc Mơ Có Thật" chua chac la ballad -> sua lai neu sai.
-- File mp3 phai co DUNG ten trong cot file_path (dung "npm run rename-music -- --apply").
INSERT INTO songs (title, artist_id, genre_id, file_path, emotion, energy)
SELECT v.title, a.id, g.id, v.file_path, v.emotion, v.energy
FROM (VALUES
    ( 1, 'Có Chắc Yêu Là Đây',                       'Sơn Tùng M-TP',   'pop',      'co_chac_yeu_la_day.mp3',                    'happy',    0.8),
    ( 2, 'Muộn Rồi Mà Sao Còn',                      'Sơn Tùng M-TP',   'pop',      'muon_roi_ma_sao_con.mp3',                   'happy',    0.6),
    ( 3, 'Giá Như',                                  'Noo Phước Thịnh', 'ballad',   'gia_nhu.mp3',                               'sad',      0.3),
    ( 4, 'Khó Giữ Chân Thành',                       'GUrbane',         'ballad',   'kho_giu_chan_thanh.mp3',                    'sad',      0.3),
    ( 5, 'Meditation',                               NULL,              'thư giãn', 'meditation.mp3',                            'angry',    0.1),
    ( 6, 'Reduce Stress',                            NULL,              'thư giãn', 'reduce_stress.mp3',                         'angry',    0.1),
    ( 7, 'Blank Space',                              'Taylor Swift',    'pop',      'blank_space.mp3',                           'surprise', 0.7),
    ( 8, 'CILU',                                     'Da LAB',          'rap',      'cilu.mp3',                                  'surprise', 0.7),
    ( 9, 'Giấc Mơ Có Thật',                          'Lệ Quyên',        'ballad',   'giac_mo_co_that.mp3',                       'neutral',  0.5),
    (10, 'Nếu Như Ta Chẳng Còn (feat. A$AP Ướt Mi)', 'RPT MCK',         'rap',      'neu_nhu_ta_chang_con_feat_a_ap_uot_mi.mp3', 'neutral',  0.5)
) AS v (ord, title, artist_name, genre_name, file_path, emotion, energy)
LEFT JOIN artists a ON a.name = v.artist_name
LEFT JOIN genres  g ON g.name = v.genre_name
-- giu dung thu tu trong danh sach -> id 1..10 on dinh moi lan chay
ORDER BY v.ord;

-- Tai khoan demo de thu khi chua co trang dang ky: demo / demo1234 (hash bcrypt, cost 10)
INSERT INTO users (username, password_hash)
VALUES ('demo', '$2b$10$IQUuTw9A3.qaN5E1qQ024uOSK9kx.ULm7PDx2NMjRJDtPuVPdGk/.');

-- Hop nhac duy nhat, chua ai dung
INSERT INTO devices (id, name) VALUES ('box', 'Hộp nhạc EmoTune');

-- Migrate: them thong tin bai hat cho bang bai kieu Spotify (cot Album, Date added, thoi luong). An toan chay nhieu lan,
-- KHONG dong toi du lieu dang co.
-- Chay: npm run db:migrate -- db/migrate_song_info.sql   roi   npm run fetch-song-info
-- (cung noi dung da duoc them vao setup.sql cho lan cai moi)

-- ten album (lay tu iTunes, bo duoi " - Single" / " - EP"); NULL = chua biet -> web hien "—"
ALTER TABLE songs ADD COLUMN IF NOT EXISTS album TEXT;

-- thoi luong (giay), doc tu header file mp3; NULL = chua do / thieu file
ALTER TABLE songs ADD COLUMN IF NOT EXISTS duration INTEGER;

-- luc bai duoc them vao kho nhac (cot "Date added" o trang mix). Bai co san luc migrate -> lay thoi diem chay migrate
ALTER TABLE songs ADD COLUMN IF NOT EXISTS added_at TIMESTAMP NOT NULL DEFAULT NOW();

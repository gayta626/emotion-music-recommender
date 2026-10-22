-- Migrate: do lech giua MV YouTube va file mp3 (giay) de doi qua lai mp3 <-> MV ma nhac noi tiep dung doan.
-- An toan chay nhieu lan, KHONG dong toi du lieu dang co.
-- Chay: npm run db:migrate -- db/migrate_mv_offset.sql   roi   npm run align-mv
-- (cung noi dung da duoc them vao setup.sql cho lan cai moi)

-- MV giay (t + mv_offset) = mp3 giay t; NULL = chua do / do khong chac -> web quy doi theo ti le do dai nhu cu
ALTER TABLE songs ADD COLUMN IF NOT EXISTS mv_offset REAL;

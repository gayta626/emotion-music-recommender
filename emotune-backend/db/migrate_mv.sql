-- Migrate H16: id video MV tren YouTube cho tung bai. An toan chay nhieu lan, KHONG dong toi du lieu dang co.
-- Chay: npm run db:migrate -- db/migrate_mv.sql   roi   npm run fetch-mv
-- (cung noi dung da duoc them vao setup.sql cho lan cai moi)

-- NULL = chua tim; '' = da tim nhung khong co MV chac dung bai (fetch-mv khong tim lai, do ton han muc)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS youtube_id TEXT;

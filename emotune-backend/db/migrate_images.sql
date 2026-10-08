-- Migrate: them cot anh (anh bia bai hat + anh ca si co lon). An toan chay nhieu lan, KHONG dong toi du lieu dang co.
-- Chay: npm run db:migrate -- db/migrate_images.sql   roi   npm run fetch-images
-- (cung noi dung da duoc them vao setup.sql cho lan cai moi)

-- ten file anh bia trong emotune-backend/covers/ (vd gia_nhu.jpg); NULL = chua co -> web tu ve bia theo vibe
ALTER TABLE songs ADD COLUMN IF NOT EXISTS cover TEXT;

-- anh ca si vuong co lon trong emotune-backend/avatars/ (vd son-tung-m-tp.jpg); NULL -> dung avatar nho
ALTER TABLE artists ADD COLUMN IF NOT EXISTS photo TEXT;

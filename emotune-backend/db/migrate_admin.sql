-- Migrate quan ly tai khoan tren trang admin: cot khoa tai khoan. An toan chay nhieu lan, KHONG dong toi du lieu dang co.
-- Chay: npm run db:migrate -- db/migrate_admin.sql
-- (cung noi dung da duoc them vao setup.sql cho lan cai moi)

-- locked_at NULL = dang dung binh thuong; co gia tri = admin da khoa (khong dang nhap duoc, token cu bi tu choi)
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP;

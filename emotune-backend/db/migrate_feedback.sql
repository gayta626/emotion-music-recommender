-- Migrate C15 vong phan hoi model cam xuc. An toan chay nhieu lan, KHONG dong toi du lieu dang co.
-- Chay: npm run db:migrate -- db/migrate_feedback.sql
-- (cung noi dung da duoc them vao setup.sql cho lan cai moi)

-- ai_emotion: cam xuc AI DOAN khi nguoi dung da sua / xac nhan lai (emotion luc do = cam xuc nguoi dung chon).
-- NULL = nguoi dung khong sua (lan quet camera dung luon ket qua AI) hoac tu chon cam xuc bang tay.
-- ai_emotion <> emotion = 1 lan AI doan sai -> chi so "Mood corrections" tren trang /admin
ALTER TABLE mood_history ADD COLUMN IF NOT EXISTS ai_emotion TEXT
    CHECK (ai_emotion IN ('neutral', 'happy', 'sad', 'angry', 'surprise'));

-- face_consent_at: luc nguoi dung dong y luu anh mat khi sua cam xuc (de train lai model). NULL = khong dong y (mac dinh)
ALTER TABLE users ADD COLUMN IF NOT EXISTS face_consent_at TIMESTAMP;

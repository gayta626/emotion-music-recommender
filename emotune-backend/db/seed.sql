-- Bai hat mau: 2 bai cho moi cam xuc.
-- File mp3 dat trong emotune-backend/music/ voi DUNG ten trong cot file_path
-- (dung "npm run rename-music -- --apply" de doi ten file cho chuan).
-- artist = NULL: chua dien, sua lai trong DBeaver neu can.
-- Chay: psql -U postgres -d postgres -f db/seed.sql

INSERT INTO songs (title, artist, file_path, emotion, energy) VALUES
    ('Có Chắc Yêu Là Đây',                     'Sơn Tùng M-TP', 'co_chac_yeu_la_day.mp3',                    'happy',    0.8),
    ('Muộn Rồi Mà Sao Còn',                    'Sơn Tùng M-TP', 'muon_roi_ma_sao_con.mp3',                   'happy',    0.6),
    ('Giá Như',                                NULL,            'gia_nhu.mp3',                               'sad',      0.3),
    ('Khó Giữ Chân Thành',                     NULL,            'kho_giu_chan_thanh.mp3',                    'sad',      0.3),
    ('Meditation',                             NULL,            'meditation.mp3',                            'angry',    0.1),
    ('Reduce Stress',                          NULL,            'reduce_stress.mp3',                         'angry',    0.1),
    ('Blank Space',                            'Taylor Swift',  'blank_space.mp3',                           'surprise', 0.7),
    ('CILU',                                   NULL,            'cilu.mp3',                                  'surprise', 0.7),
    ('Giấc Mơ Có Thật',                        NULL,            'giac_mo_co_that.mp3',                       'neutral',  0.5),
    ('Nếu Như Ta Chẳng Còn (feat. A$AP Ướt Mi)', NULL,          'neu_nhu_ta_chang_con_feat_a_ap_uot_mi.mp3', 'neutral',  0.5)
-- chay lai file nhieu lan khong bi nhan doi bai (can UNIQUE file_path trong schema.sql)
ON CONFLICT (file_path) DO NOTHING;

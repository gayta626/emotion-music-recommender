-- Bai hat mau: 3 bai cho moi cam xuc.
-- Doi title/artist thanh bai that cua ban, va dat file mp3 tuong ung
-- vao emotune-backend/music/ voi DUNG ten trong cot file_path.
-- Chay: psql -U postgres -d postgres -f db/seed.sql

INSERT INTO songs (title, artist, file_path, emotion, energy) VALUES
    ('Happy Song 1',    'Artist A', 'happy_01.mp3',    'happy',    0.8),
    ('Happy Song 2',    'Artist B', 'happy_02.mp3',    'happy',    0.9),
    ('Happy Song 3',    'Artist C', 'happy_03.mp3',    'happy',    0.7),
    ('Sad Song 1',      'Artist A', 'sad_01.mp3',      'sad',      0.2),
    ('Sad Song 2',      'Artist B', 'sad_02.mp3',      'sad',      0.3),
    ('Sad Song 3',      'Artist C', 'sad_03.mp3',      'sad',      0.25),
    ('Angry Song 1',    'Artist A', 'angry_01.mp3',    'angry',    0.9),
    ('Angry Song 2',    'Artist B', 'angry_02.mp3',    'angry',    0.85),
    ('Angry Song 3',    'Artist C', 'angry_03.mp3',    'angry',    0.95),
    ('Neutral Song 1',  'Artist A', 'neutral_01.mp3',  'neutral',  0.5),
    ('Neutral Song 2',  'Artist B', 'neutral_02.mp3',  'neutral',  0.4),
    ('Neutral Song 3',  'Artist C', 'neutral_03.mp3',  'neutral',  0.55),
    ('Surprise Song 1', 'Artist A', 'surprise_01.mp3', 'surprise', 0.7),
    ('Surprise Song 2', 'Artist B', 'surprise_02.mp3', 'surprise', 0.75),
    ('Surprise Song 3', 'Artist C', 'surprise_03.mp3', 'surprise', 0.65);

// npm test: chon dung MV chinh thuc trong ket qua tim YouTube (scripts/lib/youtube.js)
const test = require('node:test');
const assert = require('node:assert');
const { pickVideo, mainArtist } = require('../scripts/lib/youtube');

const v = (id, title, channel) => ({ id, title, channel });

test('lay MV chinh thuc, bo ban cover / karaoke / lyrics', () => {
    const items = [
        v('cover', 'Perfect - Ed Sheeran (Cover by Someone)', 'Someone Music'),
        v('lyric', 'Ed Sheeran - Perfect (Lyrics)', '7clouds'),
        v('mv', 'Ed Sheeran - Perfect (Official Music Video)', 'Ed Sheeran'),
        v('kara', 'Perfect Karaoke - Ed Sheeran', 'Sing King'),
    ];
    assert.strictEqual(pickVideo(items, 'Perfect', 'Ed Sheeran').id, 'mv');
});

test('so khop khong dau, kenh la ca si', () => {
    const items = [v('a', 'SƠN TÙNG M-TP | CHÚNG TA CỦA HIỆN TẠI | OFFICIAL MUSIC VIDEO', 'Sơn Tùng M-TP Official')];
    assert.strictEqual(pickVideo(items, 'Chúng Ta Của Hiện Tại', 'Sơn Tùng M-TP').id, 'a');
});

test('ca si phai khop ten video hoac ten kenh (khac bai trung ten -> bo)', () => {
    const items = [v('x', 'Perfect (Official Video)', 'One Direction')];
    assert.strictEqual(pickVideo(items, 'Perfect', 'Ed Sheeran'), null);
});

test('ten bai phai la ca cum, khong khop nua chu', () => {
    const items = [v('x', 'Đen - Anh Đếch Cần Gì Nhiều Ngoài Em (MV)', 'Đen Vâu Official')];
    assert.strictEqual(pickVideo(items, 'Em', 'Đen'), null);
});

test('chi co ban lyrics -> van lay (kem hon MV)', () => {
    const items = [v('l', 'Vũ. - Lạ Lùng (Lyrics Video)', 'Vũ.')];
    assert.strictEqual(pickVideo(items, 'Lạ Lùng', 'Vũ.').id, 'l');
});

test('ten bai co chu "Live" thi khong bi coi la ban live', () => {
    const items = [v('a', 'Artist - Live Forever (Official MV)', 'Artist')];
    assert.strictEqual(pickVideo(items, 'Live Forever', 'Artist').id, 'a');
});

test('nhieu ca si: so khop theo ca si chinh, bo phan trong ngoac cua ten bai', () => {
    assert.strictEqual(mainArtist('Vũ. ft. Hà Nhi'), 'Vũ.');
    assert.strictEqual(mainArtist('Đen, MIN'), 'Đen');
    const items = [v('a', 'Đen - Nếu Như Ta Chẳng Còn ft. MIN (M/V)', 'Đen Vâu Official')];
    assert.strictEqual(pickVideo(items, 'Nếu Như Ta Chẳng Còn (feat. MIN)', 'Đen, MIN').id, 'a');
});

test('khong co ket qua / thieu ca si -> null', () => {
    assert.strictEqual(pickVideo([], 'Perfect', 'Ed Sheeran'), null);
    assert.strictEqual(pickVideo([v('a', 'Meditation music', 'Calm')], 'Meditation', null), null);
});

test('bo video hau truong / san khau trao giai / ban upscale', () => {
    const making = [v('m', 'SƠN TÙNG M-TP | CHÚNG TA CỦA HIỆN TẠI | MAKING MV', 'Sơn Tùng M-TP Official')];
    assert.strictEqual(pickVideo(making, 'Chúng Ta Của Hiện Tại', 'Sơn Tùng M-TP'), null);
    const awards = [v('a', "Justin Bieber - 'Sorry' (American Music Awards) 2015 | Official", 'Justin Bieber HD')];
    assert.strictEqual(pickVideo(awards, 'Sorry', 'Justin Bieber'), null);
    const upscale = [v('u', 'Taylor Swift - Blank Space (4K 60FPS) (Official Video)', 'AIUpscalia')];
    assert.strictEqual(pickVideo(upscale, 'Blank Space', 'Taylor Swift'), null);
});

test('ban loi bai do kenh la dang lai -> bo', () => {
    const items = [v('f', 'Chỉ Một Đêm Nữa Thôi | RPT MCK - ft tlinh (Lyrics)', 'LikeSunshine')];
    assert.strictEqual(pickVideo(items, 'Chỉ Một Đêm Nữa Thôi', 'RPT MCK'), null);
});

test('kenh VEVO viet lien van tinh la kenh ca si', () => {
    const items = [v('a', 'Lana Del Rey - Say Yes To Heaven (Official Audio)', 'LanaDelReyVEVO')];
    assert.strictEqual(pickVideo(items, 'Say Yes To Heaven', 'Lana Del Rey').id, 'a');
});

test('ban dang lai kem phu de Trung / Han -> bo', () => {
    const items = [v('c', 'Taylor Swift-Blank Space [MV] 中文字幕', 'LittleCat')];
    assert.strictEqual(pickVideo(items, 'Blank Space', 'Taylor Swift'), null);
});

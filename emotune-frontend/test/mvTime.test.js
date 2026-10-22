// Doi thoi diem mp3 <-> MV (utils/mvTime.js) va ghi doan MV vao truc tien do bai. Chay: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { songToMv, mvToSong } from '../src/utils/mvTime.js';
import { addMvSpan, coveredFraction } from '../src/utils/listenSpans.js';

// bai Buong doi tay nhau ra: mp3 226s, MV 289s co 14.34s canh mo dau (npm run align-mv)
const sync = { offset: 14.34, songDur: 226, mvDur: 289 };

test('co do lech: mp3 giay t -> MV giay t + offset (khong quy theo ti le)', () => {
  assert.equal(songToMv(60, sync), 74.34);
  assert.equal(mvToSong(74.34, sync), 60);
});

test('dang o canh mo dau MV (truoc khi vao nhac) -> mp3 o dau bai', () => {
  assert.equal(mvToSong(5, sync), 0);
});

test('canh ket MV (sau khi het nhac) -> mp3 cuoi bai, khong vuot qua do dai', () => {
  assert.equal(mvToSong(280, sync), 226);
});

test('chua do lech (null) -> quy theo ti le do dai nhu cu', () => {
  const ratio = { offset: null, songDur: 200, mvDur: 240 };
  assert.equal(songToMv(100, ratio), 120);
  assert.equal(mvToSong(120, ratio), 100);
});

test('thieu do dai -> giu nguyen thoi diem', () => {
  assert.equal(songToMv(30, { offset: null, songDur: 0, mvDur: 240 }), 30);
});

test('doan MV xem duoc quy ve truc bai theo do lech: nua dau mp3 + nua sau MV = het bai', () => {
  let spans = [[0, 0.5]];                                   // mp3 0..113s
  spans = addMvSpan(spans, 113 + 14.34, 226 + 14.34, sync); // MV phan con lai cua bai
  assert.equal(coveredFraction(spans), 1);
  // xem canh mo dau MV khong tinh la da nghe bai
  assert.deepEqual(addMvSpan([], 0, 14, sync), []);
});

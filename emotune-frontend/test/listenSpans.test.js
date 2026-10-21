// Cham diem nghe (utils/listenSpans.js): gop doan mp3 + MV tren cung truc tien do bai. Chay: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { addSpan, coveredFraction, spansFromPlayed } from '../src/utils/listenSpans.js';

const ranges = (...pairs) => ({ length: pairs.length, start: (i) => pairs[i][0], end: (i) => pairs[i][1] });

test('nua dau mp3 + nua sau MV = nghe het bai', () => {
  let spans = spansFromPlayed(ranges([0, 100]), 200);
  spans = addSpan(spans, 100, 200, 200);
  assert.equal(coveredFraction(spans), 1);
});

test('MV dai hon mp3: quy theo ti le do dai cua tung nguon', () => {
  let spans = spansFromPlayed(ranges([0, 100]), 200);   // mp3 200s: [0, 0.5]
  spans = addSpan(spans, 120, 240, 240);                  // MV 240s: [0.5, 1]
  assert.equal(coveredFraction(spans), 1);
});

test('nghe lai cung 1 doan chi tinh 1 lan', () => {
  let spans = spansFromPlayed(ranges([0, 60]), 200);
  spans = addSpan(spans, 30, 60, 200);
  assert.equal(coveredFraction(spans), 0.3);
});

test('doan roi nhau cong lai, doi nguon mp3 -> nhac dem van giu doan cu', () => {
  const before = spansFromPlayed(ranges([0, 20], [100, 120]), 200);
  const after = spansFromPlayed(ranges([150, 170]), 200);
  assert.ok(Math.abs(coveredFraction([...before, ...after]) - 0.3) < 1e-9);
});

test('do dai 0 / doan rong / vuot qua cuoi bai', () => {
  assert.deepEqual(addSpan([], 0, 10, 0), []);
  assert.deepEqual(addSpan([], 10, 10, 200), []);
  assert.equal(coveredFraction(addSpan([], 150, 250, 200)), 0.25);
  assert.equal(coveredFraction([]), 0);
});

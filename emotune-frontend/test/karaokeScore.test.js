// Cham diem karaoke (utils/karaokeScore.js): YIN do cao do, so not voi ca si, diem hien len the. Chay: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import * as k from '../src/utils/karaokeScore.js';
const sine = (hz, sr = 48000, n = 2048, harm = true) => Float32Array.from({ length: n }, (_, i) => Math.sin(2*Math.PI*hz*i/sr) + (harm ? 0.5*Math.sin(4*Math.PI*hz*i/sr) + 0.3*Math.sin(6*Math.PI*hz*i/sr) : 0));
test('detectPitch nhan dung cao do giong (co hai am)', () => {
  for (const hz of [98, 196, 220, 330, 440, 660, 880]) {
    const got = k.detectPitch(sine(hz), 48000);
    assert.ok(got && Math.abs(k.hzToMidi(got) - k.hzToMidi(hz)) < 0.15, `${hz} -> ${got}`);
  }
});
test('detectPitch: tieng on trang -> null', () => {
  let s = 1; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
  assert.equal(k.detectPitch(Float32Array.from({ length: 2048 }, rnd), 48000), null);
  assert.equal(k.detectPitch(new Float32Array(2048), 48000), null);
});
test('pitchClassDistance bo qua quang tam', () => {
  assert.equal(k.pitchClassDistance(60, 72), 0);
  assert.equal(k.pitchClassDistance(60, 71), 1);
  assert.equal(k.pitchClassDistance(60, 66), 6);
});
const track = { hop: 0.05, pitch: Array.from({ length: 400 }, (_, i) => (i % 40 < 30 ? 640 : 0)) }; // hat 30/40 khung, not E4
const run = (userAt) => { const st = k.emptyStats(); for (let i = 0; i < 400; i++) k.judgeFrame(st, track, i * 0.05, userAt(i)); return k.scoreFromStats(st); };
test('hat dung luc + dung not (thap hon 1 quang tam) -> 100', () => {
  const r = run((i) => (i % 40 < 30 ? 52 : null)); assert.equal(r.enough, true); assert.equal(r.score, 100);
});
test('im lang -> chua du de cham', () => { const r = run(() => null); assert.equal(r.enough, false); assert.equal(r.onTime, 0); });
test('hat dung luc nhung lech not 3 cung -> On key 0', () => {
  const r = run((i) => (i % 40 < 30 ? 67 : null)); assert.equal(r.onTime, 100); assert.equal(r.onKey, 0); assert.equal(r.score, 60);
});
test('hat nua thoi gian (+ do nuong 0.3s) -> On time ~88', () => { const r = run((i) => (i % 40 < 15 ? 64 : null)); assert.ok(r.onTime >= 84 && r.onTime <= 92, String(r.onTime)); assert.equal(r.enough, true); });
test('hat tre 0.25s van du On time', () => { const r = run((i) => ((i - 5) % 40 >= 0 && (i - 5) % 40 < 30 && i >= 5 ? 64 : null)); assert.equal(r.onTime, 100); assert.equal(r.onKey, 100); });
test('parseKaraokeTrack kiem dinh dang', () => {
  assert.equal(k.parseKaraokeTrack({ v: 2, hop: 0.05, pitch: [] }), null);
  assert.deepEqual(k.parseKaraokeTrack({ v: 1, hop: 0.05, pitch: [0, 640] }), { hop: 0.05, pitch: [0, 640] });
  assert.equal(k.karaokeBaseName({ file_path: 'gia_nhu.mp3' }), 'gia_nhu');
});

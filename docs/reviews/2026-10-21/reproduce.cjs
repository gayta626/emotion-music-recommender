// Kiểm tra tái hiện lỗi trên source hiện tại; mock DB, không sửa dữ liệu thật.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const findings = [];
function loadModule(file, deps, extra = {}) {
  const context = { module: { exports: {} }, require: (name) => {
    if (!(name in deps)) throw new Error(`Unexpected dependency: ${name}`);
    return deps[name];
  }, console, ...extra };
  vm.runInNewContext(read(file), context, { filename: file });
  return context.module.exports;
}
function functionFrom(file, start, end, context) {
  const source = read(file);
  const from = source.indexOf(start);
  assert.ok(from >= 0);
  const to = source.indexOf(end, from);
  assert.ok(to > from);
  vm.runInNewContext(source.slice(from, to), context);
}
async function main() {
  // Logic phân loại lượt nghe thật, thay model bằng bộ ghi trong RAM.
  const writes = [];
  const service = loadModule('emotune-backend/src/services/listenReportService.js', {
    '../model/listenReportModel': { feedBackSongListened: async (...args) => {
      writes.push(args); return { status: 'ok', delta: args[3] };
    } },
  });
  const controller = loadModule('emotune-backend/src/controllers/listenReportController.js', {
    '../services/listenReportService': service,
  });
  for (const invalid of [undefined, null, 'abc', {}]) {
    const res = { status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } };
    await controller.submitListenReport({ userId: 1, body: { emotion: 'happy', songId: 1, finishPercent: invalid } }, res);
    assert.equal(res.code, 200);
    findings.push({ bug: 'invalid-listen-progress', input: invalid === undefined ? '(missing)' : invalid, status: res.code, delta: res.body.delta });
  }

  // Gọi service sửa mood thật với đồng hồ giả và dependency không có I/O.
  let now = 100000;
  let deleted = [];
  let result = { song: { id: 2 }, emotion: 'happy' };
  const mood = loadModule('emotune-backend/src/services/moodFixService.js', {
    crypto: require('node:crypto'),
    '../model/suggestModel': { deleteSuggestion: async (...args) => deleted.push(args) },
    '../model/profileModel': { hasFaceConsent: async () => false },
    './suggestService': { generateSuggestion: async () => result, publicResult: (r) => r },
    './faceSamples': { saveFace: () => { throw new Error('Must not write photos'); } },
    './adminService': { UNSURE_BELOW: 0.6 },
  }, { Date: { now: () => now } });
  const expired = mood.rememberScan(1, { emotion: 'sad', confidence: 0.7 });
  now += mood.SCAN_TTL_MS + 1;
  const accepted = await mood.fixMood(1, expired, 'happy');
  assert.ok(accepted.song);
  findings.push({ bug: 'expired-scan-accepted', ageMs: mood.SCAN_TTL_MS + 1 });
  const failed = mood.rememberScan(1, { emotion: 'sad', confidence: 0.7 });
  mood.attachHistory(failed, 123);
  result = null;
  await assert.rejects(() => mood.fixMood(1, failed, 'happy'), { status: 404 });
  assert.equal(deleted[0][1], 123);
  result = { song: { id: 2 } };
  await assert.rejects(() => mood.fixMood(1, failed, 'happy'), { status: 410 });
  findings.push({ bug: 'failed-correction-consumes-scan-and-deletes-history', firstStatus: 404, retryStatus: 410, deletedHistory: 123 });

  // Hàm tính tỷ lệ lấy nguyên văn từ component, chỉ mock HTMLMediaElement.
  const player = {
    audioRef: { current: { duration: 200, played: { length: 1, start: () => 0, end: () => 100 } } },
    playedBeforeRef: { current: 0 },
    mvWatchRef: { current: { duration: 200, seconds: 100 } },
    console: { log() {} },
  };
  functionFrom('emotune-frontend/src/components/MusicPlayer.jsx', '    const listenedFraction = () => {', '    const finishAndSend', player);
  const fraction = vm.runInNewContext('listenedFraction()', player);
  assert.equal(fraction, 0.5);
  findings.push({ bug: 'split-mp3-mv-listen-undercounted', scenario: 'First half MP3, second half MV, equal durations', expected: 1, actual: fraction });

  // State giống các lần render liên tiếp của HeaderSearch.
  const search = { songs: null, calls: 0 };
  search.setSongs = (v) => { search.songs = v; };
  search.api = { get: async () => { search.calls++; throw new Error('Temporary network failure'); } };
  functionFrom('emotune-frontend/src/components/HeaderSearch.jsx', '    const loadSongs = () => {', '    useEffect', search);
  vm.runInNewContext('loadSongs()', search);
  await new Promise(setImmediate);
  vm.runInNewContext('loadSongs()', search);
  await new Promise(setImmediate);
  assert.equal(search.calls, 1);
  findings.push({ bug: 'search-cannot-retry-after-network-failure', focusAttempts: 2, requests: search.calls });

  const storage = new Map();
  const session = { sessionStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } };
  vm.runInNewContext(read('emotune-frontend/src/utils/moodSession.js').replaceAll('export ', ''), session);
  vm.runInNewContext("markScanned(); saveLastMood('sad');", session);
  let token = 'user-A';
  const logout = { clearToken: () => { token = null; }, navigate() {} };
  functionFrom('emotune-frontend/src/contexts/AuthProvider.jsx', '    const logout = () => {', '    // làm/bỏ qua', logout);
  vm.runInNewContext('logout()', logout);
  assert.equal(token, null);
  token = 'user-B';
  const inherited = vm.runInNewContext('({ scanned: hasScanned(), emotion: loadLastMood().emotion })', session);
  assert.equal(inherited.emotion, 'sad');
  assert.equal(inherited.scanned, true);
  findings.push({ bug: 'mood-session-survives-account-switch', secondAccount: inherited });
  console.log(JSON.stringify({ reproduced: findings }, null, 2));
}
main().catch((err) => { console.error(err); process.exitCode = 1; });

// C15 sua cam xuc (moodFixService.fixMood) + kiem tra body /listen-report (checkListenReport).
// Model / service DB duoc thay bang ham gia -> khong can PostgreSQL.
const test = require("node:test");
const assert = require("node:assert");
const suggestModel = require("../src/model/suggestModel");
const suggestService = require("../src/services/suggestService");
const profileModel = require("../src/model/profileModel");
const moodFix = require("../src/services/moodFixService");
const { checkListenReport } = require("../src/services/listenReportService");

const OLD_ROW = { id: 7, user_id: 1, emotion: "sad", action: "suggested" };

// gia lap DB: `history` = cac dong mood_history con lai; generate() quyet dinh tao bai moi thanh cong hay khong
const fakeDb = (generate) => {
    const history = new Map([[OLD_ROW.id, OLD_ROW]]);
    suggestModel.deleteSuggestion = async (userId, id) => {
        const row = history.get(id);
        history.delete(id);
        return row || null;
    };
    suggestModel.restoreSuggestion = async (row) => { history.set(row.id, row); };
    suggestService.generateSuggestion = generate;
    profileModel.hasFaceConsent = async () => false;
    return history;
};

const newScan = () => {
    const scanId = moodFix.rememberScan(1, { emotion: "sad", confidence: 0.41, face: null });
    moodFix.attachHistory(scanId, OLD_ROW.id);
    return scanId;
};

test("fixMood: khong co bai -> 404, dong lich su cu duoc tra lai, bam lai cung luot quet van duoc", async () => {
    let ok = false;
    const history = fakeDb(async () => (ok ? { song: { id: 3 }, emotion: "happy", historyId: 9 } : null));
    const scanId = newScan();

    await assert.rejects(moodFix.fixMood(1, scanId, "happy"), { status: 404 });
    assert.ok(history.has(OLD_ROW.id), "dong cu phai con");

    ok = true;
    const result = await moodFix.fixMood(1, scanId, "happy");
    assert.strictEqual(result.song.id, 3);
    assert.strictEqual(result.corrected, true);
    assert.ok(!history.has(OLD_ROW.id), "sua thanh cong -> bo dong cu");
    // da dung het luot quet
    await assert.rejects(moodFix.fixMood(1, scanId, "happy"), { status: 410 });
});

test("fixMood: loi DB khi tao bai moi -> tra lai dong cu, giu luot quet", async () => {
    const history = fakeDb(async () => { throw new Error("db down"); });
    const scanId = newScan();
    await assert.rejects(moodFix.fixMood(1, scanId, "happy"), /db down/);
    assert.ok(history.has(OLD_ROW.id));
    suggestService.generateSuggestion = async () => ({ song: { id: 4 }, emotion: "happy" });
    assert.strictEqual((await moodFix.fixMood(1, scanId, "happy")).song.id, 4);
});

test("fixMood: 2 lan sua cung luc -> lan sau 409", async () => {
    let release;
    fakeDb(() => new Promise((resolve) => { release = () => resolve({ song: { id: 5 }, emotion: "happy" }); }));
    const scanId = newScan();
    const first = moodFix.fixMood(1, scanId, "happy");
    await assert.rejects(moodFix.fixMood(1, scanId, "sad"), { status: 409 });
    await new Promise((r) => setImmediate(r));
    release();
    assert.strictEqual((await first).song.id, 5);
});

test("fixMood: luot quet qua 30 phut -> 410 du khong co luot quet moi", async (t) => {
    fakeDb(async () => ({ song: { id: 6 }, emotion: "happy" }));
    const scanId = newScan();
    const now = Date.now();
    t.mock.method(Date, "now", () => now + moodFix.SCAN_TTL_MS + 1000);
    await assert.rejects(moodFix.fixMood(1, scanId, "happy"), { status: 410 });
});

test("fixMood: luot quet cua nguoi khac -> 410", async () => {
    fakeDb(async () => ({ song: { id: 6 }, emotion: "happy" }));
    const scanId = newScan();
    await assert.rejects(moodFix.fixMood(2, scanId, "happy"), { status: 410 });
});

test("checkListenReport: chi nhan finishPercent la so trong [0, 1]", () => {
    const ok = { emotion: "sad", songId: 3 };
    assert.strictEqual(checkListenReport({ ...ok, finishPercent: 0 }), null);
    assert.strictEqual(checkListenReport({ ...ok, finishPercent: 0.55 }), null);
    assert.strictEqual(checkListenReport({ ...ok, finishPercent: 1 }), null);
    for (const bad of [undefined, null, "abc", "0.5", {}, [], NaN, Infinity, -0.1, 1.01]) {
        assert.ok(checkListenReport({ ...ok, finishPercent: bad }), `phai tu choi ${String(bad)}`);
    }
});

test("checkListenReport: cam xuc + songId sai bi tu choi", () => {
    assert.ok(checkListenReport({ emotion: "bored", songId: 3, finishPercent: 1 }));
    assert.ok(checkListenReport({ songId: 3, finishPercent: 1 }));
    assert.ok(checkListenReport({ emotion: "sad", songId: "3", finishPercent: 1 }));
    assert.ok(checkListenReport({ emotion: "sad", songId: 0, finishPercent: 1 }));
    assert.ok(checkListenReport({ emotion: "sad", songId: 2.5, finishPercent: 1 }));
    assert.ok(checkListenReport());
});

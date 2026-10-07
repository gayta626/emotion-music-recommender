// Unit test cho decideTarget (src/services/suggestService.js): khi nao doi sang bai vui de dong vien
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");

const { decideTarget } = require("../src/services/suggestService");

// pg tra COUNT(*) dang chuoi -> du lieu thu cung de chuoi cho giong that
const rows = (counts) => Object.entries(counts).map(([emotion, cnt]) => ({ emotion, cnt: String(cnt) }));

test("buon keo dai + dang buon -> dong vien bang bai vui", () => {
    assert.deepStrictEqual(
        decideTarget(rows({ sad: 3, happy: 1 }), "sad"),
        { targetEmotion: "happy", isEncourage: true }
    );
});

test("GIAN keo dai cung duoc dong vien (truoc day chi dem buon)", () => {
    assert.deepStrictEqual(
        decideTarget(rows({ angry: 3, neutral: 1 }), "angry"),
        { targetEmotion: "happy", isEncourage: true }
    );
});

test("buon + gian cong lai qua nua cung tinh", () => {
    assert.deepStrictEqual(
        decideTarget(rows({ sad: 2, angry: 1, happy: 2 }), "sad"),
        { targetEmotion: "happy", isEncourage: true }
    );
});

test("dang vui thi giu vui du truoc do buon nhieu", () => {
    assert.deepStrictEqual(
        decideTarget(rows({ sad: 5 }), "happy"),
        { targetEmotion: "happy", isEncourage: false }
    );
});

test("it hon 4 lan quet -> chua du du lieu, giu nguyen cam xuc", () => {
    assert.deepStrictEqual(
        decideTarget(rows({ sad: 3 }), "sad"),
        { targetEmotion: "sad", isEncourage: false }
    );
});

test("buon/gian dung bang mot nua -> chua dong vien", () => {
    assert.deepStrictEqual(
        decideTarget(rows({ sad: 2, happy: 2 }), "sad"),
        { targetEmotion: "sad", isEncourage: false }
    );
});

test("chua co lich su -> giu nguyen", () => {
    assert.deepStrictEqual(decideTarget([], "angry"), { targetEmotion: "angry", isEncourage: false });
});

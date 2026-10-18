// Unit test C11 - nghe cam xuc song song luc quet mat (ham thuan, khong goi DB / mang)
// moodFromText (assistantRules), buildMoodRequest (assistantLlm), canLabelFace (moodFixService), ly do I2 "voice"
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");

const { moodFromText } = require("../src/services/assistantRules");
const { buildMoodRequest } = require("../src/services/assistantLlm");
const { canLabelFace, VOICE_TRUST_FACE_ABOVE } = require("../src/services/moodFixService");
const { moodReason } = require("../src/services/explainService");

test("moodFromText: cau ke cam xuc -> cam xuc (co dau / khong dau)", () => {
    assert.strictEqual(moodFromText("Hôm nay mình mệt quá"), "sad");
    assert.strictEqual(moodFromText("minh dang tuc qua"), "angry");
    assert.strictEqual(moodFromText("vui ghê luôn"), "happy");
    assert.strictEqual(moodFromText("muốn khám phá cái gì mới"), "surprise");
});

test("moodFromText: phu dinh doi cam xuc", () => {
    assert.strictEqual(moodFromText("mình không vui lắm"), "sad");
    assert.strictEqual(moodFromText("mình không buồn đâu"), "neutral");
});

test("moodFromText: cau khong noi ve cam xuc -> null", () => {
    assert.strictEqual(moodFromText("bài tiếp theo"), null);
    assert.strictEqual(moodFromText("tiếp tục đi"), null);
    assert.strictEqual(moodFromText(""), null);
});

test("buildMoodRequest: chi gui cau noi, khong gui kho nhac", () => {
    const { system, input } = buildMoodRequest("hôm nay deadline dí quá");
    assert.match(system, /none/);
    assert.strictEqual(input, 'Câu nói: "hôm nay deadline dí quá"');
});

test("canLabelFace: bam chon luon duoc luu, noi chi khi mat chua tu tin 75%", () => {
    assert.strictEqual(VOICE_TRUST_FACE_ABOVE, 0.75);
    assert.strictEqual(canLabelFace("tap", 0.95), true);
    assert.strictEqual(canLabelFace("voice", 0.74), true);
    assert.strictEqual(canLabelFace("voice", 0.41), true);
    assert.strictEqual(canLabelFace("voice", 0.75), false);
    assert.strictEqual(canLabelFace("voice", 0.9), false);
    // khong co do tin cay (model cu) -> khong biet mat chac hay khong -> van theo nguoi dung
    assert.strictEqual(canLabelFace("voice", null), true);
});

test("ly do I2 khi cam xuc lay tu loi noi", () => {
    assert.deepStrictEqual(moodReason("sad", "voice"), { kind: "mood", text: "You told NYX you feel down" });
});

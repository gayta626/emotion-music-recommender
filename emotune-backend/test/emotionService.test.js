// Unit test cho predictBody (src/services/emotionService.js): body gui sang Flask /predict
// Chay: npm test   (trong thu muc emotune-backend)
const test = require("node:test");
const assert = require("node:assert");

const { predictBody } = require("../src/services/emotionService");

test("web gui nhieu tam -> chuyen nguyen danh sach images", () => {
    assert.deepStrictEqual(predictBody({ images: ["a", "b", "c"] }), { images: ["a", "b", "c"] });
});

test("web cu gui 1 tam -> giu kieu image", () => {
    assert.deepStrictEqual(predictBody({ image: "a" }), { image: "a" });
});

test("co ca 2 -> uu tien images", () => {
    assert.deepStrictEqual(predictBody({ image: "x", images: ["a"] }), { images: ["a"] });
});

test("images khong phai danh sach -> bo qua, dung image", () => {
    assert.deepStrictEqual(predictBody({ image: "x", images: "a" }), { image: "x" });
});

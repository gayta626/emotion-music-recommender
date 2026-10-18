const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const f = require("../src/services/faceSamples");

// anh jpeg 1 diem (chi can la base64 hop le)
const PIXEL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

test("faceFileName: <nguoi>_<cam xuc>_<thoi diem>.jpg, ten nguoi tach duoc nhu prepare_data.py (2 dau _ cuoi)", () => {
    const name = f.faceFileName(7, "sad", new Date("2026-10-17T15:30:12.345Z"));
    assert.strictEqual(name, "u7_sad_20261017T153012345.jpg");
    // python: os.path.basename(name).rsplit("_", 2)[0]
    const parts = name.split("_");
    assert.strictEqual(parts.slice(0, parts.length - 2).join("_"), "u7");
});

test("decodeDataUrl: chi nhan anh jpeg / png base64", () => {
    assert.ok(Buffer.isBuffer(f.decodeDataUrl(PIXEL)));
    assert.strictEqual(f.decodeDataUrl("data:text/html;base64,PGI+"), null);
    assert.strictEqual(f.decodeDataUrl(null), null);
});

test("saveFace / countFaces / removeUserFaces trong thu muc tam", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "faces-"));
    try {
        assert.match(f.saveFace(1, "happy", PIXEL, dir), /^happy\/u1_happy_\d+T\d+\.jpg$/);
        f.saveFace(1, "sad", PIXEL, dir);
        f.saveFace(2, "sad", PIXEL, dir);
        assert.strictEqual(f.saveFace(2, "bored", PIXEL, dir), null);      // cam xuc khong hop le
        assert.strictEqual(f.saveFace(2, "sad", "khong phai anh", dir), null);
        const c = f.countFaces(dir);
        assert.strictEqual(c.total, 3);
        assert.strictEqual(c.byEmotion.sad, 2);
        assert.strictEqual(c.people, 2);
        // xoa anh nguoi 1 khong dung toi nguoi 11 / 2
        assert.strictEqual(f.removeUserFaces(1, dir), 2);
        assert.strictEqual(f.countFaces(dir).total, 1);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

const test = require("node:test");
const assert = require("node:assert");
const { explainPick, MAX_REASONS } = require("../src/services/explainService");

const song = (extra) => ({ id: 1, artist: "Hà Nhi", genre: "ballad", score: 0, taste_artist: 0, taste_genre: 0, like_bonus: 0, knn_fans: 0, ...extra });
const kinds = (list) => list.map((r) => r.kind);

test("explainPick: ly do cam xuc theo cach NYX biet (camera / tu chon / sua / tu dong)", () => {
    assert.strictEqual(explainPick(song(), { emotion: "sad", source: "scan" })[0].text, "You look down");
    assert.strictEqual(explainPick(song(), { emotion: "sad", source: "pick" })[0].text, "You said you feel down");
    assert.strictEqual(explainPick(song(), { emotion: "sad", source: "fix" })[0].text, "You said you feel down");
    assert.match(explainPick(song(), { emotion: "surprise", source: "auto" })[0].text, /explore/);
});

test("explainPick: ly do ca nhan lay tu dung diem da dung khi xep hang, toi da MAX_REASONS", () => {
    const why = explainPick(song({ like_bonus: 1, score: 2, taste_artist: 0.5, knn_fans: 2 }), { emotion: "happy", source: "scan" });
    assert.strictEqual(why.length, MAX_REASONS);
    assert.deepStrictEqual(kinds(why), ["mood", "like", "history"]);
    const taste = explainPick(song({ taste_artist: 0.5, taste_genre: 0.5 }), { emotion: "sad", source: "scan" });
    assert.deepStrictEqual(taste.map((r) => r.text), ["You look down", "By Hà Nhi, an artist you picked", "Ballad is one of your genres"]);
    const knn = explainPick(song({ knn_fans: 1 }), { emotion: "sad", source: "scan" });
    assert.strictEqual(knn[1].text, "1 listener with taste like yours enjoyed it");
});

test("explainPick: khong co ly do ca nhan -> noi that la bai moi (khong bia ly do)", () => {
    const why = explainPick(song({ score: -1 }), { emotion: "neutral", source: "scan" });
    assert.deepStrictEqual(kinds(why), ["mood", "new"]);
});

test("explainPick: che do dong vien va hanh trinh cam xuc", () => {
    assert.deepStrictEqual(kinds(explainPick(song(), { emotion: "sad", source: "scan", isEncourage: true })), ["mood", "encourage", "new"]);
    const steps = [0, 2, 4].map((step) => explainPick(song(), { emotion: "sad", source: "scan", journey: { step, total: 5 } })[1].text);
    assert.deepStrictEqual(steps, [
        "Starts close to how you feel",
        "Step 3/5: easing toward brighter songs",
        "Ends your mood journey on a brighter note",
    ]);
});

// Unit test cho ham thuan summarizePlays (src/services/artistService.js). Chay: npm test
const test = require("node:test");
const assert = require("node:assert");
const { summarizePlays } = require("../src/services/artistService");

test("gom luot nghe theo bai + tong thang + tong", () => {
    const rows = [
        { song_id: 3, total: 5, month: 2 },
        { song_id: 7, total: 4, month: 4 },
    ];
    assert.deepStrictEqual(summarizePlays(rows), {
        plays: { 3: { total: 5, month: 2 }, 7: { total: 4, month: 4 } },
        monthTotal: 6,
        total: 9,
    });
});

test("chua nghe bai nao -> toan so 0", () => {
    assert.deepStrictEqual(summarizePlays([]), { plays: {}, monthTotal: 0, total: 0 });
});

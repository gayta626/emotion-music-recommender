// Unit test cho src/services/authValidation.js
// Chay: npm test   (trong thu muc emotune-backend)

// node:test co san trong Node, khong can cai them thu vien
const test = require("node:test");
// assert = "khang dinh": neu gia tri thuc te KHAC gia tri mong doi -> test do (fail)
const assert = require("node:assert");

// lay ham can test (file nay chua co -> luc dau test se bao loi, dung nhu mong doi)
const { validateCredentials } = require("../src/services/authValidation");

// ===== Mau 1: truong hop HOP LE =====
// test("ten test", () => { ... })  -> ten nen noi ro dang kiem tra dieu gi
test("username duoc trim + chuyen chu thuong", () => {
    // 1. Chuan bi dau vao
    const result = validateCredentials("  Vinh_01 ", "123456");

    // 2. So sanh voi ket qua mong doi
    // deepStrictEqual so sanh TOAN BO object (tung key, tung gia tri, dung kieu du lieu)
    assert.deepStrictEqual(result, { ok: true, username: "vinh_01" });
});

// ===== Mau 2: truong hop SAI =====
test("username qua ngan (2 ky tu) bi tu choi", () => {
    const result = validateCredentials("ab", "123456");

    // chi kiem tra ok = false, KHONG so nguyen cau thong bao
    // -> sau nay sua cau chu thong bao thi test khong bi vo
    assert.strictEqual(result.ok, false);
});

// ===== Ban tu viet tiep 6 truong hop con lai theo 2 mau tren =====
// - username qua dai: "a".repeat(31)
// - username co dau cach: "vinh nguyen"
// - username co dau tieng Viet: "vĩnh"
// - mat khau < 6 ky tu: "12345"
// - username la undefined (khong duoc nem loi, chi tra ok = false)
// - mat khau la undefined (khong duoc nem loi, chi tra ok = false)

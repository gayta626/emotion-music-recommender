const adminUserService = require("../services/adminUserService")

// Quan ly tai khoan (route da qua requireAuth + requireAdmin). Loi co status (400/404/409) -> tra nguyen cau bao cho admin doc.
const send = (res, status, promise, label) => promise
    .then((data) => res.status(status).json(data))
    .catch((err) => {
        if (!err.status) console.error(`Loi ${label}:`, err);
        return res.status(err.status || 500).json({ error: err.status ? err.message : "Server error" });
    });

const userId = (req) => Number(req.params.id) || 0;

// GET /admin/users
let listUsers = (req, res) => send(res, 200, adminUserService.listUsers(), "danh sach tai khoan");

// GET /admin/users/:id - du lieu rieng cua 1 nguoi (playlist, bai thich, lich su nghe / quet, gu, diem so thich)
let getUser = (req, res) => send(res, 200, adminUserService.getUserDetail(userId(req)), "chi tiet tai khoan");

// PATCH /admin/users/:id { role: 'user'|'admin' } hoac { locked: true|false }
let updateUser = (req, res) => send(res, 200, adminUserService.updateUser(req.userId, userId(req), req.body || {}), "sua tai khoan");

// POST /admin/users/:id/reset-password -> { password } (mat khau tam, chi hien 1 lan)
let resetPassword = (req, res) => send(res, 200, adminUserService.resetPassword(req.userId, userId(req)), "dat lai mat khau");

// DELETE /admin/users/:id
let deleteUser = (req, res) => send(res, 200, adminUserService.deleteUser(req.userId, userId(req)), "xoa tai khoan");

module.exports = {
    listUsers, getUser, updateUser, resetPassword, deleteUser,
}

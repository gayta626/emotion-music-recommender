const adminService = require("../services/adminService")

// GET /admin/health?days=7|30&sample=0|1 - so lieu CA HE THONG (route da qua requireAdmin)
// sample=1: tinh ca tai khoan mau cua seed-demo (mac dinh khong tinh: do la du lieu gia)
let getHealth = async (req, res) => {
    try {
        const data = await adminService.getHealth(req.query.days, req.query.sample === "1")
        return res.status(200).json(data)
    } catch (err) {
        console.log("Loi goi API admin/health :" + err)
        return res.status(500).json({ err: "Loi server khi lay so lieu he thong" })
    }
}

module.exports = {
    getHealth: getHealth,
}

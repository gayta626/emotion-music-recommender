const songService = require("../services/songService")

let getSongs = async (req, res) => {
    try {
        const data = await songService.getSongs()
        return res.status(200).json(data)
    } catch (err) {
        console.log("Loi goi API songs :" + err)
        return res.status(500).json({ err: "Loi server khi lay danh sach bai hat" })
    }
}

// userId lay tu token (requireAuth), khong nhan tu client
let getForYou = async (req, res) => {
    try {
        const data = await songService.getForYou(req.userId)
        return res.status(200).json(data)
    } catch (err) {
        console.log("Loi goi API songs/for-you :" + err)
        return res.status(500).json({ err: "Loi server khi lay goi y" })
    }
}

module.exports = {
    getSongs: getSongs,
    getForYou: getForYou,
}

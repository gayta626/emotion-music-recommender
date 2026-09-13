// db.js - Kết nối tới PostgreSQL, dùng chung cho toàn bộ routes
require("dotenv").config();
const { Pool } = require("pg");

// Pool giữ sẵn nhiều kết nối, tái sử dụng thay vì mở/đóng kết nối mới mỗi query
// (mở kết nối mới mỗi lần rất tốn thời gian)
const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5433,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

pool.on("error", (err) => {
    // Bắt lỗi ở tầng pool (VD: mất kết nối DB giữa chừng) để tránh crash cả server
    console.error("Lỗi không mong muốn từ PostgreSQL pool:", err);
});

module.exports = {
    // Dùng cho các query đơn lẻ (moodHistory.js, phần đầu suggest.js)
    query: (text, params) => pool.query(text, params),

    // Export cả pool thô để feedback.js tự lấy client riêng cho transaction
    // (BEGIN/COMMIT/ROLLBACK bắt buộc phải chạy trên CÙNG 1 kết nối)
    pool,
};
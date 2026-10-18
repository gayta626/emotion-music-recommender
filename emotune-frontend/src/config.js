// Dia chi cac service. Doc tu bien moi truong VITE_* (file .env.local, xem .env.example);
// khong dat thi dung gia tri mac dinh cho may dang chay ca backend.
// Doi .env.local xong phai tat va chay lai "npm run dev" moi an.

// backend Node (dang nhap, quet, goi y, cham diem)
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

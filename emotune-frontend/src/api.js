// 1 axios dung chung cho moi lan goi backend:
// - tu gan token dang nhap vao header Authorization
// - backend tra 401 (chua dang nhap / token het han) -> xoa token, ve trang dang nhap
// Component chi can: import api from '../api'  roi  api.get('/artists'), api.post('/listen-report', {...})
import axios from "axios";
import { API_URL } from "./config";

// ten "ngan keo" trong localStorage (xem: DevTools -> Application -> Local storage)
const TOKEN_KEY = "emotune_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

// baseURL: component chi viet duong dan ("/artists"), khong phai ghi lai dia chi backend
const api = axios.create({ baseURL: API_URL });

// TRUOC khi request di ra: co token thi gan vao header (giong middleware, nhung o phia frontend)
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config; // bat buoc return, giong next() o middleware
});

// SAU khi response ve
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // ?. : backend tat thi loi khong co response -> khong doc .status de tranh loi
        // dang o /login ma sai mat khau (cung la 401) thi khong chuyen trang, de trang login tu bao loi
        if (error.response?.status === 401 && window.location.pathname !== "/login") {
            clearToken();
            window.location.href = "/login";
        }
        return Promise.reject(error); // van bao loi cho component (.catch van chay)
    }
);

export default api;

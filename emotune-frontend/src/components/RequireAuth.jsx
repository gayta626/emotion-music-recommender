import { Navigate, Outlet } from "react-router-dom";
import { getToken } from "../api";
import AuthProvider from "../contexts/AuthProvider";

// Chặn route: chưa có token -> về /login; có -> hiện trang con (<Outlet />)
// Chỉ kiểm tra "có token", token hết hạn/sai thì api.js (401) tự đưa về /login
// AuthProvider bọc ở đây để chỉ hỏi /auth/me khi đã đăng nhập (mọi trang con dùng được useAuth)
const RequireAuth = () => {
    if (!getToken()) return <Navigate to="/login" replace />;
    return (
        <AuthProvider>
            <Outlet />
        </AuthProvider>
    );
};

export default RequireAuth;

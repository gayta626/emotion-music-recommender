import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { clearToken } from "../api";
import { AuthContext } from "./authContext";

// Hỏi backend "token này là của ai?" (GET /auth/me) một lần khi vào web.
// Token sai/hết hạn -> backend trả 401 -> api.js tự xoá token và đưa về /login.
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        api.get("/auth/me")
            .then((res) => setUser(res.data))
            .catch(() => {}); // 401 đã được api.js xử lý; lỗi mạng thì user giữ null
    }, []);

    const logout = () => {
        clearToken();
        navigate("/login", { replace: true });
    };

    return (
        <AuthContext.Provider value={{ user, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;

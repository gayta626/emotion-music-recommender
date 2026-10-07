import { createContext, useContext } from "react";

// Kho dùng chung "ai đang đăng nhập": { user, logout }
// Component nào cần tên người dùng / nút đăng xuất chỉ cần: const { user, logout } = useAuth();
export const AuthContext = createContext({ user: null, logout: () => {} });

export const useAuth = () => useContext(AuthContext);

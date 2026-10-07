import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { setToken } from "../api";
import "./AuthPage.scss";

const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.post("/auth/login", { username, password });
            setToken(res.data.token);
            navigate("/");
        } catch (err) {
            // backend tra { error: "..." }; backend tat thi khong co response
            setError(err.response?.data?.error || "Cannot connect to the server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="logo-group">
                <div className="logo">NYX</div>
                <div className="web-name">NIGHT MUSIC SOCIETY</div>
            </div>
            <div className="welcome-title">Welcome back</div>
            <form className="input-form-container" onSubmit={handleSubmit}>
                <label htmlFor="username">Username</label>
                <input
                    id="username"
                    type="text"
                    className="input-box"
                    placeholder="Username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    className="input-box"
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {error && <div className="error-text">{error}</div>}
                <button type="submit" className="btn-login" disabled={loading}>
                    {loading ? "Logging in..." : "Log in"}
                </button>
            </form>
            <div className="action-container">
                <div className="small-title">Don't have an account?</div>
                <Link to="/register" className="btn-sign-up">Sign up</Link>
            </div>
        </div>
    );
};

export default LoginPage;

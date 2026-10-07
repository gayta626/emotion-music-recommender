import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { setToken } from "../api";
import "./AuthPage.scss";

const RegisterPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (password !== confirm) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            // đăng ký xong backend trả luôn token -> vào thẳng web, không phải đăng nhập lại
            const res = await api.post("/auth/register", { username, password });
            setToken(res.data.token);
            navigate("/");
        } catch (err) {
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
            <div className="welcome-title">Create account</div>
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
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <label htmlFor="confirm">Confirm password</label>
                <input
                    id="confirm"
                    type="password"
                    className="input-box"
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                />
                {error && <div className="error-text">{error}</div>}
                <button type="submit" className="btn-login" disabled={loading}>
                    {loading ? "Creating account..." : "Sign up"}
                </button>
            </form>
            <div className="action-container">
                <div className="small-title">Already have an account?</div>
                <Link to="/login" className="btn-sign-up">Log in</Link>
            </div>
        </div>
    );
};

export default RegisterPage;

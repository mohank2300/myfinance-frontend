import { useState } from "react";
import axios from "axios";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post("https://myfinance-backend-0zai.onrender.com//api/auth/login", {
        email,
        password,
      });
      localStorage.setItem("token", res.data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #0a0a0a;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          min-height: 100vh;
          display: flex !important;
          align-items: center;
          justify-content: center;
        }
        .login-wrapper {
          width: 100%; min-height: 100vh; display: flex; align-items: center;
          justify-content: center; background: #0a0a0a; position: relative; overflow: hidden;
        }
        .login-wrapper::before {
          content: ''; position: absolute; width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(232,201,126,0.08) 0%, transparent 70%);
          top: -100px; right: -100px; pointer-events: none;
        }
        .login-card {
          background: #111; border: 1px solid #1e1e1e; border-radius: 16px;
          padding: 48px; width: 100%; max-width: 420px; position: relative; z-index: 1;
        }
        .login-logo { font-size: 1.6rem; font-weight: 800; color: #e8c97e; letter-spacing: -0.5px; margin-bottom: 8px; }
        .login-subtitle { color: #444; font-size: 0.88rem; margin-bottom: 36px; }
        .field-label { display: block; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #555; margin-bottom: 8px; }
        .field-input { width: 100%; background: #0a0a0a; border: 1px solid #222; border-radius: 8px; padding: 12px 16px; font-size: 0.92rem; color: #f0ede6; font-family: inherit; outline: none; transition: border-color 0.2s; margin-bottom: 20px; }
        .field-input:focus { border-color: #e8c97e; }
        .field-input::placeholder { color: #333; }
        .login-btn { width: 100%; background: #e8c97e; color: #0a0a0a; border: none; border-radius: 8px; padding: 13px; font-size: 0.92rem; font-weight: 700; font-family: inherit; cursor: pointer; transition: opacity 0.2s; margin-top: 8px; }
        .login-btn:hover { opacity: 0.88; }
        .login-btn:active { transform: scale(0.99); }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .divider { height: 1px; background: #1a1a1a; margin: 28px 0; }
        .footer { text-align: center; font-size: 0.82rem; color: #444; }
        .footer a { color: #6fcf97; text-decoration: none; font-weight: 600; }
        .footer a:hover { text-decoration: underline; }
      `}</style>

      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-logo">MyFinance</div>
          <div className="login-subtitle">Sign in to your account</div>

          <form onSubmit={handleLogin}>
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="divider" />
          <div className="footer">
            Don't have an account? <a href="/register">Create one</a>
          </div>
        </div>
      </div>
    </>
  );
}
import { useState } from "react";
import axios from "axios";

export default function Register() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("https://myfinance-backend-0zai.onrender.com/api/auth/register", {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      localStorage.setItem("token", res.data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data || "Registration failed");
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
        .wrapper {
          width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0a;
          position: relative;
          overflow: hidden;
        }
        .wrapper::before {
          content: '';
          position: absolute;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(111,207,151,0.06) 0%, transparent 70%);
          top: -100px; right: -100px;
          pointer-events: none;
        }
        .card {
          background: #111;
          border: 1px solid #1e1e1e;
          border-radius: 16px;
          padding: 48px;
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
        }
        .logo { font-size: 1.6rem; font-weight: 800; color: #e8c97e; letter-spacing: -0.5px; margin-bottom: 6px; }
        .subtitle { color: #444; font-size: 0.88rem; margin-bottom: 36px; }
        .field-label { display: block; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #555; margin-bottom: 8px; }
        .field-input { width: 100%; background: #0a0a0a; border: 1px solid #222; border-radius: 8px; padding: 12px 16px; font-size: 0.92rem; color: #f0ede6; font-family: inherit; outline: none; transition: border-color 0.2s; margin-bottom: 18px; }
        .field-input:focus { border-color: #6fcf97; }
        .field-input::placeholder { color: #333; }
        .submit-btn { width: 100%; background: #6fcf97; color: #0a0a0a; border: none; border-radius: 8px; padding: 13px; font-size: 0.92rem; font-weight: 700; font-family: inherit; cursor: pointer; transition: opacity 0.2s; margin-top: 4px; }
        .submit-btn:hover { opacity: 0.85; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .divider { height: 1px; background: #1a1a1a; margin: 28px 0; }
        .footer { text-align: center; font-size: 0.82rem; color: #444; }
        .footer a { color: #e8c97e; text-decoration: none; font-weight: 600; }
        .footer a:hover { text-decoration: underline; }
      `}</style>

      <div className="wrapper">
        <div className="card">
          <div className="logo">MyFinance</div>
          <div className="subtitle">Create your account</div>

          <form onSubmit={handleRegister}>
            <label className="field-label">Full Name</label>
            <input
              className="field-input"
              type="text"
              placeholder="John Doe"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />

            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            <label className="field-label">Confirm Password</label>
            <input
              className="field-input"
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
            />

            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="divider" />
          <div className="footer">
            Already have an account? <a href="/">Sign in</a>
          </div>
        </div>
      </div>
    </>
  );
}
import { useEffect, useState } from "react";
import axios from "axios";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ fullName: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [openSection, setOpenSection] = useState(null);
  const [lastLogin] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("http://localhost:8080/api/user/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
        setProfileForm({ fullName: res.data.fullName, email: res.data.email });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await axios.put("http://localhost:8080/api/user/me", profileForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      setProfileMsg({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setProfileMsg({ type: "error", text: "Failed to update profile" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setPasswordMsg({ type: "error", text: "New passwords do not match" });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      await axios.put("http://localhost:8080/api/user/password",
        { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordMsg({ type: "success", text: "Password changed successfully!" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.response?.data || "Failed to change password" });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const toggleSection = (section) => {
    setOpenSection(prev => prev === section ? null : section);
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 3);
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a !important; color: #f0ede6; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; min-height: 100vh; display: block !important; place-items: unset !important; }
        .page { min-height: 100vh; background: #0a0a0a; }
        .navbar { display: flex; align-items: center; justify-content: space-between; padding: 20px 40px; border-bottom: 1px solid #161616; position: sticky; top: 0; background: #0a0a0a; z-index: 10; }
        .nav-logo { font-size: 1.3rem; font-weight: 800; color: #e8c97e; cursor: pointer; }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-link { background: none; border: none; color: #555; font-family: inherit; font-size: 0.82rem; cursor: pointer; transition: color 0.2s; padding: 0; }
        .nav-link:hover { color: #e8c97e; }
        .logout-btn { background: none; border: 1px solid #222; color: #555; font-family: inherit; font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 7px 16px; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .logout-btn:hover { border-color: #eb5757; color: #eb5757; }

        .content { max-width: 560px; margin: 0 auto; padding: 48px 24px; }

        .page-title { font-size: 1.8rem; font-weight: 800; color: #f0ede6; letter-spacing: -0.5px; margin-bottom: 32px; }

        /* Avatar Header */
        .profile-header { display: flex; align-items: center; gap: 20px; margin-bottom: 32px; }
        .avatar { width: 68px; height: 68px; border-radius: 50%; background: #1a1608; border: 2px solid #3a2e08; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 800; color: #e8c97e; flex-shrink: 0; letter-spacing: 1px; }
        .profile-info { flex: 1; }
        .profile-name { font-size: 1.15rem; font-weight: 700; color: #f0ede6; }
        .profile-last-login { font-size: 0.8rem; color: #e8c97e; margin-top: 3px; opacity: 0.7; }

        /* Accordion Sections */
        .section { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
        .section-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; cursor: pointer; transition: background 0.15s; user-select: none; }
        .section-header:hover { background: #141414; }
        .section-header-left { display: flex; align-items: center; gap: 14px; }
        .section-icon { width: 36px; height: 36px; border-radius: 8px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
        .section-label { font-size: 0.92rem; font-weight: 600; color: #ccc; }
        .section-chevron { color: #444; font-size: 0.8rem; transition: transform 0.2s; }
        .section-chevron.open { transform: rotate(180deg); }
        .section-body { border-top: 1px solid #1a1a1a; padding: 24px 20px; }

        /* Row items (non-editable info rows) */
        .info-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #141414; }
        .info-row:last-child { border-bottom: none; }
        .info-row-label { font-size: 0.88rem; color: #555; }
        .info-row-value { font-size: 0.88rem; color: #888; }
        .info-row-arrow { color: #333; font-size: 0.75rem; margin-left: 8px; }

        /* Form fields */
        .field-label { display: block; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #555; margin-bottom: 7px; }
        .field-input { width: 100%; background: #0a0a0a; border: 1px solid #222; border-radius: 8px; padding: 11px 14px; font-size: 0.9rem; color: #f0ede6; font-family: inherit; outline: none; transition: border-color 0.2s; margin-bottom: 18px; }
        .field-input:focus { border-color: #e8c97e; }
        .field-input::placeholder { color: #333; }

        .save-btn { background: #e8c97e; color: #0a0a0a; border: none; border-radius: 8px; padding: 11px 24px; font-size: 0.88rem; font-weight: 700; font-family: inherit; cursor: pointer; transition: opacity 0.2s; }
        .save-btn:hover { opacity: 0.85; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .save-btn.green { background: #6fcf97; }

        .msg { padding: 10px 14px; border-radius: 8px; font-size: 0.82rem; margin-bottom: 16px; font-weight: 500; }
        .msg.success { background: #0b2318; border: 1px solid #1a4a2e; color: #6fcf97; }
        .msg.error { background: #230b0b; border: 1px solid #4a1a1a; color: #eb5757; }

        .center-msg { display: flex; align-items: center; justify-content: center; padding: 80px 0; }
        .spinner { width: 28px; height: 28px; border: 2px solid #1a1a1a; border-top-color: #e8c97e; border-radius: 50%; animation: spin 0.75s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="page">
        <nav className="navbar">
          <div className="nav-logo" onClick={() => window.location.href = "/dashboard"}>MyFinance</div>
          <div className="nav-right">
            <button className="nav-link" onClick={() => window.location.href = "/dashboard"}>← Dashboard</button>
            <button className="logout-btn" onClick={handleLogout}>Sign out</button>
          </div>
        </nav>

        <div className="content">
          <div className="page-title">Profile & Settings</div>

          {loading ? (
            <div className="center-msg"><div className="spinner" /></div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="profile-header">
                <div className="avatar">{getInitials(profile?.fullName)}</div>
                <div className="profile-info">
                  <div className="profile-name">{profile?.fullName}</div>
                  <div className="profile-last-login">Last sign in: {lastLogin}</div>
                </div>
              </div>

              {/* Security & Privacy */}
              <div className="section">
                <div className="section-header" onClick={() => toggleSection("security")}>
                  <div className="section-header-left">
                    <div className="section-icon">🔒</div>
                    <span className="section-label">Security & Privacy</span>
                  </div>
                  <span className={`section-chevron ${openSection === "security" ? "open" : ""}`}>▼</span>
                </div>
                {openSection === "security" && (
                  <div className="section-body">
                    {passwordMsg && <div className={`msg ${passwordMsg.type}`}>{passwordMsg.text}</div>}
                    <form onSubmit={handleChangePassword}>
                      <label className="field-label">Current Password</label>
                      <input className="field-input" type="password" placeholder="••••••••" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                      <label className="field-label">New Password</label>
                      <input className="field-input" type="password" placeholder="••••••••" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required />
                      <label className="field-label">Confirm New Password</label>
                      <input className="field-input" type="password" placeholder="••••••••" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} required />
                      <button className="save-btn green" type="submit" disabled={savingPassword}>{savingPassword ? "Updating…" : "Update Password"}</button>
                    </form>
                  </div>
                )}
              </div>

              {/* Personal Details */}
              <div className="section">
                <div className="section-header" onClick={() => toggleSection("personal")}>
                  <div className="section-header-left">
                    <div className="section-icon">👤</div>
                    <span className="section-label">Personal details</span>
                  </div>
                  <span className={`section-chevron ${openSection === "personal" ? "open" : ""}`}>▼</span>
                </div>
                {openSection === "personal" && (
                  <div className="section-body">
                    {profileMsg && <div className={`msg ${profileMsg.type}`}>{profileMsg.text}</div>}

                    {/* Info rows */}
                    <div className="info-row">
                      <span className="info-row-label">Role</span>
                      <span className="info-row-value">{profile?.role} <span className="info-row-arrow">›</span></span>
                    </div>

                    {/* Editable form */}
                    <form onSubmit={handleUpdateProfile} style={{ marginTop: "20px" }}>
                      <label className="field-label">Full Name</label>
                      <input className="field-input" type="text" value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} required />
                      <label className="field-label">Email</label>
                      <input className="field-input" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required />
                      <button className="save-btn" type="submit" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save Changes"}</button>
                    </form>
                  </div>
                )}
              </div>

            </>
          )}
        </div>
      </div>
    </>
  );
}

import { useEffect, useState } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  return { toasts, showToast };
}

export function ToastContainer({ toasts }) {
  return (
    <>
      <style>{`
        .toast-container {
          position: fixed;
          bottom: 32px;
          right: 32px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 9999;
        }
        .toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-radius: 10px;
          font-family: 'Segoe UI', system-ui, sans-serif;
          font-size: 0.88rem;
          font-weight: 500;
          min-width: 280px;
          max-width: 380px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: toast-in 0.3s ease;
          border: 1px solid transparent;
        }
        .toast.success { background: #0b2318; border-color: #1a4a2e; color: #6fcf97; }
        .toast.error   { background: #230b0b; border-color: #4a1a1a; color: #eb5757; }
        .toast.info    { background: #0d1a2b; border-color: #1a3050; color: #56ccf2; }
        .toast-icon { font-size: 1rem; flex-shrink: 0; }
        .toast-msg { flex: 1; }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">
              {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
            </span>
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../config/api";

const EyeIcon = ({ show }) => show ? (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
) : (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const PasswordInput = ({ label, name, value, show, onToggle, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</label>
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder=""
        className="w-full h-12 px-4 pr-12 border border-gray-200 rounded-xl text-sm text-gray-800
                   bg-gray-50/60 outline-none transition
                   focus:bg-white focus:border-[#00923D] focus:ring-2 focus:ring-[#00923D]/15"
      />
      <button type="button" onClick={onToggle}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#00923D] transition">
        <EyeIcon show={show} />
      </button>
    </div>
  </div>
);

export default function Profile() {
  const navigate = useNavigate();
  const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;

  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) { window.location.href = "/"; return; }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setToast({ type: "error", msg: "Semua field harus diisi" });
      return;
    }
    if (form.newPassword.length < 6) {
      setToast({ type: "error", msg: "Password minimal 6 karakter" });
      return;
    }
    if (!/[A-Z]/.test(form.newPassword)) {
      setToast({ type: "error", msg: "Password harus mengandung huruf kapital" });
      return;
    }
    if (!/[0-9]/.test(form.newPassword)) {
      setToast({ type: "error", msg: "Password harus mengandung angka" });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setToast({ type: "error", msg: "Password baru tidak cocok" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/users/${user.id}/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: "error", msg: data.message || "Gagal mengganti password" });
        return;
      }
      setToast({ type: "success", msg: "Password berhasil diubah!" });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setToast({ type: "error", msg: "Tidak dapat terhubung ke server" });
    } finally {
      setLoading(false);
    }
  };

  const jabatan = user?.jabatan || "-";
  const kementerian = user?.kementerian || null;

  // Cek syarat password secara realtime
  const pwLen = form.newPassword.length >= 6;
  const pwUpper = /[A-Z]/.test(form.newPassword);
  const pwNum = /[0-9]/.test(form.newPassword);
  const pwMatch = form.newPassword === form.confirmPassword && form.confirmPassword !== "";

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Toast */}
      <div style={{
        position: "fixed", top: 24, left: "50%",
        transform: `translateX(-50%) translateY(${toast ? "0" : "-120%"})`,
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        zIndex: 60, pointerEvents: toast ? "auto" : "none",
      }}>
        {toast && (
          <div className={`flex items-center gap-3 bg-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg whitespace-nowrap border
            ${toast.type === "success" ? "border-green-100 text-green-600" : "border-red-100 text-red-500"}`}>
            {toast.type === "success" ? (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span className="max-w-xs truncate">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-1 opacity-50 hover:opacity-100">✕</button>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="bg-[#00923D] px-5 pt-10 pb-16">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg">Profil</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-10 pb-10 flex flex-col gap-4">

        {/* Info Profil */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#00923D]/10 flex items-center justify-center shrink-0">
              <svg className="w-7 h-7 text-[#00923D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-base">{user?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.nim}</p>
              <p className="text-xs text-[#00923D] font-medium mt-1">
                {jabatan}{kementerian ? ` — ${kementerian}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Ganti Password */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Ganti Password</h2>
          <div className="flex flex-col gap-4">

            <PasswordInput
              label="Password Saat Ini"
              name="currentPassword"
              value={form.currentPassword}
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
              onChange={handleChange}
            />

            <div className="flex flex-col gap-1.5">
              <PasswordInput
                label="Password Baru"
                name="newPassword"
                value={form.newPassword}
                show={showNew}
                onToggle={() => setShowNew(v => !v)}
                onChange={handleChange}
              />
              {/* Syarat password realtime */}
              {form.newPassword.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className={`flex items-center gap-1.5 text-xs ${pwLen ? "text-green-500" : "text-gray-400"}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      {pwLen ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <circle cx="12" cy="12" r="9" />}
                    </svg>
                    Minimal 6 karakter
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs ${pwUpper ? "text-green-500" : "text-gray-400"}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      {pwUpper ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <circle cx="12" cy="12" r="9" />}
                    </svg>
                    Mengandung huruf kapital
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs ${pwNum ? "text-green-500" : "text-gray-400"}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      {pwNum ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <circle cx="12" cy="12" r="9" />}
                    </svg>
                    Mengandung angka
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <PasswordInput
                label="Konfirmasi Password Baru"
                name="confirmPassword"
                value={form.confirmPassword}
                show={showConfirm}
                onToggle={() => setShowConfirm(v => !v)}
                onChange={handleChange}
              />
              {form.confirmPassword.length > 0 && (
                <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${pwMatch ? "text-green-500" : "text-red-400"}`}>
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    {pwMatch
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                    }
                  </svg>
                  {pwMatch ? "Password cocok" : "Password tidak cocok"}
                </p>
              )}
            </div>

            <button onClick={handleSubmit} disabled={loading}
              className="w-full h-12 mt-1 bg-[#00923D] hover:bg-[#007a32] text-white text-sm font-semibold
                         rounded-xl transition-all active:scale-[0.98] disabled:opacity-60">
              {loading ? "Menyimpan..." : "Simpan Password"}
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
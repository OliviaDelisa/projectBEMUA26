import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../config/api";
import { MANAJEMEN_PATHS } from "../config/constants";

export default function ChangePassword() {
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({ old: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();

  const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;

  useEffect(() => {
    const mustChange = user?.must_change_password;
    if (!user || !mustChange || mustChange === false || mustChange == 0) {
      navigate("/", { replace: true });
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Cek syarat password realtime
  const pwLen = form.newPassword.length >= 6;
  const pwUpper = /[A-Z]/.test(form.newPassword);
  const pwNum = /[0-9]/.test(form.newPassword);
  const pwMatch = form.newPassword === form.confirmPassword && form.confirmPassword !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      setToast({ type: "error", msg: "Semua field harus diisi." });
      return;
    }

    if (form.newPassword.length < 6) {
      setToast({ type: "error", msg: "Password baru minimal 6 karakter." });
      return;
    }

    if (!/[A-Z]/.test(form.newPassword)) {
      setToast({ type: "error", msg: "Password harus mengandung huruf kapital." });
      return;
    }

    if (!/[0-9]/.test(form.newPassword)) {
      setToast({ type: "error", msg: "Password harus mengandung angka." });
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setToast({ type: "error", msg: "Password baru dan konfirmasi tidak cocok." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/users/${user.id}/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: form.oldPassword,
          newPassword: form.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        setToast({ type: "error", msg: data.message || "Gagal mengubah password." });
        return;
      }

      const updatedUser = { ...user, must_change_password: false };
      const storage = localStorage.getItem("user") ? localStorage : sessionStorage;
      storage.setItem("user", JSON.stringify(updatedUser));

      setLoading(false);
      setToast({ type: "success", msg: "Password berhasil diubah! Mengalihkan..." });

      setTimeout(() => {
      const permissions = Array.isArray(updatedUser?.permissions) ? updatedUser.permissions : [];
      const canManajemen = permissions.some((p) => MANAJEMEN_PATHS.includes(p));
      navigate(canManajemen ? "/select-portal" : "/home", { replace: true });
    }, 1500);

    } catch {
      setLoading(false);
      setToast({ type: "error", msg: "Tidak dapat terhubung ke server." });
    }
  };

  const toggleShow = (field) => setShow((prev) => ({ ...prev, [field]: !prev[field] }));

  const EyeIcon = ({ visible }) => visible ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const inputClass = `w-full h-12 px-4 pr-12 border border-gray-200 rounded-xl text-sm text-gray-800
    placeholder-gray-300 bg-gray-50/60 outline-none transition
    focus:bg-white focus:border-[#00923D] focus:ring-2 focus:ring-[#00923D]/15`;

  return (
    <>
      {/* Toast */}
      <div style={{
        position: "fixed", top: 24, left: "50%",
        transform: `translateX(-50%) translateY(${toast ? "0" : "-120%"})`,
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        zIndex: 50, pointerEvents: toast ? "auto" : "none",
      }}>
        {toast && (
          <div className={`flex items-center gap-3 bg-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg whitespace-nowrap border
            ${toast.type === "success"
              ? "border-green-100 text-green-600 shadow-green-100/60"
              : "border-red-100 text-red-500 shadow-red-100/60"}`}>
            {toast.type === "success" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-1 text-gray-300 hover:text-gray-500 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#f0faf4] via-white to-[#e8f5ee] -z-10" />

      {/* Page */}
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/80 px-10 py-10 flex flex-col gap-8">

          {/* Header */}
          <div className="flex flex-col items-center text-center gap-1">
            <div className="w-8 h-1 bg-[#00923D] rounded-full mb-3" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ganti Password</h1>
            <p className="text-xs text-gray-400">Buat password baru sebelum melanjutkan</p>
          </div>

          {/* Info box — tanpa icon */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700 leading-relaxed">
              Akun Anda masih menggunakan password default. Demi keamanan, silakan ganti password sekarang.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

            {/* Password Lama */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Password Lama</label>
              <div className="relative">
                <input name="oldPassword" type={show.old ? "text" : "password"}
                  placeholder="Masukkan password lama" value={form.oldPassword}
                  onChange={handleChange} required className={inputClass} />
                <button type="button" onClick={() => toggleShow("old")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#00923D] transition">
                  <EyeIcon visible={show.old} />
                </button>
              </div>
            </div>

            {/* Password Baru */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Password Baru</label>
              <div className="relative">
                <input name="newPassword" type={show.new ? "text" : "password"}
                  placeholder="Minimal 6 karakter, huruf kapital & angka" value={form.newPassword}
                  onChange={handleChange} required className={inputClass} />
                <button type="button" onClick={() => toggleShow("new")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#00923D] transition">
                  <EyeIcon visible={show.new} />
                </button>
              </div>
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

            {/* Konfirmasi Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Konfirmasi Password</label>
              <div className="relative">
                <input name="confirmPassword" type={show.confirm ? "text" : "password"}
                  placeholder="Ulangi password baru" value={form.confirmPassword}
                  onChange={handleChange} required className={inputClass} />
                <button type="button" onClick={() => toggleShow("confirm")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#00923D] transition">
                  <EyeIcon visible={show.confirm} />
                </button>
              </div>
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

            <button type="submit" disabled={loading}
              className="w-full h-12 mt-1 bg-[#00923D] hover:bg-[#007a32] text-white text-sm font-semibold
                         rounded-xl shadow-md shadow-[#00923D]/25 hover:shadow-lg hover:shadow-[#00923D]/35
                         active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Menyimpan...
                </span>
              ) : "Simpan Password Baru"}
            </button>

          </form>

          <p className="text-center text-xs text-gray-300">© 2026 BEM KM UNAND</p>
        </div>
      </div>
    </>
  );
}
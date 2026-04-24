import { useState, useEffect } from "react";
import API from "../config/api";
import { MANAJEMEN_PATHS } from "../config/constants";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", remember: false });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        setToast("Username atau password salah.");
        return;
      }

      const storage = form.remember ? localStorage : sessionStorage;
      storage.setItem("user", JSON.stringify(data.user));
      if (data.token) storage.setItem("token", data.token);

      if (data.user?.must_change_password) {
        setLoading(false);
        window.location.href = "/change-password";
        return;
      }

      const permissions = Array.isArray(data.user?.permissions) ? data.user.permissions : [];
      const canManajemen = permissions.some((p) => MANAJEMEN_PATHS.includes(p));

      setLoading(false);
      window.location.href = canManajemen ? "/select-portal" : "/home";

    } catch {
      setLoading(false);
      setToast("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 24,
          left: "50%",
          transform: `translateX(-50%) translateY(${toast ? "0" : "-120%"})`,
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          zIndex: 50,
          pointerEvents: toast ? "auto" : "none",
        }}
      >
        {toast && (
          <div className="flex items-center gap-3 bg-white border border-red-100 text-red-500 text-sm font-medium px-5 py-3 rounded-2xl shadow-lg shadow-red-100/60 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {toast}
            <button onClick={() => setToast(null)} className="ml-1 text-red-300 hover:text-red-500 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="fixed inset-0 bg-gradient-to-br from-[#f0faf4] via-white to-[#e8f5ee] -z-10" />

      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/80 px-10 py-10 flex flex-col gap-8">
          <div className="flex flex-col items-center text-center gap-1">
            <div className="w-8 h-1 bg-[#00923D] rounded-full mb-3" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Masuk Akun</h1>
            <p className="text-xs text-gray-400">BEM KM Universitas Andalas</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Username
              </label>
              <input
                id="username" name="username" type="text"
                placeholder="Masukkan username"
                value={form.username} onChange={handleChange}
                autoComplete="username" required
                className="h-12 px-4 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300
                           bg-gray-50/60 outline-none transition
                           focus:bg-white focus:border-[#00923D] focus:ring-2 focus:ring-[#00923D]/15"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password anda"
                  value={form.password} onChange={handleChange}
                  autoComplete="current-password" required
                  className="w-full h-12 px-4 pr-12 border border-gray-200 rounded-xl text-sm text-gray-800
                             placeholder-gray-300 bg-gray-50/60 outline-none transition
                             focus:bg-white focus:border-[#00923D] focus:ring-2 focus:ring-[#00923D]/15"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#00923D] transition">
                  {showPassword ? (
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
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <div className="relative w-4 h-4">
                  <input type="checkbox" name="remember" checked={form.remember}
                    onChange={handleChange} className="sr-only peer" />
                  <div className="w-4 h-4 border-2 border-gray-300 rounded peer-checked:bg-[#00923D] peer-checked:border-[#00923D] transition" />
                  {form.remember && (
                    <svg className="absolute inset-0 w-4 h-4 text-white pointer-events-none" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-500 group-hover:text-gray-700 transition">Remember Me</span>
              </label>
              <a href="/forgot-password" className="text-sm text-[#00923D] hover:opacity-70 transition font-medium">
                Lupa Password?
              </a>
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
                  Memuat...
                </span>
              ) : "Login"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-300">© 2026 BEM KM UNAND</p>
        </div>
      </div>
    </>
  );
}
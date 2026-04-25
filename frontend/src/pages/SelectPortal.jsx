import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MANAJEMEN_PATHS } from "../config/constants";

export default function SelectPortal() {
  const navigate = useNavigate();

  const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;
  const userPermissions = Array.isArray(user?.permissions) ? user.permissions : [];

  const canAccessManajemen = userPermissions.some((p) => MANAJEMEN_PATHS.includes(p));
  const manajemenEntry = MANAJEMEN_PATHS.find((p) => userPermissions.includes(p)) || "/dashboard";

  useEffect(() => {
    if (!canAccessManajemen) {
      navigate("/home", { replace: true });
    }
  }, [canAccessManajemen, navigate]);

  if (!canAccessManajemen) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">Selamat datang</h1>
        <p className="text-gray-400 mt-2">Pilih pintu masuk untuk melanjutkan</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
        
        <button
          onClick={() => navigate("/home")}
          className="flex-1 min-h-[280px] bg-white border-2 border-gray-100 rounded-[40px] p-12 flex flex-col items-center justify-center text-center hover:border-[#00923D] hover:shadow-2xl hover:shadow-green-100 transition-all duration-500 group"
        >
          <h2 className="text-2xl font-bold text-gray-800 group-hover:text-[#00923D] transition-colors">
            Portal Anggota
          </h2>
          <p className="text-gray-400 mt-4 leading-relaxed">
            Khusus untuk absensi harian <br /> dan riwayat pribadi.
          </p>
        </button>

        <button
          onClick={() => navigate(manajemenEntry)}
          className="flex-1 min-h-[280px] bg-[#00923D] rounded-[40px] p-12 flex flex-col items-center justify-center text-center hover:bg-[#007a32] hover:shadow-2xl hover:shadow-green-900/20 transition-all duration-500 group"
        >
          <h2 className="text-2xl font-bold text-white">
            Portal Manajemen
          </h2>
          <p className="text-white/70 mt-4 leading-relaxed">
            Kelola seluruh data anggota, <br /> kegiatan, dan laporan.
          </p>
        </button>

      </div>

      <footer className="mt-16">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gray-300 font-bold">
          BEM KM Universitas Andalas
        </p>
      </footer>

    </div>
  );
}

import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

function readUser() {
  const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
  try {
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Gagal membaca data user:", error);
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    return null;
  }
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(readUser);

  useEffect(() => {
    const refreshUser = () => setUser(readUser());
    window.addEventListener("permissions-updated", refreshUser);
    return () => window.removeEventListener("permissions-updated", refreshUser);
  }, []);

  // 1. Pengguna wajib login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 2. Wajib mengganti password jika diperlukan
  if (
    user.must_change_password &&
    user.must_change_password !== false &&
    user.must_change_password != 0 &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

  // 3. Halaman netral
  const neutralPaths = ["/select-portal", "/change-password"];

  if (neutralPaths.includes(location.pathname)) {
    return children;
  }

  // 4. Halaman yang boleh diakses semua pengguna login
  const publicPaths = [
    "/home",
    "/riwayat-absensi",
    "/profile",
    "/notifikasi",
  ];

  if (publicPaths.includes(location.pathname)) {
    return children;
  }

  // 5. Superadmin boleh mengakses semua route
  if (user.role?.toLowerCase() === "superadmin") {
    return children;
  }

  // 6. Cek permission untuk role lainnya
  const userPermissions = Array.isArray(user.permissions)
    ? user.permissions
    : [];

  if (userPermissions.includes(location.pathname)) {
    return children;
  }

  // 7. Jika tidak memiliki akses, arahkan ke halaman yang diizinkan
  const firstAllowed = userPermissions.find(
    (path) => path && path.startsWith("/")
  );

  return <Navigate to={firstAllowed || "/home"} replace />;
}

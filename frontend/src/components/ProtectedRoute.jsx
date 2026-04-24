import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;

  if (!user) return <Navigate to="/" replace />;

  const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];

  // ── 1. Halaman Netral (semua role boleh akses) ──
  const neutralPaths = ["/select-portal", "/change-password"];
  if (neutralPaths.includes(location.pathname)) return children;

  // ── 2. Halaman publik untuk semua yang sudah login ──
  const publicPaths = ["/home", "/riwayat-absensi"];
  if (publicPaths.includes(location.pathname)) return children;

  // ── 3. Cek permission berdasarkan path (berlaku untuk SEMUA role) ──
  if (userPermissions.includes(location.pathname)) return children;

  // ── 4. Fallback: redirect ke halaman pertama yang bisa diakses ──
  const firstAllowed = userPermissions.find((p) => p && p.startsWith("/"));
  return <Navigate to={firstAllowed || "/home"} replace />;
}
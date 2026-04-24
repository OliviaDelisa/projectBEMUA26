import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { SidebarProvider } from "./context/SidebarContext";
import ProtectedRoute from "./components/ProtectedRoute";
import useRefreshPermissions from "./hooks/useRefreshPermissions"; // ← fix path

// ── Halaman Publik
import Login from "./pages/Login";
import SelectPortal from "./pages/SelectPortal";
import ChangePassword from "./pages/ChangePassword";

// ── Halaman Manajemen
import Dashboard from "./pages/admin/Dashboard";
import Absensi from "./pages/admin/Absensi";
import Piket from "./pages/admin/Piket";
import Akun from "./pages/admin/Akun";
import Periode from "./pages/admin/Periode";
import Role from "./pages/admin/Role";

// ── Halaman Anggota
import Home from "./pages/user/Home";
import RiwayatAbsensi from "./pages/user/RiwayatAbsensi";

function RiwayatAbsensiPage() {
  const navigate = useNavigate();
  return <RiwayatAbsensi onBack={() => navigate("/home")} />;
}

// ← Pisahkan Routes ke dalam komponen sendiri agar hook bisa dipanggil di dalam BrowserRouter
function AppRoutes() {
  useRefreshPermissions(); // ← dipanggil di sini

  return (
    <Routes>
      {/* ── 1. ROUTE PUBLIK ── */}
      <Route path="/" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />

      {/* ── 2. ROUTE TRANSIT ── */}
      <Route path="/select-portal" element={<ProtectedRoute><SelectPortal /></ProtectedRoute>} />

      {/* ── 3. ROUTE MANAJEMEN ── */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/absensi"   element={<ProtectedRoute><Absensi /></ProtectedRoute>} />
      <Route path="/piket"     element={<ProtectedRoute><Piket /></ProtectedRoute>} />
      <Route path="/akun"      element={<ProtectedRoute><Akun /></ProtectedRoute>} />
      <Route path="/periode"   element={<ProtectedRoute><Periode /></ProtectedRoute>} />
      <Route path="/role"      element={<ProtectedRoute><Role /></ProtectedRoute>} />

      {/* ── 4. ROUTE ANGGOTA ── */}
      <Route path="/home"             element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/riwayat-absensi"  element={<ProtectedRoute><RiwayatAbsensiPage /></ProtectedRoute>} />

      {/* ── 5. FALLBACK ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <SidebarProvider>
      <BrowserRouter>
        <AppRoutes /> {/* ← gunakan AppRoutes, bukan Routes langsung */}
      </BrowserRouter>
    </SidebarProvider>
  );
}

export default App;
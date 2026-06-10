import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { SidebarProvider } from "./context/SidebarContext";
import ProtectedRoute from "./components/ProtectedRoute";
import useRefreshPermissions from "./hooks/useRefreshPermissions";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

// ── Halaman Publik
import Login from "./pages/Login";
import SelectPortal from "./pages/SelectPortal";
import ChangePassword from "./pages/ChangePassword";

// ── Halaman Manajemen
import Dashboard from "./pages/admin/Dashboard";
import Absensi from "./pages/admin/Absensi";
import ManajemenKegiatan from "./pages/admin/Kegiatan";
import Piket from "./pages/admin/Piket";
import Akun from "./pages/admin/Akun";
import Periode from "./pages/admin/Periode";
import Role from "./pages/admin/Role";
import Aspirasi from "./pages/admin/Aspirasi";
import Profile from "./pages/Profile";
import Notifikasi from "./pages/Notifikasi";

// ── Halaman Anggota
import Home from "./pages/user/Home";
import RiwayatAbsensi from "./pages/user/RiwayatAbsensi";

// ── Placeholder halaman belum siap
const ComingSoon = ({ title }) => (
  <div className="flex h-screen bg-gray-50 overflow-hidden">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar title={title} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-semibold text-sm">Halaman sedang dalam pengembangan</p>
          <p className="text-gray-400 text-xs mt-1">Segera hadir</p>
        </div>
      </div>
    </div>
  </div>
);

function RiwayatAbsensiPage() {
  const navigate = useNavigate();
  return <RiwayatAbsensi onBack={() => navigate("/home")} />;
}

function AppRoutes() {
  useRefreshPermissions();

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
      <Route path="/kegiatan"  element={<ProtectedRoute><ManajemenKegiatan /></ProtectedRoute>} />
      <Route path="/piket"     element={<ProtectedRoute><Piket /></ProtectedRoute>} />
      <Route path="/akun"      element={<ProtectedRoute><Akun /></ProtectedRoute>} />
      <Route path="/periode"   element={<ProtectedRoute><Periode /></ProtectedRoute>} />
      <Route path="/role"      element={<ProtectedRoute><Role /></ProtectedRoute>} />

      {/* ── 4. ROUTE ASPIRASI (placeholder) ── */}
      <Route
        path="/aspirasi"
        element={
          <ProtectedRoute>
              <Aspirasi />
          </ProtectedRoute>
        }
        />

      {/* ── 5. ROUTE ANGGOTA ── */}
      <Route path="/home"            element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/riwayat-absensi" element={<ProtectedRoute><RiwayatAbsensiPage /></ProtectedRoute>} />
      <Route path="/profile"         element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/notifikasi"      element={<ProtectedRoute><Notifikasi /></ProtectedRoute>} />  {/* ← pindah ke sini */}

      {/* ── 6. FALLBACK ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
      
    </Routes>
  );
}

function App() {
  return (
    <SidebarProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SidebarProvider>
  );
}

export default App;
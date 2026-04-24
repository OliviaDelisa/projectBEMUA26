import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { SidebarProvider } from "./context/SidebarContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/admin/Dashboard";
import Absensi from "./pages/admin/Absensi";
import ManajemenKegiatan from "./pages/admin/Kegiatan"; // 1. IMPORT DISINI
import Home from "./pages/user/Home";
import RiwayatAbsensi from "./pages/user/RiwayatAbsensi";
import Akun from "./pages/admin/Akun";
import Piket from "./pages/admin/Piket";

function RiwayatAbsensiPage() {
  const navigate = useNavigate();
  return <RiwayatAbsensi onBack={() => navigate("/home")} />;
}

function App() {
  return (
    <SidebarProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Admin */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/absensi" element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Absensi />
            </ProtectedRoute>
          } />

          {/* 2. TAMBAHKAN ROUTE KEGIATAN DISINI */}
          <Route path="/kegiatan" element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <ManajemenKegiatan />
            </ProtectedRoute>
          } />

          {/* User */}
          <Route path="/home" element={
            <ProtectedRoute allowedRoles={["user"]}>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/riwayat-absensi" element={
            <ProtectedRoute allowedRoles={["user"]}>
              <RiwayatAbsensiPage />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/absensi" element={<Absensi />} />
          <Route path="/akun" element={<Akun />} />
          <Route path="/piket" element={<Piket />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </SidebarProvider>
  );
}

export default App;
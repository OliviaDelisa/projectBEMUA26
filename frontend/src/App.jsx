import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "./context/SidebarContext";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/admin/Dashboard";
import Absensi from "./pages/admin/Absensi";
import Akun from "./pages/admin/Akun";
import Piket from "./pages/admin/Piket";

function App() {
  return (
    <SidebarProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
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
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useSidebar } from "../context/SidebarContext";
import logo from "../assets/image1.png";

const menus = [
  {
    label: "Manajemen Absensi",
    children: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Absensi", path: "/dashboard/absensi" },
      { label: "Kegiatan", path: "/dashboard/kegiatan" },
      { label: "Piket", path: "/dashboard/piket" },
    ],
  },
  {
    label: "Manajemen Pengguna",
    children: [
      { label: "Akun", path: "/dashboard/akun" },
    ],
  },
];

export default function Sidebar() {
  const { sidebarOpen } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({ 0: true, 1: false });

  const toggleMenu = (index) => {
    setOpenMenus((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <aside
      className={`${sidebarOpen ? "w-56" : "w-0"} transition-all duration-300 overflow-hidden
        h-screen bg-white border-r border-gray-100 flex flex-col shrink-0`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100 whitespace-nowrap">
        <img
          src={logo}
          alt="Logo BEM"
          className="w-12 h-12 rounded-lg object-cover shrink-0"
        />
        <div>
          <p className="text-sm font-bold text-gray-800 leading-tight">BEM KM</p>
          <p className="text-xs text-gray-400">Universitas Andalas</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto whitespace-nowrap">
        {menus.map((menu, index) => (
          <div key={index}>
            <button
              onClick={() => toggleMenu(index)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all"
            >
              <span>{menu.label}</span>
              <svg xmlns="http://www.w3.org/2000/svg"
                className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenus[index] ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openMenus[index] && (
              <div className="ml-2 mt-1 flex flex-col gap-0.5 border-l-2 border-gray-100 pl-3">
                {menu.children.map((child) => {
                  const isActive = location.pathname === child.path;
                  return (
                    <button
                      key={child.path}
                      onClick={() => navigate(child.path)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all
                        ${isActive
                          ? "bg-[#00923D] text-white font-medium"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        }`}
                    >
                      {child.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100 whitespace-nowrap">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Keluar
        </button>
      </div>
    </aside>
  );
}
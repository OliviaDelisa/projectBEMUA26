import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSidebar } from "../context/SidebarContext";
import logo from "../assets/image1.png";

function getUserData() {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error("Gagal parse data user:", err);
    return null;
  }
}

const menus = [
  {
    label: "Manajemen Absensi",
    children: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Manajemen Absensi", path: "/absensi" }, 
      { label: "Absensi Kegiatan", path: "/kegiatan" },
      { label: "Piket", path: "/piket" }

    ],
  },
  {
    label: "Manajemen Pengguna",
    children: [
      { label: "Akun",      path: "/akun"      },
      { label: "Periode",   path: "/periode"   },
      { label: "Hak Akses", path: "/role"      },
    ],
  },
  {
    label: "Manajemen Aspirasi",
    children: [
      { label: "Aspirasi Masuk", path: "/aspirasi" },
      { label: "Kategori",       path: "/aspirasi/kategori" },
    ],
  },
];

export default function Sidebar() {
  const { sidebarOpen } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const userData = getUserData();
  const userRole = userData?.role?.toLowerCase() || ""; 
  const userPermissions = Array.isArray(userData?.permissions) ? userData.permissions : [];

  // ── FILTER MENU DENGAN PENGAMAN ──
  const filteredMenus = menus.map(menu => {
    const validChildren = (menu.children || []).filter(child => {
      if (userRole === "superadmin") return true;
      return userPermissions.includes(child.path);
    });
    return { ...menu, children: validChildren };
  }).filter(menu => menu.children.length > 0);

  const [openMenus, setOpenMenus] = useState({});

  useEffect(() => {
    const state = {};
    filteredMenus.forEach((menu, index) => {
      const hasActive = menu.children.some(c => location.pathname.startsWith(c.path));
      if (hasActive) state[index] = true;
    });
    setOpenMenus(state);
  }, [location.pathname, filteredMenus.length]);

  const toggleMenu = (index) => {
    setOpenMenus(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  return (
    <aside className={`${sidebarOpen ? "w-56" : "w-0"} transition-all duration-300 overflow-hidden h-screen bg-white border-r border-gray-100 flex flex-col shrink-0`}>
      <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100 whitespace-nowrap">
        <img src={logo} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
        <div>
          <p className="text-sm font-bold text-gray-800">BEM KM</p>
          <p className="text-xs text-gray-400">UNAND</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        {filteredMenus.map((menu, index) => (
          <div key={index}>
            <button onClick={() => toggleMenu(index)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold uppercase ${menu.children.some(c => location.pathname.startsWith(c.path)) ? "text-[#00923D]" : "text-gray-400"}`}>
              <span>{menu.label}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${openMenus[index] ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openMenus[index] && (
              <div className="ml-2 mt-1 border-l-2 border-gray-100 pl-3 flex flex-col gap-0.5">
                {menu.children.map((child) => (
                  <button key={child.path} onClick={() => navigate(child.path)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${location.pathname === child.path ? "bg-[#00923D] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button onClick={handleLogout} className="w-full p-2 text-red-500 text-sm">Keluar</button>
      </div>
    </aside>
  );
}
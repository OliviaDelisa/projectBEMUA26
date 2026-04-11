import { useSidebar } from "../context/SidebarContext";

export default function Topbar({ title }) {
  const { toggleSidebar } = useSidebar();
  const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-600 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-800">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-800">{user?.name || "User"}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.jabatan || user?.role}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#00923D]/10 flex items-center justify-center text-[#00923D] font-bold text-sm">
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}
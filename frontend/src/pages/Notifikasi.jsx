import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../config/api";

const typeLabel = {
  general:    { label: "Umum",      color: "bg-gray-100 text-gray-600"   },
  activity:   { label: "Kegiatan",  color: "bg-blue-50 text-blue-600"    },
  duty:       { label: "Piket",     color: "bg-amber-50 text-amber-600"  },
  attendance: { label: "Absensi",   color: "bg-green-50 text-green-600"  },
};

const formatWaktu = (dt) => {
  const d    = new Date(dt);
  const now  = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1)   return "Baru saja";
  if (diff < 60)  return `${diff} menit lalu`;
  if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

export default function Notifikasi() {
  const navigate  = useNavigate();
  const stored    = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user      = stored ? JSON.parse(stored) : null;

  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [marking,  setMarking]  = useState(false);

  useEffect(() => {
    if (!user) { window.location.href = "/"; return; }
    fetchNotifs();
  }, []);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/notification/history/${user.id}`);
      const data = await res.json();
      setNotifs(Array.isArray(data) ? data : []);
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReadAll = async () => {
    setMarking(true);
    try {
      await fetch(`${API}/notification/read-all/${user.id}`, { method: "PUT" });
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } finally {
      setMarking(false);
    }
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#00923D] px-5 pt-10 pb-16">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-white font-bold text-lg">Notifikasi</h1>
              {unreadCount > 0 && (
                <p className="text-green-200 text-xs">{unreadCount} belum dibaca</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleReadAll} disabled={marking}
              className="text-xs text-white/80 hover:text-white transition font-medium">
              {marking ? "Memproses..." : "Tandai semua dibaca"}
            </button>
          )}
        </div>
      </div>

      {/* Konten */}
      <div className="max-w-lg mx-auto px-4 -mt-10 pb-10">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin w-6 h-6 text-[#00923D]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
          ) : notifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <p className="text-sm text-gray-400">Belum ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifs.map((notif) => {
                const tipe = typeLabel[notif.type] || typeLabel.general;
                return (
                  <div key={notif.id}
                    className={`px-5 py-4 flex items-start gap-3 transition
                      ${!notif.is_read ? "bg-green-50/50" : "bg-white"}`}>
                    {/* Dot belum dibaca */}
                    <div className="mt-1.5 shrink-0">
                      {!notif.is_read
                        ? <div className="w-2 h-2 rounded-full bg-[#00923D]"/>
                        : <div className="w-2 h-2 rounded-full bg-transparent"/>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tipe.color}`}>
                          {tipe.label}
                        </span>
                        <span className="text-xs text-gray-400">{formatWaktu(notif.created_at)}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
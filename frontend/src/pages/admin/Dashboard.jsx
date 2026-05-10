import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import API from "../../config/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
  const [members, setMembers]           = useState([]);
  const [attendance, setAttendance]     = useState([]);
  const [activities, setActivities]     = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [errors, setErrors]             = useState([]);

  useEffect(() => { fetchDashboardData(); }, []);

  const safeFetch = async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`Gagal fetch ${url}:`, e.message);
      return null;
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrors([]);
    const errs = [];

    // 1. Fetch periode
    const periodJson = await safeFetch(`${API}/periode`);
    if (!periodJson) errs.push("periode");
    const periods = Array.isArray(periodJson) ? periodJson : [];
    const aktif   = periods.find(p => p.is_active === 1 || p.is_active === true) ?? periods[0] ?? null;
    setActivePeriod(aktif);

    // 2. Fetch anggota
    let memberJson = null;
    if (aktif?.id) {
      memberJson = await safeFetch(`${API}/members?period_id=${aktif.id}`);
    }
    if (!memberJson) {
      memberJson = await safeFetch(`${API}/members`);
    }
    if (!memberJson) errs.push("anggota");
    setMembers(Array.isArray(memberJson) ? memberJson : []);

    // 3. Fetch absensi hari ini
    const d   = new Date();
    const fmt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const attJson = await safeFetch(`${API}/admin/attendance/monitor?date=${fmt}&kementerian=all`);
    if (!attJson) errs.push("absensi");
    setAttendance(Array.isArray(attJson) ? attJson : []);

    // 4. Fetch kegiatan
    const actJson = await safeFetch(`${API}/activities`);
    if (!actJson) errs.push("kegiatan");
    setActivities(Array.isArray(actJson) ? actJson : []);

    setErrors(errs);
    setLoading(false);
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const periodeProgress = useMemo(() => {
    if (!activePeriod) return 0;
    const start = new Date(activePeriod.start_date);
    const end   = new Date(activePeriod.end_date);
    const now   = new Date();
    if (now <= start) return 0;
    if (now >= end)   return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }, [activePeriod]);

  const getStatus = (k) => {
    const now = new Date(), start = new Date(k.start_datetime), end = new Date(k.end_datetime);
    if (now < start)                return "mendatang";
    if (now >= start && now <= end) return "berlangsung";
    return "selesai";
  };

  const totalAnggota = members.length;
  const hadirCount   = attendance.filter(a => a.status === "hadir").length;
  const tidakAbsen   = Math.max(0, totalAnggota - attendance.length);
  const pct = (n) => totalAnggota > 0 ? Math.round((n / totalAnggota) * 100) : 0;

  const kehadiranPerKem = useMemo(() => {
    const map = {};
    members.forEach(m => {
      const k = m.kementerian || "Lainnya";
      if (!map[k]) map[k] = { total: 0, hadir: 0 };
      map[k].total += 1;
    });
    attendance.forEach(a => {
      const k = a.kementerian || "Lainnya";
      if (map[k] && a.status === "hadir") map[k].hadir += 1;
    });
    return Object.entries(map)
      .map(([nama, v]) => ({ nama, pct: v.total > 0 ? Math.round((v.hadir / v.total) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct);
  }, [members, attendance]);

  const ranking = kehadiranPerKem.slice(0, 3);

  const barData = useMemo(() => ({
    labels: kehadiranPerKem.map(k => k.nama),
    datasets: [{
      data: kehadiranPerKem.map(k => k.pct),
      backgroundColor: kehadiranPerKem.map(k => k.pct >= 80 ? "#22c55e" : k.pct >= 60 ? "#f59e0b" : "#ef4444"),
      borderRadius: 6,
    }],
  }), [kehadiranPerKem]);

  const doughnutData = useMemo(() => ({
    datasets: [{
      data: [hadirCount || 0.1, tidakAbsen],
      backgroundColor: ["#22c55e", "#ef4444"],
      borderWidth: 0,
      cutout: "75%",
    }],
  }), [hadirCount, tidakAbsen]);

  // ✅ FIX: Mendatang/berlangsung dulu (terdekat di atas),
  //         kalau tidak ada baru tampilkan selesai (terbaru di atas)
  const kegiatanTampil = useMemo(() => {
    const now = new Date();
    const mendatang = activities
      .filter(k => new Date(k.end_datetime) >= now)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    if (mendatang.length > 0) return mendatang.slice(0, 3);

    return [...activities]
      .filter(k => new Date(k.end_datetime) < now)
      .sort((a, b) => new Date(b.end_datetime) - new Date(a.end_datetime))
      .slice(0, 3);
  }, [activities]);

  const jumlahKem = [...new Set(members.map(m => m.kementerian).filter(Boolean))].length;

  if (loading) return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-400 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ✅ FIX: Pakai Topbar yang sama seperti halaman lain */}
        <Topbar title="Dashboard" />

        {/* Banner error */}
        {errors.length > 0 && (
          <div className="mx-7 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium flex items-center gap-2">
            ⚠ Gagal memuat: <strong>{errors.join(", ")}</strong>. Pastikan backend aktif.
            <button onClick={fetchDashboardData} className="ml-2 underline">Coba lagi</button>
          </div>
        )}

        {/* Banner belum ada periode */}
        {!activePeriod && (
          <div className="mx-7 mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-medium">
            ℹ Belum ada periode aktif. Buat periode di menu <strong>Periode</strong> agar data anggota & absensi muncul.
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-7 space-y-6">

          {/* STAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Anggota Aktif"
              value={members.filter(m => m.is_active === 1 || m.is_active === true).length}
              sub={`dari ${totalAnggota} anggota terdaftar`}
              badge={activePeriod ? activePeriod.name : "Belum ada periode"}
              type="green"
            />
            <StatCard
              label="Kementerian"
              value={jumlahKem}
              sub="Unit kerja aktif"
              type="amber"
            />
            <StatCard
              label="Periode Pengurusan"
              value={activePeriod
                ? `${new Date(activePeriod.start_date).getFullYear()}–${new Date(activePeriod.end_date).getFullYear()}`
                : "–"
              }
              sub={activePeriod
                ? `${new Date(activePeriod.start_date).toLocaleDateString("id-ID",{day:"numeric",month:"short"})} – ${new Date(activePeriod.end_date).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}`
                : "Buat periode terlebih dahulu"
              }
              progress={periodeProgress}
              type="blue"
            />
            <StatCard
              label="Total Kegiatan"
              value={activities.length}
              sub={`${activities.filter(k => getStatus(k) === "berlangsung").length} sedang berlangsung`}
              type="purple"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* DONUT ABSENSI */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <span className="text-sm font-bold flex items-center gap-2 tracking-tight text-gray-700">
                  ABSENSI SEKRE HARI INI
                </span>
                
              </div>
              <div className="p-6 flex items-center gap-8">
                {totalAnggota > 0 ? (
                  <>
                    <div className="w-32 h-32 relative flex-shrink-0">
                      <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } } }} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold font-mono text-gray-800">{hadirCount}</span>
                        <span className="text-[9px] text-gray-400">dari {totalAnggota}</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <ProgressRow label="Hadir"       val={hadirCount} pct={`${pct(hadirCount)}%`} color="bg-green-500" />
                      <ProgressRow label="Belum Absen" val={tidakAbsen} pct={`${pct(tidakAbsen)}%`} color="bg-red-500"   />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 text-center py-6">
                    <p className="text-sm text-gray-400 italic">Belum ada data anggota.</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {activePeriod ? "Tambahkan anggota di menu Manajemen Anggota." : "Buat periode terlebih dahulu."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* KEGIATAN */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <span className="text-sm font-bold uppercase tracking-tighter text-gray-700">Kegiatan</span>
                <span className="text-[10px] font-bold text-gray-400">{activities.length} total</span>
              </div>
              <div className="divide-y divide-gray-50">
                {kegiatanTampil.length > 0 ? kegiatanTampil.map((k, i) => {
                  const s = getStatus(k);
                  const bMap = {
                    mendatang:   { label:"Mendatang",   color:"bg-blue-100 text-blue-700"   },
                    berlangsung: { label:"Berlangsung", color:"bg-green-100 text-green-700" },
                    selesai:     { label:"Selesai",     color:"bg-gray-100 text-gray-500"   },
                  };
                  const b = bMap[s] ?? bMap.selesai;
                  return (
                    <KegiatanItem
                      key={k.id}
                      num={String(i+1).padStart(2,"0")}
                      name={k.title}
                      meta={`${k.location_name} · ${new Date(k.start_datetime).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}`}
                      badge={b.label}
                      bColor={b.color}
                    />
                  );
                }) : (
                  <div className="p-8 text-center text-sm text-gray-400 italic">Belum ada kegiatan yang dibuat.</div>
                )}
              </div>
            </div>
          </div>

          {/* BAR CHART & RANKING */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold mb-4 uppercase tracking-tighter text-gray-700">Persentase Kehadiran per Kementerian</h3>
              {kehadiranPerKem.length > 0 ? (
                <div className="h-72">
                  <Bar data={barData} options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { max: 100, ticks: { font: { size: 10 }, callback: v => v+"%" } },
                      x: {
                        ticks: {
                          font: { size: 10 },
                          maxRotation: 45,
                          minRotation: 30,
                          autoSkip: false,
                        },
                      },
                    },
                  }} />
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center gap-1">
                  <p className="text-sm text-gray-400 italic">Belum ada data kehadiran hari ini.</p>
                  <p className="text-[11px] text-gray-400">{totalAnggota === 0 ? "Tambah anggota untuk mulai memantau kehadiran." : "Data akan muncul setelah ada absensi masuk."}</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b font-bold text-sm tracking-tight text-gray-700">RANGKING KEHADIRAN</div>
              {ranking.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-bold">
                    <tr><th className="p-3 text-left">#</th><th className="p-3 text-left">Kementerian</th><th className="p-3 text-right">PCT</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium">
                    {ranking.map((r, i) => (
                      <RankRow key={r.nama} rank={String(i+1)} name={r.nama} pct={r.pct}
                        color={r.pct >= 80 ? "bg-green-500" : r.pct >= 60 ? "bg-amber-500" : "bg-red-400"} />
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-sm text-gray-400 italic">Belum ada data kehadiran.</div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, badge, progress, type }) {
  const colors = { green:"before:bg-green-500", amber:"before:bg-amber-500", blue:"before:bg-blue-500", purple:"before:bg-purple-500" };
  return (
    <div className={`bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] ${colors[type]}`}>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-bold font-mono text-gray-800">{value}</p>
      <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
      {badge && <span className="inline-block mt-2 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full">{badge}</span>}
      {progress !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] mb-1 font-bold text-gray-500"><span>Progress Periode</span><span>{progress}%</span></div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width:`${progress}%`}}></div></div>
        </div>
      )}
    </div>
  );
}

function ProgressRow({ label, val, pct, color }) {
  return (
    <div className="w-full text-sm">
      <div className="flex justify-between mb-1 font-semibold text-gray-500">
        <span className="text-xs">{label}</span>
        <span className="font-mono text-xs text-gray-700">{val} <small className="text-gray-400 font-normal">{pct}</small></span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${color}`} style={{width:pct}}></div></div>
    </div>
  );
}

function KegiatanItem({ num, name, meta, badge, bColor }) {
  return (
    <div className="p-4 flex items-center gap-4 hover:bg-gray-50 transition cursor-default">
      <span className="text-xs font-bold text-gray-300 font-mono">{num}</span>
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-700 leading-tight">{name}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{meta}</p>
      </div>
      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${bColor}`}>{badge}</span>
    </div>
  );
}

function RankRow({ rank, name, pct, color }) {
  return (
    <tr className="hover:bg-gray-50 transition text-gray-700">
      <td className="p-3"><span className="w-5 h-5 bg-gray-100 flex items-center justify-center rounded-full text-[10px] font-bold text-gray-600">{rank}</span></td>
      <td className="p-3 font-bold">{name}</td>
      <td className="p-3 text-right">
        <div className="flex items-center gap-2 justify-end">
          <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${color}`} style={{width:`${pct}%`}}></div></div>
          <span className="font-mono font-bold text-gray-500">{pct}%</span>
        </div>
      </td>
    </tr>
  );
}
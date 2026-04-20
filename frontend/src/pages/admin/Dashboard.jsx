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

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update Jam Live setiap 30 detik
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const formatLiveDate = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${days[currentTime.getDay()]}, ${currentTime.getDate()} ${months[currentTime.getMonth()]} ${currentTime.getFullYear()} · ${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
  };

  // PERBAIKAN: Menggunakan useMemo agar referensi barData stabil
  const barData = useMemo(() => ({
    labels: ['Keuangan', 'Pendidikan', 'Kominfo', 'Sosmas', 'PSDM', 'Hukum', 'Lingk.', 'Kes.', 'Olahraga'],
    datasets: [{
      data: [88, 82, 76, 91, 69, 84, 72, 85, 78],
      // Menggunakan array warna statis untuk stabilitas render
      backgroundColor: [
        '#22c55e', '#f59e0b', '#f59e0b', '#22c55e', '#ef4444', 
        '#f59e0b', '#ef4444', '#22c55e', '#f59e0b'
      ],
      borderRadius: 6,
    }]
  }), []);

  // PERBAIKAN: Menggunakan useMemo untuk doughnutData
  const doughnutData = useMemo(() => ({
    datasets: [{ 
      data: [94, 18, 16], 
      backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'], 
      borderWidth: 0, 
      cutout: '75%' 
    }]
  }), []);

  return (
    <div className="flex h-screen bg-[#f4f4ef] overflow-hidden">
      {/* 1. Sidebar */}
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 2. Topbar dengan integrasi Live Date */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-green-800">Dashboard</h1>
            <p className="text-xs text-gray-400 italic font-medium">Selamat datang, Admin — Ringkasan aktivitas BEM KM Universitas Andalas</p>
          </div>
          <div className="text-xs font-mono bg-[#f4f4ef] px-4 py-2 rounded-full border border-gray-200 text-gray-500">
            {formatLiveDate()}
          </div>
        </div>

        {/* 3. Main Content Area */}
        <main className="flex-1 overflow-y-auto p-7 space-y-6">
          
          {/* STATS SUMMARY ROW */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Anggota Aktif" value="128" sub="Terdaftar periode ini" badge="↑ 4 dari periode lalu" type="green" />
            <StatCard label="Kementerian" value="9" sub="Unit kerja aktif" badge="+ 1 bidang baru" type="amber" />
            <StatCard label="Periode Pengurusan" value="2024-2025" sub="Jan 2024 - Des 2025" progress={73} type="blue" />
            <StatCard label="Kegiatan (Luar Sekre)" value="24" sub="Total kegiatan aktif" type="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ABSENSI SEKRE (DONUT CHART) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <span className="text-sm font-bold flex items-center gap-2 tracking-tight text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> 
                  Absensi Sekre Hari Ini
                </span>
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">● Live</span>
              </div>
              <div className="p-6 flex items-center gap-8">
                <div className="w-32 h-32 relative">
                  <Doughnut data={doughnutData} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold font-mono text-gray-800">94</span>
                    <span className="text-[9px] text-gray-400">dari 128</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <ProgressRow label="Hadir" val="94" pct="73%" color="bg-green-500" />
                  <ProgressRow label="Izin / Terlambat" val="18" pct="14%" color="bg-amber-500" />
                  <ProgressRow label="Tidak Absen" val="16" pct="13%" color="bg-red-500" />
                </div>
              </div>
            </div>

            {/* KEGIATAN LIST SECTION */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <span className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter text-gray-700">Kegiatan Luar Sekre</span>
                <select className="text-[10px] font-bold bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none cursor-pointer">
                  <option>Bulan Ini</option>
                </select>
              </div>
              <div className="divide-y divide-gray-50">
                <KegiatanItem num="01" name="Seminar Kepemimpinan Nasional" meta="Ged. Serba Guna · 25 Jun 2025" badge="Mendatang" bColor="bg-blue-100 text-blue-700" />
                <KegiatanItem num="02" name="Bakti Sosial Korban Banjir" meta="Kota Padang · 20-22 Jun 2025" badge="Berlangsung" bColor="bg-green-100 text-green-700" />
                <KegiatanItem num="03" name="Rapat Koordinasi Internal" meta="Aula FEB · 18 Jun 2025" badge="Selesai" bColor="bg-gray-100 text-gray-500" />
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: BAR CHART & RANKING */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold mb-4 uppercase tracking-tighter text-gray-700">Persentase Kehadiran per Kementerian</h3>
              <div className="h-64">
                <Bar 
                  data={barData} 
                  options={{ 
                    maintainAspectRatio: false, 
                    plugins: { legend: { display: false } }, 
                    scales: { y: { max: 100, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } 
                  }} 
                />
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-white font-bold text-sm tracking-tight text-gray-700">Ranking Kehadiran</div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-bold">
                   <tr><th className="p-3 text-left">#</th><th className="p-3 text-left">Kementerian</th><th className="p-3 text-right">PCT</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium">
                  <RankRow rank="1" name="Sosmas" pct={91} color="bg-green-500" />
                  <RankRow rank="2" name="Keuangan" pct={88} color="bg-green-500" />
                  <RankRow rank="3" name="Kesehatan" pct={85} color="bg-green-500" />
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS (Helper) ---

function StatCard({ label, value, sub, badge, progress, type }) {
  const colors = {
    green: 'before:bg-green-500',
    amber: 'before:bg-amber-500',
    blue: 'before:bg-blue-500',
    purple: 'before:bg-purple-500'
  };
  return (
    <div className={`bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] ${colors[type]}`}>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-bold font-mono text-gray-800">{value}</p>
      <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
      {badge && <span className="inline-block mt-2 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full">{badge}</span>}
      {progress && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] mb-1 font-bold text-gray-500"><span>Progress</span><span>{progress}%</span></div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${progress}%` }}></div></div>
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
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${color}`} style={{ width: pct }}></div></div>
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
          <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div></div>
          <span className="font-mono font-bold text-gray-500">{pct}%</span>
        </div>
      </td>
    </tr>
  );
}
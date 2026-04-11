import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

// --- DATA DUMMY & HELPER ---
const members = [
  { name: 'Ahmad Fauzi', nim: '2110001', kementerian: 'Keuangan' },
  { name: 'Bunga Pertiwi', nim: '2110002', kementerian: 'Pendidikan' },
  { name: 'Chandra Wijaya', nim: '2110003', kementerian: 'Kominfo' },
  { name: 'Dewi Rahmawati', nim: '2110004', kementerian: 'Sosmas' },
  { name: 'Eko Prasetyo', nim: '2110005', kementerian: 'PSDM' },
];

const today = new Date(2025, 5, 20); // June 20 2025 (Sesuai Demo HTML)
const fmt = (d) => d.toISOString().slice(0, 10);
const getDayName = (d) => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()];

export default function Absensi() {
  const [viewMode, setViewMode] = useState("list");
  const [filterKem, setFilterKem] = useState("all");
  const [periode, setPeriode] = useState("today");
  const [dates, setDates] = useState([today]);
  const [exportMsg, setExportMsg] = useState("");

  // --- LOGIKA GENERATE TANGGAL (Sama dengan script HTML) ---
  useEffect(() => {
    if (periode === 'today') {
      setDates([today]);
    } else if (periode === 'week') {
      const d = new Date(today);
      const day = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const days = [];
      for (let i = 0; i < 5; i++) {
        const nd = new Date(mon); nd.setDate(mon.getDate() + i);
        days.push(nd);
      }
      setDates(days);
    } else if (periode === 'month') {
      const days = [];
      const y = today.getFullYear(), m = today.getMonth();
      const last = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= last; d++) {
        const nd = new Date(y, m, d);
        if (nd.getDay() >= 1 && nd.getDay() <= 5) days.push(nd);
      }
      setDates(days);
    }
  }, [periode]);

  const filteredMembers = filterKem === "all" ? members : members.filter(m => m.kementerian === filterKem);

  const handleExport = () => {
    setExportMsg(`✓ File Excel berhasil diekspor: Absensi_${filterKem}_${periode}.xlsx`);
    setTimeout(() => setExportMsg(""), 4000);
  };

  return (
    <div className="flex h-screen bg-[#f5f5f0] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Manajemen Absensi" subtitle="Kelola absensi anggota BEM KM UNAND" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. STATS ROW */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Anggota" value="128" />
            <StatCard label="Hadir Hari Ini" value="94" color="text-green-600" />
            <StatCard label="Absen / Izin" value="22" color="text-amber-500" />
            <StatCard label="Tidak Tercatat" value="12" color="text-red-500" />
          </div>

          {/* 2. MAIN CARD */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="font-bold text-green-800 flex items-center gap-2 uppercase tracking-tight text-sm">
                <CalendarIcon /> Data Absensi
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 text-xs font-bold rounded-md ${viewMode === 'list' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}>List</button>
                <button onClick={() => setViewMode('grid')} className={`px-4 py-1.5 text-xs font-bold rounded-md ${viewMode === 'grid' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}>Kalender</button>
              </div>
            </div>

            <div className="p-4 border-b bg-gray-50/50 flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Kementerian</label>
                <select className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none" value={filterKem} onChange={(e) => setFilterKem(e.target.value)}>
                  <option value="all">Semua Kementerian</option>
                  <option value="Keuangan">Keuangan</option>
                  <option value="Pendidikan">Pendidikan</option>
                  <option value="Kominfo">Kominfo</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Periode</label>
                <div className="flex bg-white border border-gray-200 rounded-lg p-1 gap-1">
                  {['today', 'week', 'month'].map(p => (
                    <button key={p} onClick={() => setPeriode(p)} className={`px-3 py-1 text-[11px] font-bold rounded ${periode === p ? 'bg-green-600 text-white' : 'text-gray-500'}`}>
                      {p === 'today' ? 'Hari Ini' : p === 'week' ? 'Minggu' : 'Bulan'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
                  <tr>
                    <th className="px-4 py-3 border-b">Nama Anggota</th>
                    <th className="px-4 py-3 border-b">Kementerian</th>
                    {viewMode === 'grid' ? dates.map((d, i) => (
                      <th key={i} className="px-2 py-3 border-b text-center border-l">
                        <div className="flex flex-col items-center">
                          <span>{getDayName(d)}</span>
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full mt-1 ${fmt(d) === fmt(today) ? 'bg-green-600 text-white' : ''}`}>{d.getDate()}</span>
                        </div>
                      </th>
                    )) : (
                      <>
                        <th className="px-4 py-3 border-b text-center">Status</th>
                        <th className="px-4 py-3 border-b text-right">Waktu</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMembers.map((m, idx) => (
                    <tr key={idx} className="hover:bg-green-50/50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-800">{m.name}</div>
                        <div className="text-[10px] font-mono text-gray-400 tracking-tighter">{m.nim}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.kementerian}</td>
                      {viewMode === 'grid' ? dates.map((d, i) => {
                        const seed = (idx * 31 + d.getDate() * 7) % 10;
                        const s = fmt(d) > fmt(today) ? 'x' : seed < 6 ? 'H' : seed < 7 ? 'A' : seed < 8 ? 'I' : 'T';
                        return (
                          <td key={i} className="px-2 py-3 border-l text-center">
                            <AttDot status={s} />
                          </td>
                        );
                      }) : (
                        <>
                          <td className="px-4 py-3 text-center"><Badge status="H" /></td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-gray-400">08:15</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* LEGEND ROW (DARI HTML) */}
              <div className="mt-6 pt-4 border-t flex flex-wrap gap-4">
                <LegendItem label="Hadir" status="H" />
                <LegendItem label="Absen" status="A" />
                <LegendItem label="Izin" status="I" />
                <LegendItem label="Terlambat" status="T" />
                <LegendItem label="Tidak Tercatat" status="x" />
              </div>
            </div>
          </div>

          {/* 3. EXPORT CARD (DARI HTML) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-4 text-sm">
               <DownloadIcon /> Export Absensi (Excel)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Kementerian</label>
                <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"><option>Semua Kementerian</option></select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Periode Export</label>
                <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"><option>Bulan Ini</option></select>
              </div>
              <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm transition-all">
                <FileIcon /> Export Excel
              </button>
            </div>
            {exportMsg && <div className="mt-4 p-3 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-100">{exportMsg}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---
function StatCard({ label, value, color = "text-gray-900" }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}

function AttDot({ status }) {
  const styles = {
    H: "bg-green-100 text-green-700",
    A: "bg-red-100 text-red-700",
    I: "bg-amber-100 text-amber-700",
    T: "bg-purple-100 text-purple-700",
    x: "bg-gray-100 text-gray-400"
  };
  return <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold mx-auto ${styles[status]}`}>{status === 'x' ? '-' : status}</div>;
}

function LegendItem({ label, status }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
      <AttDot status={status} /> <span>{label}</span>
    </div>
  );
}

function Badge({ status }) {
  return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">Hadir</span>;
}

// Icons
const CalendarIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
const DownloadIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const FileIcon = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
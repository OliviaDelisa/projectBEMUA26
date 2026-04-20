import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

// --- DATA DUMMY ---
const members = [
  { name: 'Ahmad Fauzi', nim: '2110001', kementerian: 'Keuangan' },
  { name: 'Bunga Pertiwi', nim: '2110002', kementerian: 'Pendidikan' },
  { name: 'Chandra Wijaya', nim: '2110003', kementerian: 'Kominfo' },
  { name: 'Dewi Rahmawati', nim: '2110004', kementerian: 'Sosmas' },
  { name: 'Eko Prasetyo', nim: '2110005', kementerian: 'PSDM' },
];

const today = new Date(2025, 5, 20); 
const fmt = (d) => d.toISOString().slice(0, 10);
const getDayName = (d) => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()];

export default function Absensi() {
  const [filterKem, setFilterKem] = useState("all");
  const [periode, setPeriode] = useState("today");
  const [dateFrom, setDateFrom] = useState(fmt(today));
  const [dateTo, setDateTo] = useState(fmt(today));
  const [dates, setDates] = useState([today]);

  // State khusus Export (Sesuai HTML)
  const [exportPeriod, setExportPeriod] = useState("today");
  const [exportFrom, setExportFrom] = useState(fmt(today));
  const [exportTo, setExportTo] = useState(fmt(today));
  const [exportMsg, setExportMsg] = useState("");

  useEffect(() => {
    let generatedDates = [];
    if (periode === 'today') {
      generatedDates = [today];
    } else if (periode === 'week') {
      const d = new Date(today);
      const day = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      for (let i = 0; i < 5; i++) {
        const nd = new Date(mon); nd.setDate(mon.getDate() + i);
        generatedDates.push(nd);
      }
    } else if (periode === 'month') {
      const y = today.getFullYear(), m = today.getMonth();
      const last = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= last; d++) {
        const nd = new Date(y, m, d);
        if (nd.getDay() >= 1 && nd.getDay() <= 5) generatedDates.push(nd);
      }
    } else if (periode === 'custom') {
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      let curr = new Date(start);
      while (curr <= end) {
        if (curr.getDay() >= 1 && curr.getDay() <= 5) generatedDates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }
    }
    setDates(generatedDates);
  }, [periode, dateFrom, dateTo]);

  const filteredMembers = filterKem === "all" ? members : members.filter(m => m.kementerian === filterKem);

  const handleExport = () => {
    setExportMsg(`✓ File Excel berhasil diekspor: Absensi_Export_${exportPeriod}.xlsx`);
    setTimeout(() => setExportMsg(""), 4000);
  };

  return (
    <div className="flex h-screen bg-[#f5f5f0] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Manajemen Absensi" subtitle="Monitoring kehadiran anggota BEM KM UNAND" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Anggota" value="128" />
            <StatCard label="Hadir" value="94" color="text-green-600" />
            <StatCard label="Izin/Sakit" value="22" color="text-amber-500" />
            <StatCard label="Tanpa Keterangan" value="12" color="text-red-500" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center bg-white">
               <div className="flex items-center gap-2 font-bold text-green-800 uppercase text-xs tracking-widest">
                <CalendarIcon /> Data Monitoring Absensi
              </div>
            </div>

            <div className="p-4 bg-gray-50/50 flex flex-wrap gap-6 items-end border-b border-gray-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kementerian</label>
                <select className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-green-500" value={filterKem} onChange={(e) => setFilterKem(e.target.value)}>
                  <option value="all">Semua Kementerian</option>
                  <option value="Keuangan">Kementerian Keuangan</option>
                  <option value="Pendidikan">Kementerian Pendidikan</option>
                  <option value="Kominfo">Kementerian Kominfo</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Periode</label>
                <div className="flex bg-gray-200/50 p-1 rounded-lg gap-1">
                  {['today', 'week', 'month', 'custom'].map(p => (
                    <button key={p} onClick={() => setPeriode(p)} className={`px-3 py-1 text-[10px] font-bold rounded-md uppercase transition ${periode === p ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}>
                      {p === 'today' ? 'Hari Ini' : p === 'week' ? 'Minggu' : p === 'month' ? 'Bulan' : 'Kustom'}
                    </button>
                  ))}
                </div>
              </div>

              {periode === 'custom' && (
                <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rentang Tanggal</label>
                  <div className="flex items-center gap-2 bg-white p-1 px-2 border border-gray-200 rounded-lg">
                    <input type="date" className="text-xs outline-none bg-transparent" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <span className="text-gray-300 text-xs font-bold">—</span>
                    <input type="date" className="text-xs outline-none bg-transparent" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3 border-b min-w-[200px]">Data Anggota BEM</th>
                    {dates.map((d, i) => (
                      <th key={i} className="px-2 py-2 border-b text-center border-l border-gray-100 min-w-[70px]">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-400">{getDayName(d)}</span>
                          <span className={`mt-0.5 text-xs font-bold ${fmt(d) === fmt(today) ? 'text-green-600 font-black' : 'text-gray-600'}`}>{d.getDate()}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMembers.map((m, idx) => (
                    <tr key={idx} className="hover:bg-green-50/30 transition group">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-800 group-hover:text-green-700 transition-colors">{m.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase leading-none mt-1 font-medium">{m.nim} • {m.kementerian}</div>
                      </td>
                      {dates.map((d, i) => {
                        const seed = (idx * 31 + d.getDate() * 7) % 10;
                        const s = fmt(d) > fmt(today) ? 'x' : seed < 6 ? 'H' : seed < 7 ? 'A' : seed < 8 ? 'I' : 'T';
                        return (
                          <td key={i} className="px-2 py-3 border-l border-gray-50 text-center">
                             <AttDot status={s} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-10 pt-5 border-t flex flex-wrap gap-6 items-center">
                <LegendItem label="Hadir" status="H" />
                <LegendItem label="Absen" status="A" />
                <LegendItem label="Izin" status="I" />
                <LegendItem label="Terlambat" status="T" />
                <LegendItem label="N/A" status="x" />
              </div>
            </div>
          </div>

          {/* --- EXPORT SECTION (DIKEMBALIKAN SESUAI HTML ASLI) --- */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-5 text-sm uppercase tracking-tight">
               <DownloadIcon /> Export Absensi (Excel)
            </h3>
            <div className="flex flex-wrap gap-6 items-end">
              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kementerian</label>
                <select className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500">
                  <option value="all">Semua Kementerian</option>
                  <option value="Keuangan">Kementerian Keuangan</option>
                  <option value="Pendidikan">Kementerian Pendidikan</option>
                  <option value="Kominfo">Kementerian Kominfo</option>
                  <option value="Sosmas">Kementerian Sosmas</option>
                  <option value="PSDM">Kementerian PSDM</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Periode Export</label>
                <select 
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={exportPeriod}
                  onChange={(e) => setExportPeriod(e.target.value)}
                >
                  <option value="today">Hari Ini</option>
                  <option value="week">Minggu Ini</option>
                  <option value="month">Bulan Ini</option>
                  <option value="custom">Kustom</option>
                </select>
              </div>

              {exportPeriod === 'custom' && (
                <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rentang Tanggal</label>
                  <div className="flex items-center gap-2 bg-white p-1.5 px-3 border border-gray-200 rounded-lg">
                    <input type="date" className="text-sm outline-none bg-transparent" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
                    <span className="text-gray-300 text-sm font-bold">—</span>
                    <input type="date" className="text-sm outline-none bg-transparent" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
                  </div>
                </div>
              )}

              <button onClick={handleExport} className="bg-[#00923D] hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition-all shadow-sm">
                <FileIcon /> Export Excel
              </button>
            </div>
            {exportMsg && <div className="mt-5 p-3 bg-green-50 text-green-700 text-[11px] font-bold rounded-lg border border-green-100 flex items-center gap-2 italic">{exportMsg}</div>}
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
      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-bold`}>{value}</div>
    </div>
  );
}

function AttDot({ status }) {
  const styles = { H: "bg-green-100 text-green-700", A: "bg-red-100 text-red-700", I: "bg-amber-100 text-amber-700", T: "bg-purple-100 text-purple-700", x: "bg-gray-50 text-gray-300" };
  return <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black mx-auto shadow-sm ${styles[status]}`}>{status === 'x' ? '-' : status}</div>;
}

function LegendItem({ label, status }) {
  return (
    <div className="flex items-center gap-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
      <AttDot status={status} /> <span>{label}</span>
    </div>
  );
}

const CalendarIcon = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
const DownloadIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const FileIcon = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
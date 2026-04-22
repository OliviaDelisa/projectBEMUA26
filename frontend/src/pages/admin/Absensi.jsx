import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api"; // Pastikan path config API benar
import { Check, X, Eye, MapPin, Clock, Camera, FileSpreadsheet } from "lucide-react";

const today = new Date();
const fmt = (d) => d.toISOString().slice(0, 10);
const getDayName = (d) => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()];

export default function Absensi() {
  const [filterKem, setFilterKem] = useState("all");
  const [periode, setPeriode] = useState("today");
  const [dateFrom, setDateFrom] = useState(fmt(today));
  const [dateTo, setDateTo] = useState(fmt(today));
  
  // State Data Riil
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // State khusus Export
  const [exportPeriod, setExportPeriod] = useState("today");
  const [exportFrom, setExportFrom] = useState(fmt(today));
  const [exportTo, setExportTo] = useState(fmt(today));
  const [exportMsg, setExportMsg] = useState("");

  // Fetch data dari backend
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // Endpoint monitor disesuaikan dengan range tanggal (untuk hari ini atau kustom)
      const res = await fetch(`${API}/admin/attendance/monitor?date=${dateFrom}&kementerian=${filterKem}`);
      const data = await res.json();
      setAttendanceData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Gagal mengambil data absensi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [filterKem, dateFrom, periode]);

  const handleValidate = async (id, status) => {
    try {
      const res = await fetch(`${API}/admin/attendance/validate/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchAttendance(); // Refresh data setelah validasi
      }
    } catch (err) {
      alert("Gagal melakukan validasi");
    }
  };

  const handleExport = () => {
    setExportMsg(`✓ File Excel berhasil diekspor: Absensi_Export_${exportPeriod}.xlsx`);
    setTimeout(() => setExportMsg(""), 4000);
  };

  return (
    <div className="flex h-screen bg-[#f5f5f0] overflow-hidden text-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Manajemen Absensi" subtitle="Monitoring & Validasi kehadiran anggota BEM KM UNAND" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Absen Hari Ini" value={attendanceData.length} />
            <StatCard label="Menunggu Validasi" value={attendanceData.filter(a => a.status === 'pending').length} color="text-amber-500" />
            <StatCard label="Telah Disetujui" value={attendanceData.filter(a => a.status === 'hadir').length} color="text-green-600" />
            <StatCard label="Ditolak" value={attendanceData.filter(a => a.status === 'rejected').length} color="text-red-500" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-white">
               <div className="flex items-center gap-2 font-bold text-green-800 uppercase text-xs tracking-widest">
                <CalendarIcon /> Live Monitoring Absensi Sekretariat BEM UNAND 2026
              </div>
              {loading && <span className="text-[10px] animate-pulse text-green-600 font-bold">MEMUAT DATA...</span>}
            </div>

            <div className="p-4 bg-gray-50/50 flex flex-wrap gap-6 items-end border-b border-gray-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kementerian</label>
                <select className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-green-500" value={filterKem} onChange={(e) => setFilterKem(e.target.value)}>
                  <option value="all">Semua Kementerian</option>
                  <option value="Kementerian Keuangan">Kementerian Keuangan</option>
                  <option value="Kementerian Pendidikan">Kementerian Pendidikan</option>
                  <option value="Kementerian Kominfo">Kementerian Kominfo</option>
                  <option value="Kementerian Sosmas">Kementerian Sosmas</option>
                  <option value="Kementerian PSDM">Kementerian PSDM</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Tanggal</label>
                <input 
                  type="date" 
                  className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-green-500" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)} 
                />
              </div>
            </div>

            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                  <tr>
                    <th className="px-6 py-4">Data Anggota</th>
                    <th className="px-6 py-4">Waktu & Lokasi</th>
                    <th className="px-6 py-4">Bukti Foto</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendanceData.length > 0 ? attendanceData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-green-50/30 transition group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-800">{row.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase mt-1 font-medium">{row.nim} • {row.kementerian}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-700 font-medium text-xs">
                          <Clock className="w-3 h-3 text-gray-400" /> {new Date(row.check_in_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] mt-1 ${row.distance_meters > 100 ? 'text-red-500 font-bold' : 'text-green-600'}`}>
                          <MapPin className="w-3 h-3" /> {row.distance_meters}m dari Sekre
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {row.selfie_photo ? (
                          <div 
                            onClick={() => setSelectedPhoto(row.selfie_photo)}
                            className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:ring-2 hover:ring-green-500 transition-all"
                          >
                            <img 
                              src={row.selfie_photo.startsWith('data:') ? row.selfie_photo : `data:image/jpeg;base64,${row.selfie_photo}`} 
                              alt="selfie" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <Eye className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        ) : <span className="text-gray-300 text-[10px] italic">Tanpa Foto</span>}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleValidate(row.id, 'hadir')}
                            disabled={row.status === 'hadir'}
                            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all disabled:opacity-30 shadow-sm border border-green-100"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleValidate(row.id, 'rejected')}
                            disabled={row.status === 'rejected'}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all disabled:opacity-30 shadow-sm border border-red-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">Tidak ada data absensi untuk filter ini</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-5 text-sm uppercase tracking-tight">
               <DownloadIcon /> Export Absensi (Excel)
            </h3>
            <div className="flex flex-wrap gap-6 items-end">
              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kementerian</label>
                <select className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500">
                  <option value="all">Semua Kementerian</option>
                  <option value="Kementerian Keuangan">Kementerian Keuangan</option>
                  <option value="Kementerian Pendidikan">Kementerian Pendidikan</option>
                  <option value="Kementerian Kominfo">Kementerian Kominfo</option>
                  <option value="Kementerian Sosmas">Kementerian Sosmas</option>
                  <option value="Kementerian PSDM">Kementerian PSDM</option>
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

              <button onClick={handleExport} className="bg-[#00923D] hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition-all shadow-sm">
                <FileSpreadsheet className="w-4 h-4" /> Export Excel
              </button>
            </div>
            {exportMsg && <div className="mt-5 p-3 bg-green-50 text-green-700 text-[11px] font-bold rounded-lg border border-green-100 flex items-center gap-2 italic">{exportMsg}</div>}
          </div>
        </main>
      </div>

      {/* Modal Preview Foto */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-lg w-full bg-white rounded-2xl p-2 animate-in zoom-in-95 duration-200 shadow-2xl">
            <img 
              src={selectedPhoto.startsWith('data:') ? selectedPhoto : `data:image/jpeg;base64,${selectedPhoto}`} 
              className="w-full h-auto rounded-xl" 
              alt="Preview" 
            />
            <button 
              className="absolute -top-12 right-0 flex items-center gap-2 text-white font-bold hover:text-red-400 transition-colors"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-6 h-6" /> TUTUP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = "text-gray-900" }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-transform hover:scale-[1.02]">
      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
    const styles = {
        pending: "bg-amber-50 text-amber-600 border-amber-100",
        hadir: "bg-green-50 text-green-600 border-green-100",
        rejected: "bg-red-50 text-red-600 border-red-100",
        tidak_hadir: "bg-gray-50 text-gray-400 border-gray-100",
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${styles[status] || "bg-gray-50 text-gray-500"}`}>
            {status?.replace('_', ' ')}
        </span>
    );
}

const CalendarIcon = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
const DownloadIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
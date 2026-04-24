import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";
import { Check, X, Eye, MapPin, Clock, FileSpreadsheet, LayoutGrid, ClipboardCheck } from "lucide-react";
import * as XLSX from 'xlsx'; // Import untuk fitur Export

const today = new Date();

// PERBAIKAN: Fungsi format tanggal manual agar sinkron dengan Backend terlepas dari Timezone
const fmt = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayName = (d) => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()];

// DAFTAR KEMENTERIAN SESUAI PERMINTAAN
const daftarKementerian = [
  "Kepresidenan", "Komunikasi dan Informasi", "Pengembangan Sumber Daya Manusia",
  "Kebijakan Daerah", "Kebijakan Nasional", "Kebijakan Kampus",
  "Riset dan Keilmuan", "Sekretaris Kabinet", "Lingkungan Hidup",
  "Sosial dan Masyarakat", "Dalam Negeri", "Luar Negeri",
  "Advokasi Kesejahteraan Mahasiswa", "Pergerakan Perempuan",
  "Media Event dan Bisnis", "Audit Internal", "Keuangan"
];

export default function Absensi() {
  const [activeView, setActiveView] = useState("validasi"); // 'validasi' atau 'rekap'
  const [filterKem, setFilterKem] = useState("all");
  const [dateFrom, setDateFrom] = useState(fmt(today));
  
  // State Data
  const [attendanceData, setAttendanceData] = useState([]); // Untuk Validasi Harian
  const [rekapData, setRekapData] = useState([]);           // Untuk Rekapitulasi Grid
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // State Rekapitulasi menggunakan Rentang Tanggal
  const [rekapDateStart, setRekapDateStart] = useState(fmt(new Date(today.getFullYear(), today.getMonth(), 1))); 
  const [rekapDateEnd, setRekapDateEnd] = useState(fmt(today));
  const [rekapDates, setRekapDates] = useState([]);

  // State khusus Export
  const [exportMsg, setExportMsg] = useState("");

  // Logic generate kolom tanggal berdasarkan Rentang Tanggal yang dipilih
  useEffect(() => {
    let generatedDates = [];
    const start = new Date(rekapDateStart);
    const end = new Date(rekapDateEnd);
    let curr = new Date(start);

    let count = 0;
    while (curr <= end && count < 62) {
      if (curr.getDay() >= 1 && curr.getDay() <= 5) {
        generatedDates.push(new Date(curr));
      }
      curr.setDate(curr.getDate() + 1);
      count++;
    }
    setRekapDates(generatedDates);
  }, [rekapDateStart, rekapDateEnd]);

  // Fungsi Fetch Data Validasi (Harian)
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/attendance/monitor?date=${dateFrom}&kementerian=${filterKem}`);
      const data = await res.json();
      setAttendanceData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Gagal mengambil data absensi");
    } finally {
      setLoading(false);
    }
  };

  // Fungsi Fetch Data Rekap (Grid Periode)
  const fetchRekap = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/attendance/rekap?startDate=${rekapDateStart}&endDate=${rekapDateEnd}&kementerian=${filterKem}`);
      const data = await res.json();
      setRekapData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Gagal load rekap");
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch berdasarkan tab yang aktif
  useEffect(() => {
    if (activeView === "validasi") {
      fetchAttendance();
    } else {
      fetchRekap();
    }
  }, [activeView, filterKem, dateFrom, rekapDateStart, rekapDateEnd]);

  const handleValidate = async (id, status) => {
    try {
      const res = await fetch(`${API}/admin/attendance/validate/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchAttendance();
    } catch (err) {
      alert("Gagal melakukan validasi");
    }
  };

  // FUNGSI EXPORT KE EXCEL
  // Ganti fungsi handleExport yang lama dengan ini
const handleExport = () => {
  if (rekapData.length === 0) {
    alert("Tidak ada data untuk diekspor");
    return;
  }

  // ── Baris data utama ──────────────────────────────────────────────────────
  const excelData = rekapData.map(user => {
    const row = {
      "Nama"        : user.name,
      "NIM"         : user.nim,
      "Kementerian" : user.kementerian,
    };

    // Kolom tanggal — dinamis sesuai rekapDates (bisa harian, bulanan, tahunan)
    rekapDates.forEach(dateObj => {
      const dateKey = fmt(dateObj);
      const status  = user.attendance?.[dateKey];

      // Tampilkan label yang lebih manusiawi di Excel
      row[dateKey] = status === 'hadir'      ? 'H'
                   : status === 'rejected'   ? 'X'
                   : status === 'pending'    ? '?'
                   : status === 'tidak_hadir'? '-'
                   : '';
    });

    // ── Kolom Total Hadir di paling kanan ───────────────────────────────────
    const totalHadir = Object.values(user.attendance || {}).filter(
      s => s === 'hadir'
    ).length;
    row["Total Hadir"] = totalHadir;

    return row;
  });

  // ── Baris ringkasan di bawah tabel ───────────────────────────────────────
  // Menghitung jumlah hadir per tanggal (kolom) untuk baris TOTAL
  const summaryRow = {
    "Nama"        : "TOTAL HADIR / HARI",
    "NIM"         : "",
    "Kementerian" : "",
  };
  rekapDates.forEach(dateObj => {
    const dateKey = fmt(dateObj);
    const jumlahHadir = rekapData.filter(
      user => user.attendance?.[dateKey] === 'hadir'
    ).length;
    summaryRow[dateKey] = jumlahHadir;
  });
  summaryRow["Total Hadir"] = ""; // kolom total tidak relevan untuk baris summary

  excelData.push(summaryRow); // tambahkan baris ringkasan di bawah

  // ── Generate worksheet & workbook ─────────────────────────────────────────
  const worksheet  = XLSX.utils.json_to_sheet(excelData);
  const workbook   = XLSX.utils.book_new();

  // ── Styling lebar kolom agar tidak terpotong ──────────────────────────────
  const colWidths = [
    { wch: 28 }, // Nama
    { wch: 16 }, // NIM
    { wch: 30 }, // Kementerian
    ...rekapDates.map(() => ({ wch: 12 })), // kolom tanggal
    { wch: 14 }, // Total Hadir
  ];
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Absensi");

  // ── Nama file menyertakan periode export ──────────────────────────────────
  const filename = `Rekap_Absen_${rekapDateStart}_sd_${rekapDateEnd}.xlsx`;
  XLSX.writeFile(workbook, filename);

  setExportMsg(`✓ File "${filename}" berhasil diekspor.`);
  setTimeout(() => setExportMsg(""), 5000);
};

  return (
    <div className="flex h-screen bg-[#f5f5f0] overflow-hidden text-gray-800 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Manajemen Absensi" subtitle="Validasi & Laporan Kehadiran Sekretariat" />

        {/* TABS SELECTOR */}
        <div className="bg-white border-b border-gray-200 px-6 flex gap-8">
            <button 
                onClick={() => setActiveView("validasi")}
                className={`py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeView === 'validasi' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
            >
                <ClipboardCheck size={16} /> Validasi Harian
            </button>
            <button 
                onClick={() => setActiveView("rekap")}
                className={`py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeView === 'rekap' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
            >
                <LayoutGrid size={16} /> Rekapitulasi Periode
            </button>
        </div>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {activeView === "validasi" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
                <StatCard label="Total Absen Harian" value={attendanceData.length} />
                <StatCard label="Perlu Validasi" value={attendanceData.filter(a => a.status === 'pending').length} color="text-amber-500" />
                <StatCard label="Disetujui" value={attendanceData.filter(a => a.status === 'hadir').length} color="text-green-600" />
                <StatCard label="Ditolak" value={attendanceData.filter(a => a.status === 'rejected').length} color="text-red-500" />
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header Table */}
            <div className="p-4 border-b flex items-center justify-between bg-white">
               <div className="flex items-center gap-2 font-bold text-green-800 uppercase text-xs tracking-widest">
                <CalendarIcon /> {activeView === "validasi" ? "Live Monitoring & Validasi" : "Data Rekapitulasi Anggota"}
              </div>
              {loading && <span className="text-[10px] animate-pulse text-green-600 font-bold uppercase">Memperbarui...</span>}
            </div>

            <div className="p-4 bg-gray-50/50 flex flex-wrap gap-6 items-end border-b border-gray-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kementerian</label>
                <select 
                  className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-green-500" 
                  value={filterKem} 
                  onChange={(e) => setFilterKem(e.target.value)}
                >
                  <option value="all">Semua Kementerian</option>
                  {daftarKementerian.map((kem, idx) => (
                    <option key={idx} value={kem}>{kem}</option>
                  ))}
                </select>
              </div>

              {activeView === "validasi" ? (
                <div className="flex flex-col gap-1.5 animate-in slide-in-from-left-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Tanggal</label>
                    <input type="date" className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-green-500" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 animate-in slide-in-from-left-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rentang Rekapitulasi</label>
                    <div className="flex items-center gap-2 bg-white p-1 px-3 border border-gray-200 rounded-lg shadow-sm">
                      <input type="date" className="text-xs outline-none bg-transparent py-1" value={rekapDateStart} onChange={(e) => setRekapDateStart(e.target.value)} />
                      <span className="text-gray-300 text-xs font-bold">s/d</span>
                      <input type="date" className="text-xs outline-none bg-transparent py-1" value={rekapDateEnd} onChange={(e) => setRekapDateEnd(e.target.value)} />
                    </div>
                </div>
              )}
            </div>

            <div className="p-0 overflow-x-auto">
              {activeView === "validasi" ? (
                /* --- TAB VALIDASI --- */
                <table className="w-full text-left text-sm border-collapse animate-in fade-in duration-500">
                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                    <tr>
                        <th className="px-6 py-4">Data Staf</th>
                        <th className="px-6 py-4">Waktu & Lokasi</th>
                        <th className="px-6 py-4">Foto Absensi</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-center">Validasi</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {attendanceData.length > 0 ? attendanceData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-green-50/30 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold text-gray-800">{row.name}</div>
                            <div className="text-[10px] text-gray-400 uppercase mt-1 font-medium">{row.nim} • {row.kementerian}</div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-gray-700 font-medium text-xs">
                            <Clock className="w-3 h-3 text-gray-400" /> {new Date(row.check_in_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <div className={`text-[10px] mt-1 ${row.distance_meters > 1500 ? 'text-red-500 font-bold' : 'text-green-600'}`}>
                            {row.distance_meters}m dari Sekre
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            {row.selfie_photo ? (
                            <div onClick={() => setSelectedPhoto(row.selfie_photo)} className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:ring-2 hover:ring-green-500 transition-all font-sans">
                                <img src={row.selfie_photo.startsWith('data:') ? row.selfie_photo : `data:image/jpeg;base64,${row.selfie_photo}`} alt="selfie" className="w-full h-full object-cover" />
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
                            <button onClick={() => handleValidate(row.id, 'hadir')} disabled={row.status === 'hadir'} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all disabled:opacity-30 border border-green-100"><Check className="w-4 h-4" /></button>
                            <button onClick={() => handleValidate(row.id, 'rejected')} disabled={row.status === 'rejected'} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all disabled:opacity-30 border border-red-100"><X className="w-4 h-4" /></button>
                            </div>
                        </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-400 italic font-medium">Belum ada aktivitas absensi pada tanggal ini</td></tr>
                    )}
                    </tbody>
                </table>
              ) : (
                /* --- TAB REKAPITULASI (GRID DATA ASLI) --- */
                <table className="w-full text-left text-sm border-collapse animate-in fade-in duration-500 font-sans">
                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                    <tr>
                        <th className="px-4 py-3 border-b min-w-[200px] sticky left-0 bg-gray-50 z-10">Data Staf</th>
                        {rekapDates.map((d, i) => (
                        <th key={i} className="px-2 py-2 border-b text-center border-l border-gray-100 min-w-[70px]">
                            <div className="flex flex-col">
                            <span className="text-[9px] text-gray-400">{getDayName(d)}</span>
                            <span className={`mt-0.5 text-xs font-bold ${fmt(d) === fmt(today) ? 'text-green-600' : 'text-gray-600'}`}>{d.getDate()}</span>
                            </div>
                        </th>
                        ))}
                        {/* HEADER TOTAL */}
                        <th className="px-4 py-3 border-b text-center border-l border-gray-200 bg-green-50/50 text-green-700 sticky right-0 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          Total Hadir
                        </th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {rekapData.length > 0 ? (
                      rekapData.map((user) => {
                        // Kalkulasi Total Hadir dalam rentang yang dipilih
                        const totalHadir = Object.values(user.attendance || {}).filter(s => s === 'hadir').length;

                        return (
                          <tr key={user.id} className="hover:bg-green-50/30 transition group">
                            <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-white group-hover:bg-green-50/30 transition-colors z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <div className="font-bold text-gray-800 text-xs">{user.name}</div>
                                <div className="text-[10px] text-gray-400 uppercase font-medium">{user.nim} • {user.kementerian}</div>
                            </td>
                            {rekapDates.map((dateObj, i) => {
                                const dateKey = fmt(dateObj);
                                const status = user.attendance ? user.attendance[dateKey] : null;
                                return (
                                  <td key={i} className="px-2 py-3 border-l border-gray-50 text-center">
                                      <AttGridDot status={status} />
                                  </td>
                                );
                            })}
                            {/* KOLOM TOTAL HADIR */}
                            <td className="px-2 py-3 border-l border-gray-200 text-center sticky right-0 bg-white group-hover:bg-green-50 transition-colors font-bold text-green-700 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                              <div className="flex flex-col items-center">
                                <span className="text-sm">{totalHadir}</span>
                                <span className="text-[8px] text-gray-400 uppercase tracking-tighter">Hari</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={rekapDates.length + 2} className="px-6 py-20 text-center text-gray-400 italic">Tidak ada data anggota ditemukan.</td></tr>
                    )}
                    </tbody>
                </table>
              )}
            </div>

            {activeView === "rekap" && (
                <div className="p-6 border-t flex flex-wrap gap-6 items-center bg-gray-50/50">
                    <LegendItem label="Hadir (Tervalidasi)" status="hadir" />
                    <LegendItem label="Ditolak" status="rejected" />
                    <LegendItem label="Belum Absen" status={null} />
                </div>
            )}
          </div>

          {/* EXPORT SECTION - HANYA DI REKAPITULASI */}
          {activeView === "rekap" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-in slide-in-from-bottom-2">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-5 text-sm uppercase tracking-tight">
                 <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export Data Kehadiran (Excel)
              </h3>
              <div className="flex flex-wrap gap-6 items-end">
                <div className="flex flex-col gap-1.5 min-w-[180px]">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter Kementerian</label>
                  <select 
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 shadow-sm"
                    value={filterKem}
                    onChange={(e) => setFilterKem(e.target.value)}
                  >
                    <option value="all">Semua Kementerian</option>
                    {daftarKementerian.map((kem, idx) => (
                      <option key={idx} value={kem}>{kem}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[300px]">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rentang Tanggal Export</label>
                    <div className="flex items-center gap-2 bg-white p-1 px-3 border border-gray-200 rounded-lg shadow-sm">
                      <input type="date" className="text-xs outline-none bg-transparent py-1" value={rekapDateStart} onChange={(e) => setRekapDateStart(e.target.value)} />
                      <span className="text-gray-300 text-xs font-bold">s/d</span>
                      <input type="date" className="text-xs outline-none bg-transparent py-1" value={rekapDateEnd} onChange={(e) => setRekapDateEnd(e.target.value)} />
                    </div>
                </div>

                <button onClick={handleExport} className="bg-[#00923D] hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition-all shadow-md shadow-green-100">
                  <FileSpreadsheet className="w-4 h-4" /> Generate Report
                </button>
              </div>
              {exportMsg && <div className="mt-5 p-3 bg-green-50 text-green-700 text-[11px] font-bold rounded-lg border border-green-100 flex items-center gap-2 italic font-sans">{exportMsg}</div>}
            </div>
          )}
        </main>
      </div>

      {/* Modal Preview Foto */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm shadow-2xl" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-lg w-full bg-white rounded-3xl p-2 animate-in zoom-in-95 duration-200 font-sans">
            <img src={selectedPhoto.startsWith('data:') ? selectedPhoto : `data:image/jpeg;base64,${selectedPhoto}`} className="w-full h-auto rounded-2xl" alt="Preview" />
            <button className="absolute -top-14 right-0 flex items-center gap-2 text-white font-black px-4 py-2 bg-red-600 rounded-full hover:bg-red-700 transition-colors" onClick={() => setSelectedPhoto(null)}>
              <X size={20} /> TUTUP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB COMPONENTS ---
function StatCard({ label, value, color = "text-gray-900" }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-3xl font-mono font-bold ${color}`}>{value}</div>
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

function LegendItem({ label, status }) {
    const styles = { hadir: "bg-green-500", rejected: "bg-red-500", pending: "bg-amber-400" };
    return (
      <div className="flex items-center gap-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
        <div className={`w-4 h-4 rounded ${status ? styles[status] : "bg-gray-200 border border-dashed border-gray-400"}`}></div> <span>{label}</span>
      </div>
    );
}

function AttGridDot({ status }) {
  const styles = {
    hadir: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]",
    rejected: "bg-red-500",
    pending: "bg-amber-400 animate-pulse",
    tidak_hadir: "bg-red-200",
  };
  if (!status) return <div className="w-5 h-5 rounded-md bg-gray-100 mx-auto border border-gray-200 border-dashed" title="Belum Absen"></div>;
  return <div className={`w-5 h-5 rounded-md mx-auto transition-transform hover:scale-125 cursor-help ${styles[status]}`} title={status.toUpperCase()}></div>;
}

const CalendarIcon = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
const DownloadIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
// pages/Absensi/Absensi.jsx
// Perubahan:
//   - Tambah kolom pencarian nama di tab Validasi & Rekapitulasi
//   - Tabel Rekap sekarang tampilkan Nama, NIM, Kementerian, Jabatan
//   - Urutan baris mengikuti hierarki (Kepresidenan → … → Kementerian lain)

import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";
import {
  Check, X, Eye, Clock,
  FileSpreadsheet, LayoutGrid, ClipboardCheck, Search,
} from "lucide-react";
import useExportAbsensi from "../../hooks/useExportAbsensi";

// ─── Helpers ────────────────────────────────────────────────────────────────

const today = new Date();

const fmt = (date) => {
  const d = new Date(date);
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day   = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDayName = (d) => ["Min","Sen","Sel","Rab","Kam","Jum","Sab"][d.getDay()];

const daftarKementerian = [
  "Kepresidenan", "Komunikasi dan Informasi", "Pengembangan Sumber Daya Manusia",
  "Kebijakan Daerah", "Kebijakan Nasional", "Kebijakan Kampus",
  "Riset dan Keilmuan", "Sekretaris Kabinet", "Lingkungan Hidup",
  "Sosial dan Masyarakat", "Dalam Negeri", "Luar Negeri",
  "Advokasi Kesejahteraan Mahasiswa", "Pergerakan Perempuan",
  "Media Event dan Bisnis", "Audit Internal", "Keuangan",
];

// Urutan kelompok prioritas (tampil paling atas di rekap)
const KELOMPOK_PRIORITAS = ["Kepresidenan", "Audit Internal"];

const HIERARKI_JABATAN = {
  Kepresidenan: [
    "Presiden", "Wakil Presiden", "Sekretaris Negara",
    "Menteri Koordinator", "Staf Kepresidenan",
  ],
  "Audit Internal": [
    "Kepala Audit Internal", "Auditor", "Staf Audit Internal",
  ],
  _kementerian: [
    "Menteri", "Sekretaris Menteri", "Staf Ahli Menteri",
    "Staff Ahli", "Staf Ahli", "Staf", "Staff",
  ],
};

function getJabatanOrder(kelompok, jabatan = "") {
  const key  = KELOMPOK_PRIORITAS.includes(kelompok) ? kelompok : "_kementerian";
  const list = HIERARKI_JABATAN[key] || [];
  const idx  = list.findIndex(j =>
    jabatan.toLowerCase().trim().startsWith(j.toLowerCase())
  );
  return idx === -1 ? list.length : idx;
}

function getKelompokOrder(kelompok) {
  const idx = KELOMPOK_PRIORITAS.indexOf(kelompok);
  return idx === -1 ? KELOMPOK_PRIORITAS.length : idx;
}

// Urutkan array rekapData sesuai hierarki kelompok & jabatan
function sortedRekapData(data) {
  return [...data].sort((a, b) => {
    const ka = (a.kementerian || "—").trim();
    const kb = (b.kementerian || "—").trim();
    const oka = getKelompokOrder(ka);
    const okb = getKelompokOrder(kb);
    if (oka !== okb) return oka - okb;
    if (ka !== kb) return ka.localeCompare(kb, "id");
    const oja = getJabatanOrder(ka, a.jabatan || a.position || "");
    const ojb = getJabatanOrder(kb, b.jabatan || b.position || "");
    if (oja !== ojb) return oja - ojb;
    return (a.name || "").localeCompare(b.name || "", "id");
  });
}

// ─── Komponen utama ──────────────────────────────────────────────────────────

export default function Absensi() {
  const [activeView,     setActiveView]     = useState("validasi");
  const [filterKem,      setFilterKem]      = useState("all");
  const [dateFrom,       setDateFrom]       = useState(fmt(today));
  const [attendanceData, setAttendanceData] = useState([]);
  const [rekapData,      setRekapData]      = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [selectedPhoto,  setSelectedPhoto]  = useState(null);

  // ── Pencarian nama (baru) ──
  const [searchQuery, setSearchQuery] = useState("");

  const [rekapDateStart, setRekapDateStart] = useState(
    fmt(new Date(today.getFullYear(), today.getMonth(), 1))
  );
  const [rekapDateEnd, setRekapDateEnd] = useState(fmt(today));
  const [rekapDates,   setRekapDates]   = useState([]);

  const { handleExport, exportMsg } = useExportAbsensi();

  // ── Generate daftar hari kerja ──
  useEffect(() => {
    const dates = [];
    const start = new Date(rekapDateStart);
    const end   = new Date(rekapDateEnd);
    let curr = new Date(start);
    let count = 0;
    while (curr <= end && count < 62) {
      if (curr.getDay() >= 1 && curr.getDay() <= 5) dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
      count++;
    }
    setRekapDates(dates);
  }, [rekapDateStart, rekapDateEnd]);

  // ── Fetch data validasi harian ──
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/admin/attendance/monitor?date=${dateFrom}&kementerian=${filterKem}`);
      const data = await res.json();
      setAttendanceData(Array.isArray(data) ? data : []);
    } catch {
      console.error("Gagal mengambil data absensi");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch data rekapitulasi ──
  const fetchRekap = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/admin/attendance/rekap?startDate=${rekapDateStart}&endDate=${rekapDateEnd}&kementerian=${filterKem}`);
      const data = await res.json();
      setRekapData(Array.isArray(data) ? data : []);
    } catch {
      console.error("Gagal load rekap");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchQuery(""); // reset pencarian saat pindah tab / filter berubah
    if (activeView === "validasi") fetchAttendance();
    else fetchRekap();
  }, [activeView, filterKem, dateFrom, rekapDateStart, rekapDateEnd]);

  const handleValidate = async (id, status) => {
    try {
      const res = await fetch(`${API}/admin/attendance/validate/${id}`, {
        method : "PUT",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ status }),
      });
      if (res.ok) fetchAttendance();
    } catch {
      alert("Gagal melakukan validasi");
    }
  };

  // ── Filter pencarian (live, case-insensitive) ──
  const filteredAttendance = useMemo(() =>
    attendanceData.filter(a =>
      (a.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    ), [attendanceData, searchQuery]
  );

  const filteredRekap = useMemo(() => {
    const sorted = sortedRekapData(rekapData);
    if (!searchQuery.trim()) return sorted;
    return sorted.filter(u =>
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rekapData, searchQuery]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-800 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Manajemen Absensi" subtitle="Validasi & Laporan Kehadiran Sekretariat" />

        {/* ── Tab navigasi ── */}
        <div className="bg-white border-b border-gray-200 px-6 flex gap-8">
          <TabButton icon={<ClipboardCheck size={16} />} label="Validasi Harian"      active={activeView === "validasi"} onClick={() => setActiveView("validasi")} />
          <TabButton icon={<LayoutGrid size={16} />}     label="Rekapitulasi Periode" active={activeView === "rekap"}    onClick={() => setActiveView("rekap")}    />
        </div>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Stat cards (hanya tampil di tab validasi) ── */}
          {activeView === "validasi" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
              <StatCard label="Total Absen Harian"  value={attendanceData.length} />
              <StatCard label="Perlu Validasi"      value={attendanceData.filter(a => a.status === "pending").length}  color="text-amber-500" />
              <StatCard label="Disetujui"            value={attendanceData.filter(a => a.status === "hadir").length}    color="text-green-600" />
              <StatCard label="Ditolak"              value={attendanceData.filter(a => a.status === "rejected").length} color="text-red-500"   />
            </div>
          )}

          {/* ── Panel utama tabel ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Header panel */}
            <div className="p-4 border-b flex items-center justify-between bg-white">
              <div className="flex items-center gap-2 font-bold text-green-800 uppercase text-xs tracking-widest">
                <CalendarIcon />
                {activeView === "validasi" ? "Live Monitoring & Validasi" : "Data Rekapitulasi Anggota"}
              </div>
              {loading && (
                <span className="text-[10px] animate-pulse text-green-600 font-bold uppercase">
                  Memperbarui...
                </span>
              )}
            </div>

            {/* Filter bar */}
            <div className="p-4 bg-gray-50/50 flex flex-wrap gap-6 items-end border-b border-gray-100">

              {/* ── Pencarian nama (baru) ── */}
              <FilterGroup label="Cari Nama">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ketik nama anggota..."
                    className="bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-green-500 min-w-[200px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      onClick={() => setSearchQuery("")}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </FilterGroup>

              {/* Filter kementerian */}
              <FilterGroup label="Kementerian">
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
              </FilterGroup>

              {/* Filter tanggal */}
              {activeView === "validasi" ? (
                <FilterGroup label="Pilih Tanggal">
                  <input
                    type="date"
                    className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-green-500"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </FilterGroup>
              ) : (
                <FilterGroup label="Rentang Rekapitulasi">
                  <div className="flex items-center gap-2 bg-white p-1 px-3 border border-gray-200 rounded-lg shadow-sm">
                    <input type="date" className="text-xs outline-none bg-transparent py-1" value={rekapDateStart} onChange={(e) => setRekapDateStart(e.target.value)} />
                    <span className="text-gray-300 text-xs font-bold">s/d</span>
                    <input type="date" className="text-xs outline-none bg-transparent py-1" value={rekapDateEnd}   onChange={(e) => setRekapDateEnd(e.target.value)} />
                  </div>
                </FilterGroup>
              )}

              {/* Indikator jumlah hasil */}
              {searchQuery && (
                <div className="flex items-end pb-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                    {activeView === "validasi" ? filteredAttendance.length : filteredRekap.length} hasil ditemukan
                  </span>
                </div>
              )}
            </div>

            {/* ── Tabel ── */}
            <div className="p-0 overflow-x-auto">
              {activeView === "validasi"
                ? <TableValidasi data={filteredAttendance} onValidate={handleValidate} onPhotoClick={setSelectedPhoto} searchQuery={searchQuery} />
                : <TableRekap data={filteredRekap} dates={rekapDates} searchQuery={searchQuery} />
              }
            </div>

            {/* Legenda rekap */}
            {activeView === "rekap" && (
              <div className="p-6 border-t flex flex-wrap gap-6 items-center bg-gray-50/50">
                <LegendItem label="Hadir (Tervalidasi)"  status="hadir"    />
                <LegendItem label="Ditolak"              status="rejected"  />
                <LegendItem label="Alfa (Tidak Absen)"   status="alfa"      />
              </div>
            )}
          </div>

          {/* ── Panel export Excel (hanya di tab rekap) ── */}
          {activeView === "rekap" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-in slide-in-from-bottom-2">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-5 text-sm uppercase tracking-tight">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                Export Data Kehadiran (Excel)
              </h3>

              <div className="flex flex-wrap gap-6 items-end">
                <FilterGroup label="Filter Kementerian">
                  <select
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 shadow-sm min-w-[180px]"
                    value={filterKem}
                    onChange={(e) => setFilterKem(e.target.value)}
                  >
                    <option value="all">Semua Kementerian</option>
                    {daftarKementerian.map((kem, idx) => (
                      <option key={idx} value={kem}>{kem}</option>
                    ))}
                  </select>
                </FilterGroup>

                <FilterGroup label="Rentang Tanggal Export">
                  <div className="flex items-center gap-2 bg-white p-1 px-3 border border-gray-200 rounded-lg shadow-sm min-w-[300px]">
                    <input type="date" className="text-xs outline-none bg-transparent py-1" value={rekapDateStart} onChange={(e) => setRekapDateStart(e.target.value)} />
                    <span className="text-gray-300 text-xs font-bold">s/d</span>
                    <input type="date" className="text-xs outline-none bg-transparent py-1" value={rekapDateEnd}   onChange={(e) => setRekapDateEnd(e.target.value)} />
                  </div>
                </FilterGroup>

                <button
                  onClick={() => handleExport({ rekapData, rekapDates, rekapDateStart, rekapDateEnd, filterKem })}
                  className="bg-[#00923D] hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 text-xs uppercase tracking-widest transition-all shadow-md shadow-green-100"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Generate Report
                </button>
              </div>

              {exportMsg && (
                <div className="mt-5 p-3 bg-green-50 text-green-700 text-[11px] font-bold rounded-lg border border-green-100 flex items-center gap-2 italic">
                  {exportMsg}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Modal preview foto ── */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-lg w-full bg-white rounded-3xl p-2 animate-in zoom-in-95 duration-200">
            <img
              src={selectedPhoto.startsWith("data:") ? selectedPhoto : `data:image/jpeg;base64,${selectedPhoto}`}
              className="w-full h-auto rounded-2xl"
              alt="Preview selfie"
            />
            <button
              className="absolute -top-14 right-0 flex items-center gap-2 text-white font-black px-4 py-2 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
              onClick={() => setSelectedPhoto(null)}
            >
              <X size={20} /> TUTUP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-komponen ────────────────────────────────────────────────────────────

function TabButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
        active ? "border-green-600 text-green-700" : "border-transparent text-gray-400 hover:text-gray-700"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

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
    pending     : "bg-amber-50 text-amber-600 border-amber-100",
    hadir       : "bg-green-50 text-green-600 border-green-100",
    rejected    : "bg-red-50 text-red-600 border-red-100",
    tidak_hadir : "bg-gray-50 text-gray-400 border-gray-100",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${styles[status] || "bg-gray-50 text-gray-500"}`}>
      {status?.replace("_", " ")}
    </span>
  );
}

function LegendItem({ label, status }) {
  const styles = {
    hadir    : "bg-green-500",
    rejected : "bg-red-500",
    pending  : "bg-amber-400",
    alfa     : "bg-orange-400",
  };
  return (
    <div className="flex items-center gap-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
      <div className={`w-4 h-4 rounded ${styles[status] || "bg-gray-200 border border-dashed border-gray-400"}`} />
      <span>{label}</span>
    </div>
  );
}

function AttGridDot({ status }) {
  const styles = {
    hadir       : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]",
    rejected    : "bg-red-500",
    pending     : "bg-amber-400 animate-pulse",
    tidak_hadir : "bg-red-200",
    alfa        : "bg-orange-400",
  };
  return (
    <div
      className={`w-5 h-5 rounded-md mx-auto transition-transform hover:scale-125 cursor-help ${styles[status] ?? styles.alfa}`}
      title={status ? status.toUpperCase() : "ALFA"}
    />
  );
}

// Helper: highlight teks yang cocok dengan query
function Highlight({ text = "", query = "" }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
          : part
      )}
    </>
  );
}

// ─── Tabel validasi harian ───────────────────────────────────────────────────

function TableValidasi({ data, onValidate, onPhotoClick, searchQuery }) {
  return (
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
        {data.length > 0 ? data.map((row, idx) => (
          <tr key={idx} className="hover:bg-green-50/30 transition">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="font-bold text-gray-800">
                <Highlight text={row.name} query={searchQuery} />
              </div>
              <div className="text-[10px] text-gray-400 uppercase mt-1 font-medium">
                {row.nim} • {row.kementerian}
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-1.5 text-gray-700 font-medium text-xs">
                <Clock className="w-3 h-3 text-gray-400" />
                {new Date(row.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className={`text-[10px] mt-1 ${row.distance_meters > 1500 ? "text-red-500 font-bold" : "text-green-600"}`}>
                {row.distance_meters}m dari Sekre
              </div>
            </td>
            <td className="px-6 py-4">
              {row.selfie_photo ? (
                <div
                  onClick={() => onPhotoClick(row.selfie_photo)}
                  className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:ring-2 hover:ring-green-500 transition-all"
                >
                  <img
                    src={row.selfie_photo.startsWith("data:") ? row.selfie_photo : `data:image/jpeg;base64,${row.selfie_photo}`}
                    alt="selfie"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Eye className="w-3 h-3 text-white" />
                  </div>
                </div>
              ) : (
                <span className="text-gray-300 text-[10px] italic">Tanpa Foto</span>
              )}
            </td>
            <td className="px-6 py-4">
              <StatusBadge status={row.status} />
            </td>
            <td className="px-6 py-4">
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => onValidate(row.id, "hadir")}
                  disabled={row.status === "hadir"}
                  className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all disabled:opacity-30 border border-green-100"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onValidate(row.id, "rejected")}
                  disabled={row.status === "rejected"}
                  className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all disabled:opacity-30 border border-red-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        )) : (
          <tr>
            <td colSpan="5" className="px-6 py-20 text-center text-gray-400 italic font-medium">
              {searchQuery
                ? `Tidak ada anggota dengan nama "${searchQuery}"`
                : "Belum ada aktivitas absensi pada tanggal ini"}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// ─── Tabel rekapitulasi grid (diperbarui: tampilkan nama, NIM, kementerian, jabatan + urutan hierarki) ──

function TableRekap({ data, dates, searchQuery }) {
  // Kelompokkan per kementerian (data sudah tersortir dari parent)
  const groups = useMemo(() => {
    const map = new Map();
    data.forEach(user => {
      const k = (user.kementerian || "—").trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(user);
    });
    return map;
  }, [data]);

  const KELOMPOK_COLOR = {
    Kepresidenan    : { header: "bg-blue-50 text-blue-900",  dot: "bg-blue-200"  },
    "Audit Internal": { header: "bg-purple-50 text-purple-900", dot: "bg-purple-200" },
    _default        : { header: "bg-green-50 text-green-900",  dot: "bg-green-200" },
  };
  const kColor = (kem) => KELOMPOK_COLOR[kem] ?? KELOMPOK_COLOR._default;

  return (
    <table className="w-full text-left text-sm border-collapse animate-in fade-in duration-500">
      <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
        <tr>
          {/* Kolom identitas — sticky */}
          <th className="px-3 py-3 border-b sticky left-0 bg-gray-50 z-10 text-center w-10">No</th>
          <th className="px-4 py-3 border-b sticky left-10 bg-gray-50 z-10 min-w-[160px]">Nama</th>
          <th className="px-3 py-3 border-b min-w-[110px]">NIM</th>
          <th className="px-3 py-3 border-b min-w-[150px]">Kementerian</th>
          <th className="px-3 py-3 border-b min-w-[150px]">Jabatan</th>
          {/* Kolom tanggal */}
          {dates.map((d, i) => (
            <th key={i} className="px-2 py-2 border-b text-center border-l border-gray-100 min-w-[58px]">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400">{getDayName(d)}</span>
                <span className={`mt-0.5 text-xs font-bold ${fmt(d) === fmt(today) ? "text-green-600" : "text-gray-600"}`}>
                  {d.getDate()}
                </span>
              </div>
            </th>
          ))}
          {/* Total */}
          <th className="px-4 py-3 border-b text-center border-l border-gray-200 bg-green-50 text-green-700 sticky right-0 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
            Total Hadir
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {data.length === 0 ? (
          <tr>
            <td colSpan={dates.length + 6} className="px-6 py-20 text-center text-gray-400 italic">
              {searchQuery
                ? `Tidak ada anggota dengan nama "${searchQuery}"`
                : "Tidak ada data anggota ditemukan."}
            </td>
          </tr>
        ) : (
          Array.from(groups.entries()).map(([kem, members]) => {
            const kc = kColor(kem);
            return (
              <React.Fragment key={kem}>
                {/* Sub-header kelompok kementerian */}
                <tr>
                  {/* Sel sticky kiri — berisi nama kementerian */}
                  <td
                    colSpan={5}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest ${kc.header} border-y border-gray-100 sticky left-0 z-20`}
                  >
                    {kem}
                    <span className="ml-2 font-normal normal-case tracking-normal opacity-60">
                      ({members.length} anggota)
                    </span>
                  </td>
                  {/* Sel sisa (tanggal + total) — warna sama tapi tidak sticky */}
                  {dates.map((_, i) => (
                    <td key={i} className={`py-2 border-y border-gray-100 ${kc.header}`} />
                  ))}
                  <td className={`py-2 border-y border-gray-100 ${kc.header} sticky right-0 z-20`} />
                </tr>

                {/* Baris anggota */}
                {members.map((user, mi) => {
                  const jabatan     = user.jabatan || user.position || user.role_label || user.jabatan_name || "—";
                  const totalHadir  = Object.values(user.attendance || {}).filter(s => s === "hadir").length;
                  // nomor urut global
                  let globalNo = 0;
                  let idx = 0;
                  for (const [k, m] of groups.entries()) {
                    if (k === kem) { globalNo = idx + mi + 1; break; }
                    idx += m.length;
                  }

                  return (
                    <tr key={user.id} className="hover:bg-green-50/30 transition group">
                      {/* No */}
                      <td className={`px-3 py-3 text-center text-[10px] text-gray-400 font-bold sticky left-0 z-10 transition-colors ${mi % 2 === 0 ? "bg-white group-hover:bg-green-50" : "bg-gray-50 group-hover:bg-green-50"}`}>
                        {globalNo}
                      </td>
                      {/* Nama */}
                      <td className={`px-4 py-3 whitespace-nowrap sticky left-10 z-10 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] ${mi % 2 === 0 ? "bg-white group-hover:bg-green-50" : "bg-gray-50 group-hover:bg-green-50"}`}>
                        <div className="font-bold text-gray-800 text-xs">
                          <Highlight text={user.name || "—"} query={searchQuery} />
                        </div>
                      </td>
                      {/* NIM */}
                      <td className="px-3 py-3 text-[11px] text-gray-500 font-mono">{user.nim || "—"}</td>
                      {/* Kementerian */}
                      <td className="px-3 py-3 text-[11px] text-gray-600">{kem}</td>
                      {/* Jabatan */}
                      <td className="px-3 py-3 text-[11px] text-gray-600 italic">{jabatan}</td>

                      {/* Kolom tanggal */}
                      {dates.map((dateObj, i) => {
                        const dateKey = fmt(dateObj);
                        const status  = user.attendance?.[dateKey] ?? "alfa";
                        return (
                          <td key={i} className="px-2 py-3 border-l border-gray-50 text-center">
                            <AttGridDot status={status} />
                          </td>
                        );
                      })}

                      {/* Total hadir */}
                      <td className={`px-2 py-3 border-l border-gray-200 text-center sticky right-0 z-10 transition-colors font-bold text-green-700 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)] ${mi % 2 === 0 ? "bg-white group-hover:bg-green-50" : "bg-gray-50 group-hover:bg-green-50"}`}>
                        <div className="flex flex-col items-center">
                          <span className="text-sm">{totalHadir}</span>
                          <span className="text-[8px] text-gray-400 uppercase tracking-tighter">Hari</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })
        )}
      </tbody>
    </table>
  );
}

// ─── Icon lokal ──────────────────────────────────────────────────────────────

const CalendarIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
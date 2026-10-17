import { Fragment, useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, Clock, Eye, FileSpreadsheet, LayoutGrid, Search, Users, X } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";
import useExportAbsensi from "../../hooks/useExportAbsensi";
import usePermissions from "../../hooks/usePermissions";

const kementerianIGM = [
  "Komunikasi dan Informasi", "Pengembangan Sumber Daya Mahasiswa",
  "Kebijakan Daerah", "Kebijakan Nasional", "Kebijakan Kampus",
  "Riset dan Keilmuan", "Sekretaris Kabinet", "Lingkungan Hidup",
  "Sosial dan Masyarakat", "Dalam Negeri", "Luar Negeri",
  "Advokasi Kesejahteraan Mahasiswa", "Pergerakan Perempuan",
  "Mitra Event dan Bisnis", "Audit Internal", "Keuangan",
];

const dateValue = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDate = value => new Date(`${String(value).slice(0, 10)}T00:00:00`);
const dayName = date => ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][date.getDay()];
const attendanceCategory = status => {
  if (status === "rejected") return "rejected";
  if (status === "hadir" || status === "pending") return "hadir";
  return "alfa";
};

const attendanceLabels = { hadir: "Hadir", rejected: "Ditolak", alfa: "Alfa" };

function StatusBadge({ status }) {
  const category = attendanceCategory(status);
  const styles = {
    hadir: "border-green-100 bg-green-50 text-green-700",
    rejected: "border-red-100 bg-red-50 text-red-600",
    alfa: "border-orange-100 bg-orange-50 text-orange-600",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${styles[category]}`}>{attendanceLabels[category]}</span>;
}

function StatusDot({ status }) {
  const category = attendanceCategory(status);
  const colors = {
    hadir: "bg-green-500",
    rejected: "bg-red-500",
    alfa: "bg-orange-300",
  };
  return <span title={attendanceLabels[category]} className={`mx-auto block h-5 w-5 rounded-md ${colors[category]}`} />;
}

export default function AbsensiIGM() {
  const { hasPermission } = usePermissions();
  const canManageAttendance = hasPermission("attendance.manage");
  const canExportReports = hasPermission("reports.export");
  const [periodId, setPeriodId] = useState("");
  const [periodName, setPeriodName] = useState("");
  const [view, setView] = useState("daily");
  const [date, setDate] = useState(dateValue(new Date()));
  const [startDate, setStartDate] = useState(dateValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [endDate, setEndDate] = useState(dateValue(new Date()));
  const [kementerian, setKementerian] = useState("all");
  const [search, setSearch] = useState("");
  const [dailyRows, setDailyRows] = useState([]);
  const [recapRows, setRecapRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const { handleExport, exportMsg } = useExportAbsensi();

  useEffect(() => {
    fetch(`${API}/periode`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Gagal memuat periode");
        const active = data.find(period => Number(period.is_active) === 1);
        if (!active) {
          setPeriodId("");
          setPeriodName("");
          setError("Belum ada periode kepengurusan aktif. Aktifkan periode terlebih dahulu di Manajemen Periode.");
          return;
        }
        setPeriodId(String(active.id));
        setPeriodName(active.name);
      })
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (!periodId) return;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ period_id: periodId, kementerian });
        if (view === "daily") {
          params.set("date", date);
          const response = await fetch(`${API}/admin/attendance/igm-monitor?${params}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Gagal memuat validasi absensi IGM");
          setDailyRows(Array.isArray(data) ? data : []);
        } else {
          params.set("startDate", startDate);
          params.set("endDate", endDate);
          const response = await fetch(`${API}/admin/attendance/rekap-igm?${params}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Gagal memuat rekap absensi IGM");
          setRecapRows(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [periodId, view, date, startDate, endDate, kementerian, reload]);

  const workDates = useMemo(() => {
    const dates = [];
    let cursor = parseDate(startDate);
    const end = parseDate(endDate);
    let count = 0;
    while (cursor <= end && count < 62) {
      if (cursor.getDay() >= 1 && cursor.getDay() <= 5) dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
      count += 1;
    }
    return dates;
  }, [startDate, endDate]);

  const filteredDaily = useMemo(() => dailyRows.filter(row =>
    `${row.name} ${row.nim}`.toLowerCase().includes(search.toLowerCase())
  ), [dailyRows, search]);

  const filteredRecap = useMemo(() => [...recapRows]
    .filter(row => `${row.name} ${row.nim}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.kementerian || "").localeCompare(b.kementerian || "", "id") || a.name.localeCompare(b.name, "id")),
  [recapRows, search]);

  const handleValidate = async (id, status) => {
    if (!canManageAttendance) return;
    try {
      const response = await fetch(`${API}/admin/attendance/validate/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Gagal memvalidasi absensi");
      setReload(value => value + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const groupedRecap = useMemo(() => {
    const groups = new Map();
    filteredRecap.forEach(row => {
      const key = row.kementerian || "Tanpa Kementerian";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return groups;
  }, [filteredRecap]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-800">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar title="Manajemen Absensi IGM" subtitle={`Validasi dan rekap kehadiran anggota IGM · ${periodName || "Periode aktif belum diatur"}`} />
        <div className="flex gap-4 overflow-x-auto border-b border-gray-200 bg-white px-4 sm:gap-6 sm:px-6">
          <button type="button" onClick={() => { setView("daily"); setSearch(""); }} className={`flex shrink-0 items-center gap-2 border-b-2 py-3 text-[10px] font-bold uppercase tracking-widest sm:py-4 sm:text-xs ${view === "daily" ? "border-green-600 text-green-700" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
            <ClipboardCheck size={16} /> Validasi Harian
          </button>
          <button type="button" onClick={() => { setView("recap"); setSearch(""); }} className={`flex shrink-0 items-center gap-2 border-b-2 py-3 text-[10px] font-bold uppercase tracking-widest sm:py-4 sm:text-xs ${view === "recap" ? "border-green-600 text-green-700" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
            <LayoutGrid size={16} /> Rekapitulasi Periode
          </button>
        </div>

        <main className="min-w-0 flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-5 sm:p-6">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {view === "daily" && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Total Absen" value={dailyRows.length} />
              <Stat label="Perlu Validasi" value={dailyRows.filter(row => row.status === "pending").length} color="text-amber-600" />
              <Stat label="Disetujui" value={dailyRows.filter(row => row.status === "hadir").length} color="text-green-700" />
              <Stat label="Ditolak" value={dailyRows.filter(row => row.status === "rejected").length} color="text-red-600" />
            </div>
          )}

          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-stretch gap-3 border-b border-gray-100 bg-gray-50/60 p-3 sm:items-end sm:gap-4 sm:p-4">
              <Filter label="Kementerian">
                <select value={kementerian} onChange={event => setKementerian(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-green-500 sm:w-auto sm:min-w-48">
                  <option value="all">Semua Kementerian</option>
                  {kementerianIGM.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </Filter>
              {view === "daily" ? (
                <Filter label="Tanggal">
                  <input type="date" value={date} onChange={event => setDate(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-green-500 sm:w-auto" />
                </Filter>
              ) : (
                <Filter label="Rentang Rekap">
                  <div className="flex w-full items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 sm:w-auto sm:gap-2 sm:px-3">
                    <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="min-w-0 w-full flex-1 text-xs outline-none" />
                    <span className="text-xs text-gray-400">s/d</span>
                    <input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="min-w-0 w-full flex-1 text-xs outline-none" />
                  </div>
                </Filter>
              )}
              <div className="relative w-full min-w-0 flex-1 sm:min-w-48 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama atau NIM" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-green-500" />
              </div>
              {view === "recap" && canExportReports && (
                <button type="button" onClick={() => handleExport({
                  rekapData: recapRows,
                  rekapDates: workDates,
                  rekapDateStart: startDate,
                  rekapDateEnd: endDate,
                  filterKem: kementerian,
                  isIgm: true,
                })} className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#00923D] px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-green-700 sm:h-[34px] sm:min-h-0 sm:w-auto">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
                </button>
              )}
              {loading && <span className="ml-auto text-[10px] font-bold uppercase text-green-700">Memuat...</span>}
            </div>
            {exportMsg && <div className="border-b border-green-100 bg-green-50 px-4 py-2 text-xs font-medium text-green-700">{exportMsg}</div>}

            {view === "daily" ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <tr><th className="px-5 py-4">Anggota IGM</th><th className="px-5 py-4">Waktu & Lokasi</th><th className="px-5 py-4">Foto</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-center">Validasi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDaily.length ? filteredDaily.map(row => (
                      <tr key={row.id} className="hover:bg-green-50/30">
                        <td className="px-5 py-4"><p className="font-bold text-gray-800">{row.name}</p><p className="mt-1 text-[10px] uppercase text-gray-400">{row.nim} · {row.kementerian}</p></td>
                        <td className="px-5 py-4"><p className="flex items-center gap-1.5 text-xs font-medium"><Clock className="h-3.5 w-3.5 text-gray-400" />{row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</p><p className="mt-1 text-[10px] text-gray-400">{row.distance_meters == null ? "-" : `${row.distance_meters} m dari Sekre`}</p></td>
                        <td className="px-5 py-4">{row.selfie_photo ? <button type="button" onClick={() => setSelectedPhoto(row.selfie_photo)} className="relative block h-10 w-10 overflow-hidden rounded-md border border-gray-200"><img src={row.selfie_photo.startsWith("data:") ? row.selfie_photo : `data:image/jpeg;base64,${row.selfie_photo}`} alt="Foto absensi" className="h-full w-full object-cover" /><Eye className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" /></button> : <span className="text-xs italic text-gray-300">Tanpa foto</span>}</td>
                        <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                        <td className="px-5 py-4"><div className="flex justify-center gap-2"><button type="button" title="Setujui" disabled={!canManageAttendance || row.status === "hadir"} onClick={() => handleValidate(row.id, "hadir")} className="rounded-md border border-green-100 bg-green-50 p-1.5 text-green-700 hover:bg-green-600 hover:text-white disabled:opacity-30"><Check className="h-4 w-4" /></button><button type="button" title="Tolak" disabled={!canManageAttendance || row.status === "rejected"} onClick={() => handleValidate(row.id, "rejected")} className="rounded-md border border-red-100 bg-red-50 p-1.5 text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-30"><X className="h-4 w-4" /></button></div></td>
                      </tr>
                    )) : <tr><td colSpan="5" className="p-14 text-center text-sm text-gray-400">Tidak ada absensi IGM untuk tanggal ini.</td></tr>}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="max-w-full overflow-auto overscroll-x-contain">
                <table className="w-full min-w-max border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <tr><th className="sticky left-0 z-20 w-10 min-w-10 bg-gray-50 px-2 py-3 text-center">No</th><th className="sticky left-10 z-20 w-28 min-w-28 max-w-28 whitespace-nowrap bg-gray-50 px-2 py-3 sm:w-36 sm:min-w-36 sm:max-w-36 sm:px-3">Nama</th><th className="px-3 py-3">NIM</th><th className="min-w-36 px-3 py-3 sm:min-w-48">Kementerian</th>{workDates.map(day => <th key={dateValue(day)} className="min-w-10 border-l border-gray-100 px-1 py-2 text-center sm:min-w-12 sm:px-2"><span className="block text-[9px] text-gray-400">{dayName(day)}</span><span className="mt-1 block text-xs text-gray-700">{day.getDate()}</span></th>)}<th className="sticky right-0 z-20 min-w-20 bg-green-50 px-2 py-3 text-center text-green-700 sm:min-w-24 sm:px-3">Total Hadir</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {!filteredRecap.length ? <tr><td colSpan={workDates.length + 5} className="p-14 text-center text-gray-400">Belum ada anggota IGM pada periode ini.</td></tr> : Array.from(groupedRecap.entries()).map(([groupName, rows]) => (
                      <Fragment key={groupName}>
                        <tr><td colSpan={4} className="sticky left-0 z-20 bg-green-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-green-900 sm:px-4">{groupName}<span className="ml-2 font-normal normal-case">({rows.length} anggota)</span></td>{workDates.length > 0 && <td colSpan={workDates.length} className="bg-green-50" />}<td className="sticky right-0 z-20 min-w-20 bg-green-50 sm:min-w-24" /></tr>
                        {rows.map((row, index) => {
                          const total = Object.values(row.attendance || {}).filter(status => attendanceCategory(status) === "hadir").length;
                          return <tr key={row.id} className="hover:bg-green-50/30"><td className="sticky left-0 z-10 w-10 min-w-10 bg-white px-2 py-3 text-center text-xs text-gray-400">{index + 1}</td><td className="sticky left-10 z-10 w-28 min-w-28 max-w-28 bg-white px-2 py-3 text-xs font-bold text-gray-800 sm:w-36 sm:min-w-36 sm:max-w-36 sm:px-3"><span className="block truncate" title={row.name}>{row.name}</span></td><td className="px-3 py-3 font-mono text-[11px] text-gray-500">{row.nim}</td><td className="min-w-36 px-3 py-3 text-[11px] text-gray-600 sm:min-w-48">{row.kementerian}</td>{workDates.map(day => <td key={dateValue(day)} className="border-l border-gray-50 px-1 py-3 text-center sm:px-2"><StatusDot status={row.attendance?.[dateValue(day)]} /></td>)}<td className="sticky right-0 z-10 bg-white px-2 py-3 text-center font-bold text-green-700 sm:px-3">{total}<span className="ml-1 text-[9px] font-normal uppercase text-gray-400">hari</span></td></tr>;
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-wrap gap-3 border-t bg-gray-50/60 px-4 py-3 text-[10px] font-bold uppercase text-gray-500 sm:gap-5 sm:px-5 sm:py-4"><Legend color="bg-green-500" label="Hadir" /><Legend color="bg-red-500" label="Ditolak" /><Legend color="bg-orange-300" label="Alfa" /></div>
              </div>
            )}
          </section>
        </main>
      </div>
      {selectedPhoto && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5" onClick={() => setSelectedPhoto(null)}><div className="relative max-w-xl rounded-xl bg-white p-2" onClick={event => event.stopPropagation()}><img src={selectedPhoto.startsWith("data:") ? selectedPhoto : `data:image/jpeg;base64,${selectedPhoto}`} alt="Foto absensi IGM" className="max-h-[80vh] rounded-lg" /><button type="button" title="Tutup" onClick={() => setSelectedPhoto(null)} className="absolute -right-3 -top-3 rounded-full bg-white p-2 text-gray-700 shadow"><X className="h-4 w-4" /></button></div></div>}
    </div>
  );
}

function Filter({ label, children }) {
  return <label className="flex w-full flex-col gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 sm:w-auto">{label}{children}</label>;
}

function Stat({ label, value, color = "text-gray-900" }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p><p className={`mt-1 font-mono text-2xl font-bold ${color}`}>{value}</p></div>;
}

function Legend({ color, label }) {
  return <span className="flex items-center gap-2"><span className={`h-3.5 w-3.5 rounded ${color}`} />{label}</span>;
}
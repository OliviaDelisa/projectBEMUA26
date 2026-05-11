import { useState, useEffect } from "react";
import API from "../../config/api";

function formatJarak(m) {
  if (m == null) return null;
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

const bulanList = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const bulanFull = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const hariList = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// ── Helper parse tanggal agar date-only string tidak dianggap UTC ──
function parseDate(dt) {
  if (!dt) return null;
  if (typeof dt === "string" && dt.length === 10) {
    return new Date(dt + "T00:00:00"); // "YYYY-MM-DD" → local time
  }
  return new Date(typeof dt === "string" ? dt.replace(" ", "T") : dt);
}

function formatTime(dt) {
  if (!dt) return "-";
  return new Date(dt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(dt) {
  if (!dt) return "-";
  const d = parseDate(dt);
  return `${hariList[d.getDay()]}, ${d.getDate()} ${bulanFull[d.getMonth()]} ${d.getFullYear()}`;
}
function formatShortDate(dt) {
  if (!dt) return "-";
  const d = parseDate(dt);
  return `${d.getDate()} ${bulanList[d.getMonth()]} ${d.getFullYear()}`;
}

export default function RiwayatAbsensi({ onBack }) {
  const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;

  const [tabAktif, setTabAktif] = useState("sekre");
  const [riwayatSekre, setRiwayatSekre] = useState([]);
  const [riwayatKegiatan, setRiwayatKegiatan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(null);

  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterBulan, setFilterBulan] = useState("semua");
  const [ringkasan, setRingkasan] = useState({ sekre: 0, kegiatan: 0 });

  useEffect(() => {
    if (!user) { window.location.href = "/"; return; }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sekreRes, kegRes] = await Promise.all([
        fetch(`${API}/attendance/secretariat/history/${user.id}?limit=100`),
        fetch(`${API}/attendance/activity/history/${user.id}?limit=100`),
      ]);
      const sekre = await sekreRes.json();
      const keg   = await kegRes.json();
      setRiwayatSekre(Array.isArray(sekre) ? sekre : []);
      setRiwayatKegiatan(Array.isArray(keg) ? keg : []);
      setRingkasan({
        sekre:    Array.isArray(sekre) ? sekre.filter(i => i.status === "hadir").length : 0,
        kegiatan: Array.isArray(keg)   ? keg.filter(i => i.status === "hadir").length  : 0,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const bulanOpsi = () => {
    const data = tabAktif === "sekre" ? riwayatSekre : riwayatKegiatan;
    const set = new Set();
    data.forEach(item => {
      const dt = item.check_in_time || item.date || item.activity_date || item.start_datetime;
      if (dt) {
        const d = parseDate(dt); // ← FIX
        set.add(`${d.getFullYear()}-${d.getMonth()}`);
      }
    });
    return Array.from(set).sort().reverse().map(key => {
      const [y, m] = key.split("-");
      return { key, label: `${bulanFull[parseInt(m)]} ${y}` };
    });
  };

  const dataFiltered = () => {
    const data = tabAktif === "sekre" ? riwayatSekre : riwayatKegiatan;
    return data.filter(item => {
      const dt = item.check_in_time || item.date || item.activity_date || item.start_datetime;
      if (filterStatus !== "semua" && item.status !== filterStatus) return false;
      if (filterBulan !== "semua" && dt) {
        const d   = parseDate(dt); // ← FIX
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key !== filterBulan) return false;
      }
      return true;
    });
  };

  const filtered        = dataFiltered();
  const hadirCount      = filtered.filter(i => i.status === "hadir").length;
  const tidakHadirCount = filtered.filter(i => i.status !== "hadir").length;
  const activeFilterCount = (filterStatus !== "semua" ? 1 : 0) + (filterBulan !== "semua" ? 1 : 0);

  const getFotoSrc = (raw) => {
    if (!raw) return null;
    if (raw.startsWith("data:image")) return raw;
    if (raw.startsWith("http"))       return raw;
    return `data:image/jpeg;base64,${raw}`;
  };

  const IconCheck = ({ cls = "w-4 h-4" }) => (
    <svg className={`${cls} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
    </svg>
  );
  const IconX = ({ cls = "w-4 h-4" }) => (
    <svg className={`${cls} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
  const IconClock = () => (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
  const IconPin = () => (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Modal Detail ──────────────────────────────────────────────── */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
          onClick={() => setDetailModal(null)}>
          <div className="w-full max-w-lg bg-white rounded-t-3xl overflow-hidden max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="px-5 pt-2 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800">Detail Absensi</h3>
                <button onClick={() => setDetailModal(null)} className="text-gray-400">
                  <IconX cls="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(
                  detailModal.check_in_time ||
                  detailModal.date ||
                  detailModal.activity_date ||
                  detailModal.start_datetime
                )}
              </p>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className={`self-start flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold
                ${detailModal.status === "hadir" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                {detailModal.status === "hadir" ? "Hadir" : "Tidak Hadir"}
              </div>

              <div className="flex flex-col gap-3">
                {detailModal.check_in_time && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                      <IconClock />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Waktu Check-in</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">
                        {formatTime(detailModal.check_in_time)} WIB
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(detailModal.check_in_time)}</p>
                    </div>
                  </div>
                )}

                {detailModal.status !== "hadir" && (detailModal.activity_date || detailModal.start_datetime) && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Tanggal Kegiatan</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">
                        {formatDate(detailModal.activity_date || detailModal.start_datetime)}
                      </p>
                    </div>
                  </div>
                )}

                {(detailModal.location_name || detailModal.latitude) && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                      <IconPin />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Lokasi</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5 leading-relaxed">
                        {detailModal.location_name || "Sekre BEM"}
                      </p>
                      {detailModal.latitude && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {parseFloat(detailModal.latitude).toFixed(6)},{" "}
                          {parseFloat(detailModal.longitude).toFixed(6)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {detailModal.distance_meters != null && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Jarak dari Sekre BEM</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">
                        {formatJarak(detailModal.distance_meters)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Jenis Absensi</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">
                      {detailModal._jenis === "kegiatan"
                        ? `Kegiatan — ${detailModal._judul || ""}`
                        : "Sekretariat"}
                    </p>
                  </div>
                </div>
              </div>

              {detailModal.status === "hadir" && (() => {
                const fotoSrc = getFotoSrc(detailModal.selfie_photo);
                if (!fotoSrc) return (
                  <div className="flex flex-col items-center justify-center gap-2 py-6 bg-gray-50 rounded-2xl">
                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    <p className="text-xs text-gray-400">Foto tidak tersedia</p>
                  </div>
                );
                return (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Foto Selfie</p>
                    <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
                      <img
                        src={fotoSrc}
                        alt="Selfie"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.closest(".rounded-2xl").innerHTML =
                            `<div class="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-100 py-10">
                              <p class="text-xs text-gray-400">Foto gagal dimuat</p>
                             </div>`;
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="bg-[#00923D] px-5 pt-10 pb-16">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-white/80 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-white font-bold text-lg">Riwayat Absensi</h1>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <p className="text-green-100 text-xs">Absensi Sekre</p>
              </div>
              <p className="text-white text-3xl font-bold">{ringkasan.sekre}</p>
              <p className="text-green-200 text-xs mt-0.5">kali hadir</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-green-100 text-xs">Absensi Kegiatan</p>
              </div>
              <p className="text-white text-3xl font-bold">{ringkasan.kegiatan}</p>
              <p className="text-green-200 text-xs mt-0.5">kali hadir</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 -mt-8 pb-10 flex flex-col gap-4">

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            {[
              { key: "sekre",    label: "Sekretariat" },
              { key: "kegiatan", label: "Kegiatan"    },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => { setTabAktif(tab.key); setFilterStatus("semua"); setFilterBulan("semua"); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition
                  ${tabAktif === tab.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600
                  rounded-xl px-3 py-2.5 pr-7 focus:outline-none focus:border-[#00923D] transition cursor-pointer">
                <option value="semua">Semua Status</option>
                <option value="hadir">Hadir</option>
                <option value="tidak_hadir">Tidak Hadir</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="relative flex-1">
              <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600
                  rounded-xl px-3 py-2.5 pr-7 focus:outline-none focus:border-[#00923D] transition cursor-pointer">
                <option value="semua">Semua Bulan</option>
                {bulanOpsi().map(b => (
                  <option key={b.key} value={b.key}>{b.label}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={() => { setFilterStatus("semua"); setFilterBulan("semua"); }}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex gap-3 mb-1">
            <div className="flex-1 bg-green-50 rounded-xl px-3 py-2">
              <p className="text-xs font-bold text-green-700">{hadirCount}</p>
              <p className="text-xs text-green-500">Hadir</p>
            </div>
            <div className="flex-1 bg-red-50 rounded-xl px-3 py-2">
              <p className="text-xs font-bold text-red-600">{tidakHadirCount}</p>
              <p className="text-xs text-red-400">Tidak Hadir</p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-xs font-bold text-gray-700">
                {filtered.length > 0 ? Math.round((hadirCount / filtered.length) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-400">Kehadiran</p>
            </div>
          </div>
        </div>

        {/* ── List riwayat ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-6 h-6 text-[#00923D]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-gray-400 font-medium">Belum ada data absensi</p>
              {activeFilterCount > 0 && (
                <button onClick={() => { setFilterStatus("semua"); setFilterBulan("semua"); }}
                  className="text-xs text-[#00923D] font-semibold">
                  Hapus filter
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((item, idx) => {
                const isHadir = item.status === "hadir";
                const judul   = item.title || null;

                const dtHadir      = item.check_in_time;
                const dtTidakHadir = item.activity_date || item.start_datetime || item.date;
                const dtUtama      = isHadir ? dtHadir : dtTidakHadir;

                const d       = dtUtama ? parseDate(dtUtama) : null; // ← FIX
                const timeStr = dtHadir ? formatTime(dtHadir) : "-";
                const dateStr = d ? `${d.getDate()} ${bulanList[d.getMonth()]} ${d.getFullYear()}` : "-";
                const hariStr = d ? hariList[d.getDay()] : "";

                return (
                  <button key={item.id || idx}
                    onClick={() => setDetailModal({ ...item, _jenis: tabAktif, _judul: judul })}
                    className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-gray-50 active:bg-gray-100 transition"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5
                      ${isHadir ? "bg-green-50" : "bg-red-50"}`}>
                      {isHadir ? (
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{hariStr}, {dateStr}</p>
                          {judul && (
                            <p className="text-xs text-gray-500 mt-0.5 font-medium">{judul}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-xs font-semibold ${isHadir ? "text-green-500" : "text-red-400"}`}>
                            {isHadir ? "Hadir" : "Tidak Hadir"}
                          </span>
                          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>

                      {isHadir && (
                        <>
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                            </svg>
                            {timeStr} WIB
                          </div>
                          {item.location_name && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.location_name}</p>
                          )}
                          {item.distance_meters != null && (
                            <p className="text-xs text-gray-300 mt-0.5">
                              {formatJarak(item.distance_meters)} dari Sekre
                            </p>
                          )}
                        </>
                      )}

                      {!isHadir && tabAktif === "kegiatan" && item.activity_location && (
                        <p className="text-xs text-gray-400 mt-1 truncate">{item.activity_location}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
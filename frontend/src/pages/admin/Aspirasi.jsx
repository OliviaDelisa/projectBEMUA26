import { useState, useEffect, useRef, useMemo } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const UPLOADS  = API_BASE.replace("/api", "") + "/uploads/";
const GREEN    = "#00923D";

const STATUS_LIST  = ["baru", "dibaca", "diproses", "selesai"];
const STATUS_BADGE = {
  baru:     "bg-blue-50 text-blue-600 border-blue-200",
  dibaca:   "bg-amber-50 text-amber-600 border-amber-200",
  diproses: "bg-violet-50 text-violet-600 border-violet-200",
  selesai:  "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const STATUS_COLORS = ["#60a5fa", "#fbbf24", "#a78bfa", "#00923D"];
const KAT_COLORS    = ["#00923D", "#16a34a", "#4ade80", "#86efac", "#bbf7d0", "#d1fae5"];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const fmtDateTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    + ", " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

const toInputDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const todayStr = toInputDate(new Date());

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// ── Chart animation plugin: staggered bar + animated doughnut ─────────────────
const buildBarOptions = (katUnik) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 900,
    easing: "easeOutCubic",
    delay: (ctx) =>
      ctx.type === "data" && ctx.mode === "default" ? ctx.dataIndex * 80 : 0,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#111827",
      titleColor: "#f9fafb",
      bodyColor: "#9ca3af",
      padding: 10,
      cornerRadius: 8,
      callbacks: { label: (ctx) => ` ${ctx.parsed.y} aspirasi` },
    },
  },
  scales: {
    x: {
      ticks: { font: { size: 11 }, color: "#9ca3af", maxRotation: 15, autoSkip: false },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      ticks: { font: { size: 11 }, color: "#9ca3af", stepSize: 1 },
      grid: { color: "#f3f4f6" },
      border: { display: false },
      beginAtZero: true,
    },
  },
});

const buildDoughnutOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    animateRotate: true,
    animateScale: true,
    duration: 1000,
    easing: "easeOutBack",
    delay: (ctx) =>
      ctx.type === "data" && ctx.mode === "default" ? ctx.dataIndex * 120 : 0,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#111827",
      titleColor: "#f9fafb",
      bodyColor: "#9ca3af",
      padding: 10,
      cornerRadius: 8,
    },
  },
  cutout: "72%",
});

export default function Aspirasi() {
  const [list,      setList]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // table filters
  const [search,          setSearch]          = useState("");
  const [filterStatus,    setFilterStatus]    = useState("");
  const [filterKat,       setFilterKat]       = useState("");
  const [filterFakultas,  setFilterFakultas]  = useState("");
  const [filterPrioritas, setFilterPrioritas] = useState("");

  // date range
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  const [selected,   setSelected]   = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [catatan,    setCatatan]    = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteOk,     setNoteOk]     = useState(false);
  const [lightbox,   setLightbox]   = useState(null);

  const katRef      = useRef(null);
  const statusRef   = useRef(null);
  const katChart    = useRef(null);
  const statusChart = useRef(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${API_BASE}/aspirasi`, { headers: authHeader() });
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      // Pastikan aspirasi baru di paling atas — sort descending by created_at
      const sorted = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setList(sorted);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  // ── date-range filtered list (for cards + charts) ──────────────────────────
  const dateFiltered = useMemo(() => {
    if (!dateFrom && !dateTo) return list;
    return list.filter((d) => {
      const t = new Date(d.created_at).getTime();
      const from = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : -Infinity;
      const to   = dateTo   ? new Date(dateTo   + "T23:59:59").getTime() :  Infinity;
      return t >= from && t <= to;
    });
  }, [list, dateFrom, dateTo]);

  // ── charts ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dateFiltered.length || !katRef.current || !statusRef.current) return;

    const katUnik  = [...new Set(dateFiltered.map((d) => d.nama_kategori))];
    const katCount = katUnik.map((k) => dateFiltered.filter((d) => d.nama_kategori === k).length);
    const statCount= STATUS_LIST.map((s) => dateFiltered.filter((d) => d.status === s).length);

    katChart.current?.destroy();
    katChart.current = new Chart(katRef.current, {
      type: "bar",
      data: {
        labels: katUnik,
        datasets: [{
          label: "Aspirasi",
          data: katCount,
          backgroundColor: KAT_COLORS.slice(0, katUnik.length),
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: buildBarOptions(katUnik),
    });

    statusChart.current?.destroy();
    statusChart.current = new Chart(statusRef.current, {
      type: "doughnut",
      data: {
        labels: STATUS_LIST.map(cap),
        datasets: [{
          data: statCount,
          backgroundColor: STATUS_COLORS,
          borderWidth: 0,
          hoverOffset: 8,
        }],
      },
      options: buildDoughnutOptions(),
    });

    return () => { katChart.current?.destroy(); statusChart.current?.destroy(); };
  }, [dateFiltered]);

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleUpdateStatus = async (id, val) => {
    setUpdatingId(`status-${id}`);
    try {
      const res = await fetch(`${API_BASE}/aspirasi/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status: val }),
      });
      if (!res.ok) throw new Error();
      setList((p) => p.map((d) => d.id === id ? { ...d, status: val } : d));
      if (selected?.id === id) setSelected((s) => ({ ...s, status: val }));
    } catch { alert("Gagal update status"); }
    finally { setUpdatingId(null); }
  };

  const handleUpdatePrioritas = async (id, val) => {
    setUpdatingId(`prioritas-${id}`);
    try {
      const res = await fetch(`${API_BASE}/aspirasi/${id}/prioritas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ prioritas: val }),
      });
      if (!res.ok) throw new Error();
      setList((p) => p.map((d) => d.id === id ? { ...d, prioritas: val } : d));
      if (selected?.id === id) setSelected((s) => ({ ...s, prioritas: val }));
    } catch { alert("Gagal update prioritas"); }
    finally { setUpdatingId(null); }
  };

  const handleSaveCatatan = async () => {
    if (!selected) return;
    setSavingNote(true); setNoteOk(false);
    try {
      const res = await fetch(`${API_BASE}/aspirasi/${selected.id}/catatan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ catatan_internal: catatan }),
      });
      if (!res.ok) throw new Error();
      setList((p) => p.map((d) => d.id === selected.id ? { ...d, catatan_internal: catatan } : d));
      setSelected((s) => ({ ...s, catatan_internal: catatan }));
      setNoteOk(true);
      setTimeout(() => setNoteOk(false), 2500);
    } catch { alert("Gagal menyimpan catatan"); }
    finally { setSavingNote(false); }
  };

  const openModal = (d) => { setSelected(d); setCatatan(d.catatan_internal || ""); setNoteOk(false); };

  const clearDate = () => { setDateFrom(""); setDateTo(""); };
  const isDateActive = dateFrom || dateTo;

  // ── filtered rows (table) ──────────────────────────────────────────────────
  const katUnik = [...new Set(list.map((d) => d.nama_kategori))];
  const facUnik = [...new Set(list.map((d) => d.fakultas))].sort();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return dateFiltered.filter((d) =>
      (!q || (d.nama||"").toLowerCase().includes(q) || d.fakultas.toLowerCase().includes(q) || d.isi.toLowerCase().includes(q)) &&
      (!filterStatus    || d.status        === filterStatus) &&
      (!filterKat       || d.nama_kategori  === filterKat) &&
      (!filterFakultas  || d.fakultas       === filterFakultas) &&
      (!filterPrioritas || d.prioritas      === filterPrioritas)
    );
  }, [dateFiltered, search, filterStatus, filterKat, filterFakultas, filterPrioritas]);

  // Sort: newest (baru) first, then by created_at desc
  const rows = [...filtered].sort((a, b) => {
    // Aspirasi dengan status "baru" diutamakan di atas
    if (a.status === "baru" && b.status !== "baru") return -1;
    if (b.status === "baru" && a.status !== "baru") return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const activeF = [filterStatus, filterKat, filterFakultas, filterPrioritas].filter(Boolean).length;
  const resetFilters = () => {
    setSearch(""); setFilterStatus(""); setFilterKat(""); setFilterFakultas(""); setFilterPrioritas("");
  };

  // ── stats (based on dateFiltered) ─────────────────────────────────────────
  const stats = [
    { label: "Total",    value: dateFiltered.length,                                            color: GREEN,     sub: "semua aspirasi" },
    { label: "Baru",     value: dateFiltered.filter((d) => d.status === "baru").length,         color: "#3b82f6", sub: "belum ditangani" },
    { label: "Diproses", value: dateFiltered.filter((d) => d.status === "diproses").length,     color: "#7c3aed", sub: "sedang berjalan" },
    { label: "Urgent",   value: dateFiltered.filter((d) => d.prioritas === "urgent").length,    color: "#dc2626", sub: "perlu perhatian" },
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Aspirasi" />

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
            )}

            {/* ── Date range bar ─────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || todayStr}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-green-400 text-gray-600 transition bg-gray-50 hover:bg-white"
                />
                <span className="text-gray-200 text-xs font-light select-none">–</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  max={todayStr}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-green-400 text-gray-600 transition bg-gray-50 hover:bg-white"
                />
              </div>

              {isDateActive ? (
                <button
                  onClick={clearDate}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition ml-1 px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  <CloseSmIcon /> Hapus filter
                </button>
              ) : (
                <span className="text-[11px] text-gray-300 ml-1">Semua waktu</span>
              )}
            </div>

            {/* ── Stat cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{s.label}</p>
                      <p className="text-3xl font-bold mt-1.5 tabular-nums" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Charts ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-3 bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-sm font-semibold text-gray-800">Aspirasi per Kategori</p>
                <div className="relative h-52 mt-4">
                  <canvas ref={katRef} />
                </div>
              </div>
              <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-5">
                <p className="text-sm font-semibold text-gray-800">Status Aspirasi</p>
                <div className="relative h-28 mt-4 mb-5">
                  <canvas ref={statusRef} />
                </div>
                <div className="space-y-2.5">
                  {STATUS_LIST.map((s, i) => {
                    const count = dateFiltered.filter((d) => d.status === s).length;
                    const pct   = dateFiltered.length ? Math.round((count / dateFiltered.length) * 100) : 0;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[i] }} />
                        <span className="text-xs text-gray-500 flex-1">{cap(s)}</span>
                        <span className="text-xs font-semibold text-gray-700 tabular-nums">{count}</span>
                        <span className="text-[11px] text-gray-400 w-8 text-right tabular-nums">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Table ──────────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100">

              {/* Filters */}
              <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-48">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Cari nama, fakultas, isi..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 transition"
                  />
                </div>
                {[
                  { value: filterStatus,    onChange: setFilterStatus,    ph: "Status",    opts: STATUS_LIST.map((s) => ({ v: s, l: cap(s) })) },
                  { value: filterPrioritas, onChange: setFilterPrioritas, ph: "Prioritas", opts: [{ v: "normal", l: "Normal" }, { v: "urgent", l: "Urgent" }] },
                  { value: filterKat,       onChange: setFilterKat,       ph: "Kategori",  opts: katUnik.map((k) => ({ v: k, l: k })) },
                  { value: filterFakultas,  onChange: setFilterFakultas,  ph: "Fakultas",  opts: facUnik.map((f) => ({ v: f, l: f })) },
                ].map(({ value, onChange, ph, opts }) => (
                  <select key={ph} value={value} onChange={(e) => onChange(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-green-400 text-gray-600 bg-white cursor-pointer hover:border-gray-300 transition">
                    <option value="">{ph}</option>
                    {opts.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ))}
                {activeF > 0 && (
                  <button onClick={resetFilters}
                    className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-2 transition flex items-center gap-1">
                    <CloseSmIcon /> Reset ({activeF})
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-20 text-center">
                  <div className="inline-block w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-gray-400">Memuat data...</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-sm text-gray-400">Tidak ada aspirasi ditemukan.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["No","Pengirim","Isi Aspirasi","Kategori","Foto","Status","Prioritas","Catatan",""].map((h) => (
                          <th key={h} className="text-left text-[11px] font-semibold text-gray-400 px-4 py-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rows.map((d, idx) => (
                        <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">

                          <td className="px-4 py-3 text-xs text-gray-400 w-10 tabular-nums">{idx + 1}</td>

                          <td className="px-4 py-3 w-40">
                            <p className="text-sm text-gray-800 font-medium truncate max-w-[130px]">
                              {d.nama || <span className="text-gray-400 italic font-normal text-xs">Anonim</span>}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{d.fakultas}</p>
                          </td>

                          <td className="px-4 py-3 max-w-[200px]">
                            <p className="text-sm text-gray-600 truncate">{d.isi}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{fmtDateTime(d.created_at)}</p>
                          </td>

                          <td className="px-4 py-3 w-36">
                            <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-md px-2 py-1 whitespace-nowrap">
                              {d.nama_kategori}
                            </span>
                          </td>

                          <td className="px-4 py-3 w-14">
                            {d.foto ? (
                              <button onClick={() => setLightbox(UPLOADS + d.foto)}
                                className="block w-10 h-10 rounded-lg overflow-hidden border border-gray-100 hover:border-green-300 transition-colors">
                                <img src={UPLOADS + d.foto} alt="foto" className="w-full h-full object-cover"
                                  onError={(e) => { e.target.parentElement.style.display = "none"; }} />
                              </button>
                            ) : (
                              <span className="text-xs text-gray-200">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3" style={{ minWidth: "130px" }}>
                            <select value={d.status}
                              disabled={updatingId === `status-${d.id}`}
                              onChange={(e) => handleUpdateStatus(d.id, e.target.value)}
                              className={`text-xs rounded-lg px-2.5 py-1.5 border outline-none cursor-pointer disabled:opacity-50 font-medium w-full ${STATUS_BADGE[d.status]}`}>
                              {STATUS_LIST.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
                            </select>
                          </td>

                          <td className="px-4 py-3 w-28">
                            <button
                              disabled={updatingId === `prioritas-${d.id}`}
                              onClick={() => handleUpdatePrioritas(d.id, d.prioritas === "urgent" ? "normal" : "urgent")}
                              className={`text-xs rounded-lg px-2.5 py-1.5 border font-medium transition-colors disabled:opacity-50 w-full ${
                                d.prioritas === "urgent"
                                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                  : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100"
                              }`}>
                              {d.prioritas === "urgent" ? "Urgent" : "Normal"}
                            </button>
                          </td>

                          <td className="px-4 py-3 w-36">
                            {d.catatan_internal
                              ? <p className="text-xs text-gray-500 truncate max-w-[120px]" title={d.catatan_internal}>{d.catatan_internal}</p>
                              : <span className="text-xs text-gray-200">—</span>}
                          </td>

                          <td className="px-4 py-3 w-16">
                            <button onClick={() => openModal(d)}
                              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-500 flex items-center gap-1 whitespace-nowrap">
                              <EyeIcon /> Detail
                            </button>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-8" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Foto aspirasi" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
          <button onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition">
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Modal detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selected.nama || <span className="italic text-gray-400 font-normal">Anonim</span>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{selected.fakultas}</p>
              </div>
              <button onClick={() => setSelected(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                <CloseIcon />
              </button>
            </div>

            <div className="p-6 space-y-5">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
                  <select value={selected.status}
                    disabled={updatingId === `status-${selected.id}`}
                    onChange={(e) => handleUpdateStatus(selected.id, e.target.value)}
                    className={`w-full text-xs rounded-xl px-3 py-2.5 border outline-none font-medium disabled:opacity-50 cursor-pointer ${STATUS_BADGE[selected.status]}`}>
                    {STATUS_LIST.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Prioritas</label>
                  <button
                    onClick={() => handleUpdatePrioritas(selected.id, selected.prioritas === "urgent" ? "normal" : "urgent")}
                    disabled={updatingId === `prioritas-${selected.id}`}
                    className={`w-full text-xs rounded-xl px-3 py-2.5 border font-medium transition-colors disabled:opacity-50 ${
                      selected.prioritas === "urgent"
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}>
                    {selected.prioritas === "urgent" ? "Urgent" : "Normal"}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                <span className="bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">{selected.nama_kategori}</span>
                <span className="flex items-center gap-1"><ClockIcon /> {fmtDateTime(selected.created_at)}</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Isi Aspirasi</label>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4">{selected.isi}</p>
              </div>

              {selected.foto && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Foto Lampiran</label>
                  <button onClick={() => setLightbox(UPLOADS + selected.foto)}
                    className="block w-full focus:outline-none rounded-xl overflow-hidden border border-gray-100 hover:border-green-200 transition-colors">
                    <img src={UPLOADS + selected.foto} alt="Lampiran" className="w-full object-cover max-h-56"
                      onError={(e) => { e.target.closest("button").style.display = "none"; }} />
                  </button>
                  <p className="text-[11px] text-gray-300 mt-1.5">Klik gambar untuk perbesar</p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Catatan Internal</label>
                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Tambahkan catatan tindak lanjut..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-3 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 resize-none placeholder:text-gray-300 transition" />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-gray-300">{catatan.length} karakter</span>
                  <button onClick={handleSaveCatatan} disabled={savingNote}
                    className="text-xs text-white rounded-xl px-4 py-2 transition-colors disabled:opacity-60 font-medium"
                    style={{ background: noteOk ? "#16a34a" : GREEN }}>
                    {savingNote ? "Menyimpan..." : noteOk ? "✓ Tersimpan" : "Simpan catatan"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function CloseSmIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function SearchIcon({ className }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";

function Periode() {
  const UNAND_GREEN = "#00923D";

  const [periods, setPeriods]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const [formName,      setFormName]      = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate,   setFormEndDate]   = useState("");
  const [formIsActive,  setFormIsActive]  = useState(true);

  // ─── Fetch ───────────────────────────────────────────────────────────────
  const fetchPeriods = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API}/periode`);           // ✅ /periode
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memuat data");
      setPeriods(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPeriods(); }, []);

  // ─── Form helpers ────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditTarget(null);
    setFormName("");
    setFormStartDate("");
    setFormEndDate("");
    setFormIsActive(true);
    setShowForm(true);
  };

  const handleOpenEdit = (period) => {
    setEditTarget(period.id);
    setFormName(period.name ?? "");
    setFormStartDate(period.start_date?.slice(0, 10) ?? "");
    setFormEndDate(period.end_date?.slice(0, 10) ?? "");
    setFormIsActive(period.is_active === 1 || period.is_active === true);
    setShowForm(true);
  };

  // ─── Aktifkan ─────────────────────────────────────────────────────────────
  const handleSetActive = async (id) => {
    try {
      const res = await fetch(`${API}/periode/${id}/activate`, { method: "PATCH" }); // ✅
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal mengaktifkan periode");
      }
      await fetchPeriods();
    } catch (err) {
      alert(err.message);
    }
  };

  // ─── Simpan ───────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (formEndDate < formStartDate) {
      alert("Tanggal selesai tidak boleh sebelum tanggal mulai");
      return;
    }
    const payload = {
      name:       formName,
      start_date: formStartDate,
      end_date:   formEndDate,
      is_active:  formIsActive ? 1 : 0,
    };
    try {
      const url    = editTarget !== null ? `${API}/periode/${editTarget}` : `${API}/periode`; // ✅
      const method = editTarget !== null ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menyimpan periode");
      }
      await fetchPeriods();
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      alert(err.message);
    }
  };

  // ─── Hapus ────────────────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus periode "${name}"? Data anggota terkait periode ini akan terpengaruh.`)) return;
    try {
      const res = await fetch(`${API}/periode/${id}`, { method: "DELETE" }); // ✅
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menghapus periode");
      }
      await fetchPeriods();
    } catch (err) {
      alert(err.message);
    }
  };

  // ─── Helper ───────────────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric",
    });
  };

  const activeCount   = periods.filter(p => p.is_active === 1 || p.is_active === true).length;
  const inactiveCount = periods.length - activeCount;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Manajemen Periode" subtitle="Kelola periode kepengurusan BEM KM UNAND" />

        <main className="flex-1 overflow-y-auto p-8">

          {/* STATS */}
          {!showForm && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center border-l-4"
                style={{ borderLeftColor: UNAND_GREEN }}>
                <span className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: UNAND_GREEN }}>Total Periode</span>
                <span className="text-2xl font-bold text-gray-800">{periods.length}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center border-l-4 border-l-green-400">
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Aktif</span>
                <span className="text-2xl font-bold text-gray-800">{activeCount}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center border-l-4 border-l-gray-300">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Non-Aktif</span>
                <span className="text-2xl font-bold text-gray-800">{inactiveCount}</span>
              </div>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* FORM */}
          {showForm ? (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold" style={{ color: UNAND_GREEN }}>
                  {editTarget !== null ? "Edit Periode" : "Tambah Periode Baru"}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">Batal</button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Periode</label>
                  <input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Contoh: Kepengurusan 2026/2027"
                    className="w-full border p-3 rounded-xl outline-none transition focus:border-green-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Mulai</label>
                    <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)}
                      className="w-full border p-3 rounded-xl outline-none transition focus:border-green-400" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Selesai</label>
                    <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)}
                      min={formStartDate}
                      className="w-full border p-3 rounded-xl outline-none transition focus:border-green-400" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status Periode</label>
                  <div className="flex gap-3">
                    {/* Aktif */}
                    <div onClick={() => setFormIsActive(true)}
                      className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-pointer select-none
                        ${formIsActive ? "border-green-400 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
                        ${formIsActive ? "border-green-500 bg-green-500" : "border-gray-300 bg-white"}`}>
                        {formIsActive && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${formIsActive ? "text-green-700" : "text-gray-500"}`}>Aktif</p>
                        <p className="text-xs text-gray-400 mt-0.5">Periode sedang berjalan</p>
                      </div>
                    </div>
                    {/* Non-Aktif */}
                    <div onClick={() => setFormIsActive(false)}
                      className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-pointer select-none
                        ${!formIsActive ? "border-gray-400 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
                        ${!formIsActive ? "border-gray-500 bg-gray-500" : "border-gray-300 bg-white"}`}>
                        {!formIsActive && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${!formIsActive ? "text-gray-700" : "text-gray-500"}`}>Non-Aktif</p>
                        <p className="text-xs text-gray-400 mt-0.5">Periode sudah selesai</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="submit"
                    className="flex-1 text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow-lg"
                    style={{ backgroundColor: UNAND_GREEN }}>
                    {editTarget !== null ? "Simpan Perubahan" : "Simpan Periode"}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-6 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition">
                    Kembali
                  </button>
                </div>
              </form>
            </div>

          ) : (
            <>
              {/* Toolbar */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex justify-end">
                <button onClick={handleOpenAdd}
                  className="text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition shadow-sm flex items-center gap-2 text-sm"
                  style={{ backgroundColor: UNAND_GREEN }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Tambah Periode
                </button>
              </div>

              {loading ? (
                <div className="text-center py-16 text-gray-400 font-medium">Memuat data…</div>
              ) : periods.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-16 text-center text-gray-400 font-medium">
                  Belum ada periode. Tambahkan periode pertama.
                </div>
              ) : (
                <div className="grid gap-4">
                  {periods.map(p => {
                    const isActive = p.is_active === 1 || p.is_active === true;
                    return (
                      <div key={p.id}
                        className={`bg-white rounded-2xl shadow-sm border-2 transition p-6 flex items-center justify-between gap-4
                          ${isActive ? "border-green-300" : "border-gray-100"}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                            ${isActive ? "bg-green-50" : "bg-gray-50"}`}>
                            <svg xmlns="http://www.w3.org/2000/svg"
                              className={`w-6 h-6 ${isActive ? "text-green-500" : "text-gray-400"}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-800 text-base">{p.name}</h3>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatDate(p.start_date)} — {formatDate(p.end_date)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!isActive && (
                            <button onClick={() => handleSetActive(p.id)}
                              className="px-3 py-1.5 rounded-lg border border-green-300 text-green-700 text-xs font-bold hover:bg-green-50 transition whitespace-nowrap">
                              Jadikan Aktif
                            </button>
                          )}
                          <button onClick={() => handleOpenEdit(p)} title="Edit"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.193 9.193a2 2 0 01-.707.464l-3 1a1 1 0 01-1.265-1.265l1-3a2 2 0 01.464-.707l9.193-9.193z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDelete(p.id, p.name)} title="Hapus"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 hover:border-red-400 hover:bg-red-50 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Periode;
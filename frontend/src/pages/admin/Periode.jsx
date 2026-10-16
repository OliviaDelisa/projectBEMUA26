import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";
import usePermissions from "../../hooks/usePermissions";

function Periode() {
  const UNAND_GREEN = "#00923D";
  const { hasPermission } = usePermissions();
  const canManagePeriods = hasPermission("periods.manage");

  const [periods, setPeriods]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [activating, setActivating] = useState(null); // id yang sedang diproses

  const [formName,      setFormName]      = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate,   setFormEndDate]   = useState("");

  // ─── Fetch ───────────────────────────────────────────────────────────────
  const fetchPeriods = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API}/periode`);
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
    setShowForm(true);
  };

  const handleOpenEdit = (period) => {
    setEditTarget(period.id);
    setFormName(period.name ?? "");
    setFormStartDate(period.start_date?.slice(0, 10) ?? "");
    setFormEndDate(period.end_date?.slice(0, 10) ?? "");
    setShowForm(true);
  };

  // ─── Jadikan Aktif — backend otomatis non-aktifkan yang lain ─────────────
  const handleSetActive = async (id) => {
    setActivating(id);
    try {
      const res = await fetch(`${API}/periode/${id}/activate`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal mengaktifkan periode");
      }
      await fetchPeriods();
    } catch (err) {
      alert(err.message);
    } finally {
      setActivating(null);
    }
  };

  // ─── Simpan (Create / Update) ─────────────────────────────────────────────
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
    };
    try {
      const url    = editTarget !== null ? `${API}/periode/${editTarget}` : `${API}/periode`;
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
    if (
      !window.confirm(
        `Hapus periode "${name}"? Data anggota terkait periode ini akan terpengaruh.`
      )
    )
      return;
    try {
      const res = await fetch(`${API}/periode/${id}`, { method: "DELETE" });
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

 // SESUDAH
  const isActive = (p) => Number(p.is_active) === 1;
  const activePeriod  = periods.find(isActive);
  const activeCount   = activePeriod ? 1 : 0;
  const inactiveCount = periods.length - activeCount;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar
          title="Manajemen Periode"
          subtitle="Kelola periode kepengurusan BEM KM UNAND"
        />

        <main className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-8">

          {/* STATS */}
          {!showForm && (
            <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 md:grid-cols-3">
              <div
                className="flex min-w-0 flex-col justify-center rounded-2xl border border-gray-100 border-l-4 bg-white p-3 shadow-sm sm:p-4"
                style={{ borderLeftColor: UNAND_GREEN }}
              >
                <span
                  className="text-[10px] font-black uppercase tracking-widest mb-1"
                  style={{ color: UNAND_GREEN }}
                >
                  Total Periode
                </span>
                <span className="text-2xl font-bold text-gray-800">
                  {periods.length}
                </span>
              </div>

              <div className="flex min-w-0 flex-col justify-center rounded-2xl border border-gray-100 border-l-4 border-l-green-400 bg-white p-3 shadow-sm sm:p-4">
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">
                  Aktif
                </span>
                <span className="text-2xl font-bold text-gray-800">
                  {activeCount} / 1
                </span>
                {activePeriod && (
                  <span className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {activePeriod.name}
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-col justify-center rounded-2xl border border-gray-100 border-l-4 border-l-gray-300 bg-white p-3 shadow-sm sm:p-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Non-Aktif
                </span>
                <span className="text-2xl font-bold text-gray-800">
                  {inactiveCount}
                </span>
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
            <div className="mx-auto max-w-xl rounded-2xl border border-gray-100 bg-white p-4 shadow-lg sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold sm:text-xl" style={{ color: UNAND_GREEN }}>
                  {editTarget !== null ? "Edit Periode" : "Tambah Periode Baru"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Batal
                </button>
              </div>

              {editTarget === null && (
                <div className="mb-5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium">
                  ℹ Periode baru akan disimpan sebagai{" "}
                  <strong>Non-Aktif</strong>. Gunakan tombol{" "}
                  <strong>"Jadikan Aktif"</strong> pada daftar untuk mengaktifkannya.
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Nama Periode
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Kepengurusan 2026/2027"
                    className="w-full border p-3 rounded-xl outline-none transition focus:border-green-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full border p-3 rounded-xl outline-none transition focus:border-green-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      min={formStartDate}
                      className="w-full border p-3 rounded-xl outline-none transition focus:border-green-400"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:gap-3">
                  <button
                    type="submit"
                    className="w-full flex-1 rounded-xl py-3 font-bold text-white shadow-lg transition hover:opacity-90 sm:w-auto"
                    style={{ backgroundColor: UNAND_GREEN }}
                  >
                    {editTarget !== null ? "Simpan Perubahan" : "Simpan Periode"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-full rounded-xl border border-gray-200 py-3 text-gray-500 transition hover:bg-gray-50 sm:w-auto sm:px-6"
                  >
                    Kembali
                  </button>
                </div>
              </form>
            </div>

          ) : (
            <>
              {/* Toolbar */}
              {canManagePeriods && <div className="mb-4 flex justify-end rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:mb-6 sm:p-4">
                <button
                  onClick={handleOpenAdd}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
                  style={{ backgroundColor: UNAND_GREEN }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Tambah Periode
                </button>
              </div>}

              {loading ? (
                <div className="text-center py-16 text-gray-400 font-medium">
                  Memuat data…
                </div>
              ) : periods.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center font-medium text-gray-400 shadow-md sm:p-16">
                  Belum ada periode. Tambahkan periode pertama.
                </div>
              ) : (
                <div className="grid gap-4">
                  {periods.map((p) => {
                    const active = isActive(p);
                    const isProcessing = activating === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`flex flex-col gap-4 rounded-2xl border-2 bg-white p-4 shadow-sm transition sm:flex-row sm:items-center sm:justify-between sm:p-6
                          ${active ? "border-green-300" : "border-gray-100"}`}
                      >
                        {/* Kiri: info periode */}
                        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                              ${active ? "bg-green-50" : "bg-gray-50"}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className={`w-6 h-6 ${active ? "text-green-500" : "text-gray-400"}`}
                              fill="none" viewBox="0 0 24 24"
                              stroke="currentColor" strokeWidth={1.8}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-base font-bold text-gray-800">
                                {p.name}
                              </h3>
                              {active ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700">
                                  Aktif
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-100 text-gray-400">
                                  Non-Aktif
                                </span>
                              )}
                            </div>
                            <p className="text-xs leading-relaxed text-gray-500 sm:text-sm">
                              {formatDate(p.start_date)} — {formatDate(p.end_date)}
                            </p>
                          </div>
                        </div>

                        {/* Kanan: aksi */}
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:flex-shrink-0">

                          {/* Tombol Jadikan Aktif — hanya muncul di periode non-aktif */}
                          {canManagePeriods && !active && (
                            <button
                              onClick={() => handleSetActive(p.id)}
                              disabled={isProcessing}
                              className="min-h-10 flex-1 whitespace-nowrap rounded-lg border border-green-300 px-3 py-1.5 text-xs font-bold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                            >
                              {isProcessing ? "Memproses…" : "Jadikan Aktif"}
                            </button>
                          )}

                          {/* Tombol Edit */}
                          {canManagePeriods && <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit"
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 transition hover:border-green-400 hover:bg-green-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.193 9.193a2 2 0 01-.707.464l-3 1a1 1 0 01-1.265-1.265l1-3a2 2 0 01.464-.707l9.193-9.193z" />
                            </svg>
                          </button>}

                          {/* Tombol Hapus — hanya untuk periode non-aktif */}
                          {canManagePeriods && !active && (
                            <button
                              onClick={() => handleDelete(p.id, p.name)}
                              title="Hapus"
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 transition hover:border-red-400 hover:bg-red-50"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
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
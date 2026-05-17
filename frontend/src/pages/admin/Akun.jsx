import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";

const UNAND_GREEN = "#00923D";

const daftarJabatan = [
  "Presiden Mahasiswa",
  "Wakil Presiden Mahasiswa",
  "Sekretaris Negara",
  "Menteri Koordinator Bidang Pelayanan",
  "Menteri Koordinator Bidang Administrasi Pemerintahan",
  "Menteri Koordinator Bidang Pergerakan",
  "Menteri Koordinator Bidang Pengabdian",
  "Inspektur", 
  "Menteri",          
  "Sekretaris Inspektur", 
  "Sekretaris Menteri",
  "Staff Ahli",
];
const daftarKementerian = [
  "Kepresidenan","Komunikasi dan Informasi","Pengembangan Sumber Daya Manusia",
  "Kebijakan Daerah","Kebijakan Nasional","Kebijakan Kampus","Riset dan Keilmuan",
  "Sekretaris Kabinet","Lingkungan Hidup","Sosial dan Masyarakat","Dalam Negeri",
  "Luar Negeri","Advokasi Kesejahteraan Mahasiswa","Pergerakan Perempuan",
  "Mitra Event dan Bisnis","Audit Internal","Keuangan",
];

export default function Akun() {
  const [periods, setPeriods]           = useState([]);
  const [periodeAktif, setPeriodeAktif] = useState(null);
  const [members, setMembers]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [mode, setMode]                 = useState("list");
  const [editTarget, setEditTarget]     = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);

  // ── filter list
  const [search, setSearch]                       = useState("");
  const [filterJabatan, setFilterJabatan]         = useState("");
  const [filterKementerian, setFilterKementerian] = useState("");
  const [filterRole, setFilterRole] = useState("");

  // ── transfer state
  const [selectedIds, setSelectedIds]       = useState(new Set());
  const [txTargetPeriod, setTxTargetPeriod] = useState("");
  const [txJabatan, setTxJabatan]           = useState("Staff Ahli");
  const [txKementerian, setTxKementerian]   = useState("");
  const [txLoading, setTxLoading]           = useState(false);
  const [txResult, setTxResult]             = useState(null);
  const [txSearch, setTxSearch]             = useState("");

  // ── form state
  const [newName, setNewName]               = useState("");
  const [newNim, setNewNim]                 = useState("");
  const [newPassword, setNewPassword]       = useState("");
  const [newUsername, setNewUsername]       = useState("");
  const [newJabatan, setNewJabatan]         = useState("");
  const [newKementerian, setNewKementerian] = useState("");
  const [newRole, setNewRole]               = useState("user");
  const [newIsActive, setNewIsActive]       = useState(true);

  // ── reset password state
  // FIX: resetUserId disimpan terpisah dari editTarget agar tidak stale saat modal terbuka
  const [resetModal, setResetModal]     = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone]       = useState(false);
  const [resetUserId, setResetUserId]   = useState(null); // <-- FIX kunci
  const [resetNim, setResetNim]         = useState("");
  const [copied, setCopied]             = useState(false);

  // password default yang ditampilkan di modal — sesuai dengan yang dikirim backend (bem + NIM)
  const defaultPassword = resetNim ? `bem${resetNim}` : "";

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchPeriods = async () => {
    try {
      const res  = await fetch(`${API}/periode`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPeriods(data);
      const aktif = data.find(p => p.is_active === 1 || p.is_active === true);
      setPeriodeAktif(aktif ?? data[0] ?? null);
    } catch (e) { console.error(e.message); }
  };

  const fetchMembers = async (periodId) => {
    if (!periodId) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/members?period_id=${periodId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memuat data");
      setMembers(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPeriods();
    fetch(`${API}/roles`)
      .then(r => r.json())
      .then(d => setAvailableRoles(d.filter(r => r.name !== "user")))
      .catch(() => {});
  }, []);

  useEffect(() => { if (periodeAktif?.id) fetchMembers(periodeAktif.id); }, [periodeAktif]);

  // ─── Auto-fill username & password saat NIM berubah (hanya mode tambah) ──
  const handleNimChange = (val) => {
    const nim = val.replace(/\D/g, "").slice(0, 10);
    setNewNim(nim);
    if (!editTarget) {
      setNewUsername(nim);
      setNewPassword(`bem${nim}`);
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────────
  const displayData = useMemo(() => members.filter(m =>
    (m.name ?? "").toLowerCase().includes(search.toLowerCase()) &&
    (!filterJabatan     || m.jabatan     === filterJabatan) &&
    (!filterKementerian || m.kementerian === filterKementerian) &&
     (!filterRole        || m.role        === filterRole) 
  ), [members, search, filterJabatan, filterKementerian, filterRole]);

  const txFiltered = useMemo(() => members.filter(m =>
    (m.name ?? "").toLowerCase().includes(txSearch.toLowerCase()) ||
    (m.nim  ?? "").includes(txSearch)
  ), [members, txSearch]);

  const periodeTujuan = periods.filter(p => String(p.id) !== String(periodeAktif?.id));
  const countAktif    = members.filter(m => m.is_active === 1).length;
  const countNonAktif = members.filter(m => m.is_active === 0).length;

  // ─── Transfer helpers ─────────────────────────────────────────────────────
  const toggleId = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const allSelected = txFiltered.length > 0 && txFiltered.every(m => selectedIds.has(m.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => { const n = new Set(prev); txFiltered.forEach(m => n.delete(m.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); txFiltered.forEach(m => n.add(m.id)); return n; });
    }
  };

  const enterTransferMode = () => {
    setMode("transfer");
    setSelectedIds(new Set(members.map(m => m.id)));
    setTxSearch(""); setTxTargetPeriod("");
    setTxJabatan("Staff Ahli"); setTxKementerian("");
    setTxResult(null);
  };

  const handleTransfer = async () => {
    if (!txTargetPeriod) return alert("Pilih periode tujuan");
    if (selectedIds.size === 0) return alert("Pilih minimal satu anggota");
    if (!txKementerian) return alert("Pilih kementerian tujuan");
    setTxLoading(true); setTxResult(null);
    try {
      const res = await fetch(`${API}/members/copy-to-period`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_period_id: periodeAktif?.id,
          to_period_id:   txTargetPeriod,
          user_ids:       [...selectedIds],
          jabatan:        txJabatan,
          kementerian:    txKementerian,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTxResult({ type: "success", inserted: data.inserted, skipped: data.skipped });
    } catch (err) {
      setTxResult({ type: "error", message: err.message });
    } finally { setTxLoading(false); }
  };

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setNewName(""); setNewNim(""); setNewPassword(""); setNewUsername("");
    setNewJabatan(""); setNewKementerian(""); setNewRole("user"); setNewIsActive(true);
    setMode("form");
  };

  const openEdit = (m) => {
    setEditTarget(m.id);
    setNewName(m.name ?? "");
    setNewNim(m.nim ?? "");
    setNewPassword("");
    setNewUsername(m.username ?? "");
    setNewJabatan(m.jabatan ?? "");
    setNewKementerian(m.kementerian ?? "");
    setNewRole(m.role ?? "user");
    setNewIsActive(m.is_active === 1);
    // FIX: simpan userId & nim secara eksplisit — bukan rely pada editTarget di dalam handler
    setResetUserId(m.id);
    setResetNim(m.nim ?? "");
    setResetDone(false);
    setCopied(false);
    setMode("form");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      name: newName, nim: newNim, username: newUsername,
      jabatan: newJabatan, kementerian: newKementerian,
      role: newRole, period_id: periodeAktif?.id,
    };
    if (editTarget !== null) {
      payload.is_active = newIsActive ? 1 : 0;
    } else {
      payload.password = newPassword;
    }
    try {
      const res = await fetch(
        editTarget !== null ? `${API}/members/${editTarget}` : `${API}/members`,
        { method: editTarget !== null ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Gagal"); }
      await fetchMembers(periodeAktif?.id);
      setMode("list"); setEditTarget(null);
    } catch (err) { alert(err.message); }
  };

  // ─── Reset password ───────────────────────────────────────────────────────
  // FIX: buka modal cukup set state, tidak perlu reset resetDone di sini karena
  //      sudah di-reset saat openEdit dipanggil
  const openResetModal = () => {
    setResetDone(false);
    setCopied(false);
    setResetModal(true);
  };

  // FIX: gunakan resetUserId (bukan editTarget) — nilainya sudah di-capture saat openEdit
  const handleResetPassword = async () => {
    if (!resetUserId) { alert("User ID tidak ditemukan"); return; }
    setResetLoading(true);
    try {
      const res = await fetch(`${API}/members/${resetUserId}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal reset password");
      }
      setResetDone(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(defaultPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const closeResetModal = () => { setResetModal(false); setCopied(false); };

  // ─── Role pill ────────────────────────────────────────────────────────────
  const extraRolePill = {
    admin:      "bg-blue-100 text-blue-700 border border-blue-200",
    superadmin: "bg-purple-100 text-purple-700 border border-purple-200",
  };

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Manajemen Anggota" subtitle="Kelola data kepengurusan BEM KM UNAND" />

        <main className="flex-1 overflow-y-auto p-6">

          {/* ══ MODAL RESET PASSWORD ══════════════════════════════════════════ */}
          {resetModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="p-6">
                  {!resetDone ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <h3 className="text-center font-bold text-gray-800 text-lg mb-1">Reset Password?</h3>
                      <p className="text-center text-sm text-gray-500 mb-5">
                        Password akan direset ke default. Anggota wajib ganti saat login berikutnya.
                      </p>

                      {/* Preview password default */}
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between mb-5">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Password baru</p>
                          <p className="font-mono font-bold text-gray-800 tracking-wide">{defaultPassword}</p>
                        </div>
                        <button type="button" onClick={handleCopy}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                          style={{ color: copied ? UNAND_GREEN : "#6b7280" }}>
                          {copied ? (
                            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Disalin</>
                          ) : (
                            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>Salin</>
                          )}
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button type="button" onClick={closeResetModal}
                          className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                          Batal
                        </button>
                        <button type="button" onClick={handleResetPassword} disabled={resetLoading}
                          className="flex-1 py-2.5 text-white rounded-xl text-sm font-bold transition disabled:opacity-60"
                          style={{ backgroundColor: UNAND_GREEN }}>
                          {resetLoading ? "Mereset..." : "Ya, Reset"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-center font-bold text-gray-800 text-lg mb-1">Password Direset!</h3>
                      <p className="text-center text-sm text-gray-500 mb-5">Sampaikan kredensial berikut ke anggota.</p>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between mb-5">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Password baru</p>
                          <p className="font-mono font-bold text-gray-800 tracking-wide">{defaultPassword}</p>
                        </div>
                        <button type="button" onClick={handleCopy}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                          style={{ color: copied ? UNAND_GREEN : "#6b7280" }}>
                          {copied ? (
                            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Disalin</>
                          ) : (
                            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>Salin</>
                          )}
                        </button>
                      </div>
                      <button type="button" onClick={closeResetModal}
                        className="w-full py-2.5 text-white rounded-xl text-sm font-bold transition"
                        style={{ backgroundColor: UNAND_GREEN }}>
                        Selesai
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ FORM MODE ════════════════════════════════════════════════════ */}
          {mode === "form" && (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold" style={{ color: UNAND_GREEN }}>
                  {editTarget !== null ? "Edit Data Anggota" : "Formulir Anggota Baru"}
                </h2>
                <button type="button" onClick={() => setMode("list")} className="text-gray-400 hover:text-gray-600 text-sm">Batal</button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                {/* Nama */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 mt-4">Nama Lengkap</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Masukkan nama lengkap"
                    className="w-full border p-3 rounded-xl outline-none focus:border-green-400 transition" required />
                </div>

                {/* NIM + Username */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">NIM</label>
                    <input value={newNim} onChange={e => handleNimChange(e.target.value)}
                      placeholder="2311527001" inputMode="numeric" maxLength={10}
                      className="w-full border p-3 rounded-xl outline-none focus:border-green-400 transition"
                      required={!editTarget} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                    <input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                      className="w-full border p-3 rounded-xl outline-none focus:border-green-400 transition bg-gray-50"
                      required={!editTarget} />
                    {!editTarget && newNim && (
                      <p className="text-[11px] text-gray-400 mt-1"></p>
                    )}
                  </div>
                </div>

                {/* Password — hanya saat tambah baru */}
                {!editTarget && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                    <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="w-full border p-3 rounded-xl outline-none focus:border-green-400 transition bg-gray-50 font-mono"
                      required />
                    {newNim && (
                      <p className="text-[11px] text-gray-400 mt-1">
                       
                      </p>
                    )}
                  </div>
                )}

                {/* Reset Password — hanya saat edit */}
                {editTarget !== null && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
                      <div className="flex-1">
                        <p className="text-sm text-gray-400 font-mono tracking-widest">••••••••••••</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                           <span className="font-mono font-semibold text-gray-500">bem{resetNim}</span>
                        </p>
                      </div>
                      {/* FIX: panggil openResetModal, bukan set state langsung */}
                      <button type="button" onClick={openResetModal}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition"
                        style={{ borderColor: UNAND_GREEN, color: UNAND_GREEN }}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset Password
                      </button>
                    </div>
                    {resetDone && (
                      <p className="text-[11px] text-green-600 font-semibold mt-1.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Password sudah direset ke default
                      </p>
                    )}
                  </div>
                )}

                {/* Jabatan + Periode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Jabatan</label>
                    <select value={newJabatan} onChange={e => setNewJabatan(e.target.value)}
                      className="w-full border p-3 rounded-xl outline-none transition" required>
                      <option value="" disabled>Pilih Jabatan</option>
                      {daftarJabatan.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Periode Menjabat</label>
                    <input value={periodeAktif?.name ?? "-"} readOnly
                      className="w-full border p-3 rounded-xl bg-gray-50 outline-none text-gray-500 text-sm" />
                  </div>
                </div>

                {/* Kementerian */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kementerian / Inspektorat</label>
                  <select value={newKementerian} onChange={e => setNewKementerian(e.target.value)}
                    className="w-full border p-3 rounded-xl outline-none transition" required>
                    <option value="" disabled>Pilih Kementerian</option>
                    {daftarKementerian.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                {/* Status — hanya saat edit */}
                {editTarget !== null && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status Keanggotaan</label>
                    <div className="flex gap-3">
                      {[
                        { val: true,  label: "Aktif",     ac: "border-green-400 bg-green-50", cc: "bg-green-500 border-green-500", tc: "text-green-700" },
                        { val: false, label: "Non-Aktif", ac: "border-red-400 bg-red-50",    cc: "bg-red-500 border-red-500",    tc: "text-red-600"   },
                      ].map(opt => (
                        <div key={String(opt.val)} onClick={() => setNewIsActive(opt.val)}
                          className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer select-none transition ${newIsActive === opt.val ? opt.ac : "border-gray-200 hover:border-gray-300"}`}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${newIsActive === opt.val ? opt.cc : "border-gray-300"}`}>
                            {newIsActive === opt.val && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm font-bold ${newIsActive === opt.val ? opt.tc : "text-gray-500"}`}>{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Role */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                  {availableRoles.map(r => {
                    const chk = newRole === r.name;
                    return (
                      <div key={r.id} onClick={() => setNewRole(chk ? "user" : r.name)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer select-none mb-2 transition ${chk ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${chk ? "bg-green-600 border-green-600" : "border-gray-300"}`}>
                          {chk && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm font-bold ${chk ? "text-green-700" : "text-gray-500"}`}>{r.label}</span>
                          {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tombol aksi */}
                <div className="pt-2 flex gap-3">
                  <button type="submit"
                    className="flex-1 text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow"
                    style={{ backgroundColor: UNAND_GREEN }}>
                    {editTarget ? "Simpan Perubahan" : "Simpan Data"}
                  </button>
                  <button type="button" onClick={() => setMode("list")}
                    className="px-6 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition">
                    Kembali
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══ TRANSFER MODE ════════════════════════════════════════════════ */}
          {mode === "transfer" && (
            <div className="flex gap-4" style={{ height: "calc(100vh - 130px)" }}>
              <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                  <button type="button" onClick={() => setMode("list")} className="text-gray-400 hover:text-gray-700 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="font-bold text-gray-800">Pindah Anggota</span>
                  <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: UNAND_GREEN }}>
                    {selectedIds.size} dipilih
                  </span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-2.5 mb-2 flex items-center gap-2 flex-shrink-0">
                  <input placeholder="Cari nama / NIM..." value={txSearch} onChange={e => setTxSearch(e.target.value)}
                    className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400" />
                  <div className="w-px h-4 bg-gray-200" />
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-gray-500 font-medium whitespace-nowrap">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-green-600 w-3.5 h-3.5" />
                    Pilih semua
                  </label>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-0">
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="w-10 px-3 py-2.5 border-b"></th>
                          <th className="px-3 py-2.5 border-b text-xs font-bold text-gray-500 uppercase">Nama</th>
                          <th className="px-3 py-2.5 border-b text-xs font-bold text-gray-500 uppercase">NIM</th>
                          <th className="px-3 py-2.5 border-b text-xs font-bold text-gray-500 uppercase">Jabatan / Kementerian</th>
                          <th className="px-3 py-2.5 border-b text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {txFiltered.length === 0 ? (
                          <tr><td colSpan="5" className="py-10 text-center text-sm text-gray-400">Tidak ada anggota</td></tr>
                        ) : txFiltered.map(m => {
                          const chk = selectedIds.has(m.id);
                          return (
                            <tr key={m.id} onClick={() => toggleId(m.id)}
                              className={`cursor-pointer transition-colors ${chk ? "bg-green-50" : "hover:bg-gray-50"}`}>
                              <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={chk} onChange={() => toggleId(m.id)} className="accent-green-600 w-4 h-4 cursor-pointer" />
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`text-sm font-semibold ${chk ? "text-green-800" : "text-gray-800"}`}>{m.name}</span>
                              </td>
                              <td className="px-3 py-2.5 text-xs font-mono text-gray-400">{m.nim}</td>
                              <td className="px-3 py-2.5">
                                <div className="text-xs text-gray-700 font-medium">{m.jabatan}</div>
                                <div className="text-xs text-gray-400">{m.kementerian}</div>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${m.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
                                  {m.is_active ? "Aktif" : "Non-Aktif"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="w-60 flex-shrink-0 flex flex-col gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">Pengaturan</p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Periode Tujuan <span className="text-red-400">*</span></label>
                    <select value={txTargetPeriod} onChange={e => { setTxTargetPeriod(e.target.value); setTxResult(null); }}
                      className="w-full border border-gray-200 p-2 rounded-lg text-sm outline-none focus:border-green-400 transition">
                      <option value="">-- Pilih --</option>
                      {periodeTujuan.map(p => (
                        <option key={p.id} value={p.id}>{p.name}{(p.is_active === 1 || p.is_active === true) ? " ✓" : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Jabatan</label>
                    <select value={txJabatan} onChange={e => setTxJabatan(e.target.value)}
                      className="w-full border border-gray-200 p-2 rounded-lg text-sm outline-none focus:border-green-400 transition">
                      {daftarJabatan.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Kementerian <span className="text-red-400">*</span></label>
                    <select value={txKementerian} onChange={e => setTxKementerian(e.target.value)}
                      className="w-full border border-gray-200 p-2 rounded-lg text-sm outline-none focus:border-green-400 transition">
                      <option value="">-- Pilih --</option>
                      {daftarKementerian.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  {txResult && (
                    <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${txResult.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                      {txResult.type === "success"
                        ? `✓ ${txResult.inserted} dipindahkan${txResult.skipped > 0 ? `, ${txResult.skipped} dilewati` : ""}`
                        : `⚠ ${txResult.message}`}
                    </div>
                  )}
                  <button type="button" onClick={handleTransfer}
                    disabled={txLoading || selectedIds.size === 0 || !txTargetPeriod || !txKementerian}
                    className="w-full py-2.5 text-white rounded-lg text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: UNAND_GREEN }}>
                    {txLoading ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    )}
                    {txLoading ? "Memproses..." : `Pindahkan ${selectedIds.size > 0 ? selectedIds.size : ""}`}
                  </button>
                  <button type="button" onClick={() => setMode("list")}
                    className="w-full py-2 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50 transition">
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ LIST MODE ════════════════════════════════════════════════════ */}
          {mode === "list" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center border-l-4 min-w-0" style={{ borderLeftColor: UNAND_GREEN }}>
                  <span className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: UNAND_GREEN }}>Periode</span>
                  {periods.length === 0 ? (
                    <span className="text-sm text-gray-400 italic">Belum ada</span>
                  ) : (
                    <select value={periodeAktif?.id ?? ""} onChange={e => {
                      const sel = periods.find(p => String(p.id) === e.target.value);
                      setPeriodeAktif(sel ?? null);
                      setSearch(""); setFilterJabatan(""); setFilterKementerian("");
                    }} className="text-sm font-bold bg-transparent outline-none cursor-pointer" style={{ color: UNAND_GREEN }}>
                      {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                  {periodeAktif && (
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(periodeAktif.start_date).getFullYear()} — {new Date(periodeAktif.end_date).getFullYear()}
                    </span>
                  )}
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center border-l-4 border-l-green-400">
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Aktif</span>
                  <span className="text-2xl font-bold text-gray-800">{countAktif} <span className="text-xs font-medium text-gray-400">Akun</span></span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center border-l-4 border-l-red-400">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Non-Aktif</span>
                  <span className="text-2xl font-bold text-gray-800">{countNonAktif} <span className="text-xs font-medium text-gray-400">Akun</span></span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Anggota</span>
                  <span className="text-2xl font-bold text-gray-800">{members.length}</span>
                </div>
              </div>

              {periods.length === 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
                  ⚠ Belum ada periode kepengurusan. Buat periode terlebih dahulu di menu <strong>Periode</strong>.
                </div>
              )}
              {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">⚠️ {error}</div>}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-4">
              {/* Mobile: stack — Desktop: satu baris */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3 md:mb-0">
                <input
                  placeholder="Cari nama..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border p-2 rounded-xl w-full md:max-w-xs outline-none bg-gray-50 text-sm"
                />
                <select value={filterJabatan} onChange={e => setFilterJabatan(e.target.value)}
                  className="border p-2 rounded-xl bg-white text-sm outline-none w-full md:w-auto">
                  <option value="">Semua Jabatan</option>
                  {daftarJabatan.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
                <select value={filterKementerian} onChange={e => setFilterKementerian(e.target.value)}
                  className="border p-2 rounded-xl bg-white text-sm outline-none w-full md:w-auto">
                  <option value="">Semua Kementerian</option>
                  {daftarKementerian.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                className="border p-2 rounded-xl bg-white text-sm outline-none w-full md:w-auto">
                <option value="">Semua Role</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
                {(search || filterJabatan || filterKementerian || filterRole) && (
                  <button type="button"
                    onClick={() => { setSearch(""); setFilterJabatan(""); setFilterKementerian(""); setFilterRole(""); }}
                    className="text-xs text-red-500 font-bold hover:underline self-start md:self-auto">
                    Reset
                  </button>
                )}

                {/* Tombol aksi: di desktop langsung di baris yang sama (ml-auto) */}
                <div className="hidden md:flex items-center gap-2 ml-auto border-l pl-3">
                  {periodeAktif && periodeTujuan.length > 0 && members.length > 0 && (
                    <button type="button" onClick={enterTransferMode}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Transfer Anggota
                    </button>
                  )}
                  <button type="button" onClick={openAdd} disabled={!periodeAktif}
                    className="text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition shadow-sm flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: UNAND_GREEN }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Tambah Anggota
                  </button>
                </div>
              </div>

              {/* Tombol aksi: di mobile saja (baris terpisah) */}
              <div className="flex md:hidden gap-2 pt-3 border-t border-gray-100 mt-1">
                {periodeAktif && periodeTujuan.length > 0 && members.length > 0 && (
                  <button type="button" onClick={enterTransferMode}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Transfer Anggota
                  </button>
                )}
                <button type="button" onClick={openAdd} disabled={!periodeAktif}
                  className="flex-1 text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-40"
                  style={{ backgroundColor: UNAND_GREEN }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Tambah Anggota
                </button>
              </div>
            </div>
              {loading ? (
                <div className="text-center py-16 text-gray-400 font-medium">Memuat data…</div>
              ) : (
                <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-4 border-b text-gray-700 font-bold text-sm">Nama</th>
                        <th className="p-4 border-b text-gray-700 font-bold text-sm">NIM</th>
                        <th className="p-4 border-b text-gray-700 font-bold text-sm">Jabatan</th>
                        <th className="p-4 border-b text-gray-700 font-bold text-sm">Kementerian</th>
                        <th className="p-4 border-b text-gray-700 font-bold text-sm">Role</th>
                        <th className="p-4 border-b text-center text-gray-700 font-bold text-sm">Status</th>
                        <th className="p-4 border-b text-center text-gray-700 font-bold text-sm">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayData.length > 0 ? displayData.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50/50 transition">
                          <td className="p-4 font-medium text-gray-800 text-sm">{m.name}</td>
                          <td className="p-4 text-gray-600 text-sm font-mono tracking-wide">{m.nim}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase"
                              style={{ backgroundColor: "#E6F4EA", color: UNAND_GREEN }}>{m.jabatan}</span>
                          </td>
                          <td className="p-4 text-gray-600 text-sm">{m.kementerian}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-100 text-gray-500 border border-gray-200">User</span>
                              {m.role && m.role !== "user" && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${extraRolePill[m.role] ?? "bg-orange-100 text-orange-700 border border-orange-200"}`}>
                                  {m.role_label ?? m.role}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${m.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                              {m.is_active ? "Aktif" : "Non-Aktif"}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button type="button" onClick={() => openEdit(m)} title="Edit"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.193 9.193a2 2 0 01-.707.464l-3 1a1 1 0 01-1.265-1.265l1-3a2 2 0 01.464-.707l9.193-9.193z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="7" className="p-10 text-center text-gray-400 font-medium">
                            {periodeAktif ? `Belum ada anggota untuk periode ${periodeAktif.name}` : "Pilih periode untuk melihat data anggota"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
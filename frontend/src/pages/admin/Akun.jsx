import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";

function Akun() {
  const UNAND_GREEN     = "#00923D";
  const TOTAL_KEMENTERIAN = 15;

  // ─── Periods dari API ────────────────────────────────────────────────────
  const [periods, setPeriods]         = useState([]);
  const [periodeAktif, setPeriodeAktif] = useState(null); // object { id, name, ... }

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const [showForm,   setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const daftarJabatan = [
    "Presiden Mahasiswa", "Wakil Presiden Mahasiswa", "Sekretaris Negara",
    "Menteri Koordinator", "Menteri", "Sekretaris Menteri",
    "Bendahara Menteri", "Staff Ahli",
  ];

  const daftarKementerian = [
    "Kepresidenan", "Komunikasi dan Informasi", "Pengembangan Sumber Daya Manusia",
    "Kebijakan Daerah", "Kebijakan Nasional", "Kebijakan Kampus",
    "Riset dan Keilmuan", "Sekretaris Kabinet", "Lingkungan Hidup",
    "Sosial dan Masyarakat", "Dalam Negeri", "Luar Negeri",
    "Advokasi Kesejahteraan Mahasiswa", "Pergerakan Perempuan",
    "Media Event dan Bisnis", "Audit Internal", "Keuangan",
  ];

  const [availableRoles, setAvailableRoles] = useState([]);

  // Fetch roles saat komponen mount:
  useEffect(() => {
    fetch(`${API}/roles`)
      .then(r => r.json())
      .then(data => {
        // Exclude 'user' (default) dan 'superadmin' jika mau dibatasi
        setAvailableRoles(data.filter(r => r.name !== "user"));
      })
      .catch(() => {});
  }, []);

  // Form state
  const [newName,        setNewName]        = useState("");
  const [newNim,         setNewNim]         = useState("");
  const [newPassword,    setNewPassword]    = useState("");
  const [newUsername,    setNewUsername]    = useState("");
  const [newJabatan,     setNewJabatan]     = useState("");
  const [newKementerian, setNewKementerian] = useState("");
  const [newRole,        setNewRole]        = useState("user");
  const [newIsActive,    setNewIsActive]    = useState(true);

  // Filter state
  const [search,            setSearch]            = useState("");
  const [filterJabatan,     setFilterJabatan]     = useState("");
  const [filterKementerian, setFilterKementerian] = useState("");

  // ─── Fetch periods ───────────────────────────────────────────────────────
  const fetchPeriods = async () => {
    try {
      const res = await fetch(`${API}/periode`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPeriods(data);
      // Default: pilih periode yang is_active, atau periode pertama
      const aktif = data.find(p => p.is_active === 1 || p.is_active === true);
      setPeriodeAktif(aktif ?? data[0] ?? null);
    } catch (e) {
      console.error("Gagal memuat periode:", e.message);
    }
  };

  // ─── Fetch members by period_id ──────────────────────────────────────────
  const fetchMembers = async (periodId) => {
    if (!periodId) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API}/members?period_id=${periodId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memuat data");
      setMembers(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPeriods(); }, []);

  // Fetch ulang anggota setiap kali periode aktif berubah
  useEffect(() => {
    if (periodeAktif?.id) fetchMembers(periodeAktif.id);
  }, [periodeAktif]);

  // ─── Handler ganti periode dari dropdown ─────────────────────────────────
  const handleChangePeriode = (e) => {
    const selected = periods.find(p => String(p.id) === e.target.value);
    setPeriodeAktif(selected ?? null);
    setSearch(""); setFilterJabatan(""); setFilterKementerian("");
  };

  // ─── Derived values ──────────────────────────────────────────────────────
  const displayData = members.filter(m =>
    (m.name ?? "").toLowerCase().includes(search.toLowerCase()) &&
    (filterJabatan     === "" || m.jabatan     === filterJabatan) &&
    (filterKementerian === "" || m.kementerian === filterKementerian)
  );

  const countAktif    = members.filter(m => m.is_active === 1).length;
  const countNonAktif = members.filter(m => m.is_active === 0).length;
  const isFilterActive = search !== "" || filterJabatan !== "" || filterKementerian !== "";

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditTarget(null);
    setNewName(""); setNewNim(""); setNewPassword(""); setNewUsername("");
    setNewJabatan(""); setNewKementerian(""); setNewRole("user");
    setNewIsActive(true);
    setShowForm(true);
  };

  const handleOpenEdit = (member) => {
    setEditTarget(member.id);
    setNewName(member.name ?? "");
    setNewNim(member.nim ?? "");
    setNewPassword("");
    setNewUsername(member.username ?? "");
    setNewJabatan(member.jabatan ?? "");
    setNewKementerian(member.kementerian ?? "");
    setNewRole(member.role ?? "user");
    setNewIsActive(member.is_active === 1);
    setShowForm(true);
  };

  // ─── NIM input handler — hanya angka, maks 10 digit ──────────────────────
  const handleNimChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setNewNim(val);
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      name:        newName,
      nim:         newNim,
      username:    newUsername,
      jabatan:     newJabatan,
      kementerian: newKementerian,
      role:        newRole,
      period_id:   periodeAktif?.id,   // ── kirim period_id ke backend
    };

    if (editTarget !== null) {
      payload.is_active = newIsActive ? 1 : 0;
      if (newPassword.trim() !== "") payload.password = newPassword;
    } else {
      payload.password = newPassword;
    }

    try {
      const url    = editTarget !== null ? `${API}/members/${editTarget}` : `${API}/members`;
      const method = editTarget !== null ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menyimpan data");
      }
      await fetchMembers(periodeAktif?.id);
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      alert(err.message);
    }
  };

  // ─── Styling helpers ──────────────────────────────────────────────────────
  const extraRolePill = {
    admin:      "bg-blue-100   text-blue-700   border border-blue-200",
    superadmin: "bg-purple-100 text-purple-700 border border-purple-200",
  };
  const cardActive  = { admin: "border-blue-400 bg-blue-50",   superadmin: "border-purple-400 bg-purple-50"  };
  const checkActive = { admin: "bg-blue-600 border-blue-600",  superadmin: "bg-purple-600 border-purple-600" };
  const labelActive = { admin: "text-blue-700",                 superadmin: "text-purple-700"                 };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Manajemen Anggota" subtitle="Kelola data kepengurusan BEM KM UNAND" />

        <main className="flex-1 overflow-y-auto p-8">

          {/* STATS */}
          {!showForm && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

              {/* Periode selector */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center border-l-4"
                style={{ borderLeftColor: UNAND_GREEN }}>
                <span className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: UNAND_GREEN }}>
                  Periode
                </span>
                {periods.length === 0 ? (
                  <span className="text-sm text-gray-400 italic">Belum ada periode</span>
                ) : (
                  <select
                    value={periodeAktif?.id ?? ""}
                    onChange={handleChangePeriode}
                    className="text-sm font-bold bg-transparent outline-none cursor-pointer leading-tight"
                    style={{ color: UNAND_GREEN }}
                  >
                    {periods.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                {periodeAktif && (
                  <span className="text-[10px] text-gray-400 mt-1">
                    {new Date(periodeAktif.start_date).getFullYear()} —{" "}
                    {new Date(periodeAktif.end_date).getFullYear()}
                  </span>
                )}
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center border-l-4 border-l-green-400">
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Status Aktif</span>
                <span className="text-2xl font-bold text-gray-800">
                  {countAktif} <span className="text-xs font-medium text-gray-400">Akun</span>
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center border-l-4 border-l-red-400">
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Non-Aktif</span>
                <span className="text-2xl font-bold text-gray-800">
                  {countNonAktif} <span className="text-xs font-medium text-gray-400">Akun</span>
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Kementerian</span>
                <span className="text-2xl font-bold text-gray-800">{TOTAL_KEMENTERIAN}</span>
              </div>
            </div>
          )}

          {/* Notif jika belum ada periode */}
          {!showForm && periods.length === 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Belum ada periode kepengurusan. Buat periode terlebih dahulu di menu <strong className="ml-1">Periode</strong>.
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
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold" style={{ color: UNAND_GREEN }}>
                  {editTarget !== null ? "Edit Data Anggota" : "Formulir Anggota Baru"}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">Batal</button>
              </div>

              {/* Info periode */}
              {periodeAktif && (
                <div className="mb-6 px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                  style={{ backgroundColor: "#E6F4EA", color: UNAND_GREEN }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  Periode: {periodeAktif.name}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-5">
                {/* Nama */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full border p-3 rounded-xl outline-none transition focus:border-green-400" required />
                </div>

                {/* NIM & Username */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">NIM</label>
                    <input
                      value={newNim}
                      onChange={handleNimChange}
                      placeholder="Contoh: 2311527001"
                      inputMode="numeric"
                      maxLength={10}
                      className="w-full border p-3 rounded-xl outline-none transition focus:border-green-400"
                      required={editTarget === null}
                    />
                    
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                    <input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                      placeholder="Contoh: Risken26"
                      className="w-full border p-3 rounded-xl outline-none transition focus:border-green-400"
                      required={editTarget === null} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Password
                    {editTarget !== null && (
                      <span className="ml-2 text-xs font-normal text-gray-400">
                       
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={editTarget !== null ? "Isi untuk mengubah password" : "Masukkan password"}
                    className="w-full border p-3 rounded-xl outline-none transition focus:border-green-400"
                    required={editTarget === null}
                    autoComplete="new-password"
                  />
                </div>

                {/* Jabatan & Periode (readonly) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Jabatan</label>
                    <select value={newJabatan} onChange={e => setNewJabatan(e.target.value)}
                      className="w-full border p-3 rounded-xl outline-none transition" required>
                      <option value="" disabled>Pilih Jabatan</option>
                      {daftarJabatan.map(jab => <option key={jab} value={jab}>{jab}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Periode Menjabat</label>
                    <input
                      value={periodeAktif?.name ?? "-"}
                      className="w-full border p-3 rounded-xl bg-gray-50 outline-none text-gray-500 text-sm"
                      readOnly
                    />
                  </div>
                </div>

                {/* Kementerian */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kementerian / Inspektorat</label>
                  <select value={newKementerian} onChange={e => setNewKementerian(e.target.value)}
                    className="w-full border p-3 rounded-xl outline-none" required>
                    <option value="" disabled>Pilih Kementerian</option>
                    {daftarKementerian.map(kem => <option key={kem} value={kem}>{kem}</option>)}
                  </select>
                </div>

                {/* Status Aktif — hanya saat Edit */}
                {editTarget !== null && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status Keanggotaan</label>
                    <div className="flex gap-3">
                      <div onClick={() => setNewIsActive(true)}
                        className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-pointer select-none
                          ${newIsActive ? "border-green-400 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
                          ${newIsActive ? "border-green-500 bg-green-500" : "border-gray-300 bg-white"}`}>
                          {newIsActive && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${newIsActive ? "text-green-700" : "text-gray-500"}`}>Aktif</p>
                          <p className="text-xs text-gray-400 mt-0.5">Dapat login & akses fitur</p>
                        </div>
                      </div>
                      <div onClick={() => setNewIsActive(false)}
                        className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-pointer select-none
                          ${!newIsActive ? "border-red-400 bg-red-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
                          ${!newIsActive ? "border-red-500 bg-red-500" : "border-gray-300 bg-white"}`}>
                          {!newIsActive && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${!newIsActive ? "text-red-600" : "text-gray-500"}`}>Non-Aktif</p>
                          <p className="text-xs text-gray-400 mt-0.5">Akses sistem dinonaktifkan</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                {availableRoles.map(r => {
                  const isChecked = newRole === r.name;  // ← pakai r.name bukan r.key
                  return (
                    <div
                      key={r.id}
                      onClick={() => setNewRole(isChecked ? "user" : r.name)}  // ← r.name
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-pointer select-none mb-2
                        ${isChecked
                          ? "border-green-400 bg-green-50"   // ← warna solid, tidak tergantung nama role
                          : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition flex-shrink-0
                        ${isChecked ? "bg-green-600 border-green-600" : "border-gray-300 bg-white"}`}>
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm font-bold ${isChecked ? "text-green-700" : "text-gray-500"}`}>
                          {r.label}  {/* ← tampilkan label bukan name */}
                        </span>
                        {r.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
                {/* Tombol */}
                <div className="pt-4 flex gap-3">
                  <button type="submit"
                    className="flex-1 text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow-lg"
                    style={{ backgroundColor: UNAND_GREEN }}>
                    {editTarget !== null ? "Simpan Perubahan" : "Simpan Data"}
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
              {/* Filter & Tambah */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex-1 flex gap-2 flex-wrap">
                  <input placeholder="Cari nama..." value={search}
                    className="border p-2 rounded-xl flex-1 md:max-w-xs outline-none bg-gray-50/50 text-sm"
                    onChange={e => setSearch(e.target.value)} />
                  <select value={filterJabatan} className="border p-2 rounded-xl bg-white text-sm outline-none"
                    onChange={e => setFilterJabatan(e.target.value)}>
                    <option value="">Semua Jabatan</option>
                    {daftarJabatan.map(jab => <option key={jab} value={jab}>{jab}</option>)}
                  </select>
                  <select value={filterKementerian} className="border p-2 rounded-xl bg-white text-sm outline-none"
                    onChange={e => setFilterKementerian(e.target.value)}>
                    <option value="">Semua Kementerian</option>
                    {daftarKementerian.map(kem => <option key={kem} value={kem}>{kem}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4 border-l pl-4">
                  {isFilterActive && (
                    <button onClick={() => { setSearch(""); setFilterJabatan(""); setFilterKementerian(""); }}
                      className="text-xs text-red-600 hover:underline font-semibold whitespace-nowrap">Reset</button>
                  )}
                  <button
                    onClick={handleOpenAdd}
                    disabled={!periodeAktif}
                    className="text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition shadow-sm flex items-center gap-2 whitespace-nowrap text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: UNAND_GREEN }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Tambah Anggota
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-16 text-gray-400 font-medium">Memuat data…</div>
              ) : (
                <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
                  <table className="w-full text-left border-collapse">
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
                              style={{ backgroundColor: '#E6F4EA', color: UNAND_GREEN }}>
                              {m.jabatan}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600 text-sm">{m.kementerian}</td>
                          <td className="p-4">
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-100 text-gray-500 border border-gray-200">
                              User
                            </span>
                            {m.role && m.role !== "user" && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                extraRolePill[m.role] ?? "bg-orange-100 text-orange-700 border border-orange-200"
                              }`}>
                                {m.role_label ?? m.role}
                              </span>
                            )}
                          </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              m.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                            }`}>
                              {m.is_active ? "Aktif" : "Non-Aktif"}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleOpenEdit(m)} title="Edit"
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
                            {periodeAktif
                              ? `Belum ada anggota untuk periode ${periodeAktif.name}`
                              : "Pilih periode untuk melihat data anggota"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Akun;
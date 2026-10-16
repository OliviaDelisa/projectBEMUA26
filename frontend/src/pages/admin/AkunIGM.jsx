import { useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, Search } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";

const kementerianIGM = [
  "Komunikasi dan Informasi", "Pengembangan Sumber Daya Mahasiswa",
  "Kebijakan Daerah", "Kebijakan Nasional", "Kebijakan Kampus",
  "Riset dan Keilmuan", "Sekretaris Kabinet", "Lingkungan Hidup",
  "Sosial dan Masyarakat", "Dalam Negeri", "Luar Negeri",
  "Advokasi Kesejahteraan Mahasiswa", "Pergerakan Perempuan",
  "Mitra Event dan Bisnis", "Audit Internal", "Keuangan",
];

const fakultasUnand = [
  "Fakultas Pertanian",
  "Fakultas Kedokteran",
  "Fakultas Matematika dan Ilmu Pengetahuan Alam",
  "Fakultas Hukum",
  "Fakultas Ekonomi dan Bisnis",
  "Fakultas Peternakan",
  "Fakultas Ilmu Budaya",
  "Fakultas Teknik",
  "Fakultas Ilmu Sosial dan Ilmu Politik",
  "Fakultas Farmasi",
  "Fakultas Teknologi Pertanian",
  "Fakultas Keperawatan",
  "Fakultas Kesehatan Masyarakat",
  "Fakultas Kedokteran Gigi",
  "Fakultas Teknologi Informasi",
];

const initialForm = {
  name: "", nim: "", username: "", password: "", fakultas: "", kementerian: "", period_id: "", is_active: true,
};

export default function AkunIGM() {
  const [members, setMembers] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState("");
  const [search, setSearch] = useState("");
  const [filterKem, setFilterKem] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targetPeriodId, setTargetPeriodId] = useState("");
  const [copying, setCopying] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState(null);
  const [resetModal, setResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [copied, setCopied] = useState(false);

  const loadPeriods = async () => {
    const res = await fetch(`${API}/periode`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal memuat periode");
    setPeriods(data);
    const selected = data.find(period => period.is_active === 1 || period.is_active === true) ?? data[0];
    if (selected) setPeriodId(String(selected.id));
  };

  const loadMembers = async (selectedPeriod = periodId) => {
    if (!selectedPeriod) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/igm-members?period_id=${selectedPeriod}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memuat anggota IGM");
      setMembers(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods().catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (periodId) loadMembers(periodId);
  }, [periodId]);

  const filteredMembers = useMemo(() => members.filter(member =>
    `${member.name} ${member.nim}`.toLowerCase().includes(search.toLowerCase()) &&
    (!filterKem || member.kementerian === filterKem)
  ), [members, search, filterKem]);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const openAdd = () => {
    setEditId(null);
    setForm({ ...initialForm, period_id: periodId });
    setShowForm(true);
  };

  const openEdit = member => {
    setEditId(member.id);
    setForm({
      name: member.name ?? "",
      nim: member.nim ?? "",
      username: member.nim ?? "",
      password: "",
      fakultas: member.fakultas ?? "",
      kementerian: member.kementerian ?? "",
      period_id: String(member.period_id),
      is_active: member.is_active === 1 || member.is_active === true,
    });
    setShowForm(true);
  };

  const handleNimChange = value => {
    const nim = value.replace(/\D/g, "").slice(0, 10);
    setForm(prev => ({
      ...prev,
      nim,
      username: nim,
      password: `bem${nim}`,
    }));
  };

  const handleSave = async event => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      if (editId) payload.is_active = form.is_active ?? true;
      const res = await fetch(`${API}/igm-members${editId ? `/${editId}` : ""}`, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menyimpan akun IGM");
      if (!editId) {
        setCopyMessage(data.accountReused
          ? "Anggota ditambahkan ke periode ini; akun dan password lama tetap digunakan."
          : `Akun baru: username ${form.nim}, password bem${form.nim}. Wajib ganti password saat login pertama.`);
      }
      setShowForm(false);
      setEditId(null);
      await loadMembers(periodId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openResetModal = member => {
    setResetTarget(member);
    setResetDone(false);
    setResetPasswordValue(`bem${member.nim}`);
    setCopied(false);
    setResetModal(true);
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    try {
      const res = await fetch(`${API}/igm-members/${resetTarget.id}/reset-password`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mereset password");
      setResetPasswordValue(data.defaultPassword || `bem${resetTarget.nim}`);
      setResetDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const copyResetPassword = async () => {
    try {
      await navigator.clipboard.writeText(resetPasswordValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Gagal menyalin password.");
    }
  };

  const closeResetModal = () => {
    if (resetLoading) return;
    setResetModal(false);
    setResetTarget(null);
    setCopied(false);
  };

  const copyMembersToPeriod = async () => {
    if (!targetPeriodId) return;
    if (!window.confirm(`Salin anggota aktif periode ini ke ${periods.find(period => String(period.id) === targetPeriodId)?.name}?`)) return;
    setCopying(true);
    setCopyMessage("");
    try {
      const res = await fetch(`${API}/igm-members/copy-to-period`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_period_id: periodId, to_period_id: targetPeriodId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menyalin anggota");
      setCopyMessage(`${data.inserted} anggota ditambahkan; ${data.skipped} sudah ada.`);
      setPeriodId(targetPeriodId);
      setTargetPeriodId("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCopying(false);
    }
  };

  const activeCount = members.filter(member => member.is_active === 1 || member.is_active === true).length;
  const inactiveCount = members.length - activeCount;
  const selectedPeriod = periods.find(period => String(period.id) === String(periodId));

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar title="Akun Anggota IGM" subtitle="Kelola akun dan kementerian anggota magang" />
        <main className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {resetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="p-6">
                  {!resetDone ? (
                    <>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                        <KeyRound className="h-6 w-6 text-amber-500" />
                      </div>
                      <h3 className="mb-1 text-center text-lg font-bold text-gray-800">Reset Password?</h3>
                      <p className="mb-5 text-center text-sm text-gray-500">Password akan direset ke default. Anggota wajib mengganti password saat login berikutnya.</p>
                      <div className="mb-5 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div>
                          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Password baru</p>
                          <p className="font-mono font-bold tracking-wide text-gray-800">{resetPasswordValue}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={closeResetModal} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50">Batal</button>
                        <button type="button" onClick={handleResetPassword} disabled={resetLoading} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-60" style={{ backgroundColor: "#00923D" }}>
                          {resetLoading ? "Mereset..." : "Ya, Reset"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">✓</div>
                      <h3 className="mb-1 text-center text-lg font-bold text-gray-800">Password Direset!</h3>
                      <p className="mb-5 text-center text-sm text-gray-500">Sampaikan password berikut ke anggota.</p>
                      <div className="mb-5 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div>
                          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Password baru</p>
                          <p className="font-mono font-bold tracking-wide text-gray-800">{resetPasswordValue}</p>
                        </div>
                        <button type="button" onClick={copyResetPassword} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
                          {copied ? "Disalin" : "Salin"}
                        </button>
                      </div>
                      <button type="button" onClick={closeResetModal} className="w-full rounded-xl py-2.5 text-sm font-bold text-white" style={{ backgroundColor: "#00923D" }}>Selesai</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {showForm ? (
            <section className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">{editId ? "Edit Anggota IGM" : "Tambah Anggota IGM"}</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-sm font-semibold text-gray-500 hover:text-gray-800">Batal</button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Nama lengkap</label>
                  <input required value={form.name} onChange={event => setField("name", event.target.value)} className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-green-500" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">NIM</label>
                    <input required inputMode="numeric" maxLength={10} value={form.nim} onChange={event => handleNimChange(event.target.value)} className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-green-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Username</label>
                    <input required value={form.username} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Fakultas</label>
                    <select required value={form.fakultas} onChange={event => setField("fakultas", event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm outline-none focus:border-green-500">
                      <option value="">Pilih fakultas</option>
                      {fakultasUnand.map(fakultas => <option key={fakultas} value={fakultas}>{fakultas}</option>)}
                    </select>
                  </div>
                  <div className="hidden sm:block" />
                </div>
                {!editId && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Password awal</label>
                    <input required value={form.password} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm outline-none" />
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Kementerian</label>
                    <select required value={form.kementerian} onChange={event => setField("kementerian", event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm outline-none focus:border-green-500">
                      <option value="">Pilih kementerian</option>
                      {kementerianIGM.map(kementerian => <option key={kementerian}>{kementerian}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Periode</label>
                    <select required disabled={Boolean(editId)} value={form.period_id} onChange={event => setField("period_id", event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm outline-none focus:border-green-500 disabled:bg-gray-100">
                      <option value="">Pilih periode</option>
                      {periods.map(period => <option key={period.id} value={period.id}>{period.name}</option>)}
                    </select>
                  </div>
                </div>
                {editId && (
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={form.is_active ?? true} onChange={event => setField("is_active", event.target.checked)} className="accent-green-600" />
                    Aktif pada periode ini
                  </label>
                )}
                <div className="flex gap-3 pt-2">
                  <button disabled={saving} className="flex-1 rounded-lg bg-[#00923D] px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50">
                    {saving ? "Menyimpan..." : "Simpan Akun"}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600">Batal</button>
                </div>
              </form>
            </section>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="flex min-w-0 flex-col justify-center rounded-2xl border border-gray-100 border-l-4 bg-white p-4 shadow-sm" style={{ borderLeftColor: "#00923D" }}>
                  <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#00923D]">Periode</span>
                  {periods.length === 0 ? (
                    <span className="text-sm italic text-gray-400">Belum ada</span>
                  ) : (
                    <select value={periodId} onChange={event => {
                      setPeriodId(event.target.value);
                      setSearch("");
                      setFilterKem("");
                    }} className="cursor-pointer bg-transparent text-sm font-bold text-[#00923D] outline-none">
                      {periods.map(period => <option key={period.id} value={period.id}>{period.name}</option>)}
                    </select>
                  )}
                  {selectedPeriod && (
                    <span className="mt-0.5 text-[10px] text-gray-400">
                      {new Date(selectedPeriod.start_date).getFullYear()} — {new Date(selectedPeriod.end_date).getFullYear()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col justify-center rounded-2xl border border-gray-100 border-l-4 border-l-green-400 bg-white p-4 shadow-sm">
                  <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-green-600">Aktif</span>
                  <span className="text-2xl font-bold text-gray-800">{activeCount} <span className="text-xs font-medium text-gray-400">Akun</span></span>
                </div>
                <div className="flex flex-col justify-center rounded-2xl border border-gray-100 border-l-4 border-l-red-400 bg-white p-4 shadow-sm">
                  <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-red-500">Non-Aktif</span>
                  <span className="text-2xl font-bold text-gray-800">{inactiveCount} <span className="text-xs font-medium text-gray-400">Akun</span></span>
                </div>
                <div className="flex flex-col justify-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Total Anggota</span>
                  <span className="text-2xl font-bold text-gray-800">{members.length}</span>
                </div>
              </div>

              <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1 sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama atau NIM" className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-500" />
                  </div>
                  <select value={filterKem} onChange={event => setFilterKem(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500">
                    <option value="">Semua kementerian</option>
                    {kementerianIGM.map(kementerian => <option key={kementerian}>{kementerian}</option>)}
                  </select>
                  {periods.some(period => String(period.id) !== String(periodId)) && members.length > 0 && (
                    <div className="flex gap-2">
                      <select value={targetPeriodId} onChange={event => setTargetPeriodId(event.target.value)} className="min-w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500">
                        <option value="">Salin ke periode...</option>
                        {periods.filter(period => String(period.id) !== String(periodId)).map(period => <option key={period.id} value={period.id}>{period.name}</option>)}
                      </select>
                      <button type="button" disabled={!targetPeriodId || copying} onClick={copyMembersToPeriod} className="rounded-lg border border-green-200 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-50 disabled:opacity-40">
                        {copying ? "Menyalin..." : "Salin"}
                      </button>
                    </div>
                  )}
                  <button type="button" onClick={openAdd} disabled={!periodId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00923D] px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">
                    <Plus className="h-4 w-4" /> Tambah IGM
                  </button>
                </div>
                {copyMessage && <div className="border-b border-green-100 bg-green-50 px-4 py-2 text-xs font-medium text-green-700">{copyMessage}</div>}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left">
                    <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
                      <tr><th className="p-4">Nama</th><th className="p-4">NIM</th><th className="p-4">Fakultas</th><th className="p-4">Kementerian</th><th className="p-4 text-center">Aksi</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {loading ? <tr><td colSpan="5" className="p-10 text-center text-gray-400">Memuat data...</td></tr> : filteredMembers.length ? filteredMembers.map(member => (
                        <tr key={member.id} className="hover:bg-gray-50/70">
                          <td className="p-4 font-semibold text-gray-800">{member.name}</td>
                          <td className="p-4 font-mono text-gray-500">{member.nim}</td>
                          <td className="p-4 text-gray-600">{member.fakultas || "-"}</td>
                          <td className="p-4 text-gray-600">{member.kementerian}</td>
                          <td className="p-4"><div className="flex justify-center gap-2">
                            <button type="button" onClick={() => openEdit(member)} title="Edit anggota" className="rounded-md border border-gray-200 p-2 text-gray-500 hover:border-green-400 hover:text-green-700"><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => openResetModal(member)} title="Reset password" className="rounded-md border border-gray-200 p-2 text-gray-500 hover:border-amber-400 hover:text-amber-700"><KeyRound className="h-4 w-4" /></button>
                          </div></td>
                        </tr>
                      )) : <tr><td colSpan="5" className="p-10 text-center text-gray-400">Belum ada anggota IGM pada periode ini</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
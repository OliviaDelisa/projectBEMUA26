import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

function Akun() {
  // 1. DATA AWAL
  const [members, setMembers] = useState([
    { id: 1, nama: "Ammar Qussoyyi Akmal", jabatan: "Staff Ahli", kementerian: "Riset dan Keilmuan", tahun: "2026", status: "Aktif" },
    { id: 2, nama: "Amanda Afilla", jabatan: "Staff Ahli", kementerian: "Sekretaris Kabinet", tahun: "2026", status: "Aktif" },
    { id: 3, nama: "Firmansyah", jabatan: "Menteri", kementerian: "Lingkungan Hidup", tahun: "2026", status: "Aktif" },
    { id: 4, nama: "Dedi Irwansyah", jabatan: "Presiden Mahasiswa", kementerian: "Kepresidenan", tahun: "2025", status: "Non-Aktif" },
    { id: 5, nama: "Olivia Delisa", jabatan: "Staff Ahli", kementerian: "Riset dan Keilmuan", tahun: "2026", status: "Aktif" },
    { id: 6, nama: "Nurul Annisa Fitri", jabatan: "Sekretaris Menteri", kementerian: "Komunikasi dan Informasi", tahun: "2025", status: "Non-Aktif" },
    { id: 7, nama: "Nurul Fadhilah S Nasution", jabatan: "Staff Ahli", kementerian: "Pergerakan Perempuan", tahun: "2025", status: "Non-Aktif" },
    { id: 8, nama: "Imam Nurzaki Islami", jabatan: "Staff Ahli", kementerian: "Dalam Negeri", tahun: "2026", status: "Aktif" },
    { id: 9, nama: "Ardian Okta Sya'bani", jabatan: "Menteri Koordinator", kementerian: "Kepresidenan", tahun: "2026", status: "Aktif" },
    { id: 10, nama: "Trici Ayunda", jabatan: "Bendahara Menteri", kementerian: "Riset dan Keilmuan", tahun: "2026", status: "Aktif" },
  ]);

  const [showForm, setShowForm] = useState(false);

  // KONSTANTA
  const UNAND_GREEN = "#00923D";
  const TOTAL_KEMENTERIAN = 15;
  const PERIODE_SAAT_INI = "2026";

  const daftarJabatan = [
    "Presiden Mahasiswa", "Wakil Presiden Mahasiswa", "Sekretaris Negara",
    "Menteri Koordinator", "Menteri", "Sekretaris Menteri",
    "Bendahara Menteri", "Staff Ahli"
  ];

  const daftarKementerian = [
    "Kepresidenan", "Komunikasi dan Informasi", "Pengembangan Sumber Daya Manusia",
    "Kebijakan Daerah", "Kebijakan Nasional", "Kebijakan Kampus",
    "Riset dan Keilmuan", "Sekretaris Kabinet", "Lingkungan Hidup",
    "Sosial dan Masyarakat", "Dalam Negeri", "Luar Negeri",
    "Advokasi Kesejahteraan Mahasiswa", "Pergerakan Perempuan",
    "Media Event dan Bisnis", "Audit Internal", "Keuangan"
  ];

  // STATE UNTUK FORM TAMBAH
  const [newName, setNewName] = useState("");
  const [newJabatan, setNewJabatan] = useState("");
  const [newKementerian, setNewKementerian] = useState("");
  const [newTahun, setNewTahun] = useState(PERIODE_SAAT_INI);
  
  // STATE UNTUK FILTER
  const [search, setSearch] = useState("");
  const [filterJabatan, setFilterJabatan] = useState("");
  const [filterKementerian, setFilterKementerian] = useState("");
  const [filterTahun, setFilterTahun] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    const newData = {
      id: Date.now(),
      nama: newName,
      jabatan: newJabatan,
      kementerian: newKementerian,
      tahun: newTahun,
      status: "Aktif" 
    };
    setMembers([...members, newData]);
    setNewName(""); setNewJabatan(""); setNewKementerian(""); setNewTahun(PERIODE_SAAT_INI);
    setShowForm(false);
  };

  const displayData = members.filter((m) => {
    return (
      m.nama.toLowerCase().includes(search.toLowerCase()) &&
      (filterJabatan === "" || m.jabatan === filterJabatan) &&
      (filterKementerian === "" || m.kementerian === filterKementerian) &&
      (filterTahun === "" || m.tahun === filterTahun)
    );
  });

  const isFilterActive = search !== "" || filterJabatan !== "" || filterKementerian !== "" || filterTahun !== "";

  // HITUNG STATISTIK
  const countAktif = members.filter(m => m.status === "Aktif").length;
  const countNonAktif = members.filter(m => m.status === "Non-Aktif").length;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Manajemen Anggota" subtitle="Kelola data kepengurusan BEM KM UNAND" />

        <main className="flex-1 overflow-y-auto p-8">
          
          {/* 1. BUBBLE STATS (HIJAU UNAND) */}
          {!showForm && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center border-l-4" style={{ borderLeftColor: UNAND_GREEN }}>
                <span className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: UNAND_GREEN }}>Status Aktif</span>
                <span className="text-2xl font-bold text-gray-800">{countAktif} <span className="text-xs font-medium text-gray-400">Akun</span></span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Non-Aktif</span>
                <span className="text-2xl font-bold text-gray-800">{countNonAktif} <span className="text-xs font-medium text-gray-400">Akun</span></span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Kementerian</span>
                <span className="text-2xl font-bold text-gray-800">{TOTAL_KEMENTERIAN}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Periode</span>
                <span className="text-2xl font-bold" style={{ color: UNAND_GREEN }}>{PERIODE_SAAT_INI}</span>
              </div>
            </div>
          )}

          {/* 2. FRAME FORMULIR */}
          {showForm ? (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold" style={{ color: UNAND_GREEN }}>Formulir Anggota Baru</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">Batal</button>
              </div>
              
              <form onSubmit={handleAdd} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Masukkan nama lengkap" className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition" style={{ focusRingColor: UNAND_GREEN }} required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Jabatan</label>
                    <select value={newJabatan} onChange={(e) => setNewJabatan(e.target.value)} className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition" required>
                      <option value="" disabled>Pilih Jabatan</option>
                      {daftarJabatan.map(jab => <option key={jab} value={jab}>{jab}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tahun Menjabat</label>
                    <input value={newTahun} onChange={(e) => setNewTahun(e.target.value)} className="w-full border p-3 rounded-xl bg-gray-50 outline-none" readOnly />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kementerian / Inspektorat</label>
                  <select value={newKementerian} onChange={(e) => setNewKementerian(e.target.value)} className="w-full border p-3 rounded-xl focus:ring-2 outline-none" required>
                    <option value="" disabled>Pilih Kementerian</option>
                    {daftarKementerian.map(kem => <option key={kem} value={kem}>{kem}</option>)}
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="submit" className="flex-1 text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow-lg" style={{ backgroundColor: UNAND_GREEN }}>Simpan Data</button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition">Kembali</button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* 3. FILTER BAR DENGAN TOMBOL TAMBAH */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex-1 flex gap-2">
                  <input 
                    placeholder="Cari nama..." 
                    value={search}
                    className="border p-2 rounded-xl flex-1 md:max-w-xs focus:ring-1 outline-none bg-gray-50/50 transition text-sm"
                    style={{ focusBorderColor: UNAND_GREEN }}
                    onChange={(e) => setSearch(e.target.value)} 
                  />
                  
                  <select value={filterJabatan} className="border p-2 rounded-xl bg-white transition text-sm outline-none" onChange={(e) => setFilterJabatan(e.target.value)}>
                    <option value="">Semua Jabatan</option>
                    {daftarJabatan.map(jab => <option key={jab} value={jab}>{jab}</option>)}
                  </select>

                  <select value={filterKementerian} className="border p-2 rounded-xl bg-white transition text-sm outline-none" onChange={(e) => setFilterKementerian(e.target.value)}>
                    <option value="">Semua Kementerian</option>
                    {daftarKementerian.map(kem => <option key={kem} value={kem}>{kem}</option>)}
                  </select>
                  
                  <input placeholder="Tahun" value={filterTahun} className="border p-2 rounded-xl w-24 text-center bg-white transition text-sm outline-none" onChange={(e) => setFilterTahun(e.target.value)} />
                </div>

                <div className="flex items-center gap-4 border-l pl-4">
                   {isFilterActive && (
                    <button onClick={() => { setSearch(""); setFilterJabatan(""); setFilterKementerian(""); setFilterTahun(""); }} className="text-xs text-red-600 hover:underline font-semibold whitespace-nowrap">Reset</button>
                  )}
                  <button 
                    onClick={() => setShowForm(true)}
                    className="text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition shadow-sm flex items-center gap-2 whitespace-nowrap text-sm"
                    style={{ backgroundColor: UNAND_GREEN }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Tambah Anggota
                  </button>
                </div>
              </div>

              {/* 4. TABEL DATA */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 border-b text-gray-700 font-bold text-sm">Nama</th>
                      <th className="p-4 border-b text-gray-700 font-bold text-sm">Jabatan</th>
                      <th className="p-4 border-b text-gray-700 font-bold text-sm">Kementerian</th>
                      <th className="p-4 border-b text-center text-gray-700 font-bold text-sm">Tahun</th>
                      <th className="p-4 border-b text-center text-gray-700 font-bold text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayData.length > 0 ? (
                      displayData.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50/50 transition">
                          <td className="p-4 font-medium text-gray-800 text-sm">{m.nama}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase" style={{ backgroundColor: '#E6F4EA', color: UNAND_GREEN }}>{m.jabatan}</span>
                          </td>
                          <td className="p-4 text-gray-600 text-sm">{m.kementerian}</td>
                          <td className="p-4 text-center text-gray-600 text-sm">{m.tahun}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              m.status === "Aktif" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                            }`}>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" className="p-10 text-center text-gray-400 font-medium">Data anggota tidak ditemukan</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Akun;
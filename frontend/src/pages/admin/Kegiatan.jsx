import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "../../components/Sidebar"; 
import Topbar from "../../components/Topbar";
import { 
  MapPin, Calendar, Users, CheckCircle, Clock, 
  Search, Plus, X, ChevronRight, LayoutGrid, 
  LogOut, QrCode, Globe, Download, Printer, Info
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import { QRCodeSVG } from "qrcode.react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet Icon Issue
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- DUMMY DATA ---
const INITIAL_MEMBERS = [
  {id: 0, name:'Ahmad Fauzi',nim:'2110001',kem:'Keuangan'},
  {id: 1, name:'Bunga Pertiwi',nim:'2110002',kem:'Pendidikan'},
  {id: 2, name:'Chandra Wijaya',nim:'2110003',kem:'Kominfo'},
  {id: 3, name:'Dewi Rahmawati',nim:'2110004',kem:'Sosmas'},
  {id: 4, name:'Eko Prasetyo',nim:'2110005',kem:'PSDM'},
  {id: 5, name:'Fitri Handayani',nim:'2110006',kem:'Keuangan'},
  {id: 6, name:'Galih Nugroho',nim:'2110007',kem:'Pendidikan'},
  {id: 7, name:'Hana Salsabila',nim:'2110008',kem:'Kominfo'},
  {id: 8, name:'Ilham Saputra',nim:'2110009',kem:'Sosmas'},
  {id: 9, name:'Julia Maharani',nim:'2110010',kem:'PSDM'},
];

const INITIAL_KEGIATAN = [
  {id:1,nama:'Aksi ke DPR RI',deskripsi:'Aksi penyampaian aspirasi mahasiswa ke DPR RI terkait UKT',lokasi:'Gedung DPR RI, Senayan, Jakarta',tanggal:'25 Jun 2025',jam:'09:00–17:00',status:'mendatang',metode:'keduanya',peserta:86,hadir:0,lat:-6.2088,lng:106.8456,kode:'KEG-2025-0001'},
  {id:2,nama:'Bakti Sosial Korban Banjir',deskripsi:'Kegiatan sosial membantu warga terdampak banjir Padang',lokasi:'Kota Padang, Sumbar',tanggal:'20–22 Jun 2025',jam:'07:00–17:00',status:'berlangsung',metode:'maps',peserta:64,hadir:52,lat:-0.9471,lng:100.4172,kode:'KEG-2025-0002'},
  {id:4,nama:'Pelatihan Manajemen Organisasi',deskripsi:'Pelatihan internal pengelolaan organisasi BEM',lokasi:'Ruang Sidang FEB UNAND',tanggal:'15 Jun 2025',jam:'09:00–15:00',status:'selesai',metode:'keduanya',peserta:96,hadir:84,lat:-0.9201,lng:100.4580,kode:'KEG-2025-0004'},
];

// --- HELPER COMPONENTS ---
function MapClickHandler({ setCoords }) {
  useMapEvents({
    click: (e) => setCoords(e.latlng),
  });
  return null;
}

function ChangeView({ center }) {
  const map = useMap();
  map.setView(center);
  return null;
}

export default function ManajemenKegiatan() {
  const [kegiatanList, setKegiatanList] = useState(INITIAL_KEGIATAN);
  const [activeTab, setActiveTab] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMetode, setFilterMetode] = useState('semua');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [newKegiatan, setNewKegiatan] = useState({
    nama: '', desc: '', tglMulai: '', tglSelesai: '', jamMulai: '09:00', jamSelesai: '17:00',
    lokasi: '', radius: 100, lat: -0.9471, lng: 100.4172, metode: 'keduanya'
  });
  const [selectedPeserta, setSelectedPeserta] = useState(new Set(INITIAL_MEMBERS.map(m => m.id)));

  // Detail State
  const [selectedKegiatan, setSelectedKegiatan] = useState(null);
  const [detailTab, setDetailTab] = useState('absensi');

  // Filter Logic
  const filteredKegiatan = useMemo(() => {
    return kegiatanList.filter(k => {
      const matchStatus = activeTab === 'semua' || k.status === activeTab;
      const matchSearch = k.nama.toLowerCase().includes(searchQuery.toLowerCase()) || k.lokasi.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMetode = filterMetode === 'semua' || k.metode === filterMetode;
      return matchStatus && matchSearch && matchMetode;
    });
  }, [kegiatanList, activeTab, searchQuery, filterMetode]);

  // Handlers
  const openModal = () => {
    setCurrentStep(1);
    setIsModalOpen(true);
    // Reset form state saat buka modal baru
    setNewKegiatan({
      nama: '', desc: '', tglMulai: '', tglSelesai: '', jamMulai: '09:00', jamSelesai: '17:00',
      lokasi: '', radius: 100, lat: -0.9471, lng: 100.4172, metode: 'keduanya'
    });
  };

  // Tambahan: Handler untuk Input Perubahan
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewKegiatan(prev => ({ ...prev, [name]: value }));
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      // Trigger resize peta jika masuk ke langkah 2
      if (currentStep + 1 === 2) {
        setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 200);
      }
    } else {
      // LOGIKA FINAL (SIMPAN KEGIATAN)
      const kegiatanBaru = {
        ...newKegiatan,
        id: Date.now(),
        status: 'mendatang',
        hadir: 0,
        peserta: selectedPeserta.size,
        tanggal: newKegiatan.tglMulai, // Sederhanakan untuk tampilan grid
        jam: `${newKegiatan.jamMulai} - ${newKegiatan.jamSelesai}`,
        kode: `KEG-2026-${String(kegiatanList.length + 1).padStart(4, '0')}`
      };

      setKegiatanList([kegiatanBaru, ...kegiatanList]);
      alert(`Kegiatan "${newKegiatan.nama}" Berhasil Dibuat!`);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f4f4ef] overflow-hidden text-gray-800 font-sans">
      {/* 1. SIDEBAR KONSISTEN */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">
        {/* 2. TOPBAR KONSISTEN */}
        <Topbar title="Manajemen Kegiatan" />

        {/* 3. MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto">
          {/* TOPBAR LOCAL (Action Bar) */}
          <div className="bg-white border-b border-gray-200 px-7 py-4 flex items-center justify-between sticky top-0 z-[20]">
            <div>
              <h2 className="text-lg font-bold text-green-800">Daftar Kegiatan</h2>
              <p className="text-xs text-gray-500 italic">Total {kegiatanList.length} kegiatan tercatat</p>
            </div>
            <button 
              onClick={openModal}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all shadow-md shadow-green-100"
            >
              <Plus size={16} strokeWidth={2.5} /> Buat Kegiatan
            </button>
          </div>

          {/* TABS NAVIGATION */}
          <div className="bg-white border-b border-gray-200 px-7 flex gap-2">
            {['semua', 'mendatang', 'berlangsung', 'selesai'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-all capitalize ${
                  activeTab === tab ? "border-green-600 text-green-700 font-bold" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab} ({tab === 'semua' ? kegiatanList.length : kegiatanList.filter(k => k.status === tab).length})
              </button>
            ))}
          </div>

          <div className="p-7 space-y-6">
            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard label="Total Kegiatan" value="24" sub="Periode 2024-2025" color="green" icon={<LayoutGrid size={18}/>} />
              <StatCard label="Mendatang" value="6" sub="30 hari ke depan" color="blue" icon={<Calendar size={18}/>} />
              <StatCard label="Berlangsung" value="3" sub="Aktif saat ini" color="amber" icon={<Clock size={18}/>} />
              <StatCard label="Selesai" value="15" sub="Avg Kehadiran 82%" color="rose" icon={<CheckCircle size={18}/>} />
            </div>

            {/* LIST CARD */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 font-semibold text-sm text-gray-700">
                  <LayoutGrid size={16} className="text-green-600" /> Filter & Pencarian
                </div>
                <div className="flex items-center gap-3 flex-1 max-w-xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input 
                      type="text" 
                      placeholder="Cari nama kegiatan..." 
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-500 shadow-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select 
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white shadow-sm cursor-pointer"
                    value={filterMetode}
                    onChange={(e) => setFilterMetode(e.target.value)}
                  >
                    <option value="semua">Semua Metode</option>
                    <option value="qr">QR Code</option>
                    <option value="maps">Lokasi</option>
                    <option value="keduanya">QR + Lokasi</option>
                  </select>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredKegiatan.map((k) => (
                    <KegiatanCard key={k.id} data={k} onOpenDetail={() => setSelectedKegiatan(k)} />
                  ))}
                </div>
                {filteredKegiatan.length === 0 && (
                  <div className="py-20 text-center text-gray-400">
                    <Search size={40} className="mx-auto mb-3 opacity-20" />
                    <p>Tidak ada kegiatan ditemukan</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* --- MODAL BUAT KEGIATAN --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-start sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-lg text-gray-800">Buat Kegiatan Baru</h3>
                <p className="text-xs text-gray-500">Lengkapi langkah-langkah untuk membuat absensi kegiatan</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded border border-gray-200">
                <X size={16} />
              </button>
            </div>

            {/* STEPPER */}
            <div className="flex px-6 py-4 bg-gray-50 border-b gap-4 items-center overflow-x-auto">
              <StepItem num={1} label="Info Dasar" active={currentStep === 1} done={currentStep > 1} />
              <div className="h-px bg-gray-200 flex-1 min-w-[20px]"></div>
              <StepItem num={2} label="Lokasi" active={currentStep === 2} done={currentStep > 2} />
              <div className="h-px bg-gray-200 flex-1 min-w-[20px]"></div>
              <StepItem num={3} label="Metode" active={currentStep === 3} done={currentStep > 3} />
              <div className="h-px bg-gray-200 flex-1 min-w-[20px]"></div>
              <StepItem num={4} label="Peserta" active={currentStep === 4} done={currentStep > 4} />
            </div>

            <div className="p-6 flex-1">
              {currentStep === 1 && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Kegiatan</label>
                    <input 
                      type="text" 
                      name="nama"
                      value={newKegiatan.nama}
                      onChange={handleInputChange}
                      className="w-full border p-2.5 rounded-lg mt-1 outline-none focus:border-green-500" 
                      placeholder="Contoh: Aksi ke DPR RI" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deskripsi</label>
                    <textarea 
                      name="desc"
                      value={newKegiatan.desc}
                      onChange={handleInputChange}
                      className="w-full border p-2.5 rounded-lg mt-1 h-24 outline-none focus:border-green-500 resize-none" 
                      placeholder="Detail kegiatan..."
                    ></textarea>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tgl Mulai</label>
                    <input 
                      type="date" 
                      name="tglMulai"
                      value={newKegiatan.tglMulai}
                      onChange={handleInputChange}
                      className="w-full border p-2.5 rounded-lg mt-1" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tgl Selesai</label>
                    <input 
                      type="date" 
                      name="tglSelesai"
                      value={newKegiatan.tglSelesai}
                      onChange={handleInputChange}
                      className="w-full border p-2.5 rounded-lg mt-1" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jam Mulai</label>
                    <input 
                      type="time" 
                      name="jamMulai"
                      value={newKegiatan.jamMulai}
                      onChange={handleInputChange}
                      className="w-full border p-2.5 rounded-lg mt-1" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jam Selesai</label>
                    <input 
                      type="time" 
                      name="jamSelesai"
                      value={newKegiatan.jamSelesai}
                      onChange={handleInputChange}
                      className="w-full border p-2.5 rounded-lg mt-1" 
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-gray-700">Nama Lokasi</label>
                    <div className="relative mt-1">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        name="lokasi"
                        value={newKegiatan.lokasi}
                        onChange={handleInputChange}
                        className="w-full border pl-10 pr-4 py-2.5 rounded-lg outline-none focus:border-green-500 shadow-sm" 
                        placeholder="Nama gedung / lokasi" 
                      />
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden h-[250px] relative z-0">
                    <MapContainer center={[newKegiatan.lat, newKegiatan.lng]} zoom={15} style={{ height: "100%", width: "100%" }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[newKegiatan.lat, newKegiatan.lng]} />
                      <Circle center={[newKegiatan.lat, newKegiatan.lng]} radius={newKegiatan.radius} pathOptions={{ color: 'green', fillColor: 'green' }} />
                      <MapClickHandler setCoords={(p) => setNewKegiatan({...newKegiatan, lat: p.lat, lng: p.lng})} />
                      <ChangeView center={[newKegiatan.lat, newKegiatan.lng]} />
                    </MapContainer>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-mono bg-gray-50 px-2 py-1 rounded">{newKegiatan.lat.toFixed(4)}, {newKegiatan.lng.toFixed(4)}</span>
                    <div className="flex items-center gap-2">
                      Radius Absen: 
                      <input 
                        type="number" 
                        name="radius"
                        value={newKegiatan.radius} 
                        onChange={handleInputChange}
                        className="border w-16 px-2 py-1 rounded font-mono focus:border-green-500 outline-none" 
                      /> meter
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Pilih Metode Absensi</p>
                  <div className="grid grid-cols-3 gap-3">
                    <MetodeCard 
                      id="qr" title="QR Code Saja" desc="Cukup scan QR" 
                      icon={<QrCode size={20} className="text-green-600"/>} 
                      selected={newKegiatan.metode === 'qr'} 
                      onClick={() => setNewKegiatan({...newKegiatan, metode: 'qr'})} 
                    />
                    <MetodeCard 
                      id="maps" title="Lokasi Saja" desc="Cek Geofencing" 
                      icon={<Globe size={20} className="text-blue-600"/>} 
                      selected={newKegiatan.metode === 'maps'} 
                      onClick={() => setNewKegiatan({...newKegiatan, metode: 'maps'})} 
                    />
                    <MetodeCard 
                      id="keduanya" title="Keduanya" desc="QR + Geofencing" 
                      icon={<LayoutGrid size={20} className="text-purple-600"/>} 
                      selected={newKegiatan.metode === 'keduanya'} 
                      onClick={() => setNewKegiatan({...newKegiatan, metode: 'keduanya'})} 
                    />
                  </div>
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex gap-3 shadow-sm">
                    <Info size={18} className="text-green-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-green-800 leading-relaxed italic">
                      {newKegiatan.metode === 'keduanya' ? "Anggota wajib menscan QR Code dan berada dalam radius lokasi kegiatan yang telah ditentukan." : "Metode ini memberikan kemudahan validasi kehadiran anggota."}
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                   <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Peserta</p>
                    <div className="flex gap-2">
                       <button onClick={() => setSelectedPeserta(new Set(INITIAL_MEMBERS.map(m=>m.id)))} className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-bold transition-all">Pilih Semua</button>
                       <button onClick={() => setSelectedPeserta(new Set())} className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-bold transition-all">Batal Semua</button>
                    </div>
                   </div>
                   <div className="border rounded-xl max-h-[250px] overflow-y-auto divide-y shadow-inner">
                      {INITIAL_MEMBERS.map((m) => (
                        <div key={m.id} className="p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={selectedPeserta.has(m.id)} 
                            onChange={(e) => {
                              const next = new Set(selectedPeserta);
                              if(e.target.checked) next.add(m.id); else next.delete(m.id);
                              setSelectedPeserta(next);
                            }}
                            className="w-4 h-4 accent-green-600 cursor-pointer" 
                          />
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {m.name.substring(0,2).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-gray-700">{m.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono italic">{m.nim} · {m.kem}</p>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-between sticky bottom-0 bg-white">
              <button 
                onClick={() => setCurrentStep(Math.max(1, currentStep-1))}
                className={`text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors ${currentStep === 1 ? 'invisible' : 'visible'}`}
              >
                Kembali
              </button>
              <div className="text-xs text-gray-400 font-medium font-mono">Langkah {currentStep} / 4</div>
              <button 
                onClick={handleNextStep}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-md shadow-green-100"
              >
                {currentStep === 4 ? "Buat Kegiatan" : "Lanjut"} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PANEL DETAIL KEGIATAN (SIDEBAR SLIDE) --- */}
      {selectedKegiatan && (
        <div className="fixed inset-0 z-[2000] flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={() => setSelectedKegiatan(null)}></div>
          <div className="relative bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-start">
               <div>
                  <h3 className="font-bold text-lg text-green-800 tracking-tight">{selectedKegiatan.nama}</h3>
                  <p className="text-xs text-gray-500 uppercase font-medium">{selectedKegiatan.tanggal} · {selectedKegiatan.jam}</p>
                  <div className="flex gap-2 mt-2">
                    <StatusBadge status={selectedKegiatan.status} />
                    <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200 uppercase tracking-widest">{selectedKegiatan.metode}</span>
                  </div>
               </div>
               <button onClick={() => setSelectedKegiatan(null)} className="p-1.5 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex px-6 border-b bg-gray-50/50">
               {['absensi', 'qr', 'lokasi'].map((t) => (
                 <button 
                    key={t} onClick={() => setDetailTab(t)}
                    className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      detailTab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                   {t}
                 </button>
               ))}
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-5">
               {detailTab === 'absensi' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-green-50/50 p-3 rounded-xl text-center border border-green-100 shadow-sm">
                        <p className="text-[10px] text-green-600 font-bold uppercase tracking-tighter">Hadir</p>
                        <p className="text-2xl font-bold text-green-800 font-mono tracking-tighter">{selectedKegiatan.hadir}</p>
                      </div>
                      <div className="bg-red-50/50 p-3 rounded-xl text-center border border-red-100 shadow-sm">
                        <p className="text-[10px] text-red-600 font-bold uppercase tracking-tighter">Alpa</p>
                        <p className="text-2xl font-bold text-red-800 font-mono tracking-tighter">{selectedKegiatan.peserta - selectedKegiatan.hadir}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl text-center border border-gray-100 shadow-sm">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Total</p>
                        <p className="text-2xl font-bold text-gray-700 font-mono tracking-tighter">{selectedKegiatan.peserta}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto border rounded-xl shadow-sm">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400">
                          <tr>
                            <th className="p-3">Nama Anggota</th>
                            <th className="p-3">Kem.</th>
                            <th className="p-3">Waktu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {INITIAL_MEMBERS.map((m, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                               <td className="p-3 font-semibold text-gray-700">{m.name}</td>
                               <td className="p-3 text-gray-400 font-medium uppercase tracking-tighter">{m.kem.substring(0,3)}</td>
                               <td className="p-3 font-mono text-gray-400 italic">09:{10 + idx}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                 </div>
               )}

               {detailTab === 'qr' && (
                 <div className="flex flex-col items-center gap-6 py-6 animate-in zoom-in-95">
                    <div className="p-5 border-2 border-gray-50 rounded-[2rem] bg-white shadow-xl shadow-green-900/5">
                      <QRCodeSVG value={`https://bem.unand.ac.id/absen/${selectedKegiatan.kode}`} size={200} />
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-2xl font-bold tracking-widest text-green-700">{selectedKegiatan.kode}</p>
                      <p className="text-xs text-gray-400 mt-1 italic">Scan QR untuk absen atau gunakan kode di atas</p>
                    </div>
                    <div className="flex gap-3 w-full">
                       <button className="flex-1 border p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors border-gray-200 text-gray-600">
                         <Printer size={16} /> Print QR
                       </button>
                       <button className="flex-1 bg-green-600 text-white p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-md shadow-green-100">
                         <Download size={16} /> Download
                       </button>
                    </div>
                 </div>
               )}

               {detailTab === 'lokasi' && (
                 <div className="space-y-4 animate-in fade-in">
                    <div className="h-[280px] border border-gray-100 rounded-2xl overflow-hidden relative z-0 shadow-inner">
                      <MapContainer center={[selectedKegiatan.lat, selectedKegiatan.lng]} zoom={16} style={{ height: "100%", width: "100%" }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[selectedKegiatan.lat, selectedKegiatan.lng]} />
                        <Circle center={[selectedKegiatan.lat, selectedKegiatan.lng]} radius={100} pathOptions={{ color: '#16a34a' }} />
                      </MapContainer>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                       <div className="flex items-center gap-3 text-xs">
                          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                            <MapPin size={14} />
                          </div>
                          <span className="text-gray-600 leading-tight"><b>Lokasi:</b> {selectedKegiatan.lokasi}</span>
                       </div>
                       <div className="flex items-center gap-3 text-xs">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <CheckCircle size={14} />
                          </div>
                          <span className="text-gray-600"><b>Radius Absen:</b> 100 Meter dari titik pusat</span>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---
function StatCard({ label, value, sub, color, icon }) {
  const colors = {
    green: "before:bg-green-500",
    blue: "before:bg-blue-500",
    amber: "before:bg-amber-500",
    rose: "before:bg-rose-500"
  };
  return (
    <div className={`bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] ${colors[color]}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-transform hover:scale-110 duration-300 ${color === 'green' ? 'bg-green-50 text-green-600' : color === 'blue' ? 'bg-blue-50 text-blue-600' : color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-bold font-mono text-gray-800 tracking-tighter leading-none">{value}</p>
      <p className="text-[10px] text-gray-400 mt-1 font-medium italic">{sub}</p>
    </div>
  );
}

function KegiatanCard({ data, onOpenDetail }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-green-900/5 transition-all group flex flex-col">
      <div className="p-4 border-b border-gray-50 flex-1">
        <div className="flex justify-between items-start mb-3 gap-2">
          <h4 className="text-sm font-bold text-gray-800 leading-tight line-clamp-2">{data.nama}</h4>
          <StatusBadge status={data.status} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium uppercase tracking-tight">
            <Calendar size={12} className="text-green-600" /> {data.tanggal} · {data.jam}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <MapPin size={12} className="text-green-600 shrink-0" /> <span className="line-clamp-1">{data.lokasi}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-500 italic">
            <Users size={12} className="text-green-600 shrink-0" /> {data.peserta} Peserta {data.hadir > 0 && `· ${data.hadir} Hadir`}
          </div>
        </div>
      </div>
      <div className="p-3 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
          <span className="text-[9px] font-black uppercase tracking-widest bg-white border border-gray-200 text-gray-400 px-2.5 py-1 rounded-full">
            {data.metode}
          </span>
          <button 
            onClick={onOpenDetail}
            className="bg-white hover:bg-green-600 text-green-600 hover:text-white border border-green-200 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm shadow-green-50 uppercase tracking-wider"
          >
            {data.status === 'selesai' ? 'Laporan' : 'Kelola'}
          </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    mendatang: "bg-blue-50 text-blue-700 border-blue-100",
    berlangsung: "bg-amber-50 text-amber-700 border-amber-100",
    selesai: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-full flex items-center gap-1.5 uppercase tracking-tighter shrink-0 ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'mendatang' ? 'bg-blue-600' : status === 'berlangsung' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`}></span>
      {status}
    </span>
  );
}

function StepItem({ num, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${active ? 'text-gray-900' : done ? 'text-green-600' : 'text-gray-400'}`}>
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
        active ? 'border-gray-900 bg-gray-900 text-white shadow-lg' : done ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white'
      }`}>
        {done ? '✓' : num}
      </div>
      <span className={`text-xs font-semibold ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    </div>
  );
}

function MetodeCard({ title, desc, icon, selected, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`p-3 border-2 rounded-xl text-center cursor-pointer transition-all ${
        selected ? 'border-green-600 bg-green-50 shadow-lg shadow-green-900/5 scale-[1.02]' : 'border-gray-100 hover:border-gray-200 bg-white'
      }`}
    >
      <div className="flex justify-center mb-2 transition-transform">{icon}</div>
      <h5 className="text-[11px] font-bold text-gray-700 uppercase tracking-tighter">{title}</h5>
      <p className="text-[9px] text-gray-400 mt-1 leading-tight font-medium uppercase tracking-widest">{desc}</p>
    </div>
  );
}
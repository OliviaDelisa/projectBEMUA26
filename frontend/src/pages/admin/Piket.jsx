import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

function Piket() {
  const UNAND_GREEN = "#00923D";
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // DATA MASTER UNTUK DROPDOWN
  const kementerianList = [
    "Kepresidenan", "Komunikasi dan Informasi", "Pengembangan Sumber Daya Manusia",
    "Kebijakan Daerah", "Kebijakan Nasional", "Kebijakan Kampus",
    "Riset dan Keilmuan", "Sekretaris Kabinet", "Lingkungan Hidup",
    "Sosial dan Masyarakat", "Dalam Negeri", "Luar Negeri",
    "Advokasi Kesejahteraan Mahasiswa", "Pergerakan Perempuan",
    "Media Event dan Bisnis", "Audit Internal", "Keuangan"
  ];

  const menkoList = [
    "Menteri Koordinator Pelayanan",
    "Menteri Koordinator Pengabdian",
    "Menteri Koordinator Pergerakan",
    "Menteri Koordinator Administrasi Pemerintahan"
  ];

  // --- STATE MANAGEMENT ---
  const [currentMonthIndex, setCurrentMonthIndex] = useState(3); // Default April
  const [currentYear, setCurrentYear] = useState(2026);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  // Database format: { "2026-April": { "1": { kementerian: "...", menko: "..." } } }
  const [dbPiket, setDbPiket] = useState({
    "2026-April": {
      "11": { kementerian: "Riset dan Keilmuan", menko: "Menteri Koordinator Pelayanan" }
    }
  });

  // --- LOGIKA NAVIGASI WAKTU ---
  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonthIndex(prev => prev + 1);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonthIndex(prev => prev - 1);
    }
  };

  const currentKey = `${currentYear}-${months[currentMonthIndex]}`;
  const currentMonthData = dbPiket[currentKey] || {};

  const handleInputChange = (date, field, value) => {
    setDbPiket(prev => ({
      ...prev,
      [currentKey]: {
        ...prev[currentKey],
        [date]: {
          ...(prev[currentKey]?.[date] || { kementerian: "-", menko: "-" }),
          [field]: value
        }
      }
    }));
  };

  const calendarCells = Array.from({ length: 35 }, (_, i) => i + 1);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Manajemen Piket" subtitle={`Data Piket BEM KM UNAND`} />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            
            {/* Header Identitas */}
            <div className="mb-10 text-center">
              <span className="px-5 py-2 rounded-full bg-green-50 text-[#00923D] text-[10px] font-black uppercase tracking-[0.3em] border border-green-100">
                Kabinet Rakit Makna
              </span>
              <h1 className="text-4xl font-black text-gray-900 mt-4 tracking-tight uppercase">BEM KM UNIVERSITAS ANDALAS</h1>
            </div>

            {/* Navigasi & Control */}
            <div className="flex justify-between items-center mb-6 bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-6">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-center min-w-[160px]">
                  <h2 className="text-2xl font-black text-gray-800 leading-none">{months[currentMonthIndex]}</h2>
                  <p className="text-sm font-bold text-[#00923D] mt-1">{currentYear}</p>
                </div>
                <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <button 
                onClick={() => setIsEditorOpen(true)}
                className="bg-[#00923D] hover:bg-[#007a33] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all shadow-lg shadow-green-900/20 flex items-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit Piket
              </button>
            </div>

            {/* Kalender Utama (DISPLAY ONLY) */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden pointer-events-none select-none">
              <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
                {days.map(day => (
                  <div key={day} className="py-5 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarCells.map((cell, index) => {
                  const dateStr = cell <= 31 ? cell.toString() : null;
                  const data = currentMonthData[dateStr];
                  return (
                    <div key={index} className="h-32 border-r border-b border-gray-50 p-3 bg-white">
                      <span className={`text-sm font-bold ${dateStr ? 'text-gray-300' : 'text-transparent'}`}>{cell <= 31 ? cell : ""}</span>
                      {data && data.kementerian !== "-" && (
                        <div className="mt-2 space-y-1">
                          <div className="px-2 py-1 rounded-lg bg-green-50 text-[9px] text-[#00923D] font-bold truncate border border-green-100">{data.kementerian}</div>
                          <div className="px-2 py-1 rounded-lg bg-orange-50 text-[9px] text-orange-700 font-bold truncate border border-orange-100">{data.menko}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* --- FRAME EDITOR (MODAL) --- */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
            {/* Header Editor */}
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">Editor Jadwal Piket</h2>
                <p className="text-[#00923D] font-bold uppercase text-xs tracking-widest mt-1">{months[currentMonthIndex]} {currentYear}</p>
              </div>
              <button 
                onClick={() => setIsEditorOpen(false)} 
                className="bg-[#00923D] px-8 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:bg-[#007a33] transition-all shadow-lg shadow-green-900/10"
              >
                Simpan & Tutup
              </button>
            </div>

            {/* Area Input List */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#fcfcfc]">
              <div className="max-w-5xl mx-auto space-y-3">
                <div className="grid grid-cols-12 gap-6 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">
                  <div className="col-span-1 text-center">Tgl</div>
                  <div className="col-span-6">Kementerian Terpilih</div>
                  <div className="col-span-5">Menteri Koordinator</div>
                </div>

                {Array.from({ length: 31 }, (_, i) => i + 1).map(date => {
                  const kementVal = currentMonthData[date]?.kementerian || "-";
                  const menkoVal = currentMonthData[date]?.menko || "-";

                  return (
                    <div key={date} className="grid grid-cols-12 gap-6 items-center bg-white p-3 rounded-2xl border border-gray-100 hover:border-green-300 hover:shadow-sm transition-all">
                      <div className="col-span-1 text-center font-black text-gray-300 text-lg">{date}</div>
                      
                      {/* Select Kementerian */}
                      <div className="col-span-6">
                        <select 
                          className={`w-full border-2 rounded-2xl px-5 py-3 text-sm outline-none transition-all cursor-pointer font-bold appearance-none
                            ${kementVal !== "-" 
                              ? "text-[#00923D] border-[#00923D]/20 bg-green-50/50" 
                              : "text-gray-400 border-gray-100 bg-gray-50"
                            }`}
                          value={kementVal}
                          onChange={(e) => handleInputChange(date, "kementerian", e.target.value)}
                        >
                          <option value="-">-- Pilih Kementerian --</option>
                          {kementerianList.map(item => <option key={item} value={item} className="text-gray-800">{item}</option>)}
                        </select>
                      </div>

                      {/* Select Menko */}
                      <div className="col-span-5">
                        <select 
                          className={`w-full border-2 rounded-2xl px-5 py-3 text-sm outline-none transition-all cursor-pointer font-bold appearance-none
                            ${menkoVal !== "-" 
                              ? "text-[#00923D] border-[#00923D]/20 bg-green-50/50" 
                              : "text-gray-400 border-gray-100 bg-gray-50"
                            }`}
                          value={menkoVal}
                          onChange={(e) => handleInputChange(date, "menko", e.target.value)}
                        >
                          <option value="-">-- Pilih Menteri Koordinator --</option>
                          {menkoList.map(item => <option key={item} value={item} className="text-gray-800">{item}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-gray-100 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] italic">Data akan diperbarui di kalender utama setelah modal ditutup</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Piket;
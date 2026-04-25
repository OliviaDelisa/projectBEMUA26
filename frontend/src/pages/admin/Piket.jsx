import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";

const KEMENTERIAN_LIST = [
  "Kepresidenan", "Komunikasi dan Informasi", "Pengembangan Sumber Daya Manusia",
  "Kebijakan Daerah", "Kebijakan Nasional", "Kebijakan Kampus",
  "Riset dan Keilmuan", "Sekretaris Kabinet", "Lingkungan Hidup",
  "Sosial dan Masyarakat", "Dalam Negeri", "Luar Negeri",
  "Advokasi Kesejahteraan Mahasiswa", "Pergerakan Perempuan",
  "Media Event dan Bisnis", "Audit Internal", "Keuangan",
];

const MENKO_LIST = [
  "Menteri Koordinator Pelayanan",
  "Menteri Koordinator Pengabdian",
  "Menteri Koordinator Pergerakan",
  "Menteri Koordinator Administrasi Pemerintahan",
];

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Fungsi bantuan untuk membuat string YYYY-MM-DD yang seragam
const toDateKey = (year, month, day) => {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

const isWeekday = (year, month, day) => {
  const d = new Date(year, month, day).getDay();
  return d >= 1 && d <= 5;
};

function Piket() {
  const today = new Date();

  const [currentMonthIndex, setCurrentMonthIndex] = useState(today.getMonth());
  const [currentYear, setCurrentYear]             = useState(today.getFullYear());
  const [piketData, setPiketData]                 = useState({});
  const [draftData, setDraftData]                 = useState({});
  const [isLoading, setIsLoading]                 = useState(false);
  const [isSaving, setIsSaving]                   = useState(false);
  const [errorMsg, setErrorMsg]                   = useState("");
  const [isEditorOpen, setIsEditorOpen]           = useState(false);

  // ─── FETCH ───────────────────────────────────────────────────────────────
  const fetchPiketData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      // Pastikan API ter-load. Jika undefined, pakai string kosong agar tidak undefined/piket
      const endpoint = `${API || ""}/piket?year=${currentYear}&month=${currentMonthIndex + 1}`;
      const res = await fetch(endpoint);

      if (!res.ok) {
        throw new Error(`Gagal menghubungi server (HTTP ${res.status})`);
      }

      const json = await res.json();
      
      // Amankan pembacaan data array
      const rawData = (json && Array.isArray(json.data)) ? json.data : [];

      const formatted = {};
      rawData.forEach((row) => {
        // STRATEGI DEFENSIVE: 
        // Controller kamu sudah mengirimkan tahun, bulan, tanggal. Pakai itu!
        // Ini menghindari error .substring() jika duty_date dari MySQL dibaca sebagai Object/Date
        if (row && row.tahun && row.bulan && row.tanggal) {
          const yyyy = String(row.tahun);
          const mm = String(row.bulan).padStart(2, "0");
          const dd = String(row.tanggal).padStart(2, "0");
          const key = `${yyyy}-${mm}-${dd}`;

          formatted[key] = {
            kementerian: row.kementerian || "-",
            menko: row.menko || "-",
          };
        } 
        // Fallback jika karena alasan tertentu kolom terpisah tidak ada
        else if (row && typeof row.duty_date === "string") {
          const key = row.duty_date.substring(0, 10);
          formatted[key] = {
            kementerian: row.kementerian || "-",
            menko: row.menko || "-",
          };
        }
      });

      setPiketData(formatted);
    } catch (err) {
      console.error("Gagal fetch piket:", err);
      setErrorMsg("Gagal memuat jadwal piket. Pastikan Backend menyala.");
      setPiketData({}); // Fallback agar tidak crash di render
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonthIndex]);

  useEffect(() => {
    fetchPiketData();
  }, [fetchPiketData]);

  // ─── NAVIGASI BULAN ──────────────────────────────────────────────────────
  const prevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  // ─── EDITOR ──────────────────────────────────────────────────────────────
  const openEditor = () => {
    // Deep clone agar state draftData sepenuhnya independen dan bebas reference object asli
    setDraftData(JSON.parse(JSON.stringify(piketData)));
    setIsEditorOpen(true);
  };

  const handleDraftChange = (dateKey, field, value) => {
    setDraftData((prev) => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || { kementerian: "-", menko: "-" }),
        [field]: value,
      },
    }));
  };

  // ─── SIMPAN ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg("");
    try {
      // Hanya simpan data yang lengkap (Kementerian & Menko diisi valid)
      const entries = Object.entries(draftData || {}).filter(
        ([, d]) => d && d.kementerian && d.kementerian !== "-" && d.menko && d.menko !== "-"
      );

      for (const [dateKey, d] of entries) {
        const res = await fetch(`${API || ""}/piket`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            duty_date: dateKey,
            kementerian: d.kementerian,
            menko: d.menko,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Gagal menyimpan jadwal untuk ${dateKey}`);
        }
      }

      await fetchPiketData();
      setIsEditorOpen(false);
    } catch (err) {
      console.error("Gagal simpan:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── KALENDER LOGIC ──────────────────────────────────────────────────────
  const firstDay = new Date(currentYear, currentMonthIndex, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();

  const cells = [];
  // Buat padding awal
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  // Buat tanggal isi
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  // Buat padding akhir agar pas kelipatan 7
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  // Dapatkan semua tanggal hari kerja dalam bulan aktif
  const weekdayDates = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (isWeekday(currentYear, currentMonthIndex, d)) {
      weekdayDates.push(d);
    }
  }

  // ─── RENDER UTAMA ────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Manajemen Piket" subtitle="Data Piket BEM KM UNAND" />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header Kabinet */}
            <div className="mb-10 text-center">
              <span className="px-5 py-2 rounded-full bg-green-50 text-[#00923D] text-[10px] font-black uppercase tracking-[0.3em] border border-green-100">
                Kabinet Rakit Makna
              </span>
              <h1 className="text-4xl font-black text-gray-900 mt-4 tracking-tight uppercase">
                BEM KM UNIVERSITAS ANDALAS
              </h1>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-4 px-5 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Navigasi & Tombol Edit */}
            <div className="flex justify-between items-center mb-6 bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-6">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-center min-w-[160px]">
                  <h2 className="text-2xl font-black text-gray-800 leading-none">
                    {MONTH_NAMES[currentMonthIndex]}
                  </h2>
                  <p className="text-sm font-bold text-[#00923D] mt-1">{currentYear}</p>
                </div>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <button
                onClick={openEditor}
                disabled={isLoading}
                className="bg-[#00923D] hover:bg-[#007a33] disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all shadow-lg shadow-green-900/20 flex items-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                {isLoading ? "Memuat..." : "Edit Piket"}
              </button>
            </div>

            {/* Grid Kalender */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="py-5 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  const dateKey = day ? toDateKey(currentYear, currentMonthIndex, day) : null;
                  const data = dateKey ? piketData[dateKey] : null;
                  const isToday =
                    day === today.getDate() &&
                    currentMonthIndex === today.getMonth() &&
                    currentYear === today.getFullYear();
                  const isWork = day ? isWeekday(currentYear, currentMonthIndex, day) : false;

                  return (
                    <div
                      key={i}
                      className={`min-h-[8rem] border-r border-b border-gray-50 p-3
                        ${!day ? "bg-gray-50/30" : "bg-white"}
                        ${isToday ? "ring-2 ring-inset ring-[#00923D]" : ""}
                      `}
                    >
                      {day && (
                        <span
                          className={`text-sm font-bold block mb-2
                            ${isToday ? "text-[#00923D]" : isWork ? "text-gray-400" : "text-red-300"}
                          `}
                        >
                          {day}
                        </span>
                      )}

                      {data && (
                        <div className="space-y-1">
                          <div className="px-2 py-1.5 rounded-lg bg-green-50 text-[10px] leading-tight text-[#00923D] font-bold border border-green-100 break-words line-clamp-2">
                            {data.kementerian}
                          </div>
                          <div className="px-2 py-1.5 rounded-lg bg-orange-50 text-[10px] leading-tight text-orange-700 font-bold border border-orange-100 break-words line-clamp-2">
                            {data.menko}
                          </div>
                        </div>
                      )}

                      {isLoading && day && isWork && !data && (
                        <div className="mt-2 space-y-2">
                          <div className="h-2.5 bg-gray-100 rounded animate-pulse" />
                          <div className="h-2.5 bg-gray-100 rounded animate-pulse w-3/4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legenda Bawah */}
            <div className="mt-4 flex gap-4 justify-end text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-200" />
                Kementerian
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-orange-100 border border-orange-200" />
                Menteri Koordinator
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL EDITOR PIKET */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                  Editor Jadwal Piket
                </h2>
                <p className="text-[#00923D] font-bold uppercase text-xs tracking-widest mt-1">
                  {MONTH_NAMES[currentMonthIndex]} {currentYear}
                  <span className="ml-2 text-gray-400">— Senin s/d Jumat</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditorOpen(false)}
                  disabled={isSaving}
                  className="px-6 py-3 rounded-2xl text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 border border-gray-200 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#00923D] px-8 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:bg-[#007a33] disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-green-900/10 transition-all"
                >
                  {isSaving ? "Menyimpan..." : "Simpan & Tutup"}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="px-8 pt-3 pb-1 text-red-600 text-sm font-semibold bg-white">
                ⚠️ {errorMsg}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-8 bg-[#fcfcfc]">
              <div className="max-w-5xl mx-auto space-y-3">
                <div className="grid grid-cols-12 gap-6 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">
                  <div className="col-span-2">Tanggal</div>
                  <div className="col-span-5">Kementerian Bertugas</div>
                  <div className="col-span-5">Menteri Koordinator</div>
                </div>

                {weekdayDates.map((day) => {
                  const dateKey = toDateKey(currentYear, currentMonthIndex, day);
                  const dayIndex = new Date(currentYear, currentMonthIndex, day).getDay();
                  const dayName = DAY_NAMES[dayIndex] || "-";

                  // Dihilangkan operator "?." untuk mencegah crash di bundler lama
                  const curKemen = (draftData[dateKey] && draftData[dateKey].kementerian) 
                    ? draftData[dateKey].kementerian 
                    : "-";
                  const curMenko = (draftData[dateKey] && draftData[dateKey].menko) 
                    ? draftData[dateKey].menko 
                    : "-";

                  return (
                    <div
                      key={dateKey}
                      className="grid grid-cols-12 gap-6 items-center bg-white p-3 rounded-2xl border border-gray-100 hover:border-green-300 hover:shadow-sm transition-all"
                    >
                      <div className="col-span-2">
                        <p className="font-black text-gray-700 text-sm">{day}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                          {dayName}
                        </p>
                      </div>

                      <div className="col-span-5">
                        <select
                          value={curKemen}
                          onChange={(e) => handleDraftChange(dateKey, "kementerian", e.target.value)}
                          className={`w-full border-2 rounded-2xl px-5 py-3 text-sm outline-none cursor-pointer font-bold appearance-none transition-all
                            ${
                              curKemen !== "-"
                                ? "text-[#00923D] border-[#00923D]/20 bg-green-50/50"
                                : "text-gray-400 border-gray-100 bg-gray-50"
                            }`}
                        >
                          <option value="-">-- Pilih Kementerian --</option>
                          {KEMENTERIAN_LIST.map((k) => (
                            <option key={k} value={k} className="text-gray-800">
                              {k}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-5">
                        <select
                          value={curMenko}
                          onChange={(e) => handleDraftChange(dateKey, "menko", e.target.value)}
                          className={`w-full border-2 rounded-2xl px-5 py-3 text-sm outline-none cursor-pointer font-bold appearance-none transition-all
                            ${
                              curMenko !== "-"
                                ? "text-[#00923D] border-[#00923D]/20 bg-green-50/50"
                                : "text-gray-400 border-gray-100 bg-gray-50"
                            }`}
                        >
                          <option value="-">-- Pilih Menteri Koordinator --</option>
                          {MENKO_LIST.map((m) => (
                            <option key={m} value={m} className="text-gray-800">
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100 text-center shrink-0">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] italic">
                Hanya hari Senin–Jumat · Tersimpan langsung ke database
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Piket;
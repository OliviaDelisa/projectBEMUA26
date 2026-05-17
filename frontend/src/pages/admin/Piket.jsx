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
  "Mitra Event dan Bisnis", "Audit Internal", "Keuangan",
];

const MENKO_LIST = [
  "Menteri Koordinator Pelayanan",
  "Menteri Koordinator Pengabdian",
  "Menteri Koordinator Pergerakan",
  "Menteri Koordinator Administrasi Pemerintahan",
  "Sekretaris Negara",
];

// ── Singkatan untuk export PNG ───────────────────────────────
const KEMEN_ABBR = {
  "Kepresidenan":                       "PRESIDEN",
  "Komunikasi dan Informasi":           "KOMINFO",
  "Pengembangan Sumber Daya Manusia":   "PSDM",
  "Kebijakan Daerah":                   "JAKDA",
  "Kebijakan Nasional":                 "JAKNAS",
  "Kebijakan Kampus":                   "JAKKAM",
  "Riset dan Keilmuan":                 "RISKEN",
  "Sekretaris Kabinet":                 "SESKAB",
  "Lingkungan Hidup":                   "LINGHUP",
  "Sosial dan Masyarakat":              "SOSMAS",
  "Dalam Negeri":                       "DAGRI",
  "Luar Negeri":                        "LUNEG",
  "Advokasi Kesejahteraan Mahasiswa":   "ADKESMA",
  "Pergerakan Perempuan":               "PP",
  "Mitra Event dan Bisnis":             "MEB",
  "Audit Internal":                     "AI",
  "Keuangan":                           "KEUANGAN",
};

const MENKO_ABBR = {
  "Menteri Koordinator Pelayanan":                  "Menko Pelayanan",
  "Menteri Koordinator Pengabdian":                 "Menko Pengabdian",
  "Menteri Koordinator Pergerakan":                 "Menko Pergerakan",
  "Menteri Koordinator Administrasi Pemerintahan":  "Menko AP",
  "Sekretaris Negara":                              "SESNEG",
};

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const toDateKey = (year, month, day) => {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

const isWeekday = (year, month, day) => {
  const d = new Date(year, month, day).getDay();
  return d >= 1 && d <= 5;
};

// ── Fungsi Export PNG via Canvas API ────────────────────────
const exportToPNG = (currentYear, currentMonthIndex, daysInMonth, piketData) => {
  // 1. Kelompokkan hari kerja per minggu
  const weeks = [];
  let currentWeek = [];

  for (let d = 1; d <= daysInMonth; d++) {
    if (!isWeekday(currentYear, currentMonthIndex, d)) continue;
    const dow = new Date(currentYear, currentMonthIndex, d).getDay(); // 1=Sen .. 5=Jum
    if (dow === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(d);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  // 2. Ukuran canvas
  const SCALE      = 2;       // retina / high-dpi
  const COL_W      = 190;
  const ROW_H      = 88;
  const HDR_H      = 30;      // tinggi header tanggal per sel
  const TITLE_H    = 56;      // area judul di atas
  const PAD        = 24;
  const COLS       = 5;
  const BORDER_R   = 4;       // radius border sel

  const cw = (COLS * COL_W + PAD * 2) * SCALE;
  const ch = (weeks.length * ROW_H + PAD * 2 + TITLE_H) * SCALE;

  const canvas = document.createElement("canvas");
  canvas.width  = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  const W = COLS * COL_W + PAD * 2;
  const H = weeks.length * ROW_H + PAD * 2 + TITLE_H;

  // 3. Background putih
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // 4. Judul
  ctx.fillStyle = "#1a3c2a";
  ctx.font      = "bold 15px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `JADWAL PIKET BEM KM UNAND`,
    W / 2,
    PAD + 18
  );
  ctx.fillStyle = "#00923D";
  ctx.font      = "bold 12px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(
    `${MONTH_NAMES[currentMonthIndex].toUpperCase()} ${currentYear}`,
    W / 2,
    PAD + 36
  );

  const startY = PAD + TITLE_H;

  // 5. Gambar tiap minggu
  weeks.forEach((week, wIdx) => {
    const rowY = startY + wIdx * ROW_H;

    for (let col = 0; col < COLS; col++) {
      const dowNeeded = col + 1; // Sen=1 … Jum=5
      const day       = week.find(
        (d) => new Date(currentYear, currentMonthIndex, d).getDay() === dowNeeded
      );
      const cellX = PAD + col * COL_W;

      // Luar sel (border tipis abu)
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.roundRect(cellX, rowY, COL_W, ROW_H, BORDER_R);
      ctx.stroke();

      if (!day) {
        // Sel kosong (weekend overflow / blank)
        ctx.fillStyle = "#f9fafb";
        ctx.beginPath();
        ctx.roundRect(cellX, rowY, COL_W, ROW_H, BORDER_R);
        ctx.fill();
        continue;
      }

      const dateKey = toDateKey(currentYear, currentMonthIndex, day);
      const data    = piketData[dateKey];

      // Header tanggal — salmon / pink
      ctx.fillStyle = "#f4b8b8";
      ctx.beginPath();
      ctx.roundRect(cellX, rowY, COL_W, HDR_H, [BORDER_R, BORDER_R, 0, 0]);
      ctx.fill();

      // Teks tanggal
      const dateStr = `${day} ${MONTH_SHORT[currentMonthIndex]} ${currentYear}`;
      ctx.fillStyle  = "#7b2222";
      ctx.font       = "bold 11px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign  = "center";
      ctx.fillText(dateStr, cellX + COL_W / 2, rowY + 19);

      // Body sel
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cellX, rowY + HDR_H, COL_W, ROW_H - HDR_H);

      if (data && data.kementerian && data.kementerian !== "-") {
        const kAbbr = KEMEN_ABBR[data.kementerian] || data.kementerian;
        const mAbbr = MENKO_ABBR[data.menko]       || data.menko || "-";

        // Kementerian
        ctx.fillStyle = "#111827";
        ctx.font      = "bold 13px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(kAbbr, cellX + COL_W / 2, rowY + HDR_H + 22);

        // Divider
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth   = 0.6;
        ctx.beginPath();
        ctx.moveTo(cellX + 12, rowY + HDR_H + 32);
        ctx.lineTo(cellX + COL_W - 12, rowY + HDR_H + 32);
        ctx.stroke();

        // Menko
        ctx.fillStyle = "#555555";
        ctx.font      = "12px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(mAbbr, cellX + COL_W / 2, rowY + HDR_H + 48);
      } else {
        ctx.fillStyle = "#d1d5db";
        ctx.font      = "11px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("—", cellX + COL_W / 2, rowY + HDR_H + 30);
      }
    }
  });

  // 6. Footer
  ctx.fillStyle = "#9ca3af";
  ctx.font      = "10px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `Jadwal Piket Senin–Jumat  •  BEM KM UNAND`,
    W / 2,
    H - 7
  );

  // 7. Download
  const link    = document.createElement("a");
  link.download = `jadwal-piket-${MONTH_NAMES[currentMonthIndex]}-${currentYear}.png`;
  link.href     = canvas.toDataURL("image/png");
  link.click();
};

// ── Komponen Utama ───────────────────────────────────────────
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

  const fetchPiketData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const endpoint = `${API || ""}/piket?year=${currentYear}&month=${currentMonthIndex + 1}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Gagal menghubungi server (HTTP ${res.status})`);
      const json = await res.json();
      const rawData = (json && Array.isArray(json.data)) ? json.data : [];
      const formatted = {};
      rawData.forEach((row) => {
        if (row && row.tahun && row.bulan && row.tanggal) {
          const yyyy = String(row.tahun);
          const mm   = String(row.bulan).padStart(2, "0");
          const dd   = String(row.tanggal).padStart(2, "0");
          const key  = `${yyyy}-${mm}-${dd}`;
          formatted[key] = { kementerian: row.kementerian || "-", menko: row.menko || "-" };
        } else if (row && typeof row.duty_date === "string") {
          const key = row.duty_date.substring(0, 10);
          formatted[key] = { kementerian: row.kementerian || "-", menko: row.menko || "-" };
        }
      });
      setPiketData(formatted);
    } catch (err) {
      console.error("Gagal fetch piket:", err);
      setErrorMsg("Gagal memuat jadwal piket. Pastikan Backend menyala.");
      setPiketData({});
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonthIndex]);

  useEffect(() => { fetchPiketData(); }, [fetchPiketData]);

  const prevMonth = () => {
    if (currentMonthIndex === 0) { setCurrentMonthIndex(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonthIndex((m) => m - 1);
  };

  const nextMonth = () => {
    if (currentMonthIndex === 11) { setCurrentMonthIndex(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonthIndex((m) => m + 1);
  };

  const openEditor = () => {
    setDraftData(JSON.parse(JSON.stringify(piketData)));
    setIsEditorOpen(true);
  };

  const handleDraftChange = (dateKey, field, value) => {
    setDraftData((prev) => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || { kementerian: "-", menko: "-" }), [field]: value },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg("");
    try {
      const entries = Object.entries(draftData || {}).filter(
        ([, d]) => d && d.kementerian && d.kementerian !== "-" && d.menko && d.menko !== "-"
      );
      for (const [dateKey, d] of entries) {
        const res = await fetch(`${API || ""}/piket`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duty_date: dateKey, kementerian: d.kementerian, menko: d.menko }),
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

  const firstDay    = new Date(currentYear, currentMonthIndex, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weekdayDates = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (isWeekday(currentYear, currentMonthIndex, d)) weekdayDates.push(d);
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Manajemen Piket" subtitle="Data Piket BEM KM UNAND" />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">

            {errorMsg && (
              <div className="mb-4 px-5 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Navigasi, Tombol Edit & Export */}
            <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-6">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-center min-w-[140px]">
                  <h2 className="text-xl font-black text-gray-800 leading-none">{MONTH_NAMES[currentMonthIndex]}</h2>
                  <p className="text-sm font-bold text-[#00923D] mt-0.5">{currentYear}</p>
                </div>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Tombol kanan: Export + Edit */}
              <div className="flex items-center gap-2">
                {/* Tombol Export PNG */}
                <button
                  onClick={() => exportToPNG(currentYear, currentMonthIndex, daysInMonth, piketData)}
                  disabled={isLoading || Object.keys(piketData).length === 0}
                  className="bg-white hover:bg-gray-50 disabled:opacity-40 text-gray-600 border border-gray-200 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all shadow-sm flex items-center gap-2"
                  title="Export jadwal ke gambar PNG"
                >
                  {/* Download icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                  Export PNG
                </button>

                {/* Tombol Edit */}
                <button
                  onClick={openEditor}
                  disabled={isLoading}
                  className="bg-[#00923D] hover:bg-[#007a33] disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all shadow-md flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  {isLoading ? "Memuat..." : "Edit Piket"}
                </button>
              </div>
            </div>

            {/* Grid Kalender */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              {/* Header hari */}
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {d}
                  </div>
                ))}
              </div>

              {/* Sel tanggal */}
              <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
                {cells.map((day, i) => {
                  const dateKey = day ? toDateKey(currentYear, currentMonthIndex, day) : null;
                  const data    = dateKey ? piketData[dateKey] : null;
                  const isToday =
                    day === today.getDate() &&
                    currentMonthIndex === today.getMonth() &&
                    currentYear === today.getFullYear();
                  const isWork = day ? isWeekday(currentYear, currentMonthIndex, day) : false;

                  return (
                    <div
                      key={i}
                      className={`p-2 ${!day ? "bg-gray-50/40" : "bg-white"} ${isToday ? "ring-2 ring-inset ring-[#00923D]" : ""}`}
                      style={{ minHeight: "7rem" }}
                    >
                      {day && (
                        <span className={`text-xs font-bold block mb-1.5 ${isToday ? "text-[#00923D]" : isWork ? "text-gray-500" : "text-red-300"}`}>
                          {day}
                        </span>
                      )}

                      {data && (
                        <div className="space-y-1">
                          <div className="px-1.5 py-1 rounded-md bg-green-50 text-[9px] leading-snug text-[#00923D] font-bold border border-green-100 break-words">
                            {data.kementerian}
                          </div>
                          <div className="px-1.5 py-1 rounded-md bg-orange-50 text-[9px] leading-snug text-orange-700 font-bold border border-orange-100 break-words">
                            {data.menko}
                          </div>
                        </div>
                      )}

                      {isLoading && day && isWork && !data && (
                        <div className="mt-1.5 space-y-1.5">
                          <div className="h-2 bg-gray-100 rounded animate-pulse" />
                          <div className="h-2 bg-gray-100 rounded animate-pulse w-3/4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legenda */}
            <div className="mt-3 flex gap-4 justify-end text-[10px] text-gray-400 font-bold uppercase tracking-wider">
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

      {/* MODAL EDITOR */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-black text-gray-800 tracking-tight">Editor Jadwal Piket</h2>
                <p className="text-[#00923D] font-bold uppercase text-xs tracking-widest mt-0.5">
                  {MONTH_NAMES[currentMonthIndex]} {currentYear}
                  <span className="ml-2 text-gray-400">— Senin s/d Jumat</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditorOpen(false)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-100 border border-gray-200 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#00923D] px-6 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-widest hover:bg-[#007a33] disabled:opacity-60 flex items-center gap-2 shadow-md transition-all"
                >
                  {isSaving ? "Menyimpan..." : "Simpan & Tutup"}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="px-6 pt-3 pb-1 text-red-600 text-sm font-semibold bg-white">⚠️ {errorMsg}</div>
            )}

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">
                  <div className="col-span-2">Tanggal</div>
                  <div className="col-span-5">Kementerian Bertugas</div>
                  <div className="col-span-5">Menteri Koordinator</div>
                </div>

                {weekdayDates.map((day) => {
                  const dateKey  = toDateKey(currentYear, currentMonthIndex, day);
                  const dayIndex = new Date(currentYear, currentMonthIndex, day).getDay();
                  const dayName  = DAY_NAMES[dayIndex] || "-";
                  const curKemen = (draftData[dateKey] && draftData[dateKey].kementerian) ? draftData[dateKey].kementerian : "-";
                  const curMenko = (draftData[dateKey] && draftData[dateKey].menko) ? draftData[dateKey].menko : "-";

                  return (
                    <div key={dateKey} className="grid grid-cols-12 gap-4 items-center bg-white p-3 rounded-xl border border-gray-100 hover:border-green-300 hover:shadow-sm transition-all">
                      <div className="col-span-2">
                        <p className="font-black text-gray-700 text-sm">{day}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{dayName}</p>
                      </div>

                      <div className="col-span-5">
                        <select
                          value={curKemen}
                          onChange={(e) => handleDraftChange(dateKey, "kementerian", e.target.value)}
                          className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer font-semibold appearance-none transition-all
                            ${curKemen !== "-" ? "text-[#00923D] border-green-200 bg-green-50" : "text-gray-400 border-gray-100 bg-gray-50"}`}
                        >
                          <option value="-">-- Pilih Kementerian --</option>
                          {KEMENTERIAN_LIST.map((k) => <option key={k} value={k} className="text-gray-800">{k}</option>)}
                        </select>
                      </div>

                      <div className="col-span-5">
                        <select
                          value={curMenko}
                          onChange={(e) => handleDraftChange(dateKey, "menko", e.target.value)}
                          className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer font-semibold appearance-none transition-all
                            ${curMenko !== "-" ? "text-[#00923D] border-green-200 bg-green-50" : "text-gray-400 border-gray-100 bg-gray-50"}`}
                        >
                          <option value="-">-- Pilih Menteri Koordinator --</option>
                          {MENKO_LIST.map((m) => <option key={m} value={m} className="text-gray-800">{m}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-white border-t border-gray-100 text-center shrink-0">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Jadwal Piket Senin-Jumat
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Piket;
// hooks/useExportAbsensi.js
import { useState } from "react";
import XLSX from "xlsx-js-style";

// ─── Konstanta urutan & hierarki ─────────────────────────────────────────────

const KELOMPOK_PRIORITAS = ["Kepresidenan", "Audit Internal"];

const HIERARKI_JABATAN = {
  Kepresidenan: [
    "Presiden", "Wakil Presiden", "Sekretaris Negara",
    "Menteri Koordinator", "Staf Kepresidenan",
  ],
  "Audit Internal": [
     "Inspektur", "Sekretaris Inspektur", "Staff Ahli",
  ],
  _kementerian: [
    "Menteri", "Sekretaris Menteri", "Staf Ahli Menteri",
    "Staff Ahli", "Staf Ahli", "Staf", "Staff",
  ],
};

function getJabatanOrder(kelompok, jabatan = "") {
  const key  = KELOMPOK_PRIORITAS.includes(kelompok) ? kelompok : "_kementerian";
  const list = HIERARKI_JABATAN[key] || [];
  const idx  = list.findIndex(j => jabatan.toLowerCase().trim().startsWith(j.toLowerCase()));
  return idx === -1 ? list.length : idx;
}

function getKelompokOrder(kelompok) {
  const idx = KELOMPOK_PRIORITAS.indexOf(kelompok);
  return idx === -1 ? KELOMPOK_PRIORITAS.length : idx;
}

function isHariKerja(date) {
  const day = new Date(date).getDay();
  return day >= 1 && day <= 5;
}

// ─── Format tanggal ───────────────────────────────────────────────────────────

const fmt = (date) => {
  const d = new Date(date);
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
};

const fmtLabel = (date) => {
  const d = new Date(date);
  return [String(d.getDate()).padStart(2,"0"), String(d.getMonth()+1).padStart(2,"0"), d.getFullYear()].join("/");
};

const fmtColHeader = (date) => {
  const d    = new Date(date);
  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"][d.getDay()];
  const dd   = String(d.getDate()).padStart(2,"0");
  const mm   = String(d.getMonth()+1).padStart(2,"0");
  const yy   = String(d.getFullYear()).slice(-2);
  return `${hari}\n${dd}/${mm}/${yy}`;
};

// ─── Style helper ─────────────────────────────────────────────────────────────

const S = ({
  bold    = false,
  italic  = false,
  color   = "FF374151",
  bgColor = null,
  align   = "left",
  wrap    = false,
  size    = 10,
  border  = false,
} = {}) => ({
  font: { name: "Calibri", sz: size, bold, italic, color: { rgb: color } },
  fill: bgColor
    ? { patternType: "solid", fgColor: { rgb: bgColor } }
    : { patternType: "none" },
  alignment: { horizontal: align, vertical: "center", wrapText: wrap },
  border: border
    ? {
        top:    { style: "thin", color: { rgb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { rgb: "FFD1D5DB" } },
        left:   { style: "thin", color: { rgb: "FFD1D5DB" } },
        right:  { style: "thin", color: { rgb: "FFD1D5DB" } },
      }
    : {},
});

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  hadir    : { bg: "FFD1FAE5", fg: "FF065F46", label: "Hadir"       },
  rejected : { bg: "FFFECDD3", fg: "FF9F1239", label: "Ditolak"     },
  alfa     : { bg: "FFF1F5F9", fg: "FF94A3B8", label: "Tidak Hadir" },
  pending  : { bg: "FFF1F5F9", fg: "FF94A3B8", label: "Tidak Hadir" },
};
const getStatus = (raw) => STATUS_CFG[raw] ?? STATUS_CFG.alfa;

// ─── Warna sub-header kelompok ────────────────────────────────────────────────

const KELOMPOK_COLOR = {
  Kepresidenan    : { bg: "FFD6E4F0", fg: "FF1E3A5F" },
  "Audit Internal": { bg: "FFE9D8F5", fg: "FF4A1942" },
  _default        : { bg: "FFD1E8D4", fg: "FF14532D" },
};
const getKColor = (kem) => KELOMPOK_COLOR[kem] ?? KELOMPOK_COLOR._default;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export default function useExportAbsensi() {
  const [exportMsg, setExportMsg] = useState("");

  const handleExport = ({ rekapData, rekapDates, rekapDateStart, rekapDateEnd, filterKem }) => {
    if (!rekapData || rekapData.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    if (rekapData[0]) {
      console.log("[Export] Field tersedia:", Object.keys(rekapData[0]));
      console.log("[Export] Nilai jabatan:", rekapData[0].jabatan);
    }

    const hariKerjaDates = rekapDates.filter(isHariKerja);
    if (hariKerjaDates.length === 0) {
      alert("Tidak ada hari kerja (Senin–Jumat) dalam rentang tanggal yang dipilih.");
      return;
    }

    const wb = XLSX.utils.book_new();
    buildSheetRekap(wb, rekapData, hariKerjaDates, rekapDateStart, rekapDateEnd);
    buildSheetRekapKementerian(wb, rekapData, hariKerjaDates, rekapDateStart, rekapDateEnd, filterKem); // ← SHEET BARU
    buildSheetLegenda(wb, rekapDateStart, rekapDateEnd, filterKem, hariKerjaDates.length);

    const kemLabel = filterKem === "all" ? "Semua" : filterKem.replace(/\s+/g, "_");
    const filename = `Rekap_Absen_${kemLabel}_${rekapDateStart}_sd_${rekapDateEnd}.xlsx`;

    XLSX.writeFile(wb, filename, { bookType: "xlsx", type: "binary", cellStyles: true });
    setExportMsg(`✓ File "${filename}" berhasil diekspor (${rekapData.length} anggota, ${hariKerjaDates.length} hari kerja).`);
    setTimeout(() => setExportMsg(""), 6000);
  };

  return { handleExport, exportMsg };
}

// ─── Sheet 1: Rekap Kehadiran ─────────────────────────────────────────────────

function buildSheetRekap(wb, rawData, rekapDates, startDate, endDate) {
  const ws     = {};
  const range  = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  const merges = [];
  const N      = rekapDates.length;

  const C_NO   = 0;
  const C_NAMA = 1;
  const C_NIM  = 2;
  const C_JAB  = 3;
  const C_KEM  = 4;
  const C_DATE = 5;
  const C_H    = C_DATE + N;
  const C_TH   = C_DATE + N + 1;
  const C_D    = C_DATE + N + 2;
  const C_PCT  = C_DATE + N + 3;
  const C_LAST = C_PCT;

  const set = (r, c, v, s) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    ws[addr]   = { v, t: typeof v === "number" ? "n" : "s", s };
    if (r > range.e.r) range.e.r = r;
    if (c > range.e.c) range.e.c = c;
  };

  // ── Judul ─────────────────────────────────────────────────────────────────
  set(0, 0, "REKAP ABSENSI SEKRETARIAT",
    S({ bold: true, size: 16, color: "FF1A3C29", align: "center" })
  );
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: C_LAST } });

  set(1, 0, `Periode: ${fmtLabel(startDate)}  —  ${fmtLabel(endDate)}`,
    S({ italic: true, size: 10, color: "FF6B7280", align: "center" })
  );
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: C_LAST } });

  // ── Header kolom ──────────────────────────────────────────────────────────
  const R_HEAD = 3;
  const hFix = (align = "center") =>
    S({ bold: true, bgColor: "FF2D5A3D", color: "FFFFFFFF", align, border: true, size: 10 });

  set(R_HEAD, C_NO,   "No.",                hFix("center"));
  set(R_HEAD, C_NAMA, "Nama Lengkap",       hFix("left"));
  set(R_HEAD, C_NIM,  "NIM",                hFix("center"));
  set(R_HEAD, C_JAB,  "Jabatan",            hFix("left"));
  set(R_HEAD, C_KEM,  "Kementerian/Divisi", hFix("left"));

  rekapDates.forEach((d, i) => {
    set(R_HEAD, C_DATE + i, fmtColHeader(d),
      S({ bold: true, bgColor: "FF3A6B4A", color: "FFFFFFFF",
          align: "center", wrap: true, border: true, size: 9 })
    );
  });

  set(R_HEAD, C_H,   "Total\nHadir",       S({ bold: true, bgColor: "FF4A7C59", color: "FFFFFFFF", align: "center", wrap: true, border: true, size: 9 }));
  set(R_HEAD, C_TH,  "Total\nTidak Hadir", S({ bold: true, bgColor: "FF8B95A1", color: "FFFFFFFF", align: "center", wrap: true, border: true, size: 9 }));
  set(R_HEAD, C_D,   "Total\nDitolak",     S({ bold: true, bgColor: "FFB05060", color: "FFFFFFFF", align: "center", wrap: true, border: true, size: 9 }));
  set(R_HEAD, C_PCT, "% Kehadiran",        S({ bold: true, bgColor: "FF4A6FA5", color: "FFFFFFFF", align: "center", wrap: true, border: true, size: 9 }));

  // ── Kelompokkan & urutkan ─────────────────────────────────────────────────
  const kelMap = {};
  rawData.forEach(user => {
    const k = (user.kementerian || "—").trim();
    if (!kelMap[k]) kelMap[k] = [];
    kelMap[k].push(user);
  });

  const sortedKel = Object.keys(kelMap).sort((a, b) => {
    const oa = getKelompokOrder(a), ob = getKelompokOrder(b);
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b, "id");
  });

  sortedKel.forEach(kem => {
    kelMap[kem].sort((a, b) => {
      const oa = getJabatanOrder(kem, a.jabatan);
      const ob = getJabatanOrder(kem, b.jabatan);
      if (oa !== ob) return oa - ob;
      return (a.name || "").localeCompare(b.name || "", "id");
    });
  });

  // ── Tulis baris data ──────────────────────────────────────────────────────
  let curRow = R_HEAD + 1;
  let noUrut = 1;

  sortedKel.forEach(kem => {
    const members = kelMap[kem];
    const kc      = getKColor(kem);

    for (let c = 0; c <= C_LAST; c++) {
      set(curRow, c,
        c === C_NAMA ? kem.toUpperCase() : "",
        S({ bold: true, size: 9, bgColor: kc.bg, color: kc.fg,
            align: c === C_NAMA ? "left" : "center", border: true })
      );
    }
    merges.push({ s: { r: curRow, c: C_NAMA }, e: { r: curRow, c: C_LAST } });
    curRow++;

    members.forEach((user, mi) => {
      const rowBg = mi % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";
      const td    = (align = "left") => S({ bgColor: rowBg, align, border: true, size: 10 });

      const jabatanValue =
        user.jabatan || user.position || user.role_label || user.jabatan_name || "—";

      set(curRow, C_NO,   noUrut,            S({ bgColor: rowBg, align: "center", border: true, size: 10 }));
      set(curRow, C_NAMA, user.name  || "—", td("left"));
      set(curRow, C_NIM,  user.nim   || "—", td("center"));
      set(curRow, C_JAB,  jabatanValue,       td("left"));
      set(curRow, C_KEM,  kem,               td("left"));

      let totH = 0, totTH = 0, totD = 0;

      rekapDates.forEach((dateObj, i) => {
        const key = fmt(dateObj);
        const raw = user.attendance?.[key] ?? "alfa";
        const cfg = getStatus(raw);

        if (raw === "hadir")         totH++;
        else if (raw === "rejected") totD++;
        else                         totTH++;

        set(curRow, C_DATE + i, cfg.label,
          S({ bgColor: cfg.bg, color: cfg.fg, align: "center", bold: false, border: true, size: 9 })
        );
      });

      const pct = N > 0 ? `${Math.round((totH / N) * 100)}%` : "—";

      set(curRow, C_H,   totH,  S({ bgColor: "FFD1FAE5", color: "FF065F46", align: "center", bold: true, border: true, size: 10 }));
      set(curRow, C_TH,  totTH, S({ bgColor: "FFF1F5F9", color: "FF6B7280", align: "center", bold: true, border: true, size: 10 }));
      set(curRow, C_D,   totD,  S({ bgColor: "FFFECDD3", color: "FF9F1239", align: "center", bold: true, border: true, size: 10 }));
      set(curRow, C_PCT, pct,   S({ bgColor: "FFE0EAFB", color: "FF1D4ED8", align: "center", bold: true, border: true, size: 10 }));

      noUrut++;
      curRow++;
    });
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  curRow++;
  for (let c = 0; c <= C_LAST; c++) {
    set(curRow, c,
      c === C_NAMA ? "TOTAL HADIR PER HARI" : "",
      S({ bold: true, bgColor: "FF2D5A3D", color: "FFFFFFFF",
          align: c === C_NAMA ? "left" : "center", border: true, size: 10 })
    );
  }
  rekapDates.forEach((dateObj, i) => {
    const key   = fmt(dateObj);
    const count = rawData.filter(u => u.attendance?.[key] === "hadir").length;
    set(curRow, C_DATE + i, count,
      S({ bold: true, bgColor: "FF3A6B4A", color: "FFFFFFFF", align: "center", border: true, size: 10 })
    );
  });
  merges.push({ s: { r: curRow, c: C_NAMA }, e: { r: curRow, c: C_DATE - 1 } });

  ws["!cols"] = [
    { wch: 5  },
    { wch: 26 },
    { wch: 15 },
    { wch: 22 },
    { wch: 26 },
    ...rekapDates.map(() => ({ wch: 13 })),
    { wch: 8  },
    { wch: 13 },
    { wch: 10 },
    { wch: 11 },
  ];
  ws["!rows"] = [
    { hpt: 32 },
    { hpt: 18 },
    { hpt: 6  },
    { hpt: 48 },
  ];
  ws["!merges"] = merges;
  ws["!ref"]    = XLSX.utils.encode_range(range);
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Kehadiran");
}

// ─── Sheet 2: Rekap per Kementerian ──────────────────────────────────────────

function buildSheetRekapKementerian(wb, rawData, rekapDates, startDate, endDate, filterKem) {
  const ws     = {};
  const range  = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  const merges = [];
  const N      = rekapDates.length; // total hari kerja

  const set = (r, c, v, s) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    ws[addr]   = { v, t: typeof v === "number" ? "n" : "s", s };
    if (r > range.e.r) range.e.r = r;
    if (c > range.e.c) range.e.c = c;
  };

  // ── Judul ─────────────────────────────────────────────────────────────────
  set(0, 0, "REKAP KEHADIRAN PER KEMENTERIAN / DIVISI",
    S({ bold: true, size: 14, color: "FF1A3C29", align: "center" })
  );
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

  set(1, 0, `Periode: ${fmtLabel(startDate)}  —  ${fmtLabel(endDate)}  ·  ${N} hari kerja`,
    S({ italic: true, size: 9, color: "FF6B7280", align: "center" })
  );
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });

  set(2, 0,
    filterKem === "all" ? "Filter: Semua Kementerian" : `Filter: ${filterKem}`,
    S({ italic: true, size: 9, color: "FF6B7280", align: "center" })
  );
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 5 } });

  // ── Header kolom ──────────────────────────────────────────────────────────
  const R_HEAD = 4;
  const cols      = ["Kementerian / Divisi", "Total Staf", "Total Hadir", "Total Tidak Hadir", "Total Ditolak", "% Kehadiran"];
  const colAligns = ["left", "center", "center", "center", "center", "center"];
  const colBgs    = ["FF2D5A3D", "FF2D5A3D", "FF4A7C59", "FF8B95A1", "FFB05060", "FF4A6FA5"];

  cols.forEach((h, c) => {
    set(R_HEAD, c, h,
      S({ bold: true, bgColor: colBgs[c], color: "FFFFFFFF", align: colAligns[c], border: true, size: 10, wrap: true })
    );
  });

  // ── Hitung rekap per kementerian ──────────────────────────────────────────
  // Kumpulkan semua user per kementerian
  const kelMap = {};
  rawData.forEach(user => {
    const k = (user.kementerian || "—").trim();
    if (!kelMap[k]) kelMap[k] = [];
    kelMap[k].push(user);
  });

  const sortedKel = Object.keys(kelMap).sort((a, b) => {
    const oa = getKelompokOrder(a), ob = getKelompokOrder(b);
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b, "id");
  });

  // Hitung total hadir/tidak hadir/ditolak per kementerian
  // (akumulasi dari semua hari kerja × semua anggota kementerian tersebut)
  const rekapKem = sortedKel.map(kem => {
    const members = kelMap[kem];
    let totH = 0, totTH = 0, totD = 0;

    members.forEach(user => {
      rekapDates.forEach(dateObj => {
        const key = fmt(dateObj);
        const raw = user.attendance?.[key] ?? "alfa";
        if (raw === "hadir")         totH++;
        else if (raw === "rejected") totD++;
        else                         totTH++;
      });
    });

    const totalSesi = members.length * N; // total sesi (orang × hari)
    const pct = totalSesi > 0 ? `${Math.round((totH / totalSesi) * 100)}%` : "0%";

    return { kem, staf: members.length, totH, totTH, totD, pct, totalSesi };
  });

  // ── Tulis baris data ──────────────────────────────────────────────────────
  rekapKem.forEach((r, i) => {
    const rowBg = i % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";
    const kc    = getKColor(r.kem);

    set(R_HEAD + 1 + i, 0, r.kem,   S({ bgColor: kc.bg, color: kc.fg, bold: true, border: true, size: 10 }));
    set(R_HEAD + 1 + i, 1, r.staf,  S({ bgColor: rowBg, align: "center", border: true, size: 10 }));
    set(R_HEAD + 1 + i, 2, r.totH,  S({ bgColor: "FFD1FAE5", color: "FF065F46", align: "center", bold: true, border: true, size: 10 }));
    set(R_HEAD + 1 + i, 3, r.totTH, S({ bgColor: "FFF1F5F9", color: "FF6B7280", align: "center", bold: true, border: true, size: 10 }));
    set(R_HEAD + 1 + i, 4, r.totD,  S({ bgColor: "FFFECDD3", color: "FF9F1239", align: "center", bold: true, border: true, size: 10 }));
    set(R_HEAD + 1 + i, 5, r.pct,   S({ bgColor: "FFE0EAFB", color: "FF1D4ED8", align: "center", bold: true, border: true, size: 10 }));
  });

  // ── Footer total keseluruhan ───────────────────────────────────────────────
  const footRow    = R_HEAD + 1 + rekapKem.length;
  const grandStaf  = rekapKem.reduce((s, r) => s + r.staf,  0);
  const grandH     = rekapKem.reduce((s, r) => s + r.totH,  0);
  const grandTH    = rekapKem.reduce((s, r) => s + r.totTH, 0);
  const grandD     = rekapKem.reduce((s, r) => s + r.totD,  0);
  const grandSesi  = rekapKem.reduce((s, r) => s + r.totalSesi, 0);
  const grandPct   = grandSesi > 0 ? `${Math.round((grandH / grandSesi) * 100)}%` : "0%";

  set(footRow, 0, "TOTAL KESELURUHAN", S({ bold: true, bgColor: "FF2D5A3D", color: "FFFFFFFF", border: true, size: 10 }));
  set(footRow, 1, grandStaf,           S({ bold: true, bgColor: "FF2D5A3D", color: "FFFFFFFF", align: "center", border: true, size: 10 }));
  set(footRow, 2, grandH,              S({ bold: true, bgColor: "FF3A6B4A", color: "FFFFFFFF", align: "center", border: true, size: 10 }));
  set(footRow, 3, grandTH,             S({ bold: true, bgColor: "FF8B95A1", color: "FFFFFFFF", align: "center", border: true, size: 10 }));
  set(footRow, 4, grandD,              S({ bold: true, bgColor: "FFB05060", color: "FFFFFFFF", align: "center", border: true, size: 10 }));
  set(footRow, 5, grandPct,            S({ bold: true, bgColor: "FF4A6FA5", color: "FFFFFFFF", align: "center", border: true, size: 10 }));

  // ── Catatan metodologi ────────────────────────────────────────────────────
  const noteRow = footRow + 2;
  set(noteRow, 0, "Catatan:",
    S({ bold: true, size: 9, color: "FF374151" })
  );
  set(noteRow + 1, 0,
    `% Kehadiran dihitung dari total sesi hadir ÷ (jumlah staf × ${N} hari kerja) × 100`,
    S({ italic: true, size: 9, color: "FF6B7280" })
  );
  merges.push({ s: { r: noteRow,     c: 0 }, e: { r: noteRow,     c: 5 } });
  merges.push({ s: { r: noteRow + 1, c: 0 }, e: { r: noteRow + 1, c: 5 } });

  ws["!cols"] = [
    { wch: 30 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 13 },
  ];
  ws["!rows"] = [
    { hpt: 24 },
    { hpt: 14 },
    { hpt: 14 },
    { hpt: 6  },
    { hpt: 36 },
  ];
  ws["!merges"] = merges;
  ws["!ref"]    = XLSX.utils.encode_range(range);
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Kementerian");
}

// ─── Sheet 3: Legenda ─────────────────────────────────────────────────────────

function buildSheetLegenda(wb, startDate, endDate, filterKem, totalHariKerja) {
  const ws    = {};
  const range = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };

  const set = (r, c, v, s) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    ws[addr]   = { v, t: "s", s };
    if (r > range.e.r) range.e.r = r;
    if (c > range.e.c) range.e.c = c;
  };

  set(0, 0, "KETERANGAN & LEGENDA",
    S({ bold: true, size: 13, color: "FF1A3C29" })
  );

  const infos = [
    ["Tanggal Generate",   new Date().toLocaleString("id-ID")],
    ["Periode",            `${fmtLabel(startDate)} — ${fmtLabel(endDate)}`],
    ["Filter Kementerian", filterKem === "all" ? "Semua Kementerian" : filterKem],
    ["Total Hari Kerja",   `${totalHariKerja} hari (Senin–Jumat)`],
  ];
  infos.forEach(([label, val], i) => {
    set(2 + i, 0, label, S({ bold: true, color: "FF374151", size: 10 }));
    set(2 + i, 1, val,   S({ color: "FF1F2937", size: 10 }));
  });

  set(8, 0, "Status Kehadiran", S({ bold: true, size: 11, color: "FF1A3C29" }));

  [
    { raw: "hadir",    desc: "Absensi disetujui admin" },
    { raw: "alfa",     desc: "Tidak melakukan absensi / belum divalidasi (Menunggu dianggap Tidak Hadir)" },
    { raw: "rejected", desc: "Absensi ditolak admin" },
  ].forEach(({ raw, desc }, i) => {
    const cfg = STATUS_CFG[raw];
    set(9 + i, 0, cfg.label,
      S({ bold: true, bgColor: cfg.bg, color: cfg.fg, align: "center", border: true, size: 10 })
    );
    set(9 + i, 1, desc, S({ border: true, size: 10 }));
  });

  set(13, 0, "Sheet dalam file ini:", S({ bold: true, size: 10, color: "FF374151" }));
  [
    ["Rekap Kehadiran",    "Daftar lengkap kehadiran per anggota per hari kerja"],
    ["Rekap Kementerian",  "Ringkasan total & % kehadiran per kementerian/divisi"],
    ["Legenda",            "Keterangan & panduan membaca file ini"],
  ].forEach(([sheet, desc], i) => {
    set(14 + i, 0, sheet, S({ bold: true, color: "FF2D5A3D", size: 10 }));
    set(14 + i, 1, desc,  S({ color: "FF1F2937", size: 10 }));
  });

  ws["!cols"] = [{ wch: 20 }, { wch: 85 }];
  ws["!ref"]  = XLSX.utils.encode_range(range);
  XLSX.utils.book_append_sheet(wb, ws, "Legenda");
}
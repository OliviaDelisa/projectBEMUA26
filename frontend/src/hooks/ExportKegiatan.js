import XLSXStyle from "xlsx-js-style";

// ─── Hierarki jabatan (sama persis dengan useExportAbsensi) ──────────────────

const KELOMPOK_PRIORITAS = ["Kepresidenan", "Audit Internal"];

const HIERARKI_JABATAN = {
  Kepresidenan: [
    "Presiden", "Wakil Presiden", "Sekretaris Negara",
    "Menteri Koordinator", "Staf Kepresidenan",
  ],
  "Audit Internal": [
    "Kepala Audit Internal", "Auditor", "Staf Audit Internal",
  ],
  _kementerian: [
    "Menteri", "Sekretaris Menteri", "Staf Ahli Menteri",
    "Staff Ahli", "Staf Ahli", "Staf", "Staff",
  ],
};

function getJabatanOrder(kelompok, jabatan = "") {
  const key  = KELOMPOK_PRIORITAS.includes(kelompok) ? kelompok : "_kementerian";
  const list = HIERARKI_JABATAN[key] || [];
  const idx  = list.findIndex(j =>
    jabatan.toLowerCase().trim().startsWith(j.toLowerCase())
  );
  return idx === -1 ? list.length : idx;
}

function getKelompokOrder(k) {
  const idx = KELOMPOK_PRIORITAS.indexOf(k);
  return idx === -1 ? KELOMPOK_PRIORITAS.length : idx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

// ─── Status ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  hadir : { bg: "FFD1FAE5", fg: "FF065F46", label: "Hadir"       },
  alfa  : { bg: "FFFEF9C3", fg: "FF92400E", label: "Tidak Hadir" },
};
const getStatus = (raw) => (raw === "hadir" ? STATUS_CFG.hadir : STATUS_CFG.alfa);

// ─── Warna kelompok ───────────────────────────────────────────────────────────

const KELOMPOK_COLOR = {
  Kepresidenan    : { bg: "FFD6E4F0", fg: "FF1E3A5F" },
  "Audit Internal": { bg: "FFE9D8F5", fg: "FF4A1942" },
  _default        : { bg: "FFD1E8D4", fg: "FF14532D" },
};
const getKColor = (kem) => KELOMPOK_COLOR[kem] ?? KELOMPOK_COLOR._default;

// ─── buildRekapKementerian ────────────────────────────────────────────────────

export const buildRekapKementerian = (absensiDetail) => {
  const map = {};
  absensiDetail.forEach((a) => {
    const kem = (a.kementerian || "Tidak Diketahui").trim();
    if (!map[kem]) map[kem] = { hadir: 0, alfa: 0, total: 0 };
    map[kem].total += 1;
    if (a.status === "hadir") map[kem].hadir += 1;
    else map[kem].alfa += 1;
  });
  return Object.entries(map)
    .map(([nama, val]) => ({ nama, ...val }))
    .sort((a, b) => {
      const oa = getKelompokOrder(a.nama), ob = getKelompokOrder(b.nama);
      if (oa !== ob) return oa - ob;
      return a.nama.localeCompare(b.nama, "id");
    });
};

// ═════════════════════════════════════════════════════════════════════════════
//  exportAbsensiExcel
// ═════════════════════════════════════════════════════════════════════════════

export const exportAbsensiExcel = (kegiatan, absensi) => {
  if (!kegiatan || absensi.length === 0) {
    alert("Belum ada data absensi untuk diekspor.");
    return;
  }

  const wb = XLSXStyle.utils.book_new();
  buildSheetDaftar(wb, kegiatan, absensi);
  buildSheetRekap(wb, kegiatan, absensi);
  buildSheetLegenda(wb, kegiatan, absensi.length);

  const judul    = kegiatan.title.replace(/\s+/g, "_").replace(/[/\\?%*:|"<>]/g, "-");
  const filename = `Absensi_${judul}_${toLocalDateString(new Date())}.xlsx`;
  XLSXStyle.writeFile(wb, filename, { bookType: "xlsx", type: "binary", cellStyles: true });
};

// ─── Sheet 1: Daftar Absensi ──────────────────────────────────────────────────

function buildSheetDaftar(wb, kegiatan, absensi) {
  const ws     = {};
  const range  = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  const merges = [];

  const C_NO    = 0;
  const C_NAMA  = 1;
  const C_NIM   = 2;
  const C_KEM   = 3;
  const C_JAB   = 4;
  const C_STAT  = 5;
  const C_WAKTU = 6;
  const C_LAST  = C_WAKTU;

  const set = (r, c, v, s) => {
    const addr = XLSXStyle.utils.encode_cell({ r, c });
    ws[addr]   = { v, t: typeof v === "number" ? "n" : "s", s };
    if (r > range.e.r) range.e.r = r;
    if (c > range.e.c) range.e.c = c;
  };

  // ── Judul ─────────────────────────────────────────────────────────────────
  set(0, 0, "DAFTAR ABSENSI KEGIATAN",
    S({ bold: true, size: 16, color: "FF1A3C29", align: "center" })
  );
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: C_LAST } });

  set(1, 0, kegiatan.title,
    S({ bold: true, size: 12, color: "FF1F2937", align: "center" })
  );
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: C_LAST } });

  const startStr = kegiatan.start_datetime
    ? new Date(kegiatan.start_datetime).toLocaleString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
      })
    : "—";
  const endStr = kegiatan.end_datetime
    ? new Date(kegiatan.end_datetime).toLocaleString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
      })
    : "—";

  set(2, 0, `${startStr}  —  ${endStr}`,
    S({ italic: true, size: 9, color: "FF6B7280", align: "center" })
  );
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: C_LAST } });

  set(3, 0, `Lokasi: ${kegiatan.location_name || "—"}`,
    S({ italic: true, size: 9, color: "FF6B7280", align: "center" })
  );
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: C_LAST } });

  // ── Header kolom ──────────────────────────────────────────────────────────
  const R_HEAD = 5;
  const hFix = (align = "center") =>
    S({ bold: true, bgColor: "FF2D5A3D", color: "FFFFFFFF", align, border: true, size: 10 });

  set(R_HEAD, C_NO,    "No.",                hFix("center"));
  set(R_HEAD, C_NAMA,  "Nama Lengkap",       hFix("left"));
  set(R_HEAD, C_NIM,   "NIM",                hFix("center"));
  set(R_HEAD, C_KEM,   "Kementerian/Divisi", hFix("left"));
  set(R_HEAD, C_JAB,   "Jabatan",            hFix("left"));
  set(R_HEAD, C_STAT,  "Status",             hFix("center"));
  set(R_HEAD, C_WAKTU, "Waktu Absen",        hFix("center"));

  // ── Kelompokkan & urutkan: kelompok → jabatan → nama ─────────────────────
  const kelMap = {};
  absensi.forEach((a) => {
    const k = (a.kementerian || "—").trim();
    if (!kelMap[k]) kelMap[k] = [];
    kelMap[k].push(a);
  });

  const sortedKel = Object.keys(kelMap).sort((a, b) => {
    const oa = getKelompokOrder(a), ob = getKelompokOrder(b);
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b, "id");
  });

  sortedKel.forEach((kem) => {
    kelMap[kem].sort((a, b) => {
      const jabA = a.jabatan || a.position || a.role_label || "";
      const jabB = b.jabatan || b.position || b.role_label || "";
      const oa   = getJabatanOrder(kem, jabA);
      const ob   = getJabatanOrder(kem, jabB);
      if (oa !== ob) return oa - ob;
      return (a.name || "").localeCompare(b.name || "", "id");
    });
  });

  // ── Tulis baris data ──────────────────────────────────────────────────────
  let curRow = R_HEAD + 1;
  let noUrut = 1;

  sortedKel.forEach((kem) => {
    const members = kelMap[kem];
    const kc      = getKColor(kem);

    // Sub-header kementerian
    for (let c = 0; c <= C_LAST; c++) {
      set(curRow, c, c === C_NO ? kem.toUpperCase() : "",
        S({ bold: true, size: 9, bgColor: kc.bg, color: kc.fg,
            align: "left", border: true })
      );
    }
    merges.push({ s: { r: curRow, c: C_NO }, e: { r: curRow, c: C_LAST } });
    curRow++;

    members.forEach((a, mi) => {
      const rowBg   = mi % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";
      const td      = (align = "left") => S({ bgColor: rowBg, align, border: true, size: 10 });
      const cfg     = getStatus(a.status);
      const jabatan = a.jabatan || a.position || a.role_label || a.jabatan_name || "—";
      const waktuStr = a.check_in_time
        ? new Date(a.check_in_time).toLocaleTimeString("id-ID", {
            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
          })
        : "—";

      set(curRow, C_NO,    noUrut,        S({ bgColor: rowBg, align: "center", border: true, size: 10 }));
      set(curRow, C_NAMA,  a.name || "—", td("left"));
      set(curRow, C_NIM,   a.nim  || "—", td("center"));
      set(curRow, C_KEM,   kem,            td("left"));
      set(curRow, C_JAB,   jabatan,        td("left"));
      set(curRow, C_STAT,  cfg.label,
        S({ bgColor: cfg.bg, color: cfg.fg, align: "center", bold: true, border: true, size: 9 })
      );
      set(curRow, C_WAKTU,
        a.status === "hadir" ? waktuStr : "—",
        S({ bgColor: rowBg, align: "center", border: true, size: 10,
            color: a.status === "hadir" ? "FF1F2937" : "FF9CA3AF" })
      );

      noUrut++;
      curRow++;
    });
  });

  // ── Footer: label row + value row, 4 blok rapi ───────────────────────────
  // Blok 1: col 0-1 | Blok 2: col 2-3 | Blok 3: col 4-5 | Blok 4: col 6
  curRow++;
  const totHadir = absensi.filter((a) => a.status === "hadir").length;
  const totAlfa  = absensi.length - totHadir;
  const pct      = absensi.length > 0
    ? `${Math.round((totHadir / absensi.length) * 100)}%`
    : "—";

  const blok = [
    { cs: 0, ce: 1, label: "Total Peserta", val: absensi.length, labelBg: "FF2D5A3D", valBg: "FF2D5A3D" },
    { cs: 2, ce: 3, label: "Hadir",          val: totHadir,       labelBg: "FF4A7C59", valBg: "FF4A7C59" },
    { cs: 4, ce: 5, label: "Tidak Hadir",    val: totAlfa,        labelBg: "FF8B95A1", valBg: "FF8B95A1" },
    { cs: 6, ce: 6, label: "% Kehadiran",    val: pct,            labelBg: "FF4A6FA5", valBg: "FF4A6FA5" },
  ];

  blok.forEach(({ cs, ce, label, val, labelBg, valBg }) => {
    for (let c = cs; c <= ce; c++) {
      set(curRow,     c, c === cs ? label : "",
        S({ bold: true, bgColor: labelBg, color: "FFFFFFFF", align: "center", border: true, size: 10 })
      );
      set(curRow + 1, c, c === cs ? val   : "",
        S({ bold: true, bgColor: valBg,   color: "FFFFFFFF", align: "center", border: true, size: 14 })
      );
    }
    if (cs < ce) {
      merges.push({ s: { r: curRow,     c: cs }, e: { r: curRow,     c: ce } });
      merges.push({ s: { r: curRow + 1, c: cs }, e: { r: curRow + 1, c: ce } });
    }
  });

  ws["!cols"] = [
    { wch: 5  },
    { wch: 26 },
    { wch: 15 },
    { wch: 26 },
    { wch: 22 },
    { wch: 13 },
    { wch: 16 },
  ];
  ws["!rows"] = [
    { hpt: 30 },
    { hpt: 20 },
    { hpt: 16 },
    { hpt: 16 },
    { hpt: 6  },
    { hpt: 36 },
  ];
  ws["!merges"] = merges;
  ws["!ref"]    = XLSXStyle.utils.encode_range(range);
  XLSXStyle.utils.book_append_sheet(wb, ws, "Daftar Absensi");
}

// ─── Sheet 2: Rekap per Kementerian ──────────────────────────────────────────

function buildSheetRekap(wb, kegiatan, absensi) {
  const ws     = {};
  const range  = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  const merges = [];

  const set = (r, c, v, s) => {
    const addr = XLSXStyle.utils.encode_cell({ r, c });
    ws[addr]   = { v, t: typeof v === "number" ? "n" : "s", s };
    if (r > range.e.r) range.e.r = r;
    if (c > range.e.c) range.e.c = c;
  };

  set(0, 0, "REKAP PER KEMENTERIAN / DIVISI",
    S({ bold: true, size: 14, color: "FF1A3C29", align: "center" })
  );
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });

  set(1, 0, kegiatan.title,
    S({ italic: true, size: 10, color: "FF6B7280", align: "center" })
  );
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 4 } });

  const R_HEAD    = 3;
  const cols      = ["Kementerian / Divisi", "Total Staf", "Hadir", "Tidak Hadir", "% Kehadiran"];
  const colAligns = ["left", "center", "center", "center", "center"];
  cols.forEach((h, c) => {
    set(R_HEAD, c, h,
      S({ bold: true, bgColor: "FF2D5A3D", color: "FFFFFFFF", align: colAligns[c], border: true, size: 10 })
    );
  });

  const rekap = buildRekapKementerian(absensi);
  rekap.forEach((r, i) => {
    const rowBg = i % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";
    const pct   = r.total > 0 ? `${Math.round((r.hadir / r.total) * 100)}%` : "0%";
    set(R_HEAD + 1 + i, 0, r.nama,  S({ bgColor: rowBg, border: true, size: 10 }));
    set(R_HEAD + 1 + i, 1, r.total, S({ bgColor: rowBg, align: "center", border: true, size: 10 }));
    set(R_HEAD + 1 + i, 2, r.hadir, S({ bgColor: "FFD1FAE5", color: "FF065F46", align: "center", bold: true, border: true, size: 10 }));
    set(R_HEAD + 1 + i, 3, r.alfa,  S({ bgColor: "FFFEF9C3", color: "FF92400E", align: "center", bold: true, border: true, size: 10 }));
    set(R_HEAD + 1 + i, 4, pct,     S({ bgColor: "FFE0EAFB", color: "FF1D4ED8", align: "center", bold: true, border: true, size: 10 }));
  });

  const footRow = R_HEAD + 1 + rekap.length;
  const totH    = absensi.filter((a) => a.status === "hadir").length;
  const totA    = absensi.length - totH;
  const pctTot  = absensi.length > 0 ? `${Math.round((totH / absensi.length) * 100)}%` : "0%";

  set(footRow, 0, "TOTAL",        S({ bold: true, bgColor: "FF2D5A3D", color: "FFFFFFFF", border: true, size: 10 }));
  set(footRow, 1, absensi.length, S({ bold: true, bgColor: "FF2D5A3D", color: "FFFFFFFF", align: "center", border: true, size: 10 }));
  set(footRow, 2, totH,           S({ bold: true, bgColor: "FF3A6B4A", color: "FFFFFFFF", align: "center", border: true, size: 10 }));
  set(footRow, 3, totA,           S({ bold: true, bgColor: "FF8B95A1", color: "FFFFFFFF", align: "center", border: true, size: 10 }));
  set(footRow, 4, pctTot,         S({ bold: true, bgColor: "FF4A6FA5", color: "FFFFFFFF", align: "center", border: true, size: 10 }));

  ws["!cols"]   = [{ wch: 32 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 13 }];
  ws["!rows"]   = [{ hpt: 26 }, { hpt: 16 }, { hpt: 6 }, { hpt: 36 }];
  ws["!merges"] = merges;
  ws["!ref"]    = XLSXStyle.utils.encode_range(range);
  XLSXStyle.utils.book_append_sheet(wb, ws, "Rekap Kementerian");
}

// ─── Sheet 3: Legenda ─────────────────────────────────────────────────────────

function buildSheetLegenda(wb, kegiatan, totalPeserta) {
  const ws    = {};
  const range = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };

  const set = (r, c, v, s) => {
    const addr = XLSXStyle.utils.encode_cell({ r, c });
    ws[addr]   = { v, t: "s", s };
    if (r > range.e.r) range.e.r = r;
    if (c > range.e.c) range.e.c = c;
  };

  set(0, 0, "KETERANGAN & LEGENDA",
    S({ bold: true, size: 13, color: "FF1A3C29" })
  );

  const infos = [
    ["Nama Kegiatan",    kegiatan.title],
    ["Lokasi",           kegiatan.location_name || "—"],
    ["Waktu Mulai",      kegiatan.start_datetime
      ? new Date(kegiatan.start_datetime).toLocaleString("id-ID") : "—"],
    ["Waktu Selesai",    kegiatan.end_datetime
      ? new Date(kegiatan.end_datetime).toLocaleString("id-ID") : "—"],
    ["Total Peserta",    `${totalPeserta} orang`],
    ["Tanggal Generate", new Date().toLocaleString("id-ID")],
  ];
  infos.forEach(([label, val], i) => {
    set(2 + i, 0, label, S({ bold: true, color: "FF374151", size: 10 }));
    set(2 + i, 1, val,   S({ color: "FF1F2937", size: 10 }));
  });

  set(10, 0, "Status Kehadiran", S({ bold: true, size: 11, color: "FF1A3C29" }));

  [
    { raw: "hadir", desc: "Absensi tercatat" },
    { raw: "alfa",  desc: "Tidak hadir / belum melakukan absensi" },
  ].forEach(({ raw, desc }, i) => {
    const cfg = STATUS_CFG[raw];
    set(11 + i, 0, cfg.label,
      S({ bold: true, bgColor: cfg.bg, color: cfg.fg, align: "center", border: true, size: 10 })
    );
    set(11 + i, 1, desc, S({ border: true, size: 10 }));
  });

  ws["!cols"] = [{ wch: 20 }, { wch: 60 }];
  ws["!ref"]  = XLSXStyle.utils.encode_range(range);
  XLSXStyle.utils.book_append_sheet(wb, ws, "Legenda");
}
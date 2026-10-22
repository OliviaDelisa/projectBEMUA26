// Pakai mysql2/promise langsung agar bisa async/await
// tanpa mengubah db.js yang dipakai controller lain
const mysql  = require("mysql2/promise");
const crypto = require("crypto");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

function nowJakartaSql() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

// Tanpa I, O, 0, 1 supaya tidak membingungkan saat ditulis/difoto
const KODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate kode laporan: ASP-YYYYMMDD-XXXXXX (19 karakter, muat di VARCHAR(20))
 * Contoh: ASP-20261022-K7M3QX
 * Bagian acak memakai crypto.randomInt agar sulit ditebak.
 */
function generateKodeLaporan() {
  const dateStr = nowJakartaSql().slice(0, 10).replace(/-/g, ""); // tanggal WIB
  let rand = "";
  for (let i = 0; i < 6; i++) rand += KODE_CHARS[crypto.randomInt(KODE_CHARS.length)];
  return `ASP-${dateStr}-${rand}`;
}

/**
 * Generate kode laporan dan pastikan unik di database
 */
async function generateUniqueKode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const kode = generateKodeLaporan();
    const [[existing]] = await db.query(
      `SELECT id FROM aspirasi WHERE kode_laporan = ?`,
      [kode]
    );
    if (!existing) return kode;
  }
  // Fallback: tambahkan waktu dalam base36 untuk keunikan
  const dateStr = nowJakartaSql().slice(0, 10).replace(/-/g, "");
  return `ASP-${dateStr}-${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

/**
 * Normalisasi nomor HP ke format 62xxxxxxxxxx (siap dipakai wa.me)
 */
function normalizeHp(raw) {
  if (!raw) return null;
  let n = String(raw).replace(/[^\d+]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return n || null;
}

/**
 * foto di DB bisa berupa JSON array (data baru), string tunggal (data lama), atau null
 */
const parseFotos = (foto) => {
  if (!foto) return [];
  try {
    const p = JSON.parse(foto);
    return Array.isArray(p) ? p : [foto];
  } catch {
    return [foto];
  }
};

exports.getAllAspirasi = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        a.*,
        k.nama_kategori
      FROM aspirasi a
      JOIN kategori_aspirasi k
        ON a.kategori_id = k.id
      ORDER BY a.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data aspirasi" });
  }
};

exports.createAspirasi = async (req, res) => {
  try {
    const { nama, no_hp, fakultas, nama_kategori, isi } = req.body;

    if (!fakultas || !nama_kategori || !isi || isi.trim().length < 10) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    // Validasi no_hp jika diisi (opsional)
    if (no_hp && no_hp.trim().length > 0) {
      const cleanHp = no_hp.replace(/[\s\-()]/g, "");
      if (!/^(\+?62|0)[0-9]{8,13}$/.test(cleanHp)) {
        return res.status(400).json({ message: "Format nomor HP tidak valid" });
      }
    }

    const [[kategori]] = await db.query(
      `SELECT id FROM kategori_aspirasi WHERE nama_kategori = ?`,
      [nama_kategori]
    );
    if (!kategori) {
      return res.status(400).json({ message: "Kategori tidak dikenali" });
    }

    // req.files adalah array (karena upload.array)
    const fotoFilenames = req.files ? req.files.map((f) => f.filename) : [];
    const foto = fotoFilenames.length > 0 ? JSON.stringify(fotoFilenames) : null;

    const now = nowJakartaSql();
    const kode_laporan = await generateUniqueKode();

    const [result] = await db.query(
      `INSERT INTO aspirasi (kode_laporan, nama, no_hp, fakultas, kategori_id, isi, foto, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [kode_laporan, nama || null, normalizeHp(no_hp), fakultas, kategori.id, isi, foto, now, now]
    );

    res.status(201).json({
      message: "Aspirasi berhasil dikirim",
      id: result.insertId,
      kode_laporan,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengirim aspirasi" });
  }
};


exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["baru", "dibaca", "diproses", "selesai"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Status tidak valid" });
    }

    await db.query(
      `UPDATE aspirasi SET status = ?, updated_at = ? WHERE id = ?`,
      [status, nowJakartaSql(), id]
    );

    res.json({ message: "Status berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal update status" });
  }
};

exports.updatePrioritas = async (req, res) => {
  try {
    const { id } = req.params;
    const { prioritas } = req.body;

    const allowed = ["normal", "urgent"];
    if (!allowed.includes(prioritas)) {
      return res.status(400).json({ message: "Prioritas tidak valid" });
    }

    await db.query(
      `UPDATE aspirasi SET prioritas = ?, updated_at = ? WHERE id = ?`,
      [prioritas, nowJakartaSql(), id]
    );

    res.json({ message: "Prioritas berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal update prioritas" });
  }
};

exports.updateCatatan = async (req, res) => {
  try {
    const { id } = req.params;
    const { catatan_internal } = req.body;

    await db.query(
      `UPDATE aspirasi SET catatan_internal = ?, updated_at = ? WHERE id = ?`,
      [catatan_internal ?? null, nowJakartaSql(), id]
    );

    res.json({ message: "Catatan berhasil disimpan" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menyimpan catatan" });
  }
};

exports.updateKeterangan = async (req, res) => {
  try {
    const { id } = req.params;
    const { keterangan_tindak_lanjut } = req.body;

    await db.query(
      `UPDATE aspirasi SET keterangan_tindak_lanjut = ?, updated_at = ? WHERE id = ?`,
      [keterangan_tindak_lanjut ?? null, nowJakartaSql(), id]
    );

    res.json({ message: "Keterangan tindak lanjut berhasil disimpan" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menyimpan keterangan" });
  }
};

/**
 * Cek status aspirasi berdasarkan kode laporan
 * Endpoint ini bersifat PUBLIC (tanpa auth) agar user dari web profile bisa cek status
 */
exports.cekStatusByKode = async (req, res) => {
  try {
    const { kode } = req.params;

    if (!kode || kode.trim().length === 0) {
      return res.status(400).json({ message: "Kode laporan wajib diisi" });
    }

    const [[aspirasi]] = await db.query(`
      SELECT
        a.kode_laporan,
        a.nama,
        a.fakultas,
        a.isi,
        a.foto,
        a.status,
        a.prioritas,
        a.keterangan_tindak_lanjut,
        a.created_at,
        a.updated_at,
        k.nama_kategori
      FROM aspirasi a
      JOIN kategori_aspirasi k ON a.kategori_id = k.id
      WHERE a.kode_laporan = ?
    `, [kode.trim().toUpperCase()]);

    if (!aspirasi) {
      return res.status(404).json({ message: "Kode laporan tidak ditemukan" });
    }

    // Jangan tampilkan catatan_internal & no_hp ke publik
    res.json({
      kode_laporan: aspirasi.kode_laporan,
      nama: aspirasi.nama || "Anonim",
      fakultas: aspirasi.fakultas,
      kategori: aspirasi.nama_kategori,
      isi: aspirasi.isi,
      foto: parseFotos(aspirasi.foto),
      status: aspirasi.status,
      prioritas: aspirasi.prioritas,
      keterangan_tindak_lanjut: aspirasi.keterangan_tindak_lanjut || null,
      created_at: aspirasi.created_at,
      updated_at: aspirasi.updated_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data laporan" });
  }
};

exports.getAllKategori = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT MIN(id) AS id, nama_kategori 
       FROM kategori_aspirasi 
       GROUP BY nama_kategori 
       ORDER BY MIN(id) ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data kategori" });
  }
};
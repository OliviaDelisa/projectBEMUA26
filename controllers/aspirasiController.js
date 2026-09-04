// Pakai mysql2/promise langsung agar bisa async/await
// tanpa mengubah db.js yang dipakai controller lain
const mysql = require("mysql2/promise");

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
    const { nama, fakultas, nama_kategori, isi } = req.body;

    if (!fakultas || !nama_kategori || !isi || isi.trim().length < 10) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const [[kategori]] = await db.query(
      `SELECT id FROM kategori_aspirasi WHERE nama_kategori = ?`,
      [nama_kategori]
    );
    if (!kategori) {
      return res.status(400).json({ message: "Kategori tidak dikenali" });
    }

    // req.files sekarang array (karena upload.array), bukan req.file lagi
    const fotoFilenames = req.files ? req.files.map((f) => f.filename) : [];
    const foto = fotoFilenames.length > 0 ? JSON.stringify(fotoFilenames) : null;

    const created_at = nowJakartaSql();
    console.log("=== DEBUG ASPIRASI ===", { serverTimeUTC: new Date().toISOString(), computedJakarta: created_at });

    const [result] = await db.query(
      `INSERT INTO aspirasi (nama, fakultas, kategori_id, isi, foto, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nama || null, fakultas, kategori.id, isi, foto, created_at]
    );

    res.status(201).json({ message: "Aspirasi berhasil dikirim", id: result.insertId });
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
      `UPDATE aspirasi SET status = ? WHERE id = ?`,
      [status, id]
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
      `UPDATE aspirasi SET prioritas = ? WHERE id = ?`,
      [prioritas, id]
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
      `UPDATE aspirasi SET catatan_internal = ? WHERE id = ?`,
      [catatan_internal ?? null, id]
    );

    res.json({ message: "Catatan berhasil disimpan" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menyimpan catatan" });
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
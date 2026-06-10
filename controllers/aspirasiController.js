// Pakai mysql2/promise langsung agar bisa async/await
// tanpa mengubah db.js yang dipakai controller lain
const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

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
    const { nama, fakultas, kategori_id, isi } = req.body;

    let foto = null;
    if (req.file) {
      foto = req.file.filename;
    }

    const [result] = await db.query(
      `INSERT INTO aspirasi (nama, fakultas, kategori_id, isi, foto)
       VALUES (?, ?, ?, ?, ?)`,
      [nama || null, fakultas, kategori_id, isi, foto]
    );

    res.status(201).json({
      message: "Aspirasi berhasil dikirim",
      id: result.insertId,
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
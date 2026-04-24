const db = require("../db/db");

// ─── GET All Periods ──────────────────────────────────────────────────────────
exports.getPeriods = (req, res) => {
  db.query(
    `SELECT id, name, start_date, end_date, is_active, created_at
     FROM periods
     ORDER BY start_date DESC`,
    (err, result) => {
      if (err) return res.status(500).json({ message: "Gagal mengambil data periode", error: err });
      res.json(result);
    }
  );
};

// ─── GET Period by ID ─────────────────────────────────────────────────────────
exports.getPeriodById = (req, res) => {
  const { id } = req.params;
  db.query(
    `SELECT id, name, start_date, end_date, is_active, created_at FROM periods WHERE id = ?`,
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Gagal mengambil data", error: err });
      if (result.length === 0) return res.status(404).json({ message: "Periode tidak ditemukan" });
      res.json(result[0]);
    }
  );
};

// ─── CREATE Period ────────────────────────────────────────────────────────────
exports.createPeriod = (req, res) => {
  const { name, start_date, end_date, is_active } = req.body;

  if (!name || !start_date || !end_date) {
    return res.status(400).json({ message: "Field name, start_date, dan end_date wajib diisi" });
  }

  if (end_date < start_date) {
    return res.status(400).json({ message: "Tanggal selesai tidak boleh sebelum tanggal mulai" });
  }

  const active = typeof is_active !== "undefined" ? is_active : 0;

  db.query(
    `INSERT INTO periods (name, start_date, end_date, is_active) VALUES (?, ?, ?, ?)`,
    [name, start_date, end_date, active],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "Nama periode sudah ada" });
        }
        return res.status(500).json({ message: "Gagal menambah periode", error: err });
      }
      res.status(201).json({ message: "Periode berhasil ditambahkan", id: result.insertId });
    }
  );
};

// ─── UPDATE Period ────────────────────────────────────────────────────────────
exports.updatePeriod = (req, res) => {
  const { id } = req.params;
  const { name, start_date, end_date, is_active } = req.body;

  if (!name || !start_date || !end_date) {
    return res.status(400).json({ message: "Field name, start_date, dan end_date wajib diisi" });
  }

  if (end_date < start_date) {
    return res.status(400).json({ message: "Tanggal selesai tidak boleh sebelum tanggal mulai" });
  }

  const active = typeof is_active !== "undefined" ? is_active : 0;

  db.query(
    `UPDATE periods SET name=?, start_date=?, end_date=?, is_active=? WHERE id=?`,
    [name, start_date, end_date, active, id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Gagal update periode", error: err });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Periode tidak ditemukan" });
      res.json({ message: "Periode berhasil diperbarui" });
    }
  );
};

// ─── ACTIVATE Period (jadikan satu-satunya aktif) ─────────────────────────────
// Nonaktifkan semua, lalu aktifkan yang dipilih
exports.activatePeriod = (req, res) => {
  const { id } = req.params;

  db.query(`UPDATE periods SET is_active = 0`, (err) => {
    if (err) return res.status(500).json({ message: "Gagal menonaktifkan periode lain", error: err });

    db.query(
      `UPDATE periods SET is_active = 1 WHERE id = ?`,
      [id],
      (err2, result) => {
        if (err2) return res.status(500).json({ message: "Gagal mengaktifkan periode", error: err2 });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Periode tidak ditemukan" });
        res.json({ message: "Periode berhasil diaktifkan" });
      }
    );
  });
};

// ─── DELETE Period ────────────────────────────────────────────────────────────
exports.deletePeriod = (req, res) => {
  const { id } = req.params;

  // Cek apakah periode sedang aktif — jangan hapus periode aktif
  db.query(`SELECT is_active FROM periods WHERE id = ?`, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal memeriksa periode", error: err });
    if (result.length === 0) return res.status(404).json({ message: "Periode tidak ditemukan" });
    if (result[0].is_active) {
      return res.status(400).json({ message: "Tidak bisa menghapus periode yang sedang aktif" });
    }

    db.query(`DELETE FROM periods WHERE id = ?`, [id], (err2, result2) => {
      if (err2) return res.status(500).json({ message: "Gagal menghapus periode", error: err2 });
      res.json({ message: "Periode berhasil dihapus" });
    });
  });
};
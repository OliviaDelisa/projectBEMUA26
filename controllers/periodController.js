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
  const { name, start_date, end_date } = req.body;

  if (!name || !start_date || !end_date)
    return res.status(400).json({ message: "Field name, start_date, dan end_date wajib diisi" });

  if (end_date < start_date)
    return res.status(400).json({ message: "Tanggal selesai tidak boleh sebelum tanggal mulai" });

  db.query(
    `INSERT INTO periods (name, start_date, end_date, is_active) VALUES (?, ?, ?, 0)`,
    [name, start_date, end_date],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(409).json({ message: "Nama periode sudah ada" });
        return res.status(500).json({ message: "Gagal menambah periode", error: err });
      }
      res.status(201).json({ message: "Periode berhasil ditambahkan", id: result.insertId });
    }
  );
};

// ─── UPDATE Period ────────────────────────────────────────────────────────────
exports.updatePeriod = (req, res) => {
  const { id } = req.params;
  const { name, start_date, end_date } = req.body;

  if (!name || !start_date || !end_date)
    return res.status(400).json({ message: "Field name, start_date, dan end_date wajib diisi" });

  if (end_date < start_date)
    return res.status(400).json({ message: "Tanggal selesai tidak boleh sebelum tanggal mulai" });

  db.query(
    `UPDATE periods SET name=?, start_date=?, end_date=? WHERE id=?`,
    [name, start_date, end_date, id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Gagal update periode", error: err });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Periode tidak ditemukan" });
      res.json({ message: "Periode berhasil diperbarui" });
    }
  );
};

// ─── ACTIVATE Period ──────────────────────────────────────────────────────────
// Alur:
//   1. Ambil periode yang saat ini aktif (jika ada)
//   2. Nonaktifkan semua user_periods pada periode aktif lama (kecuali superadmin)
//   3. Set semua periods → is_active = 0
//   4. Aktifkan periode target → is_active = 1
//   5. Aktifkan semua user_periods pada periode target (kecuali superadmin)
exports.activatePeriod = async (req, res) => {
  const { id } = req.params;
  const conn = db.promise();

  try {
    // 1. Cari periode yang saat ini aktif
    const [currentActive] = await conn.query(
      `SELECT id FROM periods WHERE is_active = 1 LIMIT 1`
    );

    // 2. Nonaktifkan user_periods pada periode aktif lama (kecuali superadmin)
    if (currentActive.length > 0) {
      const oldPeriodId = currentActive[0].id;
      if (String(oldPeriodId) !== String(id)) {
        await conn.query(
          `UPDATE user_periods up
           INNER JOIN roles r ON r.id = up.role_id
           SET up.is_active = 0, up.updated_at = NOW()
           WHERE up.period_id = ? AND r.name != 'superadmin'`,
          [oldPeriodId]
        );
      }
    }

    // 3. Nonaktifkan semua periode
    await conn.query(`UPDATE periods SET is_active = 0`);

    // 4. Aktifkan periode target
    const [result] = await conn.query(
      `UPDATE periods SET is_active = 1 WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Periode tidak ditemukan" });

    // 5. Aktifkan semua user_periods pada periode target (kecuali superadmin,
    //    mereka biarkan statusnya tetap seperti semula karena superadmin
    //    selalu bisa login terlepas dari periode)
    await conn.query(
      `UPDATE user_periods up
       INNER JOIN roles r ON r.id = up.role_id
       SET up.is_active = 1, up.updated_at = NOW()
       WHERE up.period_id = ? AND r.name != 'superadmin'`,
      [id]
    );

    res.json({ message: "Periode berhasil diaktifkan dan status anggota diperbarui" });
  } catch (err) {
    res.status(500).json({ message: "Terjadi kesalahan server", error: err.message });
  }
};

// ─── DELETE Period ────────────────────────────────────────────────────────────
exports.deletePeriod = (req, res) => {
  const { id } = req.params;

  db.query(`SELECT is_active FROM periods WHERE id = ?`, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal memeriksa periode", error: err });
    if (result.length === 0) return res.status(404).json({ message: "Periode tidak ditemukan" });
    if (result[0].is_active)
      return res.status(400).json({ message: "Tidak bisa menghapus periode yang sedang aktif" });

    db.query(`DELETE FROM periods WHERE id = ?`, [id], (err2) => {
      if (err2) return res.status(500).json({ message: "Gagal menghapus periode", error: err2 });
      res.json({ message: "Periode berhasil dihapus" });
    });
  });
};
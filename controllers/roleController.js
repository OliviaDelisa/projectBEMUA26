const db = require("../db/db");

// GET /roles — semua role + jumlah permission masing-masing
exports.getRoles = (req, res) => {
  const sql = `
    SELECT r.*, COUNT(rp.permission_id) AS permission_count
    FROM roles r
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    GROUP BY r.id
    ORDER BY r.id
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal ambil roles", error: err });
    res.json(result);
  });
};

// POST /roles — tambah role baru (non-system)
exports.createRole = (req, res) => {
  const { name, label, description } = req.body;
  if (!name || !label)
    return res.status(400).json({ message: "name dan label wajib diisi" });

  const safeName = name.trim().toLowerCase().replace(/\s+/g, "_");

  db.query(
    `INSERT INTO roles (name, label, description, is_system) VALUES (?, ?, ?, FALSE)`,
    [safeName, label.trim(), description || null],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(409).json({ message: "Nama role sudah digunakan" });
        return res.status(500).json({ message: "Gagal membuat role", error: err });
      }
      res.status(201).json({ message: "Role berhasil dibuat", id: result.insertId });
    }
  );
};

// DELETE /roles/:id — hapus role non-system
exports.deleteRole = (req, res) => {
  const { id } = req.params;

  db.query(`SELECT is_system FROM roles WHERE id = ?`, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal cek role", error: err });
    if (result.length === 0)
      return res.status(404).json({ message: "Role tidak ditemukan" });
    if (result[0].is_system)
      return res.status(403).json({ message: "Role bawaan sistem tidak dapat dihapus" });

    // Cek apakah role masih dipakai di user_periods
    db.query(
      `SELECT COUNT(*) AS total FROM user_periods WHERE role_id = ?`, [id],
      (err2, count) => {
        if (err2) return res.status(500).json({ message: "Gagal cek penggunaan role", error: err2 });
        if (count[0].total > 0)
          return res.status(409).json({
            message: `Role masih digunakan oleh ${count[0].total} anggota, tidak dapat dihapus`,
          });

        db.query(`DELETE FROM roles WHERE id = ?`, [id], (err3) => {
          if (err3) return res.status(500).json({ message: "Gagal hapus role", error: err3 });
          res.json({ message: "Role berhasil dihapus" });
        });
      }
    );
  });
};
const db = require("../db/db");
const bcrypt = require("bcrypt");

// ─── Helper: resolve role name → role_id ─────────────────────────────────────
const getRoleId = async (roleName) => {
  const [rows] = await db.promise().query(
    `SELECT id FROM roles WHERE name = ?`,
    [roleName || "user"]
  );
  if (rows.length === 0) throw new Error(`Role "${roleName}" tidak ditemukan`);
  return rows[0].id;
};

// ─── GET All Members (filter by period_id) ───────────────────────────────────
exports.getMembers = (req, res) => {
  const { period_id } = req.query;

  const baseSelect = `
    SELECT
      u.id, u.name, u.nim, u.username,
      u.photo, u.must_change_password, u.created_at,
      up.jabatan, up.kementerian, up.is_active,
      up.id        AS user_period_id,
      r.id         AS role_id,
      r.name       AS role,
      r.label      AS role_label,
      p.id         AS period_id,
      p.name       AS period_name
    FROM users u
    INNER JOIN user_periods up ON up.user_id  = u.id
    INNER JOIN roles r         ON r.id        = up.role_id
    INNER JOIN periods p       ON p.id        = up.period_id
  `;

  if (period_id) {
    db.query(
      `${baseSelect} WHERE up.period_id = ? ORDER BY u.name ASC`,
      [period_id],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil data anggota", error: err });
        res.json(result);
      }
    );
  } else {
    db.query(
      `${baseSelect} ORDER BY p.start_date DESC, u.name ASC`,
      (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil data anggota", error: err });
        res.json(result);
      }
    );
  }
};

// ─── GET Member by ID ────────────────────────────────────────────────────────
exports.getMemberById = (req, res) => {
  const { id } = req.params;
  db.query(
    `SELECT
       u.id, u.name, u.nim, u.username,
       u.photo, u.must_change_password, u.created_at,
       up.jabatan, up.kementerian, up.is_active,
       up.id        AS user_period_id,
       r.id         AS role_id,
       r.name       AS role,
       r.label      AS role_label,
       p.id         AS period_id,
       p.name       AS period_name
     FROM users u
     LEFT JOIN user_periods up ON up.user_id = u.id
     LEFT JOIN roles r         ON r.id       = up.role_id
     LEFT JOIN periods p       ON p.id       = up.period_id
     WHERE u.id = ?`,
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Gagal mengambil data", error: err });
      if (result.length === 0) return res.status(404).json({ message: "Anggota tidak ditemukan" });
      res.json(result[0]);
    }
  );
};

// ─── CREATE Member ───────────────────────────────────────────────────────────
exports.createMember = async (req, res) => {
  const {
    name, nim, username, password,
    jabatan, kementerian,
    role,       // nama role: "user" | "admin" | "superadmin" | nama role custom
    period_id,
  } = req.body;

  // Validasi field wajib
  if (!name || !nim || !username || !password || !jabatan) {
    return res.status(400).json({
      message: "Field name, nim, username, password, dan jabatan wajib diisi",
    });
  }
  if (!period_id) {
    return res.status(400).json({ message: "period_id wajib diisi" });
  }

  try {
    // 1. Resolve role name → role_id
    const roleId = await getRoleId(role || "user");

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insert ke tabel users
    db.query(
      `INSERT INTO users (name, nim, username, password, must_change_password)
       VALUES (?, ?, ?, ?, FALSE)`,
      [name, nim, username, hashedPassword],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res.status(409).json({ message: "Username atau NIM sudah terdaftar" });
          return res.status(500).json({ message: "Gagal menambah anggota", error: err });
        }

        const newUserId = result.insertId;

        // 4. Insert ke tabel user_periods (pakai role_id)
        db.query(
          `INSERT INTO user_periods (user_id, period_id, role_id, jabatan, kementerian, is_active)
           VALUES (?, ?, ?, ?, ?, TRUE)`,
          [newUserId, period_id, roleId, jabatan, kementerian || null],
          (err2) => {
            if (err2) {
              // Rollback: hapus user yang baru dibuat
              db.query(`DELETE FROM users WHERE id = ?`, [newUserId]);
              return res.status(500).json({ message: "Gagal menyimpan data periode anggota", error: err2 });
            }
            res.status(201).json({
              message: "Anggota berhasil ditambahkan",
              id:      newUserId,
            });
          }
        );
      }
    );
  } catch (err) {
    // Error dari getRoleId atau bcrypt
    if (err.message.startsWith("Role")) return res.status(400).json({ message: err.message });
    res.status(500).json({ message: "Terjadi kesalahan server", error: err.message });
  }
};

// ─── UPDATE Member ───────────────────────────────────────────────────────────
exports.updateMember = async (req, res) => {
  const { id } = req.params;
  const {
    name, nim, username, password,
    jabatan, kementerian,
    role,
    is_active,
    period_id,
  } = req.body;

  const activeValue = typeof is_active !== "undefined" ? (is_active ? 1 : 0) : 1;

  try {
    // 1. Resolve role name → role_id
    const roleId = await getRoleId(role || "user");

    // 2. Update tabel users
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await db.promise().query(
        `UPDATE users
         SET name=?, nim=?, username=?, password=?, must_change_password=FALSE, updated_at=NOW()
         WHERE id=?`,
        [name, nim, username, hashedPassword, id]
      );
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Anggota tidak ditemukan" });
    } else {
      const [result] = await db.promise().query(
        `UPDATE users SET name=?, nim=?, username=?, updated_at=NOW() WHERE id=?`,
        [name, nim, username, id]
      );
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Anggota tidak ditemukan" });
    }

    // 3. Update tabel user_periods (pakai role_id)
    if (period_id) {
      const [upResult] = await db.promise().query(
        `UPDATE user_periods
         SET jabatan=?, kementerian=?, role_id=?, is_active=?, updated_at=NOW()
         WHERE user_id=? AND period_id=?`,
        [jabatan, kementerian || null, roleId, activeValue, id, period_id]
      );

      // Jika belum ada entry untuk periode ini, buat baru
      if (upResult.affectedRows === 0) {
        await db.promise().query(
          `INSERT INTO user_periods (user_id, period_id, role_id, jabatan, kementerian, is_active)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, period_id, roleId, jabatan, kementerian || null, activeValue]
        );
      }
    }

    res.json({ message: "Data anggota berhasil diperbarui" });

  } catch (err) {
    if (err.message.startsWith("Role"))
      return res.status(400).json({ message: err.message });
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Username atau NIM sudah terdaftar" });
    res.status(500).json({ message: "Terjadi kesalahan server", error: err.message });
  }
};

// ─── TOGGLE Status Aktif (di user_periods) ───────────────────────────────────
exports.toggleStatus = (req, res) => {
  const { id } = req.params;
  const { period_id } = req.body;

  if (!period_id) return res.status(400).json({ message: "period_id wajib dikirim" });

  db.query(
    `SELECT is_active FROM user_periods WHERE user_id = ? AND period_id = ?`,
    [id, period_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Gagal mengambil status", error: err });
      if (result.length === 0) return res.status(404).json({ message: "Data tidak ditemukan" });

      const newStatus = result[0].is_active ? 0 : 1;
      db.query(
        `UPDATE user_periods SET is_active=?, updated_at=NOW() WHERE user_id=? AND period_id=?`,
        [newStatus, id, period_id],
        (err2) => {
          if (err2) return res.status(500).json({ message: "Gagal update status", error: err2 });
          res.json({
            message:   `Anggota berhasil di-${newStatus ? "aktifkan" : "nonaktifkan"}`,
            is_active: newStatus,
          });
        }
      );
    }
  );
};

// ─── RESET Password ──────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  const { id }       = req.params;
  const { password } = req.body;

  db.query(`SELECT nim FROM users WHERE id = ?`, [id], async (err, result) => {
    if (err) return res.status(500).json({ message: "Terjadi kesalahan server" });
    if (result.length === 0) return res.status(404).json({ message: "Anggota tidak ditemukan" });

    const nim     = result[0].nim;
    const newPass = (password && password.trim() !== "") ? password : `BEM${nim}`;
    const hashed  = await bcrypt.hash(newPass, 10);

    db.query(
      `UPDATE users SET password=?, must_change_password=TRUE, updated_at=NOW() WHERE id=?`,
      [hashed, id],
      (err2) => {
        if (err2) return res.status(500).json({ message: "Gagal reset password" });
        res.json({ message: "Password berhasil direset" });
      }
    );
  });
};

// ─── DELETE Member ───────────────────────────────────────────────────────────
exports.deleteMember = (req, res) => {
  const { id } = req.params;
  db.query(`DELETE FROM users WHERE id = ?`, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal menghapus anggota", error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Anggota tidak ditemukan" });
    res.json({ message: "Anggota berhasil dihapus" });
  });
};
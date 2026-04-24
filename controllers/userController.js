const db = require("../db/db");
const bcrypt = require("bcrypt");

// ─── HELPER: CARI ROLE_ID DARI NAMA ROLE ─────────────────────────────────────
const getRoleIdByName = (roleName) =>
  new Promise((resolve, reject) => {
    db.query(
      `SELECT id FROM roles WHERE name = ? LIMIT 1`,
      [roleName || "user"],
      (err, result) => {
        if (err) return reject(err);
        resolve(result[0]?.id ?? null);
      }
    );
  });

// ─── LOGIN USER (DENGAN HAK AKSES DINAMIS) ───────────────────────────────────
exports.loginUser = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username dan password wajib diisi" });
  }

  const sql = `
    SELECT u.*, 
           r.name AS role, 
           r.label AS role_label,
           up.jabatan, up.kementerian, up.period_id,
           p.name AS period_name,
           (
             SELECT GROUP_CONCAT(prm.path)
             FROM role_permissions rp
             JOIN permissions prm ON prm.id = rp.permission_id
             WHERE rp.role_id = r.id
           ) AS permissions
    FROM users u
    LEFT JOIN user_periods up ON up.user_id = u.id AND up.is_active = TRUE
    LEFT JOIN roles r ON r.id = up.role_id
    LEFT JOIN periods p ON p.id = up.period_id
    WHERE u.username = ?
    LIMIT 1
  `;

  db.query(sql, [username], async (err, result) => {
    if (err) return res.status(500).json({ message: "Terjadi kesalahan server", error: err });

    if (result.length === 0) {
      return res.status(401).json({ message: "Username atau password salah" });
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Username atau password salah" });
    }

    const { password: _, ...safeUser } = user;
    
   safeUser.permissions = user.permissions
  ? user.permissions.split(",").filter((p) => p && p !== "null" && p.trim() !== "")
  : [];

    res.json({ message: "Login berhasil", user: safeUser });
  });
};

// ─── GET ALL USERS ────────────────────────────────────────────────────────────
exports.getUsers = (req, res) => {
  const { period_id } = req.query;

  let sql = `
    SELECT u.id, u.name, u.nim, u.username, u.photo, u.must_change_password, u.created_at,
           r.name AS role,
           r.label AS role_label,
           up.jabatan, up.kementerian, up.is_active, up.period_id
    FROM users u
    LEFT JOIN user_periods up ON up.user_id = u.id AND up.is_active = TRUE
    LEFT JOIN roles r ON r.id = up.role_id
  `;
  const params = [];

  if (period_id) {
    sql += ` WHERE up.period_id = ?`;
    params.push(period_id);
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal mengambil data user", error: err });
    res.json(result);
  });
};

// ─── GET USER BY ID ───────────────────────────────────────────────────────────
exports.getUserById = (req, res) => {
  const { id } = req.params;
  db.query(
    `SELECT u.id, u.name, u.nim, u.username, u.photo, u.must_change_password, u.created_at,
            r.name AS role,
            r.label AS role_label,
            up.jabatan, up.kementerian, up.is_active, up.period_id
     FROM users u
     LEFT JOIN user_periods up ON up.user_id = u.id AND up.is_active = TRUE
     LEFT JOIN roles r ON r.id = up.role_id
     WHERE u.id = ?`,
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Gagal mengambil data user", error: err });
      if (result.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });
      res.json(result[0]);
    }
  );
};

// ─── CREATE USER ──────────────────────────────────────────────────────────────
exports.createUser = async (req, res) => {
  const { name, nim, username, password, jabatan, kementerian, role, period_id } = req.body;

  if (!name || !nim || !username || !password || !jabatan) {
    return res.status(400).json({ message: "Field wajib diisi" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      `INSERT INTO users (name, nim, username, password, must_change_password) VALUES (?, ?, ?, ?, TRUE)`,
      [name, nim, username, hashedPassword],
      async (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Username atau NIM sudah ada" });
          return res.status(500).json({ message: "Gagal membuat user", error: err });
        }

        const userId = result.insertId;
        if (period_id) {
          const roleId = await getRoleIdByName(role || "user");
          db.query(
            `INSERT INTO user_periods (user_id, period_id, jabatan, kementerian, role_id, is_active) VALUES (?, ?, ?, ?, ?, TRUE)`,
            [userId, period_id, jabatan, kementerian || null, roleId],
            (err2) => {
              if (err2) return res.status(500).json({ message: "Gagal assign periode" });
              res.status(201).json({ message: "User berhasil dibuat", id: userId });
            }
          );
        } else {
          res.status(201).json({ message: "User berhasil dibuat", id: userId });
        }
      }
    );
  } catch {
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// ─── UPDATE USER ──────────────────────────────────────────────────────────────
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, nim, jabatan, kementerian, role, is_active, period_id, password } = req.body;

  try {
    const userFields = [`name=?`, `nim=?`, `updated_at=NOW()`];
    const userParams = [name, nim];

    if (password && password.trim() !== "") {
      const hashed = await bcrypt.hash(password, 10);
      userFields.splice(2, 0, `password=?`, `must_change_password=FALSE`);
      userParams.splice(2, 0, hashed);
    }

    db.query(
      `UPDATE users SET ${userFields.join(", ")} WHERE id=?`,
      [...userParams, id],
      async (err) => {
        if (err) return res.status(500).json({ message: "Gagal update user" });

        if (period_id) {
          const roleId = await getRoleIdByName(role || "user");
          db.query(
            `UPDATE user_periods SET jabatan=?, kementerian=?, role_id=?, is_active=?, updated_at=NOW() WHERE user_id=? AND period_id=?`,
            [jabatan, kementerian || null, roleId, is_active ?? true, id, period_id],
            (err2) => {
              if (err2) return res.status(500).json({ message: "Gagal update periode" });
              res.json({ message: "User berhasil diupdate" });
            }
          );
        } else {
          res.json({ message: "User berhasil diupdate" });
        }
      }
    );
  } catch {
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// ─── PASSWORD MANAGEMENT & DELETE ───────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const hashed = await bcrypt.hash(newPassword, 10);
  db.query(`UPDATE users SET password=?, must_change_password=TRUE WHERE id=?`, [hashed, id], (err) => {
    if (err) return res.status(500).json({ message: "Gagal reset password" });
    res.json({ message: "Password berhasil direset" });
  });
};

exports.changePassword = async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;
  db.query(`SELECT password FROM users WHERE id = ?`, [id], async (err, result) => {
    if (err || result.length === 0) return res.status(401).json({ message: "User tidak ditemukan" });
    const isMatch = await bcrypt.compare(oldPassword, result[0].password);
    if (!isMatch) return res.status(401).json({ message: "Password lama salah" });
    const hashed = await bcrypt.hash(newPassword, 10);
    db.query(`UPDATE users SET password=?, must_change_password=FALSE WHERE id=?`, [hashed, id], (err) => {
      if (err) return res.status(500).json({ message: "Gagal mengubah password" });
      res.json({ message: "Password berhasil diubah" });
    });
  });
};

exports.deleteUser = (req, res) => {
  const { id } = req.params;
  db.query(`DELETE FROM users WHERE id = ?`, [id], (err) => {
    if (err) return res.status(500).json({ message: "Gagal menghapus user" });
    res.json({ message: "User berhasil dihapus" });
  });
};

exports.getUserPermissions = (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT GROUP_CONCAT(p.path) AS permissions
    FROM user_periods up
    JOIN role_permissions rp ON rp.role_id = up.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE up.user_id = ? AND up.is_active = TRUE
  `;
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal ambil permissions" });
    const raw = result[0]?.permissions || "";
    const permissions = raw
      ? raw.split(",").filter((p) => p && p !== "null" && p.trim() !== "")
      : [];
    res.json({ permissions });
  });
};
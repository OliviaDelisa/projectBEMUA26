const db = require("../db/db");
const bcrypt = require("bcrypt");

// ─── Get All Users ────────────────────────────────────────────────────────────
exports.getUsers = (req, res) => {
  db.query(
    "SELECT id, name, nim, email, username, jabatan, role, photo, is_active, created_at FROM users",
    (err, result) => {
      if (err) return res.status(500).json({ message: "Gagal mengambil data user", error: err });
      res.json(result);
    }
  );
};

// ─── Create User ──────────────────────────────────────────────────────────────
exports.createUser = async (req, res) => {
  const { name, nim, email, username, password, jabatan, role } = req.body;

  if (!name || !nim || !email || !username || !password || !jabatan) {
    return res.status(400).json({ message: "Semua field wajib diisi" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      // ✅ Tambah must_change_password = TRUE supaya user baru wajib ganti password
      "INSERT INTO users (name, nim, email, username, password, jabatan, role, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [name, nim, email, username, hashedPassword, jabatan, role || "user", true],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Email, username, atau NIM sudah terdaftar" });
          }
          return res.status(500).json({ message: "Gagal membuat user", error: err });
        }
        res.status(201).json({ message: "User berhasil dibuat", id: result.insertId });
      }
    );
  } catch {
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// ─── Login User ───────────────────────────────────────────────────────────────
exports.loginUser = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username dan password wajib diisi" });
  }

  db.query(
    "SELECT * FROM users WHERE username = ? AND is_active = TRUE",
    [username],
    async (err, result) => {
      if (err) return res.status(500).json({ message: "Terjadi kesalahan server" });

      if (result.length === 0) {
        return res.status(401).json({ message: "Username atau password salah" });
      }

      const user = result[0];

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Username atau password salah" });
      }

      // Hapus password sebelum dikirim ke client
      const { password: _, ...safeUser } = user;

      res.json({ message: "Login berhasil", user: safeUser });
    }
  );
};

// ─── Update User ──────────────────────────────────────────────────────────────
exports.updateUser = (req, res) => {
  const { id } = req.params;
  const { name, nim, email, jabatan, role, is_active } = req.body;

  db.query(
    "UPDATE users SET name=?, nim=?, email=?, jabatan=?, role=?, is_active=?, updated_at=NOW() WHERE id=?",
    [name, nim, email, jabatan, role, is_active, id],
    (err) => {
      if (err) return res.status(500).json({ message: "Gagal update user", error: err });
      res.json({ message: "User berhasil diupdate" });
    }
  );
};

// ─── Delete User ──────────────────────────────────────────────────────────────
exports.deleteUser = (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ message: "Gagal menghapus user", error: err });
    res.json({ message: "User berhasil dihapus" });
  });
};

// ─── Change Password ──────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Password lama dan baru wajib diisi" });
  }

  db.query("SELECT password FROM users WHERE id = ?", [id], async (err, result) => {
    if (err) return res.status(500).json({ message: "Terjadi kesalahan server" });
    if (result.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });

    const isMatch = await bcrypt.compare(oldPassword, result[0].password);
    if (!isMatch) return res.status(401).json({ message: "Password lama salah" });

    const hashed = await bcrypt.hash(newPassword, 10);

    db.query(
      "UPDATE users SET password=?, must_change_password=FALSE, updated_at=NOW() WHERE id=?",
      [hashed, id],
      (err) => {
        if (err) return res.status(500).json({ message: "Gagal mengubah password" });
        res.json({ message: "Password berhasil diubah" });
      }
    );
  });
};
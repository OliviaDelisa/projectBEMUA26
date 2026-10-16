const db = require("../db/db");
const bcrypt = require("bcrypt");

exports.getMembers = (req, res) => {
  const { period_id } = req.query;
  const params = [];
  let sql = `
    SELECT im.id, u.id AS user_id, u.name, u.nim, u.username, u.fakultas,
           im.kementerian, im.is_active, im.period_id, p.name AS period_name
    FROM igm_members im
    JOIN users u ON u.id = im.user_id
    JOIN periods p ON p.id = im.period_id
  `;
  if (period_id) {
    sql += " WHERE im.period_id = ?";
    params.push(period_id);
  }
  sql += " ORDER BY u.name ASC";

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal mengambil data anggota IGM" });
    res.json(result);
  });
};

exports.createMember = async (req, res) => {
  const { name, nim, fakultas, kementerian, period_id } = req.body;
  if (!name || !nim || !fakultas || !kementerian || !period_id) {
    return res.status(400).json({ message: "Nama, NIM, fakultas, kementerian, dan periode wajib diisi" });
  }

  let connection;
  let accountReused = false;
  try {
    const username = String(nim).trim();
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    const [userRows] = await connection.query(
      `SELECT id FROM users WHERE nim = ? FOR UPDATE`,
      [nim]
    );
    let userId;
    if (userRows.length > 0) {
      accountReused = true;
      userId = userRows[0].id;
      const [igmRows] = await connection.query(
        `SELECT id FROM igm_members WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      if (igmRows.length === 0) {
        await connection.rollback();
        return res.status(409).json({ message: "NIM sudah digunakan oleh akun non-IGM" });
      }
      const [periodRows] = await connection.query(
        `SELECT id FROM igm_members WHERE user_id = ? AND period_id = ?`,
        [userId, period_id]
      );
      if (periodRows.length > 0) {
        await connection.rollback();
        return res.status(409).json({ message: "Anggota sudah terdaftar pada periode ini" });
      }
      await connection.query(
        `UPDATE users SET name = ?, fakultas = ?, updated_at = NOW() WHERE id = ?`,
        [name, fakultas, userId]
      );
    } else {
      const password = `bem${username}`;
      const hashedPassword = await bcrypt.hash(password, 10);
      const [userResult] = await connection.query(
        `INSERT INTO users (name, nim, fakultas, username, password, must_change_password)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [name, nim, fakultas, username, hashedPassword]
      );
      userId = userResult.insertId;
    }

    await connection.query(
      `INSERT INTO igm_members (user_id, period_id, kementerian, is_active)
       VALUES (?, ?, ?, TRUE)`,
      [userId, period_id, kementerian]
    );
    await connection.commit();
    res.status(201).json({ message: "Anggota berhasil ditambahkan ke periode", id: userId, accountReused });
  } catch (err) {
    if (connection) await connection.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username atau NIM sudah terdaftar" });
    }
    res.status(500).json({ message: "Gagal menambahkan akun IGM" });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateMember = async (req, res) => {
  const { id } = req.params;
  const { name, nim, fakultas, kementerian, is_active } = req.body;
  if (!name || !nim || !fakultas || !kementerian) {
    return res.status(400).json({ message: "Nama, NIM, fakultas, dan kementerian wajib diisi" });
  }

  try {
    const [rows] = await db.promise().query("SELECT user_id FROM igm_members WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Anggota IGM tidak ditemukan" });
    await db.promise().query(
      "UPDATE users SET name = ?, nim = ?, fakultas = ?, username = ?, updated_at = NOW() WHERE id = ?",
      [name, nim, fakultas, String(nim).trim(), rows[0].user_id]
    );
    await db.promise().query(
      `UPDATE igm_members
       SET kementerian = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [kementerian, is_active ? 1 : 0, id]
    );
    res.json({ message: "Data anggota IGM berhasil diperbarui" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username atau NIM sudah terdaftar" });
    }
    res.status(500).json({ message: "Gagal memperbarui data anggota IGM" });
  }
};

exports.resetPassword = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query(
      `SELECT u.id, u.nim FROM igm_members im
       JOIN users u ON u.id = im.user_id WHERE im.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Anggota IGM tidak ditemukan" });
    const password = `bem${rows[0].nim}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.promise().query(
      `UPDATE users SET password = ?, must_change_password = TRUE, updated_at = NOW()
       WHERE id = ?`,
      [hashedPassword, rows[0].id]
    );
    res.json({ message: "Password berhasil direset", defaultPassword: password });
  } catch {
    res.status(500).json({ message: "Gagal mereset password anggota IGM" });
  }
};

exports.copyToPeriod = async (req, res) => {
  const { from_period_id, to_period_id } = req.body;
  if (!from_period_id || !to_period_id || String(from_period_id) === String(to_period_id)) {
    return res.status(400).json({ message: "Pilih periode sumber dan tujuan yang berbeda" });
  }

  try {
    const [sourceRows] = await db.promise().query(
      `SELECT user_id, kementerian FROM igm_members
       WHERE period_id = ? AND is_active = TRUE`,
      [from_period_id]
    );
    const [result] = await db.promise().query(
      `INSERT IGNORE INTO igm_members (user_id, period_id, kementerian, is_active)
       SELECT user_id, ?, kementerian, TRUE
       FROM igm_members
       WHERE period_id = ? AND is_active = TRUE`,
      [to_period_id, from_period_id]
    );
    res.json({
      message: "Roster IGM berhasil disalin",
      inserted: result.affectedRows,
      skipped: sourceRows.length - result.affectedRows,
    });
  } catch {
    res.status(500).json({ message: "Gagal menyalin anggota ke periode tujuan" });
  }
};
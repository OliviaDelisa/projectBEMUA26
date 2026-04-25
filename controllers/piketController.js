const db = require("../db/db");

// ─── 1. GET — Ambil semua piket dalam satu bulan ─────────────
// GET /api/piket?year=2026&month=4
const getPiketByMonth = (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({
      success: false,
      message: "Parameter year dan month wajib diisi.",
    });
  }

  const sql = `
    SELECT
      id,
      duty_date,
      kementerian,
      menko,
      period_id,
      created_by,
      created_at,
      DAY(duty_date)   AS tanggal,
      MONTH(duty_date) AS bulan,
      YEAR(duty_date)  AS tahun
    FROM duty_schedules
    WHERE YEAR(duty_date)  = ?
      AND MONTH(duty_date) = ?
    ORDER BY duty_date ASC
  `;

  db.query(sql, [year, month], (err, results) => {
    if (err) {
      console.error("❌ getPiketByMonth:", err.message);
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data piket.",
        error: err.message,
      });
    }
    return res.status(200).json({ success: true, data: results });
  });
};

// ─── 2. POST — Simpan atau perbarui satu jadwal piket ────────
// POST /api/piket
// Body: { duty_date, kementerian, menko, period_id?, created_by? }
//
// Alur: cek apakah duty_date sudah ada di DB
//   → Sudah ada  : UPDATE baris tersebut
//   → Belum ada  : INSERT baris baru
const upsertPiket = (req, res) => {
  const {
    duty_date,
    kementerian,
    menko,
    period_id  = null,
    created_by = null,
  } = req.body;

  if (!duty_date || !kementerian || !menko) {
    return res.status(400).json({
      success: false,
      message: "duty_date, kementerian, dan menko wajib diisi.",
    });
  }

  // Langkah 1: cek apakah tanggal sudah ada
  db.query(
    `SELECT id FROM duty_schedules WHERE duty_date = ? LIMIT 1`,
    [duty_date],
    (err, rows) => {
      if (err) {
        console.error("❌ upsertPiket (check):", err.message);
        return res.status(500).json({
          success: false,
          message: "Gagal memeriksa data.",
          error: err.message,
        });
      }

      if (rows.length > 0) {
        // Langkah 2a: tanggal sudah ada → UPDATE
        const updateSql = `
          UPDATE duty_schedules
          SET
            kementerian = ?,
            menko       = ?,
            period_id   = ?,
            created_by  = ?
          WHERE duty_date = ?
        `;
        db.query(
          updateSql,
          [kementerian, menko, period_id, created_by, duty_date],
          (err2) => {
            if (err2) {
              console.error("❌ upsertPiket (update):", err2.message);
              return res.status(500).json({
                success: false,
                message: "Gagal memperbarui jadwal.",
                error: err2.message,
              });
            }
            return res.status(200).json({
              success: true,
              message: `Jadwal piket ${duty_date} berhasil diperbarui.`,
            });
          }
        );
      } else {
        // Langkah 2b: tanggal belum ada → INSERT
        const insertSql = `
          INSERT INTO duty_schedules
            (duty_date, kementerian, menko, period_id, created_by)
          VALUES (?, ?, ?, ?, ?)
        `;
        db.query(
          insertSql,
          [duty_date, kementerian, menko, period_id, created_by],
          (err2) => {
            if (err2) {
              console.error("❌ upsertPiket (insert):", err2.message);
              return res.status(500).json({
                success: false,
                message: "Gagal menyimpan jadwal.",
                error: err2.message,
              });
            }
            return res.status(200).json({
              success: true,
              message: `Jadwal piket ${duty_date} berhasil ditambahkan.`,
            });
          }
        );
      }
    }
  );
};

// ─── 3. DELETE — Hapus jadwal satu tanggal ───────────────────
// DELETE /api/piket/2026-04-14
const deletePiket = (req, res) => {
  const { date } = req.params;

  if (!date) {
    return res.status(400).json({
      success: false,
      message: "Parameter date wajib diisi.",
    });
  }

  db.query(
    `DELETE FROM duty_schedules WHERE duty_date = ?`,
    [date],
    (err, result) => {
      if (err) {
        console.error("❌ deletePiket:", err.message);
        return res.status(500).json({
          success: false,
          message: "Gagal menghapus jadwal.",
          error: err.message,
        });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: `Tidak ada jadwal piket untuk tanggal ${date}.`,
        });
      }
      return res.status(200).json({
        success: true,
        message: `Jadwal piket ${date} berhasil dihapus.`,
      });
    }
  );
};

module.exports = { getPiketByMonth, upsertPiket, deletePiket };
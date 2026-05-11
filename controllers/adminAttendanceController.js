const db = require("../db/db");

// ── Helper: format tanggal lokal tanpa terpengaruh UTC ──────────
function getLocalDateString(date = new Date()) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ── getAdminSecretariatMonitor ───────────────────────────────────
// GET /admin/attendance/monitor?date=YYYY-MM-DD&kementerian=all
exports.getAdminSecretariatMonitor = (req, res) => {
  const { date, kementerian } = req.query;

  let query = `
    SELECT sa.*, u.name, u.nim, up.kementerian, up.jabatan 
    FROM secretariat_attendance sa
    JOIN users u ON sa.user_id = u.id
    JOIN user_periods up ON up.user_id = u.id AND up.is_active = TRUE
    WHERE sa.status != 'tidak_hadir'
  `;
  const params = [];

  if (date) {
    query += " AND DATE(sa.date) = ?";
    params.push(date);
  }
  if (kementerian && kementerian !== 'all') {
    query += " AND up.kementerian = ?";
    params.push(kementerian);
  }

  query += " ORDER BY sa.check_in_time DESC";

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal mengambil data", error: err });
    res.json(result);
  });
};
// ── getSecretariatRekap ──────────────────────────────────────────
// GET /admin/attendance/rekap?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&kementerian=all
exports.getSecretariatRekap = (req, res) => {
  const { startDate, endDate, kementerian } = req.query;

  let query = `
    SELECT 
      u.id as user_id, u.name, u.nim,
      up.kementerian, up.jabatan,
      sa.date, sa.status
    FROM users u
    JOIN user_periods up ON up.user_id = u.id AND up.is_active = TRUE
    JOIN periods p ON p.id = up.period_id AND p.is_active = TRUE
    LEFT JOIN secretariat_attendance sa ON u.id = sa.user_id 
      AND sa.date BETWEEN ? AND ?
    WHERE 1=1
  `;
  const params = [startDate, endDate];

  if (kementerian && kementerian !== 'all') {
    query += " AND up.kementerian = ?";
    params.push(kementerian);
  }

  query += " ORDER BY u.name ASC, sa.date ASC";

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal mengambil rekap", error: err });

    const rekap = result.reduce((acc, curr) => {
      if (!acc[curr.user_id]) {
        acc[curr.user_id] = {
          id:          curr.user_id,
          name:        curr.name,
          nim:         curr.nim,
          kementerian: curr.kementerian,
          jabatan:     curr.jabatan,
          attendance:  {}
        };
      }
      if (curr.date) {
        const dateKey = getLocalDateString(new Date(curr.date));
        acc[curr.user_id].attendance[dateKey] = curr.status;
      }
      return acc;
    }, {});

    res.json(Object.values(rekap));
  });
};
// ── validateAttendance ───────────────────────────────────────────
// PUT /admin/attendance/validate/:id
exports.validateAttendance = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.query(
    "UPDATE secretariat_attendance SET status = ? WHERE id = ?",
    [status, id],
    (err) => {
      if (err) return res.status(500).json({ message: "Gagal validasi" });
      res.json({ message: "Absensi berhasil divalidasi" });
    }
  );
};
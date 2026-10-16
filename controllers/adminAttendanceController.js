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

// GET /admin/attendance/igm-monitor?date=YYYY-MM-DD&period_id=ID&kementerian=all
exports.getIgmAttendanceMonitor = (req, res) => {
  const { date, period_id, kementerian } = req.query;
  if (!date || !period_id) {
    return res.status(400).json({ message: "Tanggal dan periode wajib dipilih" });
  }

  let query = `
    SELECT sa.*, u.name, u.nim, im.kementerian
    FROM secretariat_attendance sa
    JOIN igm_members im ON im.user_id = sa.user_id
      AND im.period_id = sa.period_id
    JOIN users u ON u.id = sa.user_id
    WHERE sa.period_id = ? AND DATE(sa.date) = ?
      AND sa.status != 'tidak_hadir'
  `;
  const params = [period_id, date];
  if (kementerian && kementerian !== "all") {
    query += " AND im.kementerian = ?";
    params.push(kementerian);
  }
  query += " ORDER BY sa.check_in_time DESC";

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal mengambil validasi absensi IGM" });
    res.json(result);
  });
};

// GET /admin/attendance/rekap-igm?period_id=ID&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
exports.getIgmRekap = (req, res) => {
  const { period_id, startDate, endDate, kementerian } = req.query;
  if (!period_id || !startDate || !endDate) {
    return res.status(400).json({ message: "Periode dan rentang tanggal wajib dipilih" });
  }

  let query = `
    SELECT u.id AS user_id, u.name, u.nim, im.kementerian,
           sa.date, sa.status
    FROM igm_members im
    JOIN users u ON u.id = im.user_id
    LEFT JOIN secretariat_attendance sa ON sa.user_id = im.user_id
      AND sa.period_id = im.period_id
      AND sa.date BETWEEN ? AND ?
    WHERE im.period_id = ?
  `;
  const params = [startDate, endDate, period_id];
  if (kementerian && kementerian !== "all") {
    query += " AND im.kementerian = ?";
    params.push(kementerian);
  }
  query += " ORDER BY im.kementerian ASC, u.name ASC, sa.date ASC";

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal mengambil rekap absensi IGM" });
    const rekap = result.reduce((acc, row) => {
      if (!acc[row.user_id]) {
        acc[row.user_id] = {
          id: row.user_id,
          name: row.name,
          nim: row.nim,
          kementerian: row.kementerian,
          attendance: {},
        };
      }
      if (row.date) acc[row.user_id].attendance[String(row.date).slice(0, 10)] = row.status;
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
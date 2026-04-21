const db = require("../db/db");

const SEKRE_LAT = -0.9169685;
const SEKRE_LNG = 100.4547321;
const RADIUS_METER = 100;

function hitungJarak(lat1, lng1, lat2, lng2) {
  const R     = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLng  = toRad(lng2 - lng1);
  const a     =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── getHomeData ──────────────────────────────────────────────────
// GET /attendance/home/:user_id
exports.getHomeData = (req, res) => {
  const { user_id } = req.params;
  const today = new Date().toISOString().split("T")[0];

  db.query(
    "SELECT * FROM secretariat_attendance WHERE user_id = ? AND date = ?",
    [user_id, today],
    (err, secAtt) => {
      if (err) return res.status(500).json({ message: "Server error" });

      db.query(
        `SELECT a.*, aa.status as att_status, aa.check_in_time as att_check_in
         FROM activities a
         LEFT JOIN activity_attendance aa ON a.id = aa.activity_id AND aa.user_id = ?
         WHERE a.is_active = TRUE
           AND a.end_datetime >= NOW()
         ORDER BY a.start_datetime ASC`,
        [user_id],
        (err, activities) => {
          if (err) return res.status(500).json({ message: "Server error" });

          db.query(
            `SELECT ds.* FROM duty_schedules ds
             JOIN users u ON u.kementerian = ds.kementerian
             WHERE u.id = ? AND ds.duty_date = ?`,
            [user_id, today],
            (err, duty) => {
              if (err) return res.status(500).json({ message: "Server error" });
              res.json({
                today,
                secretariat_attendance: secAtt[0] || null,
                activities,
                has_duty: duty.length > 0,
              });
            }
          );
        }
      );
    }
  );
};

// ── getSecretariatHistory ────────────────────────────────────────
// GET /attendance/secretariat/history/:user_id?limit=5
exports.getSecretariatHistory = (req, res) => {
  const { user_id } = req.params;
  const limit = req.query.limit || 5;

  db.query(
    `SELECT * FROM secretariat_attendance
     WHERE user_id = ? ORDER BY date DESC LIMIT ?`,
    [user_id, parseInt(limit)],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(result);
    }
  );
};

// ── getActivityHistory ───────────────────────────────────────────
// GET /attendance/activity/history/:user_id?limit=20
exports.getActivityHistory = (req, res) => {
  const { user_id } = req.params;
  const limit = req.query.limit || 100;

  db.query(
    `SELECT
        aa.id,
        aa.activity_id,
        aa.user_id,
        aa.check_in_time,
        aa.latitude,
        aa.longitude,
        aa.location_name,
        aa.selfie_photo,
        COALESCE(aa.status, 'tidak_hadir') AS status,
        aa.created_at,
        a.title,
        a.start_datetime   AS activity_date,
        a.end_datetime,
        a.location_name    AS activity_location
     FROM activities a
     LEFT JOIN activity_attendance aa
        ON a.id = aa.activity_id AND aa.user_id = ?
     WHERE a.is_active = TRUE
       AND a.end_datetime < NOW()
     ORDER BY a.start_datetime DESC
     LIMIT ?`,
    [parseInt(user_id), parseInt(limit)],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(result);
    }
  );
};

// ── checkInSecretariat ───────────────────────────────────────────
// POST /attendance/secretariat/checkin
exports.checkInSecretariat = (req, res) => {
  const { user_id, latitude, longitude, location_name, selfie_photo, period_id } = req.body;
  const now = new Date();

  // Validasi hari kerja (ubah hari === 7 ke hari === 6 setelah testing selesai)
  const hari = now.getDay();
  if (hari === 0 || hari === 7) {
    return res.status(400).json({ message: "Absensi hanya tersedia hari Senin – Jumat" });
  }

  // Validasi jam
  const totalMenit = now.getHours() * 60 + now.getMinutes();
  if (totalMenit < 8 * 60) {
    return res.status(400).json({ message: "Absensi belum dibuka. Mulai pukul 08:00" });
  }
  if (totalMenit > 18 * 60) {
    return res.status(400).json({ message: "Absensi sudah ditutup. Maksimal pukul 18:00" });
  }

  if (latitude == null || longitude == null) {
    return res.status(400).json({ message: "Data lokasi tidak lengkap" });
  }

  const jarak = Math.round(hitungJarak(
    parseFloat(latitude), parseFloat(longitude),
    SEKRE_LAT, SEKRE_LNG
  ));

  if (jarak > RADIUS_METER) {
    return res.status(403).json({
      message: `Anda berada ${jarak}m dari Sekre BEM. Absensi hanya bisa dilakukan dalam radius ${RADIUS_METER}m.`,
      distance_meters: jarak,
    });
  }

  const today = now.toISOString().split("T")[0];

  db.query(
    `INSERT INTO secretariat_attendance
      (user_id, period_id, date, check_in_time, latitude, longitude, location_name, selfie_photo, distance_meters, status)
     VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, 'hadir')`,
    [user_id, period_id || null, today, latitude, longitude, location_name, selfie_photo || null, jarak],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "Anda sudah absen hari ini" });
        }
        return res.status(500).json({ message: "Gagal absen", error: err });
      }
      res.status(201).json({
        message: "Absen berhasil",
        status: "hadir",
        id: result.insertId,
        distance_meters: jarak,
      });
    }
  );
};

// ── checkInActivity ──────────────────────────────────────────────
// POST /attendance/activity/checkin
exports.checkInActivity = (req, res) => {
  const { activity_id, user_id, latitude, longitude, location_name, selfie_photo } = req.body;

  db.query(
    `SELECT * FROM activities WHERE id = ? AND is_active = TRUE AND end_datetime >= NOW()`,
    [activity_id],
    (err, activities) => {
      if (err) return res.status(500).json({ message: "Server error" });
      if (activities.length === 0) {
        return res.status(400).json({ message: "Kegiatan tidak ditemukan atau sudah berakhir" });
      }

      const activity  = activities[0];
      const now       = new Date();
      const startTime = new Date(activity.start_datetime);
      if (now < startTime) {
        return res.status(400).json({
          message: `Absensi baru bisa diambil mulai ${startTime.toLocaleString("id-ID")}`,
        });
      }

      db.query(
        `INSERT INTO activity_attendance
          (activity_id, user_id, check_in_time, latitude, longitude, location_name, selfie_photo, status)
         VALUES (?, ?, NOW(), ?, ?, ?, ?, 'hadir')`,
        [activity_id, user_id, latitude, longitude, location_name, selfie_photo || null],
        (err, result) => {
          if (err) {
            if (err.code === "ER_DUP_ENTRY") {
              return res.status(409).json({ message: "Anda sudah absen kegiatan ini" });
            }
            return res.status(500).json({ message: "Gagal absen kegiatan", error: err });
          }
          res.status(201).json({ message: "Absen kegiatan berhasil", id: result.insertId });
        }
      );
    }
  );
};
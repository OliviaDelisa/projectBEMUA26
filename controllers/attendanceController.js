const db = require("../db/db");

const SEKRE_LAT    = -0.92251;
const SEKRE_LNG    = 100.44827;
const RADIUS_METER = 50;

// ── Helper: format tanggal lokal (WIB) tanpa terpengaruh UTC ────
function getLocalDateString(date = new Date()) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  const today = getLocalDateString();

  db.query(
    "SELECT * FROM secretariat_attendance WHERE user_id = ? AND date = ?",
    [user_id, today],
    (err, secAtt) => {
      if (err) return res.status(500).json({ message: "Server error" });

      db.query(
        `SELECT a.*,
                aa.status        AS att_status,
                aa.check_in_time AS att_check_in,
                aa.selfie_photo  AS att_selfie_photo,
                aa.location_name AS att_location_name
         FROM activities a
         LEFT JOIN activity_attendance aa ON a.id = aa.activity_id AND aa.user_id = ?
         WHERE a.is_active = TRUE
           AND a.end_datetime >= NOW()
         ORDER BY a.start_datetime ASC`,
        [user_id],
        (err, activities) => {
          if (err) return res.status(500).json({ message: "Server error" });

          db.query(
            `SELECT ds.*
             FROM duty_schedules ds
             JOIN user_periods up ON up.kementerian = ds.kementerian
             JOIN periods p ON p.id = up.period_id AND p.is_active = TRUE
             WHERE up.user_id = ?
               AND up.is_active = TRUE
               AND ds.duty_date = ?`,
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
    [parseInt(user_id), parseInt(limit)],
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
        a.start_datetime AS activity_date,
        a.end_datetime,
        a.location_name  AS activity_location
     FROM activities a
     LEFT JOIN activity_attendance aa
        ON a.id = aa.activity_id AND aa.user_id = ?
     WHERE a.is_active = TRUE
       AND (
         a.end_datetime < NOW()
         OR aa.status = 'hadir'
       )
     ORDER BY COALESCE(aa.check_in_time, a.start_datetime) DESC
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
  const { user_id, latitude, longitude, location_name, selfie_photo } = req.body;
  const now = new Date();

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

  const today = getLocalDateString(now);

  db.query(
    `SELECT id FROM periods WHERE is_active = TRUE LIMIT 1`,
    [],
    (err, periods) => {
      if (err) return res.status(500).json({ message: "Server error" });
      const period_id = periods[0]?.id || null;

      db.query(
        `INSERT INTO secretariat_attendance
          (user_id, period_id, date, check_in_time, latitude, longitude, location_name, selfie_photo, distance_meters, status)
         VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, 'hadir')
         ON DUPLICATE KEY UPDATE
          check_in_time   = NOW(),
          latitude        = VALUES(latitude),
          longitude       = VALUES(longitude),
          location_name   = VALUES(location_name),
          selfie_photo    = VALUES(selfie_photo),
          distance_meters = VALUES(distance_meters),
          status          = 'hadir'`,
        [user_id, period_id, today, latitude, longitude, location_name, selfie_photo || null, jarak],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Gagal absen", error: err });

          const isUpdate = result.affectedRows === 2;
          res.status(201).json({
            message: isUpdate ? "Absen berhasil diperbarui" : "Absen berhasil",
            status: "hadir",
            id: result.insertId || null,
            distance_meters: jarak,
            updated: isUpdate,
          });
        }
      );
    }
  );
};

// ── checkInActivity ──────────────────────────────────────────────
// POST /attendance/activity/checkin
exports.checkInActivity = (req, res) => {
  const { activity_id, user_id, latitude, longitude, location_name, selfie_photo } = req.body;

  // Validasi data lokasi wajib ada
  if (latitude == null || longitude == null) {
    return res.status(400).json({ message: "Data lokasi tidak lengkap" });
  }

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

      // Cek apakah kegiatan sudah mulai
      if (now < startTime) {
        return res.status(400).json({
          message: `Absensi baru bisa diambil mulai ${startTime.toLocaleString("id-ID")}`,
        });
      }

      // ── Validasi radius lokasi kegiatan ──────────────────────────
      // Hanya divalidasi jika kegiatan memiliki koordinat dan radius yang valid
      if (
        activity.latitude != null &&
        activity.longitude != null &&
        Number(activity.radius_meters) > 0
      ) {
        const jarak = Math.round(hitungJarak(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(activity.latitude),
          parseFloat(activity.longitude)
        ));

        if (jarak > Number(activity.radius_meters)) {
          return res.status(403).json({
            message: `Anda berada ${jarak}m dari lokasi kegiatan "${activity.title}". Absensi hanya bisa dilakukan dalam radius ${activity.radius_meters}m.`,
            distance_meters: jarak,
            radius_meters: activity.radius_meters,
          });
        }
      }

      // ── UPSERT: insert baru atau update jika sudah pernah absen ──
      db.query(
        `INSERT INTO activity_attendance
          (activity_id, user_id, check_in_time, latitude, longitude, location_name, selfie_photo, status)
         VALUES (?, ?, NOW(), ?, ?, ?, ?, 'hadir')
         ON DUPLICATE KEY UPDATE
          check_in_time = NOW(),
          latitude      = VALUES(latitude),
          longitude     = VALUES(longitude),
          location_name = VALUES(location_name),
          selfie_photo  = VALUES(selfie_photo),
          status        = 'hadir'`,
        [activity_id, user_id, latitude, longitude, location_name, selfie_photo || null],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Gagal absen kegiatan", error: err });
          const isUpdate = result.affectedRows === 2;
          res.status(201).json({
            message: isUpdate ? "Absen berhasil diperbarui" : "Absen kegiatan berhasil",
            id: result.insertId || null,
            updated: isUpdate,
          });
        }
      );
    }
  );
};
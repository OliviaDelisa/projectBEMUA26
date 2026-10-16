const cron = require('node-cron');
const db = require('../db/db');

function getLocalDateString(date = new Date()) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

cron.schedule('1 20 * * 1-5', () => {
  console.log('[CRON] Mengisi tidak_hadir setelah batas absensi...');
  const today = getLocalDateString();

  db.query(
    `SELECT DISTINCT up.user_id, up.period_id
     FROM user_periods up
     JOIN periods p ON p.id = up.period_id AND p.is_active = TRUE
     WHERE up.is_active = TRUE`,
    [],
    (err, users) => {
      if (err) return console.error('[CRON] Error ambil users:', err);

      users.forEach(({ user_id, period_id }) => {
        db.query(
          `INSERT IGNORE INTO secretariat_attendance
            (user_id, period_id, date, status)
           VALUES (?, ?, ?, 'tidak_hadir')`,
          [user_id, period_id, today],
          (err) => {
            if (err) console.error('[CRON] Error insert:', err);
          }
        );
      });

      console.log(`[CRON] Selesai, ${users.length} user diproses.`);

      db.query(
        `SELECT im.user_id, im.period_id
         FROM igm_members im
         JOIN periods p ON p.id = im.period_id AND p.is_active = TRUE
         WHERE im.is_active = TRUE`,
        [],
        (igmErr, igmUsers) => {
          if (igmErr) return console.error('[CRON] Error ambil anggota IGM:', igmErr);
          igmUsers.forEach(({ user_id, period_id }) => {
            db.query(
              `INSERT IGNORE INTO secretariat_attendance (user_id, period_id, date, status)
               VALUES (?, ?, ?, 'tidak_hadir')`,
              [user_id, period_id, today],
              (insertErr) => {
                if (insertErr) console.error('[CRON] Error insert absensi IGM:', insertErr);
              }
            );
          });
          console.log(`[CRON] ${igmUsers.length} anggota IGM diproses.`);
        }
      );
    }
  );
}, {
  timezone: "Asia/Jakarta"
});
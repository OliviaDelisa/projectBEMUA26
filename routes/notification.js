// ==================================================================
// FILE INI: taruh di folder  routes/notification.js  di project backend
// ==================================================================
const express = require("express");
const cron    = require("node-cron");
const router  = express.Router();

const { saveSubscription, sendToUser, sendToAll, sendToUsers } = require("../utils/push");
const db = require("../db/db");


// ================================================================
// ENDPOINT 1: Subscribe
// ================================================================
router.post("/subscribe", async (req, res) => {
  const { user_id, subscription } = req.body;

  if (!user_id || !subscription) {
    return res.status(400).json({ message: "user_id dan subscription wajib diisi" });
  }

  try {
    await saveSubscription(user_id, subscription);
    res.status(201).json({ message: "Subscription berhasil disimpan" });
  } catch (err) {
    console.error("[subscribe] Error:", err.message);
    res.status(500).json({ message: "Gagal menyimpan subscription" });
  }
});


// ================================================================
// ENDPOINT 2: VAPID public key
// ================================================================
router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});


// ================================================================
// ENDPOINT 3: Test kirim notif manual
// ================================================================
router.post("/test", async (req, res) => {
  const { user_id } = req.body;
  try {
    await sendToUser(user_id, {
      title: "Test Notifikasi",
      body:  "Notifikasi berhasil berjalan!",
      icon:  "/logo192.png",
      url:   "/"
    });
    res.json({ message: "Test notif terkirim" });
  } catch (err) {
    console.error("[test] Error:", err.message);
    res.status(500).json({ message: "Gagal kirim notif" });
  }
});


// ================================================================
// CRON JOB 1: Reminder absen sekre + piket
// Jadwal: 08.00, 12.00, 15.00, 18.00 — Senin-Jumat
//
// User BIASA : notif SEKALI di jam 08.00 saja, berhenti setelah absen
// User PIKET : notif setiap 3 jam sampai absen
// ================================================================
cron.schedule("0 8,12,15,18 * * 1-5", async () => {
  console.log("[CRON] Menjalankan reminder absen sekre...");
  try {
    const jam = new Date().getHours();

    // ── User BIASA — hanya jam 08.00 ──────────────────────────────
    if (jam === 8) {
      const [userBiasa] = await db.promise().query(`
        SELECT u.id
        FROM users u
        JOIN user_periods up ON up.user_id = u.id
        JOIN periods p ON p.id = up.period_id AND p.is_active = TRUE
        WHERE u.id NOT IN (
          SELECT user_id FROM secretariat_attendance
          WHERE DATE(check_in_time) = CURDATE() AND status = 'hadir'
        )
        AND u.id NOT IN (
          SELECT DISTINCT u2.id
          FROM users u2
          JOIN user_periods up2 ON up2.user_id = u2.id
          JOIN duty_schedules ds ON ds.kementerian = up2.kementerian
          WHERE DATE(ds.duty_date) = CURDATE()
            AND up2.kementerian IS NOT NULL
        )
      `);

      const userIds = userBiasa.map(r => r.id);
      console.log(`[CRON] ${userIds.length} user biasa belum absen (notif sekali jam 08.00)`);

      if (userIds.length > 0) {
        await sendToUsers(userIds, {
          title: "Jangan Lupa Absen Sekre!",
          body:  "Absensi sekretariat sudah dibuka. Yuk absen sekarang!",
          icon:  "/logo192.png",
          url:   "/home"
        });
      }
    }

    // ── User PIKET — setiap 3 jam sampai absen ────────────────────
    const [userPiket] = await db.promise().query(`
      SELECT u.id, up.kementerian
      FROM users u
      JOIN user_periods up ON up.user_id = u.id
      JOIN periods p ON p.id = up.period_id AND p.is_active = TRUE
      JOIN duty_schedules ds ON ds.kementerian = up.kementerian
      WHERE DATE(ds.duty_date) = CURDATE()
        AND up.kementerian IS NOT NULL
        AND u.id NOT IN (
          SELECT user_id FROM secretariat_attendance
          WHERE DATE(check_in_time) = CURDATE() AND status = 'hadir'
        )
    `);

    console.log(`[CRON] ${userPiket.length} user piket belum absen`);

    if (userPiket.length > 0) {
      const pesanJam = jam === 8  ? "pagi ini" :
                       jam === 12 ? "siang ini" :
                       jam === 15 ? "sore ini"  : "malam ini";

      for (const user of userPiket) {
        await sendToUser(user.id, {
          title: "Reminder Piket!",
          body:  `${user.kementerian} mendapat jadwal piket ${pesanJam}. Jangan lupa absen sekre!`,
          icon:  "/logo192.png",
          url:   "/home"
        });
      }
    }
  } catch (err) {
    console.error("[CRON] Error reminder absen sekre:", err.message);
  }
});


// ================================================================
// CRON JOB 2: Reminder kegiatan
// Cek setiap menit:
// - 2 jam sebelum mulai  → "Kegiatan 2 jam lagi"
// - Tepat saat mulai     → "Kegiatan sudah dimulai"
// Hanya kirim ke user yang BELUM absen kegiatan tersebut
// ================================================================
cron.schedule("* * * * *", async () => {
  try {
    const [activities] = await db.promise().query(`
      SELECT a.id, a.title, a.start_datetime
      FROM activities a
      WHERE a.is_active = TRUE
        AND (
         a.start_datetime BETWEEN
            DATE_ADD(NOW(), INTERVAL 119 MINUTE) AND
            DATE_ADD(NOW(), INTERVAL 120 MINUTE)
            OR
            a.start_datetime BETWEEN
            DATE_ADD(NOW(), INTERVAL 0 MINUTE) AND
            DATE_ADD(NOW(), INTERVAL 1 MINUTE)
        )
    `);

    for (const activity of activities) {
      const [peserta] = await db.promise().query(`
        SELECT u.id AS user_id
        FROM users u
        JOIN user_periods up ON up.user_id = u.id
        JOIN periods p ON p.id = up.period_id AND p.is_active = TRUE
        WHERE u.id NOT IN (
          SELECT user_id FROM activity_attendance
          WHERE activity_id = ? AND status = 'hadir'
        )
      `, [activity.id]);

      const userIds = peserta.map(p => p.user_id);
      if (userIds.length === 0) continue;

      const now       = new Date();
      const mulai     = new Date(activity.start_datetime);
      const diffMenit = Math.round((mulai - now) / 60000);
      const is2Jam    = diffMenit > 5;

      const title = is2Jam ? "Kegiatan 2 Jam Lagi!" : "Kegiatan Sudah Dimulai!";
      const body  = is2Jam
        ? `"${activity.title}" dimulai 2 jam lagi. Siapkan dirimu!`
        : `"${activity.title}" sudah dimulai. Segera ambil absensi!`;

      console.log(`[CRON] ${title} → ${userIds.length} user belum absen`);

      await sendToUsers(userIds, { title, body, icon: "/logo192.png", url: "/home" });
    }
  } catch (err) {
    console.error("[CRON] Error reminder kegiatan:", err.message);
  }
});

// ================================================================
// ENDPOINT 4: Ambil riwayat notifikasi user
// ================================================================
router.get("/history/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const [rows] = await db.promise().query(
      `SELECT id, title, body, type, reference_id, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("[history] Error:", err.message);
    res.status(500).json({ message: "Gagal ambil riwayat notifikasi" });
  }
});


// ================================================================
// ENDPOINT 5: Tandai semua notifikasi sebagai sudah dibaca
// ================================================================
router.put("/read-all/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    await db.promise().query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = ?`,
      [user_id]
    );
    res.json({ message: "Semua notifikasi ditandai sudah dibaca" });
  } catch (err) {
    console.error("[read-all] Error:", err.message);
    res.status(500).json({ message: "Gagal update notifikasi" });
  }
});


// ================================================================
// ENDPOINT 6: Jumlah notifikasi belum dibaca (untuk badge lonceng)
// ================================================================
router.get("/unread-count/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const [rows] = await db.promise().query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id = ? AND is_read = FALSE`,
      [user_id]
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error("[unread-count] Error:", err.message);
    res.status(500).json({ count: 0 });
  }
});

module.exports = router;
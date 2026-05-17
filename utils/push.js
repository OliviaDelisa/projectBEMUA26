const webpush = require("web-push");
const db      = require("../db/db");

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const saveSubscription = async (userId, subscription) => {
  const endpoint = subscription.endpoint;
  const p256dh   = subscription.keys?.p256dh;
  const auth     = subscription.keys?.auth;
  const subJson  = JSON.stringify(subscription);

  await db.promise().query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, subscription_json)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       p256dh            = VALUES(p256dh),
       auth              = VALUES(auth),
       subscription_json = VALUES(subscription_json),
       updated_at        = NOW()`,
    [userId, endpoint, p256dh, auth, subJson]
  );
};

// Simpan ke tabel notifications
const saveNotification = async (userId, title, body, type = "general", referenceId = null) => {
  try {
    await db.promise().query(
      `INSERT INTO notifications (user_id, title, body, type, reference_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, body, type, referenceId]
    );
  } catch (err) {
    console.error("[push] Gagal simpan notifikasi:", err.message);
  }
};

const sendToUser = async (userId, payload, type = "general", referenceId = null) => {
  const [rows] = await db.promise().query(
    `SELECT id, subscription_json FROM push_subscriptions WHERE user_id = ?`,
    [userId]
  );

  // Simpan ke riwayat notifikasi
  await saveNotification(userId, payload.title, payload.body, type, referenceId);

  for (const row of rows) {
    try {
      await webpush.sendNotification(
        JSON.parse(row.subscription_json),
        JSON.stringify(payload)
      );
    } catch (err) {
      if (err.statusCode === 410) {
        await db.promise().query(
          `DELETE FROM push_subscriptions WHERE id = ?`,
          [row.id]
        );
      } else {
        console.error(`[push] Gagal kirim ke user ${userId}:`, err.message);
      }
    }
  }
};

const sendToUsers = async (userIds, payload, type = "general", referenceId = null) => {
  for (const userId of userIds) {
    await sendToUser(userId, payload, type, referenceId);
  }
};

const sendToAll = async (payload, type = "general") => {
  const [rows] = await db.promise().query(
    `SELECT DISTINCT user_id FROM push_subscriptions`
  );
  await sendToUsers(rows.map(r => r.user_id), payload, type);
};

module.exports = { saveSubscription, sendToUser, sendToAll, sendToUsers };
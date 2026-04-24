const db = require("../db/db");

// ── Mapping: feature key di frontend → permission name di DB ────────────────
// Satu feature key bisa mewakili beberapa permission sekaligus
const FEATURE_TO_PERMS = {
  dashboard:         ["dashboard.view"],
  absensi_view:      ["attendance.view_own", "attendance.view_all"], 
  kegiatan_manage:   ["activities.view", "activities.create", "activities.edit", "activities.delete"],
  piket_manage:      ["duty.view", "duty.manage"],
  akun_manage:       ["users.view", "users.create", "users.edit", "users.delete", "users.reset_password"],
  periode_manage:    ["periods.view", "periods.manage"],
  role_manage:       ["roles.view", "roles.manage"],
  aspirasi_view:     ["aspirasi.view"],
  aspirasi_kategori: ["kategori.view"],
};

// Kebalikannya: permission name → feature key
// (dipakai untuk GET — konversi baris DB ke object feature)
const PERM_TO_FEATURE = {};
for (const [featureKey, permNames] of Object.entries(FEATURE_TO_PERMS)) {
  for (const permName of permNames) {
    PERM_TO_FEATURE[permName] = featureKey;
  }
}

// ── GET /permissions?role_id=X ──────────────────────────────────────────────
// Mengembalikan: { dashboard: true, absensi_view: false, ... }
exports.getPermissionsByRole = (req, res) => {
  const { role_id } = req.query;
  if (!role_id)
    return res.status(400).json({ message: "role_id wajib diisi" });

  const sql = `
    SELECT p.name
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ?
  `;

  db.query(sql, [role_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Gagal ambil permissions", error: err });

    // Kumpulkan feature key mana saja yang sudah punya SEMUA permission-nya
    // Logika: feature = aktif jika MINIMAL SATU permission-nya ada
    const activeFeatures = new Set();
    for (const row of rows) {
      const featureKey = PERM_TO_FEATURE[row.name];
      if (featureKey) activeFeatures.add(featureKey);
    }

    // Buat object lengkap untuk semua feature key
    const result = {};
    for (const featureKey of Object.keys(FEATURE_TO_PERMS)) {
      result[featureKey] = activeFeatures.has(featureKey);
    }

    res.json(result);
  });
};

// ── PUT /permissions ─────────────────────────────────────────────────────────
// Body: { role_id, key, value }
// Toggle satu feature key (aktifkan/cabut semua permission yang terkait)
exports.togglePermission = (req, res) => {
  const { role_id, key, value } = req.body;

  if (!role_id || !key || value === undefined)
    return res.status(400).json({ message: "role_id, key, dan value wajib diisi" });

  const permNames = FEATURE_TO_PERMS[key];
  if (!permNames)
    return res.status(400).json({ message: `Feature key '${key}' tidak dikenal` });

  // Cek role tidak boleh superadmin (proteksi)
  db.query(`SELECT name, is_system FROM roles WHERE id = ?`, [role_id], (err, roles) => {
    if (err) return res.status(500).json({ message: "Gagal cek role", error: err });
    if (roles.length === 0) return res.status(404).json({ message: "Role tidak ditemukan" });
    if (roles[0].name === "superadmin")
      return res.status(403).json({ message: "Permission superadmin tidak dapat diubah" });

    // Ambil permission id berdasarkan nama
    db.query(
      `SELECT id, name FROM permissions WHERE name IN (?)`,
      [permNames],
      (err2, perms) => {
        if (err2) return res.status(500).json({ message: "Gagal cari permissions", error: err2 });

        // Kalau permission belum ada di DB (aspirasi_view dll), insert dulu
        const existingNames = perms.map(p => p.name);
        const missingNames  = permNames.filter(n => !existingNames.includes(n));

        const insertMissing = missingNames.map(
          n => new Promise((resolve, reject) => {
            db.query(
              `INSERT IGNORE INTO permissions (name, label, group_name) VALUES (?, ?, ?)`,
              [n, n, n.split(".")[0]],
              (e) => e ? reject(e) : resolve()
            );
          })
        );

        Promise.all(insertMissing)
          .then(() => {
            // Ambil ulang semua permission id (termasuk yang baru di-insert)
            db.query(
              `SELECT id FROM permissions WHERE name IN (?)`,
              [permNames],
              (err3, allPerms) => {
                if (err3) return res.status(500).json({ message: "Gagal ambil permissions", error: err3 });

                const tasks = allPerms.map(perm =>
                  new Promise((resolve, reject) => {
                    if (value) {
                      db.query(
                        `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
                        [role_id, perm.id],
                        (e) => e ? reject(e) : resolve()
                      );
                    } else {
                      db.query(
                        `DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?`,
                        [role_id, perm.id],
                        (e) => e ? reject(e) : resolve()
                      );
                    }
                  })
                );

                Promise.all(tasks)
                  .then(() => res.json({ message: "Permission berhasil diupdate" }))
                  .catch(e => res.status(500).json({ message: "Gagal update permission", error: e }));
              }
            );
          })
          .catch(e => res.status(500).json({ message: "Gagal insert permission baru", error: e }));
      }
    );
  });
};
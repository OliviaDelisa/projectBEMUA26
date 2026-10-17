const mysql = require("mysql2");
const bcrypt = require("bcrypt");
require("dotenv").config();

// Koneksi sementara khusus untuk setup (bukan pool)
// Karena kita perlu CREATE DATABASE dulu sebelum pilih database-nya
const connection = mysql.createConnection({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

connection.connect(async (err) => {
  if (err) { console.error("Database connection failed:", err); return; }
  console.log("Initializing Database...");

  connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`, (err) => {
    if (err) throw err;

    connection.changeUser({ database: process.env.DB_NAME }, async (err) => {
      if (err) throw err;
      console.log("Using database:", process.env.DB_NAME);

      // ─────────────────────────────────────────────────────────────────────
      // TABLE DEFINITIONS
      // ─────────────────────────────────────────────────────────────────────

      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id                   INT AUTO_INCREMENT PRIMARY KEY,
          name                 VARCHAR(100) NOT NULL,
          nim                  VARCHAR(10)  UNIQUE NOT NULL,
          fakultas             VARCHAR(100) DEFAULT NULL,
          username             VARCHAR(50)  UNIQUE NOT NULL,
          password             VARCHAR(255) NOT NULL,
          photo                VARCHAR(255) DEFAULT 'default.png',
          must_change_password BOOLEAN      DEFAULT FALSE,
          created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;

      const createPeriodsTable = `
        CREATE TABLE IF NOT EXISTS periods (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          name       VARCHAR(100) NOT NULL,
          start_date DATE         NOT NULL,
          end_date   DATE         NOT NULL,
          is_active  BOOLEAN      DEFAULT FALSE,
          created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createRolesTable = `
        CREATE TABLE IF NOT EXISTS roles (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          name        VARCHAR(50)  UNIQUE NOT NULL,
          label       VARCHAR(100) NOT NULL,
          description TEXT         DEFAULT NULL,
          is_system   BOOLEAN      DEFAULT FALSE,
          created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;

      const createPermissionsTable = `
        CREATE TABLE IF NOT EXISTS permissions (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          name       VARCHAR(100) UNIQUE NOT NULL,
          label      VARCHAR(150) NOT NULL,
          path       VARCHAR(100) DEFAULT NULL,
          group_name VARCHAR(50)  DEFAULT NULL,
          created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createRolePermissionsTable = `
        CREATE TABLE IF NOT EXISTS role_permissions (
          role_id       INT NOT NULL,
          permission_id INT NOT NULL,
          PRIMARY KEY (role_id, permission_id),
          FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
          FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
        )
      `;

      const createUserPeriodsTable = `
        CREATE TABLE IF NOT EXISTS user_periods (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          user_id     INT          NOT NULL,
          period_id   INT          NOT NULL,
          role_id     INT          NOT NULL,
          jabatan     VARCHAR(100) NOT NULL,
          kementerian VARCHAR(100) DEFAULT NULL,
          is_active   BOOLEAN      DEFAULT TRUE,
          created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_user_period (user_id, period_id),
          FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
          FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
          FOREIGN KEY (role_id)   REFERENCES roles(id)   ON DELETE RESTRICT
        )
      `;

      const createIgmMembersTable = `
        CREATE TABLE IF NOT EXISTS igm_members (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          user_id     INT          NOT NULL,
          period_id   INT          NOT NULL,
          kementerian VARCHAR(100) NOT NULL,
          is_active   BOOLEAN      DEFAULT TRUE,
          created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_igm_user_period (user_id, period_id),
          FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
          FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE
        )
      `;

      const createSecAttTable = `
        CREATE TABLE IF NOT EXISTS secretariat_attendance (
          id              INT AUTO_INCREMENT PRIMARY KEY,
          user_id         INT           NOT NULL,
          period_id       INT           DEFAULT NULL,
          date            DATE          NOT NULL,
          check_in_time   DATETIME      DEFAULT NULL,
          latitude        DECIMAL(10,8) DEFAULT NULL,
          longitude       DECIMAL(11,8) DEFAULT NULL,
          location_name   VARCHAR(255)  DEFAULT NULL,
          selfie_photo    LONGTEXT      DEFAULT NULL,
          distance_meters INT           DEFAULT NULL,
          status          ENUM('hadir','tidak_hadir','pending','rejected') NOT NULL DEFAULT 'pending',
          created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_user_date (user_id, date),
          FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
          FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE SET NULL
        )
      `;

      const createActivitiesTable = `
        CREATE TABLE IF NOT EXISTS activities (
          id             INT AUTO_INCREMENT PRIMARY KEY,
          title          VARCHAR(200)  NOT NULL,
          description    TEXT          DEFAULT NULL,
          location_name  VARCHAR(255)  NOT NULL,
          latitude       DECIMAL(10,8) DEFAULT NULL,
          longitude      DECIMAL(11,8) DEFAULT NULL,
          radius_meters  INT           DEFAULT 100,
          start_datetime DATETIME      NOT NULL,
          end_datetime   DATETIME      NOT NULL,
          kode_qr        VARCHAR(50)   UNIQUE DEFAULT NULL,
          metode         ENUM('qr','maps','keduanya') DEFAULT 'keduanya',
          audience       VARCHAR(50)   NOT NULL DEFAULT 'bem',
          audience_explicit BOOLEAN    NOT NULL DEFAULT FALSE,
          period_id      INT           DEFAULT NULL,
          created_by     INT           DEFAULT NULL,
          is_active      BOOLEAN       DEFAULT TRUE,
          created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
          updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (period_id)  REFERENCES periods(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id)   ON DELETE SET NULL
        )
      `;

      const createActAttTable = `
        CREATE TABLE IF NOT EXISTS activity_attendance (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          activity_id   INT           NOT NULL,
          user_id       INT           NOT NULL,
          member_type   VARCHAR(20)   NOT NULL DEFAULT 'bem',
          check_in_time DATETIME      DEFAULT NULL,
          latitude      DECIMAL(10,8) DEFAULT NULL,
          longitude     DECIMAL(11,8) DEFAULT NULL,
          location_name VARCHAR(255)  DEFAULT NULL,
          selfie_photo  LONGTEXT      DEFAULT NULL,
          status        ENUM('hadir','tidak_hadir','pending','rejected') NOT NULL DEFAULT 'pending',
          created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_activity_user (activity_id, user_id),
          FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE
        )
      `;

      const createDutyTable = `
        CREATE TABLE IF NOT EXISTS duty_schedules (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          kementerian VARCHAR(100) NOT NULL,
          menko        VARCHAR(100) NOT NULL,
          duty_date   DATE         NOT NULL,
          period_id   INT          DEFAULT NULL,
          created_by  INT          DEFAULT NULL,
          created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (period_id)  REFERENCES periods(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id)   ON DELETE SET NULL
        )
      `;

      const createNotifTable = `
        CREATE TABLE IF NOT EXISTS notifications (
          id           INT AUTO_INCREMENT PRIMARY KEY,
          user_id      INT          DEFAULT NULL,
          title        VARCHAR(200) NOT NULL,
          body         TEXT         NOT NULL,
          type         ENUM('general','activity','duty','attendance') DEFAULT 'general',
          reference_id INT          DEFAULT NULL,
          is_read      BOOLEAN      DEFAULT FALSE,
          created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;
      const createPushSubsTable = `
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      user_id           INT  NOT NULL,
      endpoint          TEXT NOT NULL,
      p256dh            TEXT,
      auth              TEXT,
      subscription_json TEXT NOT NULL,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_endpoint (user_id, endpoint(200)),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;

const createKategoriAspirasiTable = `
  CREATE TABLE IF NOT EXISTS kategori_aspirasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_kategori VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

const createAspirasiTable = `
  CREATE TABLE IF NOT EXISTS aspirasi (
    id INT AUTO_INCREMENT PRIMARY KEY,

    nama VARCHAR(100) DEFAULT NULL,
    fakultas VARCHAR(100) NOT NULL,

    kategori_id INT NOT NULL,

    isi TEXT NOT NULL,

    foto TEXT DEFAULT NULL, 

    status ENUM(
      'baru',
      'dibaca',
      'diproses',
      'selesai'
    ) DEFAULT 'baru',

    prioritas ENUM(
      'normal',
      'urgent'
    ) DEFAULT 'normal',

    catatan_internal TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (kategori_id)
      REFERENCES kategori_aspirasi(id)
      ON DELETE RESTRICT
  )
`;

      const createContentsTable = `
        CREATE TABLE IF NOT EXISTS contents (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          content_type  ENUM('event','announcement','gallery') NOT NULL,
          title         VARCHAR(200) NOT NULL,
          description   TEXT DEFAULT NULL,
          event_start   DATETIME DEFAULT NULL,
          event_end     DATETIME DEFAULT NULL,
          cover_image   VARCHAR(255) DEFAULT NULL,
          images        JSON DEFAULT NULL,
          is_published  BOOLEAN DEFAULT FALSE,
          created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;

      
      const createArticlesTable = `
        CREATE TABLE IF NOT EXISTS articles (
          id           INT AUTO_INCREMENT PRIMARY KEY,
          title        VARCHAR(255) NOT NULL,
          slug         VARCHAR(280) NOT NULL UNIQUE,
          excerpt      TEXT NOT NULL,
          content      LONGTEXT NOT NULL,
          thumbnail    VARCHAR(255) DEFAULT NULL,
          tags         JSON DEFAULT NULL,
          status       ENUM('draft', 'published')
                       NOT NULL DEFAULT 'draft',
          published_at DATETIME DEFAULT NULL,
          created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_articles_status (status),
          INDEX idx_articles_published_at (published_at)
        ) ENGINE=InnoDB
          DEFAULT CHARSET=utf8mb4
          COLLATE=utf8mb4_unicode_ci
      `;


      // ─────────────────────────────────────────────────────────────────────
      // RUN ALL CREATE TABLE QUERIES
      // ─────────────────────────────────────────────────────────────────────

      const queries = [
        { sql: createUsersTable,           name: "users"                  },
        { sql: createPeriodsTable,         name: "periods"                },
        { sql: createRolesTable,           name: "roles"                  },
        { sql: createPermissionsTable,     name: "permissions"            },
        { sql: createRolePermissionsTable, name: "role_permissions"       },
        { sql: createUserPeriodsTable,     name: "user_periods"           },
        { sql: createIgmMembersTable,      name: "igm_members"            },
        { sql: createSecAttTable,          name: "secretariat_attendance" },
        { sql: createActivitiesTable,      name: "activities"             },
        { sql: createActAttTable,          name: "activity_attendance"    },
        { sql: createDutyTable,            name: "duty_schedules"         },
        { sql: createNotifTable,           name: "notifications"          },
        { sql: createPushSubsTable, name: "push_subscriptions" },

        { sql: createKategoriAspirasiTable, name: "kategori_aspirasi"     },
        { sql: createAspirasiTable,         name: "aspirasi"              },
        { sql: createContentsTable,         name: "contents"              },
        { sql: createArticlesTable,         name: "articles"              },
      ];

      const runQueries = (index) => {
        if (index >= queries.length) { migrateUserAcademicFields(); return; }
        const { sql, name } = queries[index];
        connection.query(sql, (err) => {
          if (err) throw err;
          console.log(`  ✓ Table '${name}' ready`);
          runQueries(index + 1);
        });
      };

      const migrateUserAcademicFields = () => {
        connection.query("SHOW COLUMNS FROM users", (err, columns) => {
          if (err) throw err;
          const existingColumns = new Set(columns.map(column => column.Field));
          const missingColumns = [
            ["fakultas", "ALTER TABLE users ADD COLUMN fakultas VARCHAR(100) DEFAULT NULL"],
          ].filter(([column]) => !existingColumns.has(column));

          const addNextColumn = (index) => {
            if (index >= missingColumns.length) { migrateIgmMembershipIndex(); return; }
            connection.query(missingColumns[index][1], (alterErr) => {
              if (alterErr) throw alterErr;
              addNextColumn(index + 1);
            });
          };
          addNextColumn(0);
        });
      };

      const migrateIgmMembershipIndex = () => {
        connection.query("SHOW INDEX FROM igm_members", (err, indexes) => {
          if (err) throw err;
          const hasPeriodUnique = indexes.some(index => index.Key_name === "uq_igm_user_period");
          const hasLegacyUnique = indexes.some(index =>
            index.Key_name === "user_id" && Number(index.Non_unique) === 0
          );

          const dropLegacyIndex = () => {
            if (!hasLegacyUnique) { migrateActivityAudience(); return; }
            connection.query("ALTER TABLE igm_members DROP INDEX user_id", (dropErr) => {
              if (dropErr) throw dropErr;
              console.log("  ✓ IGM membership now supports multiple periods");
              migrateActivityAudience();
            });
          };

          if (hasPeriodUnique) { dropLegacyIndex(); return; }
          connection.query(
            "ALTER TABLE igm_members ADD UNIQUE KEY uq_igm_user_period (user_id, period_id)",
            (addErr) => {
              if (addErr) throw addErr;
              dropLegacyIndex();
            }
          );
        });
      };

      const migrateActivityAudience = () => {
        const ensureColumn = (table, column, definition, done) => {
          connection.query(`SHOW COLUMNS FROM ${table}`, (err, columns) => {
            if (err) throw err;
            if (columns.some(item => item.Field === column)) { done(false); return; }
            connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, alterErr => {
              if (alterErr) throw alterErr;
              console.log(`  ✓ Column '${table}.${column}' ready`);
              done(true);
            });
          });
        };

        ensureColumn("activities", "audience", "VARCHAR(50) NOT NULL DEFAULT 'bem'", audienceAdded => {
          ensureColumn("activity_attendance", "member_type", "VARCHAR(20) NOT NULL DEFAULT 'bem'", memberTypeAdded => {
            ensureColumn("activities", "audience_explicit", "BOOLEAN NOT NULL DEFAULT FALSE", explicitAdded => {
              if (!audienceAdded && !memberTypeAdded && !explicitAdded) { seedDefaultData(); return; }

              const finishMigration = () => {
                if (!memberTypeAdded) { seedDefaultData(); return; }
                connection.query(
                  `UPDATE activity_attendance aa
                   JOIN activities a ON a.id = aa.activity_id
                   JOIN igm_members im ON im.user_id = aa.user_id
                     AND (a.period_id IS NULL OR im.period_id = a.period_id)
                   SET aa.member_type = 'igm'
                   WHERE aa.member_type = 'bem'`,
                  backfillErr => {
                    if (backfillErr) throw backfillErr;
                    seedDefaultData();
                  }
                );
              };

              connection.query(
                `DELETE aa FROM activity_attendance aa
                 JOIN activities a ON a.id = aa.activity_id
                 WHERE a.audience_explicit = FALSE AND a.audience = 'bem,igm'
                   AND aa.member_type = 'igm'
                   AND aa.check_in_time IS NULL`,
                deleteErr => {
                  if (deleteErr) throw deleteErr;
                  connection.query(
                    "UPDATE activities SET audience = 'bem', audience_explicit = TRUE WHERE audience_explicit = FALSE AND audience = 'bem,igm'",
                    updateErr => {
                      if (updateErr) throw updateErr;
                      connection.query(
                        "UPDATE activities SET audience_explicit = TRUE WHERE audience_explicit = FALSE AND audience <> 'bem,igm'",
                        markErr => {
                          if (markErr) throw markErr;
                          finishMigration();
                        }
                      );
                    }
                  );
                }
              );
            });
          });
        });
      };

      // ─────────────────────────────────────────────────────────────────────
      // SEED DEFAULT DATA
      // ─────────────────────────────────────────────────────────────────────

      const seedDefaultData = async () => {
        try {
          const query = (sql, params = []) =>
            new Promise((res, rej) =>
              connection.query(sql, params, (err, result) =>
                err ? rej(err) : res(result)
              )
            );

          console.log("\nSeeding default data...");

          
         const periods         = await query(`SELECT id FROM periods LIMIT 1`);
          const defaultPeriodId = periods[0]?.id;
          console.log("  ✓ Default period seeded");
          // ── 2. Roles ──────────────────────────────────────────────────────
          const defaultRoles = [
            {
              name:        "superadmin",
              label:       "SuperAdmin",
              description: "Akses penuh ke seluruh sistem termasuk kelola role & periode",
              is_system:   true,
            },
            {
              name:        "admin",
              label:       "Admin",
              description: "Hak akses dikonfigurasi dinamis oleh superadmin",
              is_system:   true,
            },
            {
              name:        "user",
              label:       "Anggota",
              description: "Hanya bisa akses Home (/home) dan Riwayat Absensi (/riwayat-absensi)",
              is_system:   true,
            },
          ];

          for (const role of defaultRoles) {
            await query(
              `INSERT IGNORE INTO roles (name, label, description, is_system) VALUES (?, ?, ?, ?)`,
              [role.name, role.label, role.description, role.is_system]
            );
          }
          console.log("  ✓ Default roles seeded");

          // ── Default Kategori Aspirasi ─────────────────────────────

const defaultKategoriAspirasi = [
  "Akademik",
  "Fasilitas Kampus",
  "Pelayanan Fakultas",
  "Organisasi Mahasiswa",
  "Keuangan",
  "Lainnya"
];

for (const kategori of defaultKategoriAspirasi) {
  await query(
    `INSERT IGNORE INTO kategori_aspirasi (nama_kategori)
     VALUES (?)`,
    [kategori]
  );
}

console.log("  ✓ Default kategori aspirasi seeded");

          const rolesResult = await query(`SELECT id, name FROM roles`);
          const roleMap     = Object.fromEntries(rolesResult.map(r => [r.name, r.id]));

          // ── 3. Permissions ────────────────────────────────────────────────
          //
          // Konvensi: <grup>.<aksi>
          //
          // Kolom `path` → path halaman utama yang direpresentasikan permission ini.
          //                Frontend pakai ini untuk:
          //                  - Render sidebar item
          //                  - Guard route (redirect jika tidak punya permission)
          //                  - Tampilkan/sembunyikan tombol aksi (tambah/edit/hapus/export)
          //
          // Role USER hanya punya 2 permission:
          //   attendance.view_own  → /home
          //   attendance.history   → /riwayat-absensi
          //
          // Role ADMIN permission-nya diatur dinamis oleh superadmin lewat UI.
          // Default seed di bawah memberi admin semua permission kecuali
          // roles.manage dan periods.manage (hak superadmin).
          // Superadmin bisa ubah kapan saja lewat halaman kelola role.
          //
          const defaultPermissions = [
            // ── Dashboard ─────────────────────────────────────────────────────
            { name: "dashboard.view",             label: "Lihat Dashboard",                        path: "/dashboard",          group_name: "dashboard"     },

            // ── Kelola Anggota ────────────────────────────────────────────────
            { name: "users.view",                 label: "Lihat Data Anggota",                     path: "/akun",               group_name: "users"         },
            { name: "users.create",               label: "Tambah Anggota",                         path: null,                  group_name: "users"         },
            { name: "users.edit",                 label: "Edit Data Anggota",                      path: null,                  group_name: "users"         },
            { name: "users.delete",               label: "Hapus Anggota",                          path: null,                  group_name: "users"         },
            { name: "users.reset_password",       label: "Reset Password Anggota",                 path: null,                  group_name: "users"         },
            { name: "igm_members.view",            label: "Kelola Akun Anggota IGM",                path: "/akun-igm",           group_name: "users"         },

            // ── Role & Permission (superadmin only) ───────────────────────────
            { name: "roles.view",                 label: "Lihat Role & Permission",                path: "/role",               group_name: "roles"         },
            { name: "roles.manage",               label: "Kelola Role & Permission",               path: null,                  group_name: "roles"         },

            // ── Periode (superadmin only) ─────────────────────────────────────
            { name: "periods.view",               label: "Lihat Periode",                          path: "/periode",            group_name: "periods"       },
            { name: "periods.manage",             label: "Kelola Periode",                         path: null,                  group_name: "periods"       },

            // ── Absensi Sekretariat ───────────────────────────────────────────
            // view_own    → /home            (absen harian)         — USER & ADMIN
            // history     → /riwayat-absensi (riwayat absensi diri) — USER & ADMIN
            // view_all    → /absensi         (rekap semua anggota)  — ADMIN only
            // manage      → approve/reject/edit status              — ADMIN only
            { name: "attendance.view_own",        label: "Absen Harian (Home)",                    path: "/home",               group_name: "attendance"    },
            { name: "attendance.history",         label: "Riwayat Absensi Sendiri",                path: "/riwayat-absensi",    group_name: "attendance"    },
            { name: "attendance.view_all",        label: "Lihat Semua Absensi Anggota",            path: "/absensi",            group_name: "attendance"    },
            { name: "attendance.igm.view",        label: "Kelola Absensi IGM",                     path: "/absensi-igm",        group_name: "attendance"    },
            { name: "attendance.manage",          label: "Kelola Status Absensi",                  path: null,                  group_name: "attendance"    },

            // ── Kegiatan ──────────────────────────────────────────────────────
            { name: "activities.view",            label: "Lihat Kegiatan",                         path: "/kegiatan",           group_name: "activities"    },
            { name: "activities.view_attendance", label: "Lihat Absensi Semua Anggota per Kegiatan", path: null,                group_name: "activities"    },
            { name: "activities.create",          label: "Buat Kegiatan",                          path: null,                  group_name: "activities"    },
            { name: "activities.edit",            label: "Edit Kegiatan",                          path: null,                  group_name: "activities"    },
            { name: "activities.delete",          label: "Hapus Kegiatan",                         path: null,                  group_name: "activities"    },

            // ── Jadwal Piket ──────────────────────────────────────────────────
            { name: "duty.view",                  label: "Lihat Jadwal Piket",                     path: "/piket",              group_name: "duty"          },
            { name: "duty.manage",                label: "Kelola Jadwal Piket",                    path: null,                  group_name: "duty"          },

            // ── Laporan ───────────────────────────────────────────────────────
            { name: "reports.view",               label: "Lihat Laporan",                          path: "/laporan",            group_name: "reports"       },
            { name: "reports.export",             label: "Export Laporan (PDF/Excel)",              path: null,                  group_name: "reports"       },

            // ── Notifikasi ────────────────────────────────────────────────────
            { name: "notifications.send",         label: "Kirim Notifikasi ke Anggota",            path: null,                  group_name: "notifications" },

            // ── Aspirasi ─────────────────────────────────────────────────────
            { name: "aspirasi.view",              label: "Lihat & Kirim Aspirasi",                 path: "/aspirasi",           group_name: "aspirasi"      },
            { name: "aspirasi.manage",            label: "Kelola Aspirasi",                        path: null,                  group_name: "aspirasi"      },
            { name: "kategori.view",              label: "Lihat Kategori Aspirasi",                path: "/aspirasi/kategori",  group_name: "aspirasi"      },
            { name: "kategori.manage",            label: "Kelola Kategori Aspirasi",               path: null,                  group_name: "aspirasi"      },

            // ── Manajemen Konten ────────────────────────────────────────────
            { name: "content.view",               label: "Lihat Manajemen Konten",                 path: "/konten",              group_name: "content"       },
            { name: "content.manage",             label: "Kelola Event, Pengumuman & Galeri",      path: null,                   group_name: "content"       },
            { name: "article.view",               label: "Lihat Manajemen Artikel",                path: "/artikel-admin",       group_name: "content",      },
            { name: "article.manage",             label: "Kelola Artikel",                         path: null,                   group_name: "content",      },
          ];

          for (const perm of defaultPermissions) {
            await query(
              `INSERT IGNORE INTO permissions (name, label, path, group_name) VALUES (?, ?, ?, ?)`,
              [perm.name, perm.label, perm.path, perm.group_name]
            );
          }
          console.log("  ✓ Default permissions seeded");

          const permsResult = await query(`SELECT id, name FROM permissions`);
          const permMap     = Object.fromEntries(permsResult.map(p => [p.name, p.id]));

          // ── 4. Role ↔ Permission mapping ──────────────────────────────────
          const rolePermissions = {
            // Superadmin: semua permission tanpa terkecuali
            superadmin: Object.keys(permMap),

            // Admin: semua kecuali roles.manage & periods.manage
            // → ini hanya nilai DEFAULT saat seed pertama kali.
            //   Superadmin bisa ubah kapan saja lewat UI kelola role.
            admin: [
              "dashboard.view",
              "users.view", "users.create", "users.edit", "users.delete", "users.reset_password",
              "igm_members.view",
              "roles.view",
              "periods.view",
              "attendance.view_own", "attendance.history",
              "attendance.view_all", "attendance.igm.view", "attendance.manage",
              "activities.view", "activities.view_attendance",
              "activities.create", "activities.edit", "activities.delete",
              "duty.view", "duty.manage",
              "reports.view", "reports.export",
              "notifications.send",
              "aspirasi.view", "aspirasi.manage",
              "kategori.view", "kategori.manage",
              "content.view", "content.manage",
              "article.view", "article.manage",
            ],

            // User: HANYA dua halaman ini, tidak lebih.
            user: [
              "attendance.view_own",  // → /home (absen harian)
              "attendance.history",   // → /riwayat-absensi
            ],
          };

          const existingPermissionAssignments = await query(
            `SELECT COUNT(*) AS total FROM role_permissions`
          );
          if (Number(existingPermissionAssignments[0].total) === 0) {
            for (const [roleName, permNames] of Object.entries(rolePermissions)) {
              const roleId = roleMap[roleName];
              if (!roleId) continue;
              for (const permName of permNames) {
                const permId = permMap[permName];
                if (!permId) {
                  console.warn(`  ⚠  Permission tidak ditemukan: ${permName}`);
                  continue;
                }
                await query(
                  `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
                  [roleId, permId]
                );
              }
            }
            console.log("  ✓ Default role permissions seeded");
          } else {
            console.log("  ✓ Existing role permissions preserved");
          }

          // ── 5. Users ──────────────────────────────────────────────────────
          const superadminPassword = await bcrypt.hash("superadmin123", 10);
          const adminPassword      = await bcrypt.hash("admin123", 10);
          const userPassword       = await bcrypt.hash("user123", 10);

          // ✅ KODE BARU - aman dari duplicate
const defaultUsers = [
  { name: 'Super Admin BEM', nim: '0000000001', username: 'superadmin', password: superadminPassword },      
];

for (const u of defaultUsers) {
  await query(
    `INSERT IGNORE INTO users (name, nim, username, password, must_change_password)
     VALUES (?, ?, ?, ?, FALSE)`,
    [u.name, u.nim, u.username, u.password]
  );
}
console.log("  ✓ Default users seeded");

          // ── 6. User Periods ───────────────────────────────────────────────
          if (defaultPeriodId) {
            const users = await query(`
              SELECT id, username FROM users
              WHERE username IN ('superadmin', 'admin', 'olivia')
            `);

            const jabatanMap = {
              superadmin: { jabatan: "Koordinator Pusat", kementerian: null,                 roleName: "superadmin" },
              admin:      { jabatan: "Sekretaris",        kementerian: null,                 roleName: "admin"      },
              olivia:     { jabatan: "Staff Ahli",        kementerian: "Riset dan Keilmuan", roleName: "user"       },
            };

            for (const user of users) {
              const info = jabatanMap[user.username];
              if (!info) continue;
              const roleId = roleMap[info.roleName];
              await query(
                `INSERT IGNORE INTO user_periods
                   (user_id, period_id, role_id, jabatan, kementerian, is_active)
                 VALUES (?, ?, ?, ?, ?, TRUE)`,
                [user.id, defaultPeriodId, roleId, info.jabatan, info.kementerian]
              );
            }
            console.log("  ✓ User periods seeded");
          }

          const activePeriods = await query("SELECT id FROM periods WHERE is_active = TRUE LIMIT 1");
          const activePeriodId = activePeriods[0]?.id;
          if (activePeriodId) {
            await query("UPDATE activities SET period_id = ? WHERE period_id IS NULL AND end_datetime >= NOW()", [activePeriodId]);
            await query(
              `INSERT IGNORE INTO activity_attendance (activity_id, user_id, member_type, status)
               SELECT a.id, im.user_id, 'igm', 'tidak_hadir'
               FROM activities a
               JOIN igm_members im ON im.period_id = a.period_id AND im.is_active = TRUE
               WHERE FIND_IN_SET('igm', a.audience) > 0 AND a.end_datetime >= NOW()`
            );
            await query(
              `INSERT IGNORE INTO activity_attendance (activity_id, user_id, member_type, status)
               SELECT a.id, up.user_id, 'bem', 'tidak_hadir'
               FROM activities a
               JOIN user_periods up ON up.period_id = a.period_id AND up.is_active = TRUE
               WHERE (FIND_IN_SET('bem', a.audience) > 0
                 OR (FIND_IN_SET('sekretaris', a.audience) > 0 AND LOWER(up.jabatan) = 'sekretaris menteri'))
                 AND a.end_datetime >= NOW()
                 AND NOT (FIND_IN_SET('igm', a.audience) > 0 AND EXISTS (
                   SELECT 1 FROM igm_members im
                   WHERE im.user_id = up.user_id AND im.period_id = up.period_id AND im.is_active = TRUE
                 ))`
            );
          }

          // ─────────────────────────────────────────────────────────────────
          console.log("\n═══════════════════════════════════════════════════════════");
          console.log("  ✅  Database initialized successfully!");
          console.log("───────────────────────────────────────────────────────────");
          console.log("  Default accounts:");
          console.log("    Superadmin  →  superadmin  /  superadmin123");
          console.log("    Admin       →  admin       /  admin123");
          console.log("    User        →  olivia      /  user123");
          console.log("───────────────────────────────────────────────────────────");
          console.log("  Akses setelah login:");
          console.log("    superadmin  →  /dashboard  (semua menu)");
          console.log("    admin       →  /dashboard  (dikonfigurasi superadmin)");
          console.log("    user        →  /home & /riwayat-absensi SAJA");
          console.log("═══════════════════════════════════════════════════════════\n");

          connection.end();
        } catch (error) {
          console.error("Error seeding default data:", error);
          connection.end();
        }
      };

      runQueries(0);
    });
  });
});
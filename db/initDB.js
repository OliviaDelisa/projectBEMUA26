const mysql = require("mysql2");
require("dotenv").config();
const bcrypt = require("bcrypt");

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

      // ─── TABLE: users ────────────────────────────────────────────────────
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id                   INT AUTO_INCREMENT PRIMARY KEY,
          name                 VARCHAR(100) NOT NULL,
          nim                  VARCHAR(10) UNIQUE NOT NULL,
          username             VARCHAR(50) UNIQUE NOT NULL,
          password             VARCHAR(255) NOT NULL,
          photo                VARCHAR(255) DEFAULT 'default.png',
          must_change_password BOOLEAN DEFAULT FALSE,
          created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;

      // ─── TABLE: periods ──────────────────────────────────────────────────
      const createPeriodsTable = `
        CREATE TABLE IF NOT EXISTS periods (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          name       VARCHAR(100) NOT NULL,
          start_date DATE NOT NULL,
          end_date   DATE NOT NULL,
          is_active  BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // ─── TABLE: roles ────────────────────────────────────────────────────
      // is_system = TRUE berarti role tidak bisa dihapus (built-in)
      const createRolesTable = `
        CREATE TABLE IF NOT EXISTS roles (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          name        VARCHAR(50) UNIQUE NOT NULL,
          label       VARCHAR(100) NOT NULL,
          description TEXT DEFAULT NULL,
          is_system   BOOLEAN DEFAULT FALSE,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;

      // ─── TABLE: permissions ──────────────────────────────────────────────
      // group_name dipakai untuk grouping di UI
      const createPermissionsTable = `
        CREATE TABLE IF NOT EXISTS permissions (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          name       VARCHAR(100) UNIQUE NOT NULL,
          label      VARCHAR(150) NOT NULL,
          path       VARCHAR(100) DEFAULT NULL,
          group_name VARCHAR(50) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // ─── TABLE: role_permissions ─────────────────────────────────────────
      const createRolePermissionsTable = `
        CREATE TABLE IF NOT EXISTS role_permissions (
          role_id       INT NOT NULL,
          permission_id INT NOT NULL,
          PRIMARY KEY (role_id, permission_id),
          FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
          FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
        )
      `;

      // ─── TABLE: user_periods ─────────────────────────────────────────────
      const createUserPeriodsTable = `
        CREATE TABLE IF NOT EXISTS user_periods (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          user_id     INT NOT NULL,
          period_id   INT NOT NULL,
          role_id     INT NOT NULL,
          jabatan     VARCHAR(100) NOT NULL,
          kementerian VARCHAR(100) DEFAULT NULL,
          is_active   BOOLEAN DEFAULT TRUE,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_user_period (user_id, period_id),
          FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
          FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
          FOREIGN KEY (role_id)   REFERENCES roles(id)   ON DELETE RESTRICT
        )
      `;

      // ─── TABLE: secretariat_attendance ───────────────────────────────────
      const createSecAttTable = `
        CREATE TABLE IF NOT EXISTS secretariat_attendance (
          id              INT AUTO_INCREMENT PRIMARY KEY,
          user_id         INT NOT NULL,
          period_id       INT DEFAULT NULL,
          date            DATE NOT NULL,
          check_in_time   DATETIME DEFAULT NULL,
          latitude        DECIMAL(10, 8) DEFAULT NULL,
          longitude       DECIMAL(11, 8) DEFAULT NULL,
          location_name   VARCHAR(255) DEFAULT NULL,
          selfie_photo    LONGTEXT DEFAULT NULL,
          distance_meters INT DEFAULT NULL,
          status          ENUM('hadir', 'tidak_hadir') NOT NULL DEFAULT 'hadir',
          created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_user_date (user_id, date),
          FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
          FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE SET NULL
        )
      `;

      // ─── TABLE: activities ───────────────────────────────────────────────
      const createActivitiesTable = `
        CREATE TABLE IF NOT EXISTS activities (
          id             INT AUTO_INCREMENT PRIMARY KEY,
          title          VARCHAR(200) NOT NULL,
          description    TEXT DEFAULT NULL,
          location_name  VARCHAR(255) NOT NULL,
          latitude       DECIMAL(10, 8) DEFAULT NULL,
          longitude      DECIMAL(11, 8) DEFAULT NULL,
          radius_meters  INT DEFAULT 100,
          start_datetime DATETIME NOT NULL,
          end_datetime   DATETIME NOT NULL,
          period_id      INT DEFAULT NULL,
          created_by     INT DEFAULT NULL,
          is_active      BOOLEAN DEFAULT TRUE,
          created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (period_id)  REFERENCES periods(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id)   ON DELETE SET NULL
        )
      `;

      // ─── TABLE: activity_attendance ──────────────────────────────────────
      const createActAttTable = `
        CREATE TABLE IF NOT EXISTS activity_attendance (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          activity_id   INT NOT NULL,
          user_id       INT NOT NULL,
          check_in_time DATETIME DEFAULT NULL,
          latitude      DECIMAL(10, 8) DEFAULT NULL,
          longitude     DECIMAL(11, 8) DEFAULT NULL,
          location_name VARCHAR(255) DEFAULT NULL,
          selfie_photo  LONGTEXT DEFAULT NULL,
          status        ENUM('hadir', 'tidak_hadir') NOT NULL DEFAULT 'hadir',
          created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_activity_user (activity_id, user_id),
          FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE
        )
      `;

      // ─── TABLE: duty_schedules ───────────────────────────────────────────
      const createDutyTable = `
        CREATE TABLE IF NOT EXISTS duty_schedules (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          kementerian VARCHAR(100) NOT NULL,
          menko       VARCHAR(100) DEFAULT NULL,
          duty_date   DATE NOT NULL,
          period_id   INT DEFAULT NULL,
          created_by  INT DEFAULT NULL,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (period_id)  REFERENCES periods(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id)   ON DELETE SET NULL
        )
      `;

      // ─── TABLE: notifications ────────────────────────────────────────────
      const createNotifTable = `
        CREATE TABLE IF NOT EXISTS notifications (
          id           INT AUTO_INCREMENT PRIMARY KEY,
          user_id      INT DEFAULT NULL,
          title        VARCHAR(200) NOT NULL,
          body         TEXT NOT NULL,
          type         ENUM('general', 'activity', 'duty', 'attendance') DEFAULT 'general',
          reference_id INT DEFAULT NULL,
          is_read      BOOLEAN DEFAULT FALSE,
          created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;

      // ─── Urutan tabel harus sesuai dependensi FK ─────────────────────────
      const queries = [
        { sql: createUsersTable,           name: "users"                  },
        { sql: createPeriodsTable,         name: "periods"                },
        { sql: createRolesTable,           name: "roles"                  },
        { sql: createPermissionsTable,     name: "permissions"            },
        { sql: createRolePermissionsTable, name: "role_permissions"       },
        { sql: createUserPeriodsTable,     name: "user_periods"           },
        { sql: createSecAttTable,          name: "secretariat_attendance" },
        { sql: createActivitiesTable,      name: "activities"             },
        { sql: createActAttTable,          name: "activity_attendance"    },
        { sql: createDutyTable,            name: "duty_schedules"         },
        { sql: createNotifTable,           name: "notifications"          },
      ];

      const runQueries = (index) => {
        if (index >= queries.length) { seedDefaultData(); return; }
        const { sql, name } = queries[index];
        connection.query(sql, (err) => {
          if (err) throw err;
          console.log(`Table '${name}' is ready`);
          runQueries(index + 1);
        });
      };

      // ═══════════════════════════════════════════════════════════════════════
      //  SEED DATA
      // ═══════════════════════════════════════════════════════════════════════
      const seedDefaultData = async () => {
        try {
          const query = (sql, params = []) =>
            new Promise((res, rej) =>
              connection.query(sql, params, (err, result) => err ? rej(err) : res(result))
            );

          // ── 1. Seed periode default ────────────────────────────────────────
          await query(`
            INSERT INTO periods (name, start_date, end_date, is_active)
            SELECT * FROM (SELECT 'Kepengurusan 2025/2026', '2025-01-01', '2026-12-31', TRUE) AS tmp
            WHERE NOT EXISTS (SELECT id FROM periods WHERE name = 'Kepengurusan 2025/2026')
          `);
          const periods = await query(`SELECT id FROM periods LIMIT 1`);
          const defaultPeriodId = periods[0]?.id;
          console.log("✓ Default period seeded");

          // ── 2. Seed roles ─────────────────────────────────────────────────
          const defaultRoles = [
            { name: "superadmin", label: "Super Administrator", description: "Akses penuh ke seluruh sistem",         is_system: true },
            { name: "admin",      label: "Administrator",       description: "Kelola anggota, kegiatan, dan laporan", is_system: true },
            { name: "user",       label: "Anggota",             description: "Akses dasar untuk anggota biasa",       is_system: true },
          ];

          for (const role of defaultRoles) {
            await query(`
              INSERT IGNORE INTO roles (name, label, description, is_system)
              VALUES (?, ?, ?, ?)
            `, [role.name, role.label, role.description, role.is_system]);
          }
          console.log("✓ Default roles seeded");

          const rolesResult = await query(`SELECT id, name FROM roles`);
          const roleMap = Object.fromEntries(rolesResult.map(r => [r.name, r.id]));

          // ── 3. Seed permissions ───────────────────────────────────────────
          const defaultPermissions = [
            // ── Dashboard ──
            { name: "dashboard.view",          label: "Lihat Dashboard",            path: "/dashboard",         group_name: "dashboard"     },

            // ── Users ──
            { name: "users.view",              label: "Lihat Data Anggota",          path: "/akun",              group_name: "users"         },
            { name: "users.create",            label: "Tambah Anggota",              path: null,                 group_name: "users"         },
            { name: "users.edit",              label: "Edit Data Anggota",           path: null,                 group_name: "users"         },
            { name: "users.delete",            label: "Hapus Anggota",               path: null,                 group_name: "users"         },
            { name: "users.reset_password",    label: "Reset Password Anggota",      path: null,                 group_name: "users"         },

            // ── Roles ──
            { name: "roles.view",              label: "Lihat Hak Akses",             path: "/role",              group_name: "roles"         },
            { name: "roles.manage",            label: "Kelola Role & Permission",    path: null,                 group_name: "roles"         },

            // ── Periods ──
            { name: "periods.view",            label: "Lihat Periode",               path: "/periode",           group_name: "periods"       },
            { name: "periods.manage",          label: "Kelola Periode",              path: null,                 group_name: "periods"       },

            // ── Attendance ──
            { name: "attendance.view_own",     label: "Lihat Absensi Sendiri",       path: "/absensi",           group_name: "attendance"    },
            { name: "attendance.view_all",     label: "Lihat Semua Absensi",         path: null,                 group_name: "attendance"    },
                      

            
            // ── Activities ──
            { name: "activities.view",         label: "Lihat Kegiatan",              path: "/kegiatan",          group_name: "activities"    },
            { name: "activities.create",       label: "Buat Kegiatan",               path: null,                 group_name: "activities"    },
            { name: "activities.edit",         label: "Edit Kegiatan",               path: null,                 group_name: "activities"    },
            { name: "activities.delete",       label: "Hapus Kegiatan",              path: null,                 group_name: "activities"    },

            // ── Duty ──
            { name: "duty.view",               label: "Lihat Jadwal Piket",          path: "/piket",             group_name: "duty"          },
            { name: "duty.manage",             label: "Kelola Jadwal Piket",         path: null,                 group_name: "duty"          },

            // ── Reports ──
            { name: "reports.view",            label: "Lihat Laporan",               path: null,                 group_name: "reports"       },
            { name: "reports.export",          label: "Export Laporan (PDF/Excel)",  path: null,                 group_name: "reports"       },

            // ── Notifications ──
            { name: "notifications.send",      label: "Kirim Notifikasi",            path: null,                 group_name: "notifications" },

            // ── Aspirasi ──
            { name: "aspirasi.view",           label: "Lihat Aspirasi",              path: "/aspirasi",          group_name: "aspirasi"      },
            { name: "kategori.view",           label: "Lihat Kategori",              path: "/aspirasi/kategori", group_name: "aspirasi"      },
          ];

          for (const perm of defaultPermissions) {
            await query(`
              INSERT IGNORE INTO permissions (name, label, path, group_name)
              VALUES (?, ?, ?, ?)
            `, [perm.name, perm.label, perm.path, perm.group_name]);
          }
          console.log("✓ Default permissions seeded");

          const permsResult = await query(`SELECT id, name FROM permissions`);
          const permMap = Object.fromEntries(permsResult.map(p => [p.name, p.id]));

          // ── 4. Assign permissions ke setiap role ──────────────────────────
          const rolePermissions = {
            superadmin: Object.keys(permMap),

            admin: [
              "users.view", "users.create", "users.edit", "users.delete", "users.reset_password",
              "roles.view",
              "periods.view",
              "attendance.view_own", "attendance.view_all", "attendance.manage",
              "activities.view", "activities.create", "activities.edit", "activities.delete",
              "duty.view", "duty.manage",
              "reports.view", "reports.export",
              "notifications.send",
              "aspirasi.view", "kategori.view",
            ],

            user: [
              "attendance.view_own",
              "activities.view",
              "duty.view",
              "aspirasi.view",
            ],
          };

          for (const [roleName, permNames] of Object.entries(rolePermissions)) {
            const roleId = roleMap[roleName];
            if (!roleId) continue;
            for (const permName of permNames) {
              const permId = permMap[permName];
              if (!permId) continue;
              await query(`
                INSERT IGNORE INTO role_permissions (role_id, permission_id)
                VALUES (?, ?)
              `, [roleId, permId]);
            }
          }
          console.log("✓ Role permissions assigned");

          // ── 5. Seed default users ─────────────────────────────────────────
          const superadminPassword = await bcrypt.hash("superadmin123", 10);
          const adminPassword      = await bcrypt.hash("admin123", 10);
          const userPassword       = await bcrypt.hash("user123", 10);

          await query(`
            INSERT INTO users (name, nim, username, password, must_change_password)
            SELECT * FROM (
              SELECT 'Super Admin BEM', '0000000001', 'superadmin', '${superadminPassword}', FALSE
              UNION ALL
              SELECT 'Admin BEM',       '0000000002', 'admin',      '${adminPassword}',      FALSE
              UNION ALL
              SELECT 'Olivia Delisa',   '2311527001', 'olivia',     '${userPassword}',       FALSE
            ) AS tmp
            WHERE NOT EXISTS (
              SELECT username FROM users
              WHERE username IN ('superadmin', 'admin', 'olivia')
            )
          `);
          console.log("✓ Default users seeded");

          // ── 6. Seed user_periods ──────────────────────────────────────────
          if (defaultPeriodId) {
            const users = await query(`
              SELECT id, username FROM users
              WHERE username IN ('superadmin', 'admin', 'olivia')
            `);

            const jabatanMap = {
              superadmin: { jabatan: "Koordinator Pusat",  kementerian: null,                roleName: "superadmin" },
              admin:      { jabatan: "Sekretaris",          kementerian: null,                roleName: "admin"      },
              olivia:     { jabatan: "Staff Ahli",          kementerian: "Riset dan Keilmuan", roleName: "user"      },
            };

            for (const user of users) {
              const info = jabatanMap[user.username];
              if (!info) continue;
              const roleId = roleMap[info.roleName];
              await query(`
                INSERT IGNORE INTO user_periods (user_id, period_id, role_id, jabatan, kementerian, is_active)
                VALUES (?, ?, ?, ?, ?, TRUE)
              `, [user.id, defaultPeriodId, roleId, info.jabatan, info.kementerian]);
            }
            console.log("✓ User periods seeded");
          }

          console.log("\nDefault users created:");
          console.log("Superadmin → username: superadmin | password: superadmin123");
          console.log("Admin      → username: admin      | password: admin123");
          console.log("User       → username: olivia     | password: user123");
          console.log("\nRoles tersedia: superadmin, admin, user");

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
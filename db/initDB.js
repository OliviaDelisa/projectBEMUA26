const mysql = require("mysql2");
const bcrypt = require("bcrypt");
require("dotenv").config();

// Koneksi sementara khusus untuk setup (bukan pool)
// Karena kita perlu CREATE DATABASE dulu sebelum pilih database-nya
const connection = mysql.createConnection({
  host:     process.env.DB_HOST     || "localhost",
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
});

connection.connect(async (err) => {
  if (err) {
    console.error("❌ Koneksi database gagal:", err.message);
    return;
  }

  console.log("\n🔧 Memulai inisialisasi database...");

  // Buat database jika belum ada
  connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "webbemunand_db"}\``,
    (err) => {
      if (err) {
        console.error("❌ Gagal membuat database:", err.message);
        connection.end();
        return;
      }

      // Pindah ke database yang baru dibuat / sudah ada
      connection.changeUser(
        { database: process.env.DB_NAME || "webbemunand_db" },
        async (err) => {
          if (err) {
            console.error("❌ Gagal masuk ke database:", err.message);
            connection.end();
            return;
          }

          console.log("📦 Menggunakan database:", process.env.DB_NAME || "webbemunand_db");

          // ── TABLE: users ────────────────────────────────────────────
          const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
              id                    INT AUTO_INCREMENT PRIMARY KEY,
              name                  VARCHAR(100)  NOT NULL,
              nim                   VARCHAR(20)   UNIQUE NOT NULL,
              email                 VARCHAR(100)  UNIQUE NOT NULL,
              username              VARCHAR(50)   UNIQUE NOT NULL,
              password              VARCHAR(255)  NOT NULL,
              jabatan               VARCHAR(100)  NOT NULL,
              kementerian           VARCHAR(100)  DEFAULT NULL,
              role                  ENUM('superadmin', 'admin', 'user') NOT NULL DEFAULT 'user',
              photo                 VARCHAR(255)  DEFAULT 'default.png',
              is_active             BOOLEAN       DEFAULT TRUE,
              must_change_password  BOOLEAN       DEFAULT TRUE,
              created_at            TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
              updated_at            TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
          `;

          // ── TABLE: periods ──────────────────────────────────────────
          const createPeriodsTable = `
            CREATE TABLE IF NOT EXISTS periods (
              id          INT AUTO_INCREMENT PRIMARY KEY,
              name        VARCHAR(100) NOT NULL,
              start_date  DATE         NOT NULL,
              end_date    DATE         NOT NULL,
              is_active   BOOLEAN      DEFAULT TRUE,
              created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
            )
          `;

          // ── TABLE: secretariat_attendance ───────────────────────────
          const createSecAttTable = `
            CREATE TABLE IF NOT EXISTS secretariat_attendance (
              id               INT AUTO_INCREMENT PRIMARY KEY,
              user_id          INT          NOT NULL,
              period_id        INT          DEFAULT NULL,
              date             DATE         NOT NULL,
              check_in_time    DATETIME     DEFAULT NULL,
              latitude         DECIMAL(10,8) DEFAULT NULL,
              longitude        DECIMAL(11,8) DEFAULT NULL,
              location_name    VARCHAR(255) DEFAULT NULL,
              selfie_photo     LONGTEXT     DEFAULT NULL,
              distance_meters  INT          DEFAULT NULL,
              status           ENUM('hadir','tidak_hadir','pending','rejected') NOT NULL DEFAULT 'pending',
              created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uq_user_date (user_id, date),
              FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
              FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE SET NULL
            )
          `;

          // ── TABLE: activities ───────────────────────────────────────
          const createActivitiesTable = `
            CREATE TABLE IF NOT EXISTS activities (
              id              INT AUTO_INCREMENT PRIMARY KEY,
              title           VARCHAR(200)  NOT NULL,
              description     TEXT          DEFAULT NULL,
              location_name   VARCHAR(255)  NOT NULL,
              latitude        DECIMAL(10,8) DEFAULT NULL,
              longitude       DECIMAL(11,8) DEFAULT NULL,
              radius_meters   INT           DEFAULT 100,
              start_datetime  DATETIME      NOT NULL,
              end_datetime    DATETIME      NOT NULL,
              kode_qr         VARCHAR(50)   UNIQUE DEFAULT NULL,
              metode          ENUM('qr','maps','keduanya') DEFAULT 'keduanya',
              period_id       INT           DEFAULT NULL,
              created_by      INT           DEFAULT NULL,
              is_active       BOOLEAN       DEFAULT TRUE,
              created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
              updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (period_id)  REFERENCES periods(id) ON DELETE SET NULL,
              FOREIGN KEY (created_by) REFERENCES users(id)  ON DELETE SET NULL
            )
          `;

          // ── TABLE: activity_attendance ──────────────────────────────
          const createActAttTable = `
            CREATE TABLE IF NOT EXISTS activity_attendance (
              id             INT AUTO_INCREMENT PRIMARY KEY,
              activity_id    INT           NOT NULL,
              user_id        INT           NOT NULL,
              check_in_time  DATETIME      DEFAULT NULL,
              latitude       DECIMAL(10,8) DEFAULT NULL,
              longitude      DECIMAL(11,8) DEFAULT NULL,
              location_name  VARCHAR(255)  DEFAULT NULL,
              selfie_photo   LONGTEXT      DEFAULT NULL,
              status         ENUM('hadir','tidak_hadir','pending','rejected') NOT NULL DEFAULT 'pending',
              created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uq_activity_user (activity_id, user_id),
              FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE
            )
          `;

          // ── TABLE: duty_schedules ───────────────────────────────────
          // PERBAIKAN: Ditambahkan koma yang hilang di setiap baris kolom
          //            Ditambahkan kolom menko untuk menteri koordinator bertugas
          const createDutyTable = `
            CREATE TABLE IF NOT EXISTS duty_schedules (
              id           INT AUTO_INCREMENT PRIMARY KEY,
              kementerian  VARCHAR(100) NOT NULL COMMENT 'Kementerian yang bertugas piket',
              menko        VARCHAR(100) NOT NULL COMMENT 'Menteri Koordinator yang bertugas piket',
              duty_date    DATE         NOT NULL COMMENT 'Tanggal piket format YYYY-MM-DD',
              period_id    INT          DEFAULT NULL,
              created_by   INT          DEFAULT NULL,
              created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (period_id)  REFERENCES periods(id) ON DELETE SET NULL,
              FOREIGN KEY (created_by) REFERENCES users(id)   ON DELETE SET NULL
            )
          `;

          // ── TABLE: notifications ────────────────────────────────────
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

          // ── Urutan penting: tabel yang di-FOREIGN KEY harus dibuat lebih dulu
          const queries = [
            { sql: createUsersTable,      name: "users" },
            { sql: createPeriodsTable,    name: "periods" },
            { sql: createSecAttTable,     name: "secretariat_attendance" },
            { sql: createActivitiesTable, name: "activities" },
            { sql: createActAttTable,     name: "activity_attendance" },
            { sql: createDutyTable,       name: "duty_schedules" },
            { sql: createNotifTable,      name: "notifications" },
          ];

          // Jalankan query satu per satu secara berurutan
          const runQueries = (index) => {
            if (index >= queries.length) {
              // Semua tabel selesai → jalankan seed data default
              seedDefaultData();
              return;
            }

            const { sql, name } = queries[index];
            connection.query(sql, (err) => {
              if (err) {
                // Tampilkan error tapi JANGAN throw — lanjutkan ke tabel berikutnya
                console.error(`  ❌ Gagal membuat tabel [${name}]:`, err.message);
              } else {
                console.log(`  ✅ Tabel [${name}] siap`);
              }
              runQueries(index + 1); // lanjut ke tabel berikutnya
            });
          };

          // ── Seed data default (superadmin, admin, user, periode) ────
          const seedDefaultData = async () => {
            console.log("\n🌱 Memeriksa data default...");

            try {
              // Seed default period
              const insertPeriod = `
                INSERT INTO periods (name, start_date, end_date, is_active)
                SELECT * FROM (
                  SELECT 'Kepengurusan 2025/2026' AS name,
                         '2025-01-01'             AS start_date,
                         '2025-12-31'             AS end_date,
                         TRUE                     AS is_active
                ) AS tmp
                WHERE NOT EXISTS (
                  SELECT id FROM periods WHERE name = 'Kepengurusan 2025/2026'
                )
              `;
              connection.query(insertPeriod, (err) => {
                if (err) console.error("  ❌ Gagal seed period:", err.message);
                else console.log("  ✅ Period default siap");
              });

              // Hash password
              const superadminPassword = await bcrypt.hash("superadmin123", 10);
              const adminPassword      = await bcrypt.hash("admin123", 10);
              const userPassword       = await bcrypt.hash("user123", 10);

              const insertUsers = `
                INSERT INTO users
                  (name, nim, email, username, password, jabatan, kementerian, role, must_change_password)
                SELECT * FROM (
                  SELECT
                    'Super Admin BEM'           AS name,
                    '00000001'                  AS nim,
                    'superadmin@bemunand.ac.id' AS email,
                    'superadmin'                AS username,
                    '${superadminPassword}'     AS password,
                    'Koordinator Pusat'         AS jabatan,
                    NULL                        AS kementerian,
                    'superadmin'                AS role,
                    FALSE                       AS must_change_password
                  UNION ALL SELECT
                    'Admin BEM', '00000002', 'admin@bemunand.ac.id',
                    'admin', '${adminPassword}', 'Sekretaris', NULL, 'admin', FALSE
                  UNION ALL SELECT
                    'Olivia Delisa', '2311527001', 'user@bemunand.ac.id',
                    'user', '${userPassword}', 'Staff',
                    'Kementerian Riset dan Keilmuan', 'user', TRUE
                ) AS tmp
                WHERE NOT EXISTS (
                  SELECT email FROM users
                  WHERE email IN (
                    'superadmin@bemunand.ac.id',
                    'admin@bemunand.ac.id',
                    'user@bemunand.ac.id'
                  )
                )
              `;

              connection.query(insertUsers, (err) => {
                if (err) {
                  console.error("  ❌ Gagal seed users:", err.message);
                } else {
                  console.log("  ✅ Users default siap");
                  console.log("\n📋 Akun default:");
                  console.log("   Superadmin → username: superadmin | password: superadmin123");
                  console.log("   Admin      → username: admin      | password: admin123");
                  console.log("   User       → username: user       | password: user123");
                }
                console.log("\n✅ Inisialisasi database selesai!\n");
                connection.end(); // tutup koneksi setup, pool di db.js yang akan dipakai
              });

            } catch (error) {
              console.error("❌ Error seed data:", error.message);
              connection.end();
            }
          };

          runQueries(0);
        }
      );
    }
  );
});
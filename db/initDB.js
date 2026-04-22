const mysql = require("mysql2");
require("dotenv").config();
const bcrypt = require("bcrypt");

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

connection.connect(async (err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }

  console.log("Initializing Database...");

  connection.query(
    `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`,
    (err) => {
      if (err) throw err;

      connection.changeUser({ database: process.env.DB_NAME }, async (err) => {
        if (err) throw err;

        console.log("Using database:", process.env.DB_NAME);

        // ─── TABLE: users ───────────────────────────────────────────────
        const createUsersTable = `
          CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            nim VARCHAR(20) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            jabatan VARCHAR(100) NOT NULL,
            kementerian VARCHAR(100) DEFAULT NULL,
            role ENUM('superadmin', 'admin', 'user') NOT NULL DEFAULT 'user',
            photo VARCHAR(255) DEFAULT 'default.png',
            is_active BOOLEAN DEFAULT TRUE,
            must_change_password BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `;

        // ─── TABLE: periods (periode kepengurusan) ───────────────────────
        const createPeriodsTable = `
          CREATE TABLE IF NOT EXISTS periods (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;

        // ─── TABLE: secretariat_attendance ──────────────────────────────
        // Absensi sekretariat harian
        const createSecAttTable = `
        CREATE TABLE IF NOT EXISTS secretariat_attendance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          period_id INT DEFAULT NULL,
          date DATE NOT NULL,
          check_in_time DATETIME DEFAULT NULL,
          latitude DECIMAL(10, 8) DEFAULT NULL,
          longitude DECIMAL(11, 8) DEFAULT NULL,
          location_name VARCHAR(255) DEFAULT NULL,
          selfie_photo LONGTEXT DEFAULT NULL,
          distance_meters INT DEFAULT NULL,
          status ENUM('hadir', 'tidak_hadir', 'pending', 'rejected') NOT NULL DEFAULT 'pending', 
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_user_date (user_id, date),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE SET NULL
        )
      `;

        // ─── TABLE: activities (kegiatan khusus) ─────────────────────────
        const createActivitiesTable = `
          CREATE TABLE IF NOT EXISTS activities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            description TEXT DEFAULT NULL,
            location_name VARCHAR(255) NOT NULL,
            latitude DECIMAL(10, 8) DEFAULT NULL,
            longitude DECIMAL(11, 8) DEFAULT NULL,
            radius_meters INT DEFAULT 100,
            start_datetime DATETIME NOT NULL,
            end_datetime DATETIME NOT NULL,
            period_id INT DEFAULT NULL,
            created_by INT DEFAULT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
          )
        `;

        // ─── TABLE: activity_attendance ──────────────────────────────────
        // Absensi kegiatan khusus
        const createActAttTable = `
          CREATE TABLE IF NOT EXISTS activity_attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            activity_id INT NOT NULL,
            user_id INT NOT NULL,
            check_in_time DATETIME DEFAULT NULL,
            latitude DECIMAL(10, 8) DEFAULT NULL,
            longitude DECIMAL(11, 8) DEFAULT NULL,
            location_name VARCHAR(255) DEFAULT NULL,
            selfie_photo LONGTEXT DEFAULT NULL,
            status ENUM('hadir', 'tidak_hadir', 'pending', 'rejected') NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_activity_user (activity_id, user_id),
            FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `;

        // ─── TABLE: duty_schedules (jadwal piket) ────────────────────────
        const createDutyTable = `
          CREATE TABLE IF NOT EXISTS duty_schedules (
            id INT AUTO_INCREMENT PRIMARY KEY,
            kementerian VARCHAR(100) NOT NULL,
            duty_date DATE NOT NULL,
            period_id INT DEFAULT NULL,
            created_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
          )
        `;

        // ─── TABLE: notifications ────────────────────────────────────────
        const createNotifTable = `
          CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT DEFAULT NULL,
            title VARCHAR(200) NOT NULL,
            body TEXT NOT NULL,
            type ENUM('general', 'activity', 'duty', 'attendance') DEFAULT 'general',
            reference_id INT DEFAULT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `;

        const queries = [
          { sql: createUsersTable, name: "users" },
          { sql: createPeriodsTable, name: "periods" },
          { sql: createSecAttTable, name: "secretariat_attendance" },
          { sql: createActivitiesTable, name: "activities" },
          { sql: createActAttTable, name: "activity_attendance" },
          { sql: createDutyTable, name: "duty_schedules" },
          { sql: createNotifTable, name: "notifications" },
        ];

        const runQueries = (index) => {
          if (index >= queries.length) {
            seedDefaultData();
            return;
          }
          const { sql, name } = queries[index];
          connection.query(sql, (err) => {
            if (err) throw err;
            console.log(`Table '${name}' is ready`);
            runQueries(index + 1);
          });
        };

        const seedDefaultData = async () => {
          try {
            // Seed default period
            const insertPeriod = `
              INSERT INTO periods (name, start_date, end_date, is_active)
              SELECT * FROM (SELECT 'Kepengurusan 2025/2026', '2025-01-01', '2025-12-31', TRUE) AS tmp
              WHERE NOT EXISTS (SELECT id FROM periods WHERE name = 'Kepengurusan 2025/2026')
            `;
            connection.query(insertPeriod, (err) => {
              if (err) throw err;
              console.log("Default period seeded");
            });

            // Seed default users
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
                UNION ALL
                SELECT
                  'Admin BEM', '00000002', 'admin@bemunand.ac.id',
                  'admin', '${adminPassword}', 'Sekretaris', NULL, 'admin', FALSE
                UNION ALL
                SELECT
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
              );
            `;

            connection.query(insertUsers, (err) => {
              if (err) throw err;
              console.log("\nDefault users created:");
              console.log("Superadmin → username: superadmin | password: superadmin123");
              console.log("Admin      → username: admin      | password: admin123");
              console.log("User       → username: user       | password: user123");
              connection.end();
            });
          } catch (error) {
            console.error("Error seeding default data:", error);
            connection.end();
          }
        };

        runQueries(0);
      });
    }
  );
});
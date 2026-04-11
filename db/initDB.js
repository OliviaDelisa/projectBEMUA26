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

        const createUsersTable = `
          CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            nim VARCHAR(20) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            jabatan VARCHAR(100) NOT NULL,
            role ENUM('superadmin', 'admin', 'user') NOT NULL DEFAULT 'user',
            photo VARCHAR(255) DEFAULT 'default.png',
            is_active BOOLEAN DEFAULT TRUE,
            must_change_password BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `;

        connection.query(createUsersTable, async (err) => {
          if (err) throw err;
          console.log("Table 'users' is ready");

          try {
            const superadminPassword = await bcrypt.hash("superadmin123", 10);
            const adminPassword      = await bcrypt.hash("admin123", 10);
            const userPassword       = await bcrypt.hash("user123", 10);

            const insertUsers = `
              INSERT INTO users
                (name, nim, email, username, password, jabatan, role, must_change_password)
              SELECT * FROM (
                SELECT
                  'Super Admin BEM'            AS name,
                  '00000001'                   AS nim,
                  'superadmin@bemunand.ac.id'  AS email,
                  'superadmin'                 AS username,
                  '${superadminPassword}'      AS password,
                  'Koordinator Pusat'          AS jabatan,
                  'superadmin'                 AS role,
                  FALSE                        AS must_change_password
                UNION ALL
                SELECT
                  'Admin BEM', '00000002', 'admin@bemunand.ac.id',
                  'admin', '${adminPassword}', 'Sekretaris', 'admin',
                  FALSE                        AS must_change_password
                UNION ALL
                SELECT
                  'User BEM', '00000003', 'user@bemunand.ac.id',
                  'user', '${userPassword}', 'Anggota', 'user',
                  TRUE                         AS must_change_password
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

              console.log("Default users created:");
              console.log("Superadmin → username: superadmin | password: superadmin123");
              console.log("Admin      → username: admin      | password: admin123");
              console.log("User       → username: user       | password: user123");

              connection.end();
            });

          } catch (error) {
            console.error("Error inserting default users:", error);
            connection.end();
          }
        });
      });
    }
  );
});
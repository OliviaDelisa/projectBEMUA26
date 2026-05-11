const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createPool({
  host:               process.env.DB_HOST     || "localhost",
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "webbemunand_db",
  waitForConnections: true,
  connectionLimit:    10,   // maksimal 10 koneksi berjalan bersamaan
  queueLimit:         0,
   timezone:           '+00:00',
});

// Test koneksi saat pertama kali file ini di-require
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Gagal konek ke database:", err.message);
    return;
  }
  console.log("✅ Database pool terhubung ke:", process.env.DB_NAME || "webbemunand_db");
  connection.release(); // kembalikan koneksi ke pool
});

module.exports = db;
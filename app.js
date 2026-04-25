const express = require("express");
const cors    = require("cors");
require("dotenv").config({ override: true });

const app = express();

// ─── MIDDLEWARE ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── INIT DATABASE ──────────────────────────────────────────
// Jalankan initDB untuk membuat tabel yang belum ada
// File initDB.js ada di folder db/
require("./db/initDB");

// ─── IMPORT ROUTES ──────────────────────────────────────────
const userRoutes           = require("./routes/userRoutes");
const attendanceRoutes     = require("./routes/attendanceRoutes");
const adminAttendanceRoutes = require("./routes/adminAttendanceRoutes.js");
const activityRoutes       = require("./routes/activityRoutes");
const piketRoutes          = require("./routes/piketRoutes");

// ─── DAFTARKAN ROUTES ───────────────────────────────────────
app.use("/api/users",            userRoutes);
app.use("/api/attendance",       attendanceRoutes);
app.use("/api/admin/attendance", adminAttendanceRoutes);
app.use("/api/activities",       activityRoutes);
app.use("/api/piket",            piketRoutes);

// ─── ROUTE TEST ─────────────────────────────────────────────
app.get("/api", (req, res) => {
  res.json({
    status:    "success",
    message:   "BEM UNAND API is running",
    ip_access: "0.0.0.0",
  });
});

// ─── JALANKAN SERVER ────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log(`   Local: http://localhost:${PORT}/api`);
});
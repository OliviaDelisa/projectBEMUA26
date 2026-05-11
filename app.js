process.env.TZ = 'Asia/Jakarta';

const express = require("express");
const cors    = require("cors");
const path    = require("path");
require("dotenv").config({ override: true });

require("./db/initDB");

const userRoutes            = require("./routes/userRoutes");
const attendanceRoutes      = require("./routes/attendanceRoutes");
const adminAttendanceRoutes = require("./routes/adminAttendanceRoutes");
const activityRoutes        = require("./routes/activityRoutes");
const memberRoutes          = require("./routes/memberRoute");
const periodRoutes          = require("./routes/periodRoutes");
const piketRoutes           = require("./routes/piketRoutes");

const app = express();

// ─── MIDDLEWARE ─────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ─────────────────────────────
app.use("/api/users",            userRoutes);
app.use("/api/attendance",       attendanceRoutes);
app.use("/api/admin/attendance", adminAttendanceRoutes);
app.use("/api/activities",       activityRoutes);
app.use("/api/members",          memberRoutes);
app.use("/api/periode",          periodRoutes);
app.use("/api/piket",            piketRoutes);
app.use("/api/roles",            require("./routes/roles"));
app.use("/api/permissions",      require("./routes/permission"));

// ─── TEST ───────────────────────────────
app.get("/api", (req, res) => {
  res.json({
    status: "success",
    message: "BEM UNAND API is running",
  });
});

// ─── SERVE REACT BUILD ──────────────────
app.use(express.static(path.join(__dirname, "frontend/dist")));
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/dist", "index.html"));
});

// ─── SERVER ─────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server berjalan di port ${PORT}`);
});
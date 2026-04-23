const express = require("express");
const cors = require("cors");
require("dotenv").config({ override: true });

console.log("RUN FROM:", __dirname);
console.log(process.env);

require("./db/initDB");

const userRoutes = require("./routes/userRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes"); // ← khusus User
// PERBAIKAN: Import route khusus Admin
const adminAttendanceRoutes = require("./routes/adminAttendanceRoutes"); 

const app = express();

app.use(cors());
app.use(express.json());

// Route untuk User
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);

// PERBAIKAN: Daftarkan route khusus Admin
app.use("/api/admin/attendance", adminAttendanceRoutes);

// PERBAIKAN: Tambahkan route dasar /api agar tidak muncul "Cannot GET /api/"
app.get("/api", (req, res) => {
  res.json({
    status: "success",
    message: "BEM UNAND API is running",
    ip_access: "0.0.0.0"
  });
});

// PERBAIKAN: Gunakan satu app.listen saja. 
// Mendengarkan di '0.0.0.0' sangat penting agar bisa diakses via IP Laptop (oleh HP/perangkat lain).
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}/api`);
});
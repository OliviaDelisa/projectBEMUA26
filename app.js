const express = require("express");
const cors    = require("cors");
require("dotenv").config({ override: true });

console.log("RUN FROM:", __dirname);
console.log(process.env);

require("./db/initDB");

const userRoutes       = require("./routes/userRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const memberRoutes     = require("./routes/memberRoutes");
const periodRoutes     = require("./routes/periodRoutes");


const app = express();

// ✅ Izinkan semua origin (diperlukan saat akses dari IP jaringan)
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" })); // ← naikkan limit untuk selfie base64

app.use("/api/users",      userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/members",    memberRoutes);
app.use("/api/periode", periodRoutes);
app.use("/api/roles",       require("./routes/roles"));
app.use("/api/permissions", require("./routes/permission"));


app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
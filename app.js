const express = require("express");
const cors    = require("cors");
require("dotenv").config({ override: true });

console.log("RUN FROM:", __dirname);
console.log(process.env);

require("./db/initDB");

const userRoutes             = require("./routes/userRoutes");
const attendanceRoutes       = require("./routes/attendanceRoutes");
const adminAttendanceRoutes  = require("./routes/adminAttendanceRoutes");
const activityRoutes         = require("./routes/activityRoutes");
const memberRoutes           = require("./routes/memberRoute");
const periodRoutes           = require("./routes/periodRoutes");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

app.use("/api/users",             userRoutes);
app.use("/api/attendance",        attendanceRoutes);
app.use("/api/admin/attendance",  adminAttendanceRoutes);
app.use("/api/activities",        activityRoutes);
app.use("/api/members",           memberRoutes);
app.use("/api/periode",           periodRoutes);
app.use("/api/roles",             require("./routes/roles"));
app.use("/api/permissions",       require("./routes/permission"));

app.get("/api", (req, res) => {
  res.json({
    status: "success",
    message: "BEM UNAND API is running",
    ip_access: "0.0.0.0"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}/api`);
});
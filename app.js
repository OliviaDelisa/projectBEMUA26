const express = require("express");
const cors = require("cors");
require("dotenv").config({ override: true });

console.log("RUN FROM:", __dirname);
console.log(process.env);

require("./db/initDB");

const userRoutes = require("./routes/userRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const adminAttendanceRoutes = require("./routes/adminAttendanceRoutes"); 
const activityRoutes = require("./routes/activityRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Route untuk User
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin/attendance", adminAttendanceRoutes);
app.use("/api/activities", activityRoutes);


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
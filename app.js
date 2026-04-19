const express = require("express");
const cors = require("cors");
require("dotenv").config();

console.log("RUN FROM:", __dirname);

require("./db/initDB");

const userRoutes = require("./routes/userRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes"); // ← bukan controller

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);

app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
const express = require("express");
const cors = require("cors");
require("dotenv").config();

console.log("RUN FROM:", __dirname);

require("./db/initDB");

const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on ${process.env.PORT}`);
});
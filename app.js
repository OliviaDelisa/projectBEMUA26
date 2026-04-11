const express = require("express");
const cors = require("cors");
require("dotenv").config({ override: true });

console.log("RUN FROM:", __dirname);
console.log(process.env);

require("./db/initDB");

const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on ${process.env.PORT}`);
});


const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/attendanceController");

// Secretariat routes
router.get("/home/:user_id",                ctrl.getHomeData);
router.get("/secretariat/history/:user_id", ctrl.getSecretariatHistory);
router.post("/secretariat/checkin",         ctrl.checkInSecretariat);

// Activity routes
router.post("/activity/checkin",            ctrl.checkInActivity);
router.get("/activity/history/:user_id",    ctrl.getActivityHistory); // NEW: ?limit=100

module.exports = router;
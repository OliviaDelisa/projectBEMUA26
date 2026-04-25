const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");

router.get("/", activityController.getAllActivities);
router.post("/", activityController.createActivity);
router.post('/scan', activityController.scanAttendance);
router.put("/:id", activityController.updateActivity); 
router.delete("/:id", activityController.deleteActivity); 
router.get("/:id/attendance", activityController.getActivityAttendance);

module.exports = router;
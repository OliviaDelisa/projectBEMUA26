const express = require("express");
const router = express.Router();
const adminAttendanceController = require("../controllers/adminAttendanceController");

// Path ini akan diakses admin untuk memonitor & validasi
// Base URL: /api/admin/attendance

// Monitor absensi harian (untuk validasi foto)
router.get("/monitor", adminAttendanceController.getAdminSecretariatMonitor);

// Rekapitulasi absensi (untuk tampilan grid/kalender)
router.get("/rekap", adminAttendanceController.getSecretariatRekap);

// Aksi validasi (approve/reject)
router.put("/validate/:id", adminAttendanceController.validateAttendance);

module.exports = router;
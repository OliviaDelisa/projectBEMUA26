const express = require("express");
const router  = express.Router();
const {
  getPiketByMonth,
  upsertPiket,
  deletePiket,
} = require("../controllers/piketController");

// GET    /api/piket?year=2026&month=4  → ambil piket satu bulan
router.get("/", getPiketByMonth);

// POST   /api/piket                   → simpan/update satu jadwal
router.post("/", upsertPiket);

// DELETE /api/piket/:date             → hapus jadwal berdasar tanggal
router.delete("/:date", deletePiket);

module.exports = router;
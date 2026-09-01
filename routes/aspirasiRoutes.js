const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const upload  = multer({ dest: "uploads/" }); // sesuaikan folder upload kamu, pastikan foldernya ada di server

const {
  getAllAspirasi,
  createAspirasi,
  updateStatus,
  updatePrioritas,
  updateCatatan,
} = require("../controllers/aspirasiController");

router.get(  "/",              getAllAspirasi);
router.post( "/", upload.single("foto"), createAspirasi);   // ← tambah multer
router.put(  "/:id/status",    updateStatus);
router.put(  "/:id/prioritas", updatePrioritas);
router.put(  "/:id/catatan",   updateCatatan);

module.exports = router;
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");

// Custom storage supaya nama file tetap punya ekstensi asli (.png, .jpg, dll)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + ext);
  },
});

const upload = multer({ storage });

const {
  getAllAspirasi,
  createAspirasi,
  updateStatus,
  updatePrioritas,
  updateCatatan,
} = require("../controllers/aspirasiController");

router.get(  "/",              getAllAspirasi);
router.post( "/", upload.single("foto"), createAspirasi);
router.put(  "/:id/status",    updateStatus);
router.put(  "/:id/prioritas", updatePrioritas);
router.put(  "/:id/catatan",   updateCatatan);

module.exports = router;
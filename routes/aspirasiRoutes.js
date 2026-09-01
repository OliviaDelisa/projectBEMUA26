const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + ext);
  },
});

const upload = multer({ storage });

const {
  getAllAspirasi,
  getAllKategori,
  createAspirasi,
  updateStatus,
  updatePrioritas,
  updateCatatan,
} = require("../controllers/aspirasiController");

router.get(  "/",              getAllAspirasi);
router.get(  "/kategori",      getAllKategori);
router.post( "/", upload.array("foto", 5), createAspirasi); // maks 5 foto per aspirasi
router.put(  "/:id/status",    updateStatus);
router.put(  "/:id/prioritas", updatePrioritas);
router.put(  "/:id/catatan",   updateCatatan);

module.exports = router;
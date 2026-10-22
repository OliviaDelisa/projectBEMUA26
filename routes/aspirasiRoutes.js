const express   = require("express");
const router    = express.Router();
const multer    = require("multer");
const path      = require("path");
const fs        = require("fs");
const rateLimit = require("express-rate-limit"); // npm i express-rate-limit

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
  updateKeterangan,
  cekStatusByKode,
} = require("../controllers/aspirasiController");

// Batasi percobaan cek kode supaya tidak bisa ditebak dengan brute force
const cekLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30,                  // maks 30 percobaan per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Terlalu banyak percobaan, coba lagi nanti" },
});

router.get(  "/",               getAllAspirasi);
router.get(  "/kategori",       getAllKategori);
router.post( "/", upload.array("foto", 5), createAspirasi); // maks 5 foto per aspirasi
router.put(  "/:id/status",     updateStatus);
router.put(  "/:id/prioritas",  updatePrioritas);
router.put(  "/:id/catatan",    updateCatatan);
router.put(  "/:id/keterangan", updateKeterangan);

// Public endpoint - cek status aspirasi berdasarkan kode laporan (tanpa auth)
router.get(  "/cek/:kode", cekLimiter, cekStatusByKode);

module.exports = router;
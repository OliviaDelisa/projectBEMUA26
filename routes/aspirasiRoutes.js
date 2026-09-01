const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

// Pastikan folder uploads/ selalu ada, apapun cwd-nya
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
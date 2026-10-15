const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getAllArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
} = require("../controllers/articleController");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Thumbnail harus berupa JPG, PNG, atau WebP."));
    }
  },
});

router.get("/", getAllArticles);
router.get("/:id", getArticleById);
router.post("/", upload.single("thumbnail"), createArticle);
router.put("/:id", upload.single("thumbnail"), updateArticle);
router.delete("/:id", deleteArticle);

module.exports = router;
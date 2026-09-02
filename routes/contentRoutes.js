const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { getAllContent, createContent, updateContent, deleteContent } = require("../controllers/contentController");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { files: 10, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype));
  },
});

const router = express.Router();
router.get("/", getAllContent);
router.post("/", upload.array("images", 10), createContent);
router.put("/:id", upload.array("images", 10), updateContent);
router.delete("/:id", deleteContent);

module.exports = router;

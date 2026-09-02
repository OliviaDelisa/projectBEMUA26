const db = require("../db/db");

const CONTENT_TYPES = new Set(["event", "announcement", "gallery"]);

function parseImages(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeContent(row) {
  return {
    ...row,
    images: parseImages(row.images),
    is_published: Boolean(row.is_published),
  };
}

function getAllContent(req, res) {
  const type = req.query.type;
  const publicOnly = req.query.public === "true";
  const conditions = [];
  const params = [];

  if (type && CONTENT_TYPES.has(type)) {
    conditions.push("content_type = ?");
    params.push(type);
  }
  if (publicOnly) conditions.push("is_published = TRUE");

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  db.query(
    `SELECT id, content_type, title, description, event_start, event_end, cover_image, images, is_published, created_at, updated_at
     FROM contents ${where} ORDER BY COALESCE(event_start, created_at) DESC, created_at DESC`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Gagal mengambil konten" });
      res.json(rows.map(normalizeContent));
    }
  );
}

function createContent(req, res) {
  const { content_type, title, description, event_start, event_end, is_published } = req.body;
  if (!CONTENT_TYPES.has(content_type) || !title?.trim()) {
    return res.status(400).json({ message: "Jenis dan judul konten wajib diisi" });
  }

  const files = req.files || [];
  const images = files.map((file) => `/uploads/${file.filename}`);
  const coverImage = images[0] || null;
  db.query(
    `INSERT INTO contents (content_type, title, description, event_start, event_end, cover_image, images, is_published)
     VALUES (?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?, ?, ?)`,
    [content_type, title.trim(), description || null, event_start || "", event_end || "", coverImage, JSON.stringify(images), is_published === "true" || is_published === true],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Gagal membuat konten" });
      res.status(201).json({ id: result.insertId, message: "Konten berhasil dibuat" });
    }
  );
}

function updateContent(req, res) {
  const { content_type, title, description, event_start, event_end, is_published, existing_images } = req.body;
  if (!CONTENT_TYPES.has(content_type) || !title?.trim()) {
    return res.status(400).json({ message: "Jenis dan judul konten wajib diisi" });
  }

  const newImages = (req.files || []).map((file) => `/uploads/${file.filename}`);
  const oldImages = parseImages(existing_images);
  const images = [...oldImages, ...newImages];
  db.query(
    `UPDATE contents SET content_type = ?, title = ?, description = ?, event_start = NULLIF(?, ''), event_end = NULLIF(?, ''),
     cover_image = ?, images = ?, is_published = ? WHERE id = ?`,
    [content_type, title.trim(), description || null, event_start || "", event_end || "", images[0] || null, JSON.stringify(images), is_published === "true" || is_published === true, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Gagal memperbarui konten" });
      if (!result.affectedRows) return res.status(404).json({ message: "Konten tidak ditemukan" });
      res.json({ message: "Konten berhasil diperbarui" });
    }
  );
}

function deleteContent(req, res) {
  db.query("DELETE FROM contents WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ message: "Gagal menghapus konten" });
    if (!result.affectedRows) return res.status(404).json({ message: "Konten tidak ditemukan" });
    res.json({ message: "Konten berhasil dihapus" });
  });
}

module.exports = { getAllContent, createContent, updateContent, deleteContent };

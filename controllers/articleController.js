
const db = require("../db/db");

// ================================
// HELPER: PARSE TAG
// ================================
function parseTags(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).trim())
      .filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed
        .map((tag) => String(tag).trim())
        .filter(Boolean);
    }
  } catch {
    // Jika bukan JSON, proses sebagai teks dipisahkan koma.
  }

  return String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

// ================================
// HELPER: NORMALISASI ARTIKEL
// ================================
function normalizeArticle(row) {
  return {
    ...row,
    tags: parseTags(row.tags),
  };
}

// ================================
// HELPER: MEMBUAT SLUG
// ================================
function makeSlug(title) {
  return String(title || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ================================
// HELPER: VALIDASI ARTIKEL
// ================================
function validateArticle({ title, excerpt, content, tags, status }) {
  if (typeof title !== "string" || !title.trim()) {
    return "Judul artikel wajib diisi.";
  }

  if (typeof excerpt !== "string" || !excerpt.trim()) {
    return "Ringkasan artikel wajib diisi.";
  }

  if (typeof content !== "string" || !content.trim()) {
    return "Isi artikel wajib diisi.";
  }

  if (!parseTags(tags).length) {
    return "Minimal satu tag artikel wajib diisi.";
  }

  if (!["draft", "published"].includes(status)) {
    return "Status artikel tidak valid.";
  }

  if (!makeSlug(title)) {
    return "Judul artikel tidak valid untuk dijadikan slug.";
  }

  return null;
}

// ================================
// GET /api/articles
// Admin: semua artikel
// Publik: hanya artikel terbit
// GET /api/articles?public=true
// ================================
exports.getAllArticles = (req, res) => {
  const publicOnly = req.query.public === "true";

  const sql = `
    SELECT
      id,
      title,
      slug,
      excerpt,
      content,
      thumbnail,
      tags,
      status,
      published_at,
      created_at,
      updated_at
    FROM articles
    ${publicOnly ? "WHERE status = 'published'" : ""}
    ORDER BY
      COALESCE(published_at, updated_at, created_at) DESC,
      id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Gagal mengambil artikel:", err);

      return res.status(500).json({
        message: "Gagal mengambil data artikel.",
      });
    }

    return res.json(rows.map(normalizeArticle));
  });
};

// ================================
// GET /api/articles/:id
// ================================
exports.getArticleById = (req, res) => {
  db.query(
    `SELECT
       id,
       title,
       slug,
       excerpt,
       content,
       thumbnail,
       tags,
       status,
       published_at,
       created_at,
       updated_at
     FROM articles
     WHERE id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err) {
        console.error("Gagal mengambil detail artikel:", err);

        return res.status(500).json({
          message: "Gagal mengambil detail artikel.",
        });
      }

      if (!rows.length) {
        return res.status(404).json({
          message: "Artikel tidak ditemukan.",
        });
      }

      return res.json(normalizeArticle(rows[0]));
    }
  );
};

// ================================
// POST /api/articles
// MEMBUAT ARTIKEL BARU
// ================================
exports.createArticle = (req, res) => {
  const { title, excerpt, content, tags, status } = req.body;

  // Validasi seluruh field teks dan status.
  const validationError = validateArticle(req.body);

  if (validationError) {
    return res.status(400).json({
      message: validationError,
    });
  }

  // Thumbnail wajib untuk artikel baru.
  if (!req.file) {
    return res.status(400).json({
      message: "Thumbnail artikel wajib diunggah.",
    });
  }

  const slug = makeSlug(title);
  const parsedTags = parseTags(tags);
  const thumbnail = `/uploads/${req.file.filename}`;

  const sql = `
    INSERT INTO articles (
      title,
      slug,
      excerpt,
      content,
      thumbnail,
      tags,
      status,
      published_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?,
      CASE
        WHEN ? = 'published' THEN NOW()
        ELSE NULL
      END
    )
  `;

  const params = [
    title.trim(),
    slug,
    excerpt.trim(),
    content.trim(),
    thumbnail,
    JSON.stringify(parsedTags),
    status,
    status,
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Gagal membuat artikel:", err);

      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          message:
            "Slug artikel sudah digunakan. Silakan gunakan judul yang berbeda.",
        });
      }

      return res.status(500).json({
        message: "Gagal menyimpan artikel ke database.",
      });
    }

    return res.status(201).json({
      message: "Artikel berhasil disimpan ke database.",
      id: result.insertId,
    });
  });
};

// ================================
// PUT /api/articles/:id
// MEMPERBARUI ARTIKEL
// ================================
exports.updateArticle = (req, res) => {
  const { title, excerpt, content, tags, status } = req.body;

  const validationError = validateArticle(req.body);

  if (validationError) {
    return res.status(400).json({
      message: validationError,
    });
  }

  const slug = makeSlug(title);
  const parsedTags = parseTags(tags);

  // Jika thumbnail baru diunggah, perbarui thumbnail.
  // Jika tidak, pertahankan thumbnail yang lama.
  const thumbnailSql = req.file
    ? "thumbnail = ?,"
    : "";

  const thumbnailParams = req.file
    ? [`/uploads/${req.file.filename}`]
    : [];

  const sql = `
    UPDATE articles
    SET
      title = ?,
      slug = ?,
      excerpt = ?,
      content = ?,
      ${thumbnailSql}
      tags = ?,
      status = ?,
      published_at = CASE
        WHEN ? = 'published'
          THEN COALESCE(published_at, NOW())
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = ?
  `;

  const params = [
    title.trim(),
    slug,
    excerpt.trim(),
    content.trim(),
    ...thumbnailParams,
    JSON.stringify(parsedTags),
    status,
    status,
    req.params.id,
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Gagal memperbarui artikel:", err);

      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          message:
            "Slug artikel sudah digunakan. Silakan gunakan judul yang berbeda.",
        });
      }

      return res.status(500).json({
        message: "Gagal memperbarui artikel di database.",
      });
    }

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Artikel tidak ditemukan.",
      });
    }

    return res.json({
      message: "Artikel berhasil diperbarui.",
    });
  });
};

// ================================
// DELETE /api/articles/:id
// MENGHAPUS ARTIKEL
// ================================
exports.deleteArticle = (req, res) => {
  db.query(
    "DELETE FROM articles WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) {
        console.error("Gagal menghapus artikel:", err);

        return res.status(500).json({
          message: "Gagal menghapus artikel.",
        });
      }

      if (!result.affectedRows) {
        return res.status(404).json({
          message: "Artikel tidak ditemukan.",
        });
      }

      return res.json({
        message: "Artikel berhasil dihapus.",
      });
    }
  );
};

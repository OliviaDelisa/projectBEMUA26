const db = require("../db/db");

exports.getPermissionsByRole = (req, res) => {
  const { role_id } = req.query;
  if (!role_id) {
    return res.status(400).json({ message: "role_id wajib diisi" });
  }

  const sql = `
    SELECT p.id, p.name, p.label, p.path, p.group_name,
           (rp.permission_id IS NOT NULL) AS enabled
    FROM permissions p
    LEFT JOIN role_permissions rp
      ON rp.permission_id = p.id AND rp.role_id = ?
    ORDER BY p.group_name ASC, p.id ASC
  `;

  db.query(sql, [role_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Gagal mengambil permission", error: err });
    res.json(rows);
  });
};

exports.togglePermission = (req, res) => {
  const { role_id, permission_id, value } = req.body;
  if (!role_id || !permission_id || typeof value !== "boolean") {
    return res.status(400).json({ message: "role_id, permission_id, dan value wajib diisi" });
  }

  db.query("SELECT name FROM roles WHERE id = ?", [role_id], (roleErr, roles) => {
    if (roleErr) return res.status(500).json({ message: "Gagal memeriksa role", error: roleErr });
    if (roles.length === 0) return res.status(404).json({ message: "Role tidak ditemukan" });
    if (roles[0].name === "superadmin") {
      return res.status(403).json({ message: "Permission superadmin tidak dapat diubah" });
    }

    db.query("SELECT id FROM permissions WHERE id = ?", [permission_id], (permissionErr, rows) => {
      if (permissionErr) return res.status(500).json({ message: "Gagal memeriksa permission", error: permissionErr });
      if (rows.length === 0) return res.status(404).json({ message: "Permission tidak ditemukan" });

      const sql = value
        ? "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)"
        : "DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?";
      db.query(sql, [role_id, permission_id], (updateErr) => {
        if (updateErr) return res.status(500).json({ message: "Gagal mengubah permission", error: updateErr });
        res.json({ message: "Permission berhasil diperbarui", enabled: value });
      });
    });
  });
};
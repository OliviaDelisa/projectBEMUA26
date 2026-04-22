const db = require("../db/db");

// Ambil semua data absen sekre untuk dimonitor admin
exports.getAdminSecretariatMonitor = (req, res) => {
    const { date, kementerian } = req.query; 
    let query = `
        SELECT sa.*, u.name, u.nim, u.kementerian, u.jabatan 
        FROM secretariat_attendance sa
        JOIN users u ON sa.user_id = u.id
        WHERE 1=1
    `;
    const params = [];

    if (date) {
        query += " AND sa.date = ?";
        params.push(date);
    }
    if (kementerian && kementerian !== 'all') {
        query += " AND u.kementerian = ?";
        params.push(kementerian);
    }

    query += " ORDER BY sa.check_in_time DESC";

    db.query(query, params, (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil data", error: err });
        res.json(result);
    });
};

// Update status absen (Validasi Admin)
exports.validateAttendance = (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'hadir' atau 'rejected'

    db.query(
        "UPDATE secretariat_attendance SET status = ? WHERE id = ?",
        [status, id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Gagal validasi" });
            res.json({ message: "Absensi berhasil divalidasi" });
        }
    );
};
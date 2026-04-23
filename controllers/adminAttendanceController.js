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

// --- PERBAIKAN: Menambahkan fungsi getSecretariatRekap yang dipanggil di Routes ---
exports.getSecretariatRekap = (req, res) => {
    const { startDate, endDate, kementerian } = req.query;

    let query = `
        SELECT 
            u.id as user_id, u.name, u.nim, u.kementerian,
            sa.date, sa.status
        FROM users u
        LEFT JOIN secretariat_attendance sa ON u.id = sa.user_id 
            AND sa.date BETWEEN ? AND ?
        WHERE u.role = 'user'
    `;
    const params = [startDate, endDate];

    if (kementerian && kementerian !== 'all') {
        query += " AND u.kementerian = ?";
        params.push(kementerian);
    }

    query += " ORDER BY u.name ASC, sa.date ASC";

    db.query(query, params, (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil rekap", error: err });
        
        // Transformasi data agar sesuai dengan format grid di frontend
        const rekap = result.reduce((acc, curr) => {
            if (!acc[curr.user_id]) {
                acc[curr.user_id] = {
                    id: curr.user_id,
                    name: curr.name,
                    nim: curr.nim,
                    kementerian: curr.kementerian,
                    attendance: {}
                };
            }
            
            if (curr.date) {
                // PERBAIKAN: Gunakan metode manual agar format tanggal YYYY-MM-DD murni
                // dan tidak bergeser karena Timezone ISOString
                const d = new Date(curr.date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateKey = `${year}-${month}-${day}`;
                
                acc[curr.user_id].attendance[dateKey] = curr.status;
            }
            return acc;
        }, {});

        res.json(Object.values(rekap));
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
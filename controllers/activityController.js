const db = require("../db/db");
const crypto = require("crypto");

// 1. Ambil semua kegiatan untuk admin
exports.getAllActivities = (req, res) => {
    const query = `
        SELECT a.*, 
        (SELECT COUNT(*) FROM activity_attendance WHERE activity_id = a.id AND status = 'hadir') as hadir,
        (SELECT COUNT(*) FROM activity_attendance WHERE activity_id = a.id) as peserta
        FROM activities a 
        ORDER BY a.start_datetime DESC`;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil data kegiatan", error: err });
        res.json(results);
    });
};

// 2. Buat kegiatan baru
exports.createActivity = (req, res) => {
    const { title, description, location_name, latitude, longitude, radius_meters, start_datetime, end_datetime, participant_ids, metode } = req.body;

    if (!title || title.trim() === "") {
        return res.status(400).json({ message: "Nama kegiatan wajib diisi." });
    }
    if (title.trim().length > 50) {
        return res.status(400).json({ message: "Nama kegiatan maksimal 50 karakter." });
    }
    if (description && description.trim().length > 150) {
        return res.status(400).json({ message: "Deskripsi maksimal 150 karakter." });
    }
    if (!start_datetime || !end_datetime) {
        return res.status(400).json({ message: "Tanggal mulai dan selesai wajib diisi." });
    }

    const startDate = new Date(start_datetime);
    const endDate   = new Date(end_datetime);
    const today     = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Format tanggal tidak valid." });
    }
    if (startDate < today) {
        return res.status(400).json({ message: "Tanggal mulai tidak boleh sebelum hari ini." });
    }
    if (endDate < startDate) {
        return res.status(400).json({ message: "Tanggal selesai tidak boleh sebelum tanggal mulai." });
    }
    if (!location_name || location_name.trim() === "") {
        return res.status(400).json({ message: "Nama lokasi wajib diisi." });
    }
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
        return res.status(400).json({ message: "Koordinat lokasi wajib ditentukan." });
    }

    const kode_qr = "KEG-" + crypto.randomBytes(2).toString("hex").toUpperCase();

    const query = `INSERT INTO activities 
        (title, description, location_name, latitude, longitude, radius_meters, start_datetime, end_datetime, kode_qr, metode) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        title.trim(),
        description ? description.trim() : "",
        location_name.trim(),
        latitude,
        longitude,
        radius_meters || 100,
        start_datetime,
        end_datetime,
        kode_qr,
        metode || 'keduanya'
    ];

    db.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal membuat kegiatan", error: err });

        const activityId = result.insertId;

        if (participant_ids && participant_ids.length > 0) {
            const attendanceValues = participant_ids.map(uid => [activityId, uid, 'tidak_hadir']);
            db.query(`INSERT INTO activity_attendance (activity_id, user_id, status) VALUES ?`, [attendanceValues], (err2) => {
                if (err2) console.error("Gagal insert peserta:", err2);
            });
        }

        res.status(201).json({ message: "Kegiatan berhasil dibuat", id: activityId, kode: kode_qr });
    });
};

// 3. Update kegiatan
exports.updateActivity = (req, res) => {
    const { id } = req.params;
    const { title, description, location_name, latitude, longitude, radius_meters, start_datetime, end_datetime } = req.body;

    if (!title || title.trim() === "") {
        return res.status(400).json({ message: "Nama kegiatan wajib diisi." });
    }
    if (title.trim().length > 50) {
        return res.status(400).json({ message: "Nama kegiatan maksimal 50 karakter." });
    }
    if (description && description.trim().length > 150) {
        return res.status(400).json({ message: "Deskripsi maksimal 150 karakter." });
    }
    if (!start_datetime || !end_datetime) {
        return res.status(400).json({ message: "Tanggal mulai dan selesai wajib diisi." });
    }

    const startDate = new Date(start_datetime);
    const endDate   = new Date(end_datetime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Format tanggal tidak valid." });
    }
    if (endDate < startDate) {
        return res.status(400).json({ message: "Tanggal selesai tidak boleh sebelum tanggal mulai." });
    }
    if (!location_name || location_name.trim() === "") {
        return res.status(400).json({ message: "Nama lokasi wajib diisi." });
    }
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
        return res.status(400).json({ message: "Koordinat lokasi wajib ditentukan." });
    }

    const query = `UPDATE activities SET 
        title = ?, description = ?, location_name = ?, 
        latitude = ?, longitude = ?, radius_meters = ?, 
        start_datetime = ?, end_datetime = ? 
        WHERE id = ?`;

    const values = [
        title.trim(),
        description ? description.trim() : "",
        location_name.trim(),
        latitude,
        longitude,
        radius_meters || 100,
        start_datetime,
        end_datetime,
        id
    ];

    db.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal memperbarui kegiatan", error: err });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Kegiatan tidak ditemukan" });
        res.json({ message: "Kegiatan berhasil diperbarui" });
    });
};

// 4. Hapus kegiatan
exports.deleteActivity = (req, res) => {
    const { id } = req.params;
    db.query(`DELETE FROM activities WHERE id = ?`, [id], (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal menghapus kegiatan", error: err });
        res.json({ message: "Kegiatan berhasil dihapus" });
    });
};

// 5. Ambil detail absensi per kegiatan
// FIX: JOIN ke user_periods untuk ambil kementerian (bukan users.kementerian)
exports.getActivityAttendance = (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            u.id        AS user_id,
            u.name, 
            up.kementerian, 
            aa.status, 
            aa.check_in_time,
            aa.selfie_photo
        FROM activity_attendance aa
        JOIN users u ON aa.user_id = u.id
        LEFT JOIN user_periods up ON up.user_id = u.id AND up.is_active = TRUE
        WHERE aa.activity_id = ?
        ORDER BY u.name ASC`;

    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil detail absensi", error: err });
        res.json(results);
    });
};

// 6. Scan QR absensi kegiatan
exports.scanAttendance = (req, res) => {
    const { kode_qr, user_id, latitude, longitude } = req.body;

    if (!kode_qr || !user_id) {
        return res.status(400).json({ message: "kode_qr dan user_id wajib diisi." });
    }

    const findQuery = `
        SELECT id, title, start_datetime, end_datetime 
        FROM activities 
        WHERE kode_qr = ?`;

    db.query(findQuery, [kode_qr], (err, activities) => {
        if (err) return res.status(500).json({ message: "Gagal mencari kegiatan.", error: err });
        if (activities.length === 0) {
            return res.status(404).json({ message: "Kode QR tidak valid atau kegiatan tidak ditemukan." });
        }

        const activity = activities[0];
        const now   = new Date();
        const start = new Date(activity.start_datetime);
        const end   = new Date(activity.end_datetime);

        const startWithTolerance = new Date(start.getTime() - 30 * 60 * 1000);
        if (now < startWithTolerance) {
            return res.status(400).json({ 
                message: `Kegiatan belum dimulai. Absensi dibuka pada ${start.toLocaleString('id-ID')}.` 
            });
        }
        if (now > end) {
            return res.status(400).json({ 
                message: "Kegiatan sudah selesai. Absensi tidak dapat dilakukan." 
            });
        }

        const checkQuery = `
            SELECT id, status 
            FROM activity_attendance 
            WHERE activity_id = ? AND user_id = ?`;

        db.query(checkQuery, [activity.id, user_id], (err2, rows) => {
            if (err2) return res.status(500).json({ message: "Gagal memeriksa data peserta.", error: err2 });

            if (rows.length === 0) {
                return res.status(403).json({ 
                    message: "Anda tidak terdaftar sebagai peserta kegiatan ini." 
                });
            }

            const attendance = rows[0];

            if (attendance.status === 'hadir') {
                return res.status(409).json({ 
                    message: "Anda sudah tercatat hadir pada kegiatan ini." 
                });
            }

            const updateQuery = `
                UPDATE activity_attendance 
                SET status = 'hadir', 
                    check_in_time = NOW(),
                    latitude = ?,
                    longitude = ?
                WHERE id = ?`;

            db.query(updateQuery, [latitude || null, longitude || null, attendance.id], (err3, result) => {
                if (err3) return res.status(500).json({ message: "Gagal memperbarui absensi.", error: err3 });
                if (result.affectedRows === 0) {
                    return res.status(500).json({ message: "Gagal memperbarui absensi." });
                }

                res.json({ 
                    message: "Absensi berhasil dicatat!",
                    kegiatan: activity.title,
                    check_in_time: new Date().toISOString()
                });
            });
        });
    });
};
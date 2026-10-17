const db = require("../db/db");
const crypto = require("crypto");

// ── Helper: parse datetime string "YYYY-MM-DD HH:mm" ──────────────────────
// .replace(" ", "T") agar konsisten di semua browser (Safari, Firefox, Chrome)
// TANPA offset +07:00 karena data di DB sudah tersimpan dalam WIB
const parseDateTime = (dtStr) => {
  return new Date(dtStr.replace(" ", "T") + "+07:00");
};

const normalizeAudience = (value) => {
    const raw = value === undefined ? ["bem"] : Array.isArray(value) ? value : String(value).split(",");
    const selected = [...new Set(raw.filter(item => ["bem", "igm", "sekretaris"].includes(item)))];
    return selected.includes("bem") ? selected.filter(item => item !== "sekretaris") : selected;
};

const getActivityParticipants = (periodId, audience, callback) => {
    const queries = [];
    const params = [];

    if (audience.includes("bem")) {
        queries.push("SELECT user_id, 'bem' AS member_type, FALSE AS is_secretary FROM user_periods WHERE period_id = ? AND is_active = TRUE");
        params.push(periodId);
    }
    if (audience.includes("sekretaris")) {
        queries.push("SELECT user_id, 'bem' AS member_type, TRUE AS is_secretary FROM user_periods WHERE period_id = ? AND is_active = TRUE AND LOWER(jabatan) = 'sekretaris menteri'");
        params.push(periodId);
    }
    if (audience.includes("igm")) {
        queries.push("SELECT user_id, 'igm' AS member_type, FALSE AS is_secretary FROM igm_members WHERE period_id = ? AND is_active = TRUE");
        params.push(periodId);
    }

    db.query(queries.join(" UNION ALL "), params, (err, rows) => {
        if (err) return callback(err);
        callback(null, uniqueParticipants(rows));
    });
};

const uniqueParticipants = (rows) => {
    const participants = new Map();
    rows.forEach(row => {
        const id = String(row.user_id);
        const existing = participants.get(id);
        if (!existing) {
            participants.set(id, {
                user_id: row.user_id,
                member_type: row.member_type,
                is_secretary: Boolean(row.is_secretary),
            });
        } else {
            existing.is_secretary ||= Boolean(row.is_secretary);
            if (row.member_type === "igm") existing.member_type = "igm";
        }
    });
    return [...participants.values()];
};

// ── Helper: ambil "hari ini" jam 00:00:00 dalam WIB ───────────────────────
const todayWIB = () => {
    const now = new Date();
    const wibStr = now.toLocaleString("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }); // → "2026-05-11"
    // Parse sebagai midnight WIB — harus tetap pakai +07:00 di sini
    // karena ini bukan baca dari DB, melainkan konstruksi batas hari ini
    return new Date(wibStr + "T00:00:00+07:00");
};


// ─────────────────────────────────────────────────────────────────────────────
// 1. Ambil semua kegiatan untuk admin
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllActivities = (req, res) => {
    const query = `
        SELECT a.*, 
            (SELECT COUNT(*) FROM activity_attendance WHERE activity_id = a.id AND status = 'hadir') AS hadir,
            (SELECT COUNT(*) FROM activity_attendance WHERE activity_id = a.id) AS peserta
        FROM activities a 
        ORDER BY a.start_datetime DESC`;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil data kegiatan", error: err });
        res.json(results);
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Buat kegiatan baru
// ─────────────────────────────────────────────────────────────────────────────
exports.createActivity = (req, res) => {
    const {
        title, description, location_name,
        latitude, longitude, radius_meters,
        start_datetime, end_datetime,
        audience, metode
    } = req.body;

    // ── Validasi: Nama Kegiatan ──────────────────────────────────────────────
    if (!title || title.trim() === "") {
        return res.status(400).json({ message: "Nama kegiatan wajib diisi." });
    }
    if (title.trim().length > 50) {
        return res.status(400).json({ message: "Nama kegiatan maksimal 50 karakter." });
    }

    // ── Validasi: Deskripsi ──────────────────────────────────────────────────
    if (description && description.trim().length > 150) {
        return res.status(400).json({ message: "Deskripsi maksimal 150 karakter." });
    }

    // ── Validasi: Tanggal ────────────────────────────────────────────────────
    if (!start_datetime || !end_datetime) {
        return res.status(400).json({ message: "Tanggal mulai dan selesai wajib diisi." });
    }

    // Data dari DB sudah WIB → parse langsung tanpa offset tambahan
    const startDate = parseDateTime(start_datetime);
    const endDate   = parseDateTime(end_datetime);
    const today     = todayWIB();

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Format tanggal tidak valid." });
    }
    if (startDate < today) {
        return res.status(400).json({ message: "Tanggal mulai tidak boleh sebelum hari ini." });
    }
    if (endDate < startDate) {
        return res.status(400).json({ message: "Tanggal selesai tidak boleh sebelum tanggal mulai." });
    }

    // ── Validasi: Lokasi & Koordinat ─────────────────────────────────────────
    if (!location_name || location_name.trim() === "") {
        return res.status(400).json({ message: "Nama lokasi wajib diisi." });
    }
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
        return res.status(400).json({ message: "Koordinat lokasi wajib ditentukan." });
    }

    const selectedAudience = normalizeAudience(audience);
    if (selectedAudience.length === 0) {
        return res.status(400).json({ message: "Pilih minimal satu kelompok peserta." });
    }

    db.query("SELECT id FROM periods WHERE is_active = TRUE LIMIT 1", (periodErr, periods) => {
        if (periodErr) return res.status(500).json({ message: "Gagal mengambil periode aktif", error: periodErr });
        if (periods.length === 0) return res.status(400).json({ message: "Aktifkan periode kepengurusan terlebih dahulu." });

        const periodId = periods[0].id;
        getActivityParticipants(periodId, selectedAudience, (participantErr, participants) => {
            if (participantErr) return res.status(500).json({ message: "Gagal mengambil peserta kegiatan", error: participantErr });
            if (selectedAudience.includes("sekretaris") && !participants.some(participant => participant.is_secretary)) {
                return res.status(400).json({ message: "Belum ada anggota aktif dengan jabatan Sekretaris Menteri pada periode ini." });
            }
            if (participants.length === 0) return res.status(400).json({ message: "Tidak ada anggota pada kelompok peserta yang dipilih." });

            const kode_qr = "KEG-" + crypto.randomBytes(2).toString("hex").toUpperCase();
            const query = `
                INSERT INTO activities
                    (title, description, location_name, latitude, longitude, radius_meters, start_datetime, end_datetime, kode_qr, metode, audience, period_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const values = [
                title.trim(), description ? description.trim() : "", location_name.trim(),
                latitude, longitude, radius_meters || 100, start_datetime, end_datetime,
                kode_qr, metode || "keduanya", selectedAudience.join(","), periodId,
            ];

            db.query(query, values, (err, result) => {
                if (err) return res.status(500).json({ message: "Gagal membuat kegiatan", error: err });
                const activityId = result.insertId;
                const attendanceValues = participants.map(({ user_id, member_type }) => [activityId, user_id, member_type, "tidak_hadir"]);
                db.query(
                    "INSERT INTO activity_attendance (activity_id, user_id, member_type, status) VALUES ?",
                    [attendanceValues],
                    insertErr => {
                        if (insertErr) {
                            return db.query("DELETE FROM activities WHERE id = ?", [activityId], () =>
                                res.status(500).json({ message: "Gagal menyimpan daftar peserta", error: insertErr })
                            );
                        }
                        res.status(201).json({ message: "Kegiatan berhasil dibuat", id: activityId, kode: kode_qr, audience: selectedAudience });
                    }
                );
            });
        });
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Update kegiatan
// ─────────────────────────────────────────────────────────────────────────────
exports.updateActivity = async (req, res) => {
    const { id } = req.params;
    const {
        title, description, location_name,
        latitude, longitude, radius_meters,
        start_datetime, end_datetime, audience
    } = req.body;

    // ── Validasi: Nama Kegiatan ──────────────────────────────────────────────
    if (!title || title.trim() === "") {
        return res.status(400).json({ message: "Nama kegiatan wajib diisi." });
    }
    if (title.trim().length > 50) {
        return res.status(400).json({ message: "Nama kegiatan maksimal 50 karakter." });
    }

    // ── Validasi: Deskripsi ──────────────────────────────────────────────────
    if (description && description.trim().length > 150) {
        return res.status(400).json({ message: "Deskripsi maksimal 150 karakter." });
    }

    // ── Validasi: Tanggal ────────────────────────────────────────────────────
    if (!start_datetime || !end_datetime) {
        return res.status(400).json({ message: "Tanggal mulai dan selesai wajib diisi." });
    }

    // Data dari DB sudah WIB → parse langsung tanpa offset tambahan
    const startDate = parseDateTime(start_datetime);
    const endDate   = parseDateTime(end_datetime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Format tanggal tidak valid." });
    }
    if (endDate < startDate) {
        return res.status(400).json({ message: "Tanggal selesai tidak boleh sebelum tanggal mulai." });
    }

    // ── Validasi: Lokasi & Koordinat ─────────────────────────────────────────
    if (!location_name || location_name.trim() === "") {
        return res.status(400).json({ message: "Nama lokasi wajib diisi." });
    }
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
        return res.status(400).json({ message: "Koordinat lokasi wajib ditentukan." });
    }

    let connection;
    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();
        const [activities] = await connection.query(
            "SELECT id, period_id, audience, start_datetime FROM activities WHERE id = ? FOR UPDATE",
            [id]
        );
        if (activities.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Kegiatan tidak ditemukan" });
        }

        const activity = activities[0];
        const selectedAudience = audience === undefined
            ? normalizeAudience(activity.audience)
            : normalizeAudience(audience);
        if (selectedAudience.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Pilih minimal satu kelompok peserta." });
        }

        const currentAudience = normalizeAudience(activity.audience);
        const audienceChanged = selectedAudience.join(",") !== currentAudience.join(",");
        const shouldSyncParticipants = audienceChanged || !activity.period_id;
        if (audienceChanged && parseDateTime(activity.start_datetime) <= new Date()) {
            await connection.rollback();
            return res.status(409).json({ message: "Audiens kegiatan tidak dapat diubah setelah kegiatan dimulai." });
        }
        if (audienceChanged) {
            const [attendance] = await connection.query(
                "SELECT COUNT(*) AS checked_in FROM activity_attendance WHERE activity_id = ? AND check_in_time IS NOT NULL",
                [id]
            );
            if (Number(attendance[0]?.checked_in) > 0) {
                await connection.rollback();
                return res.status(409).json({ message: "Audiens kegiatan tidak dapat diubah setelah absensi pertama tercatat." });
            }
        }

        let periodId = activity.period_id;
        let participants = null;
        if (shouldSyncParticipants) {
            if (!periodId) {
                const [periods] = await connection.query("SELECT id FROM periods WHERE is_active = TRUE LIMIT 1");
                periodId = periods[0]?.id;
            }
            if (!periodId) {
                await connection.rollback();
                return res.status(400).json({ message: "Periode kegiatan tidak ditemukan." });
            }

            const participantQueries = [];
            const participantParams = [];
            if (selectedAudience.includes("bem")) {
                participantQueries.push("SELECT user_id, 'bem' AS member_type, FALSE AS is_secretary FROM user_periods WHERE period_id = ? AND is_active = TRUE");
                participantParams.push(periodId);
            }
            if (selectedAudience.includes("sekretaris")) {
                participantQueries.push("SELECT user_id, 'bem' AS member_type, TRUE AS is_secretary FROM user_periods WHERE period_id = ? AND is_active = TRUE AND LOWER(jabatan) = 'sekretaris menteri'");
                participantParams.push(periodId);
            }
            if (selectedAudience.includes("igm")) {
                participantQueries.push("SELECT user_id, 'igm' AS member_type, FALSE AS is_secretary FROM igm_members WHERE period_id = ? AND is_active = TRUE");
                participantParams.push(periodId);
            }
            const [rows] = await connection.query(participantQueries.join(" UNION ALL "), participantParams);
            participants = uniqueParticipants(rows);
            if (selectedAudience.includes("sekretaris") && !participants.some(participant => participant.is_secretary)) {
                await connection.rollback();
                return res.status(400).json({ message: "Belum ada anggota aktif dengan jabatan Sekretaris Menteri pada periode ini." });
            }
            if (participants.length === 0) {
                await connection.rollback();
                return res.status(400).json({ message: "Tidak ada anggota pada kelompok peserta yang dipilih." });
            }
        }

        await connection.query(
            `UPDATE activities SET title = ?, description = ?, location_name = ?,
             latitude = ?, longitude = ?, radius_meters = ?, start_datetime = ?, end_datetime = ?,
             audience = ?, period_id = ? WHERE id = ?`,
            [title.trim(), description ? description.trim() : "", location_name.trim(), latitude,
                longitude, radius_meters || 100, start_datetime, end_datetime,
                selectedAudience.join(","), periodId, id]
        );

        if (shouldSyncParticipants) {
            const participantIds = participants.map(participant => participant.user_id);
            if (audienceChanged) {
                const placeholders = participantIds.map(() => "?").join(",");
                await connection.query(
                    `DELETE FROM activity_attendance WHERE activity_id = ? AND user_id NOT IN (${placeholders})`,
                    [id, ...participantIds]
                );
            }
            const valuePlaceholders = participants.map(() => "(?, ?, ?, 'tidak_hadir')").join(",");
            const attendanceValues = participants.flatMap(participant => [id, participant.user_id, participant.member_type]);
            await connection.query(
                `INSERT INTO activity_attendance (activity_id, user_id, member_type, status)
                 VALUES ${valuePlaceholders}
                 ON DUPLICATE KEY UPDATE member_type = VALUES(member_type)`,
                attendanceValues
            );
        }

        await connection.commit();
        res.json({ message: "Kegiatan berhasil diperbarui", audience: selectedAudience });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Gagal memperbarui kegiatan", error: err.message });
    } finally {
        connection?.release();
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Hapus kegiatan
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteActivity = (req, res) => {
    const { id } = req.params;
    db.query(`DELETE FROM activities WHERE id = ?`, [id], (err, result) => {
        if (err) return res.status(500).json({ message: "Gagal menghapus kegiatan", error: err });
        res.json({ message: "Kegiatan berhasil dihapus" });
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Ambil detail absensi per kegiatan (untuk drawer Kelola Absensi)
// ─────────────────────────────────────────────────────────────────────────────
exports.getActivityAttendance = (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            u.id            AS user_id,
            u.name, 
            u.nim,
            CASE WHEN aa.member_type = 'igm' THEN COALESCE(im.kementerian, up.kementerian) ELSE up.kementerian END AS kementerian,
            aa.member_type,
            up.jabatan,
            aa.status, 
            aa.check_in_time,
            aa.selfie_photo
        FROM activity_attendance aa
        JOIN activities a ON a.id = aa.activity_id
        JOIN users u ON aa.user_id = u.id
        LEFT JOIN user_periods up ON up.user_id = u.id AND up.is_active = TRUE
            AND up.period_id = COALESCE(a.period_id, (SELECT id FROM periods WHERE is_active = TRUE LIMIT 1))
        LEFT JOIN igm_members im ON im.user_id = u.id
            AND im.period_id = COALESCE(a.period_id, (SELECT id FROM periods WHERE is_active = TRUE LIMIT 1))
        WHERE aa.activity_id = ?
        ORDER BY up.kementerian ASC, u.name ASC`;

    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ message: "Gagal mengambil detail absensi", error: err });
        res.json(results);
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Scan QR / Selfie absensi kegiatan
// ─────────────────────────────────────────────────────────────────────────────
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

        // Data dari DB sudah WIB → parse langsung tanpa offset tambahan
        const now   = new Date();
        const start = parseDateTime(activity.start_datetime);
        const end   = parseDateTime(activity.end_datetime);

        // Toleransi absen: bisa dilakukan 30 menit sebelum kegiatan mulai
        const startWithTolerance = new Date(start.getTime() - 30 * 60 * 1000);

        if (now < startWithTolerance) {
            return res.status(400).json({
                message: `Kegiatan belum dimulai. Absensi dibuka pada ${start.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}.`
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

            if (attendance.status === "hadir") {
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
                    check_in_time: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
                });
            });
        });
    });
};
const express    = require("express");
const router     = express.Router();
const memberCtrl = require("../controllers/memberController");

// ─── GET all members ──────────────────────────────────────────────────────────
router.get("/", memberCtrl.getMembers);

// ─── BULK: Harus diletakkan SEBELUM /:id ─────────────────────────────────────

// Nonaktifkan semua anggota di satu periode
// body: { period_id }
router.post("/bulk-deactivate", memberCtrl.bulkDeactivate);

// Salin semua anggota dari satu periode ke periode lain
// body: { from_period_id, to_period_id }
router.post("/copy-to-period", memberCtrl.copyToPeriod);

// ─── Routes dengan parameter dinamis /:id ────────────────────────────────────

// GET member by ID
router.get("/:id", memberCtrl.getMemberById);

// CREATE member (password otomatis: BEM + nim)
router.post("/", memberCtrl.createMember);

// UPDATE member (profil + role)
router.put("/:id", memberCtrl.updateMember);

// TOGGLE status aktif / non-aktif
router.patch("/:id/toggle-status", memberCtrl.toggleStatus);

// RESET password ke default (BEM + nim)
router.patch("/:id/reset-password", memberCtrl.resetPassword);

// DELETE member
router.delete("/:id", memberCtrl.deleteMember);

module.exports = router;
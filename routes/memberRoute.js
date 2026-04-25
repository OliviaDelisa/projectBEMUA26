const express    = require("express");
const router     = express.Router();
const memberCtrl = require("../controllers/memberController");

// ─── GET all members ──────────────────────────────────────────────────────────
router.get("/", memberCtrl.getMembers);

// ─── GET member by ID ─────────────────────────────────────────────────────────
router.get("/:id", memberCtrl.getMemberById);

// ─── CREATE member (password otomatis: BEM + nim) ────────────────────────────
router.post("/", memberCtrl.createMember);

// ─── UPDATE member (profil + role) ───────────────────────────────────────────
router.put("/:id", memberCtrl.updateMember);

// ─── TOGGLE status aktif / non-aktif ─────────────────────────────────────────
router.patch("/:id/toggle-status", memberCtrl.toggleStatus);

// ─── RESET password ke default (BEM + nim) ───────────────────────────────────
router.patch("/:id/reset-password", memberCtrl.resetPassword);

// ─── DELETE member ────────────────────────────────────────────────────────────
router.delete("/:id", memberCtrl.deleteMember);

module.exports = router;
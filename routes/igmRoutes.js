const express = require("express");
const router = express.Router();
const igmController = require("../controllers/igmController");

router.get("/", igmController.getMembers);
router.post("/", igmController.createMember);
router.post("/copy-to-period", igmController.copyToPeriod);
router.put("/:id", igmController.updateMember);
router.patch("/:id/reset-password", igmController.resetPassword);

module.exports = router;
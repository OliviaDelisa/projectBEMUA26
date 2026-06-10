const express = require("express");
const router  = express.Router();

const {
  getAllAspirasi,
  createAspirasi,
  updateStatus,
  updatePrioritas,
  updateCatatan,
} = require("../controllers/aspirasiController");

router.get(   "/",                getAllAspirasi);
router.post(  "/",                createAspirasi);
router.put(   "/:id/status",      updateStatus);
router.put(   "/:id/prioritas",   updatePrioritas);
router.put(   "/:id/catatan",     updateCatatan);

module.exports = router;
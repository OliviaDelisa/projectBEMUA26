const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/periodController");

router.get(    "/",           controller.getPeriods);
router.get(    "/:id",        controller.getPeriodById);
router.post(   "/",           controller.createPeriod);
router.put(    "/:id",        controller.updatePeriod);
router.patch(  "/:id/activate", controller.activatePeriod);
router.delete( "/:id",        controller.deletePeriod);

module.exports = router;
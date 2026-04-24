const express = require("express");
const router  = express.Router();
const { getRoles, createRole, deleteRole } = require("../controllers/roleController");

router.get("/",      getRoles);
router.post("/",     createRole);
router.delete("/:id", deleteRole);

module.exports = router;
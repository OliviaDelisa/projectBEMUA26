const express = require("express");
const router  = express.Router();
const { getPermissionsByRole, togglePermission } = require("../controllers/permissionController");

router.get("/", getPermissionsByRole);
router.put("/", togglePermission);

module.exports = router;
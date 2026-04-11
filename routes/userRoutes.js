const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post("/login", userController.loginUser);

// ─── CRUD Users ───────────────────────────────────────────────────────────────
router.get("/", userController.getUsers);
router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

// ─── Change Password ──────────────────────────────────────────────────────────
router.put("/:id/change-password", userController.changePassword);

module.exports = router;
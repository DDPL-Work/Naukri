const express = require("express");
const authController = require("../controllers/auth.controller");
const { protectAdmin } = require("../middleware/admin.middleware");
const adminController = require("../controllers/admin.controller");

const router = express.Router();

router.post("/auth/login", adminController.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);
router.get("/auth/me", protectAdmin, adminController.me);

router.get("/dashboard", protectAdmin, adminController.getDashboard);
router.get("/sections/:sectionKey", protectAdmin, adminController.getSection);

router.get("/users", protectAdmin, adminController.getUsers);
router.post("/users", protectAdmin, adminController.createUser);
router.put("/users/:source/:id", protectAdmin, adminController.updateUser);
router.delete("/users/:source/:id", protectAdmin, adminController.deleteUser);

router.get("/roles", protectAdmin, adminController.getRoles);
router.post("/roles", protectAdmin, adminController.createRole);
router.patch("/roles/:id/permissions", protectAdmin, adminController.updateRolePermissions);
router.post("/roles/:id/assign", protectAdmin, adminController.assignRole);

router.get("/notifications", protectAdmin, adminController.getNotifications);
router.patch("/notifications/:id/read", protectAdmin, adminController.markNotificationRead);
router.patch("/notifications/read-all", protectAdmin, adminController.markAllNotificationsRead);

module.exports = router;

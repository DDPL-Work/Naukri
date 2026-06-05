const express = require("express");
const authController = require("../controllers/auth.controller");
const controller = require("../controllers/zonal-manager.controller");
const { protectCRM } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const uploadProfilePhoto = require("../middleware/profile-image-upload.middleware");

const router = express.Router();

router.post("/auth/login", controller.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);

router.use(protectCRM);
router.use(role("ZONAL_MANAGER"));

router.patch("/auth/change-password", controller.changePassword);
router.get("/dashboard", controller.getDashboard);
router.get("/leads", controller.getLeads);
router.get("/state-managers/meta", controller.getStateManagerSignupMeta);
router.get("/state-managers/registry", controller.getStateManagerRegistry);
router.post("/state-managers", controller.createStateManagerAccount);
router.patch("/state-managers/:id/review", controller.reviewStateManagerAccount);
router.delete("/state-managers/:id", controller.deleteStateManagerAccount);
router.get("/state-managers", controller.getStateManagers);
router.patch("/leads/:id/assign", controller.assignLead);
router.patch("/leads/:id/status", controller.updateLeadStatus);
router.post("/leads/:id/activity", controller.logLeadActivity);
router.delete("/leads/:id/activity/:index", controller.deleteLeadActivity);
router.get("/profile", controller.getProfile);
router.patch("/profile", controller.updateProfile);
router.patch("/profile/photo", uploadProfilePhoto, controller.uploadProfilePhoto);

module.exports = router;

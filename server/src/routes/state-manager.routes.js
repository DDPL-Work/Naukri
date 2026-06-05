const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const controller = require("../controllers/state-manager.controller");
const leadGeneratorController = require("../controllers/lead-generator.controller");
const { protectCRM } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const uploadProfilePhoto = require("../middleware/profile-image-upload.middleware");

router.post("/auth/login", controller.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);

router.use(protectCRM);
router.use(role("STATE_MANAGER", "ADMIN"));

router.patch("/auth/change-password", controller.changePassword);
router.get("/profile", controller.getProfile);
router.patch("/profile", controller.updateProfile);
router.patch("/profile/photo", uploadProfilePhoto, controller.uploadProfilePhoto);

// Leads
router.get("/dashboard", controller.getDashboard);
router.get("/leads", controller.getLeads);
router.get("/fses", controller.getFSEs);
router.post("/team-members", controller.createManagedMember);
router.get("/team-members", controller.getManagedMembers);
router.get("/team-members/:id", controller.getManagedMemberById);
router.patch("/team-members/:id", controller.updateManagedMember);
router.patch("/team-members/:id/targets", controller.updateMemberTargets);
router.delete("/team-members/:id", controller.deleteManagedMember);
router.patch("/leads/:id/assign", controller.assignLead);
router.patch("/leads/:id/status", controller.updateLeadStatus);
router.post("/leads/:id/activity", leadGeneratorController.logLeadActivity);
router.delete("/leads/:id/activity/:index", leadGeneratorController.deleteLeadActivity);

module.exports = router;

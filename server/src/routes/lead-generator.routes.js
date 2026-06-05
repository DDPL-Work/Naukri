const express = require("express");
const multer = require("multer");
const authController = require("../controllers/auth.controller");
const controller = require("../controllers/lead-generator.controller");
const { protectCRM } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const uploadProfilePhoto = require("../middleware/profile-image-upload.middleware");

const router = express.Router();
const uploadClientJd = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 5,
  },
});

router.post("/auth/login", controller.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);
router.post("/client-intakes", uploadClientJd.array("jdFiles", 5), controller.submitClientIntake);

router.use(protectCRM);
router.use(role("LEAD_GENERATOR", "STATE_MANAGER", "APPROVER", "ADMIN"));

router.get("/meta", controller.getLeadGeneratorMeta);
router.get("/dashboard", controller.getLeadGeneratorDashboard);
router.get("/leads", controller.getLeads);
router.get("/clients", controller.getClientIntakes);
router.post("/leads", controller.createLead);
router.patch("/leads/:id/status", controller.updateLeadStatus);
router.post("/leads/:id/contacts", controller.addLeadContact);
router.post("/leads/:id/activity", controller.logLeadActivity);
router.delete("/leads/:id/activity/:index", controller.deleteLeadActivity);
router.patch("/auth/change-password", controller.changePassword);
router.get("/profile", controller.getProfile);
router.patch("/profile", controller.updateProfile);
router.patch("/profile/photo", uploadProfilePhoto, controller.uploadProfilePhoto);

module.exports = router;

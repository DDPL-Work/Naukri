const express = require("express");
const authController = require("../controllers/auth.controller");
const controller = require("../controllers/fse.controller");
const { protectCRM } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const uploadProfilePhoto = require("../middleware/profile-image-upload.middleware");

const router = express.Router();

router.post("/auth/login", controller.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);

router.use(protectCRM);
router.use(role("FSE", "ADMIN"));

router.patch("/auth/change-password", controller.changePassword);
router.get("/meta", controller.getLeadMeta);
router.get("/dashboard", controller.getDashboard);
router.post("/leads", controller.createLead);
router.get("/leads", controller.getLeads);
router.patch("/leads/:id", controller.updateLead);
router.patch("/leads/:id/status", controller.updateLeadStatus);
router.get("/transfer-candidate/:id", controller.getTransferCandidate);
router.patch("/leads/:id/projection", controller.updateLeadProjection);
router.patch("/leads/:id/transfer-to-sm", controller.transferLeadToSM);
router.post("/leads/:id/activity", controller.logLeadActivity);
router.delete("/leads/:id/activity/:index", controller.deleteLeadActivity);
router.get("/non-visit-days", controller.getNonVisitDays);
router.post("/non-visit-days", controller.addNonVisitDay);
router.delete("/non-visit-days/:id", controller.deleteNonVisitDay);
router.get("/profile", controller.getProfile);
router.patch("/profile", controller.updateProfile);
router.patch("/profile/photo", uploadProfilePhoto, controller.uploadProfilePhoto);

module.exports = router;

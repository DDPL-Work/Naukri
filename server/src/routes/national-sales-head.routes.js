const express = require("express");
const authController = require("../controllers/auth.controller");
const controller = require("../controllers/national-sales-head.controller");
const { protectCRM } = require("../middleware/auth.middleware");

const router = express.Router();

// Public
router.post("/auth/login", controller.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);

// Protected - NSH only (enforced in controller guards)
router.use(protectCRM);

router.get("/dashboard", controller.getDashboard);
router.get("/zones", controller.getZoneStats);
router.get("/leads", controller.getAllLeads);
router.get("/zonal-managers", controller.getZonalManagers);
router.post("/zonal-managers", controller.createZonalManager);
router.delete("/zonal-managers/:id", controller.deleteZonalManager);
router.get("/state-managers/overview", controller.getStateManagersOverview);
router.get("/performance/states", controller.getStatePerformance);
router.get("/performance/individual", controller.getIndividualPerformance);
router.get("/approvals/pending", controller.getPendingApprovals);
router.post("/approvals/:id/decision", controller.reviewApproval);
router.get("/approval-policy", controller.getApprovalPolicy);
router.put("/approval-policy", controller.updateApprovalPolicy);
router.get("/profile", controller.getProfile);

module.exports = router;

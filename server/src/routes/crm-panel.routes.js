const express = require("express");
const authController = require("../controllers/auth.controller");
const crmPanelController = require("../controllers/crm-panel.controller");
const { protectCrmPanel } = require("../middleware/crm-panel.middleware");
const uploadQrLogo = require("../middleware/qr-logo-upload.middleware");

const router = express.Router();

router.post("/auth/login", crmPanelController.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);
router.get("/auth/me", protectCrmPanel, crmPanelController.me);

router.get("/dashboard", protectCrmPanel, crmPanelController.getDashboard);

router.get("/clients", protectCrmPanel, crmPanelController.getClients);
router.post("/clients", protectCrmPanel, uploadQrLogo, crmPanelController.createClient);
router.put("/clients/:id", protectCrmPanel, uploadQrLogo, crmPanelController.updateClient);
router.patch(
  "/clients/:id/credentials",
  protectCrmPanel,
  crmPanelController.updateClientCredentials,
);

router.get("/jobs", protectCrmPanel, crmPanelController.getJobs);
router.post("/jobs", protectCrmPanel, crmPanelController.createJob);
router.put("/jobs/:id", protectCrmPanel, crmPanelController.updateJob);

router.get("/job-approvals", protectCrmPanel, crmPanelController.getJobApprovals);
router.patch(
  "/job-approvals/:id",
  protectCrmPanel,
  crmPanelController.updateJobApproval,
);
router.get(
  "/package-change-requests",
  protectCrmPanel,
  crmPanelController.getPackageChangeRequests,
);
router.patch(
  "/package-change-requests/:id",
  protectCrmPanel,
  crmPanelController.updatePackageChangeRequest,
);

router.get("/packages", protectCrmPanel, crmPanelController.getPackages);
router.put("/packages/:name", protectCrmPanel, crmPanelController.upsertPackage);

router.get("/qr-codes", protectCrmPanel, crmPanelController.getQRCodes);
router.post("/qr-codes", protectCrmPanel, crmPanelController.createQRCode);
router.get("/qr-codes/:id", protectCrmPanel, crmPanelController.getQRCode);
router.patch("/qr-codes/:id", protectCrmPanel, crmPanelController.updateQRCode);
router.patch("/qr-codes/:id/share", protectCrmPanel, crmPanelController.shareQRCode);

router.get("/candidates", protectCrmPanel, crmPanelController.getCandidates);
router.get("/applications", protectCrmPanel, crmPanelController.getApplications);
router.patch(
  "/applications/:id/status",
  protectCrmPanel,
  crmPanelController.updateApplicationStatus,
);

router.get(
  "/candidates/:candidateId/profile",
  protectCrmPanel,
  crmPanelController.getCandidateProfile,
);
router.patch(
  "/candidates/:candidateId",
  protectCrmPanel,
  crmPanelController.updateCandidate,
);

router.get(
  "/candidates/:candidateId/resume/download",
  protectCrmPanel,
  crmPanelController.downloadResume,
);

router.get("/notifications", protectCrmPanel, crmPanelController.getNotifications);
router.post("/notifications", protectCrmPanel, crmPanelController.createNotification);

router.get("/analytics", protectCrmPanel, crmPanelController.getAnalytics);
router.get("/settings", protectCrmPanel, crmPanelController.getSettings);
router.patch("/settings", protectCrmPanel, crmPanelController.updateSettings);

module.exports = router;

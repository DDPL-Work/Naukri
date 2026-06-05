const express = require("express");
const authController = require("../controllers/auth.controller");
const controller = require("../controllers/company-panel.controller");
const chatController = require("../controllers/chat.controller");
const { protectUser } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const uploadCompanyMedia = require("../middleware/company-media-upload.middleware");

const router = express.Router();

router.post("/auth/register", controller.register);
router.post("/auth/login", controller.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);

router.use(protectUser);
router.use(role("CLIENT"));

router.get("/dashboard", controller.getDashboard);
router.post("/jobs", controller.createJob);
router.get("/package-change-requests", controller.getPackageChangeRequests);
router.post("/package-change-requests", controller.createPackageChangeRequest);
router.get("/applications", controller.getApplications);
router.patch("/applications/:applicationId/status", controller.updateApplicationStatus);
router.get("/applications/:applicationId/resume/preview", controller.previewApplicationResume);
router.get("/chats", chatController.getCompanyThreads);
router.get("/chats/:threadId/messages", chatController.getCompanyThreadMessages);
router.post("/chats/:threadId/messages", chatController.sendCompanyMessage);
router.patch("/chats/:threadId/read", chatController.markCompanyThreadRead);
router.get("/profile", controller.getProfile);
router.patch("/profile", controller.updateProfile);
router.patch("/profile/media", uploadCompanyMedia, controller.updateCompanyMedia);

module.exports = router;

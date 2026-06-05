const express = require("express");
const multer = require("multer");
const authController = require("../controllers/auth.controller");
const candidateController = require("../controllers/candidate.controller");
const chatController = require("../controllers/chat.controller");
const {
  protectCandidate,
  protectCandidateManagers,
} = require("../middleware/candidate.middleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

router.post("/auth/register", upload.single("resume"), candidateController.register);
router.post("/auth/login", candidateController.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);
router.get("/landing/:token", candidateController.getLanding);

router.get("/auth/me", protectCandidate, candidateController.me);
router.get("/dashboard", protectCandidate, candidateController.getDashboard);
router.get("/quiz/ranking", candidateController.getQuizRanking);
router.get("/quiz/today", protectCandidate, candidateController.getTodayQuiz);
router.post("/quiz/today/submit", protectCandidate, candidateController.submitTodayQuiz);
router.get("/jobs", protectCandidate, candidateController.getJobs);
router.get("/jobs/:id", protectCandidate, candidateController.getJobDetail);
router.get("/jobs/:id/similar", protectCandidate, candidateController.getSimilarJobs);
router.patch("/jobs/:id/save", protectCandidate, candidateController.toggleSavedJob);
router.get("/companies/stats", candidateController.getCompanyStats);
router.get("/companies", candidateController.getCompanies);
router.get("/companies/:id", protectCandidate, candidateController.getCompanyDetail);
router.patch("/companies/:id/follow", protectCandidate, candidateController.toggleCompanyFollow);
router.post("/companies/:id/reviews", protectCandidate, candidateController.submitCompanyReview);
router.get("/applications", protectCandidate, candidateController.getApplications);
router.post("/applications", protectCandidate, candidateController.createApplication);
router.get("/chats", protectCandidate, chatController.getCandidateThreads);
router.get("/chats/:threadId/messages", protectCandidate, chatController.getCandidateThreadMessages);
router.post("/chats/:threadId/messages", protectCandidate, chatController.sendCandidateMessage);
router.patch("/chats/:threadId/read", protectCandidate, chatController.markCandidateThreadRead);
router.get("/profile", protectCandidate, candidateController.getProfile);
router.patch("/profile", protectCandidate, candidateController.updateProfile);
router.get("/profile/history", protectCandidate, candidateController.getProfileHistory);
router.post(
  "/profile/resume",
  protectCandidate,
  upload.single("resume"),
  candidateController.uploadResume,
);
router.post(
  "/profile/image",
  protectCandidate,
  upload.single("image"),
  candidateController.uploadProfileImage,
);
router.get("/notifications", protectCandidate, candidateController.getNotifications);
router.patch(
  "/notifications/:id/read",
  protectCandidate,
  candidateController.markNotificationRead,
);

router.get(
  "/exports/candidates",
  protectCandidateManagers,
  candidateController.exportCandidateProfiles,
);
router.get(
  "/exports/resumes",
  protectCandidateManagers,
  candidateController.exportCandidateResumes,
);

module.exports = router;

const express = require("express");
const multer = require("multer");
const candidateController = require("../controllers/candidate.controller");
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
router.get("/landing/:token", candidateController.getLanding);

router.get("/auth/me", protectCandidate, candidateController.me);
router.get("/dashboard", protectCandidate, candidateController.getDashboard);
router.get("/jobs", protectCandidate, candidateController.getJobs);
router.get("/jobs/:id", protectCandidate, candidateController.getJobDetail);
router.get("/jobs/:id/similar", protectCandidate, candidateController.getSimilarJobs);
router.get("/companies", protectCandidate, candidateController.getCompanies);
router.get("/companies/:id", protectCandidate, candidateController.getCompanyDetail);
router.get("/applications", protectCandidate, candidateController.getApplications);
router.post("/applications", protectCandidate, candidateController.createApplication);
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

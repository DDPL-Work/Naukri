// routes/landing.routes.js
const express = require("express");
const router = express.Router();

const {
  getHomeLandingData,
  getLandingPageData,
  getPublicJobs,
  getPublicCompanyDetail,
  getEmployerLandingData,
} = require("../controllers/landing.controller");

// Final URL:
// /api/v1/landing/home
router.get("/home", getHomeLandingData);

// /api/v1/landing/jobs
router.get("/jobs", getPublicJobs);

// /api/v1/landing/companies/:id - MUST come before /:token to avoid catching as token param
router.get("/companies/:id", getPublicCompanyDetail);

// /api/v1/landing/employer
router.get("/employer", getEmployerLandingData);

// Final URL:
// /api/v1/landing/:token - MUST be last to avoid catching specific routes
router.get("/:token", getLandingPageData);

module.exports = router;

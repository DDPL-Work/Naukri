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

// /api/v1/landing/employer
router.get("/employer", getEmployerLandingData);

// /api/v1/landing/companies/:id
router.get("/companies/:id", getPublicCompanyDetail);

// Final URL:
// /api/v1/landing/:token
router.get("/:token", getLandingPageData);

module.exports = router;

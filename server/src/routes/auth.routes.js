const express = require("express");
const router = express.Router();
const { authLimiter } = require("../middleware/rateLimit.middleware");

const {
  registerCandidate,
  login,
  logout,
  me,
  refresh,
  revoke,
  session,
} = require("../controllers/auth.controller");

router.post("/register", authLimiter, registerCandidate);
router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", logout);
router.post("/revoke", authLimiter, revoke);
router.get("/me", me);
router.get("/session", session);

module.exports = router;

const { Router } = require("express");
const emailController = require("../controllers/email.controller");

const router = Router();

router.post("/send", emailController.sendEmail);
router.post("/welcome", emailController.sendWelcomeEmail);
router.post("/password-reset", emailController.sendPasswordResetEmail);
router.post("/otp", emailController.sendOTPEmail);
router.post("/application-confirmation", emailController.sendApplicationConfirmation);
router.get("/verify", emailController.verifyConnection);
router.get("/status", emailController.getStatus);
router.get("/health", emailController.getHealth);
router.get("/metrics", emailController.getMetrics);
router.get("/readiness", emailController.getProductionReadiness);

module.exports = router;

const { Router } = require("express");
const { trackClick, unsubscribe, getClickStats } = require("../controllers/recommendations.controller");
const { protectUser } = require("../middleware/auth.middleware");

const router = Router();

router.get("/click", trackClick);
router.get("/unsubscribe", unsubscribe);
router.get("/stats", protectUser, getClickStats);

module.exports = router;

const { Router } = require("express");
const { protectUser } = require("../middleware/auth.middleware");
const { getPreferences, updatePreferences } = require("../controllers/notificationPreferences.controller");

const router = Router();

router.get("/", protectUser, getPreferences);
router.put("/", protectUser, updatePreferences);

module.exports = router;

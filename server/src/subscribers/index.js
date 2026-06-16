const logger = require("../config/logger");
const { registerCandidateSubscribers } = require("./candidate.subscriber");
const { registerRecruiterSubscribers } = require("./recruiter.subscriber");
const { registerAdminSubscribers } = require("./admin.subscriber");

function registerAllSubscribers() {
  registerCandidateSubscribers();
  registerRecruiterSubscribers();
  registerAdminSubscribers();
  logger.info("[notif] All email subscribers registered");
}

module.exports = { registerAllSubscribers };

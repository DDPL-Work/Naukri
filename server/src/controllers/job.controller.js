const Job = require("../models/Job");
const Company = require("../models/Company");
const User = require("../models/User");
const EventBus = require("../events/EventBus");
const { EVENTS } = require("../events/events");
const {
  loadPackageCatalog,
  applyCompanyPackageSnapshot,
} = require("../services/package-limit.service");

// Create job (CLIENT or CRM)
exports.createJob = async (req, res) => {
  const { title, description, location } = req.body;

  let companyId;

  if (req.user.role === "CLIENT") {
    companyId = req.user.companyId;
  } else if (req.user.role === "CRM") {
    companyId = req.body.companyId;
  }

  const company = await Company.findById(companyId);
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  const { packageLimitMap } = await loadPackageCatalog();
  const packageSnapshot = applyCompanyPackageSnapshot(company, packageLimitMap);

  if (packageSnapshot.dirty) {
    await company.save();
  }

  if (company.activeJobCount >= packageSnapshot.jobLimit) {
    return res.status(400).json({
      message: "Job limit exceeded for this package",
    });
  }

  const job = await Job.create({
    title,
    description,
    location,
    companyId,
    createdBy: req.user._id,
    approvalStatus:
      req.user.role === "CRM" ? "APPROVED" : "PENDING",
  });

  if (job.approvalStatus === "APPROVED") {
    company.activeJobCount += 1;
    await company.save();

    EventBus.emit(EVENTS.RECRUITER_JOB_POSTED, {
      email: req.user.email,
      jobTitle: job.title,
      jobId: job._id,
    });
  }

  res.status(201).json(job);
};

// CRM approves job
exports.approveJob = async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  job.approvalStatus = "APPROVED";
  await job.save();

  const company = await Company.findById(job.companyId);
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  const { packageLimitMap } = await loadPackageCatalog();
  const packageSnapshot = applyCompanyPackageSnapshot(company, packageLimitMap);

  if (packageSnapshot.dirty) {
    await company.save();
  }

  if (company.activeJobCount >= packageSnapshot.jobLimit) {
    return res.status(400).json({ message: "Job limit exceeded for this package" });
  }

  company.activeJobCount += 1;
  await company.save();

  const clientUser = company.clientUserId
    ? await User.findById(company.clientUserId).select("email").lean()
    : null;
  if (clientUser?.email) {
    EventBus.emit(EVENTS.RECRUITER_JOB_POSTED, {
      email: clientUser.email,
      jobTitle: job.title,
      jobId: job._id,
    });
  }

  res.json({ message: "Job approved" });
};

const QRCode = require("../models/QRCode");
const Job = require("../models/Job");
const User = require("../models/User");
const Company = require("../models/Company");
const Application = require("../models/Application");

const formatCompactCount = (value = 0) => {
  const count = Number(value || 0);

  if (count >= 10000000) return `${Math.round(count / 10000000)}Cr+`;
  if (count >= 100000) return `${Math.round(count / 100000)}L+`;
  if (count >= 1000) return `${Math.round(count / 1000)}K+`;
  return String(count);
};

const initialsFor = (name = "") =>
  String(name || "MJ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MJ";

const companyColors = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#dc2626", "#0891b2"];

const normalizeSearch = (value = "") => String(value || "").trim().toLowerCase();

const extractMinimumExperience = (value = "") => {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const jobMatchesSearch = (job, search = "") => {
  const terms = normalizeSearch(search)
    .split(/[\s,]+/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (!terms.length) return true;

  const skills = (Array.isArray(job.skills) ? job.skills : []).map((skill) => String(skill || "").toLowerCase());
  const stackAliases = [];
  const hasSkillAny = (aliases) => aliases.some((alias) =>
    skills.some((candidateSkill) => candidateSkill.includes(alias)),
  );

  if (
    hasSkillAny(["mongodb", "mongo"]) &&
    hasSkillAny(["express", "express.js"]) &&
    hasSkillAny(["react", "react.js"]) &&
    hasSkillAny(["node", "node.js"])
  ) {
    stackAliases.push("mern", "mern stack");
  }

  if (
    hasSkillAny(["mongodb", "mongo"]) &&
    hasSkillAny(["express", "express.js"]) &&
    hasSkillAny(["angular"]) &&
    hasSkillAny(["node", "node.js"])
  ) {
    stackAliases.push("mean", "mean stack");
  }

  const haystack = [
    job.title,
    job.department,
    job.location,
    job.experience,
    job.companyId?.name,
    job.companyId?.industry,
    ...(Array.isArray(job.skills) ? job.skills : []),
    ...stackAliases,
  ]
    .join(" ")
    .toLowerCase();

  return terms.every((term) => haystack.includes(term));
};

const jobMatchesLocation = (job, location = "") => {
  const normalizedLocation = normalizeSearch(location);
  if (!normalizedLocation) return true;

  return [job.location, job.workplaceType, job.companyId?.location?.city, job.companyId?.location?.region]
    .join(" ")
    .toLowerCase()
    .includes(normalizedLocation);
};

const jobMatchesExperience = (job, experience = "") => {
  const candidateExperience = extractMinimumExperience(experience);
  if (!candidateExperience) return true;

  const jobMinimumExperience = extractMinimumExperience(job.experience);
  return jobMinimumExperience <= candidateExperience;
};

const formatPublicJob = (job) => ({
  id: String(job._id),
  companyId: String(job.companyId?._id || job.companyId || ""),
  companyName: job.companyId?.name || "Unknown company",
  company: job.companyId
    ? {
      id: String(job.companyId._id),
      name: job.companyId.name,
      industry: job.companyId.industry || "",
      type: job.companyId.packageType || "",
      location: job.companyId.location || {},
    }
    : null,
  title: job.title || "",
  department: job.department || "",
  jobType: job.jobType || "",
  workplaceType: job.workplaceType || "",
  location: job.location || "",
  experience: job.experience || "",
  salaryMin: Number(job.salaryMin || 0),
  salaryMax: Number(job.salaryMax || 0),
  summary: job.summary || "",
  description: job.description || "",
  skills: Array.isArray(job.skills) ? job.skills : [],
  deadline: job.deadline || null,
  isActive: Boolean(job.isActive),
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
});

exports.getPublicJobs = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const location = String(req.query.location || "").trim();
    const experience = String(req.query.experience || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 60), 1), 100);

    const jobs = await Job.find({
      isActive: true,
      approvalStatus: "APPROVED",
    })
      .sort({ updatedAt: -1 })
      .limit(300)
      .populate("companyId", "name industry packageType location");

    const filteredJobs = jobs
      .filter((job) => jobMatchesSearch(job, search))
      .filter((job) => jobMatchesLocation(job, location))
      .filter((job) => jobMatchesExperience(job, experience))
      .slice(0, limit);

    return res.json({
      success: true,
      data: {
        jobs: filteredJobs.map(formatPublicJob),
        filters: { search, location, experience },
      },
    });
  } catch (error) {
    console.error("Public jobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
    });
  }
};

exports.getPublicCompanyDetail = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company || company.status !== "ACTIVE") {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const jobs = await Job.find({
      companyId: company._id,
      isActive: true,
      approvalStatus: "APPROVED",
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        company: {
          id: String(company._id),
          name: company.name,
          fullName: company.tagline || company.name,
          industry: company.industry || "General",
          type: company.packageType || "Private",
          size: company.companySize || company.employeesCount || "",
          founded: company.foundedYear || "",
          website: company.website || "",
          linkedIn: company.linkedIn || "",
          location: company.location?.city || company.headquarters || "",
          locationFull: [company.location?.city, company.location?.region].filter(Boolean).join(", ") || "",
          activelyHiring: company.activelyHiring !== false,
          activeJobCount: jobs.length,
          logo: initialsFor(company.name),
          logoUrl: company.logoUrl || "",
          about: company.about || "",
          mission: company.mission || "",
          vision: company.vision || "",
          whyJoinUs: Array.isArray(company.whyJoinUs) ? company.whyJoinUs : [],
        },
        jobs: jobs.map((job) => ({
          id: String(job._id),
          title: job.title,
          department: job.department || "General",
          experience: job.experience || "",
          location: job.location || company.location?.city || "",
          salaryMin: job.salaryMin || 0,
          salaryMax: job.salaryMax || 0,
          salary: job.salaryMin && job.salaryMax
            ? `${(job.salaryMin / 100000).toFixed(0)}-${(job.salaryMax / 100000).toFixed(0)} Lakhs PA`
            : "Not disclosed",
          skills: Array.isArray(job.skills) ? job.skills : [],
          jobType: job.jobType || "Full-time",
          workplaceType: job.workplaceType || "",
          summary: job.summary || "",
          description: job.description || "",
          postedAt: job.createdAt,
          deadline: job.deadline || null,
          hasApplied: false,
        })),
      },
    });
  } catch (error) {
    console.error("Public company detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch company profile",
    });
  }
};

exports.getEmployerLandingData = async (req, res) => {
  try {
    const [candidateCount, companyCount, activeJobs, hiredOrOffered, partners] = await Promise.all([
      User.countDocuments({ role: "CANDIDATE", isActive: true }),
      Company.countDocuments({ status: "ACTIVE" }),
      Job.countDocuments({ isActive: true, approvalStatus: "APPROVED" }),
      Application.countDocuments({ status: { $in: ["OFFERED", "HIRED"] } }),
      Company.find({ status: "ACTIVE" })
        .sort({ activeJobCount: -1, updatedAt: -1 })
        .limit(8)
        .select("name logoUrl industry"),
    ]);

    const successRate = activeJobs > 0
      ? Math.min(99, Math.round((hiredOrOffered / activeJobs) * 100))
      : 0;

    return res.json({
      success: true,
      data: {
        stats: [
          { value: formatCompactCount(candidateCount), label: "Registered jobseekers" },
          { value: formatCompactCount(companyCount), label: "Companies trust us" },
          { value: `${successRate}%`, label: "Offer conversion signal" },
          { value: formatCompactCount(activeJobs), label: "Active openings" },
        ],
        partners: partners.map((company) => ({
          id: String(company._id),
          name: company.name,
          logoUrl: company.logoUrl || "",
          industry: company.industry || "",
        })),
      },
    });
  } catch (error) {
    console.error("Employer landing error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employer landing data",
    });
  }
};

exports.getHomeLandingData = async (req, res) => {
  try {
    const [activeJobs, candidates, activeCompanies, monthlyOffers, companies, categoryRows, roleRows] =
      await Promise.all([
        Job.countDocuments({ isActive: true, approvalStatus: "APPROVED" }),
        User.countDocuments({ role: "CANDIDATE", isActive: true }),
        Company.countDocuments({ status: "ACTIVE", activelyHiring: true }),
        Application.countDocuments({
          status: { $in: ["OFFERED", "HIRED"] },
          updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
        Company.find({ status: "ACTIVE", activelyHiring: true })
          .sort({ activeJobCount: -1, openRoles: -1, updatedAt: -1 })
          .limit(8)
          .select("name tagline industry activeJobCount openRoles logoUrl"),
        Job.aggregate([
          { $match: { isActive: true, approvalStatus: "APPROVED" } },
          {
            $group: {
              _id: { $ifNull: ["$department", "General"] },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ]),
        Job.aggregate([
          { $match: { isActive: true, approvalStatus: "APPROVED" } },
          {
            $group: {
              _id: "$title",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 12 },
        ]),
      ]);

    const industryRows = await Job.aggregate([
      { $match: { isActive: true, approvalStatus: "APPROVED" } },
      {
        $lookup: {
          from: "companies",
          localField: "companyId",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: "$company" },
      {
        $group: {
          _id: { $ifNull: ["$company.industry", "General"] },
          jobs: { $sum: 1 },
        },
      },
      { $sort: { jobs: -1 } },
      { $limit: 6 },
    ]);

    return res.json({
      success: true,
      data: {
        stats: [
          { num: formatCompactCount(activeJobs), label: "Active Job Listings" },
          { num: formatCompactCount(candidates), label: "Registered Job Seekers" },
          { num: formatCompactCount(activeCompanies), label: "Companies Hiring" },
          { num: formatCompactCount(monthlyOffers), label: "Offers This Month" },
        ],
        topCategories: ["All", ...industryRows.map((item) => item._id).filter(Boolean)],
        companies: companies.map((company, index) => ({
          id: String(company._id),
          name: company.name,
          logo: initialsFor(company.name),
          logoUrl: company.logoUrl || "",
          color: companyColors[index % companyColors.length],
          rating: 4 + ((index % 6) / 10),
          reviews: formatCompactCount(Math.max(25, Number(company.activeJobCount || company.openRoles || 0) * 31)),
          desc: company.tagline || `${company.industry || "Growing"} company hiring on MavenJobs.`,
          jobs: Number(company.activeJobCount || company.openRoles || 0),
          category: company.industry || "General",
        })),
        categories: categoryRows.map((item) => ({
          label: item._id || "General",
          count: `${formatCompactCount(item.count)} jobs`,
          description: `Explore active ${item._id || "general"} openings from verified employers.`,
        })),
        popularSearches: roleRows.map((item) => item._id).filter(Boolean),
        jobRoles: roleRows.map((item) => ({
          name: item._id || "Open Role",
          count: `${formatCompactCount(item.count)} jobs`,
        })),
        trustedBrands: companies.slice(0, 5).map((company) => company.name),
      },
    });
  } catch (error) {
    console.error("Home landing error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch landing data",
    });
  }
};

exports.getLandingPageData = async (req, res) => {
  try {
    const { token } = req.params;

    const qr = await QRCode.findOne({
      token,
      isActive: true,
    }).populate("companyId");

    if (!qr) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired QR",
      });
    }

    // 🚨 IMPORTANT FIX
    if (!qr.companyId) {
      return res.status(404).json({
        success: false,
        message: "Company not found for this QR",
      });
    }

    const company = qr.companyId;

    const jobs = await Job.find({
      companyId: company._id,
      isActive: true,
    });

    qr.scans += 1;
    await qr.save();

    return res.json({
      success: true,
      data: {
        candidateWebUrl: process.env.CANDIDATE_WEB_URL || process.env.FRONTEND_URL || "",
        company: {
          ...company.toObject(),
          jobs,
        },
        scans: qr.scans,
      },
    });
  } catch (error) {
    console.error("Landing error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch landing data",
    });
  }
};

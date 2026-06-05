const mongoose = require("mongoose");

const candidateProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    phone: { type: String, default: "" },
    altPhone: { type: String, default: "" },
    headline: { type: String, default: "" },
    summary: { type: String, default: "" },
    totalExperience: { type: String, default: "" },
    currentTitle: { type: String, default: "" },
    currentCompany: { type: String, default: "" },
    noticePeriod: { type: String, default: "" },
    currentCity: { type: String, default: "" },
    currentState: { type: String, default: "" },
    currentCountry: { type: String, default: "India" },
    preferredLocations: {
      type: [String],
      default: [],
    },
    preferredRoles: {
      type: [String],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    linkedInUrl: { type: String, default: "" },
    portfolioUrl: { type: String, default: "" },
    expectedSalary: { type: String, default: "" },
    education: { type: String, default: "" },
    itSkills: { type: String, default: "" },
    projectTitle: { type: String, default: "" },
    projectLink: { type: String, default: "" },
    projectDescription: { type: String, default: "" },
    lastScannedQrToken: { type: String, default: "" },
    savedJobIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    }],
    followedCompanyIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    }],
    profilePic: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    coverPic: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    resume: {
      fileName: { type: String, default: "" },
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      storageProvider: { type: String, default: "" },
      sizeBytes: { type: Number, default: 0 },
      mimeType: { type: String, default: "" },
      uploadedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CandidateProfile", candidateProfileSchema);

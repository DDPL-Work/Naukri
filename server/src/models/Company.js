const mongoose = require("mongoose");

const highlightSchema = new mongoose.Schema({
  icon: String,
  title: String,
  desc: String,
});

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    tagline: String,
    industry: String,
    companySize: String,
    foundedYear: String,
    employeesCount: String,
    headquarters: String,

    website: String,
    linkedIn: String,
    logoUrl: { type: String, default: "" },
    logoPublicId: { type: String, default: "" },
    coverImageUrl: { type: String, default: "" },
    coverImagePublicId: { type: String, default: "" },
    activelyHiring: { type: Boolean, default: true },
    openRoles: Number,

    email: { type: String, required: true },
    phone: String,
    altPhone: String,

    location: {
      country: String,
      region: String,
      city: String,
      zone: String,
      address: String,
      pincode: String,
    },

    // ✅ NEW CONTENT FIELDS
    about: String,
    mission: String,
    vision: String,

    whyJoinUs: [highlightSchema],

    createdByCRM: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CrmUser",
      required: true,
    },
    clientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    packageType: {
      type: String,
      enum: ["STANDARD", "PREMIUM", "ELITE"],
      default: "STANDARD",
    },
    jobLimit: {
      type: Number,
      default: 2,
    },
    grandfatheredJobLimit: {
      type: Number,
      default: 0,
    },
    activeJobCount: { type: Number, default: 0 },
    configurationNotes: { type: String, default: "" },
    accountManager: { type: String, default: "" },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);

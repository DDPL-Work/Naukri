const mongoose = require("mongoose");

const adminNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["USER", "ROLE", "SYSTEM", "SECTION", "ALERT"],
      default: "SYSTEM",
    },
    severity: {
      type: String,
      enum: ["INFO", "MEDIUM", "HIGH", "CRITICAL"],
      default: "INFO",
    },
    status: {
      type: String,
      enum: ["UNREAD", "READ"],
      default: "UNREAD",
      index: true,
    },
    actionUrl: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

adminNotificationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("AdminNotification", adminNotificationSchema);

const mongoose = require("mongoose");

const BLOG_CATEGORIES = ["IT", "English", "Career", "Technology", "Interview Tips", "Resume & Cover Letter", "Salary & Growth", "Remote Work", "Product Updates"];

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      default: "",
      maxlength: 500,
    },
    coverImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    category: {
      type: String,
      required: true,
      enum: BLOG_CATEGORIES,
    },
    tags: {
      type: [String],
      default: [],
    },
    author: {
      name: { type: String, default: "Admin" },
      avatar: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      viewCount: { type: Number, default: 0 },
      readTimeMinutes: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ slug: 1 }, { unique: true });

blogSchema.statics.categories = BLOG_CATEGORIES;

blogSchema.pre("save", function () {
  if (this.isModified("content") && this.content) {
    const textOnly = this.content.replace(/<[^>]*>/g, "");
    const wordCount = textOnly.split(/\s+/).filter(Boolean).length;
    this.metadata.readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  }

  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

module.exports = mongoose.model("Blog", blogSchema);
module.exports.BLOG_CATEGORIES = BLOG_CATEGORIES;

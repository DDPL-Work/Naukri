const asyncHandler = require("../middleware/async.middleware");
const Blog = require("../models/Blog");
const { uploadBlogCoverImage, uploadBlogInlineImage, deleteBlogImage } = require("../services/blog-image-storage.service");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const slugify = (text) =>
  String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);

const ensureUniqueSlug = async (baseSlug, excludeId) => {
  let slug = baseSlug || "untitled";
  let counter = 0;

  while (counter < 50) {
    const candidate = counter === 0 ? slug : `${slug}-${counter}`;
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };

    const existing = await Blog.findOne(query);
    if (!existing) return candidate;
    counter += 1;
  }

  return `${slug}-${Date.now()}`;
};

const formatBlog = (blog) => ({
  id: String(blog._id),
  title: blog.title,
  slug: blog.slug,
  content: blog.content,
  excerpt: blog.excerpt,
  coverImage: blog.coverImage,
  category: blog.category,
  tags: blog.tags,
  author: blog.author,
  status: blog.status,
  publishedAt: blog.publishedAt,
  metadata: blog.metadata,
  createdAt: blog.createdAt,
  updatedAt: blog.updatedAt,
});

exports.getBlogs = asyncHandler(async (req, res) => {
  const { status, category, page = 1, limit = 20, search } = req.query;
  const query = {};

  if (status) query.status = status;
  if (category) query.category = category;
  if (search) query.title = { $regex: String(search).trim(), $options: "i" };

  const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Math.max(1, Number(limit)));
  const pageLimit = Math.min(100, Math.max(1, Number(limit)));

  const [blogs, total] = await Promise.all([
    Blog.find(query).sort({ updatedAt: -1 }).skip(skip).limit(pageLimit),
    Blog.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: blogs.map(formatBlog),
    pagination: {
      page: Math.max(1, Number(page)),
      limit: pageLimit,
      total,
      totalPages: Math.ceil(total / pageLimit),
    },
  });
});

exports.getBlogBySlug = asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug });

  if (!blog) {
    throw createHttpError(404, "Blog not found");
  }

  blog.metadata.viewCount += 1;
  await blog.save();

  res.status(200).json({
    success: true,
    data: formatBlog(blog),
  });
});

exports.getBlogById = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    throw createHttpError(404, "Blog not found");
  }

  res.status(200).json({
    success: true,
    data: formatBlog(blog),
  });
});

exports.createBlog = asyncHandler(async (req, res) => {
  const { title, content, excerpt, category, tags, authorName, status } = req.body;

  if (!title || !title.trim()) {
    throw createHttpError(400, "Blog title is required");
  }

  if (!content || !content.trim()) {
    throw createHttpError(400, "Blog content is required");
  }

  if (!category || !Blog.categories.includes(category)) {
    throw createHttpError(400, `Category must be one of: ${Blog.categories.join(", ")}`);
  }

  const slug = await ensureUniqueSlug(slugify(title));
  let coverImage = { url: "", publicId: "" };

  if (req.file) {
    coverImage = await uploadBlogCoverImage(req.file);
  }

  const blog = await Blog.create({
    title: title.trim(),
    slug,
    content,
    excerpt: String(excerpt || "").trim().slice(0, 500),
    coverImage,
    category,
    tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
    author: {
      name: String(authorName || "").trim() || "Admin",
      avatar: "",
    },
    status: status === "published" ? "published" : "draft",
  });

  res.status(201).json({
    success: true,
    data: formatBlog(blog),
  });
});

exports.updateBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    throw createHttpError(404, "Blog not found");
  }

  const { title, content, excerpt, category, tags, authorName, status } = req.body;

  if (title !== undefined) {
    if (!String(title).trim()) throw createHttpError(400, "Blog title cannot be empty");
    blog.title = String(title).trim();

    const newSlug = await ensureUniqueSlug(slugify(blog.title), blog._id);
    blog.slug = newSlug;
  }

  if (content !== undefined) {
    if (!String(content).trim()) throw createHttpError(400, "Blog content cannot be empty");
    blog.content = content;
  }

  if (excerpt !== undefined) blog.excerpt = String(excerpt).trim().slice(0, 500);
  if (category !== undefined) {
    if (!Blog.categories.includes(category)) throw createHttpError(400, `Category must be one of: ${Blog.categories.join(", ")}`);
    blog.category = category;
  }
  if (tags !== undefined) blog.tags = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  if (authorName !== undefined) blog.author.name = String(authorName).trim() || "Admin";

  if (status !== undefined) {
    if (!["draft", "published"].includes(status)) throw createHttpError(400, "Status must be draft or published");
    blog.status = status;
  }

  if (req.file) {
    if (blog.coverImage?.publicId) {
      await deleteBlogImage(blog.coverImage.publicId);
    }
    blog.coverImage = await uploadBlogCoverImage(req.file);
  }

  await blog.save();

  res.status(200).json({
    success: true,
    data: formatBlog(blog),
  });
});

exports.deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    throw createHttpError(404, "Blog not found");
  }

  if (blog.coverImage?.publicId) {
    await deleteBlogImage(blog.coverImage.publicId);
  }

  await Blog.deleteOne({ _id: blog._id });

  res.status(200).json({
    success: true,
    message: "Blog deleted successfully",
  });
});

exports.toggleBlogStatus = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    throw createHttpError(404, "Blog not found");
  }

  blog.status = blog.status === "published" ? "draft" : "published";

  if (blog.status === "published" && !blog.publishedAt) {
    blog.publishedAt = new Date();
  }

  await blog.save();

  res.status(200).json({
    success: true,
    data: formatBlog(blog),
  });
});

exports.uploadInlineImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw createHttpError(400, "Image file is required");
  }

  const result = await uploadBlogInlineImage(req.file);

  res.status(200).json({
    success: true,
    data: { url: result.url },
  });
});

exports.getPublishedBlogs = asyncHandler(async (req, res) => {
  const { category, page = 1, limit = 12 } = req.query;
  const query = { status: "published" };

  if (category) query.category = category;

  const skip = (Math.max(1, Number(page)) - 1) * Math.min(50, Math.max(1, Number(limit)));
  const pageLimit = Math.min(50, Math.max(1, Number(limit)));

  const [blogs, total] = await Promise.all([
    Blog.find(query).sort({ publishedAt: -1 }).skip(skip).limit(pageLimit),
    Blog.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: blogs.map(formatBlog),
    pagination: {
      page: Math.max(1, Number(page)),
      limit: pageLimit,
      total,
      totalPages: Math.ceil(total / pageLimit),
    },
  });
});

exports.getBlogCategories = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: Blog.categories,
  });
});

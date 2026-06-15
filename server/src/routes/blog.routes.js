const express = require("express");
const { protectAdmin } = require("../middleware/admin.middleware");
const { uploadCover, uploadInline } = require("../middleware/blog-image-upload.middleware");
const blogController = require("../controllers/blog.controller");

const router = express.Router();

router.get("/categories", blogController.getBlogCategories);
router.get("/published", blogController.getPublishedBlogs);
router.get("/:slug", blogController.getBlogBySlug);

router.use(protectAdmin);

router.get("/", blogController.getBlogs);
router.get("/id/:id", blogController.getBlogById);
router.post("/", uploadCover, blogController.createBlog);
router.put("/:id", uploadCover, blogController.updateBlog);
router.delete("/:id", blogController.deleteBlog);
router.patch("/:id/toggle-status", blogController.toggleBlogStatus);
router.post("/upload-inline", uploadInline, blogController.uploadInlineImage);

module.exports = router;

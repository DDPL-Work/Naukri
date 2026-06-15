const multer = require("multer");

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const error = new Error("Only JPG, PNG, WEBP, or GIF images are allowed.");
      error.statusCode = 400;
      cb(error);
      return;
    }
    cb(null, true);
  },
});

module.exports = { uploadCover: upload.single("coverImage"), uploadInline: upload.single("inlineImage") };

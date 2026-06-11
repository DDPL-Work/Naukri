const errorMiddleware = (err, req, res, next) => {
  if (err?.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        message: "File size exceeds the 8MB upload limit",
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: err.message || "Invalid file upload request",
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const safeMessage =
    statusCode >= 500
      ? process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error"
      : err.message || "Internal Server Error";

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  } else {
    console.warn(`[${req.method} ${req.originalUrl}] ${statusCode} ${safeMessage}`);
  }

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    ...(process.env.NODE_ENV !== "production" && err.stack && statusCode >= 500
      ? { stack: err.stack }
      : {}),
  });
};

module.exports = errorMiddleware;

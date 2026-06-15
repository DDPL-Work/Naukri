const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (file, folder) => new Promise((resolve, reject) => {
  if (!file || !file.buffer) {
    return reject(new Error("No file buffer provided"));
  }

  const uploadStream = cloudinary.uploader.upload_stream(
    {
      folder: `blog_images/${folder}`,
      resource_type: "image",
      quality: "auto",
      fetch_format: "auto",
    },
    (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        url: result.secure_url,
        publicId: result.public_id,
      });
    },
  );

  streamifier.createReadStream(file.buffer).pipe(uploadStream);
});

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    return null;
  }
};

async function uploadBlogCoverImage(file) {
  return uploadToCloudinary(file, "covers");
}

async function uploadBlogInlineImage(file) {
  return uploadToCloudinary(file, "inline");
}

async function deleteBlogImage(publicId) {
  return deleteFromCloudinary(publicId);
}

module.exports = {
  uploadBlogCoverImage,
  uploadBlogInlineImage,
  deleteBlogImage,
};

const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions =
    /\.(jpeg|jpg|png|webp|gif|pdf|doc|docx|xls|xlsx|txt|csv)$/i;

  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ];

  const extensionAllowed = allowedExtensions.test(
    path.extname(file.originalname)
  );

  const mimeTypeAllowed = allowedMimeTypes.includes(
    file.mimetype
  );

  if (extensionAllowed && mimeTypeAllowed) {
    return cb(null, true);
  }

  return cb(
    new Error(
      "Only images and common document formats are allowed!"
    )
  );
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
});

module.exports = upload;
import multer from "multer";

// storage di memory (buffer)
const storageMemory = multer.memoryStorage();

export const uploadMemory = multer({
  storage: storageMemory,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File harus berupa gambar"), false);
    }
    cb(null, true);
  },
});

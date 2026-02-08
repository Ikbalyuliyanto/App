import multer from "multer";

// storage di memory (buffer)
const storageMemory = multer.memoryStorage();

export const uploadMemory = multer({
  storage: storageMemory,
  limits: {
    fileSize: 3 * 1024 * 1024, // 2MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File harus berupa gambar"), false);
    }
    cb(null, true);
  },
});

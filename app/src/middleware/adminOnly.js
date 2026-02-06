export default function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Belum login" });
  if (req.user.peran !== "ADMIN") {
    return res.status(403).json({ message: "Akses admin ditolak" });
  }
  next();
}

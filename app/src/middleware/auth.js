import jwt from "jsonwebtoken";

export default function authJWT(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Token tidak ada" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, peran, email, ... }
    next();
  } catch (e) {
    return res.status(401).json({ message: "Token tidak valid" });
  }
}

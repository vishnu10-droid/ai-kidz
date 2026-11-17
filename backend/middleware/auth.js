const jwt = require("jsonwebtoken");
function requireAuth(req, res, next) { const token = req.headers.authorization?.replace(/^Bearer\s+/i, ""); if (!token) return res.status(401).json({ message: "Authentication required" }); try { req.user = jwt.verify(token, process.env.JWT_SECRET); return next(); } catch { return res.status(401).json({ message: "Invalid or expired token" }); } }
const authorizeRoles = (...allowed) => (req, res, next) => req.user?.roles?.some((role) => allowed.includes(role)) ? next() : res.status(403).json({ message: "Insufficient permissions" });
module.exports = { requireAuth, authorizeRoles };

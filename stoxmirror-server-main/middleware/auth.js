const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Fail loud at boot rather than silently signing/verifying tokens with
  // "undefined" — that would let anyone forge a valid admin token.
  throw new Error("JWT_SECRET environment variable is not set.");
}

function signAdminToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, isAdmin: true },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

// Protects admin-only routes. Expects `Authorization: Bearer <token>`.
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid authorization header" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { signAdminToken, requireAdmin };

const jwt = require("jsonwebtoken");
const { cookies } = require("next/headers");

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";
const COOKIE_NAME = "zadania-pro-auth";

const PASSWORDS = {
  admin: process.env.ADMIN_PASSWORD || "admin2026!",
  collaborator: process.env.COLLABORATOR_PASSWORD || "team2026!",
  client: process.env.CLIENT_PASSWORD || "biostima2026!",
};

const ROLE_LABELS = {
  admin: "Admin",
  collaborator: "Współpracownik",
  client: "Klient",
};

function verifyPassword(role, password) {
  return PASSWORDS[role] === password;
}

function createToken(role) {
  return jwt.sign({ role }, JWT_SECRET, { expiresIn: "7d" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.role) return null;
  return { role: payload.role };
}

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

module.exports = {
  COOKIE_NAME,
  ROLE_LABELS,
  verifyPassword,
  createToken,
  verifyToken,
  getSession,
  requireAuth,
};

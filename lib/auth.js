const jwt = require("jsonwebtoken");
const { cookies } = require("next/headers");

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";
const COOKIE_NAME = "zadania-pro-auth";

function readEnv(key, fallback) {
  const v = process.env[key];
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim();
  return s === "" ? fallback : s;
}

const PASSWORDS = {
  admin: readEnv("ADMIN_PASSWORD", "admin2026!"),
  admin2: readEnv("ADMIN2_PASSWORD", "admin2_2026!"),
  collaborator: readEnv("COLLABORATOR_PASSWORD", "team2026!"),
  client: readEnv("CLIENT_PASSWORD", "biostima2026!"),
};

const ROLE_LABELS = {
  admin: "Admin 1",
  admin2: "Admin 2",
  collaborator: "Współpracownik",
  client: "Paweł",
};

function verifyPassword(role, password) {
  const expected = PASSWORDS[role];
  if (!expected) return false;
  const given = password != null ? String(password).trim() : "";
  return expected === given;
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

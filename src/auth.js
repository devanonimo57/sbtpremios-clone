// Hash de senha (bcryptjs, puro JS) + emissão/verificação de JWT + middleware.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-troque-em-producao";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";
const BCRYPT_ROUNDS = 10;

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(customer) {
  return jwt.sign(
    { sub: customer.id, phone: customer.phone, name: customer.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Extrai o token de "Authorization: Bearer <t>" ou do cookie sbt_token.
function extractToken(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  if (req.cookies && req.cookies.sbt_token) return req.cookies.sbt_token;
  return null;
}

export function requireAuth(req, res, next) {
  const token = extractToken(req);
  const payload = token && verifyToken(token);
  if (!payload) {
    return res.status(401).json({ statusCode: 401, message: "Não autorizado", error: "Unauthorized" });
  }
  req.customerId = payload.sub;
  next();
}

// Conta/auth espelhando o fluxo REAL do sbtpremios.com:
//   POST /customers/validateCustomerPhone -> login por CPF + Telefone => JWT
//   POST /customers/lookup                -> consulta CPF, devolve o nome (como o checkout faz)
//   POST /customers/registerCustomer      -> cria/atualiza cadastro (usado pelo checkout)
//   GET  /customers/guest-status          -> status por CPF/telefone
//
// Observação de produto: no site, o login é CPF + Telefone, sem senha.
// O nome vem de "consulta de bases" ao digitar o CPF. Aqui a consulta é mockada.
import { Router } from "express";
import { db } from "../db.js";
import { signToken } from "../auth.js";
import {
  isValidCpf,
  isValidPhone,
  isValidEmail,
  normalizePhone,
  onlyDigits,
  parseBirthDate,
} from "../validators.js";

const router = Router();

const bad = (res, message, code = 400) =>
  res.status(code).json({ statusCode: code, message, error: code === 409 ? "Conflict" : code === 404 ? "Not Found" : "Bad Request" });

function publicCustomer(c) {
  const { passwordHash, ...safe } = c;
  return safe;
}

// Base mock de "consulta de CPF" — simula o retorno de nome das bases públicas.
// CPFs conhecidos retornam um nome fixo; os demais geram um nome plausível.
const KNOWN_NAMES = {
  "70011942207": "Davi F. D. S.",
};
function lookupName(cpfDigits) {
  if (KNOWN_NAMES[cpfDigits]) return KNOWN_NAMES[cpfDigits];
  const existing = db.findCustomerByCpf(cpfDigits);
  if (existing) return existing.name;
  // Nome genérico derivado (apenas para demonstração do preenchimento automático).
  const iniciais = ["A.", "B.", "C.", "D.", "E.", "F."];
  const pick = iniciais[Number(cpfDigits.slice(-1)) % iniciais.length];
  return `Cliente ${pick} S.`;
}

// ---------- CONSULTA DE CPF (passo 1 do checkout) ----------
router.post("/customers/lookup", (req, res) => {
  const { cpf } = req.body || {};
  if (!isValidCpf(cpf)) return bad(res, "CPF inválido.");
  const cpfN = onlyDigits(cpf);
  const name = lookupName(cpfN);
  const existing = db.findCustomerByCpf(cpfN);
  return res.json({
    cpf: cpfN,
    name,
    registered: !!existing,
    // "Poderemos consultar bases públicas e privadas para validar seus dados."
  });
});

// ---------- LOGIN: CPF + Telefone -> "Acessar Conta" ----------
router.post("/customers/validateCustomerPhone", (req, res) => {
  const { cpf, phone } = req.body || {};
  if (!isValidCpf(cpf)) return bad(res, "CPF inválido.");
  if (!isValidPhone(phone)) return bad(res, "Telefone inválido.");

  const cpfN = onlyDigits(cpf);
  let customer = db.findCustomerByCpf(cpfN);

  // Se o CPF ainda não tem conta, cria na hora (identidade por CPF, sem senha).
  // O telefone é apenas registrado/atualizado — não precisa "bater" com nada.
  if (!customer) {
    customer = db.insertCustomer({
      id: db.nextId(),
      name: lookupName(cpfN),
      cpf: cpfN,
      phone: normalizePhone(phone),
      email: null,
      birthDate: null,
      balance: 0,
      createdAt: new Date().toISOString(),
    });
  } else {
    db.updateCustomer(customer.id, { phone: normalizePhone(phone) });
    customer = db.findCustomerById(customer.id);
  }

  const token = signToken(customer);
  res.cookie("sbt_token", token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
  return res.json({ token, customer: publicCustomer(customer) });
});

// ---------- CADASTRO (usado pelo checkout: CPF + nome + telefone + email) ----------
router.post("/customers/registerCustomer", (req, res) => {
  const { name, cpf, phone, email, birthDate } = req.body || {};
  if (!isValidCpf(cpf)) return bad(res, "CPF inválido.");
  if (!isValidPhone(phone)) return bad(res, "Telefone inválido.");
  if (email && !isValidEmail(email)) return bad(res, "E-mail inválido.");

  const cpfN = onlyDigits(cpf);
  const phoneN = normalizePhone(phone);
  let customer = db.findCustomerByCpf(cpfN);

  if (customer) {
    db.updateCustomer(customer.id, {
      name: name ? String(name).trim() : customer.name,
      phone: phoneN,
      email: email ? String(email).trim().toLowerCase() : customer.email,
      birthDate: birthDate ? parseBirthDate(birthDate) : customer.birthDate,
    });
    customer = db.findCustomerById(customer.id);
  } else {
    customer = db.insertCustomer({
      id: db.nextId(),
      name: (name && String(name).trim()) || lookupName(cpfN),
      cpf: cpfN,
      phone: phoneN,
      email: email ? String(email).trim().toLowerCase() : null,
      birthDate: parseBirthDate(birthDate),
      balance: 0,
      createdAt: new Date().toISOString(),
    });
  }

  const token = signToken(customer);
  return res.status(201).json({ token, customer: publicCustomer(customer) });
});

// ---------- STATUS ----------
router.get("/customers/guest-status", (req, res) => {
  const cpf = onlyDigits(req.query.cpf || "");
  const customer = cpf ? db.findCustomerByCpf(cpf) : null;
  return res.json({ isCustomer: !!customer });
});

export default router;

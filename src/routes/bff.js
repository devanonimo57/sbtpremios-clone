// Endpoints /bff/customer/* protegidos por JWT — espelham os paths do site.
//   GET  /bff/customer/balance      -> saldo do cliente logado
//   GET  /bff/customer/home         -> dados públicos da home + flag logado
//   GET  /bff/customer/winners-feed -> feed de ganhadores (público no site)
//   PUT  /bff/customer/balance/user/phone -> editar perfil (editProfile)
import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { isValidEmail } from "../validators.js";

const router = Router();

function publicCustomer(c) {
  const { passwordHash, ...safe } = c;
  return safe;
}

// Saldo / carteira do cliente autenticado.
router.get("/bff/customer/balance", requireAuth, (req, res) => {
  const c = db.findCustomerById(req.customerId);
  if (!c) return res.status(404).json({ statusCode: 404, message: "Cliente não encontrado" });
  return res.json({ balance: c.balance ?? 0, customer: publicCustomer(c) });
});

// "Quem sou eu" — atalho útil pro front confirmar a sessão.
router.get("/bff/customer/me", requireAuth, (req, res) => {
  const c = db.findCustomerById(req.customerId);
  if (!c) return res.status(404).json({ statusCode: 404, message: "Cliente não encontrado" });
  return res.json({ customer: publicCustomer(c) });
});

// Editar perfil (nome/email) — path real: editProfile.
router.put("/bff/customer/balance/user/phone", requireAuth, (req, res) => {
  const { name, email } = req.body || {};
  const patch = {};
  if (name && String(name).trim().length >= 3) patch.name = String(name).trim();
  if (email) {
    if (!isValidEmail(email)) return res.status(400).json({ statusCode: 400, message: "E-mail inválido." });
    patch.email = String(email).trim().toLowerCase();
  }
  const c = db.updateCustomer(req.customerId, patch);
  if (!c) return res.status(404).json({ statusCode: 404, message: "Cliente não encontrado" });
  return res.json({ customer: publicCustomer(c) });
});

// Home: pública, mas indica se há sessão válida (o site faz igual).
router.get("/bff/customer/home", (req, res) => {
  return res.json({
    banners: [{ id: "b1", image: "https://sbt-prod-public-bucket.s3.us-east-1.amazonaws.com/Banner0626.png" }],
    combos: [
      { titles: 7, price: 13.93 },
      { titles: 15, price: 29.85 },
      { titles: 25, price: 49.75 },
    ],
  });
});

// Feed de ganhadores (mock estável).
router.get("/bff/customer/winners-feed", (req, res) => {
  return res.json({
    winners: [
      { name: "Laurieny M. B. D. S.", amount: 200, state: "MT", when: "Hoje às 01:49" },
      { name: "Maria J. M. D. S.", amount: 100, state: "BA", when: "Ontem às 21:35" },
      { name: "Marcia R. D. S.", amount: 100, state: "SP", when: "Ontem às 01:38" },
    ],
  });
});

export default router;

// Checkout + PIX, espelhando o wizard de 4 passos do site.
//   POST /carts/purchase        -> cria o pedido (passo 1: resumo + dados pessoais)
//   POST /checkout/:id/pix      -> gera o "copia e cola" PIX (passo PIX)
//   GET  /checkout/:id/status   -> status do pagamento (aguardando/aprovado)
//   POST /checkout/:id/confirm  -> simula a confirmação do pagamento (demo)
import { Router } from "express";
import { db } from "../db.js";
import { isValidCpf, isValidPhone, isValidEmail, onlyDigits, normalizePhone } from "../validators.js";

const router = Router();
const UNIT_PRICE = 1.99; // valor unitário do título, igual ao site
const PIX_KEY = process.env.PIX_KEY || "sbtpremios@ilotto.com.br";
const MERCHANT = "SBT PREMIOS";
const CITY = "OSASCO";

const bad = (res, message, code = 400) =>
  res.status(code).json({ statusCode: code, message, error: "Bad Request" });

// ---- EMV BR Code (PIX estático) --------------------------------------------
// Monta o payload no formato TLV (id + tamanho + valor) e fecha com CRC16-CCITT.
function tlv(id, value) {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}
function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
function buildPixCode(amount, txid) {
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", PIX_KEY);
  const merchantAccount = tlv("26", gui + key);
  const payload =
    tlv("00", "01") +                          // Payload Format Indicator
    merchantAccount +                          // Merchant Account Information (PIX)
    tlv("52", "0000") +                        // Merchant Category Code
    tlv("53", "986") +                         // Moeda: BRL
    tlv("54", amount.toFixed(2)) +             // Valor
    tlv("58", "BR") +                          // País
    tlv("59", MERCHANT.slice(0, 25)) +         // Nome do recebedor
    tlv("60", CITY.slice(0, 15)) +             // Cidade
    tlv("62", tlv("05", txid.slice(0, 25)));   // Additional Data (txid)
  const withCrcId = payload + "6304";
  return withCrcId + crc16(withCrcId);
}

// ---------- CRIAR PEDIDO ----------
router.post("/carts/purchase", (req, res) => {
  const { cpf, name, phone, email, quantity, raffleTitle, address } = req.body || {};
  if (!isValidCpf(cpf)) return bad(res, "CPF inválido.");
  if (!isValidPhone(phone)) return bad(res, "Telefone inválido.");
  if (email && !isValidEmail(email)) return bad(res, "E-mail inválido.");
  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  const cpfN = onlyDigits(cpf);
  let customer = db.findCustomerByCpf(cpfN);
  if (!customer) {
    customer = db.insertCustomer({
      id: db.nextId(), name: (name && String(name).trim()) || "Cliente",
      cpf: cpfN, phone: normalizePhone(phone),
      email: email ? String(email).trim().toLowerCase() : null,
      birthDate: null, balance: 0, createdAt: new Date().toISOString(),
    });
  }

  const amount = Number((qty * UNIT_PRICE).toFixed(2));
  const order = db.insertOrder({
    id: db.nextId(),
    customerId: customer.id,
    cpf: cpfN,
    raffleTitle: raffleTitle || "MAIS DE R$400MIL EM PRÊMIOS E ATÉ R$10MIL NO PIÃO",
    quantity: qty,
    unitPrice: UNIT_PRICE,
    amount,
    address: address || null,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json({
    orderId: order.id,
    summary: { raffleTitle: order.raffleTitle, quantity: qty, unitPrice: UNIT_PRICE, amount },
  });
});

// ---------- GERAR PIX ----------
router.post("/checkout/:id/pix", (req, res) => {
  const order = db.findOrderById(parseInt(req.params.id, 10));
  if (!order) return bad(res, "Pedido não encontrado.", 404);

  const txid = `SBT${String(order.id).padStart(6, "0")}`;
  const pixCode = buildPixCode(order.amount, txid);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min, igual ao site

  db.updateOrder(order.id, { pixCode, txid, expiresAt });
  return res.json({ orderId: order.id, amount: order.amount, pixCode, txid, expiresAt });
});

// ---------- STATUS ----------
router.get("/checkout/:id/status", (req, res) => {
  const order = db.findOrderById(parseInt(req.params.id, 10));
  if (!order) return bad(res, "Pedido não encontrado.", 404);
  return res.json({ orderId: order.id, status: order.status, amount: order.amount });
});

// ---------- CONFIRMAR (demo — simula o webhook do PSP aprovando o PIX) ----------
router.post("/checkout/:id/confirm", (req, res) => {
  const order = db.findOrderById(parseInt(req.params.id, 10));
  if (!order) return bad(res, "Pedido não encontrado.", 404);
  db.updateOrder(order.id, { status: "paid", paidAt: new Date().toISOString() });
  return res.json({ orderId: order.id, status: "paid" });
});

// ---------- PIÃO DA SORTE (premiação instantânea pós-pagamento) ----------
// Gira o pião e revela o prêmio instantâneo no PIX. Resultado decidido no servidor
// e gravado no pedido (só pode ser jogado uma vez — "set-scratched").
const INSTANT_PRIZES = [5, 10, 20, 50, 100]; // valores possíveis no PIX
router.post("/checkout/:id/piao", (req, res) => {
  const order = db.findOrderById(parseInt(req.params.id, 10));
  if (!order) return bad(res, "Pedido não encontrado.", 404);
  if (order.status !== "paid") return bad(res, "Pague o pedido antes de girar o pião.");
  if (order.piaoPlayed) {
    return res.json({ orderId: order.id, alreadyPlayed: true, won: order.piaoWon, prize: order.piaoPrize });
  }
  // ~20% de chance de prêmio, ponderado para valores menores.
  const won = Math.random() < 0.2;
  const prize = won ? INSTANT_PRIZES[Math.floor(Math.random() ** 2 * INSTANT_PRIZES.length)] : 0;
  if (won) db.updateCustomer(order.customerId, { balance: (db.findCustomerById(order.customerId)?.balance || 0) + prize });
  db.updateOrder(order.id, { piaoPlayed: true, piaoWon: won, piaoPrize: prize, piaoAt: new Date().toISOString() });
  return res.json({ orderId: order.id, won, prize });
});

export default router;

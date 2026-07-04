// Smoke test end-to-end do fluxo real: consulta CPF, login CPF+telefone,
// criar pedido, gerar PIX (copia e cola válido), status e confirmação.
// Uso: node scripts/smoke.js  (com o servidor rodando em PORT ou 3000)
const BASE = `http://localhost:${process.env.PORT || 3000}`;
const API = `${BASE}/api/v2`;

let pass = 0, fail = 0;
function check(name, cond) { cond ? (pass++, console.log(`  ok   ${name}`)) : (fail++, console.log(`  FAIL ${name}`)); }
async function j(res) { return { status: res.status, body: await res.json().catch(() => ({})) }; }
const post = (p, b) => fetch(`${API}${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
const get = (p) => fetch(`${API}${p}`);

function genCpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dig = (arr, start) => { const s = arr.reduce((a, v, i) => a + v * (start - i), 0); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  const d1 = dig(n, 10); const d2 = dig([...n, d1], 11); return [...n, d1, d2].join("");
}
const cpf = genCpf();
const phone = "21990597727";

async function run() {
  console.log("→ lookup de CPF (preenche nome)");
  let r = await j(await post("/customers/lookup", { cpf }));
  check("lookup retorna 200", r.status === 200);
  check("lookup devolve um nome", !!r.body.name);

  console.log("→ login por CPF + telefone");
  r = await j(await post("/customers/validateCustomerPhone", { cpf, phone }));
  check("login retorna 200", r.status === 200);
  check("login retorna token", !!r.body.token);
  check("senha não vaza", !r.body.customer?.passwordHash);
  const token = r.body.token;

  console.log("→ CPF inválido no login");
  r = await j(await post("/customers/validateCustomerPhone", { cpf: "11111111111", phone }));
  check("cpf inválido retorna 400", r.status === 400);

  console.log("→ rota protegida com token");
  r = await j(await fetch(`${API}/bff/customer/balance`, { headers: { Authorization: `Bearer ${token}` } }));
  check("balance com token retorna 200", r.status === 200);

  console.log("→ rota protegida sem token");
  r = await j(await get("/bff/customer/balance"));
  check("balance sem token retorna 401", r.status === 401);

  console.log("→ criar pedido (checkout)");
  r = await j(await post("/carts/purchase", { cpf, name: "Cliente Teste", email: "t@ex.com", phone, quantity: 10, address: { cep: "23573120", uf: "RJ", numero: "834" } }));
  check("pedido retorna 201", r.status === 201);
  check("total = 10 x 1,99 = 19,90", r.body.summary?.amount === 19.9);
  const orderId = r.body.orderId;

  console.log("→ gerar PIX");
  r = await j(await post(`/checkout/${orderId}/pix`, {}));
  check("pix retorna 200", r.status === 200);
  check("pix code começa com 000201", (r.body.pixCode || "").startsWith("000201"));
  check("pix code tem CRC final", /6304[0-9A-F]{4}$/.test(r.body.pixCode || ""));

  console.log("→ status pendente");
  r = await j(await get(`/checkout/${orderId}/status`));
  check("status = pending", r.body.status === "pending");

  console.log("→ confirmar pagamento (demo)");
  r = await j(await post(`/checkout/${orderId}/confirm`, {}));
  check("confirm retorna paid", r.body.status === "paid");
  r = await j(await get(`/checkout/${orderId}/status`));
  check("status vira paid", r.body.status === "paid");

  console.log(`\n${pass} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(1); });

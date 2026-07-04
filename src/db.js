// Store JSON em arquivo — zero dependência nativa, portável em qualquer máquina.
// Guarda customers, guests e pedidos de recuperação. Escrita atômica (tmp + rename).
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "..", "data");
const DB_FILE = join(DATA_DIR, "db.json");

const EMPTY = { customers: [], guests: [], recoveries: [], orders: [], seq: 0 };

function ensure() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DB_FILE)) writeFileSync(DB_FILE, JSON.stringify(EMPTY, null, 2));
}

function load() {
  ensure();
  try {
    const parsed = JSON.parse(readFileSync(DB_FILE, "utf8"));
    // Backfill de chaves ausentes (migração de bancos criados em versões antigas).
    return { ...structuredClone(EMPTY), ...parsed };
  } catch {
    return structuredClone(EMPTY);
  }
}

function persist(state) {
  ensure();
  const tmp = DB_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, DB_FILE);
}

let state = load();

export const db = {
  nextId() {
    state.seq += 1;
    persist(state);
    return state.seq;
  },

  // ---- customers ----
  findCustomerByPhone(phone) {
    return state.customers.find((c) => c.phone === phone) || null;
  },
  findCustomerByCpf(cpf) {
    return state.customers.find((c) => c.cpf === cpf) || null;
  },
  findCustomerById(id) {
    return state.customers.find((c) => c.id === id) || null;
  },
  insertCustomer(customer) {
    state.customers.push(customer);
    persist(state);
    return customer;
  },
  updateCustomer(id, patch) {
    const c = state.customers.find((x) => x.id === id);
    if (!c) return null;
    Object.assign(c, patch);
    persist(state);
    return c;
  },

  // ---- guests ----
  upsertGuest(guest) {
    const i = state.guests.findIndex((g) => g.phone === guest.phone);
    if (i >= 0) state.guests[i] = { ...state.guests[i], ...guest };
    else state.guests.push(guest);
    persist(state);
    return state.guests.find((g) => g.phone === guest.phone);
  },
  findGuestByPhone(phone) {
    return state.guests.find((g) => g.phone === phone) || null;
  },

  // ---- recoveries (OTP de recuperação) ----
  pushRecovery(rec) {
    state.recoveries.push(rec);
    persist(state);
    return rec;
  },

  // ---- orders (checkout / PIX) ----
  insertOrder(order) {
    state.orders.push(order);
    persist(state);
    return order;
  },
  findOrderById(id) {
    return state.orders.find((o) => o.id === id) || null;
  },
  updateOrder(id, patch) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return null;
    Object.assign(o, patch);
    persist(state);
    return o;
  },
  ordersByCustomer(customerId) {
    return state.orders.filter((o) => o.customerId === customerId);
  },

  _raw() {
    return state;
  },
  reset() {
    state = structuredClone(EMPTY);
    persist(state);
  },
};

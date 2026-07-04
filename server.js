// Servidor do clone SBT Prêmios.
// - API sob /api/v2 (mesmo prefixo do site real: api.sbtpremios.com/api/v2/...)
// - Serve o mirror estático em sbtpremios.com/
// - Serve a tela de login/cadastro em /entrar
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import customersRouter from "./src/routes/customers.js";
import bffRouter from "./src/routes/bff.js";
import checkoutRouter from "./src/routes/checkout.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const API_BASE = process.env.API_BASE || "/api/v2";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Log simples de requisições.
app.use((req, _res, next) => {
  process.stdout.write(`${new Date().toISOString()} ${req.method} ${req.url}\n`);
  next();
});

// Health check (o front do site chama /health).
app.get(["/health", `${API_BASE}/health`], (_req, res) => res.json({ status: "ok" }));

// API
app.use(API_BASE, customersRouter);
app.use(API_BASE, bffRouter);
app.use(API_BASE, checkoutRouter);

// Front do clone (home + checkout + drawer de conta)
const PUBLIC_DIR = join(__dirname, "public");
app.get(["/", "/home"], (_req, res) => res.sendFile(join(PUBLIC_DIR, "index.html")));
app.get("/checkout", (_req, res) => res.sendFile(join(PUBLIC_DIR, "checkout.html")));
app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

// Mirror estático original (assets do site) sob /mirror e para _next/*
const MIRROR_DIR = join(__dirname, "..", "sbtpremios.com");
app.use("/mirror", express.static(MIRROR_DIR, { extensions: ["html"] }));
app.use("/_next", express.static(join(MIRROR_DIR, "_next")));

// 404 JSON para chamadas de API não encontradas
app.use(API_BASE, (_req, res) =>
  res.status(404).json({ statusCode: 404, message: "Endpoint não encontrado", error: "Not Found" })
);

app.listen(PORT, () => {
  process.stdout.write(`\nSBT Prêmios clone rodando em http://localhost:${PORT}\n`);
  process.stdout.write(`  Login:   http://localhost:${PORT}/entrar\n`);
  process.stdout.write(`  API:     http://localhost:${PORT}${API_BASE}\n`);
  process.stdout.write(`  Mirror:  http://localhost:${PORT}/\n\n`);
});

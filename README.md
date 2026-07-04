# SBT Prêmios — clone (frontend + backend)

Réplica local do sbtpremios.com, reconstruída depois de estudar o site real:
home, login por **CPF + Telefone** (drawer "Minha Conta"), e **checkout de 4 passos** com **PIX**.
Sem dependências nativas; roda em qualquer máquina com Node 18+.

## Rodar

```bash
cd backend
npm install
npm start
```

- Home: http://localhost:3000/
- Checkout: http://localhost:3000/checkout
- API: http://localhost:3000/api/v2

## Estrutura (fiel ao site real)

**Home** (`public/index.html`) — header azul `#0540fa`, banner, Super Combos (7/15/25 títulos),
seletor de números, "IR PARA PAGAMENTO", últimos ganhadores e resultados.

**Login** (`public/conta.js`) — o ícone de conta no header abre o drawer **"Minha Conta"**.
Deslogado: **CPF + Telefone → "Acessar Conta"** (sem senha, como no site).
Logado: nome, "Usuário logado", CPF/telefone mascarados, Meus Títulos, Editar Perfil, Sair.

**Checkout** (`public/checkout.html`) — wizard de 4 passos:

1. **Dados Pessoais** — CPF (preenche o **nome** via consulta), Email (obrigatório),
   Celular + Confirmar celular, checkboxes de marketing e Termos.
2. **Endereço de Entrega** — CEP autocompleta Estado/Cidade/Bairro/Logradouro (viacep); Número + Complemento.
3. **Pagamento PIX** — "Aguardando pagamento", timer de 5 min, instruções 1-2-3,
   **Copiar e pagar agora**, **Ver QR Code** (drawer com QR), **Já realizei o pagamento**.
4. **Confirmação** — pagamento aprovado, títulos gerados.

## API (`/api/v2`)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/customers/lookup` | Consulta CPF → devolve o nome (bases mock) | — |
| POST | `/customers/validateCustomerPhone` | Login por CPF + Telefone → `{ token, customer }` | — |
| POST | `/customers/registerCustomer` | Cria/atualiza cadastro (checkout) | — |
| GET  | `/customers/guest-status?cpf=` | Se o CPF já é cliente | — |
| POST | `/carts/purchase` | Cria o pedido (CPF, dados, endereço, qtd) | — |
| POST | `/checkout/:id/pix` | Gera o PIX copia-e-cola (EMV + CRC16) + expiração | — |
| GET  | `/checkout/:id/status` | Status do pagamento (pending/paid) | — |
| POST | `/checkout/:id/confirm` | Simula o webhook do PSP aprovando o PIX | — |
| GET  | `/bff/customer/balance` | Saldo + dados do cliente logado | JWT |
| GET  | `/bff/customer/winners-feed` | Feed de ganhadores | — |

## PIX

O "copia e cola" é um BR Code EMV real (TLV + CRC16-CCITT) — começa com `000201` e termina
com `6304<CRC>`. O QR é renderizado no front a partir desse código. A chave é mock
(`PIX_KEY` no `.env`); **não gera cobrança de verdade** — o passo 4 é simulado via `/confirm`.

## Diferenças propositais do site original

- O site trava o login quando o CPF já tem telefone cadastrado ("o telefone deve ser igual ao
  cadastrado"). Aqui o telefone é apenas coletado — **não precisa bater** com nada.
- A "consulta de bases" que preenche o nome é mockada.

## Testes

Com o servidor rodando: `npm run smoke` (16 checks — lookup, login, pedido, PIX, status, confirmação).

Troque `JWT_SECRET` e `PIX_KEY` antes de qualquer deploy. Projeto para desenvolvimento local.

// Drawer "Minha Conta" — login por CPF + Telefone (sem senha), igual ao site.
// Injeta o overlay+drawer no fim do body e liga qualquer botão [data-account].
(function () {
  const API = "/api/v2";
  const digits = (v) => (v || "").replace(/\D/g, "");
  const maskCpf = (d) => (d && d.length === 11 ? `***.***.***-${d.slice(9)}` : "—");
  const maskPhone = (d) => (d && d.length >= 10 ? `(${d.slice(0,2)}) *****-${d.slice(-4)}` : "—");
  const brl = (n) => "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const token = () => localStorage.getItem("sbt_token");

  const html = `
  <div class="overlay" id="acc-overlay"></div>
  <aside class="drawer" id="acc-drawer" aria-hidden="true">
    <div class="drawer-head"><h2>Minha Conta</h2><button class="drawer-close" id="acc-x" aria-label="Fechar">&times;</button></div>
    <div class="drawer-body">
      <div id="acc-msg" class="msg"></div>
      <div id="acc-login">
        <p class="muted" style="font-size:13px;margin:0 0 4px">Preencha os campos abaixo para acessar sua conta.</p>
        <label class="fld" for="acc-cpf-in">CPF</label>
        <input class="inp" id="acc-cpf-in" inputmode="numeric" placeholder="000.000.000-00" />
        <label class="fld" for="acc-phone-in">Telefone</label>
        <input class="inp" id="acc-phone-in" inputmode="tel" placeholder="(00) 00000-0000" />
        <button class="btn btn-blue" id="acc-enter" style="margin-top:16px">Acessar Conta</button>
      </div>
      <div id="acc-profile" style="display:none">
        <div style="display:flex;align-items:center;gap:12px;padding:6px 0 16px;border-bottom:1px solid #eee">
          <div id="acc-ini" style="width:48px;height:48px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px">–</div>
          <div><div id="acc-name" style="font-weight:700;font-size:16px">—</div><div style="font-size:12px;color:var(--green);font-weight:600">Usuário logado</div></div>
        </div>
        <div style="margin-top:14px"><div class="muted" style="font-size:12px">CPF</div><div id="acc-cpf-v" style="font-weight:600;letter-spacing:.5px">—</div></div>
        <div style="margin-top:14px"><div class="muted" style="font-size:12px">Telefone</div><div id="acc-phone-v" style="font-weight:600;letter-spacing:.5px">—</div></div>
        <div style="margin-top:14px"><div class="muted" style="font-size:12px">Saldo</div><div id="acc-bal" style="font-weight:600">R$ 0,00</div></div>
        <button class="btn btn-blue-outline" style="margin-top:18px" id="acc-tickets">Meus Títulos</button>
        <button class="btn btn-ghost" style="margin-top:10px" id="acc-edit">Editar Perfil</button>
        <button class="btn btn-danger" style="margin-top:10px" id="acc-logout">Sair</button>
      </div>
    </div>
  </aside>`;
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  document.body.appendChild(wrap);

  const $ = (id) => document.getElementById(id);
  const drawer = $("acc-drawer"), overlay = $("acc-overlay"), msg = $("acc-msg");
  const showMsg = (t, txt) => { msg.className = "msg " + (t === "ok" ? "ok" : "err"); msg.textContent = txt; };
  const clearMsg = () => { msg.className = "msg"; msg.textContent = ""; };

  function open() { drawer.classList.add("open"); overlay.classList.add("open"); drawer.setAttribute("aria-hidden","false"); hydrate(); }
  function close() { drawer.classList.remove("open"); overlay.classList.remove("open"); drawer.setAttribute("aria-hidden","true"); }
  $("acc-x").onclick = close; overlay.onclick = close;
  document.querySelectorAll("[data-account]").forEach((b) => (b.onclick = open));
  window.openConta = open;

  function renderProfile(c) {
    $("acc-login").style.display = "none";
    $("acc-profile").style.display = "block";
    const name = c.name || "Cliente";
    $("acc-name").textContent = name;
    $("acc-ini").textContent = (name.trim()[0] || "C").toUpperCase();
    $("acc-cpf-v").textContent = maskCpf(digits(c.cpf));
    $("acc-phone-v").textContent = maskPhone(digits(c.phone));
    $("acc-bal").textContent = brl(c.balance);
  }
  function renderLogin() { $("acc-profile").style.display = "none"; $("acc-login").style.display = "block"; }

  async function api(path, method, body, auth) {
    const headers = { "Content-Type": "application/json" };
    if (auth && token()) headers.Authorization = "Bearer " + token();
    const res = await fetch(API + path, { method, headers, credentials: "include", body: body ? JSON.stringify(body) : undefined });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  async function hydrate() {
    clearMsg();
    if (!token()) return renderLogin();
    const { ok, data } = await api("/bff/customer/balance", "GET", null, true);
    if (ok && data.customer) renderProfile({ ...data.customer, balance: data.balance });
    else { localStorage.removeItem("sbt_token"); renderLogin(); }
  }

  $("acc-enter").onclick = async () => {
    clearMsg();
    const btn = $("acc-enter"); btn.disabled = true;
    const { ok, data } = await api("/customers/validateCustomerPhone", "POST", {
      cpf: digits($("acc-cpf-in").value), phone: digits($("acc-phone-in").value),
    });
    btn.disabled = false;
    if (ok) { localStorage.setItem("sbt_token", data.token); localStorage.setItem("sbt_customer", JSON.stringify(data.customer)); renderProfile(data.customer); }
    else showMsg("err", data.message || "Não foi possível acessar.");
  };

  $("acc-tickets").onclick = () => showMsg("ok", "Você ainda não possui títulos. Participe na home!");
  $("acc-edit").onclick = async () => {
    const name = prompt("Novo nome:");
    if (name === null) return;
    const { ok, data } = await api("/bff/customer/balance/user/phone", "PUT", { name }, true);
    if (ok) { renderProfile(data.customer); showMsg("ok", "Perfil atualizado."); }
    else showMsg("err", data.message || "Erro ao atualizar.");
  };
  $("acc-logout").onclick = () => {
    if (!confirm("Deseja realmente sair?")) return;
    localStorage.removeItem("sbt_token"); localStorage.removeItem("sbt_customer");
    renderLogin();
  };
})();

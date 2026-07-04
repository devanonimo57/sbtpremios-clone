// Menu lateral (hamburger) — injeta o drawer esquerdo e liga as barrinhas do header.
// Incluído em todas as páginas. Espelha o menu do site: Início, Meus Títulos,
// Minhas Premiações, Últimos Resultados, Sobre Nós, Suporte.
(function () {
  const ICON = {
    inicio: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    titulos: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>',
    carteira: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h3"/>',
    resultados: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    sobre: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>',
    suporte: '<path d="M4 13a8 8 0 0 1 16 0"/><rect x="2" y="13" width="4" height="6" rx="1"/><rect x="18" y="13" width="4" height="6" rx="1"/><path d="M20 19a4 4 0 0 1-4 3h-2"/>',
  };
  const items = [
    { href: "/", ic: "inicio", label: "Início" },
    { href: "#conta", ic: "titulos", label: "Meus Títulos", account: true },
    { href: "/carteira", ic: "carteira", label: "Minhas Premiações" },
    { href: "/resultados", ic: "resultados", label: "Últimos Resultados" },
    { sep: true },
    { href: "/sobre-nos", ic: "sobre", label: "Sobre Nós" },
    { href: "/suporte", ic: "suporte", label: "Suporte" },
  ];

  const rows = items.map((it) => {
    if (it.sep) return '<div class="mnav-sep"></div>';
    return `<a class="mnav-item" href="${it.href}"${it.account ? ' data-conta="1"' : ""}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[it.ic]}</svg>
      <span>${it.label}</span></a>`;
  }).join("");

  const css = `
    #mnav-ov{position:fixed;inset:0;background:rgba(3,7,32,.5);opacity:0;pointer-events:none;transition:opacity .25s;z-index:45}
    #mnav-ov.open{opacity:1;pointer-events:auto}
    #mnav{position:fixed;top:0;left:0;height:100vh;width:300px;max-width:85vw;background:#fff;z-index:55;transform:translateX(-100%);transition:transform .28s;display:flex;flex-direction:column;box-shadow:20px 0 50px rgba(0,0,0,.22)}
    #mnav.open{transform:translateX(0)}
    #mnav .mnav-head{height:48px;background:var(--brand,#0540fa);display:flex;align-items:center;justify-content:space-between;padding:0 14px}
    #mnav .mnav-head img{height:24px}
    #mnav .mnav-x{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer;line-height:1}
    #mnav .mnav-list{padding:6px 0;overflow-y:auto}
    .mnav-item{display:flex;align-items:center;gap:14px;padding:15px 18px;color:#1f1f1f;text-decoration:none;font-weight:700;font-size:15px}
    .mnav-item:hover{background:#f2f5ff;color:var(--brand,#0540fa)}
    .mnav-item svg{color:var(--brand,#0540fa);flex:0 0 auto}
    .mnav-sep{height:1px;background:#eee;margin:6px 16px}`;

  const wrap = document.createElement("div");
  wrap.innerHTML = `<style>${css}</style>
    <div id="mnav-ov"></div>
    <aside id="mnav" aria-hidden="true">
      <div class="mnav-head">
        <img src="/logo.avif" alt="SBT Prêmios" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'SBT PRÊMIOS',style:'color:#fff;font-weight:800;letter-spacing:1px'}))"/>
        <button class="mnav-x" aria-label="Fechar">&times;</button>
      </div>
      <nav class="mnav-list">${rows}</nav>
    </aside>`;
  document.body.appendChild(wrap);

  const nav = document.getElementById("mnav"), ov = document.getElementById("mnav-ov");
  const open = () => { nav.classList.add("open"); ov.classList.add("open"); nav.setAttribute("aria-hidden", "false"); };
  const close = () => { nav.classList.remove("open"); ov.classList.remove("open"); nav.setAttribute("aria-hidden", "true"); };
  ov.onclick = close;
  nav.querySelector(".mnav-x").onclick = close;

  // Liga todas as barrinhas do header (aria-label="Menu" ou [data-menu]).
  document.querySelectorAll('[aria-label="Menu"], [data-menu]').forEach((b) => (b.onclick = open));

  // "Meus Títulos" abre o painel de conta (login/saldo) em vez de página própria.
  nav.querySelectorAll("[data-conta]").forEach((a) => (a.onclick = (e) => {
    e.preventDefault(); close();
    if (window.openConta) window.openConta(); else location.href = "/";
  }));
})();

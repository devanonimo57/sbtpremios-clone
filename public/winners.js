// Recria o comportamento que o JS compilado do site fazia na faixa de ganhadores:
// troféu animado + rolagem horizontal contínua (marquee). Usa as classes e o
// ícone reais (bolt) do mirror.
(function () {
  var sec = document.querySelector('[data-cy="main-content-last-winners"]');
  if (!sec) return;

  if (!document.getElementById("winners-style")) {
    var st = document.createElement("style");
    st.id = "winners-style";
    st.textContent =
      ".winners-track{display:flex;width:max-content;animation:winmarquee 30s linear infinite}" +
      ".winners-track:hover{animation-play-state:paused}" +
      "@keyframes winmarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}" +
      ".win-trophy{width:52px;height:52px;display:block;animation:trophybob 1.6s ease-in-out infinite;transform-origin:50% 90%}" +
      "@keyframes trophybob{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-4px) rotate(5deg)}}" +
      ".win-trophy .spark{animation:sparktw 1.4s ease-in-out infinite}" +
      ".win-trophy .s2{animation-delay:.45s}.win-trophy .s3{animation-delay:.9s}" +
      "@keyframes sparktw{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}";
    document.head.appendChild(st);
  }

  var TROPHY =
    '<svg class="win-trophy" viewBox="0 0 64 64" aria-hidden="true">' +
    '<circle cx="32" cy="32" r="31" fill="#151d2b"/>' +
    '<path d="M21 19c-6 0-9 3-9 8s3 9 10 9" fill="none" stroke="#f5c518" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M43 19c6 0 9 3 9 8s-3 9-10 9" fill="none" stroke="#f5c518" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M20 15h24v11c0 8-5 13-12 13s-12-5-12-13z" fill="#f5c518"/>' +
    '<path d="M24 17h16v8c0 6-3 9-8 9s-8-3-8-9z" fill="#ffd84d"/>' +
    '<rect x="29.5" y="39" width="5" height="7" fill="#e0a800"/>' +
    '<rect x="22" y="46" width="20" height="4" rx="2" fill="#f5c518"/>' +
    '<rect x="25" y="49" width="14" height="4.5" rx="2.2" fill="#e0a800"/>' +
    '<g fill="#fff">' +
    '<path class="spark s1" d="M13 13l1.1 3.2 3.2 1.1-3.2 1.1L13 22.7l-1.1-3.3-3.2-1.1 3.2-1.1z"/>' +
    '<path class="spark s2" d="M51 15l.9 2.5 2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9z"/>' +
    '<path class="spark s3" d="M48 39l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>' +
    '</g></svg>';

  var label = sec.querySelector("div");
  if (label && !label.querySelector(".win-trophy")) {
    label.insertAdjacentHTML("afterbegin", TROPHY);
  }

  var box = sec.querySelector(".overflow-hidden");
  if (!box) return;

  var brl = function (n) { return "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }); };
  function card(w) {
    return '<div class="px-2 md:pl-0"><div class="relative bg-background-variant p-2 rounded-lg flex flex-row h-24 w-fit min-w-44 gap-x-2 max-w-fit">' +
      '<div class="flex items-center justify-center min-w-14"><img src="/_next/imageb97c.png" width="62" height="62" class="object-contain" alt="raio"/></div>' +
      '<div class="flex flex-col items-end rounded-lg">' +
      '<p class="text-right font-semibold text-sm text-foreground truncate">' + w.name + '</p>' +
      '<span class="text-right font-medium text-xs text-foreground/60 truncate">' + (w.when || "") + '</span>' +
      '<span class="text-right font-bold text-base text-foreground truncate">' + brl(w.amount) + '</span>' +
      '<span class="absolute bottom-2 text-right text-xxs text-foreground">' + (w.state || "") + '</span>' +
      '</div></div></div>';
  }

  fetch("/api/v2/bff/customer/winners-feed").then(function (r) { return r.json(); }).then(function (d) {
    var ws = d.winners || [];
    if (!ws.length) return;
    // repete a base pra ter cards suficientes, e duplica pro loop contínuo
    var base = ws.concat(ws).concat(ws);
    var html = base.map(card).join("");
    box.innerHTML = '<div class="winners-track">' + html + html + "</div>";
  }).catch(function () {});
})();

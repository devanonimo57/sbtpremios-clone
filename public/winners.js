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
      ".win-trophy{width:58px;height:58px;display:block}" +
      ".win-trophy .tcup{animation:trophybob 1.6s ease-in-out infinite;transform-origin:32px 40px}" +
      "@keyframes trophybob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-3px) rotate(4deg)}}" +
      ".win-trophy .spark{animation:sparktw 1.5s ease-in-out infinite}" +
      ".win-trophy .s2{animation-delay:.5s}.win-trophy .s3{animation-delay:.9s}.win-trophy .s4{animation-delay:.3s}.win-trophy .s5{animation-delay:.7s}" +
      "@keyframes sparktw{0%,100%{opacity:.2}50%{opacity:1}}";
    document.head.appendChild(st);
  }

  var TROPHY =
    '<svg class="win-trophy" viewBox="0 0 64 64" aria-hidden="true">' +
    '<circle cx="32" cy="32" r="31" fill="#172033"/>' +
    '<circle class="spark s1" cx="14" cy="21" r="2.3" fill="#5fd58c"/>' +
    '<circle class="spark s2" cx="50" cy="18" r="2" fill="#5fd58c"/>' +
    '<circle class="spark s3" cx="49" cy="45" r="1.8" fill="#5fd58c"/>' +
    '<path class="spark s4" fill="#fff" d="M14 39l.9 2.5 2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9z"/>' +
    '<path class="spark s5" fill="#fff" d="M46 13l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>' +
    '<g class="tcup">' +
    '<path d="M22 18c-6 0-9 3-9 8s3 9 10 9" fill="none" stroke="#e0a800" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M42 18c6 0 9 3 9 8s-3 9-10 9" fill="none" stroke="#e0a800" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M21 14h22v10c0 7.5-4.5 12-11 12s-11-4.5-11-12z" fill="#f5c518"/>' +
    '<path d="M24.5 16h15v7.5c0 5.5-3 8.5-7.5 8.5s-7.5-3-7.5-8.5z" fill="#ffd84d"/>' +
    '<rect x="29.5" y="35.5" width="5" height="7" fill="#e0a800"/>' +
    '<rect x="22.5" y="43" width="19" height="4" rx="2" fill="#f5c518"/>' +
    '<rect x="25.5" y="46" width="13" height="4.5" rx="2.2" fill="#e0a800"/>' +
    '</g></svg>';

  var label = sec.querySelector("div");
  if (label && !label.querySelector(".win-trophy")) {
    label.insertAdjacentHTML("beforeend", TROPHY);
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

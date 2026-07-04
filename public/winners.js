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
      ".win-trophy{font-size:30px;line-height:1;display:block;animation:trophybob 1.3s ease-in-out infinite;transform-origin:50% 90%}" +
      "@keyframes trophybob{0%,100%{transform:translateY(0) rotate(-7deg)}50%{transform:translateY(-5px) rotate(7deg)}}";
    document.head.appendChild(st);
  }

  var label = sec.querySelector("div");
  if (label && !label.querySelector(".win-trophy")) {
    label.insertAdjacentHTML("afterbegin", '<span class="win-trophy" aria-hidden="true">🏆</span>');
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

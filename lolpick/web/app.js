/* =============================================================================
 * LolPick — interface
 * ========================================================================== */
(function () {
  "use strict";

  var E = window.LP_ENGINE, N = window.LP_NORM;
  var ROLES = ["TOP", "JGL", "MID", "BOT", "SUP"];
  var LS = "lolpick.v1";

  var state = {
    role: "TOP",
    isLastPick: true,
    ally:  ROLES.map(function (r) { return { role: r, champ: null }; }),
    enemy: [0, 1, 2, 3, 4].map(function () { return { role: null, forced: null, champ: null, inferred: false, conf: 1 }; }),
    bans:  [0, 1, 2, 3].map(function () { return { champ: null }; }),
    pool: {},
    risk: 0.45,
    laneFocus: 0.5,
    poolOnly: false,
    expert: false,
    open: null,
    focus: null,
    auto: false,
    lastSig: ""
  };

  /* ------------------------------------------------------------------ */
  /* Persistance                                                         */
  /* ------------------------------------------------------------------ */
  function save() {
    try {
      localStorage.setItem(LS, JSON.stringify({
        pool: state.pool, role: state.role, risk: state.risk,
        laneFocus: state.laneFocus, poolOnly: state.poolOnly, expert: state.expert
      }));
    } catch (e) {}
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(LS) || "{}");
      if (d.pool) state.pool = d.pool;
      if (d.role) state.role = d.role;
      if (typeof d.risk === "number") state.risk = d.risk;
      if (typeof d.laneFocus === "number") state.laneFocus = d.laneFocus;
      state.poolOnly = !!d.poolOnly;
      state.expert = !!d.expert;
    } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /* Recherche de champion (alias inclus)                                */
  /* ------------------------------------------------------------------ */
  function search(q) {
    q = N(q);
    if (!q) return [];
    var seen = {}, res = [];
    function push(c, s) { if (c && !seen[c.key]) { seen[c.key] = 1; res.push([s, c]); } }

    if (window.LP_ALIAS[q]) push(window.LP_CHAMP_BY_KEY[N(window.LP_ALIAS[q])], 0);
    Object.keys(window.LP_ALIAS).forEach(function (k) {
      if (k.indexOf(q) === 0) push(window.LP_CHAMP_BY_KEY[N(window.LP_ALIAS[k])], 1);
    });
    window.LP_CHAMPIONS.forEach(function (c) { if (c.key.indexOf(q) === 0) push(c, 2); });
    window.LP_CHAMPIONS.forEach(function (c) { if (c.key.indexOf(q) > 0) push(c, 3); });

    return res.sort(function (a, b) { return a[0] - b[0]; }).slice(0, 8).map(function (r) { return r[1]; });
  }

  /* ------------------------------------------------------------------ */
  /* Slots                                                               */
  /* ------------------------------------------------------------------ */
  var tpl = document.getElementById("tplSlot");

  function makeSlot(entry, kind, index) {
    var node = tpl.content.firstElementChild.cloneNode(true);
    var badge = node.querySelector(".role-badge");
    var input = node.querySelector(".champ-input");
    var sug = node.querySelector(".suggest");
    var clear = node.querySelector(".clear");

    if (kind === "ban") { badge.remove(); }
    else {
      badge.textContent = entry.role || "?";
      if (kind === "ally" && entry.role === state.role) {
        badge.classList.add("mine"); badge.textContent = "TOI";
        node.dataset.mine = "1";   // slot de ton pick : jamais ciblé par l'enchaînement du focus
      }
      if (kind === "enemy" && entry.inferred) badge.classList.add("guess");
      badge.title = kind === "enemy"
        ? "Rôle déduit — clique pour forcer un rôle"
        : "Rôle de ce slot";
      badge.onclick = function () {
        if (kind !== "enemy") return;
        var i = ROLES.indexOf(entry.forced || entry.role || "TOP");
        entry.forced = (entry.forced === null) ? ROLES[i] : (i === ROLES.length - 1 ? null : ROLES[i + 1]);
        render();
      };
    }

    if (entry.champ) { input.value = entry.champ.name; input.classList.add("filled"); }

    var sel = 0, list = [];
    function closeSug() { sug.hidden = true; sug.innerHTML = ""; list = []; }
    function openSug(q) {
      list = search(q); sel = 0;
      if (!list.length) return closeSug();
      sug.innerHTML = list.map(function (c, i) {
        return '<li class="' + (i === 0 ? "sel" : "") + '" data-k="' + c.key + '">' +
               c.name + "<small>" + c.roles.join("/") + (c.low ? " ⚠" : "") + "</small></li>";
      }).join("");
      sug.hidden = false;
      Array.prototype.forEach.call(sug.children, function (li, i) {
        li.onmousedown = function (ev) { ev.preventDefault(); choose(list[i]); };
      });
    }
    function choose(c) {
      entry.champ = c; closeSug(); input.blur(); render();
      focusNextEmpty(kind, index);   // enchaîner la saisie sans toucher la souris
    }
    input.oninput = function () { openSug(input.value); };
    input.onfocus = function () { input.select(); if (input.value) openSug(input.value); };
    input.onblur = function () {
      setTimeout(closeSug, 120);
      if (!input.value.trim()) { if (entry.champ) { entry.champ = null; render(); } return; }
      if (!entry.champ || entry.champ.name !== input.value) {
        var r = search(input.value)[0];
        if (r) choose(r); else input.value = entry.champ ? entry.champ.name : "";
      }
    };
    input.onkeydown = function (ev) {
      if (sug.hidden) return;
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        sel = (sel + (ev.key === "ArrowDown" ? 1 : list.length - 1)) % list.length;
        Array.prototype.forEach.call(sug.children, function (li, i) { li.classList.toggle("sel", i === sel); });
      } else if (ev.key === "Enter") { ev.preventDefault(); if (list[sel]) choose(list[sel]); }
      else if (ev.key === "Escape") closeSug();
    };
    clear.onclick = function () { entry.champ = null; entry.forced = null; render(); };
    return node;
  }

  /* Après un choix, on met le curseur dans le prochain slot vide : la draft
     entière se remplit au clavier, sans jamais reprendre la souris.        */
  function focusNextEmpty(kind, index) {
    var container = { ally: "#allySlots", enemy: "#enemySlots", ban: "#banSlots" }[kind];
    function empties(sel) {
      return Array.prototype.filter.call(
        document.querySelectorAll(sel + " .slot"),
        function (s) { return !s.dataset.mine && !s.querySelector(".champ-input").value; }
      ).map(function (s) { return s.querySelector(".champ-input"); });
    }
    var same = Array.prototype.slice.call(document.querySelectorAll(container + " .slot"));
    for (var i = index + 1; i < same.length; i++) {
      if (!same[i].dataset.mine && !same[i].querySelector(".champ-input").value) {
        return same[i].querySelector(".champ-input").focus();
      }
    }
    var rest = empties("#enemySlots").concat(empties("#allySlots"));
    if (rest.length) rest[0].focus();
  }

  /* ------------------------------------------------------------------ */
  /* Inférence des rôles adverses                                        */
  /* ------------------------------------------------------------------ */
  function assignEnemyRoles() {
    var idx = [];
    state.enemy.forEach(function (e, i) { e.role = null; e.inferred = false; if (e.champ) idx.push(i); });
    if (!idx.length) return;
    var entries = idx.map(function (i) { return { champ: state.enemy[i].champ, role: state.enemy[i].forced || null }; });
    var res = E.inferRoles(entries);
    idx.forEach(function (i, k) {
      state.enemy[i].role = res[k].role;
      state.enemy[i].inferred = res[k].inferred;
      state.enemy[i].conf = res[k].confidence;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Rendu                                                               */
  /* ------------------------------------------------------------------ */
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function render() {
    state.focus = null;   // la draft a changé : on repart sur le meilleur pick
    assignEnemyRoles();

    document.querySelectorAll("#roleSelect button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.role === state.role);
    });

    var a = document.getElementById("allySlots"); a.innerHTML = "";
    state.ally.forEach(function (e, i) { a.appendChild(makeSlot(e, "ally", i)); });
    var n = document.getElementById("enemySlots"); n.innerHTML = "";
    state.enemy.forEach(function (e, i) { n.appendChild(makeSlot(e, "enemy", i)); });
    var b = document.getElementById("banSlots"); b.innerHTML = "";
    state.bans.forEach(function (e, i) { b.appendChild(makeSlot(e, "ban", i)); });

    var guessed = state.enemy.filter(function (e) { return e.champ && e.inferred; }).length;
    document.getElementById("inferNote").textContent = guessed ? "· " + guessed + " rôle(s) déduit(s), clique sur le badge pour corriger" : "";

    analyse();
  }

  function draftForEngine() {
    return {
      role: state.role,
      isLastPick: state.isLastPick,
      ally: state.ally.map(function (e) { return { champ: e.champ, role: e.role }; }),
      enemy: state.enemy.map(function (e) { return { champ: e.champ, role: e.role }; }),
      bans: state.bans.map(function (e) { return e.champ; }).filter(Boolean)
    };
  }

  function analyse() {
    document.body.classList.toggle("simple", !state.expert);
    document.getElementById("btnMode").textContent = state.expert ? "Mode simple" : "Mode expert";

    var draft = draftForEngine();
    var known = draft.enemy.filter(function (e) { return e.champ; }).length +
                draft.ally.filter(function (e) { return e.champ; }).length;

    var r = E.recommend(draft, {
      pool: state.pool, poolOnly: state.poolOnly,
      risk: state.risk, laneFocus: state.laneFocus
    });

    renderHero(r, known);
    renderRead(r.ctx, known > 0);
    renderRanked(r);
    renderTech(r);
  }

  /* -------------------- carte « ton pick » --------------------------- */
  function renderHero(r, known) {
    var p = document.getElementById("heroPanel");

    if (!known) {
      p.innerHTML =
        '<h2>Comment ça marche</h2><div class="onboard">' +
        "<ol>" +
        "<li>Choisis <b>ton rôle</b> en haut, et coche <b>Last pick</b> si tu passes en dernier.</li>" +
        "<li>Remplis la draft : tape 3 lettres et <b>Entrée</b>. Le curseur saute tout seul au slot suivant. " +
        "Les alias marchent (<b>morde</b>, <b>mf</b>, <b>j4</b>, <b>ww</b>, <b>cho</b>…).</li>" +
        "<li>Ton pick s'affiche ici, avec le pourquoi, le build et les objets adaptés à cette draft.</li>" +
        "</ol>" +
        "<p>Si League tourne sur cette machine, la draft se remplit toute seule — tu n'as rien à taper. " +
        'Le bouton <b>Exemple</b> charge une draft de démonstration.</p></div>';
      return;
    }

    var list = r.ranked;
    if (!list.length) {
      p.innerHTML = '<h2>Ton pick</h2><p class="empty">Aucun candidat pour ce rôle : ton pool est vide, ' +
                    "ou tout est déjà pick/ban.</p>";
      return;
    }

    var s = list.filter(function (x) { return x.champ.key === state.focus; })[0] || list[0];
    var b = E.buildFor(s.champ);
    var items = E.situationalItems(s.champ, r.ctx);
    var reasons = s.reasons.slice(0, 3);
    if (!reasons.length) reasons = [s.matchup && s.matchup.value >= 0
      ? "Pas de contre-indication sur ce matchup" : "Le moins mauvais compromis sur cette draft"];

    var html =
      '<div class="hero-top"><div>' +
        '<span class="hero-label">Ton pick · ' + state.role + (ctxLastPick() ? " · last pick" : "") + "</span>" +
        '<div class="hero-name">' + esc(s.champ.name) +
          (s.tech.some(function (t) { return t.risk >= 2; }) ? '<span class="flag">TECH</span>' : "") +
          (s.champ.low ? '<span class="low" title="données à revérifier">⚠</span>' : "") +
        "</div></div>" +
        '<div class="hero-score"><b>' + Math.round(s.total) + "</b><span>sur 100</span></div>" +
      "</div>" +
      '<ul class="hero-why">' + reasons.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
        (s.warnings.length ? '<li class="neg">' + esc(s.warnings[0]) + "</li>" : "") +
        (s.traps.length ? '<li class="neg">' + esc(s.traps[0].why) + "</li>" : "") +
      "</ul>";

    if (b) {
      html += '<div class="hero-line"><b>Build</b> · ' + (b.core || []).slice(0, 3).map(esc).join(" → ") +
              (items.length ? "<br><b>Contre cette draft</b> · " +
                items.slice(0, 3).map(function (i) { return esc(i.item); }).join(" · ") : "") +
              "</div>";
    }

    html += '<div class="hero-actions"><button class="hero-more" id="heroMore">' +
            (state.open === s.champ.key ? "Masquer le détail" : "Tout le détail") + "</button></div>";

    var others = list.filter(function (x) { return x.champ.key !== s.champ.key; }).slice(0, 5);
    if (others.length) {
      html += '<div class="alts"><span>Sinon</span>' + others.map(function (o) {
        return '<button class="alt" data-k="' + o.champ.key + '"><b>' + esc(o.champ.name) +
               "</b><i>" + Math.round(o.total) + "</i></button>";
      }).join("") + "</div>";
    }
    html += '<div class="hero-detail" id="heroDetail"></div>';

    p.innerHTML = "<h2>Recommandation</h2>" + html;

    if (state.open === s.champ.key) {
      document.getElementById("heroDetail").appendChild(detail(s, r.ctx));
    }
    document.getElementById("heroMore").onclick = function () {
      state.open = (state.open === s.champ.key) ? null : s.champ.key;
      analyse();
    };
    p.querySelectorAll(".alt").forEach(function (btn) {
      btn.onclick = function () { state.focus = btn.dataset.k; state.open = null; analyse(); };
    });
  }

  function ctxLastPick() { return state.isLastPick; }

  /* -------------------- lecture de draft ---------------------------- */
  function renderRead(x, any) {
    var p = document.getElementById("readPanel");
    if (!any) {
      p.innerHTML = '<h2>Lecture de la draft</h2><p class="empty">Renseigne au moins un champion pour lancer l\'analyse. ' +
        'Tape 3 lettres (les alias marchent : <b>morde</b>, <b>mf</b>, <b>j4</b>, <b>ww</b>…), ou lance le pont client pour la détection automatique.</p>';
      return;
    }

    function bar(t) {
      return '<div class="dmgbar"><i class="ad" style="width:' + t.adShare + '%"></i>' +
             '<i class="ap" style="width:' + t.apShare + '%"></i>' +
             '<i class="tr" style="width:' + t.trueShare + '%"></i></div>' +
             '<div class="legend">' + t.adShare + "% AD · " + t.apShare + "% AP · " + t.trueShare + "% brut</div>";
    }

    var chips = [];
    function chip(txt, cls) { chips.push('<span class="chip ' + (cls || "") + '">' + esc(txt) + "</span>"); }
    if (x.enemy.beefy >= 2) chip(x.enemy.beefy + " empileurs de résistances/PV", "bad");
    if (x.enemy.engageUlts >= 2) chip(x.enemy.engageUlts + " ults d'engage", "bad");
    if (x.enemy.hardCC >= 4) chip(x.enemy.hardCC + " sources de CC dur", "bad");
    if (x.enemy.healers >= 1) chip("Soins : " + x.enemy.healerNames.join(", "), "warn");
    if (x.enemy.poke >= 2) chip("Comp de poke", "warn");
    if (x.enemy.assassins >= 2) chip(x.enemy.assassins + " assassins", "warn");
    if (x.enemy.dashers >= 3) chip(x.enemy.dashers + " champions à dash", "warn");
    if (x.enemy.suppressors.length) chip("Suppression : " + x.enemy.suppressors.join(", ") + " (QSS)", "warn");
    if (x.enemy.hypercarry) chip("Carry principal : " + x.enemy.hypercarry, "warn");
    if (x.enemy.splitpusher) chip("Splitpush : " + x.enemy.splitpusher, "warn");
    if (x.ally.frontline === 0) chip("Ton équipe n'a aucune frontline", "bad");
    if (x.ally.hypercarry) chip("Ton carry : " + x.ally.hypercarry, "good");
    if (x.ally.engage >= 8) chip("Beaucoup d'engage de ton côté", "good");

    /* verdicts de lane */
    var lanes = "";
    ROLES.forEach(function (role) {
      var mine = state.ally.filter(function (e) { return e.role === role && e.champ; })[0];
      var opp = state.enemy.filter(function (e) { return e.role === role && e.champ; })[0];
      if (!mine || !opp) return;
      var mu = E.matchup(mine.champ, opp.champ, role);
      var v = mu.value >= 1.2 ? ["v-win", "avantage"] : mu.value <= -1.2 ? ["v-lose", "désavantage"] : ["v-even", "équilibré"];
      lanes += '<div class="laneline"><span class="rl">' + role + "</span>" +
        "<span>" + esc(mine.champ.name) + " vs " + esc(opp.champ.name) +
        (mu.note ? ' <small style="color:var(--fg3)">— ' + esc(mu.note) + "</small>" : "") + "</span>" +
        '<span class="verdict ' + v[0] + '">' + v[1] + "</span></div>";
    });

    /* En mode simple on ne garde que les 4 alertes les plus fortes ;
       le reste (verdicts de lane, besoins détaillés) passe en mode expert. */
    p.innerHTML =
      "<h2>Lecture de la draft</h2>" +
      '<div class="readrow"><b>Ton équipe</b><div>' + bar(x.ally) + "</div></div>" +
      '<div class="readrow"><b>Adversaire</b><div>' + bar(x.enemy) + "</div></div>" +
      '<div class="chips">' + chips.slice(0, 4).join("") +
        (chips.length > 4 ? '<span class="adv" style="display:contents">' + chips.slice(4).join("") + "</span>" : "") +
      "</div>" +
      (lanes ? '<div class="lanes adv">' + lanes + "</div>" : "") +
      '<div class="plan"><b>Comment cette game se gagne</b>' + esc(x.plan.text) + "</div>" +
      (x.plan.needs.length
        ? "<ul class=\"needs adv\"><li>Il manque " + x.plan.needs.map(esc).join("</li><li>Il manque ") + "</li></ul>"
        : "");
  }

  /* -------------------- classement ---------------------------------- */
  function renderRanked(r) {
    var ol = document.getElementById("ranked");
    var sub = document.getElementById("picksSub");
    ol.innerHTML = "";

    var list = r.ranked.slice(0, 12);
    sub.textContent = "· rôle " + state.role + " · " + r.ranked.length + " candidats évalués" +
                      (state.poolOnly ? " (pool uniquement)" : "");
    if (!list.length) {
      ol.innerHTML = '<li class="empty">Aucun candidat : ton pool est vide pour ce rôle, ou tout est déjà pick/ban.</li>';
      return;
    }

    var max = list[0].total || 1;
    list.forEach(function (s, i) {
      var li = document.createElement("li");
      li.className = "pick" + (state.open === s.champ.key ? " open" : "");
      var head =
        '<div class="pick-head">' +
          '<span class="rank">' + (i + 1) + "</span>" +
          '<span class="pname">' + esc(s.champ.name) +
            (s.tech.some(function (t) { return t.risk >= 2; }) ? '<span class="flag">TECH</span>' : "") +
            (s.champ.low ? '<span class="low" title="données à revérifier">⚠</span>' : "") +
          "</span>" +
          '<span class="score"><span class="num">' + Math.round(s.total) + '</span>' +
            '<span class="bar"><i style="width:' + Math.round(s.total / max * 100) + '%"></i></span></span>' +
          '<span class="why">' + esc(s.reasons[0] || s.warnings[0] || "—") + "</span>" +
        "</div>";
      li.innerHTML = head;
      li.querySelector(".pick-head").onclick = function () {
        state.open = (state.open === s.champ.key) ? null : s.champ.key;
        renderRanked(r);
      };
      if (state.open === s.champ.key) li.appendChild(detail(s, r.ctx));
      ol.appendChild(li);
    });
  }

  function detail(s, ctx) {
    var d = document.createElement("div");
    d.className = "pick-body";
    var A = s.axes;
    function axis(label, v) {
      var cls = v >= 70 ? "hi" : v <= 40 ? "lo" : "";
      return '<div class="axis ' + cls + '"><span>' + label + " " + v + '</span><div class="bar"><i style="width:' + v + '%"></i></div></div>';
    }
    var html = '<div class="axes">' +
      axis("Lane", A.lane) + axis("Comp", A.comp) + axis("Contre", A.counter) +
      axis("Timing", A.scaling) + axis("Synergie", A.synergy) + axis("Confort", A.comfort) + "</div>";

    if (s.reasons.length) html += '<div class="block"><b>Pourquoi</b><ul>' + s.reasons.map(function (x) { return '<li class="pos">' + esc(x) + "</li>"; }).join("") + "</ul></div>";
    if (s.warnings.length) html += '<div class="block"><b>Points d\'attention</b><ul>' + s.warnings.map(function (x) { return '<li class="neg">' + esc(x) + "</li>"; }).join("") + "</ul></div>";
    if (s.traps.length) html += '<div class="block"><b>Piège détecté</b><ul>' + s.traps.map(function (x) { return '<li class="neg">' + esc(x.why) + "</li>"; }).join("") + "</ul></div>";
    if (s.tech.length) html += '<div class="block"><b>Pick tech</b><ul>' + s.tech.map(function (t) {
      return '<li class="pos">' + esc(t.rule) + '<span class="risk risk' + t.risk + '">risque ' + t.risk + "/3</span><br>" + esc(t.why) + "</li>";
    }).join("") + "</ul></div>";

    if (s.champ.notes) html += '<div class="block"><b>À savoir sur ' + esc(s.champ.name) + "</b><p>" + esc(s.champ.notes) + "</p></div>";
    if (s.matchup && ctx.lane.enemyName) {
      html += '<div class="block"><b>Matchup ' + esc(ctx.lane.enemyName) + "</b><p>" +
        (s.matchup.value > 0 ? "Avantage " : s.matchup.value < 0 ? "Désavantage " : "Équilibré ") +
        "(" + (s.matchup.value > 0 ? "+" : "") + s.matchup.value + ") — " + esc(s.matchup.source) +
        (s.matchup.note ? ". " + esc(s.matchup.note) : "") + "</p></div>";
    }

    var b = E.buildFor(s.champ);
    if (b) {
      html += '<div class="block"><b>Build de base</b><p>' +
        (b.start ? "<u>Départ</u> : " + esc(b.start) + " · " : "") +
        (b.boots ? "<u>Bottes</u> : " + esc(b.boots) + "<br>" : "") +
        "<u>Core</u> : " + (b.core || []).map(esc).join(" → ") + "</p></div>";
      if (b.runes) html += '<div class="block"><b>Runes</b><p>' + esc(b.runes) + "</p></div>";
      if (b.plan) html += '<div class="block"><b>Plan de jeu</b><p>' + esc(b.plan) + "</p></div>";
    }

    var items = E.situationalItems(s.champ, ctx);
    if (items.length) {
      html += '<div class="block"><b>Objets à adapter à CETTE draft</b><div class="items">' +
        items.map(function (i) { return '<div class="item"><b>' + esc(i.item) + "</b><span>" + esc(i.why) + "</span></div>"; }).join("") +
        "</div></div>";
    }
    d.innerHTML = html;
    return d;
  }

  /* -------------------- picks tech ---------------------------------- */
  function renderTech(r) {
    var p = document.getElementById("techPanel");
    if (!r.rules.length) { p.innerHTML = ""; return; }
    var html = "<h2>Picks tech · ce que la draft ouvre <small>règles déclenchées par la composition</small></h2>";
    r.rules.forEach(function (u) {
      html += '<div class="rule"><h3>' + esc(u.title) + "</h3><p>" + esc(u.explain) + "</p>";
      if (u.picks.length) {
        html += '<div class="picklist">' + u.picks.map(function (p2) {
          return '<button class="pk" data-k="' + N(p2.champ) + '"><b>' + esc(p2.champ) +
                 '</b><span class="risk risk' + p2.risk + '">' + p2.risk + "/3</span></button>";
        }).join("") + "</div>";
      }
      if (u.items && u.items.length) html += '<p style="margin-top:7px">Objets : ' + u.items.map(esc).join(" · ") + "</p>";
      html += "</div>";
    });
    p.innerHTML = html;
    p.querySelectorAll(".pk").forEach(function (btn) {
      btn.onclick = function () {
        state.open = btn.dataset.k;
        analyse();
        var t = document.querySelector(".pick.open");
        if (t) t.scrollIntoView({ behavior: "smooth", block: "center" });
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Pool                                                                */
  /* ------------------------------------------------------------------ */
  function renderPool() {
    var g = document.getElementById("poolGrid");
    var q = N(document.getElementById("poolSearch").value);
    g.innerHTML = "";
    window.LP_CHAMPIONS.filter(function (c) {
      return !q || c.key.indexOf(q) !== -1;
    }).forEach(function (c) {
      var row = el('<div class="pool-row"><span>' + esc(c.name) + "</span></div>");
      [0, 1, 2, 3].forEach(function (lvl) {
        var cur = state.pool[c.key];
        var btn = el("<button" + ((cur === undefined ? 0 : cur) === lvl ? ' class="on"' : "") + ">" + lvl + "</button>");
        btn.onclick = function () {
          if (lvl === 0) delete state.pool[c.key]; else state.pool[c.key] = lvl;
          save(); renderPool(); analyse();
        };
        row.appendChild(btn);
      });
      g.appendChild(row);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Pont client League (lecture seule)                                  */
  /* ------------------------------------------------------------------ */
  function setLive(on, txt) {
    var d = document.getElementById("liveStatus");
    d.classList.toggle("on", !!on);
    d.querySelector(".txt").textContent = txt;
  }

  function poll() {
    fetch("api/champselect", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) {
        if (!d) { setLive(false, "saisie manuelle"); return; }
        if (!d.clientFound) { setLive(false, "League non lancé"); return; }
        if (!d.active) { setLive(true, "League lancé — en attente du champ select"); return; }
        setLive(true, "champ select détecté");
        applySession(d);
      });
  }

  function applySession(d) {
    var sig = JSON.stringify([d.myTeam, d.theirTeam, d.bans, d.myPosition]);
    if (sig === state.lastSig) return;
    state.lastSig = sig;

    if (d.myPosition && ROLES.indexOf(d.myPosition) !== -1) state.role = d.myPosition;
    if (typeof d.isLastPick === "boolean") {
      state.isLastPick = d.isLastPick;
      document.getElementById("lastPick").checked = d.isLastPick;
    }

    state.ally.forEach(function (e) { e.champ = null; });
    (d.myTeam || []).forEach(function (p) {
      var c = p.champion ? E.champ(p.champion) : null;
      if (!c) return;
      var slot = state.ally.filter(function (e) { return e.role === p.position; })[0];
      if (!slot) slot = state.ally.filter(function (e) { return !e.champ; })[0];
      if (slot) slot.champ = c;
    });

    state.enemy.forEach(function (e) { e.champ = null; e.forced = null; });
    (d.theirTeam || []).forEach(function (p, i) {
      var c = p.champion ? E.champ(p.champion) : null;
      if (!c) return;
      state.enemy[i].champ = c;
      if (p.position && ROLES.indexOf(p.position) !== -1) state.enemy[i].forced = p.position;
    });

    state.bans.forEach(function (e) { e.champ = null; });
    (d.bans || []).slice(0, state.bans.length).forEach(function (name, i) {
      state.bans[i].champ = E.champ(name);
    });

    render();
  }

  /* ------------------------------------------------------------------ */
  /* Exemple + reset                                                     */
  /* ------------------------------------------------------------------ */
  function demo() {
    state.role = "TOP"; state.isLastPick = true;
    document.getElementById("lastPick").checked = true;
    var set = function (arr, pairs) {
      arr.forEach(function (e) { e.champ = null; e.forced = null; });
      pairs.forEach(function (p, i) { arr[i].champ = p ? E.champ(p) : null; });
    };
    state.ally.forEach(function (e) { e.champ = null; });
    state.ally[1].champ = E.champ("Naafiri");
    state.ally[3].champ = E.champ("Zeri");
    state.ally[4].champ = E.champ("Yuumi");
    set(state.enemy, ["Malphite", "Mordekaiser", "Galio", "Ashe", "Seraphine"]);
    state.enemy[0].forced = "TOP"; state.enemy[1].forced = "JGL"; state.enemy[2].forced = "MID";
    state.enemy[3].forced = "BOT"; state.enemy[4].forced = "SUP";
    render();
  }
  function reset() {
    state.ally.forEach(function (e) { e.champ = null; });
    state.enemy.forEach(function (e) { e.champ = null; e.forced = null; });
    state.bans.forEach(function (e) { e.champ = null; });
    state.open = null; state.lastSig = "";
    render();
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */
  function label(v, a, b, c) { return v < 0.34 ? a : v > 0.66 ? c : b; }

  function init() {
    load();
    document.querySelectorAll("#roleSelect button").forEach(function (b) {
      b.onclick = function () { state.role = b.dataset.role; state.open = null; save(); render(); };
    });
    document.getElementById("lastPick").onchange = function (e) { state.isLastPick = e.target.checked; analyse(); };
    document.getElementById("btnMode").onclick = function () {
      state.expert = !state.expert; state.open = null; save(); analyse();
    };
    document.getElementById("btnDemo").onclick = demo;
    document.getElementById("btnReset").onclick = reset;
    document.getElementById("btnPool").onclick = function () {
      document.getElementById("poolModal").hidden = false; renderPool();
      document.getElementById("poolSearch").focus();
    };
    document.getElementById("poolClose").onclick = function () { document.getElementById("poolModal").hidden = true; };
    document.getElementById("poolSearch").oninput = renderPool;
    document.getElementById("poolModal").onclick = function (e) {
      if (e.target.id === "poolModal") e.currentTarget.hidden = true;
    };

    var sr = document.getElementById("sRisk"), sl = document.getElementById("sLane");
    sr.value = state.risk * 100; sl.value = state.laneFocus * 100;
    function upd() {
      state.risk = sr.value / 100; state.laneFocus = sl.value / 100;
      document.getElementById("sRiskV").textContent = label(state.risk, "sûr", "équilibré", "variance");
      document.getElementById("sLaneV").textContent = label(state.laneFocus, "teamfight", "équilibré", "lane");
      save(); analyse();
    }
    sr.oninput = upd; sl.oninput = upd;
    var po = document.getElementById("poolOnly");
    po.checked = state.poolOnly;
    po.onchange = function () { state.poolOnly = po.checked; save(); analyse(); };
    upd();

    render();
    poll();
    setInterval(poll, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

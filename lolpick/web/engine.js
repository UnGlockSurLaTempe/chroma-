/* =============================================================================
 * LolPick — MOTEUR
 * -----------------------------------------------------------------------------
 *  1. Inférence des rôles adverses (assignation optimale sur 120 permutations)
 *  2. Lecture de comp (types de dégâts, frontline, engage, peel, scaling…)
 *  3. Plan de game : comment cette game se gagne
 *  4. Score par candidat sur 6 axes + pièges + picks tech
 *  5. Items situationnels calculés depuis la draft adverse
 * ========================================================================== */
(function (global) {
  "use strict";

  var ROLES = ["TOP", "JGL", "MID", "BOT", "SUP"];
  var N = global.LP_NORM;

  /* Champions dont les dégâts clés passent par un projectile bloquable */
  var PROJECTILE = ["Ashe", "Caitlyn", "Jhin", "Varus", "Xerath", "Zeri", "Ezreal", "Jinx",
    "Kog'Maw", "Twitch", "Lux", "Morgana", "Blitzcrank", "Thresh", "Nautilus", "Brand",
    "Ziggs", "Vel'Koz", "Zoe", "Senna", "Smolder", "Aphelios", "Sivir", "Corki", "Draven"].map(N);

  /* Ults/sorts de suppression : ni tenacité ni cleanse, uniquement QSS */
  var SUPPRESS = ["Malzahar", "Warwick", "Skarner", "Mordekaiser", "Urgot"].map(N);

  /* Outils qui annulent structurellement un dash/saut */
  var ANTI_DASH = ["Poppy", "Vex", "Trundle", "Anivia", "Jarvan IV", "Taliyah", "Azir"].map(N);

  /* Champions on-hit (règles d'items) */
  var ONHIT = ["Vayne", "Kog'Maw", "Gwen", "Kayle", "Teemo", "Jax", "Master Yi", "Warwick",
    "Bel'Veth", "Nilah", "Kai'Sa", "Twitch", "Varus", "Xayah", "Zeri", "Kindred", "Shyvana"].map(N);

  /* Champions à crit (règles d'items) */
  var CRIT = ["Caitlyn", "Jinx", "Draven", "Vayne", "Tryndamere", "Yasuo", "Yone", "Gangplank", "Aphelios",
    "Jhin", "Xayah", "Sivir", "Samira", "Miss Fortune", "Quinn", "Ashe", "Zeri", "Smolder", "Yunara"].map(N);

  /* Part de dégâts réellement infligée par un champion : le 65% AP d'un
     Malphite ne « résout » pas le même problème que le 100% AP d'un mage. */
  var OUTPUT = {
    marksman: 1, assassin: 1, mageBurst: 1, mageControl: 0.95, skirmisher: 0.95,
    mageBattle: 0.9, diver: 0.8, juggernaut: 0.8, catcher: 0.5,
    vanguard: 0.4, warden: 0.35, enchanter: 0.3
  };
  function output(c) { return OUTPUT[c.cls] === undefined ? 0.7 : OUTPUT[c.cls]; }

  function has(list, champ) { return list.indexOf(champ.key) !== -1; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function champ(nameOrKey) {
    if (!nameOrKey) return null;
    if (typeof nameOrKey === "object") return nameOrKey;
    return global.LP_CHAMP_BY_KEY[N(nameOrKey)] || null;
  }

  /* ====================================================================== */
  /* 1. INFÉRENCE DES RÔLES                                                 */
  /* ====================================================================== */

  /* Affinité d'un champion pour un rôle : 3 = rôle principal, puis dégressif */
  function roleAffinity(c, role) {
    var i = c.roles.indexOf(role);
    if (i === 0) return 3;
    if (i === 1) return 2;
    if (i > 1) return 1;
    return -2.5;
  }

  /**
   * Assigne un rôle à chaque champion d'une équipe.
   * @param entries [{champ, role|null}]  role déjà connu = verrouillé
   * @returns [{champ, role, inferred:bool, confidence:0..1}]
   */
  function inferRoles(entries) {
    var fixed = {}, free = [], freeRoles = ROLES.slice();
    entries.forEach(function (e, idx) {
      if (e.role) { fixed[idx] = e.role; freeRoles.splice(freeRoles.indexOf(e.role), 1); }
      else free.push(idx);
    });
    if (!free.length) {
      return entries.map(function (e) { return { champ: e.champ, role: e.role, inferred: false, confidence: 1 }; });
    }

    /* Heap's algorithm sur tous les rôles libres : en ne lisant que les
       `free.length` premières positions on couvre toutes les assignations. */
    var best = null, second = -Infinity;
    permute(freeRoles, function (perm) {
      var s = 0;
      for (var i = 0; i < free.length; i++) s += roleAffinity(entries[free[i]].champ, perm[i]);
      if (!best || s > best.score) { if (best) second = best.score; best = { score: s, perm: perm.slice() }; }
      else if (s > second) second = s;
    });

    var margin = best.score - (second === -Infinity ? best.score - 3 : second);
    var conf = clamp(0.45 + margin * 0.18, 0.3, 0.97);
    var out = entries.map(function (e) { return { champ: e.champ, role: e.role, inferred: false, confidence: 1 }; });
    free.forEach(function (idx, i) {
      out[idx].role = best.perm[i];
      out[idx].inferred = true;
      out[idx].confidence = conf;
    });
    return out;
  }

  function permute(arr, cb) {
    var n = arr.length, c = new Array(n).fill(0), i = 0;
    cb(arr);
    while (i < n) {
      if (c[i] < i) {
        var k = i % 2 ? c[i] : 0, t = arr[k]; arr[k] = arr[i]; arr[i] = t;
        cb(arr); c[i]++; i = 0;
      } else { c[i] = 0; i++; }
    }
  }

  /* ====================================================================== */
  /* 2. LECTURE DE COMP                                                     */
  /* ====================================================================== */

  function profile(team) {
    var champs = team.filter(function (t) { return t && t.champ; });
    var p = {
      names: champs.map(function (t) { return t.champ.name; }),
      count: champs.length,
      adShare: 0, apShare: 0, trueShare: 0,
      frontline: 0, engage: 0, peel: 0, tankbust: 0, poke: 0, hardCC: 0,
      beefy: 0, hpStack: 0, healers: 0, healerNames: [], dashers: 0, assassins: 0,
      immobiles: 0, shielders: 0, shielderNames: [], projectiles: 0, engageUlts: 0,
      critCarries: 0, critNames: [], aaCarries: 0, mrBuyers: 0, suppressors: [],
      pctDamage: 0, pctNames: [], apBurst: 0, apBurstNames: [], diveThreat: 0,
      scaling: [0, 0, 0], hypercarry: null, splitpusher: null, meleeCount: 0,
      /* Nombre de champions par type de dégâts : un pourcentage seul se lit mal
         (« 55% AD » alors que 3 champions sur 5 sont AP), il faut les deux. */
      adCount: 0, apCount: 0, mixedCount: 0
    };
    if (!champs.length) return p;

    var wsum = 0, ad = 0, ap = 0, tr = 0;
    champs.forEach(function (t) {
      var c = t.champ;
      /* Le mix de dégâts est pondéré par ce que le champion inflige vraiment.
         Pas de malus supplémentaire pour le support : `output` encode déjà la
         faible contribution des catchers (0.5) et des enchanteurs (0.3), et le
         cumuler avec un coefficient de rôle effaçait presque le support du
         calcul — un Thresh AP ne comptait plus que pour 0.275. */
      var w = output(c);
      wsum += w; ad += c.dmg[0] * w; ap += c.dmg[1] * w; tr += c.dmg[2] * w;

      p.engage += c.eng; p.peel += c.peel; p.tankbust += c.hp + c.tb;
      p.scaling[0] += c.sc[0]; p.scaling[1] += c.sc[1]; p.scaling[2] += c.sc[2];
      if (c.tk >= 3) { p.beefy++; if (["juggernaut", "vanguard", "warden"].indexOf(c.cls) !== -1) p.hpStack++; }
      if (c.tk >= 3 || (c.tk >= 2 && c.eng >= 3)) p.frontline++;
      if (c.heal >= 3) { p.healers++; p.healerNames.push(c.name); }
      if (c.pk >= 3) p.poke++;
      if (c.cc >= 3) p.hardCC++;
      if (c.mob >= 3) p.dashers++;
      if (c.cls === "assassin") p.assassins++;
      if (c.dv >= 3) p.diveThreat++;
      if (c.mob <= 1) p.immobiles++;
      if (c.cls === "enchanter" || c.heal >= 3 || c.peel >= 3) { p.shielders++; p.shielderNames.push(c.name); }
      if (has(PROJECTILE, c)) p.projectiles++;
      if (c.eng >= 3) p.engageUlts++;
      if (has(CRIT, c) && c.cls === "marksman") { p.critCarries++; p.critNames.push(c.name); }
      if (c.cls === "marksman" || has(ONHIT, c)) p.aaCarries++;
      if (has(SUPPRESS, c)) p.suppressors.push(c.name);
      if (c.hp >= 2 || c.tb >= 3) { p.pctDamage++; p.pctNames.push(c.name); }
      if (c.dmg[1] >= 60 && c.cls.indexOf("Burst") !== -1) { p.apBurst++; p.apBurstNames.push(c.name); }
      else if (c.dmg[1] >= 60 && (c.cls === "assassin" || c.cls === "mageBurst")) { p.apBurst++; p.apBurstNames.push(c.name); }
      if (c.rng === 0) p.meleeCount++;
      if (c.tk >= 3) p.mrBuyers++;
      if (c.dmg[0] >= 65) p.adCount++;
      else if (c.dmg[1] >= 65) p.apCount++;
      else p.mixedCount++;
    });

    p.adShare = Math.round(ad / wsum);
    p.apShare = Math.round(ap / wsum);
    p.trueShare = Math.round(tr / wsum);
    p.scaling = p.scaling.map(function (v) { return +(v / champs.length).toFixed(2); });

    /* Hypercarry = la source de dégâts que la comp doit protéger */
    var hc = champs.filter(function (t) {
      var c = t.champ;
      return c.sc[2] >= 3 && c.tf >= 3 && (c.cls === "marksman" || c.cls === "mageControl") && c.tk <= 1;
    }).sort(function (a, b) { return (b.champ.sc[2] * 2 - b.champ.mob) - (a.champ.sc[2] * 2 - a.champ.mob); })[0];
    p.hypercarry = hc ? hc.champ.name : null;

    var sp = champs.filter(function (t) { return t.champ.sp >= 3 && t.champ.tf <= 2; })[0];
    p.splitpusher = sp ? sp.champ.name : null;

    return p;
  }

  /* ====================================================================== */
  /* 3. CONTEXTE + PLAN DE GAME                                             */
  /* ====================================================================== */

  function buildContext(draft) {
    var ally = profile(draft.ally);
    var enemy = profile(draft.enemy);
    var laneEnemy = null;
    draft.enemy.forEach(function (t) { if (t && t.champ && t.role === draft.role) laneEnemy = t.champ; });

    var ctx = {
      me: { role: draft.role, isLastPick: !!draft.isLastPick },
      ally: ally,
      enemy: enemy,
      lane: {
        enemy: laneEnemy,
        enemyName: laneEnemy ? laneEnemy.name : null,
        enemyRanged: laneEnemy ? laneEnemy.rng === 1 : false
      }
    };
    enemy.laneHealer = (laneEnemy && laneEnemy.heal >= 3) ? laneEnemy.name : null;
    enemy.laneAP = (laneEnemy && laneEnemy.dmg[1] >= 60) ? laneEnemy.name : null;

    ctx.plan = gamePlan(ctx);
    return ctx;
  }

  function gamePlan(x) {
    var dLate = x.ally.scaling[2] - x.enemy.scaling[2];
    var dEarly = x.ally.scaling[0] - x.enemy.scaling[0];
    var phase, text;

    if (dLate >= 0.5 && dEarly <= 0.3) {
      phase = "late";
      text = "Ta comp scale mieux (" + x.ally.scaling[2] + " vs " + x.enemy.scaling[2] + " en late). " +
             "La game se gagne en survivant à l'early : ne perds pas ta lane, ne donne pas de kill, et refuse les fights avant les objets 2-3.";
    } else if (dEarly >= 0.5 && dLate <= 0.3) {
      phase = "early";
      text = "Ta comp est meilleure tôt (" + x.ally.scaling[0] + " vs " + x.enemy.scaling[0] + ") mais décroche en late. " +
             "La game doit être fermée avant la 25e minute : pression de lane, objectifs pris tôt, on ne temporise pas.";
    } else if (dLate <= -0.5) {
      phase = "early";
      text = "Ils scalent mieux que vous (" + x.enemy.scaling[2] + " vs " + x.ally.scaling[2] + "). " +
             "Il faut créer un avantage avant la 20e minute, sinon leur late vous roulera dessus.";
    } else {
      phase = "mid";
      text = "Les deux comps ont des courbes proches : la game se jouera sur les fights d'objectif en mid game et sur qui contrôle le tempo.";
    }

    var needs = [];
    if (x.ally.apShare < 30) needs.push("des dégâts magiques (l'équipe est à " + x.ally.adShare + "% AD)");
    if (x.ally.adShare < 30) needs.push("des dégâts physiques (l'équipe est quasi full AP)");
    if (x.enemy.beefy >= 2 && x.ally.tankbust <= 4) needs.push("du %PV max ou des dégâts bruts pour percer leurs " + x.enemy.beefy + " tanks");
    if (x.ally.frontline === 0) needs.push("une frontline");
    if (x.ally.engage <= 2) needs.push("un outil d'engage");
    if (x.ally.hypercarry && x.ally.peel <= 3) needs.push("du peel pour " + x.ally.hypercarry);
    if (x.enemy.engageUlts >= 2 && x.ally.peel <= 4) needs.push("un anti-engage (ils ont " + x.enemy.engageUlts + " ults d'initiation)");
    if (x.enemy.healers >= 2) needs.push("des Blessures Graves achetées tôt");

    return { phase: phase, text: text, needs: needs };
  }

  /* ====================================================================== */
  /* 4. MATCHUP DE LANE                                                     */
  /* ====================================================================== */

  function matchup(cand, opp, role) {
    if (!opp) return { value: 0, source: "aucun adversaire connu sur ta lane", note: null };
    var table = (global.LP_MATCHUPS[role] || {});
    var a = table[cand.key], b = table[opp.key];

    function find(entry, targetName) {
      if (!entry) return null;
      var t = N(targetName);
      if ((entry.hardWin || []).some(function (n) { return N(n) === t; })) return 3;
      if ((entry.win || []).some(function (n) { return N(n) === t; })) return 2;
      if ((entry.lose || []).some(function (n) { return N(n) === t; })) return -2;
      if ((entry.hardLose || []).some(function (n) { return N(n) === t; })) return -3;
      return null;
    }

    var v = find(a, opp.name);
    var note = a && a.note ? a.note[opp.name] : null;
    if (v === null) {
      var inv = find(b, cand.name);
      if (inv !== null) { v = -inv; note = (b && b.note) ? b.note[cand.name] : null; }
    }
    if (v !== null) return { value: v, source: "table de matchups", note: note || null };

    return { value: heuristicMatchup(cand, opp), source: "heuristique (pas de donnée curée)", note: null };
  }

  function heuristicMatchup(a, b) {
    var v = 0;
    v += (a.rng - b.rng) * 1.3;               // le ranged domine la lane
    v += (a.sc[0] - b.sc[0]) * 0.5;           // puissance early
    v += (a.sus - b.sus) * 0.25;
    v += (a.mob - b.mob) * 0.2;
    if (b.tk >= 3 && (a.hp + a.tb) >= 4) v += 0.8;   // tank-buster contre tank
    if (a.mob <= 1 && b.dv >= 3) v -= 0.8;           // immobile contre diver
    if (a.rng === 0 && b.pk >= 3) v -= 0.5;          // melee contre poke
    if (a.dis >= 3 && b.eng >= 3) v += 0.4;
    return clamp(+v.toFixed(2), -2.5, 2.5);
  }

  /* À quel point ce champion se fait counter-pick (utile si tu n'es pas last pick) */
  function counterability(cand, role) {
    var table = global.LP_MATCHUPS[role] || {}, n = 0;
    Object.keys(table).forEach(function (k) {
      var e = table[k];
      if ((e.win || []).some(function (x) { return N(x) === cand.key; })) n += 1;
      if ((e.hardWin || []).some(function (x) { return N(x) === cand.key; })) n += 2;
    });
    return n;
  }

  /* ====================================================================== */
  /* 5. SCORE D'UN CANDIDAT                                                 */
  /* ====================================================================== */

  function scoreCandidate(cand, ctx, opts) {
    opts = opts || {};
    var reasons = [], warnings = [];
    var role = ctx.me.role;

    /* --- axe 1 : matchup de lane ------------------------------------- */
    var mu = matchup(cand, ctx.lane.enemy, role);
    var lane = clamp(50 + mu.value * 16.7, 0, 100);
    if (mu.value >= 2) reasons.push("Gagne la lane contre " + ctx.lane.enemyName + (mu.note ? " — " + mu.note : ""));
    if (mu.value <= -2) warnings.push("Perd la lane contre " + ctx.lane.enemyName + (mu.note ? " — " + mu.note : ""));

    /* --- axe 2 : ce qui manque à ta comp ------------------------------ */
    var comp = 50;
    var out = output(cand);
    if (ctx.ally.apShare < 30) {
      if (cand.dmg[1] >= 50 && out >= 0.8) { comp += 20 * out; reasons.push("Apporte les dégâts magiques qui manquent (équipe à " + ctx.ally.adShare + "% AD)"); }
      else if (cand.dmg[1] >= 50) { comp += 8 * out; }
      else if (cand.dmg[1] >= 30 || cand.dmg[2] >= 15) { comp += 10 * out; if (out >= 0.8) reasons.push("Dégâts mixtes : l'équipe n'est plus 100% contrable par de l'armure"); }
      else if (cand.dmg[0] >= 80 && cand.tb <= 1) { comp -= 10 * out; warnings.push("Encore des dégâts AD purs dans une équipe déjà full AD"); }
    }
    if (ctx.ally.adShare < 30 && cand.dmg[0] >= 70) { comp += 12 * out; reasons.push("Apporte les dégâts physiques qui manquent"); }
    if (ctx.ally.frontline === 0) {
      comp += cand.tk * 5.5;
      if (cand.tk >= 3) reasons.push("Devient la frontline que ton équipe n'a pas");
      if (cand.tk <= 1) { comp -= 8; warnings.push("5e champion fragile dans une équipe sans frontline"); }
    }
    if (ctx.ally.engage <= 2) {
      comp += cand.eng * 5;
      if (cand.eng >= 3) reasons.push("Donne l'engage qui manque à l'équipe");
    }
    if (ctx.ally.hypercarry && ctx.ally.peel <= 3) {
      comp += cand.peel * 5 + cand.dis * 3;
      if (cand.peel >= 3) reasons.push("Peel " + ctx.ally.hypercarry + ", qui n'a personne pour la protéger");
    }
    comp = clamp(comp, 0, 100);

    /* --- axe 3 : contre la comp adverse ------------------------------- */
    var counter = 50;
    if (ctx.enemy.beefy >= 2) {
      /* percer un tank ne compte que si le champion inflige vraiment des dégâts */
      counter += (cand.hp + cand.tb) * 5 * (0.5 + 0.5 * out);
      if (cand.hp + cand.tb >= 4 && out >= 0.7) reasons.push("Perce leurs " + ctx.enemy.beefy + " empileurs de résistances (%PV max / dégâts bruts)");
      else if (cand.hp + cand.tb <= 1 && out >= 0.8) warnings.push("Aucun outil pour percer leur frontline");
    }
    if (ctx.enemy.engageUlts >= 2) {
      counter += cand.dis * 5 + cand.peel * 2;
      if (cand.dis >= 3) reasons.push("Anti-engage : ils ont " + ctx.enemy.engageUlts + " ults d'initiation");
    }
    if (ctx.enemy.dashers >= 3 && has(ANTI_DASH, cand)) { counter += 12; reasons.push("Annule structurellement leurs dashs (" + ctx.enemy.dashers + " champions concernés)"); }
    if (ctx.enemy.assassins >= 2) counter += cand.tk * 2 + cand.dis * 3;
    if (ctx.enemy.poke >= 2) {
      counter += cand.eng * 4 + cand.sus * 2;
      if (cand.eng >= 3) reasons.push("Peut forcer le fight contre leur comp de poke");
    }
    if (ctx.enemy.hypercarry && cand.dv >= 3) { counter += 8; reasons.push("Peut atteindre " + ctx.enemy.hypercarry + " dans le fight"); }
    if (ctx.enemy.projectiles >= 3 && cand.dis >= 3) counter += 5;
    if (ctx.enemy.adShare >= 70 && cand.tk >= 3) { counter += 6; reasons.push("Comp adverse full AD : un empileur d'armure la neutralise"); }
    if (ctx.enemy.apShare >= 65 && cand.dmg[1] >= 60 && cand.tk <= 1) counter -= 4;
    counter = clamp(counter, 0, 100);

    /* --- axe 4 : adéquation au plan de game --------------------------- */
    var scaling;
    if (ctx.plan.phase === "late") scaling = 30 + cand.sc[2] * 18 + cand.sc[1] * 5;
    else if (ctx.plan.phase === "early") scaling = 30 + cand.sc[0] * 18 + cand.sc[1] * 5;
    else scaling = 30 + cand.sc[1] * 14 + (cand.sc[0] + cand.sc[2]) * 6;
    scaling = clamp(scaling, 0, 100);
    if (ctx.plan.phase === "late" && cand.sc[2] >= 3) reasons.push("Colle au plan : la game se gagne en late");
    if (ctx.plan.phase === "early" && cand.sc[0] >= 3) reasons.push("Colle au plan : il faut du tempo tôt");

    /* --- axe 5 : synergies -------------------------------------------- */
    var syn = 50;
    var allyNames = ctx.ally.names.map(N);
    if (allyNames.indexOf(N("Yuumi")) !== -1) {
      syn += cand.tk * 5;
      if (cand.tk >= 3) reasons.push("Yuumi a besoin d'un corps devant elle : tu le fournis");
    }
    if ((allyNames.indexOf(N("Yasuo")) !== -1 || allyNames.indexOf(N("Yone")) !== -1) && cand.eng >= 3 && cand.cc >= 3) {
      syn += 10; reasons.push("Knock-up + Yasuo/Yone : combo d'ult naturel");
    }
    if (ctx.ally.hypercarry && (cand.peel >= 3 || cand.tk >= 3)) syn += 8;
    if (ctx.enemy.splitpusher && cand.sp >= 3) { syn += 8; reasons.push("Peut répondre au split de " + ctx.enemy.splitpusher); }
    if (ctx.ally.meleeCount >= 4 && cand.rng === 1) syn += 5;
    if (ctx.ally.engage >= 8 && cand.eng >= 3) syn -= 5;
    syn = clamp(syn, 0, 100);

    /* --- axe 6 : confort ---------------------------------------------- */
    var pool = opts.pool || {};
    var lvl = pool[cand.key];
    var poolDeclared = Object.keys(pool).length > 0;
    var comfort = (lvl === undefined) ? (poolDeclared ? 35 : 60) : [20, 55, 80, 100][lvl];
    /* tant qu'aucun pool n'est déclaré, tout le monde est logé à la même
       enseigne : inutile d'afficher l'avertissement sur chaque candidat */
    if (lvl === undefined && poolDeclared) warnings.push("Hors de ton pool déclaré");

    /* --- pièges -------------------------------------------------------- */
    var traps = [];
    (global.LP_TRAPS || []).forEach(function (t) {
      try {
        if (t.when(ctx) && t.hits(cand)) traps.push({ id: t.id, why: t.why(ctx), malus: t.malus });
      } catch (e) { /* une règle mal écrite ne doit pas casser le moteur */ }
    });

    /* --- picks tech (règles counterpick) ------------------------------- */
    var tech = [];
    (global.LP_COUNTERPICKS || []).forEach(function (r) {
      var hit = null;
      try { if (!r.when(ctx)) return; } catch (e) { return; }
      (r.picks || []).forEach(function (p) {
        if (N(p.champ) === cand.key && p.roles.indexOf(role) !== -1) hit = p;
      });
      if (hit) tech.push({ rule: r.title, why: hit.why, risk: hit.risk, explain: r.explain(ctx) });
    });

    /* --- pondération --------------------------------------------------- */
    var laneW = opts.laneFocus === undefined ? 0.5 : opts.laneFocus;   // 0 = teamfight, 1 = lane
    var risk = opts.risk === undefined ? 0.5 : opts.risk;              // 0 = sûr, 1 = variance

    var W = {
      lane:    0.14 + laneW * 0.16,
      comp:    0.20,
      counter: 0.26 - laneW * 0.06,
      scaling: 0.14,
      synergy: 0.10,
      comfort: 0.16 - risk * 0.10
    };
    var wsum = 0; for (var k in W) wsum += W[k];
    for (var k2 in W) W[k2] /= wsum;

    var total = lane * W.lane + comp * W.comp + counter * W.counter +
                scaling * W.scaling + syn * W.synergy + comfort * W.comfort;

    /* bonus pick tech, plus généreux quand le curseur variance est haut */
    tech.forEach(function (t) { total += (4 + risk * 6) * (t.risk === 1 ? 1 : t.risk === 2 ? 0.85 : 0.6); });

    /* malus pièges */
    traps.forEach(function (t) { total -= t.malus * (0.6 + (1 - risk) * 0.6); });

    /* si tu n'es pas last pick, les champions faciles à counter valent moins */
    var cability = counterability(cand, role);
    if (!ctx.me.isLastPick) total -= Math.min(cability * 0.7, 9);

    /* données incertaines : on le signale sans casser le score */
    if (cand.low) warnings.push("⚠ Données de ce champion à revérifier (champion récent)");

    return {
      champ: cand,
      total: +clamp(total, 0, 100).toFixed(1),
      axes: { lane: Math.round(lane), comp: Math.round(comp), counter: Math.round(counter),
              scaling: Math.round(scaling), synergy: Math.round(syn), comfort: Math.round(comfort) },
      matchup: mu,
      reasons: reasons,
      warnings: warnings,
      traps: traps,
      tech: tech,
      counterability: cability
    };
  }

  /* ====================================================================== */
  /* 6. ITEMS SITUATIONNELS                                                 */
  /* ====================================================================== */

  function situationalItems(cand, ctx) {
    var me = {
      dmgAD: cand.dmg[0], dmgAP: cand.dmg[1],
      crit: has(CRIT, cand), onhit: has(ONHIT, cand),
      melee: cand.rng === 0, tanky: cand.tk >= 3,
      carry: cand.tf >= 3 && cand.tk <= 1,
      /* un tank a beau être « 60% AD », il n'achète pas de pénétration :
         les objets offensifs ne sont proposés qu'aux vraies sources de dégâts */
      dealer: output(cand) >= 0.7
    };
    var out = [];
    (global.LP_SITUATIONAL || []).forEach(function (r) {
      try {
        if (r.when(ctx, me)) out.push({ item: r.item, why: r.why(ctx, me), prio: r.prio, solves: (global.LP_ITEMS[r.item] || {}).solves });
      } catch (e) { /* ignore */ }
    });
    out.sort(function (a, b) { return b.prio - a.prio; });
    /* dédoublonnage (deux règles peuvent proposer le même objet) */
    var seen = {}, uniq = [];
    out.forEach(function (o) { if (!seen[o.item]) { seen[o.item] = 1; uniq.push(o); } });
    return uniq;
  }

  function buildFor(cand) {
    return global.LP_BUILDS[cand.key] || global.LP_CLASS_BUILD[cand.cls] || null;
  }

  /* ====================================================================== */
  /* 7. RECOMMANDATION COMPLÈTE                                             */
  /* ====================================================================== */

  function recommend(draft, opts) {
    opts = opts || {};

    /* Ton champion, s'il est déjà locké. On le note quand même : c'est le
       moment où tu as le plus besoin de sa fiche (build, objets, plan de jeu),
       surtout s'il colle mal à la draft finale. */
    var mineEntry = null;
    (draft.ally || []).forEach(function (t) {
      if (t && t.champ && t.role === draft.role) mineEntry = t;
    });

    var ctx = buildContext(draft);

    /* Les alternatives, elles, doivent être jugées SANS ton pick dans la comp,
       sinon un tank locké fait perdre le bonus « frontline » à tous les autres
       tanks et l'offre aux carries : exactement l'inverse de ce qu'on veut. */
    var ctxAlt = ctx;
    if (mineEntry) {
      ctxAlt = buildContext({
        role: draft.role, isLastPick: draft.isLastPick, bans: draft.bans,
        enemy: draft.enemy,
        ally: draft.ally.map(function (t) {
          return t === mineEntry ? { champ: null, role: t.role } : t;
        })
      });
    }

    var taken = {};
    [].concat(draft.ally, draft.enemy, draft.bans || []).forEach(function (t) {
      if (t && t.champ) taken[t.champ.key] = 1;
      else if (t && t.key) taken[t.key] = 1;
    });

    var candidates = global.LP_CHAMPIONS.filter(function (c) {
      if (taken[c.key]) return false;
      if (opts.poolOnly && !(opts.pool || {})[c.key]) return false;
      if (opts.strictRole !== false && c.roles.indexOf(draft.role) === -1) return false;
      return true;
    });

    var scored = candidates.map(function (c) { return scoreCandidate(c, ctxAlt, opts); })
                           .sort(function (a, b) { return b.total - a.total; });

    var mine = null;
    if (mineEntry) {
      mine = scoreCandidate(mineEntry.champ, ctx, opts);
      mine.locked = true;
      mine.rank = 1 + scored.filter(function (s) { return s.total > mine.total; }).length;
      mine.outOf = scored.length + 1;
      mine.better = scored.filter(function (s) { return s.total > mine.total + 3; });
    }

    /* Règles counterpick déclenchées (pour la section « picks tech ») */
    var firedRules = [];
    (global.LP_COUNTERPICKS || []).forEach(function (r) {
      var ok = false;
      try { ok = r.when(ctx); } catch (e) { ok = false; }
      if (!ok) return;
      var picks = (r.picks || []).filter(function (p) {
        return p.roles.indexOf(draft.role) !== -1 && !taken[N(p.champ)];
      });
      if (picks.length || r.items) firedRules.push({ id: r.id, title: r.title, explain: r.explain(ctx), picks: picks, items: r.items || [] });
    });

    return { ctx: ctx, ranked: scored, rules: firedRules, mine: mine };
  }

  /* ====================================================================== */

  global.LP_ENGINE = {
    ROLES: ROLES,
    champ: champ,
    inferRoles: inferRoles,
    profile: profile,
    buildContext: buildContext,
    matchup: matchup,
    scoreCandidate: scoreCandidate,
    situationalItems: situationalItems,
    buildFor: buildFor,
    recommend: recommend
  };
})(typeof window !== "undefined" ? window : globalThis);

/* Tests de non-régression — `node tests/test_engine.js`
 * Vérifie l'intégrité des données (aucun nom de champion inconnu dans les
 * tables) et le comportement du moteur sur des drafts de référence.        */
"use strict";
global.window = global;
["champions", "matchups", "builds", "counterpicks"].forEach(function (f) { require("../web/data/" + f + ".js"); });
require("../web/engine.js");

var E = global.LP_ENGINE, C = E.champ, N = global.LP_NORM;
var fails = 0, checks = 0;

function ok(cond, label, extra) {
  checks++;
  if (!cond) { fails++; console.log("  ✗ " + label + (extra ? "  → " + extra : "")); }
  else console.log("  ✓ " + label);
}
function section(t) { console.log("\n" + t); }

/* ---------------------------------------------------------------- data -- */
section("Intégrité des données");

var unknown = [];
Object.keys(global.LP_MATCHUPS).forEach(function (role) {
  var tbl = global.LP_MATCHUPS[role];
  Object.keys(tbl).forEach(function (key) {
    if (!global.LP_CHAMP_BY_KEY[key]) unknown.push(role + ":" + key + " (fiche)");
    var e = tbl[key];
    ["win", "lose", "hardWin", "hardLose"].forEach(function (f) {
      (e[f] || []).forEach(function (n) {
        if (!global.LP_CHAMP_BY_KEY[N(n)]) unknown.push(role + ":" + key + "." + f + " → " + n);
      });
    });
    Object.keys(e.note || {}).forEach(function (n) {
      if (!global.LP_CHAMP_BY_KEY[N(n)]) unknown.push(role + ":" + key + ".note → " + n);
    });
  });
});
ok(unknown.length === 0, "tous les champions cités dans les matchups existent", unknown.slice(0, 8).join(" | "));

var badPicks = [];
global.LP_COUNTERPICKS.forEach(function (r) {
  (r.picks || []).forEach(function (p) {
    if (!global.LP_CHAMP_BY_KEY[N(p.champ)]) badPicks.push(r.id + " → " + p.champ);
    (p.roles || []).forEach(function (ro) {
      if (E.ROLES.indexOf(ro) === -1) badPicks.push(r.id + " rôle invalide " + ro);
    });
  });
});
ok(badPicks.length === 0, "tous les picks des règles counterpick existent", badPicks.join(" | "));

var badBuilds = Object.keys(global.LP_BUILDS).filter(function (k) { return !global.LP_CHAMP_BY_KEY[k]; });
ok(badBuilds.length === 0, "toutes les fiches de build correspondent à un champion", badBuilds.join(", "));

var noBuild = global.LP_CHAMPIONS.filter(function (c) { return !E.buildFor(c); });
ok(noBuild.length === 0, "chaque champion a un build (fiche ou repli de classe)", noBuild.map(function (c) { return c.name; }).join(", "));

var badDmg = global.LP_CHAMPIONS.filter(function (c) {
  var s = c.dmg[0] + c.dmg[1] + c.dmg[2];
  return s < 95 || s > 105;
});
ok(badDmg.length === 0, "les répartitions de dégâts totalisent ~100%", badDmg.map(function (c) { return c.name; }).join(", "));
ok(global.LP_CHAMPIONS.length > 160, "roster complet (" + global.LP_CHAMPIONS.length + " champions)");

/* --------------------------------------------------------------- roles -- */
section("Inférence des rôles adverses");
var inferred = E.inferRoles([
  { champ: C("Malphite") }, { champ: C("Lee Sin") }, { champ: C("Syndra") },
  { champ: C("Caitlyn") }, { champ: C("Thresh") }
]).map(function (r) { return r.role; });
ok(inferred.join(",") === "TOP,JGL,MID,BOT,SUP", "comp standard correctement répartie", inferred.join(","));

var flex = E.inferRoles([
  { champ: C("Gwen") }, { champ: C("Karthus") }, { champ: C("Galio") },
  { champ: C("Zeri") }, { champ: C("Yuumi") }
]).map(function (r) { return r.role; });
ok(flex.join(",") === "TOP,JGL,MID,BOT,SUP", "comp flex correctement répartie", flex.join(","));

var partial = E.inferRoles([{ champ: C("Ashe") }, { champ: C("Nautilus") }]).map(function (r) { return r.role; });
ok(partial.join(",") === "BOT,SUP", "inférence sur une équipe incomplète", partial.join(","));

/* ------------------------------------------------------------- scénario -- */
section("Scénario de référence (top last pick, Zeri/Yuumi vs Malphite/Morde/Galio/Ashe/Sera)");
var demo = {
  role: "TOP", isLastPick: true,
  ally: [{ champ: null, role: "TOP" }, { champ: C("Naafiri"), role: "JGL" }, { champ: null, role: "MID" },
         { champ: C("Zeri"), role: "BOT" }, { champ: C("Yuumi"), role: "SUP" }],
  enemy: [{ champ: C("Malphite"), role: "TOP" }, { champ: C("Mordekaiser"), role: "JGL" },
          { champ: C("Galio"), role: "MID" }, { champ: C("Ashe"), role: "BOT" }, { champ: C("Seraphine"), role: "SUP" }]
};
var r = E.recommend(demo, {});
var names = r.ranked.map(function (s) { return s.champ.name; });

ok(r.ctx.enemy.apShare >= 55, "la comp adverse est lue comme majoritairement AP (" + r.ctx.enemy.apShare + "%)");
ok(r.ctx.ally.adShare >= 70, "la comp alliée est lue comme AD-lourde (" + r.ctx.ally.adShare + "%)");
ok(r.ctx.ally.frontline === 0, "absence de frontline détectée");
ok(r.ctx.ally.hypercarry === "Zeri", "Zeri identifiée comme carry à protéger", r.ctx.ally.hypercarry);
ok(r.ctx.enemy.beefy >= 3, "3 empileurs de résistances détectés (" + r.ctx.enemy.beefy + ")");
ok(names.indexOf("Poppy") >= 0 && names.indexOf("Poppy") < 5, "Poppy (anti-dash, annule Malphite R et Galio R) dans le top 5", "rang " + (names.indexOf("Poppy") + 1));
ok(names.indexOf("Gwen") >= 0 && names.indexOf("Gwen") < 6, "Gwen (dégâts magiques %PV max) dans le top 6", "rang " + (names.indexOf("Gwen") + 1));
ok(r.rules.some(function (u) { return u.id === "mur-armure-sans-magique"; }), "règle « mur d'armure sans dégât magique » déclenchée");
ok(r.rules.some(function (u) { return u.id === "pas-de-frontline"; }), "règle « pas de frontline » déclenchée");
ok(r.rules.some(function (u) { return u.id === "wombo-engage"; }), "règle « comp d'engage » déclenchée");

var gwen = r.ranked.filter(function (s) { return s.champ.name === "Gwen"; })[0];
var items = E.situationalItems(gwen.champ, r.ctx).map(function (i) { return i.item; });
ok(items.indexOf("Void Staff") !== -1, "Void Staff proposé (ils empilent PV/résistances)", items.join(", "));
ok(items.indexOf("Morellonomicon") !== -1, "anti-heal AP proposé (Mordekaiser + Seraphine)", items.join(", "));

/* ------------------------------------------------------------- full AD --- */
section("Comp adverse full AD (jungle)");
var adDraft = {
  role: "JGL", isLastPick: true,
  ally: [{ champ: C("Ornn"), role: "TOP" }, { champ: null, role: "JGL" }, { champ: C("Orianna"), role: "MID" },
         { champ: C("Jinx"), role: "BOT" }, { champ: C("Lulu"), role: "SUP" }],
  enemy: [{ champ: C("Jax"), role: "TOP" }, { champ: C("Graves"), role: "JGL" }, { champ: C("Yasuo"), role: "MID" },
          { champ: C("Draven"), role: "BOT" }, { champ: C("Pyke"), role: "SUP" }]
};
var r2 = E.recommend(adDraft, {});
ok(r2.ctx.enemy.adShare >= 80, "comp adverse lue comme full AD (" + r2.ctx.enemy.adShare + "%)");
ok(r2.rules.some(function (u) { return u.id === "comp-full-ad"; }), "règle « comp full AD » déclenchée");
ok(r2.rules.some(function (u) { return u.picks.some(function (p) { return p.champ === "Rammus"; }); }), "Rammus proposé comme contre");

/* ------------------------------------------------- régressions signalées -- */
section("Régressions signalées en partie");

/* Comp Kayle / Ekko / Thresh / Samira / Zed : 3 champions AP pour 2 AD.
   Le support était pénalisé deux fois (coefficient de rôle × output), ce qui
   effaçait les dégâts magiques de Thresh et affichait « 60% AD ». */
var mixed = [C("Kayle"), C("Ekko"), C("Thresh"), C("Samira"), C("Zed")].map(function (c) { return { champ: c }; });
E.inferRoles(mixed).forEach(function (x, i) { mixed[i].role = x.role; });
var mp = E.profile(mixed);
ok(mp.apCount === 3 && mp.adCount === 2, "les champions sont comptés par type de dégâts",
   mp.adCount + " AD / " + mp.apCount + " AP");
ok(mp.apShare >= 40, "la part de dégâts magiques n'est plus écrasée (" + mp.apShare + "% AP)");
ok(Math.abs(mp.adShare - mp.apShare) <= 15, "cette comp est lue comme mixte, pas comme AD",
   mp.adShare + "/" + mp.apShare);

/* Pick verrouillé : sa fiche doit rester accessible, y compris quand la draft
   a mal tourné après coup. */
var lockedDraft = {
  role: "TOP", isLastPick: false,
  ally: [{ champ: C("Garen"), role: "TOP" }, { champ: C("Vi"), role: "JGL" },
         { champ: C("Orianna"), role: "MID" }, { champ: C("Jinx"), role: "BOT" },
         { champ: null, role: "SUP" }],
  enemy: mixed
};
var rl = E.recommend(lockedDraft, {});
ok(rl.mine && rl.mine.champ.name === "Garen", "le champion déjà locké est analysé");
ok(rl.mine.locked === true && rl.mine.rank >= 1 && rl.mine.outOf > rl.mine.rank,
   "il est situé dans le classement (" + rl.mine.rank + "e sur " + rl.mine.outOf + ")");
ok(E.buildFor(rl.mine.champ) && E.situationalItems(rl.mine.champ, rl.ctx).length > 0,
   "sa fiche fournit build et objets adaptés à la draft");
ok(!rl.ranked.some(function (s) { return s.champ.name === "Garen"; }),
   "il n'apparaît pas en double dans les alternatives");

/* Les alternatives doivent être jugées SANS ton pick : sinon un tank locké
   prive tous les autres tanks du bonus « frontline ». */
var sameNoMine = E.recommend({
  role: "TOP", isLastPick: false,
  ally: [{ champ: null, role: "TOP" }].concat(lockedDraft.ally.slice(1)),
  enemy: mixed
}, {});
ok(Math.abs(sameNoMine.ranked[0].total - rl.ranked[0].total) < 0.01,
   "les alternatives sont notées comme si ton slot était vide",
   sameNoMine.ranked[0].champ.name + " " + sameNoMine.ranked[0].total + " vs " +
   rl.ranked[0].champ.name + " " + rl.ranked[0].total);

/* -------------------------------------------------------------- garde-fous */
section("Garde-fous");
var empty = { role: "TOP", isLastPick: false, ally: [], enemy: [], bans: [] };
var r3 = E.recommend(empty, {});
ok(r3.ranked.length > 0, "une draft vide ne casse pas le moteur");
ok(r3.ctx.plan && r3.ctx.plan.text, "un plan de game est produit même sans donnée");

var pooled = E.recommend(demo, { poolOnly: true, pool: { gwen: 3, poppy: 1 } });
ok(pooled.ranked.length === 2, "le mode « uniquement mon pool » restreint les candidats", pooled.ranked.length + " candidats");
ok(pooled.ranked[0].champ.name === "Gwen", "à pool égal, le confort départage", pooled.ranked[0].champ.name);

var noLast = E.recommend(Object.assign({}, demo, { isLastPick: false }), {});
ok(noLast.ranked[0].total <= r.ranked[0].total, "sans last pick, les champions counterables perdent des points");

var allRoles = E.ROLES.every(function (role) {
  var d = Object.assign({}, demo, { role: role });
  return E.recommend(d, {}).ranked.length > 0;
});
ok(allRoles, "les 5 rôles renvoient des candidats");

console.log("\n" + (fails ? "✗ " + fails + " échec(s) sur " + checks : "✓ " + checks + " vérifications OK"));
process.exit(fails ? 1 : 0);

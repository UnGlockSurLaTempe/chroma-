/* =============================================================================
 * LolPick — SECRET COUNTER PICKS (règles à déclencheurs) & PIÈGES
 * -----------------------------------------------------------------------------
 * Ce ne sont pas des listes figées : chaque règle a une CONDITION lue sur la
 * draft. Si la condition est vraie, les picks proposés reçoivent un bonus de
 * score et apparaissent dans la section « Picks tech ».
 *
 * risk : 1 = pick standard sûr · 2 = pick tech, demande de savoir le jouer
 *        3 = pari, très fort si ça passe, ridicule sinon
 *
 * ctx (calculé par le moteur) expose :
 *   ctx.me    { role, isLastPick }
 *   ctx.ally  { adShare, apShare, trueShare, frontline, engage, peel, tankbust,
 *               hypercarry, scaling[3], names[] }
 *   ctx.enemy { beefy, hpStack, healers, poke, engageUlts, dashers, assassins,
 *               aaCarries, critCarries, immobiles, shielders, projectiles,
 *               adShare, apShare, hardCC, hypercarry, splitpusher, scaling[3] }
 *   ctx.lane  { enemy (champion ou null), enemyRanged }
 * ========================================================================== */
(function (global) {
  "use strict";

  var RULES = [

    /* ---------------------------------------------------------------- */
    { id: "mur-armure-sans-magique",
      title: "Mur d'armure/PV et aucun dégât magique dans ta team",
      when: function (x) { return x.enemy.beefy >= 3 && x.ally.apShare < 30; },
      explain: function (x) {
        return "Ils alignent " + x.enemy.beefy + " empileurs de résistances/PV et ton équipe est à " +
               x.ally.adShare + "% de dégâts AD. Ils achèteront de l'armure et tes alliés ne perceront plus rien. " +
               "Il te faut du magique, du %PV max ou des dégâts bruts — pas un 5e AD.";
      },
      picks: [
        { champ:"Gwen",     roles:["TOP","JGL"], risk:1, why:"Dégâts magiques %PV max + bruts au centre du Q. L'armure empilée ne sert à rien contre elle." },
        { champ:"Vayne",    roles:["TOP","BOT"], risk:2, why:"Le W en dégâts BRUTS %PV max ignore toutes les résistances. Le pick anti-tank de référence." },
        { champ:"Kayle",    roles:["TOP","MID"], risk:2, why:"Dégâts mixtes AD/AP à distance en late : ils ne peuvent pas acheter une seule résistance pour la contrer." },
        { champ:"Yone",     roles:["TOP","MID"], risk:1, why:"La moitié de ses dégâts est convertie en magique : il continue de taper à travers l'armure." },
        { champ:"Cho'Gath", roles:["TOP","JGL","MID"], risk:2, why:"Le R inflige des dégâts BRUTS : c'est le seul tank qui tue les autres tanks." },
        { champ:"Kennen",   roles:["TOP","MID"], risk:2, why:"AP ranged en top : il apporte le type de dégâts manquant ET un stun de zone." },
        { champ:"Kog'Maw",  roles:["BOT"], risk:2, why:"Le W en %PV max magique sur auto : rien ne fond les tanks plus vite, mais il lui faut du peel." },
        { champ:"Varus",    roles:["BOT","MID"], risk:1, why:"Les stacks de W infligent des dégâts %PV max à distance." },
        { champ:"Kindred",  roles:["JGL"], risk:2, why:"Dégâts %PV courant sur auto à distance : anti-tank sans avoir à rentrer." },
        { champ:"Lillia",   roles:["JGL"], risk:2, why:"Passif en %PV max magique + kite permanent." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "empilement-pv",
      title: "Ils empilent les PV",
      when: function (x) { return x.enemy.hpStack >= 3 && x.enemy.beefy < 3; },
      explain: function (x) { return x.enemy.hpStack + " champions vont empiler les points de vie. Les dégâts plats deviennent inutiles, il faut du pourcentage."; },
      picks: [
        { champ:"Vayne",   roles:["TOP","BOT"], risk:2, why:"%PV max en dégâts bruts." },
        { champ:"Gwen",    roles:["TOP","JGL"], risk:1, why:"%PV max magique." },
        { champ:"Camille", roles:["TOP","JGL"], risk:1, why:"Le W en %PV max + le R qui isole un carry." },
        { champ:"Trundle", roles:["TOP","JGL"], risk:1, why:"Le R VOLE leurs résistances : plus ils empilent, plus il gagne." },
        { champ:"Urgot",   roles:["TOP"], risk:2, why:"%PV max sur ses jambes tout en étant lui-même très dur à tuer." },
        { champ:"Warwick", roles:["JGL","TOP"], risk:1, why:"Le Q en %PV max le soigne autant qu'il inflige." },
        { champ:"Fiora",   roles:["TOP"], risk:2, why:"Dégâts bruts sur les vitales + le R en %PV max." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "wombo-engage",
      title: "Comp d'engage / wombo : leurs ults te suppriment le fight",
      when: function (x) { return x.enemy.engageUlts >= 2 && (x.ally.peel <= 3 || x.ally.hypercarry); },
      explain: function (x) {
        return "Ils ont " + x.enemy.engageUlts + " ults d'engage. Si ton équipe se fait toucher groupée, le fight est perdu avant de commencer" +
               (x.ally.hypercarry ? " — et " + x.ally.hypercarry + " meurt en premier." : ".");
      },
      picks: [
        { champ:"Poppy",       roles:["TOP","JGL","SUP"], risk:1, why:"Le W bloque TOUS les dashs et sauts : Malphite R, Galio R, Alistar W, Hecarim R, Zac E, Jarvan Q-E sont annulés à la source. Le R les repousse hors du fight." },
        { champ:"Janna",       roles:["SUP"], risk:1, why:"R + Q : rien ne reste sur ton carry." },
        { champ:"Milio",       roles:["SUP"], risk:1, why:"Le R nettoie tous les CC de l'équipe : leur combo entier tombe à plat." },
        { champ:"Taric",       roles:["SUP"], risk:2, why:"Le R rend toute l'équipe invulnérable pendant leur wombo." },
        { champ:"Sivir",       roles:["BOT"], risk:1, why:"Le E bloque le sort d'engage ciblé (Malphite R, Ashe R) et son R permet de fuir ou de suivre." },
        { champ:"Morgana",     roles:["SUP","MID"], risk:1, why:"Le E annule le PREMIER CC : un bouclier posé au bon moment supprime l'engage." },
        { champ:"Gragas",      roles:["JGL","TOP"], risk:1, why:"Le R repousse leur groupe : c'est un anti-engage à distance." },
        { champ:"Xin Zhao",    roles:["JGL"], risk:2, why:"Le R repousse tout le monde autour et annule les dégâts à distance." },
        { champ:"Tahm Kench",  roles:["SUP","TOP"], risk:1, why:"Le W avale ton carry : le focus adverse est annulé." },
        { champ:"Braum",       roles:["SUP"], risk:1, why:"Mur de projectiles + peel de contact." },
        { champ:"Alistar",     roles:["SUP"], risk:2, why:"Son R le rend quasi invulnérable : il absorbe leur engage et repousse tout." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "full-projectiles",
      title: "Leurs dégâts passent par des projectiles",
      when: function (x) { return x.enemy.projectiles >= 3; },
      explain: function (x) { return x.enemy.projectiles + " de leurs champions font passer leurs dégâts clés par des projectiles : ça se bloque."; },
      picks: [
        { champ:"Yasuo",  roles:["MID","TOP"], risk:2, why:"Le mur de vent supprime leurs sorts clés d'un bouton." },
        { champ:"Braum",  roles:["SUP"], risk:1, why:"Le E bloque les projectiles pour toute l'équipe." },
        { champ:"Samira", roles:["BOT"], risk:2, why:"Le W détruit tous les projectiles autour d'elle." },
        { champ:"Sivir",  roles:["BOT"], risk:1, why:"Le E mange le premier sort qui l'atteint." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "comp-full-ad",
      title: "Comp adverse quasi 100% AD",
      when: function (x) { return x.enemy.adShare >= 70; },
      explain: function (x) { return "Ils sont à " + x.enemy.adShare + "% de dégâts physiques : l'armure est un contre à elle seule."; },
      picks: [
        { champ:"Rammus",   roles:["JGL"], risk:1, why:"Armure + renvoi de dégâts + taunt : une comp full AD ne peut littéralement pas le tuer." },
        { champ:"Malphite", roles:["TOP","SUP","JGL"], risk:1, why:"Son passif et son W annulent les champions à auto-attaques AD." },
        { champ:"Ornn",     roles:["TOP"], risk:1, why:"Armure + PV + engage, et il améliore les objets de l'équipe." },
        { champ:"Poppy",    roles:["TOP","JGL","SUP"], risk:1, why:"Armure + anti-dash : elle annule les divers AD." },
        { champ:"Jax",      roles:["TOP","JGL"], risk:2, why:"Le E annule les auto-attaques : contre deux carries AD à auto c'est un mur." },
        { champ:"Shen",     roles:["TOP","SUP"], risk:2, why:"Le W au sol supprime le DPS des auto-attaques adverses en plein fight." },
        { champ:"Teemo",    roles:["TOP"], risk:3, why:"L'aveuglement annule complètement un carry à auto-attaques." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "comp-full-ap",
      title: "Comp adverse majoritairement AP",
      when: function (x) { return x.enemy.apShare >= 65; },
      explain: function (x) { return "Ils sont à " + x.enemy.apShare + "% de dégâts magiques : ta MR vaut de l'or, ton armure ne sert à rien."; },
      picks: [
        { champ:"Galio",      roles:["MID","SUP","TOP"], risk:1, why:"Bouclier magique de passif + il donne de la MR à toute l'équipe : anti-AP structurel." },
        { champ:"Kassadin",   roles:["MID"], risk:1, why:"Son bouclier magique le rend injouable pour un mage." },
        { champ:"Malzahar",   roles:["MID"], risk:1, why:"Bouclier de passif contre les CC + suppression sur leur carry AP." },
        { champ:"Cho'Gath",   roles:["TOP","MID"], risk:2, why:"PV massifs + Kaenic Rookern/MR : il ne meurt plus au burst magique." },
        { champ:"Sion",       roles:["TOP","JGL"], risk:2, why:"PV illimités + MR, et il engage à travers la map." },
        { champ:"Mordekaiser", roles:["TOP","JGL"], risk:2, why:"Spirit Visage + son sustain : il survit au poke AP et isole leur mage avec le R." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "hypercarry-immobile",
      title: "Leur carry est immobile (et c'est leur seule source de dégâts)",
      when: function (x) { return !!x.enemy.hypercarry && x.enemy.immobiles >= 2; },
      explain: function (x) { return "Tout leur damage passe par " + x.enemy.hypercarry + ", qui n'a pas d'échappatoire. Supprime-le et le fight est gagné."; },
      picks: [
        { champ:"Rengar",   roles:["JGL","TOP"], risk:2, why:"Camouflage + saut : il flanke et le supprime avant que son support réagisse." },
        { champ:"Kha'Zix",  roles:["JGL"], risk:2, why:"Bonus massif contre une cible isolée." },
        { champ:"Camille",  roles:["TOP","JGL"], risk:1, why:"Le R l'isole du reste de l'équipe : personne ne peut le peel." },
        { champ:"Malzahar", roles:["MID"], risk:1, why:"La suppression du R ignore la tenacité : ni cleanse ni peel ne le sauvent (seulement QSS)." },
        { champ:"Warwick",  roles:["JGL","TOP"], risk:1, why:"Le R est une suppression ciblée qui traverse le peel." },
        { champ:"Vi",       roles:["JGL"], risk:1, why:"Le R le verrouille et le sort de la protection de son équipe." },
        { champ:"Skarner",  roles:["JGL","TOP"], risk:2, why:"Le R le déplace de force hors de son backline." },
        { champ:"Nocturne", roles:["JGL"], risk:2, why:"Le R le dive depuis n'importe où et aveugle son équipe." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "peel-comp-enchanteur",
      title: "Hypercarry + enchanteur : ils vont jouer le peel",
      when: function (x) { return !!x.enemy.hypercarry && x.enemy.shielders >= 2; },
      explain: function () { return "Boucliers et soins en pagaille : les dégâts progressifs ne passeront pas, il faut du CC qui ignore le peel ou de l'anti-bouclier."; },
      picks: [
        { champ:"Malzahar", roles:["MID"], risk:1, why:"Suppression point-and-click : aucun bouclier ne l'annule." },
        { champ:"Warwick",  roles:["JGL","TOP"], risk:1, why:"Suppression ciblée à travers le peel." },
        { champ:"Vi",       roles:["JGL"], risk:1, why:"CC ciblé imparable + le Q brise les boucliers." },
        { champ:"Skarner",  roles:["JGL","TOP"], risk:2, why:"Il déplace la cible de force hors de la zone de protection." },
        { champ:"Renata Glasc", roles:["SUP"], risk:2, why:"Le R retourne leur regroupement contre eux au moment où ils s'engagent." }
      ],
      items: ["Serpent's Fang", "Mortal Reminder / Morellonomicon"] },

    /* ---------------------------------------------------------------- */
    { id: "sustain-massif",
      title: "Ils se soignent énormément",
      when: function (x) { return x.enemy.healers >= 2; },
      explain: function (x) { return x.enemy.healerNames.join(", ") + " : sans Blessures Graves achetées TÔT, tes dégâts ne comptent pas."; },
      picks: [
        { champ:"Cho'Gath", roles:["TOP","MID","JGL"], risk:2, why:"Le R en dégâts bruts exécute peu importe les soins." },
        { champ:"Katarina", roles:["MID"], risk:2, why:"Son R applique des Blessures Graves en continu sur une zone." },
        { champ:"Miss Fortune", roles:["BOT"], risk:1, why:"Son R applique l'anti-heal sur toute leur équipe groupée." }
      ],
      items: ["Executioner's Calling / Oblivion Orb dès la lane", "Mortal Reminder", "Morellonomicon", "Bramble Vest"] },

    /* ---------------------------------------------------------------- */
    { id: "pas-de-frontline",
      title: "Ton équipe n'a pas de frontline",
      when: function (x) { return x.ally.frontline === 0; },
      explain: function (x) {
        return "Personne dans ton équipe ne peut encaisser un fight" +
               (x.ally.hypercarry ? ", et " + x.ally.hypercarry + " a besoin de quelqu'un devant elle pour exister" : "") +
               ". Si tu prends un 5e champion fragile, vous perdez tous les fights groupés.";
      },
      picks: [
        { champ:"Ornn",     roles:["TOP"], risk:1, why:"Frontline + engage + amélioration d'objets pour toute l'équipe." },
        { champ:"Sion",     roles:["TOP","JGL"], risk:1, why:"PV illimités et engage à portée map." },
        { champ:"K'Sante",  roles:["TOP"], risk:2, why:"Frontline en fight, duelliste en side." },
        { champ:"Malphite", roles:["TOP","SUP","JGL"], risk:1, why:"Le frontline le plus simple avec un ult qui gagne des fights." },
        { champ:"Zac",      roles:["JGL","TOP"], risk:1, why:"Frontline increvable avec engage longue portée." },
        { champ:"Poppy",    roles:["TOP","JGL","SUP"], risk:1, why:"Frontline qui protège en plus le carry des dashs." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "pas-de-peel",
      title: "Ton carry n'a personne pour le protéger",
      when: function (x) { return !!x.ally.hypercarry && x.ally.peel <= 3; },
      explain: function (x) { return x.ally.hypercarry + " est votre source de dégâts et personne ne peut le peel : il mourra en premier dans chaque fight."; },
      picks: [
        { champ:"Poppy",      roles:["TOP","JGL","SUP"], risk:1, why:"Le W autour du carry annule tous les dashs et sauts qui viennent le chercher." },
        { champ:"Shen",       roles:["TOP","SUP"], risk:2, why:"Le W supprime le DPS des auto-attaques et le R le sauve à distance." },
        { champ:"Tahm Kench", roles:["SUP","TOP"], risk:1, why:"Le W l'avale : le burst adverse est annulé." },
        { champ:"Braum",      roles:["SUP"], risk:1, why:"Mur de projectiles + CC de contact." },
        { champ:"Janna",      roles:["SUP"], risk:1, why:"R + Q : tout ce qui s'approche est repoussé." },
        { champ:"Lulu",       roles:["SUP"], risk:1, why:"Le R annule le burst d'un assassin sur lui." },
        { champ:"Kayle",      roles:["TOP","MID"], risk:2, why:"Le R le rend invulnérable au moment du focus." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "pas-d-engage",
      title: "Ton équipe ne peut pas initier",
      when: function (x) { return x.ally.engage <= 2 && x.enemy.poke >= 2; },
      explain: function () { return "Sans engage face à une comp qui poke, vous serez usés avant chaque objectif sans jamais pouvoir les toucher."; },
      picks: [
        { champ:"Malphite", roles:["TOP","SUP","JGL"], risk:1, why:"R = engage inarrêtable sur leur groupe." },
        { champ:"Kennen",   roles:["TOP","MID"], risk:2, why:"R = stun de zone sur toute leur comp." },
        { champ:"Wukong",   roles:["TOP","JGL"], risk:1, why:"E + R = knock-up de zone." },
        { champ:"Sion",     roles:["TOP","JGL"], risk:1, why:"R depuis l'autre bout de la map, impossible à voir venir." },
        { champ:"Zac",      roles:["JGL","TOP"], risk:1, why:"E longue portée : il ouvre le fight de loin." },
        { champ:"Nautilus", roles:["SUP","JGL"], risk:1, why:"Chaîne de CC dès le premier contact." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "assassins-adverses",
      title: "Ils ont plusieurs assassins",
      when: function (x) { return x.enemy.assassins >= 2; },
      explain: function () { return "Leurs assassins vont chercher ton backline. Les champions qui punissent le dash ou qui annulent le burst valent plus que des dégâts."; },
      picks: [
        { champ:"Vex",        roles:["MID"], risk:1, why:"Son passif punit chaque dash : les assassins ne peuvent plus entrer impunément." },
        { champ:"Lissandra",  roles:["MID"], risk:1, why:"R en stase sur elle-même + CC dur : elle survit et les verrouille." },
        { champ:"Malzahar",   roles:["MID"], risk:1, why:"Le bouclier de passif annule leur CC d'ouverture, le R les supprime." },
        { champ:"Poppy",      roles:["TOP","JGL","SUP"], risk:1, why:"Anti-dash structurel." },
        { champ:"Tahm Kench", roles:["SUP","TOP"], risk:1, why:"Il avale la cible focus au moment du burst." },
        { champ:"Zilean",     roles:["SUP","MID"], risk:2, why:"Le R annule le kill qu'ils viennent de faire." },
        { champ:"Taric",      roles:["SUP"], risk:2, why:"Invulnérabilité d'équipe au moment du saut." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "trop-de-dashs",
      title: "Leur comp repose sur les dashs",
      when: function (x) { return x.enemy.dashers >= 3; },
      explain: function (x) { return x.enemy.dashers + " de leurs champions dépendent d'un dash pour entrer : bloque le dash, tu supprimes le champion."; },
      picks: [
        { champ:"Poppy",    roles:["TOP","JGL","SUP"], risk:1, why:"Le W annule tous les dashs dans la zone." },
        { champ:"Vex",      roles:["MID"], risk:1, why:"Le passif fear et burst le premier qui dash." },
        { champ:"Trundle",  roles:["TOP","JGL"], risk:2, why:"Le pilier bloque physiquement les trajectoires." },
        { champ:"Anivia",   roles:["MID"], risk:2, why:"Le mur coupe leur approche en deux." },
        { champ:"Jarvan IV", roles:["JGL","TOP"], risk:1, why:"La cage du R les enferme après leur entrée." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "splitpush-adverse",
      title: "Ils ont un splitpusher qui va te forcer à répondre",
      when: function (x) { return !!x.enemy.splitpusher; },
      explain: function (x) { return x.enemy.splitpusher + " va prendre le side et forcer un 1v1. Si personne dans ton équipe ne peut y répondre, vous perdez des tourelles sans fight."; },
      picks: [
        { champ:"Shen",     roles:["TOP","SUP"], risk:1, why:"Il tient le side ET participe aux fights avec son R global : c'est la réponse propre au split." },
        { champ:"Jax",      roles:["TOP","JGL"], risk:1, why:"Il gagne le 1v1 en late contre presque tout le monde." },
        { champ:"Fiora",    roles:["TOP"], risk:2, why:"Elle gagne le duel et prend une tourelle en face pendant qu'il prend la sienne." },
        { champ:"Trundle",  roles:["TOP","JGL"], risk:1, why:"Le R lui vole ses résistances : il perd le duel qu'il pensait gagner." },
        { champ:"Tryndamere", roles:["TOP"], risk:2, why:"Il joue la même game qu'eux, en plus rapide." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "scaling-favorable",
      title: "Ta comp scale mieux : tu n'as pas besoin de gagner ta lane",
      when: function (x) { return x.ally.scaling[2] - x.enemy.scaling[2] >= 2 && x.ally.scaling[0] <= x.enemy.scaling[0]; },
      explain: function () { return "Ton équipe gagne le late : ton job est de survivre à la lane sans donner de kill, pas de la gagner. Un pick safe qui scale vaut mieux qu'un pick agressif."; },
      picks: [
        { champ:"Kayle",    roles:["TOP","MID"], risk:2, why:"Le pick de scaling absolu : elle perd la lane et gagne la game." },
        { champ:"Gwen",     roles:["TOP","JGL"], risk:1, why:"Le W lui permet de farmer sous pression et de survivre aux ganks." },
        { champ:"Cho'Gath", roles:["TOP","MID"], risk:1, why:"Il farm en sécurité et devient impossible à tuer." },
        { champ:"Nasus",    roles:["TOP"], risk:2, why:"Il encaisse la lane et gagne tous les side lanes après." },
        { champ:"Vayne",    roles:["TOP","BOT"], risk:2, why:"Faible tôt, incontrable tard si la game dure." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "scaling-defavorable",
      title: "Ta comp est en retard sur le scaling : il faut du tempo",
      when: function (x) { return x.enemy.scaling[2] - x.ally.scaling[2] >= 2; },
      explain: function () { return "Ils gagnent le late : la game doit se décider tôt. Prends un champion qui crée de la pression et des kills avant la 20e minute."; },
      picks: [
        { champ:"Renekton", roles:["TOP"], risk:1, why:"Il domine la lane dès le niveau 3 et permet de snowball la map." },
        { champ:"Pantheon", roles:["TOP","MID","SUP"], risk:1, why:"Il tue en lane et son R crée des avantages ailleurs." },
        { champ:"Darius",   roles:["TOP"], risk:1, why:"La pression de lane la plus forte du rôle." },
        { champ:"Jayce",    roles:["TOP","MID"], risk:2, why:"Il rend la lane injouable et pousse l'avantage sur toute la map." },
        { champ:"Lee Sin",  roles:["JGL"], risk:1, why:"Pression sur toutes les lanes avant la 15e minute." }
      ] },

    /* ---------------------------------------------------------------- */
    { id: "cc-en-chaine",
      title: "Ils ont une chaîne de CC ininterrompue",
      when: function (x) { return x.enemy.hardCC >= 5; },
      explain: function (x) { return x.enemy.hardCC + " sources de CC dur : si tu es touché une fois, tu ne bouges plus jusqu'à ta mort. La tenacité ne suffit pas."; },
      picks: [
        { champ:"Olaf",  roles:["TOP","JGL"], risk:2, why:"Le R rend IMMUNISÉ aux CC : il traverse toute leur comp de contrôle et tue le carry." },
        { champ:"Milio", roles:["SUP"], risk:1, why:"Le R nettoie tous les CC de l'équipe d'un coup." },
        { champ:"Gangplank", roles:["TOP"], risk:2, why:"Le W nettoie n'importe quel CC sur lui-même, à la demande." },
        { champ:"Sivir", roles:["BOT"], risk:1, why:"Le E mange le sort d'ouverture." }
      ],
      items: ["Quicksilver Sash", "Mercurial Scimitar", "Mercury's Treads"] }
  ];

  /* ------------------------------------------------------------------ */
  /* PIÈGES : ce qu'il ne faut PAS prendre dans cette draft.             */
  /* Chaque piège renvoie un malus appliqué aux champions concernés.     */
  /* ------------------------------------------------------------------ */
  var TRAPS = [
    { id:"pv-vs-pourcentage",
      when: function (x) { return x.enemy.pctDamage >= 2; },
      hits: function (c) { return c.tk >= 3 && c.hp <= 1 && c.tb <= 1; },
      malus: 12,
      why: function (x) { return "Empiler des PV/résistances contre " + x.enemy.pctNames.join(", ") + " (dégâts %PV max) revient à leur offrir des dégâts gratuits."; } },

    { id:"cinquieme-ad",
      when: function (x) { return x.ally.adShare >= 75 && x.enemy.beefy >= 2; },
      hits: function (c) { return c.dmg[0] >= 80 && c.tb <= 1; },
      malus: 14,
      why: function () { return "Ton équipe est déjà full AD contre des empileurs d'armure : un 5e AD sans %pénétration ni dégâts bruts ne percera rien."; } },

    { id:"immobile-vs-dive",
      when: function (x) { return x.enemy.dashers >= 3 || x.enemy.assassins >= 2; },
      hits: function (c) { return c.mob <= 1 && c.dis <= 1 && c.tk <= 1; },
      malus: 10,
      why: function () { return "Immobile, sans outil de survie, face à une comp qui dive : tu meurs avant de jouer."; } },

    { id:"pas-de-waveclear-vs-poke",
      when: function (x) { return x.enemy.poke >= 3; },
      hits: function (c) { return c.wc <= 1 && c.sus <= 1; },
      malus: 8,
      why: function () { return "Sans waveclear ni sustain contre une comp de poke, tu perds la lane par usure sans jamais mourir d'un all-in."; } },

    { id:"melee-vs-ranged-poke",
      when: function (x) { return !!x.lane.enemyRanged; },
      hits: function (c) { return c.rng === 0 && c.mob <= 1 && c.sus <= 1; },
      malus: 9,
      why: function (x) { return "Melee immobile sans sustain contre " + x.lane.enemyName + " (ranged) : tu ne farmeras pas."; } },

    { id:"solo-carry-sans-frontline",
      when: function (x) { return x.ally.frontline === 0; },
      hits: function (c) { return c.tk <= 1 && c.peel <= 1 && c.eng <= 1; },
      malus: 9,
      why: function () { return "Personne ne peut encaisser un fight dans ton équipe : un 5e champion fragile condamne tous les fights groupés."; } },

    { id:"scaling-vs-early",
      when: function (x) { return x.enemy.scaling[0] - x.ally.scaling[0] >= 2 && x.ally.scaling[2] <= x.enemy.scaling[2]; },
      hits: function (c) { return c.sc[0] <= 1 && c.sc[2] <= 2; },
      malus: 8,
      why: function () { return "Ils dominent l'early et ne scalent pas moins bien que vous : un pick faible tôt sans récompense en late n'a aucun sens ici."; } }
  ];

  global.LP_COUNTERPICKS = RULES;
  global.LP_TRAPS = TRAPS;
})(typeof window !== "undefined" ? window : globalThis);

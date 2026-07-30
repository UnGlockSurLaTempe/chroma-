/* =============================================================================
 * LolPick — ITEMS, RÈGLES SITUATIONNELLES, BUILDS & RUNES
 * -----------------------------------------------------------------------------
 * Les noms d'objets sont en anglais (comme sur op.gg / u.gg / la plupart des
 * guides) : c'est plus simple à recouper que la traduction FR du client.
 *
 * 3 blocs :
 *   LP_ITEMS       — fiche d'objet + ce qu'il résout
 *   LP_SITUATIONAL — règles déclenchées par la draft adverse (le vrai calculateur d'items)
 *   LP_BUILDS      — build de base par champion + repli par classe
 *
 * ⚠ Les objets bougent à chaque gros patch : ce fichier est fait pour être
 *   corrigé à la main. Une ligne = un objet ou une règle.
 * ========================================================================== */
(function (global) {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* 1. ITEMS                                                            */
  /* ------------------------------------------------------------------ */
  var ITEMS = {
    "Lord Dominik's Regards":  { type:"AD", solves:"Perce l'armure empilée (%pénétration). Contre 2+ tanks, c'est non négociable si tu es AD crit." },
    "Serylda's Grudge":        { type:"AD", solves:"%pénétration d'armure pour les AD sans crit (bruiser/assassin) + ralentissement." },
    "Black Cleaver":           { type:"AD", solves:"Réduit l'armure de la cible pour TOUTE l'équipe. Le meilleur objet AD anti-tank d'équipe." },
    "Mortal Reminder":         { type:"AD", solves:"Pénétration d'armure + Blessures Graves : deux problèmes en un objet." },
    "Blade of the Ruined King": { type:"AD", solves:"Dégâts %PV max sur auto + vol de vie : le tueur de tanks des champions à auto-attaques." },
    "Kraken Slayer":           { type:"AD", solves:"Dégâts bruts périodiques sur auto : ignore les résistances." },
    "Terminus":                { type:"AD", solves:"Pénétration + résistances alternées sur les champions on-hit." },
    "Void Staff":              { type:"AP", solves:"%pénétration magique : obligatoire dès que l'adversaire achète de la MR ou empile des tanks." },
    "Liandry's Anguish":       { type:"AP", solves:"Dégâts %PV max continus : le tueur de tanks des mages." },
    "Demonic Embrace":         { type:"AP", solves:"Dégâts %PV max de zone pour les mages de combat." },
    "Nashor's Tooth":          { type:"AP", solves:"Vitesse d'attaque + dégâts magiques sur auto pour les AP à auto-attaques (Gwen, Kayle, Teemo)." },
    "Riftmaker":               { type:"AP", solves:"Dégâts bruts qui montent dans la durée du combat + survie." },
    "Morellonomicon":          { type:"AP", solves:"Blessures Graves AP." },
    "Executioner's Calling":   { type:"AD", solves:"Blessures Graves early, très bon marché : à acheter DÈS la lane contre un champion qui se soigne." },
    "Bramble Vest":            { type:"TANK", solves:"Armure + Blessures Graves au contact : composant anti-sustain pour les melees." },
    "Chempunk Chainsword":     { type:"AD", solves:"Blessures Graves + PV pour les bruisers." },
    "Oblivion Orb":            { type:"AP", solves:"Blessures Graves AP early." },
    "Thornmail":               { type:"TANK", solves:"Armure + renvoi + Blessures Graves : contre une comp AD à auto-attaques." },
    "Randuin's Omen":          { type:"TANK", solves:"Réduit les dégâts critiques : LE contre d'un ADC crit ou d'un Tryndamere/Yasuo." },
    "Frozen Heart":            { type:"TANK", solves:"Armure + réduction de vitesse d'attaque de zone : anti-DPS AD." },
    "Force of Nature":         { type:"TANK", solves:"MR + tenacité de mouvement : contre une comp AP avec beaucoup de ralentissements." },
    "Spirit Visage":           { type:"TANK", solves:"MR + amplification des soins : à prendre si tu te soignes toi-même." },
    "Kaenic Rookern":          { type:"TANK", solves:"Bouclier magique qui se régénère : contre le poke AP et le burst magique." },
    "Wit's End":               { type:"AD", solves:"MR + dégâts magiques sur auto : bruiser à auto-attaques contre une comp AP." },
    "Maw of Malmortius":       { type:"AD", solves:"MR + bouclier de sort qui sauve d'un burst AP (Morde R, Veigar R)." },
    "Banshee's Veil":          { type:"AP", solves:"Bloque le premier sort : annule un engage ciblé (Blitz Q, Morde R, Ashe R)." },
    "Zhonya's Hourglass":      { type:"AP", solves:"Stase : elle annule Zed R, Malphite R, Morde R et tout focus d'assassin." },
    "Guardian Angel":          { type:"AD", solves:"Résurrection : le carry survit à un premier focus." },
    "Quicksilver Sash":        { type:"ANY", solves:"Retire N'IMPORTE quel CC, y compris les suppressions (Malzahar R, Warwick R, Morde R)." },
    "Mercurial Scimitar":      { type:"AD", solves:"QSS complet : dégage le CC ET donne de la vitesse pour sortir du fight." },
    "Silvermere Dawn":         { type:"AD", solves:"Version bruiser du QSS." },
    "Mercury's Treads":        { type:"BOOTS", solves:"Tenacité : contre une comp à CC en chaîne." },
    "Plated Steelcaps":        { type:"BOOTS", solves:"Réduit les dégâts d'auto-attaque : contre un ADC ou un champion AD à auto-attaques." },
    "Serpent's Fang":          { type:"AD", solves:"Détruit et empêche les boucliers : contre Lulu, Karma, Janna, Seraphine, Riven." },
    "Serylda's + Ghostblade":  { type:"AD", solves:"Pack pénétration/mobilité pour les assassins AD." },
    "Anathema's Chains":       { type:"TANK", solves:"Réduit de 30% les dégâts d'UN adversaire choisi : le contre-pick objet d'un hypercarry adverse." },
    "Hexdrinker":              { type:"AD", solves:"Bouclier de sort early : à acheter en lane contre un AP qui te burst." },
    "Doran's Shield":          { type:"START", solves:"Contre le poke et les lanes ranged." },
    "Doran's Blade":           { type:"START", solves:"Contre un melee que tu veux battre en trade." },
    "Corrupting Potion":       { type:"START", solves:"Sustain longue durée contre le poke, ou lane de scaling." },
    "Tear of the Goddess":     { type:"START", solves:"Départ scaling pour les champions à mana." }
  };

  /* ------------------------------------------------------------------ */
  /* 2. RÈGLES SITUATIONNELLES                                           */
  /*    when(ctx, me) → true  ⇒ l'objet est proposé, trié par priorité   */
  /*    ctx expose la lecture de draft calculée par le moteur.           */
  /* ------------------------------------------------------------------ */
  var SITUATIONAL = [
    { item:"Lord Dominik's Regards", prio:9,
      when:function (x, me) { return me.dmgAD >= 60 && me.crit && x.enemy.beefy >= 2; },
      why:function (x) { return "Ils ont " + x.enemy.beefy + " empileurs de résistances/PV : sans %pénétration d'armure tu ne les tues pas."; } },

    { item:"Serylda's Grudge", prio:9,
      when:function (x, me) { return me.dmgAD >= 60 && !me.crit && x.enemy.beefy >= 2; },
      why:function () { return "AD sans crit contre de l'armure empilée : %pénétration obligatoire."; } },

    { item:"Black Cleaver", prio:8,
      when:function (x, me) { return me.dmgAD >= 60 && !me.crit && x.enemy.beefy >= 2 && x.ally.adShare >= 55; },
      why:function () { return "Ton équipe est majoritairement AD : la réduction d'armure profite à tout le monde."; } },

    { item:"Blade of the Ruined King", prio:9,
      when:function (x, me) { return me.onhit && x.enemy.beefy >= 2; },
      why:function () { return "Dégâts %PV max sur auto : c'est ce qui fait fondre les gros sacs de PV."; } },

    { item:"Void Staff", prio:9,
      when:function (x, me) { return me.dmgAP >= 55 && (x.enemy.beefy >= 2 || x.enemy.mrBuyers >= 2); },
      why:function () { return "Ils vont empiler de la MR ou ont déjà des PV/résistances : sans %pénétration magique tes dégâts s'écroulent."; } },

    { item:"Liandry's Anguish", prio:8,
      when:function (x, me) { return me.dmgAP >= 55 && x.enemy.hpStack >= 2; },
      why:function (x) { return "Dégâts %PV max continus contre " + x.enemy.hpStack + " empileurs de PV."; } },

    { item:"Mortal Reminder", prio:10,
      when:function (x, me) { return me.dmgAD >= 60 && x.enemy.healers >= 2; },
      why:function (x) { return "Blessures Graves : " + x.enemy.healerNames.join(", ") + " annulent tes dégâts sinon."; } },

    { item:"Morellonomicon", prio:10,
      when:function (x, me) { return me.dmgAP >= 55 && x.enemy.healers >= 2; },
      why:function (x) { return "Blessures Graves AP contre " + x.enemy.healerNames.join(", ") + "."; } },

    { item:"Executioner's Calling", prio:10,
      when:function (x, me) { return me.dmgAD >= 60 && x.enemy.laneHealer; },
      why:function (x) { return "À acheter DÈS la lane : " + x.enemy.laneHealer + " se soigne trop pour être tué sans anti-heal."; } },

    { item:"Oblivion Orb", prio:10,
      when:function (x, me) { return me.dmgAP >= 55 && x.enemy.laneHealer; },
      why:function (x) { return "Anti-heal early contre " + x.enemy.laneHealer + "."; } },

    { item:"Bramble Vest", prio:7,
      when:function (x, me) { return me.melee && x.enemy.laneHealer && me.tanky; },
      why:function () { return "Armure + Blessures Graves au contact, très rentable en lane."; } },

    { item:"Force of Nature", prio:8,
      when:function (x, me) { return me.tanky && x.enemy.apShare >= 60; },
      why:function (x) { return "La comp adverse est à " + x.enemy.apShare + "% de dégâts magiques : c'est de la MR qu'il te faut, pas de l'armure."; } },

    { item:"Kaenic Rookern", prio:7,
      when:function (x, me) { return me.tanky && x.enemy.apShare >= 60 && x.enemy.poke >= 2; },
      why:function () { return "Bouclier magique régénérant : il annule le poke AP entre les fights."; } },

    { item:"Wit's End", prio:7,
      when:function (x, me) { return me.onhit && x.enemy.apShare >= 55; },
      why:function () { return "MR + dégâts magiques sur auto : tu tanks leur AP tout en tapant plus fort."; } },

    { item:"Maw of Malmortius", prio:7,
      when:function (x, me) { return me.dmgAD >= 60 && !me.tanky && x.enemy.apBurst >= 1; },
      why:function (x) { return "Bouclier de sort contre le burst AP (" + x.enemy.apBurstNames.join(", ") + ")."; } },

    { item:"Hexdrinker", prio:8,
      when:function (x, me) { return me.dmgAD >= 60 && x.enemy.laneAP; },
      why:function (x) { return "Composant à acheter en lane : " + x.enemy.laneAP + " te burst sinon."; } },

    { item:"Thornmail", prio:7,
      when:function (x, me) { return me.tanky && x.enemy.adShare >= 60 && x.enemy.aaCarries >= 1; },
      why:function () { return "Comp AD à auto-attaques en face : armure + renvoi + anti-heal."; } },

    { item:"Randuin's Omen", prio:8,
      when:function (x, me) { return me.tanky && x.enemy.critCarries >= 1; },
      why:function (x) { return "Réduction des dégâts critiques contre " + x.enemy.critNames.join(", ") + "."; } },

    { item:"Plated Steelcaps", prio:6,
      when:function (x) { return x.enemy.adShare >= 60 && x.enemy.aaCarries >= 1; },
      why:function () { return "Leurs dégâts passent par les auto-attaques : les bottes d'armure sont le meilleur rapport or/valeur."; } },

    { item:"Mercury's Treads", prio:6,
      when:function (x) { return x.enemy.hardCC >= 4 || x.enemy.apShare >= 60; },
      why:function (x) { return "Beaucoup de CC dur en face (" + x.enemy.hardCC + " sources) : la tenacité vaut plus que l'armure."; } },

    { item:"Quicksilver Sash", prio:9,
      when:function (x, me) { return x.enemy.suppressors.length > 0 && !me.tanky; },
      why:function (x) { return "Ils ont " + x.enemy.suppressors.join(", ") + " : seul un QSS te sort de ça (ni tenacité ni cleanse ne marchent)."; } },

    { item:"Zhonya's Hourglass", prio:8,
      when:function (x, me) { return me.dmgAP >= 55 && (x.enemy.assassins >= 1 || x.enemy.diveThreat >= 2); },
      why:function () { return "La stase annule le focus : c'est le bouton qui te fait survivre au premier engage."; } },

    { item:"Guardian Angel", prio:6,
      when:function (x, me) { return me.carry && x.enemy.assassins >= 2; },
      why:function () { return "Deux assassins te ciblent : la résurrection leur coûte tout leur cooldown."; } },

    { item:"Serpent's Fang", prio:6,
      when:function (x, me) { return me.dmgAD >= 60 && x.enemy.shielders >= 2; },
      why:function (x) { return "Beaucoup de boucliers en face (" + x.enemy.shielderNames.join(", ") + ") : Serpent's Fang les supprime."; } },

    { item:"Anathema's Chains", prio:5,
      when:function (x, me) { return me.tanky && x.enemy.hypercarry; },
      why:function (x) { return "-30% de dégâts subis de la part de " + x.enemy.hypercarry + ", leur seule vraie source de dégâts."; } },

    { item:"Doran's Shield", prio:4,
      when:function (x, me) { return me.melee && x.lane.enemyRanged; },
      why:function () { return "Lane ranged en face : Doran's Shield + Seconde Souffle pour ne pas perdre la wave."; } }
  ];

  /* ------------------------------------------------------------------ */
  /* 3. BUILDS PAR CHAMPION                                              */
  /*    core = ce que tu montes quoi qu'il arrive ; le moteur y ajoute   */
  /*    les objets situationnels calculés depuis la draft adverse.       */
  /* ------------------------------------------------------------------ */
  var B = {};
  function BUILD(name, o) { B[global.LP_NORM(name)] = o; }

  /* --- TOP --------------------------------------------------------- */
  BUILD("Vayne", { start:"Doran's Blade", boots:"Berserker's Greaves",
    core:["Blade of the Ruined King", "Kraken Slayer", "Guinsoo's Rageblade (si on-hit) ou Phantom Dancer"],
    runes:"Précision : Coup de grâce / Triomphe / Légende: Célérité / Coup de grâce — Secondaire Sorcellerie : Auréole d'eau vive + Marche sur l'eau (ou Domination : Goût du sang + Chasseur vorace)",
    plan:"Lane : tu survis, tu ne trades que quand le E est disponible (E contre un mur = stun). Fight : tu ne rentres JAMAIS en premier, tu tapes le frontline pendant que ton équipe peel. Ta win condition, c'est que la game dure et qu'ils aient empilé des PV." });
  BUILD("Gwen", { start:"Doran's Ring", boots:"Sorcerer's Shoes",
    core:["Nashor's Tooth", "Riftmaker", "Zhonya's Hourglass"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Sorcellerie : Auréole d'eau vive + Ultime traqueur",
    plan:"Lane : tu farm sous tourelle jusqu'au premier item, le W te protège des ganks. Fight : tu entres APRÈS l'engage, tu poses le W sur le frontline adverse et tu fonds tout ce qui a des PV. Le W bloque tout ce qui vient de l'extérieur de la zone." });
  BUILD("Fiora", { start:"Doran's Blade", boots:"Plated Steelcaps",
    core:["Blade of the Ruined King", "Hullbreaker ou Sundered Sky", "Death's Dance"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Trituration + Révélation d'un colosse",
    plan:"Lane : tu gardes le W pour son sort clé (le stun, le dash, l'ult). Fight : tu ne fight pas groupé, tu prends le side opposé et tu forces un 1v1 ou un 1v2. Ton R sur le tank adverse le dissout." });
  BUILD("Poppy", { start:"Doran's Shield", boots:"Plated Steelcaps",
    core:["Iceborn Gauntlet ou Sunfire Aegis", "Jak'Sho, The Protean", "Thornmail / Force of Nature selon leurs dégâts"],
    runes:"Résolution : Poigne de l'immortel / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Précision : Triomphe + Légende: Ténacité",
    plan:"Lane : Poigne + Q pour trade, tu gardes le W pour son dash. Fight : tu poses le W SUR ton carry au moment de l'engage adverse — tout dash/saut qui entre dedans est annulé. Le R sépare leur frontline de leur backline." });
  BUILD("Kayle", { start:"Doran's Shield", boots:"Berserker's Greaves",
    core:["Nashor's Tooth", "Rabadon's Deathcap ou Guinsoo's Rageblade", "Lich Bane"],
    runes:"Précision : Vitesse létale / Triomphe / Légende: Aptitude / Coup de grâce — Secondaire Sorcellerie : Auréole d'eau vive + Ultime traqueur",
    plan:"Lane : survie pure, tu farm et tu perds la lane sans mourir. Les paliers 6/11/16 sont tes vrais niveaux. Fight : tu restes derrière et tu utilises le R sur celui qui se fait focus — c'est souvent ce bouton qui gagne le fight, pas tes dégâts." });
  BUILD("Trundle", { start:"Doran's Shield", boots:"Plated Steelcaps",
    core:["Sundered Sky ou Trinity Force", "Sterak's Gage", "Spirit Visage"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tu gagnes tous les trades longs grâce au Q et à ton passif. Fight : tu gardes le R pour le tank adverse au moment où il engage — il perd ses résistances, ton équipe le tue en 2s. Le pilier bloque leur retraite." });
  BUILD("Ornn", { start:"Doran's Shield", boots:"Plated Steelcaps ou Mercury's Treads",
    core:["Sunfire Aegis", "Jak'Sho, The Protean", "Thornmail / Force of Nature selon leurs dégâts"],
    runes:"Résolution : Poigne de l'immortel / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Inspiration : Bottes magiques + Approche ferrée",
    plan:"Lane : Poigne + Q, tu joues la sécurité et tu améliores les objets de l'équipe. Fight : le passif Fragile fait mal à tous les tanks adverses. Le double R est un engage à portée map — c'est ta contribution principale, pas tes dégâts." });
  BUILD("Sion", { start:"Doran's Shield", boots:"Plated Steelcaps ou Mercury's Treads",
    core:["Heartsteel", "Unending Despair", "Warmog's Armor"],
    runes:"Résolution : Poigne de l'immortel / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Inspiration : Bottes magiques + Approche ferrée",
    plan:"Lane : tu pousses, tu prends la tourelle, tu meurs en zonant avec ton passif. Fight : le R engage depuis l'autre bout de la map ou coupe leur retraite. Tu es le mur devant tes carries." });
  BUILD("Camille", { start:"Doran's Blade", boots:"Ionian Boots of Lucidity",
    core:["Trinity Force", "Sundered Sky ou Death's Dance", "Spear of Shojin"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Domination : Goût du sang + Chasseur vorace",
    plan:"Lane : tu joues le E pour esquiver et engage, le W soigne sur les trades longs. Fight : tu ne cherches pas le frontline, tu R le carry adverse et tu le supprimes pendant que ton équipe s'occupe du reste." });
  BUILD("Malphite", { start:"Doran's Shield", boots:"Plated Steelcaps ou Mercury's Treads",
    core:["Sunfire Aegis ou Iceborn Gauntlet", "Jak'Sho, The Protean", "Thornmail / Force of Nature"],
    alt:["Version AP : Nashor's Tooth n'est pas correct — préfère Riftmaker/Rabadon's après un premier objet de résistance si tu joues Malphite AP"],
    runes:"Résolution : Poigne de l'immortel / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Inspiration : Bottes magiques + Approche ferrée",
    plan:"Lane : ton armure early annule les AD. Fight : tu gardes le R pour toucher 2 cibles minimum, idéalement leur carry. Attention : Poppy W, Sivir E, Morgana E, Nocturne W et un QSS l'annulent." });
  BUILD("Mordekaiser", { start:"Doran's Shield", boots:"Sorcerer's Shoes",
    core:["Riftmaker", "Rylai's Crystal Scepter", "Spirit Visage"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tu joues le passif, tu ne rates pas ton E. Fight : le R extrait leur carry du fight — c'est un 5v4 pour ton équipe pendant 7s. Ne l'utilise pas sur le tank." });
  BUILD("Yone", { start:"Doran's Blade", boots:"Berserker's Greaves",
    core:["Immortal Shieldbow ou Bloodthirster", "Infinity Edge", "Death's Dance"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tu joues autour du E (tu peux annuler ta prise de risque en revenant). Fight : la moitié de tes dégâts est magique, tu peux donc taper le frontline. Le R traverse leur ligne pour atteindre le carry." });
  BUILD("Jax", { start:"Doran's Blade", boots:"Plated Steelcaps",
    core:["Trinity Force", "Sterak's Gage", "Jak'Sho, The Protean"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tu ne fight pas avant le niveau 6 contre un bruiser. Fight : le E annule tout le DPS des auto-attaques adverses — tu rentres sur leur ADC pendant qu'il est actif." });
  BUILD("Darius", { start:"Doran's Blade", boots:"Mercury's Treads",
    core:["Stridebreaker ou Trinity Force", "Sterak's Gage", "Dead Man's Plate"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tu joues pour le stack de saignement, chaque trade doit finir sur 5 stacks. Fight : tu ne peux pas atteindre le backline, ton rôle est de tuer ce qui est devant et de reset avec le R." });
  BUILD("Garen", { start:"Doran's Blade", boots:"Plated Steelcaps",
    core:["Stridebreaker", "Dead Man's Plate", "Sterak's Gage"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : Q pour le silence sur les combos adverses. Fight : tu cherches la cible la plus faible en PV pour le R (dégâts bruts). Tu es kité par tout ce qui est ranged." });
  BUILD("Sett", { start:"Doran's Blade", boots:"Plated Steelcaps",
    core:["Sundered Sky ou Trinity Force", "Sterak's Gage", "Death's Dance"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : le W punit tout trade long. Fight : le R sert à extraire un carry ou à repositionner leur tank hors du fight." });
  BUILD("Renekton", { start:"Doran's Blade", boots:"Plated Steelcaps",
    core:["Trinity Force ou Hexdrinker→Maw", "Sterak's Gage", "Death's Dance"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Domination : Goût du sang + Chasseur vorace",
    plan:"Lane : tu dois convertir entre le niveau 3 et 15, sinon tu ne sers plus à rien. Fight : tu joues comme un tank avec un stun, pas comme un carry." });
  BUILD("Aatrox", { start:"Doran's Blade", boots:"Plated Steelcaps ou Mercury's Treads",
    core:["Eclipse ou Sundered Sky", "Sterak's Gage", "Death's Dance"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tes trades passent par le 3e Q. Fight : le R te rend increvable si tu touches quelqu'un — engage sur le groupe, pas en 1v1 contre un tank." });
  BUILD("Teemo", { start:"Doran's Shield", boots:"Sorcerer's Shoes ou Ionian Boots",
    core:["Nashor's Tooth", "Liandry's Anguish", "Rabadon's Deathcap"],
    runes:"Sorcellerie : Comète arcanique / Manaflow / Célérité / Salve de foudre — Secondaire Inspiration : Approche ferrée + Bottes magiques",
    plan:"Lane : tu Q à chaque fois qu'il veut trade — aveuglé, il ne fait plus rien. Fight : tu ne fight pas groupé, tu poses des champignons sur tous les chemins et tu prends le side." });
  BUILD("Quinn", { start:"Doran's Blade", boots:"Berserker's Greaves",
    core:["Kraken Slayer ou Eclipse", "Infinity Edge", "Lord Dominik's Regards"],
    runes:"Précision : Presse l'attaque / Triomphe / Légende: Aptitude / Coup de grâce — Secondaire Domination : Goût du sang + Chasseur vorace",
    plan:"Lane : tu poke avec le passif et l'auto, tu ne le laisses jamais farm. Fight : tu es inutile en 5v5 groupé — utilise le R pour split et prendre des tourelles pendant qu'ils se groupent." });
  BUILD("Gnar", { start:"Doran's Shield", boots:"Plated Steelcaps",
    core:["Iceborn Gauntlet ou Trinity Force", "Sterak's Gage", "Jak'Sho, The Protean"],
    runes:"Précision : Vitesse létale / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tu poke en mini et tu ne rentres qu'en méga. Fight : tout le fight se joue sur ton R — tu attends qu'ils soient groupés contre un mur." });
  BUILD("K'Sante", { start:"Doran's Shield", boots:"Plated Steelcaps ou Mercury's Treads",
    core:["Sunfire Aegis ou Hollow Radiance", "Jak'Sho, The Protean", "Force of Nature / Thornmail"],
    runes:"Résolution : Poigne de l'immortel / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Précision : Triomphe + Légende: Ténacité",
    plan:"Lane : tu joues safe, tu es fort en 2v2 avec ton jungler. Fight : le R extrait un carry du fight — tu deviens fragile pendant, donc uniquement quand ton équipe suit." });
  BUILD("Illaoi", { start:"Doran's Blade", boots:"Plated Steelcaps",
    core:["Sundered Sky", "Sterak's Gage", "Death's Dance"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tout passe par le E. Fight : tu R dans le groupe, jamais en 1v1 contre un champion mobile." });
  BUILD("Urgot", { start:"Doran's Blade", boots:"Plated Steelcaps",
    core:["Black Cleaver", "Sterak's Gage", "Death's Dance"],
    runes:"Précision : Presse l'attaque / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : le W en continu bat n'importe quel melee en trade long. Fight : le R exécute — vise celui qui est déjà entamé, il attire ses alliés." });
  BUILD("Kennen", { start:"Doran's Shield", boots:"Sorcerer's Shoes",
    core:["Liandry's Anguish ou Luden's Companion", "Zhonya's Hourglass", "Rabadon's Deathcap"],
    runes:"Domination : Électrocution / Vision d'ombre / Globes oculaires / Chasseur ultime — Secondaire Sorcellerie : Manaflow + Ultime traqueur",
    plan:"Lane : tu poke à distance, tu ne montes jamais au corps à corps sans le stun prêt. Fight : Zhonya + R au milieu du groupe adverse = tout le monde est stun." });
  BUILD("Shen", { start:"Doran's Shield", boots:"Plated Steelcaps ou Mercury's Treads",
    core:["Sunfire Aegis ou Iceborn Gauntlet", "Jak'Sho, The Protean", "Force of Nature / Thornmail"],
    runes:"Résolution : Poigne de l'immortel / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Inspiration : Bottes magiques + Approche ferrée",
    plan:"Lane : tu farm et tu regardes la map — chaque R est une kill ailleurs. Fight : le W au sol annule tout le DPS des auto-attaques adverses pendant 4s." });
  BUILD("Cho'Gath", { start:"Doran's Shield", boots:"Plated Steelcaps ou Mercury's Treads",
    core:["Riftmaker ou Sunfire Aegis", "Jak'Sho, The Protean", "Force of Nature / Thornmail"],
    runes:"Résolution : Poigne de l'immortel / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Sorcellerie : Manaflow + Transcendance",
    plan:"Lane : tu farm safe, chaque stack de R est un PV permanent. Fight : tu es le mur, et ton R sur un carry entamé est un kill garanti (dégâts bruts)." });
  BUILD("Olaf", { start:"Doran's Blade", boots:"Berserker's Greaves",
    core:["Trinity Force ou Sundered Sky", "Sterak's Gage", "Death's Dance"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tu ramasses tes haches pour reset le cooldown. Fight : tu actives le R et tu marches sur leur carry — aucun CC ne peut t'arrêter, c'est toute ta valeur contre une comp de contrôle." });
  BUILD("Yorick", { start:"Doran's Shield", boots:"Plated Steelcaps",
    core:["Sundered Sky ou Trinity Force", "Sterak's Gage", "Dead Man's Plate"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tu pousses en permanence. Fight : tu ne fight pas, tu prends des tourelles sur le side pendant qu'ils se groupent. Ta Damoiselle fait le travail." });
  BUILD("Nasus", { start:"Doran's Shield", boots:"Mercury's Treads",
    core:["Iceborn Gauntlet ou Trinity Force", "Spirit Visage", "Sterak's Gage"],
    runes:"Résolution : Poigne de l'immortel / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Précision : Triomphe + Légende: Ténacité",
    plan:"Lane : tu stackes sous tourelle, tu ne trades pas avant le 6. Fight : le E réduit l'armure de zone — pose-le sur le groupe avant que ton équipe rentre." });
  BUILD("Jayce", { start:"Doran's Blade", boots:"Ionian Boots of Lucidity",
    core:["Eclipse ou Manamune", "Serylda's Grudge", "Black Cleaver"],
    runes:"Précision : Presse l'attaque / Triomphe / Légende: Aptitude / Coup de grâce — Secondaire Domination : Vision d'ombre + Goût du sang",
    plan:"Lane : tu poke en canon sans jamais laisser l'adversaire s'approcher. Fight : tu restes au fond et tu poke, ton E-Q passe par-dessus le frontline." });
  BUILD("Riven", { start:"Doran's Blade", boots:"Ionian Boots of Lucidity",
    core:["Eclipse ou Profane Hydra", "Black Cleaver", "Death's Dance"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Domination : Goût du sang + Chasseur vorace",
    plan:"Lane : tu joues les fenêtres de cooldown. Fight : tu entres sur le carry, jamais sur le tank." });
  BUILD("Irelia", { start:"Doran's Blade", boots:"Berserker's Greaves",
    core:["Trinity Force", "Sterak's Gage", "Death's Dance"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tu joues autour des marques du Q pour reset. Fight : le R désarme leur ADC — pose-le entre leur backline et toi." });
  BUILD("Volibear", { start:"Doran's Blade", boots:"Plated Steelcaps",
    core:["Sundered Sky ou Trinity Force", "Sterak's Gage", "Spirit Visage"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : le Q est un stun ciblé après le dash. Fight : le R désactive leur tourelle et te rend increvable — c'est un outil de prise d'objectif autant qu'un outil de fight." });
  BUILD("Warwick", { start:"Doran's Shield", boots:"Plated Steelcaps ou Mercury's Treads",
    core:["Sundered Sky ou Blade of the Ruined King", "Sterak's Gage", "Spirit Visage"],
    runes:"Précision : Presse l'attaque / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : le Q en %PV max te soigne — plus il est gros, plus tu gagnes le trade. Fight : le R sur leur carry, c'est une suppression que rien n'annule à part un QSS." });
  BUILD("Tryndamere", { start:"Doran's Blade", boots:"Berserker's Greaves",
    core:["Kraken Slayer ou Immortal Shieldbow", "Infinity Edge", "Lord Dominik's Regards"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Domination : Goût du sang + Chasseur vorace",
    plan:"Lane : tu farm ta fureur et tu punis toute erreur. Fight : tu ne fight pas groupé, tu split et tu forces le 1v1. Le R te fait survivre à n'importe quelle tentative de kill." });
  BUILD("Singed", { start:"Doran's Shield ou Corrupting Potion", boots:"Ionian Boots of Lucidity",
    core:["Riftmaker ou Rylai's Crystal Scepter", "Liandry's Anguish", "Force of Nature / Thornmail"],
    runes:"Résolution : Poigne de l'immortel / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Sorcellerie : Manaflow + Transcendance",
    plan:"Lane : tu joues le proxy, tu ne joues pas la lane. Fight : tu ne fight pas, tu crées de la pression ailleurs et tu fling les gens dans ton équipe quand tu es là." });
  BUILD("Ambessa", { start:"Doran's Blade", boots:"Ionian Boots of Lucidity",
    core:["Eclipse ou Profane Hydra", "Black Cleaver", "Death's Dance"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Domination : Goût du sang + Chasseur vorace",
    plan:"Lane : tu enchaînes tes dashs pour trade et sortir. Fight : tu vises le carry, tu es fragile si tu restes dans la mêlée." });
  BUILD("Dr. Mundo", { start:"Doran's Shield", boots:"Plated Steelcaps ou Mercury's Treads",
    core:["Heartsteel", "Warmog's Armor", "Spirit Visage"],
    runes:"Résolution : Poigne de l'immortel / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Précision : Triomphe + Légende: Ténacité",
    plan:"Lane : tu farm, tu es increvable après 2 objets. Fight : tu absorbes le fight en avant. ⚠ Contre du %PV max (Vayne, Gwen, Fiora), empiler des PV te dessert." });
  BUILD("Rumble", { start:"Doran's Ring", boots:"Sorcerer's Shoes",
    core:["Liandry's Anguish", "Rylai's Crystal Scepter", "Rabadon's Deathcap"],
    runes:"Sorcellerie : Comète arcanique / Manaflow / Transcendance / Salve de foudre — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tu gères ta barre de chaleur pour le trade au bon moment. Fight : le R coupe leur comp en deux — c'est le bouton qui gagne les fights d'objectif." });
  BUILD("Kled", { start:"Doran's Blade", boots:"Plated Steelcaps",
    core:["Trinity Force ou Eclipse", "Black Cleaver", "Sterak's Gage"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Lane : tu peux all-in très tôt grâce à ta double barre de vie. Fight : le R est un engage d'équipe à longue distance." });
  BUILD("Gangplank", { start:"Doran's Blade", boots:"Ionian Boots of Lucidity",
    core:["Essence Reaver ou Trinity Force", "Infinity Edge", "Lord Dominik's Regards"],
    runes:"Précision : Vitesse létale / Triomphe / Légende: Aptitude / Coup de grâce — Secondaire Domination : Goût du sang + Chasseur vorace",
    plan:"Lane : le W nettoie les CC, tu joues les barils pour farmer et poke. Fight : tu R sur le fight même si tu es à l'autre bout de la map, puis tu enchaînes les chaînes de barils." });

  /* --- MID / JGL / BOT / SUP (les plus joués) ------------------------ */
  BUILD("Galio", { start:"Doran's Ring", boots:"Mercury's Treads",
    core:["Rylai's Crystal Scepter ou Riftmaker", "Zhonya's Hourglass", "Abyssal Mask"],
    runes:"Résolution : Aftershock / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Sorcellerie : Manaflow + Transcendance",
    plan:"Lane : ton passif et ton W annulent les mages. Fight : le R est un engage à portée map sur ton jungler ou ton top." });
  BUILD("Zed", { start:"Doran's Blade", boots:"Ionian Boots of Lucidity",
    core:["Youmuu's Ghostblade ou Profane Hydra", "Serylda's Grudge", "Edge of Night"],
    runes:"Domination : Électrocution / Impact soudain / Globes oculaires / Chasseur ultime — Secondaire Précision : Triomphe + Coup de grâce",
    plan:"Lane : tu pushes et tu roam. Fight : tu attends que leur carry ait utilisé son bouton de survie, puis tu R." });
  BUILD("Vex", { start:"Doran's Ring", boots:"Sorcerer's Shoes",
    core:["Luden's Companion ou Malignance", "Rabadon's Deathcap", "Shadowflame"],
    runes:"Domination : Électrocution / Vision d'ombre / Globes oculaires / Chasseur ultime — Secondaire Sorcellerie : Manaflow + Transcendance",
    plan:"Lane : ton passif punit chaque dash adverse. Fight : tu gardes le passif pour l'assassin/le diver qui rentre sur ton backline." });
  BUILD("Malzahar", { start:"Doran's Ring", boots:"Sorcerer's Shoes",
    core:["Liandry's Anguish ou Malignance", "Rylai's Crystal Scepter", "Rabadon's Deathcap"],
    runes:"Sorcellerie : Comète arcanique / Manaflow / Transcendance / Salve de foudre — Secondaire Inspiration : Bottes magiques + Biscuits",
    plan:"Lane : tu pushes en continu, ton bouclier de passif te protège des ganks. Fight : le R sur leur carry principal, personne ne peut le sauver sans QSS." });
  BUILD("Lissandra", { start:"Doran's Ring", boots:"Sorcerer's Shoes",
    core:["Luden's Companion ou Malignance", "Zhonya's Hourglass", "Rabadon's Deathcap"],
    runes:"Sorcellerie : Comète arcanique / Manaflow / Transcendance / Salve de foudre — Secondaire Domination : Vision d'ombre + Globes oculaires",
    plan:"Lane : tu es safe grâce au E. Fight : tu R leur carry en rentrant, ou tu R sur toi pour survivre à leur engage." });
  BUILD("Orianna", { start:"Doran's Ring", boots:"Sorcerer's Shoes",
    core:["Luden's Companion", "Rabadon's Deathcap", "Zhonya's Hourglass"],
    runes:"Sorcellerie : Comète arcanique / Manaflow / Transcendance / Salve de foudre — Secondaire Inspiration : Bottes magiques + Biscuits",
    plan:"Lane : tu contrôles la wave à distance. Fight : la balle sur ton frontline, le R quand ils sont groupés — ou en peel sur ton carry." });
  BUILD("Naafiri", { start:"Doran's Blade", boots:"Ionian Boots of Lucidity",
    core:["Profane Hydra ou Youmuu's Ghostblade", "Serylda's Grudge", "Edge of Night"],
    runes:"Domination : Électrocution / Impact soudain / Globes oculaires / Chasseur ultime — Secondaire Précision : Triomphe + Coup de grâce",
    plan:"Lane : tes chiens te donnent le contrôle de la wave. Fight : tu attends l'engage et tu sautes sur la cible isolée." });
  BUILD("Lee Sin", { start:"Objet de jungle", boots:"Plated Steelcaps ou Mercury's Treads",
    core:["Eclipse ou Trinity Force", "Black Cleaver", "Death's Dance"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Domination : Goût du sang + Chasseur vorace",
    plan:"Tu dois créer un avantage avant la 15e minute. Fight : le R sert à isoler ou à repositionner, pas à faire des dégâts." });
  BUILD("Vi", { start:"Objet de jungle", boots:"Plated Steelcaps ou Mercury's Treads",
    core:["Eclipse ou Sundered Sky", "Black Cleaver", "Sterak's Gage"],
    runes:"Précision : Conquérant / Triomphe / Légende: Aptitude / Dernier souffle — Secondaire Résolution : Deuxième souffle + Révélation d'un colosse",
    plan:"Fight : le R est un CC imparable sur leur carry — c'est ton unique job, pas de faire des dégâts au tank." });
  BUILD("Zeri", { start:"Doran's Blade", boots:"Berserker's Greaves",
    core:["Statikk Shiv ou Blade of the Ruined King", "Rapid Firecannon", "Infinity Edge"],
    runes:"Précision : Vitesse létale / Triomphe / Légende: Aptitude / Coup de grâce — Secondaire Sorcellerie : Auréole d'eau vive + Marche sur l'eau",
    plan:"Lane : tu survis, tu ne tues rien avant 2 objets. Fight : tu restes en mouvement, tu tapes le frontline avec le Q chargé et tu utilises le R pour le boost de vitesse." });
  BUILD("Kog'Maw", { start:"Doran's Blade", boots:"Berserker's Greaves",
    core:["Guinsoo's Rageblade", "Blade of the Ruined King ou Nashor's Tooth", "Runaan's Hurricane"],
    runes:"Précision : Vitesse létale / Triomphe / Légende: Aptitude / Coup de grâce — Secondaire Sorcellerie : Auréole d'eau vive + Marche sur l'eau",
    plan:"Tu ne bouges pas, tu tapes. Sans deux peelers dans ton équipe, ce pick n'existe pas." });
  BUILD("Janna", { start:"Objet de support", boots:"Ionian Boots of Lucidity",
    core:["Moonstone Renewer ou Helia", "Ardent Censer", "Mikael's Blessing"],
    runes:"Sorcellerie : Réserve d'aéry / Manaflow / Transcendance / Salve de foudre — Secondaire Résolution : Bouclier d'os + Révélation d'un colosse",
    plan:"Lane : tu poke au Q et tu protèges. Fight : tu gardes le R pour l'engage adverse, pas pour le heal." });
  BUILD("Milio", { start:"Objet de support", boots:"Ionian Boots of Lucidity",
    core:["Moonstone Renewer ou Helia", "Ardent Censer", "Mikael's Blessing"],
    runes:"Sorcellerie : Réserve d'aéry / Manaflow / Transcendance / Salve de foudre — Secondaire Inspiration : Bottes magiques + Approche ferrée",
    plan:"Fight : garde le R pour le moment où leur comp de CC engage — il nettoie tout d'un coup." });
  BUILD("Braum", { start:"Objet de support", boots:"Mercury's Treads",
    core:["Locket of the Iron Solari", "Knight's Vow", "Force of Nature / Thornmail"],
    runes:"Résolution : Aftershock / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Inspiration : Bottes magiques + Approche ferrée",
    plan:"Fight : place-toi ENTRE leur source de projectiles et ton carry, et lève le E au bon moment." });
  BUILD("Thresh", { start:"Objet de support", boots:"Mercury's Treads",
    core:["Locket of the Iron Solari", "Knight's Vow", "Zeke's Convergence"],
    runes:"Résolution : Aftershock / Démolition / Deuxième souffle / Révélation d'un colosse — Secondaire Inspiration : Bottes magiques + Approche ferrée",
    plan:"Fight : la lanterne sauve ton carry après l'engage adverse — c'est souvent plus fort que ton hook." });

  /* --- Replis par classe (utilisés si le champion n'a pas de fiche) --- */
  var CLASS_BUILD = {
    juggernaut:  { start:"Doran's Blade / Doran's Shield", boots:"Plated Steelcaps ou Mercury's Treads", core:["Objet mythique bruiser (Trinity/Eclipse/Sundered Sky)", "Sterak's Gage", "Death's Dance ou Spirit Visage"], runes:"Précision : Conquérant + Triomphe + Légende: Aptitude + Dernier souffle" },
    diver:       { start:"Doran's Blade", boots:"Plated Steelcaps ou Mercury's Treads", core:["Eclipse ou Trinity Force", "Black Cleaver", "Sterak's Gage"], runes:"Précision : Conquérant + Triomphe + Légende: Aptitude + Dernier souffle" },
    skirmisher:  { start:"Doran's Blade", boots:"Berserker's Greaves", core:["Objet de duel (Trinity/BorK/Shieldbow)", "Sterak's Gage", "Death's Dance"], runes:"Précision : Conquérant + Triomphe + Légende: Aptitude + Dernier souffle" },
    assassin:    { start:"Doran's Blade", boots:"Ionian Boots of Lucidity", core:["Youmuu's Ghostblade ou Profane Hydra", "Serylda's Grudge", "Edge of Night"], runes:"Domination : Électrocution + Impact soudain + Globes oculaires + Chasseur ultime" },
    vanguard:    { start:"Doran's Shield", boots:"Plated Steelcaps ou Mercury's Treads", core:["Sunfire Aegis ou Iceborn Gauntlet", "Jak'Sho, The Protean", "Résistance adaptée à leurs dégâts"], runes:"Résolution : Aftershock + Démolition + Deuxième souffle + Révélation d'un colosse" },
    warden:      { start:"Doran's Shield", boots:"Plated Steelcaps ou Mercury's Treads", core:["Locket of the Iron Solari ou Iceborn Gauntlet", "Jak'Sho, The Protean", "Résistance adaptée"], runes:"Résolution : Aftershock + Démolition + Deuxième souffle + Révélation d'un colosse" },
    marksman:    { start:"Doran's Blade", boots:"Berserker's Greaves", core:["Objet de départ ADC (Kraken/Statikk/BorK)", "Infinity Edge", "Lord Dominik's Regards"], runes:"Précision : Presse l'attaque ou Vitesse létale + Triomphe + Légende: Aptitude + Coup de grâce" },
    mageBurst:   { start:"Doran's Ring", boots:"Sorcerer's Shoes", core:["Luden's Companion ou Malignance", "Rabadon's Deathcap", "Zhonya's Hourglass"], runes:"Domination : Électrocution ou Sorcellerie : Comète arcanique" },
    mageControl: { start:"Doran's Ring", boots:"Sorcerer's Shoes", core:["Luden's Companion ou Liandry's Anguish", "Rabadon's Deathcap", "Zhonya's Hourglass"], runes:"Sorcellerie : Comète arcanique + Manaflow + Transcendance + Salve de foudre" },
    mageBattle:  { start:"Doran's Ring", boots:"Sorcerer's Shoes", core:["Riftmaker ou Liandry's Anguish", "Rylai's Crystal Scepter", "Rabadon's Deathcap"], runes:"Sorcellerie : Comète arcanique + Manaflow + Transcendance + Salve de foudre" },
    enchanter:   { start:"Objet de support", boots:"Ionian Boots of Lucidity", core:["Moonstone Renewer ou Helia", "Ardent Censer", "Mikael's Blessing"], runes:"Sorcellerie : Réserve d'aéry + Manaflow + Transcendance + Salve de foudre" },
    catcher:     { start:"Objet de support", boots:"Mercury's Treads", core:["Locket of the Iron Solari", "Zeke's Convergence", "Knight's Vow"], runes:"Résolution : Aftershock ou Domination : Électrocution" }
  };

  global.LP_ITEMS = ITEMS;
  global.LP_SITUATIONAL = SITUATIONAL;
  global.LP_BUILDS = B;
  global.LP_CLASS_BUILD = CLASS_BUILD;
})(typeof window !== "undefined" ? window : globalThis);

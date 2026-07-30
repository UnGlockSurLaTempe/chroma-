/* =============================================================================
 * LolPick — Base de connaissance CHAMPIONS
 * -----------------------------------------------------------------------------
 * Chaque champion est décrit par un vecteur d'attributs que le moteur exploite.
 * Les valeurs par défaut viennent de la CLASSE, on ne surcharge que ce qui
 * diffère. Édite librement : une ligne = un champion.
 *
 * Échelle générale : 0 = absent, 1 = faible, 2 = bon, 3 = référence.
 *
 *  roles : ordre de probabilité (TOP JGL MID BOT SUP)
 *  dmg   : [AD, AP, TRUE] en % (somme ~100)
 *  rng   : 1 = ranged, 0 = melee
 *  sc    : courbe de puissance [early, mid, late]
 *  eng   : engage / initiation
 *  dis   : désengage, anti-engage, annulation (windwall, spellshield, stasis…)
 *  peel  : protection d'un carry allié
 *  cc    : CC dur (stun/root/knockup/suppress)
 *  hp    : dégâts %PV max de la cible
 *  tb    : "tank buster" — dégâts bruts, réduction d'armure, conversion magique
 *  mob   : mobilité (dash, blink, vitesse)
 *  tk    : résistance / capacité à encaisser
 *  wc    : waveclear
 *  pk    : poke / dégâts à distance sûre
 *  dv    : dive (capacité à atteindre le backline)
 *  sp    : splitpush / pression de side
 *  tf    : valeur en teamfight groupé 5v5
 *  sus   : sustain de lane
 *  heal  : dépendance aux soins/régen (cible des Blessures Graves)
 *  notes : tech exploitée par le moteur et affichée à l'utilisateur
 *  low   : true = données à revérifier (champion récent / hors de ma fenêtre)
 * ========================================================================== */
(function (global) {
  "use strict";

  var DEF = {
    juggernaut:  { rng:0, eng:1, dis:0, peel:1, cc:2, hp:1, tb:1, mob:0, tk:3, wc:2, pk:0, dv:1, sp:3, tf:2, sus:2, heal:1, sc:[2,3,2], dmg:[90,0,10] },
    diver:       { rng:0, eng:3, dis:0, peel:1, cc:2, hp:1, tb:1, mob:3, tk:2, wc:2, pk:0, dv:3, sp:2, tf:2, sus:1, heal:1, sc:[2,3,2], dmg:[85,0,15] },
    skirmisher:  { rng:0, eng:1, dis:1, peel:1, cc:1, hp:2, tb:2, mob:2, tk:2, wc:2, pk:0, dv:2, sp:3, tf:2, sus:2, heal:1, sc:[2,3,3], dmg:[85,0,15] },
    assassin:    { rng:0, eng:2, dis:0, peel:0, cc:1, hp:0, tb:0, mob:3, tk:1, wc:2, pk:1, dv:3, sp:2, tf:1, sus:1, heal:0, sc:[2,3,2], dmg:[85,0,15] },
    vanguard:    { rng:0, eng:3, dis:1, peel:2, cc:3, hp:1, tb:0, mob:2, tk:3, wc:2, pk:0, dv:2, sp:1, tf:3, sus:1, heal:1, sc:[2,3,3], dmg:[40,50,10] },
    warden:      { rng:0, eng:1, dis:3, peel:3, cc:3, hp:1, tb:0, mob:1, tk:3, wc:2, pk:0, dv:0, sp:1, tf:3, sus:2, heal:1, sc:[2,3,3], dmg:[40,50,10] },
    marksman:    { rng:1, eng:0, dis:1, peel:1, cc:1, hp:1, tb:1, mob:1, tk:0, wc:2, pk:2, dv:0, sp:2, tf:3, sus:0, heal:0, sc:[1,2,3], dmg:[95,0,5] },
    mageBurst:   { rng:1, eng:1, dis:1, peel:1, cc:2, hp:0, tb:0, mob:1, tk:1, wc:3, pk:2, dv:1, sp:1, tf:2, sus:1, heal:0, sc:[2,3,3], dmg:[0,100,0] },
    mageControl: { rng:1, eng:0, dis:2, peel:2, cc:3, hp:0, tb:0, mob:0, tk:1, wc:3, pk:3, dv:0, sp:1, tf:3, sus:1, heal:0, sc:[2,3,3], dmg:[0,100,0] },
    mageBattle:  { rng:1, eng:1, dis:1, peel:1, cc:2, hp:1, tb:1, mob:1, tk:2, wc:3, pk:2, dv:1, sp:1, tf:3, sus:2, heal:2, sc:[2,3,3], dmg:[0,100,0] },
    enchanter:   { rng:1, eng:0, dis:3, peel:3, cc:2, hp:0, tb:0, mob:1, tk:1, wc:1, pk:1, dv:0, sp:0, tf:3, sus:3, heal:3, sc:[1,2,3], dmg:[0,100,0] },
    catcher:     { rng:1, eng:2, dis:2, peel:2, cc:3, hp:0, tb:0, mob:1, tk:1, wc:2, pk:2, dv:1, sp:0, tf:3, sus:1, heal:1, sc:[2,3,2], dmg:[10,90,0] }
  };

  var LIST = [];
  function C(name, roles, cls, o) {
    var base = DEF[cls];
    var c = { name: name, key: norm(name), roles: roles, cls: cls, notes: "" };
    for (var k in base) c[k] = base[k];
    if (o) for (var j in o) c[j] = o[j];
    LIST.push(c);
    return c;
  }
  function norm(s) {
    return String(s).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  /* ---------------------------------------------------------------- A ---- */
  C("Aatrox", ["TOP","MID"], "juggernaut", { dmg:[95,0,5], sus:3, heal:3, eng:2, cc:2, mob:1, tf:2, sc:[2,3,2],
    notes:"Se soigne énormément (R + passif de Q) : les Blessures Graves le brisent. Ses Q sont esquivables — les champions mobiles le neutralisent." });
  C("Ahri", ["MID"], "mageBurst", { mob:2, cc:2, dis:1, sc:[2,3,3],
    notes:"R = 3 dashs : elle entre et sort des fights. Le charme est son seul CC dur, esquivable." });
  C("Akali", ["MID","TOP"], "assassin", { dmg:[0,100,0], mob:3, dis:2, wc:2,
    notes:"Nuage de fumée = intouchable pour les ciblages. Faible sous tourelle (les tourelles la révèlent) et vs le CC de point-and-click." });
  C("Akshan", ["MID","TOP"], "assassin", { rng:1, dmg:[95,0,5], mob:3, pk:2, sc:[3,3,2], dv:2,
    notes:"R traverse les murs, passif de camouflage. Ressuscite ses alliés en tuant l'assassin : très fort contre une comp à un seul carry." });
  C("Alistar", ["SUP"], "vanguard", { dmg:[10,80,10], eng:3, peel:3, cc:3, tk:3, heal:2, mob:2,
    notes:"W+Q = engage inarrêtable (dash → bloqué par Poppy W). R = quasi-invulnérable pendant 7s, il absorbe le wombo adverse." });
  C("Ambessa", ["TOP","MID"], "diver", { dmg:[95,0,5], mob:3, sp:2, sc:[2,3,2], low:true,
    notes:"Enchaîne les dashs sur ses combos. Très forte en side, cible prioritaire du CC." });
  C("Amumu", ["JGL","SUP"], "vanguard", { dmg:[0,90,10], eng:3, cc:3, tf:3, sc:[1,3,3], mob:1,
    notes:"R = stun de zone : la comp adverse groupée meurt. Il n'a aucun outil de désengage." });
  C("Anivia", ["MID"], "mageControl", { cc:3, wc:3, pk:3, sc:[1,3,3], dis:3, tk:2,
    notes:"Le mur coupe les engages et les gank. Passif = deuxième vie, l'assassiner coûte deux fois le prix." });
  C("Annie", ["MID","SUP"], "mageBurst", { cc:3, eng:2, sc:[3,2,3], wc:3,
    notes:"Stun garanti tous les 4 sorts. R + Flash = engage à part entière." });
  C("Aphelios", ["BOT"], "marksman", { sc:[0,2,3], tf:3, tb:1, mob:0, pk:2,
    notes:"Aucune mobilité, il lui faut du peel dur. Sa puissance dépend de la rotation d'armes — très fort en late groupé." });
  C("Ashe", ["BOT","SUP"], "marksman", { cc:3, eng:2, peel:2, sc:[1,2,3], mob:0, pk:2,
    notes:"R = engage à portée map + vision permanente. W ralentit tout un cône : excellent peel, mais elle est immobile." });
  C("Aurelion Sol", ["MID"], "mageControl", { sc:[1,2,3], pk:3, tf:3, mob:2, cc:2,
    notes:"Empile des stacks : plus la game dure, plus il one-shot. Faible avant l'item 2." });
  C("Aurora", ["MID","TOP"], "mageBurst", { mob:2, cc:2, dis:2, sc:[2,3,3], low:true,
    notes:"W = blink + intouchable brièvement. R crée une zone qui repousse : bon anti-dive." });
  C("Azir", ["MID"], "mageControl", { tf:3, dis:3, sc:[1,3,3], mob:2, pk:2,
    notes:"R = mur de repoussée : annule un engage entier (Malphite, Hecarim). Très faible early, gros pic à 3 items." });

  /* ---------------------------------------------------------------- B ---- */
  C("Bard", ["SUP"], "catcher", { heal:2, dis:2, cc:3, mob:3, peel:2,
    notes:"R met tout le monde en stase : annule un ult (Malphite R, Karthus R) ou sauve un allié. Roam permanent." });
  C("Bel'Veth", ["JGL"], "skirmisher", { sc:[2,2,3], hp:2, tb:2, mob:3, tk:2,
    notes:"On-hit true damage, elle fond les tanks en duel. Faible sous CC lourd." });
  C("Blitzcrank", ["SUP"], "catcher", { eng:3, cc:3, sc:[3,2,1], tk:2,
    notes:"Un grab = une kill. Se fait annuler par un spellshield (Sivir E, Morgana E, Nocturne W)." });
  C("Brand", ["SUP","MID","JGL"], "mageBurst", { hp:2, wc:3, tf:3, pk:2, sc:[2,3,3],
    notes:"Le passif enflammé inflige des dégâts %PV max : un des rares supports qui fond les tanks." });
  C("Braum", ["SUP"], "warden", { dmg:[20,70,10], dis:3, peel:3, cc:3, tk:3,
    notes:"E bloque TOUS les projectiles pour l'équipe (Ashe R, Zeri Q, Caitlyn R, Jhin R). Contre une comp à projectiles c'est un mur." });
  C("Briar", ["JGL"], "diver", { sus:3, heal:3, mob:3, tk:2, eng:3, sc:[2,3,2],
    notes:"Lifesteal massif → Blessures Graves obligatoires. Son R est un engage à portée map." });

  /* ---------------------------------------------------------------- C ---- */
  C("Caitlyn", ["BOT"], "marksman", { pk:3, sc:[2,2,3], mob:1, peel:2,
    notes:"Portée d'attaque la plus longue : elle gagne la lane par le poke. Faible face aux dives sans peel." });
  C("Camille", ["TOP","JGL"], "skirmisher", { hp:3, tb:3, mob:3, eng:2, dv:3, sp:3, sc:[2,3,3], cc:2,
    notes:"W = dégâts %PV max + soin, E = grab de mur. R isole une cible du reste de l'équipe : elle supprime un carry adverse à elle seule." });
  C("Cassiopeia", ["MID"], "mageControl", { wc:3, sus:2, cc:3, mob:0, sc:[1,3,3], tb:1,
    notes:"Pas de bottes → elle achète de la pénétration magique tôt. R stun uniquement de face. Immobile : cible facile pour les dives." });
  C("Cho'Gath", ["TOP","JGL","MID"], "vanguard", { dmg:[20,70,10], tb:3, tk:3, cc:3, sc:[2,3,3], wc:3, sp:1, eng:2,
    notes:"R = dégâts BRUTS (true) qui exécutent : le seul tank qui tue les autres tanks. Empile des PV max, très dur à sortir en late." });
  C("Corki", ["MID","BOT"], "marksman", { dmg:[45,55,0], pk:3, tb:1, sc:[1,3,3], mob:2, wc:3,
    notes:"Dégâts mixtes AD/AP : difficile à contrer par un seul type de résistance." });

  /* ---------------------------------------------------------------- D ---- */
  C("Darius", ["TOP"], "juggernaut", { sc:[3,3,1], tb:2, sus:2, cc:2, dv:1, tk:3,
    notes:"R = dégâts bruts qui exécutent, reset sur kill. Domine la lane mais n'a aucune mobilité : le kite et le poke le rendent inutile." });
  C("Diana", ["JGL","MID"], "diver", { dmg:[0,95,5], eng:3, cc:3, tf:3, mob:2, sc:[2,3,3],
    notes:"R = aspiration de zone : elle transforme un regroupement adverse en fight gagné." });
  C("Dr. Mundo", ["TOP","JGL"], "juggernaut", { dmg:[45,55,0], tk:3, hp:2, sus:3, heal:3, sc:[1,3,3], cc:1, mob:1,
    notes:"Régénération démentielle → Blessures Graves obligatoires. Aucun CC dur, il ne fait qu'encaisser et split." });
  C("Draven", ["BOT"], "marksman", { sc:[3,3,2], pk:1, mob:1,
    notes:"Le plus fort en early du rôle. S'il n'a pas de lead à 20 min, il n'apporte plus rien de spécial." });

  /* ---------------------------------------------------------------- E ---- */
  C("Ekko", ["JGL","MID"], "assassin", { dmg:[0,95,5], mob:3, cc:2, tf:2, tk:2, sus:2,
    notes:"R = retour en arrière : il survit à ce qui devrait le tuer. Zone de stun en teamfight." });
  C("Elise", ["JGL"], "assassin", { dmg:[10,85,5], hp:2, sc:[3,2,1], cc:2, mob:2,
    notes:"Q inflige des dégâts %PV : forte contre les tanks tôt. S'effondre en late." });
  C("Evelynn", ["JGL"], "assassin", { dmg:[0,95,5], sc:[1,3,3], mob:2, dv:3,
    notes:"Camouflage permanent au niveau 6 : la vision de contrôle est le seul contre. Elle supprime un carry par fight." });
  C("Ezreal", ["BOT","MID"], "marksman", { dmg:[70,30,0], pk:3, mob:3, sc:[1,2,3], tb:1,
    notes:"E = blink toutes les quelques secondes, quasi impossible à catch. Dégâts mixtes, mais faible DPS soutenu contre les tanks." });

  /* ---------------------------------------------------------------- F ---- */
  C("Fiddlesticks", ["JGL","SUP"], "catcher", { eng:3, tf:3, cc:3, sc:[1,3,3], heal:2, wc:3, dmg:[0,100,0],
    notes:"R = engage à très longue portée qui fear toute la comp groupée. Dépend totalement de la vision." });
  C("Fiora", ["TOP"], "skirmisher", { hp:2, tb:3, sp:3, sc:[2,3,3], dis:2, heal:2, mob:2, tf:1,
    notes:"Dégâts BRUTS sur les vitales : elle fond n'importe quel tank en duel. W pare un CC/dash clé (Malphite R, Galio R, Sett E). Nulle en teamfight groupé, sa win condition est le side." });
  C("Fizz", ["MID"], "assassin", { dmg:[0,95,5], mob:3, dis:2, cc:2,
    notes:"E le rend intouchable : il esquive les ults ciblés (Zoe Q, Ashe R). Assassine les mages immobiles." });

  /* ---------------------------------------------------------------- G ---- */
  C("Galio", ["MID","SUP","TOP"], "mageBattle", { dmg:[0,90,10], tk:3, cc:3, eng:3, dis:2, peel:3, tf:3, sc:[2,3,3], mob:2, wc:3,
    notes:"Passif + W = anti-mage structurel (bouclier magique, il donne de la MR à son équipe). R = engage à portée map. Faible contre les dégâts AD." });
  C("Gangplank", ["TOP"], "skirmisher", { tb:2, sp:3, dis:2, tf:3, sc:[2,3,3], wc:3, mob:1,
    notes:"W nettoie tout CC (anti-Malphite, anti-Morgana). R global = il influence toutes les lanes. Faible early, monstrueux à 3 items." });
  C("Garen", ["TOP"], "juggernaut", { tb:2, sus:2, cc:2, sp:2, sc:[3,3,1], tk:3, mob:1,
    notes:"R = dégâts bruts d'exécution. Silence sur Q. Zéro portée, zéro engage à distance : il est kité par tout ce qui est ranged." });
  C("Gnar", ["TOP"], "skirmisher", { rng:1, eng:3, cc:3, tk:2, tf:3, sc:[2,3,2], hp:1, sp:2,
    notes:"En mini il poke à distance et gagne le matchup vs les melees immobiles ; en méga il engage avec un stun de zone." });
  C("Gragas", ["JGL","TOP","MID"], "vanguard", { dmg:[0,90,10], eng:3, dis:3, wc:3, sc:[2,3,3], tk:3, mob:2,
    notes:"R = repoussée : soit il engage, soit il annule un engage adverse. Un des meilleurs outils anti-dive du jeu." });
  C("Graves", ["JGL"], "marksman", { rng:1, mob:2, sc:[3,3,2], tk:2, tb:1, dv:2,
    notes:"Courte portée mais burst énorme : il gagne les duels de jungle early. Fort en side, faible en fight groupé sans frontline." });
  C("Gwen", ["TOP","JGL"], "skirmisher", { dmg:[0,80,20], hp:3, tb:3, sc:[1,3,3], dis:3, sus:2, sp:3, mob:2,
    notes:"Dégâts %PV max magiques + bruts au centre du Q : LE tank-buster magique. W = zone où elle est intouchable de l'extérieur (annule le focus et les dives). Faible early." });

  /* ---------------------------------------------------------------- H ---- */
  C("Hecarim", ["JGL","TOP"], "diver", { eng:3, mob:3, sc:[2,3,3], sus:2, tf:3, cc:3,
    notes:"R = fear de zone + engage à longue portée. Vitesse de déplacement = il choisit ses fights." });
  C("Heimerdinger", ["MID","TOP","SUP"], "mageControl", { wc:3, pk:3, tf:2, mob:0, sc:[3,2,2],
    notes:"Les tourelles rendent la lane impossible à pousser contre lui. Immobile : totalement dépendant de son positionnement." });
  C("Hwei", ["MID","SUP"], "mageControl", { pk:3, wc:3, cc:3, tf:3, sc:[2,3,3], dis:2,
    notes:"Boîte à outils complète : poke, zone, CC, bouclier. Aucune mobilité." });

  /* ---------------------------------------------------------------- I ---- */
  C("Illaoi", ["TOP"], "juggernaut", { tf:3, sus:3, heal:3, cc:2, sp:2, sc:[2,3,2], hp:2, tk:3,
    notes:"R dans un regroupement = elle gagne le fight 1v5. Le contre est simple : ne jamais la combattre dans ses tentacules, la kite." });
  C("Irelia", ["TOP","MID"], "skirmisher", { dv:3, cc:3, tb:2, sc:[2,3,3], mob:3, tf:2,
    notes:"R = zone de désarmement (anti-ADC). Elle traverse la mêlée avec ses resets de dash : très dure à peel." });
  C("Ivern", ["JGL"], "enchanter", { heal:3, peel:3, cc:2, tf:3, sc:[2,3,3],
    notes:"Bouclier + zone de heal via Daisy. Il accélère la jungle de toute l'équipe." });

  /* ---------------------------------------------------------------- J ---- */
  C("Janna", ["SUP"], "enchanter", { dis:3, peel:3, heal:2, cc:3, mob:2,
    notes:"LA réponse à une comp d'engage : R repousse tout le monde, Q knock-up, W speed. Contre Malphite/Galio/Alistar c'est le pick le plus sûr." });
  C("Jarvan IV", ["JGL","TOP"], "diver", { eng:3, cc:3, tf:3, sc:[3,3,2], tb:2, tk:2,
    notes:"Q réduit l'armure de la cible. R = cage : elle isole un carry ou coupe une retraite." });
  C("Jax", ["TOP","JGL"], "skirmisher", { dis:2, sp:3, sc:[1,3,3], tk:2, dv:2, tf:2, mob:2,
    notes:"E esquive TOUTES les auto-attaques : il annule un ADC en duel. Le late game lui appartient s'il n'a pas été puni early." });
  C("Jayce", ["TOP","MID"], "marksman", { rng:1, dmg:[100,0,0], pk:3, sc:[3,3,2], mob:2, tk:1, sp:2, tf:2,
    notes:"Poke à très longue portée en forme canon : il rend les lanes melee injouables. S'essouffle en late face aux tanks." });
  C("Jhin", ["BOT"], "marksman", { pk:3, cc:2, sc:[2,3,2], mob:1, tf:3,
    notes:"R = dégâts à portée map. Le 4e coup est un burst énorme. Mobilité nulle entre les fights." });
  C("Jinx", ["BOT"], "marksman", { sc:[1,2,3], tf:3, wc:3, mob:1, peel:2,
    notes:"Reset complet sur kill/assist : elle prend le contrôle de la game dès qu'elle snowball. Immobile, il lui faut du peel." });

  /* ---------------------------------------------------------------- K ---- */
  C("K'Sante", ["TOP"], "vanguard", { dmg:[80,0,20], tk:3, cc:3, dis:3, peel:3, eng:2, hp:2, tb:2, sc:[1,2,3], mob:2,
    notes:"R sort un carry adverse du fight et le transforme en duelliste bruteur. Tank en fight groupé, assassin en 1v1." });
  C("Kai'Sa", ["BOT"], "marksman", { dmg:[60,40,0], sc:[1,2,3], mob:2, dv:2, tb:1,
    notes:"Dégâts mixtes évolutifs, R = dash sur la cible marquée : elle peut dive le backline." });
  C("Kalista", ["BOT"], "marksman", { mob:3, hp:2, eng:1, sc:[2,3,2], tb:2,
    notes:"Ne peut pas être ralentie ni catch grâce à ses dashs sur auto. R propulse son support dans le fight : combo d'engage avec Thresh/Alistar." });
  C("Karma", ["SUP","MID"], "enchanter", { pk:2, dis:2, peel:3, sc:[3,2,2], heal:2,
    notes:"Forte dès le niveau 1 grâce au R disponible tôt. Bouclier + speed = anti-poke et anti-engage." });
  C("Karthus", ["JGL","MID"], "mageControl", { tf:3, wc:3, sc:[1,3,3], mob:0, dis:1,
    notes:"R = dégâts à toute la map : il gagne les fights auxquels il ne participe pas. Passif = il continue à taper après sa mort." });
  C("Kassadin", ["MID"], "assassin", { dmg:[0,100,0], sc:[0,2,3], mob:3, dis:2, wc:2,
    notes:"Bouclier magique = anti-mage total. Injouable avant 6, incontrable en late s'il a farmé." });
  C("Katarina", ["MID"], "assassin", { dmg:[20,80,0], tf:2, mob:3, heal:1,
    notes:"Resets en chaîne : si elle prend une kill, le fight s'écroule. Le CC dur et les Blessures Graves l'annulent." });
  C("Kayle", ["TOP","MID"], "marksman", { dmg:[45,55,0], sc:[0,2,3], tb:2, peel:3, dis:2, tf:3, tk:1, mob:1,
    notes:"R = invulnérabilité sur un allié : elle sauve le carry du wombo adverse. Dégâts mixtes AD/AP à distance en late. La lane est une phase de survie, la game se gagne après 11/16." });
  C("Kayn", ["JGL"], "assassin", { mob:3, sc:[1,3,3], heal:2, dv:3, tk:2,
    notes:"Forme rouge = bruiseur qui soigne, forme bleue = assassin qui traverse les murs. La forme se choisit selon la comp adverse." });
  C("Kennen", ["TOP","MID"], "mageBurst", { rng:1, tf:3, cc:3, eng:2, sc:[2,3,3], pk:2, wc:3,
    notes:"R = stun de zone sur toute la comp adverse : un des meilleurs outils de wombo. Ranged, il gagne les lanes contre les melees immobiles." });
  C("Kha'Zix", ["JGL"], "assassin", { mob:3, dv:3, sc:[2,3,2],
    notes:"Bonus massif contre les cibles isolées : il punit les comps qui se séparent. Saut avec reset sur kill." });
  C("Kindred", ["JGL"], "marksman", { hp:3, tb:3, sc:[1,3,3], dis:3, mob:2,
    notes:"Dégâts %PV courant sur auto : anti-tank. R = zone où personne ne peut mourir — c'est un outil de désengage et de reset de fight." });
  C("Kled", ["TOP"], "juggernaut", { eng:3, sus:2, sc:[3,3,2], dv:2, mob:2, tk:2,
    notes:"R = engage longue distance sur toute l'équipe. Deux barres de vie : il survit aux all-in qui devraient le tuer." });
  C("Kog'Maw", ["BOT"], "marksman", { hp:3, tb:3, sc:[0,1,3], mob:0, pk:2,
    notes:"W = dégâts %PV max magiques sur auto : LE contre aux empilements de PV. Zéro mobilité, il ne fonctionne qu'avec deux peelers." });

  /* ---------------------------------------------------------------- L ---- */
  C("LeBlanc", ["MID"], "assassin", { dmg:[0,100,0], mob:3, cc:2,
    notes:"Burst instantané + retour en arrière : elle prend un kill et disparaît. Faible contre les mages à bouclier magique." });
  C("Lee Sin", ["JGL"], "diver", { eng:3, sc:[3,3,1], mob:3, dis:2, tf:2,
    notes:"R kick = il désorganise le positionnement adverse ou isole un carry. Doit convertir son early sinon il devient inutile." });
  C("Leona", ["SUP"], "vanguard", { eng:3, cc:3, tk:3, sc:[3,3,2],
    notes:"Chaîne de CC la plus longue du jeu sur une cible. Aucun désengage : si l'engage rate, la lane est perdue." });
  C("Lillia", ["JGL","TOP"], "skirmisher", { dmg:[0,95,5], hp:2, mob:3, tf:3, sc:[1,3,3], cc:3, tb:2,
    notes:"Passif = dégâts %PV max, R endort toute la comp adverse. Kite permanent, très dure à attraper." });
  C("Lissandra", ["MID"], "mageControl", { cc:3, dis:3, eng:2, tk:2, mob:2, sc:[2,3,3],
    notes:"R = stase sur elle-même : elle survit à n'importe quel burst, ou lock un carry. Anti-assassin et anti-hypercarry." });
  C("Lucian", ["BOT","MID"], "marksman", { sc:[3,3,1], mob:2, dv:1,
    notes:"Domine les 15 premières minutes, décroche en late. Veut un support agressif." });
  C("Lulu", ["SUP"], "enchanter", { peel:3, dis:3, cc:3, heal:2,
    notes:"R = PV bonus + knock-up : elle annule un burst d'assassin sur son carry. Polymorph = anti-diver." });
  C("Lux", ["MID","SUP"], "mageBurst", { pk:3, cc:3, wc:3, dis:1,
    notes:"Root longue portée + burst. Aucune mobilité : elle meurt à tout ce qui la touche." });

  /* ---------------------------------------------------------------- M ---- */
  C("Malphite", ["TOP","SUP","JGL","MID"], "vanguard", { dmg:[20,70,10], eng:3, tk:3, cc:3, tf:3, sc:[2,3,3], wc:2, mob:2,
    notes:"R = engage inarrêtable, sauf : Poppy W, Sivir E, Morgana E, Nocturne W, QSS/Mercurial, stase (Zhonya/Bard R). Passif de bouclier = très dur à poke. L'armure early rend les ADC/AD inoffensifs contre lui." });
  C("Malzahar", ["MID"], "mageControl", { cc:3, wc:3, dis:1, sc:[2,3,3], mob:0,
    notes:"R = suppression : ni la tenacité ni le cleanse n'y font quoi que ce soit (seul QSS/Mercurial la retire). Anti-assassin et anti-hypercarry par excellence. Son bouclier de passif annule un CC." });
  C("Maokai", ["SUP","JGL","TOP"], "vanguard", { dmg:[10,80,10], eng:3, cc:3, sus:3, tk:3, sc:[2,3,3],
    notes:"R = zone de root géante sur toute la comp adverse. Très fort contre les comps qui doivent se grouper." });
  C("Master Yi", ["JGL"], "skirmisher", { tb:3, sc:[1,3,3], mob:3, dis:2, tf:2, hp:1, tk:1, heal:2,
    notes:"E = dégâts BRUTS sur auto : il fond les tanks. Q le rend intouchable pendant le dash. Le moindre CC dur le supprime : une comp avec 2 stuns le neutralise." });
  C("Mel", ["MID","SUP"], "mageBurst", { dis:3, pk:3, sc:[2,3,3], low:true,
    notes:"R renvoie les sorts : jouée contre une comp à gros ults ciblés, elle retourne le fight. Données à revérifier selon le patch." });
  C("Milio", ["SUP"], "enchanter", { heal:3, peel:3, dis:2,
    notes:"R = nettoyage de tous les CC de l'équipe : contre-pick direct des comps à CC en chaîne (Ashe R, Malphite R, Morgana Q)." });
  C("Miss Fortune", ["BOT","SUP"], "marksman", { tf:3, pk:2, sc:[2,3,2], mob:1, wc:3,
    notes:"R = dégâts de zone massifs dans un couloir : elle gagne les fights en espace fermé (dragon, baron)." });
  C("Mordekaiser", ["TOP","JGL"], "juggernaut", { dmg:[0,95,5], tk:3, sus:3, heal:3, sc:[2,3,3], hp:1, tb:1, cc:2, tf:2, mob:1,
    notes:"R = duel isolé garanti : il extrait un carry du fight, personne ne peut l'aider. Se soigne beaucoup → Blessures Graves. La MR et le kite sont ses vraies faiblesses." });
  C("Morgana", ["SUP","MID"], "mageControl", { dis:3, cc:3, wc:3, sc:[2,3,2], peel:3,
    notes:"E = bouclier anti-sort : il annule le PREMIER CC (Blitz Q, Malphite R, Ashe R, Morde R). Contre une comp à engage ciblé c'est un contre structurel." });

  /* ---------------------------------------------------------------- N ---- */
  C("Naafiri", ["MID","JGL","TOP"], "assassin", { dmg:[95,0,5], mob:3, sc:[2,3,2], wc:2,
    notes:"Assassin AD sans vraie échappatoire : elle doit convertir tôt. Excellente pour chasser un carry isolé." });
  C("Nami", ["SUP"], "enchanter", { heal:3, cc:3, peel:3, sc:[2,3,3],
    notes:"Bulle = CC dur fiable, R = knock-up de zone (semi-engage). Sustain de lane élevé." });
  C("Nasus", ["TOP"], "juggernaut", { sc:[0,2,3], sus:3, tb:2, cc:2, tk:3, sp:3, heal:2, mob:1,
    notes:"E réduit l'armure de zone : il aide l'équipe à percer les tanks. Q infini : s'il atteint le late avec des stacks, il gagne tous les side lanes. Nul avant 6." });
  C("Nautilus", ["SUP","JGL"], "vanguard", { eng:3, cc:3, tk:3, sc:[3,3,2],
    notes:"Chaque sort applique un CC (passif) : impossible de fuir. Grab longue portée + R ciblé sur le carry." });
  C("Neeko", ["MID","SUP"], "mageBurst", { tf:3, eng:2, cc:3, wc:3, sc:[2,3,3],
    notes:"R = stun de zone énorme, déguisement pour setup l'engage. Excellent second engage." });
  C("Nidalee", ["JGL"], "mageBattle", { pk:3, mob:3, heal:2, sc:[3,2,1], tk:1, cc:1, dmg:[0,100,0],
    notes:"Javelot à très longue portée. Forte early, s'effondre si la game s'éternise." });
  C("Nilah", ["BOT"], "skirmisher", { dis:2, peel:2, heal:2, sc:[1,2,3], mob:2, dmg:[95,0,5], tf:3,
    notes:"R = soin + regroupement de zone. Son W réduit les dégâts d'une capacité ciblée sur elle et son allié : anti-burst." });
  C("Nocturne", ["JGL"], "assassin", { eng:3, dis:2, sc:[2,3,2], dv:3, tf:2,
    notes:"R = dive à portée map + cécité de l'équipe adverse. W = spellshield : il annule un CC (Malphite R, Ashe R)." });
  C("Nunu & Willump", ["JGL"], "vanguard", { eng:2, cc:3, tf:3, sus:2, sc:[2,3,3], dmg:[20,70,10],
    notes:"R = dégâts de zone énormes + ralentissement. Contrôle des objectifs (le Q vole les dragons/barons)." });

  /* ---------------------------------------------------------------- O ---- */
  C("Olaf", ["TOP","JGL"], "juggernaut", { tb:3, dis:3, sc:[3,3,1], hp:1, sus:2, tk:3, mob:1,
    notes:"E = dégâts BRUTS (anti-tank). R = immunité totale aux CC : il traverse n'importe quelle comp de contrôle et tue le carry. Le contre-pick anti-CC par excellence." });
  C("Orianna", ["MID"], "mageControl", { tf:3, peel:2, dis:2, sc:[2,3,3], wc:3,
    notes:"R = wombo ou peel selon où est la balle. Sécurité de lane élevée grâce à la portée." });
  C("Ornn", ["TOP"], "vanguard", { dmg:[20,70,10], eng:3, cc:3, tk:3, tf:3, hp:2, tb:2, sc:[2,3,3], mob:1, wc:2,
    notes:"Le passif Fragile fait infliger des dégâts %PV max : un tank qui aide à percer les autres tanks. R = double engage à portée map. Améliore les objets de toute l'équipe." });

  /* ---------------------------------------------------------------- P ---- */
  C("Pantheon", ["TOP","MID","SUP","JGL"], "diver", { sc:[3,2,1], eng:2, dis:2, cc:3, tf:2, mob:1,
    notes:"E bloque tous les dégâts frontaux (auto et sorts) : il annule un ADC ou un burst de face. R = renfort à portée map. S'affaiblit fort en late." });
  C("Poppy", ["TOP","JGL","SUP"], "warden", { dmg:[60,30,10], cc:3, dis:3, peel:3, tk:3, eng:2, sc:[2,3,2], tf:3, mob:1,
    notes:"W bloque TOUS les dashs et sauts dans une zone : elle annule Malphite R, Galio R, Alistar W, Hecarim R, Zac E, Jarvan Q-E. R repousse toute une comp hors du fight. C'est LE contre structurel des comps d'engage." });
  C("Pyke", ["SUP"], "assassin", { eng:3, cc:3, mob:3, sc:[3,3,2], heal:2, tk:1,
    notes:"R = exécution qui donne de l'or à toute l'équipe. Il transforme un lead en snowball global." });

  /* ---------------------------------------------------------------- Q ---- */
  C("Qiyana", ["MID"], "assassin", { tf:2, mob:3, cc:3,
    notes:"R = stun de zone contre un mur : elle peut à elle seule gagner un fight groupé." });
  C("Quinn", ["TOP","BOT"], "marksman", { rng:1, sp:3, sc:[3,2,1], mob:2, dv:1,
    notes:"Ranged en top : elle rend la lane injouable pour les melees immobiles (Nasus, Darius, Sett). R = vitesse map pour split. Faible en teamfight." });

  /* ---------------------------------------------------------------- R ---- */
  C("Rakan", ["SUP"], "catcher", { eng:3, peel:3, mob:3, cc:3, heal:2, tf:3,
    notes:"Double dash + charme de zone : le meilleur engage/désengage mobile. Combo naturel avec Xayah." });
  C("Rammus", ["JGL"], "vanguard", { dmg:[10,80,10], eng:3, tk:3, cc:3, sc:[2,3,2], mob:2,
    notes:"W renvoie les dégâts et l'armure explose les auto-attaques : contre une comp full AD (ADC + jungler AD + top AD) c'est un contre-pick presque abusif. Taunt sur le carry." });
  C("Rek'Sai", ["JGL"], "diver", { eng:2, sc:[3,3,1], mob:3, tb:2, cc:3,
    notes:"R = renfort à portée map avec dégâts bruts. Vision par les tunnels, très forte early." });
  C("Rell", ["SUP"], "vanguard", { eng:3, cc:3, tk:3, tf:3, dmg:[20,70,10],
    notes:"R = aspiration de zone : engage secondaire dévastateur avec un mage AoE." });
  C("Renata Glasc", ["SUP"], "catcher", { dis:3, peel:3, tf:3, heal:2, sc:[2,3,3],
    notes:"R retourne toute la comp adverse contre elle-même. W ressuscite un allié en plein fight : anti-burst." });
  C("Renekton", ["TOP"], "diver", { sc:[3,3,1], cc:2, sus:2, tk:3, mob:2, tf:2,
    notes:"Domine la lane entre 1 et 15, puis devient un tank sans dégâts. Il doit convertir son avantage rapidement." });
  C("Rengar", ["JGL","TOP"], "assassin", { mob:3, dv:3, sc:[2,3,2],
    notes:"R = camouflage + saut : il flanke et supprime un carry. Punit les comps qui se déplacent sans vision." });
  C("Riven", ["TOP"], "skirmisher", { mob:3, sc:[2,3,2], dis:2, cc:2, tb:1, hp:1, sp:3,
    notes:"Bouclier + 3 dashs + knock-up : très dure à punir si elle est bien jouée. Faible contre les tanks à gros PV en late." });
  C("Rumble", ["TOP","MID"], "mageBattle", { tf:3, wc:3, tk:2, sc:[2,3,3], mob:1, pk:2, cc:2,
    notes:"R = zone de dégâts continue qui coupe un fight en deux. Excellent contre les comps qui doivent se grouper." });
  C("Ryze", ["MID","TOP"], "mageControl", { tf:2, wc:3, sc:[1,3,3], mob:1, cc:2,
    notes:"R = téléportation d'équipe : il crée des 5v4 sur la map. Faible en lane, fort en macro." });

  /* ---------------------------------------------------------------- S ---- */
  C("Samira", ["BOT"], "skirmisher", { rng:1, dis:2, mob:2, sc:[2,3,2], dmg:[95,0,5], tf:3,
    notes:"W détruit tous les projectiles autour d'elle. R = dégâts de zone massifs, mais elle doit entrer au corps à corps." });
  C("Senna", ["SUP","BOT"], "marksman", { heal:3, peel:3, sc:[1,2,3], pk:3, dis:2,
    notes:"Portée qui grandit à l'infini + soins de zone. R protège toute l'équipe à portée map." });
  C("Seraphine", ["SUP","MID","BOT"], "enchanter", { heal:3, cc:3, tf:3, pk:2, wc:3, sc:[2,3,3],
    notes:"R = charme de zone traversant : engage secondaire. Beaucoup de soins et de boucliers → cible des Blessures Graves." });
  C("Sett", ["TOP","SUP"], "juggernaut", { hp:2, tb:2, eng:2, cc:2, sus:2, sc:[3,3,2], tk:3,
    notes:"W inflige des dégâts bruts proportionnels aux dégâts subis. R déplace un adversaire : il extrait un carry ou repositionne un tank. Aucune mobilité : il est kité." });
  C("Shaco", ["JGL","SUP"], "assassin", { mob:3, sc:[3,2,2], dmg:[60,40,0],
    notes:"Invisibilité + boîtes : il contrôle la jungle adverse. Punit les junglers lents." });
  C("Shen", ["TOP","SUP"], "warden", { dmg:[30,60,10], hp:2, tb:2, peel:3, dis:3, tf:3, tk:3, sp:1, sc:[2,3,3], mob:1,
    notes:"W = zone qui bloque toutes les auto-attaques (anti-ADC total). R = bouclier à portée map, il sauve n'importe quel allié n'importe où. Q inflige des dégâts %PV max." });
  C("Shyvana", ["JGL"], "juggernaut", { dmg:[50,50,0], sc:[1,3,3], eng:2, tk:2, hp:2, mob:2, tb:2,
    notes:"Dégâts mixtes AD/AP, R = engage/dash traversant. Forte à partir de 2 items, faible en early gank." });
  C("Singed", ["TOP"], "juggernaut", { sp:3, cc:2, tk:3, sus:2, sc:[2,3,3], mob:2, tb:1,
    notes:"Proxy et poison : il joue une autre game que son adversaire. E projette un adversaire dans son équipe." });
  C("Sion", ["TOP","JGL"], "vanguard", { eng:3, cc:3, tk:3, wc:3, sc:[2,3,3], dmg:[60,30,10], sp:2, mob:1,
    notes:"R = engage à très longue portée qui traverse la map. Passif : il continue à taper après sa mort. Empile des PV à l'infini." });
  C("Sivir", ["BOT"], "marksman", { wc:3, dis:3, tf:3, sc:[2,2,3], peel:1, mob:1,
    notes:"E = bouclier anti-sort : elle annule Malphite R, Ashe R, Blitz Q, Morde R. R donne de la vitesse à toute l'équipe (engage ou fuite). Contre-pick d'une comp de CC ciblé." });
  C("Skarner", ["JGL","TOP"], "vanguard", { eng:3, cc:3, tk:3, sc:[2,3,3], hp:2,
    notes:"R déplace un adversaire de force : il extrait un carry du fight. Beaucoup de CC dur." });
  C("Smolder", ["BOT"], "marksman", { sc:[0,2,3], hp:2, tb:2, mob:1, pk:2,
    notes:"Empile à l'infini : à 225 stacks il exécute les cibles à faible PV et scale mieux que la plupart des ADC. Très faible early." });
  C("Sona", ["SUP"], "enchanter", { heal:3, tf:3, sc:[1,2,3], cc:3,
    notes:"R = stun de zone sur toute la comp adverse. Soins continus → Blessures Graves. Extrêmement fragile." });
  C("Soraka", ["SUP"], "enchanter", { heal:3, sus:3, peel:2, cc:2, tf:3,
    notes:"R soigne toute l'équipe à portée map : sans Blessures Graves, une comp de poke ne tue plus personne. Zéro mobilité." });
  C("Swain", ["MID","SUP","BOT","TOP"], "mageBattle", { heal:3, tk:3, cc:3, tf:3, sus:3, sc:[2,3,3], wc:3,
    notes:"R = drain de zone : plus la comp adverse est groupée, plus il devient increvable. Blessures Graves obligatoires." });
  C("Sylas", ["MID","TOP"], "mageBattle", { heal:2, tf:2, mob:2, cc:2, dmg:[0,95,5], sc:[2,3,3], dv:2,
    notes:"Il vole l'ult adverse : contre une comp avec Malphite/Amumu/Kennen/Sett, il retourne le wombo contre eux. Se soigne beaucoup." });
  C("Syndra", ["MID"], "mageBurst", { cc:3, pk:3, sc:[2,3,3], wc:3,
    notes:"R = burst ciblé qui supprime un carry. Stun de zone avec les sphères." });

  /* ---------------------------------------------------------------- T ---- */
  C("Tahm Kench", ["SUP","TOP"], "warden", { peel:3, dis:3, tk:3, sc:[2,3,3], cc:3, sus:2, heal:2, tb:1,
    notes:"W avale un allié : il annule complètement un burst (Zed R, Malphite R, Morde R). Le meilleur bouclier humain pour un hypercarry." });
  C("Taliyah", ["MID","JGL"], "mageControl", { wc:3, pk:3, dis:3, tf:3, sc:[2,3,3], mob:2,
    notes:"R = mur infranchissable : il coupe la comp adverse en deux ou bloque une retraite. Excellent anti-engage." });
  C("Talon", ["MID","JGL"], "assassin", { mob:3, sc:[3,3,1], wc:3,
    notes:"Traverse les murs : roams constants. Doit convertir avant le late." });
  C("Taric", ["SUP"], "enchanter", { heal:3, peel:3, tf:3, cc:3, tk:3, dis:2,
    notes:"R = invulnérabilité de TOUTE l'équipe pendant 2,5s : il annule un wombo entier (Malphite R + Amumu R). Contre-pick des comps de burst AoE." });
  C("Teemo", ["TOP"], "marksman", { rng:1, dmg:[30,70,0], sc:[3,2,2], sp:2, pk:2, tf:1,
    notes:"Q aveugle : il annule complètement un champion à auto-attaque (Master Yi, Tryndamere, Nasus, Jax). Champignons = contrôle de zone. Nul en teamfight." });
  C("Thresh", ["SUP"], "catcher", { eng:3, peel:3, cc:3, dis:2, tf:3,
    notes:"Lanterne = il sauve un allié ou engage un 2v1. Boîte à outils complète : hook, ralentissement, knock-up, mur." });
  C("Tristana", ["BOT","MID"], "marksman", { sc:[2,2,3], dis:2, mob:2, dv:2,
    notes:"R = repoussée : anti-dive et outil de peel sur elle-même. Portée qui augmente avec les niveaux." });
  C("Trundle", ["TOP","JGL"], "juggernaut", { tk:3, sus:3, heal:3, dis:3, hp:2, tb:3, sc:[2,3,3], cc:2, mob:1,
    notes:"R VOLE les résistances de la cible : contre un empilement d'armure/MR (Malphite, Ornn, K'Sante) il transforme le tank adverse en cible molle. Le pilier bloque les dashs et coupe les fuites." });
  C("Tryndamere", ["TOP"], "skirmisher", { sp:3, sc:[2,3,3], dis:1, sus:2, tf:1, mob:2, hp:1,
    notes:"R = 5s d'invulnérabilité : il survit à tout burst. Sa win condition est le split, pas le fight groupé. Le kite et le CC dur le rendent inutile." });
  C("Twisted Fate", ["MID"], "mageBurst", { dmg:[30,70,0], tf:3, cc:3, sc:[2,3,2], wc:3, mob:2,
    notes:"R = téléportation à portée map avec vision globale : il crée des 5v4. La carte dorée est un stun garanti." });
  C("Twitch", ["BOT"], "marksman", { sc:[1,2,3], tf:3, mob:1, hp:1, pk:1,
    notes:"Invisibilité : il flanke et déchire toute une comp groupée avec son R. Extrêmement fragile." });

  /* ---------------------------------------------------------------- U ---- */
  C("Udyr", ["JGL","TOP"], "juggernaut", { sus:3, heal:2, sc:[2,3,2], tk:3, mob:2, cc:2, tb:1,
    notes:"Très fort en duel et sur les objectifs early. Aucune portée, aucun outil d'engage à distance." });
  C("Urgot", ["TOP"], "juggernaut", { rng:1, hp:3, tb:2, cc:3, tk:3, sc:[2,3,3], sp:2, dv:1,
    notes:"R exécute en dessous d'un seuil de PV et attire les alliés adverses. Ses jambes infligent des dégâts %PV max : il fond les tanks tout en étant tanky." });

  /* ---------------------------------------------------------------- V ---- */
  C("Varus", ["BOT","MID"], "marksman", { pk:3, hp:2, tb:2, cc:3, sc:[2,3,3], mob:0,
    notes:"Les stacks de W infligent des dégâts %PV max : anti-tank à distance. R = root en chaîne, engage à distance." });
  C("Vayne", ["BOT","TOP"], "marksman", { hp:3, tb:3, sc:[0,2,3], mob:2, sp:2, dis:1, pk:0,
    notes:"W = dégâts BRUTS %PV max tous les 3 coups : LE contre-pick des empilements d'armure et de PV. E projette contre un mur = stun. R = invisibilité au tumble. Très faible avant 2 items, il lui faut du peel." });
  C("Veigar", ["MID"], "mageBurst", { sc:[0,2,3], cc:3, wc:3, dis:2, pk:2,
    notes:"AP infini + cage qui stun : en late il one-shot n'importe quel non-tank. La cage est aussi un outil anti-engage." });
  C("Vel'Koz", ["MID","SUP"], "mageControl", { dmg:[0,70,30], tb:2, pk:3, cc:3, mob:0,
    notes:"Son passif et son R infligent des dégâts BRUTS : les résistances magiques ne le contrent pas. Immobile." });
  C("Vex", ["MID"], "mageBurst", { dis:3, cc:3, tf:3, sc:[2,3,3], mob:2,
    notes:"Son passif punit TOUS les dashs (peur + burst) : contre une comp de divers/assassins (Zed, Yone, Irelia, Hecarim) c'est un contre structurel. R = double saut sur le carry." });
  C("Vi", ["JGL"], "diver", { eng:3, cc:3, dv:3, sc:[3,3,2], tk:2,
    notes:"R = CC ciblé imparable qui traverse tout : elle supprime un carry du fight. Q brise les boucliers." });
  C("Viego", ["JGL"], "skirmisher", { sus:2, heal:2, mob:3, sc:[2,3,2], dv:3, tb:1,
    notes:"Il possède le corps de sa victime et récupère ses sorts : chaque kill relance le fight. Reset complet." });
  C("Viktor", ["MID"], "mageControl", { wc:3, tf:3, sc:[1,3,3], cc:2, pk:3,
    notes:"Zone de contrôle avec le rayon + le champ de gravité. Très fort en late groupé, faible avant 2 items." });
  C("Vladimir", ["MID","TOP"], "mageBattle", { heal:3, sus:3, tf:3, sc:[1,2,3], dis:3, tk:2, mob:0, hp:1,
    notes:"La piscine (W) le rend intouchable : il esquive Malphite R, Galio R, Zed R, Ashe R. Se soigne massivement → Blessures Graves. Nul avant 2 items, monstrueux ensuite." });
  C("Volibear", ["TOP","JGL"], "diver", { eng:3, cc:3, tk:3, sus:2, sc:[2,3,3], tb:1, hp:1, mob:2,
    notes:"R détruit les tourelles et le rend increvable : il prend les objectifs de force. Q est un stun ciblé après un dash." });

  /* ---------------------------------------------------------------- W ---- */
  C("Warwick", ["JGL","TOP"], "diver", { hp:3, tb:2, sus:3, heal:3, cc:3, eng:2, sc:[2,3,3], tk:3, mob:2,
    notes:"Q inflige des dégâts %PV max ET le soigne : anti-tank naturel. R = suppression (le CC le plus fiable du jeu). Blessures Graves = son seul vrai contre." });
  C("Wukong", ["TOP","JGL"], "diver", { eng:3, cc:3, tf:3, sc:[2,3,2], tk:2,
    notes:"E + R = knock-up de zone sur toute la comp adverse. Le clone permet de bait un engage adverse." });

  /* ---------------------------------------------------------------- X ---- */
  C("Xayah", ["BOT"], "marksman", { peel:2, dis:3, cc:3, sc:[1,2,3], mob:1,
    notes:"R = intouchable pendant 1,5s : elle survit à un wombo entier (Malphite R + Amumu R). Root de zone avec les plumes." });
  C("Xerath", ["MID","SUP"], "mageControl", { pk:3, wc:3, mob:0, cc:3,
    notes:"Poke à très longue portée : il rend le siège impossible pour l'adversaire. Aucune mobilité, il meurt à tout engage qui l'atteint." });
  C("Xin Zhao", ["JGL"], "diver", { eng:3, dis:3, sus:2, sc:[3,3,1], cc:3, tk:2,
    notes:"R repousse tout le monde sauf sa cible ET annule les dégâts à distance : c'est un anti-ADC et un anti-poke en plein fight." });

  /* ---------------------------------------------------------------- Y ---- */
  C("Yasuo", ["MID","TOP"], "skirmisher", { dis:3, tf:2, sc:[1,3,3], mob:3, hp:1, tb:1,
    notes:"W = mur de vent : il annule TOUS les projectiles (Ashe R, Zeri Q, Caitlyn R, Jhin R, Xerath Q, Varus R). Contre une comp full projectiles c'est un contre structurel. Synergie avec les knock-ups alliés." });
  C("Yone", ["MID","TOP"], "skirmisher", { dmg:[50,50,0], tb:2, mob:3, sc:[1,3,3], dis:2, cc:2, tf:2,
    notes:"La moitié de ses dégâts sont convertis en MAGIQUES : contre un empilement d'armure il continue à taper. Sa forme spirituelle lui offre une seconde chance sur chaque all-in." });
  C("Yorick", ["TOP"], "juggernaut", { sp:3, sus:2, tk:2, sc:[2,3,3], cc:2, mob:1,
    notes:"Meilleur splitpush du jeu avec sa Damoiselle : il prend les tourelles pendant que l'équipe temporise. Faible en teamfight groupé." });
  C("Yunara", ["BOT"], "marksman", { sc:[1,2,3], low:true,
    notes:"Champion récent : profil à revérifier selon le patch avant de s'y fier." });
  C("Yuumi", ["SUP"], "enchanter", { heal:3, peel:2, dis:1, tk:0, cc:2, sc:[1,2,3],
    notes:"Attachée en permanence : elle n'apporte AUCUNE frontline ni aucun CC d'engage. Une comp avec Yuumi doit avoir un vrai frontline ailleurs, sinon l'équipe se fait engage sans réponse." });

  /* ---------------------------------------------------------------- Z ---- */
  C("Zac", ["JGL","TOP","SUP"], "vanguard", { eng:3, cc:3, tk:3, sus:3, tf:3, sc:[2,3,3], dmg:[10,80,10],
    notes:"E = engage longue portée (saut, donc bloqué par Poppy W). Passif = il se relève après sa mort. R projette toute la comp adverse." });
  C("Zed", ["MID"], "assassin", { mob:3, sc:[2,3,2], dmg:[95,0,5],
    notes:"R marque une cible et la supprime : les mages immobiles sont injouables contre lui. Zhonya/stase annule son ult." });
  C("Zeri", ["BOT"], "marksman", { mob:3, sc:[1,2,3], hp:1, tb:1, wc:3, pk:2,
    notes:"Mobilité extrême mais dégâts faibles avant 2-3 items : elle doit survivre à l'early. Il lui faut de la frontline ou du peel dur pour exister en fight." });
  C("Ziggs", ["MID","BOT"], "mageControl", { wc:3, pk:3, sc:[1,3,3], mob:1, dis:2,
    notes:"Siège de tourelles imparable et poke de zone. Il rend le contest d'objectif très coûteux pour l'adversaire." });
  C("Zilean", ["SUP","MID"], "enchanter", { cc:3, peel:3, dis:2, heal:0, tf:3, sc:[2,3,3],
    notes:"R = résurrection : il annule le focus adverse sur son carry. Double bombe = stun fiable, speed = anti-engage." });
  C("Zoe", ["MID"], "mageBurst", { pk:3, cc:3, mob:2, sc:[2,3,3],
    notes:"Bulle de sommeil à longue portée + burst d'un seul sort. Elle punit toute erreur de positionnement." });
  C("Zyra", ["SUP","MID"], "mageControl", { cc:3, tf:3, wc:3, pk:2, eng:1, sc:[2,3,2],
    notes:"R = knock-up de zone + dégâts continus des plantes. Excellent contrôle de zone en fight." });

  /* --------------------------------------------------------------------- */
  /* Alias de saisie rapide : ce que tu tapes réellement en champ select.   */
  /* --------------------------------------------------------------------- */
  var ALIAS = {
    aphe:"Aphelios", asol:"Aurelion Sol", ali:"Alistar", ammu:"Amumu", blitz:"Blitzcrank",
    cait:"Caitlyn", cass:"Cassiopeia", cho:"Cho'Gath", mundo:"Dr. Mundo", eve:"Evelynn",
    ez:"Ezreal", fiddle:"Fiddlesticks", fiddles:"Fiddlesticks", gp:"Gangplank", heca:"Hecarim",
    heim:"Heimerdinger", j4:"Jarvan IV", jarvan:"Jarvan IV", kass:"Kassadin", kata:"Katarina",
    kha:"Kha'Zix", khazix:"Kha'Zix", kog:"Kog'Maw", ksante:"K'Sante", lb:"LeBlanc",
    lee:"Lee Sin", liss:"Lissandra", malz:"Malzahar", mao:"Maokai", mf:"Miss Fortune",
    morde:"Mordekaiser", morg:"Morgana", naut:"Nautilus", nunu:"Nunu & Willump",
    ori:"Orianna", panth:"Pantheon", reksai:"Rek'Sai", rek:"Rek'Sai", renata:"Renata Glasc",
    renek:"Renekton", sera:"Seraphine", shyv:"Shyvana", tahm:"Tahm Kench", tk:"Tahm Kench",
    tf:"Twisted Fate", trist:"Tristana", trynd:"Tryndamere", veko:"Vel'Koz", velkoz:"Vel'Koz",
    vlad:"Vladimir", voli:"Volibear", ww:"Warwick", wu:"Wukong", xin:"Xin Zhao",
    yi:"Master Yi", masteryi:"Master Yi", zil:"Zilean", nid:"Nidalee", noc:"Nocturne",
    ori4:"Orianna", sej:"Sejuani", sera4:"Seraphine", tali:"Taliyah", akshan:"Akshan",
    belveth:"Bel'Veth", bel:"Bel'Veth", gragas:"Gragas", kalista:"Kalista", ambessa:"Ambessa"
  };

  /* Sejuani manquait volontairement plus haut pour rester dans l'ordre alpha */
  C("Sejuani", ["JGL","TOP"], "vanguard", { dmg:[30,60,10], eng:3, cc:3, tk:3, tf:3, hp:1, sc:[2,3,3],
    notes:"R = stun ciblé à longue portée et zone de gel. Le passif la rend increvable hors combat, très dure à punir en jungle." });

  LIST.sort(function (a, b) { return a.name.localeCompare(b.name, "fr"); });

  var BY_KEY = {};
  LIST.forEach(function (c) { BY_KEY[c.key] = c; });

  global.LP_CHAMPIONS = LIST;
  global.LP_CHAMP_BY_KEY = BY_KEY;
  global.LP_ALIAS = ALIAS;
  global.LP_NORM = norm;
})(typeof window !== "undefined" ? window : globalThis);

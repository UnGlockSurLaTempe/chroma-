/* =============================================================================
 * LolPick — Table de MATCHUPS par rôle
 * -----------------------------------------------------------------------------
 * Pour chaque champion : contre qui il gagne / perd sa lane.
 *   win      = +2   (avantage net)
 *   hardWin  = +3   (matchup à sens unique en sa faveur)
 *   lose     = -2   (désavantage net)
 *   hardLose = -3   (lane injouable)
 *
 * Le moteur lit d'abord la fiche du candidat ; s'il n'y a rien, il lit la fiche
 * de l'adversaire et inverse le signe ; sinon il retombe sur l'heuristique
 * (portée, mobilité, sustain, all-in vs poke, %PV max vs tank…).
 *
 * TOP est volontairement le plus détaillé.
 * Une entrée `note` explique le matchup et s'affiche dans le détail du pick.
 * ========================================================================== */
(function (global) {
  "use strict";

  var M = { TOP: {}, JGL: {}, MID: {}, BOT: {}, SUP: {} };

  function T(role, name, o) { M[role][global.LP_NORM(name)] = o; }

  /* ======================================================================= */
  /* ============================== TOP ==================================== */
  /* ======================================================================= */

  T("TOP", "Aatrox", {
    win: ["Nasus", "Kayle", "Gwen", "Sett", "Yorick", "Volibear"],
    lose: ["Fiora", "Renekton", "Gnar", "Malphite", "Jayce", "Kennen"],
    hardLose: ["Quinn", "Teemo", "Vayne"],
    note: { Malphite: "Le bouclier de passif absorbe le poke des Q et l'armure early annule son all-in.",
            Quinn: "Ranged + dash de recul : il ne la touche jamais et perd sa wave." }
  });
  T("TOP", "Camille", {
    win: ["Malphite", "Ornn", "Sion", "Cho'Gath", "Nasus", "Sett", "Yorick", "Mordekaiser"],
    lose: ["Renekton", "Darius", "Gnar", "Jax", "Teemo"],
    hardLose: ["Quinn"],
    note: { Malphite: "Le W en %PV max ignore l'armure empilée : elle fond n'importe quel tank en duel.",
            Renekton: "Il gagne tous les trades avant qu'elle ait son E, et la stun pendant son R." }
  });
  T("TOP", "Cho'Gath", {
    win: ["Darius", "Sett", "Nasus", "Yorick", "Aatrox", "Riven"],
    lose: ["Fiora", "Camille", "Gwen", "Vayne", "Jax", "Trundle", "Quinn"],
    note: { Vayne: "Empiler des PV contre du %PV max brut, c'est nourrir l'adversaire." }
  });
  T("TOP", "Darius", {
    win: ["Nasus", "Yorick", "Aatrox", "Sett", "Cho'Gath", "Kayle", "Garen"],
    lose: ["Gnar", "Jayce", "Malphite", "Gwen", "Kennen"],
    hardLose: ["Quinn", "Teemo", "Vayne"],
    note: { Quinn: "Zéro gap-closer contre du ranged avec un dash : il ne farm même plus." }
  });
  T("TOP", "Fiora", {
    win: ["Malphite", "Sett", "Ornn", "Nasus", "Garen", "Sion", "Cho'Gath", "Illaoi", "K'Sante"],
    lose: ["Gnar", "Jax", "Renekton", "Gwen", "Teemo"],
    hardLose: ["Quinn", "Vayne"],
    note: { Malphite: "Dégâts bruts sur les vitales + W qui pare le R : c'est le contre-pick classique.",
            Illaoi: "Le W pare le E d'Illaoi : sans son grab elle n'a plus de lane." }
  });
  T("TOP", "Gangplank", {
    win: ["Malphite", "Ornn", "Sion", "Nasus", "Yorick", "Cho'Gath", "Kayle"],
    lose: ["Renekton", "Darius", "Pantheon", "Olaf", "Sett", "Irelia"],
    note: { Malphite: "Le W nettoie le stun du R : Malphite perd son seul outil contre lui." }
  });
  T("TOP", "Garen", {
    win: ["Riven", "Yasuo", "Nasus", "Kayle", "Katarina", "Akali"],
    lose: ["Fiora", "Camille", "Gnar", "Jayce", "Darius"],
    hardLose: ["Quinn", "Teemo", "Vayne"],
    note: { Riven: "Le silence du Q coupe son combo en plein milieu." }
  });
  T("TOP", "Gnar", {
    win: ["Aatrox", "Fiora", "Darius", "Sett", "Renekton", "Riven", "Yorick", "Nasus", "Olaf", "Garen"],
    lose: ["Jayce", "Quinn", "Kennen", "Malphite", "Teemo"],
    note: { Darius: "En mini il poke sans jamais entrer dans sa portée de Q." }
  });
  T("TOP", "Gwen", {
    win: ["Malphite", "Ornn", "Sion", "Cho'Gath", "Sett", "Mordekaiser", "Darius", "Nasus", "K'Sante"],
    lose: ["Renekton", "Pantheon", "Jayce", "Fiora", "Riven"],
    hardLose: ["Quinn", "Teemo"],
    note: { Mordekaiser: "Le W lui permet de survivre au R en le soignant, et ses dégâts %PV max le fondent.",
            Malphite: "Dégâts magiques %PV max : l'armure de Malphite ne sert strictement à rien." }
  });
  T("TOP", "Illaoi", {
    win: ["Nasus", "Sett", "Darius", "Yorick", "Garen", "Volibear", "Mordekaiser"],
    lose: ["Fiora", "Camille", "Gnar", "Jayce", "Irelia"],
    hardLose: ["Quinn", "Teemo", "Vayne"],
    note: { Fiora: "Fiora pare le E : sans grab, Illaoi ne fait plus rien de la lane." }
  });
  T("TOP", "Irelia", {
    win: ["Nasus", "Sett", "Yorick", "Kayle", "Illaoi", "Gangplank", "Aatrox"],
    lose: ["Malphite", "Pantheon", "Renekton", "Gnar", "Jayce", "Teemo", "Quinn"],
    note: { Malphite: "Armure + bouclier + stun : elle ne peut pas commencer ses trades." }
  });
  T("TOP", "Jax", {
    win: ["Vayne", "Quinn", "Fiora", "Nasus", "Aatrox", "Yorick", "Tryndamere", "Kayle"],
    lose: ["Malphite", "Pantheon", "Renekton", "Jayce", "Gnar"],
    hardLose: ["Teemo"],
    note: { Vayne: "Le E annule ses auto-attaques : elle n'a plus de dégâts en duel.",
            Teemo: "L'aveuglement coupe son E et son DPS : la lane est perdue par défaut." }
  });
  T("TOP", "Jayce", {
    win: ["Aatrox", "Darius", "Sett", "Garen", "Nasus", "Illaoi", "Mordekaiser", "Yorick", "Volibear", "Gnar", "Gwen"],
    lose: ["Renekton", "Pantheon", "Irelia", "Camille"],
    hardLose: ["Malphite"],
    note: { Malphite: "Bouclier de passif + armure : le poke ne passe pas et le R le supprime." }
  });
  T("TOP", "K'Sante", {
    win: ["Sett", "Darius", "Volibear", "Aatrox", "Nasus"],
    lose: ["Gwen", "Vayne", "Quinn", "Teemo", "Fiora"],
    note: { Gwen: "Il empile des résistances face à des dégâts %PV max magiques : mauvais échange." }
  });
  T("TOP", "Kayle", {
    win: ["Nasus"],
    lose: ["Jax", "Irelia", "Camille", "Fiora", "Gnar", "Sett", "Aatrox", "Garen", "Quinn", "Teemo"],
    hardLose: ["Pantheon", "Renekton", "Darius", "Riven"],
    note: { Pantheon: "Elle ne survit pas au niveau 2. Sa lane est une phase de survie, sa game commence au 11." }
  });
  T("TOP", "Kennen", {
    win: ["Aatrox", "Darius", "Sett", "Nasus", "Garen", "Illaoi", "Yorick", "Gnar", "Tryndamere"],
    lose: ["Malphite", "Quinn", "Jayce", "Renekton", "Irelia"],
    note: { Darius: "Ranged AP contre un melee sans gap-closer : il le poke à mort." }
  });
  T("TOP", "Malphite", {
    win: ["Darius", "Riven", "Renekton", "Irelia", "Jax", "Jayce", "Yasuo", "Tryndamere", "Sett", "Aatrox", "Olaf", "Ambessa"],
    lose: ["Fiora", "Gwen", "Vayne", "Camille", "Kennen", "Teemo", "Trundle", "Mordekaiser", "Quinn"],
    note: { Jayce: "L'armure early et le bouclier de passif rendent tout le poke AD inutile.",
            Trundle: "Le R lui vole son armure : tout son kit repose dessus." }
  });
  T("TOP", "Mordekaiser", {
    win: ["Darius", "Sett", "Tryndamere", "Nasus", "Yorick", "Riven", "Aatrox", "Jax", "Camille", "Teemo"],
    lose: ["Gwen", "Vayne", "Quinn", "Jayce", "Kled", "Kayle"],
    note: { Gwen: "Le W de Gwen annule le duel du R et elle le fond en %PV max." }
  });
  T("TOP", "Nasus", {
    win: [],
    lose: ["Darius", "Renekton", "Fiora", "Camille", "Jayce", "Gnar", "Pantheon", "Riven", "Aatrox", "Illaoi", "Irelia"],
    hardLose: ["Teemo", "Quinn"],
    note: { Teemo: "Aveuglé, il ne peut plus stacker : sa game entière est annulée." }
  });
  T("TOP", "Olaf", {
    win: ["Aatrox", "Fiora", "Jax", "Nasus", "Kayle", "Yorick", "Riven", "Darius"],
    lose: ["Gnar", "Malphite", "Jayce", "Quinn", "Teemo", "Vayne"],
    note: { Fiora: "Ses dégâts bruts et son E le rendent increvable dans un duel court." }
  });
  T("TOP", "Ornn", {
    win: ["Darius", "Sett", "Nasus", "Riven", "Tryndamere", "Aatrox", "Yorick"],
    lose: ["Fiora", "Camille", "Gwen", "Vayne", "Trundle", "Jayce", "Quinn"],
    note: { Trundle: "Le R lui retire ses résistances : le tank devient une cible molle." }
  });
  T("TOP", "Pantheon", {
    win: ["Kayle", "Gwen", "Vayne", "Nasus", "Yorick", "Aatrox", "Irelia", "Camille", "Riven", "Jax"],
    lose: ["Malphite", "Ornn", "Sion", "Cho'Gath", "Gnar", "Quinn"],
    note: { Kayle: "Il la tue au niveau 2 et lui prend sa lane avant qu'elle existe." }
  });
  T("TOP", "Poppy", {
    win: ["Riven", "Irelia", "Camille", "Yasuo", "Hecarim", "Tryndamere", "Jax", "Ambessa", "Aatrox"],
    lose: ["Vayne", "Quinn", "Teemo", "Jayce", "Kennen", "Gwen"],
    note: { Camille: "Le W bloque son E de mur : elle perd son engage et son échappatoire.",
            Riven: "Chaque dash de Riven est annulé par le W : elle ne peut plus faire son combo." }
  });
  T("TOP", "Quinn", {
    win: ["Darius", "Nasus", "Sett", "Aatrox", "Illaoi", "Garen", "Mordekaiser", "Yorick", "Volibear", "Fiora", "Camille", "Cho'Gath", "Kayle"],
    lose: ["Malphite", "Kennen", "Teemo", "Jayce"],
    note: { Darius: "Le contre-pick ranged type : il ne peut ni la toucher ni farm." }
  });
  T("TOP", "Renekton", {
    win: ["Kayle", "Gwen", "Nasus", "Aatrox", "Yorick", "Riven", "Camille", "Irelia", "Jayce", "Fiora"],
    lose: ["Malphite", "Gnar", "Olaf", "Quinn", "Teemo", "Vayne"],
    note: { Kayle: "Il la domine si fort qu'il peut jouer la lane à deux vagues d'avance." }
  });
  T("TOP", "Riven", {
    win: ["Nasus", "Kayle", "Yorick", "Sett", "Aatrox"],
    lose: ["Malphite", "Pantheon", "Renekton", "Garen", "Poppy", "Olaf", "Quinn", "Teemo", "Mordekaiser"],
    note: { Poppy: "Le W annule ses dashs : son combo entier tombe à l'eau." }
  });
  T("TOP", "Sett", {
    win: ["Nasus", "Kayle", "Yorick", "Riven", "Irelia"],
    lose: ["Fiora", "Camille", "Gwen", "Jayce", "Gnar", "Cho'Gath"],
    hardLose: ["Quinn", "Teemo", "Vayne"],
    note: { Fiora: "Aucune mobilité contre des dégâts bruts sur les vitales : il fond." }
  });
  T("TOP", "Shen", {
    win: ["Nasus", "Kayle", "Sett", "Yorick"],
    lose: ["Fiora", "Camille", "Vayne", "Quinn", "Teemo", "Jayce", "Darius"],
    note: { Darius: "Le W de Shen ne bloque que les auto-attaques, pas les Q de Darius." }
  });
  T("TOP", "Singed", {
    win: ["Nasus", "Yorick", "Kayle"],
    lose: ["Vayne", "Teemo", "Quinn", "Jayce", "Gnar"],
    note: { Teemo: "Il ne peut ni le rattraper ni le tuer : la lane est neutralisée." }
  });
  T("TOP", "Sion", {
    win: ["Darius", "Sett", "Aatrox", "Riven", "Kayle"],
    lose: ["Fiora", "Camille", "Gwen", "Vayne", "Trundle", "Quinn", "Jayce"],
    note: { Gwen: "Empiler des PV face à du %PV max, c'est se saborder." }
  });
  T("TOP", "Teemo", {
    win: ["Jax", "Nasus", "Darius", "Sett", "Aatrox", "Tryndamere", "Garen", "Illaoi", "Yorick", "Fiora", "Riven", "Volibear", "Udyr", "Master Yi"],
    lose: ["Kennen", "Jayce", "Quinn", "Gnar", "Mordekaiser", "Camille"],
    note: { "Master Yi": "L'aveuglement supprime totalement un champion à auto-attaques." }
  });
  T("TOP", "Trundle", {
    win: ["Malphite", "Ornn", "Sion", "Cho'Gath", "K'Sante", "Nasus", "Dr. Mundo", "Darius", "Sett", "Shen"],
    lose: ["Vayne", "Quinn", "Teemo", "Jayce", "Fiora", "Kayle"],
    note: { Ornn: "Le R vole les résistances : contre un empileur de tank c'est le pick le plus rentable du jeu." }
  });
  T("TOP", "Tryndamere", {
    win: ["Nasus", "Kayle", "Yorick", "Sett", "Aatrox"],
    lose: ["Teemo", "Quinn", "Jayce", "Malphite", "Poppy", "Kennen", "Gnar", "Mordekaiser"],
    note: { Malphite: "Armure + stun : son R ne suffit pas à convertir, il perd la lane et la game." }
  });
  T("TOP", "Urgot", {
    win: ["Darius", "Sett", "Nasus", "Aatrox", "Illaoi", "Garen", "Yorick", "Riven", "Cho'Gath"],
    lose: ["Vayne", "Quinn", "Teemo", "Jayce", "Gnar", "Camille"],
    note: { "Cho'Gath": "Ses jambes en %PV max punissent tout ce qui empile des PV." }
  });
  T("TOP", "Vayne", {
    win: ["Malphite", "Ornn", "Sion", "Cho'Gath", "Darius", "Sett", "Nasus", "Aatrox", "Illaoi", "Garen", "Yorick", "Volibear", "Dr. Mundo", "K'Sante"],
    lose: ["Jax", "Quinn", "Teemo", "Jayce", "Kennen", "Pantheon", "Renekton", "Riven", "Irelia"],
    note: { Malphite: "Le W en dégâts bruts %PV max ignore complètement son armure.",
            Renekton: "Elle n'a pas de bouton pour survivre à un all-in niveau 3." }
  });
  T("TOP", "Volibear", {
    win: ["Nasus", "Kayle", "Sett", "Yorick", "Aatrox", "Riven"],
    lose: ["Quinn", "Teemo", "Vayne", "Jayce", "Gnar", "Malphite"],
    note: {}
  });
  T("TOP", "Warwick", {
    win: ["Nasus", "Sett", "Darius", "Yorick", "Cho'Gath"],
    lose: ["Quinn", "Teemo", "Vayne", "Jayce", "Gnar", "Malphite"],
    note: { "Cho'Gath": "Le Q en %PV max le soigne autant qu'il fait mal contre un empileur de PV." }
  });
  T("TOP", "Wukong", {
    win: ["Nasus", "Kayle", "Sett", "Yorick", "Aatrox", "Riven"],
    lose: ["Quinn", "Teemo", "Vayne", "Jayce", "Gnar"],
    note: {}
  });
  T("TOP", "Yasuo", {
    win: ["Nasus", "Kayle", "Yorick", "Jayce", "Kennen", "Teemo", "Quinn", "Vayne"],
    lose: ["Malphite", "Pantheon", "Renekton", "Garen", "Poppy", "Olaf"],
    note: { Jayce: "Le mur de vent annule tout son poke à distance : la lane s'inverse.",
            Vayne: "Le mur de vent mange ses carreaux et son E : elle ne peut plus trade." }
  });
  T("TOP", "Yone", {
    win: ["Nasus", "Kayle", "Sett", "Ornn", "Sion", "Cho'Gath", "Yorick"],
    lose: ["Renekton", "Pantheon", "Quinn", "Teemo", "Jayce", "Malphite", "Poppy"],
    note: { Ornn: "La moitié de ses dégâts sont magiques : l'armure du tank ne le protège qu'à moitié." }
  });
  T("TOP", "Yorick", {
    win: ["Nasus", "Kayle", "Sett", "Gwen", "Aatrox"],
    lose: ["Vayne", "Quinn", "Teemo", "Jayce", "Gnar", "Fiora", "Camille", "Illaoi"],
    note: {}
  });
  T("TOP", "Kled", {
    win: ["Nasus", "Kayle", "Gwen", "Yorick", "Aatrox", "Mordekaiser", "Sett"],
    lose: ["Quinn", "Teemo", "Vayne", "Jayce", "Gnar", "Malphite"],
    note: {}
  });
  T("TOP", "Rumble", {
    win: ["Aatrox", "Darius", "Sett", "Nasus", "Garen", "Illaoi", "Yorick", "Mordekaiser"],
    lose: ["Malphite", "Quinn", "Renekton", "Irelia", "Kennen"],
    note: {}
  });
  T("TOP", "Ambessa", {
    win: ["Nasus", "Kayle", "Yorick", "Sett", "Aatrox"],
    lose: ["Malphite", "Poppy", "Quinn", "Teemo", "Jayce", "Gnar"],
    note: {}
  });
  T("TOP", "Dr. Mundo", {
    win: ["Kayle", "Nasus", "Yorick", "Riven", "Sett"],
    lose: ["Vayne", "Trundle", "Fiora", "Camille", "Gwen", "Quinn"],
    note: { Vayne: "Empiler des PV contre du %PV max brut : il devient une cible d'entraînement." }
  });
  T("TOP", "Maokai", {
    win: ["Darius", "Sett", "Aatrox", "Riven", "Kayle", "Yasuo"],
    lose: ["Fiora", "Camille", "Vayne", "Gwen", "Quinn", "Jayce"],
    note: {}
  });
  T("TOP", "Zac", {
    win: ["Darius", "Sett", "Riven", "Aatrox", "Kayle"],
    lose: ["Fiora", "Camille", "Vayne", "Gwen", "Trundle", "Quinn", "Teemo"],
    note: {}
  });
  T("TOP", "Akali", {
    win: ["Nasus", "Kayle", "Yorick", "Sett", "Aatrox"],
    lose: ["Malphite", "Pantheon", "Renekton", "Quinn", "Teemo", "Garen"],
    note: {}
  });
  T("TOP", "Heimerdinger", {
    win: ["Nasus", "Darius", "Sett", "Aatrox", "Yorick", "Garen", "Illaoi", "Tryndamere"],
    lose: ["Malphite", "Camille", "Irelia", "Jayce", "Kennen"],
    note: { Darius: "Les tourelles rendent l'approche impossible : il perd la wave et le niveau." }
  });

  /* ======================================================================= */
  /* ============================== MID ==================================== */
  /* ======================================================================= */

  T("MID", "Zed", {
    win: ["Lux", "Xerath", "Veigar", "Viktor", "Karthus", "Ryze", "Orianna", "Syndra", "Azir"],
    lose: ["Malzahar", "Lissandra", "Galio", "Diana", "Vex", "Annie", "Zilean", "Kassadin"],
    note: { Malzahar: "La suppression du R ignore la tenacité : Zed meurt à chaque tentative." }
  });
  T("MID", "Yasuo", {
    win: ["Xerath", "Lux", "Zoe", "Viktor", "Karthus", "Veigar", "Orianna", "Syndra", "Ziggs"],
    lose: ["Malzahar", "Annie", "Vex", "Galio", "Pantheon", "Lissandra"],
    note: { Ziggs: "Le mur de vent avale tout son zonage : le mage n'a plus de lane." }
  });
  T("MID", "Yone", {
    win: ["Lux", "Xerath", "Veigar", "Karthus", "Viktor", "Ziggs", "Orianna"],
    lose: ["Malzahar", "Vex", "Galio", "Pantheon", "Annie"],
    note: {}
  });
  T("MID", "Katarina", {
    win: ["Lux", "Xerath", "Veigar", "Karthus", "Viktor", "Azir", "Ryze"],
    lose: ["Malzahar", "Galio", "Lissandra", "Annie", "Pantheon", "Diana"],
    note: {}
  });
  T("MID", "Kassadin", {
    win: ["Lux", "Xerath", "Syndra", "Viktor", "Veigar", "Ziggs", "Orianna", "Zed"],
    lose: ["Pantheon", "Talon", "Irelia", "LeBlanc", "Ahri", "Naafiri"],
    note: { Pantheon: "Kassadin ne survit pas aux 10 premières minutes : c'est le contre-pick standard." }
  });
  T("MID", "Malzahar", {
    win: ["Zed", "Yasuo", "Katarina", "Yone", "Talon", "Naafiri", "Fizz", "Qiyana", "Akali"],
    lose: ["Xerath", "Ziggs", "Vladimir", "Anivia", "Cassiopeia"],
    note: { Zed: "R + bouclier de passif : il annule les deux boutons de l'assassin." }
  });
  T("MID", "Galio", {
    win: ["Yasuo", "Yone", "Katarina", "LeBlanc", "Akali", "Ahri", "Syndra", "Lux", "Xerath", "Vladimir"],
    lose: ["Talon", "Naafiri", "Qiyana", "Irelia", "Zed"],
    note: { LeBlanc: "Le bouclier magique de passif + la MR d'équipe : le burst AP ne passe plus.",
            Talon: "Ses dégâts sont AD : le passif anti-magie de Galio ne sert à rien contre lui." }
  });
  T("MID", "Vex", {
    win: ["Zed", "Yasuo", "Yone", "Akali", "Irelia", "LeBlanc", "Fizz", "Qiyana", "Katarina"],
    lose: ["Xerath", "Ziggs", "Cassiopeia", "Viktor", "Anivia"],
    note: { Yone: "Le passif punit chaque dash : le skirmisher ne peut plus entrer." }
  });
  T("MID", "Lissandra", {
    win: ["Zed", "Yasuo", "Katarina", "Fizz", "Akali", "Kassadin", "Yone"],
    lose: ["Xerath", "Ziggs", "Vladimir", "Cassiopeia"],
    note: { Kassadin: "Le R en stase + le CC dur annulent son all-in de late." }
  });
  T("MID", "Fizz", {
    win: ["Lux", "Xerath", "Syndra", "Orianna", "Veigar", "Karthus", "Viktor", "Ryze"],
    lose: ["Malzahar", "Galio", "Lissandra", "Vex", "Diana", "Annie"],
    note: {}
  });
  T("MID", "LeBlanc", {
    win: ["Lux", "Xerath", "Veigar", "Karthus", "Viktor", "Ryze", "Kassadin", "Azir"],
    lose: ["Galio", "Malzahar", "Lissandra", "Annie", "Vex"],
    note: {}
  });
  T("MID", "Talon", {
    win: ["Lux", "Xerath", "Veigar", "Karthus", "Viktor", "Kassadin", "Galio", "Ryze", "Azir"],
    lose: ["Vex", "Lissandra", "Annie", "Pantheon"],
    note: {}
  });
  T("MID", "Naafiri", {
    win: ["Lux", "Xerath", "Veigar", "Karthus", "Viktor", "Kassadin", "Galio", "Ryze"],
    lose: ["Vex", "Lissandra", "Malzahar", "Annie", "Pantheon", "Anivia"],
    note: { Galio: "Ses dégâts sont AD : le kit anti-magie de Galio ne la ralentit pas." }
  });
  T("MID", "Ahri", {
    win: ["Veigar", "Karthus", "Ryze", "Azir", "Viktor", "Kassadin"],
    lose: ["LeBlanc", "Zed", "Irelia", "Qiyana"],
    note: {}
  });
  T("MID", "Xerath", {
    win: ["Malzahar", "Vex", "Lissandra", "Ryze", "Kassadin", "Azir", "Viktor"],
    lose: ["Zed", "Yasuo", "Talon", "Katarina", "LeBlanc", "Qiyana", "Fizz"],
    note: {}
  });
  T("MID", "Orianna", {
    win: ["Ryze", "Azir", "Kassadin", "Veigar", "Karthus"],
    lose: ["Zed", "Yasuo", "Fizz", "LeBlanc", "Qiyana", "Talon"],
    note: {}
  });
  T("MID", "Syndra", {
    win: ["Ryze", "Azir", "Kassadin", "Karthus", "Viktor"],
    lose: ["Zed", "Yasuo", "Fizz", "Talon", "Qiyana", "Galio"],
    note: {}
  });
  T("MID", "Viktor", {
    win: ["Ryze", "Azir", "Karthus", "Veigar"],
    lose: ["Zed", "Yasuo", "Talon", "Fizz", "Katarina", "Qiyana", "Naafiri"],
    note: {}
  });
  T("MID", "Veigar", {
    win: ["Ryze", "Karthus", "Azir"],
    lose: ["Zed", "Yasuo", "Talon", "Fizz", "Katarina", "LeBlanc", "Qiyana", "Naafiri"],
    note: {}
  });
  T("MID", "Annie", {
    win: ["Zed", "Yasuo", "Katarina", "Fizz", "LeBlanc", "Talon", "Yone"],
    lose: ["Xerath", "Ziggs", "Cassiopeia", "Anivia"],
    note: { Zed: "Un stun garanti à chaque 4e sort suffit à annuler un assassin." }
  });
  T("MID", "Anivia", {
    win: ["Zed", "Naafiri", "Katarina", "Yasuo", "Talon"],
    lose: ["LeBlanc", "Irelia", "Qiyana", "Ahri"],
    note: { Zed: "L'œuf lui fait payer deux fois le prix de son all-in." }
  });
  T("MID", "Cassiopeia", {
    win: ["Malzahar", "Lissandra", "Vex", "Ryze", "Azir", "Kassadin"],
    lose: ["Zed", "Talon", "Qiyana", "Fizz", "Irelia"],
    note: {}
  });
  T("MID", "Irelia", {
    win: ["Kassadin", "Cassiopeia", "Anivia", "Ryze", "Azir", "Vladimir"],
    lose: ["Malzahar", "Vex", "Galio", "Pantheon", "Lissandra"],
    note: {}
  });
  T("MID", "Vladimir", {
    win: ["Malzahar", "Lissandra", "Galio", "Ryze", "Azir", "Kassadin"],
    lose: ["Talon", "Zed", "Irelia", "Qiyana", "Pantheon"],
    note: { Galio: "La piscine esquive son R : Galio perd son seul outil de pression." }
  });
  T("MID", "Pantheon", {
    win: ["Kassadin", "Vladimir", "Ryze", "Azir", "Veigar", "Irelia", "Yasuo", "Yone"],
    lose: ["Malzahar", "Anivia", "Xerath", "Ziggs"],
    note: {}
  });
  T("MID", "Ziggs", {
    win: ["Malzahar", "Lissandra", "Ryze", "Azir", "Kassadin", "Vex"],
    lose: ["Zed", "Yasuo", "Talon", "Katarina", "Qiyana", "Fizz"],
    note: {}
  });
  T("MID", "Ryze", {
    win: [],
    lose: ["Zed", "Talon", "LeBlanc", "Xerath", "Ziggs", "Syndra", "Ahri", "Pantheon", "Qiyana"],
    note: {}
  });
  T("MID", "Azir", {
    win: ["Ryze", "Kassadin"],
    lose: ["Zed", "Talon", "LeBlanc", "Qiyana", "Irelia", "Pantheon", "Naafiri"],
    note: {}
  });
  T("MID", "Sylas", {
    win: ["Ryze", "Azir", "Karthus", "Veigar", "Kassadin"],
    lose: ["Malzahar", "Vex", "Pantheon", "Talon", "Zed"],
    note: {}
  });
  T("MID", "Diana", {
    win: ["Zed", "Katarina", "Fizz", "Ryze", "Azir", "Karthus", "Veigar"],
    lose: ["Malzahar", "Vex", "Pantheon", "Xerath", "Ziggs"],
    note: {}
  });
  T("MID", "Qiyana", {
    win: ["Lux", "Xerath", "Veigar", "Karthus", "Viktor", "Orianna", "Syndra", "Azir", "Ryze"],
    lose: ["Vex", "Malzahar", "Lissandra", "Annie", "Pantheon"],
    note: {}
  });
  T("MID", "Lux", {
    win: ["Ryze", "Azir", "Kassadin", "Veigar"],
    lose: ["Zed", "Yasuo", "Talon", "Katarina", "Fizz", "Qiyana", "LeBlanc"],
    note: {}
  });
  T("MID", "Karthus", {
    win: ["Ryze", "Azir"],
    lose: ["Zed", "Yasuo", "Talon", "Katarina", "Fizz", "Qiyana", "LeBlanc", "Diana"],
    note: {}
  });
  T("MID", "Akali", {
    win: ["Lux", "Xerath", "Veigar", "Karthus", "Viktor", "Ryze", "Azir"],
    lose: ["Galio", "Malzahar", "Vex", "Pantheon", "Lissandra"],
    note: {}
  });
  T("MID", "Aurora", {
    win: ["Ryze", "Azir", "Karthus", "Veigar"],
    lose: ["Malzahar", "Pantheon", "Talon", "Zed"],
    note: {}
  });
  T("MID", "Hwei", {
    win: ["Ryze", "Azir", "Kassadin", "Veigar", "Malzahar"],
    lose: ["Zed", "Talon", "Qiyana", "Katarina", "Irelia"],
    note: {}
  });
  T("MID", "Zoe", {
    win: ["Ryze", "Azir", "Kassadin", "Veigar", "Karthus", "Viktor"],
    lose: ["Zed", "Talon", "Qiyana", "Katarina", "Irelia", "Yasuo"],
    note: {}
  });
  T("MID", "Twisted Fate", {
    win: ["Ryze", "Azir", "Kassadin", "Veigar"],
    lose: ["Zed", "Talon", "Qiyana", "LeBlanc", "Katarina", "Irelia"],
    note: {}
  });

  /* ======================================================================= */
  /* ============================== JGL ==================================== */
  /* ======================================================================= */
  /* En jungle il n'y a pas de lane : ces valeurs modélisent le duel early,
     la vitesse de clear et la capacité à envahir/contester les objectifs.   */

  T("JGL", "Lee Sin", {
    win: ["Karthus", "Master Yi", "Evelynn", "Fiddlesticks", "Shyvana", "Amumu", "Kayn", "Bel'Veth", "Kindred"],
    lose: ["Xin Zhao", "Warwick", "Rammus", "Udyr", "Volibear"],
    note: { "Master Yi": "Il envahit avant que Yi ait une seule item : la game de Yi est finie." }
  });
  T("JGL", "Master Yi", {
    win: ["Karthus", "Amumu", "Evelynn", "Fiddlesticks", "Kindred"],
    lose: ["Lee Sin", "Elise", "Xin Zhao", "Rek'Sai", "Nidalee", "Shaco", "Warwick", "Jarvan IV", "Rammus"],
    note: { Shaco: "Yi ne peut pas contester la jungle avant le niveau 6 : il se fait voler ses camps." }
  });
  T("JGL", "Karthus", {
    win: ["Kayn", "Bel'Veth", "Master Yi", "Shyvana", "Evelynn"],
    lose: ["Lee Sin", "Elise", "Nidalee", "Rek'Sai", "Shaco", "Xin Zhao", "Jarvan IV"],
    note: { "Lee Sin": "Clear rapide mais zéro duel : tout jungler early le chasse hors de sa jungle." }
  });
  T("JGL", "Evelynn", {
    win: ["Karthus", "Shyvana", "Amumu", "Kindred", "Bel'Veth"],
    lose: ["Lee Sin", "Elise", "Nidalee", "Rek'Sai", "Xin Zhao", "Shaco"],
    note: {}
  });
  T("JGL", "Warwick", {
    win: ["Master Yi", "Kayn", "Bel'Veth", "Viego", "Graves", "Karthus"],
    lose: ["Rammus", "Nidalee", "Kindred", "Lillia"],
    note: { "Master Yi": "Q en %PV max + R en suppression : le duel est à sens unique." }
  });
  T("JGL", "Xin Zhao", {
    win: ["Master Yi", "Karthus", "Kayn", "Evelynn", "Graves", "Kindred", "Nidalee"],
    lose: ["Rammus", "Warwick", "Volibear", "Udyr"],
    note: { Nidalee: "Le R annule les dégâts à distance : il colle au poke et le tue." }
  });
  T("JGL", "Rammus", {
    win: ["Master Yi", "Graves", "Kindred", "Lee Sin", "Kha'Zix", "Viego", "Xin Zhao", "Rengar", "Warwick"],
    lose: ["Amumu", "Karthus", "Fiddlesticks", "Lillia", "Elise"],
    note: { Graves: "Armure + renvoi de dégâts : un jungler full AD ne peut littéralement pas le tuer." }
  });
  T("JGL", "Kha'Zix", {
    win: ["Karthus", "Amumu", "Evelynn", "Fiddlesticks", "Master Yi", "Shyvana"],
    lose: ["Rammus", "Warwick", "Xin Zhao", "Vi", "Jarvan IV"],
    note: {}
  });
  T("JGL", "Graves", {
    win: ["Karthus", "Amumu", "Evelynn", "Kayn", "Bel'Veth", "Master Yi", "Fiddlesticks"],
    lose: ["Rammus", "Warwick", "Xin Zhao"],
    note: {}
  });
  T("JGL", "Elise", {
    win: ["Karthus", "Master Yi", "Kayn", "Bel'Veth", "Evelynn", "Shyvana", "Amumu"],
    lose: ["Rammus", "Warwick", "Volibear", "Udyr"],
    note: {}
  });
  T("JGL", "Nidalee", {
    win: ["Karthus", "Master Yi", "Kayn", "Bel'Veth", "Evelynn", "Warwick", "Amumu"],
    lose: ["Xin Zhao", "Rammus", "Vi", "Jarvan IV"],
    note: {}
  });
  T("JGL", "Shaco", {
    win: ["Master Yi", "Karthus", "Kayn", "Bel'Veth", "Evelynn", "Amumu", "Shyvana"],
    lose: ["Rammus", "Volibear", "Udyr", "Warwick"],
    note: {}
  });
  T("JGL", "Amumu", {
    win: ["Rammus", "Kayn", "Bel'Veth", "Viego"],
    lose: ["Lee Sin", "Elise", "Nidalee", "Shaco", "Rek'Sai", "Graves", "Kha'Zix"],
    note: {}
  });
  T("JGL", "Kindred", {
    win: ["Rammus", "Amumu", "Sejuani", "Zac", "Warwick", "Dr. Mundo"],
    lose: ["Lee Sin", "Xin Zhao", "Elise", "Rek'Sai", "Shaco"],
    note: { Rammus: "Le %PV courant sur auto transforme n'importe quel tank en cible molle." }
  });
  T("JGL", "Viego", {
    win: ["Karthus", "Amumu", "Evelynn", "Master Yi", "Fiddlesticks"],
    lose: ["Rammus", "Warwick", "Xin Zhao", "Volibear"],
    note: {}
  });
  T("JGL", "Fiddlesticks", {
    win: ["Karthus", "Kayn", "Bel'Veth", "Shyvana", "Master Yi"],
    lose: ["Lee Sin", "Elise", "Nidalee", "Shaco", "Rek'Sai", "Kha'Zix"],
    note: {}
  });
  T("JGL", "Jarvan IV", {
    win: ["Master Yi", "Karthus", "Kayn", "Kha'Zix", "Evelynn", "Nidalee", "Graves"],
    lose: ["Rammus", "Warwick", "Volibear"],
    note: {}
  });
  T("JGL", "Vi", {
    win: ["Master Yi", "Karthus", "Kayn", "Kha'Zix", "Evelynn", "Nidalee", "Graves"],
    lose: ["Rammus", "Warwick", "Volibear", "Udyr"],
    note: {}
  });
  T("JGL", "Mordekaiser", {
    win: ["Master Yi", "Kayn", "Viego", "Bel'Veth", "Graves", "Kha'Zix"],
    lose: ["Kindred", "Nidalee", "Karthus", "Lillia"],
    note: { Kindred: "Le %PV courant à distance annule son R : il ne peut ni la rattraper ni la fondre." }
  });
  T("JGL", "Naafiri", {
    win: ["Karthus", "Amumu", "Evelynn", "Fiddlesticks", "Master Yi"],
    lose: ["Rammus", "Warwick", "Xin Zhao", "Volibear", "Sejuani"],
    note: { Rammus: "Dégâts 100% AD contre de l'armure et du renvoi : elle ne peut rien faire." }
  });

  /* ======================================================================= */
  /* ============================== BOT ==================================== */
  /* ======================================================================= */
  /* Les matchups bot dépendent beaucoup du duo ; ces valeurs modélisent le
     duel ADC vs ADC à support neutre.                                       */

  T("BOT", "Caitlyn", {
    win: ["Vayne", "Kog'Maw", "Twitch", "Jinx", "Kai'Sa", "Aphelios", "Zeri", "Smolder", "Samira", "Nilah"],
    lose: ["Draven"],
    note: { Vayne: "700 de portée contre 550 : Vayne ne peut pas farm sans prendre des trades perdants." }
  });
  T("BOT", "Draven", {
    win: ["Vayne", "Kog'Maw", "Jinx", "Twitch", "Aphelios", "Zeri", "Smolder", "Kai'Sa", "Nilah"],
    lose: ["Ezreal"],
    note: { Zeri: "Les 15 premières minutes lui appartiennent : il faut lui refuser la lane." }
  });
  T("BOT", "Lucian", {
    win: ["Jinx", "Kog'Maw", "Vayne", "Twitch", "Aphelios", "Zeri", "Smolder", "Kai'Sa"],
    lose: ["Caitlyn", "Draven"],
    note: {}
  });
  T("BOT", "Miss Fortune", {
    win: ["Vayne", "Kog'Maw", "Twitch", "Jinx", "Zeri", "Smolder", "Aphelios"],
    lose: ["Caitlyn", "Draven"],
    note: {}
  });
  T("BOT", "Ezreal", {
    win: ["Draven", "Samira", "Nilah", "Kalista"],
    lose: ["Caitlyn", "Lucian"],
    note: { Draven: "Le E lui permet de refuser tous les all-in : Draven ne convertit jamais." }
  });
  T("BOT", "Ashe", {
    win: ["Vayne", "Kog'Maw", "Twitch", "Samira", "Nilah"],
    lose: ["Caitlyn", "Draven", "Lucian"],
    note: {}
  });
  T("BOT", "Jhin", {
    win: ["Vayne", "Kog'Maw", "Twitch", "Zeri", "Smolder"],
    lose: ["Caitlyn", "Draven", "Lucian", "Samira"],
    note: {}
  });
  T("BOT", "Vayne", {
    win: ["Kog'Maw"],
    lose: ["Caitlyn", "Draven", "Lucian", "Miss Fortune", "Ashe", "Jhin"],
    note: { Caitlyn: "Elle doit survivre à 20 minutes de lane avant d'exister." }
  });
  T("BOT", "Zeri", {
    win: ["Kog'Maw", "Smolder", "Jinx"],
    lose: ["Draven", "Lucian", "Caitlyn", "Miss Fortune"],
    note: { Draven: "Zeri ne tue rien avant 2 items : elle doit farmer sous tourelle et scale." }
  });
  T("BOT", "Kog'Maw", {
    win: [],
    lose: ["Caitlyn", "Draven", "Lucian", "Miss Fortune", "Ashe", "Vayne", "Jhin"],
    note: {}
  });
  T("BOT", "Samira", {
    win: ["Kog'Maw", "Vayne", "Jinx", "Zeri", "Aphelios"],
    lose: ["Caitlyn", "Ashe", "Ezreal"],
    note: {}
  });
  T("BOT", "Jinx", {
    win: ["Kog'Maw", "Smolder"],
    lose: ["Caitlyn", "Draven", "Lucian", "Samira"],
    note: {}
  });
  T("BOT", "Kai'Sa", {
    win: ["Kog'Maw", "Smolder", "Jinx"],
    lose: ["Caitlyn", "Draven", "Lucian"],
    note: {}
  });
  T("BOT", "Smolder", {
    win: [],
    lose: ["Caitlyn", "Draven", "Lucian", "Miss Fortune", "Samira"],
    note: {}
  });

  /* ======================================================================= */
  /* ============================== SUP ==================================== */
  /* ======================================================================= */

  T("SUP", "Blitzcrank", {
    win: ["Soraka", "Yuumi", "Sona", "Nami", "Milio", "Karma", "Lulu", "Janna", "Seraphine"],
    lose: ["Morgana", "Braum", "Alistar", "Taric"],
    note: { Morgana: "Le E annule le grab : Blitzcrank n'a plus de bouton." }
  });
  T("SUP", "Thresh", {
    win: ["Soraka", "Yuumi", "Sona", "Milio", "Karma", "Seraphine"],
    lose: ["Morgana", "Braum", "Alistar"],
    note: {}
  });
  T("SUP", "Leona", {
    win: ["Soraka", "Yuumi", "Sona", "Karma", "Janna", "Milio", "Seraphine", "Lulu"],
    lose: ["Morgana", "Braum", "Alistar", "Taric"],
    note: { Yuumi: "Elle engage sur l'ADC pendant que Yuumi est attachée : la lane est ingérable." }
  });
  T("SUP", "Nautilus", {
    win: ["Soraka", "Yuumi", "Sona", "Karma", "Janna", "Milio", "Seraphine"],
    lose: ["Morgana", "Braum", "Alistar"],
    note: {}
  });
  T("SUP", "Pyke", {
    win: ["Soraka", "Yuumi", "Sona", "Nami", "Milio", "Seraphine", "Karma"],
    lose: ["Morgana", "Braum", "Alistar", "Taric"],
    note: {}
  });
  T("SUP", "Morgana", {
    win: ["Blitzcrank", "Thresh", "Leona", "Nautilus", "Pyke", "Rakan", "Rell", "Zyra"],
    lose: ["Sona", "Lulu", "Milio"],
    note: { Leona: "Le bouclier de sort mange le premier CC : tout l'engage tombe à plat." }
  });
  T("SUP", "Braum", {
    win: ["Blitzcrank", "Thresh", "Leona", "Nautilus", "Caitlyn", "Xerath", "Ashe", "Jhin", "Varus"],
    lose: ["Zyra", "Brand"],
    note: { Ashe: "Le E bloque les projectiles : contre un duo bot full projectiles, il annule la lane." }
  });
  T("SUP", "Janna", {
    win: ["Leona", "Nautilus", "Rell", "Alistar", "Rakan", "Amumu"],
    lose: ["Blitzcrank", "Zyra", "Brand", "Xerath"],
    note: { Alistar: "Le R et le Q repoussent tout : l'engage adverse ne connecte jamais." }
  });
  T("SUP", "Lulu", {
    win: ["Pyke", "Rengar", "Zed", "Leona", "Rell"],
    lose: ["Blitzcrank", "Zyra", "Brand", "Xerath"],
    note: {}
  });
  T("SUP", "Soraka", {
    win: ["Xerath", "Karma", "Senna", "Caitlyn"],
    lose: ["Blitzcrank", "Leona", "Nautilus", "Pyke", "Brand", "Zyra", "Thresh"],
    note: {}
  });
  T("SUP", "Yuumi", {
    win: [],
    lose: ["Blitzcrank", "Thresh", "Leona", "Nautilus", "Pyke", "Brand", "Zyra", "Rell"],
    note: { Leona: "Yuumi n'a aucune réponse à un engage dur : la lane se joue en 2v1." }
  });
  T("SUP", "Zyra", {
    win: ["Soraka", "Yuumi", "Sona", "Janna", "Milio", "Lulu", "Braum"],
    lose: ["Leona", "Nautilus", "Pyke", "Alistar"],
    note: {}
  });
  T("SUP", "Brand", {
    win: ["Soraka", "Yuumi", "Sona", "Janna", "Milio", "Lulu", "Braum"],
    lose: ["Leona", "Nautilus", "Pyke", "Alistar", "Blitzcrank"],
    note: {}
  });
  T("SUP", "Alistar", {
    win: ["Blitzcrank", "Thresh", "Leona", "Nautilus", "Zyra", "Brand"],
    lose: ["Janna", "Soraka"],
    note: {}
  });
  T("SUP", "Nami", {
    win: ["Soraka", "Senna", "Karma"],
    lose: ["Blitzcrank", "Leona", "Nautilus", "Brand", "Zyra"],
    note: {}
  });
  T("SUP", "Seraphine", {
    win: ["Soraka", "Senna", "Karma", "Yuumi"],
    lose: ["Blitzcrank", "Leona", "Nautilus", "Pyke", "Brand", "Zyra"],
    note: {}
  });
  T("SUP", "Rakan", {
    win: ["Soraka", "Yuumi", "Sona", "Milio", "Karma"],
    lose: ["Morgana", "Braum", "Janna"],
    note: {}
  });
  T("SUP", "Taric", {
    win: ["Blitzcrank", "Leona", "Pyke", "Nautilus"],
    lose: ["Brand", "Zyra", "Xerath"],
    note: {}
  });
  T("SUP", "Milio", {
    win: ["Leona", "Nautilus", "Rell", "Ashe"],
    lose: ["Blitzcrank", "Brand", "Zyra", "Pyke"],
    note: { Ashe: "Le R nettoie le stun de la flèche : la comp d'engage perd son ouverture." }
  });
  T("SUP", "Karma", {
    win: ["Soraka", "Yuumi", "Sona"],
    lose: ["Blitzcrank", "Leona", "Brand", "Zyra", "Nautilus"],
    note: {}
  });
  T("SUP", "Xerath", {
    win: ["Soraka", "Yuumi", "Sona", "Janna", "Milio", "Nami", "Braum"],
    lose: ["Leona", "Nautilus", "Pyke", "Alistar", "Blitzcrank"],
    note: {}
  });

  global.LP_MATCHUPS = M;
})(typeof window !== "undefined" ? window : globalThis);

# LolPick — assistant de draft League of Legends

Choisir le champion le plus adapté à **cette** game : lecture de la draft, calculateur
de score, base de matchups, picks tech et builds adaptés à la composition d'en face.

Aucune installation, aucune dépendance, aucune clé API. Tout tourne en local.

---

## Installer (une fois)

**Windows** — double-clic sur **`Installer LolPick.bat`**.

**macOS / Linux** — `./install.sh`

Ça pose trois choses :

- un raccourci **LolPick** dans le menu Démarrer et sur le Bureau,
- le **lancement automatique avec League** : LolPick se met en veille au démarrage
  de la session et ouvre sa fenêtre dès que tu lances le client,
- rien d'autre. Pas de registre, pas de droits admin, pas de service.

Désinstallation : `Desinstaller LolPick.bat`, ou `python install.py --uninstall`.
Ça supprime les raccourcis, point.

> **Prérequis : Python 3.** Si tu ne l'as pas, l'installeur te le dit et te donne la
> commande (`winget install -e --id Python.Python.3.12`). C'est la seule chose à
> installer — LolPick lui-même n'a aucune dépendance.

### Lancer à la main

| | |
|---|---|
| Windows | `Lancer LolPick.bat`, ou le raccourci du Bureau |
| Ligne de commande | `python app.py` — fenêtre d'app tout de suite |
| Mode veille | `python app.py --watch` — attend League |
| Simple onglet | `python run.py` — ouvre le navigateur par défaut |

Sans Python du tout, tu peux **ouvrir `web/index.html` directement** : tout marche en
saisie manuelle (pratique sur un 2e écran ou un téléphone), seule la détection
automatique a besoin du pont Python.

Rien n'est exposé sur le réseau : le serveur écoute uniquement sur `127.0.0.1`.

### L'app dédiée

LolPick s'ouvre dans une vraie fenêtre : pas de barre d'adresse, pas d'onglets, sa
propre entrée dans la barre des tâches avec son icône. Techniquement c'est un
navigateur Chromium (Edge, Chrome ou Brave — le premier trouvé) lancé en mode
application avec son profil dédié. Aucun runtime lourd à installer, et si aucun n'est
présent, on retombe proprement sur le navigateur par défaut.

En veille, LolPick ne fait rien d'autre que vérifier l'existence d'un fichier toutes
les 4 secondes (le *lockfile* du client, qui n'existe que quand League tourne). Coût
CPU nul entre deux parties. La fenêtre se referme quand tu quittes le client, et si
tu la fermes toi-même en cours de route elle ne se rouvre pas de force.

---

## Utiliser pendant un champ select

L'écran par défaut (**mode simple**) ne montre qu'une chose : **ton pick**, avec les
3 raisons qui le justifient, son build, et les objets à adapter à cette draft. En
dessous, cinq alternatives cliquables. Tout le reste est replié.

1. **Ton rôle** en haut, et coche/décoche **Last pick**.
2. Remplis la draft : tape 3 lettres et **Entrée**. Le curseur saute tout seul au slot
   suivant — la draft entière se remplit au clavier, sans toucher la souris. Les alias
   marchent (`morde`, `mf`, `j4`, `ww`, `tf`, `cho`, `sera`, `trynd`, `asol`…).
3. Les rôles adverses sont **déduits automatiquement** ; clique sur le badge de rôle
   pour en forcer un si la déduction est fausse.
4. **Tout le détail** déplie le score par axe, le matchup commenté, les runes, le plan
   de lane et le plan de teamfight.

Le bouton **Mode expert** ajoute le classement complet des 12 meilleurs picks, les
verdicts lane par lane, les règles de picks tech déclenchées et les curseurs de
pondération. Le choix est mémorisé.

### Détection automatique (optionnelle)

Si le client League tourne sur la même machine, `run.py` lit son API locale et remplit
la draft tout seul : picks, bans, hovers, et ton rôle assigné. La pastille en haut à
droite passe au vert.

C'est de la **lecture seule** : aucune action n'est envoyée au client. Pas d'auto-pick,
pas d'auto-accept, aucune automatisation du jeu — c'est exactement ce que font les
overlays type Blitz/Porofessor, et c'est ce qui reste dans les clous côté Riot.
Les noms de champions sont lus dans les données du client lui-même, donc ça continue
de marcher hors ligne et ça ne périme pas à chaque patch.

---

## Comment le score est calculé

Chaque candidat est noté sur **6 axes** (tous affichés, pas une note opaque) :

| Axe | Ce qu'il mesure |
|---|---|
| **Lane** | Le 1v1 direct contre l'adversaire de ton poste. Table de matchups curée, avec repli heuristique (portée, mobilité, sustain, early, tank-buster) quand le matchup n'est pas renseigné. |
| **Comp** | Ce qui manque à **ton** équipe : type de dégâts, frontline, engage, peel. |
| **Contre** | Ce que la comp adverse t'impose : %PV max contre les empileurs de résistances, anti-engage, anti-dash, anti-dive, capacité à atteindre leur carry. |
| **Timing** | Adéquation avec le plan de game (le moteur décide d'abord *comment cette game se gagne*, puis note les picks en fonction). |
| **Synergie** | Avec tes alliés déjà lockés (Yuumi qui a besoin d'un corps, knock-up + Yasuo, réponse au splitpush adverse…). |
| **Confort** | Ton pool perso, niveau 0-3, mémorisé dans le navigateur. |

Deux curseurs ajustent la pondération : **Sécurité ↔ Variance** (le confort et
l'évitement des pièges pèsent plus à gauche, les picks tech plus à droite) et
**Teamfight ↔ Lane**. Si tu n'es pas last pick, les champions facilement counterables
perdent des points.

Le moteur applique aussi des **pièges** : empiler des PV contre du %PV max, un 5e AD
contre trois empileurs d'armure, un immobile contre trois dashs, un melee sans sustain
contre du ranged… Chaque piège détecté est affiché avec sa raison.

Les **picks tech** ne sont pas une liste figée : ce sont des règles à déclencheurs lues
sur la draft (« ≥ 3 empileurs de résistances **et** moins de 30 % de dégâts magiques
dans ta team » → Gwen / Vayne / Kayle / Yone / Cho'Gath / Kennen, chacun avec son
build et son niveau de risque).

---

## Éditer la base de connaissance

Tout est en clair, un fichier par domaine, une ligne par entrée :

| Fichier | Contenu |
|---|---|
| `web/data/champions.js` | 171 champions : dégâts AD/AP/brut, scaling, engage, peel, CC, %PV max, mobilité, résistance, sustain, dépendance aux soins, + notes tech exploitées par le moteur. |
| `web/data/matchups.js` | Matchups par rôle (gagne / perd, avec note explicative). TOP est le plus détaillé. |
| `web/data/counterpicks.js` | Règles de picks tech et pièges, avec leur condition de déclenchement. |
| `web/data/builds.js` | Objets, règles d'objets situationnels, builds et runes par champion (repli par classe sinon). |
| `web/engine.js` | Le calculateur : inférence de rôles, lecture de comp, plan de game, scoring. |
| `server/lcu.py` | Pont lecture seule avec le client League. |
| `server/desktop.py` | Fenêtre d'app dédiée + détection du lancement de League. |
| `install.py` | Raccourcis et lancement automatique (Windows / macOS / Linux). |
| `tools/make_icon.py` | Régénère `web/icon.png` et `web/icon.ico` (pur Python). |

Après une modification :

```bash
node tests/test_engine.js    # 30 vérifications — moteur et base de connaissance
python3 tests/test_app.py    # 27 vérifications — serveur, veille, fenêtre, installation
```

Le premier couvre l'intégrité des données (aucun nom inconnu dans les tables),
l'inférence de rôles, des scénarios de référence et les garde-fous. Le second couvre
le serveur local, la détection du lancement de League, la fenêtre d'app et
l'installation/désinstallation.

---

## Limites, à savoir

- **Pas de winrates live.** C'est une base experte versionnée, pas un scraper op.gg :
  les données sont stables et éditables, mais elles reflètent un état du jeu, pas le
  patch d'aujourd'hui. Quand un patch change quelque chose, corrige la ligne concernée.
- **Les objets bougent souvent.** `builds.js` est le fichier à réviser en priorité
  après une préseason.
- Les champions les plus récents (Mel, Yunara, Aurora, Ambessa) sont marqués `low: true`
  et affichés avec un ⚠ : leurs données sont à revérifier avant de s'y fier.
- Les matchups bot lane modélisent un duel ADC vs ADC à support neutre — dans les faits
  le duo compte autant que l'ADC.

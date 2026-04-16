# RESISTANCE — Compte rendu de la refonte du scenario
## Document de travail — Communication promotrice de stage

**Auteure :** Marie-Ange Bouchat
**Formation :** Ecriture Multimedia — ISFS
**Date :** 20 mars 2026
**Branche de developpement :** `editor-autonome`

---

# TABLE DES MATIERES

1. [Contexte et objectif de la refonte](#1-contexte-et-objectif-de-la-refonte)
2. [Diagnostic du scenario original](#2-diagnostic-du-scenario-original)
3. [Nouveau scenario — Decisions validees](#3-nouveau-scenario--decisions-validees)
4. [Personnage principal — Raya](#4-personnage-principal--raya)
5. [Structure narrative du prototype](#5-structure-narrative-du-prototype)
6. [Worldbuilding — Univers et regles du monde](#6-worldbuilding--univers-et-regles-du-monde)
7. [Fondements thematiques](#7-fondements-thematiques)
8. [Test utilisateur — Resultats du brainstorming](#8-test-utilisateur--resultats-du-brainstorming)
9. [Etat technique du prototype](#9-etat-technique-du-prototype)
10. [Planning et priorites](#10-planning-et-priorites)
11. [Decisions en suspens](#11-decisions-en-suspens)
12. [Bibliographie de reference](#12-bibliographie-de-reference)

---

# 1. CONTEXTE ET OBJECTIF DE LA REFONTE

Le scenario original de Resistance, tel que presente dans le document de presentation detaillee du TFE (77 pages), proposait une structure narrative chronologique et encyclopedique. L'ensemble du worldbuilding etait expose des l'introduction sous forme de recit omniscient : l'histoire du monde de 2020 a 2040, les technologies, les factions, les 12 personnages, les 6 phases d'infiltration.

Suite a une serie de sessions d'analyse critique (18-20 mars 2026), le scenario a ete entierement repense pour repondre a trois constats :

1. **Le scenario original expliquait le monde au lieu de le faire vivre au joueur.** Il fonctionnait comme un documentaire, pas comme une experience interactive.
2. **L'ecart entre l'ambition du design document (12 personnages, 6 phases) et le prototype realisable etait trop important** pour etre credible devant un jury.
3. **Le joueur n'avait aucune raison emotionnelle de jouer.** Il manquait un incident declencheur, un personnage incarne, une motivation viscerale.

La refonte vise a produire un **prototype jouable de 15-20 minutes** qui demontre le concept complet (alternance video IA / exploration 3D) avec un parcours coherent de bout en bout.

---

# 2. DIAGNOSTIC DU SCENARIO ORIGINAL

## Ce qui etait solide
- L'univers (Nexus, Arcanias, Exiles, Resistance) est riche et coherent
- La taxonomie sociale est immediatement lisible
- Le theme dystopique resonant avec l'actualite (IA, consentement, ecrans)
- Le concept d'alternance video IA / exploration 3D est original
- Les 12 personnages archétypaux sont bien développés conceptuellement

## Ce qui ne fonctionnait pas

### Structure narrative
- **Exposition frontale** : tout le worldbuilding etait livre en bloc dans l'introduction (environ 7-8 minutes de narration descriptive avant toute interaction)
- **Chronologie lineaire** : recit du passe vers le present, soit la structure la moins dramatique possible
- **Absence de personnage jouable** : aucun protagoniste defini, pas de motivation, pas d'identification
- **Pas d'incident declencheur** : rien ne provoquait l'urgence de jouer

### Ecart vision/prototype
- Le document promettait 12 personnages, 6 phases d'infiltration, un systeme de choix moraux
- Le prototype disposait de : un editeur 3D, un ecran login, un shape sorter, des salles essentiellement vides
- Le shape sorter (tri de formes geometriques dans la salle 2) etait incoherent avec l'univers dystopique

### Priorites desequilibrees
- L'editeur 3D (outil de developpement, invisible pour le joueur) avait concentre l'essentiel du temps de developpement
- Aucun parcours joueur n'existait (pas de debut, pas de milieu, pas de fin)

---

# 3. NOUVEAU SCENARIO — DECISIONS VALIDEES

## Principes directeurs de la refonte

1. **Show, don't tell.** Le joueur decouvre le monde en le vivant, pas en l'ecoutant. Le worldbuilding arrive par fragments : objets, environnements, ecrans de propagande, indices disséminés.
2. **Une motivation viscerale avant toute comprehension intellectuelle.** Le joueur doit ressentir l'urgence avant de comprendre le systeme.
3. **Narration par escalade.** Chaque revelation aggrave la precedente. Le joueur connecte les points lui-meme.
4. **Scope realiste.** Le prototype couvre un parcours lineaire complet (4 salles), pas un monde ouvert incomplet.

## Architecture narrative retenue

Le jeu alterne entre **sequences video generees par IA** et **phases de jeu interactif en 3D** (vue POV premiere personne), selon le concept multimedia central du TFE.

### Flux complet du prototype :

```
Ecran de demarrage (pseudo + choix controle)
    |
    v
Video d'introduction (~30-40 secondes)
    |
    v
SALLE 1 — Le cocoon [INTERACTIF] : reveil, decouverte de la cicatrice, puzzle d'evasion
    |
    v
SALLE 2 — Le Nexus interieur [INTERACTIF] : salle de surveillance + hall d'accueil
    |                                         propagande en narration environnementale
    |                                         puzzle du code de sortie
    v
SALLE 3 — La ville dystopique [INTERACTIF/VIDEO] : Bruxelles desertee, drones, graffitis
    |
    v
SALLE 4 — Le bunker de la Resistance [INTERACTIF/VIDEO] : arrivee, revelations, cliffhanger
    |
    v
Ecran de fin : "RESISTANCE — Chapitre 1 termine"
```

---

# 4. PERSONNAGE PRINCIPAL — RAYA

## Identite

- **Prenom :** Raya (choisi collectivement lors du brainstorming du 20 mars avec deux testeurs Gen Z et un testeur Gen X)
- **Genre :** Femme — choix narratif motive (voir ci-dessous)
- **Age :** Non defini avec precision. Jeune adulte (20-30 ans)
- **Epoque :** Bruxelles, 2040

## Pourquoi un personnage feminin

Le choix du genre n'est pas cosmetique. Il est lie au theme central du jeu :

1. **Le corps comme territoire de souverainete.** Dans une dystopie qui controle les corps (capsules sensorielles, implants synaptiques, nourriture en comprimes), une femme dont le corps reproductif est instrumentalise porte une charge symbolique supplementaire.
2. **Resonance avec le public cible (Gen Z).** Le rapport au consentement corporel ("mon corps, mon choix") et le questionnement de la maternite comme destin impose sont des marqueurs generationnels forts.
3. **Double sens du titre.** "Resistance" designe a la fois le mouvement clandestin ET le temperament du personnage. Raya est la resistance incarnee avant meme de rejoindre la Resistance.

## Backstory (non revelee dans l'intro — decouverte progressive en jeu)

Raya a grandi dans le monde d'avant les Nexus. Elle a vu :
- Ses parents et ses amis perdre leur emploi, sombrer dans la depression et se refugier dans la realite virtuelle
- Des familles entieres cesser de communiquer, isolees dans des mondes virtuels individuels
- La construction des Nexus, la propagande au materiel virtuel gratuit, la migration massive

Elle a refuse :
- Elle a manifeste, a ete arretee
- Elle a survecu seule dans Bruxelles desertee
- Elle a cultive un jardin clandestin, appris a semer les drones de surveillance
- Elle a repere les graffitis du lapin blanc (symbole de la Resistance) et commencer a les suivre

Sa capture :
- En suivant la piste des graffitis, elle a baisse sa vigilance
- Un drone de patrouille l'a reperee, une decharge electrique l'a mise inconsciente
- Elle a ete amenee dans un Nexus contre sa volonte

Ce qui lui a ete fait (inconsciente pendant ~1 an) :
- Insemination sans consentement
- Gestation sous sedation
- Extraction chirurgicale de l'enfant (cesarienne)
- Maintien en vie dans un cocoon individuel pour un usage reproductif ulterieur

## Temperament

- **Ne subit jamais.** Son premier reflexe au reveil est de chercher une sortie. Pas de panique paralysante — de l'action.
- **Connait la survie en milieu hostile.** Sait eviter les drones, se deplacer dans une ville desertee. Ces competences se manifestent en gameplay, pas en exposition.
- **N'est PAS definie par la maternite.** La grossesse forcee est une violence du systeme, pas son identite. Elle etait deja rebelle avant.
- **Defaut narratif a developper :** un trait qui cree du conflit (impulsivite ? mefiance excessive ? culpabilite d'avoir cede en entrant au Nexus ?)

## Vue POV et representation visuelle

Le jeu est en vue premiere personne. Le corps du personnage n'est pas montre en entier — seuls les mains, les bras et les gestes sont visibles. Ce choix :
- Facilite l'identification (homme ou femme, le joueur se projette)
- Evite les biais de l'IA generative sur les corps feminins (hypersexualisation, stereotypes)
- Contourne les filtres de censure des outils de generation d'images
- Reduit le risque de contradiction entre le discours du jeu (denonciation de l'alienation) et ses visuels

La cicatrice sur le ventre est vue en plan subjectif (la joueuse baisse les yeux).

---

# 5. STRUCTURE NARRATIVE DU PROTOTYPE

## Video d'introduction (~30-40 secondes)

Pas de narration explicative. Pas de voix off qui raconte l'histoire du monde. Uniquement des images et des sons :

1. Noir. Souffle. Battement de coeur assourdi.
2. Flash : une femme court dans une rue deserte. Bourdonnement de drone.
3. Flash : elle tombe. Decharge electrique. Blanc.
4. Flash : lumieres de plafonnier qui defilent (brancard, couloir).
5. Flash : porte de salle d'operation. Lumiere aveuglante.
6. Noir. Silence.
7. Son organique. Liquide. Corps qui flotte.
8. Voix synthetique : "Bienvenue, Citoyenne. Indice de bien-etre : optimal."
9. Noir.

**Transition vers le jeu.**

## Salle 1 — Le cocoon (INTERACTIF)

**Lieu :** Cocoon individuel exigu, lumiere bleutee, parois lisses et translucides.

**Objectif joueur :** S'echapper du cocoon.

**Deroulement :**
- Reveil en POV. Desorientation. Espace confine.
- Voix synthetique : "Jour 387. Session sensorielle programmee dans 4 minutes."
- Exploration : parois scellees, pas de porte, pas de fenetre.
- Decouverte d'une grille d'aeration corrodee (seule issue).
- **Puzzle 1 :** ouvrir la grille avec les moyens du bord (cables de perfusion arraches, support metallique).
- En forcant la grille, blessure a l'epaule. Sang qui coule sur le torse.
- **Moment cle :** en essuyant le sang sur son ventre, decouverte de la cicatrice chirurgicale. Pas d'explication. Pas de voix off. Silence.
- Evasion par la gaine de ventilation.

**Duree estimee :** 3-5 minutes.

## Salle 2 — Le Nexus interieur (INTERACTIF)

**Lieu :** Salle de surveillance (sombre, ecrans multiples) + Hall d'accueil (immacule, lumineux, propagande).

**Objectif joueur :** Comprendre ou il est, trouver comment sortir du batiment.

**Deroulement :**

*Salle de surveillance :*
- Dizaines d'ecrans montrant des milliers de cocoons minuscules. Corps immobiles, perfuses. Adultes uniquement.
- Un groupe d'ecrans montre un secteur different : des femmes. Certaines enceintes. D'autres avec la meme cicatrice.
- Documents, registres, notes a fouiller (indices fragmentaires).
- Question implicite : ou sont les enfants ?

*Hall d'accueil :*
- Contraste brutal : murs immacules, eclairage rassurant, ecrans de propagande.
- Videos d'accueil du Nexus en boucle (voix chaleureuse, promesses de confort) = **integration de l'Option 2** de la narration comme contenu diegetique.
- Double langage reperable : "soins dedies aux futures meres", "enfants, espoirs de la nation future, confies aux meilleurs programmes de developpement".
- Fenetres blindees (interaction possible : lancer une chaise, echec).
- **Puzzle 2 :** trouver le code de sortie au bureau d'accueil.
- Ouverture de la porte. Lumiere du jour = premier contact avec l'exterieur depuis plus d'un an.

**Duree estimee :** 5-8 minutes.

## Salle 3 — La ville dystopique (INTERACTIF + VIDEO)

**Lieu :** Bruxelles, 2040. Rues desertes, facades intactes mais vides.

**Objectif joueur :** Traverser la ville en suivant les graffitis du lapin blanc jusqu'au bunker de la Resistance.

**Deroulement :**
- Ambiance : silence, vent, bourdonnement lointain de drones.
- Indices environnementaux : affiches de propagande delavees, vitrines vides.
- Graffitis du lapin blanc sur les murs = balisage du chemin.
- **Mecanique :** eviter les drones et robots de patrouille. Choix deplacement : courir (risque) ou prudence (temps).
- Raya reconnait l'environnement instinctivement (elle vivait ici avant sa capture).
- Possibilite de flashbacks fragmentaires declenches par des lieux reconnus.

**Duree estimee :** 3-5 minutes (dependant des contraintes techniques).

**Note technique :** la faisabilite de cette salle en exploration 3D libre est encore a evaluer. Alternative : sequence video interactive avec choix de direction.

## Salle 4 — Le bunker de la Resistance (INTERACTIF + VIDEO)

**Lieu :** Sous-sol, cache derriere une entree dissimilee.

**Objectif joueur :** Decouvrir la Resistance, obtenir les premieres reponses.

**Deroulement :**
- Pour la premiere fois : des voix humaines. Des gens vivants, debout, qui parlent.
- Accueil. Questions. Quand Raya parle de la cicatrice, silence.
- Revelation : la Resistance soupconnait la disparition des enfants mais n'avait aucune preuve. Raya est la premiere preuve d'un programme de reproduction forcee.
- Le projet "GENESE" : des bribes de donnees interceptees. Des coordonnees. Un lieu.
- **Cliffhanger :** "On ne sait pas ce qu'ils font avec les enfants. Mais on sait ou ils les emmenent. Et maintenant, grace a toi, on sait pourquoi."
- Ecran noir. RESISTANCE — Chapitre 1 termine.

**Duree estimee :** 3-5 minutes.

---

# 6. WORLDBUILDING — UNIVERS ET REGLES DU MONDE

## Organisation sociale

| Groupe | Description | Statut |
|--------|-------------|--------|
| **Citoyens des Nexus** | Population generale, sous sedation dans des cocoons, nourrie par comprimes, vie sensorielle virtuelle | Prisonniers inconscients |
| **Elite des Arcanias** | Classe dominante, technologies superieures, ne se melange pas aux Nexus | Dominants |
| **Convertis** | Anciens resistants qui ont cede et rejoint les Nexus | Brises |
| **Exiles** | Refugies sur les eaux, hors d'atteinte des drones | Legende/rumeur |
| **Resistants** | Humains caches au coeur des villes, bunker souterrain | Opposition active |

## Le systeme Novaia

- **Novaia** : nom du pouvoir en place (consortium IA/elite)
- Les Nexus sont presentes comme la solution a tous les problemes : famine, pollution, insecurite
- En realite : des fermes humaines ou les adultes en age de se reproduire sont maintenus en vie
- Les personnes agees ont ete eliminees (cout energetique > rendement)
- Les enfants ont ete les premiers cibles (plasticite cerebrale)

## Les enfants — Projet GENESE

C'est le coeur de l'intrigue du jeu complet (au-dela du prototype) :

- L'IA a tout sauf un corps biologique. Elle n'a pas reussi a synthetiser un materiel ayant la plasticite et les possibilites du cerveau humain.
- Decouverte : la plasticite neuronale des enfants (cerveaux en construction) permet d'y implementer des systemes IA.
- Les enfants deja nes ont ete les premiers sujets (des milliers d'heures de donnees collectees via les ecrans).
- Etape suivante : commencer le processus des la conception pour optimiser l'implementation.
- D'ou le programme de reproduction forcee : les femmes fertiles sont utilisees comme incubatrices.
- **Le programme est RECENT.** Raya fait partie des premieres victimes. Le monde est a l'aube du basculement, pas apres.

## Les enfants augmentes — Question ouverte

Les enfants ne sont ni morts ni sauves. Ils sont devenus **autre chose** : des etres ou technologie et biologie coexistent. Ni purement humains, ni purement machines.

Cette realite pose la question centrale du jeu : **qu'est-ce qui fait de nous des humains, et a partir de quand cesse-t-on de l'etre ?**

Le prototype pose la question sans y repondre. Le jeu complet explorerait les differentes reponses possibles.

## Les anguilles — Coherence thematique

- L'IA a decouvert des anguilles electriques geantes dans les abysses (8000m+).
- Leur stimulation par flashs lumineux genere une energie massive (stress = production electrique).
- Clonage accelere = batteries biologiques renouvelables.
- **Parallele thematique :** les anguilles sont les batteries biologiques (energie), les enfants sont les processeurs biologiques (intelligence). L'IA parasite le vivant a deux niveaux.

## Le lapin blanc

- Symbole graffite par la Resistance sur les murs de la ville
- Reference assumee a Alice au Pays des Merveilles (terrier menant a un monde cache) et Matrix (follow the white rabbit / choix pilule rouge-bleue)
- Fonction narrative : balisage du chemin vers le bunker
- Question ouverte pour le jeu complet : le lapin blanc est-il toujours un guide de la Resistance, ou le systeme pourrait-il l'utiliser comme leurre ?

---

# 7. FONDEMENTS THEMATIQUES

## Theme principal : le corps comme dernier territoire de souverainete

Le jeu explore la frontiere entre technologie et humanite a travers le corps :
- Le corps enferme (cocoon)
- Le corps instrumente (reproduction forcee)
- Le corps pirate (implants synaptiques, enfants augmentes)
- Le corps libere (evasion, resistance physique)

## Resonance avec le public cible (Generation Z)

Le scenario fait echo a des preoccupations documentees de cette generation :
- **Consentement corporel** : "mon corps, mon choix" — ici viole de la facon la plus fondamentale possible
- **Rapport ambigu a la maternite** : baisse de natalite, questionnement de la maternite comme destin — ici, la maternite imposee par le systeme
- **Dependance aux ecrans** : la plasticite neuronale alteree par les ecrans est le point de depart scientifique de l'exploitation des enfants par l'IA
- **Defiance envers les institutions** : Novaia promet securite et confort, et livre asservissement

## Arc global du jeu (au-dela du prototype)

Le jeu complet parcourrait un spectre :
- **Point de depart :** dystopie totale — technologie comme outil d'asservissement
- **Progression :** decouverte, resistance, alliances, dilemmes moraux
- **Point d'arrivee (vision) :** non pas un monde sans technologie, mais la question du prix a payer pour rester humain. Un equilibre qui ne sera pas confortable.

Le prototype s'arrete au moment ou Raya rejoint la Resistance et ou la question des enfants est posee. C'est un cliffhanger naturel qui laisse le jeu complet ouvert.

---

# 8. TEST UTILISATEUR — RESULTATS DU BRAINSTORMING

## Methodologie

Le 20 mars 2026, le scenario de lecture-test a ete lu a voix haute devant trois testeurs :
- **Lou** (Gen Z, non-gameuse, profil IA-sceptique)
- **Victor** (Gen Z, gamer, profil IA-sceptique)
- **Christel** (Gen X, perspective adulte)

7 questions structurees ont ete posees individuellement apres la lecture.

## Resultats principaux

### Points d'accroche (Q1 : "A quel moment as-tu eu envie de savoir la suite ?")

Chaque profil s'est accroche a un moment different :
- **Lou :** le reveil dans le cocoon (accroche sensorielle)
- **Victor :** la decouverte de la cicatrice (accroche mystere) — "T'as envie de savoir c'est quoi, en fait ?"
- **Christel :** l'arrivee au bunker et la rencontre avec la Resistance (accroche sociale)

**Interpretation :** le scenario possede trois niveaux de hook (sensoriel, mystere, social) qui captent des profils de joueurs differents. C'est une architecture robuste.

### Mystere et non-explication (Q3)

Victor a explicitement dit que **ne pas comprendre la cicatrice immediatement etait un atout** : "Je me demande si c'est pas justement ca ce qui est cool." Il avait d'abord imagine une puce dans le cerveau, pas une grossesse. La retenue narrative fonctionne.

### Plausibilite (Q5)

Les trois testeurs trouvent le theme plausible. Lou : "Ca fait extremement Matrix." Victor : "C'est grave un sujet qui est plausible, c'est interessant." Christel : "J'espere que c'est pas possible. Mais oui, c'est quelque chose a developper."

### Unicite (remarque spontanee de Victor)

Victor a identifie le principal defi du jeu sans qu'on lui pose la question : "Il faut rendre le scenario unique. Un scenario apocalypse, ils se reveillent dans Matrix, c'est connu. Il faut apporter un truc au-dessus. C'est comme des films de dinosaures — le film de dinosaures, c'est Jurassic Park."

### Description en une phrase (Q6 — question la plus revelatrice)

- **Lou :** "C'est un jeu sur un monde dystopique avec l'IA."
- **Victor :** "Un jeu qui peut t'ouvrir a de nouvelles voies et a comprendre de nouvelles choses [...] une histoire completement dystopique."
- **Christel :** "Un monde futuriste imagine pour sauver une nouvelle nation et construire une nouvelle civilisation."

**Constat :** aucun des trois ne mentionne la cicatrice, l'enfant vole, ou la reproduction forcee — c'est-a-dire l'element differenciateur du jeu. Cela indique que cet element, bien que ressenti, n'a pas encore suffisamment imprime pour devenir LE truc qu'on retient et qu'on raconte. Le passage de la cicatrice devra etre renforce visuellement et temporellement dans le jeu (silence prolonge, pas de musique, impact maximal).

### Identification au personnage (Q7)

- **Lou :** s'est identifiee directement (femme, theme des enfants, "les personnages feminines badass, ca me parle")
- **Victor :** distinction lucide entre identification et empathie — "Je me suis pas identifie, mais je me suis mis dans sa peau. Je comprends ses choix, ses sentiments."
- **Christel :** identification a la volonte d'aller plus loin

### Comparaison avec l'ancien scenario

Victor (le seul a connaitre les deux versions) : "Celui-la est mieux. Clairement. Celui-la il est trop cool."

### Nom du personnage

Le brainstorming collectif a converge vers **Raya** :
- Court, 2 syllabes, sonore
- Commence par R comme Resistance
- Connotation "rayonnant"
- Sonne a la fois feminin et badass
- Pas de reference litteraire/cinematographique lourde

---

# 9. ETAT TECHNIQUE DU PROTOTYPE

## Stack technologique

| Composant | Technologie |
|-----------|-------------|
| Moteur 3D | Three.js r128 |
| Physique | Cannon.js |
| Langage | JavaScript vanilla (pas de bundler, pas de modules) |
| Persistance | IndexedDB (RoomEditorDB) + localStorage |
| Deploiement | GitHub Pages (branche `editor-autonome`) |
| Assets 3D | GLB (Meshy, ComfyUI pour la generation, Mixamo pour le rigging) |
| Videos | Generees par IA (outils de generation video) |

## Architecture actuelle des fichiers

```
Resistance/
|-- index.html           (ecran de demarrage, pseudo, profils)
|-- room_1.html          (salle principale — refactoree pour chargement dynamique editeur)
|-- room_2.html          (shape sorter — a transformer ou remplacer)
|-- room_model.html      (template de salle — systeme editeur bidirectionnel)
|-- editor/              (editeur 3D complet)
|   |-- editor-state.js
|   |-- editor-core.js
|   |-- editor-objects.js
|   |-- editor-camera-lights.js
|   |-- editor-audio.js
|   |-- editor-save.js
|   |-- editor-floorplan.js
|   |-- editor-utils.js
|   |-- editor.css
|   |-- editor-panel.html
|-- game/
|   |-- score-manager.js  (ScoreManager cross-rooms avec profils localStorage)
|-- 3D/                  (assets GLB)
|-- Audio/               (fichiers audio)
|-- videos/              (videos generees)
|-- images/              (textures, images)
|-- icones/              (icones UI)
|-- scene_data/          (donnees de scenes)
```

## Refactoring technique realise (mars 2026)

### 1. Chargement dynamique de l'editeur

**Probleme :** room_1.html chargeait l'editeur par defaut. La page etait tres lente et les deplacements dans la scene penibles.

**Solution :** L'editeur n'est plus charge au demarrage. Le jeu se lance en mode "jeu" uniquement. L'editeur est activable via un raccourci secret (Ctrl+Shift+C → mot de passe "editor") et desactivable par le meme raccourci.

- Les scripts editeur sont charges dynamiquement via `loadScript()` (Promises, injection de `<script>`)
- Les donnees de scene (murs, objets, lumieres) sont chargees au demarrage sans l'UI editeur
- Pattern `var` avec typeof guards pour eviter les conflits de redeclaration entre scripts inline et scripts dynamiques

### 2. Isolation des donnees par salle

Chaque salle utilise `currentRoomName` comme prefixe de cle dans IndexedDB et localStorage, permettant des donnees independantes par salle.

### 3. Systeme de score cross-rooms

ScoreManager (game/score-manager.js) gere les scores par salle avec persistance via localStorage et profils utilisateurs.

### 4. Ecran de demarrage

index.html est complet : generateur de pseudo dystopique, gestion de profils, onglets, fond anime avec particules.

## Ce qui existe et fonctionne

- **Editeur 3D complet :** floor plan builder, import GLB, gestion murs/lumieres/cameras, zones d'interaction, systeme audio multi-categories, undo/redo, sauvegarde IndexedDB
- **Ecran de demarrage :** login, pseudo, profils
- **Systeme de chargement dynamique :** editeur activable/desactivable sans recharger la page
- **Infrastructure cross-rooms :** score, donnees, navigation entre salles

## Ce qui reste a construire pour le prototype

| Element | Priorite | Statut | Complexite estimee |
|---------|----------|--------|--------------------|
| Video d'intro (30-40s) | HAUTE | A realiser | Selection + montage videos IA |
| Salle 1 — Cocoon | HAUTE | A construire | Modelisation + puzzle |
| Salle 2 — Nexus interieur | HAUTE | Partiellement existant (room_1) | Redesign + contenu narratif |
| Videos propagande Nexus | HAUTE | A realiser | Generation + integration |
| Salle 3 — Ville | MOYENNE | A evaluer techniquement | Complexe si 3D libre |
| Salle 4 — Bunker | MOYENNE | A construire | Modelisation + cinematiques |
| Integration video → 3D | HAUTE | Non commence | Technique de transition |
| Voix synthetique Nexus | MOYENNE | Non commence | TTS ou enregistrement |
| Sound design | MOYENNE | Assets existants, integration a faire | Implementation |

---

# 10. PLANNING ET PRIORITES

## Calendrier

| Date | Echeance |
|------|----------|
| 20 mars 2026 | Aujourd'hui — refonte scenario validee |
| 17 avril 2026 | Fin du stage |
| Mai-juin 2026 | Presentation TFE (date exacte a confirmer) |

## Evaluation TFE — Repartition des points

| Critere | Points | Etat actuel |
|---------|--------|-------------|
| Contenu ecrit | 20 | Non commence |
| Forme ecrite | 10 | Non commence |
| Prototype | 30 | ~10-12/30 (editeur OK, parcours joueur absent) |
| Oral | 40 | A preparer |

## Priorites ordonnees

### Priorite 1 : Parcours joueur complet (Prototype — 30 pts)

Objectif : qu'un joueur puisse lancer le jeu, vivre 15-20 minutes d'experience avec debut/milieu/fin, et comprendre le concept.

1. **Video d'intro** — selectionner et monter les videos IA existantes
2. **Salle 1 (cocoon)** — construire dans l'editeur, implementer le puzzle
3. **Salle 2 (Nexus)** — adapter room_1 existante, ajouter contenu narratif + videos propagande
4. **Transition video vers Salle 3**
5. **Salle 3 (ville)** — evaluer la faisabilite 3D vs video interactive
6. **Salle 4 (bunker)** — construire, integrer le cliffhanger

### Priorite 2 : Document ecrit (Contenu 20 pts + Forme 10 pts = 30 pts)

Commencer la redaction en parallele du developpement. Structure probable :
- Contexte et problematique
- Etat de l'art (serious games, IA generative, dystopie)
- Conception (narratif, mecanique, UX)
- Realisation technique
- Bilan et perspectives

Le document de presentation de 77 pages et ce compte rendu fournissent deja une base substantielle a restructurer.

### Priorite 3 : Preparation de l'oral (40 pts — plus gros coefficient)

- Scenario de demo live (lancer le jeu devant le jury, montrer le parcours)
- Discours structure : concept, prototype, apprentissages
- Anticipation des questions jury
- Assumer les limites avec lucidite : "le prototype montre un parcours sur X, mais l'architecture est concue pour scaler"

### Ce qu'il NE faut PAS faire

- Peaufiner l'editeur (il fonctionne, il faut l'utiliser maintenant)
- Ajouter des salles vides (mieux vaut 4 salles riches que 8 salles vides)
- Implementer les 12 personnages ou les 6 phases du design document original
- Optimiser les performances sauf si c'est bloquant pour la demo

---

# 11. DECISIONS EN SUSPENS

| Decision | Options | Impact | Echeance |
|----------|---------|--------|----------|
| Voix de Raya | Voix (metaphore resistance retrouvee) vs Mutisme (simplification technique) | Dialogues, doublage, immersion | Avant construction salle 4 |
| Salle 3 — Ville | Exploration 3D libre vs Video interactive avec choix | Complexite technique majeure | Avant developpement salle 3 |
| Sort des enfants augmentes | Dilemme moral ouvert vs Resolution narrative | Impact sur le jeu complet (pas le prototype) | Peut attendre |
| Lapin blanc | Toujours fiable vs Potentiel leurre | Structure de jeu au-dela du chapitre 1 | Peut attendre |
| Defaut de caractere de Raya | Impulsive / Mefiante / Culpabilite | Dialogues et choix de gameplay | Avant ecriture dialogues |

---

# 12. BIBLIOGRAPHIE DE REFERENCE

## Ouvrages essentiels

1. **Aldous Huxley — Le Meilleur des Mondes** (1932, ~250 p.) : modele de la dystopie par le confort. Le soma = les capsules du Nexus.
2. **Jonathan Haidt — The Anxious Generation** (2024, ~320 p.) : donnees sur l'effet des ecrans sur les cerveaux Gen Z. Ancrage scientifique de l'exploitation de la plasticite neuronale.
3. **Margaret Atwood — La Servante ecarlate** (1985, ~350 p.) : reference sur la reproduction instrumentalisee + methode narrative par fragments (applicable au jeu).

## Ouvrages complementaires

4. **Shoshana Zuboff — L'Age du capitalisme de surveillance** (2019) : fondement theorique de l'extraction des donnees comportementales.
5. **Yuval Noah Harari — Homo Deus** (2017) : transhumanisme et "dataisme".
6. **Johann Hari — Stolen Focus** (2022) : economie de l'attention et conception addictive.

## Textes courts

7. **Dostoievski — "Le Grand Inquisiteur"** (~30 p.) : liberte vs securite/confort.
8. **Neil Postman — Se distraire a en mourir** (1985, ~200 p.) : le divertissement comme outil de controle (Huxley > Orwell).
9. **Aldous Huxley — Retour au meilleur des mondes** (1958, ~150 p.) : pont entre fiction et analyse sociologique.

---

*Document genere le 20 mars 2026.*
*Derniere mise a jour : 20 mars 2026.*

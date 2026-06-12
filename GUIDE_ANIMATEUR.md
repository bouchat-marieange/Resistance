# GUIDE DE L'ANIMATEUR — RÉSISTANCE
*Activité de sensibilisation aux enjeux de l'IA — Gen Z (15-25 ans)*
*Version 1.0 — juin 2026*

---

> **Ce document est réservé à l'animateur et au développeur.**
> Il ne doit pas être distribué aux joueurs. Il contient les informations techniques, pédagogiques et pratiques pour animer une session complète de l'activité Résistance.

---

## TABLE DES MATIÈRES

1. [Vue d'ensemble du jeu](#1-vue-densemble-du-jeu)
2. [Flux d'une session complète](#2-flux-dune-session-complète)
3. [Description détaillée de chaque partie du jeu](#3-description-détaillée-de-chaque-partie-du-jeu)
4. [Les 12 enjeux IA — personnages et thèmes de discussion](#4-les-12-enjeux-ia--personnages-et-thèmes-de-discussion)
5. [Gestion technique — problèmes fréquents](#5-gestion-technique--problèmes-fréquents)
6. [Panneau d'administration (réservé animateur/développeur)](#6-panneau-dadministration-réservé-animateurdéveloppeur)
7. [Outils physiques disponibles](#7-outils-physiques-disponibles)
8. [Phase 4 — Atelier de cocréation](#8-phase-4--atelier-de-cocréation)
9. [Fiches à photocopier](#9-fiches-à-photocopier)

---

## 1. VUE D'ENSEMBLE DU JEU

### Qu'est-ce que Résistance ?

**Résistance** est un jeu sérieux 3D jouable dans un navigateur web (Three.js). Il s'adresse à la Gen Z (15-25 ans) pour la sensibiliser aux **enjeux de l'intelligence artificielle** : biais algorithmiques, opacité, dépendance affective, manipulation de l'attention, droits d'auteur, coût écologique, IA militaire, capitalisme de surveillance, etc.

Le jeu s'inscrit dans une approche **ni technophobe, ni naïve** : la technologie n'est pas présentée comme le mal absolu, mais son **usage économique et politique** est mis en question. L'objectif est de **redonner confiance en l'esprit critique**, pas de culpabiliser les joueurs.

### L'héroïne : Raya

Le joueur incarne **Raya**, une rebelle qui s'est éveillée à l'existence contrôlée dans un **cocoon** (capsule en forme de smartphone — reflet métaphorique du téléphone). Elle s'échappe du système **Novaia** (système d'asservissement numérique) et rejoint le **bunker de la Résistance**, où elle rencontre 12 personnages, chacun incarnant un enjeu de l'IA.

**Raya ne subit jamais** — elle résiste, agit, choisit. Son arc narratif : PEUR → CONNAISSANCE → ACTION → ESPOIR.

### Ce que le jeu n'est pas

- Pas une dystopie paralysante (Résistance montre aussi l'alternative)
- Pas un discours moralisateur (le joueur découvre par lui-même)
- Pas technophobe (la tech n'est pas le problème, son usage économique l'est)

### Public cible

Gen Z, 15-25 ans. Peut être utilisé en : lycée, haute école, centre culturel, bibliothèque, maison de jeunes, festival numérique.

---

## 2. FLUX D'UNE SESSION COMPLÈTE

Une session Résistance se déroule en **4 phases** :

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 (optionnelle)
Briefing   Jeu PC   Débat     Atelier créatif
15-20 min  45-60    20-30     45-60 min
           min      min
```

### Phase 1 — Introduction et accompagnement (15-20 min)

**Objectif** : mettre les joueurs en condition, recueillir leurs représentations initiales.

**Ce que fait l'animateur** :
- Présenter l'activité sans en révéler les enjeux (ne pas spoiler)
- Distribuer une **fiche anonyme de ressentis** (optionnel) : « Qu'est-ce que l'IA pour toi ? », « Ça t'inquiète ? Ça t'enthousiasme ? »
- Expliquer les contrôles (voir section 5)
- Préciser que l'activité contient des **vidéos générées par IA** — intentionnellement, c'est une mise en abyme
- Rassurer : pas de bonne ou mauvaise façon de jouer

**À dire aux joueurs** :
> « Vous allez incarner Raya. Elle s'est réveillée dans un monde qu'elle ne reconnaît plus. Ce que vous allez découvrir dans le jeu reflète des réalités documentées — pas de la science-fiction. Prenez le temps d'observer. »

### Phase 2 — Jeu individuel sur PC (45-60 min)

**Objectif** : expérience immersive personnelle.

- Les joueurs jouent individuellement ou en petits groupes selon le matériel disponible
- L'animateur **circule**, observe, répond aux questions techniques
- Ne pas intervenir dans les choix narratifs — laisser les joueurs explorer
- Si un joueur bloque : voir section 5 « Problèmes fréquents »

**À surveiller** :
- Réactions émotionnelles fortes → noter pour le débat
- Joueurs qui terminent rapidement → proposer de rejouer en prenant le temps de lire
- Joueurs en difficulté avec les contrôles → voir aide clavier section 5

### Phase 3 — Animation post-jeu (20-30 min)

**Objectif** : débriefing d'abord émotionnel, puis intellectuel.

**Ordre recommandé** :
1. « Comment vous sentez-vous ? » (émotionnel d'abord)
2. « Qu'est-ce qui vous a surpris ? »
3. « Avez-vous reconnu des situations réelles ? »
4. Approfondissement par thème (voir section 4)
5. Mise en perspective avec des données réelles (presse, études)

**Réinjecter les ressentis anonymes** collectés en phase 1 si disponibles.

### Phase 4 — Atelier de cocréation (45-60 min, optionnel)

**Objectif** : passer de spectateur à créateur. Les joueurs imaginent leur propre salle du bunker.

Voir section 8 et 9 pour le détail complet.

---

## 3. DESCRIPTION DÉTAILLÉE DE CHAQUE PARTIE DU JEU

### Écran de démarrage (`index.html`)

Le joueur crée un profil (pseudo) ou reprend une session existante. L'onglet **Reprendre** affiche la dernière salle visitée et la date de la dernière session.

La **vidéo d'introduction** (~ 5 min) se lance automatiquement à la première connexion. Elle présente le monde de Novaia et l'éveil de Raya. Elle ne se rejoue pas aux sessions suivantes — le joueur reprend directement où il s'était arrêté.

> **Note animateur** : si la vidéo doit être rejouée (groupe qui n'a pas pu la voir), rafraîchir la page et utiliser un nouveau pseudo temporaire, OU voir panneau admin pour effacer le profil.

Un **bouton discret « Passer l'intro »** (coin inférieur droit) est disponible pendant la vidéo. Une confirmation s'affiche : déconseiller aux joueurs de sauter — la vidéo pose le contexte émotionnel essentiel.

### Mini-jeu Boîte Noire / Nexus (`test-blackbox.html`)

Ce mini-jeu est le **cœur du prototype**. Il simule le déchiffrage d'un algorithme de décision au sein du Nexus.

**Phases du mini-jeu** :
1. **Intro** — contextualisation narrative
2. **Choix** — le joueur choisit entre deux approches (chemin humain ou chemin IA)
3. **Décodeur** — résolution du puzzle de déchiffrage
4. **Processing** — animation de traitement
5. **Confirmation / Comparaison** — les deux chemins sont comparés
6. **Brain** — conséquence neurologique/humaine montrée
7. **Succès ou Échec** — scoring

**Enjeu pédagogique** : montrer l'opacité des algorithmes de décision et l'importance de comprendre ce qui se passe « dans la boîte noire ».

Après ce mini-jeu, une **vidéo de transition** (Raya débloquant une porte) mène vers Bruxelles dystopique.

**Points de lucidité** : 15 à 100 points selon le chemin choisi et les décisions prises.

### Sas de sécurité (`sas_securite.html`)

Première salle 3D complète du bunker. Le joueur y rencontre **Naby** (enjeu : déshumanisation des rapports sociaux, IA affective).

- Touche **T** : ouvrir le dialogue avec Naby
- Touche **E** / **R2 manette** : interagir avec les objets

### Autres salles (en développement)

| Fichier | Salle | Personnage | Statut |
|---------|-------|-----------|--------|
| `sas_securite.html` | Sas de sécurité | Naby | ✅ Jouable |
| `test-blackbox.html` | Nexus / Boîte Noire | — | ✅ Jouable |
| `bruxelles_dystopique.html` | Bruxelles dystopique | — | 🔧 En cours |
| `la_villa.html` | La Villa | — | 🔧 Placeholder |
| Autres salles bunker | — | Eliott, Ilan, Dr Naïa, Sky, Iona, Ruby, Fox, Alex, Kat, Maze, Falcon | 📋 Planifié |

---

## 4. LES 12 ENJEUX IA — PERSONNAGES ET THÈMES DE DISCUSSION

> Pour chaque personnage : l'enjeu IA, les sous-thèmes à aborder en débat, et des questions amorces.

---

### 1. NABY — Sas de sécurité
**Âge** : 40 ans  
**Enjeu IA** : Déshumanisation des rapports sociaux — IA affective

**Sous-thèmes** :
- Applications comme Replika, Character.ai : simulation d'empathie
- Peut-on tomber amoureux d'une IA ? Est-ce une relation réelle ?
- Ce que ça révèle de la solitude contemporaine
- Les entreprises qui monétisent le besoin d'affection

**Questions amorces** :
- « Avez-vous déjà préféré parler à un chatbot plutôt qu'à quelqu'un ? »
- « Une IA peut-elle vraiment comprendre ce que vous ressentez ? »
- « Que se passe-t-il si l'entreprise ferme le service ? »

**Lien réel** : En 2023, un utilisateur belge a développé une relation affective avec un chatbot sur Replika pendant 6 mois. Quand l'entreprise a modifié l'IA suite à des plaintes, il a vécu cela comme une rupture.

---

### 2. ELIOTT — Chambre du bunker
**Âge** : 17 ans  
**Enjeu IA** : Santé mentale des adolescents & réseaux sociaux

**Sous-thèmes** :
- Corrélation documentée entre usage intensif des écrans courts et dégradation des fonctions attentionnelles (Nguyen et al., 2025 — 71 études, N=98 299)
- Algorithmes de recommandation qui maximisent l'engagement, pas le bien-être
- Documents internes de Meta et TikTok qui prouvent qu'ils savaient (Frances Haugen, 2021)
- La neuroplasticité : le cerveau peut se reconstruire (6-8 semaines)

**⚠️ Note de rigueur** : NE PAS dire « diminution de la matière grise ». L'IRM 2025 montre une **augmentation** du volume du cortex orbitofrontal. Ce qui est documenté : une **corrélation** (pas une causalité) avec la dégradation du contrôle inhibiteur (r = −.41).

**Questions amorces** :
- « Combien d'heures par jour passez-vous sur votre téléphone ? »
- « Avez-vous déjà eu du mal à vous concentrer sur quelque chose qui ne bouge pas ? »
- « Si les apps savent que ça nuit aux ados, pourquoi ne changent-elles pas ? »

---

### 3. ILAN — Le Cinéma / La Galerie
**Âge** : 30 ans  
**Enjeu IA** : IA générative & droits d'auteur

**Sous-thèmes** :
- Scraping massif d'œuvres d'art sans consentement (base LAION-5B : 5 milliards d'images)
- Les artistes dont le style est copié sans rémunération ni crédit
- La dilution du travail créatif humain
- Qui possède une image générée par IA ?
- La mise en abyme du jeu lui-même (les vidéos de Résistance sont générées par IA)

**Questions amorces** :
- « Si une IA reproduit le style d'un artiste vivant, est-ce du vol ? »
- « Devrait-on interdire d'entraîner des IA sur des œuvres sans permission ? »
- « Les vidéos que vous venez de voir dans le jeu ont été générées par IA — qu'est-ce que ça change pour vous ? »

---

### 4. DR NAÏA — Le Labo / La Serre-Jardin
**Âge** : 50 ans  
**Enjeu IA** : Coût écologique de l'IA

**Sous-thèmes** :
- Data centers : consommation d'eau et d'énergie (IEA 2024)
- Extractivisme minier pour les composants (cobalt, lithium, terres rares)
- Une requête ChatGPT consomme ~10x plus d'énergie qu'une recherche Google
- Les promesses « green » des GAFAM vs la réalité
- L'IA comme outil de transition écologique (double face)

**Questions amorces** :
- « Savez-vous que générer une image par IA consomme autant d'énergie que charger son téléphone ? »
- « Qui paie le coût écologique du numérique ? »
- « Peut-on utiliser l'IA pour résoudre des problèmes environnementaux, tout en réduisant son impact ? »

---

### 5. SKY — Le Temple
**Âge** : 31 ans  
**Enjeu IA** : Captologie & économie de l'attention

**Sous-thèmes** :
- Captologie (BJ Fogg, 2003) : science de la persuasion par le design
- Le modèle Motivation / Capacité / Déclencheur des apps
- L'atrophie de l'esprit critique par la sur-stimulation
- Les dark patterns (interfaces conçues pour tromper)
- Notifications, scroll infini, like — tous conçus pour créer de l'addiction

**Questions amorces** :
- « Connaissez-vous le terme « captologie » ? »
- « Avez-vous remarqué des moments où vous avez scrollé sans vous en apercevoir ? »
- « Qui a dessiné l'interface de votre app préférée et dans quel but ? »

---

### 6. IONA — La Bibliothèque
**Âge** : 19 ans  
**Enjeu IA** : Biais culturels, hallucinations, biais de genre & rapport au corps

**Sous-thèmes** :
- Sur-représentation des données anglo-occidentales dans les LLM
- Hallucinations (l'IA invente des faits avec confiance)
- Biais de genre : les IA reproduisent les stéréotypes présents dans leurs données
- Deepfakes sexuels non consentis (majoritairement subis par des femmes)
- Rapport au corps, consentement, image de soi

**Questions amorces** :
- « Avez-vous déjà demandé à une IA quelque chose sur votre culture et obtenu une réponse fausse ? »
- « Une IA est-elle neutre ? Qui décide de ce qu'elle apprend ? »
- « Comment réagiriez-vous si un deepfake de vous circulait en ligne ? »

---

### 7. RUBY — La Planque / Cybersécurité
**Âge** : 21 ans  
**Enjeu IA** : Capitalisme de surveillance (Zuboff)

**Sous-thèmes** :
- Collecte de données comportementales pour prédire et modifier les comportements
- Profilage : comment vos données créent un portrait plus précis que celui que vous faites de vous-même
- L'opacité algorithmique : pourquoi vous voyez ce que vous voyez sur les réseaux
- Les 42 États américains qui ont poursuivi Meta en justice
- La différence entre vie privée et secret

**Questions amorces** :
- « Saviez-vous que vos apps connaissent votre état émotionnel mieux que vos amis ? »
- « Avez-vous déjà vu une pub qui semblait lire dans vos pensées ? »
- « À qui appartiennent vos données ? »

---

### 8. FOX — Salle Cartographie
**Âge** : 36 ans  
**Enjeu IA** : Reconnaissance faciale & deepfakes

**Sous-thèmes** :
- Reconnaissance faciale en espace public (Chine, Royaume-Uni, expérimentations en Belgique)
- Taux d'erreur plus élevés sur les visages féminins et racisés
- Deepfakes : vidéos truquées à des fins politiques ou sexuelles
- Le droit à l'anonymat dans l'espace public

**Questions amorces** :
- « Êtes-vous à l'aise à l'idée d'être reconnu dans la rue par une caméra ? »
- « Avez-vous déjà vu un deepfake réaliste ? Comment l'avez-vous repéré ? »
- « Faut-il interdire la reconnaissance faciale dans l'espace public ? »

---

### 9. ALEX — L'Atelier
**Âge** : 24 ans  
**Enjeu IA** : Obsolescence & travailleurs du clic

**Sous-thèmes** :
- Les travailleurs du clic (Kenya, Madagascar, Philippines) qui étiquettent les données pour 1-3$/heure
- Exposition à des contenus violents ou pornographiques sans soutien psychologique (Time, 2023)
- E-déchets : où finissent nos téléphones ?
- L'automatisation qui déplace les emplois peu qualifiés

**Questions amorces** :
- « Saviez-vous que l'IA a besoin d'humains invisibles pour fonctionner ? »
- « Qu'est-ce qui est juste dans le rapport au travail quand les serveurs sont en Europe mais les travailleurs en Afrique ? »
- « Que faites-vous de vos vieux téléphones ? »

---

### 10. KAT — Salle Entraînement
**Âge** : 25 ans  
**Enjeu IA** : Concentration GAFAM & monopoles

**Sous-thèmes** :
- 5 entreprises (Google, Apple, Meta, Amazon, Microsoft) contrôlent l'infrastructure numérique mondiale
- Rachat systématique des startups concurrentes
- Disparition des « communs numériques » (Wikipedia, forums, projets open source)
- L'AI Act européen (2024) comme tentative de régulation

**Questions amorces** :
- « Pouvez-vous passer une journée sans utiliser un service GAFAM ? »
- « Est-il possible qu'une alternative aux grandes plateformes existe et survive ? »
- « Qui devrait décider des règles du numérique ? »

---

### 11. MAZE — Salle Équipement / Armurerie
**Âge** : 42 ans  
**Enjeu IA** : IA militaire & armes autonomes

**Sous-thèmes** :
- Systèmes Lavender et Gospel : IA israélienne qui sélectionne les cibles de bombardement (Gaza)
- Drones autonomes capables de décider sans humain
- La déresponsabilisation : qui est coupable quand une IA tue ?
- Conventions internationales en retard sur la technologie

**Questions amorces** :
- « Une machine peut-elle décider de tuer ? »
- « Qui est responsable si un drone autonome fait une erreur ? »
- « Faut-il une convention internationale interdisant les armes autonomes létales ? »

---

### 12. FALCON — Le Noyau / Salle Conseil
**Âge** : 56 ans  
**Enjeu IA** : Gouvernance algorithmique & démocratie

**Sous-thèmes** :
- Décisions automatisées qui affectent la vie des gens (crédit, logement, justice prédictive)
- L'AI Act européen (2024) : premier cadre légal mondial
- Le droit d'être jugé par un humain
- La démocratie face à l'optimisation algorithmique

**Questions amorces** :
- « Seriez-vous à l'aise que votre demande de logement soit traitée uniquement par une IA ? »
- « Une IA peut-elle être plus juste qu'un humain ? »
- « Qui doit écrire les lois qui régulent l'IA ? »

---

## 5. GESTION TECHNIQUE — PROBLÈMES FRÉQUENTS

### Contrôles clavier (par défaut)

| Action | Clavier | Manette PS4 |
|--------|---------|-------------|
| Avancer | Z | Stick gauche ↑ |
| Reculer | S | Stick gauche ↓ |
| Gauche | Q ou A | Stick gauche ← |
| Droite | D ou E | Stick gauche → |
| S'accroupir | Ctrl | Rond (O) |
| Courir | Shift | L1 |
| Interagir | E (ou F) | R2 |
| Ouvrir une porte | F | R1 |
| Carte | M | R3 |
| Indices | ? | L3 |
| Inventaire | I | Options |
| Pause | Barre d'espace | Share |
| Dialogue Naby | T | — |

> **Attention** : il n'y a **pas de touche Saut**. La barre d'espace est réservée à la **Pause**. Si un joueur demande comment sauter : il n'y a pas de saut dans ce jeu.

### Problèmes fréquents et solutions

**Le joueur ne voit qu'un écran noir**
→ Attendre le chargement (la scène 3D peut prendre 10-30 sec selon la machine).  
→ Si ça dure plus d'une minute : rafraîchir la page (F5). Le profil est sauvegardé.

**La vidéo d'introduction ne se lance pas**
→ Version locale : vérifier que le fichier `videos/Introduction complete OK.mp4` est bien présent.  
→ Version en ligne : vérifier la connexion internet (la vidéo charge depuis YouTube).  
→ Si la vidéo reste bloquée sur le chargement : cliquer sur « Passer l'intro » (coin bas-droit).

**Le joueur ne peut pas se déplacer**
→ Vérifier que le joueur a cliqué UNE FOIS dans la fenêtre de jeu pour capturer le pointeur.  
→ Appuyer sur Échap pour libérer le pointeur, puis recliquer dans la fenêtre.

**Le joueur est bloqué dans une géométrie**
→ Appuyer sur Pause (barre d'espace), puis reprendre.  
→ Si le problème persiste : rafraîchir la page. Le profil est sauvegardé automatiquement.

**L'audio ne fonctionne pas**
→ Vérifier que le son n'est pas coupé dans le navigateur (icône haut-parleur dans l'onglet).  
→ Les navigateurs bloquent parfois l'audio avant une interaction. Cliquer une fois dans la fenêtre.

**Le joueur a perdu son pseudo / son profil n'apparaît plus**
→ Les profils sont sauvegardés dans le navigateur (localStorage). Si le navigateur a effacé les données (navigation privée, effacement du cache) le profil peut disparaître.  
→ L'animateur peut restaurer un fichier de sauvegarde via le panneau admin (voir section 6).

**Le jeu est très lent**
→ Fermer les autres onglets du navigateur.  
→ Utiliser de préférence **Chrome** ou **Edge** (meilleur support WebGL).  
→ Sur machines anciennes : baisser la résolution de la fenêtre du navigateur.

**Un joueur a vu du contenu qui l'a perturbé**
→ Les thèmes traités (santé mentale, exploitation, IA militaire) peuvent toucher certains joueurs personnellement.  
→ Avoir un espace pour en parler en privé, en dehors du groupe.  
→ Ne pas minimiser ni insister : « Tu peux en parler avec moi après si tu veux. »

---

## 6. PANNEAU D'ADMINISTRATION (RÉSERVÉ ANIMATEUR/DÉVELOPPEUR)

### Accès

Depuis l'écran de démarrage (`index.html`) :  
**Ctrl + Shift + Alt + P**

> ⚠️ Ce raccourci **n'est pas listé** dans les contrôles du jeu. Il est invisible pour les joueurs. Ne pas le taper devant eux.

### Fonctions disponibles

**Vue des profils**
- Liste tous les comptes créés avec :
  - Pseudo
  - Date de la dernière session
  - Dernière salle visitée
  - Score de lucidité (points accumulés)

**Exporter les profils (JSON)**
- Bouton « Exporter »
- Génère un fichier `resistance-profiles-AAAA-MM-JJ.json` téléchargé automatiquement
- **À faire avant chaque purge** pour garder une archive

**Restaurer depuis un fichier JSON**
- Bouton « Restaurer »
- Deux modes :
  - **Remplacer** : écrase tous les profils actuels par le fichier importé
  - **Fusionner** : le fichier importé a priorité sur les doublons (pseudo identique)
- Utiliser pour récupérer des profils après suppression accidentelle

**Purger tous les comptes**
- Supprime TOUS les profils du navigateur
- Double confirmation requise (sécurité)
- **À faire entre deux groupes** pour repartir à zéro
- ⚠️ Toujours exporter d'abord si vous voulez conserver une trace

### Routine recommandée entre deux sessions

1. Ouvrir le panneau admin (Ctrl + Shift + Alt + P)
2. Exporter les profils (archive)
3. Purger tous les comptes
4. Fermer le panneau

---

## 7. OUTILS PHYSIQUES DISPONIBLES

### Cartes physiques AI Mythology

**Qu'est-ce que c'est ?**  
Un jeu de cartes illustrées (format type cartes à collectionner) représentant des archétypes d'IA. Chaque carte présente un personnage IA avec ses caractéristiques, ses forces et ses limites.

**Comment les utiliser en animation ?**
- **Amorce de discussion** : distribuer une carte par joueur ou par groupe. « Cette IA, comment vous sentez-vous face à elle ? »
- **Parallèle avec le jeu** : certaines cartes font écho aux personnages du bunker (ex : IA affective → Naby)
- **Vote silencieux** : poser les cartes sur une table, demander aux joueurs de se positionner physiquement près de celle qui les préoccupe le plus

**Moment d'utilisation recommandé** : début de phase 3 (débat), pour ancrer la discussion dans quelque chose de tangible après l'expérience numérique.

---

### Arbre décisionnel du mini-jeu Nexus

**Qu'est-ce que c'est ?**  
Un schéma imprimé représentant tous les chemins possibles dans le mini-jeu « Boîte Noire » (test-blackbox.html) : les deux grandes voies (chemin humain / chemin IA), les sous-choix, et les points de lucidité associés.

**Comment l'utiliser ?**
- **Après le mini-jeu** : montrer l'arbre aux joueurs pour qu'ils voient les chemins qu'ils n'ont pas empruntés
- **Débat** : « Pourquoi avez-vous choisi cette voie ? Que pensez-vous de l'autre ? »
- **Discussion sur l'opacité algorithmique** : « Dans la vraie vie, on n'a pas cet arbre. On ne sait pas ce que l'algorithme décide. »

---

### Feuilles d'atelier Phase 4 (à photocopier)

Voir section 9 pour les modèles complets.

| Feuille | Contenu | Format |
|---------|---------|--------|
| Matrice personnage | Nom, âge, apparence, valeurs, enjeu IA | A4 |
| Plan de salle | Grille quadrillée + légende | A4 |
| Fiche thème IA | Thème, pourquoi, lien IA, sources | A4 |
| Carte d'identité personnage | Description + espace dessin | A4 |
| Description de salle | Texte + espace dessin | A4 |

---

## 8. PHASE 4 — ATELIER DE COCRÉATION

### Objectif

Après avoir **joué** dans un bunker conçu par quelqu'un d'autre, les joueurs **créent leur propre salle** du bunker. Cela active une forme d'appropriation : ils ne sont plus spectateurs d'un enjeu IA, ils en deviennent les narrateurs.

### Déroulement recommandé (45-60 min)

#### Étape 1 — Débranchée (25-30 min)

Les joueurs travaillent sur papier, sans écran. Groupes de 2-4 personnes recommandés.

**Consignes à donner** :
1. Choisir UN enjeu de l'IA qui vous touche ou vous préoccupe
2. Inventer un personnage qui incarne cet enjeu dans le bunker de la Résistance
3. Imaginer la salle que ce personnage habite
4. Remplir les fiches (voir section 9)

**Rôle de l'animateur** :
- Circuler, poser des questions pour stimuler la créativité
- Ne pas corriger — toutes les idées sont valides
- Rappeler le ton du jeu si nécessaire : ni technophobe, ni naïf

**Questions de relance** :
- « Votre personnage a-t-il des alliés ? Des contradictions internes ? »
- « Est-ce qu'il y a quelque chose dans cette salle qui représente l'enjeu de manière visuelle, sans le nommer ? »
- « Comment se sent un joueur qui entre dans cette salle pour la première fois ? »

#### Étape 2 — IA (optionnel, 15-20 min)

Si du matériel est disponible, les joueurs peuvent utiliser des outils IA pour :
- Générer une image de leur personnage (Midjourney, DALL-E, etc.)
- Générer une description ou un dialogue (ChatGPT, Claude, etc.)
- Comparer le résultat avec ce qu'ils avaient imaginé

**Objectif pédagogique de cette étape** :
- Observer les biais dans les représentations générées (genre, ethnie, posture)
- Pratiquer le prompting en constatant l'écart entre l'intention et le résultat
- Expérimenter concrètement la mise en abyme (créer avec l'IA pour parler des enjeux de l'IA)

**Questions de relance** :
- « L'IA a-t-elle représenté votre personnage comme vous l'aviez imaginé ? »
- « Y a-t-il des stéréotypes dans l'image générée ? »
- « Qui a vraiment créé ce personnage : vous ou l'IA ? »

#### Étape 3 — Partage et discussion (10-15 min)

Chaque groupe présente sa salle en 2-3 minutes. Les autres peuvent réagir.

Questions de clôture :
- « Quel enjeu vous a semblé le plus urgent à mettre en avant ? »
- « Qu'avez-vous appris sur cet enjeu en essayant de l'expliquer à travers un personnage ? »

---

## 9. FICHES À PHOTOCOPIER

> Les fiches suivantes sont à imprimer et distribuer pour la Phase 4. Chaque groupe reçoit un jeu complet.

---

### FICHE 1 — MATRICE PERSONNAGE

```
╔══════════════════════════════════════════════════════════════════╗
║                    MON PERSONNAGE DU BUNKER                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Nom du personnage : _________________________________________   ║
║                                                                  ║
║  Âge : __________   Genre : ______________                       ║
║                                                                  ║
║  Origine / Parcours :                                            ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  Apparence physique (3 détails marquants) :                      ║
║  1. _________________________________________________________    ║
║  2. _________________________________________________________    ║
║  3. _________________________________________________________    ║
║                                                                  ║
║  Valeurs (ce en quoi il/elle croit profondément) :               ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  Ce qu'il/elle a vécu avec l'IA (son histoire personnelle) :     ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  L'ENJEU IA qu'il/elle incarne :                                 ║
║  [ ] Biais algorithmiques      [ ] Droits d'auteur               ║
║  [ ] Santé mentale             [ ] Coût écologique               ║
║  [ ] Surveillance              [ ] Deepfakes                     ║
║  [ ] IA affective              [ ] Travailleurs du clic          ║
║  [ ] Captologie                [ ] Monopoles GAFAM               ║
║  [ ] IA militaire              [ ] Gouvernance                   ║
║  [ ] Autre : ____________________________________________________║
║                                                                  ║
║  En une phrase, ce personnage dit aux joueurs :                  ║
║  _____________________________________________________________   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

### FICHE 2 — DESSIN / DESCRIPTION DU PERSONNAGE

```
╔══════════════════════════════════════════════════════════════════╗
║               MON PERSONNAGE — VISUEL ET DESCRIPTION             ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  DESSIN (portrait, tenue, expression, détails importants) :      ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  DESCRIPTION (ce que le joueur ressent en le/la rencontrant) :   ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  Première chose qu'il/elle dit au joueur :                       ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  Ce que le joueur comprend après cette rencontre :               ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

### FICHE 3 — MA SALLE DU BUNKER (plan)

```
╔══════════════════════════════════════════════════════════════════╗
║                    MA SALLE DU BUNKER — PLAN                     ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Nom de la salle : __________________________________________    ║
║                                                                  ║
║  PLAN VU DU DESSUS (dessiner les murs, les objets, les zones) :  ║
║                                                                  ║
║  ┌─────────────────────────────────────────────────────────┐    ║
║  │                                                         │    ║
║  │                                                         │    ║
║  │                                                         │    ║
║  │                                                         │    ║
║  │                                                         │    ║
║  │                                                         │    ║
║  │                                                         │    ║
║  │                                                         │    ║
║  │                                                         │    ║
║  │                                                         │    ║
║  └─────────────────────────────────────────────────────────┘    ║
║                                                                  ║
║  LÉGENDE des objets dessinés :                                   ║
║  A. _____________  B. _____________  C. _____________           ║
║  D. _____________  E. _____________  F. _____________           ║
║                                                                  ║
║  Entrée(s) de la salle : _____________________________________   ║
║  Sortie(s) vers :         _____________________________________   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

### FICHE 4 — DESCRIPTION DE LA SALLE

```
╔══════════════════════════════════════════════════════════════════╗
║                MA SALLE DU BUNKER — DESCRIPTION                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Ambiance générale (couleurs, lumière, sons, odeurs...) :        ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  Les 3 objets les plus importants et leur symbolique :           ║
║                                                                  ║
║  Objet 1 : ___________________________________________________   ║
║  → Ce qu'il représente : _____________________________________   ║
║                                                                  ║
║  Objet 2 : ___________________________________________________   ║
║  → Ce qu'il représente : _____________________________________   ║
║                                                                  ║
║  Objet 3 : ___________________________________________________   ║
║  → Ce qu'il représente : _____________________________________   ║
║                                                                  ║
║  Ce que le joueur doit FAIRE dans cette salle (le mini-défi) :   ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  Ce que le joueur repart avec (objet, info, émotion...) :        ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  DESSIN (vue intérieure, perspective, ambiance) :                ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

### FICHE 5 — ENJEU IA ET LIEN AVEC MON PERSONNAGE

```
╔══════════════════════════════════════════════════════════════════╗
║              L'ENJEU IA — COMPRENDRE ET RELIER                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  L'enjeu IA que j'ai choisi :                                    ║
║  _____________________________________________________________   ║
║                                                                  ║
║  En mes mots, qu'est-ce que c'est ? (expliquer simplement) :     ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  Pourquoi cet enjeu m'a-t-il touché(e) ou préoccupé(e) ?        ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  Un exemple réel que je connais (actualité, vécu, film...) :     ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  Comment mon personnage est-il touché personnellement par cet    ║
║  enjeu ? (son histoire, sa blessure, sa force) :                 ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  Quelle question cet enjeu pose-t-il aux joueurs ?               ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
║  Est-ce qu'il y a quelque chose de positif possible face à cet   ║
║  enjeu ? (une solution, une résistance, une alternative) :       ║
║  _____________________________________________________________   ║
║  _____________________________________________________________   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## ANNEXE — RAPPEL POSITIONS PÉDAGOGIQUES CLÉS

### Ce que Résistance affirme (avec rigueur)

- Il existe une **corrélation documentée** entre l'usage intensif des courtes vidéos et la dégradation des fonctions attentionnelles *(Nguyen et al., 2025 — 71 études, N=98 299)*
- Les grandes plateformes **savaient** que leurs algorithmes nuisaient aux adolescents — les documents internes (Frances Haugen / Meta, documents TikTok 2024) le prouvent
- Le **capitalisme de surveillance** (Zuboff) est un modèle économique réel et documenté
- Les **biais dans les données d'entraînement** des IA sont documentés et mesurables

### Ce que Résistance n'affirme pas

- Pas de causalité directe prouvée entre écrans et dommages cérébraux
- ❌ Ne jamais dire « diminution de la matière grise » — l'IRM 2025 (Gao et al.) montre une **augmentation** du volume dans le cortex orbitofrontal
- L'IA n'est pas le mal — son **usage économique et politique** peut l'être

### Le ton à maintenir

- **Ni technophobe, ni naïf** : les joueurs ne doivent pas partir avec l'idée qu'il faut « tout arrêter »
- **Ni culpabilisant** : ne pas pointer du doigt les comportements des joueurs
- **Esprit critique positif** : « Vous pouvez comprendre et agir » — pas « Vous êtes victimes »

---

*Guide rédigé dans le cadre du TFE de Marie-Ange Bouchat, ISFSC Bruxelles, 2026.*  
*Document réservé à un usage pédagogique interne.*

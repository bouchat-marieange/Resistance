# RÉSISTANCE — Synthèse consolidée du projet
## Base de connaissance pour discussions Claude AI
*Compilée le 8 avril 2026 à partir de l'ensemble des documents du projet*

---

## 0. COMMENT UTILISER CE DOCUMENT

Ce fichier est la **porte d'entrée unique** pour toute nouvelle session de travail sur Résistance. Il synthétise en un seul endroit ce qui est dispersé dans 15+ fichiers. En cas de doute sur un point précis, les sources originales restent dans le dossier du projet.

---

## 1. IDENTITÉ DU PROJET

| Élément | Valeur |
|---|---|
| **Titre** | Résistance |
| **Étudiante** | Marie-Ange Bouchat, ISFSC Bruxelles, Écriture Multimédia |
| **Promotrice** | Sophie Haine |
| **Type** | Prototype de jeu sérieux 3D navigateur — TFE |
| **Soutenance** | Juin 2026 |
| **Stage** | Termine le 17 avril 2026 |
| **Évaluation** | Écrit 20pts / Forme 10pts / Prototype 30pts / Oral 40pts |

**Problématique officielle :**
> Comment un jeu sérieux peut-il sensibiliser la Gen Z aux enjeux de l'IA en combinant narration immersive et mise en pratique interactive, **sans discours moralisateur ni dystopie paralysante** ?

---

## 2. CONCEPT EN 3 PHRASES

**Résistance** est un jeu sérieux 3D navigateur (Three.js) destiné à la Gen Z pour la sensibiliser aux **enjeux de l'IA** (biais, opacité, dépendance, manipulation, droits d'auteur, coût écologique, etc.). Le joueur incarne **Raya**, rebelle évadée d'un cocoon (miroir du smartphone), et rencontre dans le bunker de la Résistance **12 personnages incarnant chacun un enjeu de l'IA**. Chaque rencontre se fait en deux temps : **sensibilisation** (dialogue + vidéo générée par IA, mise en abyme) puis **mise en pratique** (micro-défi 3D scoré).

---

## 3. STACK TECHNIQUE

- **Moteur 3D :** Three.js r128
- **Physique :** Cannon.js
- **Langage :** JavaScript vanilla (pas de bundler, pas de modules)
- **Déploiement :** GitHub Pages, branche `editor-autonome`
- **Assets 3D :** GLB — généré via Meshy/ComfyUI, rigging Mixamo
- **Vidéos :** générées par IA (Sora, Runway, Kling)
- **Vibe coding :** Claude Code comme partenaire de développement
- **Persistance :** IndexedDB (RoomEditorDB) + localStorage
- **Éditeur 3D maison :** `editor.html` / `editor.js` — fonctionnel et complet

---

## 4. SCÉNARIO v2 (PIVOT MARS 2026 — DÉFINITIF)

### 4.1 Héroïne : Raya

- Rebelle **capturée de force**, pas une victime volontaire
- A refusé le Nexus, manifesté, été arrêtée, a survécu seule dans Bruxelles désertée
- Cultivait un jardin clandestin (= cœur symbolique — relation non-extractive au vivant)
- Suivait les graffitis du lapin blanc (Résistance) quand un drone l'a capturée
- **Insémination sans consentement** pendant sa captivité (~9 mois sous sédation)
- Se réveille dans un cocoon avec une cicatrice chirurgicale comme seul indice
- Tempérament : **ne subit jamais, résiste par nature** — double sens du titre
- Vue POV (mains/bras visibles, corps non montré entier) — choix anti-hypersexualisation

### 4.2 Architecture du monde

```
ARCANIAS (centres de décision — Élites)
    │ Collectent données, décident contenus, pilotent le programme enfants
    ▼
NEXUS (centres de consommation — utilisateurs)
    │ Consomment le virtuel, données remontent vers Arcanias
    ▼
COCOONS (les cellules — miroirs du smartphone)
    │ Maintiennent les corps, captent biométrie, anesthésient
    ▼
ENFANTS (les ressources — cerveaux remodelés par le contenu)
```

- **Novaïa = LE SYSTÈME** (pas l'IA elle-même) — architecture d'exploitation capitaliste de surveillance poussée à son terme
- **Nexus** = centres de consommation (utilisateurs subissent)
- **Arcanias** = centres de DÉCISION (Élites pilotent, collectent, décident)
- **Exilés** = réfugiés hors d'atteinte des drones (légende/rumeur)
- **Résistance** = humains cachés dans des bunkers souterrains

### 4.3 Pivots philosophiques (sessions Rodin, mars 2026)

1. **PAS de dystopie pure** — dénoncer ET préfigurer. L'horizon constructif existe.
2. **Modèle dominateur vs partenarial** (Riane Eisler) — Novaïa = dominateur / bunker = partenarial
3. **Transhumanisme inversé** — enfants **diminués** par le contenu, pas augmentés par des puces (études IRM réelles)
4. **Solarpunk comme germe dans les décombres** — jardin, bunker, liens
5. **Cocoon = miroir du smartphone** — rectangle coins arrondis, écrans, caméra, micro, capteurs
6. **Raya brise la caméra en premier geste** = briser la surveillance + transformer l'outil de contrôle
7. **Captologie (Fogg)** = fondement théorique du cocoon et du Nexus
8. **Servitude volontaire (La Boétie 1576)** = les utilisateurs du Nexus défendent leur prison
9. **Faux dilemme** : anesthésie vs privation. Troisième chemin = technologie au service du lien/sens/vivant

### 4.4 Les 4 salles du prototype

| Salle | Espace | Durée | Enjeu |
|---|---|---|---|
| 1 | **Le Cocoon** | 3-5 min | S'échapper (puzzle grille aération, découverte cicatrice) |
| 2 | **Le Nexus intérieur** | 5-8 min | Comprendre le mensonge, trouver la sortie (puzzle code) |
| 3 | **La ville dystopique** | 3-5 min | Traverser, éviter drones, suivre graffitis lapin blanc |
| 4 | **Le bunker de la Résistance** | 3-5 min | Arrivée, premières réponses, cliffhanger "Projet GENESE" |

Les 4 salles = les 4 étapes de la récupération (cocoon = détox forcée / nexus = lucidité / ville = vide du réel / bunker = nouveau cadre)

---

## 5. LES 12 PERSONNAGES × ENJEUX IA × SALLES

| # | Personnage | Âge | Salle | Enjeu IA porté |
|---|---|---|---|---|
| 1 | **Naby** | 40 | Sas sécurité / Entrée bunker | IA affective & chatbots (Replika, Character.ai, para-social) |
| 2 | **Eliott** | 17 | Sas sécurité / Chambre | Santé mentale ado & réseaux sociaux (Gao 2025, Nguyen 2025) |
| 3 | **Ilan** | 30 | Le Cinéma / La Galerie | IA générative & droits d'auteur (LAION, scraping, originalité) |
| 4 | **Dr Naïa** | 50 | Le Labo / La Serre-Jardin | Coût écologique de l'IA (eau, énergie, extractivisme minier) |
| 5 | **Sky** (ex-Kayo) | 31 | Le Temple | Captologie & économie de l'attention (Fogg, design persuasif, servitude volontaire) |
| 6 | **Iona** | 19 | Chambre / La Bibliothèque | Biais culturels & hallucinations (sur-représentation occidentale, LLM), biais de genre & diversité, rapport au corps & consentement |
| 7 | **Ruby** | 21 | La Planque / Cybersecurity | Capitalisme de surveillance (Zuboff, profilage, boîte noire) |
| 8 | **Fox** | 36 | Salle Cartographie | Reconnaissance faciale & deepfakes (surveillance urbaine, biométrie) |
| 9 | **Alex** | 24 | L'Atelier | Obsolescence & travailleurs du clic (Kenya, Madagascar, e-déchets) |
| 10 | **Kat** | 25 | Salle Entraînement | Concentration du pouvoir GAFAM (monopoles, communs numériques) |
| 11 | **Maze** | 42 | Salle Équipement / Armurerie | IA militaire & armes autonomes (Lavender/Gospel, déresponsabilisation) |
| 12 | **Falcon** | 56 | Le Noyau / Salle Conseil | Gouvernance algorithmique (AI Act, démocratie vs optimisation) |

**Progression pédagogique :** PEUR → CONNAISSANCE → ACTION → ESPOIR
**Zones :** 0-400 Bunker · 400-800 Planque · 800-1200 Entraînement · 1200-1600 Noyau · 1600+ Mission

---

## 6. INCOHÉRENCES EN SUSPENS (à trancher avec Marie-Ange)

### 6.1 Serre-Jardin en surface vs verger souterrain
- Plan des salles : Serre-Jardin au niveau 0 (surface)
- Doc 78p : "verger souterrain" — incompatible avec les drones de surveillance
- **Options** : (A) deux espaces distincts (Dr Naïa = hydro souterrain / jardin de Raya = surface risqué), (B) serre camouflée en surface (résistance par le faire), (C) souterrain avec lumière naturelle (puits/fibres optiques)

### 6.2 Transhumanisme inversé absent des 12 personnages
- Thème central du scénario v2 mais liste construite en décembre 2025 (avant Rodin)
- **Candidats** : Eliott (ado cassé par les contenus, preuve que récupération possible) ou Iona (éducation/transmission cassée)
- Eliott le plus cohérent : son micro-défi pourrait montrer cogniticement ce que le système lui a fait

### 6.3 Accueil de Naby incohérent avec Raya méfiante
- Naby = spécialiste IA affective → risque de jouer le rôle de chatbot bienveillant
- Raya arrive blessée, méfiante, NE cherche pas d'initiation
- **Tension dramaturgique proposée** : Raya lit les techniques de Naby comme de la manipulation → choc de compétences → la relation se mérite dans la durée

### 6.4 Captologie portée par quel personnage ?
- Sky (Temple/attention/spiritualité) est la proposition la plus cohérente
- Mais attention : captologie ≠ économie de l'attention. C'est une théorie du **design comportemental**
- Alternative : la captologie est dans l'architecture du monde (cocoon, nexus) et n'a pas besoin d'un personnage explicite

### 6.5 Modèle partenarial/matriarcats pas encore incarnés
- Mosuo, Minangkabau, Bribri mentionnés en références mais absents du gameplay
- **Piste** : dimension transversale du bunker (organisation des salles, gouvernance par Falcon, cercle de Naby) plutôt qu'un 13e personnage

---

## 7. CADRE THÉORIQUE COMPLET

### 7.1 Diagnostic du système (pourquoi les gens entrent dans le Nexus)
- **Professeur Jang** (consumérisme comme contrôle) : le Nexus répond au vide — distraction, identité, appartenance
- **La Boétie, Discours de la servitude volontaire (1576)** : les utilisateurs défendent leur prison
- **Byung-Chul Han, Psychopolitique (2014)** : panoptique numérique, auto-exploitation volontaire

### 7.2 Mécanisme de capture
- **BJ Fogg, Persuasive Technology (2003)** : triade fonctionnelle (outil/média/acteur social), captologie
- **Tristan Harris / Center for Humane Technology** : "course vers le fond du tronc cérébral", machine à sous
- **Shoshana Zuboff, L'Âge du capitalisme de surveillance (2019)** : extraction → prédiction → modification comportementale

### 7.3 Preuves scientifiques du transhumanisme inversé
- **Gao et al., NeuroImage (2025)** [n=111] : modifications structurelles du cerveau par les vidéos courtes, 500+ gènes, vulnérabilité maximale à l'adolescence
- **Nguyen et al., Psychological Bulletin (2025)** [n=98 299, 71 études] : association négative modérée sur performance cognitive, significative sur santé mentale
- **Cincinnati Children's Hospital (2024)** : épaisseur corticale réduite (empathie, cognition sociale)
- **ABCD Study NIH (2024-2025)** [n=9 538, longitudinal] : modifications architecture cérébrale, lien causal via médiation
- **MIT Media Lab, "Your Brain on ChatGPT" (2025)** [EEG] : dette cognitive, connectivité neuronale la plus faible dans le groupe LLM
- **Harvard PS2 PAL (2025)** [RCT] : l'IA AVEC cadre pédagogique double l'apprentissage → preuve du troisième chemin

### 7.4 Preuves que les Big Tech SAVENT
- **Project Mercury (Meta, 2019)** : lien causal trouvé en interne, enterré ("causal impact on social comparison")
- **Frances Haugen / Facebook Files (2021)** : 13,5% ado filles → idées suicidaires aggravées, Meta a menti au Sénat
- **TikTok, documents accidentellement déscellés (2024)** : 260 vidéos = seuil d'addiction, effets cognitifs documentés en interne
- **YouTube** : document interne "built with the intention of being addictive"
- **Les Élites protègent leurs enfants** : Jobs, Gates, Thiel, cadres Google/Apple → écoles Waldorf, zéro technologie avant 14 ans
- **42 États américains** poursuivent en justice pour dommages intentionnels (2025-2026)
- **Zuckerberg sous serment** (février 2026)

### 7.5 Alternative constructive (le bunker)
- **Riane Eisler, The Chalice and the Blade (1987)** : modèle partenarial vs dominateur
- **Heide Goettner-Abendroth, Matriarchal Societies (2012)** : sociétés matrilinéaires comparées
- **Peggy Reeves Sanday, Women at the Center (2002)** : Minangkabau — "le pouvoir est au centre, pas au sommet"
- Sociétés de référence : Mosuo (Chine), Minangkabau (Indonésie), Bribri (Costa Rica), Khasi (Inde), Navajo (USA)

### 7.6 Pourquoi le jeu sérieux fonctionne
- **Transportation Theory (Green & Brock, 2000)** : l'immersion narrative contourne les défenses
- **Inoculation Theory (McGuire 1961 ; Cambridge Go Viral! 2020)** : exposer aux mécanismes de manipulation = vaccin — 74% meilleure détection après 5-7 min de jeu
- **Self-Determination Theory (Deci & Ryan)** : autonomie + compétence + relation → motivation intrinsèque durable
- **Psychological Reactance (Brehm, 1966)** : le discours moralisateur provoque l'effet boomerang
- **Harvard algorithmic cynicism (2025)** : savoir ne suffit pas — il faut une expérience qui transforme

---

## 8. DONNÉES CLÉS SUR LA GEN Z (pour la partie écrite et l'oral)

### Usage
- **95%** des ados 13-17 ans ont un smartphone (Pew 2025)
- **8h39/jour** de médias (hors école) pour les 13-18 ans (Common Sense 2021)
- **82%** des adultes Gen Z utilisent des chatbots IA (Yahoo/YouGov 2025)
- **260 vidéos / 35 minutes** = seuil d'addiction TikTok (données internes)
- **10%** des Gen Z utilisent un chatbot "comme petit(e) ami(e)" (Gallup 2025)

### Le paradoxe Gen Z
- **79%** pensent que l'IA rend les gens plus paresseux
- **74%** l'utilisent quand même
- **16%** l'utilisent même quand c'est interdit explicitement
- C'est la servitude volontaire de La Boétie en version 2026

### Intervention efficace
- Réduire l'usage **problématique** : très efficace (d = 1,47)
- Réduire le **temps d'écran brut** : peu efficace (d = 0,15)
- → Ce n'est pas la quantité qui compte, c'est la qualité de l'usage

---

## 9. LES ENTRETIENS À RÉALISER

### 9.1 Interviewés prévus et leur angle

| Personne | Poste | Angle TFE | Type de matière |
|---|---|---|---|
| **Brieuc Guffens** | Responsable publications Média Animation ASBL | Cadre critique des biais IA dans les médias visuels (outil 2025 "Dans le regard de l'IA", 5 approches 2020) | Théorique + pédagogique |
| **Axelle Zanichelli** | Psychopédagogue ISFSC | Données empiriques 756 étudiants belges face à l'IAg — profilage "optimisateurs vs prudents" (52/48), dimension genre | Empirique académique |
| **Alyssia Ricci** | Chargée de mission CSEM | Terrain concret 12-25 ans, ateliers biais IA + diversité + genre (8 maisons de jeunes) | Terrain + outils |

**Triangulation :** Guffens = théorie / Zanichelli = données / Ricci = pratique terrain

### 9.2 Documents à préparer pour les entretiens (à faire)
- [ ] Présentation courte du TFE (1 page max pour les interviewés)
- [ ] Mail de demande d'entretien
- [ ] Tronc commun de questions (valables pour les 3)
- [ ] Questions spécifiques par profil

---

## 10. ÉTAT TECHNIQUE DU PROTOTYPE (mars 2026)

### Ce qui existe et fonctionne
- Éditeur 3D complet (floor plan, import GLB, murs/lumières/caméras, audio, undo/redo, IndexedDB)
- Écran de démarrage (login, pseudo dystopique, profils)
- Chargement dynamique de l'éditeur (activable via Ctrl+Shift+C + mot de passe)
- Infrastructure cross-rooms (score, données, navigation)

### Ce qui reste à construire
| Élément | Priorité | Statut |
|---|---|---|
| Vidéo d'intro (30-40s) | HAUTE | À réaliser |
| Salle 1 — Cocoon | HAUTE | À construire |
| Salle 2 — Nexus intérieur | HAUTE | Partiellement (room_1 à redesigner) |
| Vidéos propagande Nexus | HAUTE | À réaliser |
| Intégration vidéo → 3D | HAUTE | Non commencé |
| Salle 3 — Ville | MOYENNE | À évaluer techniquement |
| Salle 4 — Bunker | MOYENNE | À construire |
| Voix synthétique Nexus | MOYENNE | Non commencé |

### État du score prototype
Prototype : ~10-12/30 (éditeur OK, parcours joueur absent)

---

## 11. DÉCISIONS EN SUSPENS

| Décision | Options | Impact | Urgence |
|---|---|---|---|
| Voix de Raya | Voix (métaphore résistance retrouvée) vs Mutisme (simplification technique) | Dialogues, doublage, immersion | Avant salle 4 |
| Salle 3 — Ville | Exploration 3D libre vs Vidéo interactive avec choix | Complexité technique majeure | Avant dev salle 3 |
| Serre-Jardin | Double espace / surface camouflée / souterrain lumineux | Cohérence avec drones, thème jardin | Avant salle 4 |
| Eliott ou Iona | Qui porte l'arc transhumanisme inversé ? | Dialogues, micro-défi | Avant rédaction dialogues |
| Accueil Naby | Chaleureux (incohérent) vs Tendu/mérité (cohérent avec Raya) | Premier contact joueur/bunker | URGENT |
| Défaut de caractère de Raya | Impulsivité / Méfiance excessive / Culpabilité | Dialogues et choix de gameplay | Avant écriture dialogues |

---

## 12. JUSTIFICATIONS MÉTHODOLOGIQUES (pour l'oral et le jury)

### Pourquoi le desktop et pas le mobile ?
1. **Cohérence du message** : un jeu qui critique l'hyper-attention ne peut pas être joué sur le medium qui la produit
2. **Deep attention vs hyper-attention** (Hayles, 2007) : l'ordi impose un acte délibéré
3. **La Gen Z joue aussi sur PC** pour les expériences immersives : 42% / 15,2h semaine
4. **Contexte pédagogique** : salles informatiques, enseignant présent

### Pourquoi une pipeline 100% IA-assistée ?
- **Cohérence** : un jeu sur l'IA est produit avec l'IA
- **Démonstration du troisième chemin** : l'IA comme tuteur (Harvard PS2 PAL), pas comme béquille (MIT dette cognitive)
- **L'étudiante reste chef d'orchestre** : direction artistique, scénario, game design, intégration = 100% humain
- **"Vibe coding"** (Karpathy, 2025) = mot de l'année Collins 2025 : le développeur dirige, l'IA exécute

### La phrase pour le jury
> Résistance utilise les mêmes mécanismes que les plateformes (immersion, identification, boucle de récompense) mais les retourne : au lieu de capturer l'attention pour l'exploiter, il la mobilise pour éveiller la conscience critique.

---

## 13. BIBLIOGRAPHIE OPÉRATIONNELLE

### Indispensables (à citer en soutenance)
- Huxley A., *Le Meilleur des Mondes* (1932) — le soma = les capsules du Nexus
- Atwood M., *La Servante écarlate* (1985) — méthode narrative par fragments applicable au jeu
- Eisler R., *The Chalice and the Blade* (1987) — modèle partenarial/dominateur
- Zuboff S., *L'Âge du capitalisme de surveillance* (2019)
- Fogg B.J., *Persuasive Technology* (2003)
- La Boétie É. de, *Discours de la servitude volontaire* (1576) — gratuit, 60 pages
- Han B.-C., *Psychopolitique* (2014)
- Haidt J., *The Anxious Generation* (2024)

### Études scientifiques à maîtriser
- Gao et al., *NeuroImage* 2025 (cerveau + vidéos courtes)
- Nguyen et al., *Psychological Bulletin* 2025 (98 299 participants)
- Kosmyna et al., MIT Media Lab 2025 (dette cognitive, EEG)
- Kestin & Miller, *Scientific Reports* Harvard 2025 (PS2 PAL, IA-tuteur)
- ABCD Study NIH 2024-2025 (longitudinal, 9 538 ados)

### Références exclues intentionnellement
- *1984* (Orwell) : Résistance fonctionne par le confort, pas la terreur
- *Matrix* / *Black Mirror* : déjà connus, moins de poids devant un jury académique

---

## 14. NOTES POUR RODIN

- Marie-Ange a tendance à **sur-concevoir avant de produire** — lui rappeler le prototype jouable quand pertinent
- Elle est **Gen X en cours avec des Gen Z** : position d'observation particulière, à valoriser en soutenance
- Le projet a 3 ans de développement — une vraie trajectory à raconter
- Les 3 sessions Rodin de mars 2026 ont été déterminantes : ne pas revenir sur les pivots validés sauf raison forte
- La **Pro-Human AI Declaration** (Future of Life Institute) est volontairement exclue du TFE (conflit d'intérêts FLI documenté)

---

*Compilé le 8 avril 2026 — Source : ensemble des fichiers .md du projet Résistance*
*Fichiers source : CLAUDE.md, COMPTE-RENDU-REFONTE-SCENARIO.md, analyse-captologie-cocoon-smartphone.md, analyse-croisee-jang-resistance.md, biblio-resistance.md, etat-des-lieux-gen-z-ecrans-ia.md, etat-des-lieux-genz-ia-2026.md, etudes-internes-enterrees-big-tech.md, sensibilisation-gen-z-methodes.md, pro-human-ai-declaration-analyse.md, justification-pipeline-ia-creatif.md, justification-desktop-vs-mobile.md + fichiers mémoire : project_scenario_v2.md, characters_ia_issues.md, tfe_interviews_documentation.md, user_profile.md*

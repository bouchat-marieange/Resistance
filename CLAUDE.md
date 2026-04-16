# Resistance — Contexte projet (TFE Marie-Ange Bouchat)

> Fichier chargé automatiquement par Claude Code au démarrage d'une session dans ce dossier. **Garder compact.** Les contenus longs vivent dans `~/.claude/projects/C--Users-marie-Desktop-Resistance/memory/`.

## Identité
- **Marie-Ange Bouchat**, étudiante Écriture Multimédia, ISFSC Bruxelles
- **TFE** : prototype de jeu sérieux 3D — soutenance **juin 2026**
- **Promotrice** : Sophie Haine
- **Évaluation** : Écrit 20 / Forme 10 / Prototype 30 / Oral 40
- Stage jusqu'au 17 avril 2026, puis 3-4 semaines de finition avant soutenance

## Projet en 3 phrases
**Resistance** est un jeu sérieux 3D navigateur (Three.js) destiné à la Gen Z pour la sensibiliser aux **enjeux de l'IA** (biais, opacité, dépendance, manipulation, droits d'auteur, coût écologique, etc.). Le joueur incarne **Raya**, rebelle évadée d'un cocoon (miroir du smartphone), et rencontre dans le bunker de la Résistance **12 personnages incarnant chacun un enjeu de l'IA**. Chaque rencontre se fait en deux temps : **sensibilisation** (dialogue + vidéo générée par IA, mise en abyme) puis **mise en pratique** (micro-défi 3D scoré).

## Problématique
Comment un jeu sérieux peut-il sensibiliser la Gen Z aux enjeux de l'IA en combinant narration immersive et mise en pratique interactive, **sans discours moralisateur ni dystopie paralysante** ?

## Parti pris (non-négociable)
- **Ni technophobie, ni naïveté** : la technologie n'est pas le mal — son **usage économique** l'est (Zuboff, docs internes Meta/TikTok).
- **Éco-féminisme / solarpunk** : dénoncer ET préfigurer. Raya = rebelle active, pas victime.
- **Modèle partenarial vs dominateur** (Riane Eisler). Bunker = laboratoire partenarial.
- **Transhumanisme inverse** : enfants **diminués par le contenu**, pas augmentés par des puces (études IRM, neuroplasticité).
- Objectif : **redonner confiance en l'esprit critique**, pas culpabiliser.

## Stack technique
- Three.js r128, Cannon.js, vanilla JS, **pas de bundler**, GitHub Pages
- Pipeline assets : Meshy / ComfyUI (objets 3D), Mixamo (rigging), vidéo IA (dialogues personnages)
- Branche de travail : `editor-autonome`
- Un éditeur 3D maison existe (voir `editor.html`, `editor.js`, `EDITOR_README.md`)

## Les 12 personnages et leurs enjeux IA
Voir tableau détaillé : `~/.claude/projects/C--Users-marie-Desktop-Resistance/memory/characters_ia_issues.md`

Résumé : Naby (déshumanisation des rapports sociaux), Eliott (santé mentale ado), Ilan (droits d'auteur / IA générative), Dr Naïa (coût écologique), **Sky** (ex-Kayo, captologie), Iona (biais culturels / hallucinations / biais de genre & diversité / rapport au corps & consentement), Ruby (capitalisme de surveillance), Fox (reconnaissance faciale / deepfakes), Alex (obsolescence / travailleurs du clic), Kat (concentration GAFAM), Maze (IA militaire), Falcon (gouvernance algorithmique).

## Mémoires persistantes (à lire au besoin, pas en bloc)
Fichiers dans `~/.claude/projects/C--Users-marie-Desktop-Resistance/memory/` :
- `user_profile.md` — profil Marie-Ange
- `project_scenario_v2.md` — scénario v2 (Rodin mars 2026), Raya rebelle, cocoon=smartphone, enfants-processeurs, Novaia = le système
- `tfe_interviews_documentation.md` — base documentaire interviews (Guffens, Zanichelli, Ricci)
- `characters_ia_issues.md` — tableau 12 personnages × enjeux IA × salles (à créer si absent)
- `feedback_pas_naif_sur_tech.md` — ne pas être naïve sur les géants tech

## Documents de travail clés (hors repo code)
- `C:\Users\marie\Desktop\TFE Résistance\Echange Sophie Haine Promotrice TFE\Résistance - Projet TFE - ... Présentation détaillée complète.pdf` — doc 78p promotrice (décembre 2025)
- `C:\Users\marie\Desktop\plan pieces.pdf` — plan des salles du bunker
- `C:\Users\marie\Desktop\TFE Résistance\presentation-tfe-interviews.md` — présentation courte pour interviewé·e·s

## Conventions de travail avec Claude
1. **Ne pas inventer** de contenu scénaristique : si une info manque, demander ou lire le PDF promotrice.
2. **Toujours lire** `project_scenario_v2.md` avant une discussion narrative.
3. **Coder avant sur-concevoir** : Marie-Ange a tendance à sur-développer le worldbuilding ; rappeler le gameplay jouable quand pertinent.
4. **Éviter de dupliquer** les gros docs dans les réponses : citer les chemins.
5. Français par défaut.

## Incohérences connues (à résoudre avec Marie-Ange)
- Serre-Jardin en surface (plan) vs "verger souterrain" (doc 78p) — contradiction avec drones de surveillance.
- Le Hub et Salle Cartographie : salles nouvelles, pas dans la doc 78p.
- Captologie (Fogg) pas explicitement attribuée à un personnage → suggestion : **Sky**.
- Thème "enfants-processeurs" (scénario v2) pas encore mappé sur un des 12 personnages → candidats : Eliott ou Iona.
- Références matriarcales (Mosuo, Minangkabau, Bribri) pas encore incarnées dans le bunker.

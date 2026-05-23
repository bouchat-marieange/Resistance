# Résistance — Jeu sérieux 3D

**Résistance** est un jeu sérieux 3D navigateur destiné à la Gen Z pour la sensibiliser aux enjeux de l'intelligence artificielle : biais, opacité algorithmique, dépendance, manipulation, droits d'auteur, coût écologique et gouvernance.

Le joueur incarne **Raya**, une rebelle évadée d'un système de confinement numérique appelé le Nexus. Elle rejoint le bunker de la Résistance, où elle rencontre douze personnages incarnant chacun un enjeu de l'IA. Chaque rencontre se déroule en deux temps : une phase de sensibilisation (dialogue + vidéo), puis une mise en pratique interactive (micro-défi scoré).

---

## Stack technique

- **Three.js r128** — moteur 3D WebGL
- **Cannon.js** — physique
- **Vanilla JS** — aucun bundler
- **GitHub Pages** — hébergement statique
- Pipeline assets : Meshy, ComfyUI, Mixamo, IA générative

---

## Structure du projet

```
index.html                  → Écran d'accueil
sas_securite.html           → Salle 1 — Naby (déshumanisation des liens sociaux)
la_villa.html               → Salle 2 — ...
cocoon_nexus.html           → Décor du Nexus
hall_entree_nexus.html      → Hall d'entrée Nexus
salle_controle_nexus.html   → Salle de contrôle Nexus
bruxelles_dystopique.html   → Séquence d'introduction
AI Mythology - mini jeu/    → Mini-jeu arcade intégré
scene_data/                 → Données de scène (JSON)
3D/                         → Assets 3D (GLB)
audios/ / videos/ / images/ → Assets médias
game/                       → Modules JS gameplay
dialogues/                  → Scripts de dialogue avec annotations TTS
editor.html                 → Éditeur 3D interne (hors jeu)
```

---

## Droits et propriété intellectuelle

© 2026 Marie-Ange Bouchat — Tous droits réservés.

Ce projet est un travail de fin d'études (TFE) réalisé dans le cadre du cursus **Écriture Multimédia** à l'**ISFSC — Institut Supérieur de Formation Sociale et de Communication**, Bruxelles.

**Aucune réutilisation, copie, modification, distribution ou exploitation commerciale** de ce code, de ces assets ou de ces contenus n'est autorisée sans l'accord écrit préalable de l'auteure.

Les assets tiers (bibliothèques open source, modèles 3D sous licence, polices) restent soumis à leurs licences respectives.

Contact : polygon.catcher@gmail.com

---

## Promotrice TFE

Sophie Haine — ISFSC Bruxelles

Soutenance : juin 2026

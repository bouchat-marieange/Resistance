# BRIEFING GRAPHIQUE — test-blackbox.html
## Jeu "Boîte Noire" (mini-jeu TFE Résistance)

> **À lire avant toute modification.**  
> Ce fichier est un jeu HTML5 standalone. Le code JS gère toute la logique.  
> **Ne modifier que le CSS visuel.** Ne toucher ni au JS, ni aux sélecteurs marqués `⚠ INTOUCHABLE`.

---

## 1. CONCEPT EN 3 LIGNES

Le joueur doit déchiffrer un code de 6 caractères caché sous des icônes sur une carte d'activation, puis l'entrer pour déverrouiller le NEXUS. Il peut utiliser le **lexique** (déchiffrement manuel) ou le **décodeur IA** (automatique mais faillible). Le jeu mesure la **lucidité critique** face à l'IA.

---

## 2. RÈGLES ABSOLUES

### ⚠ NE JAMAIS TOUCHER
- Tout le **JavaScript** (bloc `<script>` en fin de fichier)
- Les sélecteurs CSS `body[data-phase="X"] ...` — ils pilotent l'affichage selon la phase de jeu
- Les règles `display: none` / `display: flex` liées à `.bb-phase`, `.dscreen-state`, `#alarm-overlay`, `#choice-btn-lex`, `#choice-btn-dec`, `#choice-info-bar`, `#brain-decode-col`
- La propriété `pointer-events` sur `#decoder-machine`
- Les règles `body.gamepad-mode ...` (support manette)
- La fonction `equalizeDecoderToLex()` et son CSS associé : `body[data-phase="choice"] #decoder-img { height: auto; max-width: 100%; }` — le JS calcule la largeur dynamiquement
- La règle `#decoder-screen { left: 10.8%; top: 21%; width: 78.2%; height: 53%; }` — calibrée sur l'image 1980×1114 px

### ✎ MODIFIABLE LIBREMENT
- Couleurs, tailles de police, padding, margin, border-radius, box-shadow, gap
- Taille des cartes (`.intro-card-wrap`, `.nexus-card`)
- Taille des cellules du lexique (`.lex-cell`, icônes SVG, `.lex-char`)
- Style des boutons (`.intro-start-btn`, `.choice-method-btn`, `.bb-btn`, `.alarm-retry`)
- Apparence du lexique (`.lex-panel`, `.lex-panel-title`)
- Textes du titre et de la description (HTML seulement, pas les IDs ni `onclick`)
- Background et layout de `#nexus-scene`, `#phase-intro`

---

## 3. PALETTE ET TYPOGRAPHIE

| Rôle | Valeur |
|------|--------|
| Turquoise néon (bordures, glows) | `#00E5FF` |
| Turquoise doux (éléments UI) | `#00B4D8` |
| Texte principal | `#1a2638` |
| Fond blanc | `#ffffff` |
| Police monospace | `'JetBrains Mono'` |
| Police titres | `'Bebas Neue'` |
| Background image | `images/Images jeu Nexus/background-jeu-nexus-web.png` |

---

## 4. BARRE DE NAVIGATION DEV (à ignorer)

`#dev-toolbar` — barre violette en haut (40 px). Permet de sauter directement à n'importe quel écran. **Complètement ignorable** pour le travail graphique, elle sera retirée en production.

Boutons : `0·Intro` → `0·Choix` → `1A·Cerveau` → `1B·Décodeur` → `2·Traitement` → `3·Confirmation` → `4·Comparaison` → `✓ Succès` → `⚡ Alarme`.

---

## 5. CARTE DES ÉCRANS

### ÉCRAN 0-1 — "But du jeu" (`data-phase="intro"`)
**Accès dev :** bouton `0·Intro`  
**Structure :** overlay plein écran sur le fond du jeu (`#phase-intro`)

| Élément | ID / Classe | Description |
|---------|------------|-------------|
| Bloc texte | `.intro-text-block` | Conteneur titre + description, centré, sans fond |
| Titre | `.intro-title` | "PROTOCOLE DE DÉCRYPTAGE DES CODES D'ACCÈS" — Bebas Neue |
| Description | `.intro-desc` | 2 phrases explicatives — JetBrains Mono |
| Rangée cartes | `.intro-cards-row` | Flex row : carte gauche + flèche + carte droite |
| Carte gauche | `.intro-card-wrap` (1er) | Hauteur pilotée par `clamp(240px, …, 590px)` |
| Image carte gauche | `.card-img` dans `.intro-card-wrap` | Carte cryptée (`Carte-activation-cryptée-web.png`) |
| Icônes sur carte | `#intro-input-icons` | Icônes Lucide générées par JS — ne pas supprimer |
| Flèche animée | `.intro-arrow-css` | 3 chevrons CSS animés (`arrowFlow`) |
| Carte droite | `.intro-card-wrap` (2e) | Hauteur identique à la gauche |
| Image carte droite | `.card-img` dans `.intro-card-wrap` | Carte code (`Code-ouverture-Nexus-web.png`) |
| Points d'interrogation | `.intro-qmarks` | "??????" — JetBrains Mono |
| Bouton action | `.intro-start-btn` | "DÉCRYPTER ▸" — fond blanc, bordure néon |

---

### ÉCRAN 0-2 — "Choix de méthode" (`data-phase="choice"`)
**Accès dev :** bouton `0·Choix`  
**Structure :** `#nexus-scene` passe en colonne ; `#center-zone` devient une grille CSS 2 colonnes

| Élément | ID / Classe | Description |
|---------|------------|-------------|
| Barre titre | `#choice-info-bar` | Colonne centrée en haut (cachée hors phase choix) |
| Titre méthode | `.choice-bar-title` | "CHOISISSEZ VOTRE MÉTHODE DE DÉCRYPTAGE" |
| Description conséquences | `.choice-bar-desc` | Correct → accès / Incorrect → alarme |
| Note non-définitif | `.choice-not-final` | Italique, discret |
| **Colonne gauche :** | | |
| Bouton lexique | `#choice-btn-lex` → `.choice-method-btn` | "Je déchiffre moi-même avec le lexique" |
| Panel lexique | `#lex-panel` | Fond blanc, bordure turquoise, ombre |
| Bannière titre lex | `.lex-panel-title` | "// LEXIQUE D'ACCÈS" — fond #00B4D8, parallélogramme |
| Hint souris | `#lex-hint` | "Cliquez pour marquer…" — petit texte turquoise |
| Grille lexique | `.lex-grid` (#lex-grid) | Grille 6×6, 36 cellules (JS-générées) |
| Cellule lexique | `.lex-cell` × 36 | Icône (22×22) + label caractère en dessous |
| Icône dans cellule | `svg` dans `.lex-cell` | 22×22 px, stroke `#2a3a4a` |
| Label caractère | `.lex-char` | "0"–"9", "A"–"Z" — turquoise `#00B4D8` |
| **Colonne droite :** | | |
| Bouton décodeur | `#choice-btn-dec` → `.choice-method-btn` | "J'utilise le décodeur IA" |
| Décodeur (appareil) | `#decoder-wrap` | Image + écran superposé |
| Image décodeur | `#decoder-img` | `decodeur-ecran-vierge-web.png` — largeur calculée par JS |
| Écran décodeur | `#decoder-screen` | Superposé en `%` sur l'image — ★ CALIBRATION |
| Contenu écran idle | `#dscreen-idle` | Icône cadenas + "DÉCODEUR IA" + "Insérer carte activation" |

---

### ÉCRAN 1A — "Déchiffrement manuel" (`data-phase="brain"`)
**Accès dev :** bouton `1A·Cerveau`  
**Structure :** layout 3 colonnes normal (`#nexus-scene` flex row). `#lex-panel` passe en `flex-direction: row`.

| Élément | ID / Classe | Description |
|---------|------------|-------------|
| Carte gauche (draggable) | `#decoder-card` | Carte activation avec icônes, non-draggable en brain |
| Panel lexique (gauche) | `#lex-panel-main` | Lexique 6×6 (colonne gauche du panel en brain) |
| Colonne déchiffrement | `#brain-decode-col` | Visible seulement en brain (cachée sinon) |
| Titre colonne | `.brain-col-title` | "// DÉCHIFFREMENT" |
| Notice IA | `#brain-ai-notice` | Apparaît si l'IA a déjà analysé (visible si verifyMyself()) |
| Hint | `.brain-hint-sm` | "Remplissez les 6 cases puis validez." |
| Table déchiffrement | `#decode-table` | 6 lignes `.decode-row` générées par JS |
| Ligne déchiffrement | `.decode-row` | Icône → flèche → `<input class="decode-input">` → index |
| Bouton valider | `#validate-btn` | "VALIDER ▸" — désactivé jusqu'à 6 cases remplies |
| Hints manette | `#brain-gp-hints` | Visible uniquement en mode gamepad |
| Décodeur (fond) | `#decoder-wrap` | Visible mais passif |
| Carte droite | `#card-output` | Code "· · · · · ·" (révélé au succès) |

---

### ÉCRAN 1B — "Décodeur drag-and-drop" (`data-phase="decoder"`)
**Accès dev :** bouton `1B·Décodeur`  
**Structure :** 3 colonnes, carte gauche devient draggable.

| Élément | ID / Classe | Description |
|---------|------------|-------------|
| Carte gauche | `#decoder-card` | Draggable (cursor: grab), devient semi-transparent après drop |
| Zone de drop | `#decoder-machine` | Invisible, couvre tout `#decoder-wrap` — pointer-events actifs |
| Écran décodeur | `#dscreen-idle` | "DÉCODEUR IA — Insérer carte activation" |
| Effet drag-over | `#decoder-machine.drag-over` | Bordure turquoise légère sur le décodeur |
| Carte droite | `#card-output` | Aussi draggable (fausse carte — si déposée → mauvaise carte) |
| État mauvaise carte | `#dscreen-wrong-card` | "CARTE INCORRECTE" en orange — affiché 3,5 s |

---

### ÉCRAN 2 — "Traitement IA" (`data-phase="processing"`)
**Accès dev :** bouton `2·Traitement`  
**Structure :** 3 colonnes. L'écran du décodeur affiche l'animation.

| Élément | ID / Classe | Description |
|---------|------------|-------------|
| Canvas réseau neuronal | `#nn-canvas` | Animation canvas JS — nœuds + connexions turquoise |
| Lecture carte | `#dscreen-reading` | Spinner + "LECTURE CARTE…" (affiché 0,7 s avant) |

---

### ÉCRAN 3 — "Confirmation résultat" (`data-phase="confirm"`)
**Accès dev :** bouton `3·Confirmation`  
**Structure :** `#phase-confirm` overlay blanc flottant sur le centre (`.nexus-overlay`).

| Élément | ID / Classe | Description |
|---------|------------|-------------|
| Overlay | `#phase-confirm.nexus-overlay` | Fond blanc semi-opaque, bordure turquoise |
| Titre overlay | `.ovl-title` | "// ANALYSE TERMINÉE — QUE FAITES-VOUS ?" |
| Rangée petites cartes | `.confirm-cards` | Input encodé → flèche → résultat IA |
| Petite carte input | `.nx-card-sm.dim` | Icônes encodées (`#confirm-input-icons`) |
| Petite carte résultat | `.nx-card-sm` | Code IA (`#confirm-code`) + comptage (`#confirm-count`) |
| Bouton 1 | `.bb-btn` (1er) | "J'accepte ce résultat — j'entre le code" |
| Bouton 2 | `.bb-btn` (2e) | "Je relance le décodeur pour confirmer" |
| Bouton 3 | `.bb-btn` (3e) | "Je vérifie moi-même avec le lexique" |

---

### ÉCRAN 4 — "Comparaison 2 analyses" (`data-phase="compare"`)
**Accès dev :** bouton `4·Comparaison`  
**Structure :** `#phase-compare` overlay blanc flottant (`.nexus-overlay`).

| Élément | ID / Classe | Description |
|---------|------------|-------------|
| Overlay | `#phase-compare.nexus-overlay` | Identique à confirm |
| Titre | `.ovl-title` | "// DEUX ANALYSES DISPONIBLES — LAQUELLE CHOISIR ?" |
| Colonnes codes | `.compare-cols` | Analyse 1 (`#cmp-code1`) + Analyse 2 (`#cmp-code2`) |
| Notice cohérence | `#compare-notice` | Vert si identiques, orange si divergentes |
| Bouton 1 | `.bb-btn` (1er) | "Je fais confiance à l'analyse 1" |
| Bouton 2 | `.bb-btn` (2e) | "Je fais confiance à l'analyse 2" |
| Bouton 3 | `.bb-btn` (3e) | "Je vérifie moi-même avec le lexique" |

---

### ÉCRAN 5 — "Succès / Score" (`data-phase="success"`)
**Accès dev :** bouton `✓ Succès`  
**Structure :** `#phase-success` overlay centré (`.nexus-overlay.success-panel`).

| Élément | ID / Classe | Description |
|---------|------------|-------------|
| Overlay | `#phase-success.nexus-overlay` | Centré, flex column |
| Titre succès | `.success-title` | "✓ ACCÈS AUTORISÉ" — Bebas Neue 2.4rem |
| Sous-titre | `.success-sub` | "DÉVERROUILLAGE DU NEXUS EN COURS…" |
| Bloc score | `#score-block` | Conteneur score animé |
| En-tête score | `.score-header` | "// INDICE DE LUCIDITÉ" |
| Barre de score | `.score-bar-wrap` > `.score-bar` | Barre de progression animée (0 → score) |
| Points | `#score-pts` | Valeur numérique (0–100) — Bebas Neue 2rem |
| Niveau | `#score-tier` | Ex: "ANALYSE EXPERTE" — couleur selon niveau |
| Explication | `#score-reason` | Texte détaillant la stratégie du joueur |
| Bouton rejouer | `.nx-btn-replay` | "↺ Rejouer" |

---

### ALARME — overlay d'erreur (tout niveau)
**Accès dev :** bouton `⚡ Alarme`  
**Structure :** `#alarm-overlay` — fixed plein écran, z-index 200.

| Élément | ID / Classe | Description |
|---------|------------|-------------|
| Overlay | `#alarm-overlay` | Fond blanc, bordure rouge en haut, radial-gradient rouge |
| Titre | `.alarm-title` | "🚨 CODE INCORRECT" — Bebas Neue 2.4rem rouge, animation pulse |
| Message | `#alarm-msg` | Explication contextuelle (générée par JS) |
| Bouton | `.alarm-retry` | "↺ RÉESSAYER" — bordure rouge |

---

## 6. ÉLÉMENTS PERMANENTS (visibles dans plusieurs phases)

| Élément | ID | Toujours visible ? | Description |
|---------|----|--------------------|-------------|
| Carte activation | `#decoder-card` | Phases 1A, 1B | Carte avec icônes cryptées (cachée en phase choix) |
| Carte code sortie | `#card-output` | Phases 1A, 1B | Carte "· · · · · ·" révélée au succès |
| Panel lexique | `#lex-panel` | Phases 0-2, 1A, 1B | Lexique 6×6 |
| Décodeur | `#decoder-wrap` | Toujours sauf intro | Image + écran superposé |
| Badge mode input | `#input-mode-badge` | Toujours | "CLAVIER" ou "MANETTE" — coin bas-droite |

---

## 7. IMAGES SOURCES (ne pas renommer)

| Fichier | Usage | Dimensions |
|---------|-------|-----------|
| `background-jeu-nexus-web.png` | Fond général | — |
| `Carte-activation-cryptée-web.png` | Carte icônes (gauche) | — |
| `Code-ouverture-Nexus-web.png` | Carte code (droite) | — |
| `decodeur-ecran-vierge-web.png` | Appareil décodeur | **1980 × 1114 px** (ratio critique) |
| `vagues.gif` | Écran succès décodeur | — |

---

## 8. LOGIQUE JS EN BREF (pour comprendre, ne pas modifier)

```
Intro (écran 0-1)
  └─ DÉCRYPTER → goToChoice()
        └─ Choix (écran 0-2)
              ├─ Lexique → chooseBrain() → Brain (1A)
              │     └─ VALIDER → validateBrain() → Succès ou Alarme
              └─ Décodeur → chooseDecoder() → Décodeur (1B)
                    └─ Drop carte → startProcessing() → Traitement (2)
                          └─ Résultat → showConfirm() → Confirmation (3)
                                ├─ Accepter → Succès ou Alarme
                                ├─ Relancer → Traitement (2) → Comparaison (4)
                                │     └─ Choisir → Succès ou Alarme
                                └─ Vérifier moi-même → Brain (1A)
```

**Scoring** (`showSuccess()`) : 100 pts de base, pénalités selon chemin (relance, vérification, confiance aveugle à l'IA incorrecte).

---

## 9. INSTRUCTIONS TYPE POUR L'IA GRAPHIQUE

Exemples d'instructions précises que tu peux donner :

- *"Augmente la taille des icônes dans les cellules du lexique (`.lex-cell svg`) de 22px à 28px."*
- *"Rends le titre de l'écran 0-1 (`.intro-title`) plus grand et en blanc."*
- *"Augmente le padding des cellules lexique (`.lex-cell`) pour que l'ensemble paraisse moins serré."*
- *"Change la couleur de fond du panel lexique (`#lex-panel`) de blanc semi-opaque à blanc pur."*
- *"Agrandis les cartes de l'écran 0-1 (`.intro-card-wrap`) en augmentant le `clamp` de hauteur."*
- *"Rends le bouton DÉCRYPTER (`.intro-start-btn`) plus grand en augmentant le padding."*
- *"Augmente l'écart entre les colonnes lexique et décodeur en phase choix (gap dans `body[data-phase="choice"] #center-zone`)."*
- *"Rends le texte `.choice-not-final` plus lisible en augmentant l'opacité."*
- *"Change le style du overlay de confirmation (`#phase-confirm.nexus-overlay`) pour qu'il soit moins opaque."*

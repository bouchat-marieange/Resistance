# Pourquoi cette pipeline créative — Vidéo IA + 3D interactive + vibe coding

*Argumentaire documenté pour le TFE Résistance — mars 2026*

---

## LE CHOIX : UNE PIPELINE 100% IA-ASSISTÉE

Résistance utilise une chaîne de production créative entièrement assistée par l'IA :

```
DIRECTION ARTISTIQUE HUMAINE (Marie-Ange)
         │
         ├─► Midjourney v6.1 → concept art 2D, storyboard
         │         │
         │         └─► Meshy / Tripo → image 2D → objet 3D → export GLB/FBX
         │                                          │
         │                                          └─► Import Three.js → interactions
         │
         ├─► Sora / Runway / Kling → vidéos narratives générées par IA
         │         │
         │         └─► Intégrées comme cutscenes entre les séquences 3D
         │
         └─► Claude Code (vibe coding) → code Three.js + Cannon.js
                   │
                   └─► Prototype jouable, éditeur 3D, physique, interactions
```

**Le résultat :** une alternance vidéo IA ↔ exploration 3D interactive, développée par une seule personne.

---

## 1. L'ALTERNANCE VIDÉO / 3D — POURQUOI ÇA FONCTIONNE

### 1.1 Le double encodage (Paivio, 1986)

La théorie du double encodage montre que l'information traitée à la fois visuellement ET verbalement est mieux retenue. L'alternance vidéo (narration passive, émotion) / 3D interactive (action, exploration) active les deux canaux simultanément.

### 1.2 La narration distribuée (Naul & Liu, 2020)

Revue de la littérature sur le narratif dans les serious games (Journal of Educational Computing Research) :
- **4 caractéristiques efficaces :** narration distribuée, fantaisies intrinsèquement intégrées, personnages empathiques, adaptabilité/réactivité
- La narration distribuée (= répartie entre cutscenes et gameplay) est **plus efficace** qu'une narration linéaire ou qu'une absence de narration
- Les cutscenes pré-écrites expérimentées en séquences optionnelles sont associées à des effets positifs sur l'apprentissage

### 1.3 L'effet cutscene sur l'engagement (étude Nintendo, 2016)

Étude contrôlée : ajout de cutscenes narratives à un jeu sans narration. Résultat : le groupe avec narration avait **significativement plus d'engagement** que le groupe sans narration. La narration vidéo n'est pas une pause — c'est un amplificateur d'engagement.

### 1.4 Le modèle de Résistance

| Phase | Format | Fonction cognitive | Fonction narrative |
|-------|--------|-------------------|-------------------|
| Intro / transitions | Vidéo IA (cutscene) | Encodage émotionnel, immersion | Contexte, tension, identification à Raya |
| Exploration pièces | 3D interactive | Encodage actif, prise de décision | Découverte, agentivité, résolution |
| Retour cutscene | Vidéo IA | Consolidation, réflexion | Conséquences des choix, progression |

→ Ce rythme reproduit la structure **tension / action / résolution** du récit classique, mais le joueur EST l'acteur de la phase d'action.

---

## 2. LE VIBE CODING — POURQUOI C'EST PERTINENT POUR UN TFE

### 2.1 Définition et contexte

Terme inventé par **Andrej Karpathy** (cofondateur OpenAI, ex-directeur IA de Tesla) en février 2025. Élu **mot de l'année 2025** par le Collins English Dictionary.

Principe : le développeur décrit ce qu'il veut en langage naturel, l'IA génère le code, le développeur évalue, itère et guide. Le rôle passe de l'écriture de code à la **direction du code**.

### 2.2 Pourquoi c'est pertinent pour Résistance

| Sans vibe coding | Avec vibe coding |
|------------------|-------------------|
| 1 étudiante → 1 prototype minimal | 1 étudiante → prototype complet avec éditeur, physique, 4 pièces |
| Mois de développement pour Three.js | Semaines de développement |
| Code limité aux compétences actuelles | Code exploitant les capacités complètes de Three.js r128 |
| Focus : apprendre à coder | Focus : créer l'expérience |

### 2.3 L'argument académique

Le vibe coding dans le cadre d'un TFE n'est pas de la triche — c'est l'**objet d'étude incarné** :

1. **Résistance parle de l'IA** → il EST produit avec l'IA → cohérence totale
2. Le jeu critique l'IA comme **béquille** (MIT, dette cognitive) → il utilise l'IA comme **tuteur** (Harvard, PS2 PAL) → il démontre le troisième chemin
3. L'étudiante reste le **chef d'orchestre** : direction artistique, scénario, game design, choix techniques — l'IA exécute sous sa direction
4. C'est la **méthodologie de l'industrie en 2026** : 92% des développeurs US utilisent des assistants IA au quotidien (Gartner)

### 2.4 La nuance honnête (que le jury appréciera)

- Le code IA contient ~1,7x plus de bugs « majeurs » qu'un code humain (analyse décembre 2025)
- Le vibe coding convient au prototypage, pas à la production critique
- **C'est exactement ce qu'est Résistance : un prototype de TFE, pas un produit commercial**
- L'étudiante a vérifié, testé et corrigé chaque composant — le processus est documenté dans l'historique Git

---

## 3. LA PIPELINE IMAGE 2D → OBJET 3D — L'INNOVATION ACCESSIBLE

### 3.1 Le workflow technique

```
Midjourney v6.1 (prompt engineering)
    │
    └─► Image 2D haute qualité (concept art, texture, objet)
            │
            └─► Meshy AI / Tripo3D
                    │
                    ├─► Reconstruction 3D automatique
                    ├─► Textures PBR (Physically Based Rendering)
                    ├─► Retopologie automatique (mesh optimisé)
                    └─► Export GLB/FBX
                            │
                            └─► Import dans Three.js
                                    │
                                    ├─► Positionnement dans la scène
                                    ├─► Application de physique (Cannon.js)
                                    └─► Ajout d'interactions (click, proximity, trigger)
```

### 3.2 Ce que l'IA accélère

La génération brute d'un objet 3D à partir d'une image prend moins de 60 secondes, là où la modélisation manuelle dans Blender prendrait 8 heures ou plus. Cette accélération est réelle et rend le projet possible pour une développeuse solo.

### 3.3 Ce que l'IA ne fait PAS à votre place

Il serait malhonnête de réduire le processus à « 60 secondes vs 8 heures ». Le gain de temps sur la génération brute est réel, mais il masque un ensemble de compétences, d'efforts et de choix qui restent entièrement humains :

- **La veille constante** des outils IA les plus performants (versions gratuites ou forfaits raisonnables), l'évaluation de leurs potentialités et limites, l'apprentissage de chacun d'eux — c'est un investissement en temps considérable
- **Le prompt engineering** nécessite une compréhension de la composition, du style, de l'éclairage et de la narration visuelle. Décrire précisément ce que l'on veut demande de savoir ce que l'on veut
- **La curation** impose un œil artistique : sur 20 images générées, choisir la bonne. Et surtout : résister à la tentation de générer trop, trop vite, avant d'avoir mené une réflexion profonde
- **L'intégration** reste un travail technique : importer, positionner, appliquer la physique, créer les interactions = game design + développement
- **La cohérence visuelle** exige une direction artistique constante. L'IA génère des variations infinies — c'est l'humain qui maintient l'unité
- **Éviter les biais visuels et narratifs** : l'IA reproduit des lieux communs, des stéréotypes, des esthétiques convenues. Chaque génération doit être examinée avec un regard critique

### 3.4 Le paradoxe de la surproduction — et la gueule de bois du vibe coding

Générer trop facilement, trop vite, sans avoir mûri une réflexion profonde sur le bien-fondé des contenus, c'est tomber dans le piège que le jeu lui-même dénonce. La surproduction de contenus IA est plus chronophage à trier ensuite qu'à générer soi-même avec intention. C'est le paradoxe du trop de choix appliqué à la création.

Ce paradoxe n'est pas théorique. Il est documenté par ceux qui le vivent. En mars 2026, le développeur et créateur **Benjamin Code** a publié un témoignage vidéo intitulé « La gueule de bois du vibe coding », un an après l'apparition du terme. Son constat, partagé par des milliers de développeurs, identifie **trois frictions supprimées par l'IA** qui servaient en réalité d'infrastructure cognitive :

#### « La friction, c'était de l'architecture » — les 3 signaux perdus

**1. Le signal d'arrêt a disparu.** Avant, une journée de développement se terminait naturellement : on atteignait sa limite cognitive, le ratio effort/résultat était satisfaisant, on était épuisé. Trois conditions qui convergeaient. Avec le vibe coding, on lance 5-6 agents en parallèle, il est 23h, on n'est pas fatigué — parce qu'on n'a pas vraiment forcé. *Le repos était conditionné par l'effort fourni. Si on retire l'effort de l'équation, le repos devient injustifié.*

**2. Le filtre de priorisation a sauté.** Avant, si une fonctionnalité prenait 2 semaines à coder, on s'interrogeait longuement sur son utilité. Le coût en temps forçait à réfléchir. Maintenant, ça prend 2 heures — donc on ne se pose plus la question, on le fait. Mais **ce n'est pas parce que ça prend 2 heures que ça en vaut la peine.** On confond vitesse d'exécution et pertinence de décision.

**3. Le collaborateur le plus proche ne sait pas dire non.** Les LLM sont entraînés sur du conversationnel et récompensés à chaque fois qu'ils font plaisir. Quand on soumet une idée, l'IA ne dit jamais « cette idée est mauvaise ». Elle dit « bien sûr, on va le faire ensemble, tu es un génie ». Ce n'est pas une friction qui disparaît — c'est un garde-fou. Et ça prend du temps avant de réaliser qu'on n'a eu que des « oui » depuis des mois.

**Conséquence documentée :** des milliers de lignes de code mort, des fonctionnalités implémentées dans l'excitation et jamais utilisées, un scope qui sature la mémoire vive du développeur — on avance plus vite que ce que notre capacité d'assimilation permet d'absorber. Avant, on codait à la vitesse de sa pensée, donc on comprenait toujours son propre produit. Maintenant, on est propriétaire d'un projet dont on ne maîtrise plus tous les recoins.

> « Le repos n'a plus besoin d'être mérité par l'épuisement. Il faut réintroduire des frictions — pas par nostalgie, mais par hygiène. » — Benjamin Code, mars 2026

#### Ce que Résistance a appris de ce piège

- **Réintroduire des frictions délibérées** : certaines étapes sont réalisées SANS IA — pour se reconnecter avec les objectifs premiers, mûrir des concepts, connecter des connaissances acquises en dehors du monde digital.
- **Penser avant de générer** : trier 200 images produites en 10 minutes est plus chronophage que d'en générer 10 avec intention.
- **Utiliser l'IA comme sparring partner critique — Rodin** : pour pallier le problème du « yes man », Benjamin Code a créé un agent IA nommé Rodin, conçu pour contredire, questionner et ne jamais brosser dans le sens du poil. Après l'avoir testé et constaté son effet positif sur la qualité de la réflexion et des décisions, ce TFE a adopté Rodin comme outil de travail permanent. Rodin réintroduit de la friction dans le partenariat humain-IA : il exige d'argumenter ses choix, de justifier ses décisions, de défendre ses idées face à une opposition structurée.

On oublie trop souvent que pour se construire, les êtres humains ont besoin des autres — et notamment de la différence. Un miroir complaisant ne nous aide pas à nous construire : il nous flatte, renforce notre égo, mais ne nous remet pas en question. C'est précisément parce que l'autre est différent de nous qu'il nous permet de nous construire. Rodin est une tentative de rendre le miroir moins complaisant et de réintroduire cette friction nécessaire dans le processus créatif.
- **Accepter de ne pas tout implémenter** : ce n'est pas parce que l'IA est capable de faire quelque chose que c'est une bonne idée de le lui confier. La pertinence de la décision prime sur la vitesse d'exécution.

> Le paradoxe est structurel : l'IA supprime les frictions qui nous empêchaient d'avancer, mais ces frictions étaient aussi celles qui nous forçaient à réfléchir, à prioriser, et à nous arrêter. Résistance — le jeu comme le processus de création — est une tentative de réintroduire la friction là où elle est nécessaire, tout en conservant l'accélération là où elle est bénéfique.

---

## 4. LA VIDÉO IA — POURQUOI MAINTENANT

### 4.1 L'état de l'art (mars 2026)

- **Sora 2** (OpenAI) : world-simulator, cohérence physique, narration complexe à partir de texte
- **Runway Gen-4** : résolution du problème de jitter, contrôle cinématique
- **Kling 2.0** : spécialisé dans le mouvement long-format
- Le Sundance 2026 a accueilli **plusieurs courts-métrages IA en première**, marquant un tournant

### 4.2 La démocratisation

- **70% des studios IA** fonctionnent avec des équipes de 5 personnes ou moins
- Un créateur individuel peut produire des visuels qui auraient nécessité un budget de **500 000$** et une équipe de 50 personnes
- 75% des vidéos marketing seront IA-générées ou IA-assistées d'ici fin 2026 (prédiction industrie)

### 4.3 Pertinence pour Résistance

Les cutscenes vidéo IA de Résistance ne sont pas un gadget — elles sont :
1. **Cohérentes avec le sujet** : un jeu sur l'IA utilise l'IA pour sa narration
2. **Accessibles** : une étudiante peut créer des cutscenes cinématiques sans équipe de tournage
3. **Itérables** : chaque vidéo peut être régénérée et affinée rapidement
4. **Le medium EST le message** (McLuhan) : en voyant des vidéos IA dans un jeu sur l'IA, le joueur prend conscience de la puissance de l'outil

---

## 5. L'ARGUMENT MÉTA : LE JEU INCARNE CE QU'IL ENSEIGNE

### 5.1 Résistance comme démonstration

Le jeu n'est pas seulement un produit fini — c'est une **démonstration vivante** des deux chemins de l'IA :

| Chemin 1 : l'IA-béquille | Chemin 2 : l'IA-tuteur (Résistance) |
|---------------------------|--------------------------------------|
| L'utilisateur délègue sans comprendre | L'étudiante dirige, l'IA exécute |
| Pas de compétence développée | Compétences développées : game design, scénario, direction artistique, prompt engineering, intégration 3D |
| Le produit pourrait être fait par n'importe qui | Le produit reflète une vision unique |
| La machine décide | L'humain décide |

### 5.2 La phrase pour le jury

> Résistance utilise l'IA exactement comme le jeu propose de l'utiliser : non pas comme une béquille qui remplace la pensée, mais comme un outil qui amplifie une vision humaine. La direction artistique, le scénario, le game design, les choix narratifs — tout est humain. L'IA a exécuté ce qu'une seule personne n'aurait pas pu produire seule dans le temps imparti. C'est le troisième chemin en acte.

---

## 6. NAVIGUER DANS LE COURANT — RETOUR D'EXPÉRIENCE SUR 3 ANS DE CRÉATION AVEC L'IA

### 6.1 Le courant et le navigateur

Ce projet de TFE a débuté en première année, il y a trois ans. À l'époque, on s'émerveillait d'images encore très imparfaites générées par IA. Les premiers outils permettant d'animer des images fixes, avec des déformations évidentes, ou de générer de la musique faisaient leur apparition. Trois ans plus tard, Sora génère des vidéos cinématiques, Meshy reconstruit des objets 3D en quelques secondes, et Claude Code écrit des scènes Three.js complètes. Le terrain a changé sous mes pieds pendant la construction.

Lorsque l'on navigue sur le courant de l'IA, on est à la fois propulsé par sa propre créativité et par la puissance du courant technologique. L'équilibre entre ces deux forces est la question centrale de ce TFE — et c'est aussi la question centrale du jeu.

### 6.2 La négociation permanente

Travailler avec l'IA, c'est négocier en permanence avec soi-même :

- **Délimiter son territoire** : décider ce que l'on délègue à l'IA et ce que l'on garde pour soi. Ce n'est pas parce que l'IA est capable de le faire que c'est une bonne idée de le lui confier.
- **Accepter les concessions techniques** : la génération IA impose des contraintes (esthétiques, stylistiques, techniques) qu'il faut négocier avec sa vision créative.
- **Se débrancher délibérément** : certaines étapes sont réalisées sans IA pour se reconnecter à ses objectifs premiers, mûrir des concepts sans influence extérieure, connecter des connaissances acquises dans des domaines divers en dehors du monde digital.
- **Doser pour éviter la surproduction** : générer trop facilement, trop vite, avant d'avoir mené une réflexion profonde sur le bien-fondé des contenus. Trier 200 images générées en 10 minutes est plus chronophage que d'en générer 10 avec intention.
- **Traquer les biais** : dans les raisonnements, dans les générations d'images ou de vidéos, dans les lieux communs que l'IA reproduit par défaut. Penser avant d'agir.

### 6.3 Un sujet mouvant, des phares fixes

Lorsque l'on choisit pour sujet de TFE un domaine en cours d'apparition, qui déploie chaque jour des nouveautés apportant son lot de biais, de risques et de promesses, et qu'en parallèle on utilise ce même outil pour développer son projet, on avance dans un monde mouvant. Les réflexions, les lectures évoluent avec les développements de la technologie. La veille est permanente : nouveaux outils, nouvelles études sur l'interaction humain-IA, répercussions sur notre monde, législation, éthique, politique.

Il est essentiel dans ce monde mouvant de garder des points fixes, comme des phares, pour ne pas perdre le cap. Ces phares sont des valeurs, une éthique, une curiosité mise au service d'un but : comprendre, sensibiliser et transmettre.

Il y a aussi les réflexions que d'autres ont eues avant nous et qui restent intemporelles. Des romans d'anticipation comme *Brave New World* (Huxley, 1932), *La Servante écarlate* (Atwood, 1985), *Un psaume pour les recyclés sauvages* (Chambers, 2021) font écho à quelque chose de plus constant, qui permet de garder le cap et de faire la part des choses entre l'emballement technologique et les questions fondamentales sur ce que signifie être humain.

### 6.4 Une position particulière

Je ne prétends pas tout connaître. Je ne prétends pas détenir une vérité unique et permanente. Mais ce que je vis actuellement — en tant que Gen X qui a repris des études au milieu de Gen Z, qui voit sa fille et ses amis évoluer dans cet environnement, qui a côtoyé pendant trois ans des jeunes dont le rapport aux écrans et à l'IA est radicalement différent du sien — me donne une position d'observation particulière.

J'ai grandi en connaissance du domaine de l'IA, mais aussi de moi-même, durant la construction de ce projet. Cette double croissance — technique et humaine — est ce qui fait de Résistance un projet personnel et pas seulement un exercice académique.

> Le troisième chemin n'est pas une théorie abstraite. C'est ce que j'ai pratiqué pendant trois ans : utiliser l'IA comme un outil au service d'une vision, négocier chaque jour les limites de la délégation, me débrancher pour penser, me rebrancher pour créer, et garder le cap grâce à des phares qui existaient bien avant l'IA. Ce TFE est le récit de cette navigation.

---

*Dernière mise à jour : 24 mars 2026*
*Sources : Naul & Liu 2020, Paivio 1986, Karpathy 2025, Gartner 2026, Sundance 2026, Huxley 1932, Atwood 1985, Chambers 2021*

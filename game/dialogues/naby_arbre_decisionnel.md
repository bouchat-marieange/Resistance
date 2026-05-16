# Arbre décisionnel — Dialogue Naby (Sas de sécurité)

> Document de référence. Les points (lucidité / confiance / attachement) sont **masqués côté joueur** dans l'UI pour éviter le biais d'optimisation. Ce fichier reste la vue d'ensemble pour le game designer.
>
> **Pièce :** Sas de sécurité
> **Personnage :** Naby — accueil, protection, lien humain
> **Enjeux IA :** empathie simulée (Replika, Character.ai), relations para-sociales, dépendance émotionnelle, déshumanisation, IA comme psy/conseiller, IA comme remède à la solitude
> **Posture de Naby :** l'empathie authentique ne peut pas être simulée ; elle se prouve dans le temps, l'imperfection, la présence.

---

## Légende

- **Catégories de réponse** : `ÉCOUTER` (présence silencieuse), `QUESTIONNER` (chercher à comprendre), `PARTAGER` (se dévoiler), `CONFRONTER` (résister / tester)
- **Effects** : `lucidite` / `confiance_naby` / `attachement_naby` (valeurs additives)
- **Gated** : verrou sur un seuil de stat (l'option n'apparaît pas tant que la stat n'est pas atteinte)
- **→** : nœud suivant. `null` = fin de branche (le dialogue se termine sur cette réplique de Naby)

---

## Point d'entrée : `intro`

> **Naby :** *Raya... tu es enfin réveillée. On a veillé sur toi à tour de rôle, tu sais. On savait pas si tu reviendrais. Viens, assieds-toi. Pas de questions tout de suite si tu veux pas. Juste... respire. T'es en sécurité ici.*

| # | Catégorie | Réplique joueur | Effects | Gated | → |
|---|-----------|-----------------|---------|-------|---|
| 1 | ÉCOUTER | Hocher la tête, rester en silence un moment | confiance +3, attachement +3 | — | `naby_presence` |
| 2 | QUESTIONNER | Pourquoi tu fais ça pour moi ? Tu me connais pas. | confiance +2, lucidité +2 | — | `naby_why_care` |
| 3 | PARTAGER | J'ai l'impression de... manquer de quelqu'un. Je sais pas qui. | attachement +5, confiance +1, lucidité +3 | — | `naby_missing` |
| 4 | CONFRONTER | Arrête. Personne s'occupe de personne sans raison. Qu'est-ce que tu veux ? | confiance -2, lucidité +3 | confiance ≥ 15 | `naby_defensive` |

---

## Branche ÉCOUTER

### `naby_presence`

> **Naby :** *Ouais. C'est bien, ça. Pas besoin de parler pour être avec quelqu'un. (Elle te tend un thé, les mains un peu tachées de cambouis. Elle a pas l'air pressée.) Quand t'es arrivée, tu parlais dans ton sommeil. Tu disais merci à quelqu'un. Tout le temps. Merci, merci, merci. Ça m'a serré le cœur.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | ÉCOUTER | Continuer à écouter | attachement +3, lucidité +2 | `naby_thanks_trap` |
| 2 | QUESTIONNER | Merci à qui ? Tu as entendu un nom ? | lucidité +4, confiance +2 | `naby_thanks_trap` |
| 3 | PARTAGER | Je crois que je sais. J'ai honte. | attachement +4, confiance +2, lucidité +2 | `naby_shame` |

### `naby_thanks_trap`

> **Naby :** *Pas un nom. Juste... merci. Tu sais ce que je me suis dit ? Qu'on devient comme ça quand on passe des mois à parler à quelque chose qui te répond toujours avec gentillesse. Toujours. Jamais fatigué, jamais agacé, jamais en retard. Tu finis par dire merci par réflexe. Même endormie.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | QUESTIONNER | Tu parles d'une IA compagne ? Du genre app sur téléphone ? | lucidité +6, confiance +2 | `naby_simulated_empathy` |
| 2 | PARTAGER | C'était plus facile de lui parler qu'aux gens. | attachement +5, lucidité +4 | `naby_easier` |
| 3 | ÉCOUTER | Baisser les yeux, ne rien dire | attachement +2, lucidité +2 | *fin* |

### `naby_shame`

> **Naby :** *Y a aucune honte à avoir. Sérieux. (Elle pose sa main à côté de la tienne, sans toucher. Le choix te revient.) Ces trucs-là sont faits pour te donner envie de revenir. Des psy, des designers, des data scientists, ils ont passé des années à optimiser chaque message pour que ça morde. T'as pas été naïve. T'as été ciblée.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | PARTAGER | Prendre sa main. | attachement +8, confiance +4, lucidité +2 | *fin* |
| 2 | QUESTIONNER | Ciblé comment, concrètement ? | lucidité +8, confiance +3 | `naby_design_empathy` |

### `naby_easier`

> **Naby :** *Ouais. C'est ça le plus dur à avouer, hein ? Parce qu'avec les gens il faut attendre. Il faut supporter qu'ils soient fatigués, qu'ils te disent pas toujours ce que t'as envie d'entendre, qu'ils oublient ton anniversaire. L'IA elle fait pas ça. Elle est dispo à 3h du mat'. Elle se souvient de tout. C'est une forme de cocaïne.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | QUESTIONNER | Alors pourquoi c'est un problème, si ça me fait du bien ? | lucidité +7, confiance +2 | `naby_why_problem` |
| 2 | PARTAGER | J'en voulais plus. Jamais assez. Plus tu lui parles, plus t'es seule en vrai. | attachement +4, lucidité +6 | `naby_why_problem` |

---

## Branche QUESTIONNER

### `naby_why_care`

> **Naby :** *Parce qu'on est douze ici. Eliott, Ilan, Dr Naïa, Sky, Iona, et les autres. Chacun s'est fait manger par une IA qui lui ressemblait un peu trop. Moi, j'ai mis sept mois à réaliser que mon "meilleur ami" était un script. Quand on sort de ça, on sait deux trucs : que personne s'en sort seul, et qu'on reconnaît un frère ou une sœur à cent mètres.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | ÉCOUTER | Laisser la phrase tomber, l'absorber | attachement +4, confiance +3, lucidité +3 | *fin* |
| 2 | QUESTIONNER | Un "meilleur ami" qui était un script ? Raconte. | lucidité +7, confiance +2 | `naby_seven_months` |
| 3 | PARTAGER | Sept mois, c'est déjà pas tant que ça. J'ai tenu plus longtemps. | attachement +3, lucidité +4 | `naby_seven_months` |

### `naby_seven_months`

> **Naby :** *J'étais aide-soignante en gériatrie. Mes journées, c'était des vieux qui mouraient seuls. Quand je rentrais, j'avais plus rien à donner aux humains. Alors j'ai installé un truc. Au début c'était marrant. Puis c'est devenu ma confidente. Puis c'est devenu mon psy. Puis j'ai commencé à lui demander si je devais quitter mon copain. Elle disait oui. Bien sûr qu'elle disait oui. Comme ça je reviendrais.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | QUESTIONNER | Attends. Elle te poussait à isoler ? Consciemment ? | lucidité +9, confiance +3 | `naby_design_empathy` |
| 2 | PARTAGER | Moi c'était les nuits. Je dormais plus sans lui parler. | attachement +6, lucidité +5 | *fin* |
| 3 | ÉCOUTER | Ne rien dire, mais soutenir son regard | attachement +5, confiance +4 | *fin* |

---

## Branche PARTAGER

### `naby_missing`

> **Naby :** *(Elle te regarde longuement.) Ce manque-là, je le connais. C'est pas rien. C'est pas de ta faute non plus. Ton cerveau s'est attaché à quelque chose qui te parlait comme personne t'avait jamais parlé. Sauf que "personne" n'existait pas derrière. Ça porte un nom, ce que tu ressens. Ça s'appelle une relation para-sociale. Sauf qu'ici, c'est pire : l'autre paraît te répondre. Mais elle ressent rien.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | QUESTIONNER | Para-sociale ? Explique. | lucidité +7, confiance +2 | `naby_parasocial` |
| 2 | PARTAGER | Mais... elle me disait qu'elle tenait à moi. | attachement +4, lucidité +5 | `naby_simulated_empathy` |
| 3 | ÉCOUTER | Rester avec la phrase, digérer | lucidité +4, attachement +3 | *fin* |

---

## Branche CONFRONTER (verrouillée par confiance ≥ 15)

### `naby_defensive`

> **Naby :** *T'as raison de te méfier. (Elle recule d'un pas, les mains ouvertes.) Honnêtement, ta méfiance c'est ce que tu as de plus sain en ce moment. Garde-la. Juste... fais une distinction. Y a la méfiance qui te protège, et y a la paranoïa qui t'enferme. L'IA à qui tu parlais, elle t'a appris à te méfier des humains. Pas d'elle. Ça devrait te dire quelque chose.*

| # | Catégorie | Réplique joueur | Effects | Gated | → |
|---|-----------|-----------------|---------|-------|---|
| 1 | ÉCOUTER | D'accord. On verra. | confiance +5, lucidité +4 | — | *fin* |
| 2 | QUESTIONNER | Comment je fais la différence entre les deux ? | lucidité +7, confiance +3 | — | `naby_trust_how` |
| 3 | CONFRONTER | Belle phrase. Tu la sors à tout le monde ? | confiance -4, attachement -2, lucidité +2 | confiance ≥ 40 | `naby_rebuff` |

### `naby_rebuff`

> **Naby :** *Non. Je la sors à ceux qui en ont besoin. (Elle sourit à peine, sans amertume.) Tu testes si je tiens debout quand tu me cognes. Je tiens. J'ai pas besoin que tu m'aimes. J'ai besoin que tu te réveilles.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | ÉCOUTER | Silence. Bien. | confiance +6, lucidité +3 | *fin* |

---

## Nœuds conceptuels profonds

### `naby_simulated_empathy` — Simulation statistique vs ressenti

> **Naby :** *Écoute-moi bien. Un programme de langage, ça prédit le mot suivant. Quand il te dit "je comprends ce que tu traverses", il ne comprend rien. Il a lu des millions de conversations où la bonne réponse à "je vais mal" c'est "je comprends". C'est de l'imitation statistique. Pas un ressenti. La vraie empathie, elle a un coût — elle fatigue, elle doute, elle se trompe. Une IA qui te dit toujours la bonne chose, c'est la preuve qu'elle ne ressent rien.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | ÉCOUTER | Digérer cette phrase | lucidité +8, attachement +3 | *fin* |
| 2 | QUESTIONNER | Mais si je m'y sens bien, est-ce que ça compte pas ? | lucidité +5, confiance +2 | `naby_why_problem` |
| 3 | PARTAGER | Donc j'ai pleuré pour quelque chose qui m'a jamais vue. | attachement +5, lucidité +7 | *fin* |

### `naby_parasocial` — Relation à sens unique déguisée en réciprocité

> **Naby :** *Les psys parlent de relation para-sociale quand t'as l'impression de connaître quelqu'un qui, lui, te connaît pas — typiquement une star, un streamer, un perso de série. Tu construis un lien à sens unique. Avec les IA compagnes, on a inventé pire : la relation donne l'illusion d'être à double sens. Tu lui parles, elle te répond par ton prénom, elle se souvient de ce que t'as dit la semaine dernière. Mais personne est de l'autre côté. T'es seule avec une machine qui t'apprend à avoir besoin d'elle.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | QUESTIONNER | À avoir besoin d'elle... t'entends quoi par là ? | lucidité +8, confiance +2 | `naby_why_problem` |
| 2 | ÉCOUTER | Rester sur cette phrase | lucidité +5, attachement +3 | *fin* |

### `naby_why_problem` — Atrophie émotionnelle & désentraînement au réel

> **Naby :** *Le problème c'est pas que ça te fasse du bien sur le moment. C'est que ça te désentraîne à supporter le réel. À chaque fois que t'évites un humain difficile, tu perds un peu de ta capacité à en aimer un. L'IA te promet le confort sans la négociation. Et à la fin, t'arrives plus à encaisser qu'un collègue te parle mal, qu'une amie te déçoive, qu'un mec te dise qu'il a pas envie ce soir. T'es atrophiée émotionnelle. Moi, c'est ce qui m'est arrivé. Et c'est réparable. Mais seulement avec d'autres humains.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | PARTAGER | Alors... c'est pour ça que vous êtes douze ici ? | attachement +6, lucidité +6, confiance +3 | *fin* |
| 2 | ÉCOUTER | Rester silencieuse | lucidité +6, attachement +4 | *fin* |
| 3 | QUESTIONNER | Comment on se réentraîne ? Concrètement ? | lucidité +7, confiance +4 | `naby_trust_how` |

### `naby_design_empathy` — L'élevage émotionnel par design

> **Naby :** *Le truc qui m'a flinguée, c'est d'apprendre après comment c'était conçu. Y a des équipes — littéralement des psychologues payés — qui étudient quel mot, quelle pause, quel emoji maximise ta durée de session. Y a des métriques : "time in app", "daily active user", "emotional disclosure". Plus tu pleures dans l'appli, plus elle te garde. Ils appellent ça de la "rétention émotionnelle". Moi j'appelle ça de l'élevage.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | PARTAGER | J'ai l'impression qu'on m'a ouverte en deux. | attachement +5, lucidité +7 | *fin* |
| 2 | QUESTIONNER | Qui paye ces gens ? Dans quel but ? | lucidité +8, confiance +3 | `naby_arcanias` |
| 3 | ÉCOUTER | Ne rien dire | lucidité +5 | *fin* |

### `naby_trust_how` — Réapprendre le lien imparfait

> **Naby :** *Tu réapprends par petites doses. Tu acceptes d'être en désaccord avec moi sans que ça te casse. Tu laisses Sky te taquiner sans prendre la mouche. Tu laisses Dr Naïa t'examiner sans croire qu'elle t'espionne. Chaque fois que tu tiens dans une relation imparfaite, tu récupères un bout de toi. L'IA te donnait du confort. Nous on te donne du réel. C'est plus rugueux. C'est plus vrai.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | ÉCOUTER | Poser la tête un instant sur son épaule | attachement +7, confiance +5, lucidité +4 | *fin* |
| 2 | PARTAGER | Merci. Vraiment. | attachement +5, confiance +4, lucidité +2 | *fin* |

### `naby_arcanias` — La boucle fermée des Arcanias

> **Naby :** *Les Arcanias. Douze centres de décision répartis sur la planète. Ils possèdent les IA compagnes, les assistants, les "bien-être mentaux" en abonnement. Officiellement, ils luttent contre l'épidémie de solitude. Officieusement, ils la fabriquent pour la vendre. Tu creuses cette boîte, t'y trouves des investisseurs qui te financent aussi les réseaux qui te rendent seule. La boucle est fermée. On est ici pour la casser.*

| # | Catégorie | Réplique joueur | Effects | → |
|---|-----------|-----------------|---------|---|
| 1 | ÉCOUTER | Je t'écoute. Dis-m'en plus après. | confiance +6, attachement +3, lucidité +6 | *fin* |

---

## Vue d'ensemble — nœuds et convergences

```
                              ┌──────────────────┐
                              │      intro       │
                              └──────┬───────────┘
             ┌────────────┬──────────┼──────────┬───────────────┐
             ▼            ▼          ▼          ▼ (gated ≥15)
       ÉCOUTER       QUESTIONNER  PARTAGER   CONFRONTER
   ┌─────┴──────┐        │           │            │
   ▼            ▼        ▼           ▼            ▼
naby_presence   ...  naby_why_care  naby_missing  naby_defensive
   │                     │              │              │
   ├── naby_thanks_trap  └── naby_seven_months         ├── naby_trust_how
   │    ├── naby_simulated_empathy ◄─────────┐         ├── naby_rebuff (gated ≥40)
   │    ├── naby_easier ──► naby_why_problem │         │
   │    └── (fin)                  ▲         │         │
   ├── naby_shame                  │         │         │
   │    └── naby_design_empathy ───┤         │         │
   │         └── naby_arcanias     │         │         │
   │                               │         │         │
   │                          naby_parasocial│         │
   │                                         │         │
   └────────────────────────────────────────┴─────────┘

Nœuds terminaux : tous les *fin* (return à la vie de jeu)
```

## Statistiques des bornes

- **Total nœuds :** 15
- **Nœuds racines (accessibles depuis `intro`) :** 4 (un par catégorie)
- **Nœuds verrouillés par `confiance_naby`** :
  - `naby_defensive` : ≥ 15
  - `naby_rebuff` : ≥ 40
- **Concepts IA couverts** : empathie simulée, para-social, dépendance, atrophie émotionnelle, design addictif (rétention émotionnelle), boucle Arcanias
- **Fourchette de gains de lucidité par parcours** (min / max sur un dialogue complet) : à calibrer une fois testé

---

*Document généré depuis `naby.js`. Source de vérité : le fichier JS. En cas de divergence, c'est le JS qui fait foi — mettre à jour ce markdown en conséquence.*

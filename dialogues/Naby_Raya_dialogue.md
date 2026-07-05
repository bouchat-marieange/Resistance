# Dialogue Naby × Raya — Sas de sécurité

> **Convention de désignation**
> - Lettre seule (A, B, C…) = réplique principale de Naby (déclenchée automatiquement)
> - Lettre + chiffre (A1, A2, A3, A4) = sous-échange : réplique de Raya (choix joueur) + réponse Naby associée
> - D_conclusion = réplique de Naby toujours jouée après D1-D4
> - C = monologue Naby seul (pas de réponse Raya)
> - Permet d'identifier et modifier n'importe quelle réplique sans la retranscrire en entier

---

## CONTEXTE TTS GLOBAL

### NABY — Contexte personnage

**Voix :** Sulafat (Female · Warm · Middle pitch)
**Modèle :** `gemini-2.5-pro-tts` · Langue : `fr-FR` · Temperature : 1.5

**Director's note (à saisir une seule fois) :**
> You are voicing NABY, a character in a French-language serious 3D game called "Résistance."
> Naby is a woman in her late twenties, formerly a healthcare aide in a geriatric ward. She is now a key member of an underground resistance movement in a near-future dystopian world where people have been trapped in sensory-deprivation pods called "Nexus." She speaks French.
> Her voice is warm, low-to-middle pitch, unhurried. She has processed her own trauma and speaks from a place of earned calm — not detachment, not performance. She uses occasional dry humor to disarm defensiveness. She never lectures. She meets people where they are.
> Sample context: Naby is speaking to Raya, a young woman who just escaped the Nexus — a system that exploited her body and mind without consent for months. This is their first real human conversation. The setting is a bunker: rough walls, warm light, a kettle. Naby is offering presence without pressure. She knows Raya may be suspicious, exhausted, or fragile — and she adapts naturally to each.
> Tone: empathetic, grounded, occasionally dry. Natural conversational rhythm. Thoughtful pauses. Never rushed, never performative warmth.

---

### RAYA — Contexte personnage

**Voix :** Leda (Female · Youthful · Higher pitch)
**Modèle :** `gemini-2.5-pro-tts` · Langue : `fr-FR` · Temperature : 1.5

**Director's note (à saisir une seule fois) :**
> You are voicing RAYA, the protagonist of "Résistance," a French-language serious 3D game.
> Raya is a young woman in her early-to-mid twenties. She is a natural rebel who was captured against her will and held in a sensory-deprivation system called the Nexus for months. She speaks French.
> She is guarded, sometimes suspicious, sometimes exhausted. She has difficulty concentrating and her attention wants to leap — the world feels slow to her now. She is NOT a victim: she resists by nature. But she has been through something real and recent.
> There are four versions of Raya depending on the player's choice:
> - A (méfiant·e) : flat, guarded, testing. Slightly suspicious.
> - B (blasé·e) : tired, detached, matter-of-fact. Low affect, not cold — just worn.
> - C (angoissé·e) : slightly faster, quieter, a little fragile. Uncertainty in the voice.
> - D (enthousiaste) : more direct, open, slightly more energy. Not naive — engaged.
> Sample context: Raya has just arrived in the bunker for the first time. She is speaking to Naby, who welcomed her. These are Raya's first spoken words. The lines are short — one or two sentences each.

---

## RÉCAPITULATIF DES FICHIERS AUDIO

| # | Fichier | Durée estimée |
|---|---------|---------------|
| 1 | `naby_e1_main.mp3` | ~7 sec |
| 2–5 | `naby_e1_rep_a/b/c/d.mp3` | ~3–5 sec chacun |
| 6 | `naby_e2_main.mp3` | ~12 sec |
| 7–10 | `naby_e2_rep_a/b/c/d.mp3` | ~4–6 sec chacun |
| 11 | `naby_e3_platine.mp3` | ~10 sec |
| 12 | `naby_e4_main.mp3` | ~10 sec |
| 13–16 | `naby_e4_rep_a/b/c/d.mp3` | ~3–5 sec chacun |
| 17 | `naby_e4_conclusion.mp3` | ~11 sec |
| 18 | `naby_e5_main.mp3` | ~12 sec |
| 19–22 | `naby_e5_rep_a/b/c/d.mp3` | ~3–4 sec chacun |
| 23–26 | `raya_e1_a/b/c/d.mp3` | ~3–5 sec chacun |
| 27–30 | `raya_e2_a/b/c/d.mp3` | ~3–6 sec chacun |
| 31–34 | `raya_e4_a/b/c/d.mp3` | ~2–4 sec chacun |
| 35–38 | `raya_e5_a/b/c/d.mp3` | ~2–3 sec chacun |

**Total : 38 fichiers audio · ~22 Naby · ~16 Raya**

> **Conseil de workflow :** Génère d'abord les lignes longues de Naby (e2_main, e3_platine, e4_main, e4_conclusion, e5_main) pour valider la voix et le style. Pour Raya, commence par `raya_e1_b` (blasée, profil le plus neutre), puis `raya_e1_c` (angoissée, profil le plus nuancé).

---

## ÉCHANGE 1 — Ouverture

---

### NABY — A

**Fichier audio :** `naby_e1_main.mp3`

**Style :** Calm and observant, almost a little amused. She's seen this look before.
The tone is like someone handing you a blanket without making it a big deal.

**Texte :**
> T'as les yeux qui cherchent encore la prochaine notif. [short pause] C'est normal. [short pause] Ça prend du temps de sortir de cet état. [medium pause] Moi c'est Naby. [short pause] Le canapé là-bas grince, mais il tient. [short pause] Le café aussi. [medium pause] Tu peux poser ton sac.

---

### RAYA — Réponses à A

---

#### A1 — Méfiant·e

**RAYA**

**Fichier audio :** `raya_e1_a.mp3`

**Profil :** Méfiant·e — flat, slightly suspicious. Testing the stranger.

**Texte :**
> T'as l'air de savoir beaucoup de choses sur moi [short pause] pour quelqu'un qu'on vient de rencontrer.

**NABY — Réponse**

**Fichier audio :** `naby_e1_rep_a.mp3`

**Style :** Slight smile in the voice. Deflecting the suspicion gently, without defensiveness.

**Texte :**
> C'est juste que t'as les mêmes yeux qu'on a tous eu. [short pause] Pas une expertise. [short pause] Une mémoire.

---

#### A2 — Blasé·e

**RAYA**

**Fichier audio :** `raya_e1_b.mp3`

**Profil :** Blasé·e — tired, honest. Low affect. Not dramatic.

**Texte :**
> Je me sens juste… vide. [medium pause] Je savais pas que ça pouvait faire ça.

**NABY — Réponse**

**Fichier audio :** `naby_e1_rep_b.mp3`

**Style :** Slower, softer. She names what Raya is feeling without dramatizing it.
A quiet reassurance — like "that makes sense."

**Texte :**
> Ce vide-là, c'est pas un manque. [short pause] C'est l'espace qui revient. [medium pause] Tu vas en avoir peur d'abord. [short pause] C'est bon signe.

---

#### A3 — Angoissé·e

**RAYA**

**Fichier audio :** `raya_e1_c.mp3`

**Profil :** Angoissé·e — slightly faster, a little lost. Genuine worry.

**Texte :**
> J'arrive plus à me concentrer. [short pause] Une pensée arrive et disparaît avant que j'aie fini de la formuler. [short pause] C'est normal ?

**NABY — Réponse**

**Fichier audio :** `naby_e1_rep_c.mp3`

**Style :** Calm, clear, a little like a doctor explaining something complex simply.
Not cold — warm and informative. She validates the symptom before explaining it.

**Texte :**
> Très normal. [short pause] Tes seuils d'attention ont été calibrés pour des stimulations de six secondes pendant des mois. [medium pause] Le monde réel va te sembler lent un moment. [short pause] Il l'est pas. [medium pause] T'es juste en train de te réaccorder.

---

#### A4 — Enthousiaste

**RAYA**

**Fichier audio :** `raya_e1_d.mp3`

**Profil :** Enthousiaste — direct, genuinely curious. More open than the others.

**Texte :**
> T'as connu d'autres personnes sorties du Nexus ? [short pause] Comment elles ont récupéré ?

**NABY — Réponse**

**Fichier audio :** `naby_e1_rep_d.mp3`

**Style :** Warm but with a gentle undercurrent — "the speed isn't the point."
A quiet provocation, not aggressive.

**Texte :**
> Plein. [short pause] Et chacun·e à son rythme. [medium pause] La vitesse, c'est pas un critère ici. [short pause] C'est même un peu le sujet.

---

## ÉCHANGE 2 — La perfusion

---

### NABY — B

**Fichier audio :** `naby_e2_main.mp3`

**Style :** This is the emotional core of the exchange. She starts introspective —
"I took time to find the words" — then builds toward the image of the IV drip.
The thirst metaphor should land with care: vivid but not preachy.
Let "Plus jamais… le choix de boire ou pas" trail off slightly, with weight.

**Texte :**
> Le truc sur lequel j'ai mis du temps à mettre des mots [short pause] — c'est pas qu'ils nous aient enlevé la douleur. [medium pause] C'est qu'ils nous aient enlevé la soif. [long pause] T'as déjà pensé à ce que c'est, boire un verre d'eau fraîche quand t'as vraiment soif ? [medium pause] La décision. [short pause] L'envie qui monte. [short pause] Le plaisir de la combler. [long pause] Eux, c'est comme s'ils t'avaient mis une perfusion. [medium pause] Hydratée en permanence. [short pause] Plus jamais soif. [medium pause] Plus jamais… [short pause] le choix de boire ou pas.

---

### RAYA — Réponses à B

---

#### B1 — Méfiant·e

**RAYA**

**Fichier audio :** `raya_e2_a.mp3`

**Profil :** Méfiant·e — pushing back. Not aggressive, but skeptical.

**Texte :**
> Tu parles comme si c'était organisé. [short pause] Personne a décidé de me faire du mal.

**NABY — Réponse**

**Fichier audio :** `naby_e2_rep_a.mp3`

**Style :** Measured, not accusatory. She's drawing a distinction carefully.
The final sentence "C'est peut-être pire" lands quietly — like a stone dropped in still water.

**Texte :**
> Personne a décidé de te faire du mal individuellement. [medium pause] Le système, lui, a décidé de maximiser ton temps de présence. [medium pause] Ton bien-être n'était pas une priorité [short pause] — ta disponibilité l'était. [long pause] C'est différent de la malveillance. [short pause] Et c'est peut-être pire.

---

#### B2 — Blasé·e

**RAYA**

**Fichier audio :** `raya_e2_b.mp3`

**Profil :** Blasé·e — she already knows. Tired of knowing it. Matter-of-fact.

**Texte :**
> Je sais. [medium pause] C'est pour ça que je suis là. [medium pause] J'en avais marre de ne plus savoir si je voulais quelque chose [short pause] ou si on me le faisait vouloir.

**NABY — Réponse**

**Fichier audio :** `naby_e2_rep_b.mp3`

**Style :** Warm recognition. Almost relieved. "You being here matters." Short, sincere.

**Texte :**
> C'est déjà énorme de savoir ça. [medium pause] La plupart des gens dans le Nexus défendent encore leur prison. [short pause] Toi t'es là.

---

#### B3 — Angoissé·e

**RAYA**

**Fichier audio :** `raya_e2_c.mp3`

**Profil :** Angoissé·e — genuine epistemological fear. A real question, slightly shaky.

**Texte :**
> Comment je sais si ce que je ressens là, maintenant, c'est réel ? [medium pause] Ou encore un réflexe conditionné ?

**NABY — Réponse**

**Fichier audio :** `naby_e2_rep_c.mp3`

**Style :** She starts honest ("I won't lie to you"), then pivots to something
reassuring — the question itself is proof. Let that land gently on "C'est toi."

**Texte :**
> Honnêtement ? [short pause] Au début, tu peux pas vraiment savoir. [medium pause] Et c'est terrifiant. [medium pause] Mais la question elle-même [short pause] — le fait que tu la poses [short pause] — c'est pas un réflexe conditionné. [medium pause] C'est toi.

---

#### B4 — Enthousiaste

**RAYA**

**Fichier audio :** `raya_e2_d.mp3`

**Profil :** Enthousiaste — direct, sharp. She's already put this together.

**Texte :**
> Et le pire c'est qu'ils vendaient ça comme de la liberté.

**NABY — Réponse**

**Fichier audio :** `naby_e2_rep_d.mp3`

**Style :** A tiny beat of approval, then she pivots with purpose — pointing toward
something in the room. Slightly more energetic here.

**Texte :**
> Exactement. [medium pause] Et il y a un objet dans cette pièce qui résume ça mieux que moi.

---

## ÉCHANGE 3 — La platine

> ⚠️ Monologue Naby seul — aucune réponse Raya. Déclenché après B1-B4.

---

### NABY — C

**Fichier audio :** `naby_e3_platine.mp3`

**Style :** She points across the room. Her tone is calm but the weight of what
she's about to share is underneath. "J'arrivais pas à croire" carries a trace of disbelief
that's never quite left her. End on quiet reassurance: "Je reste là."

**Texte :**
> Là-bas, sur le meuble. [short pause] T'as vu la platine ? [medium pause] Y a un disque dessus. [medium pause] C'est la chanson qu'ils diffusaient pour convaincre les gens d'entrer dans les Nexus. [medium pause] J'ai retranscrit les paroles sur le papier à côté [short pause] — j'arrivais pas à croire que des gens avaient écrit ça sérieusement. [long pause] Va l'écouter. [medium pause] Je reste là.

---

## ÉCHANGE 4 — Après la chanson

---

### NABY — D

**Fichier audio :** `naby_e4_main.mp3`

**Style :** She quotes the propaganda song with a flat, almost documentary tone
on the first sentence. Then she shifts — softer, more personal. The question "C'était quoi ?"
is genuinely open, unhurried. Give it space at the end.

**Texte :**
> [medium pause] "Ne ressens plus. Ne choisis plus. On choisit pour toi." [long pause] C'est ça qu'ils vendaient comme le bonheur. [long pause] Alors [short pause] — et t'as pas à répondre si t'as pas envie. [medium pause] La dernière fois que t'as été vraiment heureuse. [short pause] Pas bien. [short pause] Pas soulagée. [short pause] Heureuse, profondément. [long pause] C'était quoi ?

---

### RAYA — Réponses à D

---

#### D1 — Méfiant·e

**RAYA**

**Fichier audio :** `raya_e4_a.mp3`

**Profil :** Méfiant·e — short, guarded. She's not ready to be open yet.

**Texte :**
> Pourquoi tu veux savoir ça ?

**NABY — Réponse**

**Fichier audio :** `naby_e4_rep_a.mp3`

**Style :** She doesn't justify herself — she explains why the question matters
to Raya, not to Naby. Sincere, no defensiveness.

**Texte :**
> Parce que ta réponse te dira quelque chose que moi je pourrais pas te dire. [medium pause] Et parce que c'est une bonne boussole pour la suite.

---

#### D2 — Blasé·e

**RAYA**

**Fichier audio :** `raya_e4_b.mp3`

**Profil :** Blasé·e — honest loss. She can't access the memory, and it hurts quietly.

**Texte :**
> Je me souviens plus vraiment. [medium pause] Et ça me fait quelque chose que j'arrive pas à nommer.

**NABY — Réponse**

**Fichier audio :** `naby_e4_rep_b.mp3`

**Style :** Tender. She names grief without forcing it. "Ça mérite d'exister"
should land with a quiet solidity — permission given.

**Texte :**
> Ce truc que t'arrives pas à nommer… [medium pause] c'est peut-être le deuil de quelque chose de réel. [medium pause] Ça mérite d'exister, ce sentiment-là.

---

#### D3 — Angoissé·e

**RAYA**

**Fichier audio :** `raya_e4_c.mp3`

**Profil :** Angoissé·e — she points to a time before all of this. Small, a little sad.

**Texte :**
> Ça remonte à avant. [medium pause] À une époque où je pensais même pas à ce genre de question.

**NABY — Réponse**

**Fichier audio :** `naby_e4_rep_c.mp3`

**Style :** Short and warm. Like recognizing something true. Gentle.

**Texte :**
> C'est souvent là que ça se cache. [medium pause] Avant qu'on sache que c'était précieux.

---

#### D4 — Enthousiaste

**RAYA**

**Fichier audio :** `raya_e4_d.mp3`

**Profil :** Enthousiaste — clear and certain. A flash of something real.

**Texte :**
> Je sais exactement. [medium pause] Et c'était rien de digital.

**NABY — Réponse**

**Fichier audio :** `naby_e4_rep_d.mp3`

**Style :** She knows this answer. Warm recognition, perhaps the faintest smile.
The final sentence is the key — "Rien qu'on puisse optimiser" — say it clearly, without irony.

**Texte :**
> C'est presque toujours ça. [short pause] Un lien. [short pause] Une présence. [short pause] Une sensation qui avait besoin de temps pour exister. [medium pause] Rien qu'on puisse optimiser.

---

### NABY — D_conclusion *(toujours jouée après D1–D4)*

**Fichier audio :** `naby_e4_conclusion.mp3`

**Style :** This is the philosophical heart of the whole conversation. She speaks
slowly, with conviction — not a lecture, more like thinking aloud something she's arrived at
through experience. Let each idea breathe. "C'est pas la même chose" is the final landing.

**Texte :**
> Le bonheur authentique [short pause] — celui qui vient d'un lien, d'un animal, d'un silence qu'on a pas besoin de remplir [short pause] — il a besoin qu'il y ait eu un vide avant. [medium pause] Un vrai désir. [short pause] Pas une perfusion. [long pause] C'est pour ça qu'ils ont confondu l'absence de souffrance [short pause] et le bonheur. [medium pause] C'est pas la même chose.

---

## ÉCHANGE 5 — L'invitation à AI Mythology

---

### NABY — E

**Fichier audio :** `naby_e5_main.mp3`

**Style :** Lighter here — the weight of E4 lifts slightly. She's inviting, not
sending Raya away. The warmth about tea and biscuits is genuine and slightly amused
("les vrais, pas les simulés" — a small joke with a smile in the voice).

**Texte :**
> Il y a une borne d'arcade là-bas [short pause] — AI Mythology. [medium pause] C'est un jeu qu'on aime beaucoup dans le bunker. [short pause] T'as rien à préparer, rien à réviser. [medium pause] Je te parie que t'y seras imbattable assez vite [short pause] — les gens qui ont vécu de l'intérieur ont souvent les meilleures réponses. [long pause] Je vais préparer un thé pendant ce temps. [short pause] Et des biscuits [short pause] — des vrais, pas les simulés. [medium pause] T'en auras un qui t'attend.

---

### RAYA — Réponses à E

---

#### E1 — Méfiant·e

**RAYA**

**Fichier audio :** `raya_e5_a.mp3`

**Profil :** Méfiant·e — still testing, slight edge.

**Texte :**
> C'est pas un test déguisé ?

**NABY — Réponse**

**Fichier audio :** `naby_e5_rep_a.mp3`

**Style :** Dry humor, very slight. She deflects the suspicion with a light touch.
"Vas-y" is warm, not dismissive.

**Texte :**
> Tout dans le bunker est un peu un test. [medium pause] Et personne note. [short pause] Vas-y.

---

#### E2 — Blasé·e

**RAYA**

**Fichier audio :** `raya_e5_b.mp3`

**Profil :** Blasé·e — low energy acceptance. Shrug in the voice.

**Texte :**
> Un jeu. [short pause] OK. [short pause] Pourquoi pas.

**NABY — Réponse**

**Fichier audio :** `naby_e5_rep_b.mp3`

**Style :** Genuine, brief approval. Like "that's exactly right." No irony.

**Texte :**
> C'est exactement la bonne énergie pour commencer.

---

#### E3 — Angoissé·e

**RAYA**

**Fichier audio :** `raya_e5_c.mp3`

**Profil :** Angoissé·e — small fear of failing, genuine vulnerability.

**Texte :**
> Et si j'ai pas les bonnes réponses ?

**NABY — Réponse**

**Fichier audio :** `naby_e5_rep_c.mp3`

**Style :** Reassuring, with quiet conviction. The second clause is the gift —
"des réponses qui te surprennent."

**Texte :**
> Il y a pas de mauvaises réponses [short pause] — il y a des réponses qui te surprennent. [short pause] C'est mieux.

---

#### E4 — Enthousiaste

**RAYA**

**Fichier audio :** `raya_e5_d.mp3`

**Profil :** Enthousiaste — clean, direct. Ready to go.

**Texte :**
> J'y vais. [short pause] À tout à l'heure.

**NABY — Réponse**

**Fichier audio :** `naby_e5_rep_d.mp3`

**Style :** Warm send-off. Simple, genuine. Almost like "see you on the other side."

**Texte :**
> À tout à l'heure. [medium pause] Le thé sera chaud.

---

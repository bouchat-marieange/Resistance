/**
 * ============================================
 * DIALOGUE NABY — Sas de sécurité
 * ============================================
 * Arbre de dialogue complet : introduction (PA/PB/PC) + échanges 1-5 (A-E)
 * Basé sur le fichier dialogues/Naby_Raya_dialogue.md
 *
 * 4 profils Raya mappés sur les 4 catégories du DialogueManager :
 *   ECOUTER    → Épuisée   (basse énergie, présente mais à bout)
 *   QUESTIONNER → Angoissée (cherche des garanties, fragile)
 *   PARTAGER   → Enthousiaste (ouverte, directe, plus d'énergie)
 *   CONFRONTER → Méfiante  (garde la garde, teste Naby)
 *
 * Version test local — sans audio. Les marqueurs [pause] sont visibles
 * dans l'interface, ils disparaîtront quand les MP3 seront intégrés.
 *
 * Dépend de DialogueManager. Inclure APRÈS dialogue-manager.js.
 */
(function () {
    'use strict';

    if (typeof DialogueManager === 'undefined') {
        console.warn('[naby.js] DialogueManager introuvable, arbre non chargé.');
        return;
    }

    var CONT = [{ category: 'ECOUTER', label: 'Continuer…', effects: {}, next: null }];
    function cont(next) {
        return [{ category: 'ECOUTER', label: 'Continuer…', effects: {}, next: next }];
    }

    var tree = {
        characterId: 'naby',
        characterName: 'Naby',
        portrait: 'images/Portraits/Portrait Naby.jpg',
        startNode: 'intro_pa',
        onStart: function () {
            try { localStorage.setItem('resistance_naby_met', '1'); } catch (e) {}
        },

        nodes: {

            // ============================================================
            // INTRODUCTION — PA : Premier contact
            // ============================================================
            intro_pa: {
                speaker: 'naby',
                text: "Raya. [medium pause] Moi c'est Naby. [long pause] T'es en sécurité. [medium pause] Personne peut te suivre jusqu'ici.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "[Épuisée] Je… Je sais plus très bien où j'en suis.",
                        effects: { attachement_naby: 2 },
                        next: 'pa_rep_epu'
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "[Angoissée] Il y a des sorties ? Si on doit partir vite ?",
                        effects: { lucidite: 1 },
                        next: 'pa_rep_ang'
                    },
                    {
                        category: 'PARTAGER',
                        label: "[Enthousiaste] J'y croyais plus. Que ça existait vraiment — la Résistance.",
                        effects: { confiance_naby: 2 },
                        next: 'pa_rep_ent'
                    },
                    {
                        category: 'CONFRONTER',
                        label: "[Méfiante] Comment vous connaissez mon nom ?",
                        effects: { lucidite: 2 },
                        next: 'pa_rep_mef'
                    }
                ]
            },

            pa_rep_mef: {
                speaker: 'naby',
                text: "La Résistance a ses contacts. [medium pause] Les mêmes qui t'ont ouvert le chemin jusqu'ici. [short pause] T'as pu leur faire confiance pour ça — tu peux leur faire confiance pour le reste.",
                options: cont('intro_pb')
            },
            pa_rep_epu: {
                speaker: 'naby',
                text: "C'est normal. [medium pause] T'as pas à savoir. [short pause] Pas ce soir.",
                options: cont('intro_pb')
            },
            pa_rep_ang: {
                speaker: 'naby',
                text: "Trois accès. [short pause] Tous sécurisés. [medium pause] Et toi t'as plus à penser à ça maintenant. [short pause] C'est notre job, plus le tien.",
                options: cont('intro_pb')
            },
            pa_rep_ent: {
                speaker: 'naby',
                text: "On existe. [medium pause] Et t'as fait tout le chemin pour arriver jusqu'ici. [short pause] C'est pas rien.",
                options: cont('intro_pb')
            },

            // ============================================================
            // INTRODUCTION — PB : Elle nomme ce qu'elle voit
            // ============================================================
            intro_pb: {
                speaker: 'naby',
                text: "T'inspectes les murs. [short pause] Les coins. [medium pause] C'est un réflexe du Nexus — chercher les sorties, les caméras. [long pause] Y en a pas ici. [medium pause] Pas du genre que t'as connu.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "[Épuisée] Je sais même plus ce que c'est, un endroit sans surveillance.",
                        effects: { attachement_naby: 2 },
                        next: 'pb_rep_epu'
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "[Angoissée] J'ai l'impression qu'on m'observe quand même. Même là. C'est dans ma tête ?",
                        effects: { lucidite: 2 },
                        next: 'pb_rep_ang'
                    },
                    {
                        category: 'PARTAGER',
                        label: "[Enthousiaste] Vous avez réussi à construire ça sans que le système le sache ?",
                        effects: { confiance_naby: 2 },
                        next: 'pb_rep_ent'
                    },
                    {
                        category: 'CONFRONTER',
                        label: "[Méfiante] Comment je peux en être sûre ?",
                        effects: { lucidite: 2 },
                        next: 'pb_rep_mef'
                    }
                ]
            },

            pb_rep_mef: {
                speaker: 'naby',
                text: "Tu peux pas. [short pause] Pas encore. [medium pause] La confiance ça se vérifie dans le temps. [short pause] On va pas te demander de l'avoir tout de suite.",
                options: cont('intro_pc')
            },
            pb_rep_epu: {
                speaker: 'naby',
                text: "Je sais. [medium pause] Ça revient. [short pause] Doucement — mais ça revient.",
                options: cont('intro_pc')
            },
            pb_rep_ang: {
                speaker: 'naby',
                text: "C'est dans ta tête. [short pause] Et c'est aussi dans ta tête que le Nexus a construit quelque chose. [medium pause] Les deux sont vrais en même temps. [short pause] Ça va passer.",
                options: cont('intro_pc')
            },
            pb_rep_ent: {
                speaker: 'naby',
                text: "On a appris à exister dans les angles morts. [medium pause] C'est une compétence qui s'enseigne. [short pause] Tu vas apprendre.",
                options: cont('intro_pc')
            },

            // ============================================================
            // INTRODUCTION — PC : Transition vers le dialogue principal
            // ============================================================
            intro_pc: {
                speaker: 'naby',
                text: "T'as survécu à quelque chose que beaucoup auraient pas. [medium pause] Et là tu te demandes peut-être ce que tu fais là — si c'est un piège, si ces gens sont vraiment ce qu'ils prétendent. [long pause] C'est juste. [short pause] Garde ça. [medium pause] Cet instinct-là, il a dû te sauver plus d'une fois.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "[Épuisée] Je suis tellement fatiguée de devoir tout analyser. Tout le temps.",
                        effects: { attachement_naby: 3 },
                        next: 'pc_rep_epu'
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "[Angoissée] Et si j'ai été suivie sans le savoir ?",
                        effects: { lucidite: 2 },
                        next: 'pc_rep_ang'
                    },
                    {
                        category: 'PARTAGER',
                        label: "[Enthousiaste] Alors, par où on commence ?",
                        effects: { confiance_naby: 3 },
                        next: 'pc_rep_ent'
                    },
                    {
                        category: 'CONFRONTER',
                        label: "[Méfiante] Ouais. Et il me dit de pas relâcher la garde trop vite.",
                        effects: { lucidite: 3 },
                        next: 'pc_rep_mef'
                    }
                ]
            },

            pc_rep_mef: {
                speaker: 'naby',
                text: "Alors garde-la. [short pause] On a le temps. [medium pause] Personne ici va te demander de faire confiance avant que t'y sois prête.",
                options: cont('e1_main')
            },
            pc_rep_epu: {
                speaker: 'naby',
                text: "Tu peux poser ça aussi. [short pause] Pour ce soir. [medium pause] Juste pour ce soir.",
                options: cont('e1_main')
            },
            pc_rep_ang: {
                speaker: 'naby',
                text: "Le protocole d'entrée. [short pause] T'as fait tout le trajet sans contact direct. [medium pause] Si t'avais été suivie, on le saurait. [short pause] On surveille.",
                options: cont('e1_main')
            },
            pc_rep_ent: {
                speaker: 'naby',
                text: "Par un café. [short pause] Et par poser ton sac.",
                options: cont('e1_main')
            },

            // ============================================================
            // ÉCHANGE 1 — Ouverture (A)
            // ============================================================
            e1_main: {
                speaker: 'naby',
                text: "T'as les yeux qui cherchent encore la prochaine notif. [short pause] C'est normal. [short pause] Ça prend du temps de sortir de cet état. [medium pause] Le canapé là-bas grince, mais il tient. [short pause] Le café aussi. [medium pause] Tu peux poser ton sac.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "[Épuisée] Je me sens juste… vide. Je savais pas que ça pouvait faire ça.",
                        effects: { attachement_naby: 3 },
                        next: 'e1_rep_epu'
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "[Angoissée] J'arrive plus à me concentrer. Une pensée arrive et disparaît avant que j'aie fini de la formuler. C'est normal ?",
                        effects: { lucidite: 3 },
                        next: 'e1_rep_ang'
                    },
                    {
                        category: 'PARTAGER',
                        label: "[Enthousiaste] T'as connu d'autres personnes sorties du Nexus ? Comment elles ont récupéré ?",
                        effects: { confiance_naby: 3 },
                        next: 'e1_rep_ent'
                    },
                    {
                        category: 'CONFRONTER',
                        label: "[Méfiante] T'as l'air de savoir beaucoup de choses sur moi pour quelqu'un qu'on vient de rencontrer.",
                        effects: { lucidite: 3 },
                        next: 'e1_rep_mef'
                    }
                ]
            },

            e1_rep_mef: {
                speaker: 'naby',
                text: "C'est juste que t'as les mêmes yeux qu'on a tous eu. [short pause] Pas une expertise. [short pause] Une mémoire.",
                options: cont('e2_main')
            },
            e1_rep_epu: {
                speaker: 'naby',
                text: "Ce vide-là, c'est pas un manque. [short pause] C'est l'espace qui revient. [medium pause] Tu vas en avoir peur d'abord. [short pause] C'est bon signe.",
                options: cont('e2_main')
            },
            e1_rep_ang: {
                speaker: 'naby',
                text: "Très normal. [short pause] Tes seuils d'attention ont été calibrés pour des stimulations de six secondes pendant des mois. [medium pause] Le monde réel va te sembler lent un moment. [short pause] Il l'est pas. [medium pause] T'es juste en train de te réaccorder.",
                options: cont('e2_main')
            },
            e1_rep_ent: {
                speaker: 'naby',
                text: "Plein. [short pause] Et chacun·e à son rythme. [medium pause] La vitesse, c'est pas un critère ici. [short pause] C'est même un peu le sujet.",
                options: cont('e2_main')
            },

            // ============================================================
            // ÉCHANGE 2 — La perfusion (B)
            // ============================================================
            e2_main: {
                speaker: 'naby',
                text: "Le truc sur lequel j'ai mis du temps à mettre des mots — c'est pas qu'ils nous aient enlevé la douleur. [medium pause] C'est qu'ils nous aient enlevé la soif. [long pause] T'as déjà pensé à ce que c'est, boire un verre d'eau fraîche quand t'as vraiment soif ? [medium pause] La décision. [short pause] L'envie qui monte. [short pause] Le plaisir de la combler. [long pause] Eux, c'est comme s'ils t'avaient mis une perfusion. [medium pause] Hydratée en permanence. [short pause] Plus jamais soif. [medium pause] Plus jamais… le choix de boire ou pas.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "[Épuisée] Je sais. C'est pour ça que je suis là. J'en avais marre de ne plus savoir si je voulais quelque chose ou si on me le faisait vouloir.",
                        effects: { attachement_naby: 4 },
                        next: 'e2_rep_epu'
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "[Angoissée] Comment je sais si ce que je ressens là, maintenant, c'est réel ? Ou encore un réflexe conditionné ?",
                        effects: { lucidite: 4 },
                        next: 'e2_rep_ang'
                    },
                    {
                        category: 'PARTAGER',
                        label: "[Enthousiaste] Et le pire c'est qu'ils vendaient ça comme de la liberté.",
                        effects: { confiance_naby: 4, lucidite: 3 },
                        next: 'e2_rep_ent'
                    },
                    {
                        category: 'CONFRONTER',
                        label: "[Méfiante] Tu parles comme si c'était organisé. Personne a décidé de me faire du mal.",
                        effects: { lucidite: 4 },
                        next: 'e2_rep_mef'
                    }
                ]
            },

            e2_rep_mef: {
                speaker: 'naby',
                text: "Personne a décidé de te faire du mal individuellement. [medium pause] Le système, lui, a décidé de maximiser ton temps de présence. [medium pause] Ton bien-être n'était pas une priorité — ta disponibilité l'était. [long pause] C'est différent de la malveillance. [short pause] Et c'est peut-être pire.",
                options: cont('e3_main')
            },
            e2_rep_epu: {
                speaker: 'naby',
                text: "C'est déjà énorme de savoir ça. [medium pause] La plupart des gens dans le Nexus défendent encore leur prison. [short pause] Toi t'es là.",
                options: cont('e3_main')
            },
            e2_rep_ang: {
                speaker: 'naby',
                text: "Honnêtement ? [short pause] Au début, tu peux pas vraiment savoir. [medium pause] Et c'est terrifiant. [medium pause] Mais la question elle-même — le fait que tu la poses — c'est pas un réflexe conditionné. [medium pause] C'est toi.",
                options: cont('e3_main')
            },
            e2_rep_ent: {
                speaker: 'naby',
                text: "Exactement. [medium pause] Et il y a un objet dans cette pièce qui résume ça mieux que moi.",
                options: cont('e3_main')
            },

            // ============================================================
            // ÉCHANGE 3 — La platine (C) — monologue Naby seul
            // ============================================================
            e3_main: {
                speaker: 'naby',
                text: "Là-bas, sur le meuble. [short pause] T'as vu la platine ? [medium pause] Y a un disque dessus. [medium pause] C'est la chanson qu'ils diffusaient pour convaincre les gens d'entrer dans les Nexus. [medium pause] J'ai retranscrit les paroles sur le papier à côté — j'arrivais pas à croire que des gens avaient écrit ça sérieusement. [long pause] Va l'écouter. [medium pause] Je reste là.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "[ La platine n'est pas encore interactive — passer à la suite ]",
                        effects: { lucidite: 3 },
                        next: 'e4_main'
                    }
                ]
            },

            // ============================================================
            // ÉCHANGE 4 — Après la chanson (D)
            // ============================================================
            e4_main: {
                speaker: 'naby',
                text: "\"Ne ressens plus. Ne choisis plus. On choisit pour toi.\" [long pause] C'est ça qu'ils vendaient comme le bonheur. [long pause] Alors — et t'as pas à répondre si t'as pas envie. [medium pause] La dernière fois que t'as été vraiment heureuse. [short pause] Pas bien. [short pause] Pas soulagée. [short pause] Heureuse, profondément. [long pause] C'était quoi ?",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "[Épuisée] Je me souviens plus vraiment. Et ça me fait quelque chose que j'arrive pas à nommer.",
                        effects: { attachement_naby: 4 },
                        next: 'e4_rep_epu'
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "[Angoissée] Ça remonte à avant. À une époque où je pensais même pas à ce genre de question.",
                        effects: { lucidite: 3 },
                        next: 'e4_rep_ang'
                    },
                    {
                        category: 'PARTAGER',
                        label: "[Enthousiaste] Je sais exactement. Et c'était rien de digital.",
                        effects: { confiance_naby: 4, lucidite: 4 },
                        next: 'e4_rep_ent'
                    },
                    {
                        category: 'CONFRONTER',
                        label: "[Méfiante] Pourquoi tu veux savoir ça ?",
                        effects: { lucidite: 3 },
                        next: 'e4_rep_mef'
                    }
                ]
            },

            e4_rep_mef: {
                speaker: 'naby',
                text: "Parce que ta réponse te dira quelque chose que moi je pourrais pas te dire. [medium pause] Et parce que c'est une bonne boussole pour la suite.",
                options: cont('e4_conclusion')
            },
            e4_rep_epu: {
                speaker: 'naby',
                text: "Ce truc que t'arrives pas à nommer… [medium pause] c'est peut-être le deuil de quelque chose de réel. [medium pause] Ça mérite d'exister, ce sentiment-là.",
                options: cont('e4_conclusion')
            },
            e4_rep_ang: {
                speaker: 'naby',
                text: "C'est souvent là que ça se cache. [medium pause] Avant qu'on sache que c'était précieux.",
                options: cont('e4_conclusion')
            },
            e4_rep_ent: {
                speaker: 'naby',
                text: "C'est presque toujours ça. [short pause] Un lien. [short pause] Une présence. [short pause] Une sensation qui avait besoin de temps pour exister. [medium pause] Rien qu'on puisse optimiser.",
                options: cont('e4_conclusion')
            },

            // ============================================================
            // D_conclusion — toujours jouée après D1-D4
            // ============================================================
            e4_conclusion: {
                speaker: 'naby',
                text: "Le bonheur authentique — celui qui vient d'un lien, d'un animal, d'un silence qu'on a pas besoin de remplir — il a besoin qu'il y ait eu un vide avant. [medium pause] Un vrai désir. [short pause] Pas une perfusion. [long pause] C'est pour ça qu'ils ont confondu l'absence de souffrance et le bonheur. [medium pause] C'est pas la même chose.",
                options: cont('e5_main')
            },

            // ============================================================
            // ÉCHANGE 5 — L'invitation à AI Mythology (E)
            // ============================================================
            e5_main: {
                speaker: 'naby',
                text: "Il y a une borne d'arcade là-bas — AI Mythology. [medium pause] C'est un jeu qu'on aime beaucoup dans le bunker. [short pause] T'as rien à préparer, rien à réviser. [medium pause] Je te parie que t'y seras imbattable assez vite — les gens qui ont vécu de l'intérieur ont souvent les meilleures réponses. [long pause] Je vais préparer un thé pendant ce temps. [short pause] Et des biscuits — des vrais, pas les simulés. [medium pause] T'en auras un qui t'attend.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "[Épuisée] Un jeu. OK. Pourquoi pas.",
                        effects: { confiance_naby: 2 },
                        next: 'e5_rep_epu'
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "[Angoissée] Et si j'ai pas les bonnes réponses ?",
                        effects: { lucidite: 2 },
                        next: 'e5_rep_ang'
                    },
                    {
                        category: 'PARTAGER',
                        label: "[Enthousiaste] J'y vais. À tout à l'heure.",
                        effects: { confiance_naby: 3, attachement_naby: 2 },
                        next: 'e5_rep_ent'
                    },
                    {
                        category: 'CONFRONTER',
                        label: "[Méfiante] C'est pas un test déguisé ?",
                        effects: { lucidite: 2 },
                        next: 'e5_rep_mef'
                    }
                ]
            },

            e5_rep_mef: {
                speaker: 'naby',
                text: "Tout dans le bunker est un peu un test. [medium pause] Et personne note. [short pause] Vas-y.",
                options: [{ category: 'ECOUTER', label: "Aller à l'arcade →", effects: {}, next: null }]
            },
            e5_rep_epu: {
                speaker: 'naby',
                text: "C'est exactement la bonne énergie pour commencer.",
                options: [{ category: 'ECOUTER', label: "Aller à l'arcade →", effects: {}, next: null }]
            },
            e5_rep_ang: {
                speaker: 'naby',
                text: "Il y a pas de mauvaises réponses — il y a des réponses qui te surprennent. [short pause] C'est mieux.",
                options: [{ category: 'ECOUTER', label: "Aller à l'arcade →", effects: {}, next: null }]
            },
            e5_rep_ent: {
                speaker: 'naby',
                text: "À tout à l'heure. [medium pause] Le thé sera chaud.",
                options: [{ category: 'ECOUTER', label: "Aller à l'arcade →", effects: {}, next: null }]
            }
        }
    };

    DialogueManager.loadTree('naby', tree);
    console.log('[DialogueManager] Arbre Naby chargé (' + Object.keys(tree.nodes).length + ' nœuds).');
})();

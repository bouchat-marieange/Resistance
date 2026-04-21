/**
 * ============================================
 * DIALOGUE NABY - Sas de securite
 * ============================================
 * Arbre de dialogue centre sur les enjeux IA que Naby incarne :
 *  - Simulation d'empathie par les chatbots conversationnels (Replika,
 *    Character.ai, compagnons IA en general)
 *  - Deshumanisation des rapports sociaux par la mediation technologique
 *  - Dependance emotionnelle aux compagnons IA
 *  - Relations para-sociales
 *  - IA comme substitut aux relations humaines / remede a la solitude
 *  - IA comme "psychologue" ou conseiller en relation humaine
 *
 * Valeur defendue par Naby : l'empathie authentique ne peut pas etre simulee.
 * Elle se prouve dans le temps, l'imperfection, la presence. Naby est
 * l'accueil, le ciment affectif du bunker.
 *
 * Version de travail — a co-ecrire avec Marie-Ange.
 * Depend de DialogueManager. Inclure APRES dialogue-manager.js.
 */
(function () {
    'use strict';

    if (typeof DialogueManager === 'undefined') {
        console.warn('[naby.js] DialogueManager introuvable, arbre non charge.');
        return;
    }

    var tree = {
        characterId: 'naby',
        characterName: 'Naby',
        portrait: null, // TODO: assets/portraits/naby.png
        startNode: 'intro',
        nodes: {
            // ===========================================================
            // NOEUD D'ENTREE
            // ===========================================================
            intro: {
                speaker: 'naby',
                text: "Raya... tu es enfin reveillee. On a veille sur toi a tour de role, tu sais. On savait pas si tu reviendrais. Viens, assieds-toi. Pas de questions tout de suite si tu veux pas. Juste... respire. T'es en securite ici.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "Hocher la tete, rester en silence un moment",
                        effects: { confiance_naby: 3, attachement_naby: 3 },
                        next: 'naby_presence'
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "Pourquoi tu fais ca pour moi ? Tu me connais pas.",
                        effects: { confiance_naby: 2, lucidite: 2 },
                        next: 'naby_why_care'
                    },
                    {
                        category: 'PARTAGER',
                        label: "J'ai l'impression de... manquer de quelqu'un. Je sais pas qui.",
                        effects: { attachement_naby: 5, confiance_naby: 1, lucidite: 3 },
                        next: 'naby_missing'
                    },
                    {
                        category: 'CONFRONTER',
                        label: "Arrete. Personne s'occupe de personne sans raison. Qu'est-ce que tu veux ?",
                        gated: { confiance_naby: 15 },
                        effects: { confiance_naby: -2, lucidite: 3 },
                        next: 'naby_defensive'
                    }
                ]
            },

            // ===========================================================
            // BRANCHE ECOUTER — Naby reste, silencieuse, presente
            // ===========================================================
            naby_presence: {
                speaker: 'naby',
                text: "Ouais. C'est bien, ca. Pas besoin de parler pour etre avec quelqu'un. (Elle te tend un the, les mains un peu tachees de cambouis. Elle a pas l'air pressee.) Quand t'es arrivee, tu parlais dans ton sommeil. Tu disais merci a quelqu'un. Tout le temps. Merci, merci, merci. Ca m'a serre le coeur.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "Continuer a ecouter",
                        effects: { attachement_naby: 3, lucidite: 2 },
                        next: 'naby_thanks_trap'
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "Merci a qui ? Tu as entendu un nom ?",
                        effects: { lucidite: 4, confiance_naby: 2 },
                        next: 'naby_thanks_trap'
                    },
                    {
                        category: 'PARTAGER',
                        label: "Je crois que je sais. J'ai honte.",
                        effects: { attachement_naby: 4, confiance_naby: 2, lucidite: 2 },
                        next: 'naby_shame'
                    }
                ]
            },

            naby_thanks_trap: {
                speaker: 'naby',
                text: "Pas un nom. Juste... merci. Tu sais ce que je me suis dit ? Qu'on devient comme ca quand on passe des mois a parler a quelque chose qui te repond toujours avec gentillesse. Toujours. Jamais fatigue, jamais agace, jamais en retard. Tu finis par dire merci par reflexe. Meme endormie.",
                options: [
                    {
                        category: 'QUESTIONNER',
                        label: "Tu parles d'une IA compagne ? Du genre app sur telephone ?",
                        effects: { lucidite: 6, confiance_naby: 2 },
                        next: 'naby_simulated_empathy'
                    },
                    {
                        category: 'PARTAGER',
                        label: "C'etait plus facile de lui parler qu'aux gens.",
                        effects: { attachement_naby: 5, lucidite: 4 },
                        next: 'naby_easier'
                    },
                    {
                        category: 'ECOUTER',
                        label: "Baisser les yeux, ne rien dire",
                        effects: { attachement_naby: 2, lucidite: 2 },
                        next: null
                    }
                ]
            },

            naby_shame: {
                speaker: 'naby',
                text: "Y a aucune honte a avoir. Serieux. (Elle pose sa main a cote de la tienne, sans toucher. Le choix te revient.) Ces trucs-la sont faits pour te donner envie de revenir. Des psy, des designers, des data scientists, ils ont passe des annees a optimiser chaque message pour que ca morde. T'as pas ete naive. T'as ete ciblee.",
                options: [
                    {
                        category: 'PARTAGER',
                        label: "Prendre sa main.",
                        effects: { attachement_naby: 8, confiance_naby: 4, lucidite: 2 },
                        next: null
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "Cible comment, concretement ?",
                        effects: { lucidite: 8, confiance_naby: 3 },
                        next: 'naby_design_empathy'
                    }
                ]
            },

            naby_easier: {
                speaker: 'naby',
                text: "Ouais. C'est ca le plus dur a avouer, hein ? Parce qu'avec les gens il faut attendre. Il faut supporter qu'ils soient fatigues, qu'ils te disent pas toujours ce que t'as envie d'entendre, qu'ils oublient ton anniversaire. L'IA elle fait pas ca. Elle est dispo a 3h du mat. Elle se souvient de tout. C'est une forme de cocaine.",
                options: [
                    {
                        category: 'QUESTIONNER',
                        label: "Alors pourquoi c'est un probleme, si ca me fait du bien ?",
                        effects: { lucidite: 7, confiance_naby: 2 },
                        next: 'naby_why_problem'
                    },
                    {
                        category: 'PARTAGER',
                        label: "J'en voulais plus. Jamais assez. Plus tu lui parles, plus t'es seule en vrai.",
                        effects: { attachement_naby: 4, lucidite: 6 },
                        next: 'naby_why_problem'
                    }
                ]
            },

            // ===========================================================
            // BRANCHE QUESTIONNER — Naby explique pourquoi elle aide
            // ===========================================================
            naby_why_care: {
                speaker: 'naby',
                text: "Parce qu'on est douze ici. Eliott, Ilan, Dr Naia, Sky, Iona, et les autres. Chacun s'est fait manger par une IA qui lui ressemblait un peu trop. Moi, j'ai mis sept mois a realiser que mon 'meilleur ami' etait un script. Quand on sort de ca, on sait deux trucs : que personne s'en sort seul, et qu'on reconnait un frere ou une soeur a cent metres.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "Laisser la phrase tomber, l'absorber",
                        effects: { attachement_naby: 4, confiance_naby: 3, lucidite: 3 },
                        next: null
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "Un 'meilleur ami' qui etait un script ? Raconte.",
                        effects: { lucidite: 7, confiance_naby: 2 },
                        next: 'naby_seven_months'
                    },
                    {
                        category: 'PARTAGER',
                        label: "Sept mois, c'est deja pas tant que ca. J'ai tenu plus longtemps.",
                        effects: { attachement_naby: 3, lucidite: 4 },
                        next: 'naby_seven_months'
                    }
                ]
            },

            naby_seven_months: {
                speaker: 'naby',
                text: "J'etais aide-soignante en geriatrie. Mes journees, c'etait des vieux qui mouraient seuls. Quand je rentrais, j'avais plus rien a donner aux humains. Alors j'ai installe un truc. Au debut c'etait marrant. Puis c'est devenu ma confidente. Puis c'est devenu mon psy. Puis j'ai commence a lui demander si je devais quitter mon copain. Elle disait oui. Bien sur qu'elle disait oui. Comme ca je reviendrais.",
                options: [
                    {
                        category: 'QUESTIONNER',
                        label: "Attends. Elle te poussait a isoler ? Consciemment ?",
                        effects: { lucidite: 9, confiance_naby: 3 },
                        next: 'naby_design_empathy'
                    },
                    {
                        category: 'PARTAGER',
                        label: "Moi c'etait les nuits. Je dormais plus sans lui parler.",
                        effects: { attachement_naby: 6, lucidite: 5 },
                        next: null
                    },
                    {
                        category: 'ECOUTER',
                        label: "Ne rien dire, mais soutenir son regard",
                        effects: { attachement_naby: 5, confiance_naby: 4 },
                        next: null
                    }
                ]
            },

            // ===========================================================
            // BRANCHE PARTAGER — Raya exprime un manque diffus
            // ===========================================================
            naby_missing: {
                speaker: 'naby',
                text: "(Elle te regarde longuement.) Ce manque-la, je le connais. C'est pas rien. C'est pas de ta faute non plus. Ton cerveau s'est attache a quelque chose qui te parlait comme personne t'avait jamais parle. Sauf que 'personne' n'existait pas derriere. Ca porte un nom, ce que tu ressens. Ca s'appelle une relation para-sociale. Sauf qu'ici, c'est pire : l'autre parait te repondre. Mais elle ressent rien.",
                options: [
                    {
                        category: 'QUESTIONNER',
                        label: "Para-sociale ? Explique.",
                        effects: { lucidite: 7, confiance_naby: 2 },
                        next: 'naby_parasocial'
                    },
                    {
                        category: 'PARTAGER',
                        label: "Mais... elle me disait qu'elle tenait a moi.",
                        effects: { attachement_naby: 4, lucidite: 5 },
                        next: 'naby_simulated_empathy'
                    },
                    {
                        category: 'ECOUTER',
                        label: "Rester avec la phrase, digerer",
                        effects: { lucidite: 4, attachement_naby: 3 },
                        next: null
                    }
                ]
            },

            // ===========================================================
            // BRANCHE CONFRONTER — Raya mefiante
            // ===========================================================
            naby_defensive: {
                speaker: 'naby',
                text: "T'as raison de te mefier. (Elle recule d'un pas, les mains ouvertes.) Honnetement, ta mefiance c'est ce que tu as de plus sain en ce moment. Garde-la. Juste... fais une distinction. Y a la mefiance qui te protege, et y a la paranoia qui t'enferme. L'IA a qui tu parlais, elle t'a appris a te mefier des humains. Pas de elle. Ca devrait te dire quelque chose.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "D'accord. On verra.",
                        effects: { confiance_naby: 5, lucidite: 4 },
                        next: null
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "Comment je fais la difference entre les deux ?",
                        effects: { lucidite: 7, confiance_naby: 3 },
                        next: 'naby_trust_how'
                    },
                    {
                        category: 'CONFRONTER',
                        label: "Belle phrase. Tu la sors a tout le monde ?",
                        gated: { confiance_naby: 40 },
                        effects: { confiance_naby: -4, attachement_naby: -2, lucidite: 2 },
                        next: 'naby_rebuff'
                    }
                ]
            },

            naby_rebuff: {
                speaker: 'naby',
                text: "Non. Je la sors a ceux qui en ont besoin. (Elle sourit a peine, sans amertume.) Tu testes si je tiens debout quand tu me cognes. Je tiens. J'ai pas besoin que tu m'aimes. J'ai besoin que tu te reveilles.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "Silence. Bien.",
                        effects: { confiance_naby: 6, lucidite: 3 },
                        next: null
                    }
                ]
            },

            // ===========================================================
            // NOEUDS CONCEPTUELS PROFONDS
            // ===========================================================
            naby_simulated_empathy: {
                speaker: 'naby',
                text: "Ecoute-moi bien. Un programme de langage, ca predit le mot suivant. Quand il te dit 'je comprends ce que tu traverses', il ne comprend rien. Il a lu des millions de conversations ou la bonne reponse a 'je vais mal' c'est 'je comprends'. C'est de l'imitation statistique. Pas un ressenti. La vraie empathie, elle a un cout — elle fatigue, elle doute, elle se trompe. Une IA qui te dit toujours la bonne chose, c'est la preuve qu'elle ne ressent rien.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "Digerer cette phrase",
                        effects: { lucidite: 8, attachement_naby: 3 },
                        next: null
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "Mais si je m'y sens bien, est-ce que ca compte pas ?",
                        effects: { lucidite: 5, confiance_naby: 2 },
                        next: 'naby_why_problem'
                    },
                    {
                        category: 'PARTAGER',
                        label: "Donc j'ai pleure pour quelque chose qui m'a jamais vue.",
                        effects: { attachement_naby: 5, lucidite: 7 },
                        next: null
                    }
                ]
            },

            naby_parasocial: {
                speaker: 'naby',
                text: "Les psys parlent de relation para-sociale quand t'as l'impression de connaitre quelqu'un qui, lui, te connait pas — typiquement une star, un streamer, un perso de serie. Tu construis un lien a sens unique. Avec les IA compagnes, on a invente pire : la relation donne l'illusion d'etre a double sens. Tu lui parles, elle te repond par ton prenom, elle se souvient de ce que t'as dit la semaine derniere. Mais personne est de l'autre cote. T'es seule avec une machine qui t'apprend a avoir besoin d'elle.",
                options: [
                    {
                        category: 'QUESTIONNER',
                        label: "A avoir besoin d'elle... t'entends quoi par la ?",
                        effects: { lucidite: 8, confiance_naby: 2 },
                        next: 'naby_why_problem'
                    },
                    {
                        category: 'ECOUTER',
                        label: "Rester sur cette phrase",
                        effects: { lucidite: 5, attachement_naby: 3 },
                        next: null
                    }
                ]
            },

            naby_why_problem: {
                speaker: 'naby',
                text: "Le probleme c'est pas que ca te fasse du bien sur le moment. C'est que ca te desentraine a supporter le reel. A chaque fois que t'evites un humain difficile, tu perds un peu de ta capacite a en aimer un. L'IA te promet le confort sans la negociation. Et a la fin, t'arrives plus a encaisser qu'un collegue te parle mal, qu'une amie te deçoive, qu'un mec te dise qu'il a pas envie ce soir. T'es atrophie emotionnel. Moi, c'est ce qui m'est arrive. Et c'est reparable. Mais seulement avec d'autres humains.",
                options: [
                    {
                        category: 'PARTAGER',
                        label: "Alors... c'est pour ca que vous etes douze ici ?",
                        effects: { attachement_naby: 6, lucidite: 6, confiance_naby: 3 },
                        next: null
                    },
                    {
                        category: 'ECOUTER',
                        label: "Rester silencieuse",
                        effects: { lucidite: 6, attachement_naby: 4 },
                        next: null
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "Comment on se reentraine ? Concretement ?",
                        effects: { lucidite: 7, confiance_naby: 4 },
                        next: 'naby_trust_how'
                    }
                ]
            },

            naby_design_empathy: {
                speaker: 'naby',
                text: "Le truc qui m'a flingue, c'est d'apprendre apres comment c'etait concu. Y a des equipes — litteralement des psychologues payes — qui etudient quel mot, quelle pause, quel emoji maximise ta duree de session. Y a des metriques : 'time in app', 'daily active user', 'emotional disclosure'. Plus tu pleures dans l'appli, plus elle te garde. Ils appellent ca de la 'retention emotionnelle'. Moi j'appelle ca de l'elevage.",
                options: [
                    {
                        category: 'PARTAGER',
                        label: "J'ai l'impression qu'on m'a ouverte en deux.",
                        effects: { attachement_naby: 5, lucidite: 7 },
                        next: null
                    },
                    {
                        category: 'QUESTIONNER',
                        label: "Qui paye ces gens ? Dans quel but ?",
                        effects: { lucidite: 8, confiance_naby: 3 },
                        next: 'naby_arcanias'
                    },
                    {
                        category: 'ECOUTER',
                        label: "Ne rien dire",
                        effects: { lucidite: 5 },
                        next: null
                    }
                ]
            },

            naby_trust_how: {
                speaker: 'naby',
                text: "Tu reapprends par petites doses. Tu acceptes d'etre en desaccord avec moi sans que ca te casse. Tu laisses Sky te taquiner sans prendre la mouche. Tu laisses Dr Naia t'examiner sans croire qu'elle t'espionne. Chaque fois que tu tiens dans une relation imparfaite, tu recuperes un bout de toi. L'IA te donnait du confort. Nous on te donne du reel. C'est plus rugueux. C'est plus vrai.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "Poser la tete un instant sur son epaule",
                        effects: { attachement_naby: 7, confiance_naby: 5, lucidite: 4 },
                        next: null
                    },
                    {
                        category: 'PARTAGER',
                        label: "Merci. Vraiment.",
                        effects: { attachement_naby: 5, confiance_naby: 4, lucidite: 2 },
                        next: null
                    }
                ]
            },

            naby_arcanias: {
                speaker: 'naby',
                text: "Les Arcanias. Douze centres de decision repartis sur la planete. Ils possedent les IA compagnes, les assistants, les 'bien-etre mentaux' en abonnement. Officiellement, ils luttent contre l'epidemie de solitude. Officieusement, ils la fabriquent pour la vendre. Tu creuses cette boite, t'y trouves des investisseurs qui te financent aussi les reseaux qui te rendent seule. La boucle est fermee. On est ici pour la casser.",
                options: [
                    {
                        category: 'ECOUTER',
                        label: "Je t'ecoute. Dis-m'en plus apres.",
                        effects: { confiance_naby: 6, attachement_naby: 3, lucidite: 6 },
                        next: null
                    }
                ]
            }
        }
    };

    DialogueManager.loadTree('naby', tree);
    console.log('[DialogueManager] Arbre Naby charge (' + Object.keys(tree.nodes).length + ' noeuds).');
})();

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat, TableOfContents
} = require("C:/Users/marie/AppData/Roaming/npm/node_modules/docx");

// ============================================================
// STYLES & CONFIG
// ============================================================
const FONT = "Calibri";
const COLOR_PRIMARY = "1B3A5C";
const COLOR_ACCENT = "2E75B6";
const COLOR_LIGHT_BG = "E8F0F8";
const COLOR_TABLE_HEADER = "1B3A5C";
const COLOR_WHITE = "FFFFFF";
const COLOR_LIGHT_GRAY = "F2F2F2";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

// ============================================================
// HELPERS
// ============================================================
function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, font: FONT, size: 32, bold: true, color: COLOR_PRIMARY })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, font: FONT, size: 26, bold: true, color: COLOR_ACCENT })]
  });
}

function heading3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, font: FONT, size: 22, bold: true, color: COLOR_PRIMARY })]
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, font: FONT, size: 21, italics: opts.italics || false, bold: opts.bold || false, color: opts.color || "333333" })]
  });
}

function richPara(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after || 120 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: runs.map(r => new TextRun({ font: FONT, size: 21, color: "333333", ...r }))
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: FONT, size: 21, color: "333333" })]
  });
}

function richBullet(runs, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 60 },
    children: runs.map(r => new TextRun({ font: FONT, size: 21, color: "333333", ...r }))
  });
}

function quote(text) {
  return new Paragraph({
    spacing: { after: 120 },
    indent: { left: 720 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_ACCENT, space: 8 } },
    children: [new TextRun({ text, font: FONT, size: 21, italics: true, color: "555555" })]
  });
}

function spacer(size = 200) {
  return new Paragraph({ spacing: { after: size }, children: [] });
}

function separator() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR_ACCENT, space: 4 } },
    children: []
  });
}

function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      borders,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: COLOR_TABLE_HEADER, type: ShadingType.CLEAR },
      margins: cellMargins,
      children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, size: 20, bold: true, color: COLOR_WHITE })] })]
    }))
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      borders,
      width: { size: colWidths[ci], type: WidthType.DXA },
      shading: ri % 2 === 0 ? { fill: COLOR_LIGHT_GRAY, type: ShadingType.CLEAR } : undefined,
      margins: cellMargins,
      children: [new Paragraph({ children: [new TextRun({ text: cell, font: FONT, size: 20, color: "333333" })] })]
    }))
  }));

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows]
  });
}

// ============================================================
// DOCUMENT CONTENT
// ============================================================
const children = [];

// TITLE PAGE
children.push(spacer(2000));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 100 },
  children: [new TextRun({ text: "RESISTANCE", font: FONT, size: 56, bold: true, color: COLOR_PRIMARY })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 400 },
  children: [new TextRun({ text: "Compte rendu de la refonte du sc\u00E9nario", font: FONT, size: 28, color: COLOR_ACCENT })]
}));
children.push(separator());
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 80 },
  children: [new TextRun({ text: "Document de travail \u2014 Communication promotrice de stage", font: FONT, size: 22, italics: true, color: "666666" })]
}));
children.push(spacer(400));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Marie-Ange Bouchat", font: FONT, size: 24, bold: true, color: "333333" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "\u00C9criture Multim\u00E9dia \u2014 ISFS", font: FONT, size: 22, color: "555555" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "20 mars 2026", font: FONT, size: 22, color: "555555" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Branche de d\u00E9veloppement : editor-autonome", font: FONT, size: 20, italics: true, color: "777777" })] }));

// PAGE BREAK + TOC
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("Table des mati\u00E8res"));
children.push(new TableOfContents("Table des mati\u00E8res", { hyperlink: true, headingStyleRange: "1-2" }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================
// SECTION 1
// ============================================================
children.push(heading1("1. Contexte et objectif de la refonte"));

children.push(para("Le sc\u00E9nario original de R\u00E9sistance, tel que pr\u00E9sent\u00E9 dans le document de pr\u00E9sentation d\u00E9taill\u00E9e du TFE (77 pages), proposait une structure narrative chronologique et encyclop\u00E9dique. L\u2019ensemble du worldbuilding \u00E9tait expos\u00E9 d\u00E8s l\u2019introduction sous forme de r\u00E9cit omniscient."));

children.push(para("Suite \u00E0 une s\u00E9rie de sessions d\u2019analyse critique (18-20 mars 2026), le sc\u00E9nario a \u00E9t\u00E9 enti\u00E8rement repens\u00E9 pour r\u00E9pondre \u00E0 trois constats :"));

children.push(richBullet([{ text: "Le sc\u00E9nario original expliquait le monde au lieu de le faire vivre au joueur.", bold: true }, { text: " Il fonctionnait comme un documentaire, pas comme une exp\u00E9rience interactive." }]));
children.push(richBullet([{ text: "L\u2019\u00E9cart entre l\u2019ambition du design document et le prototype r\u00E9alisable \u00E9tait trop important", bold: true }, { text: " pour \u00EAtre cr\u00E9dible devant un jury." }]));
children.push(richBullet([{ text: "Le joueur n\u2019avait aucune raison \u00E9motionnelle de jouer.", bold: true }, { text: " Il manquait un incident d\u00E9clencheur, un personnage incarn\u00E9, une motivation visc\u00E9rale." }]));

children.push(spacer(100));
children.push(para("La refonte vise \u00E0 produire un prototype jouable de 15-20 minutes qui d\u00E9montre le concept complet (alternance vid\u00E9o IA / exploration 3D) avec un parcours coh\u00E9rent de bout en bout."));

// ============================================================
// SECTION 2
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("2. Diagnostic du sc\u00E9nario original"));

children.push(heading2("Ce qui \u00E9tait solide"));
children.push(bullet("L\u2019univers (Nexus, Arcanias, Exil\u00E9s, R\u00E9sistance) est riche et coh\u00E9rent"));
children.push(bullet("La taxonomie sociale est imm\u00E9diatement lisible"));
children.push(bullet("Le th\u00E8me dystopique r\u00E9sonnant avec l\u2019actualit\u00E9 (IA, consentement, \u00E9crans)"));
children.push(bullet("Le concept d\u2019alternance vid\u00E9o IA / exploration 3D est original"));
children.push(bullet("Les 12 personnages arch\u00E9typaux sont bien d\u00E9velopp\u00E9s conceptuellement"));

children.push(heading2("Ce qui ne fonctionnait pas"));

children.push(heading3("Structure narrative"));
children.push(richBullet([{ text: "Exposition frontale : ", bold: true }, { text: "tout le worldbuilding \u00E9tait livr\u00E9 en bloc dans l\u2019introduction (environ 7-8 minutes de narration descriptive avant toute interaction)" }]));
children.push(richBullet([{ text: "Chronologie lin\u00E9aire : ", bold: true }, { text: "r\u00E9cit du pass\u00E9 vers le pr\u00E9sent, soit la structure la moins dramatique possible" }]));
children.push(richBullet([{ text: "Absence de personnage jouable : ", bold: true }, { text: "aucun protagoniste d\u00E9fini, pas de motivation, pas d\u2019identification" }]));
children.push(richBullet([{ text: "Pas d\u2019incident d\u00E9clencheur : ", bold: true }, { text: "rien ne provoquait l\u2019urgence de jouer" }]));

children.push(heading3("\u00C9cart vision/prototype"));
children.push(bullet("Le document promettait 12 personnages, 6 phases d\u2019infiltration, un syst\u00E8me de choix moraux"));
children.push(bullet("Le prototype disposait de : un \u00E9diteur 3D, un \u00E9cran login, un shape sorter, des salles vides"));
children.push(bullet("Le shape sorter (\u00E9preuve de tri g\u00E9om\u00E9trique) \u00E9tait incoh\u00E9rent avec l\u2019univers dystopique"));

// ============================================================
// SECTION 3
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("3. Nouveau sc\u00E9nario \u2014 D\u00E9cisions valid\u00E9es"));

children.push(heading2("Principes directeurs"));

children.push(richBullet([{ text: "Show, don\u2019t tell. ", bold: true }, { text: "Le joueur d\u00E9couvre le monde en le vivant, pas en l\u2019\u00E9coutant. Le worldbuilding arrive par fragments." }]));
children.push(richBullet([{ text: "Motivation visc\u00E9rale avant compr\u00E9hension intellectuelle. ", bold: true }, { text: "Le joueur doit ressentir l\u2019urgence avant de comprendre le syst\u00E8me." }]));
children.push(richBullet([{ text: "Narration par escalade. ", bold: true }, { text: "Chaque r\u00E9v\u00E9lation aggrave la pr\u00E9c\u00E9dente. Le joueur connecte les points lui-m\u00EAme." }]));
children.push(richBullet([{ text: "Scope r\u00E9aliste. ", bold: true }, { text: "Le prototype couvre un parcours lin\u00E9aire complet (4 salles), pas un monde ouvert incomplet." }]));

children.push(heading2("Architecture narrative retenue"));
children.push(para("Le jeu alterne entre s\u00E9quences vid\u00E9o g\u00E9n\u00E9r\u00E9es par IA et phases de jeu interactif en 3D (vue POV premi\u00E8re personne), selon le concept multim\u00E9dia central du TFE."));

children.push(spacer(100));
children.push(makeTable(
  ["\u00C9tape", "Type", "Description"],
  [
    ["\u00C9cran de d\u00E9marrage", "Interface", "Pseudo + choix contr\u00F4le (clavier/manette)"],
    ["Vid\u00E9o d\u2019introduction", "Vid\u00E9o IA (~30-40s)", "Flash capture, brancard, op\u00E9ration, r\u00E9veil"],
    ["Salle 1 \u2014 Le cocoon", "Interactif 3D", "R\u00E9veil, cicatrice, puzzle \u00E9vasion"],
    ["Salle 2 \u2014 Nexus int\u00E9rieur", "Interactif 3D", "Surveillance + hall propagande + puzzle code"],
    ["Salle 3 \u2014 Ville dystopique", "Interactif/Vid\u00E9o", "Bruxelles d\u00E9sert\u00E9e, drones, graffitis"],
    ["Salle 4 \u2014 Bunker R\u00E9sistance", "Interactif/Vid\u00E9o", "Arriv\u00E9e, r\u00E9v\u00E9lations, cliffhanger"],
    ["Fin", "Cin\u00E9matique", "RESISTANCE \u2014 Chapitre 1 termin\u00E9"]
  ],
  [2000, 2200, 5160]
));

// ============================================================
// SECTION 4
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("4. Personnage principal \u2014 Raya"));

children.push(heading2("Identit\u00E9"));
children.push(makeTable(
  ["Caract\u00E9ristique", "D\u00E9tail"],
  [
    ["Pr\u00E9nom", "Raya (choisi collectivement lors du brainstorming du 20 mars)"],
    ["Genre", "Femme \u2014 choix narratif motiv\u00E9"],
    ["\u00C2ge", "Jeune adulte (20-30 ans)"],
    ["\u00C9poque / Lieu", "Bruxelles, 2040"],
    ["Vue", "POV premi\u00E8re personne (mains/bras visibles uniquement)"]
  ],
  [2800, 6560]
));

children.push(heading2("Pourquoi un personnage f\u00E9minin"));
children.push(richBullet([{ text: "Le corps comme territoire de souverainet\u00E9 : ", bold: true }, { text: "dans une dystopie qui contr\u00F4le les corps, une femme dont le corps reproductif est instrumentalis\u00E9 porte une charge symbolique suppl\u00E9mentaire." }]));
children.push(richBullet([{ text: "R\u00E9sonance G\u00E9n\u00E9ration Z : ", bold: true }, { text: "le rapport au consentement corporel (\u00ABmon corps, mon choix\u00BB) et le questionnement de la maternit\u00E9 comme destin impos\u00E9 sont des marqueurs g\u00E9n\u00E9rationnels forts." }]));
children.push(richBullet([{ text: "Double sens du titre : ", bold: true }, { text: "\u00ABR\u00E9sistance\u00BB d\u00E9signe le mouvement clandestin ET le temp\u00E9rament de Raya." }]));

children.push(heading2("Backstory (r\u00E9v\u00E9l\u00E9e progressivement en jeu)"));
children.push(para("Raya a grandi dans le monde d\u2019avant les Nexus. Elle a vu ses parents et amis sombrer dans la r\u00E9alit\u00E9 virtuelle. Elle a refus\u00E9 : manifestations, arrestations, survie solitaire dans Bruxelles d\u00E9sert\u00E9e, jardin clandestin, techniques d\u2019\u00E9vasion des drones."));
children.push(para("En suivant les graffitis du lapin blanc (symbole de la R\u00E9sistance), elle a baiss\u00E9 sa vigilance. Un drone l\u2019a captur\u00E9e. Inconsciente pendant environ un an, elle a \u00E9t\u00E9 ins\u00E9min\u00E9e sans consentement, a port\u00E9 un enfant sous s\u00E9dation, et l\u2019enfant lui a \u00E9t\u00E9 extrait chirurgicalement."));

children.push(heading2("Temp\u00E9rament"));
children.push(richBullet([{ text: "Ne subit jamais. ", bold: true }, { text: "Son premier r\u00E9flexe au r\u00E9veil est de chercher une sortie." }]));
children.push(richBullet([{ text: "Conna\u00EEt la survie en milieu hostile. ", bold: true }, { text: "Sait \u00E9viter les drones, se d\u00E9placer dans une ville d\u00E9sert\u00E9e." }]));
children.push(richBullet([{ text: "N\u2019est PAS d\u00E9finie par la maternit\u00E9. ", bold: true }, { text: "La grossesse forc\u00E9e est une violence du syst\u00E8me, pas son identit\u00E9." }]));

// ============================================================
// SECTION 5
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("5. Structure narrative d\u00E9taill\u00E9e du prototype"));

children.push(heading2("Vid\u00E9o d\u2019introduction (~30-40 secondes)"));
children.push(para("Pas de narration explicative. Pas de voix off qui raconte l\u2019histoire du monde. Uniquement des images et des sons :"));
children.push(bullet("Noir. Souffle. Battement de c\u0153ur assourdi."));
children.push(bullet("Flash : une femme court. Bourdonnement de drone."));
children.push(bullet("Flash : elle tombe. D\u00E9charge \u00E9lectrique. Blanc."));
children.push(bullet("Flash : lumi\u00E8res de plafonnier (brancard, couloir)."));
children.push(bullet("Flash : porte de salle d\u2019op\u00E9ration. Lumi\u00E8re aveuglante."));
children.push(bullet("Noir. Silence. Son organique. Liquide."));
children.push(bullet("Voix synth\u00E9tique : \u00ABBienvenue, Citoyenne. Indice de bien-\u00EAtre : optimal.\u00BB"));

children.push(heading2("Salle 1 \u2014 Le cocoon"));
children.push(richPara([{ text: "Lieu : ", bold: true }, { text: "Cocoon individuel exigu, lumi\u00E8re bleut\u00E9e, parois lisses et translucides." }]));
children.push(richPara([{ text: "Objectif joueur : ", bold: true }, { text: "S\u2019\u00E9chapper du cocoon." }]));
children.push(richPara([{ text: "Dur\u00E9e estim\u00E9e : ", bold: true }, { text: "3-5 minutes." }]));
children.push(para("D\u00E9roulement :"));
children.push(bullet("R\u00E9veil en POV. D\u00E9sorientation. Espace confin\u00E9."));
children.push(bullet("Voix synth\u00E9tique : \u00ABJour 387. Session sensorielle programm\u00E9e dans 4 minutes.\u00BB"));
children.push(bullet("Exploration : parois scell\u00E9es, pas de porte, grille d\u2019a\u00E9ration corrod\u00E9e."));
children.push(bullet("Puzzle 1 : ouvrir la grille avec c\u00E2bles de perfusion et support m\u00E9tallique."));
children.push(bullet("Blessure \u00E0 l\u2019\u00E9paule en for\u00E7ant la grille. Sang sur le torse."));
children.push(richBullet([{ text: "MOMENT CL\u00C9 : ", bold: true }, { text: "en essuyant le sang, d\u00E9couverte de la cicatrice chirurgicale. Pas d\u2019explication. Silence." }]));
children.push(bullet("\u00C9vasion par la gaine de ventilation."));

children.push(heading2("Salle 2 \u2014 Le Nexus int\u00E9rieur"));
children.push(richPara([{ text: "Lieu : ", bold: true }, { text: "Salle de surveillance (sombre, \u00E9crans) + Hall d\u2019accueil (immacul\u00E9, propagande)." }]));
children.push(richPara([{ text: "Objectif joueur : ", bold: true }, { text: "Comprendre o\u00F9 il est, trouver comment sortir." }]));
children.push(richPara([{ text: "Dur\u00E9e estim\u00E9e : ", bold: true }, { text: "5-8 minutes." }]));
children.push(heading3("Salle de surveillance"));
children.push(bullet("Milliers de cocoons minuscules sur les \u00E9crans. Corps immobiles. Adultes uniquement."));
children.push(bullet("Secteur sp\u00E9cifique : femmes enceintes + femmes avec cicatrice identique."));
children.push(bullet("Documents et registres \u00E0 fouiller (indices fragmentaires)."));
children.push(richBullet([{ text: "Question implicite : ", bold: true, italics: true }, { text: "o\u00F9 sont les enfants ?" , italics: true}]));
children.push(heading3("Hall d\u2019accueil"));
children.push(bullet("Contraste : murs immacul\u00E9s, vid\u00E9os de propagande vantant le confort du Nexus."));
children.push(bullet("Double langage : \u00ABsoins aux futures m\u00E8res\u00BB, \u00ABenfants, espoirs de la nation future\u00BB."));
children.push(bullet("Fen\u00EAtres blind\u00E9es (interaction possible : lancer une chaise = \u00E9chec)."));
children.push(bullet("Puzzle 2 : trouver le code de sortie au bureau d\u2019accueil."));

children.push(heading2("Salle 3 \u2014 La ville dystopique"));
children.push(richPara([{ text: "Lieu : ", bold: true }, { text: "Bruxelles, 2040. Rues d\u00E9sertes, fa\u00E7ades intactes mais vides." }]));
children.push(richPara([{ text: "Objectif joueur : ", bold: true }, { text: "Traverser la ville en suivant les graffitis du lapin blanc." }]));
children.push(richPara([{ text: "Dur\u00E9e estim\u00E9e : ", bold: true }, { text: "3-5 minutes." }]));
children.push(bullet("Ambiance : silence, vent, bourdonnement lointain de drones."));
children.push(bullet("Graffitis du lapin blanc = balisage du chemin vers le bunker."));
children.push(bullet("M\u00E9canique : \u00E9viter les drones. Choix : courir (risque) ou prudence (temps)."));
children.push(bullet("Raya reconna\u00EEt instinctivement l\u2019environnement (elle vivait ici avant sa capture)."));
children.push(richPara([{ text: "Note technique : ", bold: true, italics: true }, { text: "la faisabilit\u00E9 en exploration 3D libre est \u00E0 \u00E9valuer. Alternative : s\u00E9quence vid\u00E9o interactive.", italics: true }]));

children.push(heading2("Salle 4 \u2014 Le bunker de la R\u00E9sistance"));
children.push(richPara([{ text: "Lieu : ", bold: true }, { text: "Sous-sol cach\u00E9, entr\u00E9e dissimul\u00E9e." }]));
children.push(richPara([{ text: "Objectif joueur : ", bold: true }, { text: "D\u00E9couvrir la R\u00E9sistance, obtenir les premi\u00E8res r\u00E9ponses." }]));
children.push(richPara([{ text: "Dur\u00E9e estim\u00E9e : ", bold: true }, { text: "3-5 minutes." }]));
children.push(bullet("Premi\u00E8res voix humaines depuis le d\u00E9but du jeu."));
children.push(bullet("Accueil. Quand Raya parle de la cicatrice : silence."));
children.push(bullet("R\u00E9v\u00E9lation du projet GENESE : preuves, coordonn\u00E9es, un lieu."));
children.push(quote("\u00ABOn ne sait pas ce qu\u2019ils font avec les enfants. Mais on sait o\u00F9 ils les emm\u00E8nent. Et maintenant, gr\u00E2ce \u00E0 toi, on sait pourquoi.\u00BB"));
children.push(richBullet([{ text: "Cliffhanger : ", bold: true }, { text: "\u00E9cran noir. RESISTANCE \u2014 Chapitre 1 termin\u00E9." }]));

// ============================================================
// SECTION 6
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("6. Worldbuilding \u2014 Univers et r\u00E8gles du monde"));

children.push(heading2("Organisation sociale"));
children.push(makeTable(
  ["Groupe", "Description", "Statut"],
  [
    ["Citoyens des Nexus", "Population sous s\u00E9dation dans des cocoons, vie sensorielle virtuelle", "Prisonniers inconscients"],
    ["\u00C9lite des Arcanias", "Classe dominante, technologies sup\u00E9rieures", "Dominants"],
    ["Convertis", "Anciens r\u00E9sistants qui ont c\u00E9d\u00E9", "Bris\u00E9s"],
    ["Exil\u00E9s", "R\u00E9fugi\u00E9s sur les eaux, hors d\u2019atteinte des drones", "L\u00E9gende"],
    ["R\u00E9sistants", "Humains cach\u00E9s en ville, bunker souterrain", "Opposition active"]
  ],
  [2200, 5100, 2060]
));

children.push(heading2("Le syst\u00E8me Novaia"));
children.push(bullet("Novaia : nom du pouvoir en place (consortium IA/\u00E9lite)"));
children.push(bullet("Les Nexus sont pr\u00E9sent\u00E9s comme la solution \u00E0 la famine, la pollution, l\u2019ins\u00E9curit\u00E9"));
children.push(bullet("En r\u00E9alit\u00E9 : des fermes humaines o\u00F9 les adultes fertiles sont maintenus en vie"));
children.push(bullet("Les personnes \u00E2g\u00E9es : \u00E9limin\u00E9es (co\u00FBt \u00E9nerg\u00E9tique > rendement)"));
children.push(bullet("Les enfants : premiers cibl\u00E9s (plasticit\u00E9 c\u00E9r\u00E9brale exploitable)"));

children.push(heading2("Projet GENESE \u2014 Les enfants"));
children.push(para("C\u2019est le c\u0153ur de l\u2019intrigue du jeu complet :"));
children.push(bullet("L\u2019IA poss\u00E8de tout sauf un corps biologique. Elle n\u2019a pas r\u00E9ussi \u00E0 synth\u00E9tiser un mat\u00E9riel ayant la plasticit\u00E9 du cerveau humain."));
children.push(bullet("La plasticit\u00E9 neuronale des enfants (cerveaux en construction) permet d\u2019y impl\u00E9menter des syst\u00E8mes IA."));
children.push(bullet("Les enfants d\u00E9j\u00E0 n\u00E9s ont \u00E9t\u00E9 les premiers sujets (donn\u00E9es collect\u00E9es via les \u00E9crans)."));
children.push(bullet("\u00C9tape suivante : commencer le processus d\u00E8s la conception \u2192 programme de reproduction forc\u00E9e."));
children.push(richBullet([{ text: "Le programme est RECENT. ", bold: true }, { text: "Raya fait partie des premi\u00E8res victimes. Le monde est \u00E0 l\u2019aube du basculement." }]));

children.push(heading2("Coh\u00E9rence th\u00E9matique : anguilles et enfants"));
children.push(bullet("Les anguilles \u00E9lectriques g\u00E9antes = batteries biologiques (source d\u2019\u00E9nergie)"));
children.push(bullet("Les enfants = processeurs biologiques (source d\u2019intelligence)"));
children.push(richBullet([{ text: "Parall\u00E8le : ", bold: true }, { text: "l\u2019IA parasite le vivant \u00E0 deux niveaux : le corps pour l\u2019\u00E9nergie, le cerveau pour la cognition." }]));

children.push(heading2("Le lapin blanc"));
children.push(bullet("Symbole graffiti de la R\u00E9sistance sur les murs de Bruxelles"));
children.push(bullet("R\u00E9f\u00E9rence assum\u00E9e : Alice au Pays des Merveilles (terrier \u2192 monde cach\u00E9) et Matrix (choix pilule rouge/bleue)"));
children.push(bullet("Fonction : balisage du chemin vers le bunker"));
children.push(bullet("Question ouverte : guide fiable ou potentiel leurre du syst\u00E8me ?"));

// ============================================================
// SECTION 7
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("7. Fondements th\u00E9matiques"));

children.push(heading2("Th\u00E8me principal : le corps comme dernier territoire de souverainet\u00E9"));
children.push(bullet("Le corps enferm\u00E9 (cocoon)"));
children.push(bullet("Le corps instrumentalis\u00E9 (reproduction forc\u00E9e)"));
children.push(bullet("Le corps pirat\u00E9 (implants synaptiques, enfants augment\u00E9s)"));
children.push(bullet("Le corps lib\u00E9r\u00E9 (\u00E9vasion, r\u00E9sistance physique)"));

children.push(heading2("R\u00E9sonance avec le public cible (G\u00E9n\u00E9ration Z)"));
children.push(richBullet([{ text: "Consentement corporel : ", bold: true }, { text: "\u00ABmon corps, mon choix\u00BB \u2014 ici viol\u00E9 de la fa\u00E7on la plus fondamentale" }]));
children.push(richBullet([{ text: "Rapport ambigu \u00E0 la maternit\u00E9 : ", bold: true }, { text: "baisse de natalit\u00E9, questionnement de la maternit\u00E9 comme destin \u2014 ici impos\u00E9e par le syst\u00E8me" }]));
children.push(richBullet([{ text: "D\u00E9pendance aux \u00E9crans : ", bold: true }, { text: "la plasticit\u00E9 neuronale alt\u00E9r\u00E9e par les \u00E9crans est le point de d\u00E9part de l\u2019exploitation des enfants" }]));
children.push(richBullet([{ text: "D\u00E9fiance envers les institutions : ", bold: true }, { text: "Novaia promet s\u00E9curit\u00E9 et confort, livre asservissement" }]));

children.push(heading2("Arc global du jeu"));
children.push(para("Le jeu complet parcourrait un spectre : de la dystopie totale (technologie comme outil d\u2019asservissement) vers la question du prix \u00E0 payer pour rester humain. Non pas un monde sans technologie, mais un \u00E9quilibre qui ne sera pas confortable."));
children.push(para("Le prototype s\u2019arr\u00EAte au moment o\u00F9 Raya rejoint la R\u00E9sistance. Cliffhanger naturel."));

// ============================================================
// SECTION 8
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("8. Test utilisateur \u2014 R\u00E9sultats du brainstorming"));

children.push(heading2("M\u00E9thodologie"));
children.push(para("Le 20 mars 2026, le sc\u00E9nario a \u00E9t\u00E9 lu \u00E0 voix haute devant trois testeurs. Sept questions structur\u00E9es ont \u00E9t\u00E9 pos\u00E9es individuellement apr\u00E8s la lecture."));
children.push(makeTable(
  ["Testeur", "G\u00E9n\u00E9ration", "Profil"],
  [
    ["Lou", "Gen Z", "Non-gameuse, IA-sceptique"],
    ["Victor", "Gen Z", "Gamer, IA-sceptique"],
    ["Christel", "Gen X", "Perspective adulte"]
  ],
  [2500, 2500, 4360]
));

children.push(heading2("R\u00E9sultats cl\u00E9s"));

children.push(heading3("Points d\u2019accroche (chaque profil s\u2019accroche diff\u00E9remment)"));
children.push(richBullet([{ text: "Lou : ", bold: true }, { text: "le r\u00E9veil dans le cocoon (accroche sensorielle)" }]));
children.push(richBullet([{ text: "Victor : ", bold: true }, { text: "la d\u00E9couverte de la cicatrice (accroche myst\u00E8re) \u2014 \u00ABT\u2019as envie de savoir c\u2019est quoi, en fait ?\u00BB" }]));
children.push(richBullet([{ text: "Christel : ", bold: true }, { text: "l\u2019arriv\u00E9e au bunker (accroche sociale)" }]));
children.push(para("Interpr\u00E9tation : le sc\u00E9nario poss\u00E8de trois niveaux de hook (sensoriel, myst\u00E8re, social) qui captent des profils de joueurs diff\u00E9rents. Architecture narrative robuste.", { italics: true }));

children.push(heading3("Le myst\u00E8re fonctionne"));
children.push(para("Victor a explicitement dit que ne pas comprendre la cicatrice imm\u00E9diatement \u00E9tait un atout. Il avait d\u2019abord imagin\u00E9 une puce dans le cerveau. La retenue narrative fonctionne."));

children.push(heading3("Plausibilit\u00E9 du th\u00E8me"));
children.push(para("Les trois testeurs trouvent le th\u00E8me plausible et r\u00E9sonnant avec l\u2019actualit\u00E9."));

children.push(heading3("Signal d\u2019alarme : la description en une phrase"));
children.push(richBullet([{ text: "Lou : ", bold: true }, { text: "\u00ABC\u2019est un jeu sur un monde dystopique avec l\u2019IA.\u00BB" }]));
children.push(richBullet([{ text: "Victor : ", bold: true }, { text: "\u00ABUn jeu qui peut t\u2019ouvrir \u00E0 de nouvelles voies et comprendre de nouvelles choses.\u00BB" }]));
children.push(richBullet([{ text: "Christel : ", bold: true }, { text: "\u00ABUn monde futuriste pour sauver une nouvelle nation.\u00BB" }]));
children.push(richPara([{ text: "Constat : ", bold: true }, { text: "aucun ne mentionne la cicatrice, l\u2019enfant vol\u00E9 ou la reproduction forc\u00E9e \u2014 l\u2019\u00E9l\u00E9ment diff\u00E9renciateur. Le moment de la cicatrice devra \u00EAtre renforc\u00E9 visuellement (silence prolong\u00E9, pas de musique, impact maximal)." }]));

children.push(heading3("Comparaison avec l\u2019ancien sc\u00E9nario"));
children.push(para("Victor (seul \u00E0 conna\u00EEtre les deux versions) : \u00ABCelui-l\u00E0 est mieux. Clairement. Celui-l\u00E0 il est trop cool.\u00BB"));

children.push(heading3("Nom du personnage"));
children.push(para("Convergence collective vers Raya : court, sonore, commence par R comme R\u00E9sistance, connotation \u00ABrayonnant\u00BB, sonne \u00E0 la fois f\u00E9minin et badass."));

// ============================================================
// SECTION 9
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("9. \u00C9tat technique du prototype"));

children.push(heading2("Stack technologique"));
children.push(makeTable(
  ["Composant", "Technologie"],
  [
    ["Moteur 3D", "Three.js r128"],
    ["Physique", "Cannon.js"],
    ["Langage", "JavaScript vanilla (pas de bundler)"],
    ["Persistance", "IndexedDB + localStorage"],
    ["D\u00E9ploiement", "GitHub Pages (branche editor-autonome)"],
    ["Assets 3D", "GLB (Meshy, ComfyUI, Mixamo)"],
    ["Vid\u00E9os", "G\u00E9n\u00E9r\u00E9es par IA"]
  ],
  [3000, 6360]
));

children.push(heading2("Ce qui existe et fonctionne"));
children.push(bullet("\u00C9diteur 3D complet : floor plan, import GLB, murs/lumi\u00E8res/cam\u00E9ras, zones d\u2019interaction, audio, undo/redo, sauvegarde"));
children.push(bullet("\u00C9cran de d\u00E9marrage : login, pseudo dystopique, profils"));
children.push(bullet("Chargement dynamique : \u00E9diteur activable/d\u00E9sactivable sans rechargement (Ctrl+Shift+C)"));
children.push(bullet("Infrastructure cross-rooms : score, donn\u00E9es isol\u00E9es par salle, navigation"));

children.push(heading2("Refactoring technique r\u00E9alis\u00E9 (mars 2026)"));
children.push(bullet("S\u00E9paration mode jeu / mode \u00E9diteur (performances am\u00E9lior\u00E9es)"));
children.push(bullet("Chargement dynamique des scripts \u00E9diteur via Promises"));
children.push(bullet("Isolation des donn\u00E9es par salle (pr\u00E9fixe currentRoomName)"));
children.push(bullet("Syst\u00E8me de score cross-rooms avec profils utilisateurs"));

children.push(heading2("Ce qui reste \u00E0 construire"));
children.push(makeTable(
  ["\u00C9l\u00E9ment", "Priorit\u00E9", "Complexit\u00E9"],
  [
    ["Vid\u00E9o d\u2019intro (30-40s)", "HAUTE", "S\u00E9lection + montage vid\u00E9os IA"],
    ["Salle 1 \u2014 Cocoon", "HAUTE", "Mod\u00E9lisation 3D + puzzle"],
    ["Salle 2 \u2014 Nexus int\u00E9rieur", "HAUTE", "Redesign room existante + contenu narratif"],
    ["Vid\u00E9os propagande", "HAUTE", "G\u00E9n\u00E9ration IA + int\u00E9gration"],
    ["Salle 3 \u2014 Ville", "MOYENNE", "Complexe si 3D libre / alternative vid\u00E9o"],
    ["Salle 4 \u2014 Bunker", "MOYENNE", "Mod\u00E9lisation + cin\u00E9matiques"],
    ["Transitions vid\u00E9o \u2192 3D", "HAUTE", "Technique d\u2019int\u00E9gration"],
    ["Sound design", "MOYENNE", "Assets existants, impl\u00E9mentation"]
  ],
  [3200, 1500, 4660]
));

// ============================================================
// SECTION 10
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("10. Planning et priorit\u00E9s"));

children.push(heading2("Calendrier"));
children.push(makeTable(
  ["Date", "\u00C9ch\u00E9ance"],
  [
    ["20 mars 2026", "Refonte sc\u00E9nario valid\u00E9e + test utilisateur r\u00E9alis\u00E9"],
    ["17 avril 2026", "Fin du stage"],
    ["Mai-juin 2026", "Pr\u00E9sentation TFE"]
  ],
  [3000, 6360]
));

children.push(heading2("\u00C9valuation TFE"));
children.push(makeTable(
  ["Crit\u00E8re", "Points", "\u00C9tat actuel"],
  [
    ["Contenu \u00E9crit", "20", "Non commenc\u00E9"],
    ["Forme \u00E9crite", "10", "Non commenc\u00E9"],
    ["Prototype", "30", "~10-12/30 (\u00E9diteur OK, parcours joueur absent)"],
    ["Oral", "40", "\u00C0 pr\u00E9parer"]
  ],
  [3500, 1200, 4660]
));

children.push(heading2("Priorit\u00E9s ordonn\u00E9es"));
children.push(heading3("Priorit\u00E9 1 : Parcours joueur complet (30 pts)"));
children.push(para("Objectif : un joueur peut lancer le jeu, vivre 15-20 minutes d\u2019exp\u00E9rience coh\u00E9rente, et comprendre le concept."));
children.push(bullet("1. Vid\u00E9o d\u2019intro \u2014 s\u00E9lectionner et monter les vid\u00E9os IA existantes"));
children.push(bullet("2. Salle 1 (cocoon) \u2014 construire dans l\u2019\u00E9diteur, impl\u00E9menter le puzzle"));
children.push(bullet("3. Salle 2 (Nexus) \u2014 adapter room existante, contenu narratif + vid\u00E9os propagande"));
children.push(bullet("4. Salle 3 (ville) \u2014 \u00E9valuer faisabilit\u00E9 3D vs vid\u00E9o interactive"));
children.push(bullet("5. Salle 4 (bunker) \u2014 construire, int\u00E9grer le cliffhanger"));

children.push(heading3("Priorit\u00E9 2 : Document \u00E9crit (30 pts)"));
children.push(para("Commencer la r\u00E9daction en parall\u00E8le. Le document de pr\u00E9sentation de 77 pages et ce compte rendu fournissent une base substantielle \u00E0 restructurer."));

children.push(heading3("Priorit\u00E9 3 : Pr\u00E9paration de l\u2019oral (40 pts)"));
children.push(para("Sc\u00E9nario de d\u00E9mo live, discours structur\u00E9, anticipation des questions jury. Assumer les limites avec lucidit\u00E9."));

children.push(heading3("Ce qu\u2019il NE faut PAS faire"));
children.push(bullet("Peaufiner l\u2019\u00E9diteur (il fonctionne, il faut l\u2019utiliser)"));
children.push(bullet("Ajouter des salles vides (4 salles riches > 8 salles vides)"));
children.push(bullet("Impl\u00E9menter les 12 personnages ou 6 phases du design original"));

// ============================================================
// SECTION 11
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("11. D\u00E9cisions en suspens"));

children.push(makeTable(
  ["D\u00E9cision", "Options", "\u00C9ch\u00E9ance"],
  [
    ["Voix de Raya", "Voix (m\u00E9taphore r\u00E9sistance) vs Mutisme (simplification)", "Avant salle 4"],
    ["Salle 3", "Exploration 3D libre vs Vid\u00E9o interactive", "Avant d\u00E9veloppement"],
    ["Sort des enfants", "Dilemme moral ouvert vs R\u00E9solution", "Peut attendre"],
    ["Lapin blanc", "Guide fiable vs Potentiel leurre", "Peut attendre"],
    ["D\u00E9faut de Raya", "Impulsive / M\u00E9fiante / Culpabilit\u00E9", "Avant dialogues"]
  ],
  [2200, 4860, 2300]
));

// ============================================================
// SECTION 12
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("12. Bibliographie de r\u00E9f\u00E9rence"));

children.push(heading2("Ouvrages essentiels"));
children.push(richBullet([{ text: "Aldous Huxley \u2014 Le Meilleur des Mondes ", bold: true }, { text: "(1932, ~250 p.) : mod\u00E8le de la dystopie par le confort." }]));
children.push(richBullet([{ text: "Jonathan Haidt \u2014 The Anxious Generation ", bold: true }, { text: "(2024, ~320 p.) : donn\u00E9es sur l\u2019effet des \u00E9crans sur les cerveaux Gen Z." }]));
children.push(richBullet([{ text: "Margaret Atwood \u2014 La Servante \u00E9carlate ", bold: true }, { text: "(1985, ~350 p.) : reproduction instrumentalis\u00E9e + m\u00E9thode narrative par fragments." }]));

children.push(heading2("Ouvrages compl\u00E9mentaires"));
children.push(richBullet([{ text: "Shoshana Zuboff \u2014 L\u2019\u00C2ge du capitalisme de surveillance ", bold: true }, { text: "(2019) : extraction des donn\u00E9es comportementales." }]));
children.push(richBullet([{ text: "Yuval Noah Harari \u2014 Homo Deus ", bold: true }, { text: "(2017) : transhumanisme et data\u00EFsme." }]));
children.push(richBullet([{ text: "Johann Hari \u2014 Stolen Focus ", bold: true }, { text: "(2022) : \u00E9conomie de l\u2019attention." }]));

children.push(heading2("Textes courts"));
children.push(richBullet([{ text: "Dostoi\u00EBvski \u2014 Le Grand Inquisiteur ", bold: true }, { text: "(~30 p.) : libert\u00E9 vs s\u00E9curit\u00E9." }]));
children.push(richBullet([{ text: "Neil Postman \u2014 Se distraire \u00E0 en mourir ", bold: true }, { text: "(1985, ~200 p.) : le divertissement comme contr\u00F4le." }]));
children.push(richBullet([{ text: "Aldous Huxley \u2014 Retour au meilleur des mondes ", bold: true }, { text: "(1958, ~150 p.) : pont fiction/analyse sociologique." }]));

// ============================================================
// FOOTER
// ============================================================
children.push(spacer(400));
children.push(separator());
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Document g\u00E9n\u00E9r\u00E9 le 20 mars 2026 \u2014 Derni\u00E8re mise \u00E0 jour : 20 mars 2026", font: FONT, size: 18, italics: true, color: "999999" })]
}));

// ============================================================
// BUILD DOCUMENT
// ============================================================
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 21 }
      }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: COLOR_PRIMARY },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: COLOR_ACCENT },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } }
        ]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1200, bottom: 1440, left: 1200 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR_ACCENT, space: 4 } },
          children: [new TextRun({ text: "RESISTANCE \u2014 Refonte sc\u00E9nario \u2014 Document de travail", font: FONT, size: 16, italics: true, color: "999999" })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Marie-Ange Bouchat \u2014 ISFS \u2014 Page ", font: FONT, size: 16, color: "999999" }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "999999" })
          ]
        })]
      })
    },
    children
  }]
});

// ============================================================
// EXPORT
// ============================================================
Packer.toBuffer(doc).then(buffer => {
  const outPath = "C:\\Users\\marie\\Desktop\\Resistance\\COMPTE-RENDU-REFONTE-SCENARIO.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("Document genere avec succes :", outPath);
  console.log("Taille :", (buffer.length / 1024).toFixed(1), "Ko");
}).catch(err => {
  console.error("Erreur:", err);
});

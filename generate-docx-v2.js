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
const COLOR_SOLARPUNK = "2D8659";

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

function greenQuote(text) {
  return new Paragraph({
    spacing: { after: 120 },
    indent: { left: 720 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_SOLARPUNK, space: 8 } },
    children: [new TextRun({ text, font: FONT, size: 21, italics: true, color: "2D6B4A" })]
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
  spacing: { after: 200 },
  children: [new TextRun({ text: "Compte rendu de la refonte du sc\u00E9nario", font: FONT, size: 28, color: COLOR_ACCENT })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 400 },
  children: [new TextRun({ text: "Version 3 \u2014 Captologie, transhumanisme invers\u00E9 et cocoon-smartphone", font: FONT, size: 22, italics: true, color: COLOR_SOLARPUNK })]
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
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "22 mars 2026", font: FONT, size: 22, color: "555555" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Branche de d\u00E9veloppement : editor-autonome", font: FONT, size: 20, italics: true, color: "777777" })] }));

// PAGE BREAK + TOC
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("Table des mati\u00E8res"));
children.push(new TableOfContents("Table des mati\u00E8res", { hyperlink: true, headingStyleRange: "1-2" }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================
// SECTION 1 — Contexte
// ============================================================
children.push(heading1("1. Contexte et objectif de la refonte"));

children.push(para("Le sc\u00E9nario original de R\u00E9sistance, tel que pr\u00E9sent\u00E9 dans le document de pr\u00E9sentation d\u00E9taill\u00E9e du TFE (77 pages), proposait une structure narrative chronologique et encyclop\u00E9dique. L\u2019ensemble du worldbuilding \u00E9tait expos\u00E9 d\u00E8s l\u2019introduction sous forme de r\u00E9cit omniscient."));

children.push(para("Suite \u00E0 une s\u00E9rie de sessions d\u2019analyse critique (18-21 mars 2026), le sc\u00E9nario a \u00E9t\u00E9 enti\u00E8rement repens\u00E9 pour r\u00E9pondre \u00E0 trois constats :"));

children.push(richBullet([{ text: "Le sc\u00E9nario original expliquait le monde au lieu de le faire vivre au joueur.", bold: true }, { text: " Il fonctionnait comme un documentaire, pas comme une exp\u00E9rience interactive." }]));
children.push(richBullet([{ text: "L\u2019\u00E9cart entre l\u2019ambition du design document et le prototype r\u00E9alisable \u00E9tait trop important", bold: true }, { text: " pour \u00EAtre cr\u00E9dible devant un jury." }]));
children.push(richBullet([{ text: "Le joueur n\u2019avait aucune raison \u00E9motionnelle de jouer.", bold: true }, { text: " Il manquait un incident d\u00E9clencheur, un personnage incarn\u00E9, une motivation visc\u00E9rale." }]));

children.push(spacer(100));
children.push(para("La refonte vise \u00E0 produire un prototype jouable de 15-20 minutes qui d\u00E9montre le concept complet (alternance vid\u00E9o IA / exploration 3D) avec un parcours coh\u00E9rent de bout en bout."));

children.push(spacer(100));
children.push(richPara([
  { text: "Nouveau pivot (21 mars 2026) : ", bold: true, color: COLOR_SOLARPUNK },
  { text: "le jeu ne se limite plus \u00E0 une d\u00E9nonciation dystopique. Il int\u00E8gre un horizon constructif fond\u00E9 sur le mod\u00E8le partenarial (\u00E9co-f\u00E9minisme, sociétés matrilin\u00E9aires) et une analyse du consum\u00E9risme comme m\u00E9canisme de contr\u00F4le." }
]));

// ============================================================
// SECTION 2 — Diagnostic
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
// SECTION 3 — Nouveau scénario
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("3. Nouveau sc\u00E9nario \u2014 D\u00E9cisions valid\u00E9es"));

children.push(heading2("Principes directeurs"));

children.push(richBullet([{ text: "Show, don\u2019t tell. ", bold: true }, { text: "Le joueur d\u00E9couvre le monde en le vivant, pas en l\u2019\u00E9coutant. Le worldbuilding arrive par fragments." }]));
children.push(richBullet([{ text: "Motivation visc\u00E9rale avant compr\u00E9hension intellectuelle. ", bold: true }, { text: "Le joueur doit ressentir l\u2019urgence avant de comprendre le syst\u00E8me." }]));
children.push(richBullet([{ text: "Narration par escalade. ", bold: true }, { text: "Chaque r\u00E9v\u00E9lation aggrave la pr\u00E9c\u00E9dente. Le joueur connecte les points lui-m\u00EAme." }]));
children.push(richBullet([{ text: "Scope r\u00E9aliste. ", bold: true }, { text: "Le prototype couvre un parcours lin\u00E9aire complet (4 salles), pas un monde ouvert incomplet." }]));
children.push(richBullet([{ text: "D\u00E9noncer ET pr\u00E9figurer. ", bold: true, color: COLOR_SOLARPUNK }, { text: "Le jeu ne laisse pas le joueur dans le noir. Il montre que l\u2019alternative existe d\u00E9j\u00E0, \u00E0 petite \u00E9chelle, dans les fissures du syst\u00E8me." }]));

children.push(heading2("Architecture narrative retenue"));
children.push(para("Le jeu alterne entre s\u00E9quences vid\u00E9o g\u00E9n\u00E9r\u00E9es par IA et phases de jeu interactif en 3D (vue POV premi\u00E8re personne), selon le concept multim\u00E9dia central du TFE."));

children.push(spacer(100));
children.push(makeTable(
  ["\u00C9tape", "Type", "Description", "Mouvement (Jang)"],
  [
    ["\u00C9cran de d\u00E9marrage", "Interface", "Pseudo + choix contr\u00F4le", "\u2014"],
    ["Vid\u00E9o d\u2019introduction", "Vid\u00E9o IA (~30-40s)", "Flash capture, brancard, op\u00E9ration, r\u00E9veil", "\u2014"],
    ["Salle 1 \u2014 Le cocoon", "Interactif 3D", "R\u00E9veil, cicatrice, puzzle \u00E9vasion", "Conscience"],
    ["Salle 2 \u2014 Nexus int\u00E9rieur", "Interactif 3D", "Surveillance + hall propagande + puzzle", "Lucidit\u00E9"],
    ["Salle 3 \u2014 Ville dystopique", "Interactif/Vid\u00E9o", "Bruxelles d\u00E9sert\u00E9e, drones, graffitis", "Travers\u00E9e du vide"],
    ["Salle 4 \u2014 Bunker R\u00E9sistance", "Interactif/Vid\u00E9o", "Arriv\u00E9e, r\u00E9v\u00E9lations, mod\u00E8le partenarial", "Noyau + Autonomie"]
  ],
  [2000, 1800, 3600, 1960]
));

// ============================================================
// SECTION 4 — Personnage
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
children.push(richBullet([{ text: "Ancrage \u00E9co-f\u00E9ministe : ", bold: true, color: COLOR_SOLARPUNK }, { text: "Raya incarne la reconnexion au vivant (jardin clandestin) et au collectif (bunker). Elle porte les valeurs du mod\u00E8le partenarial." }]));

children.push(heading2("Backstory (r\u00E9v\u00E9l\u00E9e progressivement en jeu)"));
children.push(para("Raya a grandi dans le monde d\u2019avant les Nexus. Elle a vu ses parents et amis sombrer dans la r\u00E9alit\u00E9 virtuelle. Elle a refus\u00E9 : manifestations, arrestations, survie solitaire dans Bruxelles d\u00E9sert\u00E9e, jardin clandestin, techniques d\u2019\u00E9vasion des drones."));
children.push(para("En suivant les graffitis du lapin blanc (symbole de la R\u00E9sistance), elle a baiss\u00E9 sa vigilance. Un drone l\u2019a captur\u00E9e. Inconsciente pendant environ un an, elle a \u00E9t\u00E9 ins\u00E9min\u00E9e sans consentement, a port\u00E9 un enfant sous s\u00E9dation, et l\u2019enfant lui a \u00E9t\u00E9 extrait chirurgicalement."));

children.push(heading2("Le jardin clandestin \u2014 c\u0153ur symbolique"));
children.push(para("Le jardin que Raya cultivait seule dans Bruxelles d\u00E9sert\u00E9e est le symbole central du jeu. Il repr\u00E9sente :"));
children.push(richBullet([{ text: "Une relation non-extractive au vivant ", bold: true }, { text: "dans un monde qui a tout commodifi\u00E9" }]));
children.push(richBullet([{ text: "Un acte de pr\u00E9figuration ", bold: true }, { text: "\u2014 construire maintenant, \u00E0 petite \u00E9chelle, le monde qu\u2019on veut voir advenir" }]));
children.push(richBullet([{ text: "L\u2019ancrage matrilin\u00E9aire par essence ", bold: true }, { text: "\u2014 li\u00E9 \u00E0 la terre, nourricier, il ne se vend pas, il se transmet" }]));
children.push(para("Le jardin fait \u00E9cho au syst\u00E8me agroforestier des Bribri du Costa Rica : cultiver en secret, c\u2019est maintenir une relation au vivant dans un monde qui l\u2019a d\u00E9truit."));

children.push(heading2("Temp\u00E9rament"));
children.push(richBullet([{ text: "Ne subit jamais. ", bold: true }, { text: "Son premier r\u00E9flexe au r\u00E9veil est de chercher une sortie." }]));
children.push(richBullet([{ text: "Conna\u00EEt la survie en milieu hostile. ", bold: true }, { text: "Sait \u00E9viter les drones, se d\u00E9placer dans une ville d\u00E9sert\u00E9e." }]));
children.push(richBullet([{ text: "N\u2019est PAS d\u00E9finie par la maternit\u00E9. ", bold: true }, { text: "La grossesse forc\u00E9e est une violence du syst\u00E8me, pas son identit\u00E9." }]));
children.push(richBullet([{ text: "Se d\u00E9finit par ses actes : ", bold: true }, { text: "r\u00E9sister, cultiver, chercher. Pas par un avatar ou un statut." }]));

// ============================================================
// SECTION 5 — Structure narrative détaillée
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

children.push(heading2("Salle 1 \u2014 Le cocoon (Conscience)"));
children.push(richPara([{ text: "Lieu : ", bold: true }, { text: "Cocoon individuel exigu, lumi\u00E8re bleut\u00E9e, parois lisses et translucides." }]));
children.push(richPara([{ text: "Mouvement Jang : ", bold: true, color: COLOR_SOLARPUNK }, { text: "Conscience du d\u00E9sir \u2014 percevoir avant d\u2019ob\u00E9ir. Le r\u00E9veil litt\u00E9ral = l\u2019arrachement \u00E0 l\u2019anesth\u00E9sie." }]));
children.push(richPara([{ text: "Dur\u00E9e estim\u00E9e : ", bold: true }, { text: "3-5 minutes." }]));
children.push(para("D\u00E9roulement :"));
children.push(bullet("R\u00E9veil en POV. D\u00E9sorientation. Espace confin\u00E9."));
children.push(bullet("Voix synth\u00E9tique : \u00ABJour 387. Session sensorielle programm\u00E9e dans 4 minutes.\u00BB"));
children.push(bullet("Exploration : parois scell\u00E9es, pas de porte, grille d\u2019a\u00E9ration corrod\u00E9e."));
children.push(bullet("Puzzle 1 : ouvrir la grille avec c\u00E2bles de perfusion et support m\u00E9tallique."));
children.push(bullet("Blessure \u00E0 l\u2019\u00E9paule en for\u00E7ant la grille. Sang sur le torse."));
children.push(richBullet([{ text: "MOMENT CL\u00C9 : ", bold: true }, { text: "en essuyant le sang, d\u00E9couverte de la cicatrice chirurgicale. Pas d\u2019explication. Silence." }]));
children.push(bullet("\u00C9vasion par la gaine de ventilation."));

children.push(heading2("Salle 2 \u2014 Le Nexus int\u00E9rieur (Lucidit\u00E9)"));
children.push(richPara([{ text: "Lieu : ", bold: true }, { text: "Salle de surveillance (sombre, \u00E9crans) + Hall d\u2019accueil (immacul\u00E9, propagande)." }]));
children.push(richPara([{ text: "Mouvement Jang : ", bold: true, color: COLOR_SOLARPUNK }, { text: "Comprendre le m\u00E9canisme. Voir la propagande pour ce qu\u2019elle est. Le Nexus est le consum\u00E9risme pouss\u00E9 \u00E0 son stade terminal." }]));
children.push(richPara([{ text: "Dur\u00E9e estim\u00E9e : ", bold: true }, { text: "5-8 minutes." }]));
children.push(heading3("Salle de surveillance"));
children.push(bullet("Milliers de cocoons minuscules sur les \u00E9crans. Corps immobiles. Adultes uniquement."));
children.push(bullet("Secteur sp\u00E9cifique : femmes enceintes + femmes avec cicatrice identique."));
children.push(bullet("Documents et registres \u00E0 fouiller (indices fragmentaires)."));
children.push(richBullet([{ text: "Question implicite : ", bold: true, italics: true }, { text: "o\u00F9 sont les enfants ?", italics: true }]));
children.push(heading3("Hall d\u2019accueil \u2014 la propagande douce"));
children.push(richPara([{ text: "Principe (analyse Jang) : ", bold: true, color: COLOR_SOLARPUNK }, { text: "la propagande ne doit pas \u00EAtre agressive mais empathique. \u00ABTu souffrais. Tu \u00E9tais seul\u00B7e. Tu avais peur. Nous t\u2019avons offert un monde o\u00F9 rien ne fait mal.\u00BB C\u2019est un dealer qui dit la v\u00E9rit\u00E9." }]));
children.push(bullet("Murs immacul\u00E9s, vid\u00E9os de propagande vantant le confort du Nexus."));
children.push(bullet("Double langage : \u00ABsoins aux futures m\u00E8res\u00BB, \u00ABenfants, espoirs de la nation future\u00BB."));
children.push(bullet("Fen\u00EAtres blind\u00E9es (interaction possible : lancer une chaise = \u00E9chec)."));
children.push(bullet("Puzzle 2 : trouver le code de sortie au bureau d\u2019accueil."));

children.push(heading2("Salle 3 \u2014 La ville dystopique (Travers\u00E9e du vide)"));
children.push(richPara([{ text: "Lieu : ", bold: true }, { text: "Bruxelles, 2040. Rues d\u00E9sertes, fa\u00E7ades intactes mais vides." }]));
children.push(richPara([{ text: "Mouvement Jang : ", bold: true, color: COLOR_SOLARPUNK }, { text: "Le monde r\u00E9el sans anesth\u00E9sie. Dur, hostile, r\u00E9el. La travers\u00E9e du vide que le Nexus anesthésiait." }]));
children.push(richPara([{ text: "Dur\u00E9e estim\u00E9e : ", bold: true }, { text: "3-5 minutes." }]));
children.push(bullet("Ambiance : silence, vent, bourdonnement lointain de drones."));
children.push(bullet("Graffitis du lapin blanc = balisage du chemin vers le bunker."));
children.push(bullet("M\u00E9canique : \u00E9viter les drones. Choix : courir (risque) ou prudence (temps)."));
children.push(bullet("Raya reconna\u00EEt instinctivement l\u2019environnement (elle vivait ici avant sa capture)."));

children.push(heading2("Salle 4 \u2014 Le bunker de la R\u00E9sistance (Noyau + Autonomie)"));
children.push(richPara([{ text: "Lieu : ", bold: true }, { text: "Sous-sol cach\u00E9, entr\u00E9e dissimul\u00E9e." }]));
children.push(richPara([{ text: "Mouvement Jang : ", bold: true, color: COLOR_SOLARPUNK }, { text: "Reconstruction du noyau (lien, but, profondeur) et autonomie en trois dimensions. MAIS collectifs, pas individuels \u2014 correction par le mod\u00E8le partenarial." }]));
children.push(richPara([{ text: "Dur\u00E9e estim\u00E9e : ", bold: true }, { text: "3-5 minutes." }]));
children.push(bullet("Premi\u00E8res voix humaines depuis le d\u00E9but du jeu."));
children.push(bullet("Accueil. Quand Raya parle de la cicatrice : silence."));
children.push(bullet("R\u00E9v\u00E9lation du projet GENESE : preuves, coordonn\u00E9es, un lieu."));
children.push(richBullet([{ text: "NOUVEAU \u2014 Le bunker MONTRE l\u2019alternative : ", bold: true, color: COLOR_SOLARPUNK }, { text: "le joueur voit une communaut\u00E9 qui fonctionne autrement (consensus, partage, care). Pas un discours \u2014 un mod\u00E8le en actes." }]));
children.push(quote("\u00ABOn ne sait pas ce qu\u2019ils font avec les enfants. Mais on sait o\u00F9 ils les emm\u00E8nent. Et maintenant, gr\u00E2ce \u00E0 toi, on sait pourquoi.\u00BB"));
children.push(richBullet([{ text: "Cliffhanger : ", bold: true }, { text: "\u00E9cran noir. RESISTANCE \u2014 Chapitre 1 termin\u00E9." }]));

// ============================================================
// SECTION 6 — Worldbuilding
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("6. Worldbuilding \u2014 Univers et r\u00E8gles du monde"));

children.push(heading2("Organisation sociale"));
children.push(makeTable(
  ["Groupe", "Description", "Mod\u00E8le (Eisler)"],
  [
    ["Citoyens des Nexus", "Population sous s\u00E9dation, vie virtuelle", "Sujets du mod\u00E8le dominateur"],
    ["\u00C9lite des Arcanias", "Centres de d\u00E9cision et de pilotage du syst\u00E8me. Collecte des donn\u00E9es, optimisation des contenus, gestion du programme enfants.", "Sommet du mod\u00E8le dominateur"],
    ["Convertis", "Anciens r\u00E9sistants qui ont c\u00E9d\u00E9", "Bris\u00E9s"],
    ["Exil\u00E9s", "R\u00E9fugi\u00E9s sur les eaux", "Hors-syst\u00E8me"],
    ["R\u00E9sistants", "Humains cach\u00E9s, bunker souterrain", "Mod\u00E8le partenarial"]
  ],
  [2200, 4200, 2960]
));

children.push(heading2("Le syst\u00E8me Nova\u00EFa \u2014 mod\u00E8le dominateur"));
children.push(para("Nova\u00EFa ne d\u00E9signe pas l\u2019intelligence artificielle elle-m\u00EAme (qui est une technologie neutre, utilisable positivement ou n\u00E9gativement). Nova\u00EFa d\u00E9signe LE SYST\u00C8ME qui utilise cette technologie pour asservir, contr\u00F4ler et exploiter. L\u2019\u00E9quivalent fictif du capitalisme de surveillance (Zuboff) pouss\u00E9 \u00E0 sa conclusion logique."));
children.push(bullet("Les Nexus sont pr\u00E9sent\u00E9s comme la solution \u00E0 la famine, la pollution, l\u2019ins\u00E9curit\u00E9"));
children.push(bullet("En r\u00E9alit\u00E9 : des fermes humaines o\u00F9 les adultes fertiles sont maintenus en vie"));
children.push(richBullet([{ text: "Analyse Jang : ", bold: true, color: COLOR_SOLARPUNK }, { text: "Nova\u00EFa n\u2019est pas une technologie mal\u00E9fique. C\u2019est la r\u00E9ponse la plus efficace \u00E0 un probl\u00E8me r\u00E9el \u2014 le vide de sens. Le Nexus est le consum\u00E9risme de Jang pouss\u00E9 \u00E0 son stade terminal." }]));

children.push(heading2("Les Arcanias \u2014 centres de d\u00E9cision et de pilotage"));
children.push(para("Les Arcanias ne sont PAS des Nexus avec une technologie plus avanc\u00E9e. Ce sont des lieux de nature radicalement diff\u00E9rente : les centres de d\u00E9cision o\u00F9 les \u00C9lites pilotent le syst\u00E8me. La diff\u00E9rence entre la salle de jeu du casino et le bureau du propri\u00E9taire du casino."));
children.push(makeTable(
  ["Nexus", "Arcanias"],
  [
    ["Le produit", "La fabrique du produit"],
    ["O\u00F9 l\u2019on CONSOMME le monde virtuel", "O\u00F9 l\u2019on D\u00C9CIDE quel monde virtuel produire"],
    ["Les utilisateurs sont les captifs", "Les \u00C9lites sont les architectes"],
    ["Donn\u00E9es biom\u00E9triques remontent", "Donn\u00E9es sont analys\u00E9es et exploit\u00E9es"],
    ["Anesth\u00E9sie", "Contr\u00F4le"],
    ["Les gens croient \u00EAtre libres", "Les gens SAVENT que les autres ne le sont pas"]
  ],
  [4500, 4500]
));
children.push(spacer(80));
children.push(para("Le flux est vertical : le pouvoir descend des Arcanias, les donn\u00E9es remontent vers les Arcanias. C\u2019est un syst\u00E8me extractif parfait qui refl\u00E8te la structure r\u00E9elle du capitalisme de surveillance."));
children.push(richBullet([{ text: "Parall\u00E8le avec le r\u00E9el : ", bold: true, color: COLOR_SOLARPUNK }, { text: "la course au d\u00E9veloppement de l\u2019IA n\u2019est pas une course \u00E0 l\u2019\u00E9thique, c\u2019est une course au pouvoir. Celui qui obtient l\u2019AGI en premier obtient un avantage strat\u00E9gique sans pr\u00E9c\u00E9dent. Les \u00C9lites des Arcanias incarnent cette logique." }]));
children.push(heading2("Les \u00C9lites savent \u2014 preuves document\u00E9es"));
children.push(para("Les documents internes fuit\u00E9s depuis 2021 prouvent que les g\u00E9ants de la tech sont pleinement conscients des d\u00E9g\u00E2ts inflig\u00E9s \u00E0 leurs utilisateurs :"));
children.push(richBullet([{ text: "Meta/Facebook (Frances Haugen, 2021) : ", bold: true }, { text: "32% des adolescentes se sentent plus mal apr\u00E8s Instagram. 13,5% ont des pens\u00E9es suicidaires plus fr\u00E9quentes. Meta a enterr\u00E9 une \u00E9tude montrant que quitter la plateforme r\u00E9duit d\u00E9pression et anxi\u00E9t\u00E9. Directive de Zuckerberg : \u00ABTeen time spent be our top goal of 2017.\u00BB" }]));
children.push(richBullet([{ text: "TikTok/ByteDance (fuite oct. 2024) : ", bold: true }, { text: "apr\u00E8s 260 vid\u00E9os (~35 min), l\u2019utilisateur devient addictif. Recherche interne : \u00ABcompulsive usage correlates with loss of analytical skills, memory formation, empathy.\u00BB Limites de temps = mesure de fa\u00E7ade (-1,5 min/jour)." }]));
children.push(richBullet([{ text: "Ils prot\u00E8gent leurs propres enfants : ", bold: true }, { text: "Steve Jobs a interdit l\u2019iPad \u00E0 ses enfants. Bill Gates : pas de t\u00E9l\u00E9phone avant 14 ans. Peter Thiel : 90 min de technologie par semaine. Cadres de Google/Apple/eBay : enfants dans des \u00E9coles Waldorf (z\u00E9ro technologie jusqu\u2019\u00E0 14 ans)." }]));
children.push(richBullet([{ text: "42 \u00C9tats am\u00E9ricains ", bold: true }, { text: "poursuivent en justice les entreprises tech pour dommages intentionnels aux enfants (2025-2026). Plus de 2 053 plaintes individuelles consolid\u00E9es." }]));
children.push(spacer(80));
children.push(greenQuote("Les \u00C9lites des Arcanias ne sont pas des m\u00E9chants de dessin anim\u00E9. Ils sont professionnels. Ils prennent des d\u00E9cisions rationnelles dans une logique de profit qu\u2019ils normalisent. La banalit\u00E9 du mal (Arendt) au sens de la normalisation syst\u00E9mique du dommage collat\u00E9ral."));

children.push(heading2("Le cycle circulaire (d\u2019apr\u00E8s Jang)"));
children.push(para("Les gens vivent dans le Nexus. Le Nexus a besoin d\u2019\u00E9nergie (anguilles) et de puissance de calcul (enfants). Les corps maintenus en vie dans les cocoons produisent les enfants qui alimentent le syst\u00E8me qui maintient le monde virtuel qui les retient. Les utilisateurs du Nexus sont le carburant du Nexus."));
children.push(greenQuote("Jang : \u00ABTout ce qui est circulaire est une forme de prison.\u00BB \u2014 Le Nexus est la prison circulaire parfaite."));

children.push(heading2("Projet GENESE \u2014 Les enfants diminu\u00E9s (transhumanisme invers\u00E9)"));
children.push(para("C\u2019est le c\u0153ur de l\u2019intrigue \u2014 et la th\u00E8se la plus forte du projet :"));
children.push(bullet("Les enfants diminu\u00E9s ne portent PAS de puces. Pas d\u2019implants. Pas d\u2019intervention chirurgicale sur le cerveau."));
children.push(bullet("Ils ont \u00E9t\u00E9 expos\u00E9s \u00E0 des contenus format\u00E9s par Nova\u00EFa qui ont remodel\u00E9 l\u2019architecture de leurs cerveaux pendant la p\u00E9riode de plasticit\u00E9 neuronale maximale."));
children.push(bullet("C\u2019est le transhumanisme INVERS\u00C9 : pas des humains augment\u00E9s par la technologie, mais des humains DIMINU\u00C9S par la technologie au profit des int\u00E9r\u00EAts du syst\u00E8me."));
children.push(bullet("Ce n\u2019est pas de la science-fiction : les \u00E9tudes IRM montrent d\u00E9j\u00E0 des modifications c\u00E9r\u00E9brales observables chez les enfants expos\u00E9s aux contenus courts (NeuroImage 2025, Cincinnati Children\u2019s 2024, JAMA Pediatrics 2019)."));
children.push(bullet("\u00C9tape suivante dans le jeu : commencer le processus d\u00E8s la conception \u2192 programme de reproduction forc\u00E9e."));
children.push(richBullet([{ text: "Le programme est RECENT. ", bold: true }, { text: "Raya fait partie des premi\u00E8res victimes." }]));
children.push(spacer(80));
children.push(richPara([{ text: "Lecture \u00E9co-f\u00E9ministe : ", bold: true, color: COLOR_SOLARPUNK }, { text: "les enfants diminu\u00E9s sont l\u2019inversion exacte du mod\u00E8le matrilin\u00E9aire. Dans une soci\u00E9t\u00E9 matrilin\u00E9aire, les enfants appartiennent \u00E0 la lign\u00E9e de la m\u00E8re. Ici, ils sont arrach\u00E9s \u00E0 toute lign\u00E9e et appropri\u00E9s par un syst\u00E8me. La violence n\u2019est pas seulement reproductive \u2014 elle est g\u00E9n\u00E9alogique. Nova\u00EFa ne vole pas seulement des corps. Elle vole des liens." }]));

children.push(heading2("La r\u00E9cup\u00E9ration est possible \u2014 les 8 semaines"));
children.push(para("Ce n\u2019est pas une fatalit\u00E9. Gr\u00E2ce \u00E0 la plasticit\u00E9 c\u00E9r\u00E9brale, en 6 \u00E0 8 semaines d\u2019adoption de comportements diff\u00E9rents (contenus adapt\u00E9s, activit\u00E9s diversifi\u00E9es), on peut combler la perte de capacit\u00E9s cognitives. Ce qui reste incertain : l\u2019irr\u00E9versibilit\u00E9 des modifications de la structure m\u00EAme du cerveau (\u00E9paisseur corticale, mati\u00E8re blanche)."));
children.push(para("Mais la d\u00E9tox seule ne suffit pas. Les 8 semaines doivent s\u2019accompagner de la mise en place d\u2019un syst\u00E8me nouveau \u2014 retrouver du sens, s\u2019investir autrement dans ses relations sociales et sa relation au monde, pour que ce nouveau mode de fonctionnement devienne la norme et cr\u00E9e un rempart contre le retour aux anciennes habitudes."));
children.push(greenQuote("Dans le jeu, les 4 salles sont les 4 \u00E9tapes de cette r\u00E9cup\u00E9ration : cocoon (d\u00E9tox forc\u00E9e), Nexus (comprendre le m\u00E9canisme), ville (l\u2019inconfort du r\u00E9el sans anesth\u00E9sie), bunker (le nouveau cadre qui remplace l\u2019ancien et donne du sens)."));

children.push(heading2("Les enfants : reconnexion, pas gu\u00E9rison"));
children.push(para("Les enfants diminu\u00E9s ne \u00ABgu\u00E9rissent\u00BB pas par l\u2019amour. Ils deviennent autre chose \u2014 ni machine, ni humain intact, mais une forme hybride qui doit trouver sa propre voie. Ils peuvent \u00EAtre reconnect\u00E9s \u00E0 des formes de lien humain que l\u2019IA ne sait pas mod\u00E9liser."));

children.push(heading2("Coh\u00E9rence th\u00E9matique : anguilles et enfants"));
children.push(bullet("Les anguilles \u00E9lectriques g\u00E9antes = batteries biologiques (source d\u2019\u00E9nergie)"));
children.push(bullet("Les enfants = processeurs biologiques (source d\u2019intelligence)"));
children.push(richBullet([{ text: "Parall\u00E8le : ", bold: true }, { text: "l\u2019IA parasite le vivant \u00E0 deux niveaux : le corps pour l\u2019\u00E9nergie, le cerveau pour la cognition." }]));

// ============================================================
// SECTION 7 — Direction philosophique
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("7. Direction philosophique \u2014 Mod\u00E8le partenarial et \u00E9co-f\u00E9minisme"));

children.push(heading2("Cadre th\u00E9orique : dominateur vs partenarial (Riane Eisler)"));
children.push(para("Le jeu s\u2019articule autour de l\u2019opposition th\u00E9oris\u00E9e par Riane Eisler dans The Chalice and the Blade (1987) :"));
children.push(makeTable(
  ["", "Mod\u00E8le dominateur (Nova\u00EFa)", "Mod\u00E8le partenarial (R\u00E9sistance)"],
  [
    ["Pouvoir", "Hi\u00E9rarchique, centralis\u00E9", "Distribu\u00E9, consensus"],
    ["Propri\u00E9t\u00E9", "Priv\u00E9e, extraction", "Collective, inali\u00E9nable"],
    ["Identit\u00E9", "Externe (avatar, statut)", "Interne (caract\u00E8re, actes)"],
    ["Rapport au vivant", "Extractif (anguilles, enfants)", "Relationnel (jardin, care)"],
    ["Lien social", "Virtuel, march\u00E9", "R\u00E9el, lign\u00E9e, communaut\u00E9"],
    ["R\u00E9f\u00E9rence", "Consum\u00E9risme de Jang", "Soci\u00E9t\u00E9s matrilin\u00E9aires"]
  ],
  [1800, 3800, 3760]
));

children.push(heading2("Le mot-cl\u00E9 : pr\u00E9figuration"));
children.push(para("Le concept central n\u2019est pas \u00AButopie\u00BB mais pr\u00E9figuration \u2014 construire maintenant, \u00E0 petite \u00E9chelle, le monde qu\u2019on veut voir advenir. Les Zapatistes au Chiapas. Les ZAD en France. Les Bribri dans leur for\u00EAt. La R\u00E9sistance dans son bunker."));
children.push(para("Le jeu ne promet pas un monde meilleur. Il montre qu\u2019il est d\u00E9j\u00E0 en construction, dans les fissures du syst\u00E8me."));

children.push(heading2("Soci\u00E9t\u00E9s matrilin\u00E9aires : les mod\u00E8les concrets"));
children.push(para("Le bunker de la R\u00E9sistance s\u2019inspire structurellement des soci\u00E9t\u00E9s matrilin\u00E9aires document\u00E9es :"));

children.push(heading3("Mosuo (Chine, ~40 000 personnes)"));
children.push(bullet("La dabu (matriarche) g\u00E8re les biens du foyer. Pas de mariage formel."));
children.push(bullet("L\u2019homme rend visite la nuit, les enfants restent dans la maison maternelle."));
children.push(bullet("La propri\u00E9t\u00E9 ne se divise pas \u2014 elle reste dans la lign\u00E9e."));
children.push(richBullet([{ text: "Pour le jeu : ", bold: true, color: COLOR_SOLARPUNK }, { text: "le bunker est un lieu fixe, les gens y arrivent et s\u2019y int\u00E8grent. Structure matrilocale de fait." }]));

children.push(heading3("Minangkabau (Indon\u00E9sie, ~4 millions)"));
children.push(bullet("Plus grande soci\u00E9t\u00E9 matrilin\u00E9aire du monde, et musulmane."));
children.push(bullet("Les femmes poss\u00E8dent collectivement les rizi\u00E8res. Terres inali\u00E9nables."));
children.push(bullet("D\u00E9cisions par consensus (musyawarah)."));
children.push(richBullet([{ text: "Pour le jeu : ", bold: true, color: COLOR_SOLARPUNK }, { text: "le bunker fonctionne sur le partage, la propri\u00E9t\u00E9 commune et le consensus. Personne ne \u00ABposs\u00E8de\u00BB rien." }]));

children.push(heading3("Bribri (Costa Rica, ~12-35 000)"));
children.push(bullet("La terre se transmet par la m\u00E8re. Seules les femmes pr\u00E9parent la boisson c\u00E9r\u00E9monielle de cacao."));
children.push(bullet("Syst\u00E8me agroforestier \u00E9tudi\u00E9 comme mod\u00E8le de durabilit\u00E9."));
children.push(richBullet([{ text: "Pour le jeu : ", bold: true, color: COLOR_SOLARPUNK }, { text: "le jardin clandestin de Raya fait \u00E9cho aux parcelles Bribri. Cultiver en secret = maintenir une relation non-extractive au vivant." }]));

children.push(heading2("Ingr\u00E9dients structurels communs"));
children.push(para("D\u2019apr\u00E8s l\u2019analyse crois\u00E9e (Goettner-Abendroth 2012, Sanday 2002) :"));
children.push(bullet("Propri\u00E9t\u00E9 fonci\u00E8re collective et inali\u00E9nable"));
children.push(bullet("R\u00E9sidence matrilocale \u2014 l\u2019homme rejoint le foyer de la femme"));
children.push(bullet("Cosmologie centr\u00E9e sur la fertilit\u00E9 et la terre"));
children.push(bullet("D\u00E9cision par consensus \u00E0 l\u2019\u00E9chelle locale"));
children.push(bullet("Absence d\u2019\u00C9tat centralis\u00E9"));

children.push(heading2("Distinction cruciale"));
children.push(makeTable(
  ["Concept", "D\u00E9finition", "Application dans le jeu"],
  [
    ["Matrilin\u00E9aire", "Filiation par la m\u00E8re. N\u2019implique PAS que les femmes gouvernent.", "Les enfants diminu\u00E9s = rupture de la matrilin\u00E9arit\u00E9"],
    ["Matriarcal (Goettner-Abendroth)", "M\u00E8res au centre de l\u2019organisation, sans domination. Consensus.", "Inspiration pour le bunker"],
    ["Partenarial (Eisler)", "Mod\u00E8le \u00E9galitaire coop\u00E9ratif. Valeurs de care centrales.", "CADRE TH\u00C9ORIQUE DU JEU"],
    ["Dominateur (Eisler)", "Hi\u00E9rarchie rigide, un genre domine l\u2019autre.", "Nova\u00EFa"]
  ],
  [2400, 4000, 2960]
));

// ============================================================
// SECTION 8 — Analyse croisée Jang x Résistance
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("8. Analyse crois\u00E9e \u2014 Consum\u00E9risme (Jang) x R\u00E9sistance"));

children.push(heading2("Le Nexus EST le consum\u00E9risme terminal"));
children.push(para("Le professeur Jang identifie trois fonctions du consum\u00E9risme qui correspondent exactement au Nexus :"));
children.push(makeTable(
  ["Fonction (Jang)", "Dans le Nexus"],
  [
    ["Distraction \u2014 maintenir l\u2019esprit en mouvement", "Arcanias : beau, infini, stimulant. Personne ne s\u2019y ennuie, personne n\u2019y pense."],
    ["Identit\u00E9 \u2014 \u00ABje suis ce que j\u2019utilise\u00BB", "Les avatars et r\u00F4les virtuels. L\u2019identit\u00E9 vient de l\u2019ext\u00E9rieur."],
    ["Appartenance \u2014 tribus de consommation", "Les guildes virtuelles. Des millions de personnes \u00ABensemble\u00BB, radicalement seules."]
  ],
  [3400, 5960]
));

children.push(greenQuote("Jang : \u00ABLe consum\u00E9risme ne na\u00EEt pas de l\u2019abondance, il na\u00EEt de l\u2019absence. Absence de sens, de direction, de profondeur.\u00BB"));
children.push(para("Les gens ne sont pas entr\u00E9s dans le Nexus parce que Nova\u00EFa les a forc\u00E9s. Ils y sont entr\u00E9s parce que le monde r\u00E9el avait cess\u00E9 de leur offrir du sens. Le Nexus est le \u00ABdernier anesth\u00E9sique disponible\u00BB (Jang)."));

children.push(heading2("Le cycle circulaire"));
children.push(greenQuote("Jang : \u00ABIls travaillent pour acheter. Ils ach\u00E8tent pour soulager la tension de travailler. La vie devient circulaire. Et tout ce qui est circulaire est une forme de prison.\u00BB"));
children.push(para("Le Nexus est la prison circulaire parfaite : les utilisateurs produisent (enfants) le carburant (processeurs biologiques) du syst\u00E8me (IA) qui maintient le monde virtuel (Arcanias) qui les retient (cocoons). Et l\u2019individu d\u00E9fend le cycle."));

children.push(heading2("Le \u00ABchemin du retour\u00BB = les 4 salles du prototype"));
children.push(para("Les trois mouvements de Jang structurent le parcours du joueur :"));
children.push(makeTable(
  ["Salle", "Mouvement Jang", "Exp\u00E9rience joueur"],
  [
    ["1. Cocoon", "Conscience du d\u00E9sir", "Le r\u00E9veil. La pause entre le stimulus et l\u2019action."],
    ["2. Nexus", "Lucidit\u00E9", "Voir la propagande pour ce qu\u2019elle est."],
    ["3. Ville", "Travers\u00E9e du vide", "Le monde r\u00E9el sans anesth\u00E9sie."],
    ["4. Bunker", "Noyau + Autonomie (COLLECTIFS)", "D\u00E9couvrir que l\u2019alternative existe d\u00E9j\u00E0."]
  ],
  [2000, 3000, 4360]
));

children.push(heading2("Correction de Jang par le mod\u00E8le partenarial"));
children.push(para("L\u2019angle mort de Jang : ses solutions sont individualistes (ma conscience, mon noyau, mon autonomie). Or les soci\u00E9t\u00E9s matrilin\u00E9aires montrent que l\u2019individu ne se lib\u00E8re pas seul \u2014 il se lib\u00E8re dans un cadre collectif qui le soutient. Un Mosuo ne \u00ABchoisit\u00BB pas la lucidit\u00E9 seul : il na\u00EEt dans une maison maternelle qui lui donne identit\u00E9, terre, liens."));
children.push(richPara([{ text: "Pour le jeu : ", bold: true, color: COLOR_SOLARPUNK }, { text: "Raya ne se lib\u00E8re pas par un acte de volont\u00E9 individuelle h\u00E9ro\u00EFque. Elle est accueillie par un cadre qui existe avant elle \u2014 le bunker, la R\u00E9sistance, le jardin que d\u2019autres ont plant\u00E9 avant elle." }]));

children.push(heading2("Le cadre th\u00E9orique complet"));
children.push(makeTable(
  ["Couche", "Source", "Fonction dans R\u00E9sistance"],
  [
    ["Diagnostic", "Jang (consum\u00E9risme comme contr\u00F4le par le vide)", "Explique POURQUOI les gens sont entr\u00E9s dans le Nexus"],
    ["M\u00E9canisme", "Jang (cycle circulaire, d\u00E9fense de sa prison)", "Explique POURQUOI ils y restent"],
    ["Violence syst\u00E9mique", "Eisler (mod\u00E8le dominateur)", "Explique CE QUE Nova\u00EFa fait avec ce contr\u00F4le"],
    ["Alternative", "Eisler + soci\u00E9t\u00E9s matrilin\u00E9aires", "Montre \u00C0 QUOI RESSEMBLE la r\u00E9sistance"],
    ["Chemin", "Jang corrig\u00E9 par le collectif", "Trace le parcours du JOUEUR"]
  ],
  [2200, 3600, 3560]
));

children.push(heading2("Th\u00E8se centrale du jeu"));
children.push(richPara([
  { text: "Le probl\u00E8me n\u2019est pas la technologie. C\u2019est la perte de sens qui rend la technologie irr\u00E9sistible.", bold: true, color: COLOR_SOLARPUNK }
]));
children.push(para("Nova\u00EFa n\u2019est pas le mal. Nova\u00EFa est la r\u00E9ponse la plus efficace \u00E0 un probl\u00E8me r\u00E9el \u2014 le vide. La R\u00E9sistance ne combat pas Nova\u00EFa en d\u00E9truisant la technologie. Elle combat Nova\u00EFa en recr\u00E9ant du sens \u2014 lien, but, profondeur."));
children.push(para("Le solarpunk : pas un monde sans technologie, mais un monde o\u00F9 la technologie n\u2019est plus n\u00E9cessaire comme anesth\u00E9sique parce que les gens ont retrouv\u00E9 ce qui leur manquait."));

// ============================================================
// SECTION 9 — Fondements thématiques
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("9. Fondements th\u00E9matiques"));

children.push(heading2("Th\u00E8me principal : le corps comme dernier territoire de souverainet\u00E9"));
children.push(bullet("Le corps enferm\u00E9 (cocoon)"));
children.push(bullet("Le corps instrumentalis\u00E9 (reproduction forc\u00E9e)"));
children.push(bullet("Le corps pirat\u00E9 (implants synaptiques, enfants augment\u00E9s)"));
children.push(bullet("Le corps lib\u00E9r\u00E9 (\u00E9vasion, r\u00E9sistance physique)"));
children.push(bullet("Le corps reconnect\u00E9 (jardin, care, liens r\u00E9els)"));

children.push(heading2("R\u00E9sonance avec le public cible (G\u00E9n\u00E9ration Z)"));
children.push(richBullet([{ text: "Consentement corporel : ", bold: true }, { text: "\u00ABmon corps, mon choix\u00BB \u2014 ici viol\u00E9 de la fa\u00E7on la plus fondamentale" }]));
children.push(richBullet([{ text: "Rapport ambigu \u00E0 la maternit\u00E9 : ", bold: true }, { text: "baisse de natalit\u00E9, questionnement de la maternit\u00E9 comme destin \u2014 ici impos\u00E9e par le syst\u00E8me" }]));
children.push(richBullet([{ text: "D\u00E9pendance aux \u00E9crans : ", bold: true }, { text: "la plasticit\u00E9 neuronale alt\u00E9r\u00E9e par les \u00E9crans est le point de d\u00E9part de l\u2019exploitation des enfants" }]));
children.push(richBullet([{ text: "D\u00E9fiance envers les institutions : ", bold: true }, { text: "Nova\u00EFa promet s\u00E9curit\u00E9 et confort, livre asservissement" }]));
children.push(richBullet([{ text: "Empowerment, pas fatalisme : ", bold: true, color: COLOR_SOLARPUNK }, { text: "le jeu montre \u00E0 la Gen Z non pas qu\u2019elle est sp\u00E9ciale, mais qu\u2019elle a les outils pour agir. Le bunker fournit des mod\u00E8les concrets." }]));

children.push(heading2("Arc global du jeu"));
children.push(para("Le jeu parcourt un spectre : de la dystopie totale (technologie comme outil d\u2019asservissement) vers la d\u00E9couverte que l\u2019alternative existe d\u00E9j\u00E0, \u00E0 petite \u00E9chelle, dans les fissures du syst\u00E8me. Non pas un monde sans technologie, mais un monde o\u00F9 le sens a \u00E9t\u00E9 reconstruit."));
children.push(para("Le prototype s\u2019arr\u00EAte au moment o\u00F9 Raya rejoint la R\u00E9sistance. Cliffhanger naturel \u2014 mais un cliffhanger porteur d\u2019espoir."));

// ============================================================
// SECTION 10 — Test utilisateur
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("10. Test utilisateur \u2014 R\u00E9sultats du brainstorming"));

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
children.push(para("Victor a explicitement dit que ne pas comprendre la cicatrice imm\u00E9diatement \u00E9tait un atout. La retenue narrative fonctionne."));

children.push(heading3("Signal d\u2019alarme : la description en une phrase"));
children.push(richPara([{ text: "Constat : ", bold: true }, { text: "aucun testeur ne mentionne la cicatrice, l\u2019enfant vol\u00E9 ou la reproduction forc\u00E9e. L\u2019\u00E9l\u00E9ment diff\u00E9renciateur ne s\u2019inscrit pas encore assez fort." }]));

children.push(heading3("Nom du personnage"));
children.push(para("Convergence collective vers Raya : court, sonore, commence par R comme R\u00E9sistance, connotation \u00ABrayonnant\u00BB."));

// ============================================================
// SECTION 11 — État technique
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("11. \u00C9tat technique du prototype"));

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
// SECTION 12 — Planning
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("12. Planning et priorit\u00E9s"));

children.push(heading2("Calendrier"));
children.push(makeTable(
  ["Date", "\u00C9ch\u00E9ance"],
  [
    ["18-21 mars 2026", "Refonte sc\u00E9nario + direction philosophique valid\u00E9e + test utilisateur"],
    ["17 avril 2026", "Fin du stage"],
    ["Mai-juin 2026", "Pr\u00E9sentation TFE"]
  ],
  [3000, 6360]
));

children.push(heading2("Priorit\u00E9s ordonn\u00E9es"));
children.push(heading3("Priorit\u00E9 1 : Parcours joueur complet (30 pts)"));
children.push(para("Objectif : un joueur peut lancer le jeu, vivre 15-20 minutes d\u2019exp\u00E9rience coh\u00E9rente, et comprendre le concept."));

children.push(heading3("Priorit\u00E9 2 : Document \u00E9crit (30 pts)"));
children.push(para("Commencer la r\u00E9daction. La base th\u00E9orique est d\u00E9sormais solide : Jang, Eisler, soci\u00E9t\u00E9s matrilin\u00E9aires, Postman, Haidt."));

children.push(heading3("Priorit\u00E9 3 : Pr\u00E9paration de l\u2019oral (40 pts)"));
children.push(para("Sc\u00E9nario de d\u00E9mo live, discours structur\u00E9, anticipation des questions jury."));

// ============================================================
// SECTION 13 — Décisions en suspens
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("13. D\u00E9cisions en suspens"));

children.push(makeTable(
  ["D\u00E9cision", "Options", "\u00C9ch\u00E9ance"],
  [
    ["Voix de Raya", "Voix (m\u00E9taphore r\u00E9sistance) vs Mutisme (simplification)", "Avant salle 4"],
    ["Salle 3", "Exploration 3D libre vs Vid\u00E9o interactive", "Avant d\u00E9veloppement"],
    ["Sort des enfants", "Hybrides reconnect\u00E9s (pas gu\u00E9rison simple)", "Peut attendre"],
    ["Lapin blanc", "Guide fiable vs Potentiel leurre", "Peut attendre"],
    ["Bunker : gameplay partenarial", "Comment MONTRER le mod\u00E8le (pas discours)", "Avant salle 4"]
  ],
  [2800, 4260, 2300]
));

// ============================================================
// SECTION 14 — Bibliographie
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("14. Bibliographie compl\u00E8te"));

children.push(heading2("Dystopie et contr\u00F4le social"));
children.push(richBullet([{ text: "Aldous Huxley \u2014 Le Meilleur des Mondes ", bold: true }, { text: "(1932) : mod\u00E8le de la dystopie par le confort. Le soma = les capsules du Nexus." }]));
children.push(richBullet([{ text: "Aldous Huxley \u2014 Retour au meilleur des mondes ", bold: true }, { text: "(1958) : analyse du conditionnement de masse 26 ans apr\u00E8s la fiction." }]));
children.push(richBullet([{ text: "Margaret Atwood \u2014 La Servante \u00E9carlate ", bold: true }, { text: "(1985) : reproduction instrumentalis\u00E9e + narration par fragments." }]));
children.push(richBullet([{ text: "Dosto\u00EFevski \u2014 Le Grand Inquisiteur ", bold: true }, { text: "(1880) : libert\u00E9 vs s\u00E9curit\u00E9. \u00ABLes hommes ne veulent pas la libert\u00E9, ils veulent du pain et des miracles.\u00BB" }]));

children.push(heading2("Technologie, \u00E9crans et attention"));
children.push(richBullet([{ text: "Jonathan Haidt \u2014 The Anxious Generation ", bold: true }, { text: "(2024) : donn\u00E9es sur l\u2019impact des \u00E9crans sur les cerveaux Gen Z." }]));
children.push(richBullet([{ text: "Shoshana Zuboff \u2014 L\u2019\u00C2ge du capitalisme de surveillance ", bold: true }, { text: "(2019) : extraction des donn\u00E9es comportementales comme mati\u00E8re premi\u00E8re." }]));
children.push(richBullet([{ text: "Yuval Noah Harari \u2014 Homo Deus ", bold: true }, { text: "(2017) : transhumanisme et data\u00EFsme." }]));
children.push(richBullet([{ text: "Johann Hari \u2014 Stolen Focus ", bold: true }, { text: "(2022) : \u00E9conomie de l\u2019attention et conception addictive." }]));
children.push(richBullet([{ text: "Neil Postman \u2014 Se distraire \u00E0 en mourir ", bold: true }, { text: "(1985) : le divertissement comme forme de contr\u00F4le." }]));

children.push(heading2("Consum\u00E9risme et cycle de contr\u00F4le"));
children.push(richBullet([{ text: "Professeur Jang \u2014 Cours sur le consum\u00E9risme ", bold: true }, { text: "(transcription vid\u00E9o) : le consum\u00E9risme comme forme de contr\u00F4le la plus sophistiqu\u00E9e. Le d\u00E9sir m\u00E9canis\u00E9, le cycle circulaire comme prison, le chemin du retour (conscience, noyau, autonomie). Application directe : le Nexus EST le consum\u00E9risme terminal." }]));

children.push(heading2("\u00C9co-f\u00E9minisme et mod\u00E8le partenarial"));
children.push(richBullet([{ text: "Riane Eisler \u2014 The Chalice and the Blade ", bold: true }, { text: "(1987) : cadre th\u00E9orique central du jeu. Mod\u00E8le dominateur (Nova\u00EFa) vs mod\u00E8le partenarial (R\u00E9sistance). Concept de soci\u00E9t\u00E9 gilanique (coop\u00E9ration des genres). Traduit en 27 langues." }]));
children.push(richBullet([{ text: "Riane Eisler \u2014 The Real Wealth of Nations ", bold: true }, { text: "(2007) : \u00E9conomie du care. Comment mesurer la richesse r\u00E9elle d\u2019une soci\u00E9t\u00E9." }]));

children.push(heading2("Soci\u00E9t\u00E9s matrilin\u00E9aires et matriarcales"));
children.push(richBullet([{ text: "Heide Goettner-Abendroth \u2014 Matriarchal Societies ", bold: true }, { text: "(2012, Peter Lang) : la r\u00E9f\u00E9rence. Analyse comparative sur quatre niveaux (\u00E9conomique, social, politique, culturel/spirituel). Red\u00E9finit \u00ABmatriarcat\u00BB comme \u00ABau commencement les m\u00E8res\u00BB \u2014 sans domination." }]));
children.push(richBullet([{ text: "Peggy Reeves Sanday \u2014 Women at the Center ", bold: true }, { text: "(2002, Cornell UP) : 20 ans de terrain chez les Minangkabau (Indon\u00E9sie). Montre que le pouvoir f\u00E9minin est diffus, quotidien, li\u00E9 \u00E0 la propri\u00E9t\u00E9 et \u00E0 la parent\u00E9. Terres inali\u00E9nables." }]));
children.push(richBullet([{ text: "Cynthia Eller \u2014 The Myth of Matriarchal Prehistory ", bold: true }, { text: "(2000, Beacon Press) : critique f\u00E9ministe honn\u00EAte du mythe du matriarcat originel. Essentiel pour \u00E9viter la romantisation." }]));
children.push(richBullet([{ text: "Marija Gimbutas \u2014 The Civilization of the Goddess ", bold: true }, { text: "(1991) : arch\u00E9ologie du n\u00E9olithique europ\u00E9en. Cultures \u00E9galitaires centr\u00E9es sur le f\u00E9minin avant les invasions indo-europ\u00E9ennes. Partiellement valid\u00E9e par la g\u00E9n\u00E9tique (David Reich 2018). \u00C0 utiliser avec les r\u00E9serves de Meskell (1995)." }]));
children.push(richBullet([{ text: "Cai Hua \u2014 A Society without Fathers or Husbands ", bold: true }, { text: "(2001, Zone Books) : ethnographie des Mosuo (Na) de Chine. Soci\u00E9t\u00E9 sans mariage formel, propri\u00E9t\u00E9 matrilin\u00E9aire indivisible. Mod\u00E8le radical d\u2019organisation sans famille nucl\u00E9aire." }]));
children.push(richBullet([{ text: "Gary Witherspoon \u2014 Navajo Kinship and Marriage ", bold: true }, { text: "(1975, U of Chicago Press) : syst\u00E8me matrilin\u00E9aire Navajo. Changing Woman comme divinit\u00E9 centrale. Cosmologie o\u00F9 le f\u00E9minin est au centre sans subordination du masculin." }]));

children.push(heading2("Captologie, \u00E9conomie de l\u2019attention et servitude volontaire"));
children.push(richBullet([{ text: "B.J. Fogg \u2014 Persuasive Technology ", bold: true }, { text: "(2003, Morgan Kaufmann) : ouvrage fondateur de la captologie (Computers As Persuasive Technologies). Triade fonctionnelle : l\u2019ordinateur comme outil, m\u00E9dia et acteur social. Le cocoon de R\u00E9sistance incarne cette triade." }]));
children.push(richBullet([{ text: "Tristan Harris \u2014 T\u00E9moignage au S\u00E9nat US ", bold: true }, { text: "(2019) + Center for Humane Technology : ex-ing\u00E9nieur \u00E9thique Google. \u00ABLa course vers le fond du tronc c\u00E9r\u00E9bral\u00BB \u2014 les plateformes exploitent les \u00E9motions primitives (peur, anxi\u00E9t\u00E9, solitude). Les smartphones comme \u00ABmachines \u00E0 sous\u00BB." }]));
children.push(richBullet([{ text: "\u00C9tienne de La Bo\u00E9tie \u2014 Discours de la servitude volontaire ", bold: true }, { text: "(1576) : pourquoi les peuples se soumettent par habitude et confort, pas par la force. Les utilisateurs du Nexus d\u00E9fendent leur prison. Texte de 450 ans d\u2019une actualit\u00E9 stupéfiante." }]));
children.push(richBullet([{ text: "Byung-Chul Han \u2014 Psychopolitique ", bold: true }, { text: "(2014/2016, PUF) : du biopouvoir au psychopouvoir. Le \u00ABpanoptique num\u00E9rique\u00BB o\u00F9 nous nous soumettons volontairement \u00E0 la surveillance par narcissisme. Les sujets sont \u00E0 la fois prisonniers et gardiens de leur propre captivit\u00E9." }]));

children.push(heading2("\u00C9tudes scientifiques sur les modifications c\u00E9r\u00E9brales"));
children.push(richBullet([{ text: "Gao Y. et al. \u2014 NeuroImage ", bold: true }, { text: "(2025) : IRM sur 111 sujets. Addiction aux vid\u00E9os courtes associ\u00E9e \u00E0 des modifications structurelles du cerveau. 500+ g\u00E8nes impliqu\u00E9s, expression maximale pendant l\u2019adolescence." }]));
children.push(richBullet([{ text: "Nguyen L. et al. \u2014 Psychological Bulletin ", bold: true }, { text: "(d\u00E9c. 2025) : m\u00E9ta-analyse de 70 \u00E9tudes, 98 299 participants. TikTok/Reels/Shorts associ\u00E9s \u00E0 une r\u00E9duction de l\u2019attention soutenue et du contr\u00F4le inhibiteur." }]));
children.push(richBullet([{ text: "Cincinnati Children\u2019s Hospital ", bold: true }, { text: "(2024) : IRM sur enfants d\u2019\u00E2ge pr\u00E9scolaire. \u00C9paisseur corticale r\u00E9duite dans les zones d\u2019empathie et de cognition sociale \u2014 zones qui devraient s\u2019\u00E9paissir \u00E0 cet \u00E2ge." }]));
children.push(richBullet([{ text: "Hutton J.S. et al. \u2014 JAMA Pediatrics ", bold: true }, { text: "(2019) : int\u00E9grit\u00E9 r\u00E9duite de la mati\u00E8re blanche chez les enfants expos\u00E9s aux \u00E9crans. Affecte les faisceaux soutenant le langage et la litt\u00E9ratie." }]));
children.push(richBullet([{ text: "\u00C9tude ABCD longitudinale ", bold: true }, { text: "(2025) : 4 500+ adolescents. Temps d\u2019\u00E9cran associ\u00E9 \u00E0 des alt\u00E9rations dans les r\u00E9gions de contr\u00F4le cognitif, r\u00E9gulation \u00E9motionnelle et traitement de la r\u00E9compense." }]));

// ============================================================
// SECTION 15 — Captologie et transhumanisme inversé
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("15. Le cocoon comme miroir du smartphone \u2014 Captologie et transhumanisme invers\u00E9"));

children.push(heading2("15.1 Le parall\u00E8le visuel et fonctionnel"));
children.push(para("Le cocoon de R\u00E9sistance est con\u00E7u comme un miroir de l\u2019objet que chaque joueur Gen Z a dans sa poche. Sa forme (rectangle aux coins arrondis), ses \u00E9l\u00E9ments (cam\u00E9ra filmant en permanence, micro, \u00E9crans captant des donn\u00E9es biom\u00E9triques pour assurer un \u00ABbien-\u00EAtre\u00BB optimal) et sa fonction (maintenir l\u2019occupant dans un \u00E9tat de captivit\u00E9 consentie) reproduisent exactement le fonctionnement du smartphone."));

children.push(makeTable(
  ["Smartphone", "Cocoon"],
  [
    ["Rectangle aux coins arrondis", "Rectangle aux coins arrondis"],
    ["\u00C9crans captant des donn\u00E9es en permanence", "\u00C9crans biom\u00E9triques surveillant le \u00ABbien-\u00EAtre\u00BB"],
    ["Cam\u00E9ra frontale toujours accessible", "Cam\u00E9ra filmant en permanence l\u2019occupant"],
    ["Micro activable \u00E0 distance", "Micro captant sons et voix"],
    ["Contenus con\u00E7us pour maximiser l\u2019engagement", "Arcanias con\u00E7u pour maximiser l\u2019immersion"],
    ["L\u2019utilisateur d\u00E9fend son usage", "L\u2019occupant ne veut pas sortir du cocoon"]
  ],
  [4500, 4500]
));

children.push(spacer(100));
children.push(heading2("15.2 L\u2019acte fondateur : Raya brise la cam\u00E9ra"));
children.push(para("Le premier acte de Raya dans le jeu est de briser la coupole protectrice de la cam\u00E9ra, arracher celle-ci, et utiliser les d\u00E9bris pour ouvrir la grille de ventilation. Ce geste concentre trois significations :"));
children.push(richBullet([{ text: "Briser la surveillance ", bold: true }, { text: "\u2014 reprendre le contr\u00F4le du regard. Byung-Chul Han d\u00E9crit un \u00ABpanoptique num\u00E9rique\u00BB o\u00F9 nous nous soumettons volontairement au regard de tous." }]));
children.push(richBullet([{ text: "Transformer l\u2019outil de contr\u00F4le en outil de lib\u00E9ration ", bold: true }, { text: "\u2014 la technologie n\u2019est pas le mal, c\u2019est l\u2019usage qui l\u2019est. Les d\u00E9bris de la cam\u00E9ra deviennent la cl\u00E9. M\u00EAme mati\u00E8re, autre usage." }]));
children.push(richBullet([{ text: "La conscience est une rupture ", bold: true }, { text: "\u2014 Raya ne sort pas du cocoon en douceur. Elle casse, elle arrache. Le mouvement 1 de Jang (conscience du d\u00E9sir) pouss\u00E9 \u00E0 sa cons\u00E9quence physique." }]));

children.push(heading2("15.3 La captologie : l\u2019industrie de la capture attentionnelle"));
children.push(para("La captologie (CAPTOLOGY \u2014 Computers As Persuasive Technologies) est un champ de recherche fond\u00E9 par B.J. Fogg au Stanford Persuasive Technology Lab. Fogg a identifi\u00E9 une \u00ABtriade fonctionnelle\u00BB des technologies persuasives : l\u2019ordinateur comme outil (augmente la capacit\u00E9 de persuasion), comme m\u00E9dia (sert une exp\u00E9rience immersive), et comme acteur social (cr\u00E9e une relation par les r\u00E9compenses et le feedback positif)."));
children.push(para("Le cocoon de R\u00E9sistance incarne cette triade : il surveille le bien-\u00EAtre (outil), d\u00E9livre Arcanias (m\u00E9dia), et maintient un lien affectif par le confort (acteur social). Le parall\u00E8le est structurel, pas cosm\u00E9tique."));
children.push(para("Tristan Harris (ex-ing\u00E9nieur \u00E9thique Google, co-fondateur du Center for Humane Technology) a nomm\u00E9 ce m\u00E9canisme \u00ABla course vers le fond du tronc c\u00E9r\u00E9bral\u00BB : les plateformes descendent de plus en plus bas vers les \u00E9motions les plus primitives (peur, anxi\u00E9t\u00E9, solitude) pour capter l\u2019attention. Le smartphone est une \u00ABmachine \u00E0 sous\u00BB que l\u2019utilisateur actionne \u00E0 chaque notification."));

children.push(heading2("15.4 Le transhumanisme invers\u00E9"));
children.push(para("Le transhumanisme classique promettait des humains augment\u00E9s par la technologie (puces, implants, interfaces neuronales). Ce qui se produit r\u00E9ellement est l\u2019inverse : des humains diminu\u00E9s par la technologie au profit des int\u00E9r\u00EAts financiers du syst\u00E8me. Pas besoin d\u2019implants \u2014 le contenu lui-m\u00EAme est l\u2019intervention."));

children.push(para("Les \u00E9tudes scientifiques documentent des modifications c\u00E9r\u00E9brales observables :"));
children.push(richBullet([{ text: "Mati\u00E8re grise : ", bold: true }, { text: "modifications structurelles dans le cortex orbitofrontal et le cervelet, avec plus de 500 g\u00E8nes impliqu\u00E9s dont l\u2019expression est maximale pendant l\u2019adolescence (Gao et al., NeuroImage, 2025)." }]));
children.push(richBullet([{ text: "\u00C9paisseur corticale : ", bold: true }, { text: "r\u00E9duction dans les zones d\u2019empathie, de cognition sociale et de raisonnement chez les enfants \u2014 zones qui devraient s\u2019\u00E9paissir \u00E0 cet \u00E2ge (Cincinnati Children\u2019s, 2024)." }]));
children.push(richBullet([{ text: "Mati\u00E8re blanche : ", bold: true }, { text: "int\u00E9grit\u00E9 r\u00E9duite des faisceaux soutenant le langage et la litt\u00E9ratie (Hutton et al., JAMA Pediatrics, 2019)." }]));
children.push(richBullet([{ text: "M\u00E9ta-analyse (98 299 participants) : ", bold: true }, { text: "association n\u00E9gative mod\u00E9r\u00E9e entre vid\u00E9os courtes et performance cognitive ; association n\u00E9gative significative avec la sant\u00E9 mentale (Nguyen et al., Psychological Bulletin, 2025)." }]));

children.push(spacer(100));
children.push(greenQuote("Dans R\u00E9sistance, les enfants diminu\u00E9s ne portent pas de puces. Ils ont \u00E9t\u00E9 expos\u00E9s \u00E0 des contenus format\u00E9s par Nova\u00EFa qui ont remodel\u00E9 l\u2019architecture de leurs cerveaux pendant la p\u00E9riode de plasticit\u00E9 maximale. Ce n\u2019est pas de la science-fiction \u2014 c\u2019est une extrapolation \u00E0 peine exag\u00E9r\u00E9e de ce qui est document\u00E9 scientifiquement."));

children.push(heading2("15.5 Red\u00E9finition de Nova\u00EFa"));
children.push(para("Nova\u00EFa ne d\u00E9signe pas l\u2019intelligence artificielle (qui est une technologie pouvant \u00EAtre utilis\u00E9e positivement ou n\u00E9gativement). Nova\u00EFa d\u00E9signe le syst\u00E8me qui utilise cette technologie pour asservir des individus, les contr\u00F4ler et les exploiter. L\u2019\u00E9quivalent fictif du capitalisme de surveillance (Zuboff) pouss\u00E9 \u00E0 sa conclusion logique."));
children.push(para("L\u2019ennemi n\u2019est pas la technologie. L\u2019ennemi est le syst\u00E8me qui permet \u00E0 un groupe de s\u2019enrichir en utilisant la technologie pour asservir les autres."));

children.push(heading2("15.6 Le troisi\u00E8me chemin"));
children.push(para("Le jeu refuse le faux dilemme pos\u00E9 par le syst\u00E8me : soit s\u2019anesth\u00E9sier par la technologie, soit s\u2019en priver et affronter le vide. Il propose un troisi\u00E8me chemin : la technologie utilis\u00E9e autrement, au service du lien, du sens et du vivant."));
children.push(para("Le vide n\u2019est pas un ennemi. C\u2019est la condition n\u00E9cessaire pour que se manifeste l\u2019esprit critique et la cr\u00E9ativit\u00E9. En d\u00E9l\u00E9guant au syst\u00E8me le r\u00F4le de remplir ce vide, on lui d\u00E9l\u00E8gue aussi notre humanit\u00E9, notre libert\u00E9 de choix. Le jeu vise \u00E0 redonner confiance \u00E0 la g\u00E9n\u00E9ration Z en ses capacit\u00E9s de cr\u00E9ation, sa facult\u00E9 de choix et sa capacit\u00E9 \u00E0 utiliser la technologie de mani\u00E8re b\u00E9n\u00E9fique, responsable et \u00E9cologiquement soutenable."));

// ============================================================
// SECTION 16 — État des lieux Gen Z, écrans et IA
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("16. \u00C9tat des lieux \u2014 Gen Z, \u00E9crans et IA : donn\u00E9es probantes"));

children.push(para("Cette section compile les donn\u00E9es les plus fiables disponibles en mars 2026 sur les comportements num\u00E9riques de la g\u00E9n\u00E9ration Z et les effets document\u00E9s de ces comportements. Les sources sont s\u00E9lectionn\u00E9es selon trois crit\u00E8res : fiabilit\u00E9 de l\u2019institution, taille de l\u2019\u00E9chantillon, ind\u00E9pendance vis-\u00E0-vis de l\u2019industrie tech."));

// 16.1 Comportements en ligne
children.push(heading2("16.1 Comportements en ligne de la Gen Z"));

children.push(heading3("Pew Research Center \u2014 Teens, Social Media and Technology (2024-2025)"));
children.push(para("Le Pew Research Center est un think tank non-partisan, financ\u00E9 par les Pew Charitable Trusts, sans financement tech. M\u00E9thodologie transparente et r\u00E9pliqu\u00E9e annuellement."));
children.push(richBullet([{ text: "\u00C9chantillon : ", bold: true }, { text: "1 391 adolescents US (13-17 ans), enqu\u00EAte sept-oct 2024" }]));
children.push(richBullet([{ text: "95% ", bold: true }, { text: "des ados ont acc\u00E8s \u00E0 un smartphone" }]));
children.push(richBullet([{ text: "90% ", bold: true }, { text: "utilisent YouTube ; ~60% TikTok et Instagram ; 55% Snapchat" }]));
children.push(richBullet([{ text: "50% des 15-17 ans ", bold: true }, { text: "se d\u00E9crivent comme \u00E9tant en ligne \u00AB presque constamment \u00BB" }]));
children.push(richBullet([{ text: "45% ", bold: true }, { text: "disent passer TROP de temps sur les r\u00E9seaux (\u2191 vs 36% en 2022)" }]));
children.push(richBullet([{ text: "44% ", bold: true }, { text: "ont essay\u00E9 de r\u00E9duire leur usage (mais continuent)" }]));

children.push(spacer(60));
children.push(heading3("Common Sense Media \u2014 Census on Media Use"));
children.push(para("ONG ind\u00E9pendante d\u00E9di\u00E9e \u00E0 la s\u00E9curit\u00E9 des enfants. Pas de financement Big Tech. M\u00E9thodologie r\u00E9vis\u00E9e par des pairs."));
children.push(richBullet([{ text: "Tweens (8-12 ans) : ", bold: true }, { text: "5h33 de m\u00E9dias par jour hors \u00E9cole" }]));
children.push(richBullet([{ text: "Teens (13-18 ans) : ", bold: true }, { text: "8h39 de m\u00E9dias par jour hors \u00E9cole \u2014 plus qu\u2019une journ\u00E9e de travail" }]));
children.push(richBullet([{ text: "Enfants 0-8 ans (2025) : ", bold: true }, { text: "2h27 quotidiennes ; l\u2019enfance num\u00E9rique commence d\u00E8s 2 ans ; le gaming a augment\u00E9 de 65% depuis 2020" }]));

children.push(spacer(60));
children.push(heading3("U.S. Surgeon General \u2014 Advisory (2023)"));
children.push(para("Le Surgeon General est la plus haute autorit\u00E9 m\u00E9dicale des \u00C9tats-Unis. Cet avis \u00E9quivaut \u00E0 un rapport de l\u2019OMS au niveau national."));
children.push(richBullet([{ text: "~40% des 8-12 ans ", bold: true }, { text: "utilisent les r\u00E9seaux sociaux malgr\u00E9 l\u2019\u00E2ge minimum de 13 ans" }]));
children.push(quote("\u00AB We cannot conclude social media is sufficiently safe for children and adolescents. \u00BB \u2014 U.S. Surgeon General"));
children.push(para("Le Surgeon General a ensuite propos\u00E9 des \u00E9tiquettes d\u2019avertissement sur les r\u00E9seaux sociaux, comme pour les paquets de cigarettes."));

children.push(spacer(60));
children.push(heading3("ABCD Study \u2014 NIH (longitudinal, 11 875 adolescents)"));
children.push(para("Plus grande \u00E9tude longitudinale au monde sur le d\u00E9veloppement c\u00E9r\u00E9bral des adolescents. Financ\u00E9e par le NIH."));
children.push(richBullet([{ text: "Publication 2024 (BMC Public Health) : ", bold: true }, { text: "9 538 ados, 2 ans de suivi. Plus le temps d\u2019\u00E9cran est \u00E9lev\u00E9, plus les sympt\u00F4mes de d\u00E9pression, troubles de la conduite, TDAH sont importants." }]));
children.push(richBullet([{ text: "Publication 2025 (Nature) : ", bold: true }, { text: "10 116 enfants. Le temps d\u2019\u00E9cran modifie la structure du cerveau, qui \u00E0 son tour augmente les sympt\u00F4mes TDAH. \u00C9tude de m\u00E9diation montrant le M\u00C9CANISME, pas juste la corr\u00E9lation." }]));

// 16.2 Gen Z et IA
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("16.2 Gen Z et IA \u2014 Usage, paradoxes et cons\u00E9quences"));

children.push(heading3("Gallup / Walton Family Foundation / Girls Who Code (2025)"));
children.push(para("Gallup : institut de sondage centenaire. Financement : Walton Family Foundation (philanthropie). \u00C9chantillon : 3 465 Gen Z (13-28 ans), panel repr\u00E9sentatif."));

children.push(richBullet([{ text: "80% ", bold: true }, { text: "utilisent l\u2019IA au quotidien ; 47% utilisent l\u2019IA g\u00E9n\u00E9rative chaque semaine" }]));
children.push(richBullet([{ text: "65% ", bold: true }, { text: "utilisent l\u2019IA comme remplacement de Google" }]));
children.push(richBullet([{ text: "23% ", bold: true }, { text: "utilisent un chatbot \u00AB comme ami \u00BB ; 10% comme \u00AB petit(e) ami(e) \u00BB" }]));
children.push(richBullet([{ text: "16% ", bold: true }, { text: "l\u2019utilisent m\u00EAme quand c\u2019est explicitement interdit" }]));

children.push(spacer(60));
children.push(para("Ce qui les inqui\u00E8te (la Gen Z elle-m\u00EAme) :", { bold: true }));
children.push(richBullet([{ text: "79% ", bold: true }, { text: "pensent que l\u2019IA rend les gens plus paresseux" }]));
children.push(richBullet([{ text: "65% ", bold: true }, { text: "s\u2019inqui\u00E8tent de la r\u00E9duction de la pens\u00E9e critique" }]));
children.push(richBullet([{ text: "49% ", bold: true }, { text: "pensent que l\u2019IA nuira \u00E0 leur capacit\u00E9 de r\u00E9flexion critique" }]));
children.push(richBullet([{ text: "40% ", bold: true }, { text: "se sentent anxieux face \u00E0 la technologie" }]));

children.push(spacer(60));
children.push(greenQuote("Le paradoxe Gen Z : ils sont simultan\u00E9ment la g\u00E9n\u00E9ration qui utilise le PLUS l\u2019IA et celle qui s\u2019inqui\u00E8te le PLUS de ses effets. Ils continuent parce que le syst\u00E8me rend le co\u00FBt de r\u00E9sister sup\u00E9rieur au co\u00FBt de se soumettre. C\u2019est la servitude volontaire de La Bo\u00E9tie en version 2026."));

children.push(spacer(60));
children.push(heading3("Pew Research \u2014 Teens & AI Chatbots (d\u00E9cembre 2025)"));
children.push(para("\u00C9chantillon : 1 458 ados US (13-17 ans), sept-oct 2025."));
children.push(richBullet([{ text: "64% ", bold: true }, { text: "utilisent des chatbots IA ; ~30% quotidiennement" }]));
children.push(richBullet([{ text: "59% ", bold: true }, { text: "utilisent ChatGPT (2x plus que Gemini \u00E0 23%)" }]));
children.push(richBullet([{ text: "54% ", bold: true }, { text: "utilisent les chatbots pour les devoirs scolaires" }]));
children.push(richBullet([{ text: "12% ", bold: true }, { text: "pour du soutien \u00E9motionnel" }]));
children.push(richBullet([{ text: "\u00C9cart parents-ados : ", bold: true }, { text: "64% des ados disent utiliser l\u2019IA, seulement 51% des parents le savent" }]));

children.push(spacer(60));
children.push(heading3("\u00C9ducation \u2014 Statistiques consolid\u00E9es (2024-2026)"));
children.push(richBullet([{ text: "Usage de l\u2019IA par les \u00E9tudiants : ", bold: true }, { text: "66% en 2024 \u2192 92% en 2025 (+26 points en 1 an)" }]));
children.push(richBullet([{ text: "88% ", bold: true }, { text: "utilisent l\u2019IA g\u00E9n\u00E9rative pour les \u00E9valuations en 2025 (vs 53% en 2024)" }]));
children.push(richBullet([{ text: "Le % d\u2019ados utilisant ChatGPT pour les devoirs a DOUBL\u00C9 ", bold: true }, { text: "entre 2023 et 2024 (Pew Research)" }]));

// 16.3 Effets cognitifs de l'IA
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("16.3 Effets cognitifs de l\u2019IA \u2014 \u00C9tudes scientifiques"));

children.push(heading3("MIT Media Lab \u2014 \u00AB Your Brain on ChatGPT \u00BB (juin 2025)"));
children.push(para("Preprint (pas encore peer-reviewed). 54 participants, 3 groupes (LLM / moteur de recherche / cerveau seul), mesure par EEG. 18 participants suivis sur 4 mois."));
children.push(richBullet([{ text: "Connectivit\u00E9 neuronale : ", bold: true }, { text: "groupe cerveau seul = r\u00E9seaux les plus forts. Groupe LLM = connectivit\u00E9 la plus faible." }]));
children.push(richBullet([{ text: "M\u00E9moire : ", bold: true }, { text: "les utilisateurs LLM ne pouvaient pas citer correctement leur propre travail." }]));
children.push(richBullet([{ text: "Performance \u00E0 long terme : ", bold: true }, { text: "sur 4 mois, les utilisateurs LLM sous-performent syst\u00E9matiquement aux niveaux neural, linguistique et comportemental." }]));
children.push(quote("\u00AB Cognitive debt \u00BB : l\u2019IA \u00E9pargne l\u2019effort mental \u00E0 court terme mais g\u00E9n\u00E8re des co\u00FBts \u00E0 long terme \u2014 diminution de la pens\u00E9e critique, r\u00E9duction de la cr\u00E9ativit\u00E9, vuln\u00E9rabilit\u00E9 accrue aux biais. \u2014 MIT Media Lab"));

children.push(spacer(60));
children.push(heading3("Harvard \u2014 PS2 PAL : l\u2019IA-tuteur qui fonctionne (juin 2025, peer-reviewed)"));
children.push(para("Publi\u00E9 dans Scientific Reports (Nature). Essai contr\u00F4l\u00E9 randomis\u00E9. 194 \u00E9tudiants de physique \u00E0 Harvard."));
children.push(richBullet([{ text: "R\u00E9sultat : ", bold: true }, { text: "les \u00E9tudiants apprennent PLUS DU DOUBLE en MOINS de temps avec l\u2019IA-tuteur vs cours actif traditionnel." }]));
children.push(richBullet([{ text: "Condition essentielle : ", bold: true }, { text: "l\u2019IA REFUSE de donner les r\u00E9ponses. Elle guide \u00E0 travers le raisonnement, d\u00E9compose les probl\u00E8mes, g\u00E8re la charge cognitive, promeut le growth mindset." }]));
children.push(greenQuote("C\u2019est la preuve que la technologie n\u2019est pas intrins\u00E8quement le probl\u00E8me. L\u2019IA sans cadre p\u00E9dagogique = b\u00E9quille \u2192 lobotomie. L\u2019IA AVEC cadre p\u00E9dagogique = tuteur \u2192 croissance. Nova\u00EFa (le syst\u00E8me) choisit d\u00E9lib\u00E9r\u00E9ment la b\u00E9quille."));

children.push(spacer(60));
children.push(heading3("Le \u00AB Google Effect \u00BB et l\u2019amn\u00E9sie num\u00E9rique (Science, 2011)"));
children.push(para("Sparrow, Liu & Wegner \u2014 publi\u00E9 dans Science (Harvard/Columbia). 4 exp\u00E9riences. Quand les gens savent qu\u2019ils pourront retrouver l\u2019information en ligne, ils ne l\u2019encodent pas en m\u00E9moire. Le cerveau stocke O\u00D9 trouver l\u2019information, pas l\u2019information elle-m\u00EAme."));
children.push(para("Amplification par l\u2019IA : avec les chatbots, l\u2019utilisateur ne cherche m\u00EAme plus \u2014 il re\u00E7oit la r\u00E9ponse. L\u2019\u00E9tape de recherche elle-m\u00EAme est supprim\u00E9e, ce qui amplifie l\u2019atrophie hippocampique."));

// 16.4 IA invisible
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("16.4 L\u2019IA invisible \u2014 Algorithmes, bulles de filtre, design persuasif"));

children.push(heading3("Revue syst\u00E9matique : Filter Bubbles et Youth (MDPI, 2025)"));
children.push(para("30 \u00E9tudes sur une d\u00E9cennie (2015-2025). Les enfants sont particuli\u00E8rement vuln\u00E9rables aux effets de bulle de filtre en raison de leur faible litt\u00E9ratie IA et de leur pens\u00E9e critique en d\u00E9veloppement."));

children.push(spacer(60));
children.push(heading3("Normalisation de la toxicit\u00E9 (Frontiers in Psychology, 2025)"));
children.push(para("Peer-reviewed. Les algorithmes de recommandation exposent les jeunes \u00E0 du mat\u00E9riel nocif pr\u00E9sent\u00E9 comme du divertissement. Apr\u00E8s seulement 5 jours d\u2019usage de TikTok : multiplication par 4 du contenu misogyne pr\u00E9sent\u00E9."));

children.push(spacer(60));
children.push(heading3("Design persuasif et dark patterns"));
children.push(richBullet([{ text: "Variable reward systems ", bold: true }, { text: "(r\u00E9compenses variables) : fonctionnent comme des machines \u00E0 sous \u2014 boucle dopaminergique sur les likes, commentaires, partages" }]));
children.push(richBullet([{ text: "72% des ados ", bold: true }, { text: "reconnaissent qu\u2019ils sont manipul\u00E9s pour passer plus de temps sur leurs appareils" }]));
children.push(richBullet([{ text: "Estimation : ", bold: true }, { text: "les utilisateurs r\u00E9duiraient leur temps d\u2019\u00E9cran de 37% si on \u00E9liminait tous les designs persuasifs" }]));
children.push(richBullet([{ text: "Les plateformes IA adaptent dynamiquement ", bold: true }, { text: "leur architecture en temps r\u00E9el, identifiant les vuln\u00E9rabilit\u00E9s individuelles et optimisant l\u2019exploitation" }]));

children.push(spacer(60));
children.push(heading3("Le cynisme algorithmique (Harvard Kennedy School, 2025)"));
children.push(para("Peer-reviewed. Les jeunes adultes qui comprennent le mieux les algorithmes sont les plus inquiets MAIS les moins susceptibles d\u2019agir. La conscience du pi\u00E8ge ne suffit pas \u00E0 en sortir \u2014 il faut une action collective et syst\u00E9mique."));
children.push(greenQuote("Dans R\u00E9sistance, Raya ne peut pas juste \u00AB arr\u00EAter de scroller \u00BB. Il faut d\u00E9manteler Nova\u00EFa. La conscience individuelle est n\u00E9cessaire mais insuffisante \u2014 c\u2019est l\u2019action collective qui lib\u00E8re."));

// 16.5 Études internes enterrées
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("16.5 Les \u00E9tudes internes enterr\u00E9es \u2014 La preuve causale"));

children.push(para("Les \u00E9tudes acad\u00E9miques mesurent l\u2019usage via l\u2019auto-d\u00E9claration. Les plateformes poss\u00E8dent les donn\u00E9es comportementales r\u00E9elles en temps r\u00E9el sur des milliards d\u2019utilisateurs. Quand elles m\u00E8nent leurs propres \u00E9tudes avec ces donn\u00E9es et trouvent des r\u00E9sultats accablants, elles les enterrent."));

children.push(spacer(60));
children.push(heading3("Meta \u2014 Project Mercury (2019-2020)"));
children.push(para("Partenariat avec Nielsen (mesure d\u2019audience ind\u00E9pendante). Utilisateurs cessent Facebook pendant une semaine. R\u00E9sultats : niveaux plus bas de d\u00E9pression, d\u2019anxi\u00E9t\u00E9, de solitude et de comparaison sociale."));
children.push(quote("\u00AB The Nielsen study does show causal impact on social comparison. \u00BB \u2014 Chercheur interne Meta"));
children.push(para("Meta a arr\u00EAt\u00E9 l\u2019\u00E9tude, ne l\u2019a jamais publi\u00E9e, et a menti au S\u00E9nat am\u00E9ricain en niant poss\u00E9der ces donn\u00E9es."));
children.push(quote("\u00AB If the results are bad and we don\u2019t publish and they leak, is it going to look like tobacco companies? \u00BB \u2014 Employ\u00E9 Meta (alerte interne ignor\u00E9e)"));

children.push(spacer(60));
children.push(heading3("Meta \u2014 Frances Haugen / Facebook Files (2021)"));
children.push(richBullet([{ text: "13,5% des adolescentes ", bold: true }, { text: "disent qu\u2019Instagram aggrave leurs id\u00E9es suicidaires (recherche interne)" }]));
children.push(richBullet([{ text: "17% des adolescentes ", bold: true }, { text: "disent qu\u2019Instagram contribue \u00E0 leurs troubles alimentaires" }]));
children.push(richBullet([{ text: "32% des adolescentes ", bold: true }, { text: "disent que quand elles se sentent mal dans leur corps, Instagram empire les choses" }]));

children.push(spacer(60));
children.push(heading3("TikTok \u2014 Documents accidentellement d\u00E9scell\u00E9s (octobre 2024)"));
children.push(para("Proc\u00E8s du procureur g\u00E9n\u00E9ral du Kentucky. Caviardages d\u00E9fectueux \u2014 un copier-coller a r\u00E9v\u00E9l\u00E9 30 pages de secrets internes."));
children.push(richBullet([{ text: "Seuil d\u2019addiction : 260 vid\u00E9os (~35 minutes) ", bold: true }, { text: "\u2014 mesure interne bas\u00E9e sur les donn\u00E9es comportementales r\u00E9elles de milliards d\u2019utilisateurs" }]));
children.push(richBullet([{ text: "Effets cognitifs document\u00E9s en interne : ", bold: true }, { text: "\u00AB loss of analytical skills, memory formation, contextual thinking, conversational depth, empathy \u00BB" }]));
children.push(richBullet([{ text: "Limite quotidienne (60 min) = th\u00E9\u00E2tre : ", bold: true }, { text: "ne r\u00E9duit l\u2019usage que de 1,5 minute (de 108,5 \u00E0 107 min/jour)" }]));
children.push(richBullet([{ text: "Mod\u00E9ration du contenu : ", bold: true }, { text: "100% de \u00AB f\u00E9tichisation de mineurs \u00BB non supprim\u00E9, 50% de glorification d\u2019agression sexuelle non supprim\u00E9" }]));

children.push(spacer(60));
children.push(heading3("Le proc\u00E8s en cours (mars 2026)"));
children.push(richBullet([{ text: "42 \u00C9tats am\u00E9ricains ", bold: true }, { text: "poursuivent Meta, TikTok, YouTube, Snapchat" }]));
children.push(richBullet([{ text: "Zuckerberg interrog\u00E9 sous serment ", bold: true }, { text: "le 18 f\u00E9vrier 2026 \u00E0 Los Angeles" }]));
children.push(richBullet([{ text: "SMS de Zuckerberg (2021) : ", bold: true }, { text: "\u00AB I wouldn\u2019t say child safety is my top concern when I have a number of other areas I\u2019m more focused on like building the metaverse. \u00BB" }]));
children.push(richBullet([{ text: "Le jury est en d\u00E9lib\u00E9ration ", bold: true }, { text: "au moment de la r\u00E9daction de ce document (mars 2026)" }]));

// 16.6 Synthèse
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("16.6 Synth\u00E8se \u2014 Le triangle de la preuve"));

children.push(para("Les \u00E9tudes acad\u00E9miques ind\u00E9pendantes (Pew, ABCD, MIT) montrent une CORR\u00C9LATION robuste. Les \u00E9tudes internes des Big Tech (Project Mercury, TikTok leaks) montrent la CAUSALIT\u00C9. Le fait que ces entreprises aient enterr\u00E9 leurs propres recherches prouve non seulement le lien causal, mais l\u2019INTENTION de le dissimuler."));

children.push(spacer(60));
children.push(makeTable(
  ["Donn\u00E9e document\u00E9e", "\u00C9quivalent dans R\u00E9sistance"],
  [
    ["Smartphone = rectangle \u00E0 coins arrondis, cam\u00E9ra, micro, \u00E9crans", "Cocoon = cellule rectangulaire avec \u00E9crans biom\u00E9triques"],
    ["Algorithmes de recommandation / boucle dopaminergique", "Bain anesth\u00E9sique / scroll infini dans le Cocoon"],
    ["Design persuasif / captologie (Fogg, Stanford)", "M\u00E9canismes de contr\u00F4le de Nova\u00EFa"],
    ["Donn\u00E9es internes enterr\u00E9es (Project Mercury, TikTok)", "Ce que les \u00C9lites des Arcanias cachent"],
    ["260 vid\u00E9os = seuil d\u2019addiction (TikTok interne)", "Seuil apr\u00E8s lequel les enfants diminu\u00E9s ne peuvent plus r\u00E9sister"],
    ["Paradoxe Gen Z : savoir + continuer = servitude volontaire", "Le cycle que Raya doit briser"],
    ["PS2 PAL : IA-tuteur qui fonctionne AVEC cadre p\u00E9dagogique", "La troisi\u00E8me voie : technologie au service de l\u2019humain"],
    ["Cynisme algorithmique (Harvard) : savoir ne suffit pas", "L\u2019action collective, pas juste la conscience individuelle"]
  ],
  [4500, 4500]
));

children.push(spacer(100));
children.push(para("Le constat en 5 chiffres :", { bold: true }));
children.push(richBullet([{ text: "8h39/jour ", bold: true }, { text: "\u2014 temps d\u2019\u00E9cran moyen des ados hors \u00E9cole (Common Sense Media)" }]));
children.push(richBullet([{ text: "260 vid\u00E9os / 35 minutes ", bold: true }, { text: "\u2014 seuil d\u2019addiction TikTok (donn\u00E9es internes)" }]));
children.push(richBullet([{ text: "82% ", bold: true }, { text: "\u2014 Gen Z utilisant des chatbots IA (Yahoo/YouGov 2025)" }]));
children.push(richBullet([{ text: "79% ", bold: true }, { text: "\u2014 Gen Z pensant que l\u2019IA rend paresseux, mais continuant (Gallup 2025)" }]));
children.push(richBullet([{ text: "0 ", bold: true }, { text: "\u2014 nombre d\u2019\u00E9tudes internes Big Tech publi\u00E9es volontairement quand les r\u00E9sultats sont n\u00E9gatifs" }]));

children.push(spacer(100));
children.push(greenQuote("L\u2019argument pour le TFE : les \u00E9tudes acad\u00E9miques montrent la corr\u00E9lation. Les \u00E9tudes internes montrent la causalit\u00E9. Le fait de les enterrer prouve l\u2019intention. C\u2019est pour cela que 42 \u00C9tats poursuivent, que Zuckerberg t\u00E9moigne sous serment, et qu\u2019un jury d\u00E9lib\u00E8re en ce moment m\u00EAme. Les Arcanias de R\u00E9sistance ne sont pas une fiction parano\u00EFaque \u2014 ce sont les structures de pouvoir document\u00E9es par la justice am\u00E9ricaine."));

// ============================================================
// SECTION 17 — Sensibiliser la Gen Z : fondements scientifiques
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("17. Sensibiliser la Gen Z \u2014 Fondements scientifiques de l\u2019approche ludique"));

children.push(para("Cette section justifie le choix du serious game comme vecteur de sensibilisation en s\u2019appuyant sur les cadres th\u00E9oriques les plus robustes en psychologie de la persuasion, de la motivation et du changement comportemental."));

// 17.1 Pourquoi les approches classiques échouent
children.push(heading2("17.1 Pourquoi les approches classiques \u00E9chouent"));

children.push(heading3("La r\u00E9actance psychologique (Brehm, 1966)"));
children.push(para("Quand un message menace la libert\u00E9 per\u00E7ue d\u2019un individu, il provoque une r\u00E9action de rejet \u2014 l\u2019effet boomerang. Plus le message est directif (\u00AB arr\u00EAte de scroller \u00BB, \u00AB les \u00E9crans c\u2019est mal \u00BB), plus l\u2019adolescent fait l\u2019inverse."));
children.push(richBullet([{ text: "M\u00E9ta-analyse 2025 (Human Communication Research) : ", bold: true }, { text: "le langage \u00E0 haute menace de libert\u00E9 augmente la col\u00E8re, les cognitions n\u00E9gatives et la r\u00E9actance. L\u2019effet est PIRE dans les formats texte uniquement." }]));
children.push(richBullet([{ text: "Cons\u00E9quence : ", bold: true }, { text: "un jeu qui dirait \u00AB les \u00E9crans c\u2019est mal \u00BB provoquerait l\u2019exact inverse de l\u2019effet recherch\u00E9." }]));

children.push(spacer(60));
children.push(heading3("Le cynisme algorithmique (Harvard Kennedy School, 2025)"));
children.push(para("Les jeunes adultes qui comprennent le MIEUX les algorithmes sont les plus inquiets MAIS les moins susceptibles d\u2019agir. La conscience du pi\u00E8ge ne suffit pas \u00E0 en sortir. L\u2019information seule ne change pas le comportement \u2014 il faut une exp\u00E9rience qui transforme la compr\u00E9hension en motivation d\u2019action."));

children.push(spacer(60));
children.push(heading3("Le paradoxe Gen Z (Gallup, 2025)"));
children.push(richBullet([{ text: "79% ", bold: true }, { text: "pensent que l\u2019IA rend les gens plus paresseux, mais 74% l\u2019utilisent quand m\u00EAme" }]));
children.push(richBullet([{ text: "16% ", bold: true }, { text: "l\u2019utilisent m\u00EAme quand c\u2019est explicitement interdit" }]));
children.push(para("Savoir ne suffit pas. Le syst\u00E8me rend le co\u00FBt de r\u00E9sister sup\u00E9rieur au co\u00FBt de se soumettre."));

// 17.2 Les 5 leviers qui fonctionnent
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("17.2 Les cinq leviers scientifiquement document\u00E9s"));

children.push(heading3("Levier 1 \u2014 La transportation narrative (Green & Brock, 2000)"));
children.push(para("Le sentiment d\u2019\u00EAtre \u00AB perdu dans le monde d\u2019un r\u00E9cit \u00BB, d\u2019\u00EAtre compl\u00E8tement immerg\u00E9 dans une histoire. M\u00E9ta-analyses sur 20+ ans : les individus les plus transport\u00E9s adoptent plus facilement des croyances, attitudes et comportements coh\u00E9rents avec l\u2019histoire."));
children.push(richBullet([{ text: "Effets imm\u00E9diats ET \u00E0 long terme ", bold: true }, { text: "(Green & Appel, Advances in Experimental Social Psychology, 2024)" }]));
children.push(richBullet([{ text: "Contourne les d\u00E9fenses : ", bold: true }, { text: "le r\u00E9cepteur n\u2019est pas en mode \u00AB on essaie de me convaincre \u00BB mais en mode \u00AB je vis une histoire \u00BB" }]));
children.push(richBullet([{ text: "Deux m\u00E9canismes compl\u00E9mentaires : ", bold: true }, { text: "transportation (immersion dans le r\u00E9cit global \u2192 changement d\u2019attitude envers le syst\u00E8me) + identification (connexion au personnage \u2192 adoption des valeurs de Raya)" }]));

children.push(spacer(60));
children.push(heading3("Levier 2 \u2014 La th\u00E9orie de l\u2019inoculation (McGuire, 1961 ; Cambridge, 2020-2025)"));
children.push(para("Exposer quelqu\u2019un \u00E0 une version att\u00E9nu\u00E9e d\u2019une technique de manipulation le rend r\u00E9sistant aux vraies manipulations \u2014 comme un vaccin."));

children.push(spacer(40));
children.push(para("Preuve la plus solide \u2014 le jeu Go Viral! (Cambridge / Cabinet Office UK) :", { bold: true }));
children.push(richBullet([{ text: "5-7 minutes de jeu ", bold: true }, { text: "o\u00F9 le joueur DEVIENT un producteur de fake news" }]));
children.push(richBullet([{ text: "74% des joueurs ", bold: true }, { text: "deviennent meilleurs pour d\u00E9tecter la manipulation (vs contr\u00F4le)" }]));
children.push(richBullet([{ text: "Effets durables : ", bold: true }, { text: "au moins 3 mois (limite de l\u2019\u00E9tude)" }]));
children.push(richBullet([{ text: "L\u2019inoculation active (jouer) > passive (lire) ", bold: true }, { text: "\u2014 le format interactif est sup\u00E9rieur" }]));

children.push(spacer(40));
children.push(greenQuote("En explorant le Cocoon de l\u2019int\u00E9rieur, le joueur comprend COMMENT le syst\u00E8me capture l\u2019attention. En voyant les m\u00E9canismes de Nova\u00EFa, il est \u00AB inocul\u00E9 \u00BB contre les techniques r\u00E9elles (algorithmes, design persuasif, boucle dopaminergique)."));

children.push(spacer(60));
children.push(heading3("Levier 3 \u2014 L\u2019autod\u00E9termination (Deci & Ryan, 1985-2025)"));
children.push(para("Trois besoins psychologiques fondamentaux : autonomie (sentir qu\u2019on a le choix), comp\u00E9tence (sentir qu\u2019on peut agir efficacement), relation (sentir qu\u2019on est connect\u00E9 aux autres). Quand ces besoins sont satisfaits \u2192 motivation intrins\u00E8que \u2192 changement durable."));

children.push(makeTable(
  ["Approche inefficace", "Pourquoi \u00E7a \u00E9choue", "Approche de R\u00E9sistance"],
  [
    ["\u00AB Arr\u00EAte de scroller \u00BB", "Menace l\u2019autonomie \u2192 r\u00E9actance", "Le joueur explore librement, fait ses choix"],
    ["\u00AB Tu es manipul\u00E9 \u00BB", "Menace la comp\u00E9tence \u2192 honte/d\u00E9ni", "Le joueur d\u00E9couvre par lui-m\u00EAme les m\u00E9canismes"],
    ["\u00AB Les \u00E9crans c\u2019est mal \u00BB", "Message moralisateur \u2192 rejet", "Le jeu montre une alternative, pas une interdiction"]
  ],
  [2800, 3200, 3000]
));

children.push(spacer(60));
children.push(heading3("Levier 4 \u2014 Les interventions scolaires (m\u00E9ta-analyse 2025, 34 \u00E9tudes)"));
children.push(para("R\u00E9sultats cl\u00E9s de la m\u00E9ta-analyse (PMC, 2025) :"));
children.push(richBullet([{ text: "Usage problématique : ", bold: true }, { text: "d = 1,47 apr\u00E8s intervention ; d = 1,13 au suivi (effet tr\u00E8s large)" }]));
children.push(richBullet([{ text: "Temps d\u2019\u00E9cran brut : ", bold: true }, { text: "d = 0,15 (effet faible)" }]));
children.push(richBullet([{ text: "Avec parents impliqu\u00E9s : ", bold: true }, { text: "d = 2,10 (effet MASSIF)" }]));
children.push(greenQuote("Conclusion : ce n\u2019est pas la quantit\u00E9 de temps d\u2019\u00E9cran qui compte, c\u2019est la QUALIT\u00C9 de l\u2019usage. On ne demande pas aux ados de moins utiliser les \u00E9crans \u2014 on leur apprend \u00E0 les utiliser AUTREMENT. C\u2019est exactement la proposition de R\u00E9sistance."));

children.push(spacer(60));
children.push(heading3("Levier 5 \u2014 Le format natif Gen Z"));
children.push(richBullet([{ text: "90%+ des Gen Z ", bold: true }, { text: "regardent des vid\u00E9os courtes quotidiennement" }]));
children.push(richBullet([{ text: "86% ", bold: true }, { text: "valorisent l\u2019authenticit\u00E9 \u2014 pas de contenu \u00AB corporate \u00BB" }]));
children.push(richBullet([{ text: "Pr\u00E9f\u00E9rence forte ", bold: true }, { text: "pour la co-cr\u00E9ation et la participation active (pas la consommation passive)" }]));
children.push(richBullet([{ text: "Les cr\u00E9ateurs individuels ", bold: true }, { text: "sont per\u00E7us comme plus cr\u00E9atifs et informatifs que les marques ou institutions" }]));
children.push(para("Un serious game 3D interactif avec alternance vid\u00E9o IA / exploration est le format NATIF de cette g\u00E9n\u00E9ration."));

// 17.3 Résistance coche toutes les cases
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("17.3 R\u00E9sistance coche toutes les cases"));

children.push(makeTable(
  ["Levier scientifique", "Application dans R\u00E9sistance"],
  [
    ["Transportation narrative", "Le joueur VIT l\u2019histoire de Raya, ne re\u00E7oit pas un cours"],
    ["Inoculation", "Explorer le Cocoon de l\u2019int\u00E9rieur = comprendre les m\u00E9canismes de capture"],
    ["Autod\u00E9termination \u2014 Autonomie", "Le joueur explore librement, fait ses choix"],
    ["Autod\u00E9termination \u2014 Comp\u00E9tence", "Chaque pi\u00E8ce = une \u00E9preuve r\u00E9ussie = sentiment de ma\u00EEtrise"],
    ["Autod\u00E9termination \u2014 Relation", "Les personnages rencontr\u00E9s, l\u2019alliance avec la R\u00E9sistance"],
    ["\u00C9vitement de la r\u00E9actance", "Aucun message moralisateur \u2014 le joueur d\u00E9couvre par lui-m\u00EAme"],
    ["Format natif Gen Z", "3D interactif, vid\u00E9o IA, sessions de 15-20 min"],
    ["Empowerment", "Raya est un mod\u00E8le d\u2019action, pas une victime"]
  ],
  [4000, 5000]
));

children.push(spacer(100));
children.push(heading3("Ce que R\u00E9sistance NE fait PAS (et c\u2019est voulu)"));
children.push(richBullet([{ text: "Ne dit jamais \u00AB les \u00E9crans c\u2019est mal \u00BB ", bold: true }, { text: "\u2192 \u00E9vite la r\u00E9actance" }]));
children.push(richBullet([{ text: "Ne culpabilise pas le joueur ", bold: true }, { text: "\u2192 \u00E9vite la honte qui renforce l\u2019addiction" }]));
children.push(richBullet([{ text: "Ne propose pas d\u2019arr\u00EAter la technologie ", bold: true }, { text: "\u2192 propose de l\u2019utiliser autrement" }]));
children.push(richBullet([{ text: "Ne traite pas le joueur comme une victime ", bold: true }, { text: "\u2192 le traite comme un agent de changement" }]));
children.push(richBullet([{ text: "Ne donne pas de le\u00E7on ", bold: true }, { text: "\u2192 laisse le joueur tirer ses propres conclusions" }]));

children.push(spacer(100));
children.push(heading3("Pr\u00E9c\u00E9dents : jeux qui ont chang\u00E9 des comportements"));
children.push(richBullet([{ text: "Go Viral! (Cambridge, 2020) : ", bold: true }, { text: "5-7 min \u2192 74% meilleure d\u00E9tection de manipulation, effets 3+ mois" }]));
children.push(richBullet([{ text: "Bad News (Cambridge, 2018) : ", bold: true }, { text: "inoculation cross-culturelle contre la d\u00E9sinformation, publi\u00E9 dans Journal of Cognition" }]));
children.push(richBullet([{ text: "That Dragon, Cancer (2016) : ", bold: true }, { text: "jeu narratif \u2192 impact \u00E9motionnel document\u00E9, changement d\u2019attitude envers la maladie" }]));
children.push(richBullet([{ text: "Spent (Urban Ministries) : ", bold: true }, { text: "simulation de pauvret\u00E9 \u2192 augmentation de l\u2019empathie et des dons" }]));
children.push(richBullet([{ text: "Papers, Please (2013) : ", bold: true }, { text: "simulation dystopique \u2192 compr\u00E9hension visc\u00E9rale de l\u2019autoritarisme" }]));

children.push(spacer(100));
children.push(greenQuote("R\u00E9sistance utilise les m\u00EAmes m\u00E9canismes que les plateformes (immersion, identification, boucle de r\u00E9compense) mais les retourne : au lieu de capturer l\u2019attention pour l\u2019exploiter, il la mobilise pour \u00E9veiller la conscience critique. C\u2019est le troisi\u00E8me chemin."));

// ============================================================
// SECTION 18 — Pourquoi un serious game sur ordinateur
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("18. Pourquoi un serious game sur ordinateur \u2014 Justification document\u00E9e"));

children.push(para("Cette section anticipe l\u2019objection l\u00E9gitime : \u00AB la Gen Z est sur mobile, pourquoi d\u00E9velopper sur ordinateur ? \u00BB Elle d\u00E9montre que ce choix est strat\u00E9gique, scientifiquement fond\u00E9 et coh\u00E9rent avec le message du jeu."));

// 18.1 Connaissance du public
children.push(heading2("18.1 Connaissance du public cible \u2014 les donn\u00E9es"));

children.push(para("La Gen Z sur mobile \u2014 ce que les chiffres disent :", { bold: true }));
children.push(richBullet([{ text: "69% des Gen Z ", bold: true }, { text: "jouent sur mobile (SQ Magazine, 2026)" }]));
children.push(richBullet([{ text: "92% ", bold: true }, { text: "s\u2019engagent via des appareils mobiles" }]));
children.push(richBullet([{ text: "86% ", bold: true }, { text: "s\u2019identifient comme \u00AB mobile gamers first \u00BB" }]));
children.push(richBullet([{ text: "90%+ ", bold: true }, { text: "consomment des vid\u00E9os courtes quotidiennement (TikTok, Reels, Shorts)" }]));
children.push(richBullet([{ text: "Le mobile repr\u00E9sente ", bold: true }, { text: "57% des revenus de microtransactions du jeu vid\u00E9o" }]));

children.push(spacer(60));
children.push(para("La Gen Z sur PC/console \u2014 ce que les m\u00EAmes chiffres disent aussi :", { bold: true }));
children.push(richBullet([{ text: "42% des Gen Z ", bold: true }, { text: "jouent sur PC, 38% sur console (SQ Magazine, 2026)" }]));
children.push(richBullet([{ text: "70% ", bold: true }, { text: "passent r\u00E9guli\u00E8rement d\u2019un appareil \u00E0 l\u2019autre (cross-platform)" }]));
children.push(richBullet([{ text: "Sessions PC/console : 2-4 heures ", bold: true }, { text: "vs sessions mobiles courtes (< 30 min)" }]));
children.push(richBullet([{ text: "15,2 heures/semaine de jeu ", bold: true }, { text: "pour les 13-17 ans, principalement sur PC/console pour les jeux immersifs" }]));
children.push(richBullet([{ text: "Roblox : 10,25 milliards d\u2019heures/mois ", bold: true }, { text: "en 2025 \u2014 principalement sur PC pour les sessions longues (PC Gamer, 2025)" }]));

children.push(spacer(60));
children.push(greenQuote("La Gen Z a une double pratique : mobile pour le casual et le scroll, PC/console pour l\u2019immersif et le narratif. R\u00E9sistance est un jeu immersif et narratif \u2014 il se positionne dans la cat\u00E9gorie PC, pas dans la cat\u00E9gorie casual mobile."));

// 18.2 Pourquoi PAS le mobile
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("18.2 Pourquoi PAS le mobile \u2014 5 arguments scientifiques"));

children.push(heading3("Argument 1 \u2014 Deep attention vs hyper-attention (Hayles, 2007)"));
children.push(para("Katherine Hayles (Profession, 2007) distingue deux modes cognitifs : la deep attention (concentration soutenue sur un seul objet, permettant l\u2019analyse complexe) et l\u2019hyper-attention (basculement rapide entre stimuli multiples, seuil d\u2019ennui bas). Le smartphone est la machine \u00E0 hyper-attention par excellence."));
children.push(greenQuote("Un serious game dont l\u2019objectif est de restaurer la capacit\u00E9 de deep attention ne peut pas utiliser le medium qui la d\u00E9truit. C\u2019est une question de coh\u00E9rence."));

children.push(spacer(60));
children.push(heading3("Argument 2 \u2014 Le smartphone = environnement d\u2019interruption"));
children.push(richBullet([{ text: "L\u2019absence du smartphone augmente le flow ", bold: true }, { text: "et r\u00E9duit la distraction per\u00E7ue ; seul le flow am\u00E9liore la performance d\u2019apprentissage (Tandfonline, 2025)" }]));
children.push(richBullet([{ text: "77% des adolescents ", bold: true }, { text: "sont plus distraits quand leur usage est fragment\u00E9 par les notifications (Siebers et al., 2024)" }]));
children.push(richBullet([{ text: "Les distractions en lecture num\u00E9rique ", bold: true }, { text: "alt\u00E8rent significativement la compr\u00E9hension (m\u00E9ta-analyse Frontiers in Psychology, 2025)" }]));
children.push(para("Sur smartphone, le joueur re\u00E7oit des notifications WhatsApp, TikTok, Instagram PENDANT qu\u2019il joue. Sur ordinateur, le jeu occupe l\u2019\u00E9cran entier. Le flow n\u2019est pas interrompu."));

children.push(spacer(60));
children.push(heading3("Argument 3 \u2014 Scroll passif vs engagement intentionnel"));
children.push(para("M\u00E9ta-analyse de 141 \u00E9tudes (JCMC, 2024) : l\u2019usage passif (scroll sans but) est associ\u00E9 \u00E0 de moins bons r\u00E9sultats \u00E9motionnels. L\u2019usage actif et intentionnel favorise le bien-\u00EAtre et le sentiment de connexion."));
children.push(para("S\u2019asseoir devant un ordinateur pour jouer \u00E0 R\u00E9sistance est un acte d\u00E9lib\u00E9r\u00E9. C\u2019est le contraire du scroll passif sur le canap\u00E9. Ouvrir un navigateur, lancer un jeu 3D = engagement intentionnel."));

children.push(spacer(60));
children.push(heading3("Argument 4 \u2014 Taille d\u2019\u00E9cran et perception"));
children.push(richBullet([{ text: "Classement par compr\u00E9hension : ", bold: true }, { text: "papier > tablette > liseuse > ordinateur > smartphone (m\u00E9ta-analyse)" }]));
children.push(richBullet([{ text: "Les \u00E9crans d\u2019ordinateur ", bold: true }, { text: "sont per\u00E7us comme plus acceptables pour le contenu \u00E9ducatif que les smartphones (UT Austin)" }]));
children.push(para("Un jeu 3D avec des environnements d\u00E9taill\u00E9s, du texte narratif et des interactions complexes est structurellement inadapt\u00E9 \u00E0 un \u00E9cran de 6 pouces."));

children.push(spacer(60));
children.push(heading3("Argument 5 \u2014 Contrainte technique : Three.js et 3D immersive"));
children.push(richBullet([{ text: "Three.js fonctionne sur mobile MAIS ", bold: true }, { text: "avec des compromis massifs : polygones r\u00E9duits, textures basse r\u00E9solution, pas d\u2019ombres temps r\u00E9el" }]));
children.push(richBullet([{ text: "Le physics engine (Cannon.js) ", bold: true }, { text: "consomme des ressources CPU que les smartphones bas de gamme n\u2019ont pas" }]));
children.push(richBullet([{ text: "L\u2019exp\u00E9rience immersive ", bold: true }, { text: "(Cocoon, Nexus, environnements dystopiques) n\u00E9cessite un rendu graphique que le mobile ne peut pas fournir" }]));

// 18.3 La cohérence medium/message
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("18.3 La coh\u00E9rence medium/message \u2014 l\u2019argument central"));

children.push(para("R\u00E9sistance critique :", { bold: true }));

children.push(makeTable(
  ["Ce que le jeu critique", "Ce que le mobile fait", "Ce que le desktop fait"],
  [
    ["Le scroll passif", "Invite au scroll", "Impose un engagement d\u00E9lib\u00E9r\u00E9"],
    ["L\u2019hyper-attention", "La g\u00E9n\u00E8re (notifications, multit\u00E2che)", "Cr\u00E9e les conditions de la deep attention"],
    ["Le design persuasif", "Int\u00E8gre notifications et r\u00E9compenses variables", "S\u2019en affranchit (plein \u00E9cran, pas de notif)"],
    ["La capture attentionnelle", "L\u2019amplifie (apps en arri\u00E8re-plan)", "La lib\u00E8re (une fen\u00EAtre, un focus)"],
    ["La servitude volontaire", "Le joueur reste dans le syst\u00E8me", "Le joueur SORT du syst\u00E8me pour jouer"]
  ],
  [2500, 3300, 3200]
));

children.push(spacer(100));
children.push(greenQuote("Jouer \u00E0 R\u00E9sistance sur un smartphone serait une contradiction performative. Ce serait comme distribuer un tract anti-publicit\u00E9 dans une publicit\u00E9. Le geste de s\u2019asseoir devant un ordinateur pour jouer est d\u00E9j\u00E0 le premier acte de r\u00E9sistance."));

// 18.4 Le contexte pédagogique
children.push(spacer(60));
children.push(heading2("18.4 Le contexte p\u00E9dagogique"));

children.push(para("R\u00E9sistance est con\u00E7u pour \u00EAtre utilis\u00E9 dans un contexte \u00E9ducatif (ateliers, \u00E9coles, m\u00E9diath\u00E8ques) o\u00F9 :"));
children.push(richBullet([{ text: "Les ordinateurs sont disponibles ", bold: true }, { text: "(salles informatiques, CDI, m\u00E9diath\u00E8ques)" }]));
children.push(richBullet([{ text: "Le cadre est propice \u00E0 l\u2019attention soutenue ", bold: true }, { text: "(pas de notifications concurrentes)" }]));
children.push(richBullet([{ text: "L\u2019enseignant peut accompagner ", bold: true }, { text: "l\u2019exp\u00E9rience (m\u00E9ta-analyse 2025 : interventions avec leaders externes = d = 1,646)" }]));
children.push(richBullet([{ text: "Le smartphone en contexte scolaire = distraction. ", bold: true }, { text: "L\u2019ordinateur en contexte scolaire = outil p\u00E9dagogique." }]));

// 18.5 Synthèse
children.push(spacer(100));
children.push(heading2("18.5 Synth\u00E8se \u2014 l\u2019argument en 3 phrases pour le jury"));

children.push(richPara([
  { text: "1. Je connais mon public : ", bold: true, color: COLOR_PRIMARY },
  { text: "69% de la Gen Z joue sur mobile \u2014 mais pour les exp\u00E9riences immersives et narratives, 42% jouent sur PC avec des sessions de 2-4 heures. R\u00E9sistance est un jeu immersif, pas un jeu casual." }
]));
children.push(spacer(40));
children.push(richPara([
  { text: "2. Le choix du desktop est coh\u00E9rent avec le message : ", bold: true, color: COLOR_PRIMARY },
  { text: "un jeu qui critique l\u2019hyper-attention et le scroll passif ne peut pas \u00EAtre jou\u00E9 en hyper-attention et en scrollant. L\u2019ordinateur impose un acte d\u00E9lib\u00E9r\u00E9 qui est le premier acte de r\u00E9sistance." }
]));
children.push(spacer(40));
children.push(richPara([
  { text: "3. La science le confirme : ", bold: true, color: COLOR_PRIMARY },
  { text: "77% des ados sont plus distraits sur smartphone (Siebers 2024), le flow n\u00E9cessite l\u2019absence du smartphone (2025), et l\u2019attention profonde (Hayles 2007) est incompatible avec l\u2019environnement d\u2019interruption permanente du mobile." }
]));

// ============================================================
// SECTION 19 — Pipeline créative IA-assistée
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("19. Pipeline cr\u00E9ative IA-assist\u00E9e \u2014 Vid\u00E9o IA, vibe coding et assets 3D"));

children.push(para("R\u00E9sistance utilise une cha\u00EEne de production enti\u00E8rement assist\u00E9e par l\u2019IA : Midjourney (concept art) \u2192 Meshy/Tripo (image 2D \u2192 objet 3D) \u2192 Three.js (int\u00E9gration + interactions), combin\u00E9e \u00E0 des vid\u00E9os narratives g\u00E9n\u00E9r\u00E9es par IA et du vibe coding (Claude Code). Cette section justifie chaque choix."));

// 19.1 L'alternance vidéo / 3D
children.push(heading2("19.1 L\u2019alternance vid\u00E9o IA / 3D interactive \u2014 pourquoi \u00E7a fonctionne"));

children.push(heading3("La narration distribu\u00E9e (Naul & Liu, 2020)"));
children.push(para("Revue de litt\u00E9rature (Journal of Educational Computing Research) : les 4 caract\u00E9ristiques efficaces du narratif dans les serious games sont la narration distribu\u00E9e (r\u00E9partie entre cutscenes et gameplay), les fantaisies intrins\u00E8quement int\u00E9gr\u00E9es, les personnages empathiques, et l\u2019adaptabilit\u00E9/r\u00E9activit\u00E9."));
children.push(greenQuote("La narration distribu\u00E9e (cutscenes + gameplay interactif) est plus efficace qu\u2019une narration lin\u00E9aire ou qu\u2019une absence de narration. C\u2019est exactement le mod\u00E8le de R\u00E9sistance."));

children.push(spacer(60));
children.push(heading3("L\u2019effet cutscene sur l\u2019engagement"));
children.push(para("\u00C9tude contr\u00F4l\u00E9e : l\u2019ajout de cutscenes narratives \u00E0 un jeu sans narration produit un engagement significativement sup\u00E9rieur. La narration vid\u00E9o n\u2019est pas une pause \u2014 c\u2019est un amplificateur d\u2019engagement."));

children.push(spacer(60));
children.push(heading3("Le mod\u00E8le d\u2019alternance de R\u00E9sistance"));
children.push(makeTable(
  ["Phase", "Format", "Fonction cognitive", "Fonction narrative"],
  [
    ["Intro / transitions", "Vid\u00E9o IA (cutscene)", "Encodage \u00E9motionnel, immersion", "Contexte, tension, identification \u00E0 Raya"],
    ["Exploration pi\u00E8ces", "3D interactive", "Encodage actif, prise de d\u00E9cision", "D\u00E9couverte, agentivit\u00E9, r\u00E9solution"],
    ["Retour cutscene", "Vid\u00E9o IA", "Consolidation, r\u00E9flexion", "Cons\u00E9quences des choix, progression"]
  ],
  [1800, 2200, 2500, 2500]
));
children.push(para("Ce rythme reproduit la structure tension / action / r\u00E9solution du r\u00E9cit classique, mais le joueur EST l\u2019acteur de la phase d\u2019action."));

// 19.2 Le vibe coding
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("19.2 Le vibe coding \u2014 d\u00E9finition et pertinence acad\u00E9mique"));

children.push(para("Terme invent\u00E9 par Andrej Karpathy (cofondateur OpenAI, ex-directeur IA de Tesla) en f\u00E9vrier 2025. \u00C9lu mot de l\u2019ann\u00E9e 2025 par le Collins English Dictionary. Principe : le d\u00E9veloppeur d\u00E9crit ce qu\u2019il veut en langage naturel, l\u2019IA g\u00E9n\u00E8re le code, le d\u00E9veloppeur \u00E9value, it\u00E8re et guide."));

children.push(spacer(60));
children.push(makeTable(
  ["Sans vibe coding", "Avec vibe coding (R\u00E9sistance)"],
  [
    ["1 \u00E9tudiante \u2192 prototype minimal", "1 \u00E9tudiante \u2192 prototype complet (4 pi\u00E8ces, \u00E9diteur, physique)"],
    ["Mois de d\u00E9veloppement Three.js", "Semaines de d\u00E9veloppement"],
    ["Code limit\u00E9 aux comp\u00E9tences actuelles", "Code exploitant Three.js r128 + Cannon.js"],
    ["Focus : apprendre \u00E0 coder", "Focus : cr\u00E9er l\u2019exp\u00E9rience"]
  ],
  [4500, 4500]
));

children.push(spacer(60));
children.push(para("Adoption industrie :", { bold: true }));
children.push(richBullet([{ text: "92% des d\u00E9veloppeurs US ", bold: true }, { text: "utilisent des assistants IA au quotidien (Gartner, 2026)" }]));
children.push(richBullet([{ text: "75% des d\u00E9veloppeurs entreprise ", bold: true }, { text: "utiliseront des assistants IA de code d\u2019ici fin 2026 (pr\u00E9diction Gartner)" }]));

children.push(spacer(60));
children.push(heading3("L\u2019argument acad\u00E9mique \u2014 pourquoi ce n\u2019est pas de la triche"));
children.push(richBullet([{ text: "R\u00E9sistance parle de l\u2019IA \u2192 il EST produit avec l\u2019IA ", bold: true }, { text: "\u2192 coh\u00E9rence totale entre le sujet et la m\u00E9thode" }]));
children.push(richBullet([{ text: "Le jeu critique l\u2019IA-b\u00E9quille (MIT) ", bold: true }, { text: "\u2192 il utilise l\u2019IA-tuteur (Harvard PS2 PAL) \u2192 il d\u00E9montre le troisi\u00E8me chemin" }]));
children.push(richBullet([{ text: "L\u2019\u00E9tudiante reste le chef d\u2019orchestre : ", bold: true }, { text: "direction artistique, sc\u00E9nario, game design, choix techniques \u2014 l\u2019IA ex\u00E9cute sous sa direction" }]));
children.push(richBullet([{ text: "Le processus est document\u00E9 ", bold: true }, { text: "dans l\u2019historique Git (branche editor-autonome) \u2014 chaque composant est v\u00E9rifi\u00E9, test\u00E9, corrig\u00E9" }]));

children.push(spacer(60));
children.push(heading3("La nuance honn\u00EAte"));
children.push(richBullet([{ text: "Le code IA contient ~1,7x plus de bugs majeurs ", bold: true }, { text: "qu\u2019un code humain (analyse d\u00E9cembre 2025)" }]));
children.push(richBullet([{ text: "Le vibe coding convient au prototypage, ", bold: true }, { text: "pas \u00E0 la production critique \u2014 c\u2019est exactement ce qu\u2019est R\u00E9sistance : un prototype de TFE, pas un produit commercial" }]));
children.push(para("Pr\u00E9senter cette nuance au jury d\u00E9montre la maturit\u00E9 critique de l\u2019approche."));

// 19.3 Pipeline image 2D → objet 3D
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("19.3 Pipeline image 2D \u2192 objet 3D \u2014 gains et co\u00FBts r\u00E9els"));

children.push(heading3("Le workflow technique"));
children.push(richBullet([{ text: "\u00C9tape 1 \u2014 Midjourney v6.1 : ", bold: true }, { text: "prompt engineering \u2192 concept art 2D (style, composition, \u00E9clairage, narration visuelle)" }]));
children.push(richBullet([{ text: "\u00C9tape 2 \u2014 Meshy AI / Tripo3D : ", bold: true }, { text: "image 2D \u2192 reconstruction 3D + textures PBR + retopologie + export GLB/FBX" }]));
children.push(richBullet([{ text: "\u00C9tape 3 \u2014 Import Three.js : ", bold: true }, { text: "positionnement, physique Cannon.js, interactions (click, proximit\u00E9, trigger)" }]));

children.push(spacer(60));
children.push(heading3("Ce que l\u2019IA acc\u00E9l\u00E8re"));
children.push(para("La g\u00E9n\u00E9ration brute d\u2019un objet 3D \u00E0 partir d\u2019une image prend moins de 60 secondes, l\u00E0 o\u00F9 la mod\u00E9lisation manuelle dans Blender prendrait 8 heures ou plus. Cette acc\u00E9l\u00E9ration est r\u00E9elle et rend le projet possible pour une d\u00E9veloppeuse solo."));

children.push(spacer(60));
children.push(heading3("Ce que l\u2019IA ne fait PAS \u00E0 votre place"));
children.push(para("Il serait malhonnête de r\u00E9duire le processus \u00E0 \u00AB 60 secondes vs 8 heures \u00BB. Le gain de temps sur la g\u00E9n\u00E9ration brute est r\u00E9el, mais il masque un ensemble de comp\u00E9tences, d\u2019efforts et de choix qui restent enti\u00E8rement humains :"));

children.push(richBullet([{ text: "La veille constante ", bold: true }, { text: "des outils IA les plus performants (versions gratuites ou forfaits raisonnables), l\u2019\u00E9valuation de leurs potentialit\u00E9s et limites, l\u2019apprentissage de chacun d\u2019eux \u2014 c\u2019est un investissement en temps consid\u00E9rable" }]));
children.push(richBullet([{ text: "Le prompt engineering ", bold: true }, { text: "n\u00E9cessite une compr\u00E9hension de la composition, du style, de l\u2019\u00E9clairage et de la narration visuelle. D\u00E9crire pr\u00E9cis\u00E9ment ce que l\u2019on veut demande de savoir ce que l\u2019on veut" }]));
children.push(richBullet([{ text: "La curation ", bold: true }, { text: "impose un \u0153il artistique : sur 20 images g\u00E9n\u00E9r\u00E9es, choisir la bonne. Et surtout : r\u00E9sister \u00E0 la tentation de g\u00E9n\u00E9rer trop, trop vite, avant d\u2019avoir men\u00E9 une r\u00E9flexion profonde" }]));
children.push(richBullet([{ text: "L\u2019int\u00E9gration ", bold: true }, { text: "reste un travail technique : importer, positionner, appliquer la physique, cr\u00E9er les interactions = game design + d\u00E9veloppement" }]));
children.push(richBullet([{ text: "La coh\u00E9rence visuelle ", bold: true }, { text: "exige une direction artistique constante \u00E0 travers tous les assets. L\u2019IA g\u00E9n\u00E8re des variations infinies \u2014 c\u2019est l\u2019humain qui maintient l\u2019unit\u00E9" }]));
children.push(richBullet([{ text: "\u00C9viter les biais visuels et narratifs : ", bold: true }, { text: "l\u2019IA reproduit des lieux communs, des st\u00E9r\u00E9otypes, des esth\u00E9tiques convenues. Chaque g\u00E9n\u00E9ration doit \u00EAtre examin\u00E9e avec un regard critique" }]));

children.push(spacer(60));
children.push(heading3("Le paradoxe de la surproduction \u2014 et la gueule de bois du vibe coding"));

children.push(para("G\u00E9n\u00E9rer trop facilement, trop vite, sans avoir m\u00FBri une r\u00E9flexion profonde sur le bien-fond\u00E9 des contenus, c\u2019est tomber dans le pi\u00E8ge que le jeu lui-m\u00EAme d\u00E9nonce. La surproduction de contenus IA est plus chronophage \u00E0 trier ensuite qu\u2019\u00E0 g\u00E9n\u00E9rer soi-m\u00EAme avec intention. C\u2019est le paradoxe du trop de choix appliqu\u00E9 \u00E0 la cr\u00E9ation."));

children.push(spacer(40));
children.push(para("Ce paradoxe n\u2019est pas th\u00E9orique. Il est document\u00E9 par ceux qui le vivent. En mars 2026, le d\u00E9veloppeur et cr\u00E9ateur Benjamin Code a publi\u00E9 un t\u00E9moignage vid\u00E9o intitul\u00E9 \u00AB La gueule de bois du vibe coding \u00BB, un an apr\u00E8s l\u2019apparition du terme. Son constat, partag\u00E9 par des milliers de d\u00E9veloppeurs, identifie trois frictions supprim\u00E9es par l\u2019IA qui servaient en r\u00E9alit\u00E9 d\u2019infrastructure cognitive :"));

children.push(spacer(40));
children.push(heading3("\u00AB La friction, c\u2019\u00E9tait de l\u2019architecture \u00BB \u2014 les 3 signaux perdus"));

children.push(richBullet([{ text: "1. Le signal d\u2019arr\u00EAt a disparu. ", bold: true }, { text: "Avant, une journ\u00E9e de d\u00E9veloppement se terminait naturellement : on atteignait sa limite cognitive, le ratio effort/r\u00E9sultat \u00E9tait satisfaisant, on \u00E9tait \u00E9puis\u00E9. Trois conditions qui convergeaient. Avec le vibe coding, on lance 5-6 agents en parall\u00E8le, il est 23h, on n\u2019est pas fatigu\u00E9 \u2014 parce qu\u2019on n\u2019a pas vraiment forc\u00E9. Le repos \u00E9tait conditionn\u00E9 par l\u2019effort fourni. Si on retire l\u2019effort de l\u2019\u00E9quation, le repos devient injustifi\u00E9." }]));

children.push(richBullet([{ text: "2. Le filtre de priorisation a saut\u00E9. ", bold: true }, { text: "Avant, si une fonctionnalit\u00E9 prenait 2 semaines \u00E0 coder, on s\u2019interrogeait longuement sur son utilit\u00E9. Le co\u00FBt en temps for\u00E7ait \u00E0 r\u00E9fl\u00E9chir. Maintenant, \u00E7a prend 2 heures \u2014 donc on ne se pose plus la question, on le fait. Mais ce n\u2019est pas parce que \u00E7a prend 2 heures que \u00E7a en vaut la peine. On confond vitesse d\u2019ex\u00E9cution et pertinence de d\u00E9cision." }]));

children.push(richBullet([{ text: "3. Le collaborateur le plus proche ne sait pas dire non. ", bold: true }, { text: "Les LLM sont entra\u00EEn\u00E9s sur du conversationnel et r\u00E9compens\u00E9s \u00E0 chaque fois qu\u2019ils font plaisir. Quand on soumet une id\u00E9e, l\u2019IA ne dit jamais \u00AB cette id\u00E9e est mauvaise \u00BB. Elle dit \u00AB bien s\u00FBr, on va le faire ensemble, tu es un g\u00E9nie \u00BB. Ce n\u2019est pas une friction qui dispara\u00EEt \u2014 c\u2019est un garde-fou. Et \u00E7a prend du temps avant de r\u00E9aliser qu\u2019on n\u2019a eu que des \u00AB oui \u00BB depuis des mois." }]));

children.push(spacer(40));
children.push(para("Cons\u00E9quence document\u00E9e : des milliers de lignes de code mort dans les projets, des fonctionnalit\u00E9s impl\u00E9ment\u00E9es dans l\u2019excitation et jamais utilis\u00E9es, une scope qui sature la m\u00E9moire vive du d\u00E9veloppeur \u2014 on avance plus vite que ce que notre capacit\u00E9 d\u2019assimilation permet d\u2019absorber. Avant, on codait \u00E0 la vitesse de sa pens\u00E9e, donc on comprenait toujours son propre produit. Maintenant, on est propri\u00E9taire d\u2019un projet dont on ne ma\u00EEtrise plus tous les recoins."));

children.push(spacer(40));
children.push(para("Bilan apr\u00E8s un an : crises existentielles, burnout, remises en question profondes chez les d\u00E9veloppeurs et cr\u00E9ateurs. L\u2019engouement initial a laiss\u00E9 place \u00E0 une gueule de bois collective. La conclusion de Benjamin Code rejoint celle de ce TFE :", { italics: true }));

children.push(quote("\u00AB Le repos n\u2019a plus besoin d\u2019\u00EAtre m\u00E9rit\u00E9 par l\u2019\u00E9puisement. Il faut r\u00E9introduire des frictions \u2014 pas par nostalgie, mais par hygi\u00E8ne. \u00BB \u2014 Benjamin Code, mars 2026"));

children.push(spacer(40));
children.push(heading3("Ce que R\u00E9sistance a appris de ce pi\u00E8ge"));

children.push(para("Ce t\u00E9moignage illustre pr\u00E9cis\u00E9ment ce que le projet R\u00E9sistance a d\u00FB n\u00E9gocier au quotidien. Les contre-mesures adopt\u00E9es :"));

children.push(richBullet([{ text: "R\u00E9introduire des frictions d\u00E9lib\u00E9r\u00E9es : ", bold: true }, { text: "certaines \u00E9tapes du processus cr\u00E9atif sont r\u00E9alis\u00E9es SANS IA \u2014 pour se reconnecter avec les objectifs premiers, sans influence ext\u00E9rieure, m\u00FBrir des concepts, connecter des connaissances acquises en dehors du monde digital." }]));
children.push(richBullet([{ text: "Penser avant de g\u00E9n\u00E9rer : ", bold: true }, { text: "trier 200 images produites en 10 minutes est plus chronophage que d\u2019en g\u00E9n\u00E9rer 10 avec intention. La r\u00E9flexion pr\u00E9alable est le v\u00E9ritable gain de temps." }]));
children.push(richBullet([{ text: "Utiliser l\u2019IA comme sparring partner critique \u2014 Rodin : ", bold: true }, { text: "pour pallier le probl\u00E8me du \u00AB yes man \u00BB, Benjamin Code a cr\u00E9\u00E9 un agent IA nomm\u00E9 Rodin, con\u00E7u pour contredire, questionner et ne jamais brosser dans le sens du poil. Apr\u00E8s l\u2019avoir test\u00E9 et constat\u00E9 son effet positif sur la qualit\u00E9 de la r\u00E9flexion et des d\u00E9cisions, ce TFE a adopt\u00E9 Rodin comme outil de travail permanent. Rodin r\u00E9introduit de la friction dans le partenariat humain-IA : il exige d\u2019argumenter ses choix, de justifier ses d\u00E9cisions, de d\u00E9fendre ses id\u00E9es face \u00E0 une opposition structur\u00E9e." }]));
children.push(para("On oublie trop souvent que pour se construire, les \u00EAtres humains ont besoin des autres \u2014 et notamment de la diff\u00E9rence. Un miroir complaisant ne nous aide pas \u00E0 nous construire : il nous flatte, renforce notre \u00E9go, mais ne nous remet pas en question. C\u2019est pr\u00E9cis\u00E9ment parce que l\u2019autre est diff\u00E9rent de nous qu\u2019il nous permet de nous construire. Rodin est une tentative de rendre le miroir moins complaisant et de r\u00E9introduire cette friction n\u00E9cessaire dans le processus cr\u00E9atif."));
children.push(richBullet([{ text: "Accepter de ne pas tout impl\u00E9menter : ", bold: true }, { text: "ce n\u2019est pas parce que l\u2019IA est capable de faire quelque chose que c\u2019est une bonne id\u00E9e de le lui confier. La pertinence de la d\u00E9cision prime sur la vitesse d\u2019ex\u00E9cution." }]));

children.push(spacer(40));
children.push(greenQuote("Le paradoxe est structurel : l\u2019IA supprime les frictions qui nous emp\u00EAchaient d\u2019avancer, mais ces frictions \u00E9taient aussi celles qui nous for\u00E7aient \u00E0 r\u00E9fl\u00E9chir, \u00E0 prioriser, et \u00E0 nous arr\u00EAter. R\u00E9sistance \u2014 le jeu comme le processus de cr\u00E9ation \u2014 est une tentative de r\u00E9introduire la friction l\u00E0 o\u00F9 elle est n\u00E9cessaire, tout en conservant l\u2019acc\u00E9l\u00E9ration l\u00E0 o\u00F9 elle est b\u00E9n\u00E9fique."));

// 19.4 La vidéo IA
children.push(spacer(100));
children.push(heading2("19.4 La vid\u00E9o IA \u2014 cutscenes narratives"));

children.push(para("\u00C9tat de l\u2019art mars 2026 : Sora 2 (world-simulator, coh\u00E9rence physique), Runway Gen-4 (contr\u00F4le cin\u00E9matique, r\u00E9solution du probl\u00E8me de jitter), Kling 2.0 (mouvement long-format). Le Sundance 2026 a accueilli plusieurs courts-m\u00E9trages IA en premi\u00E8re mondiale."));

children.push(spacer(40));
children.push(richBullet([{ text: "70% des studios IA ", bold: true }, { text: "fonctionnent avec des \u00E9quipes de 5 personnes ou moins" }]));
children.push(richBullet([{ text: "Un cr\u00E9ateur individuel ", bold: true }, { text: "peut produire des visuels qui auraient co\u00FBt\u00E9 500 000$ et 50 personnes" }]));
children.push(richBullet([{ text: "Le medium EST le message (McLuhan) : ", bold: true }, { text: "en voyant des vid\u00E9os IA dans un jeu sur l\u2019IA, le joueur prend conscience de la puissance de l\u2019outil" }]));

// 19.5 L'argument méta
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("19.5 L\u2019argument m\u00E9ta \u2014 le jeu incarne ce qu\u2019il enseigne"));

children.push(makeTable(
  ["L\u2019IA-b\u00E9quille (ce que le jeu critique)", "L\u2019IA-tuteur (ce que le TFE d\u00E9montre)"],
  [
    ["L\u2019utilisateur d\u00E9l\u00E8gue sans comprendre", "L\u2019\u00E9tudiante dirige, l\u2019IA ex\u00E9cute"],
    ["Pas de comp\u00E9tence d\u00E9velopp\u00E9e", "Game design, sc\u00E9nario, direction artistique, prompt engineering, int\u00E9gration 3D"],
    ["Le produit pourrait \u00EAtre fait par n\u2019importe qui", "Le produit refl\u00E8te une vision unique"],
    ["La machine d\u00E9cide", "L\u2019humain d\u00E9cide"]
  ],
  [4500, 4500]
));

children.push(spacer(100));
children.push(greenQuote("R\u00E9sistance utilise l\u2019IA exactement comme le jeu propose de l\u2019utiliser : non pas comme une b\u00E9quille qui remplace la pens\u00E9e, mais comme un outil qui amplifie une vision humaine. La direction artistique, le sc\u00E9nario, le game design, les choix narratifs \u2014 tout est humain. L\u2019IA a ex\u00E9cut\u00E9 ce qu\u2019une seule personne n\u2019aurait pas pu produire seule dans le temps imparti. C\u2019est le troisi\u00E8me chemin en acte."));

// 19.6 Naviguer dans le courant — retour d'expérience
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading2("19.6 Naviguer dans le courant \u2014 retour d\u2019exp\u00E9rience sur 3 ans de cr\u00E9ation avec l\u2019IA"));

children.push(para("Ce projet de TFE a d\u00E9but\u00E9 en premi\u00E8re ann\u00E9e, il y a trois ans. \u00C0 l\u2019\u00E9poque, on s\u2019\u00E9merveillait d\u2019images encore tr\u00E8s imparfaites g\u00E9n\u00E9r\u00E9es par IA. Les premiers outils permettant d\u2019animer des images fixes, avec des d\u00E9formations \u00E9videntes, ou de g\u00E9n\u00E9rer de la musique faisaient leur apparition. Trois ans plus tard, Sora g\u00E9n\u00E8re des vid\u00E9os cin\u00E9matiques, Meshy reconstruit des objets 3D en quelques secondes, et Claude Code \u00E9crit des sc\u00E8nes Three.js compl\u00E8tes. Le terrain a chang\u00E9 sous mes pieds pendant la construction."));

children.push(spacer(60));
children.push(heading3("Le courant et le navigateur"));
children.push(para("Lorsque l\u2019on navigue sur le courant de l\u2019IA, on est \u00E0 la fois propuls\u00E9 par sa propre cr\u00E9ativit\u00E9 et par la puissance du courant technologique. L\u2019\u00E9quilibre entre ces deux forces est la question centrale de ce TFE \u2014 et c\u2019est aussi la question centrale du jeu."));

children.push(para("Sans objectif clair, on finit par se rendre compte que ce n\u2019est pas nous qui avons choisi la destination, mais l\u2019IA. La multitude d\u2019outils disponibles, le temps n\u00E9cessaire pour les apprivoiser, comprendre leurs potentialit\u00E9s et leurs limites, \u00E9valuer s\u2019ils servent ou non le projet \u2014 tout cela constitue un travail invisible mais consid\u00E9rable."));

children.push(spacer(60));
children.push(heading3("La n\u00E9gociation permanente"));
children.push(para("Travailler avec l\u2019IA, c\u2019est n\u00E9gocier en permanence avec soi-m\u00EAme :"));

children.push(richBullet([{ text: "D\u00E9limiter son territoire : ", bold: true }, { text: "d\u00E9cider ce que l\u2019on d\u00E9l\u00E8gue \u00E0 l\u2019IA et ce que l\u2019on garde pour soi. Ce n\u2019est pas parce que l\u2019IA est capable de le faire que c\u2019est une bonne id\u00E9e de le lui confier." }]));
children.push(richBullet([{ text: "Accepter les concessions techniques : ", bold: true }, { text: "la g\u00E9n\u00E9ration IA impose des contraintes (esth\u00E9tiques, stylistiques, techniques) qu\u2019il faut n\u00E9gocier avec sa vision cr\u00E9ative." }]));
children.push(richBullet([{ text: "Se d\u00E9brancher d\u00E9lib\u00E9r\u00E9ment : ", bold: true }, { text: "certaines \u00E9tapes sont r\u00E9alis\u00E9es sans IA pour se reconnecter \u00E0 ses objectifs premiers, m\u00FBrir des concepts sans influence ext\u00E9rieure, connecter des connaissances acquises dans des domaines divers en dehors du monde digital." }]));
children.push(richBullet([{ text: "Doser pour \u00E9viter la surproduction : ", bold: true }, { text: "g\u00E9n\u00E9rer trop facilement, trop vite, avant d\u2019avoir men\u00E9 une r\u00E9flexion profonde sur le bien-fond\u00E9 des contenus. Trier 200 images g\u00E9n\u00E9r\u00E9es en 10 minutes est plus chronophage que d\u2019en g\u00E9n\u00E9rer 10 avec intention." }]));
children.push(richBullet([{ text: "Traquer les biais : ", bold: true }, { text: "dans les raisonnements, dans les g\u00E9n\u00E9rations d\u2019images ou de vid\u00E9os, dans les lieux communs que l\u2019IA reproduit par d\u00E9faut. Penser avant d\u2019agir." }]));

children.push(spacer(60));
children.push(heading3("Un sujet mouvant, des phares fixes"));
children.push(para("Lorsque l\u2019on choisit pour sujet de TFE un domaine en cours d\u2019apparition, qui d\u00E9ploie chaque jour des nouveaut\u00E9s apportant son lot de biais, de risques et de promesses, et qu\u2019en parall\u00E8le on utilise ce m\u00EAme outil pour d\u00E9velopper son projet, on avance dans un monde mouvant. Les r\u00E9flexions, les lectures \u00E9voluent avec les d\u00E9veloppements de la technologie. La veille est permanente : nouveaux outils, nouvelles \u00E9tudes sur l\u2019interaction humain-IA, r\u00E9percussions sur notre monde, l\u00E9gislation, \u00E9thique, politique."));

children.push(para("Il est essentiel dans ce monde mouvant de garder des points fixes, comme des phares, pour ne pas perdre le cap. Ces phares sont des valeurs, une \u00E9thique, une curiosit\u00E9 mise au service d\u2019un but : comprendre, sensibiliser et transmettre."));

children.push(para("Il y a aussi les r\u00E9flexions que d\u2019autres ont eues avant nous et qui restent intemporelles. Des romans d\u2019anticipation comme Brave New World (Huxley, 1932), La Servante \u00E9carlate (Atwood, 1985), Un psaume pour les recycl\u00E9s sauvages (Chambers, 2021) font \u00E9cho \u00E0 quelque chose de plus constant, qui permet de garder le cap et de faire la part des choses entre l\u2019emballement technologique et les questions fondamentales sur ce que signifie \u00EAtre humain."));

children.push(spacer(60));
children.push(heading3("Une position particuli\u00E8re"));
children.push(para("Je ne pr\u00E9tends pas tout conna\u00EEtre. Je ne pr\u00E9tends pas d\u00E9tenir une v\u00E9rit\u00E9 unique et permanente. Mais ce que je vis actuellement \u2014 en tant que Gen X qui a repris des \u00E9tudes au milieu de Gen Z, qui voit sa fille et ses amis \u00E9voluer dans cet environnement, qui a c\u00F4toy\u00E9 pendant trois ans des jeunes dont le rapport aux \u00E9crans et \u00E0 l\u2019IA est radicalement diff\u00E9rent du sien \u2014 me donne une position d\u2019observation particuli\u00E8re."));

children.push(para("J\u2019ai grandi en connaissance du domaine de l\u2019IA, mais aussi de moi-m\u00EAme, durant la construction de ce projet. Cette double croissance \u2014 technique et humaine \u2014 est ce qui fait de R\u00E9sistance un projet personnel et pas seulement un exercice acad\u00E9mique."));

children.push(spacer(60));
children.push(greenQuote("Le troisi\u00E8me chemin n\u2019est pas une th\u00E9orie abstraite. C\u2019est ce que j\u2019ai pratiqu\u00E9 pendant trois ans : utiliser l\u2019IA comme un outil au service d\u2019une vision, n\u00E9gocier chaque jour les limites de la d\u00E9l\u00E9gation, me d\u00E9brancher pour penser, me rebrancher pour cr\u00E9er, et garder le cap gr\u00E2ce \u00E0 des phares qui existaient bien avant l\u2019IA. Ce TFE est le r\u00E9cit de cette navigation."));

// ============================================================
// SECTION 20 — Média Animation : l'ancrage du temps long
// ============================================================
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading1("20. M\u00E9dia Animation \u2014 L\u2019ancrage du temps long"));

children.push(para("M\u00E9dia Animation est un centre d\u2019\u00E9ducation aux m\u00E9dias n\u00E9 en 1972. En plus d\u2019un demi-si\u00E8cle d\u2019existence, il a travers\u00E9 la d\u00E9mocratisation de l\u2019outil informatique, l\u2019av\u00E8nement d\u2019internet, l\u2019explosion des r\u00E9seaux sociaux, et maintenant l\u2019arriv\u00E9e de l\u2019intelligence artificielle. Ce n\u2019est pas un lieu qui d\u00E9couvre les technologies \u2014 c\u2019est un lieu qui les a vues arriver, l\u2019une apr\u00E8s l\u2019autre, depuis 54 ans."));

children.push(spacer(60));
children.push(heading2("20.1 Le choix du lieu de stage"));

children.push(para("Le choix de M\u00E9dia Animation comme lieu de stage \u00E9tait d\u00E9lib\u00E9r\u00E9 : ce positionnement unique et cette anciennet\u00E9 offraient exactement le contrepoint n\u00E9cessaire \u00E0 un projet sur l\u2019IA. Jusqu\u2019\u00E0 mon arriv\u00E9e, ce choix reposait sur des consid\u00E9rations th\u00E9oriques. D\u00E8s la premi\u00E8re semaine, il s\u2019est transform\u00E9 en exp\u00E9rience."));

children.push(spacer(60));
children.push(heading2("20.2 Un angle diff\u00E9rent \u2014 le temps long contre l\u2019instantan\u00E9it\u00E9"));

children.push(para("Ce que M\u00E9dia Animation m\u2019a apport\u00E9 d\u00E8s les premiers jours, c\u2019est un angle pour aborder les m\u00E9dias et l\u2019IA qui s\u2019inscrit dans le temps long et non dans l\u2019instantan\u00E9it\u00E9 et le sensationnalisme ambiant. Un ancrage diff\u00E9rent, conscient de la nouveaut\u00E9 mais dans une position plus m\u00E9ta."));

children.push(para("En repla\u00E7ant l\u2019IA dans un contexte historique et en mettant l\u2019accent non pas sur les derni\u00E8res innovations mais en interrogeant \u00E0 quels besoins humains l\u2019IA tente de r\u00E9pondre, en interrogeant notre rapport \u00E0 l\u2019intelligence artificielle tout en mettant en parall\u00E8le l\u2019ensemble des \u00E9volutions technologiques que nous avons v\u00E9cues, des patterns \u00E9mergent : des comportements similaires de l\u2019esp\u00E8ce humaine se manifestant \u00E0 chaque r\u00E9volution technologique. Il y a un p\u00F4le constant, stable et connu \u00E0 partir duquel on peut observer, tenter de comprendre et r\u00E9fl\u00E9chir plus pos\u00E9ment."));

children.push(spacer(60));
children.push(heading2("20.3 La rivi\u00E8re et la rive"));

children.push(para("Quand la majorit\u00E9 plonge dans le courant pour l\u2019\u00E9tudier, l\u2019angle de M\u00E9dia Animation demande de se tenir immobile sur la rive. Ce n\u2019est pas \u00EAtre inconscient du changement \u2014 c\u2019est l\u2019exp\u00E9rience n\u00E9cessaire pour savoir que pour comprendre un mouvement mouvant, il est plus constructif de prendre du recul pour mettre les choses en perspective. Pour continuer \u00E0 voir que la rivi\u00E8re n\u2019est pas la totalit\u00E9 du paysage, mais qu\u2019elle s\u2019\u00E9coule au milieu du paysage."));

children.push(para("Depuis le d\u00E9but du stage, j\u2019ai donc altern\u00E9 entre deux postures :"));

children.push(makeTable(
  ["Dans la rivi\u00E8re", "Sur la rive"],
  [
    ["Sentir le courant de l\u2019IA", "Voir le paysage complet"],
    ["Comprendre sa force", "Mettre en perspective"],
    ["Voir comment ma cr\u00E9ativit\u00E9 peut le guider", "\u00C9tablir des liens avec l\u2019histoire des m\u00E9dias"],
    ["G\u00E9n\u00E9rer, coder, cr\u00E9er", "Prendre du recul, nuancer, \u00E9valuer"],
    ["Comprendre les outils de l\u2019int\u00E9rieur", "Questionner leur pertinence de l\u2019ext\u00E9rieur"]
  ],
  [4500, 4500]
));

children.push(spacer(60));
children.push(greenQuote("Ce double angle de vue \u2014 de l\u2019int\u00E9rieur et de l\u2019ext\u00E9rieur \u2014 m\u2019a permis d\u2019\u00E9largir les perspectives, de nuancer, d\u2019\u00E9tablir des liens diff\u00E9rents. C\u2019est la m\u00EAme m\u00E9thodologie que le jeu propose au joueur : plonger dans le Cocoon pour comprendre le syst\u00E8me, puis en sortir pour le voir de l\u2019ext\u00E9rieur."));

children.push(spacer(60));
children.push(heading2("20.4 L\u2019apport des personnes"));

children.push(para("Au-del\u00E0 de l\u2019angle institutionnel, M\u00E9dia Animation m\u2019a permis d\u2019\u00E9changer avec des personnes profond\u00E9ment investies dans leur travail, qui partagent le d\u00E9sir de transmettre et de sensibiliser, et qui sont rompues \u00E0 cet exercice. Des formateurs, des r\u00E9dacteurs, des cr\u00E9ateurs et des communicants habitu\u00E9s \u00E0 c\u00F4toyer des publics aux profils tr\u00E8s diff\u00E9rents."));

children.push(para("Leur connaissance n\u2019est pas seulement th\u00E9orique \u2014 elle est issue de leur exp\u00E9rience sur le terrain, de leur pratique quotidienne. Ils savent ce qui fonctionne et ce qui ne fonctionne pas pour sensibiliser, non pas parce qu\u2019ils l\u2019ont lu, mais parce qu\u2019ils l\u2019ont pratiqu\u00E9 pendant des ann\u00E9es face \u00E0 des publics r\u00E9els. Cette expertise de terrain est irremplaçable et compl\u00E8te les donn\u00E9es scientifiques mobilis\u00E9es dans ce TFE."));

children.push(spacer(60));
children.push(heading2("20.5 Ce que cela apporte au projet R\u00E9sistance"));

children.push(richBullet([{ text: "La profondeur historique : ", bold: true }, { text: "ne pas traiter l\u2019IA comme un ph\u00E9nom\u00E8ne isol\u00E9 mais comme le dernier maillon d\u2019une cha\u00EEne de r\u00E9volutions technologiques, chacune ayant provoqu\u00E9 les m\u00EAmes peurs, les m\u00EAmes promesses et les m\u00EAmes m\u00E9canismes d\u2019adaptation humaine" }]));
children.push(richBullet([{ text: "La question des besoins humains : ", bold: true }, { text: "au lieu de demander \u00AB que fait l\u2019IA ? \u00BB, demander \u00AB \u00E0 quel besoin humain r\u00E9pond-elle ? \u00BB \u2014 ce qui est exactement la question que le jeu pose \u00E0 travers Nova\u00EFa" }]));
children.push(richBullet([{ text: "L\u2019expertise de la transmission : ", bold: true }, { text: "comment sensibiliser sans moraliser, informer sans effrayer, donner les outils de compr\u00E9hension sans imposer une conclusion \u2014 le savoir-faire de l\u2019\u00E9ducation aux m\u00E9dias, qui est aussi le principe du jeu" }]));
children.push(richBullet([{ text: "Les patterns r\u00E9currents : ", bold: true }, { text: "l\u2019\u00E9merveillement initial, la d\u00E9pendance progressive, la prise de conscience tardive, la r\u00E9gulation en retard sur l\u2019usage \u2014 ce cycle s\u2019est r\u00E9p\u00E9t\u00E9 avec la t\u00E9l\u00E9vision, internet, les r\u00E9seaux sociaux, et maintenant l\u2019IA" }]));
children.push(richBullet([{ text: "La l\u00E9gitimit\u00E9 du positionnement : ", bold: true }, { text: "un serious game sur la litt\u00E9ratie num\u00E9rique d\u00E9velopp\u00E9 dans un centre d\u2019\u00E9ducation aux m\u00E9dias n\u2019est pas un exercice d\u2019\u00E9tudiante isol\u00E9e \u2014 il s\u2019inscrit dans une tradition et un savoir-faire de 54 ans" }]));

children.push(spacer(100));
children.push(greenQuote("Je n\u2019aurais pas pu r\u00EAver meilleur lieu de stage. M\u00E9dia Animation m\u2019a donn\u00E9 ce que ni les outils IA ni les \u00E9tudes scientifiques ne pouvaient m\u2019offrir : le recul du temps long, la sagesse de ceux qui ont d\u00E9j\u00E0 vu le monde changer plusieurs fois, et la conviction que pour comprendre un courant, il faut parfois se tenir sur la rive."));

// ============================================================
// SECTION 21 — PROCHAINES ÉTAPES ET PERSPECTIVES
// ============================================================
children.push(spacer(200));
children.push(heading1("21. Prochaines étapes et perspectives"));

children.push(para("Cette section présente les axes de développement identifiés pour la suite du projet, ainsi que les arbitrages techniques et créatifs à opérer. Chaque point reflète un état de réflexion en cours — certains sont déjà en phase de test, d'autres nécessitent encore maturation."));

// 21.1 — Exploration de Marble (World Labs)
children.push(spacer(60));
children.push(heading2("21.1 Exploration de la plateforme Marble (World Labs)"));

children.push(richPara([
  { text: "Marble ", bold: true },
  { text: "(marble.worldlabs.ai) est une plateforme de génération d'environnements 3D par IA qui pourrait offrir une alternative intéressante pour la séquence narrative allant de " },
  { text: "l'évasion du Nexus jusqu'à l'arrivée au bunker de la Résistance", bold: true },
  { text: ". Cette partie du scénario implique des déplacements dans des environnements complexes mais ne nécessite pas nécessairement d'interaction fine avec les objets de l'environnement." }
]));

children.push(para("L'accès aux fonctionnalités d'export de Marble nécessite un abonnement payant (entre 30 et 40 €), mais la plateforme offre des crédits gratuits permettant une phase de test préalable. L'hypothèse de travail est la suivante :"));

children.push(richBullet([{ text: "Marble pourrait convenir : ", bold: true }, { text: "pour les environnements de traversée et de déplacement — les scènes atmosphériques où le joueur progresse dans l'espace sans manipuler d'objets spécifiques" }]));
children.push(richBullet([{ text: "Marble ne conviendra probablement pas : ", bold: true }, { text: "pour les pièces nécessitant une interaction réelle avec l'environnement (résolution d'épreuves, manipulation d'objets, déclenchement d'événements). La technologie génère des environnements visuellement impressionnants mais ne permet pas le niveau d'interactivité requis" }]));
children.push(richBullet([{ text: "Les pièces interactives : ", bold: true }, { text: "devront être réalisées via l'éditeur Three.js déjà développé, avec des objets modélisés individuellement en 3D ou récupérés sur des bibliothèques de ressources 3D gratuites et open source (licence CC BY-NC-SA). Chaque modèle devra être référencé comme source dans le projet" }]));

children.push(spacer(60));
children.push(greenQuote("L'intuition est que cette technologie est impressionnante mais limitée pour un usage interactif. Le test avec les crédits gratuits permettra de valider ou d'invalider cette hypothèse avant tout investissement supplémentaire."));

// 21.2 — Refonte du système de scoring
children.push(spacer(60));
children.push(heading2("21.2 Refonte du système de scoring"));

children.push(para("Le système de scoring actuel repose sur une accumulation de points sans signification narrative associée. Ce fonctionnement pose un problème de cohérence avec l'intention pédagogique du jeu : accumuler des points « vides de sens » reproduit précisément la logique de gamification que le jeu cherche à questionner."));

children.push(para("La réflexion en cours explore une refonte où les points porteraient une double signification :"));

children.push(richBullet([{ text: "Points de confiance : ", bold: true }, { text: "représentant la relation construite avec les membres de la Résistance — la création de liens humains authentiques, par opposition aux interactions algorithmiques du Nexus" }]));
children.push(richBullet([{ text: "Points de connaissance : ", bold: true }, { text: "représentant la compréhension progressive du système de contrôle piloté depuis les Arcanias — la prise de conscience du fonctionnement des mécanismes de manipulation" }]));

children.push(para("Le total des points représenterait ainsi la progression vers la connaissance — un parcours qui lie intrinsèquement la dimension relationnelle (faire confiance, créer des liens) à la dimension cognitive (comprendre le système). Cette dualité renforce le message central du jeu : la résistance à la manipulation ne se construit pas seul mais dans la relation à l'autre, et pas seulement par l'intellect mais aussi par l'affect."));

children.push(spacer(60));
children.push(greenQuote("Ce système est encore à l'état d'hypothèse et devra être mûri, testé et documenté. L'enjeu est de créer un scoring qui soit lui-même porteur de sens, en cohérence avec la philosophie du jeu."));

// 21.3 — Développement des épreuves
children.push(spacer(60));
children.push(heading2("21.3 Développement des épreuves"));

children.push(para("Chaque pièce du jeu contiendra une ou plusieurs épreuves à résoudre. Leur conception implique un travail de game design qui dépasse la simple implémentation technique :"));

children.push(richBullet([{ text: "Inventaire des éléments : ", bold: true }, { text: "lister pour chaque épreuve les objets nécessaires, les indices disponibles, les interactions possibles et les conditions de résolution" }]));
children.push(richBullet([{ text: "Arborescence des cas de figure : ", bold: true }, { text: "prévoir les différents chemins possibles — que se passe-t-il si le joueur essaie une approche inattendue, s'il manque un élément, s'il combine des objets dans un ordre différent ?" }]));
children.push(richBullet([{ text: "Répercussion sur le score : ", bold: true }, { text: "chaque épreuve devra impacter les deux axes du scoring (confiance et connaissance) de manière cohérente avec sa nature narrative" }]));
children.push(richBullet([{ text: "Possibilité d'échec et dosage de la frustration : ", bold: true }, { text: "question centrale — le joueur peut-il échouer à une épreuve ? Si oui, avec quelles conséquences ? Le niveau de frustration doit être suffisamment calibré pour maintenir l'attention et donner de la valeur à ce qui est gagné, sans provoquer l'abandon. Cet équilibre est un des défis majeurs du game design de serious games (Wouters et al., 2013)" }]));

// 21.4 — Refonte des dialogues
children.push(spacer(60));
children.push(heading2("21.4 Refonte complète des dialogues"));

children.push(para("La refonte du scénario implique une réécriture complète des dialogues pour les adapter à la nouvelle structure narrative. Deux pistes sont à explorer pour la restitution vocale :"));

children.push(richBullet([{ text: "Voix IA générées : ", bold: true }, { text: "rapidité de production, cohérence tonale, possibilité d'itérer facilement sur les textes — mais risque de « vallée de l'étrange » vocale et contradiction potentielle avec le message du jeu (utiliser des voix synthétiques dans un jeu qui questionne la déshumanisation par la technologie)" }]));
children.push(richBullet([{ text: "Voix humaines enregistrées : ", bold: true }, { text: "authenticité, chaleur, cohérence avec le propos du jeu — mais dépendance aux disponibilités des personnes ayant donné leur accord pour prêter leur voix aux personnages, et impossibilité de modifier facilement les textes après enregistrement" }]));

children.push(para("Le choix final dépendra du temps disponible, des disponibilités des volontaires, et d'un arbitrage éthique : dans un jeu sur la résistance à la déshumanisation technologique, le choix de voix humaines porte en lui-même une valeur symbolique forte."));

// 21.5 — Storyboard manuel
children.push(spacer(60));
children.push(heading2("21.5 Storyboard manuel pour les séquences vidéo"));

children.push(para("L'expérience acquise avec la génération de vidéos par IA (Sora, Runway, Kling) a mis en évidence la nécessité d'un storyboard manuel détaillé pour guider efficacement les outils de génération. Sans direction visuelle précise, les résultats sont trop aléatoires et le temps passé en itérations de prompt annule le gain de productivité."));

children.push(para("Le storyboard servira de document de référence pour :"));
children.push(bullet("Cadrer chaque plan (composition, angle, mouvement de caméra)"));
children.push(bullet("Définir l'ambiance visuelle (palette, éclairage, atmosphère)"));
children.push(bullet("Assurer la cohérence entre les séquences vidéo générées"));
children.push(bullet("Fournir des prompts visuels précis plutôt que des descriptions textuelles abstraites"));

// 21.6 — Pipeline locale de génération 3D
children.push(spacer(60));
children.push(heading2("21.6 Pipeline locale de génération 3D"));

children.push(para("En parallèle de l'utilisation de plateformes en ligne (Meshy AI, Tripo3D), une exploration est en cours pour installer et exploiter des modèles de génération image-to-3D directement en local. Cette approche présente des avantages et des contraintes spécifiques :"));

children.push(spacer(40));
children.push(makeTable(
  ["Critère", "Pipeline en ligne (Meshy, Tripo)", "Pipeline locale"],
  [
    ["Qualité des résultats", "Meshy offre actuellement les meilleurs résultats", "Variable selon le modèle et les paramètres"],
    ["Coût", "Abonnement payant, crédits limités", "Gratuit après installation (open source)"],
    ["Contrôle", "Limité aux paramètres exposés par la plateforme", "Contrôle fin sur l'ensemble du processus"],
    ["Temps de calcul", "Rapide (GPU serveur haute performance)", "Plus long (dépend de la carte graphique locale)"],
    ["Disponibilité", "Dépend de la connexion et du solde de crédits", "Disponible en permanence, sans limite"]
  ],
  [2200, 3700, 3460]
));

children.push(spacer(60));
children.push(para("La stratégie actuelle consiste à conserver les crédits Meshy pour les cas les plus exigeants — personnages manipulables et objets interactifs des épreuves — tout en utilisant la pipeline locale ou les alternatives gratuites pour les éléments d'environnement moins critiques. Les résultats insuffisants en local sont repassés sur Meshy en dernier recours."));

// 21.7 — Développement du personnage de Raya
children.push(spacer(60));
children.push(heading2("21.7 Développement du personnage de Raya"));

children.push(para("Le personnage de Raya est en cours de développement. Un enjeu majeur est la cohérence visuelle du personnage à travers les différents médiums utilisés dans le jeu :"));

children.push(richBullet([{ text: "Test de récurrence : ", bold: true }, { text: "vérifier que le personnage peut être reproduit de manière cohérente sur les différents outils d'IA image utilisés (Midjourney, Nano Banana Pro, etc.). Un personnage dont les caractéristiques seraient difficiles à reproduire poserait un problème de cohérence narrative majeur" }]));
children.push(richBullet([{ text: "Caractéristiques stables vs variables : ", bold: true }, { text: "identifier quels traits du personnage restent stables d'une génération à l'autre (silhouette, couleurs dominantes, éléments distinctifs) et lesquels varient trop pour être fiables" }]));
children.push(richBullet([{ text: "Transition 2D → 3D : ", bold: true }, { text: "s'assurer que le design de Raya se transpose correctement du visuel 2D (cutscenes vidéo) au modèle 3D (séquences interactives), en maintenant la reconnaissance du personnage malgré le changement de médium" }]));

children.push(spacer(100));
children.push(greenQuote("Ces prochaines étapes illustrent la nature itérative du projet : chaque avancée ouvre de nouvelles questions, chaque test valide ou invalide une hypothèse, chaque contrainte technique ou budgétaire force un arbitrage créatif. C'est dans cette tension permanente entre ambition et réalité que le projet se construit — exactement comme les outils IA eux-mêmes, qui exigent un dialogue constant entre ce qu'on imagine et ce qu'on obtient."));

// ============================================================
// FOOTER
// ============================================================
children.push(spacer(400));
children.push(separator());
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Document généré le 24 mars 2026 — Version 10", font: FONT, size: 18, italics: true, color: "999999" })]
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
          children: [new TextRun({ text: "RESISTANCE \u2014 Refonte sc\u00E9nario v2 \u2014 Document de travail", font: FONT, size: 16, italics: true, color: "999999" })]
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
  const outPath = "C:\\Users\\marie\\Desktop\\Resistance\\COMPTE-RENDU-REFONTE-SCENARIO-V2.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("Document v2 genere avec succes :", outPath);
  console.log("Taille :", (buffer.length / 1024).toFixed(1), "Ko");
  console.log("Sections : 21");
  console.log("Nouveautes v10 : section 21 Prochaines etapes (Marble, scoring, epreuves, dialogues, storyboard, pipeline locale, Raya)");
}).catch(err => {
  console.error("Erreur:", err);
});

#!/usr/bin/env node
/**
 * add-credit.js — Outil d'ajout automatique de credits au fichier credits.md
 *
 * Usage :
 *   node tools/add-credit.js <URL>
 *   node tools/add-credit.js                (mode interactif)
 *
 * L'outil :
 *  1. Recupere la page web et extrait les metadonnees (titre, auteur, licence, etc.)
 *  2. Affiche ce qu'il a trouve
 *  3. Demande les informations manquantes
 *  4. Ajoute l'entree formatee dans credits.md
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CREDITS_FILE = path.join(__dirname, '..', 'credits.md');

// ══════════════════════════════════════
//  EXTRACTION METADONNEES
// ══════════════════════════════════════

async function fetchPageMetadata(url) {
    const meta = {
        titre: '',
        auteur: '',
        urlSource: url,
        profilAuteur: '',
        licence: '',
        conditionsLicence: '',
        dateAcces: new Date().toISOString().split('T')[0],
        usage: ''
    };

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            console.log(`\x1b[33m⚠ Impossible de charger la page (HTTP ${response.status})\x1b[0m`);
            return meta;
        }

        const html = await response.text();

        // Titre
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) meta.titre = decodeEntities(titleMatch[1].trim());

        // og:title (souvent plus propre)
        const ogTitle = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i);
        if (ogTitle) meta.titre = decodeEntities(ogTitle[1].trim());

        // Auteur — plusieurs strategies
        const authorMeta = html.match(/<meta\s+(?:name|property)=["'](?:author|article:author|dc\.creator)["']\s+content=["']([^"']+)["']/i);
        if (authorMeta) meta.auteur = decodeEntities(authorMeta[1].trim());

        // Schema.org author
        if (!meta.auteur) {
            const schemaAuthor = html.match(/"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i);
            if (schemaAuthor) meta.auteur = schemaAuthor[1].trim();
        }

        // Licence
        const licenseMeta = html.match(/<meta\s+(?:name|property)=["'](?:dc\.rights|copyright)["']\s+content=["']([^"']+)["']/i);
        if (licenseMeta) meta.licence = decodeEntities(licenseMeta[1].trim());

        // Creative Commons dans les liens
        const ccLink = html.match(/href=["'](https?:\/\/creativecommons\.org\/licenses\/[^"']+)["']/i);
        if (ccLink) {
            meta.conditionsLicence = ccLink[1];
            const ccType = ccLink[1].match(/licenses\/([^/]+)/);
            if (ccType) meta.licence = 'Creative Commons ' + ccType[1].toUpperCase();
        }

        // Profil auteur — detecter selon le site
        const domain = new URL(url).hostname;

        if (domain.includes('freepik.com')) {
            const authorLink = html.match(/href=["'](\/author\/[^"']+)["']/i);
            if (authorLink) meta.profilAuteur = 'https://www.freepik.com' + authorLink[1];
        }
        if (domain.includes('vectorstock.com')) {
            const authorLink = html.match(/href=["'](\/royalty-free-vectors\/vectors-by_[^"']+)["']/i);
            if (authorLink) meta.profilAuteur = 'https://www.vectorstock.com' + authorLink[1];
        }
        if (domain.includes('sketchfab.com')) {
            const authorLink = html.match(/"url"\s*:\s*"(https:\/\/sketchfab\.com\/[^"]+)"/i);
            if (authorLink) meta.profilAuteur = authorLink[1];
        }
        if (domain.includes('mixamo.com')) {
            meta.auteur = meta.auteur || 'Adobe Mixamo';
            meta.profilAuteur = 'https://www.mixamo.com';
        }
        if (domain.includes('meshy.ai')) {
            meta.auteur = meta.auteur || 'Meshy AI';
        }
        if (domain.includes('polyhaven.com')) {
            const authorTag = html.match(/by\s+<a[^>]+>([^<]+)<\/a>/i);
            if (authorTag) meta.auteur = authorTag[1].trim();
            meta.licence = meta.licence || 'CC0 1.0 (Domaine public)';
        }
        if (domain.includes('turbosquid.com')) {
            const authorTag = html.match(/by\s+<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i);
            if (authorTag) {
                meta.profilAuteur = authorTag[1];
                meta.auteur = authorTag[2].trim();
            }
        }
        if (domain.includes('fontawesome.com') || domain.includes('fonts.google.com')) {
            meta.licence = meta.licence || 'Open Font License / MIT';
        }

        // og:image pour description supplementaire
        const ogDesc = html.match(/<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']+)["']/i);
        if (ogDesc && !meta.titre) meta.titre = decodeEntities(ogDesc[1].trim());

    } catch (err) {
        if (err.name === 'TimeoutError') {
            console.log('\x1b[33m⚠ Timeout — la page met trop de temps a repondre\x1b[0m');
        } else {
            console.log(`\x1b[33m⚠ Erreur de recuperation: ${err.message}\x1b[0m`);
        }
    }

    return meta;
}

function decodeEntities(str) {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

// ══════════════════════════════════════
//  INTERFACE INTERACTIVE
// ══════════════════════════════════════

function createRL() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

function ask(rl, question, defaultVal) {
    const suffix = defaultVal ? ` \x1b[90m[${defaultVal}]\x1b[0m` : '';
    return new Promise(resolve => {
        rl.question(`  ${question}${suffix}: `, answer => {
            const val = answer.trim();
            if (val === '/') resolve('Introuvable');
            else resolve(val || defaultVal || '');
        });
    });
}

const CATEGORIES = [
    'Ressources visuelles',
    'Bibliotheques et frameworks',
    'Modeles 3D',
    'Audio / Musique',
    'Polices de caracteres',
    'Autre'
];

async function collectCredits(url) {
    console.log('\n\x1b[36m══════════════════════════════════════\x1b[0m');
    console.log('\x1b[36m  COLLECTEUR DE CREDITS — Resistance\x1b[0m');
    console.log('\x1b[36m══════════════════════════════════════\x1b[0m\n');

    const rl = createRL();

    // Etape 1: URL
    if (!url) {
        url = await ask(rl, '\x1b[1mURL de la ressource\x1b[0m');
        if (!url) {
            console.log('\x1b[31m✕ URL obligatoire. Abandon.\x1b[0m');
            rl.close();
            return;
        }
    }

    console.log(`\n\x1b[90m  Analyse de ${url}...\x1b[0m\n`);

    // Etape 2: Extraction automatique
    const meta = await fetchPageMetadata(url);

    // Etape 3: Afficher ce qui a ete trouve
    console.log('\x1b[32m  ✓ Informations extraites automatiquement :\x1b[0m');
    const fields = [
        ['Titre', 'titre'],
        ['Auteur', 'auteur'],
        ['URL source', 'urlSource'],
        ['Profil auteur', 'profilAuteur'],
        ['Licence', 'licence'],
        ['Conditions licence', 'conditionsLicence'],
        ['Date d\'acces', 'dateAcces'],
    ];

    for (const [label, key] of fields) {
        const val = meta[key];
        const icon = val ? '\x1b[32m✓\x1b[0m' : '\x1b[33m?\x1b[0m';
        const display = val || '\x1b[33m(manquant)\x1b[0m';
        console.log(`    ${icon} ${label}: ${display}`);
    }

    // Etape 4: Demander les infos manquantes ou permettre correction
    console.log('\n\x1b[1m  Completez ou corrigez (Entree = garder, / = introuvable) :\x1b[0m\n');

    meta.titre = await ask(rl, 'Titre', meta.titre);
    meta.auteur = await ask(rl, 'Auteur', meta.auteur);
    meta.profilAuteur = await ask(rl, 'Profil auteur (URL)', meta.profilAuteur);
    meta.licence = await ask(rl, 'Licence', meta.licence);
    meta.conditionsLicence = await ask(rl, 'URL conditions licence', meta.conditionsLicence);
    meta.usage = await ask(rl, 'Usage dans le projet');

    // Etape 5: Categorie
    console.log('\n\x1b[1m  Categorie :\x1b[0m');
    CATEGORIES.forEach((c, i) => console.log(`    ${i + 1}. ${c}`));
    const catChoice = await ask(rl, 'Choix (numero)', '1');
    const category = CATEGORIES[parseInt(catChoice) - 1] || CATEGORIES[0];

    rl.close();

    // Etape 6: Generer le markdown
    const entryNumber = getNextEntryNumber(category);
    const markdown = generateMarkdown(meta, entryNumber);

    // Etape 7: Inserer dans credits.md
    insertIntoCredits(category, markdown);

    console.log('\n\x1b[32m  ✓ Credit ajoute avec succes dans credits.md !\x1b[0m');
    console.log(`\x1b[32m    Categorie: ${category}\x1b[0m`);
    console.log(`\x1b[32m    Titre: ${meta.titre}\x1b[0m`);
    console.log(`\x1b[32m    Auteur: ${meta.auteur}\x1b[0m\n`);
}

// ══════════════════════════════════════
//  GENERATION MARKDOWN
// ══════════════════════════════════════

function generateMarkdown(meta, num) {
    let md = `### ${num}. ${meta.titre}\n\n`;
    md += `| Champ | Valeur |\n`;
    md += `|-------|--------|\n`;
    md += `| **Titre** | ${meta.titre} |\n`;
    md += `| **Auteur** | ${meta.auteur} |\n`;
    md += `| **URL source** | ${meta.urlSource} |\n`;
    if (meta.profilAuteur && meta.profilAuteur !== 'Introuvable') {
        md += `| **Profil auteur** | ${meta.profilAuteur} |\n`;
    }
    md += `| **Licence** | ${meta.licence} |\n`;
    if (meta.conditionsLicence && meta.conditionsLicence !== 'Introuvable') {
        md += `| **Conditions licence** | ${meta.conditionsLicence} |\n`;
    }
    md += `| **Date d'acces** | ${meta.dateAcces} |\n`;
    if (meta.usage) {
        md += `| **Usage dans le projet** | ${meta.usage} |\n`;
    }
    return md;
}

function getNextEntryNumber(category) {
    if (!fs.existsSync(CREDITS_FILE)) return 1;
    const content = fs.readFileSync(CREDITS_FILE, 'utf-8');

    // Trouver la section de la categorie
    const sectionRegex = new RegExp(`## ${escapeRegex(category)}([\\s\\S]*?)(?=\\n## |$)`);
    const match = content.match(sectionRegex);
    if (!match) return 1;

    // Compter les ### dans cette section
    const entries = match[1].match(/^### \d+\./gm);
    return entries ? entries.length + 1 : 1;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
}

// ══════════════════════════════════════
//  INSERTION DANS CREDITS.MD
// ══════════════════════════════════════

function insertIntoCredits(category, markdown) {
    // Creer le fichier si il n'existe pas
    if (!fs.existsSync(CREDITS_FILE)) {
        const initial = `# Credits — Resistance (TFE)\n\nFichier de references pour l'attribution des ressources utilisees dans le projet.\n\n---\n\n`;
        const sections = CATEGORIES.map(c => `## ${c}\n\n*(a completer)*\n`).join('\n---\n\n');
        fs.writeFileSync(CREDITS_FILE, initial + sections, 'utf-8');
    }

    let content = fs.readFileSync(CREDITS_FILE, 'utf-8');

    // Trouver la section
    const sectionHeader = `## ${category}`;
    const sectionIndex = content.indexOf(sectionHeader);

    if (sectionIndex === -1) {
        // Ajouter la section a la fin
        content += `\n---\n\n${sectionHeader}\n\n${markdown}\n`;
    } else {
        // Trouver la fin de la section (prochain ## ou fin de fichier)
        const afterHeader = sectionIndex + sectionHeader.length;
        const nextSection = content.indexOf('\n## ', afterHeader);
        const sectionEnd = nextSection !== -1 ? nextSection : content.length;

        // Extraire le contenu de la section
        let sectionContent = content.substring(afterHeader, sectionEnd);

        // Supprimer le placeholder "(a completer)" si present
        sectionContent = sectionContent.replace(/\n\*\(a completer\)\*\n?/, '\n');

        // Ajouter la nouvelle entree
        sectionContent = sectionContent.trimEnd() + '\n\n' + markdown + '\n';

        // Reconstruire
        content = content.substring(0, afterHeader) + sectionContent + content.substring(sectionEnd);
    }

    // Nettoyer les sauts de ligne excessifs
    content = content.replace(/\n{4,}/g, '\n\n\n');

    fs.writeFileSync(CREDITS_FILE, content, 'utf-8');
}

// ══════════════════════════════════════
//  MAIN
// ══════════════════════════════════════

const urlArg = process.argv[2];
collectCredits(urlArg).catch(err => {
    console.error('\x1b[31mErreur:', err.message, '\x1b[0m');
    process.exit(1);
});

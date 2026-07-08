/**
 * ============================================================
 * RESISTANCE — editor/editor-budget.js
 * E2.4 : jauge de poids réelle de la pièce (objets/personnages
 * importés + sons), remplace le placeholder statique du rail.
 * Poids approximé depuis les chaînes base64 déjà en mémoire
 * (userData.fileData / track.dataURL) — pas de nouveau champ à
 * sérialiser, donc aucun risque sur le format de sauvegarde.
 * Les textures de murs/sol/plafond ne sont pas comptées ici
 * (registre live non trivial à parcourir) — limite connue.
 * ============================================================
 */

const ROOM_WEIGHT_BUDGET_BYTES = 3 * 1024 * 1024; // 3,0 Mo — seuil indicatif

function approxBytesFromDataURL(dataURL) {
    if (!dataURL || typeof dataURL !== 'string') return 0;
    const comma = dataURL.indexOf(',');
    const b64 = comma >= 0 ? dataURL.slice(comma + 1) : dataURL;
    return Math.round(b64.length * 0.75);
}

function formatMo(bytes) {
    return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',');
}

// Calcule le poids de la pièce ouverte à partir de l'état vivant de l'éditeur.
function computeRoomWeightBreakdown() {
    const items = [];

    (typeof importedObjects !== 'undefined' ? importedObjects : []).forEach(obj => {
        const bytes = approxBytesFromDataURL(obj.userData && obj.userData.fileData);
        if (bytes > 0) items.push({ name: obj.userData.editorName || obj.name || 'Objet', bytes: bytes });
    });
    (typeof importedCharacters !== 'undefined' ? importedCharacters : []).forEach(obj => {
        const bytes = approxBytesFromDataURL(obj.userData && obj.userData.fileData);
        if (bytes > 0) items.push({ name: obj.userData.editorName || obj.name || 'Personnage', bytes: bytes });
    });
    if (typeof audioTracks !== 'undefined') {
        ['musique', 'ambiance', 'bruitage', 'mouvement'].forEach(cat => {
            (audioTracks[cat] || []).forEach(track => {
                const bytes = approxBytesFromDataURL(track.dataURL);
                if (bytes > 0) items.push({ name: track.name || 'Son', bytes: bytes });
            });
        });
    }

    items.sort((a, b) => b.bytes - a.bytes);
    const totalBytes = items.reduce((sum, it) => sum + it.bytes, 0);
    return { totalBytes, items };
}

function updateBudgetGauge() {
    const fill = document.getElementById('es-bfill');
    const val = document.getElementById('es-budget-val');
    const pop = document.getElementById('es-budget-pop');
    if (!fill || !val) return;

    const { totalBytes, items } = computeRoomWeightBreakdown();
    const pct = Math.min(100, (totalBytes / ROOM_WEIGHT_BUDGET_BYTES) * 100);

    // Seuils alignés sur le dégradé décoratif de .es-btrack (0-55 / 55-82 / 82-100).
    let color = 'var(--es-acc)';
    let heavy = false;
    if (pct > 82) { color = 'var(--es-danger)'; heavy = true; }
    else if (pct > 55) { color = 'var(--es-warn)'; }

    fill.style.width = pct.toFixed(0) + '%';
    fill.style.background = color;
    val.textContent = formatMo(totalBytes) + ' / ' + formatMo(ROOM_WEIGHT_BUDGET_BYTES) + ' Mo';
    val.style.color = color;

    const budgetEl = document.getElementById('es-budget');
    if (budgetEl) {
        budgetEl.classList.toggle('es-budget-heavy', heavy);
        budgetEl.title = heavy
            ? 'Salle lourde — clique pour voir les fichiers les plus volumineux'
            : 'Poids de la pièce (objets, personnages, sons importés)';
    }

    if (pop) {
        if (!heavy) pop.classList.remove('show');
        const list = document.getElementById('es-budget-pop-list');
        if (list) {
            list.innerHTML = '';
            items.slice(0, 3).forEach(it => {
                const row = document.createElement('div');
                row.className = 'es-budget-heavy-row';
                const n = document.createElement('span');
                n.textContent = it.name;
                const s = document.createElement('span');
                s.textContent = formatMo(it.bytes) + ' Mo';
                row.appendChild(n);
                row.appendChild(s);
                list.appendChild(row);
            });
        }
    }
}

function setupBudgetGauge() {
    const budgetEl = document.getElementById('es-budget');
    const pop = document.getElementById('es-budget-pop');
    if (budgetEl && pop) {
        budgetEl.addEventListener('click', function() {
            if (!budgetEl.classList.contains('es-budget-heavy')) return;
            pop.classList.toggle('show');
        });
    }
    updateBudgetGauge();
    // Filet de rattrapage : recalcule périodiquement pour refléter les imports/
    // suppressions sans avoir à instrumenter chaque point de mutation.
    setInterval(updateBudgetGauge, 4000);
}

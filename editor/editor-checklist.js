/**
 * ============================================================
 * RESISTANCE — editor/editor-checklist.js
 * Checklist de publication (E1) : zones cassées (liens/vidéos/images
 * locaux introuvables), blobs orphelins (texture/son/GLB référencés
 * mais absents de IndexedDB), objets sous le sol.
 * ------------------------------------------------------------
 * Lit le dernier état SAUVEGARDÉ de la salle (IndexedDB), pas la
 * scène live — cohérent avec ce que generateSceneDataDownload()
 * exporte réellement : sauvegarder avant de vérifier.
 * ============================================================
 */

async function runPublishChecklist() {
    let overlay = document.getElementById('checklist-overlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'checklist-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);';
    overlay.innerHTML = `
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:14px;padding:24px 28px;max-width:520px;width:90%;max-height:75vh;overflow-y:auto;">
            <h2 style="color:#00E5FF;font-size:20px;margin:0 0 4px 0;">Vérification avant publication</h2>
            <p id="checklist-status" style="color:#888;font-size:12px;margin:0 0 16px 0;">Analyse en cours...</p>
            <div id="checklist-results"></div>
            <button class="room-card-btn" style="width:100%;margin-top:12px;background:#333;color:#aaa;" onclick="document.getElementById('checklist-overlay').remove()">Fermer</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const statusEl = document.getElementById('checklist-status');
    const resultsEl = document.getElementById('checklist-results');

    let projectData;
    try {
        projectData = await RoomEditorDB.get(RoomEditorDB.STORE_PROJECTS, 'project_' + currentRoomName);
    } catch (e) {
        statusEl.textContent = '❌ Erreur de lecture — voir la console.';
        console.error('Checklist: erreur lecture IndexedDB', e);
        return;
    }
    if (!projectData) {
        statusEl.textContent = "⚠️ Aucun projet sauvegardé pour cette salle — sauvegardez d'abord.";
        return;
    }

    const problemes = [];

    // 1. Zones cassées : liens/vidéos/images LOCAUX (pas http/https, non
    // vérifiables sans risque CORS) dont la ressource répond en erreur.
    const zonesAVerifier = (projectData.interactionZones || []).filter(z =>
        ['link', 'video', 'lightbox-image'].indexOf(z.actionType) !== -1 && z.actionValue
        && !/^https?:\/\//i.test(z.actionValue)
    );
    for (const zone of zonesAVerifier) {
        const label = zone.customName || `zone #${zone.id}`;
        try {
            const resp = await fetch(zone.actionValue, { method: 'HEAD' });
            if (!resp.ok) {
                problemes.push({ gravite: 'erreur', texte: `Zone « ${label} » : « ${zone.actionValue} » introuvable (HTTP ${resp.status})` });
            }
        } catch (e) {
            problemes.push({ gravite: 'erreur', texte: `Zone « ${label} » : « ${zone.actionValue} » — impossible à vérifier (${e.message})` });
        }
    }

    // 2. Blobs orphelins : référencés par murs/dalles/objets/audio mais
    // absents de IndexedDB (texture, son ou modèle 3D qui apparaîtrait cassé).
    const blobIds = new Set();
    (projectData.walls || []).forEach(w => {
        if (w.textureInfo) {
            Object.keys(w.textureInfo).forEach(faceIdx => {
                const info = w.textureInfo[faceIdx];
                if (info && info.textureBlobId) blobIds.add(info.textureBlobId);
            });
        }
    });
    ['floorTiles', 'ceilingTiles', 'floorPolygons', 'ceilingPolygons'].forEach(key => {
        (projectData[key] || []).forEach(t => { if (t.textureBlobId) blobIds.add(t.textureBlobId); });
    });
    (projectData.importedObjects || []).forEach(o => { if (o.fileDataBlobId) blobIds.add(o.fileDataBlobId); });
    (projectData.audioTracks || []).forEach(t => { if (t.blobId) blobIds.add(t.blobId); });

    for (const blobId of blobIds) {
        let record = null;
        try { record = await RoomEditorDB.get(RoomEditorDB.STORE_BLOBS, blobId); } catch (e) { /* traité comme absent */ }
        if (!record) {
            problemes.push({ gravite: 'erreur', texte: `Blob manquant : ${blobId} (une texture, un son ou un modèle 3D apparaîtra cassé)` });
        }
    }

    // 3. Objets sous le sol (position.y anormalement basse)
    const SEUIL_SOL = -0.3;
    (projectData.importedObjects || []).forEach(o => {
        if (o.position && typeof o.position.y === 'number' && o.position.y < SEUIL_SOL) {
            const nom = o.editorName || o.fileName || 'Objet';
            problemes.push({ gravite: 'avertissement', texte: `« ${nom} » semble sous le sol (y = ${o.position.y.toFixed(2)})` });
        }
    });

    // Affichage
    if (problemes.length === 0) {
        statusEl.textContent = '✅ Aucun problème détecté.';
        resultsEl.innerHTML = '<p style="color:#7CFC9B;font-size:13px;">La salle semble prête à être publiée.</p>';
        return;
    }
    const nbErreurs = problemes.filter(p => p.gravite === 'erreur').length;
    const nbAvert = problemes.filter(p => p.gravite === 'avertissement').length;
    statusEl.textContent = `${nbErreurs} erreur(s), ${nbAvert} avertissement(s)`;
    resultsEl.innerHTML = problemes.map(p => `
        <div style="background:#222;border-left:3px solid ${p.gravite === 'erreur' ? '#ff4444' : '#ffaa00'};border-radius:4px;padding:8px 12px;margin-bottom:6px;font-size:12px;color:#ddd;">
            ${p.gravite === 'erreur' ? '❌' : '⚠️'} ${p.texte}
        </div>
    `).join('');
}

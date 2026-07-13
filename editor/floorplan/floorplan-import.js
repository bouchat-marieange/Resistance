/**
 * ============================================================
 * RESISTANCE — editor/floorplan/floorplan-import.js
 * Import de plan depuis un fichier SVG
 * ------------------------------------------------------------
 * Découpage mécanique de l'ancien editor-floorplan.js (E0-bis,
 * 07/2026), même méthode que game/engine/ (Phase 4) : frontières
 * de sections existantes, globales/fonctions inchangées.
 * ============================================================
 */

// ==================== IMPORT SVG ====================

let currentSVGData = null; // Données SVG chargées

function handleSVGFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.svg')) {
        alert('⚠️ Veuillez sélectionner un fichier SVG');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const svgContent = e.target.result;
        parseSVGContent(svgContent);
    };
    reader.readAsText(file);
}

function parseSVGContent(svgContent) {
    try {
        // Parser le SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');

        if (!svgElement) {
            alert('⚠️ Fichier SVG invalide');
            return;
        }

        // Extraire les paths du SVG
        const paths = svgElement.querySelectorAll('path, polyline, polygon, rect, line');

        if (paths.length === 0) {
            alert('⚠️ Aucun tracé trouvé dans le SVG');
            return;
        }

        // Stocker les données SVG
        currentSVGData = {
            svgElement: svgElement,
            paths: Array.from(paths)
        };

        // Afficher l'aperçu — SÉCURITÉ : le SVG importé est du contenu non fiable.
        // On ne l'insère JAMAIS dans le DOM vivant (un gestionnaire inline type
        // onload/onbegin/onerror ou une balise <script>/<animate> s'y exécuterait).
        // On le rend via un <img> : dans ce contexte le navigateur désactive scripts,
        // ressources externes et gestionnaires d'événements. L'extraction géométrique
        // (extractPointsFromSVG) continue de lire le DOM détaché, sans danger.
        const previewContainer = document.getElementById('svg-preview-container');
        const preview = document.getElementById('svg-preview');

        preview.innerHTML = '';
        const previewImg = document.createElement('img');
        previewImg.alt = 'Aperçu du plan importé';
        previewImg.style.width = '100%';
        previewImg.style.height = 'auto';
        previewImg.style.maxHeight = '200px';
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
        const blobUrl = URL.createObjectURL(svgBlob);
        previewImg.onload = previewImg.onerror = function() { URL.revokeObjectURL(blobUrl); };
        previewImg.src = blobUrl;
        preview.appendChild(previewImg);

        previewContainer.style.display = 'block';

        console.log(`📄 SVG chargé: ${paths.length} tracé(s) trouvé(s)`);
    } catch (error) {
        console.error('Erreur lors du parsing SVG:', error);
        alert('⚠️ Erreur lors de la lecture du fichier SVG');
    }
}

function updateSVGPreview() {
    // Cette fonction pourrait être utilisée pour mettre à jour l'aperçu avec l'échelle
    console.log('Échelle SVG mise à jour');
}

function generateWallsFromSVG() {
    if (!currentSVGData) {
        alert('⚠️ Veuillez d\'abord importer un fichier SVG');
        return;
    }

    // Effacer les points existants
    clearFloorPlan();

    // Récupérer les paramètres
    const scale = parseFloat(document.getElementById('svg-scale').value);
    const svgWallHeight = parseFloat(document.getElementById('svg-wall-height').value);

    // Convertir les paths SVG en points
    const points = extractPointsFromSVG(currentSVGData, scale);

    if (points.length < 3) {
        alert('⚠️ Impossible d\'extraire suffisamment de points du SVG');
        return;
    }

    // Créer les points du plan
    points.forEach(point => {
        addFloorPlanPoint(point.x, point.z);
    });

    // Mettre à jour la hauteur des murs
    wallHeight = svgWallHeight;
    document.getElementById('wall-height').value = wallHeight;
    document.getElementById('wall-height-value').textContent = Math.round(wallHeight * 100);

    // Générer les murs
    generateWallsFromPlan();

    console.log(`✅ Plan SVG converti en 3D: ${points.length} points`);
}

function extractPointsFromSVG(svgData, scale) {
    const points = [];
    const viewBox = svgData.svgElement.getAttribute('viewBox');
    let offsetX = 0, offsetY = 0;

    if (viewBox) {
        const [x, y, width, height] = viewBox.split(' ').map(Number);
        offsetX = -x - width / 2;
        offsetY = -y - height / 2;
    }

    svgData.paths.forEach(path => {
        const tagName = path.tagName.toLowerCase();

        if (tagName === 'path') {
            const d = path.getAttribute('d');
            const pathPoints = parseSVGPath(d);
            pathPoints.forEach(p => {
                points.push({
                    x: (p.x + offsetX) * scale,
                    z: (p.y + offsetY) * scale
                });
            });
        } else if (tagName === 'rect') {
            const x = parseFloat(path.getAttribute('x') || 0);
            const y = parseFloat(path.getAttribute('y') || 0);
            const width = parseFloat(path.getAttribute('width') || 0);
            const height = parseFloat(path.getAttribute('height') || 0);

            points.push(
                { x: (x + offsetX) * scale, z: (y + offsetY) * scale },
                { x: (x + width + offsetX) * scale, z: (y + offsetY) * scale },
                { x: (x + width + offsetX) * scale, z: (y + height + offsetY) * scale },
                { x: (x + offsetX) * scale, z: (y + height + offsetY) * scale }
            );
        } else if (tagName === 'polygon' || tagName === 'polyline') {
            const pointsAttr = path.getAttribute('points');
            const coords = pointsAttr.trim().split(/[\s,]+/);

            for (let i = 0; i < coords.length; i += 2) {
                points.push({
                    x: (parseFloat(coords[i]) + offsetX) * scale,
                    z: (parseFloat(coords[i + 1]) + offsetY) * scale
                });
            }
        } else if (tagName === 'line') {
            const x1 = parseFloat(path.getAttribute('x1') || 0);
            const y1 = parseFloat(path.getAttribute('y1') || 0);
            const x2 = parseFloat(path.getAttribute('x2') || 0);
            const y2 = parseFloat(path.getAttribute('y2') || 0);

            points.push(
                { x: (x1 + offsetX) * scale, z: (y1 + offsetY) * scale },
                { x: (x2 + offsetX) * scale, z: (y2 + offsetY) * scale }
            );
        }
    });

    return points;
}

function parseSVGPath(d) {
    const points = [];
    const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);

    let currentX = 0, currentY = 0;

    commands.forEach(cmd => {
        const type = cmd[0];
        const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

        switch (type) {
            case 'M': // Move to (absolute)
                currentX = coords[0];
                currentY = coords[1];
                points.push({ x: currentX, y: currentY });
                break;
            case 'm': // Move to (relative)
                currentX += coords[0];
                currentY += coords[1];
                points.push({ x: currentX, y: currentY });
                break;
            case 'L': // Line to (absolute)
                for (let i = 0; i < coords.length; i += 2) {
                    currentX = coords[i];
                    currentY = coords[i + 1];
                    points.push({ x: currentX, y: currentY });
                }
                break;
            case 'l': // Line to (relative)
                for (let i = 0; i < coords.length; i += 2) {
                    currentX += coords[i];
                    currentY += coords[i + 1];
                    points.push({ x: currentX, y: currentY });
                }
                break;
            case 'H': // Horizontal line (absolute)
                currentX = coords[0];
                points.push({ x: currentX, y: currentY });
                break;
            case 'h': // Horizontal line (relative)
                currentX += coords[0];
                points.push({ x: currentX, y: currentY });
                break;
            case 'V': // Vertical line (absolute)
                currentY = coords[0];
                points.push({ x: currentX, y: currentY });
                break;
            case 'v': // Vertical line (relative)
                currentY += coords[0];
                points.push({ x: currentX, y: currentY });
                break;
            // Pour les courbes, on pourrait les approximer avec des segments
            case 'Z':
            case 'z':
                // Close path - ne rien faire, la boucle sera fermée automatiquement
                break;
        }
    });

    return points;
}


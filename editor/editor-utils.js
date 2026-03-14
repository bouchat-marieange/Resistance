
// Debounce pour updateObjectsList (évite les appels répétés lors du chargement)
var _updateObjectsListTimer = null;
function scheduleUpdateObjectsList() {
    if (_updateObjectsListTimer) clearTimeout(_updateObjectsListTimer);
    _updateObjectsListTimer = setTimeout(() => {
        updateObjectsList();
        _updateObjectsListTimer = null;
    }, 300);
}

/**
 * Mesure la hauteur visuelle d'un personnage 3D en utilisant les positions mondiales des os (bones).
 * Box3.setFromObject() ne capture PAS les transformations du squelette (skinning)
 * car celles-ci sont appliquées uniquement dans le shader GPU.
 * Les positions mondiales des os incluent TOUTES les transformations parentes (y compris l'Armature scale).
 * @param {THREE.Object3D} model - Le modèle 3D à mesurer
 * @returns {{ height: number, width: number, depth: number, method: string } | null}
 */
function measureCharacterByBones(model) {
    model.updateMatrixWorld(true);

    // Forcer la mise à jour du squelette
    model.traverse(child => {
        if (child.isSkinnedMesh && child.skeleton) {
            child.skeleton.update();
        }
    });

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let boneCount = 0;
    const worldPos = new THREE.Vector3();

    model.traverse(child => {
        if (child.isBone) {
            child.getWorldPosition(worldPos);
            if (worldPos.x < minX) minX = worldPos.x;
            if (worldPos.x > maxX) maxX = worldPos.x;
            if (worldPos.y < minY) minY = worldPos.y;
            if (worldPos.y > maxY) maxY = worldPos.y;
            if (worldPos.z < minZ) minZ = worldPos.z;
            if (worldPos.z > maxZ) maxZ = worldPos.z;
            boneCount++;
        }
    });

    if (boneCount >= 5 && maxY > minY) {
        const boneHeight = (maxY - minY) * 1.10;
        const boneWidth = Math.max((maxX - minX) * 1.15, boneHeight * 0.25);
        const boneDepth = Math.max((maxZ - minZ) * 1.15, boneHeight * 0.15);
        return { height: boneHeight, width: boneWidth, depth: boneDepth, method: 'bones', boneCount };
    }

    return null;
}

// Initialiser les accordéons au chargement
function initAccordions() {
    const accordions = document.querySelectorAll('.editor-accordion');
    accordions.forEach(accordion => {
        const header = accordion.querySelector('.editor-accordion-header');
        const content = accordion.querySelector('.editor-accordion-content');
        const arrow = header?.querySelector('.accordion-arrow');

        if (content && arrow) {
            // Par défaut, fermé
            content.style.display = 'none';
            arrow.textContent = '▸';
        }
    });
}

// Masquer l'écran de chargement avec animation
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    // Passer la barre à 100%
    const bar = document.getElementById('loading-bar');
    if (bar) {
        bar.style.animation = 'none';
        bar.style.width = '100%';
    }

    // Pause brève pour montrer 100%, puis fondu
    setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        // Retirer du DOM après le fondu
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            loadingScreenDismissed = true;
            // Démarrer l'audio de jeu APRÈS disparition de l'écran de chargement
            if (interactionMode === 'game') {
                startGameAudio();
            }
        }, 600); // Correspond à la durée de transition CSS
    }, 400);
}

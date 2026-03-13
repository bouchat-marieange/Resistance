
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

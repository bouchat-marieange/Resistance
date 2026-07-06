/**
 * ============================================================
 * RESISTANCE — game/core/page-boot.js
 * Amorçage commun des pages de jeu.
 * Dépend de : game/core/profiles.js (à charger avant).
 * ============================================================
 * Remplace l'extrait inline identique copié dans 6 pages :
 * enregistre la page courante comme point de reprise du
 * profil actif (bouton « Reprendre » d'index.html).
 */

(function() {
    if (window.ResProfiles) ResProfiles.rememberCurrentRoom();
    // Plein écran automatique (tentative immédiate, sinon premier geste)
    if (window.ResVideoGate) ResVideoGate.autoFullscreen();
})();

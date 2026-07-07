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
    // Plein écran : plus d'automatisme ici — l'API Fullscreen JS étant liée
    // au document, elle « sautait » à chaque navigation. Le joueur est invité
    // à passer en F11 (plein écran fenêtre, persistant) sur l'écran de
    // connexion via ResVideoGate.fullscreenInvite().
})();

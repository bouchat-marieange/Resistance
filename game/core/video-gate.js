/**
 * ============================================================
 * RESISTANCE — game/core/video-gate.js
 * Primitives partagées pour les overlays vidéo (intro,
 * transitions, futures vidéos des 12 personnages).
 * Dépend de : rien.
 * ============================================================
 * Remplace doRequestFS() et le chargement de l'API YouTube
 * dupliqués dans index.html et test-blackbox.html.
 */

var ResVideoGate = (function() {
    var _ytApiDemandee = false;

    /** Passe un élément en plein écran (préfixes navigateurs inclus). */
    function requestFullscreen(el) {
        var fn = el.requestFullscreen || el.webkitRequestFullscreen
            || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (fn) fn.call(el);
    }

    /**
     * Injecte l'API iframe YouTube (une seule fois, même si plusieurs
     * appels). Le callback global onYouTubeIframeAPIReady reste à
     * définir par la page appelante.
     */
    function loadYouTubeAPI() {
        if (_ytApiDemandee) return;
        _ytApiDemandee = true;
        var s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
    }

    return {
        requestFullscreen: requestFullscreen,
        loadYouTubeAPI: loadYouTubeAPI
    };
})();

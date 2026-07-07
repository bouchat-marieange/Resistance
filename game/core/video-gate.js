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

    /** La fenêtre occupe-t-elle tout l'écran (plein écran F11 ou API) ? */
    function _fenetrePleinEcran() {
        return window.innerWidth >= screen.width - 2
            && window.innerHeight >= screen.height - 2;
    }

    /**
     * Invitation au plein écran F11, affichée AVANT la connexion.
     *
     * Pourquoi F11 et pas l'API Fullscreen JavaScript : l'API est liée au
     * document — chaque navigation entre pages fait sortir du plein écran
     * (effet de « saut » anti-immersif constaté en jeu). F11 met la FENÊTRE
     * du navigateur en plein écran : il survit à toutes les navigations.
     * Seul l'utilisateur peut le déclencher, d'où cette invitation.
     *
     * Comportement :
     *  - déjà en plein écran, ou déjà proposée cette session → ne s'affiche pas ;
     *  - dès que la fenêtre passe en plein écran (F11 détecté via resize),
     *    message de confirmation puis fermeture automatique ;
     *  - lien discret « Continuer sans plein écran » pour passer outre.
     */
    function fullscreenInvite() {
        var CLE_SESSION = 'resistance_fs_invite_vue';
        try {
            if (sessionStorage.getItem(CLE_SESSION) === '1') return;
        } catch (e) {}
        if (_fenetrePleinEcran()) return; // déjà en plein écran (F11 actif)

        function marquerVue() {
            try { sessionStorage.setItem(CLE_SESSION, '1'); } catch (e) {}
        }

        var estMac = /Mac/i.test(navigator.platform || navigator.userAgent);
        var touche = estMac ? '⌃⌘F' : 'F11';
        var sousTouche = estMac ? '(ou le bouton vert de la fenêtre)' : '(ou Fn + F11 selon le clavier)';

        var overlay = document.createElement('div');
        overlay.id = 'res-fs-invite';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;' +
            'align-items:center;justify-content:center;background:rgba(5,8,12,.92);' +
            'backdrop-filter:blur(4px);opacity:0;transition:opacity .35s;';
        overlay.innerHTML =
            '<div style="text-align:center;max-width:520px;padding:40px 36px;' +
                'border:1px solid rgba(0,229,255,.3);border-radius:14px;background:rgba(10,16,22,.85);">' +
            '  <div style="font-family:\'Bebas Neue\',sans-serif;font-size:30px;letter-spacing:.12em;color:#00E5FF;">Plein écran recommandé</div>' +
            '  <p style="margin:14px 0 22px;font:400 14px/1.7 \'Segoe UI\',sans-serif;color:rgba(255,255,255,.85);">' +
            '    Pour une immersion totale, passe en plein écran <strong>avant de commencer</strong> :<br>il sera conservé pendant tout le jeu.</p>' +
            '  <div id="res-fs-touche" style="display:inline-block;padding:12px 26px;border:2px solid #00E5FF;border-radius:10px;' +
            '      font:700 26px/1 \'JetBrains Mono\',Consolas,monospace;color:#fff;letter-spacing:.08em;' +
            '      box-shadow:0 0 18px rgba(0,229,255,.35);">' + touche + '</div>' +
            '  <div style="margin-top:10px;font:400 12px/1.5 \'Segoe UI\',sans-serif;color:rgba(255,255,255,.5);">' + sousTouche + '</div>' +
            '  <div id="res-fs-etat" style="margin-top:20px;min-height:20px;font:600 13px/1.5 \'Segoe UI\',sans-serif;color:#7CFC9B;"></div>' +
            '  <button id="res-fs-skip" type="button" style="margin-top:14px;background:none;border:none;cursor:pointer;' +
            '      font:400 12px/1.5 \'Segoe UI\',sans-serif;color:rgba(255,255,255,.45);text-decoration:underline;">' +
            '    Continuer sans plein écran</button>' +
            '</div>';

        function fermer() {
            overlay.style.opacity = '0';
            setTimeout(function() { overlay.remove(); }, 400);
            window.removeEventListener('resize', surResize);
        }

        function surResize() {
            if (!_fenetrePleinEcran()) return;
            marquerVue();
            var etat = document.getElementById('res-fs-etat');
            if (etat) etat.textContent = '✓ Plein écran activé — bon jeu !';
            setTimeout(fermer, 900);
        }

        window.addEventListener('resize', surResize);

        function brancher() {
            (document.body || document.documentElement).appendChild(overlay);
            requestAnimationFrame(function() { overlay.style.opacity = '1'; });
            overlay.querySelector('#res-fs-skip').addEventListener('click', function() {
                marquerVue();
                fermer();
            });
        }
        if (document.body) brancher();
        else document.addEventListener('DOMContentLoaded', brancher);
    }

    return {
        requestFullscreen: requestFullscreen,
        loadYouTubeAPI: loadYouTubeAPI,
        fullscreenInvite: fullscreenInvite
    };
})();

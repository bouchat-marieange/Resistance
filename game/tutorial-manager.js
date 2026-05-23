'use strict';
/**
 * TutorialManager — Tutoriel interactif + onboarding
 * Résistance · Sas de sécurité
 *
 * v3 — mai 2026
 * - Flux 2 phases : ouvrir → tip fermeture (carte + carnet)
 * - Bulle score positionnée près du HUD joueur
 * - Nouvelle disposition clavier dans le modal
 * - Clé LS v2 (reset ancienne préférence)
 */
var TutorialManager = (function () {

    var LS_SKIP_KEY = 'resistance_tutorial_skip_v2';
    // sessionStorage : évite que le tutoriel réapparaisse après une navigation
    // (ex : vidéo Naby → retour sur sas_securite.html dans le même onglet)
    var SS_ONCE_KEY = 'resistance_tutorial_once_v2';

    // Ordre des étapes (données légères — la logique est dans les _run* functions)
    var STEPS = [
        { id: 'map' },
        { id: 'notebook' },
        { id: 'score' },
        { id: 'info' }
    ];

    var _step        = -1;
    var _canInteract = false;
    var _suspended   = false; // true = arrêter tous les watchers en cours

    // ── Injection des styles ────────────────────────────────────────────────
    function _injectStyles() {
        if (document.getElementById('tuto-mgr-styles')) return;
        var css = [
            /* ── Modal tutoriel ── */
            '#tuto-overlay{position:fixed;inset:0;z-index:29998;background:rgba(0,0,0,.75);',
            'backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;}',

            '#tuto-box{background:#0D1117;border:1px solid #1C2A38;border-radius:14px;',
            'padding:34px 38px;max-width:500px;width:90%;font-family:"Segoe UI",sans-serif;',
            'color:#C8D8E8;box-shadow:0 10px 60px rgba(0,0,0,.8),0 0 0 1px rgba(0,229,255,.06);',
            'position:relative;}',

            '#tuto-box::before{content:"";position:absolute;left:0;top:20%;bottom:20%;width:3px;',
            'border-radius:2px;background:linear-gradient(to bottom,transparent,#00E5FF,transparent);}',

            '#tuto-badge{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;',
            'color:#0a0a0a;background:#00E5FF;border-radius:3px;padding:3px 10px;',
            'display:inline-block;margin-bottom:14px;}',

            '#tuto-title{font-family:"Bebas Neue","Arial",sans-serif;font-size:clamp(24px,3.5vw,38px);',
            'letter-spacing:.04em;color:#00E5FF;line-height:1;margin-bottom:18px;}',

            '#tuto-intro{font-size:13px;line-height:1.7;margin-bottom:20px;}',

            /* Clavier : grille AZE + S */
            '#tuto-kbd{display:flex;flex-direction:column;align-items:center;gap:4px;margin:16px auto;}',
            '.tku-row{display:flex;gap:8px;align-items:flex-end;}',
            '.tku-col{display:flex;flex-direction:column;align-items:center;gap:4px;}',
            '.tku-lbl-top{font-size:10px;color:#607080;letter-spacing:.04em;}',
            '.tku-lbl-bot{font-size:10px;color:#607080;letter-spacing:.04em;}',
            '.tku{min-width:40px;height:40px;background:#131D27;border:1px solid #2A3F55;',
            'border-bottom:3px solid #1A2D40;border-radius:6px;display:flex;align-items:center;',
            'justify-content:center;font-size:15px;font-weight:700;color:#00E5FF;',
            'font-family:monospace;padding:0 8px;}',

            '#tuto-tips{list-style:none;padding:0;margin:14px 0 20px;display:flex;flex-direction:column;gap:7px;}',
            '#tuto-tips li{font-size:13px;display:flex;gap:9px;align-items:flex-start;line-height:1.55;}',
            '#tuto-tips li::before{content:"›";color:#00E5FF;font-size:15px;line-height:1.35;flex-shrink:0;}',
            'kbd{display:inline-block;background:#131D27;border:1px solid #2A3F55;',
            'border-bottom:2px solid #1A2D40;border-radius:4px;padding:1px 6px;font-size:11px;',
            'font-family:monospace;color:#00E5FF;}',

            '#tuto-cb-row{display:flex;align-items:center;gap:9px;margin-bottom:14px;',
            'font-size:12px;color:#607080;cursor:pointer;}',
            '#tuto-cb-row input{accent-color:#00E5FF;width:15px;height:15px;cursor:pointer;}',

            '#tuto-btn-row{display:flex;gap:10px;}',
            '#tuto-ok{flex:1;padding:11px;font-size:12px;font-weight:700;letter-spacing:.1em;',
            'text-transform:uppercase;color:#0a0a0a;background:#00E5FF;border:none;',
            'border-radius:8px;cursor:pointer;transition:background .2s;}',
            '#tuto-ok:hover{background:#00CCD9;}',
            '#tuto-skip{padding:11px 16px;font-size:12px;font-weight:600;color:#607080;',
            'background:transparent;border:1px solid #2A3F55;border-radius:8px;',
            'cursor:pointer;transition:all .2s;white-space:nowrap;}',
            '#tuto-skip:hover{color:#C8D8E8;border-color:#607080;}',

            /* ── Dim + spotlight ── */
            '#ob-dim{position:fixed;inset:0;z-index:29989;pointer-events:none;}',
            '#ob-dim.active{pointer-events:all;background:rgba(0,0,0,.55);}',

            '#ob-spot{position:fixed;z-index:29990;pointer-events:none;border-radius:9px;',
            'box-shadow:0 0 0 9999px rgba(0,0,0,.55),0 0 0 2px rgba(0,229,255,.85);',
            'transition:all .35s cubic-bezier(.4,0,.2,1);}',

            /* ── Flèche animée ── */
            '#ob-arrow{position:fixed;z-index:29993;pointer-events:none;',
            'width:0;height:0;border-style:solid;filter:drop-shadow(0 0 8px #00E5FF);}',
            '#ob-arrow.dir-left {border-width:11px 16px 11px 0;border-color:transparent #00E5FF transparent transparent;}',
            '#ob-arrow.dir-right{border-width:11px 0 11px 16px;border-color:transparent transparent transparent #00E5FF;}',
            '#ob-arrow.dir-top  {border-width:0 11px 16px 11px;border-color:transparent transparent #00E5FF transparent;}',
            '#ob-arrow.dir-bottom{border-width:16px 11px 0 11px;border-color:#00E5FF transparent transparent transparent;}',
            '@keyframes arr-h {from{transform:translateX(0);opacity:.5}to{transform:translateX(6px);opacity:1}}',
            '@keyframes arr-v {from{transform:translateY(0);opacity:.5}to{transform:translateY(6px);opacity:1}}',
            '@keyframes arr-hl{from{transform:translateX(0);opacity:.5}to{transform:translateX(-6px);opacity:1}}',
            '#ob-arrow.dir-right {animation:arr-h  .45s ease-in-out infinite alternate;}',
            '#ob-arrow.dir-left  {animation:arr-hl .45s ease-in-out infinite alternate;}',
            '#ob-arrow.dir-bottom{animation:arr-v  .45s ease-in-out infinite alternate;}',
            '#ob-arrow.dir-top   {animation:arr-v  .45s ease-in-out infinite alternate;}',

            /* ── Bulle info ── pointer-events:none par défaut (ne bloque pas l'UI) */
            '#ob-bubble{position:fixed;z-index:29991;background:#0D1117;border:1px solid #1C2A38;',
            'border-radius:12px;padding:18px 20px;max-width:300px;min-width:220px;',
            'font-family:"Segoe UI",sans-serif;font-size:13px;color:#C8D8E8;',
            'box-shadow:0 4px 20px rgba(0,0,0,.65),0 0 0 1px rgba(0,229,255,.07);',
            'pointer-events:none;}',
            '#ob-bubble.interactive{pointer-events:auto;}',

            '#ob-ttl{font-weight:700;font-size:14px;color:#EEF4FF;margin-bottom:7px;}',
            '#ob-dsc{line-height:1.65;margin-bottom:10px;}',
            '#ob-ask{font-size:12px;color:#00E5FF;font-style:italic;',
            'border-top:1px solid #1C2A38;padding-top:9px;margin-top:4px;',
            'opacity:0;transition:opacity .4s;}',
            '#ob-ask.visible{opacity:1;}',

            /* ── Toasts ── */
            '#ob-toast{position:fixed;bottom:76px;left:50%;transform:translateX(-50%);',
            'z-index:29999;background:#0D1117;border:1px solid #1C2A38;border-radius:8px;',
            'padding:11px 20px;font-family:"Segoe UI",sans-serif;font-size:13px;color:#C8D8E8;',
            'box-shadow:0 4px 14px rgba(0,0,0,.5);opacity:1;transition:opacity 1s;}',

            '#ob-info-toast{position:fixed;z-index:30000;',
            'background:#0D1117;border:1px solid #00E5FF;border-radius:8px;',
            'padding:10px 16px;font-family:"Segoe UI",sans-serif;font-size:13px;color:#00E5FF;',
            'white-space:nowrap;box-shadow:0 0 18px rgba(0,229,255,.3);',
            'display:flex;align-items:center;gap:8px;opacity:0;transition:opacity .35s;}'
        ].join('');
        var s = document.createElement('style');
        s.id = 'tuto-mgr-styles';
        s.textContent = css;
        document.head.appendChild(s);
    }

    // ── MODAL TUTORIEL ──────────────────────────────────────────────────────
    function showTutorial() {
        _injectStyles();
        var skip = localStorage.getItem(LS_SKIP_KEY) === 'true';

        var el = document.createElement('div');
        el.id = 'tuto-overlay';
        el.innerHTML = [
            '<div id="tuto-box">',
            '  <div id="tuto-badge">Tutoriel</div>',
            '  <div id="tuto-title">Bienvenue dans le Sas de sécurité</div>',
            '  <p id="tuto-intro">Tu es dans le <strong style="color:#EEF4FF">Sas de sécurité</strong>',
            '  du bunker de la Résistance.<br>Voici comment te déplacer dans ce monde 3D.</p>',

            /* Clavier : nouvelle disposition */
            '  <div id="tuto-kbd">',
            '    <div class="tku-row">',
            '      <div class="tku-col">',
            '        <span class="tku-lbl-top">Gauche</span>',
            '        <div class="tku">A</div>',
            '      </div>',
            '      <div class="tku-col">',
            '        <span class="tku-lbl-top">Avancer</span>',
            '        <div class="tku">Z</div>',
            '      </div>',
            '      <div class="tku-col">',
            '        <span class="tku-lbl-top">Droite</span>',
            '        <div class="tku">E</div>',
            '      </div>',
            '    </div>',
            '    <div class="tku-row">',
            '      <div class="tku-col">',
            '        <div class="tku">S</div>',
            '        <span class="tku-lbl-bot">Reculer</span>',
            '      </div>',
            '    </div>',
            '  </div>',

            '  <ul id="tuto-tips">',
            '    <li>Maintiens le <strong style="color:#EEF4FF">clic gauche</strong> et déplace',
            '        la souris pour <strong style="color:#EEF4FF">orienter ta vue</strong>.</li>',
            '    <li><kbd>Maj</kbd> + direction pour <strong style="color:#EEF4FF">courir</strong>.</li>',
            '    <li><kbd>Espace</kbd> pour <strong style="color:#EEF4FF">pause</strong>.</li>',
            '    <li>Centre le <strong style="color:#EEF4FF">viseur</strong> sur un objet',
            '        et <strong style="color:#EEF4FF">clique</strong> pour interagir.</li>',
            '  </ul>',
            '  <label id="tuto-cb-row">',
            '    <input type="checkbox" id="tuto-cb"' + (skip ? ' checked' : '') + '>',
            '    Ne plus afficher ce tutoriel au démarrage',
            '  </label>',
            '  <div id="tuto-btn-row">',
            '    <button id="tuto-skip">Passer</button>',
            '    <button id="tuto-ok">Découvrir l\'interface →</button>',
            '  </div>',
            '</div>'
        ].join('');
        document.body.appendChild(el);

        document.getElementById('tuto-ok').addEventListener('click', function () {
            _saveCheckbox();
            _fadeEl(el, _startOnboarding);
        });
        document.getElementById('tuto-skip').addEventListener('click', function () {
            _saveCheckbox();
            _fadeEl(el, function () { _flyBallToInfo(null); });
        });
    }

    function _saveCheckbox() {
        var cb = document.getElementById('tuto-cb');
        if (cb) localStorage.setItem(LS_SKIP_KEY, cb.checked ? 'true' : 'false');
    }

    function _fadeEl(el, cb) {
        el.style.transition = 'opacity .3s';
        el.style.opacity = '0';
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
            if (cb) cb();
        }, 320);
    }

    // ── Animation boule → icône info ───────────────────────────────────────
    function _flyBallToInfo(onDone) {
        var infoIcon = document.getElementById('info-icon');
        if (!infoIcon) { if (onDone) onDone(); return; }
        var r  = infoIcon.getBoundingClientRect();
        var vW = window.innerWidth, vH = window.innerHeight;

        var ball = document.createElement('div');
        ball.style.cssText = [
            'position:fixed;',
            'left:' + (vW / 2 - 12) + 'px;top:' + (vH / 2 - 12) + 'px;',
            'width:24px;height:24px;border-radius:50%;',
            'background:radial-gradient(circle,#fff 8%,#00E5FF 52%,transparent 100%);',
            'box-shadow:0 0 18px #00E5FF,0 0 36px rgba(0,229,255,.45);',
            'z-index:30000;pointer-events:none;',
            'transition:left .72s cubic-bezier(.4,0,.2,1),top .72s cubic-bezier(.4,0,.2,1),',
            'width .72s,height .72s,opacity .72s;'
        ].join('');
        document.body.appendChild(ball);

        requestAnimationFrame(function () {
            setTimeout(function () {
                ball.style.left    = (r.left + r.width  / 2 - 4) + 'px';
                ball.style.top     = (r.top  + r.height / 2 - 4) + 'px';
                ball.style.width   = '8px';
                ball.style.height  = '8px';
                ball.style.opacity = '0.15';
            }, 40);
        });
        setTimeout(function () {
            if (ball.parentNode) ball.parentNode.removeChild(ball);
            _showInfoToast(r, onDone);
        }, 860);
    }

    function _showInfoToast(iconRect, onDone) {
        var toast = document.createElement('div');
        toast.id = 'ob-info-toast';
        var left = iconRect.left - 200;
        if (left < 8) left = iconRect.right + 10;
        toast.style.left = left + 'px';
        toast.style.top  = (iconRect.top + iconRect.height / 2 - 20) + 'px';
        toast.innerHTML  = '<span style="display:inline-block;animation:arr-hl .45s ease-in-out infinite alternate">←</span>' +
                           '&nbsp;Mémo commandes ici';
        document.body.appendChild(toast);
        requestAnimationFrame(function () {
            setTimeout(function () { toast.style.opacity = '1'; }, 20);
        });
        setTimeout(function () {
            toast.style.opacity = '0';
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
                if (onDone) onDone();
            }, 400);
        }, 2600);
    }

    // ── ONBOARDING ──────────────────────────────────────────────────────────
    function _startOnboarding() {
        _step = 0;
        _showStep();
    }

    function _showStep() {
        _cleanupAll();
        if (_step >= STEPS.length) { _finish(); return; }
        var s = STEPS[_step];
        if      (s.id === 'map')      { _runMapStep(_advance);      }
        else if (s.id === 'notebook') { _runNotebookStep(_advance); }
        else if (s.id === 'score')    { _runScoreStep(_advance);    }
        else if (s.id === 'info')     { _runInfoStep(_advance);     }
        else                          { _advance();                  }
    }

    // ── Helpers génériques ──────────────────────────────────────────────────

    // Spotlight + bulle + flèche sur un élément. Libère après 1.1s.
    function _spawnSpotAndBubble(target, info) {
        _cleanupAll();
        _injectStyles();

        var dim = document.createElement('div');
        dim.id = 'ob-dim'; dim.classList.add('active');
        document.body.appendChild(dim);

        var spot = document.createElement('div');
        spot.id = 'ob-spot';
        document.body.appendChild(spot);
        _placeSpot(target, spot);

        var arrow = document.createElement('div');
        arrow.id = 'ob-arrow';
        document.body.appendChild(arrow);

        var bubble = document.createElement('div');
        bubble.id = 'ob-bubble';
        bubble.innerHTML =
            '<div id="ob-ttl">' + info.title + '</div>' +
            '<div id="ob-dsc">' + info.desc  + '</div>' +
            '<div id="ob-ask">' + info.ask   + '</div>';
        document.body.appendChild(bubble);

        requestAnimationFrame(function () {
            _placeArrow(target, arrow);
            _placeBubble(target, bubble);
        });

        setTimeout(function () {
            var ask = document.getElementById('ob-ask');
            if (ask) ask.classList.add('visible');
            dim.classList.remove('active');
            _canInteract = true;
        }, 1100);
    }

    // Poll jusqu'à conditionFn() === true, puis appelle cb().
    // S'arrête proprement si _suspended passe à true.
    function _watchUntil(conditionFn, cb) {
        function tick() {
            if (_suspended) return; // vidéo en cours → on abandonne
            if (conditionFn()) { cb(); return; }
            setTimeout(tick, 200);
        }
        setTimeout(tick, 300);
    }

    // ── Tip fermeture Carte ──────────────────────────────────────────────────
    // Bulle AU-DESSUS du panneau map, flèche ↓ pointant vers le bouton ×
    function _spawnMapCloseTip(html) {
        _cleanupAll();
        var hud      = document.getElementById('minimap-hud');
        var closeBtn = document.querySelector('.mm-toggle-close');
        if (!hud) return;

        var hudR = hud.getBoundingClientRect();
        var btnR = closeBtn ? closeBtn.getBoundingClientRect()
                            : { left: hudR.right - 40, top: hudR.top, width: 30, height: 30 };
        var btnCX = btnR.left + btnR.width / 2;

        var GAP = 10;  // espace entre bulle/flèche/panneau
        var vW  = window.innerWidth;

        // Bulle : part du bord gauche du panneau, cadrée pour ne PAS dépasser la fenêtre
        var bubL = hudR.left + 4;
        var bubW = Math.min(hudR.width - 8, vW - bubL - 12); // jamais hors écran
        var BH   = 58;

        // Flèche ↓ : centrée sur le bouton ×, mais clampée dans les limites de la bulle
        var arrowLRaw = btnCX - 11;
        var arrowLMin = bubL;                     // pas à gauche de la bulle
        var arrowLMax = bubL + bubW - 22;         // pas à droite de la bulle
        var arrowL    = Math.min(arrowLMax, Math.max(arrowLMin, arrowLRaw));
        var arrowTop  = hudR.top - GAP - 16;

        var arrow = document.createElement('div');
        arrow.id = 'ob-arrow';
        arrow.classList.add('dir-bottom');
        arrow.style.left = Math.max(0, arrowL) + 'px';
        arrow.style.top  = Math.max(0, arrowTop) + 'px';
        document.body.appendChild(arrow);

        // Bulle : strictement AU-DESSUS de la flèche
        var bubT = Math.max(8, arrowTop - GAP - BH);

        var bubble = document.createElement('div');
        bubble.id = 'ob-bubble';
        bubble.style.width    = bubW + 'px';
        bubble.style.maxWidth = 'none';
        bubble.style.left = bubL + 'px';
        bubble.style.top  = bubT + 'px';
        bubble.innerHTML = '<div id="ob-ask" class="visible" style="border-top:none;padding-top:0;margin-top:0;">' + html + '</div>';
        document.body.appendChild(bubble);
    }

    // ── Tip fermeture Carnet ─────────────────────────────────────────────────
    // Bulle de left=8 jusqu'à juste avant le bouton ×, flèche → vers ×
    function _spawnNotebookCloseTip(html) {
        _cleanupAll();
        var closeBtn = document.getElementById('notebook-close');
        if (!closeBtn) return;

        var r   = closeBtn.getBoundingClientRect();
        var cy  = r.top + r.height / 2;
        var GAP = 12; // espace entre bulle et flèche, flèche et bouton
        var BH  = 52; // hauteur estimée de la bulle compacte

        // Flèche → pointant vers ×, positionnée juste à sa gauche
        var arrowL = Math.max(8, r.left - GAP - 16);
        var arrow = document.createElement('div');
        arrow.id = 'ob-arrow';
        arrow.classList.add('dir-right');
        arrow.style.left = arrowL + 'px';
        arrow.style.top  = (cy - 11) + 'px';
        document.body.appendChild(arrow);

        // Bulle : de left=8 jusqu'au bord gauche de la flèche (- petit écart)
        var bubL = 8;
        var bubW = Math.max(120, arrowL - bubL - GAP);
        var bubT = Math.max(8, cy - BH / 2);

        var bubble = document.createElement('div');
        bubble.id = 'ob-bubble';
        bubble.style.left     = bubL + 'px';
        bubble.style.width    = bubW + 'px';
        bubble.style.maxWidth = 'none';
        bubble.style.top      = bubT + 'px';
        bubble.innerHTML = '<div id="ob-ask" class="visible" style="border-top:none;padding-top:0;margin-top:0;">' + html + '</div>';
        document.body.appendChild(bubble);
    }

    // ── Étape Carte ─────────────────────────────────────────────────────────
    function _runMapStep(onDone) {
        var tab = document.querySelector('.mm-collapsed-tab');
        var target = tab || document.getElementById('minimap-hud');
        if (!target) { onDone(); return; }

        _spawnSpotAndBubble(target, {
            title: '🗺️ Carte',
            desc:  'Affiche le <strong>plan du sas</strong> et repère les zones actives.<br>' +
                   'Raccourci : <kbd>M</kbd> — les <strong>❓</strong> signalent les interactions.',
            ask:   'Ouvre la carte (<kbd>M</kbd> ou clic).'
        });

        // Phase 1 : attendre ouverture
        _watchUntil(
            function () {
                var hud = document.getElementById('minimap-hud');
                return hud && hud.classList.contains('expanded');
            },
            function () {
                // Phase 2 : attendre fin de la transition CSS (350ms) AVANT de mesurer
                // getBoundingClientRect() pendant la transition retourne les dimensions collapsed
                setTimeout(function () {
                    _spawnMapCloseTip('Pour fermer : <kbd>M</kbd> ou clique sur ×');
                }, 420);
                // Attendre fermeture
                _watchUntil(
                    function () {
                        var hud = document.getElementById('minimap-hud');
                        return hud && hud.classList.contains('collapsed');
                    },
                    function () {
                        _canInteract = false;
                        _cleanupAll();
                        onDone();
                    }
                );
            }
        );
    }

    // ── Étape Carnet de bord ────────────────────────────────────────────────
    function _runNotebookStep(onDone) {
        var target = document.getElementById('notebook-tab');
        if (!target) { onDone(); return; }

        _spawnSpotAndBubble(target, {
            title: '📓 Carnet de bord',
            desc:  'Ta <strong>progression</strong> et le <strong>lexique IA</strong> sont ici.<br>' +
                   'Raccourci : <kbd>J</kbd>.',
            ask:   'Ouvre le carnet (clic ou <kbd>J</kbd>).'
        });

        // Phase 1 : attendre ouverture
        _watchUntil(
            function () {
                var ov = document.getElementById('notebook-overlay');
                if (ov) return ov.classList.contains('open');
                if (typeof NotebookManager !== 'undefined') return NotebookManager.isOpen();
                return false;
            },
            function () {
                // Phase 2 : tip aligné avec le bouton ×
                _spawnNotebookCloseTip('Pour fermer : <kbd>J</kbd>, <kbd>Échap</kbd> ou clique sur ×');
                // Attendre fermeture
                _watchUntil(
                    function () {
                        var ov = document.getElementById('notebook-overlay');
                        if (ov) return !ov.classList.contains('open');
                        if (typeof NotebookManager !== 'undefined') return !NotebookManager.isOpen();
                        return true;
                    },
                    function () {
                        _canInteract = false;
                        _cleanupAll();
                        onDone();
                    }
                );
            }
        );
    }

    // ── Étape Score ─────────────────────────────────────────────────────────
    // Bulle large positionnée au-dessus du HUD score, flèche ↓ centrée sur la bulle
    function _runScoreStep(onDone) {
        _cleanupAll();
        _injectStyles();

        var hud = document.getElementById('player-hud');
        if (!hud) { onDone(); return; }

        var hudR  = hud.getBoundingClientRect();
        var vW    = window.innerWidth;
        var SHIFT = 50; // décalage vers la droite

        // Calcul de la bulle (d'abord, pour centrer la flèche dessus)
        var BW   = 500;
        var bubW = Math.min(BW, vW - 32);
        var bubL = Math.min(Math.max(8, hudR.left + SHIFT), vW - bubW - 8);
        var bubCX = bubL + bubW / 2; // centre horizontal de la bulle

        // Flèche ↓ : centrée sur la bulle, entre la bulle et le HUD score
        var arrowGAP = 10; // espace entre bas de bulle et haut de flèche
        var arrowTop = hudR.top - arrowGAP - 16; // 16 = hauteur triangle CSS

        var arrow = document.createElement('div');
        arrow.id = 'ob-arrow';
        arrow.classList.add('dir-bottom');
        arrow.style.left = Math.max(8, bubCX - 11) + 'px';
        arrow.style.top  = Math.max(8, arrowTop) + 'px';
        document.body.appendChild(arrow);

        // Bulle : positionnée via bottom (indépendant de sa hauteur propre)
        var bubble = document.createElement('div');
        bubble.id = 'ob-bubble';
        bubble.classList.add('interactive');
        bubble.style.maxWidth = BW + 'px';
        bubble.style.width    = bubW + 'px';
        bubble.style.left     = bubL + 'px';
        bubble.style.bottom   = (window.innerHeight - hudR.top + arrowGAP + 16 + 10) + 'px';
        bubble.style.top      = 'auto';

        bubble.innerHTML = [
            '<div id="ob-ttl" style="font-size:16px;margin-bottom:12px;">⚡ Emprise & Lucidité</div>',
            '<div id="ob-dsc" style="display:flex;gap:10px;margin-bottom:14px;">',
            '  <div style="flex:1;background:#111820;border:1px solid #1C2A38;border-radius:8px;padding:12px 14px;">',
            '    <div style="font-weight:700;font-size:13px;color:#ff6b6b;margin-bottom:7px;">▸ Emprise</div>',
            '    <p style="font-size:13px;line-height:1.6;color:#8EA0B0;margin:0;">',
            '      La prise des algorithmes sur tes comportements.',
            '      Mesure ta vulnérabilité aux mécanismes de captation.',
            '    </p>',
            '  </div>',
            '  <div style="flex:1;background:#111820;border:1px solid #1C2A38;border-radius:8px;padding:12px 14px;">',
            '    <div style="font-weight:700;font-size:13px;color:#00E5FF;margin-bottom:7px;">▸ Lucidité</div>',
            '    <p style="font-size:13px;line-height:1.6;color:#8EA0B0;margin:0;">',
            '      Ta capacité à reconnaître les mécanismes de manipulation.',
            '      Se renforce à chaque choix réfléchi.',
            '    </p>',
            '  </div>',
            '</div>',
            '<div id="ob-ask" class="visible" style="text-align:center;">',
            '  <p style="font-size:13px;color:#607080;font-style:normal;line-height:1.6;margin:0 0 12px;">',
            '    Dans le Nexus ces données sont masquées.<br>Dans le bunker elles sont affichées.',
            '  </p>',
            '  <button id="ob-score-btn" style="',
            '    padding:10px 24px;font-size:12px;font-weight:700;letter-spacing:.1em;',
            '    text-transform:uppercase;color:#0a0a0a;background:#00E5FF;',
            '    border:none;border-radius:7px;cursor:pointer;">',
            '    Compris →',
            '  </button>',
            '</div>'
        ].join('');
        document.body.appendChild(bubble);

        document.getElementById('ob-score-btn').addEventListener('click', function () {
            _canInteract = false;
            _cleanupAll();
            onDone();
        });
    }

    // ── Étape Icône Info ────────────────────────────────────────────────────
    function _runInfoStep(onDone) {
        var target = document.getElementById('info-icon');
        if (!target) { onDone(); return; }

        _spawnSpotAndBubble(target, {
            title: 'ℹ️ Mémo commandes',
            desc:  'Retrouve <strong>toutes les commandes</strong> à tout moment durant le jeu.',
            ask:   'Clique ici pour terminer le tutoriel.'
        });

        setTimeout(function () {
            function handler(e) {
                if (!_canInteract) return;
                e.stopPropagation();
                target.removeEventListener('click', handler, true);
                _canInteract = false;
                _cleanupAll();
                onDone();
            }
            target.addEventListener('click', handler, true);
        }, 1200);
    }

    // ── Placement ───────────────────────────────────────────────────────────
    function _placeSpot(target, spot) {
        var r = target.getBoundingClientRect(), p = 8;
        spot.style.left   = (r.left   - p) + 'px';
        spot.style.top    = (r.top    - p) + 'px';
        spot.style.width  = (r.width  + p * 2) + 'px';
        spot.style.height = (r.height + p * 2) + 'px';
    }

    function _placeArrow(target, arrow) {
        arrow.className = ''; // reset classes
        var r   = target.getBoundingClientRect();
        var cx  = r.left + r.width  / 2;
        var cy  = r.top  + r.height / 2;
        var GAP = 10;

        var fromBot   = cy > window.innerHeight * 0.55;
        var fromRight = cx > window.innerWidth  * 0.5;

        if (fromBot) {
            // Élément en bas → bulle au-dessus → flèche ↓ vers l'élément
            arrow.classList.add('dir-bottom');
            arrow.style.top  = (r.top - GAP - 16) + 'px';
            arrow.style.left = (cx - 11) + 'px';
        } else if (fromRight) {
            // Élément à droite → bulle à gauche → flèche → vers l'élément
            arrow.classList.add('dir-right');
            arrow.style.left = (r.left - GAP - 16) + 'px';
            arrow.style.top  = (cy - 11) + 'px';
        } else {
            // Élément à gauche (incl. top-left) → bulle à droite → flèche ← vers l'élément
            arrow.classList.add('dir-left');
            arrow.style.left = (r.right + GAP) + 'px';
            arrow.style.top  = (cy - 11) + 'px';
        }
    }

    function _placeBubble(target, bubble) {
        var r  = target.getBoundingClientRect();
        var vW = window.innerWidth, vH = window.innerHeight;
        var cx = r.left + r.width  / 2;
        var cy = r.top  + r.height / 2;

        // Dimensions de la bulle — fallback si pas encore rendue (getBCR = 0 au 1er frame)
        var br = bubble.getBoundingClientRect();
        var bW = br.width  > 10 ? br.width  : (parseInt(bubble.style.maxWidth) || 300);
        var bH = br.height > 10 ? br.height : 160;

        var GAP   = 12;
        var ARROW = 20; // largeur du triangle CSS

        var fromBot   = cy > vH * 0.55;
        var fromRight = cx > vW * 0.55;

        if (fromBot) {
            // Élément dans la moitié basse → bulle AU-DESSUS
            bubble.style.top  = Math.max(8, r.top - bH - GAP) + 'px';
            bubble.style.left = fromRight
                ? Math.max(8, r.right - bW) + 'px'
                : Math.min(r.left, vW - bW - 8) + 'px';
        } else if (fromRight) {
            // Élément dans la moitié droite → bulle À GAUCHE
            bubble.style.top  = Math.max(8, cy - bH / 2) + 'px';
            bubble.style.left = Math.max(8, r.left - bW - GAP - ARROW) + 'px';
        } else {
            // Élément dans la moitié gauche (incl. top-left) → bulle À DROITE
            bubble.style.top  = Math.max(8, cy - bH / 2) + 'px';
            bubble.style.left = Math.min(r.right + GAP + ARROW, vW - bW - 8) + 'px';
        }
    }

    // ── Avance + nettoyage ──────────────────────────────────────────────────
    function _advance() {
        _canInteract = false;
        _cleanupAll();
        _step++;
        setTimeout(_showStep, 350);
    }

    function _cleanupAll() {
        ['ob-dim', 'ob-spot', 'ob-arrow', 'ob-bubble'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el && el.parentNode) el.parentNode.removeChild(el);
        });
        _canInteract = false;
    }

    // ── Fin du tutoriel ─────────────────────────────────────────────────────
    function _finish() {
        _cleanupAll();
        var toast = document.createElement('div');
        toast.id = 'ob-toast';
        toast.textContent = '✓ Interface découverte — Bonne exploration !';
        document.body.appendChild(toast);
        setTimeout(function () { toast.style.opacity = '0'; }, 2400);
        setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3500);
    }

    // ── API publique ────────────────────────────────────────────────────────
    function init() {
        // Ne jamais afficher si l'utilisateur a coché "ne plus afficher"
        if (localStorage.getItem(LS_SKIP_KEY) === 'true') return;
        // Ne jamais afficher une 2e fois dans le même onglet/session
        // (évite le retour après vidéo Naby ou toute navigation interne)
        if (sessionStorage.getItem(SS_ONCE_KEY) === 'true') return;
        sessionStorage.setItem(SS_ONCE_KEY, 'true');
        setTimeout(showTutorial, 700);
    }

    // Suspend le tutoriel proprement (appelé quand une vidéo ou interaction démarre)
    // Les watchers _watchUntil en cours s'arrêtent au prochain tick.
    function _suspend() {
        _suspended = true;
        _canInteract = false;
        _step = -1;
        _cleanupAll();
    }

    return {
        init           : init,
        showTutorial   : showTutorial,
        startOnboarding: _startOnboarding,
        suspend        : _suspend,
        reset          : function () {
            _suspended = false;
            localStorage.removeItem(LS_SKIP_KEY);
            sessionStorage.removeItem(SS_ONCE_KEY);
            showTutorial();
        }
    };

})();

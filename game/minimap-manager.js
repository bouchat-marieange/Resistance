/**
 * ============================================
 * MINIMAP MANAGER - Resistance
 * ============================================
 * Carte minimap retractable, zoomable et pannable pour aider Raya a s'orienter
 * dans les pieces et reperer les zones d'interaction.
 *
 * Philosophie (validee avec Marie-Ange, avril 2026):
 *  - Deux etats : replie (mini onglet icone) ou deplie (carte complete).
 *  - En replie : petit onglet rond en bas-droite, clic => deplie.
 *  - En deplie : cadre 280x300px, icone de repli dans le coin haut-droit.
 *  - Zoom : boutons + / - / home, + molette de souris sur le viewport.
 *  - Pan : cliquer-glisser avec curseur main (grab/grabbing).
 *  - L'etat ouvert/ferme est memorise dans localStorage.
 *  - Marie-Ange dessinera les cartes a la main (PNG/SVG) puis les injectera
 *    via MinimapManager.setMapImage(url).
 *
 * API:
 *   MinimapManager.init()                       - cree le DOM + listeners
 *   MinimapManager.open() / close() / toggle()
 *   MinimapManager.isOpen()
 *   MinimapManager.zoomIn() / zoomOut() / home()
 *   MinimapManager.setMapImage(url)             - charge l'image de la piece
 *   MinimapManager.setPlayerPosition(x, y)      - position Raya en % (0-100)
 *   MinimapManager.addPOI(id, x, y, status)     - marqueur ?/V (pour plus tard)
 *   MinimapManager.clearPOIs()
 */
(function () {
    'use strict';

    var MIN_ZOOM = 0.5;
    var MAX_ZOOM = 4.0;
    var ZOOM_STEP = 1.25;
    var STORAGE_KEY = 'resistance_minimap_collapsed';

    var _initialized = false;
    var _container = null;
    var _viewport = null;
    var _rotator = null;        // wrapper de rotation (entre viewport et content)
    var _content = null;
    var _image = null;
    var _playerMarker = null;
    var _poisLayer = null;
    var _collapsed = false;

    var _zoom = 1;
    var _panX = 0;
    var _panY = 0;
    var _isDragging = false;
    var _dragStart = { mx: 0, my: 0, px: 0, py: 0 };

    // Dimensions natives de la carte (SVG viewBox) -> sert a fitter et a convertir les POIs
    var _mapNativeW = 100;
    var _mapNativeH = 100;
    var _hasNativeDims = false;

    // --- Suivi joueur (rotation + position live) ---
    // Quand _followPlayer est true : la carte suit la camera (centrage + rotation).
    // L'utilisateur peut toujours zoomer via molette, mais tout drag manuel
    // desactive le suivi jusqu'au prochain home().
    var _followPlayer = true;
    var _worldBounds = null;       // { xMin, xMax, zMin, zMax } en coords Three.js
    var _playerWorld = { x: 0, z: 0, yaw: 0 };
    var _playerMapPct = { x: 50, y: 50 };   // position joueur sur la carte, en %
    // Calibration : si la convention d'orientation ne tombe pas juste (axe Z carte vs monde),
    // Marie-Ange peut ajuster en appelant MinimapManager.setRotationOffset(rad).
    var _rotationOffset = Math.PI; // par defaut : joueur regardant +Z -> haut de carte
    // Signe de rotation : +1. Dans le repere carte (X+ droite, Z+ bas de la carte SVG),
    // quand le yaw Three.js augmente, le vecteur regard (sin(yaw), cos(yaw)) tourne
    // dans le sens HORAIRE — meme sens que la rotation CSS. Donc pas d'inversion.
    // (Subtilite : en 3D vue d'en haut, yaw+ = antihoraire autour de +Y, mais notre
    // axe Z world a l'oppose de Z ecran, ce qui re-flippe le sens de la projection.)
    var _rotationSign = 1;

    // ============================================
    // STYLES
    // ============================================

    function _injectStyles() {
        if (document.getElementById('minimap-manager-styles')) return;
        var css = [
            '#minimap-hud {',
            '  position: relative;',
            '  font-family: "Segoe UI", sans-serif;',
            '  transition: width 0.35s ease, height 0.35s ease, padding 0.35s ease;',
            '  background: rgba(18,18,26,0.88);',
            '  border: 1px solid rgba(126,214,223,0.3); border-radius: 10px;',
            '  backdrop-filter: blur(4px); overflow: hidden;',
            '  flex-shrink: 0;',
            '}',
            '/* Fallback si pas de right-dock : positionnement absolu */',
            'body > #minimap-hud {',
            '  position: fixed; bottom: 16px; right: 16px; z-index: 100;',
            '}',
            '#minimap-hud.expanded {',
            '  width: 300px; padding: 8px;',
            '}',
            '#minimap-hud.collapsed {',
            '  width: 44px; height: 44px; padding: 0;',
            '  cursor: pointer;',
            '  border-color: rgba(126,214,223,0.5);',
            '}',
            '#minimap-hud.collapsed:hover {',
            '  background: rgba(126,214,223,0.15);',
            '  box-shadow: 0 0 12px rgba(126,214,223,0.4);',
            '}',
            '.mm-header {',
            '  display: flex; justify-content: space-between; align-items: center;',
            '  font-size: 10px; color: #7ed6df; letter-spacing: 1.4px;',
            '  text-transform: uppercase; font-weight: 700; margin-bottom: 6px;',
            '  padding: 0 2px;',
            '}',
            '.mm-toggle-close {',
            '  background: transparent; border: 1px solid rgba(255,255,255,0.2);',
            '  color: #eaeaf2; width: 20px; height: 20px; border-radius: 4px;',
            '  cursor: pointer; font-size: 14px; line-height: 1; padding: 0;',
            '  display: flex; align-items: center; justify-content: center;',
            '}',
            '.mm-toggle-close:hover {',
            '  background: rgba(255,107,107,0.25); border-color: rgba(255,107,107,0.5);',
            '}',
            '.mm-viewport {',
            '  position: relative; width: 100%; height: 230px;',
            '  background: rgba(0,0,0,0.4); border-radius: 6px; overflow: hidden;',
            '  cursor: grab;',
            '}',
            '.mm-viewport.dragging { cursor: grabbing; }',
            '/* Rotator : tourne toute la carte (+POI) en fonction du yaw joueur */',
            '.mm-rotator {',
            '  position: absolute; inset: 0;',
            '  transform-origin: 50% 50%;',
            '  transition: transform 0.15s linear;',
            '  pointer-events: none;',
            '}',
            '.mm-rotator.instant { transition: none; }',
            '/* Content : le contenu cartographie, place en (0,0), positionne via transform */',
            '.mm-content {',
            '  position: absolute; top: 0; left: 0;',
            '  width: 100%; height: 100%;',
            '  transform-origin: 0 0;',
            '  transition: transform 0.08s linear;',
            '  pointer-events: auto;',
            '}',
            '.mm-content.instant { transition: none; }',
            '.mm-placeholder {',
            '  position: absolute; inset: 0; display: flex;',
            '  align-items: center; justify-content: center;',
            '  color: #555; font-size: 11px; font-style: italic; text-align: center;',
            '  padding: 12px;',
            '}',
            '.mm-image {',
            '  position: absolute; top: 0; left: 0;',
            '  width: 100%; height: 100%; object-fit: contain;',
            '  pointer-events: none; user-select: none;',
            '}',
            '/* Curseur joueur : triangle fixe au centre du viewport, pointe vers le haut */',
            '.mm-player-marker {',
            '  position: absolute; left: 50%; top: 50%;',
            '  width: 16px; height: 18px;',
            '  transform: translate(-50%, -50%);',
            '  pointer-events: none; z-index: 5;',
            '}',
            '.mm-player-marker::before {',
            '  content: ""; position: absolute; inset: 0;',
            '  background: #39ff14;',
            '  clip-path: polygon(50% 0%, 100% 100%, 50% 78%, 0% 100%);',
            '  filter: drop-shadow(0 0 4px rgba(57,255,20,0.9));',
            '  animation: mm-player-pulse 1.6s ease-in-out infinite;',
            '}',
            '@keyframes mm-player-pulse {',
            '  0%, 100% { filter: drop-shadow(0 0 4px rgba(57,255,20,0.9)); }',
            '  50% { filter: drop-shadow(0 0 10px rgba(57,255,20,1)); }',
            '}',
            '/* Mode libre (non-follow) : le curseur devient un point et se repositionne dans le content */',
            '.mm-player-marker.free {',
            '  position: absolute; left: 0; top: 0; width: 12px; height: 12px;',
            '  transform: translate(-50%, -50%);',
            '}',
            '.mm-player-marker.free::before {',
            '  background: #39ff14; border-radius: 50%; clip-path: none;',
            '  border: 2px solid #fff;',
            '  box-shadow: 0 0 10px rgba(57,255,20,0.8);',
            '  inset: -2px;',
            '}',
            '.mm-poi {',
            '  position: absolute; width: 22px; height: 22px; border-radius: 50%;',
            '  background: rgba(254,202,87,0.9); border: 2px solid #111;',
            '  color: #111; font-weight: 800; font-size: 14px;',
            '  display: flex; align-items: center; justify-content: center;',
            '  /* Contre-rotation via variable CSS heritee depuis _poisLayer */',
            '  transform: translate(-50%, -50%) rotate(var(--mm-poi-rot, 0rad));',
            '  pointer-events: auto;',
            '  cursor: pointer; transition: transform 0.15s linear;',
            '}',
            '.mm-poi:hover { transform: translate(-50%, -50%) rotate(var(--mm-poi-rot, 0rad)) scale(1.2); }',
            '.mm-poi.done { background: rgba(57,255,20,0.85); }',
            /* Contrôles positionnés en absolu sur le coin bas-droit du panneau */
            '.mm-controls {',
            '  position: absolute; bottom: 8px; right: 8px;',
            '  display: flex; flex-direction: column; gap: 4px; z-index: 10;',
            '}',
            '.mm-btn {',
            '  background: transparent; border: none; padding: 3px;',
            '  cursor: pointer; opacity: 0.55; transition: opacity 0.15s;',
            '  display: flex; align-items: center; justify-content: center;',
            '}',
            '.mm-btn:hover { background: transparent; opacity: 1; }',
            '.mm-btn-icon {',
            '  display: block; width: 18px; height: 18px;',
            '  background-color: #7ed6df; transition: background-color 0.15s;',
            '}',
            '.mm-btn:hover .mm-btn-icon { background-color: #a8edf3; }',
            '.mm-btn-icon.icon-zoom-in  { -webkit-mask: url("icones/zoom-in.svg")  center/contain no-repeat; mask: url("icones/zoom-in.svg")  center/contain no-repeat; }',
            '.mm-btn-icon.icon-zoom-out { -webkit-mask: url("icones/zoom-out.svg") center/contain no-repeat; mask: url("icones/zoom-out.svg") center/contain no-repeat; }',
            '.mm-btn-icon.icon-reset    { -webkit-mask: url("icones/rotate-ccw.svg") center/contain no-repeat; mask: url("icones/rotate-ccw.svg") center/contain no-repeat; }',
            '.mm-collapsed-tab {',
            '  display: none; width: 100%; height: 100%;',
            '  background: transparent; border: none; cursor: pointer; padding: 0;',
            '}',
            '.mm-collapsed-tab::before {',
            '  content: ""; display: block; width: 24px; height: 24px;',
            '  background-color: #7ed6df;',
            '  -webkit-mask: url("icones/map.svg") center/contain no-repeat;',
            '  mask: url("icones/map.svg") center/contain no-repeat;',
            '  transition: transform 0.2s, background-color 0.2s;',
            '}',
            '#minimap-hud.collapsed:hover .mm-collapsed-tab::before {',
            '  transform: scale(1.12); background-color: #a8edf3;',
            '}',
            '#minimap-hud.collapsed .mm-header,',
            '#minimap-hud.collapsed .mm-viewport,',
            '#minimap-hud.collapsed .mm-controls { display: none; }',
            '#minimap-hud.collapsed .mm-collapsed-tab { display: flex;',
            '  align-items: center; justify-content: center; }'
        ].join('\n');
        var style = document.createElement('style');
        style.id = 'minimap-manager-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ============================================
    // DOM
    // ============================================

    function _buildDOM() {
        // Supprimer un eventuel placeholder existant
        var existing = document.getElementById('minimap-hud');
        if (existing) existing.remove();

        _container = document.createElement('div');
        _container.id = 'minimap-hud';
        // Si un right-dock existe, on s'y greffe ; sinon, body (fallback positionne par CSS)
        var dock = document.getElementById('right-dock');
        var parent = dock || document.body;
        _container.innerHTML = [
            '<div class="mm-header">',
            '  <span>Carte</span>',
            '  <button class="mm-toggle-close" title="Replier la carte">×</button>',
            '</div>',
            '<div class="mm-viewport">',
            '  <div class="mm-rotator">',
            '    <div class="mm-content">',
            '      <div class="mm-placeholder">Carte en cours de dessin</div>',
            '      <div class="mm-pois-layer" style="position:absolute; inset:0; pointer-events:none;"></div>',
            '    </div>',
            '  </div>',
            '  <div class="mm-player-marker" title="Ta position"></div>',
            '</div>',
            '<div class="mm-controls">',
            '  <button class="mm-btn" data-act="zoom-in"  title="Zoom avant"><span class="mm-btn-icon icon-zoom-in"></span></button>',
            '  <button class="mm-btn" data-act="zoom-out" title="Zoom arrière"><span class="mm-btn-icon icon-zoom-out"></span></button>',
            '  <button class="mm-btn" data-act="home"     title="Recentrer"><span class="mm-btn-icon icon-reset"></span></button>',
            '</div>',
            '<button class="mm-collapsed-tab" title="Ouvrir la carte (M)" aria-label="Ouvrir la carte"></button>'
        ].join('');
        parent.appendChild(_container);

        _viewport = _container.querySelector('.mm-viewport');
        _rotator = _container.querySelector('.mm-rotator');
        _content = _container.querySelector('.mm-content');
        _poisLayer = _container.querySelector('.mm-pois-layer');
        _playerMarker = _container.querySelector('.mm-player-marker');

        // Listeners
        _container.querySelector('.mm-toggle-close').addEventListener('click', function (e) {
            e.stopPropagation();
            close();
        });
        _container.querySelector('.mm-collapsed-tab').addEventListener('click', function () {
            open();
        });
        _container.addEventListener('click', function (e) {
            // Clic sur le container en mode collapsed = ouvrir
            if (_collapsed && e.target === _container) open();
        });

        var btns = _container.querySelectorAll('.mm-btn');
        btns.forEach(function (b) {
            b.addEventListener('click', function (e) {
                e.stopPropagation();
                var act = b.dataset.act;
                if (act === 'zoom-in') zoomIn();
                else if (act === 'zoom-out') zoomOut();
                else if (act === 'home') home();
            });
        });

        // Pan (cliquer-glisser)
        _viewport.addEventListener('mousedown', _onPanStart);
        // Zoom (molette)
        _viewport.addEventListener('wheel', _onWheel, { passive: false });
    }

    // ============================================
    // PAN + ZOOM
    // ============================================

    function _applyTransform() {
        if (!_content || !_viewport) return;
        var vpW = _viewport.clientWidth || 260;
        var vpH = _viewport.clientHeight || 230;
        // Dimensions du content (fixees par _resizeContentToAspect ou 100% par defaut)
        var cw = _content.offsetWidth || vpW;
        var ch = _content.offsetHeight || vpH;

        // En mode follow, le joueur est affiché à 75 % du haut du viewport
        // (au lieu de 50 %) pour que la salle soit visible au-dessus de lui.
        var FOLLOW_Y_RATIO = 0.75;

        var tx, ty;
        if (_followPlayer) {
            var playerInContentX = (_playerMapPct.x / 100) * cw;
            var playerInContentY = (_playerMapPct.y / 100) * ch;
            tx = vpW / 2          - playerInContentX * _zoom;
            ty = vpH * FOLLOW_Y_RATIO - playerInContentY * _zoom;
        } else {
            // Mode libre : carte centrée + pan manuel
            tx = (vpW - cw * _zoom) / 2 + _panX;
            ty = (vpH - ch * _zoom) / 2 + _panY;
        }
        _content.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + _zoom + ')';

        // Rotation boussole : la carte tourne avec le yaw du joueur (direction toujours en haut).
        // Le pivot de rotation est aligné sur la position écran du joueur
        // (50 % en X, FOLLOW_Y_RATIO en Y en mode follow ; centre en mode libre).
        if (_rotator) {
            var rotRad = 0;
            if (_followPlayer) {
                rotRad = _rotationSign * _playerWorld.yaw + _rotationOffset;
                _rotator.style.transformOrigin = '50% ' + (FOLLOW_Y_RATIO * 100) + '%';
            } else {
                _rotator.style.transformOrigin = '50% 50%';
            }
            _rotator.style.transform = 'rotate(' + rotRad + 'rad)';
            if (_poisLayer) {
                _poisLayer.style.setProperty('--mm-poi-rot', (-rotRad) + 'rad');
            }
        }

        // En mode libre, le curseur doit se positionner dans le content (pas fixe au centre)
        if (_playerMarker) {
            if (_followPlayer) {
                _playerMarker.classList.remove('free');
                _playerMarker.style.left = '50%';
                _playerMarker.style.top = (FOLLOW_Y_RATIO * 100) + '%';
            } else {
                _playerMarker.classList.add('free');
                // En mode libre, on veut que le curseur suive sa position sur la carte.
                // Il faut donc calculer sa position ecran : (playerInContent * zoom) + translation.
                var pxInContent = (_playerMapPct.x / 100) * cw;
                var pyInContent = (_playerMapPct.y / 100) * ch;
                var screenX = tx + pxInContent * _zoom;
                var screenY = ty + pyInContent * _zoom;
                _playerMarker.style.left = screenX + 'px';
                _playerMarker.style.top = screenY + 'px';
            }
        }
    }

    function _onPanStart(e) {
        if (_collapsed) return;
        // Des que l'utilisateur drag, on quitte le mode suivi -> il explore librement
        if (_followPlayer) {
            _followPlayer = false;
            // Figer la position actuelle comme point de depart du pan libre
            _syncPanFromCurrentTransform();
            _applyTransform();
        }
        _isDragging = true;
        _dragStart.mx = e.clientX;
        _dragStart.my = e.clientY;
        _dragStart.px = _panX;
        _dragStart.py = _panY;
        _viewport.classList.add('dragging');
        window.addEventListener('mousemove', _onPanMove);
        window.addEventListener('mouseup', _onPanEnd);
        e.preventDefault();
    }

    /**
     * Quand on quitte le mode follow, on veut que la carte reste visuellement au meme endroit.
     * On calcule le _panX/_panY qui correspondrait au transform actuel (qui etait en follow).
     */
    function _syncPanFromCurrentTransform() {
        if (!_content || !_viewport) return;
        var vpW = _viewport.clientWidth || 260;
        var vpH = _viewport.clientHeight || 230;
        var cw = _content.offsetWidth || vpW;
        var ch = _content.offsetHeight || vpH;
        // En mode follow le translate etait :
        //   tx = vpW/2 - playerInContentX * zoom
        //   ty = vpH/2 - playerInContentY * zoom
        // En mode libre il sera :
        //   tx = (vpW - cw*zoom)/2 + panX
        // Donc :
        //   panX = vpW/2 - playerInContentX*zoom - (vpW - cw*zoom)/2
        var pxInContent = (_playerMapPct.x / 100) * cw;
        var pyInContent = (_playerMapPct.y / 100) * ch;
        _panX = vpW / 2 - pxInContent * _zoom - (vpW - cw * _zoom) / 2;
        _panY = vpH / 2 - pyInContent * _zoom - (vpH - ch * _zoom) / 2;
    }

    function _onPanMove(e) {
        if (!_isDragging) return;
        _panX = _dragStart.px + (e.clientX - _dragStart.mx);
        _panY = _dragStart.py + (e.clientY - _dragStart.my);
        _applyTransform();
    }

    function _onPanEnd() {
        _isDragging = false;
        if (_viewport) _viewport.classList.remove('dragging');
        window.removeEventListener('mousemove', _onPanMove);
        window.removeEventListener('mouseup', _onPanEnd);
    }

    function _onWheel(e) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
    }

    function zoomIn() {
        _zoom = Math.min(MAX_ZOOM, _zoom * ZOOM_STEP);
        _applyTransform();
    }

    function zoomOut() {
        _zoom = Math.max(MIN_ZOOM, _zoom / ZOOM_STEP);
        _applyTransform();
    }

    function home() {
        // Recentre et reactive le suivi joueur (rotation + centrage live)
        _zoom = 1; _panX = 0; _panY = 0;
        _followPlayer = true;
        _applyTransform();
    }

    function setFollowPlayer(bool) {
        _followPlayer = !!bool;
        if (!_followPlayer) _syncPanFromCurrentTransform();
        _applyTransform();
    }

    // ============================================
    // OPEN / CLOSE
    // ============================================

    function open() {
        _collapsed = false;
        _container.classList.remove('collapsed');
        _container.classList.add('expanded');
        try { localStorage.setItem(STORAGE_KEY, '0'); } catch (e) {}
        // Apres transition, recalculer le fit (viewport vient de gagner ses dims)
        // puis repositionner la carte sur le joueur et re-appliquer rotation.
        setTimeout(function () {
            if (_hasNativeDims) _resizeContentToAspect();
            _applyTransform();
        }, 360);
    }

    function close() {
        _collapsed = true;
        _container.classList.remove('expanded');
        _container.classList.add('collapsed');
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    }

    function toggle() { _collapsed ? open() : close(); }
    function isOpen() { return !_collapsed; }

    function _restoreState() {
        var saved = null;
        try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
        // Par défaut (première visite / navigation privée) : carte repliée
        if (saved === '0') open(); else close();
    }

    // ============================================
    // API CONTENU
    // ============================================

    /**
     * Charge une carte dans le viewport.
     * @param {string} url  URL de l'image/SVG
     * @param {number} [nativeW]  Largeur native (ex: viewBox SVG). Si fournie avec nativeH,
     *                            le content sera dimensionne avec le bon aspect ratio et les POI
     *                            en coords natives (0..nativeW, 0..nativeH) seront places correctement.
     * @param {number} [nativeH]  Hauteur native.
     */
    function setMapImage(url, nativeW, nativeH) {
        if (!_content) return;
        var ph = _content.querySelector('.mm-placeholder');
        if (ph) ph.style.display = 'none';
        var old = _content.querySelector('.mm-image');
        if (old) old.remove();

        if (nativeW && nativeH) {
            _mapNativeW = nativeW;
            _mapNativeH = nativeH;
            _hasNativeDims = true;
            _resizeContentToAspect();
        }

        _image = document.createElement('img');
        _image.className = 'mm-image';
        _image.src = url;
        _image.draggable = false;
        _image.style.objectFit = _hasNativeDims ? 'fill' : 'contain';
        _content.insertBefore(_image, _content.firstChild);

        // Re-appliquer transform apres le chargement (dimensions du content changees)
        if (_image.complete) _applyTransform();
        else _image.onload = function () { _applyTransform(); };
    }

    function _resizeContentToAspect() {
        if (!_viewport || !_content || !_hasNativeDims) return;
        var vpW = _viewport.clientWidth;
        var vpH = _viewport.clientHeight;
        if (!vpW || !vpH) return;
        var mapAspect = _mapNativeW / _mapNativeH;
        var vpAspect = vpW / vpH;
        var contentW, contentH;
        if (mapAspect > vpAspect) {
            // carte plus large -> contraindre par largeur viewport
            contentW = vpW;
            contentH = vpW / mapAspect;
        } else {
            // carte plus haute -> contraindre par hauteur viewport
            contentH = vpH;
            contentW = vpH * mapAspect;
        }
        _content.style.width = contentW + 'px';
        _content.style.height = contentH + 'px';
    }

    /**
     * Positionne le marqueur joueur (methode legacy : coords dans le repere de la carte).
     * Prefere updatePlayer() pour un suivi live depuis Three.js (coords monde + yaw).
     * @param {number} x  Coord X : en % (0-100) OU en coord native si setMapImage a recu nativeW/H
     * @param {number} y  Coord Y idem
     * @param {number} [yawRad]  Orientation du joueur (radians Three.js). Optionnel.
     */
    function setPlayerPosition(x, y, yawRad) {
        var pct = _toPct(x, y);
        _playerMapPct.x = pct.x;
        _playerMapPct.y = pct.y;
        if (typeof yawRad === 'number') _playerWorld.yaw = yawRad;
        _applyTransform();
    }

    /**
     * Definit les bornes du monde 3D (coords Three.js) que couvre la carte SVG/PNG.
     * - xMin correspond a la gauche de la carte, xMax a la droite
     * - zMin correspond au haut de la carte, zMax au bas
     * (convention : Z-monde croissant vers le bas de la carte)
     *
     * A ajuster empiriquement en testant : demarrer approximatif, puis affiner avec Marie-Ange.
     */
    function setWorldBounds(xMin, xMax, zMin, zMax) {
        _worldBounds = { xMin: xMin, xMax: xMax, zMin: zMin, zMax: zMax };
    }

    /**
     * Mise a jour live depuis la boucle animate() de Three.js.
     * @param {number} worldX  camera.position.x
     * @param {number} worldZ  camera.position.z
     * @param {number} yawRad  orientation yaw (ex: Math.atan2(targetX - camX, targetZ - camZ))
     */
    function updatePlayer(worldX, worldZ, yawRad) {
        _playerWorld.x = worldX;
        _playerWorld.z = worldZ;
        _playerWorld.yaw = (typeof yawRad === 'number') ? yawRad : _playerWorld.yaw;

        if (_worldBounds) {
            var wb = _worldBounds;
            var px = ((worldX - wb.xMin) / (wb.xMax - wb.xMin)) * 100;
            var py = ((worldZ - wb.zMin) / (wb.zMax - wb.zMin)) * 100;
            _playerMapPct.x = Math.max(-20, Math.min(120, px));
            _playerMapPct.y = Math.max(-20, Math.min(120, py));
        }
        _applyTransform();
    }

    /**
     * Calibration de l'orientation : a utiliser si la carte ne s'oriente pas "vers ou regarde le joueur".
     * Par defaut Math.PI (joueur regardant +Z -> haut de carte). Test empirique.
     */
    function setRotationOffset(rad) {
        _rotationOffset = rad;
        _applyTransform();
    }

    /**
     * Inverse le sens de rotation si necessaire (par defaut -1 : CSS horaire vs Three.js antihoraire).
     */
    function setRotationSign(sign) {
        _rotationSign = (sign < 0) ? -1 : 1;
        _applyTransform();
    }

    /**
     * Ajoute/remplace un POI.
     * @param {string} id
     * @param {number} x  Coord X (voir setPlayerPosition)
     * @param {number} y
     * @param {'todo'|'done'} status
     */
    function addPOI(id, x, y, status) {
        if (!_poisLayer) return;
        var existing = _poisLayer.querySelector('[data-poi-id="' + id + '"]');
        if (existing) existing.remove();
        var pct = _toPct(x, y);
        var poi = document.createElement('div');
        poi.className = 'mm-poi' + (status === 'done' ? ' done' : '');
        poi.dataset.poiId = id;
        poi.style.left = pct.x + '%';
        poi.style.top = pct.y + '%';
        poi.textContent = status === 'done' ? '✓' : '?';
        poi.style.pointerEvents = 'auto';
        _poisLayer.appendChild(poi);
    }

    function _toPct(x, y) {
        // Si dims natives connues, on interprete les coords comme natives (ex SVG 0-601)
        // Si une coord est > 100 on est forcement en coords natives
        if (_hasNativeDims && (x > 100 || y > 100)) {
            return { x: (x / _mapNativeW) * 100, y: (y / _mapNativeH) * 100 };
        }
        return { x: x, y: y };
    }

    function clearPOIs() {
        if (_poisLayer) _poisLayer.innerHTML = '';
    }

    // ============================================
    // CALIBRATION — mapping world <-> map via 2 points de reference
    // ============================================

    /**
     * Calibre les bornes du monde a partir de 2 points de reference.
     * Chaque point donne un couple (coord world 3D) <-> (coord map en % 0..100).
     * Utile pour aligner spawn / PNJ / objets avec la carte SVG sans tatonner.
     *
     * @param {{world:{x:number,z:number}, map:{x:number,y:number}}} pt1
     * @param {{world:{x:number,z:number}, map:{x:number,y:number}}} pt2
     */
    function setCalibration(pt1, pt2) {
        if (!pt1 || !pt2 || !pt1.world || !pt1.map || !pt2.world || !pt2.map) {
            console.warn('[MinimapManager] setCalibration : points invalides');
            return;
        }
        var dMapX = pt2.map.x - pt1.map.x;
        var dMapY = pt2.map.y - pt1.map.y;
        if (Math.abs(dMapX) < 0.01 || Math.abs(dMapY) < 0.01) {
            console.warn('[MinimapManager] setCalibration : points trop proches sur la carte');
            return;
        }
        var wX = 100 * (pt2.world.x - pt1.world.x) / dMapX;
        var wZ = 100 * (pt2.world.z - pt1.world.z) / dMapY;
        var xMin = pt1.world.x - (pt1.map.x / 100) * wX;
        var xMax = xMin + wX;
        var zMin = pt1.world.z - (pt1.map.y / 100) * wZ;
        var zMax = zMin + wZ;
        setWorldBounds(xMin, xMax, zMin, zMax);
        console.log('[MinimapManager] Calibration : bounds = (' +
            xMin.toFixed(2) + ', ' + xMax.toFixed(2) + ', ' +
            zMin.toFixed(2) + ', ' + zMax.toFixed(2) + ')');
        if (_debugEl) _updateDebugOverlay();
    }

    // ============================================
    // DEBUG OVERLAY — affiche coords world + map% en live
    // ============================================
    var _debugEl = null;
    var _debugEnabled = false;

    function _ensureDebugOverlay() {
        if (_debugEl) return;
        _debugEl = document.createElement('div');
        _debugEl.id = 'mm-debug-overlay';
        _debugEl.style.cssText = [
            'position:absolute',
            'top:6px', 'left:6px', 'right:6px',
            'padding:6px 8px',
            'background:rgba(18,18,26,0.85)',
            'border:1px solid rgba(126,214,223,0.35)',
            'border-radius:6px',
            'color:#7ed6df',
            'font-family:monospace', 'font-size:10px',
            'line-height:1.5',
            'pointer-events:none',
            'z-index:10',
            'backdrop-filter:blur(4px)'
        ].join(';');
        if (_viewport) _viewport.appendChild(_debugEl);
    }

    function _updateDebugOverlay() {
        if (!_debugEl || !_debugEnabled) return;
        var pw = _playerWorld;
        var pm = _playerMapPct;
        var wb = _worldBounds;
        var yawDeg = (pw.yaw * 180 / Math.PI).toFixed(0);
        var lines = [
            'world X=' + pw.x.toFixed(2) + ' Z=' + pw.z.toFixed(2) + ' yaw=' + yawDeg + '&deg;',
            'map % (' + pm.x.toFixed(1) + ', ' + pm.y.toFixed(1) + ')'
        ];
        if (wb) {
            lines.push('bounds X:[' + wb.xMin.toFixed(1) + ',' + wb.xMax.toFixed(1) + '] Z:[' + wb.zMin.toFixed(1) + ',' + wb.zMax.toFixed(1) + ']');
        }
        _debugEl.innerHTML = lines.join('<br>');
    }

    /**
     * Active/desactive l'overlay de debug (affiche coords world, map%, bounds).
     * Pratique pour calibrer depuis la console du navigateur :
     *   MinimapManager.setDebug(true)
     *   // bouge, lis les coords
     *   MinimapManager.setCalibration(
     *     { world:{x:0,z:-25}, map:{x:28,y:82} },
     *     { world:{x:0,z:30},  map:{x:55,y:12} }
     *   )
     */
    function setDebug(enabled) {
        _debugEnabled = !!enabled;
        if (_debugEnabled) {
            _ensureDebugOverlay();
            if (_debugEl) _debugEl.style.display = 'block';
            _updateDebugOverlay();
        } else if (_debugEl) {
            _debugEl.style.display = 'none';
        }
    }

    // Hook : mettre a jour le debug overlay + la banniere de calibration a chaque updatePlayer
    var _origUpdatePlayer = updatePlayer;
    updatePlayer = function (worldX, worldZ, yawRad) {
        _origUpdatePlayer(worldX, worldZ, yawRad);
        if (_debugEnabled) _updateDebugOverlay();
        if (_calibState) _updateCalibBanner();
    };

    // ============================================
    // CALIBRATION PAR CENTRAGE — outil interactif
    // ============================================
    // Probleme observe : quand la carte suit le joueur (rotation selon yaw + centrage),
    // il est tres difficile de lire les vraies coords SVG a l'oeil. La rotation de 180
    // degres a yaw=0 flippe tout, et les % annonces depuis une capture d'ecran ne
    // correspondent pas aux coords brutes du SVG.
    //
    // Solution (v2) : mode statique + croix de visee au centre du viewport. L'utilisateur
    // pan/zoom librement la carte pour placer sa position 3D sous la croix rouge, puis
    // clique le bouton "Capturer". Pas d'interception de clic -> le pan reste fonctionnel,
    // meme pour atteindre des zones hors champ initial (ex : spawn en haut de la piece).
    var _calibState = null;
    var _calibCrosshair = null;
    var _calibBanner = null;
    var _calibButton = null;
    var _calibCancelBtn = null;
    var _savedRotationOffset = null;

    function _showCalibUI() {
        if (!_viewport) return;
        // Croix de visee au centre
        if (!_calibCrosshair) {
            _calibCrosshair = document.createElement('div');
            _calibCrosshair.id = 'mm-calib-crosshair';
            _calibCrosshair.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:20;';
            _calibCrosshair.innerHTML = [
                '<div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:#ff3366;transform:translateX(-50%);opacity:0.85"></div>',
                '<div style="position:absolute;top:50%;left:0;right:0;height:1px;background:#ff3366;transform:translateY(-50%);opacity:0.85"></div>',
                '<div style="position:absolute;left:50%;top:50%;width:14px;height:14px;border:2px solid #ff3366;border-radius:50%;transform:translate(-50%,-50%);background:rgba(255,51,102,0.2);box-shadow:0 0 8px rgba(255,51,102,0.7);"></div>'
            ].join('');
            _viewport.appendChild(_calibCrosshair);
        }
        // Banniere info (haut)
        if (!_calibBanner) {
            _calibBanner = document.createElement('div');
            _calibBanner.id = 'mm-calib-banner';
            _calibBanner.style.cssText = [
                'position:absolute', 'top:6px', 'left:6px', 'right:6px',
                'padding:5px 7px',
                'background:rgba(40,10,20,0.92)',
                'border:1px solid rgba(255,51,102,0.55)',
                'border-radius:5px',
                'color:#ffb3c1',
                'font-family:monospace', 'font-size:10px', 'line-height:1.35',
                'pointer-events:none', 'z-index:25', 'text-align:center'
            ].join(';');
            _viewport.appendChild(_calibBanner);
        }
        // Bouton Capturer (bas centre)
        if (!_calibButton) {
            _calibButton = document.createElement('button');
            _calibButton.id = 'mm-calib-capture';
            _calibButton.style.cssText = [
                'position:absolute', 'bottom:6px', 'left:50%',
                'transform:translateX(-50%)',
                'padding:5px 12px',
                'background:rgba(255,51,102,0.45)',
                'border:1px solid #ff3366',
                'color:#fff',
                'font-family:monospace', 'font-size:11px', 'font-weight:700',
                'border-radius:4px', 'cursor:pointer', 'z-index:26'
            ].join(';');
            _calibButton.addEventListener('click', function (e) {
                e.stopPropagation();
                _calibCaptureAtCenter();
            });
            _calibButton.addEventListener('mousedown', function (e) { e.stopPropagation(); });
            _viewport.appendChild(_calibButton);
        }
        // Bouton Annuler (bas droite)
        if (!_calibCancelBtn) {
            _calibCancelBtn = document.createElement('button');
            _calibCancelBtn.id = 'mm-calib-cancel';
            _calibCancelBtn.textContent = '✕';
            _calibCancelBtn.title = 'Annuler la calibration';
            _calibCancelBtn.style.cssText = [
                'position:absolute', 'bottom:6px', 'right:6px',
                'width:22px', 'height:22px',
                'background:rgba(60,60,70,0.85)',
                'border:1px solid rgba(255,255,255,0.3)',
                'color:#eaeaf2',
                'font-family:monospace', 'font-size:12px',
                'border-radius:4px', 'cursor:pointer', 'z-index:26',
                'padding:0', 'line-height:1'
            ].join(';');
            _calibCancelBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                _endClickCalibration(true);
            });
            _calibCancelBtn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
            _viewport.appendChild(_calibCancelBtn);
        }
        _updateCalibBanner();
    }

    function _updateCalibBanner() {
        if (!_calibBanner || !_calibState) return;
        var n = _calibState.points.length;
        var pw = _playerWorld;
        _calibBanner.innerHTML = [
            '<b style="color:#ff6687">CALIBRATION — point ' + (n + 1) + '/2</b><br>',
            '<span style="color:#7ed6df">world X=' + pw.x.toFixed(2) + ' Z=' + pw.z.toFixed(2) + '</span><br>',
            '<span style="font-size:9px;opacity:0.85">Drag pour pan · molette pour zoom · place ta position 3D sous la croix rouge.</span>'
        ].join('');
        if (_calibButton) {
            _calibButton.textContent = 'Capturer (' + n + '/2)';
        }
    }

    function _hideCalibUI() {
        if (_calibCrosshair) { _calibCrosshair.remove(); _calibCrosshair = null; }
        if (_calibBanner)    { _calibBanner.remove();    _calibBanner = null; }
        if (_calibButton)    { _calibButton.remove();    _calibButton = null; }
        if (_calibCancelBtn) { _calibCancelBtn.remove(); _calibCancelBtn = null; }
    }

    function _calibCaptureAtCenter() {
        if (!_calibState || !_content || !_viewport) return;
        var vpRect = _viewport.getBoundingClientRect();
        var contentRect = _content.getBoundingClientRect();
        if (!contentRect.width || !contentRect.height) {
            console.warn('[MinimapManager] Content non visible, capture impossible.');
            return;
        }
        // Centre du viewport en coords ecran
        var centerX = vpRect.left + vpRect.width / 2;
        var centerY = vpRect.top + vpRect.height / 2;
        // Projection dans le repere de la carte (% 0..100) — getBoundingClientRect
        // tient compte des transforms translate + scale appliquees au content.
        var mapX = ((centerX - contentRect.left) / contentRect.width) * 100;
        var mapY = ((centerY - contentRect.top) / contentRect.height) * 100;
        var pt = {
            world: { x: _playerWorld.x, z: _playerWorld.z },
            map: { x: Math.round(mapX * 10) / 10, y: Math.round(mapY * 10) / 10 }
        };
        _calibState.points.push(pt);
        var n = _calibState.points.length;
        console.log('%c[MinimapManager] Point #' + n + ' capture :',
            'color:#7ed6df;font-weight:bold',
            'world (X=' + pt.world.x.toFixed(2) + ', Z=' + pt.world.z.toFixed(2) + ') -> map (' + pt.map.x + '%, ' + pt.map.y + '%)');
        _updateCalibBanner();
        if (n >= 2) {
            setCalibration(_calibState.points[0], _calibState.points[1]);
            console.log('%c[MinimapManager] Calibration appliquee.',
                'color:#39ff14;font-weight:bold',
                'Pour reactiver le suivi : MinimapManager.setFollowPlayer(true)');
            _endClickCalibration(false);
        } else {
            console.log('[MinimapManager] Deplace-toi en 3D a une seconde position connue, puis recale sous la croix et capture.');
        }
    }

    function _endClickCalibration(cancelled) {
        _calibState = null;
        _hideCalibUI();
        // Restaurer l'offset de rotation pour que le follow refonctionne apres
        if (_savedRotationOffset !== null) {
            _rotationOffset = _savedRotationOffset;
            _savedRotationOffset = null;
        }
        // Restaurer le debug overlay si active
        if (_debugEl && _debugEnabled) {
            _debugEl.style.display = 'block';
            _updateDebugOverlay();
        }
        if (cancelled) {
            console.log('[MinimapManager] Calibration annulee.');
        }
    }

    /**
     * Lance la calibration par centrage : la carte passe en mode statique (pas de rotation,
     * pas de suivi, zoom 1). Une croix rouge apparait au centre du viewport. L'utilisateur
     * pan/zoom librement pour placer sa position 3D courante sous la croix, puis clique
     * "Capturer". Apres 2 captures, la calibration est auto-appliquee.
     *
     * Usage console :
     *   MinimapManager.startClickCalibration();
     *   // En 3D : debout au spawn. Sur la carte : pan pour centrer le spawn sous la croix, "Capturer"
     *   // En 3D : marcher jusqu'au generateur. Sur la carte : re-pan pour centrer le generateur, "Capturer"
     *   // => setCalibration() auto-appele, fleche verte alignee sur le joueur live
     */
    function startClickCalibration() {
        _calibState = { points: [] };
        _savedRotationOffset = _rotationOffset;
        // Passage en mode statique lisible : pas de rotation, pas de suivi, zoom 1, centre
        _followPlayer = false;
        _zoom = 1;
        _panX = 0;
        _panY = 0;
        _rotationOffset = 0;
        _applyTransform();
        if (_rotator) _rotator.style.transform = 'rotate(0rad)';
        // Masquer le debug overlay pendant la calib (remplace par la banniere rose)
        if (_debugEl) _debugEl.style.display = 'none';
        _showCalibUI();
        console.log('%c[MinimapManager] Calibration demarree.',
            'color:#ff3366;font-weight:bold;font-size:13px');
        console.log('Flux :');
        console.log('  1. Place-toi en 3D a une position connue (ex : spawn du sas).');
        console.log('  2. Pan la carte (drag) / zoom (molette) pour amener ce point pile sous la croix rouge.');
        console.log('  3. Clique "Capturer".');
        console.log('  4. Deplace-toi en 3D a une 2nde position (generateur, Naby...), recommence.');
        console.log('  Position courante : world X=' + _playerWorld.x.toFixed(2) + ' Z=' + _playerWorld.z.toFixed(2));
    }

    // ============================================
    // INIT
    // ============================================

    function init() {
        if (_initialized) return;
        _initialized = true;
        _injectStyles();
        _buildDOM();
        _restoreState();
        _applyTransform();
    }

    window.MinimapManager = {
        init: init,
        open: open,
        close: close,
        toggle: toggle,
        isOpen: isOpen,
        zoomIn: zoomIn,
        zoomOut: zoomOut,
        home: home,
        setMapImage: setMapImage,
        setPlayerPosition: setPlayerPosition,
        setWorldBounds: setWorldBounds,
        setCalibration: setCalibration,
        setDebug: setDebug,
        startClickCalibration: startClickCalibration,
        updatePlayer: updatePlayer,
        setRotationOffset: setRotationOffset,
        setRotationSign: setRotationSign,
        setFollowPlayer: setFollowPlayer,
        addPOI: addPOI,
        clearPOIs: clearPOIs
    };
})();

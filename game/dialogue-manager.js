/**
 * ============================================
 * DIALOGUE MANAGER - Resistance
 * ============================================
 * Moteur de dialogue inspire de Sims 4 pour les rencontres avec les 12 PNJ
 * du bunker. Affiche un overlay avec portrait, jauges relationnelles et
 * un menu radial a 4 categories (ECOUTER / QUESTIONNER / PARTAGER / CONFRONTER).
 *
 * Regles (validees avec Marie-Ange, avril 2026):
 *  - 4 categories max par noeud. Categorie sans option => onglet masque.
 *  - Option "gated" grisee avec info-bulle si pre-requis non atteint.
 *  - Effects: { confiance_<id>: delta, attachement_<id>: delta, lucidite: delta }.
 *  - Chaque selection peut amener a un autre noeud via next, ou terminer si next == null.
 *  - Confiance/attachement passent par RelationshipManager.
 *  - Lucidite passe par LucidityManager.
 *
 * Depend de RelationshipManager et LucidityManager.
 * Inclure APRES relationship-manager.js et lucidity-manager.js.
 *
 * API:
 *   DialogueManager.loadTree(treeId, tree)     - enregistre un arbre
 *   DialogueManager.start(treeId, startNode)   - demarre un dialogue
 *   DialogueManager.close()                    - ferme l'overlay
 *   DialogueManager.isActive()                 - bool
 *   DialogueManager.selectCategory(cat)
 *   DialogueManager.selectOption(optIndex)
 *
 * Format arbre:
 *   {
 *     characterId: 'naby',
 *     characterName: 'Naby',
 *     portrait: 'images/Portraits/Portrait Naby.jpg',  // optionnel
 *     nodes: {
 *       'intro': {
 *         speaker: 'naby' | 'raya',
 *         text: '...',
 *         options: [
 *           { category: 'ECOUTER', label: '...',
 *             effects: { confiance_naby: 5, lucidite: 2 },
 *             gated: { confiance_naby: 50 },
 *             next: 'id_noeud_suivant' | null }
 *         ]
 *       }
 *     }
 *   }
 */
(function () {
    'use strict';

    var CATEGORIES = [
        { key: 'ECOUTER', label: 'ECOUTER', color: '#7ed6df', hint: 'empathie, laisse parler' },
        { key: 'QUESTIONNER', label: 'QUESTIONNER', color: '#feca57', hint: 'curiosite critique' },
        { key: 'PARTAGER', label: 'PARTAGER', color: '#ff9ff3', hint: 'vulnerabilite' },
        { key: 'CONFRONTER', label: 'CONFRONTER', color: '#ff6b6b', hint: 'defier, challenge' }
    ];

    var _trees = {};
    var _currentTree = null;
    var _currentNodeId = null;
    var _currentCategory = null;
    var _active = false;
    var _overlay = null;
    var _stylesInjected = false;

    // ============================================
    // STYLES (injectes une seule fois)
    // ============================================

    function _injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        var css = [
            '#dialogue-overlay {',
            '  position: fixed; inset: 0; z-index: 9000;',
            '  background: rgba(0,0,0,0.78);',
            '  display: flex; justify-content: center; align-items: flex-end;',
            '  padding-bottom: 40px; font-family: "Segoe UI", sans-serif;',
            '  backdrop-filter: blur(4px);',
            '}',
            '#dialogue-panel {',
            '  width: min(960px, 94vw);',
            '  background: linear-gradient(180deg, #111 0%, #1a1a24 100%);',
            '  border: 1px solid rgba(120,200,255,0.35);',
            '  border-radius: 14px; box-shadow: 0 0 40px rgba(120,200,255,0.25);',
            '  padding: 20px; display: grid; grid-template-columns: 180px 1fr;',
            '  gap: 20px; color: #eaeaf2;',
            '}',
            '#dialogue-portrait {',
            '  display: flex; flex-direction: column; align-items: center;',
            '  padding: 10px;',
            '}',
            '#dialogue-portrait-img {',
            '  width: 140px; height: 140px; border-radius: 50%;',
            '  background: radial-gradient(#333, #111);',
            '  border: 3px solid rgba(120,200,255,0.6);',
            '  display: flex; align-items: center; justify-content: center;',
            '  font-size: 54px; color: #7ed6df; font-weight: 700;',
            '  background-size: cover; background-position: center;',
            '}',
            '#dialogue-char-name {',
            '  margin-top: 10px; font-size: 17px; font-weight: 700;',
            '  letter-spacing: 0.5px;',
            '}',
            '.dlg-bar-wrapper { width: 100%; margin-top: 8px; }',
            '.dlg-bar-label {',
            '  font-size: 11px; color: #aaa; display: flex;',
            '  justify-content: space-between; margin-bottom: 2px;',
            '}',
            '.dlg-bar-track {',
            '  width: 100%; height: 7px; background: #222;',
            '  border-radius: 4px; overflow: hidden;',
            '}',
            '.dlg-bar-fill {',
            '  height: 100%; transition: width 0.4s ease;',
            '  background: linear-gradient(90deg, #39ff14, #7ed6df);',
            '}',
            '.dlg-bar-fill.att {',
            '  background: linear-gradient(90deg, #ff9ff3, #feca57);',
            '}',
            '#dialogue-right {',
            '  display: flex; flex-direction: column; justify-content: space-between;',
            '}',
            '#dialogue-text-box {',
            '  background: rgba(255,255,255,0.05);',
            '  border-left: 3px solid #7ed6df;',
            '  padding: 14px 16px; border-radius: 8px;',
            '  font-size: 16px; line-height: 1.5; min-height: 80px;',
            '  font-style: italic;',
            '}',
            '#dialogue-text-box.speaker-raya {',
            '  border-left-color: #feca57; font-style: normal;',
            '}',
            '.dlg-speaker-tag {',
            '  display: inline-block; font-size: 11px; font-weight: 700;',
            '  letter-spacing: 1px; margin-bottom: 6px; color: #7ed6df;',
            '}',
            '#dialogue-text-box.speaker-raya .dlg-speaker-tag { color: #feca57; }',
            '#dialogue-categories {',
            '  display: grid; grid-template-columns: repeat(4, 1fr);',
            '  gap: 8px; margin-top: 14px;',
            '}',
            '.dlg-cat-btn {',
            '  background: rgba(255,255,255,0.04);',
            '  border: 1px solid rgba(255,255,255,0.12);',
            '  color: #eaeaf2; padding: 10px 8px; border-radius: 8px;',
            '  cursor: pointer; font-size: 12px; font-weight: 700;',
            '  letter-spacing: 0.8px; transition: all 0.2s;',
            '  display: flex; flex-direction: column; align-items: center;',
            '}',
            '.dlg-cat-btn:not(.disabled):hover {',
            '  background: rgba(255,255,255,0.12); transform: translateY(-2px);',
            '}',
            '.dlg-cat-btn.active {',
            '  border-color: currentColor; box-shadow: 0 0 12px currentColor;',
            '}',
            '.dlg-cat-btn.disabled {',
            '  opacity: 0.25; cursor: not-allowed;',
            '}',
            '.dlg-cat-hint {',
            '  font-size: 9px; font-weight: 400; letter-spacing: 0;',
            '  opacity: 0.6; margin-top: 4px; text-transform: none;',
            '}',
            '#dialogue-options { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; min-height: 60px; }',
            '.dlg-opt-btn {',
            '  text-align: left; background: rgba(126,214,223,0.08);',
            '  border: 1px solid rgba(126,214,223,0.25);',
            '  color: #eaeaf2; padding: 10px 14px; border-radius: 6px;',
            '  cursor: pointer; font-size: 14px; transition: all 0.2s;',
            '  display: flex; justify-content: space-between; align-items: center;',
            '}',
            '.dlg-opt-btn:not(.locked):hover {',
            '  background: rgba(126,214,223,0.18);',
            '  border-color: rgba(126,214,223,0.55); transform: translateX(4px);',
            '}',
            '.dlg-opt-btn.locked {',
            '  opacity: 0.45; cursor: not-allowed; filter: grayscale(0.7);',
            '}',
            '.dlg-opt-gate {',
            '  font-size: 11px; color: #ff6b6b; font-weight: 700;',
            '  margin-left: 12px;',
            '}',
            '.dlg-opt-effects {',
            '  font-size: 10px; opacity: 0.5; margin-left: 12px;',
            '  font-family: monospace;',
            '}',
            '#dialogue-close {',
            '  position: absolute; top: 12px; right: 12px;',
            '  background: transparent; border: 1px solid rgba(255,255,255,0.2);',
            '  color: #eaeaf2; width: 30px; height: 30px; border-radius: 50%;',
            '  cursor: pointer; font-size: 16px; line-height: 1;',
            '}',
            '#dialogue-close:hover { background: rgba(255,107,107,0.3); }',
            '@keyframes dlg-fadein { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }',
            '#dialogue-panel { animation: dlg-fadein 0.3s ease; }'
        ].join('\n');
        var style = document.createElement('style');
        style.id = 'dialogue-manager-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ============================================
    // RENDERING
    // ============================================

    function _ensureOverlay() {
        _injectStyles();
        if (_overlay) return;
        _overlay = document.createElement('div');
        _overlay.id = 'dialogue-overlay';
        _overlay.style.display = 'none';
        _overlay.innerHTML = [
            '<div id="dialogue-panel" style="position:relative;">',
            '  <button id="dialogue-close" title="Fermer (Echap)">X</button>',
            '  <div id="dialogue-portrait">',
            '    <div id="dialogue-portrait-img"></div>',
            '    <div id="dialogue-char-name"></div>',
            '    <div class="dlg-bar-wrapper">',
            '      <div class="dlg-bar-label"><span>Confiance</span><span id="dlg-conf-val">0</span></div>',
            '      <div class="dlg-bar-track"><div class="dlg-bar-fill" id="dlg-conf-fill" style="width:0%"></div></div>',
            '    </div>',
            '    <div class="dlg-bar-wrapper">',
            '      <div class="dlg-bar-label"><span>Attachement</span><span id="dlg-att-val">0</span></div>',
            '      <div class="dlg-bar-track"><div class="dlg-bar-fill att" id="dlg-att-fill" style="width:0%"></div></div>',
            '    </div>',
            '  </div>',
            '  <div id="dialogue-right">',
            '    <div id="dialogue-text-box">',
            '      <div class="dlg-speaker-tag" id="dlg-speaker-tag">...</div>',
            '      <div id="dlg-speaker-text"></div>',
            '    </div>',
            '    <div>',
            '      <div id="dialogue-categories"></div>',
            '      <div id="dialogue-options"></div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('\n');
        document.body.appendChild(_overlay);

        _overlay.querySelector('#dialogue-close').addEventListener('click', close);
        document.addEventListener('keydown', function (e) {
            if (!_active) return;
            if (e.key === 'Escape') close();
            if (e.key >= '1' && e.key <= '4') {
                var idx = parseInt(e.key, 10) - 1;
                if (CATEGORIES[idx]) selectCategory(CATEGORIES[idx].key);
            }
        });
    }

    function _renderNode() {
        var tree = _currentTree;
        if (!tree) return;
        var node = tree.nodes[_currentNodeId];
        if (!node) {
            console.warn('[DialogueManager] Node introuvable:', _currentNodeId);
            close();
            return;
        }

        // Portrait + nom
        var portraitEl = document.getElementById('dialogue-portrait-img');
        var nameEl = document.getElementById('dialogue-char-name');
        if (tree.portrait) {
            portraitEl.style.backgroundImage = 'url("' + tree.portrait + '")';
            portraitEl.textContent = '';
        } else {
            portraitEl.style.backgroundImage = '';
            portraitEl.textContent = (tree.characterName || '?').charAt(0).toUpperCase();
        }
        nameEl.textContent = tree.characterName || tree.characterId;

        // Jauges
        _updateRelationBars();

        // Texte du locuteur
        var tbox = document.getElementById('dialogue-text-box');
        tbox.className = node.speaker === 'raya' ? 'speaker-raya' : '';
        document.getElementById('dlg-speaker-tag').textContent =
            (node.speaker || tree.characterId).toUpperCase();
        document.getElementById('dlg-speaker-text').textContent = node.text || '';

        // Categories
        _renderCategories(node);

        // Options de la categorie par defaut (premiere disponible)
        var options = node.options || [];
        _currentCategory = null;
        var firstCat = null;
        for (var i = 0; i < CATEGORIES.length; i++) {
            var cat = CATEGORIES[i].key;
            if (options.some(function (o) { return o.category === cat; })) {
                firstCat = cat; break;
            }
        }
        if (firstCat) selectCategory(firstCat);
        else _renderOptions([]); // noeud terminal
    }

    function _renderCategories(node) {
        var container = document.getElementById('dialogue-categories');
        container.innerHTML = '';
        var opts = node.options || [];
        CATEGORIES.forEach(function (cat) {
            var btn = document.createElement('button');
            var hasAny = opts.some(function (o) { return o.category === cat.key; });
            btn.className = 'dlg-cat-btn' + (hasAny ? '' : ' disabled');
            btn.style.color = cat.color;
            btn.innerHTML = '<span>' + cat.label + '</span>' +
                '<span class="dlg-cat-hint">' + cat.hint + '</span>';
            btn.dataset.cat = cat.key;
            if (hasAny) {
                btn.addEventListener('click', function () { selectCategory(cat.key); });
            }
            container.appendChild(btn);
        });
    }

    function _renderOptions(opts) {
        var container = document.getElementById('dialogue-options');
        container.innerHTML = '';
        if (opts.length === 0) {
            var end = document.createElement('button');
            end.className = 'dlg-opt-btn';
            end.textContent = 'Terminer la conversation';
            end.addEventListener('click', close);
            container.appendChild(end);
            return;
        }
        opts.forEach(function (opt, i) {
            var locked = _isOptionLocked(opt);
            var btn = document.createElement('button');
            btn.className = 'dlg-opt-btn' + (locked ? ' locked' : '');
            var labelSpan = document.createElement('span');
            labelSpan.textContent = opt.label || '...';
            btn.appendChild(labelSpan);

            // Les effets (points de lucidite/confiance) sont intentionnellement masques de l'UI :
            // afficher les gains risque de biaiser le choix du joueur qui optimiserait les points
            // plutot que de reflechir. Seuls les choix verrouilles sont signales.
            if (locked) {
                var right = document.createElement('span');
                right.className = 'dlg-opt-gate';
                right.textContent = '[verrouille: ' + _formatGate(opt.gated) + ']';
                btn.appendChild(right);
            }

            if (!locked) {
                btn.addEventListener('click', function () { _applyOption(opt); });
            }
            container.appendChild(btn);
        });
    }

    function _isOptionLocked(opt) {
        if (!opt.gated) return false;
        var keys = Object.keys(opt.gated);
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var req = opt.gated[k];
            var cur = _readStat(k);
            if (cur < req) return true;
        }
        return false;
    }

    function _readStat(key) {
        if (key === 'lucidite') return typeof LucidityManager !== 'undefined' ? LucidityManager.getLucidite() : 0;
        var m = key.match(/^confiance_(.+)$/);
        if (m) return typeof RelationshipManager !== 'undefined' ? RelationshipManager.getConfiance(m[1]) : 0;
        m = key.match(/^attachement_(.+)$/);
        if (m) return typeof RelationshipManager !== 'undefined' ? RelationshipManager.getAttachement(m[1]) : 0;
        return 0;
    }

    function _formatGate(gated) {
        return Object.keys(gated).map(function (k) {
            return k.replace('_', ' ') + ' >= ' + gated[k];
        }).join(', ');
    }

    function _formatEffects(effects) {
        return Object.keys(effects).map(function (k) {
            var v = effects[k];
            var sign = v > 0 ? '+' : '';
            var label = k === 'lucidite' ? 'Lucidite' :
                k.indexOf('confiance_') === 0 ? 'Conf' :
                k.indexOf('attachement_') === 0 ? 'Att' : k;
            return sign + v + ' ' + label;
        }).join('  ');
    }

    function _applyOption(opt) {
        // Appliquer les effects
        if (opt.effects) {
            Object.keys(opt.effects).forEach(function (k) {
                var v = opt.effects[k];
                if (k === 'lucidite' && typeof LucidityManager !== 'undefined') {
                    LucidityManager.addLucidite(v);
                } else if (k.indexOf('confiance_') === 0 && typeof RelationshipManager !== 'undefined') {
                    RelationshipManager.addConfiance(k.slice('confiance_'.length), v);
                } else if (k.indexOf('attachement_') === 0 && typeof RelationshipManager !== 'undefined') {
                    RelationshipManager.addAttachement(k.slice('attachement_'.length), v);
                }
            });
        }
        _updateRelationBars();
        // Navigation
        if (opt.next && _currentTree.nodes[opt.next]) {
            _currentNodeId = opt.next;
            _renderNode();
        } else {
            // fin de branche : soit noeud terminal, soit fermeture
            close();
        }
    }

    function _updateRelationBars() {
        if (!_currentTree) return;
        var id = _currentTree.characterId;
        var conf = typeof RelationshipManager !== 'undefined' ? RelationshipManager.getConfiance(id) : 0;
        var att = typeof RelationshipManager !== 'undefined' ? RelationshipManager.getAttachement(id) : 0;
        var cf = document.getElementById('dlg-conf-fill');
        var cv = document.getElementById('dlg-conf-val');
        var af = document.getElementById('dlg-att-fill');
        var av = document.getElementById('dlg-att-val');
        if (cf) cf.style.width = conf + '%';
        if (cv) cv.textContent = conf;
        if (af) af.style.width = att + '%';
        if (av) av.textContent = att;
    }

    // ============================================
    // API PUBLIQUE
    // ============================================

    function loadTree(treeId, tree) {
        _trees[treeId] = tree;
    }

    function start(treeId, startNodeId) {
        var tree = _trees[treeId];
        if (!tree) {
            console.warn('[DialogueManager] Arbre introuvable:', treeId);
            return;
        }
        _currentTree = tree;
        _currentNodeId = startNodeId || tree.startNode || Object.keys(tree.nodes)[0];
        if (typeof tree.onStart === 'function') tree.onStart(); /* hook optionnel par arbre */
        _ensureOverlay();
        _overlay.style.display = 'flex';
        _active = true;
        // Verrouille les controles jeu si pointerLock
        if (document.pointerLockElement) document.exitPointerLock();
        _renderNode();
    }

    function close() {
        if (!_active) return;
        _active = false;
        if (_overlay) _overlay.style.display = 'none';
        _currentTree = null;
        _currentNodeId = null;
        _currentCategory = null;
    }

    function isActive() { return _active; }

    function selectCategory(catKey) {
        if (!_currentTree) return;
        var node = _currentTree.nodes[_currentNodeId];
        if (!node) return;
        _currentCategory = catKey;
        // Mise en valeur du bouton
        var btns = document.querySelectorAll('.dlg-cat-btn');
        btns.forEach(function (b) {
            b.classList.toggle('active', b.dataset.cat === catKey);
        });
        var opts = (node.options || []).filter(function (o) { return o.category === catKey; });
        _renderOptions(opts);
    }

    function selectOption(idx) {
        if (!_currentTree || !_currentCategory) return;
        var node = _currentTree.nodes[_currentNodeId];
        if (!node) return;
        var opts = (node.options || []).filter(function (o) { return o.category === _currentCategory; });
        if (opts[idx] && !_isOptionLocked(opts[idx])) _applyOption(opts[idx]);
    }

    window.DialogueManager = {
        loadTree: loadTree,
        start: start,
        close: close,
        isActive: isActive,
        selectCategory: selectCategory,
        selectOption: selectOption,
        CATEGORIES: CATEGORIES.map(function (c) { return c.key; })
    };
})();

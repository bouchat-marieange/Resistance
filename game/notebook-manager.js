/**
 * ============================================
 * NOTEBOOK MANAGER - Resistance
 * ============================================
 * Carnet plein-ecran qui met le jeu en pause. Affiche les recompenses
 * collectees, les objets, les pieces validees (fast-travel) a gauche ;
 * le nom de la piece courante, pastille personnage et synthese a droite.
 *
 * Philosophie (validee avec Marie-Ange, avril 2026):
 *  - Onglet carnet dans le #right-dock (meme style que minimap).
 *  - Icone notebook-pen.svg Lucide, teintee cyan, effets hover identiques.
 *  - Clic => met le jeu en pause + ouvre overlay plein ecran (~95vw x 92vh).
 *  - Recompenses : couleur si obtenue, grisee avec "?" sinon.
 *  - Pas de zoom/pan sur le carnet (UI lisible a 100%, scroll interne si besoin).
 *
 * API:
 *   NotebookManager.init()
 *   NotebookManager.open() / close() / toggle()
 *   NotebookManager.isOpen()
 *   NotebookManager.setCurrentRoom(roomId, roomTitle)
 *   NotebookManager.setCharacterChip(charId, charName, portraitUrl)
 *   NotebookManager.setSynthesisText(markdown)
 *   NotebookManager.unlockBadge(badgeId)
 *   NotebookManager.isBadgeUnlocked(badgeId)
 *   NotebookManager.addItem(itemId, name, iconUrl)
 *   NotebookManager.markRoomValidated(roomId)
 *   NotebookManager.setBackgroundImage(url)   // Marie-Ange injecte son carnet
 */
(function () {
    'use strict';

    var STORAGE_KEY_PREFIX = 'resistance_notebook_';

    // Liste des 30 badges (voir reponse pedagogique dans le chat)
    var BADGES = [
        // ---- NARRATIFS (5) : 1 par piece validee du TFE ----
        { id: 'eveil',          name: 'Éveil',                 cat: 'narratif',    desc: 'Sortir du cocoon du Nexus' },
        { id: 'ventilation',    name: 'Ventilation',           cat: 'narratif',    desc: 'Maitriser la salle de controle du Nexus' },
        { id: 'sortie_nexus',   name: 'Sortie du Nexus',       cat: 'narratif',    desc: 'Franchir le hall et quitter le Nexus' },
        { id: 'villa_demasquee', name: 'La Villa demasquee',  cat: 'narratif',    desc: 'Decrypter le code et entrer dans la Villa' },
        { id: 'partenariat',    name: 'Partenariat',           cat: 'narratif',    desc: 'Valider une vraie relation de confiance avec Naby' },

        // ---- CONCEPTUELS (7) : captologie + IA critique ----
        { id: 'lanceur_alerte', name: 'Lanceur d\'alerte',     cat: 'concept',     desc: 'Questionner pour la 1ere fois une affirmation d\'IA' },
        { id: 'dark_pattern',   name: 'Design hostile',        cat: 'concept',     desc: 'Identifier un dark pattern dans une interface' },
        { id: 'captology',      name: 'Captologie',            cat: 'concept',     desc: 'Comprendre le principe de captologie (BJ Fogg)' },
        { id: 'attention_eco',  name: 'Economie de l\'attention', cat: 'concept', desc: 'Nommer un mecanisme d\'economie de l\'attention' },
        { id: 'biais_algo',     name: 'Biais algorithmique',   cat: 'concept',     desc: 'Voir un biais IA se manifester' },
        { id: 'donnee_perso',   name: 'Donnee personnelle',    cat: 'concept',     desc: 'Comprendre la captation des donnees emotionnelles' },
        { id: 'feedback_loop',  name: 'Boucle de retention',   cat: 'concept',     desc: 'Reconnaitre une boucle de retention / feedback loop' },

        // ---- RELATIONNELS (12) : 1 par PNJ valide ----
        { id: 'rel_naby',   name: 'Complicite : Naby',    cat: 'relation', desc: 'Valider la relation avec Naby' },
        { id: 'rel_eliott', name: 'Complicite : Eliott',  cat: 'relation', desc: 'Valider la relation avec Eliott' },
        { id: 'rel_ilan',   name: 'Complicite : Ilan',    cat: 'relation', desc: 'Valider la relation avec Ilan' },
        { id: 'rel_naia',   name: 'Complicite : Dr Naia', cat: 'relation', desc: 'Valider la relation avec Dr Naia' },
        { id: 'rel_sky',    name: 'Complicite : Sky',     cat: 'relation', desc: 'Valider la relation avec Sky' },
        { id: 'rel_iona',   name: 'Complicite : Iona',    cat: 'relation', desc: 'Valider la relation avec Iona' },
        { id: 'rel_ruby',   name: 'Complicite : Ruby',    cat: 'relation', desc: 'Valider la relation avec Ruby' },
        { id: 'rel_fox',    name: 'Complicite : Fox',     cat: 'relation', desc: 'Valider la relation avec Fox' },
        { id: 'rel_alex',   name: 'Complicite : Alex',    cat: 'relation', desc: 'Valider la relation avec Alex' },
        { id: 'rel_kat',    name: 'Complicite : Kat',     cat: 'relation', desc: 'Valider la relation avec Kat' },
        { id: 'rel_maze',   name: 'Complicite : Maze',    cat: 'relation', desc: 'Valider la relation avec Maze' },
        { id: 'rel_falcon', name: 'Complicite : Falcon',  cat: 'relation', desc: 'Valider la relation avec Falcon' },

        // ---- META (6) : comportementaux rares ----
        { id: 'lucidite_haute', name: 'Lucidite haute',      cat: 'meta', desc: 'Atteindre 80+ de lucidite globale' },
        { id: 'sortie_emprise', name: 'Sortie d\'emprise',   cat: 'meta', desc: 'Remonter de < 20 a > 50 de lucidite' },
        { id: 'archiviste',     name: 'Archiviste',          cat: 'meta', desc: 'Collecter tous les objets d\'une piece' },
        { id: 'empathique',     name: 'Empathique',          cat: 'meta', desc: 'Attachement 100 avec un PNJ' },
        { id: 'confident',      name: 'Confident',           cat: 'meta', desc: 'Valider 3 PNJ' },
        { id: 'resistant',      name: 'Resistant',           cat: 'meta', desc: 'Valider les 5 pieces du prototype' }
    ];

    var _initialized = false;
    var _tab = null;         // bouton onglet dans #right-dock
    var _overlay = null;     // overlay plein ecran
    var _isOpen = false;
    var _currentRoom = { id: null, title: '—' };
    var _characterChip = { id: null, name: null, portrait: null };
    var _synthesisText = '';
    var _backgroundUrl = null;

    // ============================================
    // STORAGE (scoped par pseudo)
    // ============================================

    function _key(suffix) {
        var pseudo = (typeof ScoreManager !== 'undefined' && ScoreManager.getActivePseudo)
            ? ScoreManager.getActivePseudo() : 'default';
        return STORAGE_KEY_PREFIX + (pseudo || 'default') + '_' + suffix;
    }

    function _loadSet(suffix) {
        try {
            var raw = localStorage.getItem(_key(suffix));
            return raw ? new Set(JSON.parse(raw)) : new Set();
        } catch (e) { return new Set(); }
    }

    function _saveSet(suffix, set) {
        try {
            localStorage.setItem(_key(suffix), JSON.stringify(Array.from(set)));
        } catch (e) {}
    }

    // ============================================
    // STYLES
    // ============================================

    function _injectStyles() {
        if (document.getElementById('notebook-manager-styles')) return;
        var css = [
            // ---- Onglet ----
            '#notebook-tab {',
            '  width: 44px; height: 44px; flex-shrink: 0;',
            '  background: rgba(18,18,26,0.88);',
            '  border: 1px solid rgba(126,214,223,0.5);',
            '  border-radius: 10px; cursor: pointer; padding: 0;',
            '  display: flex; align-items: center; justify-content: center;',
            '  transition: background 0.2s, box-shadow 0.2s;',
            '  backdrop-filter: blur(4px);',
            '}',
            '#notebook-tab:hover {',
            '  background: rgba(126,214,223,0.15);',
            '  box-shadow: 0 0 12px rgba(126,214,223,0.4);',
            '}',
            '#notebook-tab::before {',
            '  content: ""; display: block; width: 24px; height: 24px;',
            '  background-color: #7ed6df;',
            '  -webkit-mask: url("icones/notebook-pen.svg") center/contain no-repeat;',
            '          mask: url("icones/notebook-pen.svg") center/contain no-repeat;',
            '  transition: transform 0.2s, background-color 0.2s;',
            '}',
            '#notebook-tab:hover::before {',
            '  transform: scale(1.12); background-color: #a8edf3;',
            '}',

            // ---- Overlay ----
            '#notebook-overlay {',
            '  position: fixed; inset: 0; z-index: 9100;',
            '  background: rgba(0,0,0,0.82);',
            '  backdrop-filter: blur(6px);',
            '  display: none; justify-content: center; align-items: center;',
            '  font-family: "Segoe UI", sans-serif;',
            '}',
            '#notebook-overlay.open { display: flex; }',
            '#notebook-panel {',
            '  position: relative;',
            '  width: 95vw; height: 92vh;',
            '  background: rgba(18,18,26,0.96);',
            '  border: 1px solid rgba(126,214,223,0.4);',
            '  border-radius: 14px;',
            '  box-shadow: 0 0 40px rgba(126,214,223,0.25);',
            '  padding: 12px;',
            '  animation: nb-fadein 0.35s ease;',
            '}',
            '@keyframes nb-fadein {',
            '  from { opacity: 0; transform: scale(0.96); }',
            '  to { opacity: 1; transform: scale(1); }',
            '}',
            '#notebook-close {',
            '  position: absolute; top: 10px; right: 10px; z-index: 5;',
            '  background: transparent; border: 1px solid rgba(255,255,255,0.2);',
            '  color: #eaeaf2; width: 32px; height: 32px; border-radius: 50%;',
            '  cursor: pointer; font-size: 16px; line-height: 1;',
            '}',
            '#notebook-close:hover { background: rgba(255,107,107,0.3); }',

            // ---- Inner pages ----
            '#notebook-pages {',
            '  width: 100%; height: 100%; border-radius: 8px;',
            '  background-size: 100% 100%; background-repeat: no-repeat;',
            '  background-color: rgba(30,26,22,0.5);', // fallback avant bg image
            '  display: grid; grid-template-columns: 1fr 1fr; gap: 24px;',
            '  padding: 36px 42px; box-sizing: border-box;',
            '  overflow: hidden;',
            '}',
            '.nb-page { display: flex; flex-direction: column; gap: 18px; min-height: 0; }',
            '.nb-section-title {',
            '  font-size: 11px; color: #7ed6df; letter-spacing: 2px;',
            '  text-transform: uppercase; font-weight: 700;',
            '  border-bottom: 1px solid rgba(126,214,223,0.25);',
            '  padding-bottom: 4px; margin-bottom: 6px;',
            '}',

            // ---- Recompenses grid : UNE seule ligne visible, scroll vertical pour le reste ----
            // aspect-ratio 6/1 : la grille est toujours ~6x plus large que haute, donc
            // une seule ligne de badges (aspect-ratio 1) tient à n'importe quelle largeur.
            '.nb-badges-grid {',
            '  display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;',
            '  aspect-ratio: 6 / 1;',
            '  overflow-y: auto;',
            '  overflow-x: hidden;',
            '  padding-right: 4px;',
            '}',
            '.nb-badge {',
            '  aspect-ratio: 1; border-radius: 10px;',
            '  display: flex; align-items: center; justify-content: center;',
            '  border: 1.5px solid rgba(255,255,255,0.08);',
            '  position: relative; cursor: help;',
            '  transition: transform 0.2s, border-color 0.2s;',
            '  font-size: 20px;',
            '}',
            '.nb-badge.locked {',
            '  background: rgba(255,255,255,0.03); color: #444;',
            '  filter: grayscale(1);',
            '}',
            '.nb-badge.unlocked {',
            '  background: linear-gradient(135deg, rgba(126,214,223,0.15), rgba(57,255,20,0.15));',
            '  border-color: rgba(126,214,223,0.6);',
            '  box-shadow: 0 0 12px rgba(126,214,223,0.3);',
            '  color: #eaeaf2;',
            '}',
            '.nb-badge.unlocked:hover {',
            '  transform: scale(1.08);',
            '  border-color: #7ed6df;',
            '}',
            '.nb-badge.cat-narratif.unlocked { border-color: #feca57; box-shadow: 0 0 12px rgba(254,202,87,0.4); }',
            '.nb-badge.cat-concept.unlocked { border-color: #7ed6df; }',
            '.nb-badge.cat-relation.unlocked { border-color: #ff9ff3; box-shadow: 0 0 12px rgba(255,159,243,0.3); }',
            '.nb-badge.cat-meta.unlocked { border-color: #39ff14; }',
            '.nb-badge-tooltip {',
            '  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-4px);',
            '  background: rgba(0,0,0,0.92); color: #eaeaf2; padding: 6px 10px;',
            '  border-radius: 5px; font-size: 11px; white-space: normal; width: 160px;',
            '  pointer-events: none; opacity: 0; transition: opacity 0.2s;',
            '  text-align: center; z-index: 10;',
            '  border: 1px solid rgba(126,214,223,0.3);',
            '}',
            '.nb-badge:hover .nb-badge-tooltip { opacity: 1; }',
            '.nb-badge-name { font-size: 10px; font-weight: 700; display: block; }',
            '.nb-badge-desc { font-size: 10px; opacity: 0.8; display: block; margin-top: 3px; }',

            // ---- Items (cartes visuelles : icone + nom sous l\'image) ----
            '.nb-items-list {',
            '  display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px;',
            '  min-height: 100px;',
            '  padding: 10px; border: 1px dashed rgba(255,255,255,0.1);',
            '  border-radius: 6px;',
            '}',
            '.nb-item {',
            '  display: flex; flex-direction: column; align-items: center; gap: 6px;',
            '  padding: 8px 6px;',
            '  background: rgba(126,214,223,0.06); border: 1px solid rgba(126,214,223,0.25);',
            '  border-radius: 8px;',
            '  transition: transform 0.2s, border-color 0.2s, background 0.2s;',
            '  cursor: help;',
            '}',
            '.nb-item:hover {',
            '  transform: translateY(-2px);',
            '  border-color: rgba(126,214,223,0.6);',
            '  background: rgba(126,214,223,0.12);',
            '  box-shadow: 0 4px 12px rgba(126,214,223,0.15);',
            '}',
            '.nb-item-icon {',
            '  width: 56px; height: 56px; border-radius: 6px;',
            '  background-size: contain; background-position: center; background-repeat: no-repeat;',
            '  display: flex; align-items: center; justify-content: center;',
            '  color: #7ed6df; font-size: 26px; font-weight: 700; font-family: "Segoe UI", sans-serif;',
            '  background-color: rgba(18,18,26,0.45);',
            '}',
            '.nb-item-label {',
            '  font-size: 11px; color: #c8d0dc; text-align: center;',
            '  line-height: 1.25; max-width: 100%;',
            '  overflow: hidden; text-overflow: ellipsis;',
            '  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;',
            '}',
            '.nb-items-empty { color: #555; font-size: 11px; font-style: italic; padding: 8px; grid-column: 1 / -1; }',

            // ---- Fast-travel rooms ----
            '.nb-rooms-list { display: flex; flex-direction: column; gap: 6px; }',
            '.nb-room-btn {',
            '  display: flex; justify-content: space-between; align-items: center;',
            '  padding: 8px 12px; background: rgba(255,255,255,0.03);',
            '  border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;',
            '  color: #eaeaf2; font-size: 13px; cursor: pointer;',
            '  transition: all 0.2s;',
            '}',
            '.nb-room-btn.validated {',
            '  background: rgba(57,255,20,0.08); border-color: rgba(57,255,20,0.35);',
            '}',
            '.nb-room-btn.validated:hover {',
            '  background: rgba(57,255,20,0.16); transform: translateX(3px);',
            '}',
            '.nb-room-btn.locked {',
            '  opacity: 0.4; cursor: not-allowed;',
            '}',
            '.nb-room-status { font-size: 11px; font-weight: 700; }',
            '.nb-room-status.ok { color: #39ff14; }',
            '.nb-room-status.no { color: #666; }',

            // ---- Right page : room title + character chip ----
            '.nb-room-title {',
            '  font-size: 22px; color: #eaeaf2; font-weight: 700;',
            '  letter-spacing: 0.5px; margin-bottom: 4px;',
            '}',
            '.nb-room-subtitle {',
            '  font-size: 11px; color: #7ed6df; letter-spacing: 2px;',
            '  text-transform: uppercase;',
            '}',
            '.nb-character-chip {',
            '  display: flex; align-items: center; gap: 12px;',
            '  padding: 10px; background: rgba(255,255,255,0.04);',
            '  border: 1px solid rgba(126,214,223,0.25); border-radius: 8px;',
            '}',
            '.nb-character-portrait {',
            '  width: 54px; height: 54px; border-radius: 50%;',
            '  background: radial-gradient(#333, #111);',
            '  border: 2px solid rgba(126,214,223,0.5);',
            '  background-size: cover; background-position: center;',
            '  display: flex; align-items: center; justify-content: center;',
            '  color: #7ed6df; font-weight: 700; font-size: 22px;',
            '}',
            '.nb-character-info { display: flex; flex-direction: column; }',
            '.nb-character-name { font-size: 15px; font-weight: 700; color: #eaeaf2; }',
            '.nb-character-role { font-size: 10px; color: #7ed6df; letter-spacing: 1.4px; text-transform: uppercase; }',
            '.nb-character-chip.empty { opacity: 0.35; font-style: italic; }',

            // ---- Synthesis ----
            '.nb-synthesis {',
            '  flex: 1; overflow-y: auto; padding: 12px 14px;',
            '  background: rgba(255,255,255,0.03);',
            '  border: 1px solid rgba(255,255,255,0.08);',
            '  border-radius: 6px;',
            '  font-size: 13px; line-height: 1.6; color: #c8d0dc;',
            '}',
            '.nb-synthesis.empty { font-style: italic; color: #555; }',

            // Scrollbars fins
            '.nb-badges-grid::-webkit-scrollbar,',
            '.nb-synthesis::-webkit-scrollbar { width: 6px; }',
            '.nb-badges-grid::-webkit-scrollbar-track,',
            '.nb-synthesis::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }',
            '.nb-badges-grid::-webkit-scrollbar-thumb,',
            '.nb-synthesis::-webkit-scrollbar-thumb { background: rgba(126,214,223,0.3); border-radius: 3px; }'
        ].join('\n');
        var style = document.createElement('style');
        style.id = 'notebook-manager-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ============================================
    // BUILD DOM
    // ============================================

    function _buildTab() {
        var dock = document.getElementById('right-dock');
        var parent = dock || document.body;
        _tab = document.createElement('button');
        _tab.id = 'notebook-tab';
        _tab.title = 'Ouvrir le carnet (J)';
        _tab.setAttribute('aria-label', 'Ouvrir le carnet');
        _tab.addEventListener('click', open);
        // L'onglet carnet va AVANT la minimap (a gauche visuellement)
        var minimap = document.getElementById('minimap-hud');
        if (minimap && minimap.parentNode === parent) {
            parent.insertBefore(_tab, minimap);
        } else {
            parent.appendChild(_tab);
        }
        if (!dock) {
            // Positionnement fallback si pas de dock
            _tab.style.position = 'fixed';
            _tab.style.bottom = '16px';
            _tab.style.right = '76px';
            _tab.style.zIndex = '100';
        }
    }

    function _buildOverlay() {
        _overlay = document.createElement('div');
        _overlay.id = 'notebook-overlay';
        _overlay.innerHTML = [
            '<div id="notebook-panel">',
            '  <button id="notebook-close" title="Fermer (J ou Echap)">×</button>',
            '  <div id="notebook-pages">',
            // PAGE GAUCHE
            '    <div class="nb-page nb-left">',
            '      <div>',
            '        <div class="nb-section-title">Récompenses</div>',
            '        <div class="nb-badges-grid" id="nb-badges"></div>',
            '      </div>',
            '      <div>',
            '        <div class="nb-section-title">Objets collectés</div>',
            '        <div class="nb-items-list" id="nb-items">',
            '          <div class="nb-items-empty">Aucun objet pour l\'instant</div>',
            '        </div>',
            '      </div>',
            '      <div>',
            '        <div class="nb-section-title">Pièces — accès direct</div>',
            '        <div class="nb-rooms-list" id="nb-rooms"></div>',
            '      </div>',
            '    </div>',
            // PAGE DROITE
            '    <div class="nb-page nb-right">',
            '      <div>',
            '        <div class="nb-room-subtitle">Pièce en cours</div>',
            '        <div class="nb-room-title" id="nb-room-title">—</div>',
            '      </div>',
            '      <div class="nb-character-chip empty" id="nb-char-chip">',
            '        <div class="nb-character-portrait">?</div>',
            '        <div class="nb-character-info">',
            '          <div class="nb-character-name">Personne en vue</div>',
            '          <div class="nb-character-role">—</div>',
            '        </div>',
            '      </div>',
            '      <div>',
            '        <div class="nb-section-title">Synthèse des concepts</div>',
            '        <div class="nb-synthesis empty" id="nb-synthesis">',
            '          La synthèse se construira au fur et à mesure de tes interactions.',
            '        </div>',
            '      </div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('\n');
        document.body.appendChild(_overlay);

        _overlay.querySelector('#notebook-close').addEventListener('click', close);
        // Clic en dehors du panel => ferme
        _overlay.addEventListener('click', function (e) {
            if (e.target === _overlay) close();
        });

        // Echap
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && _isOpen) close();
        });

        _renderBadges();
        _renderRooms();
    }

    // ============================================
    // RENDERING
    // ============================================

    function _renderBadges() {
        var grid = document.getElementById('nb-badges');
        if (!grid) return;
        var unlocked = _loadSet('badges');
        grid.innerHTML = '';
        BADGES.forEach(function (b) {
            var isUnlocked = unlocked.has(b.id);
            var div = document.createElement('div');
            div.className = 'nb-badge cat-' + b.cat + ' ' + (isUnlocked ? 'unlocked' : 'locked');
            div.textContent = isUnlocked ? _iconFor(b.cat) : '?';
            var tip = document.createElement('div');
            tip.className = 'nb-badge-tooltip';
            tip.innerHTML = '<span class="nb-badge-name">' +
                (isUnlocked ? b.name : '???') + '</span>' +
                '<span class="nb-badge-desc">' +
                (isUnlocked ? b.desc : 'Récompense à découvrir') + '</span>';
            div.appendChild(tip);
            grid.appendChild(div);
        });
    }

    function _iconFor(cat) {
        // Emoji provisoire en attendant les visuels de Marie-Ange
        return cat === 'narratif' ? '★' :
               cat === 'concept'  ? '◆' :
               cat === 'relation' ? '♥' : '◉';
    }

    function _renderRooms() {
        var list = document.getElementById('nb-rooms');
        if (!list) return;
        list.innerHTML = '';
        var rooms = [
            { id: 'cocoon_nexus',         title: 'Cocoon du Nexus',        file: 'cocoon_nexus.html' },
            { id: 'salle_controle_nexus', title: 'Salle de contrôle',      file: 'salle_controle_nexus.html' },
            { id: 'hall_entree_nexus',    title: 'Hall d\'entrée',         file: 'hall_entree_nexus.html' },
            { id: 'la_villa',             title: 'La Villa',               file: 'la_villa.html' },
            { id: 'sas_securite',         title: 'Sas de sécurité — Naby', file: 'sas_securite.html' }
        ];
        var validated = _loadSet('rooms_validated');
        rooms.forEach(function (r) {
            var btn = document.createElement('button');
            var ok = validated.has(r.id);
            btn.className = 'nb-room-btn' + (ok ? ' validated' : ' locked');
            btn.innerHTML = '<span>' + r.title + '</span>' +
                '<span class="nb-room-status ' + (ok ? 'ok' : 'no') + '">' +
                (ok ? '✓ débloqué' : '— verrouillé') + '</span>';
            if (ok) {
                btn.addEventListener('click', function () {
                    window.location.href = r.file;
                });
            }
            list.appendChild(btn);
        });
    }

    function _refreshRoomTitle() {
        var el = document.getElementById('nb-room-title');
        if (el) el.textContent = _currentRoom.title || '—';
    }

    function _refreshCharacterChip() {
        var chip = document.getElementById('nb-char-chip');
        if (!chip) return;
        if (!_characterChip.id) {
            chip.className = 'nb-character-chip empty';
            chip.querySelector('.nb-character-portrait').textContent = '?';
            chip.querySelector('.nb-character-portrait').style.backgroundImage = '';
            chip.querySelector('.nb-character-name').textContent = 'Personne en vue';
            chip.querySelector('.nb-character-role').textContent = '—';
            return;
        }
        chip.className = 'nb-character-chip';
        var portrait = chip.querySelector('.nb-character-portrait');
        if (_characterChip.portrait) {
            portrait.style.backgroundImage = 'url(' + _characterChip.portrait + ')';
            portrait.textContent = '';
        } else {
            portrait.style.backgroundImage = '';
            portrait.textContent = _characterChip.name.charAt(0).toUpperCase();
        }
        chip.querySelector('.nb-character-name').textContent = _characterChip.name;
        chip.querySelector('.nb-character-role').textContent = 'Résistant·e';
    }

    function _refreshSynthesis() {
        var el = document.getElementById('nb-synthesis');
        if (!el) return;
        if (!_synthesisText) {
            el.className = 'nb-synthesis empty';
            el.textContent = 'La synthèse se construira au fur et à mesure de tes interactions.';
        } else {
            el.className = 'nb-synthesis';
            el.innerHTML = _synthesisText; // texte libre, peut contenir du HTML simple
        }
    }

    function _refreshBackground() {
        var pages = document.getElementById('notebook-pages');
        if (!pages) return;
        if (_backgroundUrl) {
            pages.style.backgroundImage = 'url(' + _backgroundUrl + ')';
        }
    }

    // ============================================
    // API PUBLIQUE
    // ============================================

    function open() {
        if (_isOpen) return;
        _isOpen = true;
        if (!_overlay) return;
        _overlay.classList.add('open');
        if (document.pointerLockElement) document.exitPointerLock();
        _renderBadges();
        _renderRooms();
        _refreshRoomTitle();
        _refreshCharacterChip();
        _refreshSynthesis();
        _refreshBackground();
    }

    function close() {
        if (!_isOpen) return;
        _isOpen = false;
        if (_overlay) _overlay.classList.remove('open');
    }

    function toggle() { _isOpen ? close() : open(); }
    function isOpen() { return _isOpen; }

    function setCurrentRoom(id, title) {
        _currentRoom.id = id;
        _currentRoom.title = title;
        _refreshRoomTitle();
    }

    function setCharacterChip(id, name, portraitUrl) {
        _characterChip.id = id;
        _characterChip.name = name;
        _characterChip.portrait = portraitUrl || null;
        _refreshCharacterChip();
    }

    function setSynthesisText(text) {
        _synthesisText = text || '';
        _refreshSynthesis();
    }

    function setBackgroundImage(url) {
        _backgroundUrl = url;
        _refreshBackground();
    }

    function unlockBadge(badgeId) {
        var def = BADGES.find(function (b) { return b.id === badgeId; });
        if (!def) { console.warn('[NotebookManager] badge inconnu:', badgeId); return false; }
        var set = _loadSet('badges');
        if (set.has(badgeId)) return false; // deja debloque
        set.add(badgeId);
        _saveSet('badges', set);
        _renderBadges();
        _flashBadgeNotification(def);
        return true;
    }

    function isBadgeUnlocked(id) {
        return _loadSet('badges').has(id);
    }

    function addItem(itemId, name, iconUrl) {
        // Stocker dans localStorage (items est un objet id -> {name, icon})
        var raw = {};
        try { raw = JSON.parse(localStorage.getItem(_key('items')) || '{}'); } catch (e) {}
        raw[itemId] = { name: name, icon: iconUrl || null };
        localStorage.setItem(_key('items'), JSON.stringify(raw));
        // Re-render si ouvert
        var list = document.getElementById('nb-items');
        if (list) _renderItems();
    }

    function _renderItems() {
        var list = document.getElementById('nb-items');
        if (!list) return;
        var raw = {};
        try { raw = JSON.parse(localStorage.getItem(_key('items')) || '{}'); } catch (e) {}
        var keys = Object.keys(raw);
        list.innerHTML = '';
        if (!keys.length) {
            list.innerHTML = '<div class="nb-items-empty">Aucun objet pour l\'instant</div>';
            return;
        }
        keys.forEach(function (k) {
            var it = raw[k];
            var el = document.createElement('div');
            el.className = 'nb-item';
            el.title = it.name;

            var icon = document.createElement('div');
            icon.className = 'nb-item-icon';
            if (it.icon) {
                icon.style.backgroundImage = 'url(' + it.icon + ')';
            } else {
                // Fallback : initiale stylisee si pas d'image fournie
                icon.textContent = it.name.charAt(0).toUpperCase();
            }
            el.appendChild(icon);

            var label = document.createElement('div');
            label.className = 'nb-item-label';
            label.textContent = it.name;
            el.appendChild(label);

            list.appendChild(el);
        });
    }

    function markRoomValidated(roomId) {
        var set = _loadSet('rooms_validated');
        if (set.has(roomId)) return false;
        set.add(roomId);
        _saveSet('rooms_validated', set);
        _renderRooms();
        return true;
    }

    function _flashBadgeNotification(badgeDef) {
        // Notification discrete haut-droite pendant 2.5s
        var notif = document.createElement('div');
        notif.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); ' +
            'z-index: 9500; background: rgba(18,18,26,0.95); ' +
            'border: 1px solid rgba(126,214,223,0.6); border-radius: 10px; ' +
            'padding: 12px 18px; color:#eaeaf2; font-family:"Segoe UI",sans-serif; ' +
            'box-shadow: 0 0 20px rgba(126,214,223,0.45); ' +
            'opacity: 0; transition: opacity 0.4s, transform 0.4s; ' +
            'font-size:13px; display:flex; align-items:center; gap:10px;';
        notif.innerHTML = '<span style="font-size:24px; color:#feca57;">' +
            _iconFor(badgeDef.cat) + '</span>' +
            '<div><div style="font-size:10px; letter-spacing:1.5px; color:#7ed6df; text-transform:uppercase;">Nouvelle récompense</div>' +
            '<div style="font-weight:700; margin-top:2px;">' + badgeDef.name + '</div></div>';
        document.body.appendChild(notif);
        requestAnimationFrame(function () {
            notif.style.opacity = '1';
            notif.style.transform = 'translate(-50%, 10px)';
        });
        setTimeout(function () {
            notif.style.opacity = '0';
            notif.style.transform = 'translate(-50%, -10px)';
        }, 2500);
        setTimeout(function () { notif.remove(); }, 3000);
    }

    function init() {
        if (_initialized) return;
        _initialized = true;
        _injectStyles();
        _buildTab();
        _buildOverlay();
    }

    window.NotebookManager = {
        init: init,
        open: open,
        close: close,
        toggle: toggle,
        isOpen: isOpen,
        setCurrentRoom: setCurrentRoom,
        setCharacterChip: setCharacterChip,
        setSynthesisText: setSynthesisText,
        setBackgroundImage: setBackgroundImage,
        unlockBadge: unlockBadge,
        isBadgeUnlocked: isBadgeUnlocked,
        addItem: addItem,
        markRoomValidated: markRoomValidated,
        BADGES: BADGES
    };
})();

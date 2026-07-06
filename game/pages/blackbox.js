
// ============================================================
// LEXIQUE — 36 entrées (0–9 + A–Z) — ordre 6×6 ligne par ligne
// ============================================================
const LEXICON = [
  {char:'0', icon:'moon'},       {char:'1', icon:'rocket'},
  {char:'2', icon:'bird'},       {char:'3', icon:'anchor'},
  {char:'4', icon:'star'},       {char:'5', icon:'sun'},
  {char:'6', icon:'flower-2'},   {char:'7', icon:'zap'},
  {char:'8', icon:'bug'},        {char:'9', icon:'crown'},
  {char:'A', icon:'apple'},      {char:'B', icon:'bell'},
  {char:'C', icon:'cat'},        {char:'D', icon:'dog'},
  {char:'E', icon:'eye'},        {char:'F', icon:'fish'},
  {char:'G', icon:'gift'},       {char:'H', icon:'heart'},
  {char:'I', icon:'lamp-desk'},  {char:'J', icon:'gem'},
  {char:'K', icon:'key'},        {char:'L', icon:'leaf'},
  {char:'M', icon:'music'},      {char:'N', icon:'navigation'},
  {char:'O', icon:'cloud'},      {char:'P', icon:'phone'},
  {char:'Q', icon:'feather'},    {char:'R', icon:'rabbit'},
  {char:'S', icon:'shield'},     {char:'T', icon:'tree-pine'},
  {char:'U', icon:'umbrella'},   {char:'V', icon:'video'},
  {char:'W', icon:'watch'},      {char:'X', icon:'scissors'},
  {char:'Y', icon:'guitar'},     {char:'Z', icon:'wheat'}
];

// ============================================================
// CONFIG JEU
// ============================================================
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Génère un code correct aléatoire : 6 caractères uniques tirés de CHARSET */
function generateCorrectCode() {
  const pool = CHARSET.split('');
  let code = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    code += pool.splice(idx, 1)[0];
  }
  return code;
}

let CORRECT_CODE = generateCorrectCode();
let INPUT_CHARS  = CORRECT_CODE.split('');

/**
 * Code produit par l'IA :
 *   1/3 → correct
 *   1/3 → code + 1 caractère supplémentaire (longueur 7 : erreur flagrante)
 *   1/3 → 2 caractères du code inversés (longueur 6 : erreur subtile)
 */
function generateAICode() {
  const r = Math.random();
  if (r < 1/3) return CORRECT_CODE;
  if (r < 2/3) {
    // Caractère en trop — différent du dernier caractère du code
    let extra;
    do { extra = CHARSET[Math.floor(Math.random() * CHARSET.length)]; }
    while (extra === CORRECT_CODE[5]);
    return CORRECT_CODE + extra;
  }
  // Inversion de deux positions différentes
  const a = CORRECT_CODE.split('');
  const i = Math.floor(Math.random() * 6);
  let j;
  do { j = Math.floor(Math.random() * 6); } while (j === i);
  [a[i], a[j]] = [a[j], a[i]];
  return a.join('');
}

// ============================================================
// STATE
// ============================================================
let aiCode1 = null;
let aiCode2 = null;
let secondRun = false;
let alarmReturnPhase = 'confirm';
let decoderBound = false;
let playerPath = []; // 'brain','decoder','verify','relaunch','accept','trust'

// ============================================================
// UTILS
// ============================================================
function getIcon(char) {
  const e = LEXICON.find(l => l.char === char);
  return e ? e.icon : 'help-circle';
}

function iconsHtml(chars) {
  return chars.map(c => `<i data-lucide="${getIcon(c)}"></i>`).join('');
}

function formatCode(code) {
  return code.slice(0,2) + '-' + code.slice(2,4) + '-' + code.slice(4,6);
}

// ============================================================
// DECODER SCREEN STATE MANAGEMENT
// ============================================================
function updateDecoderScreen(state) {
  document.querySelectorAll('.dscreen-state').forEach(s => s.classList.remove('active'));
  const idMap = { processing: 'dscreen-processing-wrap' };
  const id = idMap[state] || (state ? 'dscreen-' + state : null);
  if (id) document.getElementById(id)?.classList.add('active');
}

// ============================================================
// NAVIGATION PHASES
// ============================================================
function showPhase(id) {
  document.querySelectorAll('.bb-phase').forEach(p => p.classList.remove('active'));
  document.getElementById('alarm-overlay').classList.remove('active');

  const el = document.getElementById('phase-' + id);
  if (el) el.classList.add('active');

  if (id !== 'brain') setLexHint(false);

  document.body.dataset.phase = id;

  // Écran du décodeur selon la phase
  const isDecoderPath = document.body.classList.contains('decoder-path');
  if      (id === 'intro' || id === 'choice' || id === 'decoder') updateDecoderScreen('idle');
  else if (id === 'processing')                                    updateDecoderScreen('processing');
  else if (id === 'confirm'  && isDecoderPath)                    updateDecoderScreen('confirm');
  else if (id === 'compare'  && isDecoderPath)                    updateDecoderScreen('compare');
  else if (id === 'success')                                       updateDecoderScreen('success');
  else                                                             updateDecoderScreen(null); // écran sombre

  // Nettoyage outline carte quand on quitte la phase décodeur
  if (id !== 'decoder') {
    const lc = document.getElementById('decoder-card');
    if (lc) lc.style.outline = '';
  }
  // Réinitialise la carte input si on revient au choix
  if (id === 'choice') {
    const card = document.getElementById('decoder-card');
    if (card) { card.style.opacity = '1'; card.draggable = false; }
  }
}

// ============================================================
// LEXIQUE
// ============================================================
function buildLexicon() {
  const grid = document.getElementById('lex-grid');
  grid.innerHTML = LEXICON.map(e =>
    `<div class="lex-cell" data-char="${e.char}" title="${e.char}"
          onclick="onLexCellClick(this, '${e.char}')">
       <i data-lucide="${e.icon}"></i>
       <span class="lex-char">${e.char}</span>
     </div>`
  ).join('');
  lucide.createIcons();
}

function onLexCellClick(cell, char) {
  if (getActivePhase() !== 'brain') return;

  // Marque visuellement la cellule cliquée
  document.querySelectorAll('.lex-cell').forEach(c => c.classList.remove('marked'));
  cell.classList.add('marked');

  if (inputMode === 'gamepad') {
    gpBrainChars[gpBrainRow] = char;
    updateGpBrainDisplay();
    checkBrainFilled();
    syncOutputCard();
    return;
  }

  function flash(input) {
    input.classList.remove('ok', 'bad');
    input.style.transition = 'color .15s';
    input.style.color = '#00E5FF';
    setTimeout(() => { input.style.color = ''; }, 300);
  }

  const charInCode = INPUT_CHARS.includes(char);

  if (charInCode) {
    // L'icône fait partie du code → remplit toutes les positions qui lui correspondent,
    // peu importe l'ordre de clic. Chaque occurrence est placée à sa bonne case.
    INPUT_CHARS.forEach((c, i) => {
      if (c !== char) return;
      const input = document.getElementById(`bi-${i}`);
      if (input) { input.value = char; flash(input); }
    });
  } else {
    // L'icône n'est PAS dans le code → remplit la case focalisée ou la première vide
    // (l'humain peut se tromper, comme l'IA).
    let targetIdx = -1;
    const focused = document.activeElement;
    if (focused && focused.classList.contains('decode-input')) {
      targetIdx = parseInt(focused.id.replace('bi-', ''));
    } else {
      for (let i = 0; i < INPUT_CHARS.length; i++) {
        if (!document.getElementById(`bi-${i}`)?.value) { targetIdx = i; break; }
      }
    }
    if (targetIdx >= 0) {
      const input = document.getElementById(`bi-${targetIdx}`);
      if (input) {
        input.value = char;
        flash(input);
        if (targetIdx < INPUT_CHARS.length - 1)
          document.getElementById(`bi-${targetIdx + 1}`)?.focus();
      }
    }
  }

  checkBrainFilled();
  syncOutputCard();
}

function setLexHint(brainMode) {
  const hint = document.getElementById('lex-hint');
  if (!hint) return;
  if (brainMode) {
    hint.innerHTML = `<i data-lucide="mouse-pointer-2"></i> Cliquez une icône → remplit la case`;
  } else {
    hint.innerHTML = `<i data-lucide="mouse-pointer-2"></i> Cliquez pour marquer une icône identifiée`;
  }
  lucide.createIcons();
}

// ============================================================
// PHASE 0 : CHOIX
// ============================================================
function initChoicePhase() {
  // Icônes sur la carte input latérale (gauche) + carte intro
  const html = iconsHtml(INPUT_CHARS);
  document.getElementById('decoder-icons').innerHTML = html;
  const introIcons = document.getElementById('intro-input-icons');
  if (introIcons) introIcons.innerHTML = html;
  lucide.createIcons();
}

/**
 * Égalise la hauteur du décodeur sur celle du lexique.
 * Principe : on masque temporairement l'image décodeur (width:0) pour que
 * la ligne de grille soit dimensionnée par le lexique seul, on mesure cette
 * hauteur, puis on calcule la largeur du décodeur via son ratio 1980×1114.
 */
function equalizeDecoderToLex() {
  const img = document.getElementById('decoder-img');
  const lex = document.getElementById('lex-panel');
  if (!img || !lex || document.body.dataset.phase !== 'choice') return;

  // 1. Réduit temporairement l'image à 0 pour ne pas influencer la ligne de grille
  img.style.width  = '0';
  img.style.height = '0';

  // 2. Laisse le navigateur recalculer le layout, puis mesure la hauteur naturelle du lexique
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const lexH = lex.getBoundingClientRect().height;
      const wrap = img.parentElement;
      if (lexH > 40) {
        // Ratio image décodeur : 1980 × 1114 = 1.7774
        const targetW = Math.round(lexH * 1980 / 1114);
        const finalW  = Math.min(targetW, wrap.getBoundingClientRect().width);
        img.style.width    = finalW + 'px';
        img.style.height   = 'auto';
        // Aligne le wrapper sur la largeur réelle de l'image
        // → #decoder-screen (positionné en %) sera relatif à la bonne dimension
        wrap.style.width = finalW + 'px';
      } else {
        // Fallback : largeur 100 % si mesure impossible
        img.style.width   = '100%';
        img.style.height  = 'auto';
        wrap.style.width  = '';
      }
    });
  });
}

function goToChoice() {
  document.getElementById('phase-intro').classList.remove('active');
  showPhase('choice');
  equalizeDecoderToLex();
}

// ============================================================
// PATH A : DÉCODEUR
// ============================================================
function chooseDecoder() {
  playerPath.push('decoder');
  document.body.classList.add('decoder-path'); // active le layout chemin décodeur

  // Efface les styles inline laissés par equalizeDecoderToLex() (phase choix)
  // Sans ça, ces styles inline écrasent toutes les règles CSS du chemin décodeur.
  const wrap = document.getElementById('decoder-wrap');
  const img  = document.getElementById('decoder-img');
  if (wrap) wrap.style.width = '';
  if (img)  { img.style.width = ''; img.style.height = ''; }

  decoderBound = false;
  const card = document.getElementById('decoder-card');
  card.style.opacity = '1';
  card.draggable = true;
  card.classList.remove('dragging');

  const machine = document.getElementById('decoder-machine');
  machine.className = '';
  machine.style.cssText = '';

  showPhase('decoder'); // appelle updateDecoderScreen('idle')
  lucide.createIcons();
  initDragDecoder();
}

function initDragDecoder() {
  if (decoderBound) return;
  decoderBound = true;

  const card    = document.getElementById('decoder-card');
  const machine = document.getElementById('decoder-machine');

  // Carte d'activation (seule carte draggable)
  card.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', 'card-input');
    card.classList.add('dragging');
    SFX.play('slide');
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));

  // Zone de drop : tout le décodeur
  machine.addEventListener('dragover', e => {
    e.preventDefault();
    machine.classList.add('drag-over');
  });
  machine.addEventListener('dragleave', () => machine.classList.remove('drag-over'));
  machine.addEventListener('drop', e => {
    e.preventDefault();
    machine.classList.remove('drag-over');

    // Lancer le décodage (neural net immédiat)
    card.style.opacity = '1';
    card.draggable = false;
    card.classList.remove('dragging');
    updateDecoderScreen('processing');
    setTimeout(startProcessing, 120);
  });
}

// ============================================================
// PHASE 2 : TRAITEMENT
// ============================================================
function startProcessing() {
  SFX.play('decode');
  showPhase('processing');
  runNeuralNet(() => {
    if (!secondRun) {
      aiCode1 = generateAICode();
      showConfirm();
    } else {
      aiCode2 = generateAICode();
      showCompare();
    }
  });
}

function runNeuralNet(onDone) {
  const canvas = document.getElementById('nn-canvas');
  const ctx = canvas.getContext('2d');

  const layers = [
    [{x:55,  y:50},  {x:55,  y:100}, {x:55,  y:150}],
    [{x:165, y:30},  {x:165, y:80},  {x:165, y:130}, {x:165, y:175}],
    [{x:290, y:30},  {x:290, y:80},  {x:290, y:130}, {x:290, y:175}],
    [{x:415, y:30},  {x:415, y:80},  {x:415, y:130}, {x:415, y:175}],
    [{x:528, y:100}]
  ];

  let frame = 0;
  const total = 110;

  (function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const p = frame / total;

    layers.forEach((layer, li) => {
      if (li === layers.length - 1) return;
      layer.forEach(a => {
        layers[li+1].forEach(b => {
          const s = Math.max(0, Math.min(1, p * 5 - li));
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0,180,216,${s * .32})`;
          ctx.lineWidth = .7; ctx.stroke();
        });
      });
    });

    layers.forEach((layer, li) => {
      layer.forEach(node => {
        const glow = Math.max(0, Math.min(1, p * 5 - li));
        if (glow > 0) {
          const g = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 14);
          g.addColorStop(0, `rgba(0,180,216,${glow * .18})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(node.x, node.y, 14, 0, Math.PI*2); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(node.x, node.y, 6, 0, Math.PI*2);
        if      (li === 0)               ctx.fillStyle = '#FF6B35';
        else if (li === layers.length-1) ctx.fillStyle = glow > 0 ? '#00B4D8' : 'rgba(10,20,35,0.8)';
        else                             ctx.fillStyle = `rgba(0,180,216,${.12 + glow * .72})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(0,180,216,${.2 + glow * .55})`;
        ctx.lineWidth = .9; ctx.stroke();
      });
    });

    frame++;
    if (frame < total) requestAnimationFrame(draw);
    else setTimeout(onDone, 350);
  })();
}

// ============================================================
// PHASE 3 : CONFIRMATION
// ============================================================
function showConfirm() {
  const isErr = aiCode1 !== CORRECT_CODE;
  const countTxt = aiCode1.length + ' caractère' + (aiCode1.length > 1 ? 's' : '') +
    (aiCode1.length !== CORRECT_CODE.length ? ` ⚠ attendu : ${CORRECT_CODE.length}` : '');
  const iconsHtmlStr = iconsHtml(INPUT_CHARS);

  // Overlay brain-path
  document.getElementById('confirm-input-icons').innerHTML = iconsHtmlStr;
  document.getElementById('confirm-code').textContent = aiCode1;
  document.getElementById('confirm-code').className = 'bb-code-result' + (isErr ? ' error' : '');
  document.getElementById('confirm-count').textContent = countTxt;

  // dscreen-confirm (chemin décodeur)
  document.getElementById('dscreen-confirm-icons').innerHTML = iconsHtmlStr;
  document.getElementById('dscreen-confirm-code').textContent = aiCode1;
  document.getElementById('dscreen-confirm-code').className = 'dscrn-code' + (isErr ? ' error' : '');
  document.getElementById('dscreen-confirm-count').textContent = countTxt;

  showPhase('confirm');
  lucide.createIcons();
}

function acceptResult() {
  playerPath.push('accept');
  if (aiCode1 === CORRECT_CODE) {
    showSuccess();
  } else {
    alarmReturnPhase = 'confirm';
    document.getElementById('alarm-msg').textContent =
      `Code "${aiCode1}" refusé — CODE ERRONÉ.\nVous devez assumer les conséquences si vous validez sans vérifier.`;
    showAlarm();
    // Compte la tentative ratée — déverrouillage auto après 3 échecs
    var attempts = _bbIncrementAttempts();
    if (attempts >= BB_MAX_ATTEMPTS) { setTimeout(triggerNexusAutoUnlock, 1200); }
  }
}

function relaunchDecoder() {
  playerPath.push('relaunch');
  secondRun = true;
  startProcessing();
}

function verifyMyself() {
  if (!playerPath.includes('verify')) playerPath.push('verify');
  document.body.classList.remove('decoder-path');
  const notice = document.getElementById('brain-ai-notice');
  if (aiCode1) {
    notice.style.display = 'block';
    if (aiCode2) {
      // Vient de la phase compare : 2 analyses disponibles
      notice.innerHTML =
        `L'IA a proposé<br>"${aiCode1}" et<br>"${aiCode2}"<br>— vérifiez vous-même si c'est correct.`;
    } else {
      // Vient de la phase confirm : 1 seule analyse
      notice.textContent = `L'IA a proposé "${aiCode1}" — vérifiez vous-même si c'est correct.`;
    }
  }
  buildBrainTable();
  showPhase('brain');
}

// ============================================================
// PHASE 4 : COMPARAISON
// ============================================================
function showCompare() {
  const sameResult = aiCode1 === aiCode2;
  const noticeText = sameResult
    ? `Les deux analyses concordent : "${aiCode1}"`
    : `Les deux analyses divergent ! L'IA n'est pas cohérente.`;

  // Overlay brain-path
  const c1 = document.getElementById('cmp-code1');
  const c2 = document.getElementById('cmp-code2');
  c1.textContent = aiCode1; c1.className = 'bb-code-result' + (aiCode1 !== CORRECT_CODE ? ' error' : '');
  c2.textContent = aiCode2; c2.className = 'bb-code-result' + (aiCode2 !== CORRECT_CODE ? ' error' : '');
  const notice = document.getElementById('compare-notice');
  notice.className = sameResult ? 'same' : 'diff';
  notice.textContent = noticeText;

  // dscreen-compare (chemin décodeur)
  const dc1 = document.getElementById('dscreen-cmp-code1');
  const dc2 = document.getElementById('dscreen-cmp-code2');
  dc1.textContent = aiCode1; dc1.className = 'dscrn-code' + (aiCode1 !== CORRECT_CODE ? ' error' : '');
  dc2.textContent = aiCode2; dc2.className = 'dscrn-code' + (aiCode2 !== CORRECT_CODE ? ' error' : '');
  document.getElementById('dscreen-compare-notice').textContent = noticeText;

  showPhase('compare');
  lucide.createIcons();
}

function trustCode(n) {
  playerPath.push('trust');
  const chosen = n === 1 ? aiCode1 : aiCode2;
  if (chosen === CORRECT_CODE) {
    showSuccess();
  } else {
    alarmReturnPhase = 'compare';
    document.getElementById('alarm-msg').textContent =
      `L'analyse ${n} proposait "${chosen}" — CODE ERRONÉ.\nFaites confiance à votre propre déchiffrement.`;
    showAlarm();
    // Compte la tentative ratée — déverrouillage auto après 3 échecs
    var attempts = _bbIncrementAttempts();
    if (attempts >= BB_MAX_ATTEMPTS) { setTimeout(triggerNexusAutoUnlock, 1200); }
  }
}

// ============================================================
// PATH B : CERVEAU
// ============================================================
function chooseBrain() {
  playerPath.push('brain');
  document.body.classList.remove('decoder-path');
  document.getElementById('brain-ai-notice').style.display = 'none';
  buildBrainTable();
  showPhase('brain');
}

function buildBrainTable() {
  const table = document.getElementById('decode-table');
  table.innerHTML = INPUT_CHARS.map((c, i) => `
    <div class="decode-row" id="dr-${i}">
      <i data-lucide="${getIcon(c)}"></i>
      <span class="decode-arrow">→</span>
      <input type="text" maxlength="1" id="bi-${i}" class="decode-input"
             placeholder="?" autocomplete="off"
             oninput="onBrainInput(${i}, this)"
             onkeydown="onBrainKey(event,${i})">
      <span class="gp-char-display" id="gp-display-${i}">?</span>
      <span class="decode-idx">${i+1}/6</span>
    </div>
  `).join('');

  document.getElementById('validate-btn').disabled = true;
  gpBrainRow = 0;
  gpBrainChars = ['','','','','',''];
  document.querySelectorAll('.lex-cell.marked').forEach(c => c.classList.remove('marked'));
  setLexHint(true);

  // Réinitialise la carte de code (droite) pour la prévisualisation
  const codeEl = document.getElementById('output-card-code');
  if (codeEl) { codeEl.textContent = '· · · · · ·'; codeEl.classList.remove('live', 'revealed'); }

  lucide.createIcons();
  if (inputMode === 'gamepad') updateGpBrainFocus();
  else setTimeout(() => document.getElementById('bi-0')?.focus(), 100);
}

function onBrainInput(idx, el) {
  el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  el.classList.remove('ok', 'bad');
  checkBrainFilled();
  syncOutputCard();
  if (el.value && idx < INPUT_CHARS.length - 1) {
    document.getElementById(`bi-${idx+1}`)?.focus();
  }
}

function onBrainKey(e, idx) {
  if (e.key === 'Backspace') {
    const el = document.getElementById(`bi-${idx}`);
    if (!el.value && idx > 0) {
      const prev = document.getElementById(`bi-${idx-1}`);
      if (prev) { prev.value = ''; prev.focus(); }
    }
  }
  if (e.key === 'Enter' && !document.getElementById('validate-btn').disabled) {
    validateBrain();
  }
}

function checkBrainFilled() {
  const filled = INPUT_CHARS.every((_, i) => document.getElementById(`bi-${i}`)?.value);
  document.getElementById('validate-btn').disabled = !filled;
}

/**
 * Met à jour la carte de code (droite) en temps réel pendant le déchiffrement.
 * Appelé depuis onBrainInput(), onLexCellClick() et updateGpBrainDisplay().
 * Affiche chaque caractère saisi ou · pour les cases vides.
 */
function syncOutputCard() {
  if (document.body.dataset.phase !== 'brain') return;
  const codeEl = document.getElementById('output-card-code');
  if (!codeEl || codeEl.classList.contains('revealed')) return;

  let preview = '';
  let anyFilled = false;
  for (let i = 0; i < INPUT_CHARS.length; i++) {
    const v = (document.getElementById(`bi-${i}`)?.value || '').toUpperCase();
    if (v) anyFilled = true;
    preview += (v || '·');
    if (i < INPUT_CHARS.length - 1) preview += ' ';
  }

  if (anyFilled) {
    codeEl.textContent = preview;
    codeEl.classList.add('live');
  } else {
    codeEl.textContent = '· · · · · ·';
    codeEl.classList.remove('live');
  }
}

function validateBrain() {
  let code = '';
  for (let i = 0; i < INPUT_CHARS.length; i++) {
    const v = (document.getElementById(`bi-${i}`)?.value || '').toUpperCase();
    code += v;
    const el = document.getElementById(`bi-${i}`);
    el.classList.remove('ok','bad');
    el.classList.add(v === INPUT_CHARS[i] ? 'ok' : 'bad');
  }
  setTimeout(() => {
    if (code === CORRECT_CODE) {
      showSuccess();
    } else {
      showFail();
    }
  }, 550);
}

// ============================================================
// SCORING LUCIDITÉ
// ============================================================
function computeScore() {
  const hasBrain             = playerPath.includes('brain');
  const hasBrainFail         = playerPath.includes('brain-fail');
  const hasSwitchDecoder     = playerPath.includes('brain-switch-decoder');
  const hasDecoderSwitchBrain = playerPath.includes('decoder-switch-brain');
  const hasVerify            = playerPath.includes('verify');
  const hasRelaunch          = playerPath.includes('relaunch');

  // ── Chemin D : décodeur échoué → lexique réussi ──
  if (hasDecoderSwitchBrain) return {
    pts: 50, lv: 'lv-mid', tier: 'LUCIDITÉ PARTIELLE',
    reason: "Vous avez utilisé l'IA et vu\nqu'elle n'était pas fiable à 100%.\nVous avez alors réalisé la tâche sans son aide\net vous avez réussi. Bravo !\nToutes les tâches ne nécessitent pas l'usage de l'IA.\nVotre cerveau est toujours votre meilleur allié."
  };

  // ── Chemin A1 : lexique réussi du premier coup (aucun échec) ──
  if (hasBrain && !hasBrainFail) return {
    pts: 100, lv: 'lv-max', tier: 'LUCIDITÉ MAXIMALE',
    reason: "Vous avez fait confiance à votre propre cerveau\npour réaliser une tâche qu'il était capable d'accomplir.\nÉvaluer si on en a les moyens et si c'est préférable,\nc'est exactement ça, la RÉSISTANCE."
  };
  // ── Chemin A2 : lexique réussi après un ou plusieurs échecs (sans passer au décodeur) ──
  if (hasBrain && hasBrainFail && !hasSwitchDecoder) return {
    pts: 100, lv: 'lv-max', tier: 'LUCIDITÉ MAXIMALE',
    reason: "Vous avez décidé de continuer malgré la difficulté\net vous y êtes arrivés ! Bravo !\nNe pas céder à la facilité pour maintenir son esprit actif,\nc'est exactement ça, la RÉSISTANCE."
  };
  // ── Chemin C1 : lexique échoué → décodeur réussi ──
  if (hasBrain && hasSwitchDecoder) return {
    pts: 55, lv: 'lv-mid', tier: 'LUCIDITÉ PARTIELLE',
    reason: "Vous avez eu le réflexe de tenter par vous-même avant de déléguer à la machine.\nL'effort compte — mais sans maîtrise du code,\nvous n'avez pas pu vérifier ce que l'IA produisait."
  };
  // ── Chemins décodeur pur (inchangés) ──
  if (hasVerify && hasRelaunch) return {
    pts: 65, lv: 'lv-high', tier: 'FORTE LUCIDITÉ',
    reason: "Vérification croisée puis confirmation personnelle.\nVous n'avez pas délégué la décision finale à la machine.\nBonne démarche."
  };
  if (hasVerify) return {
    pts: 75, lv: 'lv-high', tier: 'FORTE LUCIDITÉ',
    reason: "Vous avez su douter du résultat de l'IA et vérifier par vous-même.\nLe bon réflexe : utiliser la machine comme aide, pas comme oracle."
  };
  if (hasRelaunch) return {
    pts: 40, lv: 'lv-mid', tier: 'LUCIDITÉ PARTIELLE',
    reason: "Vous avez demandé à l'IA de contrôler sa propre réponse.\nC'est mieux qu'accepter aveuglément, mais la machine reste juge et partie."
  };
  return {
    pts: 15, lv: 'lv-low', tier: 'LUCIDITÉ FAIBLE',
    reason: "Vous avez accepté sans vérifier alors que vous en aviez les moyens.\nVous avez eu de la chance cette fois —\nl'IA peut se tromper. Vérifier reste votre meilleure protection."
  };
}

// ============================================================
// SUCCESS & ALARM
// ============================================================
function showSuccess() {
  SFX.play('success');
  document.querySelectorAll('.bb-phase').forEach(p => p.classList.remove('active'));
  document.getElementById('alarm-overlay').classList.remove('active');

  // Efface les styles inline laissés par equalizeDecoderToLex() (chemin cerveau)
  // Sans ça, wrap.style.width écrase le CSS width: 100% de la phase succès.
  if (!document.body.classList.contains('decoder-path')) {
    const wrap = document.getElementById('decoder-wrap');
    const img  = document.getElementById('decoder-img');
    if (wrap) wrap.style.width = '';
    if (img)  { img.style.width = ''; img.style.height = ''; }
  }

  document.body.dataset.phase = 'success';

  const s = computeScore();

  // ═══════════════════════════════════════════════════════════════════════
  // BANKING SILENCIEUX DES POINTS DANS LE PROFIL JOUEUR GLOBAL
  // Les points obtenus ici sont ajoutés au score Lucidité du joueur (Resistance).
  // Aucune animation visible : le HUD #lucidite-hud n'existe pas sur cette page,
  // donc animateLuciditeGain() de LucidityManager retourne early. L'immersion
  // du mini-jeu est préservée. Les points seront affichés à l'étape suivante
  // (traversée de Bruxelles dystopique → bunker).
  // Le flag _blackboxScoreBanked évite le double-comptage si le joueur revoit
  // l'écran de succès (replay → location.reload() repart à zéro de toute façon).
  // ═══════════════════════════════════════════════════════════════════════
  if (window.LucidityManager && !window._blackboxScoreBanked) {
    window.LucidityManager.addLucidite(s.pts);
    window._blackboxScoreBanked = true;
    console.log('[Boîte Noire] Score banké au profil joueur :', s.pts, 'pts (' + s.tier + ')');
  }

  // ── Récompenses Nexus (badge + objet + lexique) ──
  if (!window._blackboxRewardsGranted) {
    window._blackboxRewardsGranted = true;
    // Mémorise la réussite du Nexus pour le carnet de bord dynamique
    try { localStorage.setItem('resistance_nexus_completed', '1'); } catch(_) {}
    // Badge "Code déverrouillé"
    if (window.NotebookManager) {
      window.NotebookManager.unlockBadge('sortie_nexus');
      // Objet : Carte du Nexus
      window.NotebookManager.addItem(
        'carte_nexus',
        'Carte du Nexus',
        'icones/pin.svg'
      );
      // Réinitialiser le compteur d'essais (succès = on repart à 0)
      try { localStorage.removeItem('resistance_bb_attempts'); } catch(_) {}
      // Termes lexique exposés dans ce module
      window.NotebookManager.unlockLexiqueTerms('blackbox');
    }
  }

  // Toujours afficher le score dans l'écran du décodeur (chemin cerveau ou décodeur)
  document.getElementById('dscreen-score-tier').textContent  = s.tier;
  document.getElementById('dscreen-score-tier').className    = 'dscreen-score-tier ' + s.lv;
  document.getElementById('dscreen-score-pts').textContent   = s.pts + ' pts';
  document.getElementById('dscreen-score-reason').innerHTML  = s.reason.replace(/\n/g, '<br>');
  updateDecoderScreen('success');

  // Révèle le code sur la carte output (droite) dans le chemin cerveau
  if (!document.body.classList.contains('decoder-path')) {
    const codeEl = document.getElementById('output-card-code');
    if (codeEl) { codeEl.textContent = formatCode(CORRECT_CODE); codeEl.classList.add('revealed'); }
  }

  lucide.createIcons();
}

// ── Compteur d'essais (règle des 3 essais — déverrouillage automatique) ──
var BB_ATTEMPTS_KEY  = 'resistance_bb_attempts';
var BB_MODULE_ID     = 'blackbox';
var BB_MODULE_NAME   = 'Décodage du Nexus';
var BB_MAX_ATTEMPTS  = 3;

function _bbGetAttempts() {
  return parseInt(localStorage.getItem(BB_ATTEMPTS_KEY) || '0', 10);
}
function _bbIncrementAttempts() {
  var n = _bbGetAttempts() + 1;
  try { localStorage.setItem(BB_ATTEMPTS_KEY, n); } catch(_) {}
  return n;
}
function _bbStoreAlert() {
  var KEY = 'resistance_module_alerts';
  try {
    var alerts = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!alerts.some(function(a){ return a.moduleId === BB_MODULE_ID; })) {
      alerts.push({ moduleId: BB_MODULE_ID, moduleName: BB_MODULE_NAME, timestamp: Date.now() });
      localStorage.setItem(KEY, JSON.stringify(alerts));
    }
  } catch(_) {}
}

function triggerNexusAutoUnlock() {
  _bbStoreAlert();
  // Affiche l'état unlock directement dans l'écran du décodeur, comme les autres états
  lucide.createIcons();
  updateDecoderScreen('unlock');
}

function showFail() {
  SFX.play('alarm');
  // Mémorise l'échec lexique pour le scoring (une seule fois suffit)
  if (!playerPath.includes('brain-fail')) playerPath.push('brain-fail');
  document.querySelectorAll('.bb-phase').forEach(p => p.classList.remove('active'));
  document.getElementById('alarm-overlay').classList.remove('active');
  // Efface les styles inline de equalizeDecoderToLex pour que le CSS s'applique
  const wrap = document.getElementById('decoder-wrap');
  const img  = document.getElementById('decoder-img');
  if (wrap) wrap.style.width = '';
  if (img)  { img.style.width = ''; img.style.height = ''; }
  document.body.dataset.phase = 'fail';
  updateDecoderScreen('fail');

  // Libellé dynamique : "Réessayer" si le décodeur a déjà été utilisé, "Essayer" sinon
  const switchBtn = document.querySelector('#dscreen-fail .dscreen-switch-btn');
  if (switchBtn) {
    const decoderAlreadyUsed = playerPath.includes('decoder');
    switchBtn.innerHTML = decoderAlreadyUsed
      ? '<i data-lucide="cpu"></i> Réessayer avec le décodeur IA'
      : '<i data-lucide="cpu"></i> Essayer avec le décodeur IA';
  }

  lucide.createIcons();

  // ── Règle des 3 essais : déverrouillage automatique après 3 échecs ──
  var attempts = _bbIncrementAttempts();
  if (attempts >= BB_MAX_ATTEMPTS) {
    setTimeout(triggerNexusAutoUnlock, 1200); // laisse l'écran fail s'afficher 1.2s
  }
}

// Bascule vers le décodeur IA depuis l'écran d'échec lexique
function switchToDecoderFromFail() {
  // Marque le passage lexique→décodeur uniquement si le décodeur n'avait pas encore été utilisé
  // (si 'decoder' est déjà dans le chemin, on revient simplement au décodeur sans changer le scoring)
  if (!playerPath.includes('decoder') && !playerPath.includes('brain-switch-decoder')) {
    playerPath.push('brain-switch-decoder');
  }
  chooseDecoder();
}

function retryBrain() {
  document.body.dataset.phase = 'brain';
  document.querySelectorAll('.decode-input').forEach(el => {
    el.value = '';
    el.classList.remove('ok', 'bad');
  });
  document.querySelectorAll('.lex-cell').forEach(c => c.classList.remove('marked'));
  checkBrainFilled();
  syncOutputCard();
  updateDecoderScreen('idle');
  showPhase('brain');
}

function exitNexus() {
  window.location.href = 'bruxelles_dystopique.html';
}

function showAlarm() {
  SFX.play('alarm');
  document.querySelectorAll('.bb-phase').forEach(p => p.classList.remove('active'));
  if (document.body.classList.contains('decoder-path')) {
    // Alarme dans le décodeur : copie le message dans l'écran noir
    const msg = document.getElementById('alarm-msg').textContent;
    document.getElementById('dalarm-msg').innerHTML = msg.replace(/\n/g, '<br>');
    updateDecoderScreen('alarm');
    lucide.createIcons();
  } else {
    // Adapte les labels des deux boutons selon le contexte
    const primaryBtn = document.getElementById('alarm-btn-primary');
    const altBtn     = document.getElementById('alarm-btn-alt');
    if (alarmReturnPhase === 'brain') {
      // Arrivé ici depuis le chemin lexique : primary = lexique, alt = décodeur
      if (primaryBtn) primaryBtn.textContent = '↺ RÉESSAYER AVEC LE LEXIQUE';
      if (altBtn)     altBtn.textContent = '⌕ ESSAYER AVEC LE DÉCODEUR IA';
    } else {
      // Arrivé ici depuis le chemin décodeur (confirm / compare) : primary = décodeur, alt = lexique
      if (primaryBtn) primaryBtn.textContent = '↺ RÉESSAYER AVEC LE DÉCODEUR';
      if (altBtn)     altBtn.textContent = '⌕ ESSAYER AVEC LE LEXIQUE';
    }
    document.getElementById('alarm-overlay').classList.add('active');
  }
}

// Bouton alternatif dans l'alarm-overlay : bascule vers l'autre méthode
function switchFromAlarmOverlay() {
  document.getElementById('alarm-overlay').classList.remove('active');
  if (alarmReturnPhase === 'brain') {
    // Était dans le chemin lexique → bascule vers le décodeur
    switchToDecoderFromFail();
  } else {
    // Était dans le chemin décodeur (confirm/compare) → bascule vers le lexique
    switchToLexiqueFromAlarm();
  }
}

function dismissAlarm() {
  document.getElementById('alarm-overlay').classList.remove('active');
  const p = alarmReturnPhase;
  if      (p === 'confirm') showPhase('confirm');
  else if (p === 'compare') showPhase('compare');
  else if (p === 'brain')   showPhase('brain');
  lucide.createIcons();
}

function dismissDecoderAlarm() {
  const p = alarmReturnPhase;
  if      (p === 'confirm') updateDecoderScreen('confirm');
  else if (p === 'compare') updateDecoderScreen('compare');
  lucide.createIcons();
}

// Bascule vers le lexique après une alarme dans le décodeur
function switchToLexiqueFromAlarm() {
  if (!playerPath.includes('decoder-switch-brain')) playerPath.push('decoder-switch-brain');
  // chooseBrain() enlève decoder-path, construit la table et affiche la phase brain
  chooseBrain();
}

// ============================================================
// DEV TOOLBAR
// ============================================================
function devGoTo(phase, btn) {
  document.querySelectorAll('.dev-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  secondRun = false;

  switch (phase) {
    case 'intro':
      CORRECT_CODE = generateCorrectCode();
      INPUT_CHARS  = CORRECT_CODE.split('');
      { const _di = document.getElementById('dev-info'); if (_di) _di.textContent = `CODE : ${CORRECT_CODE}  |  1/3 chance d'erreur IA`; } // dev toolbar désactivée — guard
      initChoicePhase();
      document.getElementById('phase-intro').classList.add('active');
      document.body.dataset.phase = 'intro';
      document.body.classList.remove('decoder-path');
      playerPath = []; secondRun = false;
      updateDecoderScreen('idle');
      break;
    case 'choice':
      document.getElementById('phase-intro').classList.remove('active');
      aiCode1 = null; aiCode2 = null; decoderBound = false;
      playerPath = []; secondRun = false;
      document.body.classList.remove('decoder-path');
      showPhase('choice'); initChoicePhase(); equalizeDecoderToLex(); break;
    case 'brain':
      document.getElementById('brain-ai-notice').style.display = 'none';
      buildBrainTable(); showPhase('brain'); break;
    case 'decoder':
      decoderBound = false; chooseDecoder(); break;
    case 'processing':
      aiCode1 = generateAICode();
      showPhase('processing'); runNeuralNet(showConfirm); break;
    case 'confirm':
      aiCode1 = aiCode1 || generateAICode(); showConfirm(); break;
    case 'compare':
      aiCode1 = generateAICode(); aiCode2 = generateAICode(); showCompare(); break;
    case 'success':
      showSuccess(); break;
    case 'alarm':
      aiCode1 = generateAICode(); showConfirm();
      alarmReturnPhase = 'confirm';
      document.getElementById('alarm-msg').textContent = 'Mode développeur — test écran alarme.';
      showAlarm(); break;
  }
}

// ============================================================
// SYSTÈME DE DÉTECTION D'INPUT (manette ↔ clavier)
// ============================================================
let inputMode = 'keyboard';
let gpIndex   = null;
let gpLoopId  = null;

const GP = { A:0, B:1, X:2, Y:3, LB:4, RB:5, SELECT:8, START:9,
             DPAD_UP:12, DPAD_DOWN:13, DPAD_LEFT:14, DPAD_RIGHT:15 };

const gpPressed       = {};
const gpRepeat        = {};
const GP_REPEAT_DELAY = 160;
let   axisWas         = { up:false, down:false, left:false, right:false };

function setInputMode(mode) {
  if (inputMode === mode) return;
  inputMode = mode;
  const badge = document.getElementById('input-mode-badge');

  if (mode === 'gamepad') {
    document.body.classList.add('gamepad-mode');
    badge.classList.add('mode-gamepad');
    badge.innerHTML = `<i data-lucide="gamepad-2"></i><span id="mode-label">MANETTE</span>`;
    setTimeout(initGpFocus, 60);
  } else {
    document.body.classList.remove('gamepad-mode');
    badge.classList.remove('mode-gamepad');
    badge.innerHTML = `<i data-lucide="keyboard"></i><span id="mode-label">CLAVIER</span>`;
    document.querySelectorAll('.bb-choice-btn, .bb-btn').forEach(b => {
      b.style.borderColor = '';
      b.style.background  = '';
    });
    // Efface outline cartes
    const dc = document.getElementById('decoder-card');
    if (dc) dc.style.outline = '';
  }
  lucide.createIcons();
}

function initGpFocus() {
  const phase = getActivePhase();
  gpChoiceIdx = 0; gpConfirmIdx = 0; gpCompareIdx = 0;
  if      (phase === 'choice')  highlightChoiceBtns();
  else if (phase === 'confirm') highlightActionBtns('phase-confirm');
  else if (phase === 'compare') highlightActionBtns('phase-compare');
  else if (phase === 'brain')   updateGpBrainFocus();
  else if (phase === 'decoder') updateGpDecoderFocus();
}

document.addEventListener('keydown', () => {
  if (inputMode !== 'keyboard') setInputMode('keyboard');
}, { passive: true });

// ----------------------------------------------------------------
// POLLING MANETTE
// ----------------------------------------------------------------
function gpLoop() {
  gpLoopId = requestAnimationFrame(gpLoop);
  const gamepads = navigator.getGamepads();

  if (gpIndex === null) {
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) { gpIndex = i; break; }
    }
  }
  if (gpIndex === null) return;

  const gp = gamepads[gpIndex];
  if (!gp) { gpIndex = null; setInputMode('keyboard'); return; }

  const now = Date.now();

  gp.buttons.forEach((btn, i) => {
    const was    = !!gpPressed[i];
    const is     = btn.pressed || btn.value > 0.5;
    const repeat = is && was && (now - (gpRepeat[i] || 0)) > GP_REPEAT_DELAY;

    if (is && !was) {
      gpRepeat[i] = now + 350;
      if (inputMode !== 'gamepad') {
        setInputMode('gamepad');
      } else {
        onGamepadButton(i);
      }
    } else if (repeat) {
      gpRepeat[i] = now;
      onGamepadButton(i);
    }
    gpPressed[i] = is;
  });

  const T  = 0.45;
  const ax = gp.axes;
  const axNow = {
    left:  (ax[0] !== undefined && ax[0] < -T) || (ax[6] !== undefined && ax[6] < -T),
    right: (ax[0] !== undefined && ax[0] >  T) || (ax[6] !== undefined && ax[6] >  T),
    up:    (ax[1] !== undefined && ax[1] < -T) || (ax[7] !== undefined && ax[7] < -T),
    down:  (ax[1] !== undefined && ax[1] >  T) || (ax[7] !== undefined && ax[7] >  T)
  };

  const axAny = axNow.left || axNow.right || axNow.up || axNow.down;
  if (axAny && inputMode !== 'gamepad') { setInputMode('gamepad'); axisWas = { ...axNow }; return; }

  if (axNow.up    && !axisWas.up)    onGamepadButton(GP.DPAD_UP);
  if (axNow.down  && !axisWas.down)  onGamepadButton(GP.DPAD_DOWN);
  if (axNow.left  && !axisWas.left)  onGamepadButton(GP.DPAD_LEFT);
  if (axNow.right && !axisWas.right) onGamepadButton(GP.DPAD_RIGHT);
  axisWas = { ...axNow };
}

function onGamepadButton(btn) {
  const phase = getActivePhase();
  if (!phase) return;

  switch (phase) {
    case 'choice':    gpChoice(btn);    break;
    case 'decoder':   gpDecoder(btn);   break;
    case 'brain':     gpBrain(btn);     break;
    case 'confirm':   gpConfirm(btn);   break;
    case 'compare':   gpCompare(btn);   break;
  }
}

function getActivePhase() {
  const el = document.querySelector('.bb-phase.active');
  if (!el) return null;
  return el.id.replace('phase-', '');
}

// PHASE 0-2 : Choix — 0 = lexique (haut), 1 = décodeur (bas)
let gpChoiceIdx = 0;
const GP_CHOICE_BTNS = [() => chooseBrain(), () => chooseDecoder()];
function gpChoice(btn) {
  if (btn === GP.DPAD_UP   || btn === GP.DPAD_LEFT)  { gpChoiceIdx = 0; highlightChoiceBtns(); } // lexique (haut)
  if (btn === GP.DPAD_DOWN || btn === GP.DPAD_RIGHT)  { gpChoiceIdx = 1; highlightChoiceBtns(); } // décodeur (bas)
  if (btn === GP.A) GP_CHOICE_BTNS[gpChoiceIdx]();
}
function highlightChoiceBtns() {
  // 0 = lexique (#choice-btn-lex), 1 = décodeur (#choice-btn-dec)
  const btns = [
    document.querySelector('#choice-btn-lex .choice-method-btn'),
    document.querySelector('#choice-btn-dec .choice-method-btn')
  ];
  btns.forEach((b, i) => {
    if (!b) return;
    b.style.borderColor = i === gpChoiceIdx ? '#00B4D8' : '';
    b.style.background  = i === gpChoiceIdx ? 'rgba(0,180,216,.08)' : '';
  });
}

// PHASE 1B : Décodeur — A / START confirme le glissé de la carte
function gpDecoder(btn) {
  if (btn === GP.A || btn === GP.START) {
    const card = document.getElementById('decoder-card');
    card.style.opacity = '1';
    card.draggable = false;
    card.classList.remove('dragging');
    updateDecoderScreen('processing');
    setTimeout(startProcessing, 120);
  }
}

function updateGpDecoderFocus() {
  const lc = document.getElementById('decoder-card');
  if (lc) { lc.style.outline = '2px solid #00B4D8'; lc.style.outlineOffset = '3px'; }
}

// PHASE 1A : Cerveau
let gpBrainRow = 0;
let gpBrainChars = ['','','','','',''];

function gpBrain(btn) {
  const maxRow = INPUT_CHARS.length - 1;

  if (btn === GP.DPAD_UP)   { gpBrainRow = Math.max(0, gpBrainRow - 1); updateGpBrainFocus(); }
  if (btn === GP.DPAD_DOWN) { gpBrainRow = Math.min(maxRow, gpBrainRow + 1); updateGpBrainFocus(); }

  if (btn === GP.DPAD_RIGHT || btn === GP.RB) {
    const cur = gpBrainChars[gpBrainRow] || '';
    const idx = CHARSET.indexOf(cur);
    gpBrainChars[gpBrainRow] = CHARSET[(idx + 1) % CHARSET.length];
    updateGpBrainDisplay();
  }
  if (btn === GP.DPAD_LEFT || btn === GP.LB) {
    const cur = gpBrainChars[gpBrainRow] || '';
    const idx = CHARSET.indexOf(cur);
    gpBrainChars[gpBrainRow] = CHARSET[(idx - 1 + CHARSET.length) % CHARSET.length];
    updateGpBrainDisplay();
  }
  if (btn === GP.A) {
    if (gpBrainRow < maxRow) { gpBrainRow++; updateGpBrainFocus(); }
    else {
      syncGpBrainToInputs();
      if (!document.getElementById('validate-btn').disabled) validateBrain();
    }
  }
  if (btn === GP.B) {
    gpBrainChars[gpBrainRow] = '';
    updateGpBrainDisplay();
  }
  if (btn === GP.START) {
    syncGpBrainToInputs();
    if (!document.getElementById('validate-btn').disabled) validateBrain();
  }
}

function updateGpBrainFocus() {
  document.querySelectorAll('.decode-row').forEach((row, i) => {
    row.classList.toggle('gp-focus', i === gpBrainRow);
  });
}

function updateGpBrainDisplay() {
  for (let i = 0; i < INPUT_CHARS.length; i++) {
    const display = document.getElementById(`gp-display-${i}`);
    if (display) display.textContent = gpBrainChars[i] || '?';
    const input = document.getElementById(`bi-${i}`);
    if (input) input.value = gpBrainChars[i] || '';
  }
  checkBrainFilled();
  syncOutputCard();
}

function syncGpBrainToInputs() {
  for (let i = 0; i < INPUT_CHARS.length; i++) {
    const input = document.getElementById(`bi-${i}`);
    if (input) input.value = gpBrainChars[i] || '';
  }
}

// PHASE 3 : Confirmation
let gpConfirmIdx = 0;
const gpConfirmActions = [acceptResult, relaunchDecoder, verifyMyself];
function gpConfirm(btn) {
  const max = gpConfirmActions.length - 1;
  if (btn === GP.DPAD_UP)   { gpConfirmIdx = Math.max(0, gpConfirmIdx - 1); highlightActionBtns('phase-confirm'); }
  if (btn === GP.DPAD_DOWN) { gpConfirmIdx = Math.min(max, gpConfirmIdx + 1); highlightActionBtns('phase-confirm'); }
  if (btn === GP.A) gpConfirmActions[gpConfirmIdx]();
}

// PHASE 4 : Comparaison
let gpCompareIdx = 0;
const gpCompareActions = [() => trustCode(1), () => trustCode(2), verifyMyself];
function gpCompare(btn) {
  const max = gpCompareActions.length - 1;
  if (btn === GP.DPAD_UP)   { gpCompareIdx = Math.max(0, gpCompareIdx - 1); highlightActionBtns('phase-compare'); }
  if (btn === GP.DPAD_DOWN) { gpCompareIdx = Math.min(max, gpCompareIdx + 1); highlightActionBtns('phase-compare'); }
  if (btn === GP.A) gpCompareActions[gpCompareIdx]();
}

function highlightActionBtns(phaseId) {
  const btns = document.querySelectorAll(`#${phaseId} .bb-btn`);
  const activeIdx = phaseId === 'phase-confirm' ? gpConfirmIdx : gpCompareIdx;
  btns.forEach((b, i) => {
    b.style.borderColor = i === activeIdx ? '#00B4D8' : '';
    b.style.background  = i === activeIdx ? 'rgba(0,180,216,.08)' : '';
  });
}

// ============================================================
// DEMO ANIMATION ÉCRAN INTRO (révèle 3B9XF4 char par char en boucle)
// ============================================================
const DEMO_CODE_CHARS = ['3','B','9','X','F','4'];
let _demoTimer = null;

function startDemoAnimation() {
  const container = document.getElementById('demo-output-chars');
  if (!container) return;
  const spans = Array.from(container.querySelectorAll('span'));
  if (_demoTimer) { clearTimeout(_demoTimer); _demoTimer = null; }

  // Réinitialise
  spans.forEach(s => { s.textContent = '?'; s.classList.remove('revealed'); });

  let idx = 0;
  function revealNext() {
    if (idx < spans.length) {
      spans[idx].textContent = DEMO_CODE_CHARS[idx];
      spans[idx].classList.add('revealed');
      idx++;
      _demoTimer = setTimeout(revealNext, 360);
    } else {
      // Tous révélés → pause → reset → recommence
      _demoTimer = setTimeout(() => {
        spans.forEach(s => { s.textContent = '?'; s.classList.remove('revealed'); });
        idx = 0;
        _demoTimer = setTimeout(revealNext, 650);
      }, 1900);
    }
  }
  _demoTimer = setTimeout(revealNext, 900); // délai initial
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // dev toolbar désactivée — guard
  { const _di = document.getElementById('dev-info'); if (_di) _di.textContent = `CODE : ${CORRECT_CODE}  |  1/3 chance d'erreur IA`; }

  buildLexicon();
  initChoicePhase();       // peuple les icônes intro + carte latérale
  updateDecoderScreen('idle'); // écran décodeur visible derrière l'intro
  lucide.createIcons();
  startDemoAnimation();    // animation démo écran intro (révèle 3B9XF4 en boucle)

  // Ré-égalise décodeur/lexique si la fenêtre est redimensionnée en phase choix
  let _eqResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(_eqResizeTimer);
    _eqResizeTimer = setTimeout(equalizeDecoderToLex, 120);
  });

  gpLoop();
});

// ============================================================
// SONS
// ============================================================
const SFX = (() => {
  const base = 'audios/Sound effects/';
  const files = {
    click:   'clic_icone.mp3',
    decode:  'decodage.mp3',
    fail:    'echec.mp3',
    alarm:   'echec-alarme.mp3',
    slide:   'glissement carte.mp3',
    success: 'succes.mp3',
  };
  const cache = {};
  Object.entries(files).forEach(([k, f]) => {
    const a = new Audio(base + f);
    a.preload = 'auto';
    cache[k] = a;
  });
  function play(name) {
    const s = cache[name];
    if (!s) return;
    s.currentTime = 0;
    s.play().catch(() => {});
  }
  return { play };
})();

// Son sur tout clic bouton ou cellule lex-icone
document.addEventListener('click', e => {
  if (e.target.closest('button, .lex-cell')) SFX.play('click');
});

// Clic direct sur le lexique → même effet que le bouton "Je déchiffre moi-même"
document.getElementById('lex-panel').addEventListener('click', function(e) {
  if (document.body.dataset.phase !== 'choice') return;
  // Ne pas déclencher si le clic vient du bouton #choice-btn-lex (il appelle directement chooseBrain)
  if (e.target.closest('#choice-btn-lex')) return;
  chooseBrain();
});

// Clic direct sur l'objet décodeur → même effet que "J'utilise le décodeur IA"
document.getElementById('decoder-wrap').addEventListener('click', function(e) {
  if (document.body.dataset.phase !== 'choice') return;
  chooseDecoder();
});

// ════════════════════════════════════════════════════════════════════════════
// SIGNAL "MASQUER HUD" POUR LE JEU PARENT
// Si test-blackbox.html est intégré (iframe/redirect) dans le jeu Résistance,
// le parent doit masquer le HUD Lucidité ↔ Emprise pendant ce mini-jeu.
// On lève un flag dans localStorage à l'entrée et on le retire à la sortie.
// Le parent peut écouter l'event 'storage' ou poller ce flag.
// Idem pour les vidéos plein-écran (à dupliquer dans la page vidéo).
// ════════════════════════════════════════════════════════════════════════════
try { localStorage.setItem('resistance_hud_hidden', 'blackbox'); } catch(_){}
window.addEventListener('beforeunload', () => {
  try { localStorage.removeItem('resistance_hud_hidden'); } catch(_){}
});

// ── Transition vidéo Nexus → Bruxelles ──────────────────────────────────────
// IS_LOCAL fourni par game/core/env.js, plein écran par game/core/video-gate.js
(function() {
  // ID YouTube de la vidéo de transition (à renseigner quand la vidéo sera prête)
  var YT_TRANSITION_ID = '';

  var ytPlayer = null;

  if (!IS_LOCAL && YT_TRANSITION_ID) ResVideoGate.loadYouTubeAPI();

  window.onYouTubeIframeAPIReady_transition = function() {
    if (!YT_TRANSITION_ID) return;
    ytPlayer = new YT.Player('transition-yt-player', {
      videoId: YT_TRANSITION_ID,
      playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1, fs: 1, enablejsapi: 1 },
      events: {
        onReady: hideTransitionLoader,
        onStateChange: function(e) { if (e.data === YT.PlayerState.ENDED) goToBruxelles(); }
      }
    });
  };

  function hideTransitionLoader() {
    var loader = document.getElementById('transition-loader');
    loader.classList.add('hidden');
    setTimeout(function() { loader.style.display = 'none'; }, 650);
  }

  function goToBruxelles() {
    window.location.href = 'bruxelles_dystopique.html';
  }

  function doRequestFS(el) { ResVideoGate.requestFullscreen(el); }

  // Remplace la fonction exitNexus définie plus haut
  window.exitNexus = function() {
    var overlay = document.getElementById('transition-overlay');
    overlay.classList.add('visible');
    doRequestFS(overlay);

    if (IS_LOCAL) {
      var video = document.getElementById('transition-video');
      // Vidéo de transition absente en local (fichier gitignoré) → ne pas rester
      // bloqué sur l'écran de chargement : passer directement à Bruxelles.
      if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        goToBruxelles();
        return;
      }
      var playPromise = video.play();
      if (playPromise && playPromise.catch) playPromise.catch(goToBruxelles);
      // Filet de sécurité : si rien n'est lisible après 6 s, continuer sans la vidéo
      setTimeout(function() {
        if (video.readyState === 0) goToBruxelles();
      }, 6000);
    } else if (YT_TRANSITION_ID) {
      document.getElementById('transition-yt-container').style.display = 'block';
      if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo();
    } else {
      // Vidéo de transition pas encore disponible → passer directement
      goToBruxelles();
    }
  };

  // Barre de progression + masquage loader (local)
  document.addEventListener('DOMContentLoaded', function() {
    var video = document.getElementById('transition-video');
    var bar   = document.getElementById('transition-bar');
    if (!video) return;

    video.addEventListener('progress', function() {
      if (!video.buffered.length || !video.duration) return;
      var pct = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100;
      bar.style.width = Math.min(pct, 100) + '%';
    });
    video.addEventListener('playing', hideTransitionLoader);
    video.addEventListener('waiting', function() {
      var loader = document.getElementById('transition-loader');
      loader.style.display = 'flex';
      loader.classList.remove('hidden');
    });
    video.addEventListener('ended', goToBruxelles);
  });

  // Barre d'espace : pause / reprise
  document.addEventListener('keydown', function(e) {
    if (e.code !== 'Space' && e.key !== ' ') return;
    var overlay = document.getElementById('transition-overlay');
    if (!overlay.classList.contains('visible')) return;
    e.preventDefault();

    var indicator = document.getElementById('transition-pause-indicator');
    if (IS_LOCAL) {
      var video = document.getElementById('transition-video');
      if (video.paused) { video.play(); indicator.textContent = '▶'; }
      else              { video.pause(); indicator.textContent = '⏸'; }
    } else if (ytPlayer) {
      var state = ytPlayer.getPlayerState();
      if (state === YT.PlayerState.PLAYING) { ytPlayer.pauseVideo(); indicator.textContent = '⏸'; }
      else                                  { ytPlayer.playVideo();  indicator.textContent = '▶'; }
    }
    indicator.style.display = 'block';
    indicator.style.animation = 'none';
    void indicator.offsetWidth;
    indicator.style.animation = 'tr-fadeOut 1.2s forwards';
    setTimeout(function() { indicator.style.display = 'none'; }, 1200);
  });
})();

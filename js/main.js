// ============================================================
// BERTARUNE — top-level game state machine: title / overworld /
// dialogue / battle / gameover / ending, plus the story hooks that
// wire dialogue outcomes to overworld & battle events.
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let gameState = 'title';
let titleBlink = 0;

// ---- overworld dialogue box (separate from battle's message box) ----
let dlgKey = null, dlgLines = [], dlgIndex = 0, dlgCharIdx = 0, dlgTimer = 0, dlgAfter = null, dlgSpeakerNpc = null;

function showDialogue(key, npc) {
  const entry = DIALOGUE[key];
  if (!entry) return;
  dlgKey = key;
  dlgLines = Array.isArray(entry) ? entry.slice() : entry.lines.slice();
  dlgAfter = Array.isArray(entry) ? null : entry.after || null;
  dlgIndex = 0; dlgCharIdx = 0; dlgTimer = 0;
  dlgSpeakerNpc = npc || null;
  gameState = 'dialogue';
  Overworld.locked = true;
}

function updateDialogue(dt) {
  if (Input.wasPressed('mute')) Audio2.toggleMute();
  const full = dlgLines[dlgIndex] || '';
  if (dlgCharIdx < full.length) {
    dlgTimer += dt;
    while (dlgTimer > 18 && dlgCharIdx < full.length) {
      dlgTimer -= 18; dlgCharIdx++;
      if (full[dlgCharIdx - 1] !== ' ') Audio2.sfx('text');
    }
    if (Input.wasPressed('confirm')) dlgCharIdx = full.length;
  } else if (Input.wasPressed('confirm')) {
    Audio2.sfx('confirm');
    dlgIndex++;
    dlgCharIdx = 0; dlgTimer = 0;
    if (dlgIndex >= dlgLines.length) {
      const after = dlgAfter;
      const key = dlgKey;
      dlgKey = null;
      Overworld.locked = false;
      gameState = 'overworld';
      if (after && HOOKS[after]) HOOKS[after](key);
    }
  }
}

function drawDialogue() {
  ctx.fillStyle = 'rgba(8,8,16,0.94)';
  ctx.fillRect(20, 340, 600, 120);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.strokeRect(20, 340, 600, 120);
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';
  const shown = (dlgLines[dlgIndex] || '').slice(0, dlgCharIdx);
  wrapTextGlobal(shown, 40, 375, 560, 22);
  if (dlgCharIdx >= (dlgLines[dlgIndex] || '').length) {
    ctx.fillStyle = '#ffdd55';
    ctx.fillText('v', 590, 445);
  }
}

function wrapTextGlobal(text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, x, yy); line = w + ' '; yy += lineHeight; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
}

// ---- story hooks --------------------------------------------------
const HOOKS = {
  joinKaja() {
    Overworld.joinParty('kaja');
    Overworld.setFlag('npc_gone_kaja');
  },
  fallToDarkWorld() {
    Overworld.setRoom('dark_hall', 9, 11, 'up');
  },
  joinSima() {
    Overworld.joinParty('sima');
    Overworld.setFlag('npc_gone_sima');
  },
  startDuel() {
    Overworld.setFlag('npc_gone_martin_dark');
    gameState = 'battle';
    Overworld.locked = true;
    Battle.start(['lancer_martin'], 'duel', { noFlee: true });
  },
  openShop() {
    const item = ITEMS[0];
    item.count = Math.min(6, item.count + 2);
    showFollowupDialogueArray(['* Matěj tops off your snack supply. (+2 items)']);
  },
  startBoss() {
    Overworld.setFlag('npc_gone_sub_teacher_npc');
    gameState = 'battle';
    Overworld.locked = true;
    Battle.start(['sub_teacher'], 'boss', { noFlee: true });
  },
  finishGame() {
    Overworld.setRoom('courtyard');
  },
};

function showFollowupDialogueArray(lines) {
  dlgKey = '__followup';
  dlgLines = lines.slice();
  dlgAfter = null;
  dlgIndex = 0; dlgCharIdx = 0; dlgTimer = 0;
  gameState = 'dialogue';
  Overworld.locked = true;
}

// ---- battle end handling -------------------------------------------
function onBattleEnd(result, info) {
  Overworld.locked = false;
  if (result === 'lose') { gameState = 'gameover'; return; }
  gameState = 'overworld';
  if (result === 'win') {
    if (info.kind === 'duel') {
      showDialogue('__duel_after');
    } else if (info.kind === 'boss') {
      Overworld.setFlag('npc_gone_dan_caged');
      showDialogue('ending');
    }
  }
}
DIALOGUE.__duel_after = ['* You spared Martin. He looks delighted.', 'MARTIN: I shall return! With an even BETTER chair-kart!'];

// ---- input wiring for game modules ---------------------------------
Overworld.init({
  onDialogue: (key, npc) => showDialogue(key, npc),
  onBattle: (enemyIds, kind) => {
    gameState = 'battle';
    Overworld.locked = true;
    Battle.start(enemyIds, kind);
  },
});
Battle.init({ onBattleEnd });

// ---- title / gameover / ending screens ------------------------------
function updateTitle(dt) {
  titleBlink += dt;
  if (Input.wasPressed('confirm')) {
    Audio2.sfx('confirm');
    gameState = 'overworld';
    Overworld.setRoom('courtyard');
  }
}
function drawTitle() {
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, 640, 480);
  for (let i = 0; i < 30; i++) {
    const x = (i * 97 + 40) % 640;
    const y = (i * 53 + (titleBlink / 20)) % 480;
    drawHeart(ctx, x, y, 6, 'rgba(200,60,90,0.25)');
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 52px monospace';
  ctx.fillText('BERTARUNE', 320, 190);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#aab';
  TITLE_LINES.forEach((l, i) => ctx.fillText(l, 320, 225 + i * 20));
  if (Math.floor(titleBlink / 500) % 2 === 0) {
    ctx.fillStyle = '#ffdd55';
    ctx.font = '16px monospace';
    ctx.fillText('PRESS Z / ENTER TO START', 320, 320);
  }
  ctx.font = '11px monospace';
  ctx.fillStyle = '#778';
  ctx.fillText('a not-at-all-official parody, made for Bert', 320, 440);
  ctx.textAlign = 'left';
}

function updateGameOver(dt) {
  if (Input.wasPressed('confirm')) {
    Audio2.sfx('confirm');
    ITEMS[0].count = 3;
    gameState = 'overworld';
    Overworld.setRoom('dark_hall', 9, 11, 'up');
  }
}
function drawGameOver() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 640, 480);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c92b2b';
  ctx.font = 'bold 40px monospace';
  ctx.fillText('DETENTION EXTENDED', 320, 220);
  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  ctx.fillText('(you fainted. press Z to try again)', 320, 260);
  ctx.textAlign = 'left';
}

// ---- main loop --------------------------------------------------------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(50, now - lastTime);
  lastTime = now;

  switch (gameState) {
    case 'title': updateTitle(dt); break;
    case 'overworld': Overworld.update(dt); break;
    case 'dialogue': updateDialogue(dt); break;
    case 'battle': Battle.update(dt); break;
    case 'gameover': updateGameOver(dt); break;
  }

  ctx.clearRect(0, 0, 640, 480);
  switch (gameState) {
    case 'title': drawTitle(); break;
    case 'overworld':
      Overworld.draw(ctx);
      break;
    case 'dialogue':
      Overworld.draw(ctx);
      drawDialogue();
      break;
    case 'battle': Battle.draw(ctx); break;
    case 'gameover': drawGameOver(); break;
  }

  Input.endFrame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

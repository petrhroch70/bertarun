// ============================================================
// BERTARUNE — battle system: menu (FIGHT/ACT/ITEM/MERCY), a timing
// minigame for FIGHT, and a bullet-hell dodge phase for enemy turns.
// ============================================================

const Battle = (function () {
  const BOX = { x: 170, y: 300, w: 300, h: 150 };

  let allies = [];
  let enemies = [];
  let phase = 'intro';
  let msgQueue = [];
  let msgLines = [];
  let msgCharIdx = 0;
  let msgTimer = 0;
  let afterMsg = null;

  let menuIdx = 0;
  let targetIdx = 0;
  let actListIdx = 0;
  let itemIdx = 0;
  let mercyIdx = 0;
  let currentAllyIdx = 0;
  let actingAllyOrder = [];

  let fightBarPos = 0, fightBarDir = 1, fightZone = { start: 0.4, end: 0.6 }, fightTarget = null;

  let heart = { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2, invuln: 0 };
  let projectiles = [];
  let spawnSchedule = [];
  let phaseTime = 0;
  let dodgeDuration = 6500;
  let hooks = {};
  let battleKind = 'random';
  let canFlee = true;
  let onEndCb = null;

  function init(api) { hooks = api; }

  function start(enemyIds, kind, opts = {}) {
    battleKind = kind;
    canFlee = !opts.noFlee;
    onEndCb = opts.onEnd || null;
    const partyIds = ['bert', ...Overworld.getParty()];
    allies = partyIds.map(id => {
      const def = CHARACTERS[id];
      return { id, def, hp: def.maxHP, maxHp: def.maxHP, defending: false };
    });
    enemies = enemyIds.map((id, i) => {
      const def = ENEMIES[id];
      return { id, def, hp: def.maxHP, maxHp: def.maxHP, actFlags: new Set(), spared: false, dead: false, x: 0, y: 0, key: id + '_' + i };
    });
    layoutEnemies();
    phase = 'message';
    msgQueue = [`* ${enemies.length > 1 ? 'Enemies appear' : (enemies[0].def.name + ' blocks the way!')}!`];
    nextMessage(() => { startMenuRound(); });
    Audio2.playTrack(battleKind === 'boss' ? 'boss' : 'battle');
  }

  function layoutEnemies() {
    const n = enemies.length;
    enemies.forEach((e, i) => {
      e.x = 320 + (i - (n - 1) / 2) * 140;
      e.y = 150;
    });
  }

  function startMenuRound() {
    actingAllyOrder = allies.map((_, i) => i).filter(i => allies[i].hp > 0);
    currentAllyIdx = 0;
    phase = 'menu';
    menuIdx = 0;
  }

  function aliveEnemies() { return enemies.filter(e => !e.dead && !e.spared); }

  function nextMessage(after) {
    if (msgQueue.length === 0) { if (after) after(); return; }
    msgLines = [msgQueue.shift()];
    msgCharIdx = 0;
    msgTimer = 0;
    afterMsg = after;
    phase = 'message';
  }

  function queueMessages(lines, after) {
    msgQueue = lines.slice();
    nextMessage(after);
  }

  // ---------------------------------------------------------------
  function update(dt) {
    if (Input.wasPressed('mute')) Audio2.toggleMute();

    switch (phase) {
      case 'message': return updateMessage(dt);
      case 'menu': return updateMenu();
      case 'targetEnemy': return updateTargetEnemy();
      case 'actmenu': return updateActMenu();
      case 'itemmenu': return updateItemMenu();
      case 'itemtarget': return updateItemTarget();
      case 'mercymenu': return updateMercyMenu();
      case 'mercytarget': return updateMercyTarget();
      case 'fight': return updateFight(dt);
      case 'enemyturn': return updateEnemyTurn(dt);
      case 'end': return;
    }
  }

  function updateMessage(dt) {
    const full = msgLines[0] || '';
    if (msgCharIdx < full.length) {
      msgTimer += dt;
      while (msgTimer > 18 && msgCharIdx < full.length) {
        msgTimer -= 18; msgCharIdx++;
        if (full[msgCharIdx - 1] !== ' ') Audio2.sfx('text');
      }
      if (Input.wasPressed('confirm')) msgCharIdx = full.length;
    } else if (Input.wasPressed('confirm')) {
      Audio2.sfx('confirm');
      if (msgQueue.length > 0) nextMessage(afterMsg);
      else { const a = afterMsg; afterMsg = null; if (a) a(); }
    }
  }

  const MENU_OPTIONS = ['FIGHT', 'ACT', 'ITEM', 'MERCY'];
  function updateMenu() {
    if (allies.length === 0 || currentAllyIdx >= actingAllyOrder.length) { phase = 'enemyturn'; startEnemyTurn(); return; }
    if (Input.wasPressed('left')) { menuIdx = (menuIdx + 3) % 4; Audio2.sfx('select'); }
    if (Input.wasPressed('right')) { menuIdx = (menuIdx + 1) % 4; Audio2.sfx('select'); }
    if (Input.wasPressed('confirm')) {
      Audio2.sfx('confirm');
      const opt = MENU_OPTIONS[menuIdx];
      targetIdx = 0;
      if (opt === 'FIGHT') { phase = 'targetEnemy'; pendingAction = 'FIGHT'; }
      else if (opt === 'ACT') { phase = 'targetEnemy'; pendingAction = 'ACT'; }
      else if (opt === 'ITEM') { itemIdx = 0; phase = 'itemmenu'; }
      else if (opt === 'MERCY') { mercyIdx = 0; phase = 'mercymenu'; }
    }
    if (Input.wasPressed('cancel')) Audio2.sfx('cancel');
  }

  let pendingAction = null;
  function updateTargetEnemy() {
    const list = aliveEnemies();
    if (list.length === 0) { advanceAlly(); return; }
    if (Input.wasPressed('left')) { targetIdx = (targetIdx - 1 + list.length) % list.length; Audio2.sfx('select'); }
    if (Input.wasPressed('right')) { targetIdx = (targetIdx + 1) % list.length; Audio2.sfx('select'); }
    if (Input.wasPressed('cancel')) { phase = 'menu'; Audio2.sfx('cancel'); }
    if (Input.wasPressed('confirm')) {
      Audio2.sfx('confirm');
      const enemy = list[targetIdx];
      if (pendingAction === 'FIGHT') startFight(enemy);
      else { actListIdx = 0; currentActTarget = enemy; phase = 'actmenu'; }
    }
  }

  let currentActTarget = null;
  function updateActMenu() {
    const acts = currentActTarget.def.acts;
    if (Input.wasPressed('up')) { actListIdx = (actListIdx - 1 + acts.length) % acts.length; Audio2.sfx('select'); }
    if (Input.wasPressed('down')) { actListIdx = (actListIdx + 1) % acts.length; Audio2.sfx('select'); }
    if (Input.wasPressed('cancel')) { phase = 'targetEnemy'; Audio2.sfx('cancel'); }
    if (Input.wasPressed('confirm')) {
      const actName = acts[actListIdx];
      currentActTarget.actFlags.add(actName);
      const line = currentActTarget.def.actLines[actName] || `* You used ${actName}.`;
      Audio2.sfx('confirm');
      queueMessages([line], () => advanceAlly());
    }
  }

  function updateItemMenu() {
    const item = ITEMS[0];
    if (Input.wasPressed('cancel')) { phase = 'menu'; Audio2.sfx('cancel'); return; }
    if (Input.wasPressed('confirm')) {
      if (item.count <= 0) { Audio2.sfx('cancel'); queueMessages(['* No items left.'], () => { phase = 'menu'; }); return; }
      itemIdx = 0; phase = 'itemtarget';
      Audio2.sfx('confirm');
    }
  }
  function updateItemTarget() {
    if (Input.wasPressed('up')) { itemIdx = (itemIdx - 1 + allies.length) % allies.length; Audio2.sfx('select'); }
    if (Input.wasPressed('down')) { itemIdx = (itemIdx + 1) % allies.length; Audio2.sfx('select'); }
    if (Input.wasPressed('cancel')) { phase = 'itemmenu'; Audio2.sfx('cancel'); }
    if (Input.wasPressed('confirm')) {
      const item = ITEMS[0];
      const ally = allies[itemIdx];
      item.count--;
      ally.hp = Math.min(ally.maxHp, ally.hp + item.heal);
      Audio2.sfx('heal');
      queueMessages([`* ${ally.def.name} ate ${item.name}. Healed ${item.heal} HP!`], () => advanceAlly());
    }
  }

  function updateMercyMenu() {
    if (Input.wasPressed('up') || Input.wasPressed('down')) { mercyIdx = mercyIdx === 0 ? 1 : 0; Audio2.sfx('select'); }
    if (Input.wasPressed('cancel')) { phase = 'menu'; Audio2.sfx('cancel'); }
    if (Input.wasPressed('confirm')) {
      Audio2.sfx('confirm');
      if (mercyIdx === 0) { targetIdx = 0; phase = 'mercytarget'; }
      else {
        if (!canFlee) { queueMessages(["* You can't flee from this!"], () => { phase = 'menu'; }); return; }
        if (Math.random() < 0.7) { queueMessages(['* You got away safely.'], () => endBattle('flee')); }
        else { queueMessages(["* Couldn't escape!"], () => advanceAlly()); }
      }
    }
  }
  function updateMercyTarget() {
    const list = aliveEnemies();
    if (list.length === 0) { advanceAlly(); return; }
    if (Input.wasPressed('left')) { targetIdx = (targetIdx - 1 + list.length) % list.length; Audio2.sfx('select'); }
    if (Input.wasPressed('right')) { targetIdx = (targetIdx + 1) % list.length; Audio2.sfx('select'); }
    if (Input.wasPressed('cancel')) { phase = 'mercymenu'; Audio2.sfx('cancel'); }
    if (Input.wasPressed('confirm')) {
      const enemy = list[targetIdx];
      const ready = enemy.actFlags.size >= enemy.def.spareNeeds;
      Audio2.sfx('confirm');
      if (ready) {
        enemy.spared = true;
        Audio2.sfx('spare');
        queueMessages([enemy.def.spareLine], () => checkBattleOver());
      } else {
        queueMessages(['* ' + enemy.def.name + ' is not ready to be spared yet.'], () => advanceAlly());
      }
    }
  }

  function startFight(enemy) {
    fightTarget = enemy;
    fightBarPos = 0; fightBarDir = 1;
    const zoneW = 0.16 + Math.random() * 0.08;
    const zoneStart = 0.15 + Math.random() * (0.7 - zoneW);
    fightZone = { start: zoneStart, end: zoneStart + zoneW };
    phase = 'fight';
  }
  function updateFight(dt) {
    fightBarPos += fightBarDir * dt * 0.0016;
    if (fightBarPos >= 1) { fightBarPos = 1; fightBarDir = -1; }
    if (fightBarPos <= 0) { fightBarPos = 0; fightBarDir = 1; }
    if (Input.wasPressed('confirm')) {
      const center = (fightZone.start + fightZone.end) / 2;
      const dist = Math.abs(fightBarPos - center);
      const inZone = fightBarPos >= fightZone.start && fightBarPos <= fightZone.end;
      const acc = Math.max(0, 1 - dist / 0.5);
      const ally = allies[actingAllyOrder[currentAllyIdx]];
      let dmg = Math.round((ally.def.atk || 6) * (inZone ? (1.3 + acc) : (0.3 + acc * 0.5)) - (fightTarget.def.def || 0));
      dmg = Math.max(1, dmg);
      if (!fightTarget.def.unlosable) fightTarget.hp = Math.max(0, fightTarget.hp - dmg);
      Audio2.sfx('hit');
      const crit = inZone && dist < 0.03;
      queueMessages([`* ${ally.def.name} attacks ${fightTarget.def.name} for ${dmg} damage!` + (crit ? ' CRITICAL!' : '')], () => {
        if (fightTarget.hp <= 0 && !fightTarget.def.unlosable) { fightTarget.dead = true; queueMessages([`* ${fightTarget.def.name} was defeated!`], () => checkBattleOver()); }
        else advanceAlly();
      });
    }
  }

  function advanceAlly() {
    currentAllyIdx++;
    menuIdx = 0;
    if (currentAllyIdx >= actingAllyOrder.length) { phase = 'enemyturn'; startEnemyTurn(); }
    else phase = 'menu';
  }

  function checkBattleOver() {
    if (aliveEnemies().length === 0) { endBattle('win'); }
    else advanceAlly();
  }

  // ---------------- enemy bullet-hell dodge phase -----------------
  function startEnemyTurn() {
    const alive = aliveEnemies();
    if (alive.length === 0) { endBattle('win'); return; }
    phase = 'enemyturn';
    phaseTime = 0;
    heart.x = BOX.x + BOX.w / 2; heart.y = BOX.y + BOX.h / 2; heart.invuln = 400;
    projectiles = [];
    spawnSchedule = [];
    alive.forEach(e => {
      const events = buildPattern(e.def.pattern, e.def.atk || 5, e);
      spawnSchedule.push(...events);
    });
    spawnSchedule.sort((a, b) => a.t - b.t);
    dodgeDuration = Math.max(4000, (spawnSchedule[spawnSchedule.length - 1]?.t || 3000) + 2200);
  }

  function buildPattern(pattern, atk, enemy) {
    const evts = [];
    switch (pattern) {
      case 'papers':
        for (let wave = 0; wave < 4; wave++) for (let i = 0; i < 5; i++)
          evts.push({ t: wave * 900 + i * 90, x: BOX.x + (i + 0.5) * (BOX.w / 5), y: BOX.y - 10, vx: 0, vy: 0.095, r: 8, color: '#eee0c0', dmg: Math.round(atk * 0.7) });
        break;
      case 'chalkdust':
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          evts.push({ t: i * 200, x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2, vx: Math.cos(a) * 0.13, vy: Math.sin(a) * 0.13, r: 5, color: '#fff', dmg: Math.round(atk * 0.6), life: 2600 });
        }
        break;
      case 'words':
        for (let i = 0; i < 10; i++)
          evts.push({ t: i * 420, x: BOX.x - 15, y: BOX.y + 20 + (i % 4) * 32, vx: 0.11, vy: 0, r: 11, color: '#b090ff', dmg: Math.round(atk * 0.8) });
        break;
      case 'chairkart':
        for (let lane = 0; lane < 3; lane++)
          evts.push({ t: lane * 500 + 200, x: BOX.x - 15, y: BOX.y + 20 + lane * 50, vx: 0.15, vy: 0, r: 11, color: '#c02626', dmg: 2 });
        break;
      case 'boss':
        for (let i = 0; i < 6; i++)
          evts.push({ t: i * 260, x: BOX.x + (i + 0.5) * (BOX.w / 6), y: BOX.y - 10, vx: 0, vy: 0.15, r: 6, color: '#c92b2b', dmg: Math.round(atk * 0.8) });
        for (let i = 0; i < 3; i++)
          evts.push({ t: 1900 + i * 480, x: BOX.x - 15, y: BOX.y + 25 + i * 45, vx: 0.16, vy: 0, r: 9, color: '#f2c14e', dmg: atk });
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          evts.push({ t: 3600 + i * 90, x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2, vx: Math.cos(a) * 0.14, vy: Math.sin(a) * 0.14, r: 5, color: '#7a5aff', dmg: Math.round(atk * 0.7), life: 2400 });
        }
        break;
      default:
        evts.push({ t: 0, x: BOX.x + BOX.w / 2, y: BOX.y - 10, vx: 0, vy: 0.1, r: 7, color: '#aaa', dmg: atk });
    }
    return evts;
  }

  function updateEnemyTurn(dt) {
    phaseTime += dt;
    if (heart.invuln > 0) heart.invuln -= dt;

    const speed = 0.24 * dt;
    if (Input.isDown('left')) heart.x -= speed;
    if (Input.isDown('right')) heart.x += speed;
    if (Input.isDown('up')) heart.y -= speed;
    if (Input.isDown('down')) heart.y += speed;
    heart.x = Math.max(BOX.x + 8, Math.min(BOX.x + BOX.w - 8, heart.x));
    heart.y = Math.max(BOX.y + 8, Math.min(BOX.y + BOX.h - 8, heart.y));

    while (spawnSchedule.length && spawnSchedule[0].t <= phaseTime) {
      const s = spawnSchedule.shift();
      projectiles.push({ x: s.x, y: s.y, vx: s.vx, vy: s.vy, r: s.r, color: s.color, dmg: s.dmg, born: phaseTime, life: s.life || 5000 });
    }

    projectiles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; });
    projectiles = projectiles.filter(p => (phaseTime - p.born) < p.life && p.x > BOX.x - 40 && p.x < BOX.x + BOX.w + 40 && p.y > BOX.y - 40 && p.y < BOX.y + BOX.h + 40);

    if (heart.invuln <= 0) {
      for (const p of projectiles) {
        const dx = p.x - heart.x, dy = p.y - heart.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.r + 5) {
          const ally = allies.find(a => a.hp > 0) || allies[0];
          ally.hp = Math.max(0, ally.hp - p.dmg);
          Audio2.sfx('hurt');
          heart.invuln = 900;
          break;
        }
      }
    }

    if (allies.every(a => a.hp <= 0)) { endBattle('lose'); return; }

    if (phaseTime >= dodgeDuration && spawnSchedule.length === 0) {
      startMenuRound();
    }
  }

  function endBattle(result) {
    phase = 'end';
    Overworld.locked = false;
    if (result === 'win') {
      const gained = enemies.filter(e => e.spared).map(e => e.id);
      hooks.onBattleEnd(result, { spared: gained, kind: battleKind });
    } else {
      hooks.onBattleEnd(result, { kind: battleKind });
    }
    if (onEndCb) onEndCb(result);
  }

  // ---------------------------------------------------------------
  function draw(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 640, 480);

    // enemies
    enemies.forEach(e => {
      if (e.dead || e.spared) return;
      drawEnemy(ctx, e.id, e.x, e.y, performance.now());
      drawBar(ctx, e.x - 40, e.y + 20, 80, 8, e.hp / e.maxHp, '#c92b2b');
    });

    // allies row
    allies.forEach((a, i) => {
      const x = 90 + i * 70, y = 240;
      const alpha = a.hp > 0 ? 1 : 0.3;
      ctx.globalAlpha = alpha;
      drawHumanoid(ctx, a.def, x, y, { facing: 'right', scale: 1 });
      ctx.globalAlpha = 1;
    });

    if (phase === 'enemyturn') drawDodgeBox(ctx);

    if (phase === 'message') drawMessageBox(ctx);
    if (phase === 'menu') drawMenu(ctx);
    if (phase === 'targetEnemy' || phase === 'mercytarget') drawTargetArrow(ctx);
    if (phase === 'actmenu') drawActMenu(ctx);
    if (phase === 'itemmenu') drawItemMenu(ctx);
    if (phase === 'itemtarget') drawItemTarget(ctx);
    if (phase === 'mercymenu') drawMercyMenu(ctx);
    if (phase === 'fight') drawFightBar(ctx);
  }

  function drawBar(ctx, x, y, w, h, ratio, color) {
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, ratio), h);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  }

  function drawMessageBox(ctx) {
    ctx.fillStyle = 'rgba(8,8,16,0.92)';
    ctx.fillRect(20, 300, 600, 150);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.strokeRect(20, 300, 600, 150);
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    const shown = (msgLines[0] || '').slice(0, msgCharIdx);
    wrapText(ctx, shown, 40, 335, 560, 22);
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, x, yy); line = w + ' '; yy += lineHeight; }
      else line = test;
    }
    ctx.fillText(line, x, yy);
  }

  function drawMenu(ctx) {
    if (currentAllyIdx >= actingAllyOrder.length) return;
    const ally = allies[actingAllyOrder[currentAllyIdx]];
    ctx.fillStyle = 'rgba(8,8,16,0.92)';
    ctx.fillRect(20, 300, 250, 150);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(20, 300, 250, 150);
    ctx.fillStyle = '#ffcc33'; ctx.font = '14px monospace';
    ctx.fillText(ally.def.name + `  HP ${ally.hp}/${ally.maxHp}`, 35, 322);
    MENU_OPTIONS.forEach((opt, i) => {
      ctx.fillStyle = i === menuIdx ? '#ffdd55' : '#fff';
      ctx.font = '16px monospace';
      ctx.fillText((i === menuIdx ? '> ' : '  ') + opt, 40, 350 + i * 24);
    });
    ctx.fillStyle = 'rgba(8,8,16,0.92)';
    ctx.fillRect(290, 300, 330, 150);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(290, 300, 330, 150);
    ctx.fillStyle = '#fff'; ctx.font = '12px monospace';
    let ly = 320;
    allies.forEach(a => { ctx.fillText(`${a.def.name}: ${a.hp}/${a.maxHp} HP`, 305, ly); ly += 20; });
  }

  function drawTargetArrow(ctx) {
    const list = aliveEnemies();
    ctx.fillStyle = 'rgba(8,8,16,0.92)';
    ctx.fillRect(20, 300, 600, 60);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(20, 300, 600, 60);
    ctx.font = '14px monospace';
    list.forEach((e, i) => {
      ctx.fillStyle = i === targetIdx ? '#ffdd55' : '#fff';
      ctx.fillText((i === targetIdx ? '> ' : '  ') + e.def.name + ` (${e.hp}/${e.maxHp})`, 40 + i * 190, 335);
    });
    if (list[targetIdx]) {
      const e = list[targetIdx];
      ctx.fillStyle = '#fff'; ctx.font = '11px monospace';
      wrapText(ctx, e.def.checkText, 40, 350, 560, 14);
    }
  }

  function drawActMenu(ctx) {
    const acts = currentActTarget.def.acts;
    ctx.fillStyle = 'rgba(8,8,16,0.92)';
    ctx.fillRect(20, 300, 250, 150);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(20, 300, 250, 150);
    ctx.fillStyle = '#ffcc33'; ctx.font = '13px monospace';
    ctx.fillText('ACT on ' + currentActTarget.def.name, 30, 320);
    acts.forEach((a, i) => {
      const used = currentActTarget.actFlags.has(a);
      ctx.fillStyle = i === actListIdx ? '#ffdd55' : (used ? '#888' : '#fff');
      ctx.font = '14px monospace';
      ctx.fillText((i === actListIdx ? '> ' : '  ') + a + (used ? ' (done)' : ''), 35, 350 + i * 22);
    });
  }

  function drawItemMenu(ctx) {
    const item = ITEMS[0];
    ctx.fillStyle = 'rgba(8,8,16,0.92)';
    ctx.fillRect(20, 300, 250, 150);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(20, 300, 250, 150);
    ctx.fillStyle = '#fff'; ctx.font = '14px monospace';
    ctx.fillText(`> ${item.name} x${item.count}`, 35, 340);
    ctx.font = '11px monospace';
    wrapText(ctx, item.desc, 35, 365, 220, 14);
  }
  function drawItemTarget(ctx) {
    ctx.fillStyle = 'rgba(8,8,16,0.92)';
    ctx.fillRect(20, 300, 250, 150);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(20, 300, 250, 150);
    ctx.fillStyle = '#ffcc33'; ctx.font = '13px monospace'; ctx.fillText('Use on who?', 30, 320);
    allies.forEach((a, i) => {
      ctx.fillStyle = i === itemIdx ? '#ffdd55' : '#fff';
      ctx.font = '13px monospace';
      ctx.fillText((i === itemIdx ? '> ' : '  ') + `${a.def.name} ${a.hp}/${a.maxHp}`, 35, 345 + i * 20);
    });
  }
  function drawMercyMenu(ctx) {
    ctx.fillStyle = 'rgba(8,8,16,0.92)';
    ctx.fillRect(20, 300, 250, 150);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(20, 300, 250, 150);
    ['SPARE', 'FLEE'].forEach((opt, i) => {
      ctx.fillStyle = i === mercyIdx ? '#ffdd55' : '#fff';
      ctx.font = '16px monospace';
      ctx.fillText((i === mercyIdx ? '> ' : '  ') + opt, 40, 350 + i * 26);
    });
  }

  function drawFightBar(ctx) {
    ctx.fillStyle = 'rgba(8,8,16,0.92)';
    ctx.fillRect(20, 300, 600, 150);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(20, 300, 600, 150);
    ctx.fillStyle = '#ffcc33'; ctx.font = '14px monospace';
    ctx.fillText('Press Z/ENTER in the zone!', 40, 330);
    const barX = 60, barY = 380, barW = 520, barH = 24;
    ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(barX + fightZone.start * barW, barY, (fightZone.end - fightZone.start) * barW, barH);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#fff';
    ctx.fillRect(barX + fightBarPos * barW - 2, barY - 6, 4, barH + 12);
  }

  function drawDodgeBox(ctx) {
    ctx.fillStyle = '#050508';
    ctx.fillRect(BOX.x, BOX.y, BOX.w, BOX.h);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.strokeRect(BOX.x, BOX.y, BOX.w, BOX.h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(BOX.x, BOX.y, BOX.w, BOX.h);
    ctx.clip();
    projectiles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
    if (heart.invuln <= 0 || Math.floor(heart.invuln / 100) % 2 === 0) {
      drawHeart(ctx, heart.x, heart.y, 16, '#e83030');
    }
    ctx.restore();
  }

  return { init, start, update, draw, get phase() { return phase; } };
})();

// ============================================================
// BERTARUNE — overworld: room rendering, movement, collision,
// NPC interaction, warps, random encounters, party trail.
// ============================================================

const Overworld = (function () {
  let roomId = 'courtyard';
  let player = { x: 9 * TILE + TILE / 2, y: 9 * TILE + TILE / 2, facing: 'down', moving: false, frame: 0, frameTimer: 0 };
  let trail = []; // history of {x,y,facing} for follower snake
  let party = []; // ids of joined followers, e.g. ['sima','kaja']
  let locked = false;
  let hooks = {};
  let stepAccum = 0;
  let encounterCooldown = 0;
  let lastTile = { x: -1, y: -1 };
  const flags = {}; // generic story flags (npc removed, doors opened, etc.)

  const PALETTES = {
    light: { '.': '#cfd6e0', ',': '#bfc8d6', '~': '#3f7d3f', '%': '#1f3d1f', '#': '#5a4a34', o: '#7a5a3a', B: '#5a4a34' },
    dark: { '.': '#2a2440', ',': '#332a52', '~': '#241f38', '%': '#150f24', '#': '#161028', o: '#3a2f5a', B: '#4a3f78' },
  };

  function init(api) {
    hooks = api;
    setRoom('courtyard');
  }

  function setRoom(id, x, y, facing) {
    roomId = id;
    const room = ROOMS[id];
    if (x !== undefined) {
      player.x = x * TILE + TILE / 2;
      player.y = y * TILE + TILE / 2;
      player.facing = facing || player.facing;
    } else {
      player.x = room.playerStart.x * TILE + TILE / 2;
      player.y = room.playerStart.y * TILE + TILE / 2;
      player.facing = room.playerStart.facing;
    }
    trail = [];
    encounterCooldown = 30;
    Audio2.playTrack(room.music === 'boss' ? 'boss' : room.music);
  }

  function currentRoom() { return ROOMS[roomId]; }

  function tileAt(px, py) { return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) }; }

  function isSolid(tx, ty) {
    const room = currentRoom();
    if (tx < 0 || ty < 0 || ty >= ROWS || tx >= COLS) return true;
    return WALL_CHARS.has(room.grid[ty][tx]);
  }

  function canStandAt(px, py) {
    const pad = 8;
    const corners = [
      [px - pad, py - 2], [px + pad, py - 2],
      [px - pad, py + 10], [px + pad, py + 10],
    ];
    for (const [cx, cy] of corners) {
      const t = tileAt(cx, cy);
      if (isSolid(t.x, t.y)) return false;
      if (npcAt(t.x, t.y)) return false;
    }
    return true;
  }

  function npcAt(tx, ty) {
    const room = currentRoom();
    return room.npcs.find(n => !flags['npc_gone_' + n.id] && Math.floor(n.x) === tx && Math.floor(n.y) === ty);
  }

  function facingTile() {
    const t = tileAt(player.x, player.y);
    if (player.facing === 'up') t.y -= 1;
    else if (player.facing === 'down') t.y += 1;
    else if (player.facing === 'left') t.x -= 1;
    else if (player.facing === 'right') t.x += 1;
    return t;
  }

  function joinParty(id) { if (!party.includes(id)) party.push(id); }
  function hasJoined(id) { return party.includes(id); }
  function setFlag(k, v = true) { flags[k] = v; }
  function getFlag(k) { return !!flags[k]; }
  function getParty() { return party.slice(); }

  const SPEED = 2.4;

  function update(dt) {
    if (locked) return;
    const room = currentRoom();

    if (Input.wasPressed('mute')) Audio2.toggleMute();

    if (Input.wasPressed('confirm')) {
      const ft = facingTile();
      const npc = npcAt(ft.x, ft.y);
      if (npc) {
        triggerNpc(npc);
        return;
      }
      const inter = (room.interactables || []).find(i => i.x === ft.x && i.y === ft.y && !flags['done_' + i.id]);
      if (inter) {
        hooks.onDialogue(inter.dialogue);
        flags['done_' + inter.id] = true;
        return;
      }
    }

    let dx = 0, dy = 0;
    let dir = null;
    if (Input.isDown('left')) { dx = -1; dir = 'left'; }
    else if (Input.isDown('right')) { dx = 1; dir = 'right'; }
    else if (Input.isDown('up')) { dy = -1; dir = 'up'; }
    else if (Input.isDown('down')) { dy = 1; dir = 'down'; }

    player.moving = !!dir;
    if (dir) player.facing = dir;

    if (dx !== 0 || dy !== 0) {
      const nx = player.x + dx * SPEED;
      const ny = player.y + dy * SPEED;
      if (canStandAt(nx, player.y)) player.x = nx;
      if (canStandAt(player.x, ny)) player.y = ny;

      player.frameTimer += dt;
      if (player.frameTimer > 110) { player.frameTimer = 0; player.frame = player.frame === 1 ? 2 : 1; }

      trail.unshift({ x: player.x, y: player.y, facing: player.facing });
      if (trail.length > 400) trail.length = 400;
    } else {
      player.frame = 0;
    }

    // warps
    const pt = tileAt(player.x, player.y);
    if (pt.x !== lastTile.x || pt.y !== lastTile.y) {
      lastTile = pt;
      const warp = room.warps.find(w => w.x === pt.x && w.y === pt.y);
      if (warp) { setRoom(warp.toRoom, warp.toX, warp.toY, warp.toFacing); return; }

      if (encounterCooldown > 0) encounterCooldown--;
      else if (room.encounters && room.encounters.length) {
        const near = room.encounters.some(e => Math.abs(e.x - pt.x) <= 0 && Math.abs(e.y - pt.y) <= 0);
        if (near && Math.random() < 0.35) {
          encounterCooldown = 10;
          const table = room.encounterTable || ['killer_chalk'];
          const count = Math.random() < 0.3 ? 2 : 1;
          const ids = [];
          for (let i = 0; i < count; i++) ids.push(table[Math.floor(Math.random() * table.length)]);
          hooks.onBattle(ids, 'random');
        }
      }
    }
  }

  function triggerNpc(npc) {
    hooks.onDialogue(npc.dialogue, npc);
  }

  function draw(ctx) {
    const room = currentRoom();
    const pal = PALETTES[room.world];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const ch = room.grid[y][x];
        ctx.fillStyle = pal[ch] || pal['.'];
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        if (ch === '.' || ch === ',' || ch === '~') {
          ctx.strokeStyle = 'rgba(0,0,0,0.05)';
          ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
        }
        if (ch === 'B') {
          ctx.fillStyle = 'rgba(255,240,150,0.5)';
          ctx.beginPath();
          ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // draw entities sorted by y for pseudo-depth
    const drawables = [];
    room.npcs.forEach(n => {
      if (flags['npc_gone_' + n.id]) return;
      drawables.push({ y: n.y * TILE, draw: () => drawNpc(ctx, n) });
    });

    // followers along trail
    const spacing = 14;
    party.forEach((id, i) => {
      const p = trail[(i + 1) * spacing] || trail[trail.length - 1] || { x: player.x, y: player.y, facing: player.facing };
      drawables.push({ y: p.y, draw: () => drawHumanoid(ctx, CHARACTERS[id], p.x, p.y + 16, { facing: p.facing, walkFrame: 0, scale: 0.95 }) });
    });

    drawables.push({ y: player.y, draw: () => drawHumanoid(ctx, CHARACTERS.bert, player.x, player.y + 16, { facing: player.facing, walkFrame: player.frame }) });

    drawables.sort((a, b) => a.y - b.y);
    drawables.forEach(d => d.draw());
  }

  function drawNpc(ctx, n) {
    if (n.id === 'dan_caged') {
      ctx.save();
      ctx.strokeStyle = '#c9a24a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(n.x * TILE + 4, n.y * TILE + 6 + i * 6);
        ctx.lineTo(n.x * TILE + 28, n.y * TILE + 6 + i * 6);
        ctx.stroke();
      }
      ctx.restore();
      drawHumanoid(ctx, CHARACTERS.dan, n.x * TILE + TILE / 2, n.y * TILE + TILE / 2 + 16, { facing: 'down', scale: 0.9 });
      return;
    }
    if (n.id === 'sub_teacher_npc') {
      drawEnemy(ctx, 'sub_teacher', n.x * TILE + TILE / 2, n.y * TILE + TILE / 2 + 40, performance.now());
      return;
    }
    const charKey = n.id.replace('_dark', '').replace('_npc', '');
    const def = CHARACTERS[charKey] || CHARACTERS.matej;
    drawHumanoid(ctx, def, n.x * TILE + TILE / 2, n.y * TILE + TILE / 2 + 16, { facing: n.facing || 'down' });
  }

  return {
    init, update, draw, setRoom, joinParty, hasJoined, getParty,
    setFlag, getFlag,
    get locked() { return locked; }, set locked(v) { locked = v; },
    get player() { return player; },
    get roomId() { return roomId; },
  };
})();

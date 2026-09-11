// ============================================================
// BERTARUNE — procedural pixel/chibi sprite rendering.
// Every character is drawn with canvas primitives parameterized by
// color/hairstyle, so no external image assets are needed and no
// existing game's artwork is reproduced.
// ============================================================

function drawHumanoid(ctx, def, x, y, opts = {}) {
  const facing = opts.facing || 'down';
  const walk = opts.walkFrame || 0;
  const scale = opts.scale || 1;
  const s = scale;
  ctx.save();
  ctx.translate(x, y); // x,y = feet center

  const legOffset = walk === 1 ? 3 * s : (walk === 2 ? -3 * s : 0);

  // legs
  ctx.fillStyle = def.pants || '#222';
  ctx.fillRect(-6 * s, -14 * s + legOffset, 5 * s, 14 * s);
  ctx.fillRect(1 * s, -14 * s - legOffset, 5 * s, 14 * s);

  // body
  ctx.fillStyle = def.shirt || '#3355aa';
  ctx.fillRect(-8 * s, -26 * s, 16 * s, 14 * s);

  // cape (Šíma)
  if (def.cape) {
    ctx.fillStyle = def.cape;
    ctx.beginPath();
    ctx.moveTo(-8 * s, -26 * s);
    ctx.lineTo(-13 * s, -6 * s);
    ctx.lineTo(-6 * s, -14 * s);
    ctx.lineTo(-8 * s, -14 * s);
    ctx.closePath();
    ctx.fill();
  }

  // arms
  ctx.fillStyle = def.shirt || '#3355aa';
  ctx.fillRect(-11 * s, -24 * s, 4 * s, 10 * s);
  ctx.fillRect(7 * s, -24 * s, 4 * s, 10 * s);
  ctx.fillStyle = def.skin || '#f0c8a0';
  ctx.fillRect(-11 * s, -15 * s, 4 * s, 3 * s);
  ctx.fillRect(7 * s, -15 * s, 4 * s, 3 * s);

  // weapon (Kája's ruler)
  if (def.weapon === 'ruler' && facing !== 'up') {
    ctx.save();
    ctx.translate(11 * s, -20 * s);
    ctx.rotate(facing === 'left' ? 0.4 : -0.4);
    ctx.fillStyle = '#d9c07a';
    ctx.fillRect(-2 * s, -1 * s, 22 * s, 4 * s);
    ctx.strokeStyle = '#7a6636';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) ctx.strokeRect(-2 * s + i * 3.5 * s, -1 * s, 0.5 * s, 4 * s);
    ctx.restore();
  }

  // head
  ctx.fillStyle = def.skin || '#f0c8a0';
  ctx.beginPath();
  ctx.arc(0, -32 * s, 9 * s, 0, Math.PI * 2);
  ctx.fill();

  // face (not drawn facing away)
  if (facing !== 'up') {
    ctx.fillStyle = '#241a12';
    const eyeX = facing === 'left' ? -2 : (facing === 'right' ? 2 : 0);
    ctx.fillRect(-4 * s + eyeX * s, -33 * s, 2 * s, 3 * s);
    ctx.fillRect(2 * s + eyeX * s, -33 * s, 2 * s, 3 * s);
  }

  // hair
  ctx.fillStyle = def.hair || '#222';
  drawHair(ctx, def.hairStyle, s, facing);

  // accessory: goggles (Martin), badge (Šíma handled via cape only)
  if (def.id === 'martin' || def.id === 'martin_dark') {
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.arc(-4 * s, -33 * s, 3 * s, 0, Math.PI * 2);
    ctx.arc(4 * s, -33 * s, 3 * s, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHair(ctx, style, s, facing) {
  switch (style) {
    case 'messy':
      ctx.beginPath();
      ctx.arc(0, -34 * s, 9.5 * s, Math.PI, Math.PI * 2);
      ctx.fillRect(-9 * s, -37 * s, 18 * s, 6 * s);
      ctx.fill();
      for (let i = -2; i <= 2; i++) ctx.fillRect(i * 4 * s - 1 * s, -40 * s, 2 * s, 5 * s);
      break;
    case 'ponytail':
      ctx.beginPath();
      ctx.arc(0, -34 * s, 9.5 * s, Math.PI, Math.PI * 2.02);
      ctx.fill();
      ctx.fillRect(-9 * s, -38 * s, 18 * s, 5 * s);
      ctx.beginPath();
      ctx.ellipse(facing === 'left' ? 8 * s : -8 * s, -28 * s, 3 * s, 8 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'neat':
      ctx.fillRect(-9.5 * s, -40 * s, 19 * s, 6 * s);
      ctx.beginPath();
      ctx.arc(0, -35 * s, 9.5 * s, Math.PI, Math.PI * 2);
      ctx.fill();
      break;
    case 'spiky':
      ctx.beginPath();
      ctx.arc(0, -34 * s, 9.5 * s, Math.PI, Math.PI * 2);
      ctx.fill();
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 3 * s, -39 * s);
        ctx.lineTo(i * 3 * s - 2 * s, -46 * s);
        ctx.lineTo(i * 3 * s + 2 * s, -39 * s);
        ctx.fill();
      }
      break;
    case 'flat':
    default:
      ctx.fillRect(-9.5 * s, -41 * s, 19 * s, 8 * s);
      break;
  }
}

// ---- enemies -------------------------------------------------------
function drawEnemy(ctx, enemyId, x, y, t) {
  const bob = Math.sin(t / 300) * 3;
  switch (enemyId) {
    case 'homework_golem': return drawHomeworkGolem(ctx, x, y + bob);
    case 'killer_chalk': return drawChalk(ctx, x, y + bob);
    case 'latin_ghost': return drawGhost(ctx, x, y + bob * 1.5);
    case 'lancer_martin': return drawLancerMartin(ctx, x, y + bob * 0.3);
    case 'sub_teacher': return drawSubTeacher(ctx, x, y + bob);
    default: return drawBlob(ctx, x, y + bob);
  }
}

function drawHomeworkGolem(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  const papers = ['#f4ecd8', '#eee0c0', '#f7f0e0'];
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = papers[i % papers.length];
    ctx.save();
    ctx.rotate((i - 2) * 0.04);
    ctx.fillRect(-30 - i, -20 - i * 12, 60 + i * 2, 14);
    ctx.restore();
  }
  ctx.strokeStyle = '#c94b4b';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-20, -55); ctx.lineTo(-8, -50); ctx.moveTo(20, -55); ctx.lineTo(8, -50); ctx.stroke();
  ctx.fillStyle = '#221';
  ctx.fillRect(-16, -34, 6, 8);
  ctx.fillRect(10, -34, 6, 8);
  ctx.restore();
}

function drawChalk(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#f4f0e6';
  ctx.fillRect(-10, -60, 20, 50);
  ctx.fillStyle = '#e0d8b0';
  ctx.fillRect(-10, -60, 20, 6);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -30); ctx.lineTo(-22, -18);
  ctx.moveTo(10, -30); ctx.lineTo(22, -18);
  ctx.moveTo(-4, -10); ctx.lineTo(-4, 4);
  ctx.moveTo(4, -10); ctx.lineTo(4, 4);
  ctx.stroke();
  ctx.fillStyle = '#221';
  ctx.beginPath(); ctx.arc(-4, -40, 2.5, 0, 7); ctx.arc(4, -40, 2.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -33, 4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.restore();
}

function drawGhost(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(230,230,255,0.85)';
  ctx.beginPath();
  ctx.arc(0, -40, 24, Math.PI, 0);
  ctx.lineTo(24, -14);
  for (let i = 0; i < 5; i++) {
    ctx.quadraticCurveTo(24 - i * 9.6 - 4.8, -4, 24 - i * 9.6 - 9.6, -14);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#221';
  ctx.beginPath(); ctx.arc(-8, -42, 2.5, 0, 7); ctx.arc(8, -42, 2.5, 0, 7); ctx.fill();
  // floating book
  ctx.fillStyle = '#7a3b3b';
  ctx.fillRect(20, -30, 14, 10);
  ctx.fillStyle = '#eee';
  ctx.fillRect(22, -28, 10, 6);
  ctx.restore();
}

function drawLancerMartin(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  // chair-kart
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(-22, -20, 44, 6);
  ctx.fillRect(-22, -34, 6, 20);
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(-14, -2, 6, 0, 7); ctx.arc(14, -2, 6, 0, 7); ctx.fill();
  drawHumanoid(ctx, CHARACTERS.martin, 0, -22, { facing: 'down', scale: 0.9 });
  ctx.restore();
}

function drawSubTeacher(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#2a2333';
  ctx.beginPath();
  ctx.moveTo(-26, 0); ctx.lineTo(-20, -90); ctx.lineTo(20, -90); ctx.lineTo(26, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath(); ctx.arc(0, -100, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.fillRect(-20, -108, 40, 6); // hair
  ctx.fillStyle = 'rgba(255,40,40,0.85)';
  ctx.beginPath(); ctx.ellipse(-6, -100, 6, 4, 0, 0, 7); ctx.ellipse(6, -100, 6, 4, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
  ctx.strokeRect(-11, -104, 10, 8); ctx.strokeRect(1, -104, 10, 8);
  // giant red pen
  ctx.save();
  ctx.translate(30, -60);
  ctx.rotate(0.5);
  ctx.fillStyle = '#c92b2b';
  ctx.fillRect(-6, -50, 12, 60);
  ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(6, 10); ctx.lineTo(0, 24); ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawBlob(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#999';
  ctx.beginPath(); ctx.arc(0, -20, 20, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---- SOUL heart ------------------------------------------------------
function drawHeart(ctx, x, y, size, color = '#e83030') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size / 10;
  ctx.moveTo(0, 3 * s);
  ctx.bezierCurveTo(-6 * s, -4 * s, -1 * s, -8 * s, 0, -3 * s);
  ctx.bezierCurveTo(1 * s, -8 * s, 6 * s, -4 * s, 0, 3 * s);
  ctx.fill();
  ctx.restore();
}

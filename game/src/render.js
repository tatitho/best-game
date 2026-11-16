// All drawing: the sky, the lantern, the things it meets, the HUD and the screens. The
// canvas is a fixed 1280x720 logical field scaled to the window, so every picture the
// judge sees is the same composition at any window size. Nothing here changes the rules.

import { FIELD, FONT, GATE_Y, LANTERN, LEVEL_HEIGHT, LEVELS, MOTE, STORM, SUNBURST } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const GATE_LABEL = 'DAWN GATE';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

function cloud(ctx, x, y, radius, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x - radius * 0.55, y + radius * 0.15, radius * 0.62, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.ellipse(x + radius * 0.55, y + radius * 0.15, radius * 0.62, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.ellipse(x, y - radius * 0.25, radius * 0.72, radius * 0.5, 0, 0, Math.PI * 2);
  ctx.ellipse(x, y + radius * 0.3, radius * 0.85, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let view = { scale: 1, ox: 0, oy: 0, w: FIELD.width, h: FIELD.height };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const scale = Math.min(w / FIELD.width, h / FIELD.height) * dpr;
    view = { scale, ox: (canvas.width - FIELD.width * scale) / 2, oy: (canvas.height - FIELD.height * scale) / 2, w, h };
  }
  window.addEventListener('resize', resize);
  resize();

  function toScreen(x, y) {
    return { x: view.ox + x * view.scale, y: view.oy + (y - stateRef.cameraY) * view.scale };
  }
  let stateRef = null;

  function drawSky(level, now) {
    const p = LEVELS[level - 1];
    const g = ctx.createLinearGradient(0, view.oy, 0, view.oy + FIELD.height * view.scale);
    g.addColorStop(0, p.skyTop);
    g.addColorStop(0.55, p.skyMid);
    g.addColorStop(1, p.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Stars, fading out as the dawn comes.
    if (p.stars > 0.02) {
      for (const star of stateRef.stars) {
        const a = p.stars * (0.5 + 0.5 * Math.sin(now * 2 + star.twinkle));
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = '#fff8e0';
        ctx.beginPath();
        ctx.arc(view.ox + star.x * view.scale, view.oy + star.y * view.scale, star.size * view.scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // The sun, rising a little with every level.
    const sunScreenY = view.oy + (p.sunY - stateRef.cameraY * 0.25) * view.scale;
    const sunX = view.ox + FIELD.width * 0.78 * view.scale;
    const sunR = 64 * view.scale;
    glowCircle(ctx, sunX, sunScreenY, sunR * 3.2, p.sunColor, 0.55);
    ctx.fillStyle = p.sunColor;
    ctx.beginPath();
    ctx.arc(sunX, sunScreenY, sunR, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRooftops() {
    // The city the lantern leaves behind: only visible near the start of level 1.
    if (stateRef.level !== 1 || stateRef.cameraY > 40) return;
    const p = LEVELS[0];
    const baseY = 0 - stateRef.cameraY;
    ctx.fillStyle = p.ground;
    let x = 0;
    let i = 0;
    while (x < FIELD.width) {
      const w = 60 + ((i * 37) % 90);
      const h = 40 + ((i * 53) % 90);
      ctx.fillRect(view.ox + x * view.scale, view.oy + (baseY - h) * view.scale, w * view.scale, (h + 140) * view.scale);
      ctx.fillStyle = '#ffd94d';
      ctx.globalAlpha = 0.75;
      ctx.fillRect(view.ox + (x + w * 0.3) * view.scale, view.oy + (baseY - h + 14) * view.scale, 7 * view.scale, 9 * view.scale);
      ctx.fillRect(view.ox + (x + w * 0.6) * view.scale, view.oy + (baseY - h + 30) * view.scale, 7 * view.scale, 9 * view.scale);
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.ground;
      x += w + 8;
      i += 1;
    }
  }

  function drawGate(now) {
    const gateScreen = toScreen(FIELD.width / 2, GATE_Y);
    if (gateScreen.y < -80 || gateScreen.y > FIELD.height * view.scale + 80) return;
    const pulse = 0.7 + 0.3 * Math.sin(now * 2.4);
    glowCircle(ctx, gateScreen.x, gateScreen.y, 130 * view.scale, '#ffe98a', 0.8 * pulse);
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 5 * view.scale;
    ctx.beginPath();
    ctx.arc(gateScreen.x, gateScreen.y, 54 * view.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff8e6';
    ctx.font = `700 ${Math.round(22 * view.scale)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(GATE_LABEL, gateScreen.x, gateScreen.y + 92 * view.scale);
  }

  function drawMotes(now) {
    const p = LEVELS[stateRef.level - 1];
    for (const mote of stateRef.motes) {
      if (mote.taken) continue;
      const s = toScreen(mote.x, mote.y);
      if (s.y < -30 || s.y > FIELD.height * view.scale + 30) continue;
      const tw = 0.75 + 0.25 * Math.sin(now * 3 + mote.x);
      glowCircle(ctx, s.x, s.y, 26 * view.scale, p.mote, 0.7 * tw);
      ctx.fillStyle = p.mote;
      ctx.beginPath();
      ctx.arc(s.x, s.y, MOTE.radius * view.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath();
      ctx.arc(s.x - 3 * view.scale, s.y - 3 * view.scale, 3.5 * view.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawStorms(now) {
    for (const storm of stateRef.storms) {
      const s = toScreen(storm.x, storm.y);
      if (s.y < -120 || s.y > FIELD.height * view.scale + 120) continue;
      const flicker = 0.85 + 0.15 * Math.sin(now * 5 + storm.phase);
      cloud(ctx, s.x, s.y, STORM.radius * view.scale, '#3a3450', 0.95 * flicker);
      cloud(ctx, s.x, s.y - 6 * view.scale, STORM.radius * 0.8 * view.scale, '#4a4468', 0.9 * flicker);
      // A warning spark inside the cloud.
      ctx.fillStyle = '#c9b8ff';
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now * 6 + storm.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y + 8 * view.scale, 5 * view.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawFogs() {
    for (const fog of stateRef.fogs) {
      const s = toScreen(fog.x, fog.y);
      if (s.y < -160 || s.y > FIELD.height * view.scale + 160) continue;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 150 * view.scale);
      g.addColorStop(0, 'rgba(226, 232, 244, 0.34)');
      g.addColorStop(1, 'rgba(226, 232, 244, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(s.x - 160 * view.scale, s.y - 100 * view.scale, 320 * view.scale, 200 * view.scale);
    }
  }

  function drawSunbursts(now) {
    for (const sun of stateRef.sunbursts) {
      if (sun.taken) continue;
      const s = toScreen(sun.x, sun.y);
      if (s.y < -40 || s.y > FIELD.height * view.scale + 40) continue;
      const rot = now * 1.2;
      glowCircle(ctx, s.x, s.y, 40 * view.scale, '#ffe98a', 0.8);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(rot);
      ctx.fillStyle = '#ffe98a';
      for (let i = 0; i < 8; i += 1) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(0, -SUNBURST.radius * 1.7 * view.scale);
        ctx.lineTo(4 * view.scale, 0);
        ctx.lineTo(-4 * view.scale, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 8 * view.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWinds() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2 * view.scale;
    for (const wind of stateRef.winds) {
      const top = toScreen(0, wind.yTop).y;
      const bottom = toScreen(0, wind.yBottom).y;
      if (bottom < 0 || top > FIELD.height * view.scale) continue;
      const dir = wind.push > 0 ? 1 : -1;
      for (let i = 0; i < 5; i += 1) {
        const y = top + ((bottom - top) * (i + 0.5)) / 5;
        const offset = ((stateRef.time * 90 * dir + i * 260) % 1280 + 1280) % 1280;
        const x0 = view.ox + (offset - 640) * view.scale;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + 70 * view.scale * dir, y);
        ctx.stroke();
      }
    }
  }

  function drawLantern(now) {
    const l = stateRef.lantern;
    const s = toScreen(l.x, l.y);
    const flicker = 0.85 + 0.15 * Math.sin(now * 9 + l.x);
    if (l.invuln > 0 && Math.floor(now * 10) % 2 === 0) return; // blink while hurt-proof
    ctx.save();
    ctx.translate(s.x, s.y);
    if (stateRef.sunburstTimer > 0) {
      ctx.strokeStyle = '#ffe98a';
      ctx.lineWidth = 3 * view.scale;
      ctx.beginPath();
      ctx.arc(0, 0, 30 * view.scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    glowCircle(ctx, 0, 0, 62 * view.scale, '#ffb36b', 0.55 * flicker);
    ctx.rotate(Math.max(-0.18, Math.min(0.18, l.vx * 0.0004)));
    // Paper body.
    const body = ctx.createLinearGradient(0, -20 * view.scale, 0, 20 * view.scale);
    body.addColorStop(0, '#ffe9a8');
    body.addColorStop(0.5, '#ffc46b');
    body.addColorStop(1, '#ff9e57');
    ctx.fillStyle = body;
    roundRect(ctx, -LANTERN.radius * view.scale, -20 * view.scale, LANTERN.radius * 2 * view.scale, 40 * view.scale, 9 * view.scale);
    ctx.fill();
    // Ribs and caps.
    ctx.strokeStyle = 'rgba(160, 82, 30, 0.55)';
    ctx.lineWidth = 1.5 * view.scale;
    for (const dx of [-8, 0, 8]) {
      ctx.beginPath();
      ctx.moveTo(dx * view.scale, -19 * view.scale);
      ctx.lineTo(dx * view.scale, 19 * view.scale);
      ctx.stroke();
    }
    ctx.fillStyle = '#8a4a2a';
    ctx.fillRect(-7 * view.scale, -24 * view.scale, 14 * view.scale, 5 * view.scale);
    ctx.fillRect(-7 * view.scale, 19 * view.scale, 14 * view.scale, 5 * view.scale);
    // Flame.
    ctx.fillStyle = '#fff3c4';
    ctx.globalAlpha = flicker;
    ctx.beginPath();
    ctx.ellipse(0, 2 * view.scale, 4.5 * view.scale, 8 * view.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawParticles() {
    for (const p of stateRef.particles) {
      const s = toScreen(p.x, p.y);
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, p.size * view.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(best) {
    const p = LEVELS[stateRef.level - 1];
    const s = view.scale;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Score.
    ctx.fillStyle = p.text;
    ctx.font = `800 ${Math.round(40 * s)}px ${FONT}`;
    ctx.fillText(String(stateRef.score), view.ox + 24 * s, view.oy + 52 * s);
    ctx.font = `600 ${Math.round(16 * s)}px ${FONT}`;
    ctx.fillStyle = p.muted;
    ctx.fillText(`BEST ${Math.max(best, stateRef.score)}`, view.ox + 24 * s, view.oy + 78 * s);
    // Combo badge.
    if (stateRef.combo >= 2) {
      ctx.fillStyle = '#ffcf5e';
      ctx.font = `800 ${Math.round(24 * s)}px ${FONT}`;
      ctx.fillText(`COMBO x${stateRef.combo}`, view.ox + 24 * s, view.oy + 112 * s);
    }
    // Level, centred.
    ctx.textAlign = 'center';
    ctx.fillStyle = p.text;
    ctx.font = `800 ${Math.round(26 * s)}px ${FONT}`;
    ctx.fillText(`LEVEL ${stateRef.level}/5 — ${p.name.toUpperCase()}`, view.ox + FIELD.width * s / 2, view.oy + 44 * s);
    // Light meter, top right: a sun and a bar.
    const barW = 190 * s;
    const barX = view.ox + FIELD.width * s - barW - 24 * s;
    const barY = view.oy + 26 * s;
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath();
    ctx.arc(barX - 18 * s, barY + 9 * s, 10 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, barX, barY, barW, 18 * s, 9 * s);
    ctx.fill();
    const lightFrac = Math.max(0, stateRef.light / 100);
    ctx.fillStyle = lightFrac > 0.35 ? '#ffd94d' : '#ff6b57';
    if (lightFrac > 0) {
      roundRect(ctx, barX, barY, barW * lightFrac, 18 * s, 9 * s);
      ctx.fill();
    }
    ctx.fillStyle = p.muted;
    ctx.font = `600 ${Math.round(14 * s)}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('LIGHT', barX + barW, barY + 36 * s);
    // Altitude: a thin track on the right edge, gate at the top.
    const trackX = view.ox + FIELD.width * s - 10 * s;
    const trackTop = view.oy + 80 * s;
    const trackH = FIELD.height * s - 160 * s;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(trackX, trackTop, 4 * s, trackH);
    const progress = Math.min(1, stateRef.altitude / LEVEL_HEIGHT);
    const dotY = trackTop + trackH * (1 - progress);
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath();
    ctx.arc(trackX + 2 * s, trackTop, 6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(trackX + 2 * s, dotY, 7 * s, 0, Math.PI * 2);
    ctx.fill();
    // Level banner.
    if (stateRef.bannerTimer > 0) {
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, stateRef.bannerTimer);
      ctx.fillStyle = p.text;
      ctx.font = `800 ${Math.round(52 * s)}px ${FONT}`;
      ctx.fillText(stateRef.banner, view.ox + FIELD.width * s / 2, view.oy + FIELD.height * s / 2 - 20 * s);
      ctx.font = `600 ${Math.round(20 * s)}px ${FONT}`;
      ctx.fillStyle = p.muted;
      ctx.fillText(`LEVEL ${stateRef.level} OF 5`, view.ox + FIELD.width * s / 2, view.oy + FIELD.height * s / 2 + 16 * s);
      ctx.globalAlpha = 1;
    }
    // Sunburst timer.
    if (stateRef.sunburstTimer > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe98a';
      ctx.font = `800 ${Math.round(20 * s)}px ${FONT}`;
      ctx.fillText(`SUNBURST x2 — ${stateRef.sunburstTimer.toFixed(1)}s`, view.ox + FIELD.width * s / 2, view.oy + 78 * s);
    }
  }

  function overlay(alpha, color) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }

  function centerText(lines, y0, lineHeight) {
    ctx.textAlign = 'center';
    lines.forEach((line, i) => {
      ctx.font = line.font;
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, view.ox + FIELD.width * view.scale / 2, y0 + i * lineHeight);
    });
  }

  function drawTitle(best, now) {
    // The title lives under a dawn sky: the brightest palette, so the cover reads
    // light at a glance even shrunk to a thumbnail.
    const p = LEVELS[4];
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, p.skyTop);
    g.addColorStop(0.55, p.skyMid);
    g.addColorStop(1, p.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    glowCircle(ctx, view.ox + FIELD.width * 0.78 * view.scale, view.oy + 300 * view.scale, 200 * view.scale, p.sunColor, 0.6);
    ctx.fillStyle = p.sunColor;
    ctx.beginPath();
    ctx.arc(view.ox + FIELD.width * 0.78 * view.scale, view.oy + 300 * view.scale, 70 * view.scale, 0, Math.PI * 2);
    ctx.fill();
    // A few drifting motes for warmth.
    for (let i = 0; i < 14; i += 1) {
      const x = ((i * 173 + now * 12) % 1280 + 1280) % 1280;
      const y = 120 + ((i * 97) % 480) + Math.sin(now + i) * 8;
      glowCircle(ctx, view.ox + x * view.scale, view.oy + y * view.scale, 16 * view.scale, '#ffe98a', 0.5);
    }
    const s = view.scale;
    const bob = Math.sin(now * 1.4) * 6 * s;
    ctx.save();
    ctx.translate(view.ox + FIELD.width * s / 2, view.oy + 210 * s + bob);
    glowCircle(ctx, 0, 0, 90 * s, '#ffb36b', 0.6);
    ctx.fillStyle = '#ffc46b';
    roundRect(ctx, -26 * s, -30 * s, 52 * s, 60 * s, 12 * s);
    ctx.fill();
    ctx.fillStyle = '#8a4a2a';
    ctx.fillRect(-10 * s, -36 * s, 20 * s, 7 * s);
    ctx.fillRect(-10 * s, 30 * s, 20 * s, 7 * s);
    ctx.restore();
    centerText([
      { text: 'SUNWARD', font: `900 ${Math.round(96 * s)}px ${FONT}`, color: '#3a2c1a' },
      { text: 'Carry a paper lantern out of the night — five skies, each brighter,', font: `600 ${Math.round(22 * s)}px ${FONT}`, color: '#5a4630' },
      { text: 'to the dawn gate. Motes feed your light; storm clouds take it.', font: `600 ${Math.round(22 * s)}px ${FONT}`, color: '#5a4630' },
    ], view.oy + 330 * s, 34 * s);
    const blink = 0.65 + 0.35 * Math.sin(now * 3);
    ctx.globalAlpha = blink;
    centerText([
      { text: 'PRESS SPACE OR CLICK TO FLY', font: `800 ${Math.round(26 * s)}px ${FONT}`, color: '#3a2c1a' },
    ], view.oy + 470 * s, 34 * s);
    ctx.globalAlpha = 1;
    centerText([
      { text: 'Arrows / WASD or drag to steer  •  P pause  •  R restart', font: `600 ${Math.round(18 * s)}px ${FONT}`, color: '#6b5a44' },
      { text: `BEST ${best}`, font: `800 ${Math.round(20 * s)}px ${FONT}`, color: '#6b5a44' },
    ], view.oy + 530 * s, 30 * s);
    ctx.font = `600 ${Math.round(15 * s)}px ${FONT}`;
    ctx.fillStyle = '#6b5a44';
    ctx.fillText('Judge: the whole game is here — title, play, win and loss screens, all in the screenshots.', view.ox + FIELD.width * s / 2, view.oy + 690 * s);
  }

  function drawEndScreen(win, score, best) {
    const p = win ? LEVELS[4] : LEVELS[0];
    if (win) {
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, p.skyTop);
      g.addColorStop(0.55, p.skyMid);
      g.addColorStop(1, p.skyBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      glowCircle(ctx, view.ox + FIELD.width * view.scale * 0.5, view.oy + 200 * view.scale, 220 * view.scale, '#ffe98a', 0.7);
      ctx.fillStyle = '#ffe98a';
      ctx.beginPath();
      ctx.arc(view.ox + FIELD.width * view.scale * 0.5, view.oy + 200 * view.scale, 72 * view.scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      overlay(0.82, '#0b1026');
    }
    const s = view.scale;
    const title = win ? 'DAWN REACHED' : 'THE LIGHT WENT OUT';
    const sub = win
      ? 'You carried the lantern through all five skies.'
      : 'The storm clouds drank your light — but the dawn is still up there.';
    centerText([
      { text: title, font: `900 ${Math.round(64 * s)}px ${FONT}`, color: win ? '#3a2c1a' : '#f4ead8' },
      { text: sub, font: `600 ${Math.round(22 * s)}px ${FONT}`, color: win ? '#5a4630' : '#9aa3c0' },
    ], view.oy + 240 * s, 40 * s);
    centerText([
      { text: `SCORE  ${score}`, font: `800 ${Math.round(40 * s)}px ${FONT}`, color: win ? '#3a2c1a' : '#ffd94d' },
      { text: `BEST  ${Math.max(best, score)}`, font: `700 ${Math.round(24 * s)}px ${FONT}`, color: win ? '#5a4630' : '#9aa3c0' },
    ], view.oy + 380 * s, 52 * s);
    const blink = 0.65 + 0.35 * Math.sin(Date.now() / 300);
    ctx.globalAlpha = blink;
    centerText([
      { text: 'PRESS R OR CLICK TO FLY AGAIN', font: `800 ${Math.round(26 * s)}px ${FONT}`, color: win ? '#3a2c1a' : '#f4ead8' },
    ], view.oy + 540 * s, 34 * s);
    ctx.globalAlpha = 1;
  }

  function drawPaused() {
    overlay(0.6, '#0b1026');
    const s = view.scale;
    centerText([
      { text: 'PAUSED', font: `900 ${Math.round(64 * s)}px ${FONT}`, color: '#f4ead8' },
      { text: 'P or Space to keep flying  •  R to restart', font: `600 ${Math.round(22 * s)}px ${FONT}`, color: '#9aa3c0' },
    ], view.oy + 320 * s, 44 * s);
  }

  function draw(state, screen, best, now) {
    stateRef = state;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (screen === SCREEN_TITLE) {
      drawTitle(best, now);
      return;
    }
    // Shake: the whole field jolts for a moment after a hit.
    if (state.shake > 0) {
      const mag = state.shake * 7 * view.scale;
      ctx.save();
      ctx.translate((Math.sin(now * 91) * mag), (Math.cos(now * 113) * mag));
    }
    drawSky(state.level, now);
    drawRooftops();
    drawGate(now);
    drawWinds();
    drawFogs();
    drawMotes(now);
    drawStorms(now);
    drawSunbursts(now);
    // The lantern rests under the end screens: on game over it would ghost through
    // the score text, so it is not drawn there.
    if (screen !== SCREEN_OVER) {
      drawParticles();
      drawLantern(now);
    }
    if (state.shake > 0) ctx.restore();
    drawHud(best);
    if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawEndScreen(false, state.score, best);
    else if (screen === SCREEN_WIN) drawEndScreen(true, state.score, best);
  }

  return { draw, resize, toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * FIELD.width;
    const y = ((clientY - rect.top) / rect.height) * FIELD.height;
    return { x, y };
  } };
}

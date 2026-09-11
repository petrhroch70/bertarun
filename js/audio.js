// ============================================================
// BERTARUNE — procedural chiptune audio engine (Web Audio API).
// All music/SFX is synthesized at runtime — no external audio files,
// original short loops written in the style of dark-synth / bright-synth
// RPG battle themes, not transcriptions of any copyrighted track.
// ============================================================

const Audio2 = (function () {
  let ctx = null;
  let muted = false;
  let masterGain = null;
  let currentTrack = null;
  let schedulerTimer = null;
  let nextNoteTime = 0;
  let step = 0;
  const LOOKAHEAD = 0.12;
  const INTERVAL_MS = 25;

  function noteFreq(semitonesFromA4) {
    return 440 * Math.pow(2, semitonesFromA4 / 12);
  }

  // Scale degrees (semitone offsets from A4) for a few simple keys.
  // 'd' = D minor-ish (dark), 'c' = C major-ish (light)
  const SCALES = {
    dark: [-9, -7, -5, -4, -2, 0, 1, 3, 5, 7], // D, E, F, F#/G-ish minor flavor kept simple
    light: [-9, -7, -5, -4, -2, 0, 2, 3, 5, 7],
    boss: [-9, -8, -5, -4, -1, 0, 3, 4, 7, 8],
  };

  const TRACKS = {
    title: { tempo: 100, scale: 'light', bass: [0, null, -3, null, -5, null, -3, null], lead: [4, 7, 9, 7, 4, 2, 0, null], wave: 'triangle', bassWave: 'sine' },
    light: { tempo: 112, scale: 'light', bass: [0, 0, -3, -3, -5, -5, -3, -3], lead: [0, null, 4, null, 7, null, 4, null, 2, null, 4, null, 0, null, null, null], wave: 'square', bassWave: 'sine' },
    tense: { tempo: 96, scale: 'dark', bass: [0, null, 1, null, 0, null, -2, null], lead: [0, 1, 0, -2, 0, 1, 3, 1], wave: 'sawtooth', bassWave: 'sine' },
    dark: { tempo: 128, scale: 'dark', bass: [0, 0, 5, 5, 3, 3, -2, -2], lead: [0, 3, 5, 7, 5, 3, 7, 5, 0, 3, 5, 8, 7, 5, 3, 1], wave: 'square', bassWave: 'sawtooth' },
    dark_calm: { tempo: 90, scale: 'dark', bass: [0, null, null, null, 3, null, null, null], lead: [0, 3, 5, 3, 0, null, 3, null], wave: 'triangle', bassWave: 'sine' },
    dark_tense: { tempo: 132, scale: 'dark', bass: [0, 0, -2, -2, 1, 1, -4, -4], lead: [0, 1, 3, 4, 5, 4, 3, 1, 0, -2, 0, 1, 3, 5, 7, 5], wave: 'sawtooth', bassWave: 'square' },
    battle: { tempo: 150, scale: 'dark', bass: [0, 0, 0, 0, 5, 5, 3, 3], lead: [0, 3, 7, 3, 0, 5, 3, 0, 7, 5, 3, 5, 8, 7, 5, 3], wave: 'square', bassWave: 'sawtooth' },
    boss: { tempo: 168, scale: 'boss', bass: [0, 0, 3, 3, -1, -1, 4, 4], lead: [0, 4, 7, 8, 7, 4, 0, -1, 3, 7, 8, 11, 8, 7, 4, 3], wave: 'sawtooth', bassWave: 'square' },
  };

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.gain ? null : ctx.createGain();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.22;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function playOsc(freq, startTime, dur, wave, gainVal) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    g.gain.value = 0;
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, startTime + dur);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
  }

  function scheduleStep(track) {
    const beatDur = 60 / track.tempo / 2; // 8th notes
    const scale = SCALES[track.scale];
    const bIdx = step % track.bass.length;
    const lIdx = step % track.lead.length;
    const bDeg = track.bass[bIdx];
    const lDeg = track.lead[lIdx];
    if (bDeg !== null && bDeg !== undefined) {
      const freq = noteFreq(scale[((bDeg % scale.length) + scale.length) % scale.length] - 12);
      playOsc(freq, nextNoteTime, beatDur * 0.95, track.bassWave, 0.5);
    }
    if (lDeg !== null && lDeg !== undefined) {
      const freq = noteFreq(scale[((lDeg % scale.length) + scale.length) % scale.length]);
      playOsc(freq, nextNoteTime, beatDur * 0.85, track.wave, 0.35);
    }
    step++;
    nextNoteTime += beatDur;
  }

  function schedulerLoop() {
    if (!currentTrack) return;
    while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
      scheduleStep(currentTrack);
    }
  }

  function playTrack(name) {
    ensureCtx();
    const t = TRACKS[name];
    if (!t) return;
    if (currentTrack === t) return;
    currentTrack = t;
    step = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = setInterval(schedulerLoop, INTERVAL_MS);
  }

  function stopTrack() {
    currentTrack = null;
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  function sfx(name) {
    ensureCtx();
    const t = ctx.currentTime;
    switch (name) {
      case 'select':
        playOsc(660, t, 0.06, 'square', 0.3);
        break;
      case 'confirm':
        playOsc(880, t, 0.05, 'square', 0.3);
        playOsc(1108, t + 0.05, 0.08, 'square', 0.25);
        break;
      case 'cancel':
        playOsc(330, t, 0.08, 'square', 0.25);
        break;
      case 'hit':
        playOsc(120, t, 0.15, 'sawtooth', 0.4);
        break;
      case 'hurt':
        playOsc(90, t, 0.2, 'sawtooth', 0.45);
        playOsc(70, t + 0.03, 0.2, 'square', 0.3);
        break;
      case 'heal':
        playOsc(523, t, 0.1, 'sine', 0.3);
        playOsc(659, t + 0.08, 0.1, 'sine', 0.3);
        playOsc(784, t + 0.16, 0.15, 'sine', 0.3);
        break;
      case 'spare':
        playOsc(523, t, 0.1, 'triangle', 0.3);
        playOsc(784, t + 0.1, 0.1, 'triangle', 0.3);
        playOsc(1047, t + 0.2, 0.2, 'triangle', 0.3);
        break;
      case 'text':
        playOsc(300 + Math.random() * 60, t, 0.03, 'square', 0.12);
        break;
      case 'step':
        playOsc(150, t, 0.03, 'triangle', 0.08);
        break;
    }
  }

  function setMuted(v) {
    muted = v;
    ensureCtx();
    masterGain.gain.value = muted ? 0 : 0.22;
  }
  function toggleMute() { setMuted(!muted); return muted; }
  function isMuted() { return muted; }

  return { playTrack, stopTrack, sfx, toggleMute, isMuted, ensureCtx };
})();

/* Kredithai – kleine synthetische Töne (WebAudio, keine Dateien). Leise und abschaltbar. */
(function () {
  'use strict';
  let ctx = null, haupt = null, an = true;
  try { an = localStorage.getItem('kredithai.ton') !== 'aus'; } catch (_) { /* egal */ }
  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    ctx = new A(); haupt = ctx.createGain(); haupt.gain.value = 0.32; haupt.connect(ctx.destination);
  }
  function ton(freq, dauer, o = {}) {
    if (!ctx || !an) return;
    const t = ctx.currentTime + (o.nach || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.typ || 'sine'; osc.frequency.setValueAtTime(freq, t);
    if (o.bis) osc.frequency.exponentialRampToValueAtTime(o.bis, t + dauer);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.laut || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    osc.connect(g); g.connect(haupt); osc.start(t); osc.stop(t + dauer + 0.02);
  }
  let rauschPuffer = null;
  function rauschen(dauer, o = {}) {
    if (!ctx || !an) return;
    if (!rauschPuffer) { rauschPuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = rauschPuffer.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = ctx.currentTime + (o.nach || 0);
    const q = ctx.createBufferSource(); q.buffer = rauschPuffer;
    const f = ctx.createBiquadFilter(); f.type = o.filter || 'lowpass'; f.frequency.value = o.freq || 1200;
    const g = ctx.createGain(); g.gain.setValueAtTime(o.laut || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    q.connect(f); f.connect(g); g.connect(haupt); q.start(t); q.stop(t + dauer + 0.02);
  }
  const TOENE = {
    klick:() => ton(900, 0.04, { typ:'square', laut:0.08 }),
    chip:() => { ton(2200, 0.03, { typ:'triangle', laut:0.12 }); ton(1700, 0.04, { typ:'triangle', laut:0.1, nach:0.03 }); },
    karte:() => rauschen(0.06, { filter:'highpass', freq:2500, laut:0.18 }),
    rubbel:() => rauschen(0.05, { filter:'bandpass', freq:3000, laut:0.1 }),
    drehen:() => { for (let i = 0; i < 14; i++) ton(1400, 0.02, { typ:'square', laut:0.05, nach:i * i * 0.012 }); },
    wurf:() => { ton(1200, 0.15, { typ:'triangle', bis:2400, laut:0.12 }); ton(1800, 0.1, { typ:'triangle', laut:0.1, nach:1.2 }); },
    wuerfel:() => { for (let i = 0; i < 5; i++) rauschen(0.04, { filter:'bandpass', freq:1800 + i * 200, laut:0.15, nach:i * 0.18 }); },
    plopp:() => ton(300, 0.08, { typ:'sine', bis:150, laut:0.15 }),
    treffer:() => ton(1320, 0.12, { typ:'triangle', laut:0.15 }),
    sieg:() => [523, 659, 784].forEach((f, i) => ton(f, 0.18, { typ:'triangle', laut:0.2, nach:i * 0.08 })),
    jackpot:() => { [523, 659, 784, 1046, 1318].forEach((f, i) => ton(f, 0.25, { typ:'square', laut:0.12, nach:i * 0.09 })); for (let i = 0; i < 10; i++) ton(2000 + Math.random() * 2000, 0.08, { typ:'sine', laut:0.06, nach:0.45 + i * 0.05 }); },
    verlust:() => { ton(330, 0.22, { typ:'sawtooth', bis:220, laut:0.08 }); },
    bumm:() => { rauschen(0.5, { freq:400, laut:0.4 }); ton(80, 0.4, { typ:'sine', bis:40, laut:0.3 }); },
    kasse:() => { ton(1568, 0.3, { typ:'triangle', laut:0.2 }); ton(2093, 0.4, { typ:'triangle', laut:0.2, nach:0.12 }); },
    mahnung:() => { ton(110, 0.6, { typ:'sawtooth', laut:0.15 }); ton(104, 0.8, { typ:'sawtooth', laut:0.12, nach:0.35 }); },
    alarm:() => { ton(880, 0.1, { typ:'square', laut:0.08 }); ton(880, 0.1, { typ:'square', laut:0.08, nach:0.2 }); },
    tag:() => [392, 523, 659, 784].forEach((f, i) => ton(f, 0.3, { typ:'triangle', laut:0.15, nach:i * 0.12 })),
    item:() => { for (let i = 0; i < 6; i++) ton(1200 + i * 220, 0.08, { typ:'sine', laut:0.1, nach:i * 0.04 }); },
    aufgabe:() => [784, 988, 1175, 1568].forEach((f, i) => ton(f, 0.15, { typ:'triangle', laut:0.15, nach:i * 0.07 })),
    nachricht:() => ton(1046, 0.08, { typ:'sine', laut:0.1 })
  };
  window.KHTon = {
    start,
    spielen(n) { try { start(); TOENE[n] && TOENE[n](); } catch (_) { /* egal */ } },
    get an() { return an; },
    set an(v) { an = !!v; try { localStorage.setItem('kredithai.ton', an ? 'an' : 'aus'); } catch (_) { /* egal */ } }
  };
})();

/* Kredithai – 3D-Casino (three.js r128): Raum je Etage, Tische, Figuren, Anzeigetafel, Effekte.
   Koordinaten wie in logik.js: x links/rechts, z vorne/hinten (Norden = -z, dort stehen Don Flosse und der Aufzug).
   Tische zeigen mit der Spielerseite nach Norden (-z), der Croupier steht im Süden (+z). */
(function () {
  'use strict';
  const T = THREE, F = KHF, L = KHLogik, S = KHSpiele;
  const { mat, geo, box, zyl, kugel, kegel } = F;

  /* ---------- Etagen-Themen ---------- */
  const THEMEN = [
    { id:'spelunke', boden:'holz', wand:0x4a3326, wand2:0x5e3b26, decke:0x1a120c, nebel:0x22160e, nebelNah:14, nebelFern:46, amb:0x6a5040, hemi:[0xffd9a0, 0x2a1a10, 0.55], licht:0xffb060, licht2:0xff7a3d, akzent:0xd8a040, neon:[0xff6a3d, 0xffc04d], filz:0x1f6b3a, holz:0x5b3517, automat:0x8a2a1a },
    { id:'neon', boden:'gitter', wand:0x15111f, wand2:0x221a33, decke:0x09070f, nebel:0x170c26, nebelNah:12, nebelFern:44, amb:0x403058, hemi:[0xb090ff, 0x100818, 0.5], licht:0xd070ff, licht2:0x3dfcff, akzent:0xff3df2, neon:[0xff3df2, 0x3dfcff, 0xffe23d], filz:0x23246b, holz:0x241a33, automat:0x2a1450 },
    { id:'koralle', boden:'welle', wand:0x0f3b4a, wand2:0x0b2e3b, decke:0x071d26, nebel:0x0a2a36, nebelNah:12, nebelFern:44, amb:0x3a6a78, hemi:[0x9ff3ff, 0x062028, 0.55], licht:0x7fe3ff, licht2:0xff9a7a, akzent:0x4dfff0, neon:[0x4dfff0, 0xff8a65, 0xb388ff], filz:0x0f6b6b, holz:0x2a4a50, automat:0x0d5060 },
    { id:'penthouse', boden:'marmor', wand:0xcfc6b6, wand2:0xb8ab93, decke:0xc9bfae, nebel:0x1a1f2e, nebelNah:20, nebelFern:60, amb:0x433e35, hemi:[0xfff2d8, 0x302a1e, 0.3], licht:0xfff0d0, licht2:0xffd27a, akzent:0xe8b923, neon:[0xe8b923, 0xffffff], filz:0x6b1f2b, holz:0x2b1a10, automat:0x1a1a1a }
  ];

  function leinwand(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function bodenTextur(art) {
    const [c, x] = leinwand(512, 512);
    if (art === 'holz') {
      for (let i = 0; i < 16; i++) {
        x.fillStyle = i % 2 ? '#4f3220' : '#5c3a24'; x.fillRect(0, i * 32, 512, 32);
        x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, i * 32, 512, 2);
        const off = (i * 137) % 512; x.fillRect(off, i * 32, 2, 32); x.fillRect((off + 256) % 512, i * 32, 2, 32);
        x.strokeStyle = 'rgba(30,15,5,.25)'; for (let k = 0; k < 4; k++) { x.beginPath(); const y = i * 32 + 6 + k * 7; x.moveTo(0, y); x.bezierCurveTo(128, y + 3, 384, y - 3, 512, y); x.stroke(); }
      }
    } else if (art === 'gitter') {
      x.fillStyle = '#0c0a14'; x.fillRect(0, 0, 512, 512);
      x.strokeStyle = 'rgba(255,61,242,.35)'; x.lineWidth = 3;
      for (let i = 0; i <= 512; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
      x.strokeStyle = 'rgba(61,252,255,.18)'; x.lineWidth = 1;
      for (let i = 32; i < 512; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
    } else if (art === 'welle') {
      x.fillStyle = '#0e4a55'; x.fillRect(0, 0, 512, 512);
      for (let r = 0; r < 12; r++) for (let k = 0; k < 8; k++) {
        const cx = k * 64 + (r % 2) * 32, cy = r * 44;
        x.strokeStyle = r % 3 ? 'rgba(127,227,255,.22)' : 'rgba(255,154,122,.25)'; x.lineWidth = 4;
        x.beginPath(); x.arc(cx, cy, 26, Math.PI * 0.1, Math.PI * 0.9); x.stroke();
        x.beginPath(); x.arc(cx, cy, 14, Math.PI * 0.1, Math.PI * 0.9); x.stroke();
      }
    } else {
      for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) {
        x.fillStyle = (i + k) % 2 ? '#cfc6b5' : '#8f8370'; x.fillRect(i * 64, k * 64, 64, 64);
        x.strokeStyle = 'rgba(120,100,80,.12)'; x.lineWidth = 1.5;
        for (let a = 0; a < 3; a++) { x.beginPath(); x.moveTo(i * 64 + Math.random() * 64, k * 64); x.bezierCurveTo(i * 64 + Math.random() * 64, k * 64 + 20, i * 64 + Math.random() * 64, k * 64 + 44, i * 64 + Math.random() * 64, k * 64 + 64); x.stroke(); }
      }
      x.strokeStyle = '#c9a227'; x.lineWidth = 3;
      for (let i = 0; i <= 512; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
    return t;
  }
  // Leuchtender Schein (für Neon, Lampen, heiße Tische)
  let scheinTex = null;
  function schein(farbe, gr) {
    if (!scheinTex) {
      const [c, x] = leinwand(64, 64);
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      scheinTex = new T.CanvasTexture(c);
    }
    const s = new T.Sprite(new T.SpriteMaterial({ map:scheinTex, color:farbe, transparent:true, blending:T.AdditiveBlending, depthWrite:false }));
    s.scale.set(gr, gr, 1);
    return s;
  }
  const leucht = (farbe, st = 1) => new T.MeshBasicMaterial({ color:new T.Color(farbe).multiplyScalar(st) });

  /* ---------- Schilder ---------- */
  function schild(text, o = {}) {
    const [c, x] = leinwand(o.w || 512, o.h || 128);
    x.fillStyle = o.grund || 'rgba(0,0,0,0)'; x.fillRect(0, 0, c.width, c.height);
    x.font = `800 ${o.gr || 80}px "Barlow Semi Condensed", system-ui, sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (o.glow) { x.shadowColor = o.glow; x.shadowBlur = 24; }
    x.fillStyle = o.farbe || '#fff'; x.fillText(text, c.width / 2, c.height / 2 + 4);
    x.shadowBlur = 0;
    const tex = new T.CanvasTexture(c);
    const m = new T.Mesh(new T.PlaneGeometry(o.breite || 2, (o.breite || 2) * c.height / c.width), new T.MeshBasicMaterial({ map:tex, transparent:true, side:T.DoubleSide }));
    return m;
  }

  /* ---------- Spielkarten-Textur ---------- */
  const FARB = ['♠', '♥', '♦', '♣'], RANG = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'D', 'K', 'A'];
  function karteMalen(x, k, a, b, w, h) {
    x.fillStyle = '#fff'; F.rundRechteck(x, a, b, w, h, w * 0.1); x.fill();
    x.strokeStyle = '#999'; x.lineWidth = 2; x.stroke();
    if (k == null) { x.fillStyle = '#b71c1c'; F.rundRechteck(x, a + 6, b + 6, w - 12, h - 12, w * 0.08); x.fill(); x.fillStyle = 'rgba(255,255,255,.3)'; x.font = `700 ${w * 0.5}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🦈', a + w / 2, b + h / 2); return; }
    const r = k % 13, f = (k / 13) | 0;
    x.fillStyle = f === 1 || f === 2 ? '#d32f2f' : '#1a1a1a';
    x.font = `800 ${w * 0.42}px "Barlow Semi Condensed", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(RANG[r], a + w / 2, b + h * 0.36);
    x.font = `${w * 0.42}px sans-serif`; x.fillText(FARB[f], a + w / 2, b + h * 0.7);
  }

  /* ================= Tisch-Modelle ================= */
  // Grundbausteine
  function filzTisch(th, form, filz, w = 2.6, d = 1.5) {
    const g = new T.Group();
    const h = 0.86;
    let platte, rand;
    const filzM = new T.MeshStandardMaterial({ map:KHGlanz.filzTextur(filz), roughness:0.95 });
    const leder = new T.MeshStandardMaterial({ color:0x1c120d, roughness:0.38, metalness:0.05 });
    const goldM = new T.MeshStandardMaterial({ color:0xd4af37, roughness:0.25, metalness:1 });
    if (form === 'halb') {
      platte = new T.Mesh(new T.CylinderGeometry(w / 2, w / 2, 0.06, 48, 1, false, Math.PI / 2, Math.PI), filzM);
      rand = new T.Mesh(new T.CylinderGeometry(w / 2 + 0.1, w / 2 + 0.1, 0.1, 32, 1, false, Math.PI / 2, Math.PI), mat(th.holz));
      platte.rotation.y = Math.PI; rand.rotation.y = Math.PI;
      platte.position.set(0, h, 0.4); rand.position.set(0, h - 0.03, 0.4);
      const polster = new T.Mesh(new T.TorusGeometry(w / 2 + 0.04, 0.065, 14, 48, Math.PI), leder); polster.rotation.x = Math.PI / 2; polster.position.set(0, h + 0.03, 0.4); g.add(polster);
      const ring = new T.Mesh(new T.TorusGeometry(w / 2 + 0.11, 0.015, 8, 48, Math.PI), goldM); ring.rotation.x = Math.PI / 2; ring.position.set(0, h - 0.035, 0.4); g.add(ring);
    } else {
      platte = new T.Mesh(geo('CylinderGeometry', 1, 1, 0.06, 48), filzM);
      rand = new T.Mesh(geo('CylinderGeometry', 1, 1, 0.1, 32), mat(th.holz));
      platte.scale.set(w / 2, 1, d / 2); rand.scale.set(w / 2 + 0.1, 1, d / 2 + 0.1);
      platte.position.y = h; rand.position.y = h - 0.03;
      const polster = new T.Mesh(geo('TorusGeometry', 1, 0.065, 14, 64), leder); polster.rotation.x = Math.PI / 2; polster.scale.set(w / 2 + 0.04, d / 2 + 0.04, 1); polster.position.y = h + 0.03; g.add(polster);
      const ring = new T.Mesh(geo('TorusGeometry', 1, 0.015, 8, 64), goldM); ring.rotation.x = Math.PI / 2; ring.scale.set(w / 2 + 0.11, d / 2 + 0.11, 1); ring.position.y = h - 0.035; g.add(ring);
    }
    g.add(rand, platte);
    g.add(zyl(0.22, 0.34, h - 0.05, th.holz, 0, (h - 0.05) / 2, form === 'halb' ? 0.1 : 0, 24));
    const fuss = new T.Mesh(geo('CylinderGeometry', 0.5, 0.55, 0.06, 32), goldM); fuss.position.set(0, 0.03, form === 'halb' ? 0.1 : 0); g.add(fuss);
    g.hoehe = h;
    return g;
  }
  function automat(th, farbe, hoch = 1.75) {
    const g = new T.Group();
    g.add(box(0.95, hoch, 0.75, farbe, 0, hoch / 2, 0));
    g.add(box(1.0, 0.1, 0.8, th.akzent, 0, hoch, 0));
    g.add(box(0.9, 0.08, 0.35, th.akzent, 0, 0.92, -0.45));    // Ablage vorne
    return g;
  }
  function chips(n, x, y, z) {
    const g = new T.Group();
    const f = [0xd32f2f, 0x1976d2, 0x388e3c, 0x111111, 0xfbc02d];
    for (let i = 0; i < n; i++) { const c = zyl(0.06, 0.06, 0.025, f[i % 5], x + (i % 3) * 0.14, y + Math.floor(i / 3) * 0.026, z, 12); g.add(c); }
    return g;
  }

  const MODELLE = {};

  MODELLE.roulette = (th, n) => {
    const g = filzTisch(th, 'oval', th.filz, 2.9, 1.6);
    // Spielfeld aufgemalt
    const [c, x] = leinwand(512, 256);
    x.fillStyle = '#0000'; x.fillRect(0, 0, 512, 256);
    x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 3;
    for (let i = 0; i < 12; i++) for (let k = 0; k < 3; k++) {
      const z = i * 3 + (3 - k);
      x.fillStyle = S.ROT.has(z) ? '#c62828' : '#1a1a1a';
      x.fillRect(60 + i * 34, 30 + k * 50, 32, 48);
      x.fillStyle = '#fff'; x.font = '700 20px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(z, 76 + i * 34, 54 + k * 50);
    }
    x.fillStyle = '#2e7d32'; x.fillRect(20, 30, 38, 148); x.fillStyle = '#fff'; x.fillText('0', 39, 104);
    const feld = new T.Mesh(new T.PlaneGeometry(1.7, 0.85), new T.MeshBasicMaterial({ map:new T.CanvasTexture(c), transparent:true }));
    feld.rotation.set(-Math.PI / 2, 0, Math.PI); feld.position.set(-0.35, g.hoehe + 0.035, 0); g.add(feld);   // Schrift zur Spielerseite (-z) lesbar
    // Kessel
    const kessel = new T.Group(); kessel.position.set(0.95, g.hoehe + 0.05, 0);
    kessel.add(zyl(0.46, 0.5, 0.14, th.holz, 0, 0.02, 0, 24));
    const [c2, x2] = leinwand(256, 256);
    const nKessel = S.KESSEL.length;
    for (let i = 0; i < nKessel; i++) {
      const zz = S.KESSEL[i];
      x2.beginPath(); x2.moveTo(128, 128); x2.arc(128, 128, 126, (i / nKessel) * Math.PI * 2, ((i + 1) / nKessel) * Math.PI * 2); x2.closePath();
      x2.fillStyle = zz === 0 ? '#2e7d32' : S.ROT.has(zz) ? '#c62828' : '#151515'; x2.fill();
    }
    x2.fillStyle = '#6d4c22'; x2.beginPath(); x2.arc(128, 128, 70, 0, Math.PI * 2); x2.fill();
    const scheibe = new T.Group();
    const platte = new T.Mesh(new T.CircleGeometry(0.42, 37), new T.MeshLambertMaterial({ map:new T.CanvasTexture(c2) }));
    platte.rotation.x = -Math.PI / 2; platte.position.y = 0.095; scheibe.add(platte);
    scheibe.add(kegel(0.08, 0.14, th.akzent, 0, 0.16, 0, 8));
    kessel.add(scheibe);
    const kugelM = kugel(0.025, 0xffffff, 0.36, 0.12, 0, 8); kessel.add(kugelM);
    g.add(kessel);
    g.add(chips(7, -0.9, g.hoehe + 0.04, 0.45));
    const cr = F.croupier(n); cr.position.set(0.2, 0, 1.25); cr.rotation.y = Math.PI; g.add(cr); g.croupier = cr;
    let dreh = null, winkel = 0;
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      if (s && s.zahl != null && s.nr !== g._nr) {
        g._nr = s.nr;
        if (info.frisch) { const idx = S.KESSEL.indexOf(s.zahl); dreh = { t:0, dauer:3.5, w0:winkel, w1:winkel + 9 + Math.random() * 2, b0:Math.random() * 6, idx }; }
      }
      if (dreh) {
        dreh.t += dt;
        const f = Math.min(1, dreh.t / dreh.dauer), e = 1 - Math.pow(1 - f, 3);
        winkel = dreh.w0 + (dreh.w1 - dreh.w0) * e;
        const tasche = -(dreh.idx + 0.5) / nKessel * Math.PI * 2;
        const b = dreh.b0 * (1 - e) * -14 + tasche;   // Kugel läuft gegen und landet in der Tasche
        const r = 0.36 - 0.1 * Math.min(1, f * 1.4);
        kugelM.position.set(Math.cos(winkel + b) * r, 0.12, -Math.sin(winkel + b) * r);
        if (f >= 1) dreh = null;
      } else winkel += dt * 0.3;
      scheibe.rotation.y = winkel;
      if (!dreh && !g._nr) kugelM.position.set(Math.cos(winkel) * 0.26, 0.12, -Math.sin(winkel) * 0.26);
      else if (!dreh && g._nr) { const s2 = info.letzte; if (s2) { const idx = S.KESSEL.indexOf(s2.zahl); const tasche = -(idx + 0.5) / nKessel * Math.PI * 2; kugelM.position.set(Math.cos(winkel + tasche) * 0.26, 0.12, -Math.sin(winkel + tasche) * 0.26); } }
      cr.animieren(dt, 0, true, t);
    };
    return g;
  };

  function kartenTisch(th, n, filz, form) {
    const g = filzTisch(th, form, filz, form === 'halb' ? 2.8 : 2.8, 1.5);
    const kartenGr = new T.Group(); g.add(kartenGr);
    const [c, x] = leinwand(512, 256);
    const tex = new T.CanvasTexture(c);
    const flaeche = new T.Mesh(new T.PlaneGeometry(1.8, 0.9), new T.MeshBasicMaterial({ map:tex, transparent:true }));
    flaeche.rotation.set(-Math.PI / 2, 0, Math.PI); flaeche.position.set(0, g.hoehe + 0.035, form === 'halb' ? 0.2 : 0); g.add(flaeche);   // Dealer-Reihe oben = beim Croupier
    g.add(box(0.22, 0.12, 0.3, 0x3e2723, 0.95, g.hoehe + 0.09, 0.55));   // Kartenschlitten
    g.add(chips(6, -1.0, g.hoehe + 0.04, 0.55));
    const cr = F.croupier(n + 1); cr.position.set(0, 0, 1.25); cr.rotation.y = Math.PI; g.add(cr);
    g.malen = (oben, unten) => {
      x.clearRect(0, 0, 512, 256);
      oben.forEach((k, i) => karteMalen(x, k, 256 - oben.length * 30 + i * 60, 14, 54, 78));
      unten.forEach((k, i) => karteMalen(x, k, 256 - unten.length * 30 + i * 60, 150, 54, 78));
      tex.needsUpdate = true;
    };
    g.malen([null, null], []);
    g.cr = cr;
    return g;
  }
  MODELLE.blackjack = (th, n) => {
    const g = kartenTisch(th, n, th.filz, 'halb');
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      const sch = s ? JSON.stringify([s.hand, s.dealer, s.phase]) : '';
      if (sch !== g._sch) { g._sch = sch; if (s && s.hand && s.hand.length) g.malen(s.phase === 'zug' ? [s.dealer[0], null] : s.dealer, s.hand); }
      g.cr.animieren(dt, 0, true, t);
    };
    return g;
  };
  MODELLE.baccarat = (th, n) => {
    const g = kartenTisch(th, n, 0x7a1f2b, 'oval');
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      const sch = s ? s.nr : 0;
      if (sch !== g._sch && s && s.spieler && s.spieler.length) { g._sch = sch; g.malen(s.bank, s.spieler); }
      g.cr.animieren(dt, 0, true, t);
    };
    return g;
  };
  MODELLE.hilo = (th, n) => {
    const g = filzTisch(th, 'oval', th.filz, 1.8, 1.2);
    const [c, x] = leinwand(256, 360);
    const tex = new T.CanvasTexture(c);
    // Die Tafel zeigt zu den Spielern (nach -z): Plane schaut nach +z, also um 180° drehen
    const tafel = new T.Mesh(new T.PlaneGeometry(0.7, 1.0), new T.MeshBasicMaterial({ map:tex }));
    tafel.position.set(0, 1.75, 0.3); tafel.rotation.y = Math.PI; g.add(tafel);
    g.add(box(0.78, 1.08, 0.06, th.holz, 0, 1.75, 0.34));
    g.add(zyl(0.04, 0.04, 0.8, th.holz, 0, 1.0, 0.36, 6));
    const malen = k => { x.fillStyle = '#111'; x.fillRect(0, 0, 256, 360); karteMalen(x, k, 20, 20, 216, 320); tex.needsUpdate = true; };
    malen(null);
    const cr = F.croupier(n + 2); cr.position.set(0.6, 0, 0.9); cr.rotation.y = Math.PI; g.add(cr);
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      const k = s && s.karte != null ? s.karte : null;
      if (k !== g._k) { g._k = k; malen(k); }
      cr.animieren(dt, 0, false, t);
    };
    return g;
  };

  function automatBildschirm(g, w, h, y, z) {
    const [c, x] = leinwand(w, h);
    const tex = new T.CanvasTexture(c);
    const m = new T.Mesh(new T.PlaneGeometry(0.72, 0.72 * h / w), new T.MeshBasicMaterial({ map:tex }));
    m.position.set(0, y, z); m.rotation.y = Math.PI;
    g.add(m);
    return { c, x, tex, m };
  }
  MODELLE.slots = (th, n) => {
    const g = automat(th, th.automat);
    const bs = automatBildschirm(g, 300, 120, 1.3, -0.381);
    const oben = schild('BANDIT', { breite:0.8, gr:90, farbe:'#fff3c4', glow:'#ffcc33' }); oben.position.set(0, 1.92, -0.39); oben.rotation.y = Math.PI; g.add(oben);
    const hebel = new T.Group(); hebel.position.set(0.52, 1.1, 0);
    hebel.add(zyl(0.025, 0.025, 0.5, 0xbdbdbd, 0, 0.25, 0, 6)); hebel.add(kugel(0.07, 0xd32f2f, 0, 0.52, 0, 10));
    g.add(hebel);
    const lampe = schein(th.neon[0], 1.2); lampe.position.set(0, 2.0, -0.2); g.add(lampe);
    let walzen = [0, 1, 2], dreh = 0;
    const malen = () => {
      const { x } = bs;
      x.fillStyle = '#fffdf5'; x.fillRect(0, 0, 300, 120);
      x.font = '64px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) { x.fillText(S.SLOT_SYM[walzen[i]], 50 + i * 100, 64); if (i) { x.fillStyle = '#ccc'; x.fillRect(i * 100 - 1, 0, 2, 120); x.fillStyle = '#000'; } }
      bs.tex.needsUpdate = true;
    };
    malen();
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      if (s && s.nr && s.nr !== g._nr) { g._nr = s.nr; if (info.frisch) dreh = 1.6; g._ziel = s.walzen; if (!info.frisch) { walzen = s.walzen.slice(); malen(); } }
      if (dreh > 0) {
        dreh -= dt;
        hebel.rotation.x = dreh > 1.3 ? (1.6 - dreh) * 3 : Math.max(0, hebel.rotation.x - dt * 4);
        if (Math.floor(t * 14) !== g._f) { g._f = Math.floor(t * 14); walzen = walzen.map((w, i) => dreh > 0.4 + i * 0.4 ? Math.floor(Math.random() * 7) : g._ziel[i]); malen(); }
        if (dreh <= 0) { walzen = g._ziel.slice(); malen(); }
      }
      lampe.material.opacity = 0.6 + Math.sin(t * 4 + n) * 0.25;
    };
    return g;
  };
  MODELLE.poker = (th, n) => {
    const g = automat(th, 0x0d2a5c);
    const bs = automatBildschirm(g, 320, 140, 1.3, -0.381);
    const oben = schild('POKER', { breite:0.8, gr:90, farbe:'#c9e6ff', glow:'#4fc3f7' }); oben.position.set(0, 1.92, -0.39); oben.rotation.y = Math.PI; g.add(oben);
    const malen = h => { const { x } = bs; x.fillStyle = '#0a3d91'; x.fillRect(0, 0, 320, 140); for (let i = 0; i < 5; i++) karteMalen(x, h ? h[i] : null, 8 + i * 62, 22, 56, 96); bs.tex.needsUpdate = true; };
    malen(null);
    g.animieren = (dt, t, info) => { const s = info.letzte; const k = s && s.hand && s.hand.length ? s.hand.join() : ''; if (k !== g._k) { g._k = k; malen(s && s.hand && s.hand.length ? s.hand : null); } };
    return g;
  };
  MODELLE.keno = (th, n) => {
    const g = automat(th, 0x4a148c, 1.6);
    const tafel = new T.Group(); tafel.position.set(0, 2.25, 0.1); g.add(tafel);
    const [c, x] = leinwand(400, 220);
    const tex = new T.CanvasTexture(c);
    const m = new T.Mesh(new T.PlaneGeometry(1.5, 0.82), new T.MeshBasicMaterial({ map:tex })); m.rotation.y = Math.PI; tafel.add(m);
    tafel.add(box(1.6, 0.92, 0.06, 0x222222, 0, 0, 0.04));
    g.add(zyl(0.05, 0.05, 0.6, 0x555555, 0, 1.75, 0.15, 6));
    const malen = (gez, wahl) => {
      x.fillStyle = '#12002b'; x.fillRect(0, 0, 400, 220);
      x.font = '700 20px "Barlow Semi Condensed",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let i = 0; i < 40; i++) {
        const z = i + 1, cx = 25 + (i % 8) * 50, cy = 25 + Math.floor(i / 8) * 42;
        const tr = gez && gez.includes(z), w = wahl && wahl.includes(z);
        x.fillStyle = tr && w ? '#ffd54f' : tr ? '#ab47bc' : w ? '#4fc3f7' : '#2a1450';
        x.beginPath(); x.arc(cx, cy, 18, 0, Math.PI * 2); x.fill();
        x.fillStyle = tr || w ? '#111' : '#b39ddb'; x.fillText(z, cx, cy + 1);
      }
      tex.needsUpdate = true;
    };
    malen(null, null);
    g.animieren = (dt, t, info) => { const s = info.letzte; const k = s && s.nr; if (k !== g._k) { g._k = k; if (s) malen(s.gezogen, s.zahlen); } };
    return g;
  };
  MODELLE.muenze = (th, n) => {
    const g = new T.Group();
    g.add(zyl(0.55, 0.65, 0.9, th.holz, 0, 0.45, 0, 20));
    g.add(zyl(0.6, 0.6, 0.06, th.akzent, 0, 0.92, 0, 20));
    const muenze = new T.Group(); muenze.position.y = 1.45; g.add(muenze);
    const m = zyl(0.42, 0.42, 0.06, 0xe8b923, 0, 0, 0, 28); m.rotation.x = Math.PI / 2; muenze.add(m);
    const [c, x] = leinwand(128, 128);
    x.fillStyle = '#f4c542'; x.fillRect(0, 0, 128, 128); x.font = '80px "Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🦈', 64, 70);
    const vorne = new T.Mesh(new T.CircleGeometry(0.38, 28), new T.MeshLambertMaterial({ map:new T.CanvasTexture(c) })); vorne.position.z = -0.032; vorne.rotation.y = Math.PI; muenze.add(vorne);
    const [c2, x2] = leinwand(128, 128);
    x2.fillStyle = '#f4c542'; x2.fillRect(0, 0, 128, 128); x2.fillStyle = '#7a5a10'; x2.font = '800 70px "Barlow Semi Condensed",sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText('$', 64, 68);
    const hinten = new T.Mesh(new T.CircleGeometry(0.38, 28), new T.MeshLambertMaterial({ map:new T.CanvasTexture(c2) })); hinten.position.z = 0.032; muenze.add(hinten);
    const glanz = schein(0xffd54f, 1.6); glanz.position.y = 1.45; g.add(glanz);
    let wurf = 0, ziel = 0;
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      if (s && s.nr && s.nr !== g._nr) { g._nr = s.nr; if (info.frisch) { wurf = 1.25; ziel = s.wurf === 'kopf' ? 0 : Math.PI; } }
      if (wurf > 0) {
        wurf -= dt;
        const f = 1 - wurf / 1.25;
        muenze.position.y = 1.45 + Math.sin(f * Math.PI) * 0.9;
        muenze.rotation.x = f * Math.PI * 8 + ziel * f;
        muenze.rotation.y = 0;
        if (wurf <= 0) { muenze.rotation.x = 0; muenze.rotation.y = ziel; muenze.position.y = 1.45; }
      } else if (!g._nr) muenze.rotation.y += dt * 0.8;
    };
    return g;
  };
  MODELLE.wuerfel = (th, n) => {
    const g = new T.Group();
    g.add(box(1.4, 0.8, 1.0, 0x8d6e3f, 0, 0.4, 0));
    for (let i = 0; i < 3; i++) g.add(box(1.42, 0.05, 1.02, 0x5d4527, 0, 0.15 + i * 0.25, 0));
    const wand = schild('WÜRFEL', { breite:2.2, gr:110, farbe:'#ffeb3b', grund:'#37474f', glow:'#ff4081' }); wand.position.set(0, 1.6, 0.9); wand.rotation.y = Math.PI; g.add(wand);
    const wuerfel = [];
    const augen = n => { const [c, x] = leinwand(64, 64); x.fillStyle = '#fafafa'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#c62828'; const P = { 1:[[32, 32]], 2:[[16, 16], [48, 48]], 3:[[16, 16], [32, 32], [48, 48]], 4:[[16, 16], [48, 16], [16, 48], [48, 48]], 5:[[16, 16], [48, 16], [32, 32], [16, 48], [48, 48]], 6:[[16, 14], [48, 14], [16, 32], [48, 32], [16, 50], [48, 50]] }[n]; for (const [a, b] of P) { x.beginPath(); x.arc(a, b, 6, 0, 7); x.fill(); } return new T.MeshLambertMaterial({ map:new T.CanvasTexture(c) }); };
    const mats6 = [1, 6, 2, 5, 3, 4].map(augen);
    for (const s of [-1, 1]) { const w = new T.Mesh(geo('BoxGeometry', 0.18, 0.18, 0.18), mats6); w.position.set(s * 0.18, 0.89, 0); g.add(w); wuerfel.push(w); }
    // Drehung, die eine bestimmte Zahl nach oben bringt (Reihenfolge der Seiten: +x,-x,+y,-y,+z,-z = 1,6,2,5,3,4)
    const OBEN = { 1:[0, 0, Math.PI / 2], 6:[0, 0, -Math.PI / 2], 2:[0, 0, 0], 5:[Math.PI, 0, 0], 3:[-Math.PI / 2, 0, 0], 4:[Math.PI / 2, 0, 0] };
    let roll = 0;
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      if (s && s.nr && s.nr !== g._nr) { g._nr = s.nr; if (info.frisch) roll = 1.1; g._w = s.wurf; }
      if (roll > 0) {
        roll -= dt;
        wuerfel.forEach((w, i) => { w.rotation.x += dt * (14 + i * 3); w.rotation.z += dt * (11 + i * 5); w.position.y = 0.89 + Math.abs(Math.sin(roll * 9)) * 0.25 * roll; });
        if (roll <= 0 && g._w) wuerfel.forEach((w, i) => { const o = OBEN[g._w[i]]; w.rotation.set(o[0], i * 0.6, o[2]); w.position.y = 0.89; });
      }
    };
    return g;
  };
  MODELLE.los = (th, n) => {
    const g = new T.Group();
    g.add(box(1.8, 0.95, 0.8, 0xc62828, 0, 0.475, 0.1));
    g.add(box(1.9, 0.06, 0.9, 0xfafafa, 0, 0.97, 0.1));
    for (const s of [-1, 1]) g.add(zyl(0.04, 0.04, 1.4, 0xfafafa, s * 0.85, 1.65, 0.45, 6));
    const dach = box(2.1, 0.12, 1.2, 0xfafafa, 0, 2.35, 0.2); g.add(dach);
    for (let i = 0; i < 7; i++) g.add(box(0.3, 0.1, 1.22, i % 2 ? 0xc62828 : 0xfafafa, -0.9 + i * 0.3, 2.42, 0.2));
    const sch = schild('RUBBELLOSE', { breite:1.8, gr:84, farbe:'#c62828', grund:'#fff8e1' }); sch.position.set(0, 2.1, -0.42); sch.rotation.y = Math.PI; g.add(sch);
    const farben = [0xffd54f, 0x4fc3f7, 0xf06292, 0x81c784];
    for (let i = 0; i < 10; i++) { const l = box(0.18, 0.005, 0.26, farben[i % 4], -0.7 + (i % 5) * 0.32, 1.005 + Math.floor(i / 5) * 0.006, -0.05 + Math.floor(i / 5) * 0.15); l.rotation.y = (i * 0.37) % 0.4 - 0.2; g.add(l); }
    const v = F.tier('hase', { anzug:0xfafafa, fliege:0xc62828, skala:1.3 }); v.brille.visible = false; v.position.set(0, 0, 0.8); v.rotation.y = Math.PI; g.add(v);
    g.animieren = (dt, t) => v.animieren(dt, 0, false, t);
    return g;
  };
  MODELLE.huetchen = (th, n) => {
    const g = new T.Group();
    g.add(box(1.3, 0.75, 0.9, 0x8d6e3f, 0, 0.375, 0));
    g.add(box(1.36, 0.04, 0.96, 0x2e7d32, 0, 0.77, 0));
    const becher = [];
    for (let i = 0; i < 3; i++) { const b = zyl(0.09, 0.13, 0.22, 0xc62828, (i - 1) * 0.36, 0.9, 0, 12); g.add(b); becher.push(b); }
    const kug = kugel(0.04, 0xffffff, 0, 0.83, 0, 8); g.add(kug);
    const gau = F.gauner(); gau.position.set(0, 0, 0.85); gau.rotation.y = Math.PI; g.add(gau);
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      gau.animieren(dt, 0, true, t);
      if (!s || s.phase !== 'mischen' || !s.tausche) { becher.forEach((b, i) => { b.position.x = (i - 1) * 0.36; b.position.z = 0; b.position.y = 0.9; }); kug.visible = false; return; }
      if (s.nr !== g._nr) { g._nr = s.nr; g._t = 0; }
      g._t += dt;
      // Becher-Positionen aus der Tausch-Folge
      const pos = [0, 1, 2]; const zeigen = s.zeigen || 1.2;
      const tt = g._t - zeigen;
      const n2 = Math.max(0, Math.min(s.tausche.length, Math.floor(tt / s.dauer)));
      for (let k = 0; k < n2; k++) { const [a, b] = s.tausche[k]; const ia = pos.indexOf(a), ib = pos.indexOf(b); [pos[ia], pos[ib]] = [pos[ib], pos[ia]]; }
      // pos[platz] = Becher-Nummer
      const x = [0, 0, 0], z = [0, 0, 0];
      pos.forEach((bn, platz) => { x[bn] = (platz - 1) * 0.36; });
      if (tt > 0 && n2 < s.tausche.length) {
        const [a, b] = s.tausche[n2], f = (tt - n2 * s.dauer) / s.dauer;
        const pa = pos.indexOf(a), pb = pos.indexOf(b);
        const ba = pos[pa], bb = pos[pb];
        const xa = (pa - 1) * 0.36, xb = (pb - 1) * 0.36;
        x[ba] = xa + (xb - xa) * f; z[ba] = Math.sin(f * Math.PI) * 0.18;
        x[bb] = xb + (xa - xb) * f; z[bb] = -Math.sin(f * Math.PI) * 0.18;
      }
      becher.forEach((b, i) => { b.position.x = x[i]; b.position.z = z[i]; b.position.y = g._t < zeigen ? 0.9 + Math.sin(Math.min(1, g._t / zeigen) * Math.PI) * 0.15 : 0.9; });
      kug.visible = g._t < zeigen; kug.position.x = (s.start - 1) * 0.36;
    };
    return g;
  };
  MODELLE.plinko = (th, n) => {
    const g = new T.Group();
    const brett = box(1.8, 2.4, 0.12, 0x101828, 0, 1.55, 0.05); g.add(brett);
    g.add(box(1.9, 0.12, 0.5, th.akzent, 0, 0.35, 0)); g.add(box(1.9, 0.7, 0.3, th.holz, 0, 0.35, 0.1));
    // Stifte
    const stift = new T.InstancedMesh(geo('SphereGeometry', 0.025, 6, 4), leucht(0xffffff, 0.9), 90);
    let k = 0; const m4 = new T.Matrix4();
    for (let r = 0; r < 12; r++) for (let i = 0; i <= r + 2 && k < 90; i++) { m4.makeTranslation((i - (r + 2) / 2) * 0.12, 2.55 - r * 0.15, -0.03); stift.setMatrixAt(k++, m4); }
    stift.count = k; g.add(stift);
    // Fächer
    const farben = [0xe53935, 0xfb8c00, 0xfdd835, 0x7cb342, 0x26a69a, 0x42a5f5, 0x5c6bc0, 0x42a5f5, 0x26a69a, 0x7cb342, 0xfdd835, 0xfb8c00, 0xe53935];
    for (let i = 0; i < 13; i++) g.add(teilLeucht(box(0.11, 0.1, 0.06, farben[i], (i - 6) * 0.12, 0.66, -0.03)));
    const baelle = [];
    for (let i = 0; i < 6; i++) { const b = kugel(0.04, 0xff4081, 0, -5, -0.06, 8); b.material = leucht(0xff80ab); g.add(b); baelle.push(b); }
    const oben = schild('PLINKO', { breite:1.4, gr:96, farbe:'#fff', glow:'#ff4081' }); oben.position.set(0, 2.95, -0.02); oben.rotation.y = Math.PI; g.add(oben);
    const aktiv = new Map();
    const gesehen = {};
    g.animieren = (dt, t, info) => {
      for (const s of info.alle) {
        const bl = s.baelle || []; if (!bl.length) continue;
        const max = bl[bl.length - 1].nr;
        if (gesehen[s._id] == null) { gesehen[s._id] = max; continue; }
        for (const b of bl) if (b.nr > gesehen[s._id]) aktiv.set(s._id + ':' + b.nr, { pfad:b.pfad, t:0 });
        gesehen[s._id] = Math.max(gesehen[s._id], max);
      }
      let i = 0;
      for (const [key, a] of aktiv) {
        a.t += dt;
        const f = a.t / 2.6;
        if (f >= 1.15 || i >= baelle.length) { aktiv.delete(key); continue; }
        const reihe = Math.min(12, f * 12), r0 = Math.floor(reihe);
        let x = 0; for (let j = 0; j < r0 && j < 12; j++) x += a.pfad[j] === '1' ? 0.06 : -0.06;
        if (r0 < 12) x += (a.pfad[r0] === '1' ? 0.06 : -0.06) * (reihe - r0);
        baelle[i].position.set(x, 2.7 - Math.min(1, f) * 2.0 - Math.abs(Math.sin(reihe * Math.PI)) * 0.04, -0.07);
        i++;
      }
      for (; i < baelle.length; i++) baelle[i].position.y = -5;
    };
    return g;
  };
  function teilLeucht(m) { m.material = leucht(m.material.color.getHex(), 1); return m; }
  MODELLE.turm = (th, n) => {
    const g = new T.Group();
    const stufen = [];
    for (let i = 0; i < 9; i++) {
      const w = 1.2 - i * 0.06;
      const s = box(w, 0.26, w, i % 2 ? 0x2b2b3a : 0x353548, 0, 0.13 + i * 0.28, 0); g.add(s);
      const leiste = box(w + 0.02, 0.04, w + 0.02, th.akzent, 0, 0.27 + i * 0.28, 0); g.add(leiste);
      const fenster = new T.Mesh(geo('PlaneGeometry', w * 0.7, 0.14), leucht(0x37474f)); fenster.position.set(0, 0.14 + i * 0.28, -w / 2 - 0.005); fenster.rotation.y = Math.PI; g.add(fenster);
      stufen.push(fenster);
    }
    const kopf = new T.Group(); kopf.position.y = 2.75; g.add(kopf);
    const k2 = kugel(0.3, 0x2e7d32, 0, 0, 0, 12); k2.scale.set(1, 0.85, 1.3); kopf.add(k2);
    const sch = kegel(0.16, 0.4, 0x388e3c, 0, -0.05, -0.38); sch.rotation.x = -Math.PI / 2; kopf.add(sch);
    for (const s of [-1, 1]) { kopf.add(teilLeucht(kugel(0.05, 0xffeb3b, s * 0.13, 0.1, -0.25, 8))); const h = kegel(0.05, 0.25, 0xfafafa, s * 0.15, 0.3, 0.05, 6); h.rotation.z = -s * 0.4; kopf.add(h); }
    const feuer = schein(0xff6d00, 0.1); feuer.position.set(0, 2.7, -0.75); g.add(feuer);
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      const st = s ? s.stufe : 0;
      stufen.forEach((f, i) => f.material.color.setHex(s && s.phase === 'laeuft' && i < st ? 0x66bb6a : s && s.phase === 'laeuft' && i === st ? 0xffd54f : 0x37474f));
      kopf.rotation.y = Math.PI + Math.sin(t * 0.7) * 0.4;
      const boom = s && s.phase === 'bereit' && s.reihen && s.wahl && s.wahl.length && s.reihen[s.wahl.length - 1] && s.reihen[s.wahl.length - 1][s.wahl[s.wahl.length - 1]] === 1;
      feuer.scale.setScalar(boom ? 1.2 + Math.sin(t * 20) * 0.3 : 0.01);
    };
    return g;
  };
  MODELLE.minen = (th, n) => {
    const g = filzTisch(th, 'oval', 0x263238, 2.0, 1.6);
    const kacheln = [];
    for (let i = 0; i < 25; i++) { const k = box(0.2, 0.05, 0.2, 0x546e7a, ((i % 5) - 2) * 0.24, g.hoehe + 0.06, (Math.floor(i / 5) - 2) * 0.24); k.material = new T.MeshLambertMaterial({ color:0x546e7a }); g.add(k); kacheln.push(k); }
    const cr = F.croupier(n + 3); cr.position.set(0, 0, 1.15); cr.rotation.y = Math.PI; g.add(cr);
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      const sch = s ? JSON.stringify([s.offen, s.minen, s.phase]) : '';
      if (sch !== g._sch) {
        g._sch = sch;
        kacheln.forEach((k, i) => {
          const offen = s && s.offen && s.offen.includes(i), mine = s && s.minen && s.minen.includes(i);
          k.material.color.setHex(mine ? 0xe53935 : offen ? 0x43a047 : 0x546e7a);
          k.position.y = g.hoehe + (offen || mine ? 0.04 : 0.06);
        });
      }
      cr.animieren(dt, 0, true, t);
    };
    return g;
  };
  MODELLE.rad = (th, n) => {
    const g = new T.Group();
    g.add(box(0.5, 1.2, 0.5, th.holz, 0, 0.6, 0.2));
    const rad = new T.Group(); rad.position.set(0, 2.25, 0); g.add(rad);
    const [c, x] = leinwand(512, 512);
    for (let i = 0; i < 50; i++) {
      const sym = S.RAD_SYM[S.RAD_FELDER[i]];
      x.beginPath(); x.moveTo(256, 256); x.arc(256, 256, 250, (i / 50) * Math.PI * 2 - Math.PI / 2, ((i + 1) / 50) * Math.PI * 2 - Math.PI / 2); x.closePath();
      x.fillStyle = sym.f; x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke();
      x.save(); x.translate(256, 256); x.rotate((i + 0.5) / 50 * Math.PI * 2); x.fillStyle = '#fff'; x.font = '700 18px "Barlow Semi Condensed",sans-serif'; x.textAlign = 'center'; x.fillText(sym.n, 0, -215); x.restore();
    }
    x.fillStyle = '#e8b923'; x.beginPath(); x.arc(256, 256, 40, 0, 7); x.fill();
    const scheibe = new T.Mesh(new T.CircleGeometry(1.15, 50), new T.MeshLambertMaterial({ map:new T.CanvasTexture(c) }));
    scheibe.rotation.y = Math.PI; rad.add(scheibe);
    const ring = new T.Mesh(new T.TorusGeometry(1.17, 0.06, 8, 50), mat(th.akzent)); rad.add(ring);
    const zeiger = kegel(0.1, 0.25, 0xfafafa, 0, 1.3, -0.05, 4); zeiger.rotation.z = Math.PI; g.add(zeiger); zeiger.position.y = 2.25 + 1.28;
    const lichter = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const l = kugel(0.04, 0xffffff, Math.cos(a) * 1.27, Math.sin(a) * 1.27, -0.02, 6); l.material = leucht(0xfff59d); rad.add(l); lichter.push(l); }
    let winkel = 0, dreh = null;
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      if (s && s.feld != null && s.nr !== g._nr) { g._nr = s.nr; const alpha = (s.feld + 0.5) / 50 * Math.PI * 2; if (info.frisch) { const voll = Math.ceil((winkel + 8 * Math.PI) / (Math.PI * 2)) * Math.PI * 2 - alpha; dreh = { t:0, d:4.1, w0:winkel, w1:voll }; } else winkel = -alpha; }
      if (dreh) { dreh.t += dt; const f = Math.min(1, dreh.t / dreh.d), e = 1 - Math.pow(1 - f, 3); winkel = dreh.w0 + (dreh.w1 - dreh.w0) * e; if (f >= 1) dreh = null; }
      rad.rotation.z = winkel;
      lichter.forEach((l, i) => l.visible = (Math.floor(t * 6) + i) % 3 !== 0);
    };
    return g;
  };
  MODELLE.rakete = (th, n) => {
    const g = new T.Group();
    for (const s of [-1, 1]) g.add(zyl(0.06, 0.06, 1.3, 0x555555, s * 1.0, 0.65, 0.1, 6));
    g.add(box(2.6, 1.6, 0.12, 0x111111, 0, 2.05, 0.1));
    const [c, x] = leinwand(512, 300);
    const tex = new T.CanvasTexture(c);
    const schirm = new T.Mesh(new T.PlaneGeometry(2.45, 1.44), new T.MeshBasicMaterial({ map:tex })); schirm.position.set(0, 2.05, 0.035); schirm.rotation.y = Math.PI; g.add(schirm);
    // Rakete obendrauf
    const r = new T.Group(); r.position.set(0, 3.15, 0.1); g.add(r);
    r.add(zyl(0.12, 0.12, 0.45, 0xfafafa, 0, 0, 0, 12)); r.add(kegel(0.12, 0.25, 0xe53935, 0, 0.35, 0, 12));
    for (let i = 0; i < 3; i++) { const f = box(0.02, 0.18, 0.14, 0xe53935, Math.cos(i * 2.1) * 0.12, -0.18, Math.sin(i * 2.1) * 0.12); f.rotation.y = -i * 2.1; r.add(f); }
    const flamme = schein(0xff9100, 0.6); flamme.position.set(0, 2.85, 0.1); g.add(flamme);
    g.animieren = (dt, t, info) => {
      const rd = info.runde; if (!rd) return;
      let m = 1, text = '', farbe = '#7cfc8a';
      if (rd.phase === 'wetten') { text = 'Start in ' + Math.max(0, Math.ceil(rd.bis - info.uhr)) + ' s'; farbe = '#90caf9'; }
      else if (rd.phase === 'flug') { m = S.raketeMult(info.uhr - rd.start); text = '×' + m.toFixed(2); }
      else { m = rd.crash || 1; text = 'GEPLATZT ×' + (rd.crash || 1).toFixed(2); farbe = '#ff5252'; }
      const k = text + rd.phase;
      if (k !== g._k) {
        g._k = k;
        x.fillStyle = '#05080f'; x.fillRect(0, 0, 512, 300);
        x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 1; for (let i = 0; i < 512; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 300); x.stroke(); }
        if (rd.phase !== 'wetten') {
          const dauer = rd.phase === 'flug' ? info.uhr - rd.start : S.raketeZeit(rd.crash || 1);
          const maxM = Math.max(2, m * 1.2);
          x.strokeStyle = farbe; x.lineWidth = 5; x.beginPath();
          for (let i = 0; i <= 50; i++) { const tt = dauer * i / 50, mm = S.raketeMult(tt); const px = 30 + i / 50 * 440, py = 270 - (mm - 1) / (maxM - 1) * 230; i ? x.lineTo(px, py) : x.moveTo(px, py); }
          x.stroke();
        }
        x.fillStyle = farbe; x.font = '800 72px "Barlow Semi Condensed",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(text, 256, rd.phase === 'wetten' ? 150 : 70);
        tex.needsUpdate = true;
      }
      const fliegt = rd.phase === 'flug';
      r.position.y = 3.15 + (fliegt ? Math.min(0.4, (m - 1) * 0.08) + Math.sin(t * 30) * 0.01 : 0);
      flamme.position.y = r.position.y - 0.32;
      flamme.scale.setScalar(fliegt ? 0.5 + Math.random() * 0.3 : rd.phase === 'crash' && info.uhr - rd.bis > -2.5 ? 2.2 : 0.01);
      flamme.material.color.setHex(rd.phase === 'crash' ? 0xff1744 : 0xff9100);
    };
    return g;
  };
  MODELLE.enten = (th, n) => {
    const g = new T.Group();
    g.add(box(3.4, 0.8, 1.6, th.holz, 0, 0.4, 0));
    g.add(teilLeucht(box(3.2, 0.02, 1.4, 0x1e88e5, 0, 0.82, 0)));
    for (let i = 0; i < 5; i++) g.add(box(3.2, 0.06, 0.02, 0xfafafa, 0, 0.84, -0.7 + (i + 1) * (1.4 / 6)));
    g.add(teilLeucht(box(0.04, 0.03, 1.4, 0xffffff, 1.5, 0.84, 0)));
    g.add(teilLeucht(box(0.04, 0.03, 1.4, 0x000000, -1.5, 0.84, 0)));
    const enten = S.ENTEN.map((e, i) => {
      const d = new T.Group();
      const leib = kugel(0.09, new T.Color(e.f).getHex(), 0, 0.06, 0, 10); leib.scale.set(1.3, 0.8, 1); d.add(leib);
      d.add(kugel(0.06, new T.Color(e.f).getHex(), 0.08, 0.15, 0, 8));
      d.add(box(0.06, 0.02, 0.04, 0xff8f00, 0.15, 0.14, 0));
      d.position.set(-1.45, 0.84, -0.7 + (i + 0.5) * (1.4 / 6));
      g.add(d); return d;
    });
    const sch = schild('ENTENRENNEN', { breite:2.4, gr:84, farbe:'#fff59d', glow:'#ffeb3b' }); sch.position.set(0, 2.2, 0.75); g.add(sch);
    g.add(zyl(0.04, 0.04, 1.4, 0x666666, -1.1, 1.5, 0.78, 6)); g.add(zyl(0.04, 0.04, 1.4, 0x666666, 1.1, 1.5, 0.78, 6));
    sch.rotation.y = Math.PI;
    g.animieren = (dt, t, info) => {
      const rd = info.runde; if (!rd) return;
      let f = 0;
      if (rd.phase === 'rennen' && rd.start != null) f = Math.min(1, (info.uhr - rd.start) / S.ENTEN_RENNEN);
      else if (rd.phase === 'pause') f = 1;
      if (rd.seed !== g._seed && rd.sieger != null) { g._seed = rd.seed; g._v = S.entenVerlauf(rd.seed, rd.sieger); }
      enten.forEach((d, i) => {
        const p = rd.phase === 'wetten' || !g._v || rd.sieger == null ? 0 : S.entePos(g._v, i, f);
        d.position.x = -1.45 + p * 2.9;
        d.position.y = 0.84 + Math.abs(Math.sin(t * 8 + i)) * (rd.phase === 'rennen' ? 0.03 : 0.01);
        d.rotation.z = Math.sin(t * 6 + i) * 0.1;
      });
    };
    return g;
  };

  // Kollisionsradius und Sitzplätze je Tischart
  const RADIUS = { roulette:1.65, blackjack:1.55, baccarat:1.55, hilo:1.15, slots:0.75, poker:0.75, keno:0.85, muenze:0.75, wuerfel:0.95, los:1.1, huetchen:0.9, plinko:1.0, turm:0.8, minen:1.25, rad:0.7, rakete:1.35, enten:1.8 };
  function sitzplaetze(art, n) {
    const r = (RADIUS[art] || 1.2) + 0.55, aus = [];
    const breite = Math.min(1.9, 0.5 * (n - 1));
    for (let i = 0; i < n; i++) { const a = n === 1 ? 0 : -breite / 2 + breite * i / (n - 1); aus.push({ x:Math.sin(a) * r, z:-Math.cos(a) * r }); }
    return aus;
  }

  /* ================= Die Welt ================= */
  function Welt(canvas) {
    const renderer = new T.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
    let pixel = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(pixel);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    const szene = new T.Scene();
    const kamera = new T.PerspectiveCamera(55, 1, 0.1, 120);
    const G = KHGlanz;
    const nach = G.nachbearbeitung(renderer, szene, kamera);
    let bloomAn = !!nach, envTex = null, staubP = null, reihe = null, theke = null;
    const fx = G.effekte(szene);
    const raum = new T.Group(); szene.add(raum);
    const tischGr = new T.Group(); szene.add(tischGr);
    const figurGr = new T.Group(); szene.add(figurGr);
    const effektGr = new T.Group(); szene.add(effektGr);
    let thema = null, etage = -1, tafel = null, don = null, elster = null, tafelTex = null, tafelCtx = null, aquarium = null;
    const tische = new Map();     // id -> { g, art, x, z, schild }
    const figuren = new Map();    // id -> { g, name, x, z, r }
    const licht = { amb:new T.AmbientLight(0xffffff, 0.5), hemi:new T.HemisphereLight(0xffffff, 0x222222, 0.5), sonne:new T.DirectionalLight(0xffffff, 0.45) };
    licht.sonne.position.set(5, 16, 7);
    licht.sonne.castShadow = true;
    Object.assign(licht.sonne.shadow.camera, { left:-19, right:19, top:14, bottom:-14, near:2, far:40 });
    licht.sonne.shadow.mapSize.set(2048, 2048);
    licht.sonne.shadow.bias = -0.0006; licht.sonne.shadow.normalBias = 0.03; licht.sonne.shadow.radius = 3;
    szene.add(licht.amb, licht.hemi, licht.sonne, licht.sonne.target);
    const punkte = [];
    for (let i = 0; i < 4; i++) { const p = new T.PointLight(0xffffff, 0.8, 18, 2); szene.add(p); punkte.push(p); }

    function groesse() {
      const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      if (nach) nach.groesse(w, h, pixel);
      kamera.aspect = w / h;
      kamera.fov = kamera.aspect < 0.8 ? 72 : kamera.aspect < 1.2 ? 62 : 55;   // Hochformat braucht mehr Sicht
      kamera.updateProjectionMatrix();
    }
    window.addEventListener('resize', groesse);
    groesse();

    // Entfernt alles aus einer Gruppe und gibt Geometrien, Materialien und Texturen frei (geteilte bleiben)
    function leeren(gr) {
      while (gr.children.length) {
        const c = gr.children.pop();
        c.traverse(o => {
          if (o.geometry && !o.geometry._geteilt) o.geometry.dispose();
          const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
          for (const m of ms) { if (m._geteilt) continue; if (m.map && m.map !== scheinTex) m.map.dispose(); m.dispose(); }
        });
      }
    }

    /* ---------- Raum je Etage ---------- */
    function etageBauen(e) {
      if (e === etage) return;
      etage = e; thema = THEMEN[e];
      leeren(raum);
      aquarium = null; raum.userData.kugeln = null; tischSchluessel = '';
      const th = thema, W = L.RAUM.x * 2, D = L.RAUM.z * 2, H = 5.2;
      szene.background = new T.Color(th.nebel);
      szene.fog = new T.Fog(th.nebel, th.nebelNah, th.nebelFern);
      licht.amb.color.setHex(th.amb); licht.amb.intensity = 0.55;
      licht.hemi.color.setHex(th.hemi[0]); licht.hemi.groundColor.setHex(th.hemi[1]); licht.hemi.intensity = th.hemi[2];
      licht.sonne.color.setHex(th.licht); licht.sonne.intensity = e === 3 ? 0.42 : 0.36;
      const lpos = [[-9, -4], [9, -4], [-9, 6], [9, 6]];
      punkte.forEach((p, i) => { p.color.setHex(i % 2 ? th.licht2 : th.licht); p.position.set(lpos[i][0], 4.2, lpos[i][1]); p.intensity = e === 3 ? 0.3 : 0.8; });
      // Boden
      const bt = bodenTextur(th.boden); bt.repeat.set(W / 6, D / 6);
      const glatt = { holz:0.7, gitter:0.22, welle:0.8, marmor:0.12 }[th.boden];
      const boden = new T.Mesh(new T.PlaneGeometry(W + 2, D + 2), new T.MeshStandardMaterial({ map:bt, roughness:glatt, metalness:th.boden === 'gitter' ? 0.4 : 0.05, envMapIntensity:th.boden === 'marmor' ? 0.9 : 0.7 }));
      boden.rotation.x = -Math.PI / 2; boden.userData.keinSchatten = true; raum.add(boden);
      // Casino-Teppich unter den Tischen (im Penthouse bleibt der Marmor frei)
      if (e !== 3) raum.add(G.teppich(th, 30, 17).translateZ(1.7));
      // Teppichläufer zum Podium
      const laeufer = new T.Mesh(new T.PlaneGeometry(3, 8), mat(e === 1 ? 0x2a0f3a : 0x8e1b1b));
      laeufer.rotation.x = -Math.PI / 2; laeufer.position.set(0, 0.02, -8); laeufer.userData.keinSchatten = true; raum.add(laeufer);
      // Wände und Decke
      const wandM = mat(th.wand);
      raum.add(teil(new T.BoxGeometry(W + 2, H, 0.4), wandM, 0, H / 2, -D / 2 - 0.2));
      raum.add(teil(new T.BoxGeometry(W + 2, H, 0.4), wandM, 0, H / 2, D / 2 + 0.2));
      raum.add(teil(new T.BoxGeometry(0.4, H, D + 2), wandM, -W / 2 - 0.2, H / 2, 0));
      raum.add(teil(new T.BoxGeometry(0.4, H, D + 2), wandM, W / 2 + 0.2, H / 2, 0));
      for (const w of raum.children) w.userData.keinSchatten = true;
      const decke = new T.Mesh(new T.PlaneGeometry(W + 2, D + 2), mat(th.decke)); decke.rotation.x = Math.PI / 2; decke.position.y = H; decke.userData.keinSchatten = true; raum.add(decke);
      // Sockel- und Zierleisten
      for (const [w, d, x, z] of [[W, 0.1, 0, -D / 2 + 0.05], [W, 0.1, 0, D / 2 - 0.05], [0.1, D, -W / 2 + 0.05, 0], [0.1, D, W / 2 - 0.05, 0]]) {
        raum.add(box(w, 0.25, d, th.wand2, x, 0.125, z));
        if (e === 1) raum.add(teil(new T.BoxGeometry(w, 0.06, d), leucht(th.neon[0], 1), x, 3.4, z));
      }
      // Deckenlampen
      for (let x = -12; x <= 12; x += 8) for (let z = -6; z <= 8; z += 7) {
        raum.add(teil(geo('CylinderGeometry', 0.5, 0.6, 0.12, 16), leucht(th.licht, 0.9), x, H - 0.08, z));
        const sc = schein(th.licht, 3); sc.position.set(x, H - 0.4, z); sc.material.opacity = 0.35; raum.add(sc);
      }
      raum.add(G.wandVerkleidung(th, W, D, H, e < 2, (w, t) => w.rot === 0 && t > -8.2 && t < -4.8));
      raum.add(G.decke(th, W, D, H));
      dekoBauen(e, th, W, D, H);
      podiumBauen(th, D);
      pfandhausBauen(th);
      // Ausstattung: Automatenreihe an der Südwand, Bar, Absperrkordeln am Läufer, Staub im Licht
      reihe = G.automatenReihe(th, -15.6, 15.6, 11.3); raum.add(reihe);
      theke = G.bar(th); theke.position.set(15, 0, -10.6); raum.add(theke);
      const posten = z0 => [-9.5, -8, -6.5, -5].map(z => [z0, z]);
      raum.add(G.kordeln(posten(-1.75)), G.kordeln(posten(1.75)));
      staubP = G.staub(th); raum.add(staubP);
      schattenSetzen(raum);
      // Spiegelungen aus dem fertigen Raum, Bloom-Stimmung je Etage
      envTex = G.umgebung(renderer, szene, envTex);
      if (nach) nach.stimmung(...[[0.8, 0.5, 0.74], [1.05, 0.55, 0.66], [0.75, 0.45, 0.8], [0.35, 0.35, 0.97]][e]);
    }
    // Schatten: alles Feste wirft, Glas, Licht und große Flächen nicht
    function schattenSetzen(gr) {
      gr.traverse(o => {
        if (!o.isMesh && !o.isInstancedMesh) return;
        o.receiveShadow = true;
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        o.castShadow = !o.userData.keinSchatten && m && !m.transparent && m.type !== 'MeshBasicMaterial';
      });
    }
    function teil(g, m, x, y, z) { const t = new T.Mesh(g, m); t.position.set(x, y, z); return t; }

    function dekoBauen(e, th, W, D, H) {
      if (e === 0) {
        // Spelunke: Backsteinwand-Flecken, Holzpfeiler, Fässer, Neon-Schilder
        for (const [x, z] of [[-16, 10.5], [-15.2, 10.8], [16, 10.4], [15.3, 10.9], [-16.2, -2], [16.2, 3]]) { const f = zyl(0.35, 0.35, 0.9, 0x6d4c2c, x, 0.45, z, 12); raum.add(f); raum.add(zyl(0.36, 0.36, 0.05, 0x333333, x, 0.2, z, 12)); raum.add(zyl(0.36, 0.36, 0.05, 0x333333, x, 0.7, z, 12)); }
        const bar = schild('BAR', { breite:2.2, gr:110, farbe:'#ff8a65', glow:'#ff3d00' }); bar.position.set(14.5, 3.6, -11.75); raum.add(bar);
        const zock = schild('ZOCKEN • ZAHLEN • ZITTERN', { w:1024, h:128, breite:7, gr:80, farbe:'#ffd180', glow:'#ff6d00' }); zock.position.set(0, 4.1, 11.75); zock.rotation.y = Math.PI; raum.add(zock);
        for (let i = 0; i < 8; i++) { const x = -14 + i * 4; raum.add(teil(geo('SphereGeometry', 0.1, 8, 6), leucht(0xffcc80), x, 3.9, -2)); raum.add(box(0.01, 1.2, 0.01, 0x222222, x, 4.55, -2)); const sc = schein(0xffb74d, 1.2); sc.position.set(x, 3.9, -2); raum.add(sc); }
      } else if (e === 1) {
        // Neon: leuchtende Röhren an den Wänden, Spiegelkugeln
        for (let i = 0; i < 9; i++) {
          const f = th.neon[i % 3];
          for (const s of [-1, 1]) { const r = teil(new T.BoxGeometry(0.08, 2.6, 0.08), leucht(f), -14 + i * 3.5, 2.0, s * (D / 2 - 0.05)); raum.add(r); const sc = schein(f, 2.5); sc.position.copy(r.position); sc.material.opacity = 0.45; raum.add(sc); }
        }
        for (const [x, z] of [[-6, 2], [6, 2]]) {
          const k = new T.Mesh(geo('SphereGeometry', 0.5, 16, 12), new T.MeshLambertMaterial({ color:0xdddddd, emissive:0x333333 })); k.position.set(x, 4.3, z); raum.add(k); raum.add(box(0.02, 0.6, 0.02, 0x999999, x, 4.9, z));
          raum.userData.kugeln = (raum.userData.kugeln || []).concat(k);
        }
        const s = schild('NEON-PALAST', { w:1024, h:160, breite:7, gr:120, farbe:'#ff9cf8', glow:'#ff3df2' }); s.position.set(0, 4.1, 11.75); s.rotation.y = Math.PI; raum.add(s);
      } else if (e === 2) {
        // Korallen-Lounge: Aquarium-Wände mit Fischen, Korallen
        const [c, x] = leinwand(1024, 256);
        const tex = new T.CanvasTexture(c); tex.wrapS = T.RepeatWrapping;
        aquarium = { c, x, tex, fische:Array.from({ length:18 }, (_, i) => ({ x:Math.random() * 1024, y:30 + Math.random() * 190, v:20 + Math.random() * 40, gr:14 + Math.random() * 18, f:['#ff8a65', '#ffd54f', '#4fc3f7', '#f06292', '#aed581'][i % 5], r:i % 4 === 0 })) };
        for (const s of [-1, 1]) {
          const a = new T.Mesh(new T.PlaneGeometry(D - 2, 3.2), new T.MeshBasicMaterial({ map:tex }));
          a.position.set(s * (W / 2 - 0.02), 2.2, 0); a.rotation.y = -s * Math.PI / 2; raum.add(a);
          raum.add(box(0.1, 0.12, D - 1.8, th.akzent, s * (W / 2 - 0.06), 0.55, 0)); raum.add(box(0.1, 0.12, D - 1.8, th.akzent, s * (W / 2 - 0.06), 3.85, 0));
        }
        const korallen = [0xff7043, 0xf06292, 0xffb74d, 0xba68c8];
        for (let i = 0; i < 14; i++) {
          const x2 = (i % 2 ? 1 : -1) * (15.6 - (i % 3) * 0.4), z = -10 + i * 1.6;
          const k = kegel(0.25 + (i % 3) * 0.08, 0.9 + (i % 4) * 0.3, korallen[i % 4], x2, 0.45 + (i % 4) * 0.15, z, 6); raum.add(k);
          raum.add(kugel(0.18, korallen[(i + 1) % 4], x2 + 0.2, 0.25, z + 0.4, 8));
        }
        const s = schild('KORALLEN-LOUNGE', { w:1024, h:160, breite:7, gr:110, farbe:'#a7ffeb', glow:'#1de9b6' }); s.position.set(0, 4.1, 11.75); s.rotation.y = Math.PI; raum.add(s);
      } else {
        // Penthouse: Fenster mit Skyline, goldene Säulen, Kronleuchter, Pflanzen
        const [c, x] = leinwand(1024, 256);
        const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#0b1026'); gr.addColorStop(1, '#2a2050'); x.fillStyle = gr; x.fillRect(0, 0, 1024, 256);
        for (let i = 0; i < 80; i++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.8 + ')'; x.fillRect(Math.random() * 1024, Math.random() * 120, 2, 2); }
        let px = 0; while (px < 1024) { const w = 30 + Math.random() * 60, h = 60 + Math.random() * 150; x.fillStyle = '#0d0f1c'; x.fillRect(px, 256 - h, w, h); for (let wy = 256 - h + 8; wy < 250; wy += 12) for (let wx = px + 5; wx < px + w - 6; wx += 10) if (Math.random() < 0.45) { x.fillStyle = Math.random() < 0.8 ? '#ffd54f' : '#90caf9'; x.fillRect(wx, wy, 5, 6); } px += w + 4; }
        const tex = new T.CanvasTexture(c);
        for (const s of [-1, 1]) {
          const f = new T.Mesh(new T.PlaneGeometry(D - 2, 3), new T.MeshBasicMaterial({ map:tex }));
          f.position.set(s * (W / 2 - 0.02), 2.3, 0); f.rotation.y = -s * Math.PI / 2; raum.add(f);
          for (let i = 0; i <= 6; i++) raum.add(box(0.08, 3.1, 0.1, th.akzent, s * (W / 2 - 0.06), 2.3, -D / 2 + 1 + i * (D - 2) / 6));
        }
        for (const x2 of [-12, -4, 4, 12]) for (const z of [-11.5, 11.5]) { raum.add(zyl(0.3, 0.3, H, 0xf5f0e6, x2, H / 2, z, 16)); raum.add(zyl(0.38, 0.38, 0.2, th.akzent, x2, 0.1, z, 16)); raum.add(zyl(0.38, 0.38, 0.2, th.akzent, x2, H - 0.1, z, 16)); }
        for (const [x2, z] of [[-6, 2], [6, 2]]) {
          const k = new T.Group(); k.position.set(x2, 4.3, z);
          k.add(zyl(0.6, 0.3, 0.3, th.akzent, 0, 0, 0, 16));
          for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const t2 = teil(geo('OctahedronGeometry', 0.07), leucht(0xfffde7), Math.cos(a) * 0.55, -0.3, Math.sin(a) * 0.55); k.add(t2); }
          const sc = schein(0xfff3c4, 2.4); sc.material.opacity = 0.3; sc.position.y = -0.2; k.add(sc);
          raum.add(k);
        }
        for (const [x2, z] of [[-16, 11], [16, 11], [-16, -2], [16, -2]]) { raum.add(zyl(0.3, 0.25, 0.6, 0xfafafa, x2, 0.3, z, 12)); raum.add(kugel(0.55, 0x2e7d32, x2, 1.1, z, 10)); }
        const s = schild('GOLDENES PENTHOUSE', { w:1024, h:160, breite:7, gr:110, farbe:'#ffe082', glow:'#ffb300' }); s.position.set(0, 4.1, 11.75); s.rotation.y = Math.PI; raum.add(s);
      }
    }

    function podiumBauen(th, D) {
      const z0 = -D / 2;
      raum.add(box(5, 0.3, 2.4, th.wand2, 0, 0.15, z0 + 1.4));
      raum.add(box(5.1, 0.05, 2.5, th.akzent, 0, 0.31, z0 + 1.4));
      // Schreibtisch
      raum.add(box(2.2, 0.85, 0.8, 0x3e2414, 0, 0.3 + 0.425, z0 + 1.9));
      raum.add(box(2.3, 0.06, 0.9, th.akzent, 0, 0.3 + 0.88, z0 + 1.9));
      raum.add(chips(9, -0.8, 1.22, z0 + 1.8));
      // Anzeigetafel
      const [c, x] = leinwand(1024, 384);
      tafelCtx = x; tafelTex = new T.CanvasTexture(c);
      tafel = new T.Mesh(new T.PlaneGeometry(6, 2.25), new T.MeshBasicMaterial({ map:tafelTex }));
      tafel.position.set(0, 3.55, z0 + 0.075); raum.add(tafel);   // vor dem Rahmen (der reicht bis z0 + 0.05)
      raum.add(box(6.3, 2.5, 0.08, 0x111111, 0, 3.55, z0 + 0.01));
      // Don Flosse
      don = F.donFlosse(); don.position.set(0, 0.3, z0 + 1.2); raum.add(don);
      // Aufzug
      const az = new T.Group(); az.position.set(-6.5, 0, z0 + 0.05);
      az.add(box(2.4, 3.2, 0.1, th.akzent, 0, 1.6, 0));
      for (const s of [-1, 1]) az.add(box(1.0, 2.8, 0.06, 0x9e9e9e, s * 0.52, 1.45, 0.06));
      const pfeil = schild('▼ ' + ['1', '2', '3', 'P'][etage], { breite:0.8, gr:90, farbe:'#ff5252', grund:'#111' }); pfeil.position.set(0, 3.0, 0.08); az.add(pfeil);
      raum.add(az);
    }
    function pfandhausBauen(th) {
      const p = L.PFANDHAUS;
      const g = new T.Group(); g.position.set(p.x - 0.9, 0, p.z - 0.9);
      g.add(box(3.2, 1.1, 0.7, 0x4e342e, 0.3, 0.55, 0.6));
      g.add(box(3.3, 0.06, 0.8, th.akzent, 0.3, 1.13, 0.6));
      g.add(box(0.7, 1.1, 2.2, 0x4e342e, 1.85, 0.55, -0.4));
      for (let i = 0; i < 4; i++) g.add(box(2.6, 0.04, 0.5, 0x6d4c41, 0.1, 0.9 + i * 0.55, -0.9));
      const sachen = [[0xe8b923, 'kugel'], [0x8d6e63, 'box'], [0xb0bec5, 'zyl'], [0xd32f2f, 'box'], [0x4fc3f7, 'kugel']];
      sachen.forEach(([f, a], i) => { const y = 1.05 + (i % 3) * 0.55, x = -0.9 + i * 0.5; g.add(a === 'kugel' ? kugel(0.12, f, x, y, -0.9, 8) : a === 'zyl' ? zyl(0.08, 0.08, 0.3, f, x, y + 0.1, -0.9, 8) : box(0.2, 0.2, 0.2, f, x, y + 0.05, -0.9)); });
      const s = schild('PFANDHAUS ELSTER', { w:1024, h:150, breite:3.2, gr:96, farbe:'#ffe082', grund:'#3e2723' }); s.position.set(0.3, 2.9, 1.0); g.add(s);
      elster = F.elster(); elster.position.set(0.2, 0, 0); elster.rotation.y = 0; g.add(elster);
      raum.add(g);
    }

    /* ---------- Anzeigetafel über Don Flosse ---------- */
    let tafelSchluessel = '';
    function tafelMalen(z, zeit) {
      if (!tafelCtx || !z) return;
      const sch = [z.bank, z.quote, Math.ceil(zeit), z.tag, z.mahnungen, z.phase].join('|');
      if (sch === tafelSchluessel) return;
      tafelSchluessel = sch;
      const x = tafelCtx;
      x.fillStyle = '#07090d'; x.fillRect(0, 0, 1024, 384);
      x.textBaseline = 'middle';
      x.font = '700 40px "Barlow Semi Condensed",sans-serif'; x.fillStyle = '#90a4ae'; x.textAlign = 'left';
      x.fillText(`TAG ${z.tag}/${z.tage} · ${L.ETAGEN[z.etage].name.toUpperCase()}`, 36, 46);
      x.textAlign = 'right'; x.fillStyle = z.mahnungen ? '#ff5252' : '#90a4ae';
      x.fillText('MAHNUNGEN ' + '●'.repeat(z.mahnungen) + '○'.repeat(Math.max(0, 3 - z.mahnungen)), 988, 46);
      const ok = z.bank >= z.quote;
      x.textAlign = 'left'; x.font = '800 120px "Barlow Semi Condensed",sans-serif'; x.fillStyle = ok ? '#69f0ae' : '#ffd54f';
      x.fillText(L.zahl(z.bank) + ' $', 36, 170);
      x.font = '700 46px "Barlow Semi Condensed",sans-serif'; x.fillStyle = '#eceff1';
      x.fillText('RATE HEUTE: ' + L.zahl(z.quote) + ' $', 36, 270);
      x.fillStyle = '#263238'; x.fillRect(36, 318, 952, 30);
      x.fillStyle = ok ? '#69f0ae' : '#ffb300'; x.fillRect(36, 318, 952 * Math.min(1, z.bank / z.quote), 30);
      const m = Math.floor(zeit / 60), s = Math.floor(zeit % 60);
      x.textAlign = 'right'; x.font = '800 110px "Barlow Semi Condensed",sans-serif'; x.fillStyle = zeit < 30 && z.phase === 'tag' ? '#ff5252' : '#eceff1';
      x.fillText(`${m}:${String(s).padStart(2, '0')}`, 988, 175);
      tafelTex.needsUpdate = true;
    }

    /* ---------- Tische ---------- */
    let tischSchluessel = '';
    function tischeSetzen(liste, heiss) {
      const sch = liste.map(t => t.id).join(',');
      if (sch !== tischSchluessel) {
        tischSchluessel = sch;
        leeren(tischGr); tische.clear();
        liste.forEach((t, i) => {
          const g = (MODELLE[t.art] || MODELLE.slots)(thema, i);
          g.position.set(t.x, 0, t.z);
          schattenSetzen(g);
          tischGr.add(g);
          const hochModell = ['rad', 'rakete', 'plinko', 'turm', 'keno'].includes(t.art);
          const lampe = G.tischLicht(thema, RADIUS[t.art] || 1.2, hochModell ? 4.75 : 4.1);
          lampe.position.set(t.x, 0, t.z); tischGr.add(lampe);
          const sp = S.G[t.art];
          const schildS = F.textSprite(`${sp.icon} ${sp.name}`, { gr:44, grund:'rgba(10,10,14,.78)', farbe:'#fff', hoehe:0.42 });
          const hoch = { rakete:3.9, rad:3.9, plinko:3.6, turm:3.6, keno:3.3, enten:2.9, los:3.1, wuerfel:2.6, hilo:2.7 }[t.art] || 2.55;
          schildS.position.set(t.x, hoch, t.z); tischGr.add(schildS);
          const limit = F.textSprite('max ' + L.zahl(t.max) + ' $', { gr:30, grund:'rgba(10,10,14,.6)', farbe:'#ffd54f', hoehe:0.24 });
          limit.position.set(t.x, hoch - 0.36, t.z); tischGr.add(limit);
          const glut = new T.Mesh(new T.RingGeometry((RADIUS[t.art] || 1.2) + 0.3, (RADIUS[t.art] || 1.2) + 0.55, 40), new T.MeshBasicMaterial({ color:0xff6d00, transparent:true, opacity:0.8, side:T.DoubleSide }));
          glut.rotation.x = -Math.PI / 2; glut.position.set(t.x, 0.02, t.z); glut.visible = false; tischGr.add(glut);
          tische.set(t.id, { g, art:t.art, x:t.x, z:t.z, schild:schildS, limitS:limit, glut, sitze:sitzplaetze(t.art, sp.plaetze), letzteNr:{} });
        });
      }
      for (const [id, t] of tische) t.glut.visible = !!(heiss && heiss.tisch === id);
    }

    /* ---------- Figuren ---------- */
    function figurHolen(sp) {
      let f = figuren.get(sp.id);
      if (!f || f.tier !== sp.tier) {
        if (f) figurGr.remove(f.g, f.name);
        const g = F.tier(sp.tier);
        schattenSetzen(g);
        const name = F.textSprite(sp.name, { gr:36, grund:'rgba(0,0,0,.55)', hoehe:0.26 });
        figurGr.add(g, name);
        f = { g, name, tier:sp.tier, x:sp.x || 0, z:sp.z || 0, r:0, zx:sp.x || 0, zz:sp.z || 0, zr:0, nameText:sp.name };
        figuren.set(sp.id, f);
      }
      if (f.nameText !== sp.name) { figurGr.remove(f.name); f.name = F.textSprite(sp.name, { gr:36, grund:'rgba(0,0,0,.55)', hoehe:0.26 }); figurGr.add(f.name); f.nameText = sp.name; }
      return f;
    }
    function figurenAbgleichen(spieler) {
      const da = new Set();
      for (const sp of spieler) {
        if (sp.weg) continue; da.add(sp.id); const f = figurHolen(sp); f.g.pfand(sp.pfand); f.tisch = sp.tisch; f.spielt = !!sp.tisch;
        const hand = sp.hand != null ? sp.items[sp.hand] : null;
        if (f.hand !== (hand || null)) { f.hand = hand || null; f.g.itemHalten(hand && KHItems.hat(hand) ? KHItems.modell(hand) : null); }
      }
      for (const [id, f] of figuren) if (!da.has(id)) { figurGr.remove(f.g, f.name); figuren.delete(id); }
    }
    function figurZiel(id, x, z, r, sofort) {
      const f = figuren.get(id); if (!f) return;
      f.zx = x; f.zz = z; f.zr = r;
      if (sofort) { f.x = x; f.z = z; f.r = r; }
    }

    /* ---------- Effekte ---------- */
    const statuen = [];
    function statuenSetzen(liste) {
      while (statuen.length > liste.length) effektGr.remove(statuen.pop());
      while (statuen.length < liste.length) {
        const g = new T.Group();
        g.add(box(0.5, 0.2, 0.5, 0x9e9e9e, 0, 0.1, 0));
        const k = box(0.36, 0.7, 0.3, 0xbdbdbd, 0, 0.55, 0); g.add(k);
        g.add(box(0.4, 0.14, 0.34, 0x9e9e9e, 0, 0.98, 0.02));
        g.add(box(0.08, 0.2, 0.06, 0x757575, 0, 0.62, 0.18));
        const ring = new T.Mesh(new T.RingGeometry(4.8, 5, 64), new T.MeshBasicMaterial({ color:0x80d8ff, transparent:true, opacity:0.55, side:T.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
        const sc = schein(0x80d8ff, 2.2); sc.position.y = 1.2; g.add(sc);
        schattenSetzen(g); effektGr.add(g); statuen.push(g);
      }
      liste.forEach((s, i) => statuen[i].position.set(s.x, 0, s.z));
    }

    /* ---------- Kamera ---------- */
    const kam = { x:0, y:6, z:-16, lx:0, ly:1, lz:0 };
    function kameraZiel(px, pz, yaw, abstand, hoehe, fokus) {
      let cx = px - Math.sin(yaw) * abstand, cz = pz - Math.cos(yaw) * abstand;
      // im Raum halten; was an der Wand an Abstand fehlt, geht in die Höhe (Blick mehr von oben)
      const ox = cx, oz = cz;
      cx = Math.max(-L.RAUM.x + 0.6, Math.min(L.RAUM.x - 0.6, cx));
      cz = Math.max(-L.RAUM.z + 0.6, Math.min(L.RAUM.z - 0.6, cz));
      const fehlt = Math.hypot(ox - cx, oz - cz);
      return { x:cx, y:Math.min(4.9, hoehe + fehlt * 0.7), z:cz, lx:fokus ? fokus.x : px, ly:fokus ? fokus.y : 1.4, lz:fokus ? fokus.z : pz };
    }

    /* ---------- Rendern ---------- */
    let t = 0;
    function rendern(dt, o) {
      t += dt;
      // Figuren gleiten zu ihren Zielen
      for (const [id, f] of figuren) {
        const eigene = id === o.ich;
        const k = eigene ? 1 : Math.min(1, dt * 10);
        const vx = f.zx - f.x, vz = f.zz - f.z;
        f.x += vx * k; f.z += vz * k;
        let dr = f.zr - f.r; while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2;
        f.r += dr * Math.min(1, dt * 12);
        const tempo = eigene ? o.tempo : Math.min(1, Math.hypot(vx, vz) * 4);
        f.g.position.set(f.x, 0, f.z); f.g.rotation.y = f.r;
        if (o.betrunken && eigene) f.g.rotation.z = Math.sin(t * 2) * 0.08; else f.g.rotation.z = 0;
        f.g.animieren(dt, tempo, f.spielt, t + f.x);
        f.name.position.set(f.x, 2.0 * (f.g.skala / 1.5) + 0.05, f.z);
        f.name.visible = !eigene;
      }
      // Tische animieren
      for (const [id, tt] of tische) {
        const info = o.tischInfo ? o.tischInfo(id) : { alle:[], frischIds:new Set() };
        tt.g.animieren && tt.g.animieren(dt, t, info);
        const nah = Math.hypot(kam.x - tt.x, kam.z - tt.z), sicht = Math.max(0, Math.min(1, (nah - 3) / 2.5));
        tt.schild.visible = tt.limitS.visible = id !== o.meinTisch && sicht > 0.02;
        tt.schild.material.opacity = tt.limitS.material.opacity = sicht;
        if (tt.glut.visible) tt.glut.material.opacity = 0.5 + Math.sin(t * 6) * 0.3;
      }
      if (don) don.animieren(dt, t, o.donLaune);
      if (staubP && bloomAn) staubP.animieren(dt, t);
      if (reihe) reihe.animieren(t);
      if (theke) theke.animieren(dt, t);
      fx.animieren(dt);
      if (elster) elster.animieren(dt, t);
      if (raum.userData.kugeln) raum.userData.kugeln.forEach(k => k.rotation.y += dt * 0.8);
      if (aquarium && Math.floor(t * 20) !== aquarium._f) {
        aquarium._f = Math.floor(t * 20);
        const { x } = aquarium;
        const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#1b8ab0'); gr.addColorStop(1, '#063a52'); x.fillStyle = gr; x.fillRect(0, 0, 1024, 256);
        for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,255,255,.05)'; x.beginPath(); x.moveTo(i * 200 + Math.sin(t + i) * 30, 0); x.lineTo(i * 200 + 80 + Math.sin(t + i) * 30, 0); x.lineTo(i * 200 + 20, 256); x.lineTo(i * 200 - 40, 256); x.fill(); }
        for (const f of aquarium.fische) {
          f.x = (f.x + f.v * 0.05) % 1100;
          const fx = f.x - 40, fy = f.y + Math.sin(t * 2 + f.v) * 6;
          x.fillStyle = f.f;
          if (f.r) { x.fillStyle = '#78909c'; x.beginPath(); x.ellipse(fx, fy, f.gr * 1.8, f.gr * 0.6, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(fx, fy - f.gr * 0.5); x.lineTo(fx - 6, fy - f.gr * 1.2); x.lineTo(fx + 8, fy - f.gr * 0.5); x.fill(); }
          else { x.beginPath(); x.ellipse(fx, fy, f.gr, f.gr * 0.55, 0, 0, 7); x.fill(); }
          x.beginPath(); x.moveTo(fx - f.gr * (f.r ? 1.7 : 0.9), fy); x.lineTo(fx - f.gr * (f.r ? 2.4 : 1.5), fy - f.gr * 0.5); x.lineTo(fx - f.gr * (f.r ? 2.4 : 1.5), fy + f.gr * 0.5); x.fill();
          x.fillStyle = '#111'; x.beginPath(); x.arc(fx + f.gr * (f.r ? 1.2 : 0.55), fy - 2, 2.5, 0, 7); x.fill();
        }
        x.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 20; i++) { const bx = (i * 97) % 1024, by = 256 - ((t * 30 + i * 53) % 256); x.beginPath(); x.arc(bx, by, 2 + (i % 3), 0, 7); x.fill(); }
        aquarium.tex.needsUpdate = true;
      }
      tafelMalen(o.z, o.zeit);
      // Kamera weich nachführen
      const ziel = o.kamera;
      if (ziel) {
        const k = o.kameraSofort ? 1 : Math.min(1, dt * (o.kameraSchnell ? 12 : 5));
        for (const a of ['x', 'y', 'z', 'lx', 'ly', 'lz']) kam[a] += (ziel[a] - kam[a]) * k;
      }
      kamera.position.set(kam.x, kam.y, kam.z);
      kamera.lookAt(kam.lx, kam.ly, kam.lz);
      if (nach && bloomAn) nach.render(); else renderer.render(szene, kamera);
    }

    const v3 = new T.Vector3();
    function projizieren(x, y, z) {
      v3.set(x, y, z).project(kamera);
      if (v3.z > 1) return null;
      return { x:(v3.x + 1) / 2 * canvas.clientWidth, y:(1 - v3.y) / 2 * canvas.clientHeight };
    }
    function grafik(stufe) {
      pixel = stufe === 'niedrig' ? 0.75 : stufe === 'mittel' ? Math.min(1.25, window.devicePixelRatio || 1) : Math.min(2, window.devicePixelRatio || 1);
      renderer.setPixelRatio(pixel);
      bloomAn = !!nach && stufe !== 'niedrig';
      renderer.shadowMap.enabled = stufe === 'hoch';   // Schatten nur auf Hoch (verdoppeln die Zeichenaufrufe)
      const gr = stufe === 'hoch' ? 2048 : 1024;
      if (licht.sonne.shadow.mapSize.x !== gr) { licht.sonne.shadow.mapSize.set(gr, gr); if (licht.sonne.shadow.map) { licht.sonne.shadow.map.dispose(); licht.sonne.shadow.map = null; } }
      if (staubP) staubP.visible = stufe !== 'niedrig';
      szene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
      groesse();
    }

    return {
      etageBauen, tischeSetzen, figurenAbgleichen, figurZiel, statuenSetzen, rendern, projizieren, kameraZiel, grafik, groesse,
      muenzregen:fx.muenzregen, konfetti:fx.konfetti,
      figuren, tische, kamera, RADIUS, sitzplaetze, get etage() { return etage; }
    };
  }

  window.KHWelt = { Welt, THEMEN, RADIUS, sitzplaetze };
})();

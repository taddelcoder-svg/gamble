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
  // Textur aus Canvas-Zeichenfunktion (x, Breite, Höhe)
  function tex(w, h, malen) { const [c, x] = leinwand(w, h); malen(x, w, h); const t = new T.CanvasTexture(c); t.anisotropy = 8; return t; }
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
    const k = hoch / 1.75;                                        // Höhenfaktor (Keno ist etwas niedriger)
    const koerperM = new T.MeshStandardMaterial({ color:farbe, roughness:0.28, metalness:0.35, envMapIntensity:1.1 });
    const chrom = new T.MeshStandardMaterial({ color:0xdfe3ea, roughness:0.12, metalness:1, envMapIntensity:1.4 });
    const goldM = new T.MeshStandardMaterial({ color:0xe2b33c, roughness:0.2, metalness:1, envMapIntensity:1.4 });
    // Seitenprofil (x = Tiefe, y = Höhe) mit geschwungener Krone, Pult-Vorsprung und Fuß
    const sh = new T.Shape();
    sh.moveTo(0.4, 0); sh.lineTo(0.4, 1.78 * k); sh.quadraticCurveTo(0.4, 2.02 * k, 0.1, 2.02 * k); sh.lineTo(-0.2, 2.02 * k); sh.quadraticCurveTo(-0.375, 2.02 * k, -0.375, 1.84 * k);
    sh.lineTo(-0.375, 0.98); sh.lineTo(-0.52, 0.92); sh.lineTo(-0.52, 0.8); sh.lineTo(-0.375, 0.74); sh.lineTo(-0.375, 0.1); sh.lineTo(-0.42, 0.1); sh.lineTo(-0.42, 0);
    sh.closePath();
    const eg = new T.ExtrudeGeometry(sh, { depth:0.8, bevelEnabled:true, bevelThickness:0.04, bevelSize:0.04, bevelOffset:-0.04, bevelSegments:4, curveSegments:16 });
    eg.translate(0, 0, -0.4);
    const kor = new T.Mesh(eg, koerperM); kor.rotation.y = -Math.PI / 2; g.add(kor);
    // Chrom-Zierleisten an den Vorderkanten und am Fuß
    for (const s2 of [-1, 1]) {
      const l = new T.Mesh(geo('CylinderGeometry', 0.018, 0.018, 1.0 * k, 10), chrom); l.position.set(s2 * 0.435, 1.28 * k + 0.35, -0.37); g.add(l);
      const o = new T.Mesh(geo('SphereGeometry', 0.03, 12, 8), chrom); o.position.set(s2 * 0.435, 1.28 * k + 0.35 + 0.5 * k, -0.37); g.add(o);
    }
    const sockel = new T.Mesh(geo('BoxGeometry', 0.92, 0.1, 0.1), chrom); sockel.position.set(0, 0.08, -0.42); g.add(sockel);
    // Auszahlschale mit Münzen
    const schale = new T.Mesh(geo('BoxGeometry', 0.5, 0.2, 0.04), new T.MeshStandardMaterial({ color:0x0a0a0c, roughness:0.4, metalness:0.6 })); schale.position.set(0, 0.42, -0.4); g.add(schale);
    const kante = new T.Mesh(geo('BoxGeometry', 0.54, 0.025, 0.05), chrom); kante.position.set(0, 0.33, -0.41); g.add(kante);
    for (let i = 0; i < 4; i++) { const m = new T.Mesh(geo('CylinderGeometry', 0.045, 0.045, 0.008, 16), goldM); m.rotation.x = Math.PI / 2; m.position.set(-0.12 + i * 0.08, 0.4, -0.42); g.add(m); }
    // Knopfpult: Reihe leuchtender Tasten und Münzschlitz
    const farben = [0xe53935, 0xfdd835, 0x43a047, 0x1e88e5, 0xe53935];
    farben.forEach((f, i) => {
      const b = new T.Mesh(geo('CylinderGeometry', 0.05, 0.055, 0.03, 20), new T.MeshStandardMaterial({ color:f, emissive:f, emissiveIntensity:0.55, roughness:0.2, metalness:0.1 }));
      b.position.set(-0.28 + i * 0.14, 0.935, -0.47); g.add(b);
      const r = new T.Mesh(geo('TorusGeometry', 0.056, 0.008, 8, 24), chrom); r.rotation.x = Math.PI / 2; r.position.set(-0.28 + i * 0.14, 0.94, -0.47); g.add(r);
    });
    const schlitz = new T.Mesh(geo('BoxGeometry', 0.1, 0.02, 0.01), new T.MeshBasicMaterial({ color:0x000000 })); schlitz.position.set(0.33, 0.9, -0.376); g.add(schlitz);
    // Glühbirnen-Rahmen um Bildschirm und Schild
    const bulb = new T.InstancedMesh(geo('SphereGeometry', 0.022, 10, 8), new T.MeshBasicMaterial({ color:0xffffff }), 40);
    const m4 = new T.Matrix4(); let n = 0;
    const rahmen = (cx, cy, w, h) => { const st = 0.1; for (let x = -w / 2; x <= w / 2 + 1e-6; x += st * 1.5) { m4.makeTranslation(cx + x, cy + h / 2, -0.395); bulb.setMatrixAt(n++, m4); m4.makeTranslation(cx + x, cy - h / 2, -0.395); bulb.setMatrixAt(n++, m4); } for (let y = -h / 2 + st; y < h / 2 - 0.01; y += st) { m4.makeTranslation(cx - w / 2, cy + y, -0.395); bulb.setMatrixAt(n++, m4); m4.makeTranslation(cx + w / 2, cy + y, -0.395); bulb.setMatrixAt(n++, m4); } };
    rahmen(0, 1.3 * k + 0.0, 0.8, 0.42);
    bulb.count = Math.min(n, 40); g.add(bulb);
    g.bulb = bulb; g.bulbFarbe = th.neon[0];
    // Goldrahmen um das Schild oben
    const rahm = new T.Mesh(geo('BoxGeometry', 0.86, 0.3, 0.03), goldM); rahm.position.set(0, 1.92 * k, -0.37); g.add(rahm);
    const innen = new T.Mesh(geo('BoxGeometry', 0.78, 0.22, 0.032), new T.MeshStandardMaterial({ color:0x0b0a10, roughness:0.4 })); innen.position.set(0, 1.92 * k, -0.378); g.add(innen);
    g.hoehe = hoch;
    return g;
  }
  function chips(n, x, y, z) {
    const g = new T.Group();
    const f = [0xd32f2f, 0x1976d2, 0x388e3c, 0x111111, 0xfbc02d];
    for (let i = 0; i < n; i++) { const c = zyl(0.06, 0.06, 0.025, f[i % 5], x + (i % 3) * 0.14, y + Math.floor(i / 3) * 0.026, z, 12); g.add(c); }
    return g;
  }

  const MODELLE = {};

  const GOLD = () => new T.MeshStandardMaterial({ color:0xe2b33c, roughness:0.2, metalness:1, envMapIntensity:1.4 });
  const CHROM = () => new T.MeshStandardMaterial({ color:0xdfe3ea, roughness:0.12, metalness:1, envMapIntensity:1.4 });
  function rrect(w, h, r) { const sh = new T.Shape(); const x = -w / 2, y = -h / 2; sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return sh; }
  // Abgerundeter Quader (liegend: Breite x, Tiefe z, Höhe y), Unterkante bei y = 0
  function rquader(w, d, h, r, mat) { const g = new T.ExtrudeGeometry(rrect(w, d, r), { depth:h, bevelEnabled:false, curveSegments:10 }); g.rotateX(-Math.PI / 2); const m = new T.Mesh(g, mat); return m; }
  const ein = (eltern, o) => { eltern.add(o); return o; };

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
      if (g.bulb) { const ph = Math.floor(t * 4) % 2; g.bulb.material.color.setHex(ph ? 0xffffff : g.bulbFarbe); }
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
    const marmor = new T.MeshStandardMaterial({ color:0xeae6de, roughness:0.25, metalness:0.05 });
    g.add(new T.Mesh(new T.LatheGeometry([[0.62, 0], [0.62, 0.08], [0.45, 0.14], [0.36, 0.3], [0.36, 0.78], [0.46, 0.86], [0.6, 0.9], [0.6, 0.96], [0.0001, 0.96]].map(([r, y]) => new T.Vector2(r, y)), 40), marmor));
    for (const y of [0.1, 0.9]) { const r = new T.Mesh(geo('TorusGeometry', y < 0.5 ? 0.6 : 0.6, 0.025, 8, 36), GOLD()); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
    const kissen = new T.Mesh(new T.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color:0x8e1b2b, roughness:0.85 })); kissen.scale.set(1, 0.32, 1); kissen.position.y = 0.96; g.add(kissen);
    const kord = new T.Mesh(geo('TorusGeometry', 0.5, 0.025, 8, 36), GOLD()); kord.rotation.x = Math.PI / 2; kord.position.y = 0.97; g.add(kord);
    const muenze = new T.Group(); muenze.position.y = 1.45; g.add(muenze);
    const prof = [[0.0001, -0.035], [0.36, -0.035], [0.41, -0.02], [0.42, 0], [0.41, 0.02], [0.36, 0.035], [0.0001, 0.035]].map(([r, y]) => new T.Vector2(r, y));
    const m = new T.Mesh(new T.LatheGeometry(prof, 48), GOLD()); m.rotation.x = Math.PI / 2; muenze.add(m);
    for (const sgn of [-1, 1]) { const ring = new T.Mesh(geo('TorusGeometry', 0.33, 0.012, 8, 40), GOLD()); ring.position.z = sgn * 0.037; muenze.add(ring); }
    const [c, x] = leinwand(128, 128);
    x.fillStyle = '#f4c542'; x.fillRect(0, 0, 128, 128); x.font = '80px "Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🦈', 64, 70);
    const vorne = new T.Mesh(new T.CircleGeometry(0.38, 28), new T.MeshStandardMaterial({ map:new T.CanvasTexture(c), metalness:0.8, roughness:0.3 })); vorne.position.z = -0.032; vorne.rotation.y = Math.PI; muenze.add(vorne);
    const [c2, x2] = leinwand(128, 128);
    x2.fillStyle = '#f4c542'; x2.fillRect(0, 0, 128, 128); x2.fillStyle = '#7a5a10'; x2.font = '800 70px "Barlow Semi Condensed",sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText('$', 64, 68);
    const hinten = new T.Mesh(new T.CircleGeometry(0.38, 28), new T.MeshStandardMaterial({ map:new T.CanvasTexture(c2), metalness:0.8, roughness:0.3 })); hinten.position.z = 0.032; muenze.add(hinten);
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
    const holzM = new T.MeshStandardMaterial({ color:0x3a2314, roughness:0.35, metalness:0.1 });
    const leder = new T.MeshStandardMaterial({ color:0x1c120d, roughness:0.38, metalness:0.05 });
    const filz = tex(512, 384, (x, w, h) => { x.fillStyle = '#17703f'; x.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { x.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.06 + ')'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } x.strokeStyle = 'rgba(255,241,193,.75)'; x.lineWidth = 5; x.strokeRect(30, 30, w - 60, h - 60); x.fillStyle = 'rgba(255,241,193,.8)'; x.font = '800 54px "Barlow Semi Condensed",sans-serif'; x.textAlign = 'center'; x.fillText('PASS', w / 2, 120); x.font = '700 28px "Barlow Semi Condensed",sans-serif'; x.fillText('7 · 11 gewinnt   ·   2 · 3 · 12 verliert', w / 2, 330); x.strokeStyle = 'rgba(255,241,193,.4)'; x.lineWidth = 2; x.beginPath(); x.ellipse(w / 2, h / 2 + 10, 150, 70, 0, 0, 7); x.stroke(); });
    const rahmen = rquader(2.0, 1.3, 0.78, 0.45, holzM); g.add(rahmen);
    const top = rquader(1.78, 1.08, 0.06, 0.36, new T.MeshStandardMaterial({ map:filz, roughness:0.95 })); top.position.y = 0.8; g.add(top);
    const rail = new T.Mesh(new T.ExtrudeGeometry((() => { const sh = rrect(2.08, 1.38, 0.5); sh.holes.push(rrect(1.7, 1.0, 0.32)); return sh; })(), { depth:0.12, bevelEnabled:true, bevelSize:0.03, bevelThickness:0.03, bevelSegments:4, curveSegments:10 }), leder); rail.geometry.rotateX(-Math.PI / 2); rail.position.y = 0.76; g.add(rail);
    const gr = new T.Mesh(new T.ExtrudeGeometry((() => { const sh = rrect(2.14, 1.44, 0.52); sh.holes.push(rrect(2.1, 1.4, 0.5)); return sh; })(), { depth:0.02, bevelEnabled:false, curveSegments:10 }), GOLD()); gr.geometry.rotateX(-Math.PI / 2); gr.position.y = 0.62; g.add(gr);
    for (const sx of [-0.7, 0.7]) for (const sz of [-0.4, 0.4]) { const b = new T.Mesh(geo('CylinderGeometry', 0.09, 0.12, 0.62, 16), holzM); b.position.set(sx, 0.31, sz); g.add(b); const f = new T.Mesh(geo('CylinderGeometry', 0.13, 0.13, 0.03, 16), GOLD()); f.position.set(sx, 0.015, sz); g.add(f); }
    g.add(chips(5, -0.75, 0.88, 0.32)); g.add(chips(4, 0.7, 0.88, -0.3));
    const wand = schild('WÜRFEL', { breite:1.9, gr:110, farbe:'#fff3c4', grund:'#1b1426', glow:'#ff4081' }); wand.position.set(0, 1.62, 0.78); wand.rotation.y = Math.PI; g.add(wand);
    const rah = new T.Mesh(geo('BoxGeometry', 2.0, 0.62, 0.04), GOLD()); rah.position.set(0, 1.62, 0.8); g.add(rah);
    for (const sx of [-0.9, 0.9]) { const p = new T.Mesh(geo('CylinderGeometry', 0.025, 0.025, 0.9, 10), GOLD()); p.position.set(sx, 1.2, 0.8); g.add(p); }
    const wuerfel = [];
    const augen = n => { const [c, x] = leinwand(64, 64); x.fillStyle = '#f6efdc'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#c62828'; const P = { 1:[[32, 32]], 2:[[16, 16], [48, 48]], 3:[[16, 16], [32, 32], [48, 48]], 4:[[16, 16], [48, 16], [16, 48], [48, 48]], 5:[[16, 16], [48, 16], [32, 32], [16, 48], [48, 48]], 6:[[16, 14], [48, 14], [16, 32], [48, 32], [16, 50], [48, 50]] }[n]; for (const [a, b] of P) { x.beginPath(); x.arc(a, b, 6, 0, 7); x.fill(); } const t2 = new T.CanvasTexture(c); return new T.MeshStandardMaterial({ map:t2, roughness:0.22, metalness:0.05 }); };
    const mats6 = [1, 6, 2, 5, 3, 4].map(augen);
    for (const s of [-1, 1]) { const w = new T.Mesh(geo('BoxGeometry', 0.2, 0.2, 0.2), mats6); w.position.set(s * 0.22, 0.93, 0); g.add(w); wuerfel.push(w); }
    // Drehung, die eine bestimmte Zahl nach oben bringt (Reihenfolge der Seiten: +x,-x,+y,-y,+z,-z = 1,6,2,5,3,4)
    const OBEN = { 1:[0, 0, Math.PI / 2], 6:[0, 0, -Math.PI / 2], 2:[0, 0, 0], 5:[Math.PI, 0, 0], 3:[-Math.PI / 2, 0, 0], 4:[Math.PI / 2, 0, 0] };
    let roll = 0;
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      if (s && s.nr && s.nr !== g._nr) { g._nr = s.nr; if (info.frisch) roll = 1.1; g._w = s.wurf; }
      if (roll > 0) {
        roll -= dt;
        wuerfel.forEach((w, i) => { w.rotation.x += dt * (14 + i * 3); w.rotation.z += dt * (11 + i * 5); w.position.y = 0.93 + Math.abs(Math.sin(roll * 9)) * 0.25 * roll; });
        if (roll <= 0 && g._w) wuerfel.forEach((w, i) => { const o = OBEN[g._w[i]]; w.rotation.set(o[0], i * 0.6, o[2]); w.position.y = 0.93; });
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
    const holzM = new T.MeshStandardMaterial({ color:0x3a2314, roughness:0.35, metalness:0.1 });
    const baize = tex(256, 192, (x, w, h) => { x.fillStyle = '#1b6b3c'; x.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { x.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.06 + ')'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } x.strokeStyle = 'rgba(255,241,193,.7)'; x.lineWidth = 3; x.strokeRect(14, 14, w - 28, h - 28); });
    g.add(rquader(1.3, 0.9, 0.72, 0.1, holzM));
    const top = rquader(1.24, 0.84, 0.05, 0.08, new T.MeshStandardMaterial({ map:baize, roughness:0.95 })); top.position.y = 0.73; g.add(top);
    const rim = new T.Mesh(new T.ExtrudeGeometry((() => { const sh = rrect(1.34, 0.94, 0.12); sh.holes.push(rrect(1.2, 0.8, 0.07)); return sh; })(), { depth:0.06, bevelEnabled:true, bevelSize:0.015, bevelThickness:0.015, bevelSegments:3 }), GOLD()); rim.geometry.rotateX(-Math.PI / 2); rim.position.y = 0.71; g.add(rim);
    const becherM = new T.MeshPhysicalMaterial({ color:0xc62828, roughness:0.18, metalness:0.5, clearcoat:1, envMapIntensity:1.3 });
    const bProf = [[0.0001, -0.115], [0.115, -0.115], [0.12, -0.1], [0.095, 0.05], [0.075, 0.115], [0.0001, 0.115]].map(([r, y]) => new T.Vector2(r, y));
    const becher = [];
    for (let i = 0; i < 3; i++) { const b = new T.Mesh(new T.LatheGeometry(bProf, 28), becherM); b.position.set((i - 1) * 0.36, 0.9, 0); const r = new T.Mesh(geo('TorusGeometry', 0.118, 0.008, 6, 24), GOLD()); r.rotation.x = Math.PI / 2; r.position.y = -0.1; b.add(r); g.add(b); becher.push(b); }
    const kug = new T.Mesh(geo('SphereGeometry', 0.045, 20, 14), new T.MeshPhysicalMaterial({ color:0xfffdf5, roughness:0.08, clearcoat:1, envMapIntensity:1.5 })); kug.position.set(0, 0.81, 0); g.add(kug);
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
    const goldM = new T.MeshStandardMaterial({ color:0xe2b33c, roughness:0.2, metalness:1, envMapIntensity:1.4 });
    const chrom = new T.MeshStandardMaterial({ color:0xdfe3ea, roughness:0.12, metalness:1, envMapIntensity:1.4 });
    // Rückwand mit Verlauf und Sternen (selbstleuchtend)
    const [bc, bx] = leinwand(256, 512);
    const gr = bx.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#12082e'); gr.addColorStop(0.55, '#2a0f5a'); gr.addColorStop(1, '#4a1070');
    bx.fillStyle = gr; bx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 90; i++) { bx.fillStyle = 'rgba(255,255,255,' + (0.2 + Math.random() * 0.6) + ')'; bx.fillRect(Math.random() * 256, Math.random() * 512, 1.5, 1.5); }
    const rueck = new T.Mesh(geo('PlaneGeometry', 1.74, 2.34), new T.MeshBasicMaterial({ map:new T.CanvasTexture(bc), color:0xdddddd })); rueck.position.set(0, 1.55, 0.04); rueck.rotation.y = Math.PI; g.add(rueck);
    // Rahmen aus Chrom mit innerem Neonband und goldenen Ecken
    const R = (w, h, x, y) => { const b = new T.Mesh(geo('BoxGeometry', w, h, 0.18), chrom); b.position.set(x, y, 0); g.add(b); };
    R(1.94, 0.1, 0, 2.77); R(1.94, 0.1, 0, 0.33); R(0.1, 2.54, -0.92, 1.55); R(0.1, 2.54, 0.92, 1.55);
    const neonM = new T.MeshBasicMaterial({ color:new T.Color(0xff3df2).multiplyScalar(1.5) });
    const N = (w, h, x, y) => { const b = new T.Mesh(geo('BoxGeometry', w, h, 0.02), neonM); b.position.set(x, y, -0.092); g.add(b); };
    N(1.76, 0.022, 0, 2.7); N(1.76, 0.022, 0, 0.4); N(0.022, 2.32, -0.88, 1.55); N(0.022, 2.32, 0.88, 1.55);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const e = new T.Mesh(geo('SphereGeometry', 0.07, 16, 12), goldM); e.position.set(sx * 0.93, 1.55 + sy * 1.27, -0.09); g.add(e); }
    // Glas davor
    const glasP = new T.Mesh(geo('PlaneGeometry', 1.76, 2.34), new T.MeshPhysicalMaterial({ color:0xffffff, transparent:true, opacity:0.08, roughness:0.02, clearcoat:1, envMapIntensity:2 })); glasP.position.set(0, 1.55, -0.1); glasP.rotation.y = Math.PI; g.add(glasP);
    // Sockel: Marmor-Pult mit Goldleiste
    g.add(box(2.0, 0.6, 0.62, 0x1b1426, 0, 0.3, 0.05)); g.add(box(2.06, 0.05, 0.68, 0xe2b33c, 0, 0.62, 0.05)).material = goldM;
    g.add(box(1.4, 0.18, 0.02, 0x0b0a10, 0, 0.3, -0.27));
    // Stifte aus Chrom
    const stift = new T.InstancedMesh(geo('SphereGeometry', 0.025, 12, 8), chrom, 90);
    let k = 0; const m4 = new T.Matrix4();
    for (let r = 0; r < 12; r++) for (let i = 0; i <= r + 2 && k < 90; i++) { m4.makeTranslation((i - (r + 2) / 2) * 0.12, 2.55 - r * 0.15, -0.03); stift.setMatrixAt(k++, m4); }
    stift.count = k; g.add(stift);
    // Fächer mit Trennern
    const farben = [0xe53935, 0xfb8c00, 0xfdd835, 0x7cb342, 0x26a69a, 0x42a5f5, 0x5c6bc0, 0x42a5f5, 0x26a69a, 0x7cb342, 0xfdd835, 0xfb8c00, 0xe53935];
    for (let i = 0; i < 13; i++) g.add(teilLeucht(box(0.105, 0.08, 0.06, farben[i], (i - 6) * 0.12, 0.62 + 0.0, -0.03)));
    for (let i = 0; i < 14; i++) { const d = new T.Mesh(geo('BoxGeometry', 0.012, 0.2, 0.05), chrom); d.position.set((i - 6.5) * 0.12, 0.74, -0.03); g.add(d); }
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
    const stein = new T.MeshStandardMaterial({ roughness:0.85, metalness:0.05, map:(() => { const [c, x] = leinwand(256, 128); x.fillStyle = '#6b6f80'; x.fillRect(0, 0, 256, 128); for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) { const v = 90 + Math.random() * 40 | 0; x.fillStyle = 'rgb(' + v + ',' + (v + 4) + ',' + (v + 20) + ')'; x.fillRect(q * 32 + (r % 2) * 16 - 16, r * 16 + 1, 30, 14); } const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(4, 1); return t; })() });
    const goldM = new T.MeshStandardMaterial({ color:0xe2b33c, roughness:0.22, metalness:1, envMapIntensity:1.4 });
    const stufen = [];
    // Sockel
    g.add(new T.Mesh(geo('CylinderGeometry', 0.9, 0.95, 0.12, 32), goldM)).position.y = 0.06;
    for (let i = 0; i < 9; i++) {
      const r = 0.62 - i * 0.026, y = 0.12 + i * 0.28;
      const seg = new T.Mesh(new T.CylinderGeometry(r - 0.014, r, 0.28, 36), stein); seg.position.y = y + 0.14; g.add(seg);
      const band = new T.Mesh(new T.TorusGeometry(r - 0.006, 0.014, 8, 36), goldM); band.rotation.x = Math.PI / 2; band.position.y = y + 0.28; g.add(band);
      // Bogenfenster auf der Spielerseite
      const f = new T.Mesh(geo('CircleGeometry', 0.07, 16, 0, Math.PI), leucht(0x37474f)); f.position.set(0, y + 0.18, -r - 0.003); f.rotation.y = Math.PI; g.add(f);
      const unten = new T.Mesh(geo('PlaneGeometry', 0.14, 0.09), leucht(0x37474f)); unten.position.set(0, y + 0.135, -r - 0.003); unten.rotation.y = Math.PI; g.add(unten);
      const rah = new T.Mesh(geo('TorusGeometry', 0.075, 0.008, 6, 16, Math.PI), goldM); rah.position.set(0, y + 0.18, -r - 0.006); g.add(rah);
      stufen.push(f); stufen.push(unten); f.userData.partner = unten;
    }
    // Zinnenkranz
    const rTop = 0.62 - 9 * 0.026 + 0.05;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const z = new T.Mesh(geo('BoxGeometry', 0.13, 0.14, 0.09), stein); z.position.set(Math.cos(a) * rTop, 2.59, Math.sin(a) * rTop); z.rotation.y = -a; g.add(z); }
    g.add(new T.Mesh(geo('CylinderGeometry', rTop + 0.04, rTop + 0.02, 0.07, 32), goldM)).position.y = 2.54;
    // Drache auf dem Turm
    const haut = tex(256, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2fa04a'); gr.addColorStop(1, '#14602a'); x.fillStyle = gr; x.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let q = 0; q < 16; q++) { x.strokeStyle = 'rgba(0,40,10,.45)'; x.beginPath(); x.arc(q * 16 + (r % 2) * 8, r * 16 + 8, 9, 0, Math.PI); x.stroke(); } });
    const dm = new T.MeshStandardMaterial({ map:haut, roughness:0.45, metalness:0.15 });
    const bauchM = new T.MeshStandardMaterial({ color:0xe8d28a, roughness:0.6 });
    const drache = new T.Group(); drache.position.y = 2.66; g.add(drache);
    const koerper = new T.Mesh(geo('SphereGeometry', 0.3, 32, 24), dm); koerper.scale.set(1.1, 0.8, 1.45); drache.add(koerper);
    const bauch = new T.Mesh(geo('SphereGeometry', 0.24, 24, 18), bauchM); bauch.scale.set(0.95, 0.7, 1.35); bauch.position.set(0, -0.06, -0.05); drache.add(bauch);
    // Hals mit Kopf, der sich umsieht
    const kopf = new T.Group(); kopf.position.set(0, 0.2, 0); drache.add(kopf);
    const hals = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0, 0.1), new T.Vector3(0, 0.22, -0.02), new T.Vector3(0, 0.38, -0.2)]), 14, 0.1, 14), dm); kopf.add(hals);
    const kk = new T.Group(); kk.position.set(0, 0.42, -0.24); kopf.add(kk);
    const sk = new T.Mesh(geo('SphereGeometry', 0.14, 24, 18), dm); sk.scale.set(1, 0.85, 1.15); kk.add(sk);
    const sn = new T.Mesh(geo('ConeGeometry', 0.1, 0.24, 20), dm); sn.rotation.x = -Math.PI / 2; sn.scale.set(1.2, 1, 0.8); sn.position.set(0, -0.03, -0.2); kk.add(sn);
    for (const sx of [-1, 1]) {
      const a = new T.Mesh(geo('SphereGeometry', 0.028, 12, 8), new T.MeshBasicMaterial({ color:0xffd43a })); a.position.set(sx * 0.075, 0.04, -0.1); kk.add(a);
      const h = new T.Mesh(geo('ConeGeometry', 0.034, 0.2, 10), new T.MeshStandardMaterial({ color:0xf2ead2, roughness:0.4 })); h.position.set(sx * 0.08, 0.14, 0.04); h.rotation.set(-0.5, 0, -sx * 0.4); kk.add(h);
      const nas = new T.Mesh(geo('SphereGeometry', 0.012, 8, 6), new T.MeshBasicMaterial({ color:0x111111 })); nas.position.set(sx * 0.03, 0.0, -0.31); kk.add(nas);
    }
    for (let i = 0; i < 4; i++) { const z = new T.Mesh(geo('ConeGeometry', 0.012, 0.03, 6), new T.MeshStandardMaterial({ color:0xffffff })); z.rotation.x = Math.PI; z.position.set((i - 1.5) * 0.026, -0.075, -0.24); kk.add(z); }
    // Flügel (Membran zwischen Fingern)
    const fl = () => { const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0.55, 0.25); sh.quadraticCurveTo(0.5, 0.05, 0.62, -0.05); sh.quadraticCurveTo(0.45, -0.02, 0.46, -0.22); sh.quadraticCurveTo(0.3, -0.1, 0.22, -0.3); sh.quadraticCurveTo(0.14, -0.1, 0, 0); return new T.ExtrudeGeometry(sh, { depth:0.01, bevelEnabled:false }); };
    const fm = new T.MeshStandardMaterial({ color:0x1f7a38, roughness:0.5, side:T.DoubleSide, emissive:0x072a10, emissiveIntensity:0.4 });
    const fluegel = [];
    for (const sx of [-1, 1]) { const w = new T.Group(); w.position.set(sx * 0.18, 0.18, 0.08); const m = new T.Mesh(fl(), fm); m.scale.x = sx; w.add(m); w.rotation.set(0.2, sx * 0.6, sx * 0.3); drache.add(w); fluegel.push(w);
      const f = new T.Mesh(new T.TubeGeometry(new T.LineCurve3(new T.Vector3(0, 0, 0), new T.Vector3(sx * 0.55, 0.25, 0)), 2, 0.012, 6), goldM); w.add(f); }
    // Rückenstacheln und Schwanz, der sich den Turm hinabwindet
    for (let i = 0; i < 6; i++) { const z = new T.Mesh(geo('ConeGeometry', 0.035, 0.12, 8), new T.MeshStandardMaterial({ color:0xd8c46a, roughness:0.4 })); z.position.set(0, 0.22 - i * 0.012, 0.18 + i * 0.07); z.rotation.x = 0.3; drache.add(z); }
    const schwPunkte = []; for (let i = 0; i <= 14; i++) { const a = i * 0.8 + 1; schwPunkte.push(new T.Vector3(Math.cos(a) * (0.66 - i * 0.022), 2.5 - i * 0.14, Math.sin(a) * (0.66 - i * 0.022) + 0.02)); }
    g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 2.62, 0.3), ...schwPunkte]), 70, 0.045, 10), dm));
    g.add(new T.Mesh(geo('ConeGeometry', 0.07, 0.18, 4), new T.MeshStandardMaterial({ color:0xd8c46a })).translateX(schwPunkte[14].x).translateY(schwPunkte[14].y - 0.08).translateZ(schwPunkte[14].z));
    const feuer = schein(0xff6d00, 0.1); feuer.position.set(0, 2.85, -0.7); g.add(feuer);
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      const st = s ? s.stufe : 0;
      stufen.forEach((f, idx) => { const i = idx >> 1; const c = s && s.phase === 'laeuft' && i < st ? 0x66bb6a : s && s.phase === 'laeuft' && i === st ? 0xffd54f : 0x37474f; f.material.color.setHex(c); });
      kopf.rotation.y = Math.sin(t * 0.7) * 0.55;
      fluegel.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * (0.3 + Math.sin(t * 1.4) * 0.08); });
      drache.position.y = 2.66 + Math.sin(t * 1.6) * 0.012;
      const boom = s && s.phase === 'bereit' && s.reihen && s.wahl && s.wahl.length && s.reihen[s.wahl.length - 1] && s.reihen[s.wahl.length - 1][s.wahl[s.wahl.length - 1]] === 1;
      feuer.scale.setScalar(boom ? 1.4 + Math.sin(t * 20) * 0.3 : 0.01);
      kk.rotation.x = boom ? -0.5 : 0;
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
    const goldM = new T.MeshStandardMaterial({ color:0xe2b33c, roughness:0.2, metalness:1, envMapIntensity:1.4 });
    const dunkel = new T.MeshStandardMaterial({ color:0x1c1230, roughness:0.35, metalness:0.3 });
    // Schmuckfuß (Drehkörper) mit Goldringen und zwei Stützen
    const fuss = new T.Mesh(new T.LatheGeometry([[0.62, 0], [0.62, 0.05], [0.5, 0.1], [0.3, 0.2], [0.16, 0.4], [0.12, 0.8], [0.15, 1.2], [0.2, 1.45], [0.14, 1.52]].map(([r, y]) => new T.Vector2(r, y)), 40), dunkel); g.add(fuss);
    for (const y of [0.1, 0.55, 1.05, 1.45]) { const r = new T.Mesh(geo('TorusGeometry', 0.17 + (y < 0.3 ? 0.4 : 0), 0.025, 8, 28), goldM); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
    const rad = new T.Group(); rad.position.set(0, 2.25, 0); g.add(rad);
    const [c, x] = leinwand(1024, 1024);
    for (let i = 0; i < 50; i++) {
      const sym = S.RAD_SYM[S.RAD_FELDER[i]];
      x.beginPath(); x.moveTo(512, 512); x.arc(512, 512, 500, (i / 50) * Math.PI * 2 - Math.PI / 2, ((i + 1) / 50) * Math.PI * 2 - Math.PI / 2); x.closePath();
      const gr = x.createRadialGradient(512, 512, 40, 512, 512, 500); gr.addColorStop(0, sym.f); gr.addColorStop(1, sym.f);
      x.fillStyle = sym.f; x.fill(); x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 3; x.stroke();
      x.save(); x.translate(512, 512); x.rotate((i + 0.5) / 50 * Math.PI * 2); x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 6; x.font = '800 40px "Barlow Semi Condensed",sans-serif'; x.textAlign = 'center'; x.fillText(sym.n, 0, -430); x.restore();
    }
    const ct = new T.CanvasTexture(c); ct.anisotropy = 8;
    const scheibe = new T.Mesh(new T.CircleGeometry(1.12, 64), new T.MeshStandardMaterial({ map:ct, emissive:0xffffff, emissiveMap:ct, emissiveIntensity:0.32, roughness:0.35, metalness:0.1 }));
    scheibe.rotation.y = Math.PI; rad.add(scheibe);
    const abdeckung = new T.Mesh(geo('CircleGeometry', 1.12, 64), new T.MeshPhysicalMaterial({ color:0xffffff, transparent:true, opacity:0.05, roughness:0.02, clearcoat:1, envMapIntensity:1.5 })); abdeckung.position.z = -0.03; abdeckung.rotation.y = Math.PI; rad.add(abdeckung);
    // Rahmen: breiter Goldring, innerer Rand, Rückscheibe
    rad.add(new T.Mesh(geo('TorusGeometry', 1.17, 0.07, 16, 80), goldM));
    const r2 = new T.Mesh(geo('TorusGeometry', 1.1, 0.025, 10, 80), goldM); r2.position.z = -0.03; rad.add(r2);
    const rueck = new T.Mesh(geo('CylinderGeometry', 1.2, 1.2, 0.12, 64), dunkel); rueck.rotation.x = Math.PI / 2; rueck.position.z = 0.08; rad.add(rueck);
    // Achse und Nabe
    const nabe = new T.Mesh(geo('SphereGeometry', 0.2, 32, 24), goldM); nabe.position.z = -0.06; nabe.scale.z = 0.6; rad.add(nabe);
    const nabeR = new T.Mesh(geo('TorusGeometry', 0.2, 0.025, 10, 32), goldM); nabeR.position.z = -0.03; rad.add(nabeR);
    // Zeiger: goldener Pfeil oben, leicht federnd
    const zeigerG = new T.Group(); zeigerG.position.set(0, 2.25 + 1.3, -0.1); g.add(zeigerG);
    const zk = new T.Mesh(geo('ConeGeometry', 0.1, 0.3, 4), goldM); zk.rotation.z = Math.PI; zk.rotation.y = Math.PI / 4; zeigerG.add(zk);
    const zr = new T.Mesh(geo('SphereGeometry', 0.07, 16, 12), new T.MeshStandardMaterial({ color:0xe53935, emissive:0xe53935, emissiveIntensity:0.6 })); zr.position.y = 0.17; zeigerG.add(zr);
    const lichter = [];
    for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; const l = new T.Mesh(geo('SphereGeometry', 0.035, 10, 8), new T.MeshBasicMaterial({ color:0xfff3b0 })); l.position.set(Math.cos(a) * 1.27, Math.sin(a) * 1.27, -0.02); rad.add(l); lichter.push(l); }
    let winkel = 0, dreh = null;
    g.animieren = (dt, t, info) => {
      const s = info.letzte;
      if (s && s.feld != null && s.nr !== g._nr) { g._nr = s.nr; const alpha = (s.feld + 0.5) / 50 * Math.PI * 2; if (info.frisch) { const voll = Math.ceil((winkel + 8 * Math.PI) / (Math.PI * 2)) * Math.PI * 2 - alpha; dreh = { t:0, d:4.1, w0:winkel, w1:voll }; } else winkel = -alpha; }
      let tempo = 0;
      if (dreh) { dreh.t += dt; const f = Math.min(1, dreh.t / dreh.d), e = 1 - Math.pow(1 - f, 3); const neu = dreh.w0 + (dreh.w1 - dreh.w0) * e; tempo = Math.abs(neu - winkel) / Math.max(dt, 0.001); winkel = neu; if (f >= 1) dreh = null; }
      rad.rotation.z = winkel;
      zeigerG.rotation.z = tempo > 1 ? Math.sin(t * 40) * Math.min(0.35, tempo * 0.04) : zeigerG.rotation.z * 0.9;   // Zeiger klackert über die Nocken
      const lauf = dreh ? 14 : 5;
      lichter.forEach((l, i) => l.material.color.setHex((Math.floor(t * lauf) + i) % 3 ? 0x4a3d12 : 0xfff3b0));
    };
    return g;
  };
  MODELLE.rakete = (th, n) => {
    const g = new T.Group();
    const ein = (eltern, o) => { eltern.add(o); return o; };   // add() gibt sonst den Eltern-Knoten zurück
    const goldM = new T.MeshStandardMaterial({ color:0xe2b33c, roughness:0.2, metalness:1, envMapIntensity:1.4 });
    const chrom = new T.MeshStandardMaterial({ color:0xdfe3ea, roughness:0.12, metalness:1, envMapIntensity:1.4 });
    const dunkel = new T.MeshStandardMaterial({ color:0x15101f, roughness:0.35, metalness:0.4 });
    /* Anzeigetafel auf Säule: Goldrahmen mit Glühbirnen */
    const sx = 0.55;
    ein(g, new T.Mesh(new T.LatheGeometry([[0.5, 0], [0.5, 0.06], [0.2, 0.14], [0.12, 0.3], [0.12, 1.25], [0.16, 1.3]].map(([r, y]) => new T.Vector2(r, y)), 36), dunkel)).position.x = sx;
    ein(g, new T.Mesh(geo('TorusGeometry', 0.2, 0.02, 8, 28), goldM)).rotation.x = Math.PI / 2;
    g.children[g.children.length - 1].position.set(sx, 0.12, 0);
    ein(g, new T.Mesh(geo('BoxGeometry', 2.5, 1.55, 0.14), goldM)).position.set(sx, 2.05, 0.1);
    ein(g, new T.Mesh(geo('BoxGeometry', 2.36, 1.41, 0.16), dunkel)).position.set(sx, 2.05, 0.1);
    const [c, x] = leinwand(512, 300);
    const tx = new T.CanvasTexture(c);
    const schirm = new T.Mesh(new T.PlaneGeometry(2.3, 1.35), new T.MeshBasicMaterial({ map:tx })); schirm.position.set(sx, 2.05, 0.012); schirm.rotation.y = Math.PI; g.add(schirm);
    const bulb = new T.InstancedMesh(geo('SphereGeometry', 0.03, 10, 8), new T.MeshBasicMaterial({ color:0xffffff }), 40);
    { const m4 = new T.Matrix4(); let q = 0; for (let k = 0; k < 11; k++) { for (const yy of [2.05 + 0.74, 2.05 - 0.74]) { m4.makeTranslation(sx - 1.1 + k * 0.22, yy, -0.0); bulb.setMatrixAt(q++, m4); } } for (let k = 1; k < 6; k++) for (const xx of [sx - 1.24, sx + 1.24]) { m4.makeTranslation(xx, 2.05 - 0.74 + k * 0.247, -0.0); bulb.setMatrixAt(q++, m4); } bulb.count = q; }
    g.add(bulb);
    /* Startrampe mit Gerüst und Warnstreifen */
    const px = -1.35;
    const pad = new T.Group(); pad.position.set(px, 0, 0.1); g.add(pad);
    const streifen = tex(256, 32, (xx, w, h) => { for (let q = 0; q < 16; q++) { xx.fillStyle = q % 2 ? '#111' : '#ffcc00'; xx.beginPath(); xx.moveTo(q * 16, 0); xx.lineTo(q * 16 + 16, 0); xx.lineTo(q * 16, h); xx.lineTo(q * 16 - 16, h); xx.fill(); } });
    ein(pad, new T.Mesh(geo('CylinderGeometry', 0.62, 0.68, 0.18, 40), dunkel)).position.y = 0.09;
    ein(pad, new T.Mesh(geo('CylinderGeometry', 0.66, 0.66, 0.05, 40, 1, true), new T.MeshStandardMaterial({ map:streifen, roughness:0.5 }))).position.y = 0.1;
    ein(pad, new T.Mesh(geo('TorusGeometry', 0.44, 0.03, 10, 36), goldM)).rotation.x = Math.PI / 2; pad.children[pad.children.length - 1].position.y = 0.19;
    for (const a of [0.7, 2.4, 3.9, 5.5]) { const st = new T.Mesh(geo('BoxGeometry', 0.05, 2.2, 0.05), chrom); st.position.set(Math.cos(a) * 0.52, 1.1, Math.sin(a) * 0.52); pad.add(st); }
    for (let q = 0; q < 5; q++) { const ring = new T.Mesh(geo('TorusGeometry', 0.52, 0.012, 6, 28), chrom); ring.rotation.x = Math.PI / 2; ring.position.y = 0.5 + q * 0.4; pad.add(ring); }
    /* Rakete: weißer Rumpf, rote Spitze, Bullauge, drei Flossen, Düse */
    const r = new T.Group(); r.position.y = 0.32; pad.add(r);
    const weiss = new T.MeshPhysicalMaterial({ color:0xf5f5f7, roughness:0.2, metalness:0.2, clearcoat:1 }), rot = new T.MeshPhysicalMaterial({ color:0xd32f2f, roughness:0.2, metalness:0.2, clearcoat:1 });
    const rumpf = new T.LatheGeometry([[0.0001, 0], [0.14, 0.02], [0.22, 0.12], [0.26, 0.4], [0.26, 0.9], [0.22, 1.2], [0.14, 1.42], [0.07, 1.54], [0.0001, 1.6]].map(([rr, y]) => new T.Vector2(rr, y)), 36);
    r.add(new T.Mesh(rumpf, weiss));
    r.add(new T.Mesh(new T.LatheGeometry([[0.0001, 1.2], [0.14, 1.42], [0.07, 1.54], [0.0001, 1.6]].map(([rr, y]) => new T.Vector2(rr * 1.03, y)), 36), rot));
    for (const y of [0.34, 0.8]) { const b = new T.Mesh(geo('TorusGeometry', 0.262, 0.03, 10, 36), rot); b.rotation.x = Math.PI / 2; b.position.y = y; r.add(b); }
    const bull = new T.Mesh(geo('CylinderGeometry', 0.1, 0.1, 0.06, 24), new T.MeshPhysicalMaterial({ color:0x7fd6ff, roughness:0.05, clearcoat:1, emissive:0x1a5a8a, emissiveIntensity:0.6 })); bull.rotation.x = Math.PI / 2; bull.position.set(0, 0.98, -0.255); r.add(bull);
    const bullR = new T.Mesh(geo('TorusGeometry', 0.11, 0.025, 10, 28), goldM); bullR.position.set(0, 0.98, -0.255); r.add(bullR);
    const finForm = () => { const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0.38, -0.12); sh.lineTo(0.38, 0.14); sh.lineTo(0, 0.5); sh.closePath(); return new T.ExtrudeGeometry(sh, { depth:0.03, bevelEnabled:false }); };
    for (let q = 0; q < 3; q++) { const f = new T.Mesh(finForm(), rot); const a = q / 3 * Math.PI * 2; f.position.set(Math.cos(a) * 0.24, 0.16, Math.sin(a) * 0.24); f.rotation.y = -a + Math.PI / 2; r.add(f); }
    const duese = new T.Mesh(new T.CylinderGeometry(0.12, 0.17, 0.14, 24, 1, true), chrom); duese.position.y = -0.04; duese.material = new T.MeshStandardMaterial({ color:0xdfe3ea, roughness:0.15, metalness:1, side:T.DoubleSide }); r.add(duese);
    const flamme = schein(0xff9100, 0.1); pad.add(flamme);
    const rauch = schein(0xffffff, 0.1); rauch.material.opacity = 0.18; rauch.position.set(0, 0.35, 0); pad.add(rauch);
    const knall = schein(0xff3d00, 0.1); pad.add(knall);
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
        x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 1; for (let q = 0; q < 512; q += 40) { x.beginPath(); x.moveTo(q, 0); x.lineTo(q, 300); x.stroke(); }
        if (rd.phase !== 'wetten') {
          const dauer = rd.phase === 'flug' ? info.uhr - rd.start : S.raketeZeit(rd.crash || 1);
          const maxM = Math.max(2, m * 1.2);
          x.strokeStyle = farbe; x.lineWidth = 5; x.beginPath();
          for (let q = 0; q <= 50; q++) { const tt = dauer * q / 50, mm = S.raketeMult(tt); const pxx = 30 + q / 50 * 440, py = 270 - (mm - 1) / (maxM - 1) * 230; q ? x.lineTo(pxx, py) : x.moveTo(pxx, py); }
          x.stroke();
        }
        x.fillStyle = farbe; x.font = '800 72px "Barlow Semi Condensed",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(text, 256, rd.phase === 'wetten' ? 150 : 70);
        tx.needsUpdate = true;
      }
      const fliegt = rd.phase === 'flug', geplatzt = rd.phase === 'crash';
      // Aufstieg: ruhig am Anfang, dann immer schneller; bei m = 100 ganz oben
      const hoehe = fliegt || geplatzt ? Math.min(3.2, Math.log(Math.max(1, m)) * 1.05 + (m - 1) * 0.03) : 0;
      r.visible = !geplatzt;
      r.position.y = 0.32 + hoehe;
      r.position.x = fliegt ? Math.sin(t * 38) * 0.008 * Math.min(1, m) : 0;
      flamme.position.set(0, r.position.y - 0.2, 0);
      flamme.scale.setScalar(fliegt ? 0.6 + hoehe * 0.12 + Math.random() * 0.25 : 0.01);
      rauch.scale.setScalar(rd.phase === 'wetten' ? 1.1 + Math.sin(t * 2) * 0.05 : fliegt ? 1.8 : 0.01);
      const seit = geplatzt ? 3 - (rd.bis - info.uhr) : 0;
      knall.position.set(0, 0.32 + hoehe + 0.7, 0);
      knall.scale.setScalar(geplatzt && seit < 1.2 ? 0.4 + seit * 4.2 : 0.01); knall.material.opacity = geplatzt ? Math.max(0, 1 - seit / 1.2) : 0;
      bulb.material.color.setHex(Math.floor(t * 4) % 2 ? 0xffffff : 0xffb300);
    };
    return g;
  };
  MODELLE.enten = (th, n) => {
    const g = new T.Group();
    const holzM = new T.MeshStandardMaterial({ color:0x3a2314, roughness:0.35, metalness:0.1 });
    g.add(rquader(3.4, 1.6, 0.8, 0.22, holzM));
    const gr = new T.Mesh(new T.ExtrudeGeometry((() => { const sh = rrect(3.46, 1.66, 0.25); sh.holes.push(rrect(3.2, 1.4, 0.16)); return sh; })(), { depth:0.05, bevelEnabled:true, bevelSize:0.02, bevelThickness:0.02, bevelSegments:3 }), GOLD()); gr.geometry.rotateX(-Math.PI / 2); gr.position.y = 0.78; g.add(gr);
    const wasser = tex(512, 256, (x, w, h) => { const gg = x.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#2aa4e8'); gg.addColorStop(1, '#0d62b0'); x.fillStyle = gg; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 3; for (let r = 0; r < 12; r++) { x.beginPath(); for (let q = 0; q <= 512; q += 8) x.lineTo(q, r * 22 + 8 + Math.sin(q * 0.05 + r) * 6); x.stroke(); } });
    const w = new T.Mesh(new T.PlaneGeometry(3.2, 1.4), new T.MeshStandardMaterial({ map:wasser, roughness:0.08, metalness:0.1, emissive:0x0a4a8a, emissiveIntensity:0.45, envMapIntensity:1.6 })); w.rotation.x = -Math.PI / 2; w.position.y = 0.82; g.add(w);
    // Leinen mit rot-weißen Schwimmern
    const rope = tex(8, 128, (x, ww, h) => { for (let q = 0; q < 8; q++) { x.fillStyle = q % 2 ? '#fff' : '#e53935'; x.fillRect(0, q * 16, ww, 16); } });
    for (let i = 1; i < 6; i++) { const z = -0.7 + i * (1.4 / 6); const l = new T.Mesh(geo('CylinderGeometry', 0.016, 0.016, 3.2, 10), new T.MeshStandardMaterial({ color:0xffffff, roughness:0.5 })); l.rotation.z = Math.PI / 2; l.position.set(0, 0.835, z); g.add(l); for (let q = 0; q < 16; q++) { const f = new T.Mesh(geo('SphereGeometry', 0.03, 10, 8), new T.MeshStandardMaterial({ color:q % 2 ? 0xffffff : 0xe53935, roughness:0.4 })); f.position.set(-1.5 + q * 0.2, 0.835, z); g.add(f); } }
    // Zielbogen mit Zielflagge und Startgatter
    const ziel = new T.Group(); ziel.position.set(1.5, 0.82, 0); g.add(ziel);
    for (const sz of [-0.74, 0.74]) { const p = new T.Mesh(geo('CylinderGeometry', 0.03, 0.03, 0.7, 12), GOLD()); p.position.set(0, 0.35, sz); ziel.add(p); }
    const flagge = tex(256, 64, (x, ww, h) => { for (let a = 0; a < 16; a++) for (let b = 0; b < 4; b++) { x.fillStyle = (a + b) % 2 ? '#fff' : '#111'; x.fillRect(a * 16, b * 16, 16, 16); } });
    const fl = new T.Mesh(geo('PlaneGeometry', 1.5, 0.22), new T.MeshStandardMaterial({ map:flagge, side:T.DoubleSide, roughness:0.7 })); fl.rotation.y = Math.PI / 2; fl.position.set(0, 0.68, 0); ziel.add(fl);
    const start = new T.Group(); start.position.set(-1.5, 0.82, 0); g.add(start);
    for (let i = 0; i <= 6; i++) { const p = new T.Mesh(geo('CylinderGeometry', 0.012, 0.012, 0.16, 8), CHROM()); p.position.set(0, 0.08, -0.7 + i * (1.4 / 6)); start.add(p); }
    const bademeister = (() => { const b = new T.Group(); b.position.set(-1.0, 0, 0.98); const stuhl = new T.Mesh(geo('BoxGeometry', 0.4, 0.04, 0.4), CHROM()); stuhl.position.y = 0.9; b.add(stuhl); return b; })(); g.add(bademeister);
    const gummi = (farbe) => {
      const d = new T.Group();
      const gelb = new T.MeshPhysicalMaterial({ color:farbe, roughness:0.2, clearcoat:1, clearcoatRoughness:0.15 });
      const leib = new T.Mesh(geo('SphereGeometry', 0.1, 24, 16), gelb); leib.scale.set(1.35, 0.85, 1); leib.position.y = 0.06; d.add(leib);
      const sw = new T.Mesh(geo('ConeGeometry', 0.05, 0.12, 12), gelb); sw.rotation.z = Math.PI / 2 + 0.5; sw.position.set(-0.15, 0.12, 0); d.add(sw);
      const kopf = new T.Mesh(geo('SphereGeometry', 0.065, 20, 14), gelb); kopf.position.set(0.09, 0.17, 0); d.add(kopf);
      const sch = new T.Mesh(geo('SphereGeometry', 0.03, 12, 8), new T.MeshStandardMaterial({ color:0xff7a00, roughness:0.3 })); sch.scale.set(1.4, 0.55, 1); sch.position.set(0.16, 0.155, 0); d.add(sch);
      for (const sz of [-1, 1]) { const a = new T.Mesh(geo('SphereGeometry', 0.012, 8, 6), new T.MeshBasicMaterial({ color:0x111111 })); a.position.set(0.14, 0.2, sz * 0.045); d.add(a); const fl = new T.Mesh(geo('SphereGeometry', 0.06, 12, 8), gelb); fl.scale.set(1, 0.6, 0.3); fl.position.set(-0.01, 0.07, sz * 0.095); d.add(fl); }
      return d;
    };
    const enten = S.ENTEN.map((e, i) => {
      const d = gummi(new T.Color(e.f).getHex());
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

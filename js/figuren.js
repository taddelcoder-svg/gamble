/* Kredithai – Figuren aus Grundformen (three.js r128): Spieler-Tiere im Anzug, Don Flosse (Hai), Frau Elster (Pfandhaus),
   Croupiers. Modelle schauen nach +z. Höhe eines Spielers etwa 1,5 m. */
(function () {
  'use strict';
  const T = THREE;
  const mats = new Map();
  const METALL = new Set([0xe8b923, 0xd8a040, 0xbdbdbd, 0x9e9e9e, 0xc9a227, 0xd4af37]);
  const LEUCHT = new Set([0xff3df2, 0x4dfff0]);
  function mat(farbe, extra) {
    const k = farbe + (extra ? JSON.stringify(extra) : '');
    if (!mats.has(k)) {
      // Gold und Chrom glänzen metallisch, Neon-Farben leuchten selbst (Bloom), alles andere seidenmatt
      const art = METALL.has(farbe) ? { metalness:0.95, roughness:0.28 } : LEUCHT.has(farbe) ? { emissive:farbe, emissiveIntensity:0.35, roughness:0.4 } : { roughness:0.62, metalness:0.02 };
      const m = new T.MeshStandardMaterial({ color:farbe, ...art, ...extra }); m._geteilt = true; mats.set(k, m);
    }
    return mats.get(k);
  }
  const geos = new Map();
  function geo(art, ...a) { const k = art + a.join(','); if (!geos.has(k)) { const g = new T[art](...a); g._geteilt = true; geos.set(k, g); } return geos.get(k); }
  function teil(g, m, x = 0, y = 0, z = 0) { const t = new T.Mesh(g, typeof m === 'number' ? mat(m) : m); t.position.set(x, y, z); return t; }
  const box = (w, h, d, f, x, y, z) => teil(geo('BoxGeometry', w, h, d), f, x, y, z);
  const zyl = (r1, r2, h, f, x, y, z, seg = 16) => teil(geo('CylinderGeometry', r1, r2, h, seg), f, x, y, z);
  const kugel = (r, f, x, y, z, seg = 16) => teil(geo('SphereGeometry', r, seg, Math.max(6, seg * 0.7 | 0)), f, x, y, z);
  const kegel = (r, h, f, x, y, z, seg = 8) => teil(geo('ConeGeometry', r, h, seg), f, x, y, z);

  /* ---------- Muster als Textur ---------- */
  let herzTex = null;
  function herzchen() {
    if (herzTex) return herzTex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#fafafa'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#e53950'; x.font = '18px sans-serif';
    for (const [a, b] of [[6, 18], [36, 14], [20, 40], [50, 44], [4, 60], [34, 62]]) x.fillText('♥', a, b);
    herzTex = new T.CanvasTexture(c); herzTex.wrapS = herzTex.wrapT = T.RepeatWrapping; herzTex.repeat.set(2, 1);
    return herzTex;
  }

  /* ---------- Tiere ---------- */
  const ARTEN = {
    loewe:{ fell:0xe8a03c, bauch:0xf6d08a, ohren:'rund', maul:'kurz', extra:'maehne', mfarbe:0xa8561a, anzug:0x7a1f2b, fliege:0xe8b923 },
    pinguin:{ fell:0x2a2d35, bauch:0xf4f4f4, ohren:'keine', maul:'schnabel', schnabel:0xf29a2e, anzug:0x17181d, fliege:0xd32f2f },
    fuchs:{ fell:0xe0702a, bauch:0xfaf3ea, ohren:'spitz', maul:'spitz', extra:'schwanz', anzug:0x2e6b3f, fliege:0xf2c14e },
    waschbaer:{ fell:0x8d8f93, bauch:0xd8d8d8, ohren:'spitz', maul:'kurz', extra:'maske', anzug:0x4b2d73, fliege:0x4dd0e1 },
    baer:{ fell:0x7b5233, bauch:0xc49a6c, ohren:'rund', maul:'kurz', anzug:0x1f3f73, fliege:0xff7043 },
    hase:{ fell:0xf2efe9, bauch:0xffffff, ohren:'lang', maul:'kurz', anzug:0xd9d2c5, fliege:0xec407a },
    // Croupiers und Statisten
    katze:{ fell:0x9a9a9a, bauch:0xeeeeee, ohren:'spitz', maul:'kurz', anzug:0x222222, fliege:0xb71c1c },
    hund:{ fell:0xc9955c, bauch:0xf2dcc0, ohren:'schlapp', maul:'kurz', anzug:0x222222, fliege:0xb71c1c },
    maus:{ fell:0x8c8580, bauch:0xd6ccc8, ohren:'gross', maul:'spitz', anzug:0x5d4037, fliege:0x8d6e63 },
    otter:{ fell:0x6d4c33, bauch:0xc8a986, ohren:'rund', maul:'kurz', anzug:0x222222, fliege:0xb71c1c }
  };
  const NAMEN = { loewe:'Löwe', pinguin:'Pinguin', fuchs:'Fuchs', waschbaer:'Waschbär', baer:'Bär', hase:'Hase' };

  function tier(art, o = {}) {
    const A = ARTEN[art] || ARTEN.loewe;
    const fell = A.fell, anzug = o.anzug != null ? o.anzug : A.anzug;
    const g = new T.Group();
    const k = new T.Group(); g.add(k);            // alles, was wippt
    // Beine mit Hose oder Unterhose, Füße mit oder ohne Schuhe
    const beine = [];
    for (const s of [-1, 1]) {
      const b = new T.Group(); b.position.set(s * 0.1, 0.3, 0);
      const hose = zyl(0.075, 0.07, 0.3, anzug, 0, -0.12, 0, 8); b.add(hose);
      const bein = zyl(0.06, 0.06, 0.28, fell, 0, -0.12, 0, 8); bein.visible = false; b.add(bein);
      const schuh = box(0.13, 0.08, 0.22, 0x1a1a1a, 0, -0.27, 0.04); b.add(schuh);
      const fuss = kugel(0.075, fell, 0, -0.27, 0.03, 8); fuss.scale.set(1, 0.7, 1.4); fuss.visible = false; b.add(fuss);
      b.teile = { hose, bein, schuh, fuss };
      g.add(b); beine.push(b);
    }
    const unterhose = zyl(0.2, 0.21, 0.14, new T.MeshLambertMaterial({ map:herzchen() }), 0, 0.3, 0, 14); unterhose.visible = false; k.add(unterhose);
    // Rumpf: Sakko, Hemd, Fliege
    const rumpf = zyl(0.2, 0.22, 0.42, anzug, 0, 0.52, 0, 14); k.add(rumpf);
    const hemd = box(0.13, 0.3, 0.04, 0xfafafa, 0, 0.58, 0.19); k.add(hemd);
    if (art === 'pinguin' || o.bauchFrei) { const b = kugel(0.15, A.bauch, 0, 0.5, 0.12, 10); b.scale.set(1, 1.3, 0.5); k.add(b); }
    for (const s of [-1, 1]) { const f = kegel(0.045, 0.09, o.fliege != null ? o.fliege : A.fliege, s * 0.045, 0.72, 0.215, 6); f.rotation.z = s * Math.PI / 2; k.add(f); }
    k.add(kugel(0.025, o.fliege != null ? o.fliege : A.fliege, 0, 0.72, 0.22, 6));
    if (o.weste) k.add(box(0.3, 0.26, 0.04, o.weste, 0, 0.5, 0.18));
    // Arme
    const arme = [];
    for (const s of [-1, 1]) {
      const a = new T.Group(); a.position.set(s * 0.25, 0.68, 0);
      a.add(zyl(0.055, 0.05, 0.3, anzug, 0, -0.13, 0, 8));
      a.add(kugel(0.06, fell, 0, -0.29, 0.01, 8));
      if (s === -1) { const uhr = zyl(0.058, 0.058, 0.04, 0xe8b923, 0, -0.24, 0, 10); a.add(uhr); a.uhr = uhr; }
      a.rotation.x = -0.15;
      k.add(a); arme.push(a);
    }
    // Kopf
    const kopf = new T.Group(); kopf.position.y = 0.98; k.add(kopf);
    kopf.add(kugel(0.22, fell, 0, 0, 0, 14));
    if (A.extra === 'maehne') { const m = kugel(0.31, A.mfarbe, 0, 0, -0.06, 12); m.scale.set(1, 1, 0.75); kopf.add(m); }
    for (const s of [-1, 1]) { kopf.add(kugel(0.033, 0x1a1a1a, s * 0.08, 0.04, 0.19, 8)); kopf.add(kugel(0.011, 0xffffff, s * 0.08 + 0.011, 0.055, 0.218, 6)); }
    if (A.extra === 'maske') kopf.add(box(0.34, 0.08, 0.05, 0x2d2d30, 0, 0.04, 0.17));
    switch (A.maul) {
      case 'kurz': { const m = kugel(0.095, A.bauch, 0, -0.07, 0.16, 10); m.scale.set(1.2, 0.8, 0.8); kopf.add(m); kopf.add(kugel(0.033, 0x2a1a14, 0, -0.03, 0.25, 8)); break; }
      case 'spitz': { const m = kegel(0.085, 0.2, A.bauch, 0, -0.06, 0.23); m.rotation.x = Math.PI / 2; kopf.add(m); kopf.add(kugel(0.028, 0x1a1a1a, 0, -0.06, 0.33, 6)); break; }
      case 'schnabel': kopf.add(box(0.15, 0.05, 0.15, A.schnabel, 0, -0.06, 0.23)); break;
    }
    const ohr = (x, y, z, rz) => {
      switch (A.ohren) {
        case 'rund': return kugel(0.075, fell, x, y, z, 8);
        case 'gross': { const q = kugel(0.12, fell, x * 1.2, y + 0.02, z, 10); q.scale.z = 0.4; return q; }
        case 'spitz': { const q = kegel(0.075, 0.16, fell, x, y + 0.04, z, 6); q.rotation.z = rz; return q; }
        case 'lang': { const q = kugel(0.06, fell, x * 0.6, y + 0.21, z, 8); q.scale.set(0.8, 3, 0.6); q.rotation.z = rz * 0.5; return q; }
        case 'schlapp': { const q = kugel(0.075, 0x7a5233, x * 1.25, y - 0.12, z, 8); q.scale.set(0.6, 1.6, 0.8); return q; }
      }
      return null;
    };
    for (const s of [-1, 1]) { const e = ohr(s * 0.15, 0.16, -0.02, -s * 0.35); if (e) kopf.add(e); }
    if (A.extra === 'schwanz') { const sw = kugel(0.1, fell, 0, 0.4, -0.3, 8); sw.scale.set(0.8, 0.8, 2); g.add(sw); g.add(kugel(0.06, 0xffffff, 0, 0.42, -0.46, 6)); }
    if (art === 'waschbaer') for (let i = 0; i < 3; i++) g.add(kugel(0.07, i % 2 ? 0x2d2d30 : fell, 0, 0.36 + i * 0.02, -0.26 - i * 0.1, 8));
    // Sonnenbrille
    const brille = new T.Group();
    for (const s of [-1, 1]) brille.add(box(0.1, 0.06, 0.02, 0x111111, s * 0.075, 0.045, 0.215));
    brille.add(box(0.06, 0.015, 0.02, 0x111111, 0, 0.06, 0.215));
    kopf.add(brille);
    // Hut
    if (o.hut) {
      const h = new T.Group(); h.position.y = 0.17;
      h.add(zyl(0.3, 0.3, 0.02, o.hut, 0, 0, 0, 16));
      h.add(zyl(0.17, 0.19, 0.18, o.hut, 0, 0.1, 0, 14));
      h.add(zyl(0.192, 0.192, 0.04, o.hutband || 0xffffff, 0, 0.04, 0, 14));
      h.rotation.x = -0.1;
      kopf.add(h);
    }
    g.arme = arme; g.beine = beine; g.koerper = k; g.kopf = kopf; g.brille = brille; g.unterhose = unterhose; g.rumpf = rumpf;
    g.skala = o.skala || 1.5;
    g.scale.setScalar(g.skala);
    // Pfand-Zustand zeigen
    g.pfand = p => {
      p = p || {};
      for (const b of beine) { b.teile.schuh.visible = !p.schuhe; b.teile.fuss.visible = !!p.schuhe; b.teile.hose.visible = !p.hose; b.teile.bein.visible = !!p.hose; }
      unterhose.visible = !!p.hose;
      brille.visible = !p.brille;
      if (arme[0].uhr) arme[0].uhr.visible = !p.uhr;
    };
    g.schritt = 0; g.jubel = 0; g.frust = 0;
    g.animieren = (dt, tempo, spielt, t) => {
      g.schritt += dt * tempo * 8;
      const sw = tempo > 0.1 ? Math.sin(g.schritt) : 0;
      beine[0].rotation.x = sw * 0.5; beine[1].rotation.x = -sw * 0.5;
      k.position.y = Math.abs(sw) * 0.03;
      let a0 = -0.15 + sw * 0.5, a1 = -0.15 - sw * 0.5;
      if (spielt) { a0 = -1.0 + Math.sin(t * 3) * 0.08; a1 = -1.0 - Math.sin(t * 3 + 1) * 0.08; }
      if (g.jubel > 0) { g.jubel -= dt; a0 = a1 = -2.8 + Math.sin(t * 18) * 0.25; k.position.y = Math.abs(Math.sin(t * 9)) * 0.08; }
      kopf.rotation.y = g.frust > 0 ? Math.sin(t * 14) * 0.45 : 0;
      kopf.rotation.x = g.frust > 0 ? 0.25 : 0;
      if (g.frust > 0) g.frust -= dt;
      arme[0].rotation.x += (a0 - arme[0].rotation.x) * Math.min(1, dt * 12);
      arme[1].rotation.x += (a1 - arme[1].rotation.x) * Math.min(1, dt * 12);
    };
    return g;
  }

  /* ---------- Don Flosse: Hai im Nadelstreifen ---------- */
  function donFlosse() {
    const g = new T.Group();
    const haut = 0x6f8696, bauch = 0xe9eef2, anzug = 0x15161b;
    const k = new T.Group(); g.add(k);
    for (const s of [-1, 1]) { k.add(zyl(0.09, 0.08, 0.32, anzug, s * 0.12, 0.16, 0, 8)); k.add(box(0.15, 0.08, 0.26, 0x2a1a10, s * 0.12, 0.03, 0.05)); }
    k.add(zyl(0.26, 0.24, 0.52, anzug, 0, 0.58, 0, 16));
    // Nadelstreifen
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const st = box(0.008, 0.5, 0.008, 0x4a4d57, Math.sin(a) * 0.255, 0.58, Math.cos(a) * 0.255); k.add(st); }
    k.add(box(0.12, 0.34, 0.04, 0xf5f5f5, 0, 0.64, 0.24));
    k.add(box(0.05, 0.28, 0.045, 0xb71c1c, 0, 0.62, 0.25));          // Krawatte
    k.add(box(0.06, 0.06, 0.03, 0xfafafa, 0.14, 0.72, 0.235));        // Einstecktuch
    // Goldkette
    const kette = new T.Mesh(geo('TorusGeometry', 0.15, 0.012, 6, 20), mat(0xe8b923)); kette.position.set(0, 0.84, 0.06); kette.rotation.x = Math.PI / 2.4; k.add(kette);
    const arme = [];
    for (const s of [-1, 1]) {
      const a = new T.Group(); a.position.set(s * 0.3, 0.8, 0);
      a.add(zyl(0.07, 0.065, 0.36, anzug, 0, -0.16, 0, 8));
      const flosse = kugel(0.08, haut, 0, -0.36, 0.02, 8); flosse.scale.set(0.6, 1.2, 1); a.add(flosse);
      a.rotation.x = -0.1;
      k.add(a); arme.push(a);
    }
    // Kopf: lange Schnauze, großes Grinsen
    const kopf = new T.Group(); kopf.position.y = 1.08; k.add(kopf);
    const schaedel = kugel(0.26, haut, 0, 0, 0, 16); schaedel.scale.set(1, 0.95, 1.35); kopf.add(schaedel);
    const unten = kugel(0.22, bauch, 0, -0.08, 0.07, 14); unten.scale.set(1, 0.6, 1.3); kopf.add(unten);
    const maul = box(0.3, 0.035, 0.12, 0x3b0d12, 0, -0.08, 0.27); kopf.add(maul);
    for (let i = 0; i < 9; i++) { const z = kegel(0.016, 0.04, 0xffffff, -0.13 + i * 0.0325, -0.058, 0.32, 4); z.rotation.x = Math.PI; kopf.add(z); }
    for (const s of [-1, 1]) {
      kopf.add(kugel(0.04, 0x0d0d0d, s * 0.17, 0.07, 0.18, 8));
      kopf.add(kugel(0.012, 0xffffff, s * 0.17 + 0.012, 0.085, 0.215, 6));
      for (let i = 0; i < 3; i++) kopf.add(box(0.006, 0.08, 0.03, 0x4d6070, s * 0.235, -0.02, -0.02 - i * 0.05));   // Kiemen
    }
    // Rückenflosse durch den Hut
    const rf = kegel(0.1, 0.32, haut, 0, 0.36, -0.12, 4); rf.scale.z = 0.35; rf.rotation.x = -0.35; kopf.add(rf);
    const hut = new T.Group(); hut.position.set(0, 0.2, 0);
    hut.add(zyl(0.34, 0.34, 0.025, 0x111111, 0, 0, 0, 18));
    hut.add(zyl(0.2, 0.22, 0.2, 0x111111, 0, 0.11, 0, 16));
    hut.add(zyl(0.222, 0.222, 0.045, 0xf5f5f5, 0, 0.04, 0, 16));
    hut.rotation.set(-0.08, 0, 0.08);
    kopf.add(hut);
    // Schwanzflosse hinten
    const sf = kegel(0.14, 0.4, haut, 0, 0.32, -0.36, 4); sf.rotation.x = -1.2; sf.scale.z = 0.3; g.add(sf);
    g.scale.setScalar(1.9);
    g.arme = arme; g.kopf = kopf; g.koerper = k;
    g.animieren = (dt, t, laune) => {
      k.position.y = Math.sin(t * 1.6) * 0.01;
      kopf.rotation.y = Math.sin(t * 0.5) * 0.25;
      if (laune === 'wut') { kopf.rotation.z = Math.sin(t * 20) * 0.08; arme[0].rotation.x = -1.6 + Math.sin(t * 12) * 0.3; }
      else if (laune === 'freude') { arme[0].rotation.x = -2.6; arme[1].rotation.x = -2.6; kopf.rotation.z = 0; }
      else { kopf.rotation.z = 0; arme[0].rotation.x += (-0.1 - arme[0].rotation.x) * dt * 4; arme[1].rotation.x += (-0.5 + Math.sin(t) * 0.1 - arme[1].rotation.x) * dt * 4; }
    };
    return g;
  }

  /* ---------- Frau Elster: Elster mit Monokel ---------- */
  function elster() {
    const g = new T.Group();
    const k = new T.Group(); g.add(k);
    const leib = kugel(0.26, 0x16181d, 0, 0.5, 0, 14); leib.scale.set(1, 1.3, 1); k.add(leib);
    const bauch = kugel(0.18, 0xf5f5f5, 0, 0.45, 0.12, 12); bauch.scale.set(1, 1.2, 0.6); k.add(bauch);
    for (const s of [-1, 1]) { const f = kugel(0.16, 0x1b3a6b, s * 0.24, 0.52, -0.02, 10); f.scale.set(0.4, 1.1, 0.9); k.add(f); const w = kugel(0.08, 0xffffff, s * 0.27, 0.5, 0.03, 8); w.scale.set(0.4, 1, 0.8); k.add(w); }
    const schwanz = box(0.12, 0.04, 0.6, 0x1b3a6b, 0, 0.42, -0.42); schwanz.rotation.x = 0.4; k.add(schwanz);
    const kopf = new T.Group(); kopf.position.y = 0.92; k.add(kopf);
    kopf.add(kugel(0.17, 0x16181d, 0, 0, 0, 12));
    const sch = kegel(0.05, 0.2, 0x2b2b2b, 0, -0.02, 0.22, 6); sch.rotation.x = Math.PI / 2; kopf.add(sch);
    for (const s of [-1, 1]) kopf.add(kugel(0.03, 0xffffff, s * 0.07, 0.04, 0.14, 8));
    for (const s of [-1, 1]) kopf.add(kugel(0.016, 0x111111, s * 0.07, 0.04, 0.165, 6));
    const monokel = new T.Mesh(geo('TorusGeometry', 0.045, 0.008, 6, 16), mat(0xe8b923)); monokel.position.set(0.07, 0.04, 0.17); kopf.add(monokel);
    // Perlenkette
    for (let i = 0; i < 9; i++) { const a = -0.9 + i * 0.225; k.add(kugel(0.018, 0xfff8e1, Math.sin(a) * 0.17, 0.74 - Math.cos(a) * 0.04, Math.cos(a) * 0.17, 6)); }
    g.scale.setScalar(1.6);
    g.kopf = kopf;
    g.animieren = (dt, t) => { kopf.rotation.y = Math.sin(t * 0.9) * 0.4; kopf.rotation.z = Math.sin(t * 2.3) * 0.08; };
    return g;
  }

  /* ---------- Croupier ---------- */
  const CROUPIER = ['katze', 'hund', 'otter', 'maus'];
  function croupier(n) {
    const art = CROUPIER[n % CROUPIER.length];
    const g = tier(art, { weste:0x8e1b1b, skala:1.45, hut:null });
    g.brille.visible = false;
    return g;
  }
  function gauner() {
    const g = tier('maus', { anzug:0x6d5c4d, fliege:0x333333, hut:0x3e3e3e, hutband:0x222222, skala:1.4 });
    g.brille.visible = true;
    return g;
  }

  /* ---------- Namensschild ---------- */
  function rundRechteck(x, a, b, w, h, r) {
    x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
  }
  function textSprite(text, o = {}) {
    const gr = o.gr || 40, rand = o.rand != null ? o.rand : 10;
    const c = document.createElement('canvas'), x = c.getContext('2d');
    const schrift = `${o.dick || 800} ${gr}px "Barlow Semi Condensed", system-ui, sans-serif`;
    x.font = schrift;
    const w = Math.ceil(x.measureText(text).width) + rand * 2, h = gr + rand * 2;
    c.width = w; c.height = h;
    x.font = schrift; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (o.grund) { x.fillStyle = o.grund; rundRechteck(x, 0, 0, w, h, h * 0.3); x.fill(); }
    if (o.kontur) { x.lineWidth = gr * 0.16; x.strokeStyle = o.kontur; x.strokeText(text, w / 2, h / 2 + 2); }
    x.fillStyle = o.farbe || '#fff';
    x.fillText(text, w / 2, h / 2 + 2);
    const tex = new T.CanvasTexture(c); tex.minFilter = T.LinearFilter;
    const s = new T.Sprite(new T.SpriteMaterial({ map:tex, depthTest:o.tiefe !== false, transparent:true }));
    s.renderOrder = 20;
    const hoehe = o.hoehe || 0.32;
    s.scale.set(hoehe * w / h, hoehe, 1);
    return s;
  }

  window.KHF = { tier, donFlosse, elster, croupier, gauner, textSprite, rundRechteck, ARTEN, NAMEN, mat, geo, box, zyl, kugel, kegel };
})();

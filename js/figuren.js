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
    affe:{ fell:0x6e4a2c, bauch:0xe9c9a0, ohren:'affe', maul:'kurz', extra:'affe', anzug:0x1f5f6b, fliege:0xffd54f },
    // Croupiers und Statisten
    katze:{ fell:0x9a9a9a, bauch:0xeeeeee, ohren:'spitz', maul:'kurz', anzug:0x222222, fliege:0xb71c1c },
    hund:{ fell:0xc9955c, bauch:0xf2dcc0, ohren:'schlapp', maul:'kurz', anzug:0x222222, fliege:0xb71c1c },
    maus:{ fell:0x8c8580, bauch:0xd6ccc8, ohren:'gross', maul:'spitz', anzug:0x5d4037, fliege:0x8d6e63 },
    otter:{ fell:0x6d4c33, bauch:0xc8a986, ohren:'rund', maul:'kurz', anzug:0x222222, fliege:0xb71c1c }
  };
  const NAMEN = { loewe:'Löwe', pinguin:'Pinguin', fuchs:'Fuchs', waschbaer:'Waschbär', baer:'Bär', hase:'Hase', affe:'Affe' };

  // Eigenes Material mit Rauheit/Metall (gecacht)
  function stoff(farbe, rau, metall = 0, extra) {
    const k = 'S' + farbe + ':' + rau + ':' + metall + (extra ? JSON.stringify(extra) : '');
    if (!mats.has(k)) { const m = new T.MeshStandardMaterial({ color:farbe, roughness:rau, metalness:metall, ...extra }); m._geteilt = true; mats.set(k, m); }
    return mats.get(k);
  }
  const hell = (f, a) => new T.Color(f).lerp(new T.Color(0xffffff), a).getHex();
  const dunkel = (f, a) => new T.Color(f).multiplyScalar(1 - a).getHex();
  // Körper eines Sakkos als Drehkörper (weich geformt statt Zylinder)
  const RUMPF_PROFIL = [[0.001, 0.30], [0.165, 0.30], [0.19, 0.36], [0.205, 0.45], [0.205, 0.55], [0.19, 0.62], [0.15, 0.665], [0.08, 0.69], [0.001, 0.695]];
  function rumpfGeo() { return geos.get('rumpf') || (geos.set('rumpf', Object.assign(new T.LatheGeometry(RUMPF_PROFIL.map(([r, y]) => new T.Vector2(r, y)), 28), { _geteilt:true })), geos.get('rumpf')); }

  const AUGEN = { affe:0x3b2210, loewe:0x8d5a12, pinguin:0x3b2a1a, fuchs:0x6b8e23, waschbaer:0x3b2a1a, baer:0x4e2f14, hase:0xd14d72, katze:0x3d9a3d, hund:0x5b3a1a, maus:0x222222, otter:0x3b2a1a };

  function tier(art, o = {}) {
    const A = ARTEN[art] || ARTEN.loewe;
    const fell = A.fell, anzug = o.anzug != null ? o.anzug : A.anzug;
    const mFell = stoff(fell, 0.85), mBauch = stoff(A.bauch, 0.85);
    const mAnzug = stoff(anzug, 0.5, 0.05), mRevers = stoff(hell(anzug, 0.08), 0.18, 0.15), mHemd = stoff(0xfbfbf8, 0.55);
    const mGold = stoff(0xe2b33c, 0.25, 1), mLack = stoff(0x0c0c0e, 0.12, 0.2), mSchwarz = stoff(0x111114, 0.35);
    const fliege = o.fliege != null ? o.fliege : A.fliege, mFliege = stoff(fliege, 0.35, 0.05);
    const g = new T.Group();
    const k = new T.Group(); g.add(k);
    const M = (geom, m, x = 0, y = 0, z = 0) => { const t = new T.Mesh(geom, m); t.position.set(x, y, z); return t; };
    const K = (r, m, x, y, z, s = 24) => M(geo('SphereGeometry', r, s, Math.round(s * 0.75)), m, x, y, z);
    const Z = (r1, r2, h, m, x, y, z, s = 20) => M(geo('CylinderGeometry', r1, r2, h, s), m, x, y, z);

    /* Beine: Hose oder Unterhose, Lackschuhe oder nackte Pfoten */
    const beine = [];
    for (const s of [-1, 1]) {
      const b = new T.Group(); b.position.set(s * 0.085, 0.32, 0);
      const hose = Z(0.066, 0.058, 0.27, mAnzug, 0, -0.13, 0); b.add(hose);
      const bein = Z(0.052, 0.048, 0.25, mFell, 0, -0.13, 0); bein.visible = false; b.add(bein);
      const schuh = new T.Group();
      const sch = K(0.07, mLack, 0, -0.285, 0.035); sch.scale.set(1, 0.62, 1.55); schuh.add(sch);
      const sohle = M(geo('BoxGeometry', 0.13, 0.02, 0.21), mSchwarz, 0, -0.312, 0.035); schuh.add(sohle);
      b.add(schuh);
      const fuss = K(0.068, mFell, 0, -0.29, 0.03); fuss.scale.set(1, 0.65, 1.4); fuss.visible = false; b.add(fuss);
      for (const z2 of [-1, 0, 1]) { const zeh = K(0.022, mBauch, z2 * 0.03, -0.3, 0.115); zeh.visible = false; fuss.zehen = (fuss.zehen || []).concat(zeh); b.add(zeh); }
      b.teile = { hose, bein, schuh, fuss };
      g.add(b); beine.push(b);
    }
    const unterhose = Z(0.19, 0.2, 0.13, new T.MeshStandardMaterial({ map:herzchen(), roughness:0.7 }), 0, 0.31, 0, 24); unterhose.visible = false; k.add(unterhose);

    /* Rumpf: Sakko, Hemd-Dreieck, Satin-Revers, Goldknöpfe, Einstecktuch, Fliege */
    const rumpf = M(rumpfGeo(), mAnzug); k.add(rumpf);
    if (art === 'pinguin') { const bb = K(0.15, mBauch, 0, 0.47, 0.085); bb.scale.set(1, 1.25, 0.7); k.add(bb); }
    const hemd = M(geo('ConeGeometry', 0.1, 0.26, 3), mHemd, 0, 0.58, 0.17); hemd.rotation.set(Math.PI, 0, 0); hemd.scale.z = 0.35; k.add(hemd);
    for (const s of [-1, 1]) {
      const rv = M(geo('BoxGeometry', 0.075, 0.2, 0.014), mRevers, s * 0.085, 0.585, 0.183); rv.rotation.set(-0.12, s * 0.3, s * 0.3); k.add(rv);
    }
    for (const y of [0.44, 0.38]) k.add(K(0.012, mGold, 0, y, 0.203, 10));
    const tuch = M(geo('BoxGeometry', 0.05, 0.035, 0.01), stoff(hell(fliege, 0.2), 0.4), 0.12, 0.58, 0.178); tuch.rotation.y = 0.35; k.add(tuch);
    for (const s of [-1, 1]) { const f = K(0.034, mFliege, s * 0.038, 0.665, 0.172, 14); f.scale.set(1.25, 0.8, 0.5); k.add(f); }
    k.add(K(0.016, mFliege, 0, 0.665, 0.18, 10));
    if (o.weste) { const w = M(geo('BoxGeometry', 0.26, 0.22, 0.02), stoff(o.weste, 0.45), 0, 0.45, 0.192); k.add(w); }

    /* Arme mit weißen Manschetten und Gold-Manschettenknöpfen */
    const arme = [];
    for (const s of [-1, 1]) {
      const a = new T.Group(); a.position.set(s * 0.205, 0.625, 0);
      a.add(K(0.058, mAnzug, 0, 0, 0, 16));
      a.add(Z(0.052, 0.046, 0.26, mAnzug, 0, -0.13, 0.01, 16));
      a.add(Z(0.047, 0.047, 0.035, mHemd, 0, -0.27, 0.012, 16));
      a.add(K(0.009, mGold, s * 0.03, -0.27, 0.035, 8));
      const pfote = K(0.052, mFell, 0, -0.32, 0.018, 18); pfote.scale.set(1, 1.05, 0.95); a.add(pfote);
      if (s === -1) { const uhr = new T.Mesh(geo('TorusGeometry', 0.046, 0.009, 8, 20), mGold); uhr.rotation.x = Math.PI / 2; uhr.position.set(0, -0.245, 0.012); a.add(uhr); a.uhr = uhr; }
      a.rotation.x = -0.12; a.rotation.z = s * 0.08;
      k.add(a); arme.push(a);
    }

    /* Kopf: groß, weich, mit Augen, Brauen, Wangen */
    const kopf = new T.Group(); kopf.position.y = 0.9; k.add(kopf);
    const schaedel = K(0.225, mFell, 0, 0, 0, 32); schaedel.scale.set(1, 0.94, 0.96); kopf.add(schaedel);
    if (A.extra === 'maehne') {
      const mM = stoff(A.mfarbe, 0.9), mM2 = stoff(hell(A.mfarbe, 0.15), 0.9);
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 14; i++) {
        const w = i / 14 * Math.PI * 2 + ring * 0.22, r = ring ? 0.25 : 0.215;
        const t = M(geo('ConeGeometry', ring ? 0.085 : 0.075, ring ? 0.2 : 0.17, 10), ring ? mM : mM2, Math.cos(w) * r, Math.sin(w) * r * 0.95, -0.07 - ring * 0.04);
        t.rotation.z = w - Math.PI / 2; t.rotation.x = -0.35; kopf.add(t);
      }
      const hinten = K(0.24, mM, 0, 0.0, -0.09, 24); hinten.scale.set(1, 1, 0.6); kopf.add(hinten);
    }
    // Augen
    const iris = stoff(AUGEN[art] || 0x3b2a1a, 0.25), weiss = stoff(0xffffff, 0.15), pupille = stoff(0x050505, 0.1);
    const glanz = new T.MeshBasicMaterial({ color:0xffffff });
    const lider = [];
    for (const s of [-1, 1]) {
      const auge = new T.Group(); auge.position.set(s * 0.083, 0.035, 0.178); auge.rotation.y = s * 0.28;
      const ap = K(0.052, weiss, 0, 0, 0, 20); ap.scale.set(0.9, 1, 0.55); auge.add(ap);
      const ir = K(0.033, iris, 0, -0.004, 0.022, 16); ir.scale.z = 0.5; auge.add(ir);
      const pu = K(0.019, pupille, 0, -0.004, 0.033, 12); pu.scale.z = 0.5; auge.add(pu);
      auge.add(M(geo('SphereGeometry', 0.008, 8, 6), glanz, s * -0.012 + 0.006, 0.012, 0.04));
      const lid = K(0.056, mFell, 0, 0, 0.002, 20); lid.scale.set(0.95, 1.05, 0.6); lid.scale.y = 0.001; lid.position.y = 0.05; auge.add(lid); lider.push(lid);
      const braue = M(geo('BoxGeometry', 0.055, 0.012, 0.012), stoff(dunkel(art === 'pinguin' ? 0x888888 : fell, 0.55), 0.6), s * 0.004, 0.068, 0.02);
      braue.rotation.z = -s * 0.15; auge.add(braue); auge.braue = braue;
      kopf.add(auge);
    }
    if (art !== 'pinguin') for (const s of [-1, 1]) { const w = K(0.035, stoff(0xff8fa3, 0.8, 0, { transparent:true, opacity:0.45 }), s * 0.13, -0.05, 0.165, 12); w.scale.set(1, 0.6, 0.3); kopf.add(w); }
    if (A.extra === 'maske') { const mk = K(0.1, stoff(0x2d2d30, 0.8), 0, 0.03, 0.16, 20); mk.scale.set(1.95, 0.55, 0.5); kopf.add(mk); kopf.children.forEach(c => { if (c.type === 'Group') c.position.z += 0.012; }); }
    // Schnauze
    switch (A.maul) {
      case 'kurz': {
        const m = K(0.09, mBauch, 0, -0.075, 0.155, 20); m.scale.set(1.25, 0.82, 0.85); kopf.add(m);
        const n = K(0.034, stoff(0x2a1712, 0.3), 0, -0.04, 0.23, 14); n.scale.set(1.25, 0.85, 0.8); kopf.add(n);
        kopf.add(M(geo('SphereGeometry', 0.008, 6, 4), glanz, -0.01, -0.03, 0.255));
        const mund = M(geo('TorusGeometry', 0.028, 0.005, 6, 12, Math.PI), stoff(0x3a1a14, 0.6), 0, -0.1, 0.225); mund.rotation.z = Math.PI; kopf.add(mund);
        break;
      }
      case 'spitz': {
        const m = M(geo('ConeGeometry', 0.085, 0.2, 18), mBauch, 0, -0.06, 0.24); m.rotation.x = Math.PI / 2; kopf.add(m);
        kopf.add(K(0.026, stoff(0x151515, 0.3), 0, -0.06, 0.34, 12));
        break;
      }
      case 'schnabel': {
        const ob = M(geo('ConeGeometry', 0.06, 0.15, 16), stoff(A.schnabel, 0.4), 0, -0.04, 0.26); ob.rotation.x = Math.PI / 2; ob.scale.set(1.4, 1, 0.6); kopf.add(ob);
        const ub = M(geo('ConeGeometry', 0.05, 0.11, 16), stoff(dunkel(A.schnabel, 0.15), 0.4), 0, -0.075, 0.245); ub.rotation.x = Math.PI / 2; ub.scale.set(1.3, 1, 0.5); kopf.add(ub);
        const ges = K(0.16, mBauch, 0, -0.01, 0.105, 24); ges.scale.set(1.15, 1.0, 0.75); kopf.add(ges); kopf.children.forEach(c => { if (c.type === 'Group') c.position.z += 0.035; });
        break;
      }
    }
    // Ohren mit Innenfarbe
    const innen = stoff(A.innen || 0xf2a7b5, 0.8);
    const ohr = s => {
      const gr = new T.Group();
      switch (A.ohren) {
        case 'rund': { const a = K(0.075, mFell, 0, 0, 0, 16); a.scale.z = 0.55; gr.add(a); const b = K(0.048, innen, 0, 0, 0.02, 14); b.scale.z = 0.4; gr.add(b); gr.position.set(s * 0.15, 0.17, -0.02); break; }
        case 'gross': { const a = K(0.12, mFell, 0, 0, 0, 18); a.scale.z = 0.3; gr.add(a); const b = K(0.085, innen, 0, 0, 0.018, 16); b.scale.z = 0.25; gr.add(b); gr.position.set(s * 0.19, 0.17, -0.02); break; }
        case 'spitz': { const a = M(geo('ConeGeometry', 0.075, 0.18, 14), mFell, 0, 0.06, 0); a.scale.z = 0.5; gr.add(a); const b = M(geo('ConeGeometry', 0.045, 0.12, 12), innen, 0, 0.045, 0.02); b.scale.z = 0.35; gr.add(b); gr.position.set(s * 0.14, 0.15, -0.02); gr.rotation.z = -s * 0.32; break; }
        case 'lang': { const a = K(0.06, mFell, 0, 0.17, 0, 16); a.scale.set(0.8, 3, 0.55); gr.add(a); const b = K(0.04, innen, 0, 0.17, 0.02, 14); b.scale.set(0.7, 2.7, 0.35); gr.add(b); gr.position.set(s * 0.085, 0.13, -0.02); gr.rotation.z = -s * 0.16; break; }
        case 'affe': {   // große runde Seitenohren mit hellrosa Innenseite, tief am Kopf
          const a = K(0.085, mFell, 0, 0, 0, 20); a.scale.z = 0.55; gr.add(a);
          const b = K(0.056, innen, 0, 0, 0.022, 16); b.scale.z = 0.4; gr.add(b);
          gr.position.set(s * 0.225, 0.02, -0.01); break;
        }
        case 'schlapp': { const a = K(0.08, stoff(dunkel(fell, 0.3), 0.85), 0, -0.1, 0, 16); a.scale.set(0.6, 1.6, 0.8); gr.add(a); gr.position.set(s * 0.2, 0.08, -0.02); gr.rotation.z = s * 0.25; break; }
        default: return null;
      }
      return gr;
    };
    for (const s of [-1, 1]) { const e = ohr(s); if (e) kopf.add(e); }
    // Schwänze
    if (A.extra === 'affe') {
      // helle Gesichtsmaske: Stirn-Herz, Wangen und Schnauze
      const maske = stoff(A.bauch, 0.8);
      const stirn = K(0.11, maske, 0, 0.055, 0.17, 24); stirn.scale.set(1.45, 0.82, 0.38); kopf.add(stirn);
      for (const s of [-1, 1]) { const w = K(0.1, maske, s * 0.075, -0.035, 0.165, 24); w.scale.set(1, 1.05, 0.4); kopf.add(w); }
      const kinn = K(0.075, maske, 0, -0.1, 0.155, 20); kinn.scale.set(1.4, 0.8, 0.7); kopf.add(kinn);
      for (const s of [-1, 1]) { const nl = K(0.01, stoff(0x2a1712, 0.4), s * 0.014, -0.045, 0.26, 8); kopf.add(nl); }
      // Haarbüschel
      for (let i = 0; i < 5; i++) { const h = M(geo('ConeGeometry', 0.02, 0.07, 6), mFell, (i - 2) * 0.03, 0.225, 0.03 - Math.abs(i - 2) * 0.012); h.rotation.z = (i - 2) * -0.22; kopf.add(h); }
      // langer, geschwungener Schwanz
      const kurve = new T.CatmullRomCurve3([new T.Vector3(0, 0.34, -0.2), new T.Vector3(0.0, 0.2, -0.46), new T.Vector3(0.12, 0.2, -0.7), new T.Vector3(0.2, 0.42, -0.74), new T.Vector3(0.14, 0.62, -0.62), new T.Vector3(0.04, 0.6, -0.5)]);
      g.add(M(new T.TubeGeometry(kurve, 32, 0.032, 10), mFell));
      g.add(K(0.036, mFell, 0.04, 0.6, -0.5, 10));
    }
    if (A.extra === 'schwanz') { const sw = K(0.1, mFell, 0, 0.36, -0.28, 18); sw.scale.set(0.85, 0.85, 2.1); sw.rotation.x = 0.4; g.add(sw); const sp = K(0.07, mBauch, 0, 0.45, -0.47, 14); sp.scale.set(0.9, 0.9, 1.3); g.add(sp); }
    if (art === 'waschbaer') for (let i = 0; i < 4; i++) g.add(K(0.07 - i * 0.004, i % 2 ? stoff(0x2d2d30, 0.85) : mFell, 0, 0.33 + i * 0.03, -0.25 - i * 0.085, 14));
    if (art === 'hase') g.add(K(0.06, mBauch, 0, 0.36, -0.2, 14));
    // Sonnenbrille
    const brille = new T.Group();
    const glas = stoff(0x101014, 0.06, 0.6);
    for (const s of [-1, 1]) { const gl = Z(0.05, 0.05, 0.014, glas, s * 0.083, 0.035, 0.235, 20); gl.rotation.x = Math.PI / 2; gl.rotation.z = s * 0.28; gl.scale.set(1.1, 1, 0.85); brille.add(gl); }
    brille.add(M(geo('BoxGeometry', 0.05, 0.01, 0.01), mGold, 0, 0.05, 0.24));
    for (const s of [-1, 1]) { const b2 = M(geo('BoxGeometry', 0.008, 0.008, 0.16), mGold, s * 0.14, 0.05, 0.16); brille.add(b2); }
    // lässig auf die Stirn geschoben, damit man die Augen sieht
    brille.position.set(0, 0.105, -0.03); brille.rotation.x = -0.32;
    kopf.add(brille);
    // Hut
    if (o.hut) {
      const h = new T.Group(); h.position.y = 0.165;
      const mHut = stoff(o.hut, 0.55);
      h.add(Z(0.29, 0.3, 0.018, mHut, 0, 0, 0, 28));
      h.add(Z(0.165, 0.185, 0.17, mHut, 0, 0.09, 0, 24));
      h.add(Z(0.187, 0.187, 0.04, stoff(o.hutband || 0x222222, 0.4), 0, 0.03, 0, 24));
      h.rotation.x = -0.1;
      kopf.add(h);
    }
    g.arme = arme; g.beine = beine; g.koerper = k; g.kopf = kopf; g.brille = brille; g.unterhose = unterhose; g.rumpf = rumpf;
    // Item in der rechten Hand: Modell hängt am Arm, dreht sich langsam
    g.itemHalten = (modell, skala) => {
      if (g.trage) { arme[1].remove(g.anker); g.trage = null; g.anker = null; }
      g.haelt = !!modell;
      if (!modell) return;
      const anker = new T.Group(); anker.position.set(0, -0.4, 0.27);
      modell.scale.setScalar(skala || 0.46); modell.position.y = (skala || 0.46) * 0.5;
      const dreh = new T.Group(); dreh.add(modell); anker.add(dreh);
      arme[1].add(anker); g.anker = anker; g.trage = dreh;
    };
    g.skala = o.skala || 1.5;
    g.scale.setScalar(g.skala);
    g.pfand = p => {
      p = p || {};
      for (const b of beine) { b.teile.schuh.visible = !p.schuhe; b.teile.fuss.visible = !!p.schuhe; (b.teile.fuss.zehen || []).forEach(z2 => z2.visible = !!p.schuhe); b.teile.hose.visible = !p.hose; b.teile.bein.visible = !!p.hose; }
      unterhose.visible = !!p.hose;
      brille.visible = !p.brille;
      if (arme[0].uhr) arme[0].uhr.visible = !p.uhr;
    };
    g.schritt = 0; g.jubel = 0; g.frust = 0;
    let blinzel = 2 + Math.random() * 3, zeit = Math.random() * 10;
    g.animieren = (dt, tempo, spielt, t) => {
      zeit += dt;
      g.schritt += dt * tempo * 8;
      const sw = tempo > 0.1 ? Math.sin(g.schritt) : 0;
      beine[0].rotation.x = sw * 0.55; beine[1].rotation.x = -sw * 0.55;
      const atem = Math.sin(zeit * 2.2) * 0.012;
      k.position.y = Math.abs(sw) * 0.035; k.scale.set(1 - atem * 0.5, 1 + atem, 1 - atem * 0.5);
      k.rotation.z = sw * 0.04;
      let a0 = -0.12 + sw * 0.55, a1 = -0.12 - sw * 0.55;
      if (spielt) { a0 = -0.95 + Math.sin(t * 3) * 0.08; a1 = -0.95 - Math.sin(t * 3 + 1) * 0.08; }
      if (g.haelt) { a1 = -1.25 + Math.sin(zeit * 1.6) * 0.04; if (!spielt) a0 = -0.12 + sw * 0.55 * 0.5; }   // Item vor dem Körper präsentieren
      if (g.trage) g.trage.rotation.y += dt * 0.9;
      if (g.jubel > 0) { g.jubel -= dt; a0 = a1 = -2.8 + Math.sin(t * 18) * 0.25; k.position.y = Math.abs(Math.sin(t * 9)) * 0.08; }
      kopf.rotation.y = g.frust > 0 ? Math.sin(t * 14) * 0.45 : Math.sin(zeit * 0.6) * 0.12;
      kopf.rotation.x = g.frust > 0 ? 0.25 : Math.sin(zeit * 0.9) * 0.03;
      kopf.rotation.z = tempo > 0.1 ? 0 : Math.sin(zeit * 0.5) * 0.04;
      if (g.frust > 0) g.frust -= dt;
      arme[0].rotation.x += (a0 - arme[0].rotation.x) * Math.min(1, dt * 12);
      arme[1].rotation.x += (a1 - arme[1].rotation.x) * Math.min(1, dt * 12);
      // Blinzeln
      blinzel -= dt;
      const zu = blinzel < 0 ? Math.max(0, 1 - Math.abs(blinzel + 0.07) / 0.07) : 0;
      if (blinzel < -0.14) blinzel = 2 + Math.random() * 4;
      for (const l of lider) { l.scale.y = Math.max(0.001, zu * 1.05); l.position.y = 0.05 * (1 - zu); }
    };
    return g;
  }

  /* ---------- Don Flosse: Hai im Nadelstreifen ---------- */
  function donFlosse() {
    const g = new T.Group();
    const haut = 0x6f8696, bauch = 0xbfc8cf, anzug = 0x15161b;
    const k = new T.Group(); g.add(k);
    for (const s of [-1, 1]) { k.add(zyl(0.09, 0.08, 0.32, anzug, s * 0.12, 0.16, 0, 8)); k.add(box(0.15, 0.08, 0.26, 0x2a1a10, s * 0.12, 0.03, 0.05)); }
    const torso = new T.Mesh(rumpfGeo(), stoff(anzug, 0.42, 0.05)); torso.scale.set(1.32, 1.32, 1.25); torso.position.y = -0.076; k.add(torso);
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
    const schaedel = kugel(0.25, haut, 0, 0.02, 0, 32); schaedel.scale.set(1, 0.9, 1.2); kopf.add(schaedel);
    // spitze Schnauze nach vorn
    const schnauze = kegel(0.2, 0.34, haut, 0, 0.03, 0.33, 28); schnauze.rotation.x = Math.PI / 2; schnauze.scale.set(1, 1, 0.62); kopf.add(schnauze);
    kopf.add(kugel(0.045, haut, 0, 0.03, 0.49, 16));
    // heller Unterkiefer
    const unten = kugel(0.22, bauch, 0, -0.1, 0.1, 28); unten.scale.set(1, 0.48, 1.35); kopf.add(unten);
    // breites Grinsen unter der Schnauze mit Zahnreihe und Goldzahn
    const maul = kugel(0.16, 0x2a080c, 0, -0.085, 0.27, 28); maul.scale.set(1.15, 0.26, 0.5); kopf.add(maul);
    for (let i = 0; i < 11; i++) {
      const x = -0.15 + i * 0.03, zz = 0.335 - Math.pow(Math.abs(x) / 0.15, 2) * 0.06;
      const zahn = kegel(0.014, 0.045, i === 7 ? 0xe8b923 : 0xfafafa, x, -0.063, zz, 6); zahn.rotation.x = Math.PI; kopf.add(zahn);
      if (i % 2) { const u = kegel(0.012, 0.035, 0xfafafa, x, -0.11, zz - 0.01, 6); kopf.add(u); }
    }
    const stocher = zyl(0.004, 0.004, 0.15, 0xd7b98a, 0.18, -0.09, 0.27, 6); stocher.rotation.z = 1.25; stocher.rotation.y = 0.5; kopf.add(stocher);
    for (const s of [-1, 1]) {
      // Augen seitlich, selbstgefälliger Halbblick, schwere Braue
      const auge = new T.Group(); auge.position.set(s * 0.19, 0.08, 0.17); auge.rotation.y = s * 0.75;
      const ap = kugel(0.05, 0xfdfdfd, 0, 0, 0, 20); ap.scale.z = 0.6; auge.add(ap);
      const pu = kugel(0.028, 0x111111, 0, -0.008, 0.024, 14); pu.scale.z = 0.5; auge.add(pu);
      auge.add(new T.Mesh(geo('SphereGeometry', 0.008, 8, 6), new T.MeshBasicMaterial({ color:0xffffff })).translateX(0.01).translateY(0.004).translateZ(0.036));
      const lid = kugel(0.053, haut, 0, 0.02, 0.004, 20); lid.scale.set(1.02, 0.55, 0.65); auge.add(lid);
      const braue = box(0.085, 0.02, 0.03, 0x2f3a44, 0, 0.055, 0.02); braue.rotation.z = s * 0.3; auge.add(braue);
      kopf.add(auge);
      for (let i = 0; i < 3; i++) kopf.add(box(0.006, 0.08, 0.03, 0x4d6070, s * 0.235, -0.04, -0.06 - i * 0.05));   // Kiemen
    }
    // Rückenflosse ragt durch den Hut
    const rf = kegel(0.15, 0.42, haut, 0, 0.42, -0.08, 4); rf.scale.z = 0.32; rf.rotation.x = -0.32; kopf.add(rf);
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

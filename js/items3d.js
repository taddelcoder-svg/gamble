/* Kredithai – 3D-Modelle der Items (three.js r128). Jedes Modell wird einmal in einem kleinen Studio gerendert
   (Spiegelung aus einer Umgebungskarte, Hauptlicht, Gegenlicht) und als Drehteller-Bildstreifen gespeichert.
   KHItems.element(item, größe) liefert ein Element, das sich beim Drüberfahren dreht. Items ohne Modell zeigen ihr Emoji. */
(function () {
  'use strict';
  const T = THREE;
  const FRAMES = 20, PX = 192;

  /* ---------- Hilfen ---------- */
  function tex(w, h, malen, wiederholen) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    malen(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.anisotropy = 8; t.encoding = T.sRGBEncoding;
    if (wiederholen) t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  const std = (farbe, rau, metall, extra) => new T.MeshStandardMaterial({ color:farbe, roughness:rau, metalness:metall, ...extra });
  const gold = () => std(0xf0b92e, 0.2, 1, { envMapIntensity:1.5 });
  const goldDunkel = () => std(0xb8862b, 0.32, 1);
  const lathe = (punkte, seg = 48) => new T.LatheGeometry(punkte.map(([r, y]) => new T.Vector2(r, y)), seg);
  // Profil aus Kurve glätten (Catmull-Rom), damit Drehkörper wirklich rund werden
  function glatt(punkte, n = 40) {
    const k = new T.SplineCurve(punkte.map(([r, y]) => new T.Vector2(r, y)));
    return k.getPoints(n).map(p => [Math.max(0.0001, p.x), p.y]);
  }
  const dreht = (o, a, v) => { o.rotation[a] = v; return o; };   // Drehung setzen und das Objekt zurückgeben (add() gibt sonst die Gruppe zurück)
  const M = (g, m, x = 0, y = 0, z = 0) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); return o; };

  /* ================= Modelle ================= */
  const MODELLE = {};

  /* Goldener Chip: großer Casino-Chip auf der Kante, Randkerben in Rot/Weiß, Emaille-Mitte mit Hai, zwei flache Chips davor */
  function chip(r, dicke, farbe) {
    const g = new T.Group();
    // Körper: Drehkörper mit abgerundeter Kante
    const prof = glatt([[0.0001, -dicke / 2], [r * 0.82, -dicke / 2], [r * 0.97, -dicke * 0.42], [r, -dicke * 0.2], [r, dicke * 0.2], [r * 0.97, dicke * 0.42], [r * 0.82, dicke / 2], [0.0001, dicke / 2]], 40);
    const koerper = M(lathe(prof, 64), farbe === 'gold' ? gold() : std(farbe, 0.35, 0.1)); g.add(koerper);
    // Randkerben abwechselnd rot/elfenbein als flache Blöcke
    const kerbe = new T.BoxGeometry(r * 0.2, dicke * 0.72, r * 0.2);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      const k = M(kerbe, std(i % 2 ? 0xfaf3df : 0xc4262e, 0.35, 0.05), Math.cos(a) * r * 0.985, 0, Math.sin(a) * r * 0.985);
      k.scale.set(0.5, 1, 1); k.rotation.y = -a; g.add(k);
    }
    // Innenring (Gold) und Emaille-Mitte mit Aufdruck
    for (const s of [-1, 1]) {
      const ring = M(new T.TorusGeometry(r * 0.66, r * 0.028, 12, 64), gold()); ring.rotation.x = Math.PI / 2; ring.position.y = s * dicke * 0.5; g.add(ring);
      const email = M(new T.CircleGeometry(r * 0.64, 64), new T.MeshStandardMaterial({
        roughness:0.22, metalness:0.1, map:tex(512, 512, (x, w, h) => {
          const gr = x.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 2); gr.addColorStop(0, '#a3121b'); gr.addColorStop(1, '#5e0a10');
          x.fillStyle = gr; x.fillRect(0, 0, w, h);
          x.strokeStyle = '#f0b92e'; x.lineWidth = 8; x.beginPath(); x.arc(w / 2, h / 2, w * 0.4, 0, 7); x.stroke();
          x.lineWidth = 3; x.beginPath(); x.arc(w / 2, h / 2, w * 0.45, 0, 7); x.stroke();
          x.fillStyle = '#f7d56a'; x.font = '900 230px "Playfair Display",Georgia,serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$', w / 2, h / 2 + 12);
          x.font = '800 38px "Barlow Semi Condensed",sans-serif'; x.fillStyle = '#f0b92e'; x.fillText('★  KREDITHAI  ★', w / 2, h * 0.84);
        })
      }));
      email.rotation.x = -s * Math.PI / 2; email.position.y = s * (dicke / 2 + 0.002); g.add(email);
    }
    return g;
  }
  MODELLE.goldchip = () => {
    const g = new T.Group();
    const gross = chip(0.62, 0.17, 'gold'); gross.rotation.x = Math.PI / 2; gross.rotation.z = 0.18; gross.position.set(0, 0.7, -0.05); g.add(gross);
    // zwei liegende Chips als Sockel
    const a = chip(0.52, 0.12, 0xc4262e); a.position.set(0.12, 0.06, 0.2); a.rotation.y = 0.5; g.add(a);
    const b = chip(0.52, 0.12, 0x1a1a1f); b.position.set(-0.05, 0.19, 0.18); b.rotation.y = -0.3; g.add(b);
    const c = chip(0.52, 0.12, 0x2563c9); c.position.set(0.0, 0.32, 0.18); c.rotation.y = 0.9; g.add(c);
    return g;
  };

  /* Kristallkugel: Glaskugel mit leuchtendem Nebel, goldener Fuß mit drei Krallen, Funken */
  MODELLE.kugel = () => {
    const g = new T.Group();
    // Fuß: Drehkörper mit Wulsten
    const fuss = M(lathe(glatt([[0.46, 0], [0.5, 0.04], [0.5, 0.09], [0.36, 0.13], [0.3, 0.2], [0.34, 0.27], [0.4, 0.3], [0.4, 0.34], [0.3, 0.37]], 60), 64), gold()); g.add(fuss);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + 0.5;
      const kralle = M(new T.ConeGeometry(0.05, 0.3, 12), gold(), Math.cos(a) * 0.4, 0.06, Math.sin(a) * 0.4);
      kralle.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); kralle.position.y = 0.04; g.add(kralle);
      const knopf = M(new T.SphereGeometry(0.07, 16, 12), gold(), Math.cos(a) * 0.5, 0.0, Math.sin(a) * 0.5); g.add(knopf);
    }
    // Kern: Nebel-Textur, selbstleuchtend
    const neb = tex(512, 256, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a0f6b'); gr.addColorStop(0.5, '#7b2cbf'); gr.addColorStop(1, '#ff4fa3');
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(${200 + Math.random() * 55 | 0},${150 + Math.random() * 100 | 0},255,${Math.random() * 0.22})`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 46, 0, 7); x.fill(); }
      for (let i = 0; i < 70; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.5 + Math.random() * 0.5) + ')'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    }, true);
    const kern = M(new T.SphereGeometry(0.36, 48, 32), new T.MeshStandardMaterial({ map:neb, emissive:0x7b2cbf, emissiveMap:neb, emissiveIntensity:1.1, roughness:0.6 }), 0, 0.82, 0); g.add(kern);
    // Glas
    const glas = M(new T.SphereGeometry(0.52, 64, 48), new T.MeshPhysicalMaterial({ color:0xdfe9ff, roughness:0.02, metalness:0, transparent:true, opacity:0.2, clearcoat:1, clearcoatRoughness:0.02, envMapIntensity:2.2 }), 0, 0.84, 0);
    glas.renderOrder = 2; g.add(glas);
    // Funken
    const funke = new T.SphereGeometry(0.014, 8, 6), fm = new T.MeshBasicMaterial({ color:0xfff3c4 });
    for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 0.2 + (i % 4) * 0.05; g.add(M(funke, fm, Math.cos(a) * r, 0.84 + Math.sin(i * 1.7) * 0.28, Math.sin(a) * r)); }
    return g;
  };

  /* Hai-Ball: Cocktail in Hurricane-Glas mit Orangenscheibe, Schirmchen, Kirsche, Strohhalm und Eis */
  MODELLE.drink = () => {
    const g = new T.Group();
    const glasM = new T.MeshPhysicalMaterial({ color:0xeaf4ff, roughness:0.03, metalness:0, transparent:true, opacity:0.28, clearcoat:1, clearcoatRoughness:0.03, envMapIntensity:2, side:T.DoubleSide });
    const aussen = glatt([[0.3, 0], [0.31, 0.02], [0.05, 0.05], [0.045, 0.2], [0.05, 0.36], [0.2, 0.52], [0.34, 0.74], [0.38, 0.98], [0.37, 1.18], [0.355, 1.2]], 70);
    const glas = M(lathe(aussen, 64), glasM); glas.renderOrder = 3; g.add(glas);
    // Flüssigkeit mit Farbverlauf (Rot unten, Orange, Gelb oben) als Textur
    const verlauf = tex(8, 256, (x, w, h) => { const gr = x.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#d7191c'); gr.addColorStop(0.4, '#fd8d3c'); gr.addColorStop(1, '#ffe066'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
    const fl = glatt([[0.0001, 0.45], [0.17, 0.5], [0.3, 0.74], [0.34, 0.95], [0.335, 1.08], [0.0001, 1.08]], 50);
    const saft = M(lathe(fl, 48), new T.MeshStandardMaterial({ map:verlauf, roughness:0.15, metalness:0, emissive:0x662200, emissiveIntensity:0.25 })); g.add(saft);
    // Eiswürfel
    for (const [x, y, z, r] of [[0.1, 1.05, 0.08, 0.4], [-0.12, 1.0, -0.05, 1.1], [0.0, 1.1, -0.14, 0.2]]) {
      const e = M(new T.BoxGeometry(0.17, 0.17, 0.17), new T.MeshPhysicalMaterial({ color:0xf0f8ff, transparent:true, opacity:0.55, roughness:0.05, clearcoat:1 }), x, y, z); e.rotation.set(r, r * 2, r * 0.5); g.add(e);
    }
    // Orangenscheibe am Rand
    const scheibe = M(new T.CylinderGeometry(0.2, 0.2, 0.035, 40), new T.MeshStandardMaterial({ roughness:0.5, map:tex(256, 256, (x, w, h) => {
      x.fillStyle = '#ff9f1c'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd166'; x.beginPath(); x.arc(w / 2, h / 2, w * 0.43, 0, 7); x.fill();
      x.strokeStyle = '#ff9f1c'; x.lineWidth = 6; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; x.beginPath(); x.moveTo(w / 2, h / 2); x.lineTo(w / 2 + Math.cos(a) * w * 0.43, h / 2 + Math.sin(a) * h * 0.43); x.stroke(); }
    }) }), 0.33, 1.22, 0.0); scheibe.rotation.set(1.15, 0, -0.35); g.add(scheibe);
    // Strohhalm (gestreift) mit Knick
    const streifen = tex(32, 256, (x, w, h) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#e63946'; x.fillRect(0, i * 16, w, 16); } }, true);
    const halm = M(new T.CylinderGeometry(0.022, 0.022, 0.95, 12), new T.MeshStandardMaterial({ map:streifen, roughness:0.4 }), -0.14, 1.2, -0.05); halm.rotation.z = 0.2; g.add(halm);
    const knick = M(new T.CylinderGeometry(0.022, 0.022, 0.26, 12), new T.MeshStandardMaterial({ map:streifen, roughness:0.4 }), -0.25, 1.67, -0.05); knick.rotation.z = -1.2; g.add(knick);
    // Schirmchen
    const sch = new T.Group(); sch.position.set(0.12, 1.2, -0.12); sch.rotation.z = -0.35;
    sch.add(M(new T.CylinderGeometry(0.008, 0.008, 0.55, 8), std(0xd7b98a, 0.6, 0), 0, 0.27, 0));
    const dach = M(new T.ConeGeometry(0.2, 0.12, 24, 1, true), new T.MeshStandardMaterial({ side:T.DoubleSide, roughness:0.7, map:tex(256, 64, (x, w, h) => { for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#ff4d8d' : '#fff2f7'; x.fillRect(i * w / 12, 0, w / 12, h); } }, true) }), 0, 0.56, 0); sch.add(dach);
    sch.add(M(new T.SphereGeometry(0.018, 10, 8), gold(), 0, 0.64, 0));
    g.add(sch);
    // Kirsche auf Spieß
    g.add(M(new T.SphereGeometry(0.075, 24, 16), std(0x9c0b1c, 0.12, 0, { clearcoat:1 }), 0.02, 1.28, 0.2));
    const stiel = M(new T.TorusGeometry(0.07, 0.006, 6, 16, Math.PI * 0.9), std(0x3b5d2a, 0.7, 0), 0.05, 1.37, 0.2); stiel.rotation.z = 1.1; g.add(stiel);
    return g;
  };


  /* ---------- Gemeinsame Bausteine für die weiteren Modelle ---------- */
  const SPH = (r, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 32) => { const o = M(new T.SphereGeometry(r, seg, Math.round(seg * 0.75)), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
  const CYL = (r1, r2, h, m, x = 0, y = 0, z = 0, seg = 32) => M(new T.CylinderGeometry(r1, r2, h, seg), m, x, y, z);
  const TOR = (R, r, m, x = 0, y = 0, z = 0, bogen = Math.PI * 2, seg = 48) => M(new T.TorusGeometry(R, r, 14, seg, bogen), m, x, y, z);
  const KEG = (r, h, m, x = 0, y = 0, z = 0, seg = 24) => M(new T.ConeGeometry(r, h, seg), m, x, y, z);
  const glas = (op = 0.25) => new T.MeshPhysicalMaterial({ color:0xeaf4ff, roughness:0.03, metalness:0, transparent:true, opacity:op, clearcoat:1, clearcoatRoughness:0.03, envMapIntensity:2, side:T.DoubleSide });
  const porz = (farbe = 0xfbf7ef) => new T.MeshPhysicalMaterial({ color:farbe, roughness:0.18, metalness:0, clearcoat:1, clearcoatRoughness:0.08 });
  const emis = (farbe, st = 1.2) => new T.MeshStandardMaterial({ color:farbe, emissive:farbe, emissiveIntensity:st, roughness:0.4 });
  const SCHWARZ = () => new T.MeshStandardMaterial({ color:0x0e0e12, roughness:0.2, metalness:0.3 });

  /* Schmiergeld: drei gebündelte Geldstapel mit Papierband und ein aufgefächerter Schein */
  const SCHEIN = () => tex(512, 224, (x, w, h) => {
    x.fillStyle = '#7fb77a'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#2f6a3a'; x.lineWidth = 6; x.strokeRect(10, 10, w - 20, h - 20); x.lineWidth = 2; x.strokeRect(22, 22, w - 44, h - 44);
    for (let i = 0; i < 26; i++) { x.strokeStyle = 'rgba(47,106,58,.25)'; x.beginPath(); x.arc(w / 2, h / 2, 20 + i * 5, 0, 7); x.stroke(); }
    x.fillStyle = '#c8e6c3'; x.beginPath(); x.ellipse(w / 2, h / 2, 62, 76, 0, 0, 7); x.fill(); x.strokeStyle = '#2f6a3a'; x.lineWidth = 3; x.stroke();
    x.fillStyle = '#3d7d48'; x.beginPath(); x.arc(w / 2, h / 2 - 18, 22, 0, 7); x.fill(); x.fillRect(w / 2 - 34, h / 2 + 6, 68, 52);
    x.fillStyle = '#1f4f2a'; x.font = '900 62px "Playfair Display",Georgia,serif'; x.textAlign = 'center'; x.fillText('100', 78, 82); x.fillText('100', w - 78, h - 36);
    x.font = '700 22px "Barlow Semi Condensed",sans-serif'; x.fillText('DON FLOSSE BANK', w / 2, 40);
  });
  MODELLE.bestechung = () => {
    const g = new T.Group();
    const schein = new T.MeshStandardMaterial({ map:SCHEIN(), roughness:0.7 }), kante = std(0xa9cfa4, 0.8, 0);
    const band = std(0xf1e3b8, 0.8, 0), bandRot = std(0xc4262e, 0.5, 0.1);
    function stapel(x, z, ry, n) {
      const s = new T.Group();
      for (let i = 0; i < n; i++) {
        const b = M(new T.BoxGeometry(0.92, 0.035, 0.42), [kante, kante, schein, kante, kante, kante], 0, 0.02 + i * 0.036, 0);
        b.rotation.y = (Math.sin(i * 12.9898) * 0.5) * 0.06; b.position.x = Math.sin(i * 78.2) * 0.012; s.add(b);
      }
      const h = n * 0.036;
      const bd = M(new T.BoxGeometry(0.2, h + 0.012, 0.44), band, 0, h / 2 + 0.01, 0); s.add(bd);
      const st = M(new T.BoxGeometry(0.205, 0.05, 0.445), bandRot, 0, h / 2 + 0.01, 0); s.add(st);
      s.position.set(x, 0, z); s.rotation.y = ry; return s;
    }
    g.add(stapel(-0.05, 0.28, 0.12, 9), stapel(0.08, -0.05, -0.1, 11), stapel(-0.12, -0.38, 0.2, 8));
    // aufgefächerte lose Scheine obenauf
    for (let i = 0; i < 4; i++) { const b = M(new T.BoxGeometry(0.92, 0.012, 0.42), [kante, kante, schein, kante, kante, kante], 0.05, 0.43 + i * 0.014, -0.05); b.rotation.set(0, -0.5 + i * 0.35, 0); b.position.x += i * 0.015; g.add(b); }
    // Goldene Büroklammer
    const kl = TOR(0.06, 0.008, gold(), 0.3, 0.47, -0.05, Math.PI * 1.7); kl.rotation.x = Math.PI / 2; g.add(kl);
    return g;
  };

  /* Glücksstatue: goldener Löwe auf Marmorsockel mit blauem Schutzring */
  MODELLE.statue = () => {
    const g = new T.Group();
    const marmor = new T.MeshStandardMaterial({ roughness:0.25, metalness:0.05, map:tex(256, 256, (x, w, h) => { x.fillStyle = '#ece8e0'; x.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { x.strokeStyle = 'rgba(120,120,135,' + (0.08 + Math.random() * 0.12) + ')'; x.lineWidth = 1 + Math.random() * 3; x.beginPath(); x.moveTo(Math.random() * w, 0); x.bezierCurveTo(Math.random() * w, h * 0.3, Math.random() * w, h * 0.7, Math.random() * w, h); x.stroke(); } }) });
    g.add(M(new T.BoxGeometry(0.95, 0.12, 0.7), marmor, 0, 0.06, 0));
    g.add(M(new T.BoxGeometry(0.8, 0.07, 0.58), gold(), 0, 0.155, 0));
    g.add(M(lathe(glatt([[0.34, 0.19], [0.3, 0.26], [0.26, 0.5], [0.3, 0.7], [0.34, 0.78], [0.38, 0.8]], 30), 4), marmor, 0, 0, 0)); g.children[g.children.length - 1].rotation.y = Math.PI / 4;
    const L = new T.Group(); L.position.y = 0.8; g.add(L);
    const go = gold();
    L.add(SPH(0.27, go, 0, 0.26, -0.03, 0.95, 1.05, 1.35));          // Körper
    L.add(SPH(0.2, go, 0, 0.52, 0.2, 1, 1.15, 0.9));                 // Brust
    L.add(SPH(0.17, go, 0, 0.82, 0.24));                              // Kopf
    L.add(SPH(0.09, go, 0, 0.77, 0.4, 1.1, 0.8, 1));                  // Schnauze
    L.add(SPH(0.03, SCHWARZ(), 0, 0.8, 0.47));
    for (const s of [-1, 1]) {
      L.add(SPH(0.04, SCHWARZ(), s * 0.07, 0.86, 0.38)); L.add(SPH(0.06, go, s * 0.13, 0.97, 0.2, 1, 1, 0.5));
      L.add(CYL(0.05, 0.045, 0.45, go, s * 0.12, 0.28, 0.32, 16));   // Vorderbeine
      L.add(SPH(0.065, go, s * 0.12, 0.05, 0.38, 1, 0.7, 1.4));
      L.add(SPH(0.075, go, s * 0.19, 0.15, -0.22, 1, 1.1, 1.2));      // Hinterkeulen
    }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const z = KEG(0.07, 0.2, std(0xd8a21c, 0.25, 1), Math.cos(a) * 0.2, 0.82 + Math.sin(a) * 0.2, 0.15); z.rotation.z = a - Math.PI / 2; z.rotation.x = -0.3; L.add(z); }
    const sch = TOR(0.28, 0.025, go, 0, 0.18, -0.38, Math.PI * 1.1); sch.rotation.set(0.5, 0, 1.9); L.add(sch);   // Schwanz
    L.add(SPH(0.05, go, -0.12, 0.05, -0.62));
    // Schutzring
    const ring = TOR(0.55, 0.014, emis(0x66e0ff, 1.6), 0, 0.08, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
    return g;
  };

  /* Versicherung: edle Police mit Goldrand, Wachssiegel, Band und Füllfederhalter */
  MODELLE.versicherung = () => {
    const g = new T.Group();
    const papier = new T.MeshStandardMaterial({ roughness:0.7, map:tex(512, 704, (x, w, h) => {
      x.fillStyle = '#f7f0dc'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(150,120,70,' + Math.random() * 0.05 + ')'; x.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
      x.strokeStyle = '#b8862b'; x.lineWidth = 8; x.strokeRect(22, 22, w - 44, h - 44); x.lineWidth = 2; x.strokeRect(38, 38, w - 76, h - 76);
      x.fillStyle = '#4a3410'; x.font = '900 54px "Playfair Display",Georgia,serif'; x.textAlign = 'center'; x.fillText('POLICE', w / 2, 128);
      x.font = 'italic 700 26px "Playfair Display",Georgia,serif'; x.fillText('Don Flosse Versicherung AG', w / 2, 170);
      x.fillStyle = '#b8862b'; x.beginPath(); x.moveTo(w / 2, 205); x.lineTo(w / 2 + 52, 225); x.lineTo(w / 2 + 44, 292); x.quadraticCurveTo(w / 2, 330, w / 2 - 44, 292); x.lineTo(w / 2 - 52, 225); x.closePath(); x.fill();
      x.fillStyle = '#f7f0dc'; x.font = '900 64px "Playfair Display",Georgia,serif'; x.fillText('½', w / 2, 284);
      x.fillStyle = 'rgba(74,52,16,.55)'; for (let i = 0; i < 9; i++) x.fillRect(80, 380 + i * 24, w - 160 - (i % 3) * 40, 6);
      x.strokeStyle = '#4a3410'; x.lineWidth = 3; x.beginPath(); x.moveTo(90, 640); x.bezierCurveTo(130, 600, 160, 660, 210, 620); x.stroke();
    }) });
    const rand = std(0xe9dfc3, 0.8, 0);
    const blatt = M(new T.BoxGeometry(0.78, 0.03, 1.07), [rand, rand, papier, rand, rand, rand]); blatt.rotation.x = -0.12; blatt.position.y = 0.2; g.add(blatt);
    const unter = M(new T.BoxGeometry(0.8, 0.03, 1.09), rand, 0.03, 0.17, 0.02); unter.rotation.x = -0.12; unter.rotation.y = 0.06; g.add(unter);
    // Wachssiegel mit Band
    const siegel = M(lathe(glatt([[0.0001, 0], [0.12, 0.005], [0.14, 0.03], [0.12, 0.05], [0.09, 0.055], [0.0001, 0.05]], 30), 40), std(0x9c0b1c, 0.3, 0.1, { clearcoat:1 }), 0.2, 0.22, 0.42); g.add(siegel);
    const stern = TOR(0.07, 0.01, std(0xc4262e, 0.3, 0.1), 0.2, 0.275, 0.42); stern.rotation.x = Math.PI / 2; g.add(stern);
    for (const s of [-1, 1]) { const b = M(new T.BoxGeometry(0.07, 0.01, 0.34), std(0x9c0b1c, 0.4, 0.1), 0.2 + s * 0.06, 0.205, 0.62); b.rotation.y = s * 0.2; g.add(b); }
    // Füllfederhalter
    const f = new T.Group(); f.add(CYL(0.026, 0.026, 0.55, SCHWARZ(), 0, 0, 0, 20)); f.add(CYL(0.027, 0.027, 0.04, gold(), 0, 0.12, 0, 20)); f.add(CYL(0.027, 0.027, 0.04, gold(), 0, -0.2, 0, 20));
    f.add(dreht(KEG(0.026, 0.1, gold(), 0, -0.325, 0, 20), 'x', Math.PI)); f.children[f.children.length - 1].position.y = -0.34; f.add(CYL(0.006, 0.006, 0.18, gold(), 0.045, 0.1, 0, 8));
    f.rotation.set(Math.PI / 2, 0, 0.9); f.position.set(-0.28, 0.27, 0.15); g.add(f);
    g.rotation.set(Math.PI / 2 - 0.12, 0, -0.1);   // aufrecht stellen, Schrift zur Kamera
    return g;
  };

  /* Sanduhr: goldene Kappen und Säulen, Glaskolben, fallender Sand */
  MODELLE.sanduhr = () => {
    const g = new T.Group();
    const go = gold(), sand = std(0xf0c45a, 0.9, 0, { emissive:0x553300, emissiveIntensity:0.15 });
    for (const y of [-0.62, 0.62]) { g.add(CYL(0.46, 0.46, 0.08, go, 0, y, 0, 48)); g.add(dreht(TOR(0.46, 0.03, go, 0, y + (y > 0 ? 0.04 : -0.04) * 0, 0, Math.PI * 2, 48), 'x', Math.PI / 2)); g.add(CYL(0.4, 0.46, 0.05, go, 0, y + (y > 0 ? -0.06 : 0.06), 0, 48)); }
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.5; const s = CYL(0.025, 0.025, 1.24, go, Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38, 12); g.add(s); g.add(SPH(0.04, go, Math.cos(a) * 0.38, 0.62, Math.sin(a) * 0.38, 1, 1, 1, 12)); g.add(SPH(0.04, go, Math.cos(a) * 0.38, -0.62, Math.sin(a) * 0.38, 1, 1, 1, 12)); }
    const kolben = lathe(glatt([[0.36, 0.58], [0.38, 0.4], [0.3, 0.2], [0.06, 0.03], [0.04, 0], [0.06, -0.03], [0.3, -0.2], [0.38, -0.4], [0.36, -0.58]], 60), 56);
    const k = M(kolben, glas(0.22)); k.renderOrder = 3; g.add(k);
    // Sand oben (halbvoll, mit Trichter) und unten (Haufen)
    g.add(M(lathe(glatt([[0.0001, 0.27], [0.22, 0.31], [0.32, 0.4], [0.35, 0.56], [0.0001, 0.56]], 30), 40), sand));
    g.add(M(lathe(glatt([[0.0001, -0.57], [0.34, -0.55], [0.34, -0.5], [0.2, -0.38], [0.0001, -0.27]], 30), 40), sand));
    g.add(CYL(0.012, 0.012, 0.42, sand, 0, -0.1, 0, 8));
    return g;
  };

  /* Röntgenbrille: Retro-Brille mit leuchtenden Spirallinsen */
  MODELLE.brille = () => {
    const g = new T.Group();
    const rahmen = std(0x15151a, 0.15, 0.4, { clearcoat:1 });
    const spirale = tex(256, 256, (x, w, h) => {
      const gr = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, '#d9fbff'); gr.addColorStop(0.5, '#38d6ff'); gr.addColorStop(1, '#0a5a8a'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(0,40,70,.7)'; x.lineWidth = 7; x.beginPath(); for (let a = 0; a < 40; a += 0.1) { const r = 6 + a * 3; x.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } x.stroke();
    });
    for (const s of [-1, 1]) {
      const rim = TOR(0.34, 0.075, rahmen, s * 0.42, 0, 0, Math.PI * 2, 64); g.add(rim);
      const linse = M(new T.CircleGeometry(0.34, 48), new T.MeshStandardMaterial({ map:spirale, emissive:0x2ad1ff, emissiveMap:spirale, emissiveIntensity:1.0, roughness:0.1 }), s * 0.42, 0, 0.005); g.add(linse);
      const bg = TOR(0.38, 0.012, gold(), s * 0.42, 0, 0.07); g.add(bg);
      const bw = M(new T.BoxGeometry(0.08, 0.09, 0.62), rahmen, s * 0.78, 0, -0.3); bw.rotation.y = s * -0.12; g.add(bw);
      g.add(SPH(0.06, rahmen, s * 0.8, -0.04, -0.62));
    }
    const steg = TOR(0.14, 0.04, rahmen, 0, 0.1, 0, Math.PI); g.add(steg);
    g.add(SPH(0.045, gold(), 0, 0.02, 0.04));
    g.rotation.x = -0.12;
    return g;
  };

  /* Winkekatze (Maneki-Neko): weiße Keramik, goldene Münze, rotes Halsband mit Glöckchen, winkende Pfote */
  MODELLE.katze = () => {
    const g = new T.Group(), w = porz(0xfbf7ef), pink = std(0xf4a6b7, 0.5, 0), rot = std(0xd32f2f, 0.25, 0.1, { clearcoat:1 });
    g.add(M(lathe(glatt([[0.0001, 0], [0.42, 0.02], [0.44, 0.07], [0.38, 0.1], [0.0001, 0.1]], 20), 48), std(0x1a1a1f, 0.3, 0.2)));    // schwarzer Sockel
    g.add(SPH(0.42, w, 0, 0.5, 0, 1, 1.12, 0.9));                       // Körper
    g.add(SPH(0.32, w, 0, 1.05, 0.02, 1.1, 0.95, 0.95));               // Kopf
    for (const s of [-1, 1]) {
      const o = KEG(0.12, 0.26, w, s * 0.23, 1.35, 0, 20); o.rotation.z = -s * 0.28; g.add(o);
      const oi = KEG(0.07, 0.17, pink, s * 0.23, 1.33, 0.05, 20); oi.rotation.z = -s * 0.28; g.add(oi);
      const aug = TOR(0.045, 0.012, SCHWARZ(), s * 0.13, 1.1, 0.3, Math.PI, 16); aug.rotation.z = Math.PI; g.add(aug);
      g.add(SPH(0.06, pink, s * 0.2, 0.98, 0.27, 1, 0.7, 0.4, 16));         // Wangen
      for (let i = 0; i < 3; i++) { const b = CYL(0.004, 0.004, 0.24, SCHWARZ(), s * 0.3, 0.98 + (i - 1) * 0.045, 0.28, 6); b.rotation.set(0, 0, Math.PI / 2 + (i - 1) * 0.16 * s); g.add(b); }
      const bein = SPH(0.11, w, s * 0.2, 0.1, 0.28, 1, 0.8, 1.3, 24); g.add(bein);
    }
    g.add(SPH(0.04, pink, 0, 1.03, 0.33, 1.2, 0.8, 0.8, 16));          // Nase
    g.add(dreht(TOR(0.05, 0.01, SCHWARZ(), 0, 0.97, 0.325, Math.PI, 16), 'z', Math.PI));
    const hals = TOR(0.3, 0.05, rot, 0, 0.8, 0.03); hals.rotation.x = Math.PI / 2; g.add(hals);
    g.add(SPH(0.085, gold(), 0, 0.72, 0.3));                              // Glöckchen
    g.add(dreht(CYL(0.087, 0.087, 0.012, goldDunkel(), 0, 0.72, 0.3, 24), 'x', Math.PI / 2));
    // Goldene Münze (Koban) in der linken Pfote
    const kob = SPH(0.2, gold(), -0.28, 0.6, 0.34, 1, 1.25, 0.14, 40);
    g.add(kob);
    g.add(TOR(0.17, 0.012, goldDunkel(), -0.28, 0.6, 0.355, Math.PI * 2, 32).clone());
    const bl = tex(128, 128, (x, w2, h) => { x.fillStyle = '#f0b92e'; x.fillRect(0, 0, w2, h); x.fillStyle = '#7a4d00'; x.font = '900 70px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('福', w2 / 2, h / 2 + 4); });
    const druck = M(new T.CircleGeometry(0.12, 32), new T.MeshStandardMaterial({ map:bl, metalness:0.7, roughness:0.3 }), -0.28, 0.6, 0.368); g.add(druck);
    g.add(SPH(0.13, w, -0.28, 0.5, 0.27, 1, 0.9, 1));
    // Winkende rechte Pfote
    const arm = new T.Group(); arm.position.set(0.3, 0.7, 0.1); arm.rotation.z = -0.35; g.add(arm);
    arm.add(CYL(0.1, 0.11, 0.42, w, 0.04, 0.2, 0, 24));
    arm.add(SPH(0.14, w, 0.05, 0.44, 0.02, 1, 1.05, 0.95));
    for (const s of [-1, 0, 1]) arm.add(SPH(0.02, pink, 0.05 + s * 0.045, 0.5, 0.14, 1, 1, 0.6, 12));
    g.rotation.y = 0.2;
    return g;
  };

  /* Slot-Walze als Basis für Engel und Teufel */
  function walze(farbe, symbole, hintergrund) {
    const g = new T.Group();
    const t = tex(512, 256, (x, w, h) => {
      x.fillStyle = hintergrund; x.fillRect(0, 0, w, h);
      x.font = '150px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      symbole.forEach((s, i) => x.fillText(s, 64 + i * 128, h / 2 + 8));
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(0, 0, w, 30); x.fillRect(0, h - 30, w, 30);
    }, true);
    const zyl = M(new T.CylinderGeometry(0.4, 0.4, 0.62, 56, 1), [new T.MeshStandardMaterial({ map:t, roughness:0.35, metalness:0.05 }), farbe, farbe]); zyl.rotation.z = Math.PI / 2; g.add(zyl);
    for (const s of [-1, 1]) { const k = M(lathe(glatt([[0.0001, 0], [0.38, 0], [0.43, 0.02], [0.43, 0.06], [0.36, 0.1], [0.12, 0.12], [0.0001, 0.16]], 30), 48), gold(), s * 0.31, 0, 0); k.rotation.z = -s * Math.PI / 2; g.add(k); }
    g.add(dreht(CYL(0.05, 0.05, 0.9, gold(), 0, 0, 0, 16), 'z', Math.PI / 2));
    return g;
  }
  MODELLE.engel = () => {
    const g = new T.Group(); const w = walze(porz(), ['🍒', '7️⃣', '💎', '🔔'], '#fffdf5'); w.position.y = -0.1; g.add(w);
    const heil = emis(0xffe27a, 1.6); const h = TOR(0.28, 0.035, heil, 0, 0.62, 0); h.rotation.x = Math.PI / 2 - 0.15; g.add(h);
    for (const s of [-1, 1]) {
      const fl = new T.Group(); fl.position.set(s * 0.52, 0.12, -0.1); fl.rotation.set(0, s * -0.5, s * -0.4);
      for (let i = 0; i < 5; i++) { const f = SPH(0.07 + i * 0.012, porz(), s * (0.04 + i * 0.07), 0.06 - i * 0.05 + (i === 4 ? 0.03 : 0), -i * 0.02, 1, 3.4 - i * 0.28, 0.35, 20); f.rotation.z = s * (0.5 + i * 0.12); fl.add(f); }
      g.add(fl);
    }
    return g;
  };
  MODELLE.teufel = () => {
    const g = new T.Group(); const w = walze(std(0x7a0d12, 0.3, 0.2), ['🔥', '7️⃣', '💀', '🔥'], '#2a0a0e'); w.position.y = -0.1; g.add(w);
    const horn = std(0x15090a, 0.25, 0.3, { clearcoat:1 });
    for (const s of [-1, 1]) {
      const h = KEG(0.1, 0.42, horn, s * 0.2, 0.62, 0, 20); h.rotation.z = -s * 0.5; g.add(h);
      const f = new T.Group(); f.position.set(s * 0.48, 0.1, -0.1); f.rotation.set(0, s * -0.5, s * -0.3);
      for (let i = 0; i < 3; i++) { const z = SPH(0.2, std(0x2a0a0e, 0.6, 0.1), s * (0.12 + i * 0.12), 0.1 - i * 0.07, 0, 0.5, 1.5 - i * 0.15, 0.1); z.rotation.z = s * (0.6 + i * 0.4); f.add(z); }
      g.add(f);
    }
    const sw = TOR(0.3, 0.02, std(0xc4262e, 0.3, 0.1), 0.0, -0.45, -0.38, Math.PI * 1.1); sw.rotation.set(1.4, 0, 0.3); g.add(sw);
    const sp = KEG(0.07, 0.16, std(0xc4262e, 0.3, 0.1), 0.38, -0.38, -0.58, 3); sp.rotation.z = -0.5; g.add(sp);
    // glühende Augen
    for (const s of [-1, 1]) g.add(SPH(0.03, emis(0xffd43a, 2), s * 0.12, 0.3, 0.42, 1, 1, 1, 12));
    return g;
  };

  /* Gezinkte Würfel: zwei Elfenbein-Würfel mit Rubin-Augen */
  function wuerfelMat(n) {
    return new T.MeshStandardMaterial({ roughness:0.25, metalness:0.05, map:tex(128, 128, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#e6dcc0'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      const P = { 1:[[.5, .5]], 2:[[.27, .27], [.73, .73]], 3:[[.27, .27], [.5, .5], [.73, .73]], 4:[[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5:[[.27, .27], [.73, .27], [.5, .5], [.27, .73], [.73, .73]], 6:[[.27, .25], [.73, .25], [.27, .5], [.73, .5], [.27, .75], [.73, .75]] }[n];
      for (const [a, b] of P) { const gg = x.createRadialGradient(a * w - 4, b * h - 4, 2, a * w, b * h, 15); gg.addColorStop(0, '#ff5a6a'); gg.addColorStop(1, '#8a0c1c'); x.fillStyle = gg; x.beginPath(); x.arc(a * w, b * h, 14, 0, 7); x.fill(); }
    }) });
  }
  MODELLE.gezinkt = () => {
    const g = new T.Group();
    const mats6 = [1, 6, 2, 5, 3, 4].map(wuerfelMat);
    const kante = new T.BoxGeometry(0.62, 0.62, 0.62);
    const a = M(kante, mats6, -0.28, 0.4, 0.05); a.rotation.set(0.6, 0.5, 0.3); g.add(a);
    const b = M(kante, mats6, 0.4, 0.31, 0.2); b.rotation.set(0, -0.35, 0); g.add(b);
    // abgerundete Kanten durch goldene Eckstifte angedeutet: kleine Kugeln auf den Ecken des liegenden Würfels
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const sy of [-1, 1]) { const e = SPH(0.04, std(0xfffaf0, 0.3, 0), 0, 0, 0, 1, 1, 1, 10); e.position.set(sx * 0.31, sy * 0.31, sz * 0.31).applyEuler(b.rotation).add(b.position); g.add(e); }
    // Bleikügelchen als Hinweis auf den Beschiss
    g.add(SPH(0.07, std(0x8c8f98, 0.25, 1), 0.05, 0.07, 0.62));
    return g;
  };

  /* Magnet: roter Hufeisenmagnet mit Silberpolen und Eisenspänen */
  MODELLE.magnet = () => {
    const g = new T.Group();
    const rot = std(0xd32f2f, 0.2, 0.4, { clearcoat:1 }), silber = std(0xd9dde4, 0.18, 1);
    const bogen = TOR(0.38, 0.14, rot, 0, 0.1, 0, Math.PI, 64); g.add(bogen);
    for (const s of [-1, 1]) {
      g.add(CYL(0.14, 0.14, 0.5, rot, s * 0.38, -0.15, 0, 32));
      g.add(CYL(0.145, 0.145, 0.22, silber, s * 0.38, -0.5, 0, 32));
      g.add(dreht(TOR(0.145, 0.015, silber, s * 0.38, -0.38, 0), 'x', Math.PI / 2));
    }
    // Eisenspäne und Schrauben, die angezogen werden
    const eisen = std(0x2a2c33, 0.4, 0.9);
    for (let i = 0; i < 24; i++) {
      const s = i % 2 ? 1 : -1; const a = Math.sin(i * 12.3) * 0.5; const r = 0.1 + Math.abs(Math.sin(i * 5.1)) * 0.22;
      const m = M(new T.BoxGeometry(0.02, 0.07, 0.015), eisen, s * 0.38 + Math.cos(i) * r * 0.5, -0.66 - Math.abs(Math.sin(i * 3)) * r * 0.8, Math.sin(i * 2) * 0.1); m.rotation.z = a * 2; g.add(m);
    }
    const sch = new T.Group(); sch.add(CYL(0.025, 0.025, 0.14, eisen, 0, 0, 0, 12)); sch.add(CYL(0.05, 0.05, 0.03, eisen, 0, 0.08, 0, 6)); sch.position.set(-0.38, -0.78, 0.09); sch.rotation.z = 1.2; g.add(sch);
    g.rotation.x = -0.1;
    return g;
  };

  /* Ratto: Einbrecher-Ratte mit Ringelmütze und Beutesack */
  MODELLE.ratte = () => {
    const g = new T.Group(); const fell = std(0x8b8178, 0.85, 0), bauch = std(0xcfc3b6, 0.85, 0), pink = std(0xf2a5b3, 0.6, 0);
    g.add(SPH(0.34, fell, 0, 0.38, -0.05, 0.9, 1, 1.15));              // Körper
    g.add(SPH(0.2, bauch, 0, 0.32, 0.13, 0.9, 1.1, 0.6));
    g.add(SPH(0.22, fell, 0, 0.82, 0.12, 1, 0.95, 1));                 // Kopf
    const snout = KEG(0.12, 0.3, fell, 0, 0.77, 0.4, 24); snout.rotation.x = Math.PI / 2; g.add(snout);
    g.add(SPH(0.04, pink, 0, 0.77, 0.56));
    for (const s of [-1, 1]) {
      g.add(SPH(0.16, fell, s * 0.2, 1.02, 0.0, 1, 1.1, 0.25)); g.add(SPH(0.11, pink, s * 0.2, 1.02, 0.03, 1, 1.1, 0.2));
      g.add(SPH(0.045, SCHWARZ(), s * 0.1, 0.87, 0.3)); g.add(SPH(0.012, std(0xffffff, 0.1, 0), s * 0.1 + 0.012, 0.89, 0.34, 1, 1, 1, 8));
      for (let i = 0; i < 3; i++) { const b = CYL(0.004, 0.004, 0.32, std(0xeeeeee, 0.5, 0), s * 0.2, 0.74 + (i - 1) * 0.04, 0.42, 6); b.rotation.set(0, 0, Math.PI / 2 + s * (i - 1) * 0.15); g.add(b); }
      g.add(SPH(0.07, pink, s * 0.2, 0.3, 0.3, 1, 0.8, 1.2));            // Hände
      g.add(SPH(0.09, pink, s * 0.18, 0.04, 0.08, 1, 0.5, 1.6));          // Füße
    }
    const schw = TOR(0.35, 0.02, pink, 0.0, 0.25, -0.5, Math.PI * 1.3); schw.rotation.set(0.2, 1.5, 0); g.add(schw);
    // gestreifte Einbrecher-Mütze
    const m = tex(256, 128, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#111' : '#f3f3f3'; x.fillRect(0, i * h / 8, w, h / 8); } }, true);
    const mu = M(new T.SphereGeometry(0.225, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), new T.MeshStandardMaterial({ map:m, roughness:0.9 }), 0, 0.88, 0.1); mu.rotation.x = -0.15; g.add(mu);
    g.add(SPH(0.05, std(0xc4262e, 0.7, 0), 0, 1.1, 0.06));
    // Beutesack
    const sack = SPH(0.3, std(0x8a6d3b, 0.9, 0), 0.42, 0.28, 0.2, 1, 1.1, 1);
    g.add(sack);
    g.add(dreht(TOR(0.1, 0.03, std(0x6a4f26, 0.9, 0), 0.42, 0.55, 0.2), 'x', Math.PI / 2));
    const dollar = M(new T.CircleGeometry(0.12, 32), new T.MeshStandardMaterial({ map:tex(128, 128, (x, w, h) => { x.fillStyle = '#8a6d3b'; x.fillRect(0, 0, w, h); x.fillStyle = '#f0b92e'; x.font = '900 100px "Playfair Display",Georgia,serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$', w / 2, h / 2 + 6); }), roughness:0.7 }), 0.42, 0.3, 0.495); g.add(dollar);
    g.rotation.y = -0.3;
    return g;
  };

  /* Glückskeks: goldbrauner Keks mit herausragendem Papierstreifen auf kleinem Teller */
  MODELLE.keks = () => {
    const g = new T.Group();
    g.add(M(lathe(glatt([[0.0001, 0], [0.5, 0.02], [0.62, 0.1], [0.6, 0.13], [0.5, 0.06], [0.0001, 0.05]], 30), 56), porz(0xf7f3ea)));
    g.add(dreht(TOR(0.6, 0.012, gold(), 0, 0.125, 0), 'x', Math.PI / 2));
    const teig = tex(256, 256, (x, w, h) => {
      const gr = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6); gr.addColorStop(0, '#f3c46a'); gr.addColorStop(0.7, '#d99a3a'); gr.addColorStop(1, '#a8651b'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { x.fillStyle = 'rgba(120,60,10,' + Math.random() * 0.12 + ')'; x.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    });
    const km = new T.MeshStandardMaterial({ map:teig, roughness:0.6, side:T.DoubleSide });
    // Gefalteter Keks: zwei Kugelkappen treffen sich in der Mitte
    const k = new T.Group(); k.position.set(0, 0.34, 0); k.rotation.set(0.1, 0.4, 0);
    const hälfte = new T.SphereGeometry(0.46, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const a = M(hälfte, km); a.scale.set(1.15, 0.8, 0.8); a.rotation.z = Math.PI / 2 + 0.2; a.position.x = -0.12; k.add(a);
    const b = M(hälfte, km); b.scale.set(1.15, 0.8, 0.8); b.rotation.z = -Math.PI / 2 - 0.2; b.position.x = 0.12; k.add(b);
    k.add(SPH(0.2, std(0x8a4f12, 0.8, 0), 0, -0.06, 0, 0.5, 0.85, 1.05, 20));     // Mulde
    g.add(k);
    // Papierstreifen
    const zettel = tex(256, 64, (x, w, h) => { x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h); x.fillStyle = '#c4262e'; x.fillRect(0, 0, w, 7); x.fillRect(0, h - 7, w, 7); x.fillStyle = '#4a3410'; x.font = 'italic 700 26px "Playfair Display",Georgia,serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Heute gewinnst du!', w / 2, h / 2 + 2); });
    const z = M(new T.BoxGeometry(0.62, 0.008, 0.15), [std(0xfffaf0, 0.8, 0), std(0xfffaf0, 0.8, 0), new T.MeshStandardMaterial({ map:zettel, roughness:0.8 }), std(0xfffaf0, 0.8, 0), std(0xfffaf0, 0.8, 0), std(0xfffaf0, 0.8, 0)], 0.4, 0.32, 0.16); z.rotation.set(0, -0.45, 0.12); g.add(z);
    // Krümel
    for (let i = 0; i < 6; i++) g.add(SPH(0.015, std(0xc98a2c, 0.8, 0), -0.4 + i * 0.12, 0.14, 0.4 + Math.sin(i * 3) * 0.1, 1, 0.6, 1, 8));
    return g;
  };

  /* Doppelter Espresso: Porzellantasse mit Goldrand auf Untertasse, Crema, Löffel und Bohnen */
  MODELLE.espresso = () => {
    const g = new T.Group(); const p = porz(0xfbf7ef), go = gold();
    g.add(M(lathe(glatt([[0.0001, 0], [0.34, 0.02], [0.62, 0.06], [0.68, 0.1], [0.64, 0.115], [0.4, 0.07], [0.0001, 0.06]], 40), 64), p));
    g.add(dreht(TOR(0.67, 0.01, go, 0, 0.108, 0), 'x', Math.PI / 2));
    g.add(M(lathe(glatt([[0.0001, 0.07], [0.24, 0.09], [0.34, 0.2], [0.4, 0.4], [0.41, 0.5], [0.39, 0.505], [0.37, 0.48], [0.3, 0.2], [0.0001, 0.17]], 50), 64), p, 0, 0.04, 0));
    g.add(dreht(TOR(0.4, 0.012, go, 0, 0.545, 0), 'x', Math.PI / 2));
    const crema = tex(256, 256, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, '#c98b4d'); gr.addColorStop(0.55, '#8a4f22'); gr.addColorStop(1, '#3b1d0c'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(240,200,140,.5)'; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc(w / 2 + (Math.random() - 0.5) * 120, h / 2 + (Math.random() - 0.5) * 120, 2 + Math.random() * 7, 0, 7); x.fill(); } });
    const kaffee = M(new T.CircleGeometry(0.375, 48), new T.MeshStandardMaterial({ map:crema, roughness:0.15, metalness:0.1 }), 0, 0.47, 0); kaffee.rotation.x = -Math.PI / 2; g.add(kaffee);
    const hen = TOR(0.15, 0.04, p, 0.48, 0.36, 0, Math.PI * 1.25, 32); hen.rotation.z = -Math.PI / 2 - 0.55; g.add(hen);
    // Löffel auf der Untertasse
    const l = new T.Group(); l.add(M(new T.BoxGeometry(0.03, 0.01, 0.38), go, 0, 0, 0.18)); l.add(SPH(0.06, go, 0, 0, 0.42, 1, 0.22, 1.5, 16)); l.position.set(-0.32, 0.12, 0.16); l.rotation.y = 0.5; g.add(l);
    // Bohnen
    for (let i = 0; i < 7; i++) { const a = 1.1 + i * 0.35, r = 0.5 + Math.sin(i * 4) * 0.06; const b = SPH(0.04, std(0x3b2314, 0.5, 0.1), Math.cos(a) * r, 0.13, Math.sin(a) * r + 0.25, 1, 0.65, 1.5, 12); b.rotation.y = i; g.add(b); g.add(dreht(M(new T.BoxGeometry(0.004, 0.004, 0.07), std(0x120a05, 0.9, 0), Math.cos(a) * r, 0.155, Math.sin(a) * r + 0.25), 'y', i)); }
    // Dampf
    for (let i = 0; i < 3; i++) { const d = TOR(0.07 + i * 0.01, 0.012, new T.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.35 - i * 0.07 }), (i - 1) * 0.1, 0.78 + i * 0.2, 0, Math.PI * 1.4, 24); d.rotation.set(0, i, 1); g.add(d); }
    return g;
  };

  /* ================= Studio und Renderer ================= */
  let renderer, szene, kamera, env, bereit = false;
  const cache = new Map();

  function studio() {
    if (bereit) return true;
    try {
      renderer = new T.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
      renderer.setSize(PX, PX); renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = T.ReinhardToneMapping; renderer.toneMappingExposure = 0.95;
      renderer.outputEncoding = T.sRGBEncoding;
      szene = new T.Scene();
      kamera = new T.PerspectiveCamera(28, 1, 0.1, 50);
      // Umgebung: dunkler Raum mit hellen Softboxen, damit Gold und Glas schön reflektieren
      const raum = new T.Scene();
      raum.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ side:T.BackSide, map:tex(256, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6a6f86'); gr.addColorStop(0.5, '#2a2a33'); gr.addColorStop(1, '#0c0a0e'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }) })));
      const box = (w, h, x, y, z, s) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color:new T.Color(1, 0.95, 0.85).multiplyScalar(s), side:T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); raum.add(m); };
      box(6, 4, -5, 4, 4, 5); box(5, 2, 6, 3, -3, 4); box(10, 1.2, 0, 8, 0, 3); box(3, 6, 4, 1, 6, 2.5);
      const pm = new T.PMREMGenerator(renderer);
      env = pm.fromScene(raum, 0.02).texture; pm.dispose();
      szene.environment = env;
      const key = new T.DirectionalLight(0xfff1d6, 1.2); key.position.set(-3, 5, 4); szene.add(key);
      const rim = new T.DirectionalLight(0x9db6ff, 0.9); rim.position.set(4, 3, -4); szene.add(rim);
      szene.add(new T.HemisphereLight(0xffffff, 0x2a2030, 0.3));
      bereit = true;
    } catch (e) { bereit = false; console.warn('Item-Studio nicht verfügbar', e); }
    return bereit;
  }

  function sheet(item) {
    if (cache.has(item)) return cache.get(item);
    if (!MODELLE[item] || !studio()) { cache.set(item, null); return null; }
    const g = MODELLE[item]();
    // Auf einheitliche Größe bringen und in die Mitte setzen
    const box = new T.Box3().setFromObject(g), c = box.getCenter(new T.Vector3()), s = box.getSize(new T.Vector3());
    const skala = 1.55 / Math.max(s.x, s.y, s.z);
    const wurzel = new T.Group(); g.position.sub(c); wurzel.add(g); wurzel.scale.setScalar(skala);
    const dreh = new T.Group(); dreh.add(wurzel); szene.add(dreh);
    kamera.position.set(0, 0.55, 4.9); kamera.lookAt(0, -0.05, 0);
    const out = document.createElement('canvas'); out.width = PX * FRAMES; out.height = PX;
    const x = out.getContext('2d');
    for (let i = 0; i < FRAMES; i++) {
      dreh.rotation.y = -0.45 + i / FRAMES * Math.PI * 2;
      renderer.render(szene, kamera);
      x.drawImage(renderer.domElement, i * PX, 0);
    }
    szene.remove(dreh);
    g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    const r = { url:out.toDataURL('image/png') };
    cache.set(item, r);
    return r;
  }

  /* ---------- Element mit Drehteller ---------- */
  function element(item, groesse = 64, emoji = '') {
    const e = document.createElement('span');
    e.className = 'itemBild'; e.style.width = e.style.height = groesse + 'px';
    const s = sheet(item);
    if (!s) { e.className = 'itemBild emoji'; e.textContent = emoji; e.style.fontSize = groesse * 0.62 + 'px'; return e; }
    e.style.backgroundImage = `url(${s.url})`;
    e.style.backgroundSize = `${FRAMES * 100}% 100%`;
    let f = 3, t = null;
    const zeigen = n => { f = (n + FRAMES) % FRAMES; e.style.backgroundPosition = `${f / (FRAMES - 1) * 100}% 0`; };
    zeigen(3);
    const an = () => { if (!t) t = setInterval(() => zeigen(f + 1), 55); };
    const aus = () => { clearInterval(t); t = null; zeigen(3); };
    e.drehen = an; e.stopp = aus;
    // in Eltern-Karten (Shop, Slot) drehen lassen, solange der Mauszeiger darüber ist
    const eltern = () => e.closest('.ware, .slot') || e;
    queueMicrotask(() => { const p = eltern(); p.addEventListener('pointerenter', an); p.addEventListener('pointerleave', aus); });
    return e;
  }

  // Fertig skaliertes Modell (größte Kante = 1) für die Welt, z. B. in der Hand
  function modell(item) {
    if (!MODELLE[item]) return null;
    const g = MODELLE[item](), box = new T.Box3().setFromObject(g), c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3());
    const w = new T.Group(); g.position.sub(c); w.add(g); w.scale.setScalar(1 / Math.max(sz.x, sz.y, sz.z));
    const aussen = new T.Group(); aussen.add(w);
    aussen.traverse(o => { if (o.isMesh) o.userData.keinSchatten = true; });
    return aussen;
  }

  window.KHItems = { modell, element, sheet, hat:i => !!MODELLE[i], FRAMES, PX, MODELLE };
})();

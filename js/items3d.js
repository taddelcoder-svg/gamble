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

  window.KHItems = { element, sheet, hat:i => !!MODELLE[i], FRAMES, PX, MODELLE };
})();

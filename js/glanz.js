/* Kredithai – Glanz: alles, was das Casino schön macht. Nachbearbeitung (Bloom + Vignette), Umgebungs-Spiegelung,
   Teppiche, Hängelampen mit Lichtkegeln über den Tischen, Automatenreihe, Bar, Absperrkordeln, Staub im Licht,
   Münzregen und Konfetti. Wird von welt.js benutzt. */
(function () {
  'use strict';
  const T = THREE, F = KHF;
  const { mat, geo, box, zyl, kugel, kegel } = F;

  function leinwand(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  let rundTex = null;
  function rund() {
    if (rundTex) return rundTex;
    const [c, x] = leinwand(128, 128);
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    rundTex = new T.CanvasTexture(c);
    return rundTex;
  }
  const additiv = (farbe, opacity, extra) => new T.MeshBasicMaterial({ color:farbe, transparent:true, opacity, blending:T.AdditiveBlending, depthWrite:false, ...extra });

  /* ---------- Nachbearbeitung: Bloom lässt Neon, Lampen und Gold leuchten ---------- */
  function nachbearbeitung(renderer, szene, kamera) {
    if (!T.EffectComposer || !T.UnrealBloomPass) return null;
    let ziel;
    const gl2 = renderer.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget;
    if (gl2) { ziel = new T.WebGLMultisampleRenderTarget(4, 4, { format:T.RGBAFormat }); ziel.samples = 4; }
    const comp = new T.EffectComposer(renderer, ziel);
    comp.addPass(new T.RenderPass(szene, kamera));
    const bloom = new T.UnrealBloomPass(new T.Vector2(512, 512), 0.75, 0.45, 0.78);
    comp.addPass(bloom);
    const vignette = new T.ShaderPass(T.VignetteShader);
    vignette.uniforms.offset.value = 1.0; vignette.uniforms.darkness.value = 1.15;
    comp.addPass(vignette);
    return {
      comp, bloom,
      groesse(w, h, pr) { comp.setPixelRatio(pr); comp.setSize(w, h); bloom.setSize(w * pr / 2, h * pr / 2); },
      stimmung(st, rad, schwelle) { bloom.strength = st; bloom.radius = rad; bloom.threshold = schwelle; },
      render() { comp.render(); }
    };
  }

  /* ---------- Umgebung für Spiegelungen auf Gold, Chrom und Marmor ---------- */
  function umgebung(renderer, szene, alt) {
    const cubeZiel = new T.WebGLCubeRenderTarget(256, { format:T.RGBFormat, generateMipmaps:true, minFilter:T.LinearMipmapLinearFilter });
    const cam = new T.CubeCamera(0.1, 60, cubeZiel);
    cam.position.set(0, 2.2, 0);
    szene.add(cam);
    const env = szene.environment; szene.environment = null;
    cam.update(renderer, szene);
    szene.remove(cam);
    const pmrem = new T.PMREMGenerator(renderer);
    const tex = pmrem.fromCubemap(cubeZiel.texture).texture;
    pmrem.dispose(); cubeZiel.dispose();
    if (alt) alt.dispose();
    szene.environment = tex;
    return tex;
  }

  /* ---------- Casino-Teppich ---------- */
  const TEPPICH = {
    spelunke:{ grund:'#4a0f14', farben:['#b8862b', '#2e0709', '#7a1d24', '#e0b35a'] },
    neon:{ grund:'#0e0820', farben:['#c42fba', '#2bb8bb', '#3d1670', '#c9b22f'] },
    koralle:{ grund:'#0b3b47', farben:['#ff8a65', '#4dfff0', '#0f5a66', '#ffd180'] },
    penthouse:{ grund:'#3a0d18', farben:['#e8b923', '#1d060c', '#7a1f2b', '#fff3c4'] }
  };
  function teppichTextur(id) {
    const P = TEPPICH[id] || TEPPICH.spelunke;
    const [c, x] = leinwand(512, 512);
    x.fillStyle = P.grund; x.fillRect(0, 0, 512, 512);
    const z = (gr, f) => { x.fillStyle = f; x.fill(); };
    for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
      const cx = gx * 128 + 64, cy = gy * 128 + 64;
      // Raute
      x.beginPath(); x.moveTo(cx, cy - 54); x.lineTo(cx + 54, cy); x.lineTo(cx, cy + 54); x.lineTo(cx - 54, cy); x.closePath(); z(0, P.farben[2]);
      x.lineWidth = 4; x.strokeStyle = P.farben[0]; x.stroke();
      // Blüte
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        x.beginPath(); x.ellipse(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20, 13, 6, a, 0, Math.PI * 2); z(0, i % 2 ? P.farben[0] : P.farben[3]);
      }
      x.beginPath(); x.arc(cx, cy, 9, 0, 7); z(0, P.farben[1]);
      // Ecken: Kringel
      x.strokeStyle = P.farben[3]; x.lineWidth = 3;
      for (const [ex, ey] of [[gx * 128, gy * 128]]) { x.beginPath(); x.arc(ex, ey, 16, 0, 7); x.stroke(); x.beginPath(); x.arc(ex, ey, 6, 0, 7); z(0, P.farben[0]); }
    }
    // feine Struktur
    const d = x.getImageData(0, 0, 512, 512);
    for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - 0.5) * 18; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
    x.putImageData(d, 0, 0);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8;
    return t;
  }
  function teppich(th, w, d) {
    const g = new T.Group();
    const tex = teppichTextur(th.id); tex.repeat.set(w / 3, d / 3);
    const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshStandardMaterial({ map:tex, color:0xa8a8a8, roughness:0.95, metalness:0 }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.receiveShadow = true; g.add(m);
    // goldene Borte
    const b = new T.MeshStandardMaterial({ color:0xc9a227, roughness:0.35, metalness:0.9 });
    for (const [bw, bd, bx, bz] of [[w + 0.3, 0.15, 0, -d / 2], [w + 0.3, 0.15, 0, d / 2], [0.15, d, -w / 2, 0], [0.15, d, w / 2, 0]]) {
      const s = new T.Mesh(geo('BoxGeometry', 1, 1, 1), b); s.scale.set(bw, 0.02, bd); s.position.set(bx, 0.015, bz); s.receiveShadow = true; g.add(s);
    }
    return g;
  }

  /* ---------- Hängelampe mit Lichtkegel und Lichtfleck über einem Tisch ---------- */
  function tischLicht(th, radius, hoch) {
    const g = new T.Group();
    const y = hoch || 4.1;
    g.add(zyl(0.012, 0.012, 5.2 - y, 0x111111, 0, y + (5.2 - y) / 2, 0, 4));
    const schirm = new T.Mesh(new T.CylinderGeometry(0.16, 0.55, 0.32, 24, 1, true), new T.MeshStandardMaterial({ color:th.id === 'penthouse' ? 0xe8b923 : 0x1a1a1a, metalness:0.8, roughness:0.35, side:T.DoubleSide }));
    schirm.position.y = y; g.add(schirm);
    const innen = new T.Mesh(geo('CircleGeometry', 0.53, 24), new T.MeshBasicMaterial({ color:new T.Color(th.licht).multiplyScalar(1.6) }));
    innen.rotation.x = Math.PI / 2; innen.position.y = y - 0.15; g.add(innen);
    // Lichtkegel (nur fürs Auge)
    const r = (radius || 1.4) + 0.5;
    const kegelM = additiv(th.licht, { penthouse:0.025, koralle:0.04 }[th.id] || 0.06, { side:T.DoubleSide });
    const lk = new T.Mesh(new T.CylinderGeometry(0.5, r, y - 0.2, 32, 1, true), kegelM);
    lk.position.y = (y - 0.2) / 2; lk.renderOrder = 2; g.add(lk);
    // Lichtfleck auf dem Boden
    const fleck = new T.Mesh(geo('PlaneGeometry', 1, 1), additiv(th.licht, { penthouse:0.1, koralle:0.28 }[th.id] || 0.4, { map:rund() }));
    fleck.rotation.x = -Math.PI / 2; fleck.position.y = 0.03; fleck.scale.setScalar(r * 2.6); fleck.renderOrder = 1; g.add(fleck);
    g.kegel = lk; g.fleck = fleck;
    return g;
  }

  /* ---------- Reihe Deko-Automaten an der Südwand ---------- */
  function automatenReihe(th, x0, x1, z) {
    const g = new T.Group();
    const n = Math.floor((x1 - x0) / 1.05) + 1;
    const kasten = new T.InstancedMesh(geo('BoxGeometry', 0.9, 1.8, 0.75), new T.MeshStandardMaterial({ color:th.automat, roughness:0.45, metalness:0.3 }), n);
    const leiste = new T.InstancedMesh(geo('BoxGeometry', 0.94, 0.08, 0.8), new T.MeshStandardMaterial({ color:0xc9a227, roughness:0.3, metalness:0.9 }), n * 2);
    const [c, x] = leinwand(256, 128);
    x.fillStyle = '#fff8e1'; x.fillRect(0, 0, 256, 128);
    x.font = '56px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    ['🍒', '7️⃣', '💎'].forEach((s, i) => x.fillText(s, 43 + i * 85, 66));
    const schirm = new T.InstancedMesh(geo('PlaneGeometry', 0.66, 0.33), new T.MeshBasicMaterial({ map:new T.CanvasTexture(c), color:0xdddddd }), n);
    const kuppel = new T.InstancedMesh(geo('SphereGeometry', 0.13, 12, 8), new T.MeshBasicMaterial({ color:0xffffff }), n);
    const m4 = new T.Matrix4(), q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI), s = new T.Vector3(1, 1, 1), p = new T.Vector3();
    const farben = th.neon.map(f => new T.Color(f));
    for (let i = 0; i < n; i++) {
      const xx = x0 + i * 1.05;
      m4.compose(p.set(xx, 0.9, z), q, s); kasten.setMatrixAt(i, m4);
      m4.compose(p.set(xx, 1.82, z), q, s); leiste.setMatrixAt(i * 2, m4);
      m4.compose(p.set(xx, 0.95, z - 0.2), q, s); leiste.setMatrixAt(i * 2 + 1, m4);
      m4.compose(p.set(xx, 1.3, z - 0.381), q, s); schirm.setMatrixAt(i, m4);
      m4.compose(p.set(xx, 1.98, z), q, s); kuppel.setMatrixAt(i, m4);
      kuppel.setColorAt(i, farben[i % farben.length]);
    }
    kasten.castShadow = true; kasten.receiveShadow = true;
    g.add(kasten, leiste, schirm, kuppel);
    g.animieren = t => {
      const k = Math.floor(t * 5);
      if (k === g._k) return; g._k = k;
      const tmp = new T.Color();
      for (let i = 0; i < n; i++) { const an = (i + k) % 4 !== 0; tmp.copy(farben[(i + Math.floor(k / 4)) % farben.length]).multiplyScalar(an ? 1.4 : 0.25); kuppel.setColorAt(i, tmp); }
      kuppel.instanceColor.needsUpdate = true;
    };
    return g;
  }

  /* ---------- Bar in der Nordost-Ecke ---------- */
  function bar(th) {
    const g = new T.Group();
    const holz = new T.MeshStandardMaterial({ color:th.id === 'neon' ? 0x1a1426 : th.id === 'penthouse' ? 0xf2ede4 : 0x3e2414, roughness:0.4, metalness:0.1 });
    const theke = new T.Mesh(geo('BoxGeometry', 1, 1, 1), holz); theke.scale.set(3.6, 1.1, 0.8); theke.position.set(0, 0.55, 1.2); g.add(theke);
    const seite = new T.Mesh(geo('BoxGeometry', 1, 1, 1), holz); seite.scale.set(0.8, 1.1, 2.0); seite.position.set(-1.4, 0.55, 0.0); g.add(seite);
    const platte = new T.Mesh(geo('BoxGeometry', 1, 1, 1), new T.MeshStandardMaterial({ color:0x111111, roughness:0.15, metalness:0.6 }));
    platte.scale.set(3.8, 0.06, 0.95); platte.position.set(0, 1.13, 1.2); g.add(platte);
    const leiste = new T.Mesh(geo('BoxGeometry', 1, 1, 1), new T.MeshBasicMaterial({ color:new T.Color(th.neon[0]).multiplyScalar(1.5) }));
    leiste.scale.set(3.6, 0.04, 0.02); leiste.position.set(0, 0.15, 1.61); g.add(leiste);
    // Regal mit leuchtenden Flaschen
    for (let r = 0; r < 3; r++) {
      const brett = new T.Mesh(geo('BoxGeometry', 1, 1, 1), new T.MeshStandardMaterial({ color:0x2a2a2a, roughness:0.3, metalness:0.5 }));
      brett.scale.set(3.4, 0.05, 0.35); brett.position.set(0.1, 1.35 + r * 0.6, -0.95); g.add(brett);
      for (let i = 0; i < 11; i++) {
        const f = [0x4caf50, 0xffb300, 0x8d6e63, 0xe53935, 0x29b6f6, 0xffffff][(i + r * 2) % 6];
        const fl = new T.Mesh(geo('CylinderGeometry', 0.05, 0.06, 0.3, 8), new T.MeshStandardMaterial({ color:f, emissive:f, emissiveIntensity:0.35, roughness:0.1, metalness:0.2, transparent:true, opacity:0.85 }));
        fl.position.set(-1.45 + i * 0.3, 1.53 + r * 0.6, -0.95); g.add(fl);
        g.add(zyl(0.02, 0.02, 0.08, 0x222222, -1.45 + i * 0.3, 1.72 + r * 0.6, -0.95, 6));
      }
    }
    const rueck = new T.Mesh(geo('PlaneGeometry', 3.6, 2.2), new T.MeshBasicMaterial({ color:new T.Color(th.licht2).multiplyScalar(0.55) }));
    rueck.position.set(0.1, 2.0, -1.14); g.add(rueck);
    // Barhocker
    for (let i = 0; i < 4; i++) {
      const hx = -1.1 + i * 0.75;
      g.add(zyl(0.04, 0.04, 0.75, 0xbdbdbd, hx, 0.38, 1.95, 8));
      g.add(zyl(0.22, 0.22, 0.08, 0x8e1b1b, hx, 0.78, 1.95, 16));
      g.add(zyl(0.2, 0.2, 0.02, 0xbdbdbd, hx, 0.02, 1.95, 16));
    }
    const wirt = F.tier('otter', { weste:0x222222, skala:1.45 }); wirt.brille.visible = false;
    wirt.position.set(0.2, 0, 0.3); g.add(wirt);
    g.animieren = (dt, t) => wirt.animieren(dt, 0, true, t * 0.5);
    return g;
  }

  /* ---------- Absperrkordeln mit goldenen Pfosten ---------- */
  function kordeln(posten) {
    const g = new T.Group();
    const gold = new T.MeshStandardMaterial({ color:0xd4af37, roughness:0.25, metalness:1 });
    const samt = new T.MeshStandardMaterial({ color:0x9b111e, roughness:0.8 });
    for (const [x, z] of posten) {
      const p = new T.Mesh(geo('CylinderGeometry', 0.04, 0.05, 0.95, 12), gold); p.position.set(x, 0.48, z); g.add(p);
      const k = new T.Mesh(geo('SphereGeometry', 0.07, 12, 8), gold); k.position.set(x, 0.98, z); g.add(k);
      const f = new T.Mesh(geo('CylinderGeometry', 0.17, 0.2, 0.05, 16), gold); f.position.set(x, 0.025, z); g.add(f);
    }
    for (let i = 0; i < posten.length - 1; i++) {
      const [ax, az] = posten[i], [bx, bz] = posten[i + 1];
      const kurve = new T.QuadraticBezierCurve3(new T.Vector3(ax, 0.9, az), new T.Vector3((ax + bx) / 2, 0.55, (az + bz) / 2), new T.Vector3(bx, 0.9, bz));
      g.add(new T.Mesh(new T.TubeGeometry(kurve, 16, 0.03, 6, false), samt));
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  /* ---------- Staub im Licht ---------- */
  function staub(th, n = 260) {
    const pos = new Float32Array(n * 3), v = [];
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 32; pos[i * 3 + 1] = Math.random() * 4.6; pos[i * 3 + 2] = (Math.random() - 0.5) * 22; v.push(Math.random() * 0.06 + 0.02); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const p = new T.Points(g, new T.PointsMaterial({ map:rund(), color:th.licht, size:0.07, transparent:true, opacity:0.5, depthWrite:false, blending:T.AdditiveBlending }));
    p.animieren = (dt, t) => {
      const a = g.attributes.position.array;
      for (let i = 0; i < n; i++) {
        a[i * 3 + 1] += v[i] * dt; a[i * 3] += Math.sin(t * 0.3 + i) * 0.004;
        if (a[i * 3 + 1] > 4.8) a[i * 3 + 1] = 0.2;
      }
      g.attributes.position.needsUpdate = true;
    };
    return p;
  }

  /* ---------- Münzregen und Konfetti ---------- */
  function effekte(szene) {
    const MAX = 400;
    const muenzen = new T.InstancedMesh(geo('CylinderGeometry', 0.07, 0.07, 0.015, 14), new T.MeshStandardMaterial({ color:0xffcc33, metalness:1, roughness:0.25, emissive:0x553300, emissiveIntensity:0.4 }), MAX);
    const konfetti = new T.InstancedMesh(geo('PlaneGeometry', 0.07, 0.04), new T.MeshBasicMaterial({ side:T.DoubleSide }), MAX);
    // r128 legt den Farbpuffer in der Größe von count an: erst Farben setzen, dann count auf 0
    const weiss = new T.Color(1, 1, 1); for (let i = 0; i < MAX; i++) konfetti.setColorAt(i, weiss);
    muenzen.count = 0; konfetti.count = 0;
    muenzen.frustumCulled = false; konfetti.frustumCulled = false;
    szene.add(muenzen, konfetti);
    const teile = { m:[], k:[] };
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3(), farbe = new T.Color();
    const FARBEN = [0xff4081, 0x40c4ff, 0xffeb3b, 0x69f0ae, 0xff6e40, 0xb388ff];
    function wurf(liste, x, y, z, n, kraft) {
      for (let i = 0; i < n && liste.length < MAX; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * kraft;
        liste.push({ x, y, z, vx:Math.cos(a) * r, vy:2.5 + Math.random() * kraft * 1.6, vz:Math.sin(a) * r, rx:Math.random() * 6, ry:Math.random() * 6, wx:(Math.random() - 0.5) * 14, wy:(Math.random() - 0.5) * 14, t:0, leben:2.2 + Math.random(), f:FARBEN[i % FARBEN.length] });
      }
    }
    return {
      muenzregen(x, z, staerke = 1) { wurf(teile.m, x, 1.4, z, Math.round(25 * staerke), 1.6 + staerke * 0.6); },
      konfetti(x, z) { wurf(teile.k, x, 2.2, z, 70, 2.2); },
      animieren(dt) {
        for (const [liste, mesh, boden] of [[teile.m, muenzen, true], [teile.k, konfetti, false]]) {
          let n = 0;
          for (let i = liste.length - 1; i >= 0; i--) {
            const t = liste[i]; t.t += dt;
            if (t.t > t.leben) { liste.splice(i, 1); continue; }
            t.vy -= (boden ? 9.8 : 3.2) * dt;
            if (!boden) { t.vx *= 0.98; t.vz *= 0.98; t.vy = Math.max(t.vy, -1.2); }
            t.x += t.vx * dt; t.y += t.vy * dt; t.z += t.vz * dt;
            if (t.y < 0.02) { t.y = 0.02; if (boden) { t.vy = Math.abs(t.vy) * 0.35; t.vx *= 0.6; t.vz *= 0.6; t.wx *= 0.5; t.wy *= 0.5; } else { t.vy = 0; t.vx = t.vz = 0; } }
            t.rx += t.wx * dt; t.ry += t.wy * dt;
          }
          for (const t of liste) {
            const sk = Math.min(1, (t.leben - t.t) * 2);
            q.setFromEuler(e.set(t.rx, t.ry, 0)); s.set(sk, sk, sk);
            m4.compose(p.set(t.x, t.y, t.z), q, s); mesh.setMatrixAt(n, m4);
            if (!boden) mesh.setColorAt(n, farbe.setHex(t.f));
            n++;
          }
          mesh.count = n;
          mesh.instanceMatrix.needsUpdate = true;
          if (!boden && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
      }
    };
  }

  window.KHGlanz = { nachbearbeitung, umgebung, teppich, tischLicht, automatenReihe, bar, kordeln, staub, effekte, rund };
})();

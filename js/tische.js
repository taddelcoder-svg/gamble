/* Kredithai – Oberfläche der Spieltische. Jedes Spiel hat ein Panel mit Einsatz-Leiste, Bedienung und Animation.
   KHTische.oeffnen(wurzel, art, api) -> { update(d), frame(dt), zu() }
   d = { z, ich (eigener Spieler mit sitz/limit/sperre), tisch (mit runde), uhr, bank, spielerName(id) }
   api = { senden(befehl), ton(name), zahl(n) } */
(function () {
  'use strict';
  const S = KHSpiele, L = KHLogik;
  const zahl = n => L.zahl(n);

  function h(tag, a, ...kinder) {
    const e = document.createElement(tag);
    if (a) for (const k in a) {
      if (k === 'class') e.className = a[k];
      else if (k === 'text') e.textContent = a[k];
      else if (k === 'html') e.innerHTML = a[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), a[k]);
      else if (k === 'style') e.style.cssText = a[k];
      else if (a[k] != null && a[k] !== false) e.setAttribute(k, a[k]);
    }
    for (const c of kinder.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }
  const FARB = ['♠', '♥', '♦', '♣'], RANG = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'D', 'K', 'A'];
  function karte(k, extra) {
    if (k == null) return h('div', { class:'karte zu' + (extra ? ' ' + extra : '') });
    const r = k % 13, f = (k / 13) | 0;
    return h('div', { class:'karte' + (f === 1 || f === 2 ? ' rot' : '') + (extra ? ' ' + extra : '') }, h('b', { text:RANG[r] }), h('i', { text:FARB[f] }));
  }
  const kartenText = k => RANG[k % 13] + FARB[(k / 13) | 0];

  /* ---------- Einsatz-Leiste (für alle gleich) ---------- */
  function einsatzLeiste(art, api) {
    const schl = 'kredithai.einsatz.' + art;
    let wert = 0, limit = 0, min = 1, bank = 0;
    try { wert = +localStorage.getItem(schl) || 0; } catch (_) { /* egal */ }
    const anzeige = h('input', { class:'einsatzWert', type:'text', inputmode:'numeric', 'aria-label':'Einsatz' });
    const setz = (v, still) => {
      v = Math.floor(Number(String(v).replace(/\D/g, '')) || 0);
      const obergrenze = Math.max(min, Math.min(limit || v, bank || v));
      wert = Math.max(min, Math.min(v, obergrenze));
      anzeige.value = zahl(wert);
      try { localStorage.setItem(schl, wert); } catch (_) { /* egal */ }
      if (!still) api.ton('chip');
    };
    anzeige.addEventListener('change', () => setz(anzeige.value));
    anzeige.addEventListener('focus', () => { anzeige.value = String(wert); anzeige.select(); });
    anzeige.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') anzeige.blur(); });
    const knopf = (t, f) => h('button', { class:'chip', type:'button', text:t, onclick:f });
    const info = h('div', { class:'einsatzInfo' });
    const el = h('div', { class:'einsatz' },
      h('div', { class:'einsatzZeile' }, h('span', { class:'einsatzLabel', text:'Einsatz' }), anzeige, h('span', { text:'$' })),
      h('div', { class:'chips' }, knopf('Min', () => setz(min)), knopf('½', () => setz(wert / 2)), knopf('×2', () => setz(wert * 2)), knopf('Max', () => setz(Math.min(limit, bank)))),
      info);
    return {
      el, get wert() { return wert; },
      update(d) {
        limit = d.ich.limit || d.tisch.max; min = d.tisch.min; bank = d.bank;
        if (!wert) wert = Math.max(min, Math.round(d.tisch.max / 5));
        if (document.activeElement !== anzeige) setz(wert, true);
        const extra = [];
        if (d.ich.eff.goldchip) extra.push('🪙 Goldchip aktiv: doppeltes Limit, Verlust wird erstattet');
        if (d.ich.eff.bestechung) extra.push('💵 Limit ×3');
        if (d.ich.pfand && d.ich.pfand.hose) extra.push('👖 ohne Hose: Limit −25 %');
        info.textContent = `Limit ${zahl(limit)} $ · Minimum ${zahl(min)} $` + (extra.length ? ' · ' + extra.join(' · ') : '');
      }
    };
  }

  /* ---------- Glücksrad-Zeichner (Roulette und Glücksrad) ---------- */
  function radMalen(x, gr, segmente, winkel, mitte) {
    const n = segmente.length, r = gr / 2 - 6;
    x.clearRect(0, 0, gr, gr);
    x.save(); x.translate(gr / 2, gr / 2); x.rotate(winkel);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2 - Math.PI / 2, a1 = (i + 1) / n * Math.PI * 2 - Math.PI / 2;
      x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, r, a0, a1); x.closePath();
      x.fillStyle = segmente[i].f; x.fill(); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1; x.stroke();
      x.save(); x.rotate((i + 0.5) / n * Math.PI * 2); x.fillStyle = '#fff';
      x.font = `700 ${Math.max(9, Math.min(15, 340 / n))}px "Barlow Semi Condensed",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(segmente[i].t, 0, -r + 13); x.restore();
    }
    x.beginPath(); x.arc(0, 0, r * 0.28, 0, 7); x.fillStyle = mitte || '#e8b923'; x.fill();
    x.restore();
    x.beginPath(); x.moveTo(gr / 2 - 10, 0); x.lineTo(gr / 2 + 10, 0); x.lineTo(gr / 2, 22); x.closePath(); x.fillStyle = '#fff'; x.fill(); x.strokeStyle = '#111'; x.lineWidth = 2; x.stroke();
  }
  function drehung() {
    let w = 0, d = null;
    return {
      get w() { return w; },
      start(i, n, dauer) { const alpha = (i + 0.5) / n * Math.PI * 2; const ziel = Math.ceil((w + 8 * Math.PI) / (Math.PI * 2)) * Math.PI * 2 - alpha; d = { t:0, dauer, w0:w, w1:ziel }; },
      setzen(i, n) { w = -((i + 0.5) / n) * Math.PI * 2; d = null; },
      frame(dt) { if (!d) return false; d.t += dt; const f = Math.min(1, d.t / d.dauer), e = 1 - Math.pow(1 - f, 3); w = d.w0 + (d.w1 - d.w0) * e; if (f >= 1) d = null; return true; },
      get laeuft() { return !!d; }
    };
  }

  // Wartet, bis eine neue Runde (nr) erscheint, und merkt sich, ob sie frisch ist
  function neuWaechter() {
    let letzte = null;
    return s => { const nr = s ? s.nr || 0 : 0; if (letzte === null) { letzte = nr; return false; } if (nr !== letzte) { letzte = nr; return true; } return false; };
  }
  // Baut einen Bereich nur neu, wenn sich sein Schlüssel ändert (sonst gehen Klicks verloren)
  function einmal(el, schl, bauen) { if (el._schl === schl) return; el._schl = schl; el.innerHTML = ''; bauen(); }
  const ergebnis = (el, text, art) => { el.textContent = text; el.className = 'ergebnis ' + (art || ''); el.classList.remove('neu'); void el.offsetWidth; el.classList.add('neu'); };

  /* ================= Die Panels ================= */
  const P = {};

  P.muenze = (wurzel, api, E) => {
    const muenze = h('div', { class:'muenze3d' }, h('div', { class:'seite kopf', text:'🦈' }), h('div', { class:'seite zahl', text:'$' }));
    const erg = h('div', { class:'ergebnis' });
    const topf = h('div', { class:'topf' });
    const knoepfe = h('div', { class:'knoepfe' });
    wurzel.append(h('div', { class:'buehne' }, muenze), erg, topf, E.el, knoepfe);
    const neu = neuWaechter();
    let anim = 0, ziel = 'kopf', sitz = null, nachher = null;
    return {
      update(d) {
        sitz = d.ich.sitz;
        if (neu(sitz) && sitz.wurf) { anim = 1.25; ziel = sitz.wurf; muenze.className = 'muenze3d wirbel'; api.ton('wurf'); nachher = sitz.phase === 'gewonnen' ? 'sieg' : 'weg'; }
        einmal(knoepfe, sitz.phase + sitz.topf + (anim > 0), () => {
        if (sitz.phase === 'gewonnen') {
          topf.innerHTML = `Topf: <b>${zahl(sitz.topf)} $</b> · ${sitz.serie}× in Folge`;
          knoepfe.append(
            h('button', { class:'gross gold', text:`Kassieren ${zahl(sitz.topf)} $`, onclick:() => api.senden({ a:'kassieren' }) }),
            h('div', { class:'reihe' },
              h('button', { class:'gross', text:'Nochmal: 🦈 Kopf', onclick:() => api.senden({ a:'nochmal', seite:'kopf' }) }),
              h('button', { class:'gross', text:'Nochmal: $ Zahl', onclick:() => api.senden({ a:'nochmal', seite:'zahl' }) })));
        } else {
          topf.textContent = 'Gewinn: 1,94-facher Einsatz';
          knoepfe.append(h('div', { class:'reihe' },
            h('button', { class:'gross', text:'🦈 Kopf', onclick:() => api.senden({ a:'setzen', seite:'kopf', einsatz:E.wert }) }),
            h('button', { class:'gross', text:'$ Zahl', onclick:() => api.senden({ a:'setzen', seite:'zahl', einsatz:E.wert }) })));
        }
        knoepfe.querySelectorAll('button').forEach(b => b.disabled = anim > 0);
        });
      },
      frame(dt) {
        if (anim > 0) {
          anim -= dt;
          if (anim <= 0) {
            muenze.className = 'muenze3d ' + (ziel === 'zahl' ? 'zeigtZahl' : '');
            if (nachher === 'sieg') { ergebnis(erg, (ziel === 'kopf' ? '🦈 Kopf' : '$ Zahl') + ' – Treffer!', 'plus'); api.ton('sieg'); }
            else { ergebnis(erg, (ziel === 'kopf' ? '🦈 Kopf' : '$ Zahl') + ' – daneben', 'minus'); api.ton('verlust'); }
            knoepfe.querySelectorAll('button').forEach(b => b.disabled = false);
          }
        }
      }
    };
  };

  P.roulette = (wurzel, api, E) => {
    const gr = 220;
    const cv = h('canvas', { width:gr, height:gr, class:'rad' }); const x = cv.getContext('2d');
    const seg = S.KESSEL.map(z => ({ t:String(z), f:z === 0 ? '#2e7d32' : S.ROT.has(z) ? '#c62828' : '#1b1b1b' }));
    const dr = drehung();
    const erg = h('div', { class:'ergebnis' });
    let wahl = 'rot';
    const auswahl = h('div', { class:'rouletteWahl' });
    const knopf = (w, t, cls) => h('button', { class:'feld ' + (cls || ''), 'data-w':w, text:t, onclick:() => { wahl = w; markieren(); api.ton('klick'); } });
    const aussen = h('div', { class:'aussen' }, knopf('rot', 'Rot ×2', 'r'), knopf('schwarz', 'Schwarz ×2', 's'), knopf('gerade', 'Gerade ×2'), knopf('ungerade', 'Ungerade ×2'), knopf('tief', '1–18 ×2'), knopf('hoch', '19–36 ×2'), knopf('d1', '1–12 ×3'), knopf('d2', '13–24 ×3'), knopf('d3', '25–36 ×3'));
    const zahlen = h('div', { class:'zahlen' }, knopf('z0', '0', 'g'));
    for (let z = 1; z <= 36; z++) zahlen.append(knopf('z' + z, String(z), S.ROT.has(z) ? 'r' : 's'));
    const markieren = () => auswahl.querySelectorAll('.feld').forEach(b => b.classList.toggle('an', b.dataset.w === wahl));
    auswahl.append(aussen, h('div', { class:'klein', text:'Einzelne Zahl: ×36' }), zahlen);
    const los = h('button', { class:'gross gold', text:'Drehen', onclick:() => api.senden({ a:'setzen', wahl, einsatz:E.wert }) });
    wurzel.append(h('div', { class:'buehne' }, cv), erg, auswahl, E.el, los);
    markieren();
    const neu = neuWaechter();
    let sitz = null, warten = false;
    radMalen(x, gr, seg, dr.w);
    return {
      update(d) {
        sitz = d.ich.sitz;
        if (neu(sitz) && sitz.zahl != null) { dr.start(S.KESSEL.indexOf(sitz.zahl), 37, 3.5); warten = true; api.ton('drehen'); los.disabled = true; }
      },
      frame(dt) {
        if (dr.frame(dt)) radMalen(x, gr, seg, dr.w);
        if (warten && !dr.laeuft) {
          warten = false; los.disabled = false;
          const z = sitz.zahl, w = S.R_WAHL[sitz.wahl], sieg = w ? w.t(z) : sitz.wahl === 'z' + z;
          ergebnis(erg, `${z} ${z === 0 ? 'Grün' : S.ROT.has(z) ? 'Rot' : 'Schwarz'} – ${sieg ? 'gewonnen!' : 'verloren'}`, sieg ? 'plus' : 'minus');
          api.ton(sieg ? 'sieg' : 'verlust');
        }
      }
    };
  };

  P.blackjack = (wurzel, api, E) => {
    const dealer = h('div', { class:'hand' }), spieler = h('div', { class:'hand' });
    const dw = h('div', { class:'wert' }), sw = h('div', { class:'wert' });
    const erg = h('div', { class:'ergebnis' });
    const tipp = h('div', { class:'tipp' });
    const knoepfe = h('div', { class:'knoepfe' });
    wurzel.append(h('div', { class:'filz' }, h('div', { class:'label', text:'Dealer' }), dealer, dw, h('div', { class:'label', text:'Du' }), spieler, sw), tipp, erg, E.el, knoepfe);
    const neu = neuWaechter();
    let schl = '', fertigBis = 0, t = 0, sitz = null;
    const TEXT = { blackjack:['Blackjack! 2,5-fach', 'plus'], sieg:['Gewonnen!', 'plus'], gleich:['Unentschieden – Einsatz zurück', ''], niederlage:['Dealer gewinnt', 'minus'], dealerbj:['Dealer hat Blackjack', 'minus'], drueber:['Über 21 – verloren', 'minus'] };
    return {
      update(d) {
        sitz = d.ich.sitz;
        const frisch = neu(sitz);
        const k = JSON.stringify([sitz.hand, sitz.dealer, sitz.phase, sitz.loch]);
        if (k !== schl) {
          schl = k;
          dealer.innerHTML = ''; spieler.innerHTML = '';
          (sitz.dealer || []).forEach((c, i) => dealer.append(karte(c, 'neu')));
          if (sitz.phase === 'zug') dealer.append(sitz.loch != null ? karte(sitz.loch, 'roentgen') : karte(null, 'neu'));
          (sitz.hand || []).forEach(c => spieler.append(karte(c, 'neu')));
          [...dealer.children].forEach((c, i) => c.style.animationDelay = (i * 0.15) + 's');
          [...spieler.children].forEach((c, i) => c.style.animationDelay = (i * 0.15) + 's');
          sw.textContent = sitz.hand && sitz.hand.length ? S.bjWert(sitz.hand) : '';
          dw.textContent = sitz.dealer && sitz.dealer.length ? (sitz.phase === 'zug' ? S.bjWert([sitz.dealer[0]]) + ' + ?' : S.bjWert(sitz.dealer)) : '';
          api.ton('karte');
          if (sitz.phase === 'fertig' && sitz.ergebnis) fertigBis = t + Math.max(0.3, d.ich.sperre || 0);
          else erg.textContent = '';
        }
        tipp.textContent = sitz.naechste != null ? `🕶️ Nächste Karte: ${kartenText(sitz.naechste)}` : '';
        einmal(knoepfe, sitz.phase + (sitz.hand || []).length, () => {
        if (sitz.phase === 'zug') {
          knoepfe.append(h('div', { class:'reihe' },
            h('button', { class:'gross', text:'Karte', onclick:() => api.senden({ a:'karte' }) }),
            h('button', { class:'gross', text:'Halten', onclick:() => api.senden({ a:'halten' }) }),
            sitz.hand.length === 2 ? h('button', { class:'gross', text:'Verdoppeln', onclick:() => api.senden({ a:'doppeln' }) }) : null));
        } else knoepfe.append(h('button', { class:'gross gold', text:'Geben', onclick:() => api.senden({ a:'setzen', einsatz:E.wert }) }));
        });
      },
      frame(dt) {
        t += dt;
        if (fertigBis && t >= fertigBis) {
          fertigBis = 0;
          const [txt, art] = TEXT[sitz.ergebnis] || ['', ''];
          ergebnis(erg, txt, art);
          api.ton(art === 'plus' ? 'sieg' : art === 'minus' ? 'verlust' : 'klick');
        }
      }
    };
  };

  P.slots = (wurzel, api, E) => {
    const walzen = [0, 1, 2].map(() => h('div', { class:'walze', text:'🍒' }));
    const erg = h('div', { class:'ergebnis' });
    const tabelle = h('div', { class:'tabelle' });
    S.SLOT_SYM.forEach((s, i) => tabelle.append(h('span', { text:`${s}${s}${s} ×${S.SLOT_DREI[i]}` })));
    tabelle.append(h('span', { class:'klein', text:'Zwei gleiche links: ' + S.SLOT_SYM.map((s, i) => s + '×' + String(S.SLOT_ZWEI[i]).replace('.', ',')).join(' ') }));
    let auto = false;
    const autoK = h('button', { class:'chip', text:'Auto: aus', onclick:() => { auto = !auto; autoK.textContent = 'Auto: ' + (auto ? 'an' : 'aus'); autoK.classList.toggle('an', auto); } });
    const effekt = h('div', { class:'tipp' });
    const los = h('button', { class:'gross gold', text:'Drehen', onclick:() => api.senden({ a:'setzen', einsatz:E.wert }) });
    wurzel.append(h('div', { class:'automat' }, h('div', { class:'walzen' }, walzen)), erg, effekt, E.el, h('div', { class:'reihe' }, los, autoK), tabelle);
    const neu = neuWaechter();
    let anim = 0, ziel = [0, 1, 2], f = 0, sitz = null, bereit = 0;
    return {
      update(d) {
        sitz = d.ich.sitz;
        const e = d.ich.eff;
        effekt.textContent = [e.engel ? `😇 noch ${e.engel.n} sichere Drehungen` : '', e.teufel ? `😈 noch ${e.teufel.n} Teufelsdrehungen` : ''].filter(Boolean).join(' · ');
        if (neu(sitz)) { anim = 1.6; ziel = sitz.walzen; api.ton('drehen'); los.disabled = true; }
        if (auto && anim <= 0 && !(d.ich.sperre > 0) && Date.now() > bereit) { bereit = Date.now() + 600; api.senden({ a:'setzen', einsatz:E.wert }); }
      },
      frame(dt) {
        if (anim > 0) {
          anim -= dt; f += dt;
          if (f > 0.06) { f = 0; walzen.forEach((w, i) => { if (anim > 0.35 + i * 0.4) w.textContent = S.SLOT_SYM[Math.floor(Math.random() * 7)]; else w.textContent = S.SLOT_SYM[ziel[i]]; }); }
          if (anim <= 0) {
            walzen.forEach((w, i) => w.textContent = S.SLOT_SYM[ziel[i]]);
            const fk = S.slotFaktor(ziel);
            los.disabled = false;
            if (fk) { ergebnis(erg, `×${String(fk).replace('.', ',')}!`, fk >= 20 ? 'plus riesig' : 'plus'); api.ton(fk >= 20 ? 'jackpot' : 'sieg'); }
            else { ergebnis(erg, 'Nichts', 'minus'); }
          }
        }
      }
    };
  };

  P.hilo = (wurzel, api, E) => {
    const aktuell = h('div', { class:'hiloKarte' });
    const verlauf = h('div', { class:'verlauf' });
    const mult = h('div', { class:'topf' });
    const erg = h('div', { class:'ergebnis' });
    const tipp = h('div', { class:'tipp' });
    const knoepfe = h('div', { class:'knoepfe' });
    wurzel.append(h('div', { class:'buehne' }, aktuell), verlauf, mult, tipp, erg, E.el, knoepfe);
    const neu = neuWaechter();
    let sitz = null;
    return {
      update(d) {
        sitz = d.ich.sitz;
        if (neu(sitz)) {
          api.ton('karte');
          const v = sitz.verlauf && sitz.verlauf[sitz.verlauf.length - 1];
          if (v && v.ok === false) { ergebnis(erg, 'Daneben!', 'minus'); api.ton('verlust'); } else if (v && v.ok) erg.textContent = '';
        }
        aktuell.innerHTML = ''; if (sitz.karte != null) aktuell.append(karte(sitz.karte, 'riesig'));
        verlauf.innerHTML = '';
        for (const v of sitz.verlauf || []) verlauf.append(h('span', { class:'mini ' + (v.w === 'skip' ? 'skip' : v.ok ? 'ok' : 'falsch'), text:kartenText(v.k) + (v.w === 'hoeher' ? '↑' : v.w === 'tiefer' ? '↓' : '→') }));
        tipp.textContent = sitz.naechste != null ? `🕶️ Nächste Karte: ${kartenText(sitz.naechste)}` : '';
        einmal(knoepfe, sitz.phase + sitz.karte + ':' + sitz.treffer + ':' + sitz.mult, () => {
        if (sitz.phase === 'laeuft') {
          const r = sitz.karte % 13, ch = S.G.hilo.chancen(r);
          const naechstH = Math.min(1000, Math.round(S.KANTE * sitz.roh / ch.hoeher * 100) / 100), naechstT = Math.min(1000, Math.round(S.KANTE * sitz.roh / ch.tiefer * 100) / 100);
          mult.innerHTML = `Multiplikator: <b>×${sitz.mult.toFixed(2)}</b> · ${sitz.treffer} Treffer`;
          knoepfe.append(h('div', { class:'reihe' },
            h('button', { class:'gross', html:`${r === 12 ? 'Gleich' : 'Höher/gleich'}<small>${Math.round(ch.hoeher * 100)} % · ×${naechstH.toFixed(2)}</small>`, onclick:() => api.senden({ a:'hoeher' }) }),
            h('button', { class:'gross', html:`${r === 0 ? 'Gleich' : 'Niedriger/gleich'}<small>${Math.round(ch.tiefer * 100)} % · ×${naechstT.toFixed(2)}</small>`, onclick:() => api.senden({ a:'tiefer' }) })),
            h('div', { class:'reihe' },
              h('button', { class:'mittel', text:'Überspringen', onclick:() => api.senden({ a:'skip' }) }),
              h('button', { class:'gross gold', text:sitz.treffer ? `Kassieren ×${sitz.mult.toFixed(2)}` : 'Einsatz zurück', onclick:() => api.senden({ a:'kassieren' }) })));
        } else {
          mult.textContent = 'Jeder richtige Tipp erhöht den Multiplikator';
          knoepfe.append(h('button', { class:'gross gold', text:'Spielen', onclick:() => api.senden({ a:'setzen', einsatz:E.wert }) }));
        }
        });
      },
      frame() {}
    };
  };

  P.plinko = (wurzel, api, E) => {
    const W = 340, H = 300;
    const cv = h('canvas', { width:W, height:H, class:'plinko' }); const x = cv.getContext('2d');
    let risiko = 1;
    const risikoK = h('div', { class:'reihe' }, ...['Niedrig', 'Mittel', 'Hoch'].map((t, i) => h('button', { class:'chip' + (i === 1 ? ' an' : ''), text:t, onclick:e => { risiko = i; risikoK.querySelectorAll('.chip').forEach((b, k) => b.classList.toggle('an', k === i)); api.ton('klick'); } })));
    let auto = false;
    const autoK = h('button', { class:'chip', text:'Auto: aus', onclick:() => { auto = !auto; autoK.textContent = 'Auto: ' + (auto ? 'an' : 'aus'); autoK.classList.toggle('an', auto); } });
    const erg = h('div', { class:'ergebnis' });
    wurzel.append(h('div', { class:'buehne' }, cv), erg, risikoK, E.el, h('div', { class:'reihe' }, h('button', { class:'gross gold', text:'Kugel', onclick:() => api.senden({ a:'setzen', risiko, einsatz:E.wert }) }), autoK));
    const baelle = []; let gesehen = null, bereit = 0, sitz = null;
    const dx = 22, oben = 26, dy = 19;
    const FARBEN = ['#e53935', '#fb8c00', '#fdd835', '#7cb342', '#26a69a', '#42a5f5', '#5c6bc0', '#42a5f5', '#26a69a', '#7cb342', '#fdd835', '#fb8c00', '#e53935'];
    function malen() {
      x.clearRect(0, 0, W, H);
      x.fillStyle = '#fff';
      for (let r = 0; r < 12; r++) for (let i = 0; i <= r + 2; i++) { x.beginPath(); x.arc(W / 2 + (i - (r + 2) / 2) * dx, oben + r * dy, 2.6, 0, 7); x.fill(); }
      const tab = S.PLINKO[risiko];
      for (let i = 0; i < 13; i++) {
        const cx = W / 2 + (i - 6) * dx;
        x.fillStyle = FARBEN[i]; x.fillRect(cx - dx / 2 + 1, oben + 12 * dy - 4, dx - 2, 22);
        x.fillStyle = '#111'; x.font = '700 9px "Barlow Semi Condensed",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(tab[i] >= 10 ? tab[i] : String(tab[i]).replace('.', ','), cx, oben + 12 * dy + 7);
      }
      for (const b of baelle) {
        const f = Math.min(1, b.t / 2.6), reihe = f * 12, r0 = Math.floor(reihe);
        let px = 0; for (let j = 0; j < Math.min(r0, 12); j++) px += b.pfad[j] === '1' ? 0.5 : -0.5;
        if (r0 < 12) px += (b.pfad[r0] === '1' ? 0.5 : -0.5) * (reihe - r0);
        const py = oben - 14 + reihe * dy - Math.abs(Math.sin(reihe * Math.PI)) * 6;
        x.fillStyle = '#ff4081'; x.beginPath(); x.arc(W / 2 + px * dx, py, 5, 0, 7); x.fill();
      }
    }
    malen();
    return {
      update(d) {
        sitz = d.ich.sitz;
        const bl = sitz.baelle || [];
        const max = bl.length ? bl[bl.length - 1].nr : 0;
        if (gesehen === null) gesehen = max;
        for (const b of bl) if (b.nr > gesehen) { baelle.push({ pfad:b.pfad, t:0, f:b.f, fach:b.fach }); api.ton('klick'); }
        gesehen = Math.max(gesehen, max);
        if (auto && !(d.ich.sperre > 0) && Date.now() > bereit) { bereit = Date.now() + 450; api.senden({ a:'setzen', risiko, einsatz:E.wert }); }
      },
      frame(dt) {
        for (const b of baelle) { b.t += dt; if (b.t >= 2.6 && !b.fertig) { b.fertig = true; ergebnis(erg, '×' + String(b.f).replace('.', ','), b.f >= 1 ? (b.f >= 8 ? 'plus riesig' : 'plus') : 'minus'); api.ton(b.f >= 8 ? 'jackpot' : b.f >= 1 ? 'sieg' : 'plopp'); } }
        while (baelle.length && baelle[0].t > 2.9) baelle.shift();
        malen();
      }
    };
  };

  P.turm = (wurzel, api, E) => {
    let art = 1;
    const artK = h('div', { class:'reihe' }, ...S.TURM.map((t, i) => h('button', { class:'chip' + (i === 1 ? ' an' : ''), text:t.n, onclick:() => { art = i; artK.querySelectorAll('.chip').forEach((b, k) => b.classList.toggle('an', k === i)); api.ton('klick'); malen(); } })));
    const turm = h('div', { class:'turm' });
    const mult = h('div', { class:'topf' });
    const erg = h('div', { class:'ergebnis' });
    const knoepfe = h('div', { class:'knoepfe' });
    wurzel.append(turm, mult, erg, artK, E.el, knoepfe);
    const neu = neuWaechter();
    let sitz = null;
    function malen() {
      turm.innerHTML = '';
      const a = sitz && sitz.phase === 'laeuft' ? sitz.art : art, T = S.TURM[a];
      for (let st = S.TURM_HOCH - 1; st >= 0; st--) {
        const reihe = h('div', { class:'turmReihe' });
        const m = Math.min(1000, Math.round(S.KANTE * Math.pow(T.felder / (T.felder - T.drachen), st + 1) * 100) / 100);
        reihe.append(h('span', { class:'turmMult', text:'×' + m.toFixed(2) }));
        for (let i = 0; i < T.felder; i++) {
          let cls = 'turmFeld';
          const laeuft = sitz && sitz.phase === 'laeuft';
          if (sitz && sitz.wahl && sitz.wahl[st] === i && (laeuft ? st < sitz.stufe : true) && sitz.wahl.length > st) cls += sitz.reihen && sitz.reihen[st][i] ? ' drache' : ' sicher';
          else if (sitz && sitz.reihen && sitz.reihen[st] && sitz.reihen[st][i]) cls += ' dracheZu';
          if (laeuft && st === sitz.stufe) cls += ' aktiv';
          if (laeuft && st === sitz.stufe && sitz.tipp === i) cls += ' tippFeld';
          const b = h('button', { class:cls, text:cls.includes('drache') ? '🐉' : cls.includes('sicher') ? '🥚' : '', onclick:() => { if (laeuft && st === sitz.stufe) api.senden({ a:'waehlen', feld:i }); } });
          reihe.append(b);
        }
        turm.append(reihe);
      }
    }
    return {
      update(d) {
        sitz = d.ich.sitz;
        if (neu(sitz)) api.ton('klick');
        const schl = JSON.stringify([sitz.wahl, sitz.reihen, sitz.stufe, sitz.phase, sitz.tipp]);
        if (schl !== this._s) {
          const vorher = this._s; this._s = schl; malen();
          if (vorher && sitz.phase === 'bereit' && sitz.reihen && sitz.wahl.length) {
            const l = sitz.wahl.length - 1, boom = sitz.reihen[l][sitz.wahl[l]];
            if (boom) { ergebnis(erg, 'Der Drache ist wach! 🐉', 'minus'); api.ton('verlust'); } else { ergebnis(erg, `Kassiert: ×${sitz.mult.toFixed(2)}`, 'plus'); api.ton('sieg'); }
          }
        }
        einmal(knoepfe, sitz.phase + sitz.stufe, () => {
        if (sitz.phase === 'laeuft') { mult.innerHTML = `Stufe ${sitz.stufe}/9 · <b>×${sitz.mult.toFixed(2)}</b>`; knoepfe.append(h('button', { class:'gross gold', text:sitz.stufe ? `Kassieren ×${sitz.mult.toFixed(2)}` : 'Wähle ein Feld in der untersten Reihe', disabled:sitz.stufe ? null : 'disabled', onclick:() => api.senden({ a:'kassieren' }) })); }
        else { mult.textContent = 'Klettere so hoch du dich traust'; knoepfe.append(h('button', { class:'gross gold', text:'Losklettern', onclick:() => api.senden({ a:'setzen', art, einsatz:E.wert }) })); }
        });
      },
      frame() {}
    };
  };

  P.minen = (wurzel, api, E) => {
    let minen = 3;
    const minenK = h('div', { class:'reihe' }, h('span', { class:'label', text:'Minen:' }), ...[1, 3, 5, 10, 16, 24].map(n => h('button', { class:'chip' + (n === 3 ? ' an' : ''), text:String(n), onclick:() => { minen = n; minenK.querySelectorAll('.chip').forEach(b => b.classList.toggle('an', +b.textContent === n)); api.ton('klick'); } })));
    const feld = h('div', { class:'minenFeld' });
    const knoepfe25 = [];
    for (let i = 0; i < 25; i++) { const b = h('button', { class:'mine', onclick:() => sitz && sitz.phase === 'laeuft' && api.senden({ a:'aufdecken', feld:i }) }); knoepfe25.push(b); feld.append(b); }
    const mult = h('div', { class:'topf' }), erg = h('div', { class:'ergebnis' }), knoepfe = h('div', { class:'knoepfe' });
    wurzel.append(feld, mult, erg, minenK, E.el, knoepfe);
    let sitz = null, schl = '';
    return {
      update(d) {
        sitz = d.ich.sitz;
        const k = JSON.stringify([sitz.offen, sitz.minen, sitz.phase, sitz.tipp]);
        if (k !== schl) {
          const vorher = schl; schl = k;
          knoepfe25.forEach((b, i) => {
            const offen = sitz.offen && sitz.offen.includes(i), mine = sitz.minen && sitz.minen.includes(i);
            b.className = 'mine' + (mine && offen ? ' boom' : mine ? ' zeigMine' : offen ? ' gem' : '') + (sitz.tipp === i ? ' tippFeld' : '');
            b.textContent = mine ? '💣' : offen ? '💎' : '';
          });
          if (vorher) { if (sitz.phase === 'laeuft') api.ton('klick'); else if (sitz.minen) { if (sitz.boom != null && sitz.offen.includes(sitz.boom)) { ergebnis(erg, 'BUMM! 💥', 'minus'); api.ton('bumm'); } else { ergebnis(erg, `Kassiert: ×${sitz.mult.toFixed(2)}`, 'plus'); api.ton('sieg'); } } }
        }
        einmal(knoepfe, sitz.phase + sitz.offen.length, () => {
        if (sitz.phase === 'laeuft') {
          const naechst = S.G.minen.multi(sitz.minenZahl, sitz.offen.length + 1);
          mult.innerHTML = `${sitz.offen.length} Felder · <b>×${sitz.mult.toFixed(2)}</b> · nächstes ×${naechst.toFixed(2)}`;
          knoepfe.append(h('button', { class:'gross gold', text:sitz.offen.length ? `Kassieren ×${sitz.mult.toFixed(2)}` : 'Deck ein Feld auf', disabled:sitz.offen.length ? null : 'disabled', onclick:() => api.senden({ a:'kassieren' }) }));
        } else { mult.textContent = 'Mehr Minen = höhere Multiplikatoren'; knoepfe.append(h('button', { class:'gross gold', text:'Neues Feld', onclick:() => api.senden({ a:'setzen', minen, einsatz:E.wert }) })); }
        });
      },
      frame() {}
    };
  };

  P.wuerfel = (wurzel, api, E) => {
    const AUG = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const w1 = h('div', { class:'wuerfel', text:'⚄' }), w2 = h('div', { class:'wuerfel', text:'⚂' });
    let wette = 'pass';
    const wetteK = h('div', { class:'reihe' }, h('button', { class:'chip an', text:'Pass (mit dem Werfer)', onclick:() => { wette = 'pass'; wetteK.children[0].classList.add('an'); wetteK.children[1].classList.remove('an'); } }), h('button', { class:'chip', text:'Dagegen', onclick:() => { wette = 'dagegen'; wetteK.children[1].classList.add('an'); wetteK.children[0].classList.remove('an'); } }));
    const punkt = h('div', { class:'topf' }), erg = h('div', { class:'ergebnis' }), wuerfe = h('div', { class:'verlauf' }), knoepfe = h('div', { class:'knoepfe' });
    wurzel.append(h('div', { class:'buehne strasse' }, w1, w2), punkt, wuerfe, erg, wetteK, E.el, knoepfe);
    const neu = neuWaechter();
    let anim = 0, sitz = null, nachher = null;
    return {
      update(d) {
        sitz = d.ich.sitz;
        if (neu(sitz) && sitz.wurf) { anim = 1.1; api.ton('wuerfel'); nachher = sitz.phase; erg.textContent = ''; }
        wuerfe.innerHTML = ''; (sitz.wuerfe || []).forEach(w => wuerfe.append(h('span', { class:'mini', text:String(w) })));
        punkt.innerHTML = sitz.phase === 'punkt' ? `Punkt: <b>${sitz.punkt}</b> – würfle ihn vor einer 7` : '7 oder 11 gewinnt, 2, 3, 12 verliert';
        einmal(knoepfe, sitz.phase, () => {
        if (sitz.phase === 'punkt') knoepfe.append(h('button', { class:'gross gold', text:'Würfeln', onclick:() => api.senden({ a:'wuerfeln' }) }));
        else knoepfe.append(h('button', { class:'gross gold', text:'Setzen und werfen', onclick:() => api.senden({ a:'setzen', wette, einsatz:E.wert }) }));
        });
        if (d.ich.eff.gezinkt) punkt.innerHTML += ` · 🎲 noch ${d.ich.eff.gezinkt.n} gezinkte Würfe`;
      },
      frame(dt) {
        if (anim > 0) {
          anim -= dt;
          if (anim > 0) { w1.textContent = AUG[1 + Math.floor(Math.random() * 6)]; w2.textContent = AUG[1 + Math.floor(Math.random() * 6)]; w1.classList.add('rollt'); w2.classList.add('rollt'); }
          else {
            w1.classList.remove('rollt'); w2.classList.remove('rollt');
            w1.textContent = AUG[sitz.wurf[0]]; w2.textContent = AUG[sitz.wurf[1]];
            const s = sitz.wurf[0] + sitz.wurf[1];
            if (nachher === 'bereit') {
              const pass = sitz.wette === 'pass';
              const passGew = sitz.punkt ? s === sitz.punkt : (s === 7 || s === 11);
              const passVerl = sitz.punkt ? s === 7 : (s === 2 || s === 3 || s === 12);
              const sieg = pass ? passGew : (passVerl && s !== 12) || (sitz.punkt && s === 7);
              if (!pass && !sitz.punkt && s === 12) ergebnis(erg, '12 – Unentschieden', '');
              else { ergebnis(erg, `${s} – ${sieg ? 'gewonnen!' : 'verloren'}`, sieg ? 'plus' : 'minus'); api.ton(sieg ? 'sieg' : 'verlust'); }
            } else ergebnis(erg, `${s}`, '');
          }
        }
      }
    };
  };

  P.rad = (wurzel, api, E) => {
    const gr = 260;
    const cv = h('canvas', { width:gr, height:gr, class:'rad' }); const x = cv.getContext('2d');
    const seg = S.RAD_FELDER.map(i => ({ t:S.RAD_SYM[i].n, f:S.RAD_SYM[i].f }));
    const dr = drehung();
    let sym = 0;
    const symK = h('div', { class:'radWahl' }, ...S.RAD_SYM.map((s, i) => h('button', { class:'feld' + (i === 0 ? ' an' : ''), style:`--f:${s.f}`, html:`<b>${s.n}</b><small>×${s.m} · ${s.z}/50</small>`, onclick:() => { sym = i; symK.querySelectorAll('.feld').forEach((b, k) => b.classList.toggle('an', k === i)); api.ton('klick'); } })));
    const erg = h('div', { class:'ergebnis' });
    const los = h('button', { class:'gross gold', text:'Drehen', onclick:() => api.senden({ a:'setzen', symbol:sym, einsatz:E.wert }) });
    wurzel.append(h('div', { class:'buehne' }, cv), erg, symK, E.el, los);
    const neu = neuWaechter();
    let sitz = null, warten = false;
    radMalen(x, gr, seg, dr.w, '#222');
    return {
      update(d) { sitz = d.ich.sitz; if (neu(sitz) && sitz.feld != null) { dr.start(sitz.feld, 50, 4.1); warten = true; api.ton('drehen'); los.disabled = true; } },
      frame(dt) {
        if (dr.frame(dt)) radMalen(x, gr, seg, dr.w, '#222');
        if (warten && !dr.laeuft) {
          warten = false; los.disabled = false;
          const s = S.RAD_SYM[S.RAD_FELDER[sitz.feld]], sieg = S.RAD_FELDER[sitz.feld] === sitz.symbol;
          ergebnis(erg, `${s.n} – ${sieg ? 'gewonnen!' : 'verloren'}`, sieg ? (s.m >= 24 ? 'plus riesig' : 'plus') : 'minus');
          api.ton(sieg ? (s.m >= 24 ? 'jackpot' : 'sieg') : 'verlust');
        }
      }
    };
  };

  P.poker = (wurzel, api, E) => {
    const hand = h('div', { class:'hand poker' });
    const tabelle = h('div', { class:'tabelle' });
    const erg = h('div', { class:'ergebnis' }), tipp = h('div', { class:'tipp' }), knoepfe = h('div', { class:'knoepfe' });
    wurzel.append(h('div', { class:'filz blau' }, hand), tipp, erg, E.el, knoepfe, tabelle);
    let halten = [false, false, false, false, false], schl = '', sitz = null;
    const neu = neuWaechter();
    function tab(markiert) { tabelle.innerHTML = ''; S.POKER.forEach((p, i) => tabelle.append(h('span', { class:i === markiert ? 'an' : '', text:`${p.n} ×${p.m}` }))); }
    tab(-1);
    function malen() {
      hand.innerHTML = '';
      (sitz.hand || []).forEach((k, i) => {
        const c = karte(k, (halten[i] && sitz.phase === 'tauschen' ? 'gehalten ' : '') + 'neu');
        c.style.animationDelay = (i * 0.08) + 's';
        c.addEventListener('click', () => { if (sitz.phase !== 'tauschen') return; halten[i] = !halten[i]; api.ton('klick'); malen(); });
        if (halten[i] && sitz.phase === 'tauschen') c.append(h('em', { text:'HALTEN' }));
        hand.append(c);
      });
    }
    return {
      update(d) {
        sitz = d.ich.sitz;
        const frisch = neu(sitz);
        const k = JSON.stringify([sitz.hand, sitz.phase]);
        if (k !== schl) {
          schl = k;
          if (sitz.phase === 'tauschen' && frisch) {
            // Vorschlag: halte Paare und bessere
            const r = sitz.hand.map(c => c % 13), z = {}; r.forEach(x => z[x] = (z[x] || 0) + 1);
            halten = sitz.vorher >= 0 ? r.map(x => z[x] >= 2 || sitz.vorher <= 5) : [false, false, false, false, false];
          }
          malen(); api.ton('karte');
          if (sitz.phase === 'bereit' && sitz.ergebnis != null && !frisch) { /* nichts */ }
          if (sitz.phase === 'bereit' && frisch) { if (sitz.ergebnis >= 0) { ergebnis(erg, S.POKER[sitz.ergebnis].n + '!', sitz.ergebnis <= 3 ? 'plus riesig' : 'plus'); api.ton(sitz.ergebnis <= 3 ? 'jackpot' : 'sieg'); } else { ergebnis(erg, 'Nichts', 'minus'); } tab(sitz.ergebnis); }
          else if (sitz.phase === 'tauschen') { erg.textContent = sitz.vorher >= 0 ? 'Schon da: ' + S.POKER[sitz.vorher].n : ''; erg.className = 'ergebnis'; tab(sitz.vorher); }
        }
        tipp.textContent = sitz.naechste ? '🕶️ Nächste Karten: ' + sitz.naechste.map(kartenText).join(' ') : '';
        einmal(knoepfe, sitz.phase, () => {
        if (sitz.phase === 'tauschen') knoepfe.append(h('button', { class:'gross gold', text:'Tauschen', onclick:() => api.senden({ a:'ziehen', halten }) }));
        else knoepfe.append(h('button', { class:'gross gold', text:'Geben', onclick:() => api.senden({ a:'setzen', einsatz:E.wert }) }));
        });
      },
      frame() {}
    };
  };

  P.los = (wurzel, api, E) => {
    const W = 300, Hh = 300;
    const cv = h('canvas', { width:W, height:Hh, class:'los' }); const x = cv.getContext('2d');
    const deck = document.createElement('canvas'); deck.width = W; deck.height = Hh; const dx = deck.getContext('2d');
    const erg = h('div', { class:'ergebnis' }), tipp = h('div', { class:'tipp' }), knoepfe = h('div', { class:'knoepfe' });
    const tabelle = h('div', { class:'tabelle' }, ...S.LOS.map(l => h('span', { text:`${l.s}${l.s}${l.s} ×${l.m}` })));
    wurzel.append(h('div', { class:'buehne' }, cv), h('div', { class:'klein', text:'Rubbel mit Maus oder Finger!' }), tipp, erg, E.el, knoepfe, tabelle);
    let sitz = null, schl = '', gesendet = false, rubbeln = false;
    const neu = neuWaechter();
    function grund() {
      x.fillStyle = '#fff8e1'; x.fillRect(0, 0, W, Hh);
      x.font = '54px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      if (sitz && sitz.felder) sitz.felder.forEach((f, i) => { x.fillText(S.LOS[f].s, 50 + (i % 3) * 100, 52 + Math.floor(i / 3) * 100); });
      x.strokeStyle = '#e0c48a'; x.lineWidth = 2; for (let i = 1; i < 3; i++) { x.beginPath(); x.moveTo(i * 100, 0); x.lineTo(i * 100, Hh); x.stroke(); x.beginPath(); x.moveTo(0, i * 100); x.lineTo(W, i * 100); x.stroke(); }
      x.drawImage(deck, 0, 0);
    }
    function decken() {
      dx.globalCompositeOperation = 'source-over';
      const g = dx.createLinearGradient(0, 0, W, Hh); g.addColorStop(0, '#b0bec5'); g.addColorStop(0.5, '#eceff1'); g.addColorStop(1, '#90a4ae');
      dx.fillStyle = g; dx.fillRect(0, 0, W, Hh);
      dx.fillStyle = 'rgba(0,0,0,.25)'; dx.font = '800 26px "Barlow Semi Condensed",sans-serif'; dx.textAlign = 'center';
      for (let i = 0; i < 9; i++) dx.fillText('🦈 ?', 50 + (i % 3) * 100, 58 + Math.floor(i / 3) * 100);
    }
    function frei() { dx.clearRect(0, 0, W, Hh); grund(); }
    function wieVielFrei() { const d = dx.getImageData(0, 0, W, Hh).data; let n = 0; for (let i = 3; i < d.length; i += 64) if (d[i] < 20) n++; return n / (d.length / 64); }
    decken(); grund();
    const kratz = e => {
      if (!rubbeln || !sitz || sitz.phase !== 'rubbeln') return;
      const r = cv.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width * W, py = (e.clientY - r.top) / r.height * Hh;
      dx.globalCompositeOperation = 'destination-out'; dx.beginPath(); dx.arc(px, py, 18, 0, 7); dx.fill();
      grund();
      if (Math.random() < 0.15) api.ton('rubbel');
      if (!gesendet && wieVielFrei() > 0.7) { gesendet = true; frei(); api.senden({ a:'aufdecken' }); }
    };
    cv.addEventListener('pointerdown', e => { rubbeln = true; cv.setPointerCapture(e.pointerId); kratz(e); });
    cv.addEventListener('pointermove', kratz);
    cv.addEventListener('pointerup', () => { rubbeln = false; });
    return {
      update(d) {
        sitz = d.ich.sitz;
        if (neu(sitz)) { decken(); gesendet = false; erg.textContent = ''; api.ton('klick'); }
        const k = JSON.stringify([sitz.felder, sitz.phase]);
        if (k !== schl) {
          const vorher = schl; schl = k;
          if (sitz.phase === 'bereit' && vorher && sitz.felder) { frei(); const m = sitz.gewinn >= 0 ? S.LOS[sitz.gewinn].m : 0; if (m) { ergebnis(erg, `${S.LOS[sitz.gewinn].s} ×${m}!`, m >= 20 ? 'plus riesig' : 'plus'); api.ton(m >= 20 ? 'jackpot' : 'sieg'); } else ergebnis(erg, 'Niete', 'minus'); }
          grund();
        }
        tipp.textContent = sitz.vorschau != null ? (sitz.vorschau ? `🕶️ Das nächste Los gewinnt ×${sitz.vorschau}!` : '🕶️ Das nächste Los ist eine Niete.') : '';
        einmal(knoepfe, sitz.phase, () => {
        if (sitz.phase === 'rubbeln') knoepfe.append(h('button', { class:'gross', text:'Alles aufrubbeln', onclick:() => { if (!gesendet) { gesendet = true; frei(); api.senden({ a:'aufdecken' }); } } }));
        else knoepfe.append(h('button', { class:'gross gold', text:'Los kaufen', onclick:() => api.senden({ a:'setzen', einsatz:E.wert }) }));
        });
      },
      frame() {}
    };
  };

  P.huetchen = (wurzel, api, E) => {
    const buehne = h('div', { class:'buehne huetchen' });
    const becher = [0, 1, 2].map(i => { const b = h('button', { class:'becher', onclick:() => { if (sitz && sitz.phase === 'mischen' && fertig) api.senden({ a:'waehlen', becher:i }); } }); buehne.append(b); return b; });
    const kugel = h('div', { class:'hKugel' }); buehne.append(kugel);
    const info = h('div', { class:'topf' }), erg = h('div', { class:'ergebnis' }), tipp = h('div', { class:'tipp' }), knoepfe = h('div', { class:'knoepfe' });
    wurzel.append(buehne, info, tipp, erg, E.el, knoepfe);
    let sitz = null, t = 0, fertig = true, schl = '';
    const neu = neuWaechter();
    const X = p => 18 + p * 33;   // Prozent
    function stellen() {
      const s = sitz;
      if (!s || !s.tausche) { becher.forEach((b, i) => { b.style.left = X(i) + '%'; b.style.transform = ''; }); kugel.style.opacity = 0; return; }
      const zeigen = s.zeigen || 1.2;
      const pos = [0, 1, 2];
      const tt = t - zeigen;
      const n = Math.max(0, Math.min(s.tausche.length, Math.floor(tt / s.dauer)));
      for (let k = 0; k < n; k++) { const [a, b] = s.tausche[k]; const ia = pos.indexOf(a), ib = pos.indexOf(b); [pos[ia], pos[ib]] = [pos[ib], pos[ia]]; }
      const x = [0, 0, 0], y = [0, 0, 0];
      pos.forEach((bn, platz) => x[bn] = X(platz));
      if (tt > 0 && n < s.tausche.length && s.phase === 'mischen') {
        const [a, b] = s.tausche[n], f = (tt - n * s.dauer) / s.dauer;
        const pa = pos.indexOf(a), pb = pos.indexOf(b), ba = pos[pa], bb = pos[pb];
        x[ba] = X(pa) + (X(pb) - X(pa)) * f; y[ba] = -Math.sin(f * Math.PI) * 18;
        x[bb] = X(pb) + (X(pa) - X(pb)) * f; y[bb] = Math.sin(f * Math.PI) * 18;
      }
      const heben = t < zeigen ? Math.sin(Math.min(1, t / zeigen) * Math.PI) * 50 : 0;
      becher.forEach((b, i) => { b.style.left = x[i] + '%'; b.style.transform = `translateY(${y[i] - (s.phase === 'mischen' ? heben * (i === s.start ? 1 : 0.3) : 0)}px)`; });
      // Kugel am Anfang unter dem Startbecher
      kugel.style.opacity = t < zeigen && s.phase === 'mischen' ? 1 : 0;
      kugel.style.left = X(s.start) + '%';
      // Nach der Wahl: aufdecken
      if (s.phase === 'bereit' && s.wahl != null) {
        becher.forEach((b, i) => b.style.transform = i === s.wahl || i === s.ziel ? 'translateY(-60px)' : '');
        if (s.ziel >= 0) { kugel.style.opacity = 1; kugel.style.left = x[s.ziel] + '%'; }
      }
      fertig = s.phase !== 'mischen' || tt >= s.tausche.length * s.dauer;
      becher.forEach((b, i) => { b.classList.toggle('waehlbar', s.phase === 'mischen' && fertig); b.classList.toggle('tippFeld', s.tipp === i && s.phase === 'mischen'); });
    }
    return {
      update(d) {
        sitz = d.ich.sitz;
        if (neu(sitz) && sitz.phase === 'mischen') { t = 0; erg.textContent = ''; api.ton('klick'); }
        const k = sitz.phase + sitz.nr;
        if (k !== schl) {
          const vorher = schl; schl = k;
          if (sitz.phase === 'bereit' && sitz.wahl != null && vorher) {
            if (sitz.ziel === -1) { ergebnis(erg, 'Beschiss! Die Kugel war nirgends 😤', 'minus'); api.ton('verlust'); }
            else if (sitz.ziel === sitz.wahl) { ergebnis(erg, 'Richtig! Doppelter Einsatz', 'plus'); api.ton('sieg'); }
            else { ergebnis(erg, 'Falscher Becher', 'minus'); api.ton('verlust'); }
          }
        }
        info.textContent = sitz.phase === 'mischen' ? (fertig ? 'Wo ist die Kugel? Tipp auf einen Becher!' : 'Gut aufpassen …') : (sitz.siege >= 3 ? 'Der Typ guckt schon misstrauisch …' : 'Verfolge die Kugel!');
        tipp.textContent = sitz.tipp != null && sitz.phase === 'mischen' ? (sitz.tipp === -1 ? '🕶️ Da ist gar keine Kugel – er schummelt!' : '🕶️ Die Röntgenbrille zeigt den Becher.') : '';
        einmal(knoepfe, sitz.phase, () => { if (sitz.phase !== 'mischen') knoepfe.append(h('button', { class:'gross gold', text:'Setzen', onclick:() => api.senden({ a:'setzen', einsatz:E.wert }) })); });
      },
      frame(dt) { t += dt; stellen(); }
    };
  };

  P.baccarat = (wurzel, api, E) => {
    const bank = h('div', { class:'hand' }), spieler = h('div', { class:'hand' });
    const bw = h('div', { class:'wert' }), sw = h('div', { class:'wert' });
    let auf = 'spieler';
    const aufK = h('div', { class:'reihe' }, ...[['spieler', 'Spieler ×2'], ['bank', 'Bank ×1,95'], ['tie', 'Unentschieden ×9']].map(([w, t]) => h('button', { class:'chip' + (w === 'spieler' ? ' an' : ''), text:t, onclick:() => { auf = w; aufK.querySelectorAll('.chip').forEach((b, i) => b.classList.toggle('an', ['spieler', 'bank', 'tie'][i] === w)); api.ton('klick'); } })));
    const erg = h('div', { class:'ergebnis' });
    const los = h('button', { class:'gross gold', text:'Geben', onclick:() => api.senden({ a:'setzen', auf, einsatz:E.wert }) });
    wurzel.append(h('div', { class:'filz rotfilz' }, h('div', { class:'label', text:'Bank' }), bank, bw, h('div', { class:'label', text:'Spieler' }), spieler, sw), erg, aufK, E.el, los);
    const neu = neuWaechter();
    let sitz = null, offenBis = 0, t = 0, n = 0;
    return {
      update(d) {
        sitz = d.ich.sitz;
        if (neu(sitz) && sitz.spieler && sitz.spieler.length) {
          n = sitz.spieler.length + sitz.bank.length; offenBis = t + 1.2 + n * 0.45; erg.textContent = '';
          bank.innerHTML = ''; spieler.innerHTML = '';
          const reihe = [];
          sitz.spieler.forEach((k, i) => reihe.push([spieler, k, i < 2 ? i * 2 : 4]));
          sitz.bank.forEach((k, i) => reihe.push([bank, k, i < 2 ? i * 2 + 1 : 5]));
          reihe.sort((a, b) => a[2] - b[2]).forEach(([el, k], i) => { const c = karte(k, 'neu'); c.style.animationDelay = (0.3 + i * 0.45) + 's'; el.append(c); });
          bw.textContent = ''; sw.textContent = ''; los.disabled = true; api.ton('karte');
        }
      },
      frame(dt) {
        t += dt;
        if (offenBis && t >= offenBis) {
          offenBis = 0; los.disabled = false;
          bw.textContent = S.bacSumme(sitz.bank); sw.textContent = S.bacSumme(sitz.spieler);
          const name = { spieler:'Spieler', bank:'Bank', tie:'Unentschieden' }[sitz.sieger];
          const sieg = sitz.sieger === sitz.auf;
          ergebnis(erg, `${name} gewinnt` + (sieg ? ' – du auch!' : sitz.sieger === 'tie' ? ' – Einsatz zurück' : ''), sieg ? 'plus' : sitz.sieger === 'tie' ? '' : 'minus');
          api.ton(sieg ? 'sieg' : 'verlust');
        }
      }
    };
  };

  P.keno = (wurzel, api, E) => {
    let wahl = [];
    const gitter = h('div', { class:'keno' });
    const felder = [];
    for (let z = 1; z <= 40; z++) { const b = h('button', { class:'kz', text:String(z), onclick:() => { if (sitz && laeuft) return; const i = wahl.indexOf(z); if (i >= 0) wahl.splice(i, 1); else if (wahl.length < 10) wahl.push(z); api.ton('klick'); malen(); } }); felder.push(b); gitter.append(b); }
    const tabelle = h('div', { class:'tabelle' }), erg = h('div', { class:'ergebnis' });
    const los = h('button', { class:'gross gold', text:'Ziehen', onclick:() => api.senden({ a:'setzen', zahlen:wahl, einsatz:E.wert }) });
    const zufallK = h('button', { class:'chip', text:'Zufall', onclick:() => { const n = wahl.length || 5; wahl = []; while (wahl.length < n) { const z = 1 + Math.floor(Math.random() * 40); if (!wahl.includes(z)) wahl.push(z); } malen(); } });
    const leerK = h('button', { class:'chip', text:'Leeren', onclick:() => { wahl = []; malen(); } });
    wurzel.append(gitter, h('div', { class:'reihe' }, zufallK, leerK), erg, tabelle, E.el, los);
    let sitz = null, laeuft = false, t = 0, gezeigt = 0;
    const neu = neuWaechter();
    function malen() {
      const gez = sitz && sitz.gezogen && sitz.zahlen && sitz.zahlen.join() === wahl.join() ? sitz.gezogen.slice(0, gezeigt) : laeuft ? sitz.gezogen.slice(0, gezeigt) : [];
      felder.forEach((b, i) => { const z = i + 1, w = wahl.includes(z), g = gez.includes(z); b.className = 'kz' + (w ? ' an' : '') + (g ? (w ? ' treffer' : ' gezogen') : ''); });
      tabelle.innerHTML = '';
      const tab = S.KENO[wahl.length];
      if (tab) tab.forEach((m, h2) => { if (m) tabelle.append(h('span', { text:`${h2} Treffer ×${String(m).replace('.', ',')}` })); });
      else tabelle.append(h('span', { text:'Kreuze 1 bis 10 Zahlen an' }));
      los.disabled = !wahl.length || laeuft;
    }
    malen();
    return {
      update(d) {
        sitz = d.ich.sitz;
        if (neu(sitz) && sitz.gezogen && sitz.gezogen.length) { laeuft = true; t = 0; gezeigt = 0; wahl = sitz.zahlen.slice(); erg.textContent = ''; }
      },
      frame(dt) {
        if (!laeuft) return;
        t += dt;
        const n = Math.min(10, Math.floor(t / 0.3));
        if (n !== gezeigt) { gezeigt = n; api.ton(sitz.zahlen.includes(sitz.gezogen[n - 1]) ? 'treffer' : 'klick'); malen(); }
        if (t >= 3.2) {
          laeuft = false; gezeigt = 10; malen();
          const m = (S.KENO[sitz.zahlen.length] || [])[sitz.treffer] || 0;
          ergebnis(erg, `${sitz.treffer} Treffer` + (m ? ` – ×${String(m).replace('.', ',')}` : ''), m >= 1 ? (m >= 20 ? 'plus riesig' : 'plus') : 'minus');
          api.ton(m >= 20 ? 'jackpot' : m >= 1 ? 'sieg' : 'verlust');
        }
      }
    };
  };

  /* ---------- Rundenspiele ---------- */
  P.enten = (wurzel, api, E) => {
    const W = 340, Hh = 200;
    const cv = h('canvas', { width:W, height:Hh, class:'rennbahn' }); const x = cv.getContext('2d');
    const status = h('div', { class:'topf' });
    const liste = h('div', { class:'entenListe' });
    const erg = h('div', { class:'ergebnis' }), tipp = h('div', { class:'tipp' }), wetten = h('div', { class:'wetten' });
    let ente = 0, rd = null, uhr = 0, d0 = null, verlauf = null, seed = null, gemeldet = null;
    const knopf = h('button', { class:'gross gold', text:'Wetten', onclick:() => api.senden({ a:'setzen', ente, einsatz:E.wert }) });
    wurzel.append(h('div', { class:'buehne' }, cv), status, tipp, erg, liste, E.el, knopf, wetten);
    function malen() {
      x.fillStyle = '#0d47a1'; x.fillRect(0, 0, W, Hh);
      const bahn = Hh / 6;
      for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#1565c0' : '#1976d2'; x.fillRect(0, i * bahn, W, bahn); }
      x.fillStyle = '#fff'; x.fillRect(W - 30, 0, 3, Hh);
      x.fillStyle = '#000'; for (let i = 0; i < 10; i++) x.fillRect(W - 27 + (i % 2) * 4, i * Hh / 10, 4, Hh / 10);
      let f = 0;
      if (rd && rd.phase === 'rennen') f = Math.min(1, (uhr - rd.start) / S.ENTEN_RENNEN);
      else if (rd && rd.phase === 'pause') f = 1;
      S.ENTEN.forEach((e, i) => {
        const p = rd && rd.phase !== 'wetten' && verlauf ? S.entePos(verlauf, i, f) : 0;
        const px = 18 + p * (W - 60), py = i * bahn + bahn / 2 + Math.sin(uhr * 10 + i) * (rd && rd.phase === 'rennen' ? 2 : 0.5);
        x.fillStyle = e.f; x.beginPath(); x.ellipse(px, py + 3, 13, 8, 0, 0, 7); x.fill();
        x.beginPath(); x.arc(px + 9, py - 5, 6, 0, 7); x.fill();
        x.fillStyle = '#ff8f00'; x.beginPath(); x.moveTo(px + 14, py - 6); x.lineTo(px + 21, py - 4); x.lineTo(px + 14, py - 2); x.fill();
        x.fillStyle = '#111'; x.beginPath(); x.arc(px + 10, py - 7, 1.5, 0, 7); x.fill();
        x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '700 11px "Barlow Semi Condensed",sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle';
        if (px < W - 100) x.fillText(e.n, px + 26, py);
      });
    }
    return {
      update(d) {
        rd = d.tisch.runde; uhr = d.uhr; if (!rd) return;
        if (rd.sieger != null && rd.seed !== seed) { seed = rd.seed; verlauf = S.entenVerlauf(rd.seed, rd.sieger); }
        const meine = rd.wetten && rd.wetten[d.ich.id];
        einmal(liste, [rd.nr, ente, meine ? meine.ente : -1, rd.quoten.join()].join('|'), () => S.ENTEN.forEach((e, i) => liste.append(h('button', { class:'ente' + (i === ente ? ' an' : '') + (meine && meine.ente === i ? ' gewettet' : ''), style:`--f:${e.f}`, html:`<b>${e.n}</b><small>×${String(rd.quoten[i]).replace('.', ',')}</small>`, onclick:() => { ente = i; api.ton('klick'); this.update(d); } }))));
        const rest = Math.max(0, Math.ceil(rd.bis - uhr));
        status.innerHTML = rd.phase === 'wetten' ? `Wetten offen – Start in <b>${rest} s</b>` + (rd.wetten && Object.keys(rd.wetten).length ? '' : ' (startet, sobald jemand wettet)') : rd.phase === 'rennen' ? '🏁 Das Rennen läuft!' : `Sieger: <b>${S.ENTEN[rd.sieger].n}</b>`;
        tipp.textContent = rd.phase === 'wetten' && rd.sieger != null ? `🔮 Die Kristallkugel zeigt: ${S.ENTEN[rd.sieger].n} gewinnt!` : '';
        knopf.disabled = rd.phase !== 'wetten' || !!meine;
        knopf.textContent = meine ? `Gewettet: ${zahl(meine.einsatz)} $ auf ${S.ENTEN[meine.ente].n}` : 'Wetten';
        wetten.innerHTML = '';
        for (const id in rd.wetten || {}) { const w = rd.wetten[id]; wetten.append(h('span', { class:'mini', text:`${d.spielerName(id)}: ${zahl(w.einsatz)} $ auf ${S.ENTEN[w.ente].n}` })); }
        if (rd.phase === 'pause' && rd.nr !== gemeldet && meine) {
          gemeldet = rd.nr;
          const sieg = meine.ente === rd.sieger;
          ergebnis(erg, sieg ? `${S.ENTEN[rd.sieger].n} gewinnt – du auch!` : `${S.ENTEN[rd.sieger].n} gewinnt`, sieg ? 'plus' : 'minus');
          api.ton(sieg ? 'sieg' : 'verlust');
        }
        if (rd.phase === 'wetten') erg.textContent = '';
      },
      frame(dt) { uhr += dt; malen(); }
    };
  };

  P.rakete = (wurzel, api, E) => {
    const W = 340, Hh = 200;
    const cv = h('canvas', { width:W, height:Hh, class:'rennbahn' }); const x = cv.getContext('2d');
    const status = h('div', { class:'topf' }), tipp = h('div', { class:'tipp' }), erg = h('div', { class:'ergebnis' }), wetten = h('div', { class:'wetten' });
    let auto = 2;
    try { auto = +localStorage.getItem('kredithai.auto') || 2; } catch (_) { /* egal */ }
    const autoIn = h('input', { class:'einsatzWert klein', type:'text', inputmode:'decimal', value:String(auto).replace('.', ',') });
    autoIn.addEventListener('keydown', e => e.stopPropagation());
    autoIn.addEventListener('change', () => { auto = Math.max(0, Math.min(100, Number(autoIn.value.replace(',', '.')) || 0)); autoIn.value = auto ? String(auto).replace('.', ',') : ''; try { localStorage.setItem('kredithai.auto', auto); } catch (_) { /* egal */ } });
    const knopf = h('button', { class:'gross gold', text:'Einsteigen' });
    knopf.addEventListener('click', () => { if (!rd) return; if (rd.phase === 'wetten') api.senden({ a:'setzen', einsatz:E.wert, auto:auto >= 1.01 ? auto : null }); else if (rd.phase === 'flug') api.senden({ a:'raus' }); });
    wurzel.append(h('div', { class:'buehne' }, cv), status, tipp, erg, E.el, h('div', { class:'reihe' }, h('span', { class:'label', text:'Automatisch aussteigen bei ×' }), autoIn), knopf, wetten);
    let rd = null, uhr = 0, ich = null, gemeldet = null, spur = [];
    function malen() {
      x.fillStyle = '#05080f'; x.fillRect(0, 0, W, Hh);
      x.strokeStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < W; i += 34) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, Hh); x.stroke(); }
      if (!rd) return;
      let m = 1, text = '', farbe = '#69f0ae';
      if (rd.phase === 'wetten') { text = `Start in ${Math.max(0, Math.ceil(rd.bis - uhr))} s`; farbe = '#90caf9'; }
      else if (rd.phase === 'flug') { m = S.raketeMult(uhr - rd.start); text = '×' + m.toFixed(2); }
      else { m = rd.crash || 1; text = 'GEPLATZT ×' + m.toFixed(2); farbe = '#ff5252'; }
      if (rd.phase !== 'wetten') {
        const dauer = rd.phase === 'flug' ? uhr - rd.start : S.raketeZeit(m);
        const maxM = Math.max(2, m * 1.15), maxT = Math.max(6, dauer * 1.1);
        x.strokeStyle = farbe; x.lineWidth = 3; x.beginPath();
        for (let i = 0; i <= 60; i++) { const tt = dauer * i / 60, mm = S.raketeMult(tt), px = 14 + tt / maxT * (W - 40), py = Hh - 14 - (mm - 1) / (maxM - 1) * (Hh - 60); i ? x.lineTo(px, py) : x.moveTo(px, py); }
        x.stroke();
        const px = 14 + dauer / maxT * (W - 40), py = Hh - 14 - (m - 1) / (maxM - 1) * (Hh - 60);
        x.font = '22px "Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(rd.phase === 'crash' ? '💥' : '🚀', px, py);
        if (ich && ich.raus > 0) { const y = Hh - 14 - (ich.raus - 1) / (maxM - 1) * (Hh - 60); x.strokeStyle = 'rgba(105,240,174,.5)'; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); x.setLineDash([]); }
      }
      x.fillStyle = farbe; x.font = '800 40px "Barlow Semi Condensed",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(text, W / 2, rd.phase === 'wetten' ? Hh / 2 : 34);
    }
    return {
      update(d) {
        rd = d.tisch.runde; uhr = d.uhr; if (!rd) return;
        ich = rd.wetten && rd.wetten[d.ich.id];
        status.innerHTML = rd.phase === 'wetten' ? (ich ? `Du bist dabei mit <b>${zahl(ich.einsatz)} $</b>` + (ich.auto ? ` · Auto bei ×${ich.auto}` : '') : 'Steig vor dem Start ein!') + (rd.wetten && Object.keys(rd.wetten).length ? '' : ' (startet, sobald jemand einsteigt)') : rd.phase === 'flug' ? (ich ? (ich.raus ? `Ausgestiegen bei ×${ich.raus}` : '<b>Steig rechtzeitig aus!</b>') : 'Die Rakete fliegt …') : `Geplatzt bei ×${(rd.crash || 1).toFixed(2)}`;
        tipp.textContent = rd.crashTipp && rd.phase !== 'crash' ? `🔮 Die Kristallkugel flüstert: Sie platzt bei ×${rd.crashTipp.toFixed(2)}` : '';
        if (rd.phase === 'wetten') { knopf.disabled = !!ich; knopf.textContent = ich ? 'Eingestiegen' : 'Einsteigen'; knopf.className = 'gross gold'; erg.textContent = ''; }
        else if (rd.phase === 'flug') { knopf.disabled = !ich || ich.raus != null; knopf.textContent = ich && ich.raus == null ? 'AUSSTEIGEN' : 'Warte auf die nächste Runde'; knopf.className = 'gross ' + (ich && ich.raus == null ? 'rot' : ''); }
        else { knopf.disabled = true; knopf.textContent = 'Nächste Runde gleich'; knopf.className = 'gross'; }
        if (ich && ich.raus != null && gemeldet !== rd.nr + ':' + ich.raus) {
          gemeldet = rd.nr + ':' + ich.raus;
          if (ich.raus > 0) { ergebnis(erg, `Ausgestiegen bei ×${ich.raus}!`, 'plus'); api.ton('sieg'); } else { ergebnis(erg, 'Mit der Rakete geplatzt 💥', 'minus'); api.ton('bumm'); }
        }
        wetten.innerHTML = '';
        for (const id in rd.wetten || {}) { const w = rd.wetten[id]; wetten.append(h('span', { class:'mini' + (w.raus > 0 ? ' ok' : w.raus === 0 ? ' falsch' : ''), text:`${d.spielerName(id)}: ${zahl(w.einsatz)} $` + (w.raus > 0 ? ` ×${w.raus}` : w.raus === 0 ? ' 💥' : '') })); }
      },
      frame(dt) { uhr += dt; malen(); }
    };
  };

  /* ---------- Panel öffnen ---------- */
  function oeffnen(wurzel, art, api) {
    wurzel.innerHTML = '';
    const sp = S.G[art];
    const E = einsatzLeiste(art, api);
    const info = h('details', { class:'regeln' }, h('summary', { text:'Regeln' }), h('p', { text:sp.info }));
    const inhalt = h('div', { class:'panelInhalt' });
    wurzel.append(h('div', { class:'panelKopf' }, h('span', { class:'panelIcon', text:sp.icon }), h('h2', { text:sp.name }), info), inhalt);
    const p = P[art](inhalt, api, E);
    return {
      update(d) { E.update(d); p.update(d); },
      frame(dt) { p.frame(dt); },
      zu() { wurzel.innerHTML = ''; }
    };
  }

  window.KHTische = { oeffnen, karte, kartenText, h };
})();

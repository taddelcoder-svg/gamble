'use strict';
/* Bots, die echte Läufe gegen js/logik.js spielen. Für den Balance-Test (test/balance.js) und die Unit-Tests.
   Jeder Bot läuft zu Tischen (teleportiert), setzt nach einer einfachen Strategie und reagiert wie ein Mensch
   mit etwas Verzögerung. mut = Anteil des Kontos, den ein Bot pro Einsatz riskiert. */
const L = require('../js/logik.js');
const S = require('../js/spiele.js');
const G = S.G;

function botStrategie(art, sitz, r, mut) {
  switch (art) {
    case 'muenze':
      if (sitz.phase === 'gewonnen') return sitz.serie >= 1 + Math.floor(r() * 2) ? { a:'kassieren' } : { a:'nochmal', seite:r() < 0.5 ? 'kopf' : 'zahl' };
      return { a:'setzen', seite:r() < 0.5 ? 'kopf' : 'zahl' };
    case 'roulette': { const x = r(); return { a:'setzen', wahl:x < 0.7 ? (r() < 0.5 ? 'rot' : 'schwarz') : x < 0.95 ? 'd' + (1 + Math.floor(r() * 3)) : 'z' + Math.floor(r() * 37) }; }
    case 'blackjack': {
      if (sitz.phase !== 'zug') return { a:'setzen' };
      const w = S.bjWert(sitz.hand);
      if (sitz.hand.length === 2 && (w === 10 || w === 11)) return { a:'doppeln' };
      return w < 17 ? { a:'karte' } : { a:'halten' };
    }
    case 'slots': return { a:'setzen' };
    case 'hilo': {
      if (sitz.phase !== 'laeuft') { sitz._ziel = 1.4 + r() * 2; return { a:'setzen' }; }
      if (sitz.mult >= (sitz._ziel || 2)) return { a:'kassieren' };
      const rr = S.rang(sitz.karte);
      if (rr >= 5 && rr <= 7 && (sitz.skips || 0) < 10) return { a:'skip' };
      return { a:rr <= 6 ? 'hoeher' : 'tiefer' };
    }
    case 'plinko': return { a:'setzen', risiko:Math.floor(r() * 3) };
    case 'turm':
      if (sitz.phase !== 'laeuft') { sitz._ziel = 2 + Math.floor(r() * 4); return { a:'setzen', art:1 }; }
      if (sitz.stufe >= (sitz._ziel || 3)) return { a:'kassieren' };
      return { a:'waehlen', feld:Math.floor(r() * 3) };
    case 'minen': {
      if (sitz.phase !== 'laeuft') { sitz._ziel = 2 + Math.floor(r() * 4); return { a:'setzen', minen:3 }; }
      if (sitz.offen.length >= (sitz._ziel || 3)) return { a:'kassieren' };
      let f; do f = Math.floor(r() * 25); while (sitz.offen.includes(f));
      return { a:'aufdecken', feld:f };
    }
    case 'wuerfel': return sitz.phase === 'punkt' ? { a:'wuerfeln' } : { a:'setzen', wette:'pass' };
    case 'rad': { const x = r(); return { a:'setzen', symbol:x < 0.5 ? 0 : x < 0.8 ? 1 : x < 0.93 ? 2 : Math.floor(3 + r() * 4) }; }
    case 'poker': {
      if (sitz.phase !== 'tauschen') return { a:'setzen' };
      const raenge = sitz.hand.map(S.rang), z = {};
      for (const x of raenge) z[x] = (z[x] || 0) + 1;
      const halten = raenge.map(x => z[x] >= 2 || (Object.values(z).every(n => n < 2) && x >= 9));
      return { a:'ziehen', halten };
    }
    case 'los': return sitz.phase === 'rubbeln' ? { a:'aufdecken' } : { a:'setzen' };
    case 'huetchen':
      if (sitz.phase !== 'mischen') return { a:'setzen' };
      return { a:'waehlen', becher:r() < 0.65 && sitz.tipp == null ? 'richtig' : Math.floor(r() * 3) };
    case 'baccarat': return { a:'setzen', auf:r() < 0.6 ? 'bank' : r() < 0.95 ? 'spieler' : 'tie' };
    case 'keno': { const n = 3 + Math.floor(r() * 5), z = new Set(); while (z.size < n) z.add(1 + Math.floor(r() * 40)); return { a:'setzen', zahlen:[...z] }; }
    case 'enten': { const x = r(); return { a:'setzen', ente:Math.floor(x * 6) }; }
    case 'rakete': return { a:'setzen', auto:1.3 + r() * 2.5 };
  }
  return null;
}

// Ein Bot-Team spielt einen kompletten Lauf. Gibt Statistik zurück.
function laufSpielen({ seed = 1, spieler = 2, mut = 0.3, laenge = 'normal', tagDauer = 300, items = true, pfand = true, log = false } = {}) {
  const spiel = new L.Spiel({ seed, laenge, tagDauer });
  let st = (seed * 7919 + 13) >>> 0;
  const r = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const bots = [];
  for (let i = 0; i < spieler; i++) { spiel.spielerHinzu('b' + i, 'Bot' + i, L.TIERE[i]); bots.push({ id:'b' + i, warte:0, tischWechsel:0 }); }
  const tage = [];
  let schritte = 0;
  while (spiel.phase !== 'ende' && schritte < 400000) {
    schritte++;
    const z = spiel.phase;
    if (z === 'laden') {
      if (items) for (const b of bots) {
        const sp = spiel.spieler.get(b.id);
        spiel.laden.angebot.forEach((a, i) => { if (!a.weg && spiel.tickets >= a.preis && sp.items.includes(null) && r() < 0.5) spiel.aktion(b.id, { a:'kaufen', i }); });
      }
      for (const b of bots) spiel.aktion(b.id, { a:'bereit', an:true });
    } else if (z === 'finale') {
      for (const b of bots) spiel.aktion(b.id, { a:'stimme', wahl:'aus' });
    } else if (z === 'tag') {
      for (const b of bots) {
        const sp = spiel.spieler.get(b.id);
        if (b.warte > spiel.uhr) continue;
        // Ziel erreicht: Feierabend
        if (spiel.bank >= spiel.quote * 1.3) { if (!sp.feierabend) spiel.aktion(b.id, { a:'feierabend', an:true }); b.warte = spiel.uhr + 2; continue; }
        // Items gleich benutzen
        if (items) { const i = sp.items.findIndex(x => x); if (i >= 0) { spiel.aktion(b.id, { a:'item', slot:i }); b.warte = spiel.uhr + 0.5; continue; } }
        // Pleite: verpfänden
        const minEinsatz = Math.min(...spiel.tische.map(t => t.min));
        if (spiel.bank < minEinsatz) {
          const ding = Object.keys(sp.pfand).find(k => !sp.pfand[k]);
          if (pfand && ding && spiel.zeit > 30) { spiel.position(b.id, L.PFANDHAUS.x, L.PFANDHAUS.z + 1); spiel.aktion(b.id, { a:'pfand', ding }); b.warte = spiel.uhr + 3; continue; }
          b.warte = spiel.uhr + 2; continue;
        }
        // Tisch wählen
        if (!sp.tisch || spiel.uhr > b.tischWechsel) {
          const frei = spiel.tische.filter(t => spiel.aktive().filter(s => s.tisch === t.id).length < G[t.art].plaetze || sp.tisch === t.id);
          const t = frei[Math.floor(r() * frei.length)];
          const alt = sp.sitzungen[sp.tisch];
          const mitten = alt && (alt.phase === 'zug' || alt.phase === 'laeuft' || alt.phase === 'gewonnen' || alt.phase === 'punkt' || alt.phase === 'tauschen' || alt.phase === 'mischen' || alt.phase === 'rubbeln');
          if (t && !mitten) {
            spiel.position(b.id, t.x, t.z + 1.8);
            spiel.aktion(b.id, { a:'sitzen', tisch:t.id });
            b.tischWechsel = spiel.uhr + 20 + r() * 40;
            b.warte = spiel.uhr + 2.5;
            continue;
          }
        }
        const t = spiel.tischVon(sp.tisch); if (!t) { b.warte = spiel.uhr + 1; continue; }
        const sicht = spiel.zustand().spieler.find(s => s.id === b.id);
        const sitz = G[t.art].runde ? t.runde : sp.sitzungen[t.id];
        if (!sitz) { b.warte = spiel.uhr + 1; continue; }
        if (G[t.art].runde) {
          if (sitz.phase !== 'wetten' || sitz.wetten[b.id]) { b.warte = spiel.uhr + 1; continue; }
        } else if (sitz.bis && spiel.uhr < sitz.bis) { b.warte = sitz.bis + 0.2; continue; }
        const bef = botStrategie(t.art, sitz, r, mut);
        if (!bef) { b.warte = spiel.uhr + 1; continue; }
        if (t.art === 'huetchen' && bef.becher === 'richtig') bef.becher = sitz._ziel;
        if (bef.a === 'setzen') {
          const ziel = Math.max(t.min, Math.floor(Math.min(sicht.limit, spiel.bank * mut, spiel.bank)));
          bef.einsatz = ziel;
        }
        spiel.aktion(b.id, { a:'spiel', z:bef });
        b.warte = spiel.uhr + 0.6 + r() * 1.2;
      }
    }
    const vorher = spiel.phase, tag = spiel.tag;
    spiel.takt();
    spiel.nimmEreignisse();
    if (vorher === 'tag' && spiel.phase === 'abrechnung') {
      tage.push({ tag, bezahlt:spiel.abrechnung.bezahlt, quote:spiel.abrechnung.quote, vorher:spiel.abrechnung.vorher });
      if (log) console.log(`Tag ${tag}: Rate ${spiel.abrechnung.quote} Bank ${spiel.abrechnung.vorher} ${spiel.abrechnung.bezahlt ? 'OK' : 'FEHLT'}`);
    }
  }
  return { ende:spiel.ende ? spiel.ende.art : 'abbruch', tage, bank:spiel.bank, spiel };
}

module.exports = { laufSpielen, botStrategie };

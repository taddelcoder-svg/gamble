'use strict';
const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/spiele.js');
const L = require('../js/logik.js');
const { laufSpielen, botStrategie } = require('./bots.js');
const G = S.G;

// Einfacher Kontext für einzelne Spiele: zählt Einsatz und Auszahlung
function stubKontext(seed, effekte = {}) {
  const rng = L.zufall(seed);
  const k = { rng, uhr:0, etage:1, gesetzt:0, zurueck:0, runden:0, E:0, effekte };
  Object.assign(k, {
    setzen(b) { k.E = b; k.gesetzt += b; return true; },
    nachsetzen(b) { k.E += b; k.gesetzt += b; return true; },
    einsatzJetzt:() => k.E,
    bindung:() => ({}),
    zahlen(brutto) { k.zurueck += brutto; k.runden++; k.E = 0; },
    sperre() {}, hat:e => (k.effekte[e] || 0) > 0, nimm:e => { k.effekte[e]--; }, melde() {}
  });
  return k;
}
function rtp(art, runden, seed = 7) {
  const c = stubKontext(seed);
  const s = G[art].neu();
  const r = L.zufall(seed + 1);
  let n = 0;
  while (c.runden < runden && n < runden * 30) {
    n++;
    let b = botStrategie(art, s, r, 0.3);
    if (art === 'huetchen' && b.a === 'waehlen') b = { a:'waehlen', becher:Math.floor(r() * 3) };
    if (art === 'hilo' && b.a === 'skip') b = { a:'hoeher' };
    if (b.a === 'setzen') b.einsatz = 100;
    G[art].aktion(s, b, c);
  }
  return c.zurueck / c.gesetzt;
}

test('Auszahlungstabellen liegen exakt im Rahmen', () => {
  // Slots exakt
  let r = 0;
  for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) for (let c = 0; c < 7; c++) r += S.SLOT_W[a] * S.SLOT_W[b] * S.SLOT_W[c] / 28 ** 3 * S.slotFaktor([a, b, c]);
  assert.ok(r > 0.93 && r < 0.97, 'Slots ' + r);
  for (const t of S.PLINKO) { let p = 0; t.forEach((m, k) => p += S.binom(12, k) / 4096 * m); assert.ok(p > 0.96 && p < 0.99, 'Plinko ' + p); }
  for (const n in S.KENO) {
    let p = 0; S.KENO[n].forEach((m, h) => p += S.binom(+n, h) * S.binom(40 - n, 10 - h) / S.binom(40, 10) * m);
    assert.ok(p > 0.93 && p < 0.995, 'Keno ' + n + ' ' + p);
  }
  for (const s of S.RAD_SYM) assert.strictEqual(S.RAD_FELDER.filter((x, i) => S.RAD_SYM[x] === s).length, s.z);
  assert.ok(S.RAD_FELDER.every(x => x >= 0));
  const los = S.LOS.reduce((a, l) => a + l.p * l.m, 0);
  assert.ok(los > 0.94 && los < 0.97, 'Los ' + los);
});

test('Jedes Einzelspiel zahlt im Schnitt knapp unter dem Einsatz zurück', () => {
  const runden = { muenze:20000, roulette:20000, blackjack:20000, slots:60000, hilo:20000, plinko:40000, turm:20000, minen:20000, wuerfel:20000, rad:30000, poker:20000, los:60000, baccarat:20000, keno:60000 };
  for (const art in runden) {
    const q = rtp(art, runden[art]);
    assert.ok(q > 0.85 && q < 1.03, `${art}: ${q.toFixed(3)}`);
  }
  // Hütchenspiel ist Geschick: blind geraten verliert klar, wer die Kugel verfolgt, gewinnt meistens
  assert.ok(rtp('huetchen', 20000) < 0.7);
});

test('Blackjack: Werte und Blackjack', () => {
  // Karten: Rang 12 = Ass, 8 = Zehn, 11 = König
  assert.strictEqual(S.bjWert([12, 11]), 21);
  assert.strictEqual(S.bjWert([12, 12, 8]), 12);
  assert.strictEqual(S.bjWert([3, 4, 5]), 18);   // 5 + 6 + 7
});

test('Video-Poker erkennt Hände', () => {
  const k = (r, f) => f * 13 + r;
  assert.strictEqual(S.pokerHand([k(8, 0), k(9, 0), k(10, 0), k(11, 0), k(12, 0)]), 0);            // Royal Flush
  assert.strictEqual(S.pokerHand([k(12, 0), k(0, 1), k(1, 2), k(2, 3), k(3, 0)]), 5);              // Straße Ass bis Fünf
  assert.strictEqual(S.pokerHand([k(9, 0), k(9, 1), k(2, 2), k(3, 3), k(5, 0)]), 8);               // Paar Buben
  assert.strictEqual(S.pokerHand([k(4, 0), k(4, 1), k(2, 2), k(3, 3), k(5, 0)]), -1);              // kleines Paar
  assert.strictEqual(S.pokerHand([k(4, 0), k(4, 1), k(4, 2), k(3, 3), k(3, 0)]), 3);               // Full House
});

test('Entenrennen: der Sieger kommt zuerst ins Ziel', () => {
  for (let seed = 1; seed < 40; seed++) {
    const sieger = seed % 6;
    const v = S.entenVerlauf(seed * 977, sieger);
    const ende = [0, 1, 2, 3, 4, 5].map(i => S.entePos(v, i, 1));
    assert.strictEqual(ende[sieger], 1);
    for (let i = 0; i < 6; i++) if (i !== sieger) assert.ok(ende[i] < 1);
  }
});

function startTag(seed = 3, spieler = 1) {
  const sp = new L.Spiel({ seed });
  for (let i = 0; i < spieler; i++) sp.spielerHinzu('s' + i, 'S' + i);
  for (let i = 0; i < spieler; i++) sp.aktion('s' + i, { a:'bereit', an:true });
  assert.strictEqual(sp.phase, 'tag');
  return sp;
}
function hinsetzen(sp, id, art) {
  const t = sp.tische.find(x => x.art === art);
  sp.position(id, t.x, t.z + 1.5, 0);
  sp.aktion(id, { a:'sitzen', tisch:t.id });
  return t;
}
const bisFertig = sp => { for (let i = 0; i < 60; i++) sp.takt(); };

test('Tag 1 beginnt mit Jetons und Einsatz geht vom gemeinsamen Konto', () => {
  const sp = startTag(5, 2);
  assert.strictEqual(sp.bank, 800);
  const t = hinsetzen(sp, 's0', 'roulette');
  sp.aktion('s0', { a:'spiel', z:{ a:'setzen', wahl:'rot', einsatz:100 } });
  assert.strictEqual(sp.bank, 700);
  bisFertig(sp);
  const e = sp.nimmEreignisse().find(x => x.e === 'ergebnis');
  assert.ok(e && (e.netto === 100 || e.netto === -100));
  assert.strictEqual(sp.bank, 700 + (e.netto > 0 ? 200 : 0));
  // Limit wird eingehalten
  sp.aktion('s0', { a:'spiel', z:{ a:'setzen', wahl:'rot', einsatz:t.max + 1 } });
  assert.ok(sp.nimmEreignisse().some(x => x.e === 'fehler'));
});

test('Goldener Chip und Versicherung erstatten Verluste', () => {
  const sp = startTag(11);
  const s = sp.spieler.get('s0');
  hinsetzen(sp, 's0', 'roulette');
  s.eff.goldchip = { n:1 };
  let verloren = false;
  for (let i = 0; i < 20 && !verloren; i++) {
    const vorher = sp.bank;
    s.eff.goldchip = { n:1 };
    sp.aktion('s0', { a:'spiel', z:{ a:'setzen', wahl:'z0', einsatz:100 } });
    bisFertig(sp);
    const e = sp.nimmEreignisse().find(x => x.e === 'ergebnis');
    if (e.netto <= 0) { verloren = true; assert.strictEqual(sp.bank, vorher); assert.strictEqual(e.netto, 0); }
  }
  assert.ok(verloren);
  s.eff = { versicherung:{ n:5 } };
  for (let i = 0; i < 30; i++) {
    const vorher = sp.bank;
    sp.aktion('s0', { a:'spiel', z:{ a:'setzen', wahl:'z0', einsatz:100 } });
    bisFertig(sp);
    const e = sp.nimmEreignisse().find(x => x.e === 'ergebnis');
    if (e.netto < 0) { assert.strictEqual(e.netto, -50); assert.strictEqual(sp.bank, vorher - 50); break; }
  }
});

test('Pfandhaus gibt Geld, nur in der Nähe', () => {
  const sp = startTag(4);
  sp.position('s0', 0, 0, 0);
  sp.aktion('s0', { a:'pfand', ding:'schuhe' });
  assert.ok(sp.nimmEreignisse().some(x => x.e === 'fehler'));
  sp.position('s0', L.PFANDHAUS.x, L.PFANDHAUS.z + 1, 0);
  const vorher = sp.bank;
  sp.aktion('s0', { a:'pfand', ding:'schuhe' });
  assert.strictEqual(sp.bank, vorher + L.nett(sp.quote * L.PFANDWERT));
  assert.strictEqual(sp.spieler.get('s0').pfand.schuhe, true);
});

test('Tagesende: Rate bezahlt oder Mahnung, nach drei Mahnungen Aquarium', () => {
  const sp = startTag(8);
  sp.bank = 5000;
  sp.zeit = 0.05; sp.takt();
  assert.strictEqual(sp.phase, 'abrechnung');
  assert.ok(sp.abrechnung.bezahlt);
  assert.strictEqual(sp.bank, 4000);
  for (let i = 0; i < 100; i++) sp.takt();
  assert.strictEqual(sp.phase, 'laden');
  assert.strictEqual(sp.tag, 2);
  for (let tag = 0; tag < 3; tag++) {
    sp.aktion('s0', { a:'bereit', an:true });
    sp.bank = 0; sp.zeit = 0.05; sp.takt();
    // Jetons werden morgens gutgeschrieben – zum Testen wegnehmen
    assert.strictEqual(sp.phase, 'abrechnung');
    for (let i = 0; i < 100 && sp.phase === 'abrechnung'; i++) sp.takt();
  }
  assert.strictEqual(sp.phase, 'ende');
  assert.strictEqual(sp.ende.art, 'aquarium');
});

test('Gleicher Seed, gleiche Befehle -> gleicher Lauf', () => {
  const a = laufSpielen({ seed:77, spieler:2 });
  const b = laufSpielen({ seed:77, spieler:2 });
  assert.deepStrictEqual(a.tage, b.tage);
  assert.strictEqual(a.ende, b.ende);
});

test('Bots spielen ganze Läufe ohne Fehler', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const e = laufSpielen({ seed, spieler:1 + (seed % 4), mut:0.2 + (seed % 3) * 0.2, laenge:seed % 2 ? 'kurz' : 'normal' });
    assert.ok(['aquarium', 'frei'].includes(e.ende), 'Ende ' + e.ende);
    assert.ok(e.bank >= 0);
    assert.ok(Number.isFinite(e.bank));
  }
});

test('Zustand ist JSON und verrät keine Geheimnisse', () => {
  const sp = startTag(9);
  hinsetzen(sp, 's0', 'blackjack');
  sp.aktion('s0', { a:'spiel', z:{ a:'setzen', einsatz:50 } });
  const z = JSON.stringify(sp.zustand());
  assert.ok(!z.includes('"_'));
  sp.spieler.get('s0').eff.brille = { bis:sp.uhr + 30 };
  const mit = sp.zustand().spieler[0].sitz;
  if (mit.phase === 'zug') assert.ok(mit.loch != null);
});

test('Items: Statue schützt in der Nähe, Sanduhr gibt Zeit, Keks macht einen Tisch heiß', () => {
  const sp = startTag(12, 2);
  const a = sp.spieler.get('s0');
  hinsetzen(sp, 's0', 'roulette');
  a.items = ['statue', 'sanduhr', 'keks'];
  sp.aktion('s0', { a:'item', slot:0 });
  assert.strictEqual(sp.statuen.length, 1);
  for (let i = 0; i < 4; i++) {
    const vorher = sp.bank;
    sp.aktion('s0', { a:'spiel', z:{ a:'setzen', wahl:'z5', einsatz:100 } });
    bisFertig(sp);
    const e = sp.nimmEreignisse().find(x => x.e === 'ergebnis');
    assert.ok(e.netto >= 0, 'Statue hätte schützen müssen');
    assert.ok(sp.bank >= vorher);
  }
  const zeit = sp.zeit;
  sp.aktion('s0', { a:'item', slot:1 });
  assert.ok(sp.zeit > zeit + 40);
  sp.aktion('s0', { a:'item', slot:2 });
  assert.ok(sp.heiss && sp.tische.some(t => t.id === sp.heiss.tisch));
});

test('Rakete: Auto-Ausstieg zahlt, Platzen kostet', () => {
  const sp = startTag(21);
  // Rakete gibt es erst ab Etage 1 – direkt einen Tisch erzeugen
  sp.etage = 1; sp.tischeWuerfeln();
  const t = hinsetzen(sp, 's0', 'rakete');
  sp.aktion('s0', { a:'spiel', z:{ a:'setzen', einsatz:t.min * 5, auto:1.5 } });
  assert.ok(t.runde.wetten.s0);
  for (let i = 0; i < 600 && t.runde.wetten && t.runde.wetten.s0 && t.runde.wetten.s0.raus == null; i++) { sp.takt(); }
  const w = t.runde.wetten.s0;
  assert.ok(w.raus === 1.5 || w.raus === 0, 'raus ' + w.raus);
});

test('Items: rausnehmen, tragen, wegstecken, benutzen', () => {
  const sp = startTag(14);
  const s = sp.spieler.get('s0');
  s.items = ['drink', null, 'sanduhr'];
  sp.aktion('s0', { a:'halten', slot:0 });
  assert.strictEqual(sp.zustand().spieler[0].hand, 0);
  sp.aktion('s0', { a:'halten', slot:0 });              // erneut = wegstecken
  assert.strictEqual(sp.zustand().spieler[0].hand, null);
  sp.aktion('s0', { a:'halten', slot:1 });              // leerer Platz geht nicht
  assert.strictEqual(s.hand, null);
  sp.aktion('s0', { a:'halten', slot:2 });
  sp.aktion('s0', { a:'halten', slot:0 });              // anderes Item wechselt die Hand
  assert.strictEqual(s.hand, 0);
  sp.aktion('s0', { a:'item', slot:0 });                // benutzen räumt die Hand
  assert.strictEqual(s.hand, null);
  assert.strictEqual(s.items[0], null);
  assert.ok(s.eff.drink);
});

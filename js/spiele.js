/* Kredithai – Regeln aller Glücksspiele (rein, ohne DOM; läuft im Browser für Solo und auf dem Server).
   Jedes Einzelspiel bekommt eine Sitzung s (pro Spieler und Tisch) und einen Kontext c von logik.js:
     c.rng()            Zufall 0..1 (deterministisch je Lauf)
     c.setzen(betrag)   Einsatz vom gemeinsamen Konto nehmen (prüft Limit und Kontostand) -> true/false
     c.nachsetzen(b)    weiterer Einsatz in derselben Runde (Verdoppeln), ohne Tischlimit
     c.zahlen(brutto,o) Runde abrechnen: brutto = alles, was zurückfließt (0 = verloren). o.nach = Sekunden
                        bis zur Gutschrift (Animation), o.faktor/o.text für Anzeige, o.melde für Herausforderungen
     c.sperre(sek)      nächste Aktion frühestens nach sek (Animation; Espresso halbiert)
     c.hat(e)/c.nimm(e) Effekte (Items) des Spielers prüfen / eine Ladung verbrauchen
     c.etage            0..3
   Felder mit _ am Anfang sind geheim und gehen nicht an die Browser (außer mit Röntgenbrille, siehe sicht()).
   Rundenspiele (Entenrennen, Rakete) laufen für den ganzen Tisch gemeinsam. */
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.KHSpiele = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const KANTE = 0.97;   // Hausvorteil 3 % bei den Multiplikator-Spielen
  const rund2 = x => Math.round(x * 100) / 100;
  const ganz = x => Math.max(0, Math.floor(x));
  const zuf = (c, n) => Math.floor(c.rng() * n);
  function mischen(c, a) { for (let i = a.length - 1; i > 0; i--) { const j = zuf(c, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const binom = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };

  /* ---------- Karten: 0..51, Rang = k % 13 (0 = Zwei … 8 = Zehn, 9 = Bube, 10 = Dame, 11 = König, 12 = Ass), Farbe = k / 13 ---------- */
  const rang = k => k % 13;
  const farbe = k => (k / 13) | 0;
  const karte = c => zuf(c, 52);
  const deck = c => mischen(c, Array.from({ length:52 }, (_, i) => i));

  /* ================= Einzelspiele ================= */
  const G = {};

  /* ---------- Münzwurf: Doppelt oder nichts, beliebig oft hintereinander ---------- */
  G.muenze = {
    name:'Münzwurf', icon:'🪙', plaetze:2, faktor:0.4, ab:0,
    info:'Kopf oder Zahl. Ein Treffer zahlt das 1,94-Fache – und du darfst den Topf gleich wieder riskieren.',
    neu:() => ({ phase:'bereit', serie:0, topf:0, wurf:null, wahl:null }),
    aktion(s, b, c) {
      const seite = b.seite === 'zahl' ? 'zahl' : 'kopf';
      if (b.a === 'setzen') {
        if (s.phase === 'gewonnen') return 'Erst kassieren oder weiterspielen';
        if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
        s.serie = 0; s.topf = c.einsatzJetzt();
      } else if (b.a === 'nochmal') {
        if (s.phase !== 'gewonnen') return 'Kein Topf';
      } else if (b.a === 'kassieren') {
        if (s.phase !== 'gewonnen') return 'Kein Topf';
        c.zahlen(s.topf, { faktor:rund2(s.topf / c.einsatzJetzt()), text:`Münzwurf ×${s.serie}` });
        s.phase = 'bereit'; s.topf = 0;
        return;
      } else return 'Unbekannt';
      s.wahl = seite;
      s.wurf = c.rng() < 0.5 ? 'kopf' : 'zahl';
      s.nr = (s.nr || 0) + 1;
      c.sperre(1.3);
      if (s.wurf === seite) {
        s.topf = ganz(s.topf * 1.94); s.serie++; s.phase = 'gewonnen';
        c.melde('muenzserie', s.serie);
      } else {
        c.zahlen(0, { nach:1.3, text:'Münzwurf' });
        s.phase = 'bereit'; s.topf = 0; s.serie = 0;
      }
    },
    ende(s, c) { if (s.phase === 'gewonnen') this.aktion(s, { a:'kassieren' }, c); }
  };

  /* ---------- Roulette (europäisch, eine Null) ---------- */
  const ROT = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const R_WAHL = {
    rot:{ n:'Rot', m:2, t:z => ROT.has(z) }, schwarz:{ n:'Schwarz', m:2, t:z => z > 0 && !ROT.has(z) },
    gerade:{ n:'Gerade', m:2, t:z => z > 0 && z % 2 === 0 }, ungerade:{ n:'Ungerade', m:2, t:z => z % 2 === 1 },
    tief:{ n:'1–18', m:2, t:z => z >= 1 && z <= 18 }, hoch:{ n:'19–36', m:2, t:z => z >= 19 },
    d1:{ n:'1–12', m:3, t:z => z >= 1 && z <= 12 }, d2:{ n:'13–24', m:3, t:z => z >= 13 && z <= 24 }, d3:{ n:'25–36', m:3, t:z => z >= 25 }
  };
  function rWahl(w) {
    if (R_WAHL[w]) return R_WAHL[w];
    const m = /^z(\d{1,2})$/.exec(String(w || ''));
    if (m && +m[1] <= 36) { const n = +m[1]; return { n:'Zahl ' + n, m:36, t:z => z === n, zahl:n }; }
    return null;
  }
  // Reihenfolge der Zahlen auf dem Kessel (für die Animation)
  const KESSEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  G.roulette = {
    name:'Roulette', icon:'🎡', plaetze:4, faktor:0.4, ab:0,
    info:'Farbe, Gerade/Ungerade oder Hälfte zahlt das Doppelte, ein Dutzend das Dreifache, eine einzelne Zahl das 36-Fache.',
    neu:() => ({ phase:'bereit', zahl:null, wahl:null }),
    aktion(s, b, c) {
      if (b.a !== 'setzen') return 'Unbekannt';
      const w = rWahl(b.wahl);
      if (!w) return 'Wähle ein Feld';
      if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
      let z = zuf(c, 37);
      // Magnet: die Kugel springt mit 50 % in ein passendes Fach
      if (!w.t(z) && c.hat('magnet') && c.rng() < 0.5) {
        const passend = KESSEL.filter(w.t);
        z = passend[zuf(c, passend.length)];
      }
      if (c.hat('magnet')) c.nimm('magnet');
      s.zahl = z; s.wahl = b.wahl; s.nr = (s.nr || 0) + 1; s.phase = 'bereit';
      const sieg = w.t(z);
      c.sperre(3.6);
      c.zahlen(sieg ? c.einsatzJetzt() * w.m : 0, { nach:3.6, faktor:w.m, text:`Roulette ${w.n}`, melde:sieg && w.zahl != null ? ['rouletteZahl'] : null });
    }
  };

  /* ---------- Blackjack (Dealer steht auf 17, Blackjack zahlt 3:2, Verdoppeln) ---------- */
  function bjWert(karten) {
    let w = 0, asse = 0;
    for (const k of karten) { const r = rang(k); if (r === 12) { w += 11; asse++; } else w += r >= 8 ? 10 : r + 2; }
    while (w > 21 && asse) { w -= 10; asse--; }
    return w;
  }
  const istBJ = h => h.length === 2 && bjWert(h) === 21;
  G.blackjack = {
    name:'Blackjack', icon:'🃏', plaetze:3, faktor:0.35, ab:0,
    info:'Komm näher an 21 als der Dealer, ohne drüber zu gehen. Blackjack zahlt 2,5-fach, Sieg doppelt, Gleichstand gibt den Einsatz zurück.',
    neu:() => ({ phase:'bereit', hand:[], dealer:[], _loch:null, _naechste:null, verdoppelt:false, ergebnis:null }),
    ziehen(s, c) { const k = s._naechste != null ? s._naechste : karte(c); s._naechste = karte(c); return k; },
    aktion(s, b, c) {
      if (b.a === 'setzen') {
        if (s.phase === 'zug') return 'Hand läuft noch';
        if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
        s.verdoppelt = false; s.ergebnis = null; s.nr = (s.nr || 0) + 1;
        s.hand = [this.ziehen(s, c)]; s.dealer = [this.ziehen(s, c)];
        s.hand.push(this.ziehen(s, c)); s._loch = this.ziehen(s, c);
        s.phase = 'zug';
        c.sperre(1.1);
        const dBJ = istBJ([s.dealer[0], s._loch]);
        if (istBJ(s.hand) || dBJ) return this.aufdecken(s, c, 1.1);
        return;
      }
      if (s.phase !== 'zug') return 'Keine Hand';
      if (b.a === 'karte') {
        s.hand.push(this.ziehen(s, c));
        c.sperre(0.5);
        const w = bjWert(s.hand);
        if (w > 21) { s.phase = 'fertig'; s.ergebnis = 'drueber'; s.dealer.push(s._loch); s._loch = null; c.zahlen(0, { nach:0.6, text:'Blackjack: über 21' }); }
        else if (w === 21) return this.aufdecken(s, c, 0.5);
        if (s.hand.length >= 5 && w <= 21) c.melde('bjFuenf');
        return;
      }
      if (b.a === 'halten') return this.aufdecken(s, c, 0);
      if (b.a === 'doppeln') {
        if (s.hand.length !== 2) return 'Nur mit zwei Karten';
        if (!c.nachsetzen(c.einsatzJetzt())) return 'Nicht genug Geld';
        s.verdoppelt = true;
        s.hand.push(this.ziehen(s, c));
        if (bjWert(s.hand) > 21) { s.phase = 'fertig'; s.ergebnis = 'drueber'; s.dealer.push(s._loch); s._loch = null; c.sperre(0.6); c.zahlen(0, { nach:0.6, text:'Blackjack: über 21' }); return; }
        return this.aufdecken(s, c, 0.5);
      }
      return 'Unbekannt';
    },
    aufdecken(s, c, schon) {
      s.dealer.push(s._loch); s._loch = null;
      let t = schon + 0.6;
      const spielerBJ = istBJ(s.hand), dealerBJ = istBJ(s.dealer);
      if (!spielerBJ && !dealerBJ) while (bjWert(s.dealer) < 17) { s.dealer.push(this.ziehen(s, c)); t += 0.6; }
      const p = bjWert(s.hand), d = bjWert(s.dealer), E = c.einsatzJetzt();
      let brutto, erg;
      if (spielerBJ && !dealerBJ) { brutto = E * 2.5; erg = 'blackjack'; }
      else if (dealerBJ && !spielerBJ) { brutto = 0; erg = 'dealerbj'; }
      else if (d > 21 || p > d) { brutto = E * 2; erg = 'sieg'; }
      else if (p === d) { brutto = E; erg = 'gleich'; }
      else { brutto = 0; erg = 'niederlage'; }
      s.phase = 'fertig'; s.ergebnis = erg;
      c.sperre(t);
      c.zahlen(brutto, { nach:t, faktor:rund2(brutto / E), text:'Blackjack', melde:erg === 'blackjack' ? ['blackjack'] : null });
    },
    ende(s, c) { if (s.phase === 'zug') this.aufdecken(s, c, 0); },
    sicht(s, brille) { const v = offen(s); if (brille) { v.loch = s._loch; v.naechste = s._naechste; } return v; }
  };

  /* ---------- Einarmiger Bandit ---------- */
  const SLOT_SYM = ['🍒', '🍋', '🔔', '🍀', '💎', '7️⃣', '🦈'];
  const SLOT_W = [7, 6, 5, 4, 3, 2, 1];
  const SLOT_DREI = [8, 10, 15, 25, 50, 150, 400];
  const SLOT_ZWEI = [1.5, 2, 2.5, 4, 6, 12, 30];
  function slotSymbol(c) { let r = c.rng() * 28; for (let i = 0; i < 7; i++) { r -= SLOT_W[i]; if (r < 0) return i; } return 0; }
  function slotFaktor(w) { return w[0] === w[1] && w[1] === w[2] ? SLOT_DREI[w[0]] : w[0] === w[1] ? SLOT_ZWEI[w[0]] : 0; }
  G.slots = {
    name:'Bandit', icon:'🎰', plaetze:1, faktor:0.08, ab:0,
    info:'Drei gleiche zahlen groß (bis 400-fach für drei Haie), zwei gleiche links zahlen klein.',
    neu:() => ({ phase:'bereit', walzen:[0, 1, 2] }),
    aktion(s, b, c) {
      if (b.a !== 'setzen') return 'Unbekannt';
      if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
      s.walzen = [slotSymbol(c), slotSymbol(c), slotSymbol(c)];
      s.nr = (s.nr || 0) + 1;
      const f = slotFaktor(s.walzen), E = c.einsatzJetzt();
      c.sperre(1.7);
      c.zahlen(E * f, { nach:1.7, faktor:f, text:'Bandit ' + s.walzen.map(i => SLOT_SYM[i]).join(''), slots:true,
        melde:s.walzen[0] === s.walzen[1] && s.walzen[1] === s.walzen[2] ? ['slotsDrei'] : null });
    }
  };

  /* ---------- Hi-Lo: höher oder niedriger, Multiplikator wächst ---------- */
  G.hilo = {
    name:'Hi-Lo', icon:'🔼', plaetze:2, faktor:0.25, ab:0,
    info:'Kommt die nächste Karte höher (oder gleich) oder niedriger (oder gleich)? Jeder Treffer erhöht den Multiplikator. Kassiere, bevor du danebenliegst.',
    neu:() => ({ phase:'bereit', karte:null, mult:1, verlauf:[], treffer:0, _naechste:null }),
    chancen(r) { return { hoeher:r === 12 ? 1 / 13 : (13 - r) / 13, tiefer:r === 0 ? 1 / 13 : (r + 1) / 13 }; },
    aktion(s, b, c) {
      if (b.a === 'setzen') {
        if (s.phase === 'laeuft') return 'Runde läuft';
        if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
        s.karte = karte(c); s._naechste = karte(c); s.mult = 1; s.roh = 1; s.verlauf = []; s.treffer = 0; s.phase = 'laeuft'; s.nr = (s.nr || 0) + 1;
        c.sperre(0.6);
        return;
      }
      if (s.phase !== 'laeuft') return 'Keine Runde';
      if (b.a === 'kassieren') {
        if (!s.treffer) { c.zahlen(c.einsatzJetzt(), { text:'Hi-Lo zurück' }); s.phase = 'bereit'; return; }
        c.zahlen(c.einsatzJetzt() * s.mult, { faktor:s.mult, text:`Hi-Lo ${s.treffer} Treffer` });
        s.phase = 'bereit';
        return;
      }
      if (b.a === 'skip') {
        if ((s.skips || 0) >= 50) return 'Genug übersprungen';
        s.skips = (s.skips || 0) + 1;
        s.verlauf.push({ k:s.karte, w:'skip' }); s.karte = s._naechste; s._naechste = karte(c);
        c.sperre(0.45);
        return;
      }
      if (b.a !== 'hoeher' && b.a !== 'tiefer') return 'Unbekannt';
      const r = rang(s.karte), neu = s._naechste, rn = rang(neu);
      const p = this.chancen(r)[b.a];
      const ok = b.a === 'hoeher' ? (r === 12 ? rn === 12 : rn >= r) : (r === 0 ? rn === 0 : rn <= r);
      s.verlauf.push({ k:s.karte, w:b.a, ok });
      if (s.verlauf.length > 14) s.verlauf.shift();
      s.karte = neu; s._naechste = karte(c);
      c.sperre(0.55);
      if (!ok) { s.phase = 'bereit'; c.zahlen(0, { nach:0.55, text:'Hi-Lo' }); return; }
      s.treffer++; s.roh *= 1 / p;
      s.mult = Math.min(1000, rund2(KANTE * s.roh));
      c.melde('hiloSerie', s.treffer);
    },
    ende(s, c) { if (s.phase === 'laeuft') this.aktion(s, { a:'kassieren' }, c); },
    sicht(s, brille) { const v = offen(s); if (brille) v.naechste = s._naechste; return v; }
  };

  /* ---------- Plinko: 12 Reihen, drei Risikostufen ---------- */
  const PLINKO = [
    [9, 3, 1.6, 1.3, 1.1, 1, 0.5, 1, 1.1, 1.3, 1.6, 3, 9],
    [30, 10, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 10, 30],
    [150, 24, 8, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8, 24, 150]
  ];
  G.plinko = {
    name:'Plinko', icon:'🔻', plaetze:2, faktor:0.1, ab:1,
    info:'Lass Kugeln durch die Stifte fallen. Am Rand warten bis zu 150-fach, in der Mitte wenig. Mehr Risiko = größere Ränder.',
    neu:() => ({ phase:'bereit', baelle:[], risiko:1 }),
    aktion(s, b, c) {
      if (b.a !== 'setzen') return 'Unbekannt';
      const risiko = [0, 1, 2].includes(b.risiko) ? b.risiko : 1;
      if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
      const pfad = []; let fach = 0;
      for (let i = 0; i < 12; i++) { const r = c.rng() < 0.5 ? 0 : 1; pfad.push(r); fach += r; }
      const f = PLINKO[risiko][fach];
      s.risiko = risiko;
      s.nr = (s.nr || 0) + 1;
      s.baelle.push({ nr:s.nr, pfad:pfad.join(''), fach, f, risiko });
      if (s.baelle.length > 12) s.baelle.shift();
      c.sperre(0.35);
      c.zahlen(c.einsatzJetzt() * f, { nach:2.6, faktor:f, text:'Plinko', melde:fach === 0 || fach === 12 ? ['plinkoRand'] : null });
    }
  };

  /* ---------- Drachenturm: Stufe für Stufe hoch, ein falsches Feld weckt den Drachen ---------- */
  const TURM = [{ n:'Leicht', felder:4, drachen:1 }, { n:'Mittel', felder:3, drachen:1 }, { n:'Schwer', felder:2, drachen:1 }, { n:'Wahnsinn', felder:3, drachen:2 }];
  const TURM_HOCH = 9;
  G.turm = {
    name:'Drachenturm', icon:'🐉', plaetze:2, faktor:0.15, ab:2,
    info:'Wähle auf jeder der 9 Stufen ein Feld. Hinter manchen schläft ein Drache. Jede Stufe erhöht den Multiplikator – kassiere rechtzeitig.',
    neu:() => ({ phase:'bereit', stufe:0, mult:1, art:1, wahl:[], _reihen:null, reihen:null }),
    aktion(s, b, c) {
      if (b.a === 'setzen') {
        if (s.phase === 'laeuft') return 'Runde läuft';
        const art = [0, 1, 2, 3].includes(b.art) ? b.art : 1, T = TURM[art];
        if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
        s.art = art; s.stufe = 0; s.mult = 1; s.wahl = []; s.reihen = null; s.phase = 'laeuft'; s.nr = (s.nr || 0) + 1;
        s._reihen = Array.from({ length:TURM_HOCH }, () => {
          const r = Array(T.felder).fill(0); let d = 0;
          while (d < T.drachen) { const i = zuf(c, T.felder); if (!r[i]) { r[i] = 1; d++; } }
          return r;
        });
        return;
      }
      if (s.phase !== 'laeuft') return 'Keine Runde';
      const T = TURM[s.art];
      if (b.a === 'kassieren') {
        if (!s.stufe) return 'Erst ein Feld wählen';
        s.phase = 'bereit'; s.reihen = s._reihen;
        c.zahlen(c.einsatzJetzt() * s.mult, { faktor:s.mult, text:`Drachenturm Stufe ${s.stufe}` });
        return;
      }
      if (b.a !== 'waehlen') return 'Unbekannt';
      const i = b.feld | 0; if (i < 0 || i >= T.felder) return 'Feld?';
      s.wahl.push(i);
      c.sperre(0.35);
      if (s._reihen[s.stufe][i]) { s.phase = 'bereit'; s.reihen = s._reihen; c.zahlen(0, { nach:0.4, text:'Drachenturm' }); return; }
      s.stufe++;
      s.mult = Math.min(1000, rund2(KANTE * Math.pow(T.felder / (T.felder - T.drachen), s.stufe)));
      if (s.stufe >= TURM_HOCH) {
        s.phase = 'bereit'; s.reihen = s._reihen;
        c.zahlen(c.einsatzJetzt() * s.mult, { nach:0.4, faktor:s.mult, text:'Drachenturm: ganz oben!', melde:['turmOben'] });
      }
    },
    ende(s, c) { if (s.phase === 'laeuft') { if (s.stufe) this.aktion(s, { a:'kassieren' }, c); else { s.phase = 'bereit'; c.zahlen(c.einsatzJetzt(), { text:'Drachenturm zurück' }); } } },
    sicht(s, brille) {
      const v = offen(s);
      if (brille && s.phase === 'laeuft' && s._reihen) { const r = s._reihen[s.stufe]; v.tipp = r.findIndex(x => !x); }
      return v;
    }
  };

  /* ---------- Minenfeld: 5×5, selbst gewählte Minenzahl ---------- */
  G.minen = {
    name:'Minenfeld', icon:'💣', plaetze:2, faktor:0.15, ab:1,
    info:'Decke Felder auf, ohne eine Mine zu erwischen. Je mehr Minen und Felder, desto höher der Multiplikator.',
    neu:() => ({ phase:'bereit', minenZahl:3, offen:[], mult:1, _minen:null, minen:null }),
    multi(m, k) { return k ? Math.min(1000, rund2(KANTE * binom(25, k) / binom(25 - m, k))) : 1; },
    aktion(s, b, c) {
      if (b.a === 'setzen') {
        if (s.phase === 'laeuft') return 'Runde läuft';
        const m = Math.max(1, Math.min(24, b.minen | 0 || 3));
        if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
        s.minenZahl = m; s.offen = []; s.mult = 1; s.minen = null; s.boom = null; s.phase = 'laeuft'; s.nr = (s.nr || 0) + 1;
        s._minen = mischen(c, Array.from({ length:25 }, (_, i) => i)).slice(0, m).sort((a, b) => a - b);
        return;
      }
      if (s.phase !== 'laeuft') return 'Keine Runde';
      if (b.a === 'kassieren') {
        if (!s.offen.length) return 'Erst ein Feld aufdecken';
        s.phase = 'bereit'; s.minen = s._minen;
        c.zahlen(c.einsatzJetzt() * s.mult, { faktor:s.mult, text:`Minenfeld ${s.offen.length} Felder` });
        return;
      }
      if (b.a !== 'aufdecken') return 'Unbekannt';
      const i = b.feld | 0; if (i < 0 || i > 24 || s.offen.includes(i)) return 'Feld?';
      s.offen.push(i);
      c.sperre(0.25);
      if (s._minen.includes(i)) { s.phase = 'bereit'; s.minen = s._minen; s.boom = i; c.zahlen(0, { nach:0.4, text:'Minenfeld: Bumm' }); return; }
      s.mult = this.multi(s.minenZahl, s.offen.length);
      c.melde('minenFelder', s.offen.length);
      if (s.offen.length >= 25 - s.minenZahl) { s.phase = 'bereit'; s.minen = s._minen; c.zahlen(c.einsatzJetzt() * s.mult, { nach:0.3, faktor:s.mult, text:'Minenfeld leer geräumt' }); }
    },
    ende(s, c) { if (s.phase === 'laeuft') { if (s.offen.length) this.aktion(s, { a:'kassieren' }, c); else { s.phase = 'bereit'; c.zahlen(c.einsatzJetzt(), { text:'Minenfeld zurück' }); } } },
    sicht(s, brille) {
      const v = offen(s);
      if (brille && s.phase === 'laeuft' && s._minen) { for (let i = 0; i < 25; i++) if (!s._minen.includes(i) && !s.offen.includes(i)) { v.tipp = i; break; } }
      return v;
    }
  };

  /* ---------- Straßenwürfel (vereinfachtes Craps) ---------- */
  G.wuerfel = {
    name:'Straßenwürfel', icon:'🎲', plaetze:3, faktor:0.35, ab:0,
    info:'Pass: 7 oder 11 beim ersten Wurf gewinnt, 2, 3 oder 12 verliert. Sonst ist die Zahl dein Punkt – würfle ihn erneut vor einer 7. „Dagegen" wettet umgekehrt.',
    neu:() => ({ phase:'bereit', wette:'pass', punkt:null, wurf:null, wuerfe:[] }),
    aktion(s, b, c) {
      const wurf = () => { const a = 1 + zuf(c, 6), d = 1 + zuf(c, 6); s.wurf = [a, d]; s.wuerfe.push(a + d); if (s.wuerfe.length > 12) s.wuerfe.shift(); s.nr = (s.nr || 0) + 1; return a + d; };
      const E = () => c.einsatzJetzt();
      const gewonnen = () => { s.phase = 'bereit'; c.zahlen(E() * 2, { nach:1.2, faktor:2, text:'Straßenwürfel', melde:s.punkt ? ['wuerfelPunkt'] : null }); };
      const verloren = () => { s.phase = 'bereit'; c.zahlen(0, { nach:1.2, text:'Straßenwürfel' }); };
      if (b.a === 'setzen') {
        if (s.phase === 'punkt') return 'Erst weiterwürfeln';
        if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
        s.wette = b.wette === 'dagegen' ? 'dagegen' : 'pass'; s.punkt = null; s.wuerfe = [];
        let w = wurf();
        if (c.hat('gezinkt')) { c.nimm('gezinkt'); const z = s.wette === 'pass' ? [[3, 4], [5, 6], [2, 5]][zuf(c, 3)] : [[1, 1], [1, 2], [2, 1]][zuf(c, 3)]; s.wurf = z; w = z[0] + z[1]; s.wuerfe[s.wuerfe.length - 1] = w; }
        c.sperre(1.2);
        const pass = s.wette === 'pass';
        if (w === 7 || w === 11) return pass ? gewonnen() : verloren();
        if (w === 2 || w === 3) return pass ? verloren() : gewonnen();
        if (w === 12) { if (pass) return verloren(); s.phase = 'bereit'; c.zahlen(E(), { nach:1.2, text:'Straßenwürfel: Unentschieden' }); return; }
        s.punkt = w; s.phase = 'punkt';
        return;
      }
      if (b.a === 'wuerfeln') {
        if (s.phase !== 'punkt') return 'Erst setzen';
        const w = wurf();
        c.sperre(1.2);
        const pass = s.wette === 'pass';
        if (w === s.punkt) return pass ? gewonnen() : verloren();
        if (w === 7) return pass ? verloren() : gewonnen();
        return;
      }
      return 'Unbekannt';
    },
    ende(s, c) { let n = 0; while (s.phase === 'punkt' && n++ < 200) this.aktion(s, { a:'wuerfeln' }, c); }
  };

  /* ---------- Glücksrad: 50 Felder, sieben Symbole ---------- */
  const RAD_SYM = [
    { n:'×2', m:2, z:24, f:'#c98a4b' }, { n:'×4', m:4, z:12, f:'#b9c2cc' }, { n:'×8', m:8, z:6, f:'#e8b923' },
    { n:'×12', m:12, z:4, f:'#4fc3f7' }, { n:'×24', m:24, z:2, f:'#ab47bc' }, { n:'Hai', m:48, z:1, f:'#37474f' }, { n:'Löwe', m:48, z:1, f:'#e65100' }
  ];
  // Feste Verteilung der Felder auf dem Rad, möglichst gleichmäßig
  const RAD_FELDER = (() => {
    const f = Array(50).fill(-1);
    const reihen = [6, 5, 4, 3, 2, 1, 0];
    for (const i of reihen) {
      const n = RAD_SYM[i].z, schritt = 50 / n;
      for (let k = 0; k < n; k++) {
        let p = Math.round(k * schritt + i * 3) % 50;
        while (f[p] !== -1) p = (p + 1) % 50;
        f[p] = i;
      }
    }
    return f;
  })();
  G.rad = {
    name:'Glücksrad', icon:'🎯', plaetze:4, faktor:0.15, ab:1,
    info:'Setz auf ein Symbol. Je seltener es auf dem Rad steht, desto mehr zahlt es – bis zum 48-Fachen für Hai oder Löwe.',
    neu:() => ({ phase:'bereit', feld:null, symbol:0 }),
    aktion(s, b, c) {
      if (b.a !== 'setzen') return 'Unbekannt';
      const sym = b.symbol | 0; if (sym < 0 || sym > 6) return 'Symbol?';
      if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
      let feld = zuf(c, 50);
      if (RAD_FELDER[feld] !== sym && c.hat('magnet') && c.rng() < 0.5) {
        const passend = RAD_FELDER.map((x, i) => x === sym ? i : -1).filter(i => i >= 0);
        feld = passend[zuf(c, passend.length)];
      }
      if (c.hat('magnet')) c.nimm('magnet');
      s.feld = feld; s.symbol = sym; s.nr = (s.nr || 0) + 1;
      const sieg = RAD_FELDER[feld] === sym, S = RAD_SYM[sym];
      c.sperre(4.2);
      c.zahlen(sieg ? c.einsatzJetzt() * S.m : 0, { nach:4.2, faktor:S.m, text:'Glücksrad ' + S.n, melde:sieg && sym >= 5 ? ['radTier'] : null });
    }
  };

  /* ---------- Video-Poker (Jacks or Better 9/6) ---------- */
  const POKER = [
    { n:'Royal Flush', m:800 }, { n:'Straight Flush', m:50 }, { n:'Vierling', m:25 }, { n:'Full House', m:9 }, { n:'Flush', m:6 },
    { n:'Straße', m:4 }, { n:'Drilling', m:3 }, { n:'Zwei Paare', m:2 }, { n:'Paar ab Bube', m:1 }
  ];
  function pokerHand(h) {
    const r = h.map(rang).sort((a, b) => a - b), f = h.map(farbe);
    const flush = f.every(x => x === f[0]);
    const z = {}; for (const x of r) z[x] = (z[x] || 0) + 1;
    const anz = Object.values(z).sort((a, b) => b - a);
    const verschieden = anz.length === 5;
    const strasse = verschieden && (r[4] - r[0] === 4 || (r[4] === 12 && r[0] === 0 && r[3] === 3));
    if (flush && strasse && r[0] === 8) return 0;
    if (flush && strasse) return 1;
    if (anz[0] === 4) return 2;
    if (anz[0] === 3 && anz[1] === 2) return 3;
    if (flush) return 4;
    if (strasse) return 5;
    if (anz[0] === 3) return 6;
    if (anz[0] === 2 && anz[1] === 2) return 7;
    if (anz[0] === 2) { const p = +Object.keys(z).find(k => z[k] === 2); if (p >= 9) return 8; }
    return -1;
  }
  G.poker = {
    name:'Video-Poker', icon:'♠️', plaetze:2, faktor:0.2, ab:1,
    info:'Fünf Karten. Halte die guten, tausche den Rest einmal. Ab einem Paar Buben gibt es Geld, ein Royal Flush zahlt 800-fach.',
    neu:() => ({ phase:'bereit', hand:[], gehalten:[], hand2:null, _deck:null, ergebnis:null }),
    aktion(s, b, c) {
      if (b.a === 'setzen') {
        if (s.phase === 'tauschen') return 'Erst tauschen';
        if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
        s._deck = deck(c); s.hand = s._deck.splice(0, 5); s.gehalten = [false, false, false, false, false]; s.ergebnis = null; s.phase = 'tauschen'; s.nr = (s.nr || 0) + 1;
        s.vorher = pokerHand(s.hand);
        c.sperre(0.8);
        return;
      }
      if (b.a === 'ziehen') {
        if (s.phase !== 'tauschen') return 'Erst geben';
        const halten = Array.isArray(b.halten) ? b.halten.slice(0, 5).map(Boolean) : [false, false, false, false, false];
        s.gehalten = halten;
        s.hand = s.hand.map((k, i) => halten[i] ? k : s._deck.shift());
        const e = pokerHand(s.hand);
        s.ergebnis = e; s.phase = 'bereit'; s.nr++;
        const m = e >= 0 ? POKER[e].m : 0;
        c.sperre(0.9);
        c.zahlen(c.einsatzJetzt() * m, { nach:0.9, faktor:m, text:e >= 0 ? 'Poker: ' + POKER[e].n : 'Video-Poker', melde:e >= 0 && e <= 3 ? ['pokerFull'] : null });
        return;
      }
      return 'Unbekannt';
    },
    ende(s, c) { if (s.phase === 'tauschen') this.aktion(s, { a:'ziehen', halten:s.gehalten }, c); },
    sicht(s, brille) { const v = offen(s); if (brille && s.phase === 'tauschen' && s._deck) v.naechste = s._deck.slice(0, 5); return v; }
  };

  /* ---------- Rubbellos ---------- */
  const LOS = [
    { p:0.15, m:1, s:'🍀' }, { p:0.10, m:2, s:'🍒' }, { p:0.04, m:5, s:'🔔' }, { p:0.008, m:20, s:'💎' }, { p:0.0015, m:100, s:'👑' }, { p:0.0002, m:500, s:'🦈' }
  ];
  function losZiehen(c) {
    let r = c.rng(), gewinn = -1;
    for (let i = 0; i < LOS.length; i++) { r -= LOS[i].p; if (r < 0) { gewinn = i; break; } }
    const felder = [];
    const zaehl = Array(LOS.length).fill(0);
    if (gewinn >= 0) { for (let k = 0; k < 3; k++) felder.push(gewinn); zaehl[gewinn] = 3; }
    while (felder.length < 9) {
      const i = zuf(c, LOS.length);
      if (i === gewinn || zaehl[i] >= 2) continue;
      zaehl[i]++; felder.push(i);
    }
    return { felder:mischen(c, felder), gewinn };
  }
  G.los = {
    name:'Rubbellos', icon:'🎟️', plaetze:3, faktor:0.1, ab:0,
    info:'Kauf ein Los und rubbel es frei. Drei gleiche Symbole gewinnen: 🍀 Einsatz zurück, 🍒 ×2, 🔔 ×5, 💎 ×20, 👑 ×100, 🦈 ×500.',
    neu:() => ({ phase:'bereit', felder:null, gewinn:-1, _naechstes:null }),
    aktion(s, b, c) {
      if (b.a === 'setzen') {
        if (s.phase === 'rubbeln') return 'Erst fertig rubbeln';
        if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
        const l = s._naechstes || losZiehen(c);
        s._naechstes = losZiehen(c);
        s.felder = l.felder; s.gewinn = l.gewinn; s.phase = 'rubbeln'; s.nr = (s.nr || 0) + 1;
        s.bisAuto = c.uhr + 15;
        c.sperre(0.4);
        return;
      }
      if (b.a === 'aufdecken') {
        if (s.phase !== 'rubbeln') return 'Kein Los';
        s.phase = 'bereit';
        const m = s.gewinn >= 0 ? LOS[s.gewinn].m : 0;
        c.zahlen(c.einsatzJetzt() * m, { faktor:m, text:'Rubbellos', melde:m >= 20 ? ['los20'] : null });
        return;
      }
      return 'Unbekannt';
    },
    takt(s, c) { if (s.phase === 'rubbeln' && c.uhr >= s.bisAuto) this.aktion(s, { a:'aufdecken' }, c); },
    ende(s, c) { if (s.phase === 'rubbeln') this.aktion(s, { a:'aufdecken' }, c); },
    sicht(s, brille) { const v = offen(s); if (brille && s._naechstes) v.vorschau = s._naechstes.gewinn >= 0 ? LOS[s._naechstes.gewinn].m : 0; return v; }
  };

  /* ---------- Hütchenspiel: Kugel verfolgen (Geschick!), aber der Typ schummelt manchmal ---------- */
  G.huetchen = {
    name:'Hütchenspiel', icon:'🥤', plaetze:1, faktor:0.1, ab:0,
    info:'Verfolge die Kugel unter den Bechern und tippe auf den richtigen: doppelter Einsatz. Aber Vorsicht – der Typ schummelt, besonders wenn du zu oft gewinnst.',
    neu:() => ({ phase:'bereit', start:0, tausche:[], dauer:0.4, wahl:null, ziel:null, siege:0, _ziel:null, _schummel:false }),
    aktion(s, b, c) {
      if (b.a === 'setzen') {
        if (s.phase === 'mischen') return 'Erst wählen';
        if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
        const n = 7 + c.etage * 3 + zuf(c, 4);
        s.start = zuf(c, 3); s.tausche = [];
        let pos = s.start;
        for (let i = 0; i < n; i++) {
          const a = zuf(c, 3); let d = zuf(c, 2); const bb = [0, 1, 2].filter(x => x !== a)[d];
          s.tausche.push([a, bb]);
          if (pos === a) pos = bb; else if (pos === bb) pos = a;
        }
        s.dauer = Math.max(0.16, 0.42 - c.etage * 0.07);
        s._ziel = pos; s.ziel = null; s.wahl = null; s.phase = 'mischen'; s.nr = (s.nr || 0) + 1;
        s._schummel = c.rng() < (s.siege >= 3 ? 0.35 : 0.1);
        s.zeigen = 1.2;
        c.sperre(s.zeigen + n * s.dauer);
        return;
      }
      if (b.a === 'waehlen') {
        if (s.phase !== 'mischen') return 'Erst setzen';
        const w = b.becher | 0; if (w < 0 || w > 2) return 'Becher?';
        s.wahl = w; s.phase = 'bereit';
        s.ziel = s._schummel ? -1 : s._ziel;
        const sieg = s.ziel === w;
        s.siege = sieg ? s.siege + 1 : 0;
        c.sperre(1);
        c.zahlen(sieg ? c.einsatzJetzt() * 2 : 0, { nach:0.8, faktor:2, text:s._schummel ? 'Hütchenspiel: Beschiss!' : 'Hütchenspiel' });
        if (sieg) c.melde('huetchenSerie', s.siege);
        return;
      }
      return 'Unbekannt';
    },
    ende(s, c) { if (s.phase === 'mischen') { s.phase = 'bereit'; c.zahlen(c.einsatzJetzt(), { text:'Hütchenspiel zurück' }); } },
    sicht(s, brille) { const v = offen(s); if (brille && s.phase === 'mischen') { v.tipp = s._schummel ? -1 : s._ziel; } return v; }
  };

  /* ---------- Baccarat (Punto Banco) ---------- */
  const bacWert = k => { const r = rang(k); return r === 12 ? 1 : r >= 8 ? 0 : r + 2; };
  const bacSumme = h => h.reduce((a, k) => a + bacWert(k), 0) % 10;
  G.baccarat = {
    name:'Baccarat', icon:'🎴', plaetze:4, faktor:0.35, ab:2,
    info:'Setz auf Spieler (×2), Bank (×1,95) oder Unentschieden (×9). Wer näher an 9 ist, gewinnt. Die Karten zieht der Croupier nach festen Regeln.',
    neu:() => ({ phase:'bereit', auf:'spieler', spieler:[], bank:[], sieger:null }),
    aktion(s, b, c) {
      if (b.a !== 'setzen') return 'Unbekannt';
      const auf = ['spieler', 'bank', 'tie'].includes(b.auf) ? b.auf : null;
      if (!auf) return 'Worauf?';
      if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
      const P = [karte(c), karte(c)], B = [karte(c), karte(c)];
      const p2 = bacSumme(P), b2 = bacSumme(B);
      if (p2 < 8 && b2 < 8) {
        let p3 = null;
        if (p2 <= 5) { p3 = karte(c); P.push(p3); }
        const bs = bacSumme(B);
        if (p3 == null) { if (bs <= 5) B.push(karte(c)); }
        else {
          const v = bacWert(p3);
          if (bs <= 2 || (bs === 3 && v !== 8) || (bs === 4 && v >= 2 && v <= 7) || (bs === 5 && v >= 4 && v <= 7) || (bs === 6 && v >= 6 && v <= 7)) B.push(karte(c));
        }
      }
      const ps = bacSumme(P), bsum = bacSumme(B);
      const sieger = ps > bsum ? 'spieler' : bsum > ps ? 'bank' : 'tie';
      s.spieler = P; s.bank = B; s.sieger = sieger; s.auf = auf; s.nr = (s.nr || 0) + 1;
      const E = c.einsatzJetzt();
      let brutto = 0;
      if (sieger === 'tie') brutto = auf === 'tie' ? E * 9 : E;
      else if (sieger === auf) brutto = auf === 'bank' ? E * 1.95 : E * 2;
      const t = 1.2 + (P.length + B.length) * 0.45;
      c.sperre(t);
      c.zahlen(brutto, { nach:t, faktor:auf === 'tie' ? 9 : auf === 'bank' ? 1.95 : 2, text:'Baccarat', melde:sieger === 'tie' && auf === 'tie' ? ['bacTie'] : null });
    }
  };

  /* ---------- Keno: 40 Zahlen, 10 werden gezogen ---------- */
  const KENO = {
    1:[0, 3.8], 2:[0, 1.4, 7.5], 3:[0, 1, 2.2, 18], 4:[0, 0.5, 1.8, 6, 50], 5:[0, 0, 1.4, 4, 18, 200],
    6:[0, 0, 1, 2.5, 8, 60, 500], 7:[0, 0, 0.5, 2, 5, 25, 150, 1000], 8:[0, 0, 0, 2, 4, 10, 60, 400, 2000],
    9:[0, 0, 0, 1.5, 3, 6, 25, 150, 1000, 5000], 10:[0, 0, 0, 1.3, 2, 4, 12, 60, 400, 2000, 10000]
  };
  G.keno = {
    name:'Keno', icon:'🔢', plaetze:3, faktor:0.06, ab:2,
    info:'Kreuze 1 bis 10 Zahlen von 40 an. Zehn Kugeln werden gezogen. Je mehr Treffer, desto mehr Geld – bis zum 10.000-Fachen.',
    neu:() => ({ phase:'bereit', zahlen:[], gezogen:[], treffer:0 }),
    aktion(s, b, c) {
      if (b.a !== 'setzen') return 'Unbekannt';
      const zahlen = [...new Set((Array.isArray(b.zahlen) ? b.zahlen : []).map(x => x | 0).filter(x => x >= 1 && x <= 40))].slice(0, 10);
      if (!zahlen.length) return 'Kreuze Zahlen an';
      if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
      const gezogen = mischen(c, Array.from({ length:40 }, (_, i) => i + 1)).slice(0, 10);
      const t = zahlen.filter(z => gezogen.includes(z)).length;
      s.zahlen = zahlen; s.gezogen = gezogen; s.treffer = t; s.nr = (s.nr || 0) + 1;
      const m = KENO[zahlen.length][t] || 0;
      c.sperre(3.2);
      c.zahlen(c.einsatzJetzt() * m, { nach:3.2, faktor:m, text:`Keno ${t}/${zahlen.length}`, melde:t >= 5 ? ['keno5'] : null });
    }
  };

  /* ================= Rundenspiele (gemeinsam am Tisch) ================= */

  /* ---------- Entenrennen ---------- */
  const ENTEN = [
    { n:'Quaki', f:'#f6d743' }, { n:'Flosse', f:'#ff8a65' }, { n:'Watschel', f:'#81c784' },
    { n:'Gustav', f:'#64b5f6' }, { n:'Daisy', f:'#f48fb1' }, { n:'Rambo', f:'#9575cd' }
  ];
  const ENTE_P = [0.34, 0.24, 0.17, 0.12, 0.08, 0.05];
  const ENTEN_WETTEN = 12, ENTEN_RENNEN = 9, ENTEN_PAUSE = 4;
  // Verlauf eines Rennens: je Ente 10 Etappen-Tempi; der Sieger kommt sicher zuerst an. Browser animieren damit.
  function entenVerlauf(seed, sieger) {
    let st = seed >>> 0;
    const r = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const tempi = ENTEN.map(() => Array.from({ length:10 }, () => 0.6 + r() * 0.8));
    const summe = t => t.reduce((a, b) => a + b, 0);
    // Alle Verlierer langsamer als der Sieger machen
    const s = summe(tempi[sieger]);
    tempi.forEach((t, i) => { if (i === sieger) return; const z = summe(t), ziel = s * (0.86 + r() * 0.12); if (z > ziel) for (let k = 0; k < 10; k++) t[k] *= ziel / z; });
    // Spannung: der Sieger liegt in der ersten Hälfte nicht vorne
    const t = tempi[sieger]; for (let k = 0; k < 5; k++) t[k] *= 0.85; const fehl = s - summe(t); for (let k = 5; k < 10; k++) t[k] += fehl / 5;
    return tempi;
  }
  // Position (0..1) einer Ente zur Zeit f (0..1 des Rennens)
  function entePos(tempi, i, f) {
    const t = tempi[i], max = Math.max(...tempi.map(x => x.reduce((a, b) => a + b, 0)));
    const e = Math.min(10, Math.max(0, f * 10)), k = Math.min(9, Math.floor(e));
    let w = 0; for (let j = 0; j < k; j++) w += t[j];
    w += t[k] * (e - k);
    return Math.min(1, w / max);
  }
  G.enten = {
    name:'Entenrennen', icon:'🦆', plaetze:6, faktor:0.2, ab:2, runde:true,
    info:'Setz in der Wettphase auf eine Ente. Favoriten zahlen wenig, Außenseiter viel. Alle am Tisch schauen dasselbe Rennen.',
    neuRunde(c, uhr) {
      const p = ENTE_P.map(x => x * (0.85 + c.rng() * 0.3));
      const summe = p.reduce((a, b) => a + b, 0);
      const verteilt = mischen(c, p.map(x => x / summe));
      const quoten = verteilt.map(x => Math.max(1.2, Math.round(0.95 / x * 10) / 10));
      let r = c.rng(), sieger = 5;
      for (let i = 0; i < 6; i++) { r -= verteilt[i]; if (r < 0) { sieger = i; break; } }
      return { phase:'wetten', bis:uhr + ENTEN_WETTEN, quoten, _sieger:sieger, sieger:null, seed:(c.rng() * 4294967296) >>> 0, wetten:{}, nr:0, verraten:false };
    },
    takt(r, uhr, kontextFuer, neu) {
      if (uhr < r.bis) return r;
      if (r.phase === 'wetten') {
        if (!Object.keys(r.wetten).length) { r.bis = uhr + ENTEN_WETTEN; return r; }   // niemand wettet: einfach weiter warten
        r.phase = 'rennen'; r.bis = uhr + ENTEN_RENNEN; r.sieger = r._sieger; r.start = uhr; return r;
      }
      if (r.phase === 'rennen') {
        for (const id in r.wetten) {
          const w = r.wetten[id], c = kontextFuer(id, w);
          if (!c) continue;
          const sieg = w.ente === r.sieger;
          c.zahlen(sieg ? w.einsatz * r.quoten[w.ente] : 0, { faktor:r.quoten[w.ente], text:'Entenrennen: ' + ENTEN[w.ente].n, melde:sieg && r.quoten[w.ente] >= 10 ? ['enteAussen'] : null });
        }
        r.phase = 'pause'; r.bis = uhr + ENTEN_PAUSE; return r;
      }
      const n = neu(); n.nr = (r.nr || 0) + 1; return n;
    },
    aktion(r, id, b, c) {
      if (b.a !== 'setzen') return 'Unbekannt';
      if (r.phase !== 'wetten') return 'Wetten geschlossen';
      if (r.wetten[id]) return 'Du hast schon gewettet';
      const e = b.ente | 0; if (e < 0 || e > 5) return 'Ente?';
      if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
      r.wetten[id] = { ente:e, einsatz:c.einsatzJetzt(), bindung:c.bindung() };
      if (c.hat('kugel')) { c.nimm('kugel'); r.verraten = true; }
    },
    ende(r, uhr, kontextFuer) {
      // Tagesende: offene Wetten zurückgeben
      if (r.phase === 'wetten' || r.phase === 'rennen') {
        for (const id in r.wetten) { const w = r.wetten[id], c = kontextFuer(id, w); if (c) c.zahlen(w.einsatz, { text:'Entenrennen abgesagt' }); }
        r.wetten = {}; r.phase = 'pause';
      }
    },
    sicht(r) { const v = offen(r); if (r.verraten) v.sieger = r._sieger; v.wetten = r.wetten && Object.fromEntries(Object.entries(r.wetten).map(([k, w]) => [k, { ente:w.ente, einsatz:w.einsatz }])); return v; }
  };

  /* ---------- Rakete (Crash): Multiplikator steigt, bis die Rakete platzt ---------- */
  const RAKETE_WETTEN = 8, RAKETE_PAUSE = 3, RAKETE_MAX = 100;
  const raketeMult = t => Math.max(1, Math.floor(100 * Math.exp(0.11 * t)) / 100);
  const raketeZeit = m => Math.log(m) / 0.11;
  G.rakete = {
    name:'Rakete', icon:'🚀', plaetze:6, faktor:0.2, ab:1, runde:true,
    info:'Setz vor dem Start. Der Multiplikator steigt, solange die Rakete fliegt – steig aus, bevor sie platzt! Du kannst auch ein automatisches Ziel festlegen.',
    neuRunde(c, uhr) {
      const u = c.rng();
      const crash = Math.min(RAKETE_MAX, Math.max(1, Math.floor(100 * KANTE / (1 - u)) / 100));
      return { phase:'wetten', bis:uhr + RAKETE_WETTEN, _crash:crash, crash:null, wetten:{}, start:0, nr:0, verraten:false };
    },
    takt(r, uhr, kontextFuer, neu) {
      if (r.phase === 'wetten') {
        if (uhr < r.bis) return r;
        if (!Object.keys(r.wetten).length) { r.bis = uhr + RAKETE_WETTEN; return r; }
        r.phase = 'flug'; r.start = uhr; r.bis = uhr + raketeZeit(r._crash);
        if (r._crash <= 1) r.bis = uhr;
        return r;
      }
      if (r.phase === 'flug') {
        const m = Math.min(r._crash, raketeMult(uhr - r.start));
        for (const id in r.wetten) {
          const w = r.wetten[id];
          if (w.raus == null && w.auto && w.auto <= m && w.auto <= r._crash) this.raus(r, id, w.auto, kontextFuer);
        }
        if (uhr >= r.bis) {
          r.phase = 'crash'; r.crash = r._crash; r.m = r._crash;
          for (const id in r.wetten) { const w = r.wetten[id]; if (w.raus == null) { const c = kontextFuer(id, w); if (c) c.zahlen(0, { text:`Rakete geplatzt bei ×${r._crash}` }); w.raus = 0; } }
          r.bis = uhr + RAKETE_PAUSE;
        }
        return r;
      }
      if (uhr < r.bis) return r;
      const n = neu(); n.nr = (r.nr || 0) + 1; return n;
    },
    raus(r, id, m, kontextFuer) {
      const w = r.wetten[id]; if (!w || w.raus != null) return;
      w.raus = m;
      const c = kontextFuer(id, w);
      if (c) c.zahlen(w.einsatz * m, { faktor:m, text:`Rakete ×${m}`, melde:m >= 5 ? ['rakete5'] : null });
    },
    aktion(r, id, b, c, uhr, kontextFuer) {
      if (b.a === 'setzen') {
        if (r.phase !== 'wetten') return 'Warte auf die nächste Runde';
        if (r.wetten[id]) return 'Du hast schon gesetzt';
        if (!c.setzen(b.einsatz)) return 'Einsatz geht nicht';
        const auto = Number(b.auto) >= 1.01 ? Math.min(RAKETE_MAX, Math.round(Number(b.auto) * 100) / 100) : null;
        r.wetten[id] = { einsatz:c.einsatzJetzt(), auto, raus:null, bindung:c.bindung() };
        if (c.hat('kugel')) { c.nimm('kugel'); r.verraten = true; }
        return;
      }
      if (b.a === 'raus') {
        if (r.phase !== 'flug') return 'Rakete fliegt nicht';
        const w = r.wetten[id]; if (!w || w.raus != null) return 'Keine Wette';
        const m = Math.min(r._crash, raketeMult(uhr - r.start));
        if (m >= r._crash && uhr >= r.bis) return 'Zu spät';
        this.raus(r, id, m, kontextFuer);
        return;
      }
      return 'Unbekannt';
    },
    ende(r, uhr, kontextFuer) {
      if (r.phase === 'wetten') { for (const id in r.wetten) { const w = r.wetten[id], c = kontextFuer(id, w); if (c) c.zahlen(w.einsatz, { text:'Rakete abgesagt' }); } r.wetten = {}; }
      else if (r.phase === 'flug') { const m = Math.min(r._crash, raketeMult(uhr - r.start)); for (const id in r.wetten) this.raus(r, id, m, kontextFuer); }
      r.phase = 'crash';
    },
    sicht(r) { const v = offen(r); if (r.verraten) v.crashTipp = r._crash; v.wetten = Object.fromEntries(Object.entries(r.wetten).map(([k, w]) => [k, { einsatz:w.einsatz, auto:w.auto, raus:w.raus }])); return v; }
  };

  // Öffentliche Sicht: alles außer geheimen Feldern (_…)
  function offen(s) { const v = {}; for (const k in s) if (k[0] !== '_') v[k] = s[k]; return v; }
  for (const k in G) { G[k].id = k; if (!G[k].sicht) G[k].sicht = offen; }

  return {
    G, KANTE, ROT, KESSEL, R_WAHL, SLOT_SYM, SLOT_W, SLOT_DREI, SLOT_ZWEI, PLINKO, TURM, TURM_HOCH, RAD_SYM, RAD_FELDER, POKER, LOS, KENO,
    ENTEN, ENTEN_WETTEN, ENTEN_RENNEN, ENTEN_PAUSE, RAKETE_WETTEN, RAKETE_MAX,
    bjWert, pokerHand, slotFaktor, bacSumme, rang, farbe, entenVerlauf, entePos, raketeMult, raketeZeit, binom
  };
});

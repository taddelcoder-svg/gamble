/* Kredithai – der Lauf: gemeinsames Konto, Tagesrate an Don Flosse, Etagen, Tische, Items, Pfandhaus,
   Herausforderungen und die drei Enden. Rein und deterministisch (Seed), läuft im Browser (Solo) und auf dem
   Server (online). Takt: 10 pro Sekunde. Browser schicken Befehle über aktion(), holen den Zustand mit zustand()
   und Ereignisse mit nimmEreignisse(). Positionen der Figuren meldet der Browser selbst (position()). */
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik(require('./spiele.js'));
  else wurzel.KHLogik = fabrik(wurzel.KHSpiele);
})(typeof self !== 'undefined' ? self : this, function (S) {
  'use strict';
  const G = S.G;
  const TAKT = 10, DT = 1 / TAKT;

  /* ---------- Zahlen ---------- */
  const QUOTE_BASIS = 1000, WACHSTUM = 1.75;
  const JETONS = 0.65, JETONS_TAG1 = 0.8;   // jeden Morgen gibt Don Flosse Jetons auf Pump (Anteil der Tagesrate)
  const PFANDWERT = 0.15, AUFGABE_GELD = 0.2, AUFGABE_TICKETS = 2;
  const START_TICKETS = 4, MAHNUNGEN_MAX = 3, LADEN_ZEIT = 75, ABRECHNUNG_ZEIT = 9, FINALE_ZEIT = 30;
  const MAX_SPIELER = 6, SLOTS = 3;

  // Zwei signifikante Stellen: 1234 -> 1200, 56789 -> 57000
  function nett(x) {
    if (x < 100) return Math.max(1, Math.round(x));
    const p = Math.pow(10, Math.floor(Math.log10(x)) - 1);
    return Math.round(x / p) * p;
  }

  /* ---------- Raum: Positionen (Meter). Der Browser baut daraus die 3D-Welt. ---------- */
  const RAUM = { x:17, z:12 };                     // Raum geht von -x..x, -z..z
  const SPAWN = { x:0, z:-9.5 };
  const PFANDHAUS = { x:-14.6, z:-9.4 };
  const PLAETZE = [];
  for (const z of [-4.5, 1.8, 8]) for (const x of [-11.5, -4, 4, 11.5]) PLAETZE.push({ x, z });
  const TISCH_RADIUS = 1.6, SITZ_ABSTAND = 4.2;

  const ETAGEN = [
    { id:'spelunke', name:'Die Spelunke', tische:9 },
    { id:'neon', name:'Neon-Palast', tische:10 },
    { id:'koralle', name:'Korallen-Lounge', tische:11 },
    { id:'penthouse', name:'Goldenes Penthouse', tische:12 }
  ];

  /* ---------- Items ---------- */
  const ITEMS = {
    goldchip:{ n:'Goldener Chip', icon:'🪙', preis:3, w:3, t:'Dein nächster Einsatz darf doppelt so hoch wie das Limit sein – und verlierst du, gibt es ihn zurück.' },
    bestechung:{ n:'Schmiergeld', icon:'💵', preis:3, w:3, t:'60 Sekunden lang sind deine Tischlimits dreimal so hoch.' },
    statue:{ n:'Glücksstatue', icon:'🗿', preis:5, w:2, t:'Stell sie ab: 20 Sekunden lang verliert niemand in 5 m Umkreis Geld.' },
    drink:{ n:'Hai-Ball', icon:'🍹', preis:2, w:4, t:'45 Sekunden lang +50 % auf jeden Gewinn. Die Welt schwankt ein bisschen.' },
    versicherung:{ n:'Versicherung', icon:'📄', preis:2, w:4, t:'Deine nächsten 5 Verluste kosten nur die Hälfte.' },
    sanduhr:{ n:'Sanduhr', icon:'⏳', preis:3, w:3, t:'+45 Sekunden Zeit für den ganzen Tag.' },
    brille:{ n:'Röntgenbrille', icon:'🕶️', preis:3, w:3, t:'60 Sekunden: Du siehst die verdeckte Dealer-Karte, die nächste Hi-Lo-Karte, die Kugel unterm Becher, ein sicheres Feld bei Minen und Turm und ob das nächste Los gewinnt.' },
    katze:{ n:'Winkekatze', icon:'🐱', preis:4, w:3, t:'Deine nächsten 3 Gewinne zählen doppelt.' },
    engel:{ n:'Engelswalze', icon:'😇', preis:2, w:3, t:'Bandit: Deine nächsten 8 Drehungen verlieren nie – mindestens der Einsatz kommt zurück.' },
    teufel:{ n:'Teufelswalze', icon:'😈', preis:2, w:3, t:'Bandit: Die nächsten 3 Drehungen zahlen vierfach – aber ein Verlust kostet doppelt.' },
    gezinkt:{ n:'Gezinkte Würfel', icon:'🎲', preis:3, w:2, t:'Straßenwürfel: Deine nächsten 3 ersten Würfe gewinnen sofort.' },
    magnet:{ n:'Magnet', icon:'🧲', preis:3, w:3, t:'Roulette und Glücksrad: Bei den nächsten 3 Drehungen springt die Kugel mit 50 % auf dein Feld.' },
    ratte:{ n:'Ratto die Ratte', icon:'🐀', preis:2, w:3, t:'Ratto schleicht in den Tresor: +20 % der Tagesrate. Wird er erwischt (25 %), kostet es 10 %.' },
    keks:{ n:'Glückskeks', icon:'🥠', preis:3, w:3, t:'Ein zufälliger Tisch wird 60 Sekunden lang heiß: +50 % auf alle Gewinne dort, für alle.' },
    kugel:{ n:'Kristallkugel', icon:'🔮', preis:4, w:2, t:'Bei deiner nächsten Wette beim Entenrennen oder der Rakete seht ihr alle vorher, wie es ausgeht.' },
    espresso:{ n:'Doppelter Espresso', icon:'☕', preis:1, w:4, t:'60 Sekunden: schneller laufen und schneller spielen.' }
  };
  const ITEM_EFFEKT = {
    goldchip:{ n:1 }, bestechung:{ s:60 }, drink:{ s:45 }, versicherung:{ n:5 }, brille:{ s:60 }, katze:{ n:3 },
    engel:{ n:8 }, teufel:{ n:3 }, gezinkt:{ n:3 }, magnet:{ n:3 }, kugel:{ n:1 }, espresso:{ s:60 }
  };

  /* ---------- Pfandhaus: Frau Elster nimmt eure Sachen ---------- */
  const PFAND = {
    schuhe:{ n:'Schuhe', icon:'👞', t:'Ohne Schuhe läufst du nur noch halb so schnell.' },
    brille:{ n:'Sonnenbrille', icon:'😎', t:'Ohne Brille siehst du alles verschwommen.' },
    uhr:{ n:'Goldene Uhr', icon:'⌚', t:'Ohne Uhr siehst du nicht mehr, wie viel Zeit bleibt.' },
    hose:{ n:'Hose', icon:'👖', t:'In Unterhose nehmen dich die Croupiers nicht ernst: Tischlimits −25 %.' }
  };
  const AUSLOESEN = 2;

  /* ---------- Herausforderungen ---------- */
  const AUFGABEN = [
    { art:'muenzserie', ziel:4, spiel:'muenze', t:'Gewinnt 4 Münzwürfe hintereinander' },
    { art:'rouletteZahl', spiel:'roulette', t:'Trefft beim Roulette eine einzelne Zahl' },
    { art:'blackjack', spiel:'blackjack', t:'Bekommt einen Blackjack' },
    { art:'bjFuenf', spiel:'blackjack', t:'Blackjack: 5 Karten ohne über 21' },
    { art:'slotsDrei', spiel:'slots', t:'Drei gleiche Symbole am Banditen' },
    { art:'hiloSerie', ziel:5, spiel:'hilo', t:'Hi-Lo: 5 richtige Tipps in einer Runde' },
    { art:'huetchenSerie', ziel:3, spiel:'huetchen', t:'Hütchenspiel: 3-mal hintereinander richtig' },
    { art:'wuerfelPunkt', spiel:'wuerfel', t:'Straßenwürfel: Gewinnt mit einem Punkt' },
    { art:'los20', spiel:'los', t:'Rubbellos mit mindestens ×20' },
    { art:'plinkoRand', spiel:'plinko', t:'Plinko: eine Kugel ganz am Rand' },
    { art:'minenFelder', ziel:8, spiel:'minen', t:'Minenfeld: 8 sichere Felder in einer Runde' },
    { art:'radTier', spiel:'rad', t:'Glücksrad: Hai oder Löwe gewinnt' },
    { art:'pokerFull', spiel:'poker', t:'Video-Poker: Full House oder besser' },
    { art:'rakete5', spiel:'rakete', t:'Rakete: Steigt bei ×5 oder mehr aus' },
    { art:'turmOben', spiel:'turm', t:'Drachenturm: Erreicht die Spitze' },
    { art:'bacTie', spiel:'baccarat', t:'Baccarat: Gewinnt auf Unentschieden' },
    { art:'keno5', spiel:'keno', t:'Keno: mindestens 5 Treffer' },
    { art:'enteAussen', spiel:'enten', t:'Entenrennen: Ein Außenseiter (Quote ≥ 10) gewinnt' },
    { art:'grosserGewinn', t:'Ein einzelner Gewinn über die halbe Tagesrate' },
    { art:'tische', ziel:6, t:'Spielt an 6 verschiedenen Tischen' }
  ];

  /* ---------- Zufall (mulberry32) ---------- */
  function zufall(seed) {
    let s = seed >>> 0;
    const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.zustand = () => s; f.setzen = x => { s = x >>> 0; };
    return f;
  }

  const ARTEN = Object.keys(G);
  const TIERE = ['loewe', 'pinguin', 'fuchs', 'waschbaer', 'baer', 'hase', 'affe'];

  class Spiel {
    constructor(o = {}) {
      this.rng = zufall(o.seed != null ? o.seed : (Math.random() * 4294967296) >>> 0);
      this.laenge = o.laenge === 'kurz' ? 'kurz' : 'normal';
      this.tageProEtage = this.laenge === 'kurz' ? 2 : 3;
      this.tage = this.tageProEtage * 4;
      this.tagDauer = [180, 300, 420].includes(o.tagDauer) ? o.tagDauer : 300;
      this.uhr = 0; this.version = 1;
      this.spieler = new Map();
      this.ereignisse = [];
      this.faellig = [];         // geplante Gutschriften (nach der Animation)
      this.log = [];
      this.tag = 1; this.etage = 0;
      this.bank = 0;
      this.tickets = START_TICKETS;
      this.mahnungen = 0; this.versaeumt = 0;
      this.quoten = Array.from({ length:this.tage }, (_, i) => nett(QUOTE_BASIS * Math.pow(WACHSTUM, i)));
      this.schuld = this.quoten.reduce((a, b) => a + b, 0);
      this.quote = this.quoten[0];
      this.zeit = this.tagDauer;
      this.tische = [];
      this.aufgaben = [];
      this.statuen = []; this.heiss = null;
      this.gespielt = new Set();
      this.abrechnung = null; this.finale = null; this.ende = null;
      this.ladenOeffnen(true);
    }

    /* ---------- Spieler ---------- */
    spielerHinzu(id, name, tier) {
      if (this.spieler.has(id)) { const sp = this.spieler.get(id); sp.weg = false; this.geaendert(); return sp; }
      if (this.spieler.size >= MAX_SPIELER) return null;
      const n = this.spieler.size;
      const sp = {
        id, name:String(name || 'Gast').slice(0, 16), tier:TIERE.includes(tier) ? tier : TIERE[n % TIERE.length],
        x:SPAWN.x + (n - 2.5) * 0.9, z:SPAWN.z + 1, r:0, tisch:null, sitzungen:{}, items:Array(SLOTS).fill(null), hand:null,
        pfand:{ schuhe:false, brille:false, uhr:false, hose:false }, eff:{}, bereit:false, feierabend:false, weg:false,
        stats:{ netto:0, plus:0, minus:0, runden:0, groesster:0, schlimmster:0 }
      };
      this.spieler.set(id, sp);
      this.feed(`${sp.name} ist da.`);
      this.geaendert();
      return sp;
    }
    spielerWeg(id) {
      const sp = this.spieler.get(id); if (!sp) return;
      this.aufstehen(sp);
      this.spieler.delete(id);
      this.feed(`${sp.name} ist weg.`);
      this.geaendert();
      this.bereitPruefen();
    }
    // Verbindung kurz weg: zählt nicht bei „alle bereit", steht aber noch im Raum
    abwesend(id, weg) {
      const sp = this.spieler.get(id); if (!sp || sp.weg === !!weg) return;
      sp.weg = !!weg;
      if (weg) this.aufstehen(sp);
      this.geaendert();
      this.bereitPruefen();
    }
    position(id, x, z, r) {
      const sp = this.spieler.get(id); if (!sp) return;
      sp.x = Math.max(-RAUM.x, Math.min(RAUM.x, +x || 0));
      sp.z = Math.max(-RAUM.z, Math.min(RAUM.z, +z || 0));
      sp.r = +r || 0;
    }
    aktive() { return [...this.spieler.values()].filter(s => !s.weg); }

    /* ---------- Hilfen ---------- */
    geaendert() { this.version++; }
    ereignis(e) { this.ereignisse.push(e); }
    nimmEreignisse() { const e = this.ereignisse; this.ereignisse = []; return e; }
    feed(text, art) { this.log.push({ t:text, a:art || '', u:Math.round(this.uhr) }); if (this.log.length > 12) this.log.shift(); this.ereignis({ e:'feed', text, art }); }
    effekt(sp, e) { const x = sp.eff[e]; if (!x) return false; if (x.bis != null) return x.bis > this.uhr; return x.n > 0; }
    nimm(sp, e) { const x = sp.eff[e]; if (x && x.n > 0) { x.n--; if (!x.n) delete sp.eff[e]; this.geaendert(); } }
    tischVon(id) { return this.tische.find(t => t.id === id); }
    limit(sp, tisch, gold) {
      let l = tisch.max;
      if (this.effekt(sp, 'bestechung')) l *= 3;
      if (sp.pfand.hose) l *= 0.75;
      if (gold) l *= 2;
      return Math.floor(l);
    }
    nahe(sp, p, d) { return Math.hypot(sp.x - p.x, sp.z - p.z) <= d; }

    /* ---------- Kontext für die Spielregeln ---------- */
    kontext(sp, tisch, halter, sess) {
      const spiel = this;
      if (halter._E == null) halter._E = 0;
      return {
        rng:spiel.rng, uhr:spiel.uhr, etage:spiel.etage,
        setzen(b) {
          b = Math.floor(Number(b));
          const gold = spiel.effekt(sp, 'goldchip');
          if (!(b >= tisch.min) || b > spiel.limit(sp, tisch, gold) || b > spiel.bank) return false;
          spiel.bank -= b; halter._E = b; halter._bind = { gold };
          if (gold) spiel.nimm(sp, 'goldchip');
          spiel.gespielt.add(tisch.art + tisch.id);
          spiel.melde(sp, 'tische', spiel.gespielt.size);
          spiel.geaendert();
          return true;
        },
        nachsetzen(b) { b = Math.floor(b); if (!(b > 0) || b > spiel.bank) return false; spiel.bank -= b; halter._E += b; spiel.geaendert(); return true; },
        einsatzJetzt:() => halter._E,
        bindung:() => halter._bind || {},
        zahlen(brutto, o = {}) { spiel.abrechnen(sp, tisch, halter._E, brutto, halter._bind || {}, o); halter._E = 0; halter._bind = null; },
        sperre(sek) { if (sess) sess.bis = spiel.uhr + sek / (spiel.effekt(sp, 'espresso') ? 2 : 1); },
        hat:e => spiel.effekt(sp, e),
        nimm:e => spiel.nimm(sp, e),
        melde:(art, wert) => spiel.melde(sp, art, wert, sess && sess.bis ? Math.max(0, sess.bis - spiel.uhr) : 0)
      };
    }
    kontextFuer(tisch) {
      return (id, w) => {
        const sp = this.spieler.get(id);
        if (!sp) return null;
        return this.kontext(sp, tisch, { _E:w.einsatz, _bind:w.bindung });
      };
    }

    /* ---------- Abrechnen einer Runde (mit allen Item-Wirkungen) ---------- */
    abrechnen(sp, tisch, E, brutto, bind, o) {
      brutto = Math.floor(brutto);
      let netto = brutto - E, abzug = 0;
      const notiz = [];
      if (netto > 0) {
        let m = 1;
        if (o.slots && this.effekt(sp, 'teufel')) { m *= 4; this.nimm(sp, 'teufel'); notiz.push('😈×4'); }
        if (this.effekt(sp, 'drink')) { m += 0.5; notiz.push('🍹'); }
        if (this.heiss && this.heiss.tisch === tisch.id && this.heiss.bis > this.uhr) { m += 0.5; notiz.push('🔥'); }
        if (this.effekt(sp, 'katze')) { m *= 2; this.nimm(sp, 'katze'); notiz.push('🐱×2'); }
        netto = Math.floor(netto * m);
      } else if (netto < 0) {
        let verlust = -netto;
        if (o.slots && this.effekt(sp, 'engel')) { verlust = 0; this.nimm(sp, 'engel'); notiz.push('😇'); }
        else if (o.slots && this.effekt(sp, 'teufel')) { abzug = E; this.nimm(sp, 'teufel'); notiz.push('😈'); }
        if (verlust > 0) {
          if (bind.gold) { verlust = 0; notiz.push('🪙'); }
          else if (this.statuen.some(st => st.bis > this.uhr && this.nahe(sp, st, 5))) { verlust = 0; notiz.push('🗿'); }
          else if (this.effekt(sp, 'versicherung')) { verlust = Math.ceil(verlust / 2); this.nimm(sp, 'versicherung'); notiz.push('📄½'); }
        }
        netto = -verlust;
      } else if (bind.gold && E > 0 && brutto === 0) { /* Einsatz 0 kommt nicht vor */ }
      const gutschrift = E + netto;
      this.faellig.push({ bei:this.uhr + (o.nach || 0), id:sp.id, tisch:tisch.id, art:tisch.art, betrag:Math.max(0, gutschrift), abzug, netto:netto - abzug, E,
        faktor:o.faktor || 0, text:o.text || G[tisch.art].name, notiz:notiz.join(' '), melde:netto > 0 ? o.melde || null : null });
      this.geaendert();
    }
    gutschreiben(f) {
      this.bank += f.betrag;
      const ab = Math.min(this.bank, f.abzug); this.bank -= ab;
      const sp = this.spieler.get(f.id);
      const netto = f.betrag - f.E - ab;
      if (sp) {
        const st = sp.stats;
        st.netto += netto; st.runden++;
        if (netto > 0) st.plus += netto; else st.minus -= netto;
        st.groesster = Math.max(st.groesster, netto); st.schlimmster = Math.min(st.schlimmster, netto);
        if (f.melde) for (const m of f.melde) this.melde(sp, m, 1);
        if (netto >= this.quote * 0.5) this.melde(sp, 'grosserGewinn', 1);
      }
      const gross = Math.abs(netto) >= this.quote * 0.15;
      this.ereignis({ e:'ergebnis', id:f.id, tisch:f.tisch, art:f.art, netto, faktor:f.faktor, text:f.text, notiz:f.notiz, gross });
      if (gross && sp) this.feed(netto > 0 ? `${sp.name}: +${zahl(netto)} $ – ${f.text}${f.faktor ? ' (×' + f.faktor + ')' : ''}` : `${sp.name}: −${zahl(-netto)} $ – ${f.text}`, netto > 0 ? 'plus' : 'minus');
      this.geaendert();
    }

    /* ---------- Herausforderungen ---------- */
    aufgabenWuerfeln() {
      const da = new Set(this.tische.map(t => t.art));
      const moeglich = AUFGABEN.filter(a => !a.spiel || da.has(a.spiel));
      const r = this.rng, liste = moeglich.slice();
      for (let i = liste.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [liste[i], liste[j]] = [liste[j], liste[i]]; }
      this.aufgaben = liste.slice(0, 3).map((a, i) => ({ nr:i, art:a.art, ziel:a.ziel || 1, t:a.t, stand:0, fertig:false, geld:nett(this.quote * AUFGABE_GELD) }));
    }
    melde(sp, art, wert = 1, nach = 0) {
      if (nach > 0) { this.faellig.push({ bei:this.uhr + nach, melde:true, id:sp.id, art, wert }); return; }
      if (this.phase !== 'tag') return;
      for (const a of this.aufgaben) {
        if (a.fertig || a.art !== art) continue;
        a.stand = Math.max(a.stand, Math.min(a.ziel, wert));
        if (a.stand >= a.ziel) {
          a.fertig = true;
          this.tickets += AUFGABE_TICKETS; this.bank += a.geld;
          this.feed(`✅ ${a.t} – +${zahl(a.geld)} $ und +${AUFGABE_TICKETS} 🎫 (${sp.name})`, 'aufgabe');
          this.ereignis({ e:'aufgabe', id:sp.id, t:a.t, geld:a.geld });
        }
        this.geaendert();
      }
    }

    /* ---------- Tage ---------- */
    tischeWuerfeln() {
      const E = this.etage, anzahl = ETAGEN[E].tische;
      const pool = ARTEN.filter(a => G[a].ab <= E);
      const neu = ARTEN.filter(a => G[a].ab === E);
      const r = this.rng;
      const rest = pool.filter(a => !neu.includes(a));
      for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
      let arten = [...neu, ...rest].slice(0, anzahl);
      if (!arten.includes('slots')) arten[arten.length - 1] = 'slots';
      while (arten.length < anzahl) arten.push('slots');
      // Plätze zufällig verteilen
      const plaetze = PLAETZE.map((_, i) => i);
      for (let i = plaetze.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [plaetze[i], plaetze[j]] = [plaetze[j], plaetze[i]]; }
      this.tische = arten.map((art, i) => {
        const max = nett(this.quote * G[art].faktor);
        const t = { id:'t' + this.tag + '-' + (this.tischZaehler = (this.tischZaehler || 0) + 1), art, platz:plaetze[i], x:PLAETZE[plaetze[i]].x, z:PLAETZE[plaetze[i]].z, max, min:Math.max(1, nett(max / 50)), runde:null };
        if (G[art].runde) t.runde = G[art].neuRunde({ rng:this.rng }, this.uhr);
        return t;
      });
    }
    tagStarten() {
      this.phase = 'tag';
      this.zeit = this.tagDauer;
      this.statuen = []; this.heiss = null; this.gespielt = new Set();
      this.jetons = nett(this.quote * (this.tag === 1 ? JETONS_TAG1 : JETONS));
      this.bank += this.jetons;
      this.tischeWuerfeln();
      this.aufgabenWuerfeln();
      for (const sp of this.spieler.values()) {
        sp.tisch = null; sp.sitzungen = {}; sp.feierabend = false; sp.bereit = false; sp.hand = null;
        sp.x = SPAWN.x + (Math.random() - 0.5) * 3; sp.z = SPAWN.z + 1;
      }
      this.feed(`Tag ${this.tag}: ${ETAGEN[this.etage].name}. Don Flosse gibt euch ${zahl(this.jetons)} $ in Jetons und will heute Abend ${zahl(this.quote)} $.`, 'tag');
      this.ereignis({ e:'tagStart', tag:this.tag, etage:this.etage });
      this.geaendert();
    }
    tagBeenden() {
      // Alles Offene abrechnen und sofort gutschreiben
      for (const sp of this.spieler.values()) this.aufstehen(sp, true);
      for (const t of this.tische) if (t.runde) G[t.art].ende(t.runde, this.uhr, this.kontextFuer(t));
      this.faelligeAuszahlen(true);
      const vorher = this.bank, quote = this.quote;
      const bezahlt = this.bank >= quote;
      let tickets = 0;
      if (bezahlt) {
        this.bank -= quote; this.schuld -= quote;
        tickets = 3 + (this.bank >= quote * 0.5 ? 1 : 0);
        this.tickets += tickets;
        this.feed(`Don Flosse kassiert ${zahl(quote)} $. Übrig: ${zahl(this.bank)} $.`, 'plus');
      } else {
        this.mahnungen++;
        this.versaeumt += quote;
        this.feed(`Nicht genug Geld! Don Flosse nimmt alles und schreibt eine Mahnung (${this.mahnungen}/${MAHNUNGEN_MAX}).`, 'minus');
        this.bank = 0;
      }
      this.abrechnung = { tag:this.tag, quote, vorher, bezahlt, rest:this.bank, mahnungen:this.mahnungen, tickets, bis:this.uhr + ABRECHNUNG_ZEIT, letzter:this.tag >= this.tage };
      this.phase = 'abrechnung';
      this.ereignis({ e:'abrechnung', bezahlt, quote, vorher });
      this.geaendert();
    }
    nachAbrechnung() {
      const a = this.abrechnung;
      if (this.mahnungen >= MAHNUNGEN_MAX) return this.beenden('aquarium');
      if (a.letzter) { if (a.bezahlt) return this.finaleStarten(); return this.beenden('aquarium'); }
      this.tag++;
      this.etage = Math.min(3, Math.floor((this.tag - 1) / this.tageProEtage));
      this.quote = this.quoten[this.tag - 1] + (this.tag === this.tage ? this.versaeumt : 0);
      if (!a.bezahlt) {
        this.feed('Was ihr nicht bezahlt habt, kommt auf die letzte Rate.', 'minus');
      }
      this.ladenOeffnen(false);
    }
    ladenOeffnen(erster) {
      this.phase = 'laden';
      const r = this.rng;
      const pool = []; for (const k in ITEMS) for (let i = 0; i < ITEMS[k].w; i++) pool.push(k);
      const angebot = [];
      while (angebot.length < 5) { const k = pool[Math.floor(r() * pool.length)]; if (!angebot.some(a => a.item === k)) angebot.push({ item:k, preis:ITEMS[k].preis, weg:false }); }
      this.laden = { angebot, bis:this.uhr + (erster ? LADEN_ZEIT + 30 : LADEN_ZEIT), erster };
      for (const sp of this.spieler.values()) { sp.bereit = false; sp.tisch = null; }
      this.geaendert();
    }
    bereitPruefen() {
      if (this.phase === 'laden') { const a = this.aktive(); if (a.length && a.every(s => s.bereit)) this.tagStarten(); }
      else if (this.phase === 'tag') { const a = this.aktive(); if (a.length && a.every(s => s.feierabend)) { this.feed('Feierabend! Alle wollen den Tag beenden.'); this.zeit = 0; } }
      else if (this.phase === 'finale') { const a = this.aktive(); if (a.length && a.every(s => this.finale.stimmen[s.id])) this.finaleEntscheiden(); }
    }
    finaleStarten() {
      this.phase = 'finale';
      this.finale = { stimmen:{}, bis:this.uhr + FINALE_ZEIT, wurf:null, entscheidung:null };
      this.geaendert();
    }
    finaleEntscheiden() {
      const st = Object.values(this.finale.stimmen);
      const doppelt = st.filter(x => x === 'doppelt').length, aus = st.length - doppelt;
      if (doppelt > aus) {
        this.finale.entscheidung = 'doppelt';
        this.finale.wurf = this.rng() < 0.5 ? 'hai' : 'loewe';    // Löwe = ihr gewinnt
        this.finale.bis = this.uhr + 6;
        this.phase = 'finalwurf';
        this.feed('Doppelt oder nichts! Don Flosse wirft seine Münze …', 'tag');
      } else {
        this.finale.entscheidung = 'aus';
        this.beenden('frei');
      }
      this.geaendert();
    }
    beenden(art) {
      this.phase = 'ende';
      this.ende = { art, bank:this.bank, tag:this.tag, mahnungen:this.mahnungen };
      this.ereignis({ e:'ende', art });
      this.geaendert();
    }

    /* ---------- Takt ---------- */
    takt() {
      this.uhr = Math.round((this.uhr + DT) * 1000) / 1000;
      this.faelligeAuszahlen(false);
      if (this.phase === 'tag') {
        this.zeit -= DT;
        for (const t of this.tische) if (t.runde) {
          const vorher = t.runde.phase;
          t.runde = G[t.art].takt(t.runde, this.uhr, this.kontextFuer(t), () => G[t.art].neuRunde({ rng:this.rng }, this.uhr));
          if (t.runde.phase !== vorher) this.geaendert();
        }
        for (const sp of this.spieler.values()) for (const tid in sp.sitzungen) {
          const t = this.tischVon(tid), s = sp.sitzungen[tid];
          if (t && !G[t.art].runde && G[t.art].takt) G[t.art].takt(s, this.kontext(sp, t, s, s));
        }
        // Abgelaufene Wirkungen aufräumen
        if (Math.round(this.uhr * 10) % 10 === 0) {
          for (const sp of this.spieler.values()) for (const e in sp.eff) if (sp.eff[e].bis != null && sp.eff[e].bis <= this.uhr) { delete sp.eff[e]; this.geaendert(); }
          this.statuen = this.statuen.filter(s => s.bis > this.uhr);
          if (this.heiss && this.heiss.bis <= this.uhr) { this.heiss = null; this.geaendert(); }
        }
        if (this.zeit <= 0) { this.zeit = 0; this.tagBeenden(); }
      } else if (this.phase === 'abrechnung') {
        if (this.uhr >= this.abrechnung.bis) this.nachAbrechnung();
      } else if (this.phase === 'laden') {
        if (this.uhr >= this.laden.bis) this.tagStarten();
      } else if (this.phase === 'finale') {
        if (this.uhr >= this.finale.bis) this.finaleEntscheiden();
      } else if (this.phase === 'finalwurf') {
        if (this.uhr >= this.finale.bis) this.beenden(this.finale.wurf === 'loewe' ? 'besitzer' : 'verzockt');
      }
    }
    faelligeAuszahlen(alle) {
      if (!this.faellig.length) return;
      const jetzt = [], spaeter = [];
      for (const f of this.faellig) (alle || f.bei <= this.uhr ? jetzt : spaeter).push(f);
      if (!jetzt.length) return;
      this.faellig = spaeter;
      for (const f of jetzt) {
        if (f.melde === true) { const sp = this.spieler.get(f.id); if (sp) this.melde(sp, f.art, f.wert); }
        else this.gutschreiben(f);
      }
    }

    /* ---------- Befehle ---------- */
    aktion(id, b) {
      const sp = this.spieler.get(id);
      if (!sp || !b || typeof b !== 'object') return;
      const fehler = this.befehl(sp, b);
      if (fehler) this.ereignis({ e:'fehler', an:id, text:fehler });
    }
    befehl(sp, b) {
      switch (b.a) {
        case 'chat': { const t = String(b.text || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80); if (t) this.ereignis({ e:'chat', id:sp.id, text:t }); return; }
        case 'emote': { const e = String(b.e || '').slice(0, 12); this.ereignis({ e:'emote', id:sp.id, emote:e }); return; }
        case 'bereit': if (this.phase !== 'laden') return; sp.bereit = !!b.an; this.geaendert(); this.bereitPruefen(); return;
        case 'kaufen': return this.kaufen(sp, b.i | 0);
        case 'neuMischen': {
          if (this.phase !== 'laden') return 'Nur im Hinterzimmer';
          if (this.tickets < 1) return 'Kein Ticket';
          this.tickets--; const bis = this.laden.bis, erster = this.laden.erster; this.ladenOeffnen(erster); this.laden.bis = bis;
          for (const s of this.spieler.values()) s.bereit = false;
          return;
        }
        case 'ausloesen': {
          if (this.phase !== 'laden') return 'Nur im Hinterzimmer';
          if (!PFAND[b.ding] || !sp.pfand[b.ding]) return 'Nicht verpfändet';
          if (this.tickets < AUSLOESEN) return 'Zu wenig Tickets';
          this.tickets -= AUSLOESEN; sp.pfand[b.ding] = false; this.geaendert();
          this.feed(`${sp.name} holt ${PFAND[b.ding].n} beim Pfandhaus zurück.`);
          return;
        }
        case 'stimme': {
          if (this.phase !== 'finale') return;
          this.finale.stimmen[sp.id] = b.wahl === 'doppelt' ? 'doppelt' : 'aus';
          this.geaendert(); this.bereitPruefen(); return;
        }
      }
      if (this.phase !== 'tag') return 'Gerade nicht';
      switch (b.a) {
        case 'sitzen': return this.sitzen(sp, b.tisch);
        case 'aufstehen': this.aufstehen(sp); return;
        case 'spiel': return this.spielen(sp, b);
        case 'item': return this.itemNutzen(sp, b.slot | 0);
        case 'halten': {   // Item aus der Tasche nehmen und in der Hand tragen (alle sehen es); erneut = wegstecken
          const i = b.slot == null ? null : b.slot | 0;
          sp.hand = i != null && sp.items[i] && sp.hand !== i ? i : null;
          this.geaendert(); return;
        }
        case 'pfand': return this.verpfaenden(sp, b.ding);
        case 'feierabend': sp.feierabend = !!b.an; this.geaendert(); this.bereitPruefen(); return;
        case 'wegwerfen': { const i = b.slot | 0; if (sp.items[i]) { sp.items[i] = null; if (sp.hand === i) sp.hand = null; this.geaendert(); } return; }
      }
      return 'Unbekannter Befehl';
    }
    sitzen(sp, tid) {
      const t = this.tischVon(tid); if (!t) return 'Kein Tisch';
      if (sp.tisch === tid) return;
      if (!this.nahe(sp, t, SITZ_ABSTAND)) return 'Zu weit weg';
      const besetzt = this.aktive().filter(s => s.tisch === tid).length;
      if (besetzt >= G[t.art].plaetze) return 'Der Tisch ist voll';
      this.aufstehen(sp);
      sp.tisch = tid;
      if (!G[t.art].runde && !sp.sitzungen[tid]) sp.sitzungen[tid] = G[t.art].neu();
      this.geaendert();
    }
    aufstehen(sp, tagesende) {
      const tid = sp.tisch;
      const liste = tagesende ? Object.keys(sp.sitzungen) : tid ? [tid] : [];
      for (const k of liste) {
        const t = this.tischVon(k), s = sp.sitzungen[k];
        if (t && s && G[t.art].ende) G[t.art].ende(s, this.kontext(sp, t, s, s));
      }
      if (sp.tisch) { sp.tisch = null; this.geaendert(); }
    }
    spielen(sp, befehl) {
      const t = this.tischVon(sp.tisch); if (!t) return 'Setz dich erst an einen Tisch';
      const b = befehl.z; if (!b || typeof b !== 'object') return 'Was?';
      const spiel = G[t.art];
      if (spiel.runde) {
        const r = spiel.aktion(t.runde, sp.id, b, this.kontext(sp, t, {}), this.uhr, this.kontextFuer(t));
        this.geaendert();
        return r;
      }
      const s = sp.sitzungen[t.id];
      if (s.bis && this.uhr < s.bis - 0.05) return 'Moment …';
      const r = spiel.aktion(s, b, this.kontext(sp, t, s, s));
      this.geaendert();
      return r;
    }
    kaufen(sp, i) {
      if (this.phase !== 'laden') return 'Nur im Hinterzimmer';
      const a = this.laden.angebot[i]; if (!a || a.weg) return 'Weg';
      if (this.tickets < a.preis) return 'Zu wenig Tickets';
      const frei = sp.items.indexOf(null); if (frei < 0) return 'Deine Taschen sind voll';
      this.tickets -= a.preis; a.weg = true; sp.items[frei] = a.item;
      this.feed(`${sp.name} kauft ${ITEMS[a.item].icon} ${ITEMS[a.item].n}.`);
      this.geaendert();
    }
    itemNutzen(sp, slot) {
      const k = sp.items[slot]; if (!k) return 'Leer';
      const I = ITEMS[k];
      if (k === 'statue') this.statuen.push({ x:sp.x, z:sp.z, bis:this.uhr + 20, von:sp.id });
      else if (k === 'sanduhr') this.zeit += 45;
      else if (k === 'ratte') {
        const erwischt = this.rng() < 0.25, betrag = nett(this.quote * (erwischt ? 0.1 : 0.2));
        if (erwischt) { const ab = Math.min(this.bank, betrag); this.bank -= ab; this.feed(`🐀 Ratto wurde erwischt! −${zahl(ab)} $`, 'minus'); }
        else { this.bank += betrag; this.feed(`🐀 Ratto bringt ${zahl(betrag)} $ aus dem Tresor!`, 'plus'); }
      } else if (k === 'keks') {
        if (!this.tische.length) return 'Keine Tische';
        const t = this.tische[Math.floor(this.rng() * this.tische.length)];
        this.heiss = { tisch:t.id, bis:this.uhr + 60 };
        this.feed(`🥠 Der Glückskeks sagt: ${G[t.art].name} ist jetzt heiß!`, 'plus');
      } else {
        const e = ITEM_EFFEKT[k];
        const alt = sp.eff[k];
        if (e.s) sp.eff[k] = { bis:Math.max(alt && alt.bis || 0, this.uhr) + e.s };
        else sp.eff[k] = { n:(alt && alt.n || 0) + e.n };
      }
      sp.items[slot] = null; if (sp.hand === slot) sp.hand = null;
      this.ereignis({ e:'item', id:sp.id, item:k, x:sp.x, z:sp.z });
      if (k !== 'ratte' && k !== 'keks') this.feed(`${sp.name} benutzt ${I.icon} ${I.n}.`);
      this.geaendert();
    }
    verpfaenden(sp, ding) {
      if (!PFAND[ding]) return 'Was?';
      if (sp.pfand[ding]) return 'Schon weg';
      if (!this.nahe(sp, PFANDHAUS, 4.5)) return 'Geh zum Pfandhaus';
      const betrag = nett(this.quote * PFANDWERT);
      sp.pfand[ding] = true; this.bank += betrag;
      this.feed(`${sp.name} verpfändet ${PFAND[ding].icon} ${PFAND[ding].n} für ${zahl(betrag)} $.`, 'plus');
      this.ereignis({ e:'pfand', id:sp.id, ding, betrag });
      this.geaendert();
    }

    /* ---------- Was die Browser sehen ---------- */
    zustand() {
      const uhr = this.uhr;
      const effSicht = sp => { const v = {}; for (const e in sp.eff) { const x = sp.eff[e]; if (x.bis != null) { if (x.bis > uhr) v[e] = { s:Math.ceil(x.bis - uhr) }; } else if (x.n > 0) v[e] = { n:x.n }; } return v; };
      return {
        phase:this.phase, uhr, tag:this.tag, tage:this.tage, etage:this.etage, tagDauer:this.tagDauer, laenge:this.laenge,
        bank:this.bank, quote:this.quote, jetons:this.jetons || nett(this.quote * JETONS), schuld:this.schuld, mahnungen:this.mahnungen, tickets:this.tickets, zeit:Math.max(0, Math.round(this.zeit * 10) / 10),
        quoten:this.quoten, versaeumt:this.versaeumt,
        tische:this.tische.map(t => ({ id:t.id, art:t.art, platz:t.platz, x:t.x, z:t.z, max:t.max, min:t.min, runde:t.runde ? G[t.art].sicht(t.runde) : null })),
        spieler:[...this.spieler.values()].map(sp => {
          const brille = this.effekt(sp, 'brille');
          const t = sp.tisch && this.tischVon(sp.tisch);
          const s = t && sp.sitzungen[t.id];
          return {
            id:sp.id, name:sp.name, tier:sp.tier, tisch:sp.tisch, items:sp.items, hand:sp.hand != null ? sp.hand : null, pfand:sp.pfand, eff:effSicht(sp), bereit:sp.bereit, feierabend:sp.feierabend,
            stats:sp.stats, weg:sp.weg, sitz:s ? G[t.art].sicht(s, brille) : null, sperre:s && s.bis ? Math.max(0, Math.round((s.bis - uhr) * 100) / 100) : 0,
            limit:t ? this.limit(sp, t, this.effekt(sp, 'goldchip')) : 0
          };
        }),
        aufgaben:this.aufgaben, statuen:this.statuen.filter(s => s.bis > uhr).map(s => ({ x:s.x, z:s.z, s:Math.ceil(s.bis - uhr) })),
        heiss:this.heiss && this.heiss.bis > uhr ? { tisch:this.heiss.tisch, s:Math.ceil(this.heiss.bis - uhr) } : null,
        laden:this.phase === 'laden' ? { angebot:this.laden.angebot, rest:Math.max(0, Math.ceil(this.laden.bis - uhr)), erster:this.laden.erster } : null,
        abrechnung:this.phase === 'abrechnung' ? this.abrechnung : null,
        finale:this.finale ? { stimmen:this.finale.stimmen, rest:Math.max(0, Math.ceil(this.finale.bis - uhr)), wurf:this.phase === 'finalwurf' || this.phase === 'ende' ? this.finale.wurf : null, entscheidung:this.finale.entscheidung } : null,
        ende:this.ende, log:this.log
      };
    }
    positionen() { return [...this.spieler.values()].map(s => [s.id, Math.round(s.x * 100) / 100, Math.round(s.z * 100) / 100, Math.round(s.r * 100) / 100]); }
  }

  function zahl(n) { return Math.round(n).toLocaleString('de-DE'); }

  return {
    Spiel, TAKT, ITEMS, PFAND, AUSLOESEN, AUFGABEN, ETAGEN, RAUM, SPAWN, PFANDHAUS, PLAETZE, TISCH_RADIUS, SITZ_ABSTAND, TIERE, MAX_SPIELER, SLOTS,
    JETONS, QUOTE_BASIS, WACHSTUM, MAHNUNGEN_MAX, PFANDWERT, nett, zahl, zufall
  };
});

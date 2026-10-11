/* Kredithai – Hauptprogramm im Browser: Menüs, Verbindung (Solo im Browser oder online), Steuerung, HUD, Dialoge. */
(function () {
  'use strict';
  const L = KHLogik, S = KHSpiele, F = KHF, Ton = KHTon, h = KHTische.h;
  const $ = id => document.getElementById(id);
  const zahl = n => L.zahl(n);
  const istTouch = matchMedia('(pointer: coarse)').matches;

  /* ---------- Einstellungen ---------- */
  const speicher = {
    lesen(k, d) { try { const v = localStorage.getItem('kredithai.' + k); return v == null ? d : v; } catch (_) { return d; } },
    schreiben(k, v) { try { localStorage.setItem('kredithai.' + k, v); } catch (_) { /* egal */ } }
  };
  const einst = {
    name:speicher.lesen('name', ''), tier:speicher.lesen('tier', 'loewe'), laenge:speicher.lesen('laenge', 'normal'),
    dauer:+speicher.lesen('dauer', 300), grafik:speicher.lesen('grafik', istTouch ? 'mittel' : 'hoch')
  };
  const TIER_ICON = { loewe:'🦁', pinguin:'🐧', fuchs:'🦊', waschbaer:'🦝', baer:'🐻', hase:'🐰' };
  const EMOTES = [['allin', 'ALL IN! 🔥'], ['nein', 'NEIN! 😱'], ['stopp', 'Hör auf! ✋'], ['komm', 'Komm her! 👋'], ['jaaa', 'Jaaa! 🤑'], ['hilfe', 'Hilfe! 🆘']];
  const EMOTE_TEXT = Object.fromEntries(EMOTES);

  /* ---------- Zustand ---------- */
  let welt = null, verbindung = null, z = null, zZeit = 0, ich = null, raum = null, modus = null;
  let panel = null, panelTisch = null, pfandOffen = false, menueOffen = false, chatOffen = false;
  const pos = { x:0, z:-8.5, r:Math.PI, yaw:0, tempo:0 };
  let letztePos = '', posZeit = 0, letzteEtage = -1, letzterTag = 0, kameraSprung = false;
  const andere = new Map();
  const tischWache = new Map();     // tischId -> { nr:{spielerId:nr}, zeit, letzte, frischIds }

  /* ================= Verbindungen ================= */
  // Solo: der Lauf läuft im Browser, mit denselben Nachrichten wie online
  function Lokal(an) {
    let spiel = null, uhr = null, pause = false, version = 0;
    const id = 'ich';
    const neuStart = () => {
      spiel = new L.Spiel({ laenge:einst.laenge, tagDauer:einst.dauer });
      spiel.spielerHinzu(id, einst.name || 'Du', einst.tier);
      version = 0;
    };
    neuStart();
    setTimeout(() => { an({ t:'du', id }); an({ t:'raum', code:null, host:id, phase:'spiel', du:id, einst:{ laenge:einst.laenge, tagDauer:einst.dauer }, mitglieder:[{ id, name:einst.name, tier:einst.tier, online:true }] }); senden(); }, 0);
    function senden() { version = spiel.version; an({ t:'z', z:spiel.zustand() }); }
    uhr = setInterval(() => {
      if (pause) return;
      spiel.takt();
      const ev = spiel.nimmEreignisse();
      if (ev.length) an({ t:'ev', e:ev });
      if (spiel.version !== version || Math.round(spiel.uhr * 10) % 10 === 0) senden();
    }, 1000 / L.TAKT);
    return {
      solo:true,
      senden(d) {
        if (d.t === 'p') spiel.position(id, d.x, d.z, d.r);
        else if (d.t === 'a') { spiel.aktion(id, d.b); const ev = spiel.nimmEreignisse(); if (ev.length) an({ t:'ev', e:ev }); senden(); }
        else if (d.t === 'nochmal') { neuStart(); senden(); }
      },
      pause(p) { pause = p; },
      zu() { clearInterval(uhr); },
      spiel:() => spiel
    };
  }
  // Online über WebSocket, mit Wiederverbinden
  function Online(an, erstBefehl) {
    let ws = null, offen = false, versuche = 0, zu = false, warteschlange = [erstBefehl];
    function verbinden() {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${proto}//${location.host}/ws`);
      ws.onopen = () => {
        offen = true; versuche = 0;
        let token = null, code = null;
        try { token = sessionStorage.getItem('kredithai.token'); code = sessionStorage.getItem('kredithai.raum'); } catch (_) { /* egal */ }
        ws.send(JSON.stringify({ t:'hallo', name:einst.name || 'Gast', tier:einst.tier, token, raum:code }));
        for (const d of warteschlange) ws.send(JSON.stringify(d));
        warteschlange = [];
      };
      ws.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (_) { return; } an(d); };
      ws.onclose = () => {
        offen = false;
        if (zu) return;
        versuche++;
        if (versuche === 2) toast('Verbindung weg – versuche es wieder …');
        setTimeout(verbinden, Math.min(5000, 400 * versuche));
      };
    }
    verbinden();
    return {
      solo:false,
      senden(d) { if (offen && ws.readyState === 1) ws.send(JSON.stringify(d)); else if (d.t !== 'p') warteschlange.push(d); },
      pause() {},
      zu() { zu = true; try { ws.close(); } catch (_) { /* egal */ } }
    };
  }
  function senden(d) { if (verbindung) verbindung.senden(d); }
  function aktion(b) { senden({ t:'a', b }); }

  /* ---------- Nachrichten ---------- */
  function nachricht(d) {
    switch (d.t) {
      case 'du':
        ich = d.id;
        if (d.token) try { sessionStorage.setItem('kredithai.token', d.token); } catch (_) { /* egal */ }
        break;
      case 'raum':
        raum = d; ich = d.du;
        if (d.code) try { sessionStorage.setItem('kredithai.raum', d.code); } catch (_) { /* egal */ }
        if (d.phase === 'lobby') { zeigeLobby(); z = null; }
        break;
      case 'raus':
        try { sessionStorage.removeItem('kredithai.raum'); } catch (_) { /* egal */ }
        zumMenue();
        break;
      case 'fehler':
        toast(d.text);
        // Beitreten ging schief (Raum weg oder voll): zurück ins Menü
        if (!raum && modus === 'online') { try { sessionStorage.removeItem('kredithai.raum'); } catch (_) { /* egal */ } zumMenue(); }
        break;
      case 'z': zustandNeu(d.z); break;
      case 'pos':
        for (const [id, x, zz, r] of d.p) if (id !== ich) { andere.set(id, { x, z:zz, r }); if (welt) welt.figurZiel(id, x, zz, r); }
        break;
      case 'ev': for (const e of d.e) ereignis(e); break;
    }
  }

  /* ================= Menü und Lobby ================= */
  function schirm(id) {
    for (const s of ['menue', 'lobby', 'hilfe']) $(s).hidden = s !== id;
  }
  function menueAufbauen() {
    $('mName').value = einst.name;
    $('mName').addEventListener('input', () => { einst.name = $('mName').value.trim().slice(0, 16); speicher.schreiben('name', einst.name); if (raum && raum.phase === 'lobby') senden({ t:'ich', name:einst.name }); });
    const tiere = $('mTiere');
    for (const t of L.TIERE) {
      const b = h('button', { class:'tier', 'data-t':t, html:`${TIER_ICON[t]}<small>${F.NAMEN[t]}</small>`, onclick:() => { einst.tier = t; speicher.schreiben('tier', t); tiereMarkieren(); if (raum && raum.phase === 'lobby') { senden({ t:'ich', tier:t }); } } });
      tiere.append(b);
    }
    tiereMarkieren();
    const wahl = (id, wert, f) => { const el = $(id); const mark = () => el.querySelectorAll('button').forEach(b => b.classList.toggle('an', b.dataset.w === String(wert()))); el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { f(b.dataset.w); mark(); Ton.spielen('klick'); })); mark(); };
    wahl('mLaenge', () => einst.laenge, w => { einst.laenge = w; speicher.schreiben('laenge', w); });
    wahl('mDauer', () => einst.dauer, w => { einst.dauer = +w; speicher.schreiben('dauer', w); });
    wahl('mGrafik', () => einst.grafik, w => { einst.grafik = w; speicher.schreiben('grafik', w); if (welt) welt.grafik(w); });
    wahl('mTon', () => Ton.an ? 'an' : 'aus', w => { Ton.an = w === 'an'; });
    $('mSolo').onclick = () => { Ton.start(); starte('solo'); };
    $('mNeu').onclick = () => { Ton.start(); starte('online', { t:'neu', einst:{ laenge:einst.laenge, tagDauer:einst.dauer } }); };
    $('mBeitreten').onclick = () => { const c = $('mCode').value.trim().toUpperCase(); if (c.length !== 4) return toast('Der Code hat 4 Zeichen'); Ton.start(); starte('online', { t:'beitreten', code:c }); };
    $('mCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('mBeitreten').click(); });
    $('mHilfe').onclick = e => { e.preventDefault(); schirm('hilfe'); };
    $('hilfeZu').onclick = () => { if (z) { $('hilfe').hidden = true; } else schirm(raum && raum.phase === 'lobby' ? 'lobby' : 'menue'); };
    $('lLink').onclick = () => linkKopieren();
    $('lStart').onclick = () => senden({ t:'start' });
    $('lRaus').onclick = () => { senden({ t:'verlassen' }); };
    const code = new URLSearchParams(location.search).get('raum');
    if (code) { $('mCode').value = code.toUpperCase().slice(0, 4); $('mBeitreten').classList.add('gold'); $('mSolo').classList.remove('gold'); }
  }
  function tiereMarkieren() {
    const belegt = new Set(raum && raum.mitglieder ? raum.mitglieder.filter(m => m.id !== ich).map(m => m.tier) : []);
    $('mTiere').querySelectorAll('.tier').forEach(b => { b.classList.toggle('an', b.dataset.t === einst.tier); b.classList.toggle('belegt', belegt.has(b.dataset.t)); });
  }
  function linkKopieren() {
    const code = raum && raum.code; if (!code) return;
    const url = `${location.origin}/?raum=${code}`;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Link kopiert!', true), () => prompt('Einladungslink:', url));
  }
  function starte(m, erst) {
    if (!einst.name) { einst.name = 'Gast' + Math.floor(Math.random() * 90 + 10); $('mName').value = einst.name; speicher.schreiben('name', einst.name); }
    modus = m;
    if (verbindung) verbindung.zu();
    try { if (m === 'online' && erst.t !== 'beitreten') sessionStorage.removeItem('kredithai.raum'); } catch (_) { /* egal */ }
    verbindung = m === 'solo' ? Lokal(nachricht) : Online(nachricht, erst);
    if (m === 'online') { $('lCode').textContent = '…'; schirm('lobby'); }
  }
  function zeigeLobby() {
    schirm('lobby');
    $('hud').hidden = true; panelSchliessen(true);
    for (const id of ['laden', 'abrechnung', 'finale', 'ende', 'pfand', 'spielMenue']) $(id).hidden = true;
    $('lCode').textContent = raum.code;
    const host = raum.host === ich;
    $('lStart').hidden = !host; $('lWarte').hidden = host;
    $('lMitglieder').innerHTML = '';
    for (const m of raum.mitglieder) $('lMitglieder').append(h('div', { class:'mitglied' }, h('span', { class:'icon', text:TIER_ICON[m.tier] }), h('span', { text:m.name + (m.id === ich ? ' (du)' : '') }), m.id === raum.host ? h('span', { class:'host', text:'Host' }) : null));
    $('lEinst').textContent = `Lauf: ${raum.einst.laenge === 'kurz' ? 'kurz (8 Tage)' : 'normal (12 Tage)'} · Tage à ${raum.einst.tagDauer / 60} min` + (host ? ' – änderbar im Startmenü vor dem Erstellen' : '');
    const meins = raum.mitglieder.find(m => m.id === ich);
    if (meins && meins.tier !== einst.tier) { einst.tier = meins.tier; speicher.schreiben('tier', einst.tier); }
    tiereMarkieren();
  }
  function zumMenue() {
    if (verbindung) verbindung.zu();
    verbindung = null; z = null; raum = null; modus = null;
    panelSchliessen(true);
    $('hud').hidden = true;
    for (const id of ['laden', 'abrechnung', 'finale', 'ende', 'pfand', 'spielMenue']) $(id).hidden = true;
    history.replaceState(null, '', '/');
    schirm('menue');
  }

  /* ================= Zustand ================= */
  const meinSp = () => z && z.spieler.find(s => s.id === ich);
  const spielerName = id => { const s = z && z.spieler.find(x => x.id === id); return s ? s.name : '?'; };
  function zustandNeu(neu) {
    const alt = z;
    if (!alt) kameraSprung = true;
    z = neu; zZeit = performance.now();
    if (!welt) return;
    $('menue').hidden = true; $('lobby').hidden = true;
    $('hud').hidden = false;
    if (z.etage !== letzteEtage) { welt.etageBauen(z.etage); letzteEtage = z.etage; }
    welt.tischeSetzen(z.tische, z.heiss);
    welt.figurenAbgleichen(z.spieler);
    welt.statuenSetzen(z.statuen);
    if (z.tag !== letzterTag && z.phase === 'tag') { letzterTag = z.tag; pos.x = (Math.random() - 0.5) * 3; pos.z = -8.3; pos.yaw = 0; pos.r = 0; kameraSprung = true; }
    tischeBeobachten();
    const me = meinSp();
    // Panel öffnen oder schließen, je nachdem, wo der Server mich sieht
    if (me && me.tisch && z.phase === 'tag') { if (panelTisch !== me.tisch) panelOeffnen(me.tisch); }
    else if (panelTisch) panelSchliessen(true);
    if (panel && me) { const t = z.tische.find(x => x.id === panelTisch); if (t) panel.update(panelDaten(t, me)); }
    hudAktualisieren();
    dialogeAktualisieren(alt);
    if (pfandOffen) pfandZeigen();
  }
  function tischeBeobachten() {
    const jetzt = performance.now();
    for (const t of z.tische) {
      let w = tischWache.get(t.id);
      if (!w) { w = { nr:{}, zeit:0, letzte:null, frischIds:new Set(), alle:[] }; tischWache.set(t.id, w); }
      w.alle = [];
      w.frischIds = new Set();
      for (const sp of z.spieler) {
        if (sp.tisch !== t.id || !sp.sitz) continue;
        const s = Object.assign({ _id:sp.id }, sp.sitz);
        w.alle.push(s);
        const nr = s.nr || 0;
        if (w.nr[sp.id] == null) { w.nr[sp.id] = nr; if (!w.letzte) w.letzte = s; continue; }
        if (nr !== w.nr[sp.id]) { w.nr[sp.id] = nr; w.zeit = jetzt; w.letzte = s; w.frischIds.add(sp.id); }
        else if (w.letzte && w.letzte._id === sp.id) w.letzte = s;
      }
      w.runde = t.runde;
    }
  }
  function tischInfo(id) {
    const w = tischWache.get(id);
    if (!w) return { alle:[], frischIds:new Set() };
    return { alle:w.alle, letzte:w.letzte, frisch:performance.now() - w.zeit < 700, frischIds:performance.now() - w.zeit < 700 ? new Set(w.alle.map(s => s._id)) : new Set(), runde:w.runde, uhr:uhrJetzt() };
  }
  const uhrJetzt = () => z ? z.uhr + (z.phase === 'tag' ? (performance.now() - zZeit) / 1000 : 0) : 0;
  const zeitJetzt = () => z ? Math.max(0, z.zeit - (z.phase === 'tag' ? (performance.now() - zZeit) / 1000 : 0)) : 0;

  /* ================= HUD ================= */
  let feedZeilen = [];
  function hudAktualisieren() {
    if (!z) return;
    const me = meinSp();
    $('hBank').textContent = zahl(z.bank) + ' $';
    const ok = z.bank >= z.quote;
    $('hBank').classList.toggle('ok', ok);
    $('hRate').textContent = 'Rate ' + zahl(z.quote) + ' $';
    $('hBalken').style.width = Math.min(100, z.bank / z.quote * 100) + '%';
    $('hBalken').classList.toggle('ok', ok);
    $('hTag').innerHTML = `Tag <b>${z.tag}/${z.tage}</b> · ${L.ETAGEN[z.etage].name} · Mahnungen <b>${'●'.repeat(z.mahnungen)}${'○'.repeat(3 - z.mahnungen)}</b> · 🎫 <b>${z.tickets}</b>`;
    // Herausforderungen
    const a = $('hAufgaben'); a.innerHTML = '';
    $('aufgaben').querySelector('h3').textContent = `Aufgaben ${z.aufgaben.filter(x => x.fertig).length}/${z.aufgaben.length}`;
    for (const x of z.aufgaben) a.append(h('div', { class:'aufgabe' + (x.fertig ? ' fertig' : '') }, h('span', { text:(x.fertig ? '✅ ' : '◻️ ') + x.t + (x.ziel > 1 && !x.fertig ? ` (${x.stand}/${x.ziel})` : '') }), h('small', { text:`+${zahl(x.geld)} $ · 🎫2` })));
    // Items
    document.querySelectorAll('.slot').forEach(b => {
      const i = +b.dataset.slot, k = me && me.items[i];
      b.innerHTML = `<kbd>${i + 1}</kbd>` + (k ? L.ITEMS[k].icon : '');
      b.classList.toggle('leer', !k);
      b.title = k ? `${L.ITEMS[k].n}: ${L.ITEMS[k].t}` : 'Leer – Items gibt es im Hinterzimmer';
    });
    const eff = $('hEffekte'); eff.innerHTML = '';
    if (me) for (const k in me.eff) { const e = me.eff[k], I = L.ITEMS[k]; if (I) eff.append(h('span', { class:'eff', title:I.n, text:I.icon + ' ' + (e.s != null ? e.s + ' s' : '×' + e.n) })); }
    if (z.heiss) { const t = z.tische.find(x => x.id === z.heiss.tisch); if (t) eff.append(h('span', { class:'eff', text:`🔥 ${S.G[t.art].name} ${z.heiss.s} s` })); }
    const fa = $('hFeierabend');
    if (me) { fa.classList.toggle('an', me.feierabend); const n = z.spieler.filter(s => !s.weg && s.feierabend).length, g = z.spieler.filter(s => !s.weg).length; fa.textContent = `🏁 Feierabend${g > 1 ? ` ${n}/${g}` : ''}`; }
    $('verschwommen').hidden = !(me && me.pfand.brille);
    $('betrunken').hidden = !(me && me.eff.drink);
  }
  function uhrZeichnen() {
    if (!z) return;
    const me = meinSp(), el = $('hUhr');
    if (z.phase !== 'tag') { el.textContent = z.phase === 'laden' ? '☕' : '…'; el.className = 'uhr'; return; }
    if (me && me.pfand.uhr) { el.textContent = '??:??'; el.className = 'uhr weg'; return; }
    const t = zeitJetzt(), m = Math.floor(t / 60), s = Math.floor(t % 60);
    el.textContent = `${m}:${String(s).padStart(2, '0')}`;
    el.className = 'uhr' + (t < 30 ? ' knapp' : '');
    const sek = Math.ceil(t);
    if ((sek === 30 || sek === 10 || sek <= 5) && sek !== uhrZeichnen.letzte && sek > 0) { uhrZeichnen.letzte = sek; Ton.spielen('alarm'); }
  }
  function feed(text, art) {
    const el = h('div', { class:'feedZeile ' + (art || ''), text });
    $('feed').append(el);
    feedZeilen.push(el);
    while (feedZeilen.length > 6) feedZeilen.shift().remove();
    setTimeout(() => { el.style.opacity = 0; setTimeout(() => { el.remove(); feedZeilen = feedZeilen.filter(x => x !== el); }, 700); }, 9000);
  }
  function toast(text, gut) {
    const el = h('div', { class:'toast' + (gut ? ' gut' : ''), text });
    $('toasts').append(el);
    setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 400); }, 2600);
  }

  /* ---------- Schwebende Zahlen und Sprechblasen ---------- */
  const schweber = [];
  function schwebe(id, html, cls, dauer = 2.2, hoehe = 2.5) {
    const el = h('div', { class:cls, html });
    $('schweber').append(el);
    schweber.push({ el, id, bis:performance.now() + dauer * 1000, hoehe });
  }
  function schweberZeichnen() {
    const jetzt = performance.now();
    for (let i = schweber.length - 1; i >= 0; i--) {
      const s = schweber[i];
      if (jetzt > s.bis) { s.el.remove(); schweber.splice(i, 1); continue; }
      const f = s.id === ich ? { x:pos.x, z:pos.z } : welt.figuren.get(s.id);
      if (!f) continue;
      const p = welt.projizieren(f.x, s.hoehe, f.z);
      if (!p) { s.el.style.display = 'none'; continue; }
      s.el.style.display = ''; s.el.style.left = p.x + 'px'; s.el.style.top = p.y + 'px';
    }
  }

  /* ---------- Ereignisse ---------- */
  function ereignis(e) {
    switch (e.e) {
      case 'ergebnis': {
        if (!e.netto && !e.notiz) break;
        const plus = e.netto > 0;
        schwebe(e.id, `${plus ? '+' : e.netto < 0 ? '−' : '±'}${zahl(Math.abs(e.netto))} $${e.notiz ? `<small>${e.notiz}</small>` : ''}`, 'schwebe ' + (plus ? 'plus' : 'minus') + (e.gross ? ' gross' : ''));
        const f = welt && welt.figuren.get(e.id);
        if (f) { if (plus && e.gross) f.g.jubel = 1.4; else if (!plus && e.gross) f.g.frust = 1.2; }
        const wo = e.id === ich ? pos : f;
        if (plus && wo && welt) welt.muenzregen(wo.x, wo.z, e.gross ? 2.2 : Math.min(1, 0.25 + e.faktor / 10));
        if (e.id !== ich && e.gross) Ton.spielen(plus ? 'sieg' : 'verlust');
        break;
      }
      case 'fehler': if (e.text !== 'Moment …') toast(e.text); break;
      case 'feed': feed(e.text, e.art); break;
      case 'aufgabe': { Ton.spielen('aufgabe'); const f = e.id === ich ? pos : welt && welt.figuren.get(e.id); if (f && welt) welt.konfetti(f.x, f.z); break; }
      case 'item': {
        Ton.spielen('item');
        const I = L.ITEMS[e.item];
        if (I) schwebe(e.id, I.icon, 'schwebe', 1.8, 2.7);
        break;
      }
      case 'pfand': Ton.spielen('kasse'); break;
      case 'chat': schwebe(e.id, esc(e.text), 'blase', 4, 2.45); feed(`${spielerName(e.id)}: ${e.text}`, 'chat'); if (e.id !== ich) Ton.spielen('nachricht'); break;
      case 'emote': if (EMOTE_TEXT[e.emote]) { schwebe(e.id, EMOTE_TEXT[e.emote], 'blase emote', 3, 2.45); Ton.spielen('nachricht'); } break;
      case 'tagStart': Ton.spielen('tag'); break;
      case 'abrechnung': Ton.spielen(e.bezahlt ? 'kasse' : 'mahnung'); break;
      case 'ende': Ton.spielen(e.art === 'aquarium' || e.art === 'verzockt' ? 'mahnung' : 'jackpot'); break;
    }
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  /* ================= Tisch-Panel ================= */
  const tonApi = { senden:b => aktion({ a:'spiel', z:b }), ton:n => Ton.spielen(n), zahl };
  function panelDaten(t, me) { return { z, ich:me, tisch:t, uhr:uhrJetzt(), bank:z.bank, spielerName }; }
  function panelOeffnen(tid) {
    const t = z.tische.find(x => x.id === tid); if (!t) return;
    panelTisch = tid;
    $('panel').hidden = false;
    document.body.classList.add('panelAuf');
    panel = KHTische.oeffnen($('panelWurzel'), t.art, tonApi);
    const me = meinSp();
    if (me) panel.update(panelDaten(t, me));
    $('hinweis').hidden = true;
  }
  function panelSchliessen(still) {
    if (!panelTisch && !panel) return;
    if (!still && panelTisch) aktion({ a:'aufstehen' });
    if (panel) panel.zu();
    panel = null; panelTisch = null;
    $('panel').hidden = true;
    document.body.classList.remove('panelAuf');
  }
  $('panelZu').onclick = () => panelSchliessen(false);

  /* ================= Dialoge ================= */
  function dialogeAktualisieren(alt) {
    const p = z.phase;
    $('laden').hidden = p !== 'laden';
    $('abrechnung').hidden = p !== 'abrechnung';
    $('finale').hidden = p !== 'finale' && p !== 'finalwurf';
    $('ende').hidden = p !== 'ende';
    if (p !== 'tag') { if (pfandOffen) pfandSchliessen(); }
    if (p === 'laden') ladenZeigen();
    if (p === 'abrechnung' && (!alt || alt.phase !== 'abrechnung')) abrechnungZeigen();
    if (p === 'finale' || p === 'finalwurf') finaleZeigen(alt);
    if (p === 'ende' && (!alt || alt.phase !== 'ende')) endeZeigen();
  }
  const SPRUECHE = {
    start:['Willkommen in meinem bescheidenen Casino. Ihr schuldet mir {schuld} $. Ich bin geduldig – solange jeden Abend die Rate kommt.', 'Hier sind eure ersten Jetons. Verspielt sie nicht alle auf einmal. Oder doch – es ist ja mein Casino.'],
    gut:['Pünktlich bezahlt. Ich mag euch. Ein bisschen.', 'Sehr schön. Das Aquarium muss heute noch nicht geputzt werden.', 'Bezahlt? Respekt. Morgen wird es teurer.'],
    schlecht:['Das ist zu wenig. Viel zu wenig. Ich schreibe mir das auf.', 'Habt ihr eine Ahnung, was Aquariumreiniger kostet? Ihr werdet es bald wissen.', 'Ihr enttäuscht mich. Und ich bin ein Hai. Das ist gefährlich.']
  };
  const zufallsSpruch = (k, n) => SPRUECHE[k][n % SPRUECHE[k].length];
  function ladenZeigen() {
    const me = meinSp(); if (!me) return;
    const l = z.laden, box = $('ladenBox');
    // Nur neu bauen, wenn sich etwas Wichtiges ändert – sonst nur den Countdown (Klicks gehen sonst verloren)
    const schl = JSON.stringify([l.angebot, z.tickets, me.items, me.pfand, z.spieler.map(s => [s.id, s.bereit, s.weg, s.name]), z.bank, z.tag]);
    if (box._schl === schl) { const r = box.querySelector('.restZeit'); if (r) r.textContent = `Start spätestens in ${l.rest} s`; return; }
    box._schl = schl;
    const rede = l.erster ? zufallsSpruch('start', 0).replace('{schuld}', zahl(z.schuld)) : (z.versaeumt && z.mahnungen ? zufallsSpruch('schlecht', z.tag) : zufallsSpruch('gut', z.tag));
    const jetons = L.nett(z.quote * (z.tag === 1 ? 0.8 : 0.65));
    const fokus = document.activeElement && box.contains(document.activeElement) ? document.activeElement.dataset.f : null;
    box.innerHTML = '';
    box.append(
      h('h2', { text:l.erster ? 'Don Flosses Hinterzimmer' : `Vor Tag ${z.tag}` }),
      h('div', { class:'sprecher' }, h('div', { class:'gesicht', text:'🦈' }), h('div', { class:'rede', html:`<b>Don Flosse:</b> ${esc(rede)}` })),
      h('div', { class:'statusZeile' },
        h('span', { class:'pill', html:`Tag <b>${z.tag}/${z.tage}</b> · ${L.ETAGEN[z.etage].name}` }),
        h('span', { class:'pill', html:`Rate heute Abend <b>${zahl(z.quote)} $</b>` }),
        h('span', { class:'pill', html:`Morgens <b>+${zahl(jetons)} $</b> Jetons` }),
        h('span', { class:'pill', html:`Konto <b>${zahl(z.bank)} $</b>` }),
        h('span', { class:'pill', html:`Restschuld <b>${zahl(z.schuld)} $</b>` }),
        h('span', { class:'pill', html:`🎫 <b>${z.tickets}</b> Tickets` })),
      h('h3', { text:'Onkel Ottos Ramschladen', style:'margin:14px 0 0' }),
      h('p', { class:'klein', text:'Tickets sind für alle gemeinsam. Was du kaufst, landet in deinen Taschen (3 Plätze).' }));
    const ang = h('div', { class:'angebot' });
    l.angebot.forEach((a, i) => {
      const I = L.ITEMS[a.item];
      const kann = !a.weg && z.tickets >= a.preis && me.items.includes(null);
      ang.append(h('button', { class:'ware' + (a.weg ? ' weg' : ''), disabled:kann ? null : 'disabled', 'data-f':'w' + i, onclick:() => { aktion({ a:'kaufen', i }); Ton.spielen('kasse'); } },
        h('span', { class:'wIcon', text:I.icon }), h('b', { text:I.n }), h('p', { text:I.t }), h('span', { class:'preis', text:a.weg ? 'verkauft' : `🎫 ${a.preis}` })));
    });
    box.append(ang);
    box.append(h('div', { class:'zeile' },
      h('button', { class:'knopf', disabled:z.tickets >= 1 ? null : 'disabled', text:'🔄 Neues Angebot (🎫 1)', onclick:() => aktion({ a:'neuMischen' }) })));
    // Taschen und Pfand
    const taschen = me.items.map(k => k ? `${L.ITEMS[k].icon} ${L.ITEMS[k].n}` : '—').join(' · ');
    box.append(h('p', { class:'klein', style:'margin-top:12px', text:'Deine Taschen: ' + taschen }));
    const weg = Object.keys(me.pfand).filter(k => me.pfand[k]);
    if (weg.length) box.append(h('div', { class:'zeile' }, ...weg.map(k => h('button', { class:'knopf', disabled:z.tickets >= L.AUSLOESEN ? null : 'disabled', text:`${L.PFAND[k].icon} ${L.PFAND[k].n} auslösen (🎫 ${L.AUSLOESEN})`, onclick:() => aktion({ a:'ausloesen', ding:k }) }))));
    const bereit = z.spieler.filter(s => !s.weg);
    box.append(h('div', { class:'statusZeile', style:'margin-top:14px' },
      h('div', { class:'bereitListe' }, ...bereit.map(s => h('span', { class:'pill', text:`${TIER_ICON[s.tier]} ${s.name} ${s.bereit ? '✅' : '⏳'}` }))),
      h('span', { class:'klein restZeit', text:`Start spätestens in ${l.rest} s` })));
    box.append(h('button', { class:'knopf ' + (me.bereit ? '' : 'gold'), style:'width:100%;margin-top:8px', 'data-f':'bereit', text:me.bereit ? 'Warte auf die anderen … (zurücknehmen)' : `Bereit – Tag ${z.tag} starten!`, onclick:() => aktion({ a:'bereit', an:!me.bereit }) }));
    if (fokus) { const el = box.querySelector(`[data-f="${fokus}"]`); if (el) el.focus(); }
  }
  function abrechnungZeigen() {
    const a = z.abrechnung, box = $('abrechnungBox');
    box.innerHTML = '';
    box.append(
      h('h2', { text:`Abend von Tag ${a.tag}` }),
      h('div', { class:'sprecher', style:'text-align:left' }, h('div', { class:'gesicht', text:'🦈' }), h('div', { class:'rede', html:`<b>Don Flosse:</b> ${esc(a.bezahlt ? zufallsSpruch('gut', a.tag) : zufallsSpruch('schlecht', a.tag))}` })),
      h('p', { html:`Auf dem Konto: <span class="grossZahl">${zahl(a.vorher)} $</span><br>Rate: <b>${zahl(a.quote)} $</b>` }),
      h('div', { class:'stempel ' + (a.bezahlt ? 'ok' : 'nein'), text:a.bezahlt ? 'BEZAHLT' : 'MAHNUNG ' + a.mahnungen + '/3' }),
      h('p', { class:'klein', text:a.bezahlt ? `Übrig: ${zahl(a.rest)} $ · +${a.tickets} 🎫` : 'Don Flosse nimmt alles, was auf dem Konto ist. Die Rate kommt auf die letzte drauf.' }));
  }
  function finaleZeigen(alt) {
    const f = z.finale, box = $('finaleBox'), me = meinSp();
    if (z.phase === 'finalwurf') {
      if (alt && alt.phase === 'finalwurf') return;
      box.innerHTML = '';
      const m = h('div', { class:'muenze3d wirbel', style:'margin:30px auto' }, h('div', { class:'seite kopf', text:'🦈' }), h('div', { class:'seite zahl', text:'🦁' }));
      box.append(h('h2', { text:'Doppelt oder nichts' }), h('p', { text:'🦈 Hai: Ihr verliert alles. 🦁 Löwe: Das Casino gehört euch.' }), h('div', { class:'buehne', style:'height:220px' }, m));
      setTimeout(() => { m.className = 'muenze3d ' + (f.wurf === 'loewe' ? 'zeigtZahl' : ''); }, 1250);
      Ton.spielen('wurf');
      return;
    }
    const st = f.stimmen || {};
    const schl = JSON.stringify([st, z.spieler.map(s => s.id + s.weg)]);
    if (box._schl === schl) { const r = box.querySelector('.restZeit'); if (r) r.textContent = `Abstimmung läuft noch ${f.rest} s.`; return; }
    box._schl = schl;
    box.innerHTML = '';
    box.append(
      h('h2', { text:'Die Schuld ist bezahlt!' }),
      h('div', { class:'sprecher', style:'text-align:left' }, h('div', { class:'gesicht', text:'🦈' }), h('div', { class:'rede', html:'<b>Don Flosse:</b> Unglaublich. Ihr seid quitt. … Aber sagt mal: Wie wäre es mit <b>doppelt oder nichts</b>? Eine Münze. Gewinnt ihr, gehört euch mein Casino. Verliert ihr, schuldet ihr mir alles noch einmal.' })),
      h('p', { html:`Ihr habt noch <b>${zahl(z.bank)} $</b>.` }), h('p', { class:'klein restZeit', text:`Abstimmung läuft noch ${f.rest} s.` }),
      h('div', { class:'reihe' },
        h('button', { class:'knopf gold' + (st[ich] === 'aus' ? ' an' : ''), text:'💼 Aufhören – schuldenfrei', onclick:() => aktion({ a:'stimme', wahl:'aus' }) }),
        h('button', { class:'knopf rot' + (st[ich] === 'doppelt' ? ' an' : ''), text:'🪙 Doppelt oder nichts!', onclick:() => aktion({ a:'stimme', wahl:'doppelt' }) })),
      h('div', { class:'bereitListe', style:'justify-content:center;margin-top:12px' }, ...z.spieler.filter(s => !s.weg).map(s => h('span', { class:'pill', text:`${TIER_ICON[s.tier]} ${s.name}: ${st[s.id] === 'doppelt' ? '🪙 doppelt' : st[s.id] === 'aus' ? '💼 aufhören' : '⏳'}` }))));
  }
  const ENDEN = {
    aquarium:{ titel:'Ab ins Aquarium', icon:'🐠', text:'Drei Mahnungen. Don Flosse drückt euch Schwamm und Eimer in die Hand. Ab jetzt putzt ihr sein Aquarium. Für immer.' },
    verzockt:{ titel:'Verzockt!', icon:'🦈', text:'Die Münze zeigt den Hai. Alles verloren – die Schuld ist wieder da, und Don Flosse grinst mit allen Zähnen. Das Aquarium wartet.' },
    frei:{ titel:'Schuldenfrei!', icon:'💼', text:'Ihr habt jede Rate bezahlt und seid klug genug, aufzuhören. Don Flosse lässt euch gehen – zähneknirschend.' },
    besitzer:{ titel:'Das Casino gehört euch!', icon:'👑', text:'Die Münze zeigt den Löwen! Don Flosse übergibt euch zitternd die Schlüssel. Ab heute seid ihr die Hausbank – und die Bank gewinnt immer.' }
  };
  function endeZeigen() {
    const e = z.ende, E = ENDEN[e.art] || ENDEN.aquarium, box = $('endeBox');
    box.innerHTML = '';
    box.append(h('div', { style:'font-size:72px', text:E.icon }), h('h2', { text:E.titel }), h('p', { text:E.text }),
      h('p', { class:'klein', text:`Geschafft bis Tag ${e.tag} von ${z.tage} · ${e.mahnungen} Mahnungen · Konto am Ende ${zahl(e.bank)} $` }));
    const st = h('div', { class:'statistik' });
    const titel = s => s.stats.groesster >= z.quote * 0.5 ? 'Glückspilz' : s.stats.netto > 0 ? 'Gewinner' : s.stats.schlimmster <= -z.quote * 0.3 ? 'Pechvogel' : s.stats.runden > 80 ? 'Dauerzocker' : 'Mitläufer';
    for (const s of z.spieler) st.append(h('div', { html:`<b>${TIER_ICON[s.tier]} ${esc(s.name)}</b> – ${titel(s)}<small>Netto ${s.stats.netto >= 0 ? '+' : '−'}${zahl(Math.abs(s.stats.netto))} $ · ${s.stats.runden} Runden</small><small>Bester Treffer +${zahl(s.stats.groesster)} $ · Schlimmster ${zahl(s.stats.schlimmster)} $</small>` }));
    box.append(st);
    const host = !raum || raum.host === ich || modus === 'solo';
    box.append(h('div', { class:'reihe' },
      host ? h('button', { class:'knopf gold', text:'Nochmal', onclick:() => { letzterTag = 0; letzteEtage = -1; senden({ t:'nochmal' }); } }) : h('span', { class:'klein', text:'Der Host kann einen neuen Lauf starten.' }),
      h('button', { class:'knopf', text:'Zum Menü', onclick:() => { if (modus === 'online') senden({ t:'verlassen' }); zumMenue(); } })));
  }

  /* ---------- Pfandhaus ---------- */
  function pfandZeigen() {
    const me = meinSp(); if (!me || !z) return;
    pfandOffen = true; $('pfand').hidden = false;
    const wert = L.nett(z.quote * L.PFANDWERT);
    const box = $('pfandBox'); box.innerHTML = '';
    box.append(h('h2', { text:'Pfandhaus Elster' }),
      h('div', { class:'sprecher' }, h('div', { class:'gesicht', text:'🐦‍⬛' }), h('div', { class:'rede', html:`<b>Frau Elster:</b> Oh, wie das glänzt! Für jedes Stück gebe ich euch <b>${zahl(wert)} $</b>. Zurückholen könnt ihr es im Hinterzimmer – für ${L.AUSLOESEN} Tickets.` })));
    const liste = h('div', { class:'pfandListe' });
    for (const k in L.PFAND) {
      const P = L.PFAND[k];
      liste.append(h('button', { disabled:me.pfand[k] ? 'disabled' : null, onclick:() => aktion({ a:'pfand', ding:k }) }, h('b', { text:`${P.icon} ${P.n}` }), h('small', { text:me.pfand[k] ? 'Schon verpfändet' : P.t })));
    }
    box.append(liste, h('button', { class:'knopf', style:'width:100%', text:'Zurück ins Casino', onclick:pfandSchliessen }));
  }
  function pfandSchliessen() { pfandOffen = false; $('pfand').hidden = true; }

  /* ---------- Spielmenü ---------- */
  function spielMenue(auf) {
    menueOffen = auf; $('spielMenue').hidden = !auf;
    if (verbindung && verbindung.solo) verbindung.pause(auf);
    $('smInfo').textContent = modus === 'solo' ? 'Allein-Lauf – pausiert.' : raum && raum.code ? `Raum ${raum.code} – das Spiel läuft für die anderen weiter.` : '';
    $('smLink').hidden = !(raum && raum.code);
    $('smTon').textContent = Ton.an ? '🔊 Ton: an' : '🔇 Ton: aus';
  }
  $('hMenue').onclick = () => spielMenue(true);
  $('smZu').onclick = () => spielMenue(false);
  $('smTon').onclick = () => { Ton.an = !Ton.an; spielMenue(true); };
  $('smLink').onclick = linkKopieren;
  $('smHilfe').onclick = () => { $('hilfe').hidden = false; };
  $('smVerlassen').onclick = () => { spielMenue(false); if (modus === 'online') senden({ t:'verlassen' }); zumMenue(); };
  $('hFeierabend').onclick = () => { const me = meinSp(); if (me) aktion({ a:'feierabend', an:!me.feierabend }); };
  document.querySelectorAll('.slot').forEach(b => b.addEventListener('click', () => itemNutzen(+b.dataset.slot)));
  function itemNutzen(i) { const me = meinSp(); if (!me || !me.items[i] || !z || z.phase !== 'tag') return; aktion({ a:'item', slot:i }); }
  // Herausforderungen am Handy einklappbar
  if (matchMedia('(max-width: 760px)').matches) $('aufgaben').classList.add('eingeklappt');
  $('aufgaben').querySelector('h3').addEventListener('click', () => $('aufgaben').classList.toggle('eingeklappt'));
  for (const [k, t] of EMOTES) $('emotes').append(h('button', { text:t, onclick:() => aktion({ a:'emote', e:k }) }));

  /* ================= Steuerung ================= */
  const tasten = new Set();
  let stick = { x:0, y:0, id:null }, ziehen = null;
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT') && e.target.id !== 'chatEingabe') return;
    if (chatOffen) {
      if (e.key === 'Enter') { const t = $('chatEingabe').value.trim(); if (t) aktion({ a:'chat', text:t }); $('chatEingabe').value = ''; chatZu(); }
      else if (e.key === 'Escape') chatZu();
      return;
    }
    if (!z || $('hud').hidden) return;
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') { if (panelTisch) panelSchliessen(false); else if (pfandOffen) pfandSchliessen(); else spielMenue(!menueOffen); return; }
    if (e.key === 'Enter' && z.phase === 'tag') { chatAuf(); e.preventDefault(); return; }
    if (['1', '2', '3'].includes(k)) { itemNutzen(+k - 1); return; }
    if (/^f[1-6]$/.test(k)) { aktion({ a:'emote', e:EMOTES[+k[1] - 1][0] }); e.preventDefault(); return; }
    if (k === 'e' || k === ' ') { if (!panelTisch) interagieren(); e.preventDefault(); return; }
    tasten.add(k);
  });
  addEventListener('keyup', e => tasten.delete(e.key.toLowerCase()));
  addEventListener('blur', () => tasten.clear());
  function chatAuf() { chatOffen = true; $('chatBox').hidden = false; $('chatEingabe').focus(); }
  function chatZu() { chatOffen = false; $('chatBox').hidden = true; $('chatEingabe').blur(); }
  const cv = $('welt');
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.4 && !panelTisch) return;
    ziehen = { id:e.pointerId, x:e.clientX, y:e.clientY, weg:0 };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (!ziehen || e.pointerId !== ziehen.id) return;
    const dx = e.clientX - ziehen.x; ziehen.x = e.clientX; ziehen.weg += Math.abs(dx);
    pos.yaw -= dx * 0.006;
  });
  cv.addEventListener('pointerup', e => {
    if (ziehen && e.pointerId === ziehen.id && ziehen.weg < 6 && !panelTisch) interagieren(true);
    ziehen = null;
  });
  cv.addEventListener('wheel', e => { kamAbstand = Math.max(3.5, Math.min(10, kamAbstand + e.deltaY * 0.005)); }, { passive:true });
  let kamAbstand = 6;
  const st = $('stick');
  st.addEventListener('pointerdown', e => { stick.id = e.pointerId; st.setPointerCapture(e.pointerId); stickBewegen(e); });
  st.addEventListener('pointermove', e => { if (e.pointerId === stick.id) stickBewegen(e); });
  st.addEventListener('pointerup', () => { stick = { x:0, y:0, id:null }; st.firstElementChild.style.transform = ''; });
  function stickBewegen(e) {
    const r = st.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    stick.x = x; stick.y = y;
    st.firstElementChild.style.transform = `translate(${x * 37}px,${y * 37}px)`;
  }
  $('hinweis').addEventListener('click', () => interagieren());

  /* ---------- Was ist in der Nähe? ---------- */
  let naechstes = null;
  function umsehen() {
    naechstes = null;
    if (!z || z.phase !== 'tag' || panelTisch) return;
    let best = 1e9;
    for (const t of z.tische) {
      const r = (welt.RADIUS[t.art] || 1.2) + 1.6;
      const d = Math.hypot(t.x - pos.x, t.z - pos.z);
      if (d < r && d < best) { best = d; naechstes = { art:'tisch', t }; }
    }
    const p = L.PFANDHAUS;
    if (Math.hypot(p.x - pos.x, p.z + 1 - pos.z) < 2.8) naechstes = { art:'pfand' };
  }
  function interagieren(perKlick) {
    if (!naechstes || !z || z.phase !== 'tag') return;
    if (naechstes.art === 'pfand') { pfandZeigen(); return; }
    const t = naechstes.t, besetzt = z.spieler.filter(s => s.tisch === t.id && !s.weg).length;
    if (besetzt >= S.G[t.art].plaetze) return toast('Der Tisch ist voll');
    aktion({ a:'sitzen', tisch:t.id });
    Ton.spielen('chip');
  }

  /* ---------- Bewegung und Kollision ---------- */
  function hindernisse() {
    const kreise = z ? z.tische.map(t => ({ x:t.x, z:t.z, r:(welt.RADIUS[t.art] || 1.2) + 0.3 })) : [];
    const p = L.PFANDHAUS;
    const kaesten = [{ x0:-2.6, x1:2.6, z0:-13, z1:-9.6 }, { x0:p.x - 2.3, x1:p.x + 1.35, z0:-13, z1:p.z + 0.05 },
      { x0:12.9, x1:17, z0:-13, z1:-8.5 }, { x0:-17, x1:17, z0:10.85, z1:13 },
      { x0:-1.8, x1:-1.7, z0:-9.6, z1:-5 }, { x0:1.7, x1:1.8, z0:-9.6, z1:-5 }];
    return { kreise, kaesten };
  }
  function bewegen(dt) {
    const me = meinSp();
    if (!z || !me) return;
    // Am Tisch: auf den Sitzplatz stellen
    if (panelTisch || me.tisch) {
      const tt = welt.tische.get(me.tisch || panelTisch), t = z.tische.find(x => x.id === (me.tisch || panelTisch));
      if (tt && t) {
        const amTisch = z.spieler.filter(s => s.tisch === t.id).map(s => s.id).sort();
        const i = Math.max(0, amTisch.indexOf(ich)) % tt.sitze.length;
        const s = tt.sitze[i];
        pos.x += (t.x + s.x - pos.x) * Math.min(1, dt * 8); pos.z += (t.z + s.z - pos.z) * Math.min(1, dt * 8);
        pos.r = Math.atan2(t.x - pos.x, t.z - pos.z);
        pos.tempo = 0;
      }
      return;
    }
    if (z.phase !== 'tag' || menueOffen || chatOffen || pfandOffen) { pos.tempo = 0; return; }
    let vx = 0, vz = 0;
    if (tasten.has('w') || tasten.has('arrowup')) vz += 1;
    if (tasten.has('s') || tasten.has('arrowdown')) vz -= 1;
    if (tasten.has('a') || tasten.has('arrowleft')) vx += 1;
    if (tasten.has('d') || tasten.has('arrowright')) vx -= 1;
    if (stick.id != null) { vx = -stick.x; vz = -stick.y; }
    if (tasten.has('q')) pos.yaw += dt * 2.2;
    if (tasten.has('r')) pos.yaw -= dt * 2.2;
    const l = Math.hypot(vx, vz);
    let tempo = 4.6 * (me.pfand.schuhe ? 0.5 : 1) * (me.eff.espresso ? 1.6 : 1);
    if (me.eff.drink) { vx += Math.sin(performance.now() / 400) * 0.35 * (l > 0 ? 1 : 0); }
    if (l > 0.05) {
      const s = Math.min(1, l);
      const nx = vx / l, nz = vz / l;
      const wx = Math.sin(pos.yaw) * nz + Math.cos(pos.yaw) * nx, wz = Math.cos(pos.yaw) * nz - Math.sin(pos.yaw) * nx;
      let x = pos.x + wx * tempo * s * dt, zz = pos.z + wz * tempo * s * dt;
      const H = hindernisse();
      for (const k of H.kreise) { const dx = x - k.x, dz = zz - k.z, d = Math.hypot(dx, dz); if (d < k.r && d > 0.001) { x = k.x + dx / d * k.r; zz = k.z + dz / d * k.r; } }
      for (const b of H.kaesten) if (x > b.x0 - 0.35 && x < b.x1 + 0.35 && zz > b.z0 - 0.35 && zz < b.z1 + 0.35) {
        const wege = [[b.x0 - 0.35 - x, 0], [b.x1 + 0.35 - x, 0], [0, b.z0 - 0.35 - zz], [0, b.z1 + 0.35 - zz]];
        wege.sort((a, c) => Math.abs(a[0] + a[1]) - Math.abs(c[0] + c[1]));
        x += wege[0][0]; zz += wege[0][1];
      }
      x = Math.max(-L.RAUM.x + 0.4, Math.min(L.RAUM.x - 0.4, x)); zz = Math.max(-L.RAUM.z + 0.4, Math.min(L.RAUM.z - 0.4, zz));
      pos.x = x; pos.z = zz;
      pos.r = Math.atan2(wx, wz);
      pos.tempo = s * (tempo / 4.6);
    } else pos.tempo = 0;
  }
  function positionSenden() {
    const jetzt = performance.now();
    if (jetzt - posZeit < 100) return;
    const k = `${pos.x.toFixed(2)},${pos.z.toFixed(2)},${pos.r.toFixed(2)}`;
    if (k === letztePos && jetzt - posZeit < 1000) return;
    letztePos = k; posZeit = jetzt;
    senden({ t:'p', x:+pos.x.toFixed(2), z:+pos.z.toFixed(2), r:+pos.r.toFixed(2) });
  }

  /* ================= Hauptschleife ================= */
  let zuletzt = performance.now();
  function schleife() {
    requestAnimationFrame(schleife);
    const jetzt = performance.now(), dt = Math.min(0.05, (jetzt - zuletzt) / 1000); zuletzt = jetzt;
    if (!welt) return;
    if (z && !$('hud').hidden) {
      bewegen(dt);
      positionSenden();
      welt.figurZiel(ich, pos.x, pos.z, pos.r, true);
      umsehen();
      const hw = $('hinweis');
      if (naechstes && !panelTisch && !pfandOffen) {
        hw.hidden = false;
        const txt = naechstes.art === 'pfand' ? '💍 Pfandhaus' : `${S.G[naechstes.t.art].icon} ${S.G[naechstes.t.art].name} spielen`;
        hw.innerHTML = (istTouch ? '' : '<kbd>E</kbd>') + txt;
      } else hw.hidden = true;
      uhrZeichnen();
      if (panel) { panel.frame(dt); }
      schweberZeichnen();
    }
    // Kamera
    let kamera = null, laune = null;
    if (z && z.phase === 'abrechnung') { kamera = { x:0, y:2.3, z:-5.6, lx:0, ly:1.0, lz:-10.8 }; laune = z.abrechnung && z.abrechnung.bezahlt ? 'freude' : 'wut'; }
    else if (z && (z.phase === 'laden' || z.phase === 'finale' || z.phase === 'finalwurf' || z.phase === 'ende')) { kamera = { x:Math.sin(jetzt / 9000) * 4, y:3, z:-4.5, lx:0, ly:2, lz:-10.8 }; }
    else if (z && panelTisch) {
      const t = z.tische.find(x => x.id === panelTisch);
      if (t) {
        const dx = pos.x - t.x, dz = pos.z - t.z, d = Math.hypot(dx, dz) || 1;
        const breit = innerWidth > 760;
        const seit = breit ? 0.9 : 0;    // Tisch etwas nach links rücken, rechts ist das Panel
        // Breit: Tisch links neben dem Panel. Schmal (Panel unten): steil von oben, Tisch im oberen Drittel
        kamera = breit
          ? { x:t.x + dx / d * 4.6 + (dz / d) * seit, y:3.7, z:t.z + dz / d * 4.6 - (dx / d) * seit, lx:t.x + (dz / d) * seit * 0.9, ly:1.1, lz:t.z - (dx / d) * seit * 0.9 }
          : { x:t.x + dx / d * 4.4, y:4.2, z:t.z + dz / d * 4.4, lx:t.x + dx / d * 2.0, ly:0, lz:t.z + dz / d * 2.0 };
      }
    } else if (z) kamera = welt.kameraZiel(pos.x, pos.z, pos.yaw, kamAbstand, 3.9, { x:pos.x + Math.sin(pos.yaw) * 2.2, y:1.1, z:pos.z + Math.cos(pos.yaw) * 2.2 });
    else kamera = { x:Math.sin(jetzt / 6000) * 9, y:4.5, z:Math.cos(jetzt / 6000) * 6, lx:0, ly:1, lz:0 };
    const me = meinSp();
    const sofort = kameraSprung && !!z; kameraSprung = false;
    welt.rendern(dt, { ich, meinTisch:panelTisch, kameraSofort:sofort, tempo:pos.tempo, kamera, tischInfo, z, zeit:zeitJetzt(), donLaune:laune, betrunken:me && me.eff.drink });
  }

  /* ================= Start ================= */
  function los() {
    try {
      welt = KHWelt.Welt(cv);
      welt.grafik(einst.grafik);
      welt.etageBauen(0); letzteEtage = 0;
      // Deko-Tische fürs Menü
      const deko = ['roulette', 'slots', 'blackjack', 'rad', 'muenze', 'plinko', 'slots', 'rakete'].map((art, i) => ({ id:'deko' + i, art, x:L.PLAETZE[i].x, z:L.PLAETZE[i].z, max:0 }));
      welt.tischeSetzen(deko);
    } catch (e) {
      $('lade').textContent = 'Dein Browser kann leider kein 3D (WebGL). ' + e.message;
      return;
    }
    menueAufbauen();
    $('lade').hidden = true;
    schirm('menue');
    requestAnimationFrame(schleife);
    // Nach dem Neuladen automatisch zurück in den Raum (Code und Schlüssel liegen im Sitzungsspeicher)
    let code = null, token = null;
    try { code = sessionStorage.getItem('kredithai.raum'); token = sessionStorage.getItem('kredithai.token'); } catch (_) { /* egal */ }
    if (code && token) starte('online', { t:'beitreten', code });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(los, los); else los();
  // Für Tests in der Konsole
  window.kredithai = { get z() { return z; }, get ich() { return ich; }, pos, aktion, senden, get welt() { return welt; }, starte, spiel:() => verbindung && verbindung.spiel && verbindung.spiel() };
})();

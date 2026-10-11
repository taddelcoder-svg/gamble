'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { raeume } = require('../raeume.js');

function client(R, name, tier) {
  const c = { inbox:[], name };
  c.transport = { send:t => c.inbox.push(JSON.parse(t)), close:() => { c.zu = true; } };
  c.v = R.verbinden(c.transport);
  c.senden = d => c.v.nachricht(JSON.stringify(d));
  c.letzte = t => [...c.inbox].reverse().find(m => m.t === t);
  c.senden({ t:'hallo', name, tier });
  return c;
}

test('Raum erstellen, beitreten, starten, spielen', () => {
  let uhr = 0;
  const R = raeume({ jetzt:() => uhr, seed:() => 42 });
  const a = client(R, 'Anna', 'loewe'), b = client(R, 'Ben', 'loewe');
  a.senden({ t:'neu', einst:{ laenge:'kurz', tagDauer:180 } });
  const code = a.letzte('raum').code;
  assert.match(code, /^[A-Z2-9]{4}$/);
  b.senden({ t:'beitreten', code });
  const r = b.letzte('raum');
  assert.strictEqual(r.mitglieder.length, 2);
  assert.notStrictEqual(r.mitglieder[0].tier, r.mitglieder[1].tier, 'Tiere müssen verschieden sein');
  b.senden({ t:'start' });                       // nur der Host darf starten
  assert.strictEqual(b.letzte('raum').phase, 'lobby');
  a.senden({ t:'start' });
  assert.strictEqual(a.letzte('raum').phase, 'spiel');
  assert.strictEqual(a.letzte('z').z.phase, 'laden');
  a.senden({ t:'a', b:{ a:'bereit', an:true } });
  b.senden({ t:'a', b:{ a:'bereit', an:true } });
  uhr += 200; R.takt();
  const z = a.letzte('z').z;
  assert.strictEqual(z.phase, 'tag');
  assert.strictEqual(z.laenge, 'kurz');
  assert.ok(a.letzte('pos').p.length === 2);
  // An einen Tisch und setzen
  const t = z.tische.find(x => x.art === 'muenze');
  a.senden({ t:'p', x:t.x, z:t.z + 1.5, r:0 });
  a.senden({ t:'a', b:{ a:'sitzen', tisch:t.id } });
  a.senden({ t:'a', b:{ a:'spiel', z:{ a:'setzen', seite:'kopf', einsatz:50 } } });
  uhr += 200; R.takt();
  const nach = a.letzte('z').z;
  assert.strictEqual(nach.spieler.find(s => s.name === 'Anna').tisch, t.id);
  // Fehler gehen nur an den Verursacher
  b.inbox = []; a.inbox = [];
  b.senden({ t:'a', b:{ a:'spiel', z:{ a:'setzen' } } });
  uhr += 200; R.takt();
  assert.ok(b.inbox.some(m => m.t === 'ev' && m.e.some(e => e.e === 'fehler')));
  assert.ok(!a.inbox.some(m => m.t === 'ev' && m.e.some(e => e.e === 'fehler')));
});

test('Wiederverbinden mit Token, Host wechselt, Weggebliebene fliegen raus', () => {
  let uhr = 0;
  const R = raeume({ jetzt:() => uhr });
  const a = client(R, 'Anna', 'fuchs'), b = client(R, 'Ben', 'hase');
  a.senden({ t:'neu' });
  const code = a.letzte('raum').code;
  b.senden({ t:'beitreten', code });
  a.senden({ t:'start' });
  const token = a.letzte('du').token;
  a.v.getrennt();
  assert.strictEqual(b.letzte('raum').host, b.letzte('raum').du, 'Ben ist jetzt Host');
  // Neu verbinden
  const a2 = { inbox:[] };
  a2.v = R.verbinden({ send:t => a2.inbox.push(JSON.parse(t)) });
  a2.v.nachricht(JSON.stringify({ t:'hallo', name:'Anna', tier:'fuchs', token, raum:code }));
  const raum = [...a2.inbox].reverse().find(m => m.t === 'raum');
  assert.strictEqual(raum.mitglieder.length, 2);
  assert.ok(raum.mitglieder.every(m => m.online));
  // Ben verschwindet für länger als die Wartezeit
  b.v.getrennt();
  uhr += 100_000; R.takt();
  const z = [...a2.inbox].reverse().find(m => m.t === 'z').z;
  assert.strictEqual(z.spieler.length, 1);
});

test('Volle Räume und unbekannte Codes', () => {
  const R = raeume();
  const a = client(R, 'A', 'loewe');
  a.senden({ t:'beitreten', code:'ZZZZ' });
  assert.ok(a.letzte('fehler'));
  a.senden({ t:'neu' });
  const code = a.letzte('raum').code;
  const andere = [];
  for (let i = 0; i < 6; i++) { const c = client(R, 'X' + i, 'loewe'); c.senden({ t:'beitreten', code }); andere.push(c); }
  assert.strictEqual(a.letzte('raum').mitglieder.length, 6);
  assert.ok(andere[5].letzte('fehler'));
});

'use strict';
// Balance-Test: viele Bot-Läufe, Erfolgsquote je Tag und Enden.  node test/balance.js [läufe] [spieler] [mut]
const { laufSpielen } = require('./bots.js');
const n = +process.argv[2] || 40, spieler = +process.argv[3] || 2, mut = +process.argv[4] || 0.3;
const laenge = process.argv[5] || 'normal';
const enden = {}, proTag = {};
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  const e = laufSpielen({ seed:1000 + i, spieler, mut, laenge });
  enden[e.ende] = (enden[e.ende] || 0) + 1;
  for (const t of e.tage) { const p = proTag[t.tag] || (proTag[t.tag] = { ok:0, n:0 }); p.n++; if (t.bezahlt) p.ok++; }
}
console.log(`${n} Läufe, ${spieler} Bots, mut ${mut}, ${laenge} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
console.log('Enden:', enden);
console.log('Tag: erreicht / bezahlt');
for (const t in proTag) console.log(`  ${String(t).padStart(2)}: ${String(proTag[t].n).padStart(4)}  ${Math.round(100 * proTag[t].ok / proTag[t].n)} %`);

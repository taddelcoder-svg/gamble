# Kredithai

Casino-Koop im Browser, angelehnt an das Prinzip von „Gamble With Your Friends" – mit eigenem Namen, eigenen Figuren und nur Spielgeld.

Ihr schuldet dem Hai-Boss **Don Flosse** über eine Million. Jeden Morgen gibt er euch Jetons auf Pump, jeden Abend will er seine Rate. Alle teilen sich **ein Konto** – eine falsche Wette ruiniert alle. Drei Mahnungen, und ihr putzt für immer sein Aquarium.

- **Solo** (läuft komplett im Browser) oder **online bis 6 Leute** (Raum-Code oder Einladungslink `/?raum=CODE`)
- **17 Glücksspiele**: Münzwurf, Roulette, Blackjack, Bandit, Hi-Lo, Straßenwürfel, Rubbellos, Hütchenspiel, Plinko, Minenfeld, Glücksrad, Video-Poker, Rakete (Crash), Drachenturm, Baccarat, Keno, Entenrennen
- **4 Etagen**: Die Spelunke → Neon-Palast → Korallen-Lounge → Goldenes Penthouse; jede Etage bringt neue Spiele, die Tische werden jeden Tag neu verteilt
- **16 Items** aus Onkel Ottos Ramschladen (Goldener Chip, Glücksstatue, Röntgenbrille, Winkekatze, Kristallkugel, Ratto die Ratte …), bezahlt mit gemeinsamen Tickets
- **Herausforderungen** pro Tag bringen Geld und Tickets
- **Pfandhaus Elster**: Schuhe, Brille, Uhr und Hose verpfänden – mit lustigen Nachteilen
- **3 Enden**: Aquarium, Schuldenfrei oder – nach „Doppelt oder nichts" – das Casino gehört euch

## Starten

```bash
npm install
npm start          # http://localhost:11100
npm test           # Regeln, Items, Räume (node --test)
npm run balance    # Bot-Läufe: Erfolgsquote je Tag
```

Ohne `ZUGANG_PASSWORT` läuft das Spiel lokal ohne Passwort. Auf Render ist es ohne Passwort gesperrt.

## Aufbau

| Datei | Inhalt |
|---|---|
| `js/spiele.js` | Regeln aller 17 Spiele (rein, deterministisch, UMD – Browser und Server) |
| `js/logik.js` | Der Lauf: Konto, Raten, Jetons, Etagen, Tische, Items, Pfand, Herausforderungen, Enden |
| `raeume.js` | Online-Räume (Code, Host, Wiederverbinden, 10-Hz-Takt) |
| `server.js` | Auslieferung, WebSocket `/ws`, Passwortsperre (`zugang.js`) |
| `js/welt.js`, `js/figuren.js` | 3D-Casino mit three.js r128 (selbst ausgeliefert) |
| `js/tische.js` | Bedienfelder der Spieltische |
| `js/spiel.js` | Menüs, Steuerung, HUD, Dialoge |
| `test/` | Unit-Tests, Bots (`bots.js`) und Balance-Test |

Debug in der Konsole (Solo): `kredithai.spiel()` gibt den laufenden Lauf zurück, z. B. `kredithai.spiel().bank = 50000`.

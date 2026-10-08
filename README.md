# Drill & Tap · Team Kori (LOCAL ONLY — not pushed)

Static PWA: tap drill + % thread, rigid tap (Fanuc G84), drill speeds & feeds, Convert, DEMO $ cost panel.
Open `index.html` via any static server (`python3 -m http.server`). Tests: `node test/run-tests.js`.
Deep link a thread: `index.html#t=NPT-1/2`.

Files: `data.js` (all numbers + sources), `calc.js` (pure math), `app.js` (DOM), `styles.css`
(Maria's mock variables/classes), `manifest.webmanifest`, `icon.svg` + `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`.

## Threads (one flat list, `THREAD_LIST`, 186 entries)
UNC #1–2", UNF #0–1-1/2", UNEF #12–1-11/16, ISO coarse M1–M64, ISO fine M2.5–M64,
NPT 1/16–2 (taper), BSPT/Rc 1/8–2 (taper), BSPP/G 1/8–2 (parallel). Pipe threads use the
published table drill (no % formula), status amber. Tapered entries store `taper: 1/16`,
`taperHalfAngleDeg` (1°47'24"), `L1`/`L2` (inches; BSPT also `L1Mm`/`L2Mm`).

Sources: ASME B1.1, ISO 261/262, ASME B1.20.1 Table 2 (via Engineers Edge, threadspec.org,
Unified Alloys, Machining Doctor, Premsa), ISO 7-1:1994 Table 1 (ISO sample PDF, CPP-Prema,
Engineering ToolBox), ISO 228-1 (Engineers Edge), Rc tap drills (Machining Doctor, Cadfinity).
Speed/feed sources are listed in the `data.js` header.

## Thread picker
Type-to-search sheet (`Picker` in `app.js`) drives the hidden `<select id="thread">`, which stays the
source of truth. Searches label, series, id and major Ø (`1/4-20`, `m6`, `1/2 npt`, `.375`); Inch / Metric /
Pipe filter; Recent (last 4, localStorage) + Most used pinned. Keyboard: arrows, Enter, Esc; focus trapped.

## Cross-section
Teal = thread form, copper = drill wall / taper pitch line, gold = L1 gauge plane (label centred in the bore,
off the teeth). Taper tooth count follows real threads across L2. Cache-bust tag: `?v=mf1`.

/**
 * Team Kori — Drill & Tap · reference data
 * ---------------------------------------------------------------------------
 * Pure data. No math lives here except tiny generators for drill size lists.
 * Loads in the browser as window.DT_DATA and in Node via require("./data.js").
 *
 * SOURCES (fetched & read Oct 7 2026 — every speed/feed number below is copied
 * from one of these; nothing is invented. Where a source has no row, we leave
 * it out and the app says "no published starting value").
 *
 *  THREADS
 *   [UTS]   ASME B1.1 Unified inch series (UNC/UNF) — major dia & TPI, cross-checked
 *           against Machinery's Handbook 29 p.1816 table as reproduced on
 *           en.wikipedia.org/wiki/Unified_Thread_Standard.
 *   [ISO]   ISO 261 / ISO 262 metric coarse & fine pitches, cross-checked against
 *           en.wikipedia.org/wiki/ISO_metric_screw_thread.
 *   [NPT]   ASME B1.20.1 Table 2 (TPI, OD, L1 hand-tight, L2 effective) via Engineers Edge,
 *           threadspec.org, Unified Alloys, Machining Doctor, Premsa; tap drills Haas Shop Notes
 *           + pipe-tap maker charts (see THREADS section).
 *   [BSPT]  ISO 7-1:1994 Table 1 (gauge dia, gauge length, useful thread) via ISO sample PDF,
 *           CPP-Prema BSPT table, Engineering ToolBox; Rc tap drills Machining Doctor / Cadfinity.
 *   [BSPP]  ISO 228-1 G parallel pipe via Engineers Edge / threadspec.org.
 *
 *  DRILL SIZES
 *   [B94]   ASME B94.11M number & letter drill diameters, cross-checked against
 *           en.wikipedia.org/wiki/Drill_bit_sizes (test/run-tests.js spot-checks this).
 *
 *  TAP-DRILL FORMULAS (see calc.js)
 *   Haas "Shop Notes — Machinist's CNC Reference Guide" (tapping formulas page);
 *   Jarvis Cutting Tools "Forming: Tap Drill Sizes" (0.0068 and /147.06, 1/4-20 → #1);
 *   PMT "Technical Guide — Machining Formulas" (0.0130/TPI, /76.98, /147.06);
 *   MSC Industrial "Thread Forming Taps Technical Information".
 *
 *  DRILL SPEEDS & FEEDS
 *   [MORSE] Morse Cutting Tools catalog p.88–89: "High Speed Steel & Cobalt Drills —
 *           Speed and Feed Recommendations" and "Solid Carbide Drills" (List 5374/5375/5376).
 *           "Suggested starting points only… Start conservatively."
 *   [RED]   Redline Tools catalog p.340 "Cobalt & HSS Drills Speeds & Feeds"
 *           (separate HSS / HSS-HD / Cobalt SFM columns; IPR ranges by diameter).
 *   [TRU]   Tru-Edge "Solid Carbide Drills Feeds and Speeds" (SFM + IPR by diameter).
 *   [HAASID] Haas Tooling "Indexable Drills, Speeds and Feeds, Inch" (ISO groups,
 *           min / starting / max SFM, IPR by insert size A–H, 4×D / 5×D reductions).
 *   [HARVEY] Harvey Tool "Speeds & Feeds — Miniature Drills" (series 200xx–204xx, 7036xx,
 *           8100xx–8102xx), 1-page PDF SF_20000 (Feb 2025), uncoated carbide, Ø .015–.250":
 *           https://harveyperformance.widen.net/content/ss7jrgaq3k/pdf/SF_20000.pdf
 *           SECOND SOURCE ONLY (Oct 7 2026 cross-check, dt-research/harvey-feeds.md): never
 *           feeds the min/max math. Cited as "also Harvey Tool" only where its printed number
 *           falls inside the range the app already shows (see HARVEY_DRILL + band.harvey).
 *
 *  TAP SPEEDS
 *   [HAAST] Haas Tooling "High Performance Taps Recommendation Table" (HSS uncoated SFM).
 *   [OSG]   OSG "Tap Technical Guide" Table 21 "Standard Cutting Speed" (m/min →
 *           converted to SFM ×3.2808). Spiral-tap column used for cut taps
 *           (hand-tap column for gray iron, where spiral is "–"), form-tap column for form.
 *   [G395]  Gühring "Operating Parameters — Cut Taps" (HSS-E / HSS-E-PM SFM).
 *   [G972]  Gühring "Black ring cut taps" table (aluminium rows incl. solid carbide).
 *   [G921]  Gühring "Form Taps" (HSS-E / HSS-E-PM / solid carbide SFM).
 *   [EMU]   Emuge "Hardened Steel & Cast Iron" A-H taps (solid carbide SFM, cast iron rows).
 *
 *  HARDNESS
 *   [E140]  HRC → HB (3000 kgf, carbide ball) approximate conversion for steel,
 *           ASTM E140 values; spot-checked against Micro100 drill chart bands
 *           (≤28 HRC = ≤271 HB, 29–37 HRC = 279–344 HB, 38–45 HRC = 353–421 HB).
 *
 * HOW THE APP PICKS A NUMBER (conservative):
 *   SFM default  = LOWEST value any listed source gives for that combo.
 *   IPR default  = LOWER of the sources at that drill diameter.
 *   "Aggressive" = HIGHEST published value — shown as info only, never applied.
 *   Hardness past a source's band → derate (see DERATE) or block. Never raised.
 * ---------------------------------------------------------------------------
 */
(function (root) {
  "use strict";

  const M_TO_SFM = 3.2808; // m/min → ft/min
  const m = (a, b) => [Math.round(a * M_TO_SFM), Math.round(b * M_TO_SFM)];

  // ------------------------------------------------------------------ THREADS
  // ONE flat list. Fields:
  //   id, label, series, system:'inch'|'metric', major (in for inch, mm for metric),
  //   tpi (inch) or pitch (mm), type:'parallel'|'taper', pipe:bool, common:bool,
  //   tapDrillTable (pipe threads only: published drill sizes, first = primary).
  //   Tapered (NPT, BSPT): taper 1/16 on diameter, taperHalfAngleDeg 1.79 (1°47'24"),
  //   L1 / L2 in inches (BSPT also L1Mm / L2Mm) so a diagram can mark the gauge plane.
  //   BSPP (G, ISO 228) is PARALLEL — table drill, no % formula (55° Whitworth form).
  //
  // [UTS] UNC #1–2", UNF #0–1-1/2", UNEF #12–1-11/16 — ASME B1.1 basic major dia & TPI.
  //       Cross-checked: Machinery's Handbook table via Wikipedia "Unified Thread Standard";
  //       UNEF list vs Gage Crib "UNEF Screw Threads per ANSI B1.1", Micro Components and
  //       threadspec.org UNEF chart. (1-3/16-18 is on threadspec + ASME list but missing
  //       from the Gage Crib page — kept, flagged in report.)
  // [ISO] ISO 261 coarse M1–M64 (Wikipedia ISO metric screw thread table, Haas Shop Notes);
  //       fine = ISO 262 selected fine pitches M2.5–M64 + common ISO 261 shop fines.
  // [NPT] ASME B1.20.1 NPT 1/16–2: TPI, pipe OD (ASME B36.10). Tap drills (no reamer):
  //       Haas Shop Notes "Pipe Thread Sizes"; FinePowerTools & Wade NPT charts; Tapco,
  //       Sowa, Carbide Depot pipe-tap charts. Reamed sizes: Carbide Depot.
  // [BSPT] ISO 7-1 R (external) / Rc (internal taper) 1/8–2 — see BSPT array below.
  // [BSPP] ISO 228-1 G 1/8–2: major dia (mm) & TPI, tap drill — Engineers Edge
  //       "Whitworth BS Pipe Thread … DIN/ISO 228"; alternates from threadspec.org.
  const COMMON = new Set([
    "UNC-#4-40", "UNC-#6-32", "UNC-#8-32", "UNC-#10-24", "UNF-#10-32", "UNC-1/4-20", "UNF-1/4-28",
    "UNC-5/16-18", "UNC-3/8-16", "UNC-1/2-13", "M3x0.5", "M4x0.7", "M5x0.8", "M6x1", "M8x1.25",
    "M10x1.5", "M12x1.75", "NPT-1/8", "NPT-1/4",
  ]);

  // label, major (in)
  const INCH_SIZE = {
    "#0": 0.0600, "#1": 0.0730, "#2": 0.0860, "#3": 0.0990, "#4": 0.1120, "#5": 0.1250, "#6": 0.1380,
    "#8": 0.1640, "#10": 0.1900, "#12": 0.2160,
  };
  function fracVal(s) { // "1-1/8" → 1.125, "7/16" → 0.4375, "2" → 2
    let whole = 0, f = s;
    if (s.indexOf("-") > 0) { const p = s.split("-"); whole = +p[0]; f = p[1]; }
    else if (s.indexOf("/") < 0) return +s;
    const [n, d] = f.split("/").map(Number);
    return whole + n / d;
  }
  const majorOf = (size) => (size in INCH_SIZE ? INCH_SIZE[size] : fracVal(size));
  const tpiLabel = (tpi) => (tpi === 4.5 ? "4-1/2" : tpi === 11.5 ? "11-1/2" : String(tpi));

  // [UTS] series lists: [size, tpi]
  const UNC = [["#1", 64], ["#2", 56], ["#3", 48], ["#4", 40], ["#5", 40], ["#6", 32], ["#8", 32], ["#10", 24], ["#12", 24],
    ["1/4", 20], ["5/16", 18], ["3/8", 16], ["7/16", 14], ["1/2", 13], ["9/16", 12], ["5/8", 11], ["3/4", 10], ["7/8", 9],
    ["1", 8], ["1-1/8", 7], ["1-1/4", 7], ["1-3/8", 6], ["1-1/2", 6], ["1-3/4", 5], ["2", 4.5]];
  const UNF = [["#0", 80], ["#1", 72], ["#2", 64], ["#3", 56], ["#4", 48], ["#5", 44], ["#6", 40], ["#8", 36], ["#10", 32],
    ["#12", 28], ["1/4", 28], ["5/16", 24], ["3/8", 24], ["7/16", 20], ["1/2", 20], ["9/16", 18], ["5/8", 18], ["3/4", 16],
    ["7/8", 14], ["1", 12], ["1-1/8", 12], ["1-1/4", 12], ["1-3/8", 12], ["1-1/2", 12]];
  const UNEF = [["#12", 32], ["1/4", 32], ["5/16", 32], ["3/8", 32], ["7/16", 28], ["1/2", 28], ["9/16", 24], ["5/8", 24],
    ["11/16", 24], ["3/4", 20], ["13/16", 20], ["7/8", 20], ["15/16", 20], ["1", 20], ["1-1/16", 18], ["1-1/8", 18],
    ["1-3/16", 18], ["1-1/4", 18], ["1-5/16", 18], ["1-3/8", 18], ["1-7/16", 18], ["1-1/2", 18], ["1-9/16", 18],
    ["1-5/8", 18], ["1-11/16", 18]];

  // [ISO] coarse [d, P]
  const ISO_COARSE = [[1, 0.25], [1.2, 0.25], [1.4, 0.3], [1.6, 0.35], [1.8, 0.35], [2, 0.4], [2.5, 0.45], [3, 0.5],
    [3.5, 0.6], [4, 0.7], [5, 0.8], [6, 1.0], [7, 1.0], [8, 1.25], [10, 1.5], [12, 1.75], [14, 2.0], [16, 2.0],
    [18, 2.5], [20, 2.5], [22, 2.5], [24, 3.0], [27, 3.0], [30, 3.5], [33, 3.5], [36, 4.0], [39, 4.0], [42, 4.5],
    [45, 4.5], [48, 5.0], [52, 5.0], [56, 5.5], [60, 5.5], [64, 6.0]];
  // ISO 262 selected fine pitches (Wikipedia table) M2.5–M64
  const ISO_FINE_262 = [[2.5, 0.35], [3, 0.35], [3.5, 0.35], [4, 0.5], [5, 0.5], [6, 0.75], [7, 0.75], [8, 1.0], [8, 0.75],
    [10, 1.25], [10, 1.0], [12, 1.5], [12, 1.25], [14, 1.5], [16, 1.5], [18, 2.0], [18, 1.5], [20, 2.0], [20, 1.5],
    [22, 2.0], [22, 1.5], [24, 2.0], [27, 2.0], [30, 2.0], [33, 2.0], [36, 3.0], [39, 3.0], [42, 3.0], [45, 3.0],
    [48, 3.0], [52, 4.0], [56, 4.0], [60, 4.0], [64, 4.0]];
  // Extra ISO 261 fines common in shops (not in the ISO 262 short list)
  const ISO_FINE_SHOP = [[10, 0.75], [12, 1.0], [14, 1.25], [16, 1.0], [18, 1.0], [20, 1.0], [24, 1.5], [27, 1.5],
    [30, 1.5], [36, 1.5], [36, 2.0]];

  // [NPT] [size, tpi, pipe OD in, drill table (no reamer, primary first), reamed drill, L1 in, L2 in]
  // L1 = hand-tight engagement (= L1 gauge length), L2 = effective thread length, ASME B1.20.1
  // Table 2 — cross-checked: Engineers Edge "Taper Pipe Threads", threadspec.org, Unified Alloys,
  // Machining Doctor, Premsa NPT chart. (Unified Alloys prints 1-1/2 L1 as 0.402 — a typo; its
  // own thread count 4.83 × 1/11.5 = 0.420, which the other sources list.)
  const F = (label) => ({ label, d: fracVal(label.replace('"', "")) });
  const L = (label, d) => ({ label, d });
  const NPT = [
    ["1/16", 27, 0.3125, [L("D", 0.246), L("C", 0.242)], F("15/64"), 0.160, 0.2611],
    ["1/8", 27, 0.405, [L("Q", 0.332), F("11/32"), L("R", 0.339)], F("21/64"), 0.1615, 0.2639],
    ["1/4", 18, 0.540, [F("7/16")], F("27/64"), 0.2278, 0.4018],
    ["3/8", 18, 0.675, [F("37/64"), F("9/16")], F("9/16"), 0.240, 0.4078],
    ["1/2", 14, 0.840, [F("23/32"), F("45/64")], F("11/16"), 0.320, 0.5337],
    ["3/4", 14, 1.050, [F("59/64"), F("29/32")], F("57/64"), 0.339, 0.5457],
    ["1", 11.5, 1.315, [F("1-5/32"), F("1-9/64")], F("1-1/8"), 0.400, 0.6828],
    ["1-1/4", 11.5, 1.660, [F("1-1/2"), F("1-31/64")], F("1-15/32"), 0.420, 0.7068],
    ["1-1/2", 11.5, 1.900, [F("1-47/64"), F("1-23/32")], F("1-23/32"), 0.420, 0.7235],
    ["2", 11.5, 2.375, [F("2-7/32"), F("2-13/64")], F("2-3/16"), 0.436, 0.7565],
  ];
  // [BSPT] ISO 7-1 Rc (internal taper) 1/8–2: [size, tpi, gauge-plane major mm, gauge length a mm,
  // min useful thread mm, tap drill mm (Machining Doctor BSPT Rc chart), alt drill mm (Cadfinity)].
  // Gauge length & useful length cross-checked: ISO 7-1:1994 sample table, CPP-Prema BSPT table,
  // Engineering ToolBox ISO 7 page.
  const BSPT = [
    ["1/8", 28, 9.728, 4.0, 6.5, 8.4, 8.6], ["1/4", 19, 13.157, 6.0, 9.7, 11.2, 11.5],
    ["3/8", 19, 16.662, 6.4, 10.1, 14.75, 15.0], ["1/2", 14, 20.955, 8.2, 13.2, 18.25, 18.5],
    ["3/4", 14, 26.441, 9.5, 14.5, 23.75, 24.0], ["1", 11, 33.249, 10.4, 16.8, 30.0, 30.5],
    ["1-1/4", 11, 41.910, 12.7, 19.1, 38.5, 39.0], ["1-1/2", 11, 47.803, 12.7, 19.1, 44.5, 45.0],
    ["2", 11, 59.614, 15.9, 23.4, 56.0, 56.7],
  ];
  const TAPER = { ratio: 1 / 16, halfAngleDeg: 1 + 47 / 60 + 24 / 3600 }; // 1:16 on diameter, 1°47'24"
  // [BSPP] [size, tpi, major mm, drill mm (Engineers Edge), alt drill mm (threadspec) or null]
  const BSPP = [
    ["1/8", 28, 9.728, 8.8, null], ["1/4", 19, 13.157, 11.8, null], ["3/8", 19, 16.662, 15.25, null],
    ["1/2", 14, 20.955, 19.0, null], ["5/8", 14, 22.911, 21.0, null], ["3/4", 14, 26.441, 24.5, null],
    ["7/8", 14, 30.201, 28.25, null], ["1", 11, 33.249, 30.75, null], ["1-1/8", 11, 37.897, 35.3, 35.5],
    ["1-1/4", 11, 41.910, 39.25, 39.5], ["1-3/8", 11, 44.325, 41.7, 41.75], ["1-1/2", 11, 47.803, 45.25, null],
    ["1-3/4", 11, 53.746, 51.1, 51.0], ["2", 11, 59.614, 57.0, null],
  ];

  // [NPS] ASME B1.20.1 straight pipe (NPSM mechanical / NPSC coupling) 1/8–2: [size, tpi, pipe OD in,
  //       primary drill (Allied Machine NPS/NPSF tap drill chart), NPSC drill (Tameson pipe-thread
  //       drilled-hole chart)]. NPSM and NPSC need different drills, so both are listed.
  const NPS = [
    ["1/8", 27, 0.405, L("S", 0.348), F("11/32")], ["1/4", 18, 0.540, F("29/64"), F("7/16")],
    ["3/8", 18, 0.675, F("19/32"), F("37/64")], ["1/2", 14, 0.840, F("47/64"), F("23/32")],
    ["3/4", 14, 1.050, F("15/16"), F("59/64")], ["1", 11.5, 1.315, F("1-3/16"), F("1-5/32")],
    ["1-1/4", 11.5, 1.660, F("1-33/64"), F("1-1/2")], ["1-1/2", 11.5, 1.900, F("1-3/4"), F("1-3/4")],
    ["2", 11.5, 2.375, F("2-7/32"), F("2-7/32")],
  ];

  const THREAD_LIST = [];
  const pushInch = (series, list) => list.forEach(([size, tpi]) => {
    const id = series + "-" + size + "-" + tpi;
    THREAD_LIST.push({
      id, label: size + "-" + tpiLabel(tpi) + " " + series, series, system: "inch",
      major: majorOf(size), tpi, type: "parallel", pipe: false, common: COMMON.has(id),
    });
  });
  pushInch("UNC", UNC);
  pushInch("UNF", UNF);
  pushInch("UNEF", UNEF);
  const pushMetric = (series, list, coarse) => list.forEach(([d, p]) => {
    const id = "M" + d + "x" + p;
    if (THREAD_LIST.some((t) => t.id === id)) return;
    THREAD_LIST.push({
      id, label: "M" + d + " × " + p + (coarse ? "" : " fine"), series, system: "metric",
      major: d, pitch: p, type: "parallel", pipe: false, common: COMMON.has(id),
    });
  });
  pushMetric("ISO metric coarse", ISO_COARSE, true);
  pushMetric("ISO metric fine", ISO_FINE_262.concat(ISO_FINE_SHOP).sort((a, b) => a[0] - b[0] || b[1] - a[1]), false);
  NPT.forEach(([size, tpi, od, drills, reamed, L1, L2]) => {
    const id = "NPT-" + size;
    THREAD_LIST.push({
      id, label: size + "-" + tpiLabel(tpi) + " NPT", series: "NPT (taper pipe)", system: "inch",
      major: od, majorIsPipeOD: true, tpi, type: "taper", pipe: true, common: COMMON.has(id),
      standard: "ASME B1.20.1", taper: TAPER.ratio, taperHalfAngleDeg: TAPER.halfAngleDeg,
      L1, L2, L1Name: "hand-tight engagement L1", L2Name: "effective thread length L2",
      tapDrillTable: drills.map((x) => ({ label: x.label, dIn: x.d, note: "no reamer" }))
        .concat([{ label: reamed.label, dIn: reamed.d, note: "with taper pipe reamer" }]),
    });
  });
  BSPT.forEach(([size, tpi, majMm, gauge, useful, drill, alt]) => {
    const id = "Rc-" + size;
    THREAD_LIST.push({
      id, label: "Rc " + size + "-" + tpi + " BSPT", series: "BSPT / Rc (taper pipe)", system: "inch",
      major: majMm / 25.4, majorMm: majMm, tpi, type: "taper", pipe: true, common: false,
      standard: "ISO 7-1", taper: TAPER.ratio, taperHalfAngleDeg: TAPER.halfAngleDeg,
      L1: gauge / 25.4, L2: useful / 25.4, L1Mm: gauge, L2Mm: useful,
      L1Name: "gauge length (gauge plane to small end)", L2Name: "min useful thread length",
      tapDrillTable: [
        { label: drill + " mm", dIn: drill / 25.4, note: "ISO 7-1 Rc table (Machining Doctor)" },
        { label: alt + " mm", dIn: alt / 25.4, note: "alt. table (Cadfinity)" },
      ],
    });
  });
  BSPP.forEach(([size, tpi, majMm, drill, alt]) => {
    const id = "G-" + size;
    const tbl = [{ label: drill + " mm", dIn: drill / 25.4, note: "ISO 228 table (Engineers Edge)" }];
    if (alt) tbl.push({ label: alt + " mm", dIn: alt / 25.4, note: "alt. table (threadspec.org)" });
    THREAD_LIST.push({
      id, label: "G " + size + "-" + tpi + " BSPP", series: "BSPP / G (parallel pipe)", system: "inch",
      major: majMm / 25.4, majorMm: majMm, tpi, type: "parallel", pipe: true, common: false,
      standard: "ISO 228-1", tapDrillTable: tbl,
    });
  });

  NPS.forEach(([size, tpi, od, drill, npsc]) => {
    const id = "NPS-" + size;
    const tbl = [{ label: drill.label, dIn: drill.d, note: "NPS / NPSM (Allied Machine)" }];
    if (Math.abs(npsc.d - drill.d) > 1e-6) tbl.push({ label: npsc.label, dIn: npsc.d, note: "NPSC coupling (Tameson)" });
    THREAD_LIST.push({
      id, label: size + "-" + tpiLabel(tpi) + " NPS", series: "NPS (straight pipe)", system: "inch",
      major: od, majorIsPipeOD: true, tpi, type: "parallel", pipe: true, common: false,
      standard: "ASME B1.20.1", tapDrillTable: tbl,
    });
  });

  // Series order for the grouped <select>
  const THREAD_SERIES = ["UNC", "UNF", "UNEF", "ISO metric coarse", "ISO metric fine", "NPT (taper pipe)",
    "NPS (straight pipe)", "BSPT / Rc (taper pipe)", "BSPP / G (parallel pipe)"];

  // ------------------------------------------------------------- THREAD CLASS
  // [ISO 965-1:2013 Table 2] TD1 minor-diameter tolerance of internal threads, µm, by pitch (mm).
  const TD1 = {
    4: { 0.2: 38, 0.25: 45, 0.3: 53, 0.35: 63, 0.4: 71, 0.45: 80, 0.5: 90, 0.6: 100, 0.7: 112, 0.75: 118, 0.8: 125, 1: 150, 1.25: 170, 1.5: 190, 1.75: 212, 2: 236, 2.5: 280, 3: 315, 3.5: 355, 4: 375, 4.5: 425, 5: 450, 5.5: 475, 6: 500 },
    5: { 0.25: 56, 0.3: 67, 0.35: 80, 0.4: 90, 0.45: 100, 0.5: 112, 0.6: 125, 0.7: 140, 0.75: 150, 0.8: 160, 1: 190, 1.25: 212, 1.5: 236, 1.75: 265, 2: 300, 2.5: 355, 3: 400, 3.5: 450, 4: 475, 4.5: 530, 5: 560, 5.5: 600, 6: 630 },
    6: { 0.3: 85, 0.35: 100, 0.4: 112, 0.45: 125, 0.5: 140, 0.6: 160, 0.7: 180, 0.75: 190, 0.8: 200, 1: 236, 1.25: 265, 1.5: 300, 1.75: 335, 2: 375, 2.5: 450, 3: 500, 3.5: 560, 4: 600, 4.5: 670, 5: 710, 5.5: 750, 6: 800 },
  };

  // ------------------------------------------------------------- CLEARANCE HOLES
  // [Inch] close / free fit drills: UVA physics shop "Clearance Hole Drill Sizes" chart, cross-checked
  //        with NORAMARK and TR Fastenings (#2–1/2 identical). [major in, close, close in, free, free in]
  const CLEAR_IN = [
    [0.060, "#52", 0.0635, "#50", 0.0700], [0.073, "#48", 0.0760, "#46", 0.0810], [0.086, "#43", 0.0890, "#41", 0.0960],
    [0.099, "#37", 0.1040, "#35", 0.1100], [0.112, "#32", 0.1160, "#30", 0.1285], [0.125, "#30", 0.1285, "#29", 0.1360],
    [0.138, "#27", 0.1440, "#25", 0.1495], [0.164, "#18", 0.1695, "#16", 0.1770], [0.190, "#9", 0.1960, "#7", 0.2010],
    [0.216, "#2", 0.2210, "#1", 0.2280], [0.25, "F", 0.2570, "H", 0.2660], [0.3125, "P", 0.3230, "Q", 0.3320],
    [0.375, "W", 0.3860, "X", 0.3970], [0.4375, "29/64", 29 / 64, "15/32", 15 / 32], [0.5, "33/64", 33 / 64, "17/32", 17 / 32],
    [0.5625, "37/64", 37 / 64, "19/32", 19 / 32], [0.625, "41/64", 41 / 64, "21/32", 21 / 32], [0.6875, "45/64", 45 / 64, "23/32", 23 / 32],
    [0.75, "49/64", 49 / 64, "25/32", 25 / 32], [0.8125, "53/64", 53 / 64, "27/32", 27 / 32], [0.875, "57/64", 57 / 64, "29/32", 29 / 32],
    [0.9375, "61/64", 61 / 64, "31/32", 31 / 32], [1, "1-1/64", 1 + 1 / 64, "1-1/32", 1 + 1 / 32],
  ];
  // [ISO 273:1979] metric clearance holes, mm: [thread Ø, fine (close), medium (free)]
  const CLEAR_MM = [
    [1, 1.1, 1.2], [1.2, 1.3, 1.4], [1.4, 1.5, 1.6], [1.6, 1.7, 1.8], [1.8, 2, 2.1], [2, 2.2, 2.4], [2.5, 2.7, 2.9],
    [3, 3.2, 3.4], [3.5, 3.7, 3.9], [4, 4.3, 4.5], [5, 5.3, 5.5], [6, 6.4, 6.6], [7, 7.4, 7.6], [8, 8.4, 9],
    [10, 10.5, 11], [12, 13, 13.5], [14, 15, 15.5], [16, 17, 17.5], [18, 19, 20], [20, 21, 22], [22, 23, 24],
    [24, 25, 26], [27, 28, 30], [30, 31, 33], [33, 34, 36], [36, 37, 39], [39, 40, 42], [42, 43, 45], [45, 46, 48],
    [48, 50, 52], [52, 54, 56], [56, 58, 62], [60, 62, 66], [64, 66, 70],
  ];

  // ------------------------------------------------------------- DRILL SIZES
  // [B94] Number drills #1–#80 (in)
  const NUMBER_DRILLS = {
    1: 0.2280, 2: 0.2210, 3: 0.2130, 4: 0.2090, 5: 0.2055, 6: 0.2040, 7: 0.2010, 8: 0.1990,
    9: 0.1960, 10: 0.1935, 11: 0.1910, 12: 0.1890, 13: 0.1850, 14: 0.1820, 15: 0.1800,
    16: 0.1770, 17: 0.1730, 18: 0.1695, 19: 0.1660, 20: 0.1610, 21: 0.1590, 22: 0.1570,
    23: 0.1540, 24: 0.1520, 25: 0.1495, 26: 0.1470, 27: 0.1440, 28: 0.1405, 29: 0.1360,
    30: 0.1285, 31: 0.1200, 32: 0.1160, 33: 0.1130, 34: 0.1110, 35: 0.1100, 36: 0.1065,
    37: 0.1040, 38: 0.1015, 39: 0.0995, 40: 0.0980, 41: 0.0960, 42: 0.0935, 43: 0.0890,
    44: 0.0860, 45: 0.0820, 46: 0.0810, 47: 0.0785, 48: 0.0760, 49: 0.0730, 50: 0.0700,
    51: 0.0670, 52: 0.0635, 53: 0.0595, 54: 0.0550, 55: 0.0520, 56: 0.0465, 57: 0.0430,
    58: 0.0420, 59: 0.0410, 60: 0.0400, 61: 0.0390, 62: 0.0380, 63: 0.0370, 64: 0.0360,
    65: 0.0350, 66: 0.0330, 67: 0.0320, 68: 0.0310, 69: 0.0292, 70: 0.0280, 71: 0.0260,
    72: 0.0250, 73: 0.0240, 74: 0.0225, 75: 0.0210, 76: 0.0200, 77: 0.0180, 78: 0.0160,
    79: 0.0145, 80: 0.0135,
  };
  // [B94] Letter drills A–Z (in)
  const LETTER_DRILLS = {
    A: 0.234, B: 0.238, C: 0.242, D: 0.246, E: 0.250, F: 0.257, G: 0.261, H: 0.266,
    I: 0.272, J: 0.277, K: 0.281, L: 0.290, M: 0.295, N: 0.302, O: 0.316, P: 0.323,
    Q: 0.332, R: 0.339, S: 0.348, T: 0.358, U: 0.368, V: 0.377, W: 0.386, X: 0.397,
    Y: 0.404, Z: 0.413,
  };

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  const INCH_DRILLS = [];
  for (let n = 1; n <= 160; n++) {
    // fractional 1/64 … 2-1/2" in 1/64 steps (big sizes are typically S&D / taper-shank)
    const whole = Math.floor(n / 64), rem = n % 64;
    const g = rem ? gcd(rem, 64) : 1;
    const fr = rem ? (rem / g) + "/" + (64 / g) : "";
    const label = whole ? (whole + (fr ? "-" + fr : "") + '"') : fr;
    INCH_DRILLS.push({ label, kind: "fraction", d: n / 64 });
  }
  Object.keys(NUMBER_DRILLS).forEach((k) => INCH_DRILLS.push({ label: "#" + k, kind: "number", d: NUMBER_DRILLS[k] }));
  Object.keys(LETTER_DRILLS).forEach((k) => INCH_DRILLS.push({ label: k, kind: "letter", d: LETTER_DRILLS[k] }));
  INCH_DRILLS.sort((a, b) => a.d - b.d);

  // Metric series (mm): 0.50–3.00 by 0.05, 3.0–20.0 by 0.1, 20.0–65.0 by 0.5.
  // (Typical DIN 338 stock steps. Odd sizes like 5.55 or 6.75 exist from some
  // makers but are not assumed here.)
  const METRIC_DRILLS = [];
  for (let i = 50; i <= 300; i += 5) METRIC_DRILLS.push(i / 100);
  for (let i = 31; i <= 200; i++) METRIC_DRILLS.push(i / 10);
  for (let i = 41; i <= 130; i++) METRIC_DRILLS.push(i / 2);

  // ---------------------------------------------------------------- HARDNESS
  // [E140] HRC → HB (approximate, steels). Interpolated in calc.js. Valid 20–60 HRC.
  const HRC_HB = [
    [20, 226], [21, 231], [22, 237], [23, 243], [24, 247], [25, 253], [26, 258], [27, 264],
    [28, 271], [29, 279], [30, 286], [31, 294], [32, 301], [33, 311], [34, 319], [35, 327],
    [36, 336], [37, 344], [38, 353], [39, 362], [40, 371], [41, 381], [42, 390], [43, 400],
    [44, 409], [45, 421], [46, 432], [47, 442], [48, 455], [49, 469], [50, 481], [51, 496],
    [52, 512], [53, 525], [54, 543], [55, 560], [56, 577], [57, 595], [58, 615], [59, 634],
    [60, 654],
  ];

  // Hard stops (our conservative shop rules — judgment, flagged in the report):
  const LIMITS = {
    hssMaxHB: 327,      // 35 HRC — plain HSS drill or tap: "not recommended, use carbide"
    cobaltMaxHB: 353,   // 38 HRC — HSS-E / cobalt drill: "not recommended, use carbide"
    carbideMaxHB: 481,  // 50 HRC — past this you need a drill made for hardened steel
  };

  // Hardness derate past the top of a source's hardness band (drills only).
  // Derived from [MORSE] HSS tool & die steel rows: ≤250 HB → 250–350 HB
  // SFM 50 → 35 (×0.70); IPR .004→.003, .008→.006 (×0.75). Second step = factor².
  const DERATE = [
    { overHB: 50, sfm: 0.70, ipr: 0.75 },
    { overHB: 100, sfm: 0.50, ipr: 0.55 },
    // > 100 HB over the band: blocked — outside every source we used.
  ];

  // Deep-hole reductions [HAASID] notes: 4×D −10%; 5×D −20% (A–C) / −15% (D–H).
  // We apply 4×D −10% and ≥5×D −20% to every drill type (never raises anything).
  const DEPTH_REDUCTION = [
    { minLD: 5, factor: 0.80 },
    { minLD: 4, factor: 0.90 },
  ];

  // ------------------------------------------------------ DRILL SOURCE ROWS
  // Diameters (in) each source tabulates IPR at:
  const D_MORSE_HSS = [0.125, 0.25, 0.5, 0.75, 1.0];
  const D_RED = [0.125, 0.25, 0.375, 0.5, 0.75, 1.0, 1.5];
  const D_TRU = [0.0625, 0.125, 0.25, 0.5, 0.75];
  const D_MORSE_CARB = [0.0625, 0.125, 0.25, 0.5];

  // [MORSE] HSS & Cobalt (one table for both). sfm, ipr @ D_MORSE_HSS
  const MORSE_HSS = {
    lowC_le120:        { name: "Low Carbon Steel ≤120 HB", sfm: 110, ipr: [0.0030, 0.0040, 0.0080, 0.0100, 0.0110] },
    lowMedC_120_250:   { name: "Low & Medium Carbon Steel 120–250 HB (1018…)", sfm: 65, ipr: [0.0040, 0.0060, 0.0110, 0.0130, 0.0140] },
    medCAlloy_le250:   { name: "Medium Carbon & Alloyed Steel ≤250 HB (4340…)", sfm: 60, ipr: [0.0030, 0.0040, 0.0080, 0.0100, 0.0110] },
    toolDie_le250:     { name: "Tool & Die Steels ≤250 HB", sfm: 50, ipr: [0.0030, 0.0040, 0.0080, 0.0100, 0.0110] },
    toolDie_250_350:   { name: "Tool & Die Steels 250–350 HB", sfm: 35, ipr: [0.0020, 0.0030, 0.0060, 0.0070, 0.0080] },
    ssFree_le250:      { name: "Free Machining Stainless ≤250 HB (303…)", sfm: 60, ipr: [0.0040, 0.0060, 0.0110, 0.0130, 0.0140] },
    ssModerate_le300:  { name: "Moderate Machining Stainless ≤300 HB (304, 316)", sfm: 45, ipr: [0.0020, 0.0030, 0.0060, 0.0070, 0.0080] },
    ssDifficult_le300: { name: "Difficult Machining Stainless ≤300 HB (17-4PH…)", sfm: 20, ipr: [0.0020, 0.0030, 0.0060, 0.0070, 0.0080] },
    ciGray_160_260:    { name: "Cast Iron Gray 160–260 HB", sfm: 90, ipr: [0.0040, 0.0060, 0.0110, 0.0130, 0.0140] },
    ciDuctile_250:     { name: "Cast Iron Ductile 250 HB", sfm: 80, ipr: [0.0030, 0.0040, 0.0080, 0.0100, 0.0110] },
    tiAlloy_le250:     { name: "Titanium Alloys Ti-6Al-4V", sfm: 50, ipr: [0.0030, 0.0040, 0.0080, 0.0100, 0.0110] },
    htAlloy_150_250:   { name: "High Temp Alloys 150–250 HB (Inconel…)", sfm: 20, ipr: [0.0010, 0.0020, 0.0045, 0.0060, 0.0070] },
    aluminum_le150:    { name: "Aluminum Alloys ≤150 HB (6061…)", sfm: 325, ipr: [0.0040, 0.0060, 0.0110, 0.0130, 0.0140] },
    copperAlloy_le200: { name: "Copper Alloys — Brass & Bronze ≤200 HB", sfm: 80, ipr: [0.0040, 0.0060, 0.0110, 0.0130, 0.0140] },
  };

  // [RED] Redline: SFM [lo,hi] for HSS and Cobalt columns; IPR range HIGH end @ D_RED
  const REDLINE = {
    toolSteel:   { name: "High Strength Tool Steel (A2, D2, P20, H13…)", hss: [30, 65], co: [33, 75], iprHi: [0.0020, 0.0040, 0.0065, 0.0070, 0.0075, 0.0080, 0.0085] },
    lowC:        { name: "Low Carbon (1018…)", hss: [95, 95], co: [95, 95], iprHi: [0.0050, 0.0070, 0.0100, 0.0110, 0.0120, 0.0130, 0.0140] },
    medC:        { name: "Medium Carbon (4140, 4340…)", hss: [115, 115], co: [115, 115], iprHi: [0.0050, 0.0070, 0.0120, 0.0120, 0.0130, 0.0140, 0.0150] },
    austenitic:  { name: "Austenitic Stainless (304, 316L…)", hss: [26, 26], co: [36, 36], iprHi: [0.0030, 0.0050, 0.0075, 0.0090, 0.0100, 0.0110, 0.0120] },
    ph:          { name: "Precipitation Hardening (17-4…)", hss: [20, 20], co: [30, 30], iprHi: [0.0030, 0.0040, 0.0050, 0.0060, 0.0070, 0.0080, 0.0090] },
    ductile:     { name: "Ductile Iron", hss: [45, 45], co: [55, 55], iprHi: [0.0025, 0.0035, 0.0060, 0.0070, 0.0075, 0.0080, 0.0085] },
    gray:        { name: "Gray Iron", hss: [80, 100], co: [90, 115], iprHi: [0.0030, 0.0060, 0.0090, 0.0100, 0.0120, 0.0130, 0.0140] },
    aluminum:    { name: "Aluminum Alloys (6061, 7075…)", hss: [300, 300], co: [300, 300], iprHi: [0.0050, 0.0080, 0.0110, 0.0120, 0.0130, 0.0140, 0.0150] },
    brassBronze: { name: "Brass/Bronze", hss: [90, 115], co: [90, 130], iprHi: [0.0040, 0.0070, 0.0075, 0.0090, 0.0100, 0.0110, 0.0120] },
    nickel:      { name: "Nickel Base (Inconel 718…)", hss: [10, 20], co: [20, 23], iprHi: [0.0013, 0.0020, 0.0030, 0.0035, 0.0040, 0.0045, 0.0050] },
    titanium:    { name: "Titanium (CP, 6Al-4V…)", hss: [20, 75], co: [35, 90], iprHi: [0.0025, 0.0040, 0.0055, 0.0060, 0.0065, 0.0070, 0.0065] },
  };

  // [TRU] Tru-Edge solid carbide: sfm, ipr @ D_TRU
  const TRUEDGE = {
    aluminum:    { name: "Aluminum Alloys", sfm: 350, ipr: [0.002, 0.004, 0.006, 0.008, 0.012] },
    brassBronze: { name: "Brass and Bronze", sfm: 250, ipr: [0.001, 0.002, 0.004, 0.006, 0.010] },
    lowC:        { name: "Low Carbon Steel (175 HB)", sfm: 200, ipr: [0.0005, 0.001, 0.002, 0.004, 0.006] },
    medC:        { name: "Medium Carbon Steel (250 HB)", sfm: 175, ipr: [0.0005, 0.001, 0.002, 0.004, 0.006] },
    gray:        { name: "Cast Iron – Gray (200 HB)", sfm: 250, ipr: [0.001, 0.002, 0.003, 0.005, 0.007] },
    ductile:     { name: "Cast Iron – Ductile (250 HB)", sfm: 200, ipr: [0.001, 0.002, 0.003, 0.005, 0.007] },
    toolSteel:   { name: "Tool Steel (250 HB)", sfm: 200, ipr: [0.001, 0.003, 0.004, 0.006, 0.008] },
    hardened40:  { name: "Hardened Steel 40 HRC+", sfm: 60, ipr: [0.0005, 0.001, 0.0015, 0.002, 0.003] },
    ssFree:      { name: "Free Stainless (303…) ≤250 HB", sfm: 125, ipr: [0.0005, 0.001, 0.002, 0.005, 0.006] },
    ssModerate:  { name: "Moderate Stainless (304, 316) 300 HB", sfm: 100, ipr: [0.0005, 0.001, 0.002, 0.005, 0.006] },
    ssHard:      { name: "Hard Stainless (17-4PH…) 450 HB", sfm: 75, ipr: [0.0005, 0.0008, 0.0015, 0.003, 0.005] },
    tiAlloy:     { name: "Titanium 6Al-4V", sfm: 100, ipr: [0.0005, 0.0008, 0.0015, 0.003, 0.005] },
    htAlloy:     { name: "High Temp Alloys (Inconel…) 250 HB", sfm: 60, ipr: [0.0005, 0.0008, 0.0015, 0.003, 0.005] },
  };

  // [MORSE] solid carbide: sfm = LOWEST of the List 5374/5375/5376 values shown; ipr @ D_MORSE_CARB
  const MORSE_CARB = {
    lowMedC_120_250:   { name: "Low & Medium Carbon 120–250 HB", sfm: 225, ipr: [0.0020, 0.0040, 0.0060, 0.0110] },
    medCAlloy_le250:   { name: "Medium Carbon & Alloyed ≤250 HB", sfm: 150, ipr: [0.0015, 0.0030, 0.0040, 0.0080] },
    toolDie_le250:     { name: "Tool & Die ≤250 HB", sfm: 200, ipr: [0.0015, 0.0030, 0.0040, 0.0080] },
    toolDie_250_350:   { name: "Tool & Die 250–350 HB", sfm: 125, ipr: [0.0010, 0.0020, 0.0030, 0.0060] },
    hard40:            { name: "Hard Materials 40 HRC+ (List 5376)", sfm: 60, ipr: [0.0005, 0.0010, 0.0015, 0.0020] },
    ssFree_le260:      { name: "Free Machining Stainless ≤260 HB", sfm: 100, ipr: [0.0010, 0.0020, 0.0030, 0.0060] },
    ssModerate_le300:  { name: "Moderate Stainless ≤300 HB", sfm: 75, ipr: [0.0010, 0.0020, 0.0030, 0.0060] },
    ssDifficult_le450: { name: "Difficult Stainless ≤450 HB", sfm: 60, ipr: [0.0010, 0.0020, 0.0030, 0.0060] },
    ciGray_160_260:    { name: "Cast Iron Gray 160–260 HB", sfm: 250, ipr: [0.0015, 0.0030, 0.0040, 0.0080] },
    ciDuctile_250:     { name: "Cast Iron Ductile 250 HB", sfm: 175, ipr: [0.0015, 0.0030, 0.0040, 0.0080] },
    tiAlloy_le250:     { name: "Titanium Ti-6Al-4V", sfm: 50, ipr: [0.0005, 0.0010, 0.0020, 0.0045] },
    htAlloy_150_250:   { name: "High Temp Alloys 150–250 HB", sfm: 60, ipr: [0.0005, 0.0010, 0.0020, 0.0045] },
    aluminum_le150:    { name: "Aluminum ≤150 HB", sfm: 350, ipr: [0.0020, 0.0040, 0.0060, 0.0110] },
    copperAlloy_le200: { name: "Copper Alloys ≤200 HB", sfm: 80, ipr: [0.0020, 0.0040, 0.0060, 0.0110] },
  };

  // [HAASID] Indexable: sfm [min, starting, max]; ipr [lo,hi] per insert size band
  const HAAS_BANDS = [ // insert size → diameter range (in)
    { size: "A", lo: 0.473, hi: 0.531 }, { size: "B", lo: 0.563, hi: 0.734 },
    { size: "C", lo: 0.750, hi: 0.938 }, { size: "D", lo: 0.969, hi: 1.156 },
    { size: "E", lo: 1.188, hi: 1.438 }, { size: "F", lo: 1.469, hi: 1.750 },
    { size: "G", lo: 1.813, hi: 2.219 }, { size: "H", lo: 2.250, hi: 2.500 },
  ];
  const IPR_P1 = [[0.0024, 0.0039], [0.0031, 0.0051], [0.0039, 0.0059], [0.0043, 0.0063], [0.0051, 0.0071], [0.0059, 0.0079], [0.0063, 0.0106], [0.0067, 0.0114]];
  const IPR_P2 = [[0.0024, 0.0039], [0.0031, 0.0059], [0.0039, 0.0063], [0.0043, 0.0067], [0.0051, 0.0079], [0.0059, 0.0083], [0.0063, 0.0110], [0.0067, 0.0118]];
  const IPR_P3 = [[0.0031, 0.0059], [0.0039, 0.0063], [0.0043, 0.0071], [0.0047, 0.0079], [0.0053, 0.0094], [0.0063, 0.0094], [0.0071, 0.0118], [0.0075, 0.0126]];
  const IPR_P4 = [[0.0031, 0.0059], [0.0039, 0.0063], [0.0043, 0.0071], [0.0047, 0.0079], [0.0055, 0.0087], [0.0063, 0.0094], [0.0071, 0.0118], [0.0075, 0.0126]];
  const IPR_P5 = [[0.0024, 0.0039], [0.0031, 0.0055], [0.0039, 0.0059], [0.0043, 0.0063], [0.0051, 0.0071], [0.0059, 0.0079], [0.0063, 0.0110], [0.0067, 0.0118]];
  const IPR_P6 = [[0.0024, 0.0039], [0.0031, 0.0055], [0.0039, 0.0059], [0.0043, 0.0063], [0.0051, 0.0071], [0.0059, 0.0079], [0.0063, 0.0110], [0.0067, 0.0114]];
  const IPR_M1 = [[0.0024, 0.0047], [0.0028, 0.0051], [0.0031, 0.0059], [0.0039, 0.0063], [0.0047, 0.0079], [0.0055, 0.0098], [0.0063, 0.0110], [0.0063, 0.0118]];
  const IPR_K = [[0.0031, 0.0055], [0.0031, 0.0063], [0.0039, 0.0071], [0.0047, 0.0094], [0.0055, 0.0102], [0.0063, 0.0118], [0.0071, 0.0126], [0.0079, 0.0142]];
  const IPR_N1 = [[0.0024, 0.0039], [0.0031, 0.0055], [0.0039, 0.0059], [0.0043, 0.0063], [0.0051, 0.0071], [0.0059, 0.0079], [0.0063, 0.0110], [0.0067, 0.0118]];
  const IPR_S = [[0.0031, 0.0047], [0.0031, 0.0051], [0.0039, 0.0059], [0.0047, 0.0075], [0.0055, 0.0083], [0.0063, 0.0094], [0.0071, 0.0102], [0.0079, 0.0118]];
  const HAAS_IDX = {
    P1: { name: "P1 Low-carbon, short chipping <125 HB", sfm: [360, 540, 780], ipr: IPR_P1 },
    P2: { name: "P2 Medium/high-carbon <220 HB", sfm: [360, 570, 840], ipr: IPR_P2 },
    P3: { name: "P3 Alloy & tool steels <330 HB", sfm: [360, 600, 930], ipr: IPR_P3 },
    P4: { name: "P4 Alloy & tool steels 340–450 HB", sfm: [360, 570, 930], ipr: IPR_P4 },
    P5: { name: "P5 Ferritic/martensitic/PH stainless <330 HB", sfm: [360, 540, 750], ipr: IPR_P5 },
    P6: { name: "P6 High-strength ferritic/martensitic/PH 350–450 HB", sfm: [360, 480, 630], ipr: IPR_P6 },
    M1: { name: "M1 Austenitic stainless 130–200 HB", sfm: [360, 480, 720], ipr: IPR_M1 },
    M2: { name: "M2 High-strength austenitic 150–230 HB", sfm: [330, 420, 630], ipr: IPR_M1 },
    K1: { name: "K1 Gray cast iron 120–290 HB", sfm: [360, 600, 840], ipr: IPR_K },
    K2: { name: "K2 Ductile / CGI 130–260 HB", sfm: [300, 540, 780], ipr: IPR_K },
    K3: { name: "K3 High-strength ductile / ADI 180–350 HB", sfm: [300, 510, 720], ipr: IPR_K },
    N1: { name: "N1 Wrought aluminum", sfm: [750, 1050, 1500], ipr: IPR_N1 },
    S3: { name: "S3 Nickel-based heat-resistant 160–450 HB", sfm: [60, 90, 135], ipr: IPR_S },
    S4: { name: "S4 Titanium & Ti alloys 300–400 HB", sfm: [105, 120, 195], ipr: IPR_S },
  };

  // --------------------------------------------------------- TAP SOURCE ROWS
  // All values SFM [lo, hi].
  const TAP_SRC = {
    // [HAAST] HSS uncoated column
    haast: {
      lowC_lt180:        { name: "Haas HSS · Low carbon <180 HB", sfm: [25, 50] },
      medC_lt240:        { name: "Haas HSS · Medium/high carbon, low alloy <240 HB", sfm: [25, 50] },
      heatTreat_250_350: { name: "Haas HSS · Heat-treatable alloy 250–350 HB", sfm: [6, 30] },
      toolMold_350_420:  { name: "Haas HSS · Alloyed tool/mold steel 350–420 HB", sfm: [6, 12] },
      ssFree_lt240:      { name: "Haas HSS · Free-machining stainless <240 HB", sfm: [12, 35] },
      ssHeatRes_250_350: { name: "Haas HSS · Heat/corrosion-resistant stainless ≤350 HB", sfm: [12, 15] },
      ssPH_350_420:      { name: "Haas HSS · PH / cast stainless ≤420 HB", sfm: [12, 15] },
      aluminum:          { name: "Haas HSS · Aluminum alloys", sfm: [50, 65] },
      ciGray_le220:      { name: "Haas HSS · Gray cast iron ≤220 HB", sfm: [35, 50] },
      ciDuctile:         { name: "Haas HSS · Nodular/ductile iron", sfm: [12, 45] },
    },
    // [OSG] Table 21, m/min → SFM
    osg: {
      lowC_spiral:     { name: "OSG spiral tap · Low carbon steel", sfm: m(8, 13) },
      medC_spiral:     { name: "OSG spiral tap · Medium carbon steel", sfm: m(7, 12) },
      alloy_spiral:    { name: "OSG spiral tap · Alloy steel (SCM)", sfm: m(7, 12) },
      heatTr_spiral:   { name: "OSG spiral tap · Heat-treated steel 25–45 HRC", sfm: m(3, 5) },
      ss_spiral:       { name: "OSG spiral tap · Stainless (SUS)", sfm: m(5, 8) },
      sus630_spiral:   { name: "OSG spiral tap · Stress-hardened stainless (SUS630 = 17-4)", sfm: m(3, 5) },
      tool_spiral:     { name: "OSG spiral tap · Tool steel (SKD)", sfm: m(6, 9) },
      ci_hand:         { name: "OSG hand tap · Cast iron (FC)", sfm: m(10, 15) },
      ci_carbide:      { name: "OSG carbide tap · Cast iron (FC)", sfm: m(10, 20) },
      duct_spiral:     { name: "OSG spiral tap · Ductile iron (FCD)", sfm: m(7, 12) },
      duct_carbide:    { name: "OSG carbide tap · Ductile iron (FCD)", sfm: m(10, 20) },
      brass_spiral:    { name: "OSG spiral tap · Brass", sfm: m(10, 20) },
      bronze_spiral:   { name: "OSG spiral tap · Bronze", sfm: m(6, 11) },
      brass_carbide:   { name: "OSG carbide tap · Brass", sfm: m(15, 25) },
      bronze_carbide:  { name: "OSG carbide tap · Bronze", sfm: m(10, 20) },
      al_spiral:       { name: "OSG spiral tap · Rolled aluminum", sfm: m(10, 20) },
      lowC_form:       { name: "OSG form tap · Low carbon steel", sfm: m(8, 13) },
      alloy_form:      { name: "OSG form tap · Alloy steel", sfm: m(5, 8) },
      ss_form:         { name: "OSG form tap · Stainless", sfm: m(5, 10) },
      brass_form:      { name: "OSG form tap · Brass", sfm: m(7, 12) },
      bronze_form:     { name: "OSG form tap · Bronze", sfm: m(7, 12) },
      al_form:         { name: "OSG form tap · Rolled aluminum", sfm: m(10, 20) },
    },
    // [G395] Gühring cut taps: hsse / pm
    g395: {
      unalloyedCase_lt220: { name: "Gühring cut · Unalloyed case-hardening steel <220 HB", hsse: [45, 55], pm: [55, 65] },
      unalloyedHT_lt290:   { name: "Gühring cut · Unalloyed heat-treatable <290 HB", hsse: [35, 45], pm: [45, 55] },
      alloyHT_lt290:       { name: "Gühring cut · Alloyed heat-treatable <290 HB", hsse: [35, 45], pm: [45, 55] },
      toolNitr_lt350:      { name: "Gühring cut · Alloyed tool / nitriding steel <350 HB", hsse: [25, 35], pm: [35, 45] },
      ss_lt220:            { name: "Gühring cut · Stainless <220 HB", hsse: [35, 45], pm: [45, 55] },
      ss_lt290:            { name: "Gühring cut · Stainless <290 HB", hsse: [25, 35], pm: [35, 45] },
      ss_lt375:            { name: "Gühring cut · Stainless <375 HB", hsse: [15, 20], pm: [20, 25] },
      spheroidal_lt290:    { name: "Gühring cut · Spheroidal graphite iron <290 HB", hsse: [50, 70], pm: [70, 85] },
      alWrought_30_80:     { name: "Gühring cut · Al wrought 30–80 HB", hsse: [25, 35], pm: [35, 45] },
      copper:              { name: "Gühring cut · Copper & copper alloys", hsse: [50, 70], pm: [70, 85] },
      ti_140_275:          { name: "Gühring cut · Titanium 140–275 HB", hsse: [8, 12], pm: [12, 16] },
      ni_200_300:          { name: "Gühring cut · Nickel alloys 200–300 HB", hsse: [4, 8], pm: [8, 12] },
    },
    // [G972] Gühring black ring cut taps (bright finish) — aluminium rows
    g972: {
      alWrought_30_80:  { name: "Gühring 972 · Al wrought 30–80 HB", hsse: [50, 65] },
      alWrought_75_150: { name: "Gühring 972 · Al wrought 75–150 HB", hsse: [35, 60] },
    },
    // [G921] Gühring form taps: hsse / pm / carb
    g921: {
      unalloyedCase_lt230: { name: "Gühring form · Unalloyed case-hardening <230 HB", hsse: [40, 65], pm: [55, 80], carb: [75, 100] },
      unalloyedHT_lt250:   { name: "Gühring form · Unalloyed heat-treatable <250 HB", hsse: [30, 55], pm: [50, 75], carb: [65, 95] },
      alloyHT_lt280:       { name: "Gühring form · Alloyed heat-treatable <280 HB", hsse: [20, 40], pm: [35, 55], carb: [50, 70] },
      alloyTool_lt320:     { name: "Gühring form · Alloyed tool steel <320 HB", hsse: [15, 30], pm: [30, 50], carb: [40, 60] },
      ssSulph_lt180:       { name: "Gühring form · Stainless sulphured <180 HB", hsse: [40, 50], pm: [45, 60], carb: [50, 70] },
      ssAust_lt250:        { name: "Gühring form · Stainless austenitic <250 HB", hsse: [35, 50], pm: [40, 55], carb: [45, 60] },
      ssMart_lt280:        { name: "Gühring form · Stainless martensitic <280 HB", hsse: [25, 40], pm: [35, 50], carb: [40, 55] },
      ssMart_lt320:        { name: "Gühring form · Stainless martensitic <320 HB", hsse: null, pm: [25, 40], carb: [30, 45] },
      spheroidal_lt250:    { name: "Gühring form · Spheroidal graphite iron <250 HB", hsse: [40, 65], pm: [60, 80], carb: [75, 130] },
      alWrought:           { name: "Gühring form · Al wrought 30–150 HB", hsse: [80, 100], pm: [100, 150], carb: [150, 200] },
      brassShort_lt180:    { name: "Gühring form · Brass short-chipping <180 HB", hsse: [35, 50], pm: [50, 65], carb: [75, 100] },
      ti_lt320:            { name: "Gühring form · Titanium <320 HB", hsse: [7, 26], pm: [7, 26], carb: [20, 35] },
      ni_lt320:            { name: "Gühring form · Nickel alloys <320 HB", hsse: [7, 26], pm: [7, 26], carb: [20, 35] },
    },
    // [EMU] Emuge A-H solid carbide column, cast iron
    emu: {
      gray:       { name: "Emuge A-H carbide · Gray iron 100–250 HB", carb: [131, 262] },
      nodular150: { name: "Emuge A-H carbide · Nodular iron 105–150 HB", carb: [98, 197] },
      nodular265: { name: "Emuge A-H carbide · Nodular iron 150–265 HB", carb: [66, 131] },
    },
  };

  // Helper to reference a tap source row + column: ["g395","alloyHT_lt290","hsse"]
  // Columns: haast/osg rows use "sfm".
  const S = (src, row, col) => [src, row, col || "sfm"];

  // ---------------------------------------------------------- WORK MATERIALS
  // Each material maps to source rows in hardness bands (maxHB). Past the last
  // band: drills derate (DERATE) then block; taps simply have no data.
  const steelHSSBands = [
    { maxHB: 250, morse: "medCAlloy_le250", red: "medC" },
    { maxHB: 350, morse: "toolDie_250_350", red: null },
  ];
  const steelCarbBands = [
    { maxHB: 250, tru: "medC", morse: "medCAlloy_le250" },
    { maxHB: 350, tru: null, morse: "toolDie_250_350" },
    { maxHB: 481, tru: "hardened40", morse: "hard40" },
  ];
  const alloyTaps = {
    cut: {
      hss: [
        { maxHB: 240, src: [S("haast", "medC_lt240"), S("osg", "alloy_spiral")] },
        { maxHB: 350, src: [S("haast", "heatTreat_250_350"), S("osg", "heatTr_spiral")] },
      ],
      hsse: [
        { maxHB: 290, src: [S("g395", "alloyHT_lt290", "hsse"), S("osg", "alloy_spiral")] },
        { maxHB: 350, src: [S("g395", "toolNitr_lt350", "hsse"), S("osg", "heatTr_spiral")] },
      ],
      pm: [
        { maxHB: 290, src: [S("g395", "alloyHT_lt290", "pm")] },
        { maxHB: 350, src: [S("g395", "toolNitr_lt350", "pm")] },
      ],
      carbide: [],
    },
    form: {
      hss: [{ maxHB: 280, src: [S("osg", "alloy_form")] }],
      hsse: [
        { maxHB: 280, src: [S("g921", "alloyHT_lt280", "hsse"), S("osg", "alloy_form")] },
        { maxHB: 320, src: [S("g921", "alloyTool_lt320", "hsse")] },
      ],
      pm: [
        { maxHB: 280, src: [S("g921", "alloyHT_lt280", "pm")] },
        { maxHB: 320, src: [S("g921", "alloyTool_lt320", "pm")] },
      ],
      carbide: [
        { maxHB: 280, src: [S("g921", "alloyHT_lt280", "carb")] },
        { maxHB: 320, src: [S("g921", "alloyTool_lt320", "carb")] },
      ],
    },
  };

  const MATERIALS = [
    {
      id: "low_c", iso: "P", name: "Low-carbon steel (1018)", defaultHB: 126,
      hbNote: "1018 cold-drawn ≈ 126 HB",
      drill: {
        hss: [{ maxHB: 250, morse: "lowMedC_120_250", red: "lowC" }],
        carbide: [{ maxHB: 250, tru: "lowC", morse: "lowMedC_120_250" }],
        indexable: [{ maxHB: 125, haas: "P1" }, { maxHB: 220, haas: "P2" }, { maxHB: 330, haas: "P3" }],
      },
      tap: {
        cut: {
          hss: [
            { maxHB: 180, src: [S("haast", "lowC_lt180"), S("osg", "lowC_spiral")] },
            { maxHB: 240, src: [S("haast", "medC_lt240"), S("osg", "medC_spiral")] },
          ],
          hsse: [
            { maxHB: 220, src: [S("g395", "unalloyedCase_lt220", "hsse"), S("osg", "lowC_spiral")] },
            { maxHB: 290, src: [S("g395", "unalloyedHT_lt290", "hsse")] },
          ],
          pm: [
            { maxHB: 220, src: [S("g395", "unalloyedCase_lt220", "pm")] },
            { maxHB: 290, src: [S("g395", "unalloyedHT_lt290", "pm")] },
          ],
          carbide: [],
        },
        form: {
          hss: [{ maxHB: 230, src: [S("osg", "lowC_form")] }],
          hsse: [
            { maxHB: 230, src: [S("g921", "unalloyedCase_lt230", "hsse"), S("osg", "lowC_form")] },
            { maxHB: 250, src: [S("g921", "unalloyedHT_lt250", "hsse")] },
          ],
          pm: [
            { maxHB: 230, src: [S("g921", "unalloyedCase_lt230", "pm")] },
            { maxHB: 250, src: [S("g921", "unalloyedHT_lt250", "pm")] },
          ],
          carbide: [
            { maxHB: 230, src: [S("g921", "unalloyedCase_lt230", "carb")] },
            { maxHB: 250, src: [S("g921", "unalloyedHT_lt250", "carb")] },
          ],
        },
      },
    },
    {
      id: "alloy_ann", iso: "P", name: "4140 annealed (medium-carbon / alloy)", defaultHB: 197,
      hbNote: "4140 annealed ≈ 197 HB",
      drill: { hss: steelHSSBands, carbide: steelCarbBands, indexable: [{ maxHB: 330, haas: "P3" }, { maxHB: 450, haas: "P4" }] },
      tap: alloyTaps,
    },
    {
      id: "alloy_ph", iso: "P", name: "4140 pre-hard (28–32 HRC)", defaultHB: 286,
      hbNote: "pre-hard 4140 ≈ 28–32 HRC (271–301 HB)",
      drill: { hss: steelHSSBands, carbide: steelCarbBands, indexable: [{ maxHB: 330, haas: "P3" }, { maxHB: 450, haas: "P4" }] },
      tap: alloyTaps,
    },
    {
      id: "tool", iso: "P", name: "Tool steel annealed (P20, A2, D2, H13)", defaultHB: 230,
      hbNote: "annealed A2/D2/H13 ≈ 200–250 HB · P20 pre-hard ≈ 28–32 HRC",
      drill: {
        hss: [{ maxHB: 250, morse: "toolDie_le250", red: "toolSteel" }, { maxHB: 350, morse: "toolDie_250_350", red: null }],
        carbide: [
          { maxHB: 250, tru: "toolSteel", morse: "toolDie_le250" },
          { maxHB: 350, tru: null, morse: "toolDie_250_350" },
          { maxHB: 481, tru: "hardened40", morse: "hard40" },
        ],
        indexable: [{ maxHB: 330, haas: "P3" }, { maxHB: 450, haas: "P4" }],
      },
      tap: {
        cut: {
          hss: [
            { maxHB: 250, src: [S("osg", "tool_spiral")] },
            { maxHB: 350, src: [S("haast", "heatTreat_250_350"), S("osg", "heatTr_spiral")] },
          ],
          hsse: [{ maxHB: 350, src: [S("g395", "toolNitr_lt350", "hsse"), S("osg", "tool_spiral")] }],
          pm: [{ maxHB: 350, src: [S("g395", "toolNitr_lt350", "pm")] }],
          carbide: [],
        },
        form: {
          hss: [],
          hsse: [{ maxHB: 320, src: [S("g921", "alloyTool_lt320", "hsse")] }],
          pm: [{ maxHB: 320, src: [S("g921", "alloyTool_lt320", "pm")] }],
          carbide: [{ maxHB: 320, src: [S("g921", "alloyTool_lt320", "carb")] }],
        },
      },
    },
    {
      id: "ss303", iso: "M", name: "Stainless 303 (free-machining)", defaultHB: 180,
      hbNote: "303 annealed ≈ 160–230 HB",
      drill: {
        hss: [{ maxHB: 250, morse: "ssFree_le250", red: null }],
        carbide: [{ maxHB: 250, tru: "ssFree", morse: "ssFree_le260" }],
        indexable: [{ maxHB: 200, haas: "M1" }, { maxHB: 230, haas: "M2" }],
      },
      tap: {
        cut: {
          hss: [{ maxHB: 240, src: [S("haast", "ssFree_lt240"), S("osg", "ss_spiral")] }],
          hsse: [
            { maxHB: 220, src: [S("g395", "ss_lt220", "hsse"), S("osg", "ss_spiral")] },
            { maxHB: 290, src: [S("g395", "ss_lt290", "hsse")] },
          ],
          pm: [{ maxHB: 220, src: [S("g395", "ss_lt220", "pm")] }, { maxHB: 290, src: [S("g395", "ss_lt290", "pm")] }],
          carbide: [],
        },
        form: {
          hss: [{ maxHB: 250, src: [S("osg", "ss_form")] }],
          hsse: [
            { maxHB: 180, src: [S("g921", "ssSulph_lt180", "hsse"), S("osg", "ss_form")] },
            { maxHB: 250, src: [S("g921", "ssAust_lt250", "hsse"), S("osg", "ss_form")] },
          ],
          pm: [{ maxHB: 180, src: [S("g921", "ssSulph_lt180", "pm")] }, { maxHB: 250, src: [S("g921", "ssAust_lt250", "pm")] }],
          carbide: [{ maxHB: 180, src: [S("g921", "ssSulph_lt180", "carb")] }, { maxHB: 250, src: [S("g921", "ssAust_lt250", "carb")] }],
        },
      },
    },
    {
      id: "ss304", iso: "M", name: "Stainless 304 / 316", defaultHB: 170,
      hbNote: "304/316 annealed ≈ 150–200 HB",
      drill: {
        hss: [{ maxHB: 300, morse: "ssModerate_le300", red: "austenitic" }],
        carbide: [{ maxHB: 300, tru: "ssModerate", morse: "ssModerate_le300" }],
        indexable: [{ maxHB: 200, haas: "M1" }, { maxHB: 230, haas: "M2" }],
      },
      tap: {
        cut: {
          hss: [{ maxHB: 350, src: [S("haast", "ssHeatRes_250_350"), S("osg", "ss_spiral")] }],
          hsse: [
            { maxHB: 220, src: [S("g395", "ss_lt220", "hsse"), S("osg", "ss_spiral")] },
            { maxHB: 290, src: [S("g395", "ss_lt290", "hsse")] },
          ],
          pm: [{ maxHB: 220, src: [S("g395", "ss_lt220", "pm")] }, { maxHB: 290, src: [S("g395", "ss_lt290", "pm")] }],
          carbide: [],
        },
        form: {
          hss: [{ maxHB: 250, src: [S("osg", "ss_form")] }],
          hsse: [{ maxHB: 250, src: [S("g921", "ssAust_lt250", "hsse"), S("osg", "ss_form")] }],
          pm: [{ maxHB: 250, src: [S("g921", "ssAust_lt250", "pm")] }],
          carbide: [{ maxHB: 250, src: [S("g921", "ssAust_lt250", "carb")] }],
        },
      },
    },
    {
      id: "ph174", iso: "M", name: "17-4 PH stainless", defaultHB: 300,
      hbNote: "H1150 ≈ 28–33 HRC · H900 ≈ 40–44 HRC",
      drill: {
        hss: [{ maxHB: 300, morse: "ssDifficult_le300", red: "ph" }],
        carbide: [{ maxHB: 450, tru: "ssHard", morse: "ssDifficult_le450", harvey: { row: "ph_38_45", agrees: "feed" } }],
        indexable: [{ maxHB: 330, haas: "P5" }, { maxHB: 450, haas: "P6" }],
      },
      tap: {
        cut: {
          hss: [{ maxHB: 420, src: [S("haast", "ssPH_350_420"), S("osg", "sus630_spiral")] }],
          hsse: [{ maxHB: 375, src: [S("g395", "ss_lt375", "hsse"), S("osg", "sus630_spiral")] }],
          pm: [{ maxHB: 375, src: [S("g395", "ss_lt375", "pm")] }],
          carbide: [],
        },
        form: {
          hss: [],
          hsse: [{ maxHB: 280, src: [S("g921", "ssMart_lt280", "hsse")] }],
          pm: [{ maxHB: 280, src: [S("g921", "ssMart_lt280", "pm")] }, { maxHB: 320, src: [S("g921", "ssMart_lt320", "pm")] }],
          carbide: [{ maxHB: 280, src: [S("g921", "ssMart_lt280", "carb")] }, { maxHB: 320, src: [S("g921", "ssMart_lt320", "carb")] }],
        },
      },
    },
    {
      id: "ci_gray", iso: "K", name: "Gray cast iron", defaultHB: 200,
      hbNote: "Class 30–40 gray iron ≈ 180–240 HB",
      noFormTap: true,
      drill: {
        hss: [{ maxHB: 260, morse: "ciGray_160_260", red: "gray" }],
        carbide: [{ maxHB: 260, tru: "gray", morse: "ciGray_160_260" }],
        indexable: [{ maxHB: 290, haas: "K1" }],
      },
      tap: {
        cut: {
          hss: [{ maxHB: 220, src: [S("haast", "ciGray_le220"), S("osg", "ci_hand")] }, { maxHB: 260, src: [S("osg", "ci_hand")] }],
          hsse: [{ maxHB: 260, src: [S("osg", "ci_hand")] }],
          pm: [],
          carbide: [{ maxHB: 250, src: [S("emu", "gray", "carb"), S("osg", "ci_carbide")] }],
        },
        form: { hss: [], hsse: [], pm: [], carbide: [] },
      },
    },
    {
      id: "ci_duct", iso: "K", name: "Ductile (nodular) cast iron", defaultHB: 200,
      hbNote: "65-45-12 ≈ 170–230 HB",
      drill: {
        hss: [{ maxHB: 250, morse: "ciDuctile_250", red: "ductile" }],
        carbide: [{ maxHB: 250, tru: "ductile", morse: "ciDuctile_250" }],
        indexable: [{ maxHB: 260, haas: "K2" }, { maxHB: 350, haas: "K3" }],
      },
      tap: {
        cut: {
          hss: [{ maxHB: 290, src: [S("haast", "ciDuctile"), S("osg", "duct_spiral")] }],
          hsse: [{ maxHB: 290, src: [S("g395", "spheroidal_lt290", "hsse"), S("osg", "duct_spiral")] }],
          pm: [{ maxHB: 290, src: [S("g395", "spheroidal_lt290", "pm")] }],
          carbide: [
            { maxHB: 150, src: [S("emu", "nodular150", "carb"), S("osg", "duct_carbide")] },
            { maxHB: 265, src: [S("emu", "nodular265", "carb"), S("osg", "duct_carbide")] },
          ],
        },
        form: {
          hss: [],
          hsse: [{ maxHB: 250, src: [S("g921", "spheroidal_lt250", "hsse")] }],
          pm: [{ maxHB: 250, src: [S("g921", "spheroidal_lt250", "pm")] }],
          carbide: [{ maxHB: 250, src: [S("g921", "spheroidal_lt250", "carb")] }],
        },
      },
    },
    {
      id: "al", iso: "N", name: "Aluminum (6061 / 7075)", defaultHB: 95,
      hbNote: "6061-T6 ≈ 95 HB · 7075-T6 ≈ 150 HB",
      drill: {
        hss: [{ maxHB: 150, morse: "aluminum_le150", red: "aluminum" }],
        carbide: [{ maxHB: 150, tru: "aluminum", morse: "aluminum_le150" }],
        indexable: [{ maxHB: 150, haas: "N1" }],
      },
      tap: {
        cut: {
          hss: [{ maxHB: 150, src: [S("haast", "aluminum"), S("osg", "al_spiral")] }],
          hsse: [
            { maxHB: 80, src: [S("g972", "alWrought_30_80", "hsse"), S("g395", "alWrought_30_80", "hsse"), S("osg", "al_spiral")] },
            { maxHB: 150, src: [S("g972", "alWrought_75_150", "hsse"), S("osg", "al_spiral")] },
          ],
          pm: [{ maxHB: 80, src: [S("g395", "alWrought_30_80", "pm")] }],
          carbide: [],
        },
        form: {
          hss: [{ maxHB: 150, src: [S("osg", "al_form")] }],
          hsse: [{ maxHB: 150, src: [S("g921", "alWrought", "hsse"), S("osg", "al_form")] }],
          pm: [{ maxHB: 150, src: [S("g921", "alWrought", "pm")] }],
          carbide: [{ maxHB: 150, src: [S("g921", "alWrought", "carb")] }],
        },
      },
    },
    {
      id: "cu", iso: "N", name: "Brass / bronze", defaultHB: 100,
      hbNote: "360 brass ≈ 80–120 HB",
      drill: {
        hss: [{ maxHB: 200, morse: "copperAlloy_le200", red: "brassBronze" }],
        carbide: [{ maxHB: 200, tru: "brassBronze", morse: "copperAlloy_le200", harvey: { row: "cu", agrees: "feed" } }],
        indexable: [], // no brass row in the Haas indexable chart
      },
      tap: {
        cut: {
          hss: [{ maxHB: 200, src: [S("osg", "brass_spiral"), S("osg", "bronze_spiral")] }],
          hsse: [{ maxHB: 200, src: [S("g395", "copper", "hsse"), S("osg", "brass_spiral"), S("osg", "bronze_spiral")] }],
          pm: [{ maxHB: 200, src: [S("g395", "copper", "pm")] }],
          carbide: [{ maxHB: 200, src: [S("osg", "brass_carbide"), S("osg", "bronze_carbide")] }],
        },
        form: {
          hss: [{ maxHB: 180, src: [S("osg", "brass_form"), S("osg", "bronze_form")] }],
          hsse: [{ maxHB: 180, src: [S("g921", "brassShort_lt180", "hsse"), S("osg", "brass_form")] }],
          pm: [{ maxHB: 180, src: [S("g921", "brassShort_lt180", "pm")] }],
          carbide: [{ maxHB: 180, src: [S("g921", "brassShort_lt180", "carb")] }],
        },
      },
    },
    {
      id: "ti64", iso: "S", name: "Titanium Ti-6Al-4V", defaultHB: 334,
      hbNote: "annealed ≈ 36 HRC (≈ 334 HB)",
      // Judgment call: Morse/Tru-Edge name Ti-6Al-4V explicitly; we accept their row up
      // to annealed hardness (≈340 HB). Haas indexable lists Ti at 300–400 HB.
      drill: {
        hss: [{ maxHB: 340, morse: "tiAlloy_le250", red: "titanium" }],
        carbide: [{ maxHB: 340, tru: "tiAlloy", morse: "tiAlloy_le250", harvey: { row: "ti_29_37", agrees: "speed" } }],
        indexable: [{ maxHB: 400, haas: "S4" }],
      },
      tap: {
        cut: {
          hss: [],
          hsse: [{ maxHB: 275, src: [S("g395", "ti_140_275", "hsse")] }],
          pm: [{ maxHB: 275, src: [S("g395", "ti_140_275", "pm")] }],
          carbide: [],
        },
        form: {
          hss: [],
          hsse: [{ maxHB: 320, src: [S("g921", "ti_lt320", "hsse")] }],
          pm: [{ maxHB: 320, src: [S("g921", "ti_lt320", "pm")] }],
          carbide: [{ maxHB: 320, src: [S("g921", "ti_lt320", "carb")] }],
        },
      },
    },
    {
      id: "in718", iso: "S", name: "Nickel alloy — Inconel 718", defaultHB: 250,
      hbNote: "solution-treated ≈ 250 HB · aged ≈ 36–44 HRC",
      drill: {
        hss: [{ maxHB: 250, morse: "htAlloy_150_250", red: "nickel" }],
        carbide: [{ maxHB: 250, tru: "htAlloy", morse: "htAlloy_150_250" }],
        indexable: [{ maxHB: 450, haas: "S3" }],
      },
      tap: {
        cut: {
          hss: [],
          hsse: [{ maxHB: 300, src: [S("g395", "ni_200_300", "hsse")] }],
          pm: [{ maxHB: 300, src: [S("g395", "ni_200_300", "pm")] }],
          carbide: [],
        },
        form: {
          hss: [],
          hsse: [{ maxHB: 320, src: [S("g921", "ni_lt320", "hsse")] }],
          pm: [{ maxHB: 320, src: [S("g921", "ni_lt320", "pm")] }],
          carbide: [{ maxHB: 320, src: [S("g921", "ni_lt320", "carb")] }],
        },
      },
    },
  ];

  // [HARVEY] SF_20000 rows used as a SECOND source (copied as printed; IPR at HARVEY_DRILL.d).
  // Only rows that AGREE with the app on the named quantity are listed here. Rows that disagree
  // (aluminum, steels, 303/304, tool steels, Ti feed, Inconel) are written up in
  // dt-research/harvey-feeds.md for Kori to pick from; no app number changed.
  const HARVEY_DRILL = {
    name: "Harvey Tool Miniature Drills speeds & feeds (SF_20000)",
    url: "https://harveyperformance.widen.net/content/ss7jrgaq3k/pdf/SF_20000.pdf",
    d: [0.015, 0.031, 0.047, 0.062, 0.078, 0.093, 0.125, 0.187, 0.250],
    rows: {
      // Copper alloys ≤28 Rc: brass / Al & Si bronze 375 SFM, phosphor bronze / Cu-Ni 170 SFM; one IPR row
      cu: { label: "Copper alloys ≤28 Rc", minHB: 0, maxHB: 271, sfm: [170, 375], ipr: [0.00036, 0.00074, 0.00113, 0.00149, 0.00187, 0.00223, 0.00300, 0.00449, 0.00600] },
      ti_29_37: { label: "Titanium alloys 29–37 Rc", minHB: 279, maxHB: 344, sfm: [100, 100], ipr: [0.00023, 0.00047, 0.00071, 0.00093, 0.00117, 0.00140, 0.00188, 0.00281, 0.00375] },
      ph_38_45: { label: "17-4 / 15-5 / 13-8 / 440C row 38–45 Rc", minHB: 353, maxHB: 421, sfm: [90, 90], ipr: [0.00016, 0.00033, 0.00049, 0.00065, 0.00082, 0.00098, 0.00131, 0.00196, 0.00263] },
    },
  };

  const DRILL_MATERIALS = [
    { id: "hss", name: "HSS" },
    { id: "cobalt", name: "HSS-E / cobalt (M42, M35)" },
    { id: "carbide", name: "Solid carbide" },
    { id: "indexable", name: "Indexable insert drill" },
  ];
  const TAP_MATERIALS = [
    { id: "hss", name: "HSS" },
    { id: "hsse", name: "HSS-E / cobalt" },
    { id: "pm", name: "Powder-metal HSS (HSS-E-PM)" },
    { id: "carbide", name: "Solid carbide" },
  ];

  // ------------------------------------------------------------- DEMO COSTS
  // Stacey's DEMO numbers — sample values only, not anyone's real shop rates.
  const DEMO_COST = {
    partValue: 40, lostMin: 20, shopRate: 85, brokenTaps: 1, changeMin: 3,
    cut: { tapCost: 18, holesPerTap: 1500, holesPerBreak: 2000 },
    form: { tapCost: 28, holesPerTap: 4000, holesPerBreak: 8000 },
  };

  // ------------------------------------------------------------- TROUBLESHOOT
  // Thresholds for DT_CALC.troubleChecks (Jenny's research: dt-research/troubleshoot.md / .json).
  const TROUBLE_RULES = {
    blindClearMinIn: 0.050, // Haas TG0144 tap breakage guide: drill blind holes at least .050" deeper than the tap goes
    pctAmberCut: 75,        // Haas TG0144: 75% thread is ~5% weaker than 100% for about 1/3 the cutting force
    depthRatio: 1.5,        // Haas TG0144: breakage risk rises past 1.5 x D thread depth; OSG: straight flutes only for shallow blind holes
    ldDeep: 3,              // peckAdvice pecks from 3 x D; Sandvik drilling tips: internal coolant for holes over 3 x D
    hiTol: 1.005, loTol: 0.995, // same margins as the app's existing "above the published range" notes
    shortChipIso: ["K"],    // OSG Tap Guide: straight flutes suit short-chipping work (cast iron)
  };
  // sourceKey -> source, for check results (same keys as troubleshoot.json "sourceKey").
  const TROUBLE_SRC = {
    OSG_TAP: { name: "OSG Tap Technical Guide Vol 1", url: "https://res.cloudinary.com/osg-usa-inc/image/upload/v1709319427/Literature/03%20-%20Charts%20and%20Guides/Technical%20Guides/OSG_-_Literature_-_Other_-_Technical_Data_-_Tap_-_Vol_1_-_IA.pdf" },
    OSG_DRILL: { name: "OSG Drilling Technical Guide Vol 1", url: "https://res.cloudinary.com/osg-usa-inc/image/upload/v1709319429/Literature/03%20-%20Charts%20and%20Guides/Technical%20Guides/OSG_-_Literature_-_Other_-_Technical_Data_-_Drilling-_Vol_1_-_IA.pdf" },
    OSG_VIDEO: { name: "OSG 60sec Troubleshooting (MSC)", url: "https://www.mscdirect.com/knowledge-center/articles/video-60sec-troubleshooting-threading-tension-compression-vs-rigid-tapping" },
    HAAS_TAP: { name: "Haas TG0144 Tap Breakage", url: "https://www.haascnc.com/service/troubleshooting-and-how-to/troubleshooting/tap-breakage-troubleshooting.html" },
    SV_TAP: { name: "Sandvik Coromant tapping troubleshooting", url: "https://www.sandvik.coromant.com/en-us/knowledge/threading/tapping/troubleshooting-tapping" },
    SV_TAPTIPS: { name: "Sandvik Coromant tapping tips", url: "https://www.sandvik.coromant.com/en-us/knowledge/threading/tapping/operation-tips" },
    SV_DRILLTS: { name: "Sandvik Coromant drilling troubleshooting", url: "https://www.sandvik.coromant.com/en-us/knowledge/drilling/drilling-wear-and-troubleshooting" },
    SV_DRILLTIPS: { name: "Sandvik Coromant drilling tips", url: "https://www.sandvik.coromant.com/en-us/knowledge/drilling/drilling-tips" },
    YG1_TAP: { name: "YG-1 Tap Trouble Shooting Guide", url: "https://www.suncoasttools.com/PDFFILES/YG1/Technical/Taps/YG1-TAP-TROUBLE-SHOOTING-GUIDE.pdf" },
    GUH_CENTER: { name: "Guhring centering and pilot drilling", url: "https://guhring.com/media/support/Centering-And-Pilot-Drilling-Recommendations.pdf" },
    F_RIGIDMODE: { name: "Fanuc 30i-A manual p.78", url: "https://manualmachine.com/fanuc/30ia/4715028-user-manual/" },
    F_M29: { name: "Fanuc 30i-A manual p.80", url: "https://manualmachine.com/fanuc/30ia/4715028-user-manual/" },
    F_PECK: { name: "Fanuc 30i-A manual p.85", url: "https://manualmachine.com/fanuc/30ia/4715028-user-manual/" },
    F16_M29: { name: "Fanuc 16i-B manual p.1126", url: "https://www.drivesul.com.br/template/imagens/manuais/manuais-fanuc/fanuc-series-16i-18i-21i-model-b/Series%2016i-18i-21i-MODEL%20B%20-%20Connection%20Manual%20(Function).pdf#page=1154" },
  };

  // ---------------------------------------------------------------- STI (helical coil inserts) — Jenny, Round 1, Oct 7 2026
  // One row per app thread id, in the thread's own units (in for UNC/UNF, mm for metric). Figures copied from the
  // opened charts only (parser + checks: /workspace/dt-research/_sti/build_sti.py; readable table: dt-research/sti.md).
  // hc = Heli-Coil HC2000 Rev.12 [STI_SRC.HC]:
  //   d   [aluminum drill, steel/magnesium/plastic drill] (Tables V/VI p.18–19; the aluminum drill is inside the
  //       NASM33537 / MA1567 minor limits, p.17)
  //   A   min drill depth "A": [plug tap 1, 1.5, 2, 2.5, 3 D, bottoming tap 1 … 3 D] (Tables V/VI; plug taps 5/16 / M8
  //       and under carry a male center = ½ bolt Ø inside these figures)
  //   M   120° ±5° countersink Ø [min, max];  pd pitch Ø [min, max 3B|4H5H, max 2B|5H];  C min full-thread tapping depth
  //       for 1 … 3 D (= insert nominal length + 1 pitch, countersunk hole, set-down ≤ 1-1/2 P);  mi minor Ø after
  //       tapping [min, max];  tj STI tap major Ø max  (Tables VII/VIII p.20–21)
  //   tap straight-flute STI tap part numbers [plug 3B|4H5H, plug 2B|5H, bottoming 3B|4H5H, bottoming 2B|5H] (IX/XI p.22, 24)
  //   s:1 the chart's footnote: standard drill suggested though it varies slightly from the minor limits
  // rc = Recoil Technical Catalogue 2020 v1.0.1 pp.22–24 [STI_SRC.RC]: d [inch drill or null, mm drill], mi minor [min, max], jn major Ø min;
  //   S / T = printed min drill depth (no point) / min tapping depth incl. 3½ plug-tap threads for 1 … 3 D (p.19 metric, p.20 UNC;
  //   null = printed typo; the p.21 UNF depth table is shifted by a row and is not used; p.20 "3/8-18" row = 3/8-16)
  // em = Emuge ZS10013 "EG (STI)" core-hole chart [STI_SRC.EM]: d mm drill, mi minor [min, max], jn major Ø min (inch rows converted from mm)
  const STI = {
    "UNC-#1-64": { hc: { d: ["#47", "#46"], A: [.203, .24, .276, .313, .349, .136, .172, .209, .245, .282], M: [.085, .1], pd: [.0832, .0843, .085], C: [.09, .125, .16, .2, .235], mi: [.0764, .0823], tj: .0958, tap: ["01CPB", "01CPA", "01CBB", "01CBA"] } },
    "UNC-#2-56": { hc: { d: ["3/32", "#41"], A: [.236, .279, .322, .365, .408, .157, .2, .243, .286, .329], M: [.09, .11], pd: [.0976, .0989, .0996], C: [.1, .15, .19, .23, .28], mi: [.0899, .0961], tj: .1117, tap: ["02CPB", "02CPA", "02CBB", "02CBA"] }, rc: { d: ["3/32", "2.1 mm"], mi: [.09, .094], jn: .1092, S: [.166, .209, .252, .295, .338], T: [.148, .191, .234, .277, .32] } },
    "UNC-#3-48": { hc: { d: ["#36", "7/64"], A: [.273, .323, .372, .422, .471, .182, .232, .281, .331, .38], M: [.11, .14], pd: [.1126, .114, .1148], C: [.12, .17, .22, .27, .32], mi: [.1036, .1104], tj: .1289, tap: ["03CPB", "03CPA", "03CBB", "03CBA"] }, rc: { d: ["#36", "2.7 mm"], mi: [.104, .108], jn: .1261, S: [.193, .242, .292, .342, .391], T: [.172, .221, .271, .321, .37] } },
    "UNC-#4-40": { hc: { d: ["#31", "#31"], A: [.318, .374, .43, .486, .542, .212, .268, .324, .38, .436], M: [.14, .17], pd: [.1283, .1299, .1308], C: [.14, .19, .25, .31, .36], mi: [.1175, .1252], tj: .1473, tap: ["04CPB", "04CPA", "04CBB", "04CBA"] }, rc: { d: ["#31", "3 mm"], mi: [.118, .122], jn: .1445, S: [.224, .28, .336, .392, .448], T: [.199, .255, .311, .367, .423] }, em: { d: "3.1 mm", mi: [.1174, .1251], jn: .1445 } },
    "UNC-#5-40": { hc: { d: ["3.4 mm", "#29"], A: [.338, .4, .462, .525, .588, .225, .288, .35, .412, .475], M: [.16, .19], pd: [.1413, .143, .1438], C: [.15, .21, .28, .34, .4], mi: [.1305, .1373], tj: .1603, tap: ["05CPB", "05CPA", "05CBB", "05CBA"] }, rc: { d: ["#29", "3.4 mm"], mi: [.131, .135], jn: .1575, S: [.237, .3, .362, .425, .487], T: [.212, .275, .337, .4, .462] } },
    "UNC-#6-32": { hc: { d: ["#26", "#25"], A: [.394, .464, .532, .602, .67, .263, .332, .401, .47, .539], M: [.18, .21], pd: [.1583, .1601, .1611], C: [.17, .24, .31, .38, .45], mi: [.1448, .1527], tj: .1817, tap: ["06CPB", "06CPA", "06CBB", "06CBA"] }, rc: { d: ["#25", "3.7 mm"], mi: [.145, .15], jn: .1786, S: [.279, .348, .417, .486, .555], T: [.247, .316, .385, .454, .523] }, em: { d: "3.8 mm", mi: [.1448, .1527], jn: .1786 } },
    "UNC-#8-32": { hc: { d: ["#17", "#16"], A: [.434, .516, .598, .68, .762, .289, .371, .453, .535, .617], M: [.2, .23], pd: [.1843, .1862, .1872], C: [.2, .28, .36, .44, .52], mi: [.1708, .1781], tj: .2077, tap: ["2CPB", "2CPA", "2CBB", "2CBA"] }, rc: { d: ["11/64", "4.4 mm"], mi: [.171, .175], jn: .2046, S: [.305, .387, .469, .551, .633], T: [.273, .355, .437, .519, .601] }, em: { d: "4.4 mm", mi: [.1708, .1781], jn: .2046 } },
    "UNC-#10-24": { hc: { d: ["13/64", "#5"], A: [.535, .63, .725, .82, .915, .357, .452, .547, .642, .737], M: [.24, .27], pd: [.217, .2192, .2203], C: [.23, .33, .42, .52, .61], mi: [.199, .208], tj: .2475, tap: ["3CPB", "3CPA", "3CBB", "3CBA"] }, rc: { d: ["13/64", "5 mm"], mi: [.199, .205], jn: .2441, S: [.377, .472, .567, .662, .757], T: [.336, .431, .526, .621, .716] }, em: { d: "5.2 mm", mi: [.199, .208], jn: .2441 } },
    "UNC-#12-24": { hc: { d: ["#1", "#1"], A: [.574, .682, .79, .898, 1.006, .383, .491, .599, .707, .815], M: [.26, .29], pd: [.243, .2453, .2464], C: [.26, .37, .47, .58, .69], mi: [.225, .234], tj: .2735, tap: ["1CPB", "1CPA", "1CBB", "1CBA"], s: 1 }, rc: { d: ["15/64", "5.8 mm"], mi: [.225, .23], jn: .2701, S: [.404, .512, .62, .727, .836], T: [.362, .47, .578, .686, .794] } },
    "UNC-1/4-20": { hc: { d: ["H", "H"], A: [.675, .8, .925, 1.05, 1.175, .45, .575, .7, .825, .95], M: [.31, .34], pd: [.2825, .2851, .2864], C: [.3, .43, .55, .68, .8], mi: [.2608, .2704], tj: .3187, tap: ["4CPB", "4CPA", "4CBB", "4CBA"] }, rc: { d: ["17/64", "6.7 mm"], mi: [.261, .27], jn: .315, S: [.475, .6, .725, .85, .975], T: [.425, .55, .675, .8, .925] }, em: { d: "6.7 mm", mi: [.2609, .2706], jn: .315 } },
    "UNC-5/16-18": { hc: { d: ["Q", "Q"], A: [.801, .957, 1.113, 1.269, 1.425, .534, .69, .846, 1.002, 1.158], M: [.38, .41], pd: [.3486, .3515, .3529], C: [.37, .53, .68, .84, .99], mi: [.3245, .3342], tj: .3884, tap: ["5CPB", "5CPA", "5CBB", "5CBA"] }, rc: { d: ["21/64", "8.3 mm"], mi: [.325, .334], jn: .3847, S: [.562, .719, .875, 1.031, 1.187], T: [.507, .663, .819, .976, 1.132] }, em: { d: "8.4 mm", mi: [.3246, .3343], jn: .3847 } },
    "UNC-3/8-16": { hc: { d: ["X", "X"], A: [.75, .938, 1.125, 1.312, 1.5, .625, .812, 1, 1.188, 1.375], M: [.45, .48], pd: [.4156, .4189, .4203], C: [.44, .63, .81, 1, 1.19], mi: [.3885, .3987], tj: .4602, tap: ["6CPB", "6CPA", "6CBB", "6CBA"] }, rc: { d: ["25/64", "9.9 mm"], mi: [.389, .398], jn: .4562, S: [.656, .844, 1.031, 1.219, 1.406], T: [.594, .781, .969, 1.156, 1.344] }, em: { d: "10 mm", mi: [.3885, .3987], jn: .4562 } },
    "UNC-7/16-14": { hc: { d: ["29/64", "29/64"], A: [.867, 1.086, 1.305, 1.524, 1.743, .724, .943, 1.162, 1.381, 1.6], M: [.52, .55], pd: [.4839, .4875, .489], C: [.51, .73, .95, 1.17, 1.38], mi: [.453, .4639], tj: .5343, tap: ["7CPB", "7CPA", "7CBB", "7CBA"] }, rc: { d: ["29/64", "11.5 mm"], mi: [.453, .463], jn: .5303, S: [.759, .978, 1.196, 1.415, 1.634], T: [.687, .906, 1.125, 1.343, 1.562] }, em: { d: "11.6 mm", mi: [.453, .4639], jn: .5303 } },
    "UNC-1/2-13": { hc: { d: ["33/64", "17/32"], A: [.962, 1.212, 1.462, 1.712, 1.962, .808, 1.058, 1.308, 1.558, 1.808], M: [.59, .62], pd: [.5499, .5537, .5554], C: [.58, .83, 1.08, 1.33, 1.58], mi: [.5166, .5273], tj: .6042, tap: ["8CPB", "8CPA", "8CBB", "8CBA"], s: 1 }, rc: { d: ["17/32", "13 mm"], mi: [.517, .527], jn: .5999, S: [.846, 1.096, 1.346, 1.596, 1.846], T: [.769, 1.019, 1.269, 1.519, 1.769] }, em: { d: "13.3 mm", mi: [.5166, .5273], jn: .5999 } },
    "UNC-9/16-12": { hc: { d: ["37/64", "19/32"], A: [1.062, 1.343, 1.624, 1.905, 2.186, .895, 1.176, 1.457, 1.738, 2.019], M: [.66, .69], pd: [.6167, .6208, .6225], C: [.65, .93, 1.21, 1.49, 1.77], mi: [.5806, .5918], tj: .6751, tap: ["187-9", "38187-9", "4187-9", "43187-9"], s: 1 }, rc: { d: ["19/32", "14.5 mm"], mi: [.581, .591], jn: .6708, S: [.937, 1.219, 1.5, 1.781, 2.062], T: [.854, 1.135, 1.417, 1.698, 1.979] }, em: { d: "14.9 mm", mi: [.5806, .5918], jn: .6708 } },
    "UNC-5/8-11": { hc: { d: ["21/32", "21/32"], A: [1.17, 1.483, 1.795, 2.108, 2.42, .989, 1.301, 1.614, 1.926, 2.239], M: [.73, .76], pd: [.6841, .6885, .6903], C: [.72, 1.03, 1.34, 1.65, 1.97], mi: [.6447, .6564], tj: .7477, tap: ["8187-10", "18187-10", "10187-10", "20187-10"] }, rc: { d: ["21/32", "16.5 mm"], mi: [.645, .656], jn: .7431, S: [1.034, 1.347, 1.659, 1.972, 2.284], T: [.943, 1.256, 1.568, 1.881, 2.193] }, em: { d: "16.5 mm", mi: [.6447, .6564], jn: .7431 } },
    "UNC-3/4-10": { hc: { d: ["25/32", "25/32"], A: [1.35, 1.725, 2.1, 2.475, 2.85, 1.15, 1.525, 1.9, 2.275, 2.65], M: [.87, .9], pd: [.8149, .8196, .8216], C: [.85, 1.23, 1.6, 1.98, 2.35], mi: [.7716, .7838], tj: .885, tap: ["8187-12", "18187-12", "10187-12", "20187-12"] }, rc: { d: ["25/32", "19.8 mm"], mi: [.772, .783], jn: .8799, S: [1.2, 1.575, 1.95, 2.325, 2.7], T: [1.1, 1.475, 1.85, 2.225, 2.6] }, em: { d: "19.75 mm", mi: [.7716, .7838], jn: .8799 } },
    "UNC-7/8-9": { hc: { d: ["29/32", "29/32"], A: [1.542, 1.979, 2.417, 2.854, 3.292, 1.319, 1.757, 2.194, 2.632, 3.069], M: [1, 1.03], pd: [.9471, .9522, .9543], C: [.99, 1.42, 1.86, 2.3, 2.74], mi: [.899, .9119], tj: 1.0247, tap: ["8187-14", "18187-14", "10187-14", "20187-14"] }, rc: { d: ["29/32", "23 mm"], mi: [.899, .912], jn: 1.0193, S: [1.375, 1.812, 2.25, 2.687, 3.125], T: [1.264, 1.701, 2.139, 2.576, 3.014] } },
    "UNC-1-8": { hc: { d: ["1-1/32\"", "1-1/32\""], A: [1.75, 2.25, 2.75, 3.25, 3.75, 1.5, 2, 2.5, 3, 3.5], M: [1.14, 1.17], pd: [1.0812, 1.0868, 1.089], C: [1.13, 1.63, 2.13, 2.63, 3.13], mi: [1.0271, 1.0421], tj: 1.1681, tap: ["8187-16", "18187-16", "10187-16", "20187-16"] }, rc: { d: ["1-1/32\"", "26 mm"], mi: [1.027, 1.042], jn: 1.1624, S: [1.563, 2.062, 2.562, 3.062, 3.562], T: [1.437, 1.937, 2.437, 2.937, 3.437] } },
    "UNC-1-1/8-7": { hc: { d: ["1-11/64\"", "1-11/64\""], A: [1.982, 2.545, 3.107, 3.67, 4.232, 1.696, 2.259, 2.821, 3.384, 3.946], M: [1.29, 1.32], pd: [1.2178, 1.2239, 1.2262], C: [1.27, 1.83, 2.39, 2.96, 3.52], mi: [1.1559, 1.173], tj: 1.3171, tap: ["8187-18", "18187-18", "10187-18", "20187-18"] }, rc: { d: ["1-5/32\"", "29.5 mm"], mi: [1.156, 1.17], jn: 1.3106, S: [1.768, 2.33, 2.893, 3.455, 4.018], T: [1.625, 2.187, 2.75, 3.312, 3.875] } },
    "UNC-1-1/4-7": { hc: { d: ["1-19/64\"", "1-19/64\""], A: [2.107, 2.732, 3.357, 3.982, 4.607, 1.821, 2.446, 3.071, 3.696, 4.321], M: [1.41, 1.44], pd: [1.3428, 1.349, 1.3514], C: [1.39, 2.02, 2.64, 3.27, 3.89], mi: [1.2809, 1.298], tj: 1.4421, tap: ["8187-20", "18187-20", "10187-20", "20187-20"] }, rc: { d: ["1-9/32\"", "33 mm"], mi: [1.281, 1.295], jn: 1.4356, S: [1.893, 2.518, 3.143, 3.768, 4.393], T: [1.75, 2.375, 3, 3.625, 4.25] } },
    "UNC-1-3/8-6": { hc: { d: ["1-27/64\"", "1-27/64\""], A: [2.375, 3.062, 3.75, 4.437, 5.125, 2.042, 2.729, 3.417, 4.104, 4.792], M: [1.56, 1.59], pd: [1.4832, 1.49, 1.4926], C: [1.54, 2.23, 2.92, 3.6, 4.29], mi: [1.411, 1.431], tj: 1.5982, tap: ["8187-22", "18187-22", "10187-22", "20187-22"] }, rc: { d: ["1-13/32\"", "36 mm"], mi: [1.411, 1.431], jn: 1.5914, S: [2.125, 2.812, 3.5, 4.187, 4.875], T: [1.958, 2.646, 3.333, 4.021, 4.708] } },
    "UNC-1-1/2-6": { hc: { d: ["1-35/64\"", "1-35/64\""], A: [2.5, 3.25, 4, 4.75, 5.5, 2.167, 2.917, 3.667, 4.417, 5.167], M: [1.69, 1.72], pd: [1.6082, 1.6151, 1.6177], C: [1.67, 2.42, 3.17, 3.92, 4.67], mi: [1.536, 1.556], tj: 1.7232, tap: ["8187-24", "18187-24", "10187-24", "20187-24"] }, rc: { d: ["1-17/32\"", "39 mm"], mi: [1.536, 1.556], jn: 1.7164, S: [2.25, 3, 3.75, 4.5, 5.25], T: [null, 2.833, 3.583, 4.333, 5.083] } },
    "UNF-#2-64": { hc: { d: ["2.35 mm", "2.35 mm"], A: [.223, .266, .309, .352, .395, .149, .192, .235, .278, .321], M: [.09, .11], pd: [.0962, .0974, .0981], C: [.1, .145, .19, .23, .275], mi: [.0894, .0947], tj: .1088, tap: ["02FPB", "02FPA", "02FBB", "02FBA"] } },
    "UNF-#3-56": { hc: { d: ["#37", "#36"], A: [.256, .305, .355, .404, .454, .17, .22, .269, .319, .368], M: [.11, .14], pd: [.1106, .1119, .1126], C: [.12, .17, .22, .27, .31], mi: [.1029, .1086], tj: .1247, tap: ["03FPB", "03FPA", "03FBB", "03FBA"] }, rc: { d: ["#37", "2.65 mm"], mi: [.103, .106], jn: .1222 } },
    "UNF-#4-48": { hc: { d: ["3 mm", "#31"], A: [.293, .349, .405, .461, .517, .195, .251, .307, .363, .419], M: [.14, .17], pd: [.1256, .1271, .1279], C: [.13, .19, .24, .3, .36], mi: [.1166, .1229], tj: .1419, tap: ["04FPB", "04FPA", "04FBB", "04FBA"] }, rc: { d: ["#31", "3 mm"], mi: [.117, .12], jn: .1391 }, em: { d: "3 mm", mi: [.1165, .1228], jn: .1391 } },
    "UNF-#5-44": { rc: { d: [null, "3.3 mm"], mi: [.13, .134], jn: .1545 } },
    "UNF-#6-40": { hc: { d: ["#26", "#25"], A: [.357, .426, .495, .564, .633, .238, .307, .376, .445, .514], M: [.17, .2], pd: [.1543, .156, .1569], C: [.16, .23, .3, .37, .44], mi: [.1435, .1503], tj: .1733, tap: ["06FPB", "06FPA", "06FBB", "06FBA"] }, rc: { d: ["#26", "3.7 mm"], mi: [.144, .148], jn: .1705 }, em: { d: "3.7 mm", mi: [.1434, .1502], jn: .1705 } },
    "UNF-#8-36": { hc: { d: ["#17", "#16"], A: [.413, .495, .577, .659, .741, .275, .357, .439, .521, .603], M: [.2, .23], pd: [.1821, .184, .1849], C: [.19, .27, .36, .44, .52], mi: [.1701, .1771], tj: .2032, tap: ["2FPB", "2FPA", "2FBB", "2FBA"] }, rc: { d: ["11/64", "4.4 mm"], mi: [.17, .174], jn: .2001 }, em: { d: "4.4 mm", mi: [.17, .177], jn: .2001 } },
    "UNF-#10-32": { hc: { d: ["#7", "13/64"], A: [.472, .568, .662, .758, .852, .315, .41, .505, .6, .695], M: [.23, .26], pd: [.2103, .2123, .2133], C: [.22, .32, .41, .51, .6], mi: [.1968, .2041], tj: .2337, tap: ["3FPB", "3FPA", "3FBB", "3FBA"] }, rc: { d: ["13/64", "5.1 mm"], mi: [.197, .201], jn: .2306 }, em: { d: "5.1 mm", mi: [.1968, .2041], jn: .2306 } },
    "UNF-1/4-28": { hc: { d: ["G", "6.7 mm"], A: [.589, .714, .839, .964, 1.089, .393, .518, .643, .768, .893], M: [.29, .32], pd: [.2732, .2754, .2765], C: [.29, .41, .54, .66, .79], mi: [.2577, .2646], tj: .2995, tap: ["4FPB", "4FPA", "4FBB", "4FBA"] }, rc: { d: ["17/64", "6.6 mm"], mi: [.258, .264], jn: .2964 }, em: { d: "6.6 mm", mi: [.2577, .2646], jn: .2964 } },
    "UNF-5/16-24": { hc: { d: ["21/64", "21/64"], A: [.718, .874, 1.03, 1.186, 1.342, .479, .635, .791, .947, 1.103], M: [.36, .39], pd: [.3395, .3421, .3433], C: [.35, .51, .67, .82, .98], mi: [.3215, .3288], tj: .37, tap: ["5FPB", "5FPA", "5FBB", "5FBA"] }, rc: { d: ["21/64", "8.2 mm"], mi: [.322, .328], jn: .3666 }, em: { d: "8.25 mm", mi: [.3215, .3288], jn: .3666 } },
    "UNF-3/8-24": { hc: { d: ["25/64", "25/64"], A: [.625, .812, 1, 1.187, 1.375, .542, .729, .917, 1.104, 1.292], M: [.42, .45], pd: [.402, .4047, .4059], C: [.42, .6, .79, .98, 1.17], mi: [.384, .391], tj: .4325, tap: ["6FPB", "6FPA", "6FBB", "6FBA"] }, rc: { d: ["25/64", "9.8 mm"], mi: [.384, .39], jn: .4291 }, em: { d: "9.8 mm", mi: [.384, .391], jn: .4291 } },
    "UNF-7/16-20": { hc: { d: ["29/64", "29/64"], A: [.738, .957, 1.176, 1.395, 1.614, .638, .857, 1.076, 1.295, 1.514], M: [.5, .53], pd: [.47, .4731, .4744], C: [.49, .71, .93, 1.14, 1.36], mi: [.4483, .4561], tj: .5062, tap: ["7FPB", "7FPA", "7FBB", "7FBA"] }, rc: { d: ["29/64", "11.5 mm"], mi: [.449, .456], jn: .5025 }, em: { d: "11.5 mm", mi: [.4484, .4562], jn: .5025 } },
    "UNF-1/2-20": { hc: { d: ["33/64", "33/64"], A: [.8, 1.05, 1.3, 1.55, 1.8, .7, .95, 1.2, 1.45, 1.7], M: [.56, .59], pd: [.5325, .5357, .5371], C: [.55, .8, 1.05, 1.3, 1.55], mi: [.5108, .5186], tj: .5687, tap: ["8FPB", "8FPA", "8FBB", "8FBA"] }, rc: { d: ["33/64", "13 mm"], mi: [.511, .518], jn: .565 }, em: { d: "13.1 mm", mi: [.5109, .5187], jn: .565 } },
    "UNF-9/16-18": { hc: { d: ["37/64", "37/64"], A: [.895, 1.176, 1.457, 1.738, 2.019, .784, 1.065, 1.346, 1.627, 1.908], M: [.63, .66], pd: [.5986, .602, .6035], C: [.62, .9, 1.18, 1.46, 1.74], mi: [.5745, .5826], tj: .6384, tap: ["38193-9", "18193-9", "43193-9", "20193-9"] }, rc: { d: ["37/64", "14.5 mm"], mi: [.575, .582], jn: .6347 }, em: { d: "14.7 mm", mi: [.5746, .5827], jn: .6347 } },
    "UNF-5/8-18": { hc: { d: ["41/64", "41/64"], A: [.958, 1.271, 1.583, 1.896, 2.208, .847, 1.16, 1.472, 1.785, 2.097], M: [.69, .72], pd: [.6611, .6646, .6661], C: [.68, .99, 1.31, 1.62, 1.93], mi: [.637, .6451], tj: .7009, tap: ["8193-10", "18193-10", "10193-10", "20193-10"] }, rc: { d: ["41/64", "16.25 mm"], mi: [.637, .644], jn: .6972 }, em: { d: "16.25 mm", mi: [.6371, .6452], jn: .6972 } },
    "UNF-3/4-16": { hc: { d: ["49/64", "49/64"], A: [1.125, 1.5, 1.875, 2.25, 2.625, 1, 1.375, 1.75, 2.125, 2.5], M: [.82, .85], pd: [.7906, .7945, .7961], C: [.81, 1.19, 1.56, 1.94, 2.31], mi: [.7635, .772], tj: .8352, tap: ["8193-12", "18193-12", "10193-12", "20193-12"] }, rc: { d: ["49/64", "19.5 mm"], mi: [.764, .771], jn: .8312 }, em: { d: "19.5 mm", mi: [.7635, .772], jn: .8312 } },
    "UNF-7/8-14": { hc: { d: ["57/64", "57/64"], A: [1.304, 1.741, 2.179, 2.616, 3.054, 1.161, 1.598, 2.036, 2.473, 2.911], M: [.96, .99], pd: [.9214, .9257, .9274], C: [.95, 1.38, 1.82, 2.26, 2.7], mi: [.8905, .8994], tj: .9718, tap: ["8193-14", "18193-14", "10193-14", "20193-14"] }, rc: { d: ["57/64", "22.5 mm"], mi: [.891, .899], jn: .9678 } },
    "UNF-1-12": { hc: { d: ["1-1/64\"", "1-1/32\""], A: [1.5, 2, 2.5, 3, 3.5, 1.333, 1.833, 2.333, 2.833, 3.333], M: [1.1, 1.13], pd: [1.0542, 1.0589, 1.0608], C: [1.08, 1.58, 2.08, 2.58, 3.08], mi: [1.0181, 1.0281], tj: 1.1126, tap: ["8193-161", "18193-161", "10193-161", "20193-161"], s: 1 }, rc: { d: ["1-1/64\"", "26 mm"], mi: [1.018, 1.028], jn: 1.1083 } },
    "UNF-1-1/8-12": { hc: { d: ["1-9/64\"", "1-5/32\""], A: [1.625, 2.187, 2.75, 3.312, 3.875, 1.458, 2.021, 2.583, 3.146, 3.708], M: [1.22, 1.25], pd: [1.1792, 1.1841, 1.186], C: [1.21, 1.77, 2.33, 2.9, 3.46], mi: [1.1431, 1.1531], tj: 1.2376, tap: ["8193-18", "18193-18", "10193-18", "20193-18"], s: 1 }, rc: { d: ["1-5/32\"", "29.5 mm"], mi: [1.143, 1.153], jn: 1.2333 } },
    "UNF-1-1/4-12": { hc: { d: ["1-17/64\"", "1-9/32\""], A: [1.75, 2.375, 3, 3.625, 4.25, 1.583, 2.208, 2.833, 3.458, 4.083], M: [1.35, 1.38], pd: [1.3042, 1.3092, 1.3112], C: [1.33, 1.96, 2.58, 3.21, 3.83], mi: [1.2681, 1.2781], tj: 1.3626, tap: ["8193-20", "18193-20", "10193-20", "20193-20"], s: 1 }, rc: { d: ["1-9/32\"", "32.5 mm"], mi: [1.268, 1.278], jn: 1.3583 } },
    "UNF-1-3/8-12": { hc: { d: ["1-25/64\"", "1-13/32\""], A: [1.875, 2.562, 3.25, 3.937, 4.625, 1.708, 2.396, 3.083, 3.771, 4.458], M: [1.47, 1.5], pd: [1.4292, 1.4343, 1.4364], C: [1.46, 2.15, 2.83, 3.52, 4.21], mi: [1.3931, 1.4031], tj: 1.4876, tap: ["8193-22", "18193-22", "10193-22", "20193-22"], s: 1 }, rc: { d: ["1-13/32\"", "36 mm"], mi: [1.393, 1.403], jn: 1.4833 } },
    "UNF-1-1/2-12": { hc: { d: ["1-33/64\"", "1-17/32\""], A: [2, 2.75, 3.5, 4.25, 5, 1.833, 2.583, 3.333, 4.083, 4.833], M: [1.6, 1.63], pd: [1.5542, 1.5595, 1.5615], C: [1.58, 2.33, 3.08, 3.83, 4.58], mi: [1.5181, 1.5281], tj: 1.6126, tap: ["8193-24", "18193-24", "10193-24", "20193-24"], s: 1 }, rc: { d: ["1-17/32\"", "39 mm"], mi: [1.518, 1.528], jn: 1.6083 } },
    "M2x0.4": { hc: { d: ["2.1 mm", "2.1 mm"], A: [5.4, 6.4, 7.4, 8.4, 9.4, 3.6, 4.6, 5.6, 6.6, 7.6], M: [2.3, 2.7], pd: [2.26, 2.295, 2.31], C: [2.4, 3.4, 4.4, 5.4, 6.4], mi: [2.087, 2.199], tj: 2.581, tap: ["4687-2", "2087-2", "4693-2", "2093-2"] }, rc: { d: [null, "2.1 mm"], mi: [2.087, 2.177], jn: 2.52, S: [3.8, 4.8, 5.8, 6.8, 7.8], T: [3.4, 4.4, 5.4, 6.4, 7.4] } },
    "M2.5x0.45": { hc: { d: ["2.55 mm", "2.65 mm"], A: [6.45, 7.7, 8.95, 10.2, 11.45, 4.3, 5.55, 6.8, 8.05, 9.3], M: [2.9, 3.4], pd: [2.792, 2.832, 2.847], C: [3, 4.2, 5.5, 6.7, 8], mi: [2.597, 2.722], tj: 3.145, tap: ["4687-2.5", "2087-2.5", "4693-2.5", "2093-2.5"] }, rc: { d: [null, "2.6 mm"], mi: [2.597, 2.697], jn: 3.085, S: [4.53, 5.78, 7.03, 8.28, 9.53], T: [4.08, 5.33, 6.58, 7.83, 9.08] }, em: { d: "2.65 mm", mi: [2.597, 2.697], jn: 3.084 } },
    "M3x0.5": { hc: { d: ["3.15 mm", "3.2 mm"], A: [7.5, 9, 10.5, 12, 13.5, 5, 6.5, 8, 9.5, 11], M: [3.4, 4], pd: [3.325, 3.367, 3.384], C: [3.5, 5, 6.5, 8, 9.5], mi: [3.108, 3.248], tj: 3.716, tap: ["4687-3", "2087-3", "4693-3", "2093-3"] }, rc: { d: [null, "3.1 mm"], mi: [3.108, 3.22], jn: 3.65, S: [5.25, 6.75, 8.25, 9.75, 11.25], T: [4.75, 6.25, 7.75, 9.25, 10.75] }, em: { d: "3.15 mm", mi: [3.108, 3.22], jn: 3.65 } },
    "M3.5x0.6": { hc: { d: ["3.7 mm", "3.7 mm"], A: [8.85, 10.6, 12.35, 14.1, 15.85, 5.9, 7.65, 9.4, 11.15, 12.9], M: [4.1, 4.7], pd: [3.89, 3.94, 3.959], C: [4.1, 5.9, 7.6, 9.4, 11.1], mi: [3.63, 3.79], tj: 4.354, tap: ["4687-3.5", "2087-3.5", "4693-3.5", "2093-3.5"] }, rc: { d: [null, "3.6 mm"], mi: [3.63, 3.755], jn: 4.279, S: [6.2, 7.95, 9.7, 11.45, 13.2], T: [5.6, 7.35, 9.1, 10.85, 12.6] } },
    "M4x0.7": { hc: { d: ["4.2 mm", "4.25 mm"], A: [10.2, 12.2, 14.2, 16.2, 18.2, 6.8, 8.8, 10.8, 12.8, 14.8], M: [4.7, 5.3], pd: [4.455, 4.509, 4.529], C: [4.7, 6.7, 8.7, 10.7, 12.7], mi: [4.152, 4.332], tj: 5.007, tap: ["4687-4", "2087-4", "4693-4", "2093-4"] }, rc: { d: [null, "4.15 mm"], mi: [4.152, 4.292], jn: 4.909, S: [7.15, 9.15, 11.15, 13.15, 15.15], T: [6.45, 8.45, 10.45, 12.45, 14.45] }, em: { d: "4.2 mm", mi: [4.152, 4.292], jn: 4.91 } },
    "M5x0.8": { hc: { d: ["5.2 mm", "5.3 mm"], A: [12.3, 14.8, 17.3, 19.8, 22.3, 8.2, 10.7, 13.2, 15.7, 18.2], M: [5.8, 6.4], pd: [5.52, 5.577, 5.597], C: [5.8, 8.3, 10.8, 13.3, 15.8], mi: [5.174, 5.374], tj: 6.145, tap: ["4687-5", "2087-5", "4693-5", "2093-5"] }, rc: { d: [null, "5.2 mm"], mi: [5.173, 5.333], jn: 6.039, S: [8.6, 11.1, 13.6, 16.1, 18.6], T: [7.8, 10.3, 12.8, 15.3, 17.8] }, em: { d: "5.25 mm", mi: [5.174, 5.334], jn: 6.04 } },
    "M6x1": { hc: { d: ["6.25 mm", "6.3 mm"], A: [15, 18, 21, 24, 27, 10, 13, 16, 19, 22], M: [7.1, 7.7], pd: [6.65, 6.719, 6.742], C: [7, 10, 13, 16, 19], mi: [6.217, 6.407], tj: 7.422, tap: ["4687-6", "2087-6", "4693-6", "2093-6"] }, rc: { d: [null, "6.2 mm"], mi: [6.216, 6.406], jn: 7.299, S: [10.5, 13.5, 16.5, 19.5, 22.5], T: [9.5, 12.5, 15.5, 18.5, 21.5] }, em: { d: "6.3 mm", mi: [6.217, 6.407], jn: 7.3 } },
    "M7x1": { hc: { d: ["7.25 mm", "7.3 mm"], A: [16.5, 20, 23.5, 27, 30.5, 11, 14.5, 18, 21.5, 25], M: [8.1, 8.7], pd: [7.65, 7.719, 7.742], C: [8, 11.5, 15, 18.5, 22], mi: [7.217, 7.407], tj: 8.422, tap: ["4687-7", "2087-7", "4693-7", "2093-7"] }, rc: { d: [null, "7.2 mm"], mi: [7.216, 7.406], jn: 8.299, S: [11.5, 15, 18.5, 22, 25.5], T: [10.5, 14, 17.5, 21, 24.5] } },
    "M8x1.25": { hc: { d: ["8.3 mm", "8.4 mm"], A: [19.5, 23.5, 27.5, 31.5, 35.5, 13, 17, 21, 25, 29], M: [9.5, 10.1], pd: [8.812, 8.886, 8.911], C: [9.3, 13.3, 17.3, 21.3, 25.3], mi: [8.271, 8.483], tj: 9.787, tap: ["4687-8", "2087-8", "4693-8", "2093-8"] }, rc: { d: [null, "8.3 mm"], mi: [8.271, 8.483], jn: 9.624, S: [13.63, 17.63, 21.63, 25.63, 29.63], T: [12.38, 16.38, 20.38, 24.38, 28.38] }, em: { d: "8.4 mm", mi: [8.271, 8.483], jn: 9.624 } },
    "M10x1.5": { hc: { d: ["10.5 mm", "10.5 mm"], A: [19, 24, 29, 34, 39, 16, 21, 26, 31, 36], M: [11.8, 12.4], pd: [10.974, 11.061, 11.089], C: [11.5, 16.5, 21.5, 26.5, 31.5], mi: [10.324, 10.56], tj: 12.131, tap: ["4687-10", "2087-10", "4693-10", "2093-10"] }, rc: { d: [null, "10.3 mm"], mi: [10.325, 10.561], jn: 11.949, S: [16.75, 21.75, 26.75, 31.75, 36.75], T: [15.25, 20.25, 25.25, 30.25, 35.25] }, em: { d: "10.5 mm", mi: [10.324, 10.56], jn: 11.948 } },
    "M12x1.75": { hc: { d: ["12.5 mm", "12.5 mm"], A: [22.5, 28.5, 34.5, 40.5, 46.5, 19, 25, 31, 37, 43], M: [14.2, 14.8], pd: [13.137, 13.236, 13.271], C: [13.8, 19.8, 25.8, 31.8, 37.8], mi: [12.379, 12.644], tj: 14.478, tap: ["4687-12", "2087-12", "4693-12", "2093-12"] }, rc: { d: [null, "12.4 mm"], mi: [12.379, 12.644], jn: 14.273, S: [19.88, 25.88, 31.88, 37.88, 43.88], T: [18.13, 24.13, 30.13, 36.13, 42.13] }, em: { d: "12.5 mm", mi: [12.379, 12.644], jn: 14.274 } },
    "M14x2": { hc: { d: ["14.5 mm", "14.5 mm"], A: [26, 33, 40, 47, 54, 22, 29, 36, 43, 50], M: [16.5, 17.1], pd: [15.299, 15.406, 15.444], C: [16, 23, 30, 37, 44], mi: [14.433, 14.733], tj: 16.822, tap: ["4687-14", "2087-14", "4693-14", "2093-14"] }, rc: { d: [null, "14.4 mm"], mi: [14.433, 14.733], jn: 16.598, S: [23, 30, 37, 44, 51], T: [21, 28, 35, 42, 49] }, em: { d: "14.5 mm", mi: [14.433, 14.733], jn: 16.598 } },
    "M16x2": { hc: { d: ["16.5 mm", "16.5 mm"], A: [28, 36, 44, 52, 60, 24, 32, 40, 48, 56], M: [18.5, 19.1], pd: [17.299, 17.406, 17.444], C: [18, 26, 34, 42, 50], mi: [16.433, 16.733], tj: 18.822, tap: ["4687-16", "2087-16", "4693-16", "2093-16"] }, rc: { d: [null, "16.5 mm"], mi: [16.433, 16.733], jn: 18.598, S: [25, 33, 41, 49, 57], T: [23, 31, 39, 47, 55] }, em: { d: "16.5 mm", mi: [16.433, 16.733], jn: 18.598 } },
    "M18x2.5": { hc: { d: ["18.75 mm", "18.75 mm"], A: [33, 42, 51, 60, 69, 28, 37, 46, 55, 64], M: [21.2, 21.8], pd: [19.624, 19.738, 19.778], C: [20.5, 29.5, 38.5, 47.5, 56.5], mi: [18.541, 18.896], tj: 21.513, tap: ["4687-18", "2087-18", "4693-18", "2093-18"] }, rc: { d: [null, "18.5 mm"], mi: [18.541, 18.896], jn: 21.248, S: [29.25, 38.25, 47.25, 56.25, 65.25], T: [26.75, 35.75, 44.75, 53.75, 62.75] }, em: { d: "18.75 mm", mi: [18.541, 18.896], jn: 21.248 } },
    "M20x2.5": { hc: { d: ["20.75 mm", "20.75 mm"], A: [35, 45, 55, 65, 75, 30, 40, 50, 60, 70], M: [23.2, 23.8], pd: [21.624, 21.738, 21.778], C: [22.5, 32.5, 42.5, 52.5, 62.5], mi: [20.541, 20.896], tj: 23.513, tap: ["4687-20", "2087-20", "4693-20", "2093-20"] }, rc: { d: [null, "20.5 mm"], mi: [20.541, 20.896], jn: 23.248, S: [31.25, 41.25, 51.25, 61.25, 71.25], T: [28.75, 38.75, 48.75, 58.75, 68.75] }, em: { d: "20.75 mm", mi: [20.541, 20.896], jn: 23.248 } },
    "M22x2.5": { hc: { d: ["22.75 mm", "22.75 mm"], A: [37, 48, 59, 70, 81, 32, 43, 54, 65, 76], M: [25.2, 25.5], pd: [23.624, 23.738, 23.778], C: [24.5, 35.5, 46.5, 57.5, 68.5], mi: [22.541, 22.896], tj: 25.513, tap: ["4687-22", "2087-22", "4693-22", "2093-22"] }, rc: { d: [null, "22.5 mm"], mi: [22.541, 22.896], jn: 25.248, S: [33.25, 44.25, 55.25, 66.25, 77.25], T: [30.75, 41.75, 52.75, 63.75, 74.75] } },
    "M24x3": { hc: { d: ["24.75 mm", "24.75 mm"], A: [42, 54, 66, 78, 90, 36, 48, 60, 72, 84], M: [27.9, 28.5], pd: [25.948, 26.093, 26.135], C: [27, 39, 51, 63, 75], mi: [24.649, 25.049], tj: 28.238, tap: ["4687-24", "2087-24", "4693-24", "2093-24"] }, rc: { d: [null, "24.75 mm"], mi: [24.65, 25.05], jn: 27.897, S: [37.5, 49.5, 61.5, 73.5, 85.5], T: [34.5, 46.5, 58.5, 70.5, 82.5] } },
    "M27x3": { hc: { d: ["27.75 mm", "27.75 mm"], A: [45, 58.5, 72, 85.5, 99, 39, 52.5, 66, 79.5, 93], M: [30.9, 31.5], pd: [28.948, 29.093, 29.135], C: [30, 43.5, 57, 70.5, 84], mi: [27.649, 28.049], tj: 31.238, tap: ["4687-27", "2087-27", "4693-27", "2093-27"] }, rc: { d: [null, "27.5 mm"], mi: [27.65, 28.05], jn: 30.897, S: [40.5, 54, 67.5, 81, 94.5], T: [37.5, 51, 64.5, 78, 91.5] } },
    "M30x3.5": { hc: { d: ["31 mm", "31 mm"], A: [51, 66, 81, 96, 111, 44, 59, 74, 89, 104], M: [34.6, 35.2], pd: [32.273, 32.428, 32.472], C: [33.5, 48.5, 63.5, 78.5, 93.5], mi: [30.757, 31.207], tj: 34.925, tap: ["4687-30", "2087-30", "4693-30", "2093-30"] }, rc: { d: [null, "30.5 mm"], mi: [30.758, 31.208], jn: 34.547, S: [45.75, 60.75, 75.75, 90.75, 105.75], T: [42.25, 57.25, 72.25, 87.25, 102.25] } },
    "M33x3.5": { hc: { d: ["34 mm", "34 mm"], A: [54, 70.5, 87, 103.5, 120, 47, 63.5, 80, 96.5, 113], M: [37.6, 38.2], pd: [35.273, 35.428, 35.472], C: [36.5, 53, 69.5, 86, 102.5], mi: [33.757, 34.207], tj: 37.925, tap: ["4687-33", "2087-33", "4693-33", "2093-33"] }, rc: { d: [null, "33.5 mm"], mi: [33.758, 34.208], jn: 37.547, S: [48.75, 65.25, 81.75, 98.25, 114.75], T: [45.25, 61.75, 78.25, 94.75, 111.25] } },
    "M36x4": { hc: { d: ["37 mm", "37 mm"], A: [60, 78, 96, 114, 132, 52, 70, 88, 106, 124], M: [41.3, 41.9], pd: [38.598, 38.763, 38.809], C: [40, 58, 76, 94, 112], mi: [36.866, 37.341], tj: 41.615, tap: ["4687-36", "2087-36", "4693-36", "2093-36"] }, rc: { d: [null, "36.5 mm"], mi: [36.866, 37.341], jn: 41.196, S: [54, 72, 90, 108, 126], T: [50, 68, 86, 104, 122] } },
    "M39x4": { hc: { d: ["40 mm", "40 mm"], A: [63, 82.5, 102, 121.5, 141, 55, 74.5, 94, 113.5, 133], M: [44.3, 44.9], pd: [41.598, 41.763, 41.809], C: [43, 62.5, 82, 101.5, 121], mi: [39.866, 40.341], tj: 44.615, tap: ["4687-39", "2087-39", "4693-39", "2093-39"] }, rc: { d: [null, "39.5 mm"], mi: [39.866, 40.341], jn: 44.196, S: [57, 76.5, 96, 115.5, 135], T: [53, 72.5, 92, 111.5, 131] } },
    "M8x1": { hc: { d: ["8.25 mm", "8.3 mm"], A: [18, 22, 26, 30, 34, 12, 16, 20, 24, 28], M: [9.1, 9.7], pd: [8.65, 8.719, 8.742], C: [9, 13, 17, 21, 25], mi: [8.217, 8.407], tj: 9.422, tap: ["5484-8", "4984-8", "5486-8", "4986-8"] }, rc: { d: [null, "8.2 mm"], mi: [8.216, 8.406], jn: 9.299, S: [12.5, 16.5, 20.5, 24.5, 28.5], T: [11.5, 15.5, 19.5, 23.5, 27.5] } },
    "M10x1.25": { hc: { d: ["10.25 mm", "10.25 mm"], A: [17.5, 22.5, 27.5, 32.5, 37.5, 15, 20, 25, 30, 35], M: [11.5, 12.1], pd: [10.812, 10.886, 10.911], C: [11.3, 16.3, 21.3, 26.3, 31.3], mi: [10.271, 10.483], tj: 11.787, tap: ["5444-10", "4944-10", "5445-10", "4945-10"], s: 1 }, rc: { d: [null, "10.3 mm"], mi: [10.271, 10.483], jn: 11.624, S: [15.63, 20.63, 25.63, 30.63, 35.63], T: [14.38, 19.38, 24.38, 29.38, 34.38] } },
    "M10x1": { hc: { d: ["10.25 mm", "10.25 mm"], A: [16, 21, 26, 31, 36, 14, 19, 24, 29, 34], M: [11.1, 11.7], pd: [10.65, 10.719, 10.742], C: [11, 16, 21, 26, 31], mi: [10.217, 10.407], tj: 11.422, tap: ["5484-10", "4984-10", "5486-10", "4986-10"] } },
    "M12x1.5": { hc: { d: ["12.25 mm", "12.5 mm"], A: [21, 27, 33, 39, 45, 18, 24, 30, 36, 42], M: [13.8, 14.4], pd: [12.974, 13.067, 13.099], C: [13.5, 19.5, 25.5, 31.5, 37.5], mi: [12.324, 12.56], tj: 14.131, tap: ["5476-12", "4976-12", "5477-12", "4977-12"], s: 1 } },
    "M12x1.25": { hc: { d: ["12.25 mm", "12.25 mm"], A: [19.5, 25.5, 31.5, 37.5, 43.5, 17, 23, 29, 35, 41], M: [13.5, 14.1], pd: [12.812, 12.898, 12.926], C: [13.3, 19.3, 25.3, 31.3, 37.3], mi: [12.271, 12.483], tj: 13.787, tap: ["5444-12", "4944-12", "5445-12", "4945-12"], s: 1 }, rc: { d: [null, "12.3 mm"], mi: [12.271, 12.483], jn: 13.624, S: [17.63, 23.63, 29.63, 35.63, 41.63], T: [16.38, 22.38, null, 34.38, 40.38] } },
    "M14x1.5": { hc: { d: ["14.25 mm", "14.5 mm"], A: [23, 30, 37, 44, 51, 20, 27, 34, 41, 48], M: [15.8, 16.4], pd: [14.974, 15.067, 15.099], C: [15.5, 22.5, 29.5, 36.5, 43.5], mi: [14.324, 14.56], tj: 16.131, tap: ["5476-14", "4976-14", "5477-14", "4977-14"], s: 1 }, rc: { d: [null, "14.3 mm"], mi: [14.325, 14.561], jn: 15.949, S: [20.75, 27.75, 34.75, 41.75, 48.75], T: [19.25, 26.25, 33.25, 40.25, 47.25] } },
    "M16x1.5": { hc: { d: ["16.25 mm", "16.5 mm"], A: [25, 33, 41, 49, 57, 22, 30, 38, 46, 54], M: [17.8, 18.4], pd: [16.974, 17.067, 17.099], C: [17.5, 25.5, 33.5, 41.5, 49.5], mi: [16.324, 16.56], tj: 18.131, tap: ["5476-16", "4976-16", "5477-16", "4977-16"], s: 1 }, rc: { d: [null, "16.25 mm"], mi: [16.325, 16.561], jn: 17.949, S: [22.75, 30.75, 38.75, 46.75, 54.75], T: [21.25, 29.25, 37.25, 45.25, 53.25] } },
    "M18x2": { hc: { d: ["18.5 mm", "18.5 mm"], A: [30, 39, 48, 57, 66, 26, 35, 44, 53, 62], M: [20.5, 21.1], pd: [19.299, 19.406, 19.444], C: [20, 29, 38, 47, 56], mi: [18.433, 18.733], tj: 20.822, tap: ["5490-18", "4990-18", "5492-18", "4992-18"] }, rc: { d: [null, "18.5 mm"], mi: [18.433, 18.733], jn: 20.598, S: [27, 36, 45, 54, 63], T: [25, 34, 43, 52, 61] } },
    "M18x1.5": { hc: { d: ["18.25 mm", "18.5 mm"], A: [27, 36, 45, 54, 63, 24, 33, 42, 51, 60], M: [19.8, 20.4], pd: [18.974, 19.067, 19.099], C: [19.5, 28.5, 37.5, 46.5, 55.5], mi: [18.324, 18.56], tj: 20.131, tap: ["5476-18", "4976-18", "5477-18", "4977-18"], s: 1 }, rc: { d: [null, "18.25 mm"], mi: [18.325, 18.561], jn: 19.949, S: [24.75, 33.75, 42.75, 51.75, 60.75], T: [23.25, 32.25, 41.25, 50.25, 59.25] } },
    "M20x2": { hc: { d: ["20.5 mm", "20.5 mm"], A: [32, 42, 52, 62, 72, 28, 38, 48, 58, 68], M: [22.5, 23.1], pd: [21.299, 21.406, 21.444], C: [22, 32, 42, 52, 62], mi: [20.433, 20.733], tj: 22.822, tap: ["5490-20", "4990-20", "5492-20", "4992-20"] }, rc: { d: [null, "20.5 mm"], mi: [20.433, 20.733], jn: 22.598, S: [29, 39, 49, 59, 69], T: [27, 37, 47, 57, 67] } },
    "M20x1.5": { hc: { d: ["20.25 mm", "20.5 mm"], A: [29, 39, 49, 59, 69, 26, 36, 46, 56, 66], M: [21.8, 22.4], pd: [20.974, 21.067, 21.099], C: [21.5, 31.5, 41.5, 51.5, 61.5], mi: [20.324, 20.56], tj: 22.131, tap: ["5476-20", "4976-20", "5477-20", "4977-20"], s: 1 }, rc: { d: [null, "20.25 mm"], mi: [20.325, 20.561], jn: 21.949, S: [26.75, 36.75, 46.75, 56.75, 66.75], T: [25.25, 35.25, 45.25, 55.25, 65.25] } },
    "M22x2": { hc: { d: ["22.5 mm", "22.5 mm"], A: [34, 45, 56, 67, 78, 30, 41, 52, 63, 74], M: [24.5, 25.1], pd: [23.299, 23.406, 23.444], C: [24, 35, 46, 57, 68], mi: [22.433, 22.733], tj: 24.822, tap: ["5490-22", "4990-22", "5492-22", "4992-22"] }, rc: { d: [null, "22.5 mm"], mi: [22.433, 22.733], jn: 24.598, S: [31, 42, 53, 64, 75], T: [29, 40, 51, 62, 73] } },
    "M22x1.5": { hc: { d: ["22.25 mm", "22.5 mm"], A: [31, 42, 53, 64, 75, 28, 39, 50, 61, 72], M: [23.8, 24.4], pd: [22.974, 23.067, 23.099], C: [23.5, 34.5, 45.5, 56.5, 67.5], mi: [22.324, 22.56], tj: 24.131, tap: ["5476-22", "4976-22", "5477-22", "4977-22"], s: 1 }, rc: { d: [null, "22.5 mm"], mi: [22.325, 22.561], jn: 23.949, S: [28.75, 39.75, 50.75, 61.75, 72.75], T: [27.25, 38.25, 49.25, 60.25, 71.25] } },
    "M24x2": { hc: { d: ["24.5 mm", "24.5 mm"], A: [36, 48, 60, 72, 84, 32, 44, 56, 68, 80], M: [26.5, 27.1], pd: [25.299, 25.414, 25.454], C: [26, 38, 50, 62, 74], mi: [24.433, 24.733], tj: 26.822, tap: ["5490-24", "4990-24", "5492-24", "4992-24"] }, rc: { d: [null, "24.25 mm"], mi: [24.433, 24.733], jn: 26.598, S: [33, 45, 57, 69, 81], T: [31, 43, 55, 67, 79] } },
    "M27x2": { hc: { d: ["27.5 mm", "27.5 mm"], A: [39, 52.5, 66, 79.5, 93, 35, 48.5, 62, 75.5, 89], M: [29.5, 30.1], pd: [28.299, 28.414, 28.454], C: [29, 42.5, 56, 69.5, 83], mi: [27.433, 27.733], tj: 29.822, tap: ["5490-27", "4990-27", "5492-27", "4992-27"] } },
    "M30x2": { hc: { d: ["30.5 mm", "30.5 mm"], A: [42, 57, 72, 87, 102, 38, 53, 68, 83, 98], M: [32.5, 33.1], pd: [31.299, 31.414, 31.454], C: [32, 47, 62, 77, 92], mi: [30.433, 30.733], tj: 32.822, tap: ["5490-30", "4990-30", "5492-30", "4992-30"] } },
    "M33x2": { hc: { d: ["33.5 mm", "33.5 mm"], A: [45, 61.5, 78, 94.5, 111, 41, 57.5, 74, 90.5, 107], M: [35.5, 36.1], pd: [34.299, 34.414, 34.454], C: [35, 51.5, 68, 84.5, 101], mi: [33.433, 33.733], tj: 35.822, tap: ["5490-33", "4990-33", "5492-33", "4992-33"] } },
    "M36x3": { hc: { d: ["37 mm", "37 mm"], A: [54, 72, 90, 108, 126, 48, 66, 84, 102, 120], M: [39.9, 40.5], pd: [37.948, 38.093, 38.135], C: [39, 57, 75, 93, 111], mi: [36.649, 37.049], tj: 40.238, tap: ["5496-36", "4996-36", "5497-36", "4997-36"] } },
    "M36x2": { hc: { d: ["36.5 mm", "36.5 mm"], A: [48, 66, 84, 102, 120, 44, 62, 80, 98, 116], M: [38.5, 39.1], pd: [37.299, 37.414, 37.454], C: [38, 56, 74, 92, 110], mi: [36.433, 36.733], tj: 38.822, tap: ["5490-36", "4990-36", "5492-36", "4992-36"] } },
    "M39x3": { hc: { d: ["40 mm", "40 mm"], A: [57, 76.5, 96, 115.5, 135, 51, 70.5, 90, 109.5, 129], M: [42.9, 43.5], pd: [40.948, 41.093, 41.135], C: [42, 61.5, 81, 100.5, 120], mi: [39.649, 40.049], tj: 43.238, tap: ["5496-39", "4996-39", "5497-39", "4997-39"] } },
  };
  // Rules stated by the sources (pitches P unless noted). Used by calc.js stiHole / sti.
  const STI_RULES = {
    mults: [1, 1.5, 2, 2.5, 3],                     // standard insert lengths × nominal Ø (HC p.12–13, Recoil p.19–21)
    hcCPitch: 1,                                    // HC: C = nominal length + 1 P (p.20)
    rcTPitch: 3.5,                                  // Recoil: T min tapping depth = Q + 3½ plug-tap threads (p.19–21)
    rcSPitch: 4.5,                                  // Recoil: S min drill depth (no point) = T + 1 P chip room (p.19–21)
    setdownCsk: [0.75, 1.5],                        // countersunk hole: insert top 3/4–1-1/2 P below surface (HC p.16–18, Recoil p.104)
    setdownNoCsk: [0.25, 0.5],                      // no countersink: 1/4–1/2 P below surface (HC p.16, Recoil p.104)
    cskDeg: 120, cskTolDeg: 5,                      // HC p.17, Recoil p.23, NASA PRC-9008
    thruMinThickPitch: 1,                           // through hole min thickness = Q + 1 P countersunk, = Q without (HC p.16, Recoil p.104)
    cls: { inch: { free: "2B", lock: "3B" }, metric: { free: "5H", lock: "4H5H" } }, // HC p.14/21; Recoil taps made 3B / 4H5H (p.71)
    tangToolMaxIn: 0.5, tangToolMaxMm: 12,          // HC p.33: break-off tools through 1/2" / 12 mm (lengths to 2 D); bigger: long-nose pliers
    tangless: "UNC #2–1/4, UNF #10 and 1/4, metric coarse M2.5–M6 (HC p.4)",
    rcNotUsed: { "M12x1.5": "Recoil's M12 × 1.5 row on p.22 is garbled, not used" }, // sizes where a printed Recoil row exists but is excluded
  };
  const STI_SRC = {
    HC: { name: "Heli-Coil HC2000 Rev.12 design guide", url: "https://content.syndigo.com/asset/87bbdb19-50c2-46ef-bc03-5d37ae04efd6/original.pdf" },
    RC: { name: "Recoil Technical Catalogue 2020 (Howmet)", url: "https://www.hfsindustrial.com/pub/media/resources/images/image/h/o/howmet_recoil_technical_catalogue_2020_-_v1.0.1.pdf" },
    EM: { name: "Emuge core-hole chart ZS10013, EG (STI)", url: "https://www.emuge.sk/sub/emuge.sk/images/katalogy/2022/ZS10013_DEGB_Rev_C_Gewindekernloch-Vorfertigungsdurchmesser.pdf" },
    NASA: { name: "NASA PRC-9008 helical coil inserts", url: "https://www.nasa.gov/wp-content/uploads/2023/03/prc-9008-current.pdf" },
  };

  // DEMO sample for the Repair-or-scrap line (Stacey's method). Sample numbers only — not shop data.
  const DEMO_REPAIR = { insert: 1.5, tapCost: 30, holesPerTap: 500, minutes: 10, rate: 85, partCost: 40 };
  // Launch switches. inserts:false → DT_CALC.sti() returns null and the UI hides the Inserts section,
  // the Thread-panel Insert switch and the Troubleshoot "Repair with an insert" button.
  const FEATURES = { inserts: true };

  const DATA = {
    THREAD_LIST, THREAD_SERIES, TAPER, INCH_DRILLS, METRIC_DRILLS, NUMBER_DRILLS, LETTER_DRILLS, HRC_HB, LIMITS, DERATE,
    DEPTH_REDUCTION, D_MORSE_HSS, D_RED, D_TRU, D_MORSE_CARB, MORSE_HSS, REDLINE, TRUEDGE,
    MORSE_CARB, HAAS_BANDS, HAAS_IDX, TAP_SRC, MATERIALS, DRILL_MATERIALS, TAP_MATERIALS,
    DEMO_COST, M_TO_SFM, TD1, CLEAR_IN, CLEAR_MM, TROUBLE_RULES, TROUBLE_SRC, STI, STI_RULES, STI_SRC,
    DEMO_REPAIR, FEATURES, HARVEY_DRILL,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = DATA;
  else root.DT_DATA = DATA;
})(typeof window !== "undefined" ? window : this);

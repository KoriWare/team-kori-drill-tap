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
        carbide: [{ maxHB: 450, tru: "ssHard", morse: "ssDifficult_le450" }],
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
        carbide: [{ maxHB: 200, tru: "brassBronze", morse: "copperAlloy_le200" }],
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
        carbide: [{ maxHB: 340, tru: "tiAlloy", morse: "tiAlloy_le250" }],
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

  const DATA = {
    THREAD_LIST, THREAD_SERIES, TAPER, INCH_DRILLS, METRIC_DRILLS, NUMBER_DRILLS, LETTER_DRILLS, HRC_HB, LIMITS, DERATE,
    DEPTH_REDUCTION, D_MORSE_HSS, D_RED, D_TRU, D_MORSE_CARB, MORSE_HSS, REDLINE, TRUEDGE,
    MORSE_CARB, HAAS_BANDS, HAAS_IDX, TAP_SRC, MATERIALS, DRILL_MATERIALS, TAP_MATERIALS,
    DEMO_COST, M_TO_SFM, TD1, CLEAR_IN, CLEAR_MM, TROUBLE_RULES, TROUBLE_SRC,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = DATA;
  else root.DT_DATA = DATA;
})(typeof window !== "undefined" ? window : this);

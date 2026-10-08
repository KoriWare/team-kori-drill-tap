/**
 * Team Kori — Drill & Tap · pure math (no DOM).
 * Browser: window.DT_CALC (needs window.DT_DATA loaded first). Node: require("./calc.js").
 *
 * Tap-drill formulas (verified against Haas Shop Notes, Jarvis Cutting Tools,
 * PMT Machining Formulas, MSC thread-forming guide — see data.js header):
 *   inch cut  : drill = D − 0.01299 × %thread / TPI
 *   inch form : drill = D − 0.0068  × %thread / TPI
 *   metric cut: drill = D − %thread × P / 76.98
 *   metric form: drill = D − %thread × P / 147.06
 * Rigid tap feed MUST equal pitch × RPM: IPM = RPM / TPI ; mm/min = RPM × P.
 */
(function (root) {
  "use strict";
  const DATA = (typeof module !== "undefined" && module.exports) ? require("./data.js") : root.DT_DATA;
  const IN_MM = 25.4;
  const K = { in: { cut: 0.01299, form: 0.0068 }, mm: { cut: 76.98, form: 147.06 } };
  const PCT_LIMIT = { cut: 85, form: 75 };   // above this: tap breakage risk
  const PCT_LOW = 50;                        // below this: shallow thread

  // ------------------------------------------------------------- threads
  function findThread(id) {
    return DATA.THREAD_LIST.find((x) => x.id === id) || null;
  }
  const isInch = (t) => t.system === "inch";
  const pitchIn = (t) => (isInch(t) ? 1 / t.tpi : t.pitch / IN_MM);
  const pitchMm = (t) => (isInch(t) ? IN_MM / t.tpi : t.pitch);
  const majorIn = (t) => (isInch(t) ? t.major : t.major / IN_MM);
  const nativeToIn = (t, v) => (isInch(t) ? v : v / IN_MM);
  const inToNative = (t, v) => (isInch(t) ? v : v * IN_MM);

  /** Exact tap drill in the thread's own units (in for UNC/UNF, mm for metric). */
  function tapDrillExact(t, tapType, pct) {
    if (isInch(t)) return t.major - (K.in[tapType] * pct) / t.tpi;
    return t.major - (pct * t.pitch) / K.mm[tapType];
  }
  /** % thread a given drill (thread's own units) would give. */
  function pctFromDrill(t, tapType, drill) {
    if (isInch(t)) return ((t.major - drill) * t.tpi) / K.in[tapType];
    return ((t.major - drill) * K.mm[tapType]) / t.pitch;
  }

  function pctStatus(tapType, pct) {
    if (!Number.isFinite(pct)) return { level: "red", text: "—" };
    if (pct >= 100) return { level: "red", text: "Drill is at or below the full-thread size — the tap will jam and snap." };
    if (pct > PCT_LIMIT[tapType]) {
      return { level: "red", text: (tapType === "form" ? "Form tap" : "Cut tap") + " over " + PCT_LIMIT[tapType] + "% thread — high torque, tap breakage risk." };
    }
    if (pct < PCT_LOW) return { level: "amber", text: "Under 50% thread — shallow thread, may strip." };
    return { level: "green", text: "Good engagement" };
  }

  /** Nearest standard drills just under / just over `exact`. list items {label,d} in same units. */
  function nearestDrills(exact, list) {
    let under = null, over = null;
    const eps = 1e-9;
    for (const it of list) {
      if (it.d <= exact + eps) { if (!under || it.d > under.d) under = it; }
      else if (!over || it.d < over.d) over = it;
    }
    return { under, over };
  }

  const inchList = () => DATA.INCH_DRILLS;
  const metricList = () => DATA.METRIC_DRILLS.map((d) => ({ label: fmtMm(d) + " mm", kind: "metric", d }));
  function fmtMm(d) { return (Math.round(d * 100) / 100).toString(); }

  /**
   * Full tap-drill answer. Returns exact (in & mm), under/over options for both the
   * inch family (fraction/number/letter) and metric drills, each with actual %, plus a
   * recommendation in the preferred family ("in" | "mm").
   */
  function tapDrill(t, tapType, pct, family) {
    if (t.pipe) return pipeDrill(t);
    const exactNative = tapDrillExact(t, tapType, pct);
    const exactIn = nativeToIn(t, exactNative);
    const mkOpt = (it, unit) => {
      if (!it) return null;
      const dIn = unit === "in" ? it.d : it.d / IN_MM;
      const p = pctFromDrill(t, tapType, inToNative(t, dIn));
      return { label: it.label, kind: it.kind, dIn, dMm: dIn * IN_MM, pct: p, status: pctStatus(tapType, p) };
    };
    const ni = nearestDrills(exactIn, inchList());
    const nm = nearestDrills(exactIn * IN_MM, metricList());
    const inch = { under: mkOpt(ni.under, "in"), over: mkOpt(ni.over, "in") };
    const metric = { under: mkOpt(nm.under, "mm"), over: mkOpt(nm.over, "mm") };
    const fam = family === "mm" ? metric : inch;
    const rec = recommend(fam, pct, tapType);
    return { exactIn, exactMm: exactIn * IN_MM, inch, metric, rec, targetPct: pct };
  }

  const TAPER_INFO = "Tapered pipe thread: table drill. Optional taper pipe reamer before tapping reduces tap torque. Check depth with an L1 plug gauge.";
  /**
   * Pipe threads (NPT, BSPT taper; BSPP/G parallel): no % thread formula — published table
   * drill only. Status is always amber. Tapered entries carry L1 / L2 / taper for the diagram.
   */
  function pipeDrill(t) {
    const table = t.tapDrillTable.map((r) => ({ label: r.label, note: r.note, dIn: r.dIn, dMm: r.dIn * IN_MM }));
    const taper = t.type === "taper";
    const status = taper
      ? { level: "amber", text: "Tapered pipe thread: table drill, check with plug gauge." }
      : { level: "amber", text: "Parallel pipe thread (G, ISO 228): table drill, check with a G plug gauge. Seals on a washer or O-ring, not the thread." };
    const info = taper ? [TAPER_INFO] : [];
    const out = { pipe: true, taper, table, rec: table[0], status, info, standard: t.standard };
    if (taper) {
      out.L1In = t.L1; out.L2In = t.L2; out.L1Mm = t.L1 * IN_MM; out.L2Mm = t.L2 * IN_MM;
      out.L1Name = t.L1Name; out.L2Name = t.L2Name;
      out.taper = taper; out.taperRatio = t.taper; out.taperHalfAngleDeg = t.taperHalfAngleDeg;
    }
    return out;
  }

  /** Pick the standard drill whose actual % is closest to target, never one past the breakage limit. */
  function recommend(fam, target, tapType) {
    const c = [fam.under, fam.over].filter((o) => o && o.pct < 100);
    const safe = c.filter((o) => o.pct <= PCT_LIMIT[tapType]);
    const pool = safe.length ? safe : c;
    if (!pool.length) return null;
    pool.sort((a, b) => Math.abs(a.pct - target) - Math.abs(b.pct - target) || b.dIn - a.dIn);
    return pool[0];
  }

  // ------------------------------------------------------------ hardness
  function hrcToHb(hrc) {
    const T = DATA.HRC_HB;
    if (!(hrc >= T[0][0] && hrc <= T[T.length - 1][0])) return NaN;
    for (let i = 0; i < T.length - 1; i++) {
      const [a, ha] = T[i], [b, hb] = T[i + 1];
      if (hrc >= a && hrc <= b) return ha + ((hrc - a) / (b - a)) * (hb - ha);
    }
    return NaN;
  }
  function hbToHrc(hb) {
    const T = DATA.HRC_HB;
    if (!(hb >= T[0][1] && hb <= T[T.length - 1][1])) return NaN;
    for (let i = 0; i < T.length - 1; i++) {
      const [a, ha] = T[i], [b, hbv] = T[i + 1];
      if (hb >= ha && hb <= hbv) return a + ((hb - ha) / (hbv - ha)) * (b - a);
    }
    return NaN;
  }

  // --------------------------------------------------------- speed helpers
  const rpmFromSfm = (sfm, dIn) => (sfm * 12) / (Math.PI * dIn);
  const sfmFromRpm = (rpm, dIn) => (Math.PI * dIn * rpm) / 12;
  const rpmFromMmin = (vc, dMm) => (vc * 1000) / (Math.PI * dMm);
  const mminFromRpm = (rpm, dMm) => (Math.PI * dMm * rpm) / 1000;

  /** Linear interpolation; below first point scales toward 0 (conservative); above last clamps. */
  function interp(xs, ys, x) {
    if (x <= xs[0]) return ys[0] * (x / xs[0]);
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    for (let i = 0; i < xs.length - 1; i++) {
      if (x >= xs[i] && x <= xs[i + 1]) return ys[i] + ((x - xs[i]) / (xs[i + 1] - xs[i])) * (ys[i + 1] - ys[i]);
    }
    return NaN;
  }

  const material = (id) => DATA.MATERIALS.find((x) => x.id === id);

  function pickBand(bands, hb) {
    if (!bands || !bands.length) return { band: null, over: 0, empty: true };
    for (const b of bands) if (hb <= b.maxHB) return { band: b, over: 0 };
    const last = bands[bands.length - 1];
    return { band: last, over: hb - last.maxHB };
  }

  function derateFor(over) {
    if (over <= 0) return { sfm: 1, ipr: 1, blocked: false };
    for (const d of DATA.DERATE) if (over <= d.overHB) return { sfm: d.sfm, ipr: d.ipr, blocked: false };
    return { blocked: true };
  }

  function depthFactor(ld) {
    for (const r of DATA.DEPTH_REDUCTION) if (ld >= r.minLD) return r.factor;
    return 1;
  }

  function peckAdvice(drillMat, ld, dIn) {
    const q = (k) => k * dIn;
    if (drillMat === "indexable") {
      if (ld > 5) return { level: "red", text: "Deeper than standard indexable drills (2–5×D). Use a different tool for this depth.", q: null };
      if (ld >= 4) return { level: "amber", text: "Don't peck an indexable drill. Drill in one pass and ease feed 30–50% on entry and exit (4–5×D).", q: null };
      return { level: "green", text: "Don't peck an indexable drill. Drill in one pass (G81).", q: null };
    }
    if (ld < 3) return { level: "green", text: "Under 3×D: no peck needed (G81).", q: null };
    if (drillMat === "carbide") {
      if (ld <= 5) return { level: "amber", text: "3–5×D: with through-coolant, usually no peck. Without it, chip-break peck (G73), Q ≈ 1×D.", q: q(1) };
      return { level: "red", text: "Over 5×D: use a through-coolant carbide drill rated for this depth, starting from a pilot hole. Without through-coolant, full-retract peck (G83), Q ≈ 0.5×D.", q: q(0.5) };
    }
    if (ld <= 5) return { level: "amber", text: "3–5×D: chip-break peck (G73), Q ≈ 1×D.", q: q(1) };
    if (ld <= 8) return { level: "red", text: "Over 5×D: full-retract peck (G83), Q ≈ 0.5×D. Make the pecks shorter as you go deeper.", q: q(0.5) };
    return { level: "red", text: "Over 8×D: full-retract peck (G83), Q ≈ 0.5×D or less. Think about a parabolic-flute or long-series drill.", q: q(0.5) };
  }

  /**
   * Drill starting point. Always conservative: low end used, high end info only.
   * Returns {ok, reason?, sfm, sfmHi, ipr, iprHi, rpm, ipm, ...}
   */
  function drillStart(matId, drillMat, hb, dIn, depthIn) {
    const mat = material(matId);
    const out = { ok: false, notes: [], sources: [] };
    if (!mat || !(dIn > 0) || !(hb > 0)) return Object.assign(out, { reason: "Check inputs: need material, hardness and drill diameter." });
    const L = DATA.LIMITS;
    if (drillMat === "hss" && hb > L.hssMaxHB) return Object.assign(out, { blocked: true, reason: "HSS drill not recommended above ~35 HRC. Use carbide." });
    if (drillMat === "cobalt" && hb > L.cobaltMaxHB) return Object.assign(out, { blocked: true, reason: "Cobalt drill not recommended above ~38 HRC. Use carbide." });
    if (drillMat === "carbide" && hb > L.carbideMaxHB) return Object.assign(out, { blocked: true, reason: "Over 50 HRC: you need a drill made for hardened steel. Check that maker's chart." });

    let sfmVals = [], iprLo, iprHi, sfmStart = null;
    const key = drillMat === "cobalt" ? "hss" : drillMat;
    const { band, over, empty } = pickBand(mat.drill[key], hb);
    if (empty) return Object.assign(out, { reason: "No published starting point for this drill type in this material in our sources." });

    if (drillMat === "indexable") {
      if (over > 0) return Object.assign(out, { blocked: true, reason: "Harder than the indexable chart covers for this material (max " + band.maxHB + " HB)." });
      if (dIn < DATA.HAAS_BANDS[0].lo || dIn > DATA.HAAS_BANDS[DATA.HAAS_BANDS.length - 1].hi) {
        return Object.assign(out, { blocked: true, reason: "Indexable drills in our source run 0.473–2.500 in (12–63.5 mm). Pick another drill type for this size." });
      }
      let bi = 0;
      DATA.HAAS_BANDS.forEach((b, i) => { if (dIn >= b.lo) bi = i; }); // gaps use the smaller band (lower feed)
      const row = DATA.HAAS_IDX[band.haas];
      sfmVals = [row.sfm[0], row.sfm[2]];
      sfmStart = row.sfm[1];
      [iprLo, iprHi] = row.ipr[bi];
      out.sources.push("Haas indexable · " + row.name + " · insert size " + DATA.HAAS_BANDS[bi].size);
    } else if (key === "hss") {
      const mr = DATA.MORSE_HSS[band.morse];
      const rr = band.red ? DATA.REDLINE[band.red] : null;
      sfmVals.push(mr.sfm);
      out.sources.push("Morse HSS/Co · " + mr.name);
      const morseIpr = interp(DATA.D_MORSE_HSS, mr.ipr, dIn);
      iprLo = morseIpr; iprHi = morseIpr;
      if (rr) {
        const col = drillMat === "cobalt" ? rr.co : rr.hss;
        sfmVals.push(col[0], col[1]);
        const redHi = interp(DATA.D_RED, rr.iprHi, dIn);
        iprLo = Math.min(morseIpr, redHi);
        iprHi = Math.max(morseIpr, redHi);
        out.sources.push("Redline " + (drillMat === "cobalt" ? "Cobalt" : "HSS") + " · " + rr.name);
      }
    } else if (key === "carbide") {
      const ipr = [];
      if (band.tru) {
        const tr = DATA.TRUEDGE[band.tru];
        sfmVals.push(tr.sfm); ipr.push(interp(DATA.D_TRU, tr.ipr, dIn));
        out.sources.push("Tru-Edge carbide · " + tr.name);
      }
      if (band.morse) {
        const mr = DATA.MORSE_CARB[band.morse];
        sfmVals.push(mr.sfm); ipr.push(interp(DATA.D_MORSE_CARB, mr.ipr, dIn));
        out.sources.push("Morse carbide · " + mr.name);
      }
      iprLo = Math.min.apply(null, ipr); iprHi = Math.max.apply(null, ipr);
    }

    let sfmLo = Math.min.apply(null, sfmVals), sfmHi = Math.max.apply(null, sfmVals);

    // Hardness derate past the band (never raises)
    if (over > 0) {
      const d = derateFor(over);
      if (d.blocked) return Object.assign(out, { blocked: true, reason: "Harder than our sources cover for this drill (" + band.maxHB + " HB + 100). Check the drill maker's chart." });
      sfmLo *= d.sfm; sfmHi *= d.sfm; iprLo *= d.ipr; iprHi *= d.ipr;
      if (sfmStart) sfmStart *= d.sfm;
      out.notes.push("Hardness is " + Math.round(over) + " HB over the chart's " + band.maxHB + " HB row: speed ×" + d.sfm + ", feed ×" + d.ipr + ".");
      out.derated = true;
    }
    // Deep-hole reduction (never raises)
    const ld = depthIn > 0 ? depthIn / dIn : 0;
    const df = depthFactor(ld);
    if (df < 1) {
      sfmLo *= df; sfmHi *= df; iprLo *= df; iprHi *= df;
      if (sfmStart) sfmStart *= df;
      out.notes.push("Hole is " + ld.toFixed(1) + "×D deep: speed and feed cut " + Math.round((1 - df) * 100) + "%.");
    }
    const rpm = Math.floor(rpmFromSfm(sfmLo, dIn));
    const rpmHi = Math.floor(rpmFromSfm(sfmHi, dIn));
    return Object.assign(out, {
      ok: true, sfm: sfmLo, sfmHi, sfmStart, ipr: iprLo, iprHi, rpm, rpmHi,
      ipm: rpm * iprLo, ipmHi: rpmHi * iprHi, ld, peck: peckAdvice(drillMat, ld, dIn),
      band, over,
    });
  }

  // ------------------------------------------------------------------ taps
  function tapSfmRange(srcList) {
    const vals = [];
    const names = [];
    for (const [src, row, col] of srcList) {
      const r = DATA.TAP_SRC[src][row];
      const v = r && r[col];
      if (v) { vals.push(v); names.push(r.name); }
    }
    if (!vals.length) return null;
    return { lo: Math.min.apply(null, vals.map((v) => v[0])), hi: Math.max.apply(null, vals.map((v) => v[1])), names };
  }

  function tapStart(matId, tapType, tapMat, hb, t, sfmOverride) {
    const mat = material(matId);
    const out = { ok: false, sources: [] };
    if (!mat || !t) return Object.assign(out, { reason: "Pick a thread and material." });
    let sfm = null, sfmHi = null;
    if (sfmOverride > 0) {
      sfm = sfmOverride; sfmHi = sfmOverride; out.override = true;
      out.sources.push("Your SFM");
    } else {
      if (tapType === "form" && mat.noFormTap) return Object.assign(out, { blocked: true, reason: "Form taps don't work in gray cast iron. It crumbles instead of flowing. Use a cut tap." });
      if (tapMat === "hss" && hb > DATA.LIMITS.hssMaxHB) return Object.assign(out, { blocked: true, reason: "HSS tap not recommended above ~35 HRC. Use HSS-E-PM or carbide and check the tap maker's chart." });
      if (!(hb > 0)) return Object.assign(out, { reason: "Enter the hardness." });
      const bands = (mat.tap[tapType] || {})[tapMat] || [];
      if (!bands.length) return Object.assign(out, { nodata: true, reason: "No published starting speed in our sources for this tap in this material. Use your tap maker's chart, or type your own SFM." });
      const band = bands.find((b) => hb <= b.maxHB);
      if (!band) return Object.assign(out, { nodata: true, reason: "Harder than our sources cover for this tap (max " + bands[bands.length - 1].maxHB + " HB). Use your tap maker's chart, or type your own SFM." });
      const r = tapSfmRange(band.src);
      if (!r) return Object.assign(out, { nodata: true, reason: "No published starting speed for this combo. Use your tap maker's chart." });
      sfm = r.lo; sfmHi = r.hi; out.sources = r.names;
    }
    const dIn = majorIn(t);
    const rpm = Math.floor(rpmFromSfm(sfm, dIn));
    const rpmHi = Math.floor(rpmFromSfm(sfmHi, dIn));
    return Object.assign(out, {
      ok: rpm >= 1, sfm, sfmHi, rpm, rpmHi,
      ipm: rpm * pitchIn(t), mmMin: rpm * pitchMm(t),
      reason: rpm >= 1 ? undefined : "Speed too low to give 1 RPM.",
    });
  }

  /** Feed for rigid tapping — exactly RPM × pitch, in the chosen units. */
  function rigidFeed(rpm, t, units) {
    return units === "mm" ? rpm * pitchMm(t) : rpm * pitchIn(t);
  }

  /** Format an F word: Fanuc needs a decimal point. Inch to 4 places, mm to 3. */
  function fWord(v, units) {
    const places = units === "mm" ? 3 : 4;
    let s = v.toFixed(places).replace(/0+$/, "");
    if (s.endsWith(".")) s = s; // keep trailing point, e.g. "40."
    const exact = Math.abs(parseFloat(s) - v) < 1e-9;
    if (s.startsWith("0.")) s = s.slice(1);
    return { text: s, exact };
  }

  function fanucBlock(rpm, t, units) {
    const feed = rigidFeed(rpm, t, units);
    const f = fWord(feed, units);
    return {
      lines: [units === "mm" ? "G21 (MM)" : "G20 (INCH)", "M29 S" + rpm, "G84 Z___ R___ F" + f.text, "G80"],
      feed, exact: f.exact,
    };
  }

  // ------------------------------------------------------------------ cost
  function snappedTapCost(o) {
    return o.taps * (o.tapCost + o.partValue + (o.lostMin / 60) * o.shopRate);
  }
  function per1000(side, shared) {
    const breakEach = side.tapCost + shared.partValue + (shared.lostMin / 60) * shared.shopRate;
    const wear = (1000 / side.holesPerTap) * side.tapCost;
    const breaks = (1000 / side.holesPerBreak) * breakEach;
    return { wear, breaks, total: wear + breaks };
  }

  const API = {
    IN_MM, K, PCT_LIMIT, PCT_LOW, TAPER_INFO, findThread, pipeDrill, pitchIn, pitchMm, majorIn, tapDrillExact, pctFromDrill,
    pctStatus, nearestDrills, tapDrill, recommend, hrcToHb, hbToHrc, rpmFromSfm, sfmFromRpm,
    rpmFromMmin, mminFromRpm, interp, material, drillStart, peckAdvice, tapStart, rigidFeed, fWord,
    fanucBlock, snappedTapCost, per1000,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.DT_CALC = API;
})(typeof window !== "undefined" ? window : this);

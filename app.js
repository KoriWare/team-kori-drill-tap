/**
 * Team Kori — Drill & Tap · UI wiring (DOM only; all math in calc.js, all numbers in data.js).
 * Class names follow Maria's mock so her styling pass drops in.
 */
(function () {
  "use strict";
  const D = window.DT_DATA, C = window.DT_CALC, IN_MM = C.IN_MM;
  const $ = (id) => document.getElementById(id);
  const LS = { units: "dt-units", demo: "dt-demo", scale: "dt-hscale" };
  const store = { get(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };

  const S = {
    units: store.get(LS.units, "in"),
    tapType: "cut",
    pct: { cut: 75, form: 65 },
    scale: store.get(LS.scale, "HB"),
    dDiaIn: 0.201, dLinked: true, depthIn: 0.5,
  };

  // ------------------------------------------------------------ formatting
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const dec = (v, p) => { const s = v.toFixed(p); return s.startsWith("0.") ? s.slice(1) : s; };
  const lenIn = (v) => dec(v, 4);
  const lenMm = (v) => v.toFixed(2);
  const len = (vIn) => (S.units === "mm" ? lenMm(vIn * IN_MM) + " mm" : lenIn(vIn) + '"');
  const lenBare = (vIn) => (S.units === "mm" ? lenMm(vIn * IN_MM) : lenIn(vIn));
  const money = (v) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const lvlClass = (lvl) => (lvl === "green" ? "g" : lvl === "amber" ? "a" : "r");
  const num = (el) => { const v = parseFloat(el.value); return Number.isFinite(v) ? v : NaN; };

  function setChip(el, level, text) {
    el.className = "chip" + (level === "green" ? "" : " " + level);
    el.querySelector("span").textContent = text;
  }
  function infoLines(el, lines) {
    el.innerHTML = lines.filter(Boolean).map((l) => {
      const o = typeof l === "string" ? { t: l } : l;
      return '<div class="info' + (o.c ? " " + o.c : "") + '">' + (o.html || esc(o.t)) + "</div>";
    }).join("");
  }
  function segSet(onBtn, offBtns, extraCls) {
    onBtn.classList.add("on"); if (extraCls) onBtn.classList.add(extraCls); onBtn.setAttribute("aria-pressed", "true");
    offBtns.forEach((b) => { b.classList.remove("on", "cu"); b.setAttribute("aria-pressed", "false"); });
  }

  // ------------------------------------------------------------ selects
  function buildThreadSelect() {
    const sel = $("thread");
    const opt = (t) => '<option value="' + esc(t.id) + '">' + esc(t.label) + "</option>";
    let h = '<optgroup label="Most used">' + D.THREAD_LIST.filter((t) => t.common).map(opt).join("") + "</optgroup>";
    D.THREAD_SERIES.forEach((s) => {
      h += '<optgroup label="' + esc(s) + '">' + D.THREAD_LIST.filter((t) => t.series === s).map(opt).join("") + "</optgroup>";
    });
    sel.innerHTML = h;
    sel.value = "UNC-1/4-20";
    const m = /(?:^#|&)t=([^&]+)/.exec(location.hash); // deep link, e.g. #t=NPT-1/2
    if (m && C.findThread(decodeURIComponent(m[1]))) sel.value = decodeURIComponent(m[1]);
  }
  function fill(sel, list, val) {
    sel.innerHTML = list.map((x) => '<option value="' + esc(x.id) + '">' + esc(x.name) + "</option>").join("");
    if (val) sel.value = val;
  }

  // ------------------------------------------------------------ hardness
  function hb() {
    const v = num($("hard"));
    if (!(v > 0)) return NaN;
    return S.scale === "HB" ? v : C.hrcToHb(v);
  }
  function setHardFromHB(hbv) {
    if (S.scale === "HB") $("hard").value = Math.round(hbv);
    else { const r = C.hbToHrc(hbv); $("hard").value = Number.isFinite(r) ? Math.round(r) : ""; }
  }
  function hardNote() {
    const v = num($("hard")), h = hb();
    if (!(v > 0)) return "Enter the hardness.";
    if (!Number.isFinite(h)) return S.scale === "HRC" ? "HRC value outside the conversion table — switch to HB." : "";
    if (S.scale === "HB") { const r = C.hbToHrc(h); return Number.isFinite(r) ? "≈ " + r.toFixed(0) + " HRC" : "Below the HRC scale (soft)."; }
    return "≈ " + Math.round(h) + " HB";
  }

  // ------------------------------------------------------------ cross-section SVG
  // Placeholder drawing in Maria's palette: teal = thread, copper = drill. Maria to polish.
  const HATCH = '<defs><pattern id="h" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#2a3a44" stroke-width="2"/></pattern></defs>';
  const T = (x, y, s, o) => '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || "middle") + '" font-family="' + (o.f || "JetBrains Mono, monospace") + '" font-size="' + (o.s || 10) + '"' + (o.w ? ' font-weight="' + o.w + '"' : "") + ' fill="' + (o.c || "#93a4ad") + '">' + esc(s) + "</text>";
  const COL = { green: "#2dd4bf", amber: "#fbbf24", red: "#f87171" };

  function drawParallel(o) {
    const top = 30, bot = 190, n = 9, step = (bot - top) / n;
    const root = 112, a = o.amp, crest = root + a, rR = 246, cR = rR - a;
    let ptsL = [], ptsR = [];
    for (let i = 0; i <= n * 2; i++) {
      const y = top + (i * step) / 2, inX = i % 2 === 1;
      ptsL.push((inX ? crest : root) + " " + y.toFixed(1)); ptsR.push((inX ? cR : rR) + " " + y.toFixed(1));
    }
    const L = "M20 20 H" + root + " L" + ptsL.join(" L") + " L" + root + " 200 H20Z";
    const R = "M338 20 H" + rR + " L" + ptsR.join(" L") + " L" + rR + " 200 H338Z";
    let s = HATCH + '<path d="' + L + '" fill="url(#h)" stroke="#3a4c57" stroke-width="1.5"/><path d="' + R + '" fill="url(#h)" stroke="#3a4c57" stroke-width="1.5"/>';
    s += '<polyline points="' + ptsL.join(" ") + '" fill="none" stroke="#2dd4bf" stroke-width="2.5"/><polyline points="' + ptsR.join(" ") + '" fill="none" stroke="#2dd4bf" stroke-width="2.5"/>';
    s += '<line x1="' + crest + '" y1="210" x2="' + cR + '" y2="210" stroke="#e8894a" stroke-width="2"/><line x1="' + crest + '" y1="204" x2="' + crest + '" y2="216" stroke="#e8894a" stroke-width="2"/><line x1="' + cR + '" y1="204" x2="' + cR + '" y2="216" stroke="#e8894a" stroke-width="2"/>';
    s += '<line x1="' + root + '" y1="12" x2="' + rR + '" y2="12" stroke="#93a4ad" stroke-width="1.5" stroke-dasharray="4 4"/>';
    s += T(179, 112, o.big, { f: "Space Grotesk, sans-serif", w: 700, s: 30, c: o.bigColor }) + T(179, 130, o.sub, {});
    s += T(338, 9, o.majorTxt, { a: "end", s: 9.5 }) + T(cR + 8, 214, o.drillTxt, { a: "start", s: 9.5, c: "#e8894a" });
    s += T(20, 232, o.foot, { a: "start", s: 9 });
    return s;
  }
  function drawTaper(o) {
    const top = 30, bot = 190, n = 9, step = (bot - top) / n, shift = 28; // taper exaggerated
    let ptsL = [], ptsR = [];
    for (let i = 0; i <= n * 2; i++) {
      const y = top + (i * step) / 2, f = (y - top) / (bot - top), inX = i % 2 === 1;
      const rootL = 88 + f * shift, a = 13.6;
      ptsL.push((inX ? rootL + a : rootL).toFixed(1) + " " + y.toFixed(1));
      ptsR.push((inX ? 270 - f * shift - a : 270 - f * shift).toFixed(1) + " " + y.toFixed(1));
    }
    const L = "M20 20 H88 L" + ptsL.join(" L") + " L" + (88 + shift) + " 200 H20Z";
    const R = "M338 20 H270 L" + ptsR.join(" L") + " L" + (270 - shift) + " 200 H338Z";
    let s = HATCH + '<path d="' + L + '" fill="url(#h)" stroke="#3a4c57" stroke-width="1.5"/><path d="' + R + '" fill="url(#h)" stroke="#3a4c57" stroke-width="1.5"/>';
    s += '<polyline points="' + ptsL.join(" ") + '" fill="none" stroke="#2dd4bf" stroke-width="2.5"/><polyline points="' + ptsR.join(" ") + '" fill="none" stroke="#2dd4bf" stroke-width="2.5"/>';
    s += '<line x1="74" y1="22" x2="102" y2="200" stroke="#e8894a" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="284" y1="22" x2="256" y2="200" stroke="#e8894a" stroke-width="1.5" stroke-dasharray="5 4"/>';
    s += '<line x1="179" y1="22" x2="179" y2="200" stroke="#93a4ad" stroke-width="1" stroke-dasharray="2 5"/>';
    // gauge plane at L1 from the large end, drawn on the L2 thread length
    const gy = top + Math.min(1, o.L1 / o.L2) * (bot - top);
    s += '<line x1="20" y1="' + gy.toFixed(1) + '" x2="338" y2="' + gy.toFixed(1) + '" stroke="#e8c547" stroke-width="1" stroke-dasharray="6 3"/>';
    s += T(336, gy - 4, "L1 GAUGE PLANE", { a: "end", s: 8.5, c: "#e8c547" });
    s += T(336, 14, "L2 " + o.L2Txt, { a: "end", s: 8.5 }) + T(22, 14, "L1 " + o.L1Txt, { a: "start", s: 8.5, c: "#e8c547" });
    s += '<rect x="124" y="98" width="110" height="42" rx="8" fill="#0a0e11" opacity=".85"/>';
    s += T(179, 118, "1:16 taper", { f: "Space Grotesk, sans-serif", w: 700, s: 18, c: "#e8894a" }) + T(179, 134, "1°47′ PER SIDE", { s: 9.5 });
    s += T(179, 226, o.foot, { s: 10 });
    return s;
  }

  // ------------------------------------------------------------ main compute
  let lastRec = null;

  function curThread() { return C.findThread($("thread").value); }

  function renderTapDrill() {
    const t = curThread();
    const svg = $("xsec");
    $("pct-field").hidden = !!t.pipe;
    if (t.pipe) {
      const r = C.tapDrill(t, S.tapType, 0, S.units);
      lastRec = r.rec;
      $("r-drill").innerHTML = esc(r.rec.label) + " <small>" + esc(len(r.rec.dIn)) + "</small>";
      $("r-drill-s").textContent = "table drill · " + r.standard;
      $("r-pct-lbl").textContent = "Thread type";
      $("r-pct").innerHTML = r.taper ? "1:16<small> taper</small>" : "parallel";
      $("r-pct-s").textContent = r.taper ? "1°47′ per side" : "G · ISO 228";
      setChip($("r-chip"), r.status.level, r.status.text);
      const lines = r.info.map((x) => ({ t: x }));
      if (r.taper) {
        lines.push({ html: "<b>" + esc(r.L1Name) + "</b> " + esc(len(r.L1In)) + " · <b>" + esc(r.L2Name) + "</b> " + esc(len(r.L2In)) });
      }
      if (S.tapType === "form") lines.push({ c: "warn", t: "Table drills are for cut pipe taps. Form pipe taps need a bigger drill — use the tap maker's chart." });
      infoLines($("r-info"), lines);
      $("r-opts").innerHTML = "<tr><th>Table drill</th><th>" + (S.units === "mm" ? "mm" : "in") + "</th><th>Note</th></tr>" +
        r.table.map((o, i) => "<tr" + (i === 0 ? ' class="rec"' : "") + "><td>" + esc(o.label) + "</td><td>" + esc(lenBare(o.dIn)) + "</td><td>" + esc(o.note) + "</td></tr>").join("");
      const foot = t.label.toUpperCase() + (r.taper ? " · TAPER EXAGGERATED FOR CLARITY" : " · NOT TO SCALE");
      svg.innerHTML = r.taper
        ? drawTaper({ L1: r.L1In, L2: r.L2In, L1Txt: lenBare(r.L1In), L2Txt: lenBare(r.L2In), foot })
        : drawParallel({ amp: 12, big: "G", bigColor: COL.amber, sub: "PARALLEL PIPE", majorTxt: "MAJOR " + lenBare(C.majorIn(t)), drillTxt: "DRILL " + lenBare(r.rec.dIn), foot });
      return;
    }
    let pct = num($("pct"));
    const warn = [];
    if (!Number.isFinite(pct)) pct = S.pct[S.tapType];
    if (pct < 50 || pct > 100) { warn.push({ c: "warn", t: "% thread must be 50–100. Using " + Math.min(100, Math.max(50, pct)) + "%." }); pct = Math.min(100, Math.max(50, pct)); }
    S.pct[S.tapType] = pct;
    const r = C.tapDrill(t, S.tapType, pct, S.units);
    const rec = r.rec;
    lastRec = rec;
    if (rec) {
      $("r-drill").innerHTML = esc(rec.label) + " <small>" + esc(len(rec.dIn)) + "</small>";
      $("r-pct").innerHTML = rec.pct.toFixed(1) + "<small>%</small>";
      setChip($("r-chip"), rec.status.level, (rec.status.level === "green" ? "Standard drill · " : "") + rec.status.text);
    } else {
      $("r-drill").textContent = "—"; $("r-pct").textContent = "—";
      setChip($("r-chip"), "red", "No standard drill in range — check the size.");
    }
    $("r-drill-s").textContent = "exact " + len(r.exactIn) + " for " + pct + "%";
    $("r-pct-lbl").textContent = "Actual thread";
    $("r-pct-s").textContent = "target " + pct + "% · " + (S.tapType === "form" ? "form" : "cut") + " tap";
    const lines = warn.slice();
    if (S.tapType === "form") lines.push("Form tap: no chips, needs good lube. Hole size matters more than with a cut tap. Not for gray cast iron.");
    if (rec && rec.status.level !== "green") lines.push({ c: rec.status.level === "red" ? "bad" : "warn", t: rec.status.text });
    infoLines($("r-info"), lines);
    const row = (fam, k, o) => o ? "<tr" + (rec && o.label === rec.label ? ' class="rec"' : "") + "><td>" + esc(o.label) + "</td><td>" + esc(lenBare(o.dIn)) + "</td><td class=\"" + lvlClass(o.status.level) + "\">" + o.pct.toFixed(1) + "%</td><td>" + fam + " " + k + "</td></tr>" : "";
    $("r-opts").innerHTML = "<tr><th>Drill</th><th>" + (S.units === "mm" ? "mm" : "in") + "</th><th>% thread</th><th></th></tr>" +
      "<tr><td>exact</td><td>" + esc(lenBare(r.exactIn)) + "</td><td>" + pct + "%</td><td></td></tr>" +
      row("inch", "under", r.inch.under) + row("inch", "over", r.inch.over) + row("metric", "under", r.metric.under) + row("metric", "over", r.metric.over);
    const p = rec ? rec.pct : pct;
    svg.innerHTML = drawParallel({
      amp: 4 + 16 * Math.min(1, Math.max(0, p / 100)), big: Math.round(p) + "%",
      bigColor: COL[rec ? rec.status.level : "red"], sub: "THREAD ENGAGEMENT",
      majorTxt: "MAJOR " + lenBare(C.majorIn(t)), drillTxt: "DRILL " + lenBare(rec ? rec.dIn : r.exactIn),
      foot: t.label.toUpperCase() + " · NOT TO SCALE",
    });
  }

  function renderTap() {
    const t = curThread(), h = hb();
    let ov = num($("tap-ov"));
    ov = ov > 0 ? (S.units === "mm" ? ov * D.M_TO_SFM : ov) : 0;
    const ts = C.tapStart($("mat").value, S.tapType, $("tapmat").value, h, t, ov);
    if (!ts.ok) {
      $("t-rpm").textContent = "—"; $("t-feed").textContent = "—"; $("t-rpm-s").textContent = ""; $("t-feed-s").textContent = "";
      $("t-code").textContent = "—";
      infoLines($("t-info"), [{ c: ts.blocked ? "bad" : "warn", t: ts.reason || "Check inputs." }]);
      return;
    }
    const fb = C.fanucBlock(ts.rpm, t, S.units);
    $("t-rpm").innerHTML = ts.rpm + " <small>rpm</small>";
    $("t-rpm-s").textContent = ts.override ? "your speed" : "up to " + ts.rpmHi + " rpm published";
    $("t-feed").innerHTML = (S.units === "mm" ? fb.feed.toFixed(1) : fb.feed.toFixed(2)) + " <small>" + (S.units === "mm" ? "mm/min" : "ipm") + "</small>";
    const pitchTxt = S.units === "mm" ? C.pitchMm(t).toFixed(4).replace(/0+$/, "").replace(/\.$/, "") + " mm" : dec(C.pitchIn(t), 5) + '"';
    $("t-feed-s").textContent = ts.rpm + " × " + pitchTxt;
    $("t-code").innerHTML = fb.lines.map((l) => esc(l).replace(/^(M29|G84|G80|G2[01])/, '<span class="k">$1</span>')).join("<br>");
    const sp = S.units === "mm" ? Math.round(ts.sfm / D.M_TO_SFM) + " m/min" : Math.round(ts.sfm) + " SFM";
    const spHi = S.units === "mm" ? Math.round(ts.sfmHi / D.M_TO_SFM) + " m/min" : Math.round(ts.sfmHi) + " SFM";
    const lines = [
      "Speed " + sp + (ts.override ? " (yours)" : " — low end of published range (up to " + spHi + ")") + ". Starting point only.",
      "Fill in Z (depth) and R (retract plane). Feed must equal RPM × pitch exactly.",
    ];
    if (!fb.exact) lines.push({ c: "warn", t: "Feed rounded for the F word. For exact sync use G95 (feed/rev) with F = pitch, or pick an RPM that gives an even feed." });
    if (t.pipe && t.type === "taper") lines.push("Pipe tap: go to depth set by the L1 plug gauge, not a fixed thread length.");
    if (ts.sources && ts.sources.length && !ts.override) lines.push({ html: "<b>Sources:</b> " + esc(ts.sources.join(" · ")) });
    infoLines($("t-info"), lines);
  }

  function renderDrill() {
    if (S.dLinked && lastRec) S.dDiaIn = lastRec.dIn;
    if (document.activeElement !== $("d-dia")) $("d-dia").value = S.units === "mm" ? (S.dDiaIn * IN_MM).toFixed(2) : S.dDiaIn.toFixed(4);
    if (document.activeElement !== $("d-depth")) $("d-depth").value = S.units === "mm" ? (S.depthIn * IN_MM).toFixed(1) : S.depthIn.toFixed(3);
    const ds = C.drillStart($("mat").value, $("drillmat").value, hb(), S.dDiaIn, S.depthIn);
    const ids = ["d-sfm", "d-rpm", "d-ipr", "d-ipm"];
    if (!ds.ok) {
      ids.forEach((i) => { $(i).textContent = "—"; $(i + "-s").textContent = ""; });
      setChip($("d-chip"), ds.blocked ? "red" : "amber", ds.blocked ? "Blocked" : "No data");
      infoLines($("d-info"), [{ c: ds.blocked ? "bad" : "warn", t: ds.reason }]);
      return;
    }
    const mm = S.units === "mm";
    $("d-sfm").innerHTML = mm ? Math.round(ds.sfm / D.M_TO_SFM) + " <small>m/min</small>" : Math.round(ds.sfm) + " <small>SFM</small>";
    $("d-sfm-s").textContent = "range to " + (mm ? Math.round(ds.sfmHi / D.M_TO_SFM) : Math.round(ds.sfmHi));
    $("d-rpm").innerHTML = ds.rpm + " <small>rpm</small>";
    $("d-rpm-s").textContent = "to " + ds.rpmHi + " rpm";
    $("d-ipr").innerHTML = mm ? (ds.ipr * IN_MM).toFixed(3) + " <small>mm/rev</small>" : dec(ds.ipr, 4) + " <small>ipr</small>";
    $("d-ipr-s").textContent = "range to " + (mm ? (ds.iprHi * IN_MM).toFixed(3) : dec(ds.iprHi, 4));
    $("d-ipm").innerHTML = mm ? Math.round(ds.ipm * IN_MM) + " <small>mm/min</small>" : ds.ipm.toFixed(1) + " <small>ipm</small>";
    $("d-ipm-s").textContent = "to " + (mm ? Math.round(ds.ipmHi * IN_MM) : ds.ipmHi.toFixed(1));
    setChip($("d-chip"), ds.peck.level, ds.peck.text.split(":")[0].split(".")[0]);
    const lines = [{ c: ds.peck.level === "green" ? "" : ds.peck.level === "amber" ? "warn" : "bad", t: ds.peck.text + (ds.peck.q ? " Q = " + len(ds.peck.q) + "." : "") }];
    lines.push("Depth " + ds.ld.toFixed(1) + "×D. Low end used; the high end is the most aggressive published value (info only).");
    if (ds.sfmStart) lines.push("Haas 'starting' SFM for this insert drill: " + (mm ? Math.round(ds.sfmStart / D.M_TO_SFM) + " m/min" : Math.round(ds.sfmStart) + " SFM") + ".");
    ds.notes.forEach((n) => lines.push({ c: "warn", t: n }));
    if (ds.sources.length) lines.push({ html: "<b>Sources:</b> " + esc(ds.sources.join(" · ")) });
    infoLines($("d-info"), lines);
  }

  function renderCost() {
    const g = (id) => { const v = num($(id)); return v >= 0 ? v : 0; };
    const shared = { partValue: g("c-part"), lostMin: g("c-min"), shopRate: g("c-rate") };
    const side = (k) => ({ tapCost: g("c-" + k + "-cost"), holesPerTap: g("c-" + k + "-life"), holesPerBreak: g("c-" + k + "-brk") });
    const cut = side("cut"), form = side("form");
    const snapSide = S.tapType === "form" ? form : cut;
    $("c-snap-lbl").textContent = "Snapped " + S.tapType + " tap cost";
    $("c-snap").textContent = money(C.snappedTapCost(Object.assign({ taps: g("c-n"), tapCost: snapSide.tapCost }, shared)));
    const ok = (s) => s.holesPerTap > 0 && s.holesPerBreak > 0;
    const put = (k, s) => {
      if (!ok(s)) { ["tot", "wear", "breaks"].forEach((x) => { $("c-" + k + "-" + x).textContent = "—"; }); return null; }
      const r = C.per1000(s, shared);
      $("c-" + k + "-tot").textContent = money(r.total); $("c-" + k + "-wear").textContent = money(r.wear); $("c-" + k + "-breaks").textContent = money(r.breaks);
      return r;
    };
    const rc = put("cut", cut), rf = put("form", form);
    $("c-cut-out").classList.toggle("win", !!(rc && rf && rc.total < rf.total));
    $("c-form-out").classList.toggle("win", !!(rc && rf && rf.total < rc.total));
    $("c-verdict").textContent = rc && rf ? (Math.abs(rc.total - rf.total) < 0.005 ? "Same cost per 1,000 holes." :
      (rf.total < rc.total ? "Form" : "Cut") + " taps save " + money(Math.abs(rc.total - rf.total)) + " per 1,000 holes (DEMO numbers).") : "Holes per tap and per break must be over 0.";
  }

  function renderUnits() {
    const mm = S.units === "mm";
    segSet(mm ? $("u-mm") : $("u-in"), [mm ? $("u-in") : $("u-mm")]);
    $("tap-ov-lbl").textContent = mm ? "Own m/min" : "Own SFM";
    $("d-dia-lbl").textContent = "Drill Ø (" + S.units + ")";
    $("d-depth-lbl").textContent = "Hole depth (" + S.units + ")";
    $("cv1-lbl").textContent = mm ? "m/min ↔ RPM" : "SFM ↔ RPM";
    $("cv2-lbl").textContent = mm ? "mm/rev ↔ mm/min" : "IPR ↔ IPM";
    $("cv-d-lbl").textContent = mm ? "Ø mm" : "Ø in";
    $("cv-sfm-lbl").textContent = mm ? "m/min" : "SFM";
    $("cv-ipr-lbl").textContent = mm ? "mm/rev" : "IPR";
    $("cv-ipm-lbl").textContent = mm ? "mm/min" : "IPM";
  }

  function renderAll() { renderTapDrill(); renderTap(); renderDrill(); renderCost(); }

  // ------------------------------------------------------------ convert accordion
  function cvSpeed(from) {
    const mm = S.units === "mm", d = num($("cv-d"));
    if (!(d > 0)) return;
    if (from === "rpm") { const r = num($("cv-rpm")); if (r > 0) $("cv-sfm").value = (mm ? C.mminFromRpm(r, d) : C.sfmFromRpm(r, d)).toFixed(1); }
    else { const v = num($("cv-sfm")); if (v > 0) $("cv-rpm").value = Math.round(mm ? C.rpmFromMmin(v, d) : C.rpmFromSfm(v, d)); }
  }
  function cvFeed(from) {
    const r = num($("cv-rpm2"));
    if (!(r > 0)) return;
    if (from === "ipm") { const v = num($("cv-ipm")); if (v >= 0) $("cv-ipr").value = +(v / r).toFixed(5); }
    else { const v = num($("cv-ipr")); if (v >= 0) $("cv-ipm").value = +(v * r).toFixed(S.units === "mm" ? 1 : 2); }
  }
  function cvLen(from) {
    if (from === "mm") { const v = num($("cv-mm")); if (Number.isFinite(v)) $("cv-in").value = +(v / IN_MM).toFixed(5); }
    else { const v = num($("cv-in")); if (Number.isFinite(v)) $("cv-mm").value = +(v * IN_MM).toFixed(3); }
  }
  function cvFlipUnits(toMm) {
    const k = toMm ? IN_MM : 1 / IN_MM;
    const d = num($("cv-d")); if (d > 0) $("cv-d").value = +(d * k).toFixed(toMm ? 2 : 4);
    const s = num($("cv-sfm")); if (s > 0) $("cv-sfm").value = +(toMm ? s / D.M_TO_SFM : s * D.M_TO_SFM).toFixed(1);
    const f = num($("cv-ipr")); if (f > 0) $("cv-ipr").value = +(f * k).toFixed(toMm ? 3 : 5);
    cvSpeed("sfm"); cvFeed("ipr");
  }

  // ------------------------------------------------------------ events
  function setTapType(tt) {
    S.tapType = tt;
    segSet(tt === "cut" ? $("tt-cut") : $("tt-form"), [tt === "cut" ? $("tt-form") : $("tt-cut")], tt === "cut" ? "cu" : null);
    $("pct").value = S.pct[tt];
    renderAll();
  }
  function setScale(sc) {
    const cur = hb();
    S.scale = sc; store.set(LS.scale, sc);
    segSet(sc === "HB" ? $("h-hb") : $("h-hrc"), [sc === "HB" ? $("h-hrc") : $("h-hb")]);
    if (Number.isFinite(cur)) setHardFromHB(cur);
    $("hard-note").textContent = hardNote();
    renderAll();
  }
  function setUnits(u) {
    if (u === S.units) return;
    S.units = u; store.set(LS.units, u);
    renderUnits(); cvFlipUnits(u === "mm"); renderAll();
  }

  function init() {
    buildThreadSelect();
    fill($("mat"), D.MATERIALS, "low_c");
    fill($("tapmat"), D.TAP_MATERIALS, "hss");
    fill($("drillmat"), D.DRILL_MATERIALS, "hss");
    const c = D.DEMO_COST;
    $("c-part").value = c.partValue; $("c-min").value = c.lostMin; $("c-rate").value = c.shopRate; $("c-n").value = c.brokenTaps;
    ["cut", "form"].forEach((k) => { $("c-" + k + "-cost").value = c[k].tapCost; $("c-" + k + "-life").value = c[k].holesPerTap; $("c-" + k + "-brk").value = c[k].holesPerBreak; });
    const demoOn = store.get(LS.demo, "1") === "1";
    $("demo-on").checked = demoOn; $("demo-body").hidden = !demoOn;
    segSet(S.scale === "HB" ? $("h-hb") : $("h-hrc"), [S.scale === "HB" ? $("h-hrc") : $("h-hb")]);
    setHardFromHB(C.material("low_c").defaultHB);
    $("hard-note").textContent = hardNote();

    $("u-in").onclick = () => setUnits("in");
    $("u-mm").onclick = () => setUnits("mm");
    $("tt-cut").onclick = () => setTapType("cut");
    $("tt-form").onclick = () => setTapType("form");
    $("h-hb").onclick = () => setScale("HB");
    $("h-hrc").onclick = () => setScale("HRC");
    $("thread").onchange = renderAll;
    $("pct").oninput = renderAll;
    $("mat").onchange = () => { setHardFromHB(C.material($("mat").value).defaultHB); $("hard-note").textContent = hardNote(); renderAll(); };
    $("hard").oninput = () => { $("hard-note").textContent = hardNote(); renderAll(); };
    $("tapmat").onchange = renderTap; $("tap-ov").oninput = renderTap;
    $("drillmat").onchange = renderDrill;
    $("d-link").onchange = () => { S.dLinked = $("d-link").checked; renderDrill(); };
    $("d-dia").oninput = () => {
      const v = num($("d-dia")); if (!(v > 0)) return;
      S.dLinked = false; $("d-link").checked = false; S.dDiaIn = S.units === "mm" ? v / IN_MM : v; renderDrill();
    };
    $("d-depth").oninput = () => { const v = num($("d-depth")); if (!(v >= 0)) return; S.depthIn = S.units === "mm" ? v / IN_MM : v; renderDrill(); };
    document.querySelectorAll(".demo input[type=number]").forEach((el) => { el.oninput = renderCost; });
    $("demo-on").onchange = () => { $("demo-body").hidden = !$("demo-on").checked; store.set(LS.demo, $("demo-on").checked ? "1" : "0"); };
    $("cv-d").oninput = () => cvSpeed("sfm"); $("cv-sfm").oninput = () => cvSpeed("sfm"); $("cv-rpm").oninput = () => cvSpeed("rpm");
    $("cv-rpm2").oninput = () => cvFeed("ipr"); $("cv-ipr").oninput = () => cvFeed("ipr"); $("cv-ipm").oninput = () => cvFeed("ipm");
    $("cv-in").oninput = () => cvLen("in"); $("cv-mm").oninput = () => cvLen("mm");

    if (S.units === "mm") cvFlipUnits(true);
    renderUnits(); cvSpeed("sfm"); cvFeed("ipr"); cvLen("in");
    setTapType("cut");
  }
  document.addEventListener("DOMContentLoaded", init);
})();

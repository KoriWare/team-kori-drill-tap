/* Insert (STI) switch + Repair or scrap? line — Maria (UI), Stacey (method), Jenny (STI sizes + checks).
 * Switch state: window.DT_INSERT (bool), saved as localStorage "dt-ins", fires document "dt:insert".
 * Jenny: read window.DT_INSERT (or listen for dt:insert) to swap in STI drill/tap/code. Until DT_CALC.sti exists the note says sizes are on the way.
 * Repair: window.DT_REPAIR() -> { repair, part, save, breakEvenMin } from the DEMO inputs (sample numbers only). */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const num = (id, d) => { const el = $(id); const v = el ? parseFloat(el.value) : NaN; return Number.isFinite(v) && v >= 0 ? v : d; };
  const usd = (v) => "$" + v.toFixed(2);
  const NOTE_OFF = "Show STI drill, tap and depths for this thread";

  function repair() {
    const part = num("c-part", 0), rate = num("c-rate", 0), min = num("r-min", 0), ins = num("r-ins", 0), tap = num("r-tap", 0), life = Math.max(1, num("r-life", 1));
    const fixed = ins + tap / life, rep = fixed + (min / 60) * rate;
    const be = rate > 0 ? ((part - fixed) / rate) * 60 : Infinity;
    return { repair: rep, part, save: part - rep, breakEvenMin: be, ins, tapShare: tap / life, labor: (min / 60) * rate, min, rate };
  }
  window.DT_REPAIR = repair;

  function renderRep() {
    const o = $("rep-out"); if (!o) return;
    const r = repair(), win = r.save >= 0;
    o.className = "rep-out " + (win ? "win" : "lose");
    o.innerHTML =
      '<div class="rep-v"><span class="lbl">Repair</span><b>' + usd(r.repair) + '</b><span class="lbl">vs new part</span><b>' + usd(r.part) + "</b></div>" +
      '<div class="rep-verdict">' + (win ? "Repair wins by " + usd(r.save) : "Scrap wins by " + usd(-r.save)) + "</div>" +
      '<div class="rep-line">' + usd(r.ins) + " insert + " + usd(r.tapShare) + " of the STI tap + " + usd(r.labor) + " labor (" + r.min + " min)</div>" +
      (Number.isFinite(r.breakEvenMin) && r.breakEvenMin > 0 ? '<div class="rep-line">Scrap wins once a repair takes more than ' + Math.floor(r.breakEvenMin) + " min.</div>" : "");
  }

  /* ---- Inserts · STI section ----
   * Data (Jenny): window.DT_CALC.sti(thread, S) -> {
   *   drill: { label, dIn, note }, tap: { label, note }, check: { level: "green"|"amber"|"red", text },
   *   lengths: [ { x, lenIn, holeIn, tapZIn } ],  belowTopIn, sink: { deg, diaIn },
   *   code: [ "line", … ] (use ? for X Y R), install: [ "step", … ], src: [ { name, url } ] }
   * Until it exists the frame shows arithmetic-only lengths (x × nominal) and dashes, under the gold Sample bar. */
  const XS = [1, 1.5, 2, 2.5, 3];
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let lenX = 1.5; try { const v = parseFloat(localStorage.getItem("dt-ins-len")); if (XS.indexOf(v) >= 0) lenX = v; } catch (e) {}
  const SAMPLE_STEPS = ["Drill with the STI drill.", "Countersink the hole.", "Tap with the STI tap.", "Wind the insert in until it sits below the top.", "Break off the tang in a blind hole."];

  function fmt(vIn, units) { if (!(vIn > 0)) return "—"; return units === "mm" ? (vIn * 25.4).toFixed(2) + " mm" : vIn.toFixed(4).replace(/^0/, "") + '"'; }
  function majorIn(t) { return t.system === "inch" ? t.major : t.major / 25.4; }
  function pitchIn(t) { return t.system === "inch" ? 1 / t.tpi : t.pitch / 25.4; }

  function drawIns(t, d, row) {
    const P = pitchIn(t), L = row.lenIn, below = d && d.belowTopIn > 0 ? d.belowTopIn : P, hole = row.holeIn > 0 ? row.holeIn : (below + L) * 1.25;
    const end = hole * 1.1, x0 = 22, x1 = 330, X = (z) => x0 + (z / end) * (x1 - x0), cy = 52, r = 17;
    let s = '<defs><pattern id="ih" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#2a3a44" stroke-width="2"/></pattern></defs>';
    s += '<rect x="' + x0 + '" y="' + (cy - 32) + '" width="320" height="64" fill="url(#ih)"/>';
    s += '<rect x="' + x0 + '" y="' + (cy - r) + '" width="' + (X(hole) - x0).toFixed(1) + '" height="' + 2 * r + '" fill="#0d1a20" stroke="#3a4c57" stroke-width="1.2"/>';
    // coil insert: copper diamond-wire loops from below-top to below-top + L
    const a = X(below), b = X(below + L), step = Math.max(5, X(P) - x0);
    let top = "", bot = "";
    for (let x = a; x < b - 0.5; x += step) { top += '<path d="M' + x.toFixed(1) + " " + (cy - r) + " l" + (step / 2).toFixed(1) + " 5 l" + (step / 2).toFixed(1) + ' -5" fill="rgba(232,137,74,.25)" stroke="#e8894a" stroke-width="1.4" stroke-linejoin="round"/>'; bot += '<path d="M' + x.toFixed(1) + " " + (cy + r) + " l" + (step / 2).toFixed(1) + " -5 l" + (step / 2).toFixed(1) + ' 5" fill="rgba(232,137,74,.25)" stroke="#e8894a" stroke-width="1.4" stroke-linejoin="round"/>'; }
    s += top + bot;
    // inner thread (what your screw sees) in teal
    s += '<line x1="' + a.toFixed(1) + '" y1="' + (cy - r + 6) + '" x2="' + b.toFixed(1) + '" y2="' + (cy - r + 6) + '" stroke="#2dd4bf" stroke-width="1" stroke-dasharray="2 3"/><line x1="' + a.toFixed(1) + '" y1="' + (cy + r - 6) + '" x2="' + b.toFixed(1) + '" y2="' + (cy + r - 6) + '" stroke="#2dd4bf" stroke-width="1" stroke-dasharray="2 3"/>';
    s += '<path d="M' + x0 + ' 10 V' + (cy + 36) + '" stroke="#93a4ad" stroke-width="1" opacity=".7"/><text x="' + (x0 + 4) + '" y="14" fill="#93a4ad" font-size="8" font-family="JetBrains Mono,monospace" letter-spacing=".6">Z0 TOP</text>';
    const mid = (a + b) / 2;
    s += '<rect x="' + (mid - 46) + '" y="' + (cy - 7) + '" width="92" height="14" rx="7" fill="#10161b" stroke="#e8894a"/><text x="' + mid + '" y="' + (cy + 3) + '" text-anchor="middle" fill="#f2a66f" font-size="8.5" font-family="JetBrains Mono,monospace">INSERT ' + row.x + '×D</text>';
    s += '<text x="' + (x0 + 4) + '" y="98" fill="#93a4ad" font-size="8" font-family="JetBrains Mono,monospace" letter-spacing=".6">' + (d && d.belowTopIn > 0 ? "SITS " + fmt(d.belowTopIn, "in") + " BELOW TOP" : "SITS BELOW TOP · DEPTH FROM JENNY") + "</text>";
    return s;
  }

  function renderSection() {
    const st = window.DT_STATE; if (!st || !$("ins-acc")) return;
    const t = st.thread, S = st.S || {}, units = S.units;
    const C = window.DT_CALC || {};
    let d = null; try { d = typeof C.sti === "function" ? C.sti(t, S) : null; } catch (e) { d = null; }
    $("ins-sample").hidden = !!d;
    const pipe = !t || t.pipe;
    $("ins-badge").textContent = pipe ? "N/A" : t.label + " STI";
    if (pipe) { $("ins-drill").textContent = "—"; $("ins-tap").textContent = "—"; $("ins-chk").querySelector("span").textContent = "Inserts are for straight threads, not pipe threads."; return; }
    $("ins-drill").textContent = d && d.drill ? d.drill.label : "—";
    $("ins-drill-s").textContent = d && d.drill ? (d.drill.note || fmt(d.drill.dIn, units)) : "from Jenny's insert charts";
    $("ins-tap").textContent = d && d.tap ? d.tap.label : t.label.replace(/ (UNC|UNF|UNEF|M\b.*)$/, "") + " STI";
    $("ins-tap-s").textContent = d && d.tap ? (d.tap.note || "") : "oversize tap · sized for the insert";
    const chk = $("ins-chk"); chk.className = "chip" + (d && d.check ? " " + ({ green: "", amber: "amber", red: "red" }[d.check.level] || "") : " amber");
    chk.querySelector("span").textContent = d && d.check ? d.check.text : "% thread and class check arrive with the STI hole limits";
    const rows = XS.map((x) => { const r = d && d.lengths ? d.lengths.find((q) => q.x === x) : null; return r || { x, lenIn: x * majorIn(t), holeIn: 0, tapZIn: 0 }; });
    $("ins-len").innerHTML = rows.map((r) => '<button type="button" data-x="' + r.x + '" aria-pressed="' + (r.x === lenX) + '"' + (r.x === lenX ? ' class="on cu"' : "") + ">" + r.x + "×D</button>").join("");
    const row = rows.find((r) => r.x === lenX) || rows[1];
    $("ins-z").innerHTML = drawIns(t, d, row);
    $("ins-tbl").innerHTML = '<div class="r h"><span>Length</span><span>Hole depth</span><span>Tap Z</span></div>' +
      rows.map((r) => '<div class="r' + (r.x === lenX ? " on" : "") + '"><span><b>' + r.x + "×D</b> " + fmt(r.lenIn, units) + "</span><span>" + fmt(r.holeIn, units) + "</span><span>" + (r.tapZIn > 0 ? "Z-" + (units === "mm" ? (r.tapZIn * 25.4).toFixed(3) : r.tapZIn.toFixed(4)) : "—") + "</span></div>").join("");
    $("ins-code").innerHTML = d && d.code ? d.code.map((l) => esc(l).replace(/^(M29|G84|G80|G2[01])/, '<span class="k">$1</span>').replace(/\?/g, '<span class="q">?</span>')).join("<br>") : '<span class="dimc">STI tap code arrives with the sizes. It uses the same amber ? spots as the tap cycle.</span>';
    $("ins-steps").innerHTML = (d && d.install ? d.install : SAMPLE_STEPS).map((x) => "<li>" + esc(x) + "</li>").join("");
    const src = d && d.src ? d.src : [];
    $("ins-src").innerHTML = "<b>Sources:</b> " + (src.length ? src.map((q) => /^https:\/\//.test(q.url || "") ? '<a href="' + esc(q.url) + '" target="_blank" rel="noopener">' + esc(q.name) + "</a>" : esc(q.name)).join(" · ") : "Heli-Coil, Recoil and the ASME and ISO insert standards, coming from Jenny's research. Lengths shown are just length × nominal size.");
  }

  function setIns(on, fromUser) {
    window.DT_INSERT = !!on;
    try { localStorage.setItem("dt-ins", on ? "1" : "0"); } catch (e) {}
    const cb = $("ins-on"); if (cb) cb.checked = !!on;
    document.body.classList.toggle("is-ins", !!on);
    const chip = $("ins-chip"); if (chip) chip.hidden = !on;
    const note = $("ins-note");
    const ready = window.DT_CALC && typeof window.DT_CALC.sti === "function";
    if (note) { note.textContent = on ? (ready ? "STI sizes for this thread are open in Inserts below" : "Inserts section is open below · STI sizes on the way from Jenny") : NOTE_OFF; note.className = on && !ready ? "wait" : ""; }
    if (fromUser !== false) document.dispatchEvent(new CustomEvent("dt:insert", { detail: { on: !!on } }));
  }
  window.DT_SET_INSERT = (on) => {
    setIns(on);
    const acc = $("ins-acc"); if (acc && on) { acc.open = true; acc.closest("section").scrollIntoView({ behavior: "smooth", block: "start" }); }
  };

  function init() {
    let on = false; try { on = localStorage.getItem("dt-ins") === "1"; } catch (e) {}
    setIns(on, false);
    const cb = $("ins-on"); if (cb) cb.addEventListener("change", () => { setIns(cb.checked); if (cb.checked) { const acc = $("ins-acc"); if (acc) acc.open = true; } });
    const acc = $("ins-acc");
    if (acc) { try { acc.open = localStorage.getItem("dt-ins-open") === "1" || on; } catch (e) {} acc.addEventListener("toggle", () => { try { localStorage.setItem("dt-ins-open", acc.open ? "1" : "0"); } catch (e) {} }); }
    const lz = $("ins-len"); if (lz) lz.addEventListener("click", (e) => { const b = e.target.closest("[data-x]"); if (!b) return; lenX = parseFloat(b.dataset.x); try { localStorage.setItem("dt-ins-len", String(lenX)); } catch (er) {} renderSection(); });
    document.addEventListener("dt:change", renderSection);
    renderSection();
    ["c-part", "c-rate", "r-min", "r-ins", "r-tap", "r-life"].forEach((id) => { const el = $(id); if (el) el.addEventListener("input", () => { renderRep(); document.dispatchEvent(new Event("dt:repair")); }); });
    renderRep();
    setTimeout(renderRep, 50); // after app.js fills the DEMO defaults
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

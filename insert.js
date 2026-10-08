/* Insert (STI) switch + Repair or scrap? line — Maria (UI), Stacey (method), Jenny (STI sizes + checks).
 * Switch state: window.DT_INSERT (bool), saved as localStorage "dt-ins", fires document "dt:insert".
 * Jenny: read window.DT_INSERT (or listen for dt:insert) to swap in STI drill/tap/code. Until DT_CALC.sti exists the note says sizes are on the way.
 * Repair: window.DT_REPAIR() -> { repair, part, save, breakEvenMin } from the DEMO inputs (sample numbers only). */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const num = (id, d) => { const el = $(id); const v = el ? parseFloat(el.value) : NaN; return Number.isFinite(v) && v >= 0 ? v : d; };
  const usd = (v) => "$" + v.toFixed(2);
  const NOTE_OFF = "Repair a stripped thread, or put a stronger thread in soft metal";

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

  function setIns(on, fromUser) {
    window.DT_INSERT = !!on;
    try { localStorage.setItem("dt-ins", on ? "1" : "0"); } catch (e) {}
    const cb = $("ins-on"); if (cb) cb.checked = !!on;
    document.body.classList.toggle("is-ins", !!on);
    const chip = $("ins-chip"); if (chip) chip.hidden = !on;
    const note = $("ins-note");
    const ready = window.DT_CALC && typeof window.DT_CALC.sti === "function";
    if (note) { note.textContent = on ? (ready ? "Drill, tap and code below are for the STI insert, not a standard tap" : "STI drill and tap sizes are on the way from Jenny") : NOTE_OFF; note.className = on && !ready ? "wait" : ""; }
    if (fromUser !== false) document.dispatchEvent(new CustomEvent("dt:insert", { detail: { on: !!on } }));
  }
  window.DT_SET_INSERT = (on) => {
    setIns(on);
    const p = $("thread-lbl"); if (p && p.closest("section")) p.closest("section").scrollIntoView({ behavior: "smooth", block: "start" });
  };

  function init() {
    let on = false; try { on = localStorage.getItem("dt-ins") === "1"; } catch (e) {}
    setIns(on, false);
    const cb = $("ins-on"); if (cb) cb.addEventListener("change", () => setIns(cb.checked));
    ["c-part", "c-rate", "r-min", "r-ins", "r-tap", "r-life"].forEach((id) => { const el = $(id); if (el) el.addEventListener("input", () => { renderRep(); document.dispatchEvent(new Event("dt:repair")); }); });
    renderRep();
    setTimeout(renderRep, 50); // after app.js fills the DEMO defaults
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

/* Team Kori — Drill & Tap · Troubleshoot panel (Maria: UI).
 * Content: window.DT_DATA.TROUBLE  = { symptomId: [ { id, title, why, fix, src } ] }   (Jenny)
 * Checks:  window.DT_CALC.troubleChecks(state) -> [ { id, level: "live" | "ok", sev: "red" | "amber" | "green", you: "…", sourceKey } ] (Jenny)
 * state comes from app.js on every render (document "dt:change", also window.DT_STATE); calc reads state.tc (inches, SFM).
 * sev "red" cards sort first and tag HIGH RISK; "amber" tags YOUR SETTINGS; "ok" tags CHECKED.
 * Until Jenny's data lands, the SAMPLE content below is shown with a gold "sample text" note. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const SYMPTOMS = [
    { id: "broke", ic: "💥", name: "Tap broke" },
    { id: "oversize", ic: "⭕", name: "Thread oversize" },
    { id: "tight", ic: "🔩", name: "Thread tight" },
    { id: "wander", ic: "↗", name: "Drill wanders" },
    { id: "packing", ic: "🌀", name: "Chips packing" },
    { id: "burn", ic: "🔥", name: "Drill burns" },
    { id: "finish", ic: "✨", name: "Bad finish" },
    { id: "fanuc", ic: "⚙", name: "Rigid tap on the Fanuc", cu: true },
  ];

  // SAMPLE layout content only — replaced by DT_DATA.TROUBLE (Jenny's sourced research).
  const SAMPLE = {
    broke: [
      { id: "pct-high", title: "Thread % too high", why: "Above ~75% adds tap torque fast but barely adds strength.", fix: "Drop % thread or step up one drill size." },
      { id: "blind-packing", title: "Chips packing at the bottom", why: "Blind hole with a tap that pushes chips down. They have nowhere to go.", fix: "Spiral-flute or form tap for blind holes, or drill deeper." },
      { id: "tap-bottoms", title: "Tap hitting the bottom", why: "Tap Z must stop short of the drilled full Ø.", fix: "Drill deeper or use a bottoming tap." },
      { id: "worn", title: "Worn or chipped tap", why: "Dull edges need more torque and can grab.", fix: "Swap taps on a set hole count, not at breakage." },
    ],
    oversize: [{ id: "s-over", title: "Sample card", why: "Causes and fixes come from Jenny's research.", fix: "—" }],
    wander: [{ id: "s-wander", title: "Sample card", why: "Causes and fixes come from Jenny's research.", fix: "—" }],
    packing: [{ id: "blind-packing", title: "Chips packing at the bottom", why: "Blind hole with a tap that pushes chips down.", fix: "Spiral-flute or form tap for blind holes, or drill deeper." }],
    burn: [{ id: "s-burn", title: "Sample card", why: "Causes and fixes come from Jenny's research.", fix: "—" }],
    finish: [{ id: "s-finish", title: "Sample card", why: "Causes and fixes come from Jenny's research.", fix: "—" }],
    fanuc: [
      { id: "feed-sync", title: "Feed must equal RPM × pitch", why: "Any mismatch fights the spindle sync and pulls or crushes the thread.", fix: "Use the F from the code box exactly." },
      { id: "m29", title: "M29 in the right spot", why: "M29 S__ goes on its own line right before G84.", fix: "Keep the M29 line from the code box above G84." },
      { id: "backout", title: "Thread oversize after backout", why: "Retract running faster than the feed-in can shave the thread.", fix: "Check the retract override parameter for your control." },
      { id: "override", title: "Override knobs during the cycle", why: "Feed and speed overrides should be locked out in rigid tap.", fix: "Confirm overrides are ignored in G84 on your machine." },
    ],
  };
  // SAMPLE checks — only used until DT_CALC.troubleChecks exists.
  function sampleChecks(st) {
    const out = [], S = st.S, t = st.thread || {};
    if (!t.pipe && S.pct[S.tapType] > 75) out.push({ id: "pct-high", level: "live", you: "You: " + S.pct[S.tapType] + "% thread" });
    if (st.hole && S.hole === "blind" && S.depthIn > 0) {
      const gap = st.hole.drillFull - st.hole.tapZ;
      out.push(gap > 0 ? { id: "tap-bottoms", level: "ok", you: "Full Ø drill runs " + gap.toFixed(4).replace(/^0/, "") + " past Tap Z ✓" } : { id: "tap-bottoms", level: "live", you: "Drill isn't deeper than Tap Z" });
    }
    const m = /S(\d+)[\s\S]*G84[^\n]*F([\d.]+)/.exec(st.tapCode || "");
    if (m) out.push({ id: "feed-sync", level: "ok", you: "F" + m[2] + " from the code box ✓" });
    if (/M29 S\d+\s*G84/.test(st.tapCode || "")) out.push({ id: "m29", level: "ok", you: "Code box: M29 right before G84 ✓" });
    return out;
  }

  let sel = null, open = false;
  try { sel = localStorage.getItem("dt-ts-sym"); open = localStorage.getItem("dt-ts-open") === "1"; } catch (e) {}

  function demoLine() {
    const g = (id) => { const el = $(id); const v = el ? parseFloat(el.value) : NaN; return Number.isFinite(v) && v >= 0 ? v : 0; };
    const st = window.DT_STATE, form = st && st.S.tapType === "form";
    const tap = g(form ? "c-form-cost" : "c-cut-cost"), part = g("c-part"), min = g("c-min"), rate = g("c-rate");
    const one = tap + part + (min / 60) * rate;
    const m = (v) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const mm = (v) => "$" + (Math.round(v) === v ? v : v.toFixed(2));
    return '<div class="ts-cost"><div class="lbl">DEMO $ · what one break costs</div>Sample cost of one snapped tap is <b>' + m(one) +
      "</b> (a " + mm(tap) + " tap, a " + mm(part) + " part, and " + min + " minutes at " + mm(rate) + "/hr). Type your own numbers in DEMO $ below.</div>";
  }

  // Per-card source: { name, url } (real data) or a plain string.
  function srcLink(src) {
    if (!src) return "";
    if (typeof src === "string") return '<div class="s">Source: ' + esc(src) + "</div>";
    const ok = /^https:\/\//.test(src.url || "");
    return '<div class="s">Source: ' + (ok ? '<a href="' + esc(src.url) + '" target="_blank" rel="noopener">' + esc(src.name) + "</a>" : esc(src.name)) + "</div>";
  }

  // Thread oversize: offer the insert repair + Stacey's Repair or scrap? sample line.
  function repairLine() {
    const r = typeof window.DT_REPAIR === "function" ? window.DT_REPAIR() : null, on = !!window.DT_INSERT;
    const usd = (v) => "$" + v.toFixed(2);
    let t = '<div class="ts-rep"><div class="ts-rep-hd"><span class="lbl">Save the part with an insert</span></div>' +
      '<button type="button" class="ts-rep-btn' + (on ? " on" : "") + '" data-ins>' + (on ? "✓ Insert (STI) is on · see Thread" : "Repair with an insert (STI)") + "</button>";
    if (r) t += '<div class="ts-cost"><span class="lbl">DEMO $ · repair or scrap?</span>Sample repair is <b>' + usd(r.repair) + "</b> vs a <b>" + usd(r.part) + "</b> part, so " +
      (r.save >= 0 ? "repair wins by <b>" + usd(r.save) + "</b>." : "scrap wins by <b>" + usd(-r.save) + "</b>.") + " Type your own numbers in DEMO $ below.</div>";
    return t + "</div>";
  }

  function render() {
    const st = window.DT_STATE; if (!st || !$("ts-sym")) return;
    const D = window.DT_DATA || {}, C = window.DT_CALC || {};
    const real = !!D.TROUBLE, data = D.TROUBLE || SAMPLE;
    let checks = [];
    try { checks = typeof C.troubleChecks === "function" ? C.troubleChecks(st) || [] : sampleChecks(st); } catch (e) { checks = []; }
    const byId = {}; checks.forEach((c) => { byId[c.id] = c; });
    const liveIn = (sid) => (data[sid] || []).filter((c) => byId[c.id] && byId[c.id].level === "live").length;
    const okIn = (sid) => (data[sid] || []).filter((c) => byId[c.id] && byId[c.id].level === "ok").length;
    const known = new Set(Object.keys(data).reduce((a, k) => a.concat(data[k].map((c) => c.id)), []));
    const liveIds = new Set(checks.filter((c) => c.level === "live" && known.has(c.id)).map((c) => c.id));
    $("ts-badge").textContent = liveIds.size ? liveIds.size + (liveIds.size === 1 ? " FLAG" : " FLAGS") : "ALL CLEAR";
    const anyRed = checks.some((c) => c.level === "live" && c.sev === "red" && known.has(c.id));
    $("ts-badge").className = "ts-badge" + (liveIds.size ? (anyRed ? " red" : "") : " ok");
    $("ts-sample").hidden = real;
    $("ts-sym").innerHTML = SYMPTOMS.map((s) => {
      const n = liveIn(s.id);
      return '<button type="button" data-sym="' + s.id + '" aria-pressed="' + (s.id === sel) + '" class="' + (s.cu ? "cu" : "") + (s.id === sel ? " on" : "") + '"><span class="ic" aria-hidden="true">' + s.ic + "</span>" + esc(s.name) + (n ? ' <span class="n" aria-label="' + n + ' match your settings">' + n + "</span>" : "") + "</button>";
    }).join("");
    if (!sel || !data[sel]) { $("ts-body").innerHTML = '<div class="ts-hint">Pick a symptom to see likely causes and fixes.</div>'; return; }
    const sym = SYMPTOMS.find((s) => s.id === sel), cards = data[sel].slice();
    const rank = (c) => (byId[c.id] ? (byId[c.id].level === "live" ? (byId[c.id].sev === "red" ? -1 : 0) : 2) : 1);
    cards.sort((a, b) => rank(a) - rank(b));
    const nl = liveIn(sel), no = okIn(sel);
    let h = '<div class="ts-h"><span class="lbl">' + esc(sym.name) + (sel === "fanuc" ? "" : " · likely causes") + "</span>" +
      (nl ? '<span class="lbl a">' + nl + " match you</span>" : no ? '<span class="lbl g">' + no + " checked</span>" : "") + "</div>";
    cards.forEach((c) => {
      const k = byId[c.id], cls = k ? (k.level === "live" ? (k.sev === "red" ? " live red" : " live") : " ok") : "";
      h += '<div class="fx' + cls + '"><div class="t">' + esc(c.title) + (k ? '<span class="tag">' + (k.level === "live" ? (k.sev === "red" ? "HIGH RISK" : "YOUR SETTINGS") : "CHECKED") + "</span>" : "") + "</div>" +
        (c.why ? '<div class="why">' + esc(c.why) + "</div>" : "") + (c.fix ? '<div class="do"><b>Fix:</b> ' + esc(c.fix) + "</div>" : "") +
        (k && k.you ? '<span class="you">' + esc(k.you) + "</span>" : "") + srcLink(c.src) + "</div>";
    });
    if (sel === "broke") h += demoLine();
    if (sel === "oversize") h += repairLine();
    if (!real) h += '<div class="info src"><b>Sources:</b> coming from Jenny\'s research, one per fix.</div>';
    $("ts-body").innerHTML = h;
  }

  function init() {
    const det = $("ts-acc"); if (!det) return;
    det.open = open;
    det.addEventListener("toggle", () => { try { localStorage.setItem("dt-ts-open", det.open ? "1" : "0"); } catch (e) {} });
    $("ts-sym").addEventListener("click", (e) => {
      const b = e.target.closest("[data-sym]"); if (!b) return;
      sel = sel === b.dataset.sym ? null : b.dataset.sym;
      try { sel ? localStorage.setItem("dt-ts-sym", sel) : localStorage.removeItem("dt-ts-sym"); } catch (er) {}
      render();
    });
    $("ts-body").addEventListener("click", (e) => {
      if (!e.target.closest("[data-ins]")) return;
      if (typeof window.DT_SET_INSERT === "function") window.DT_SET_INSERT(true);
      render();
    });
    document.addEventListener("dt:change", render);
    document.addEventListener("dt:insert", render);
    document.addEventListener("input", (e) => { if (e.target.closest && e.target.closest(".demo")) render(); });
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

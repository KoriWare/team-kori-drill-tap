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
    // Hidden <select> stays the single source of truth (value + change event); the picker drives it.
    sel.innerHTML = D.THREAD_LIST.map((t) => '<option value="' + esc(t.id) + '">' + esc(t.label) + "</option>").join("");
    sel.value = "UNC-1/4-20";
    const m = /(?:^#|&)t=([^&]+)/.exec(location.hash); // deep link, e.g. #t=NPT-1/2
    if (m && C.findThread(decodeURIComponent(m[1]))) sel.value = decodeURIComponent(m[1]);
    Picker.init();
  }

  // ------------------------------------------------------------ type-to-search thread picker
  const Picker = (function () {
    const FAM = [
      { k: "all", n: "All" },
      { k: "inch", n: "Inch", s: ["UNC", "UNF", "UNEF"] },
      { k: "metric", n: "Metric", s: ["ISO metric coarse", "ISO metric fine"] },
      { k: "pipe", n: "Pipe", s: ["NPT (taper pipe)", "BSPT / Rc (taper pipe)", "BSPP / G (parallel pipe)"] },
    ];
    const REC_KEY = "dt-recent";
    const norm = (x) => String(x).toLowerCase().replace(/×/g, "x").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
    const compact = (x) => norm(x).replace(/[\s-]/g, "");
    let fam = "all", items = [], act = -1, lastFocus = null;
    const IDX = D.THREAD_LIST.map((t, i) => {
      const dIn = C.majorIn(t), d4 = dIn.toFixed(4), d3 = dIn.toFixed(3);
      const hay = [t.label, t.series, t.id, d4, d4.slice(1), d3, d3.slice(1),
        t.system === "metric" ? t.major + "mm" : "", t.pipe ? "pipe" : "", t.type === "taper" ? "taper tapered" : "straight parallel"].map(norm).join(" | ");
      return { t, i, hay, cmp: compact(t.label) };
    });
    const meta = (t) => {
      if (t.system === "metric") return "Ø" + t.major + " · P" + t.pitch;
      return (t.pipe ? "OD " : "Ø") + dec(t.major, t.pipe ? 3 : 4) + " · " + t.tpi + " TPI";
    };
    const tags = (t) => (t.type === "taper" ? '<i class="tag cu">TAPER</i>' : t.pipe ? '<i class="tag">STRAIGHT</i>' : "");
    const recent = () => { try { return JSON.parse(store.get(REC_KEY, "[]")).filter((id) => C.findThread(id)); } catch (e) { return []; } };
    const pushRecent = (id) => store.set(REC_KEY, JSON.stringify([id].concat(recent().filter((x) => x !== id)).slice(0, 4)));
    const inFam = (t) => fam === "all" || FAM.find((f) => f.k === fam).s.indexOf(t.series) >= 0;

    function hl(label, q) {
      const tok = norm(q).split(" ")[0];
      if (!tok) return esc(label);
      const i = norm(label).indexOf(tok);
      if (i < 0) return esc(label);
      return esc(label.slice(0, i)) + "<mark>" + esc(label.slice(i, i + tok.length)) + "</mark>" + esc(label.slice(i + tok.length));
    }
    function search(q) {
      const toks = norm(q).split(" ").filter(Boolean), cq = compact(q);
      return IDX.filter((x) => inFam(x.t) && toks.every((k) => x.hay.indexOf(k) >= 0 || x.cmp.indexOf(compact(k)) >= 0))
        .map((x) => ({ x, r: (x.cmp === cq ? 0 : x.cmp.indexOf(cq) === 0 ? 1 : x.hay.indexOf(toks[0]) === 0 ? 2 : 3) - (x.t.common ? 0.5 : 0) }))
        .sort((p, q2) => p.r - q2.r || p.x.i - q2.x.i).map((o) => o.x.t);
    }
    function render() {
      const q = $("tp-q").value, cur = $("thread").value, list = $("tp-list");
      let h = "", n = 0;
      items = [];
      const row = (t) => {
        const k = items.length; items.push(t); n++;
        return '<div class="tp-opt' + (t.id === cur ? " cur" : "") + '" role="option" id="tp-o-' + k + '" data-k="' + k + '" aria-selected="' + (t.id === cur) + '">' +
          '<span class="tp-l">' + hl(t.label, q) + "</span>" + tags(t) + '<span class="tp-m">' + esc(meta(t)) + "</span></div>";
      };
      const group = (name, arr) => { if (arr.length) h += '<div class="tp-g" role="presentation">' + esc(name) + "<span>" + arr.length + "</span></div>" + arr.map(row).join(""); };
      if (norm(q)) {
        const r = search(q);
        group(r.length + (r.length === 1 ? " match" : " matches"), r);
        if (!r.length) h = '<div class="tp-none">No thread matches “' + esc(q) + '”.<br>Try <b>1/4-20</b>, <b>M8</b>, <b>3/8 npt</b> or a diameter like <b>.500</b>.</div>';
      } else {
        if (fam === "all") {
          group("Recent", recent().map((id) => C.findThread(id)));
          group("Most used", D.THREAD_LIST.filter((t) => t.common));
        }
        D.THREAD_SERIES.forEach((sn) => { if (fam === "all" || FAM.find((f) => f.k === fam).s.indexOf(sn) >= 0) group(sn, D.THREAD_LIST.filter((t) => t.series === sn)); });
      }
      list.innerHTML = h;
      $("tp-count").textContent = norm(q) ? n + " found" : D.THREAD_LIST.filter(inFam).length + " sizes";
      setAct(norm(q) && items.length ? 0 : items.findIndex((t) => t.id === cur), !norm(q));
    }
    function setAct(k, center) {
      const old = $("tp-list").querySelector(".tp-opt.act");
      if (old) old.classList.remove("act");
      act = k;
      const el = k >= 0 ? $("tp-o-" + k) : null;
      if (el) {
        el.classList.add("act"); $("tp-q").setAttribute("aria-activedescendant", el.id);
        const L = $("tp-list"), top = el.offsetTop - L.offsetTop;
        if (center) L.scrollTop = top - L.clientHeight / 2 + el.offsetHeight / 2;
        else if (top < L.scrollTop + 28) L.scrollTop = top - 28;
        else if (top + el.offsetHeight > L.scrollTop + L.clientHeight) L.scrollTop = top + el.offsetHeight - L.clientHeight;
      } else $("tp-q").removeAttribute("aria-activedescendant");
    }
    function pick(t) {
      const sel = $("thread");
      if (sel.value !== t.id) { sel.value = t.id; sel.dispatchEvent(new Event("change")); }
      pushRecent(t.id); label(); close();
    }
    function label() {
      const t = C.findThread($("thread").value);
      $("thread-btn-txt").textContent = t.label;
      $("thread-btn-meta").innerHTML = esc(t.series.split(" (")[0]) + " · " + esc(meta(t)) + (t.type === "taper" ? ' · <b class="cu">taper</b>' : "");
    }
    function open() {
      lastFocus = document.activeElement;
      $("tp").hidden = false; document.documentElement.classList.add("tp-open");
      $("tp-q").value = ""; render();
      requestAnimationFrame(() => { $("tp").classList.add("in"); $("tp-q").focus({ preventScroll: true }); });
    }
    function close() {
      $("tp").classList.remove("in"); document.documentElement.classList.remove("tp-open");
      setTimeout(() => { $("tp").hidden = true; }, 180);
      (lastFocus && lastFocus.focus ? lastFocus : $("thread-btn")).focus({ preventScroll: true });
    }
    function init() {
      $("tp-filt").innerHTML = FAM.map((f) => '<button type="button" data-f="' + f.k + '" aria-pressed="' + (f.k === fam) + '"' + (f.k === fam ? ' class="on"' : "") + ">" + f.n + "</button>").join("");
      $("tp-filt").onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        fam = b.dataset.f;
        $("tp-filt").querySelectorAll("button").forEach((x) => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
        render(); $("tp-q").focus({ preventScroll: true });
      };
      $("thread-btn").closest(".field").onclick = open; // whole Size box is the tap target
      $("tp").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
      $("tp-list").onclick = (e) => { const o = e.target.closest(".tp-opt"); if (o) pick(items[+o.dataset.k]); };
      $("tp-q").oninput = render;
      $("tp").addEventListener("keydown", (e) => {
        if (e.key === "Escape") { e.preventDefault(); close(); }
        else if (e.key === "ArrowDown") { e.preventDefault(); setAct(Math.min(items.length - 1, act + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setAct(Math.max(0, act - 1)); }
        else if (e.key === "Enter" && act >= 0 && items[act]) { e.preventDefault(); pick(items[act]); }
        else if (e.key === "Tab") { // keep focus inside the sheet
          const f = Array.from($("tp").querySelectorAll("button,input")); const i = f.indexOf(document.activeElement);
          if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        }
      });
      label();
    }
    return { init, label };
  })();

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
  // Maria's finish: teal = thread form, copper = drill, gold = gauge plane. Everything moves with the inputs.
  const DEFS = '<defs><pattern id="xh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#2a3a44" stroke-width="2"/></pattern>' +
    '<linearGradient id="xbore" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2dd4bf" stop-opacity=".10"/><stop offset="1" stop-color="#2dd4bf" stop-opacity="0"/></linearGradient></defs>';
  const T = (x, y, s, o) => '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || "middle") + '" font-family="' + (o.f || "JetBrains Mono, monospace") + '" font-size="' + (o.s || 10) + '"' + (o.w ? ' font-weight="' + o.w + '"' : "") + (o.ls ? ' letter-spacing="' + o.ls + '"' : "") + ' fill="' + (o.c || "#93a4ad") + '">' + esc(s) + "</text>";
  // dark pill behind a label so it never sits on teeth or hatch
  const PILL = (cx, cy, w, h, stroke) => '<rect x="' + (cx - w / 2).toFixed(1) + '" y="' + (cy - h / 2).toFixed(1) + '" width="' + w + '" height="' + h + '" rx="' + (h / 2) + '" fill="#0a0e11" fill-opacity=".92"' + (stroke ? ' stroke="' + stroke + '" stroke-opacity=".55"' : "") + "/>";
  const COL = { green: "#2dd4bf", amber: "#fbbf24", red: "#f87171" };
  const P = (a) => a.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
  const PL = (a) => a.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const VDIM = (x, y1, y2, c) => '<path d="M' + x + " " + y1 + " V" + y2 + " M" + (x - 3) + " " + y1 + " H" + (x + 3) + " M" + (x - 3) + " " + y2 + " H" + (x + 3) + '" stroke="' + c + '" stroke-width="1.2" fill="none"/>';

  function drawParallel(o) {
    const top = 30, bot = 190, n = 9, step = (bot - top) / n;
    const root = 108, a = o.amp, crest = root + a, rR = 250, cR = rR - a;
    const L = [], R = [];
    for (let i = 0; i <= n * 2; i++) {
      const y = top + (i * step) / 2, inX = i % 2 === 1;
      L.push([inX ? crest : root, y]); R.push([inX ? cR : rR, y]);
    }
    let s = DEFS;
    s += '<rect x="' + crest + '" y="20" width="' + (cR - crest) + '" height="180" fill="url(#xbore)"/>';
    s += '<path d="M20 20 H' + root + " L" + P(L) + " L" + root + ' 200 H20Z" fill="url(#xh)" stroke="#3a4c57" stroke-width="1.5" stroke-linejoin="round"/>';
    s += '<path d="M338 20 H' + rR + " L" + P(R) + " L" + rR + ' 200 H338Z" fill="url(#xh)" stroke="#3a4c57" stroke-width="1.5" stroke-linejoin="round"/>';
    // drill wall (minor Ø) = copper dashed, thread form = teal
    s += '<path d="M' + crest + " 22 V198 M" + cR + ' 22 V198" stroke="#e8894a" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/>';
    s += '<polyline points="' + PL(L) + '" fill="none" stroke="#2dd4bf" stroke-width="2.5" stroke-linejoin="round"/><polyline points="' + PL(R) + '" fill="none" stroke="#2dd4bf" stroke-width="2.5" stroke-linejoin="round"/>';
    s += '<line x1="179" y1="22" x2="179" y2="200" stroke="#93a4ad" stroke-width="1" stroke-dasharray="2 5" opacity=".6"/>';
    // major Ø dimension (top) and drill Ø dimension (bottom)
    s += '<path d="M' + root + " 12 H" + rR + " M" + root + " 8 V16 M" + rR + ' 8 V16" stroke="#93a4ad" stroke-width="1.2"/>';
    s += '<path d="M' + crest + " 211 H" + cR + " M" + crest + " 205 V217 M" + cR + ' 205 V217" stroke="#e8894a" stroke-width="2"/>';
    s += T(338, 15, o.majorTxt, { a: "end", s: 9.5 }) + T(cR + 8, 215, o.drillTxt, { a: "start", s: 9.5, c: "#e8894a" });
    s += PILL(179, 116, Math.max(64, cR - crest - 14), 46);
    s += T(179, 117, o.big, { f: "Space Grotesk, sans-serif", w: 700, s: 28, c: o.bigColor }) + T(179, 132, o.sub, { s: 8, ls: 0.6 });
    s += T(20, 234, o.foot, { a: "start", s: 9 });
    return s;
  }

  function drawTaper(o) {
    // 1:16 on diameter is ~1.8° per side — exaggerated ~10× so you can see it. Tooth count follows real threads across L2.
    const top = 30, bot = 190, shift = 26, a = 12.5;
    const n = Math.max(5, Math.min(12, Math.round(o.L2 * o.tpi))), step = (bot - top) / n;
    const L = [], R = [];
    for (let i = 0; i <= n * 2; i++) {
      const y = top + (i * step) / 2, f = (y - top) / (bot - top), inX = i % 2 === 1;
      const rl = 90 + f * shift, rr = 268 - f * shift;
      L.push([inX ? rl + a : rl, y]); R.push([inX ? rr - a : rr, y]);
    }
    let s = DEFS;
    s += '<path d="M' + (90 + a) + " 20 L" + (90 + shift + a) + " 200 L" + (268 - shift - a) + " 200 L" + (268 - a) + ' 20Z" fill="url(#xbore)"/>';
    s += '<path d="M20 20 H90 L' + P(L) + " L" + (90 + shift) + ' 200 H20Z" fill="url(#xh)" stroke="#3a4c57" stroke-width="1.5" stroke-linejoin="round"/>';
    s += '<path d="M338 20 H268 L' + P(R) + " L" + (268 - shift) + ' 200 H338Z" fill="url(#xh)" stroke="#3a4c57" stroke-width="1.5" stroke-linejoin="round"/>';
    s += '<polyline points="' + PL(L) + '" fill="none" stroke="#2dd4bf" stroke-width="2.5" stroke-linejoin="round"/><polyline points="' + PL(R) + '" fill="none" stroke="#2dd4bf" stroke-width="2.5" stroke-linejoin="round"/>';
    // taper (pitch-line) guides in copper
    const pm = a / 2;
    s += '<path d="M' + (90 + pm) + " 22 L" + (90 + shift + pm) + " 200 M" + (268 - pm) + " 22 L" + (268 - shift - pm) + ' 200" stroke="#e8894a" stroke-width="1.5" stroke-dasharray="5 4" opacity=".9"/>';
    s += '<line x1="179" y1="22" x2="179" y2="200" stroke="#93a4ad" stroke-width="1" stroke-dasharray="2 5" opacity=".6"/>';
    // L1 / L2 dimensions outside the part
    const gy = top + Math.min(1, o.L1 / o.L2) * (bot - top);
    s += VDIM(10, top, gy, "#e8c547") + VDIM(348, top, bot, "#93a4ad");
    s += T(14, 14, "L1 " + o.L1Txt, { a: "start", s: 9, c: "#e8c547" }) + T(344, 14, "L2 " + o.L2Txt, { a: "end", s: 9 });
    // gauge plane: bright gold line, end markers, label centred in the bore (off the teeth)
    s += '<line x1="20" y1="' + gy.toFixed(1) + '" x2="338" y2="' + gy.toFixed(1) + '" stroke="#e8c547" stroke-width="1.4" stroke-dasharray="7 3"/>';
    s += '<path d="M20 ' + (gy - 4).toFixed(1) + " l6 4 l-6 4Z M338 " + (gy - 4).toFixed(1) + ' l-6 4 l6 4Z" fill="#e8c547"/>';
    s += PILL(179, gy, 96, 15, "#e8c547") + T(179, gy + 3.2, "GAUGE PLANE · L1", { s: 8.5, c: "#e8c547", ls: 0.3 });
    // taper callout up in the wide mouth of the hole
    const ty = Math.min(70, gy - 34);
    s += PILL(179, ty, 112, 36) + T(179, ty + 2, "1:16 taper", { f: "Space Grotesk, sans-serif", w: 700, s: 16, c: "#e8894a" }) + T(179, ty + 13, "1°47′ PER SIDE", { s: 8.5 });
    s += T(179, 216, "SMALL END ↓", { s: 8, c: "#5b6b74", ls: 0.6 });
    s += T(179, 234, o.foot, { s: 9 });
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
        ? drawTaper({ L1: r.L1In, L2: r.L2In, tpi: t.tpi, L1Txt: lenBare(r.L1In), L2Txt: lenBare(r.L2In), foot })
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

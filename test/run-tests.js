// node test/run-tests.js — pure-math checks against published values.
const assert = require("assert");
const D = require("../data.js");
const C = require("../calc.js");
let n = 0;
const t = (name, fn) => { fn(); n++; console.log("ok  " + name); };
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, msg + ": " + a + " vs " + b);
const th = (id) => { const x = C.findThread(id); assert(x, "missing thread " + id); return x; };

// --- tap drills (Haas Shop Notes / Machinery's Handbook / Jarvis form chart)
t("1/4-20 cut 75% -> #7 (.201)", () => { const r = C.tapDrill(th("UNC-1/4-20"), "cut", 75, "in"); assert.equal(r.rec.label, "#7"); near(r.exactIn, 0.2013, 0.0002, "exact"); });
t("1/4-20 form 65% -> #1 (.228)", () => { const r = C.tapDrill(th("UNC-1/4-20"), "form", 65, "in"); assert.equal(r.rec.label, "#1"); });
t("#10-32 cut 75% -> #21 (.159)", () => { assert.equal(C.tapDrill(th("UNF-#10-32"), "cut", 75, "in").rec.label, "#21"); });
t("1/2-13 cut 75% -> 27/64", () => { assert.equal(C.tapDrill(th("UNC-1/2-13"), "cut", 75, "in").rec.label, "27/64"); });
t("M6x1 cut 75% exact 5.03 mm", () => { near(C.tapDrill(th("M6x1"), "cut", 75, "mm").exactMm, 5.026, 0.002, "M6"); });
t("M8x1.25 cut 75% exact 6.78 mm", () => { near(C.tapDrill(th("M8x1.25"), "cut", 75, "mm").exactMm, 6.782, 0.002, "M8"); });
t("% status: cut 90% red, 45% amber, 75% green", () => {
  assert.equal(C.pctStatus("cut", 90).level, "red"); assert.equal(C.pctStatus("cut", 45).level, "amber"); assert.equal(C.pctStatus("cut", 75).level, "green");
  assert.equal(C.pctStatus("form", 80).level, "red");
});

// --- thread list shape
t("flat thread list: unique ids, required fields", () => {
  const ids = new Set();
  for (const x of D.THREAD_LIST) {
    assert(!ids.has(x.id), "dup " + x.id); ids.add(x.id);
    for (const f of ["id", "label", "series", "system", "major", "type"]) assert(x[f] !== undefined, x.id + " missing " + f);
    assert(x.system === "inch" ? x.tpi > 0 : x.pitch > 0, x.id + " pitch");
    assert(["parallel", "taper"].includes(x.type), x.id + " type");
    if (x.pipe) assert(x.tapDrillTable && x.tapDrillTable.length, x.id + " table");
    if (x.type === "taper") {
      assert(x.pipe && x.taper === 1 / 16 && x.L1 > 0 && x.L2 > x.L1, x.id + " taper fields");
      near(x.taperHalfAngleDeg, 1.79, 0.001, "half angle");
    }
  }
  assert(D.THREAD_LIST.filter((x) => x.common).length >= 15);
});
t("series ranges", () => {
  const s = (name) => D.THREAD_LIST.filter((x) => x.series === name);
  assert.equal(s("UNC")[0].label, "#1-64 UNC"); assert.equal(s("UNC").slice(-1)[0].label, "2-4-1/2 UNC");
  assert.equal(s("UNF")[0].label, "#0-80 UNF"); assert.equal(s("UNF").slice(-1)[0].label, "1-1/2-12 UNF");
  assert.equal(s("ISO metric coarse")[0].major, 1); assert.equal(s("ISO metric coarse").slice(-1)[0].major, 64);
  assert.equal(s("NPT (taper pipe)").length, 10); assert.equal(s("BSPT / Rc (taper pipe)").length, 9);
  assert(s("BSPP / G (parallel pipe)").every((x) => x.type === "parallel"), "BSPP must be parallel");
});

// --- pipe threads (ASME B1.20.1, ISO 7-1, ISO 228-1)
t("NPT 1/4-18: 7/16 drill, L1 .2278, L2 .4018, amber + info line", () => {
  const r = C.tapDrill(th("NPT-1/4"), "cut", 75, "in");
  assert(r.pipe && r.taper); assert.equal(r.rec.label, "7/16"); assert.equal(r.status.level, "amber");
  near(r.L1In, 0.2278, 1e-9, "L1"); near(r.L2In, 0.4018, 1e-9, "L2");
  assert.equal(r.info[0], "Tapered pipe thread: table drill. Optional taper pipe reamer before tapping reduces tap torque. Check depth with an L1 plug gauge.");
});
t("NPT L1/L2 table (ASME B1.20.1)", () => {
  const exp = { "1/16": [0.160, 0.2611], "1/8": [0.1615, 0.2639], "1/2": [0.320, 0.5337], "3/4": [0.339, 0.5457], "1": [0.400, 0.6828], "1-1/2": [0.420, 0.7235], "2": [0.436, 0.7565] };
  for (const k in exp) { const x = th("NPT-" + k); assert.deepEqual([x.L1, x.L2], exp[k], k); }
});
t("BSPT Rc 1/2-14: 18.25 mm drill, gauge length 8.2, useful 13.2 (ISO 7-1)", () => {
  const x = th("Rc-1/2"); const r = C.tapDrill(x, "cut", 75, "mm");
  assert.equal(r.rec.label, "18.25 mm"); assert.equal(x.L1Mm, 8.2); assert.equal(x.L2Mm, 13.2); assert.equal(x.majorMm, 20.955);
  assert.equal(th("Rc-2").L1Mm, 15.9); assert.equal(th("Rc-1/8").tpi, 28);
});
t("BSPP G 1/2 parallel: amber, no taper info line", () => {
  const r = C.tapDrill(th("G-1/2"), "cut", 75, "mm");
  assert(r.pipe && !r.taper); assert.equal(r.status.level, "amber"); assert.equal(r.info.length, 0);
});

// --- drill sizes (ASME B94.11M spot checks)
t("drill size spot checks", () => {
  const f = (l) => D.INCH_DRILLS.find((x) => x.label === l).d;
  assert.equal(f("#7"), 0.201); assert.equal(f("#21"), 0.159); assert.equal(f("#1"), 0.228); assert.equal(f("Q"), 0.332); assert.equal(f("Z"), 0.413);
});

// --- rigid tap
t("1/4-20 at 800 rpm -> F40. ; M6x1 at 800 -> F800.", () => {
  const a = C.fanucBlock(800, th("UNC-1/4-20"), "in"); assert.equal(a.lines[2], "G84 X___ Y___ Z___ R___ F40."); assert(a.exact);
  const b = C.fanucBlock(800, th("M6x1"), "mm"); assert.equal(b.lines[2], "G84 X___ Y___ Z___ R___ F800.");
});
t("NPT 1/2-14 rigid feed = rpm / 14", () => { near(C.rigidFeed(280, th("NPT-1/2"), "in"), 20, 1e-9, "feed"); });

// --- cost (Stacey's DEMO)
t("snapped tap cost $86.33", () => {
  const c = D.DEMO_COST; near(C.snappedTapCost({ taps: 1, tapCost: c.cut.tapCost, partValue: c.partValue, lostMin: c.lostMin, shopRate: c.shopRate }), 86.33, 0.005, "snap");
});
t("per 1,000 holes: cut $12.00 + $43.17 = $55.17 ; form $7.00 + $12.04 = $19.04", () => {
  const c = D.DEMO_COST, sh = { partValue: c.partValue, lostMin: c.lostMin, shopRate: c.shopRate };
  const cut = C.per1000(c.cut, sh), form = C.per1000(c.form, sh);
  near(cut.wear, 12.00, 0.005, "cut wear"); near(cut.breaks, 43.17, 0.005, "cut breaks"); near(cut.total, 55.17, 0.005, "cut total");
  near(form.wear, 7.00, 0.005, "form wear"); near(form.breaks, 12.04, 0.005, "form breaks"); near(form.total, 19.04, 0.005, "form total");
});

// --- speeds sanity: conservative + blocks
t("drill + tap starts return numbers; HSS blocked over 35 HRC", () => {
  const d = C.drillStart("low_c", "hss", 126, 0.201, 0.5); assert(d.ok && d.rpm > 0 && d.ipr > 0);
  assert(C.drillStart("alloy_ph", "hss", 400, 0.25, 0.5).blocked);
  const ts = C.tapStart("low_c", "cut", "hss", 126, th("UNC-1/4-20")); assert(ts.ok && ts.rpm > 0);
  assert(C.tapStart("ci_gray", "form", "hss", 200, th("UNC-1/4-20")).blocked);
});
t("drill block: G81 shallow, G73 3-5xD HSS with Q, G83 deep, indexable never pecks", () => {
  const a = C.drillBlock(C.drillStart("low_c", "hss", 126, 0.201, 0.5), "in"); assert.equal(a.cycle, "G81"); assert(/^G81 X___ Y___ Z___ R___ F\d+\.\d$/.test(a.lines[2]), a.lines[2]);
  const b = C.drillBlock(C.drillStart("low_c", "hss", 126, 0.201, 0.8), "in"); assert.equal(b.cycle, "G73"); assert(/ Q0\.2010 F/.test(b.lines[2]), b.lines[2]);
  const c = C.drillBlock(C.drillStart("low_c", "hss", 126, 0.201, 1.4), "in"); assert.equal(c.cycle, "G83"); assert(/ Q0\.1005 F/.test(c.lines[2]), c.lines[2]);
  const d = C.drillBlock(C.drillStart("low_c", "indexable", 126, 0.75, 3), "in"); assert.equal(d.cycle, "G81"); assert(!/Q/.test(d.lines[2]));
  const e = C.drillBlock(C.drillStart("low_c", "hss", 126, 0.201, 0.8), "mm"); assert(/ Q5\.105 F\d+$/.test(e.lines[2]), e.lines[2]); assert.equal(e.lines[0], "G21 (MM)");
});
console.log("\n" + n + " tests passed");

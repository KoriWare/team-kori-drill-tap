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
  const a = C.fanucBlock(800, th("UNC-1/4-20"), "in"); assert.equal(a.lines[2], "G84 X? Y? Z? R? F40."); assert(a.exact);
  const b = C.fanucBlock(800, th("M6x1"), "mm"); assert.equal(b.lines[2], "G84 X? Y? Z? R? F800.");
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
  const a = C.drillBlock(C.drillStart("low_c", "hss", 126, 0.201, 0.5), "in"); assert.equal(a.cycle, "G81"); assert(/^G81 X\? Y\? Z\? R\? F\d+\.\d$/.test(a.lines[2]), a.lines[2]);
  const b = C.drillBlock(C.drillStart("low_c", "hss", 126, 0.201, 0.8), "in"); assert.equal(b.cycle, "G73"); assert(/ Q0\.2010 F/.test(b.lines[2]), b.lines[2]);
  const c = C.drillBlock(C.drillStart("low_c", "hss", 126, 0.201, 1.4), "in"); assert.equal(c.cycle, "G83"); assert(/ Q0\.1005 F/.test(c.lines[2]), c.lines[2]);
  const d = C.drillBlock(C.drillStart("low_c", "indexable", 126, 0.75, 3), "in"); assert.equal(d.cycle, "G81"); assert(!/Q/.test(d.lines[2]));
  const e = C.drillBlock(C.drillStart("low_c", "hss", 126, 0.201, 0.8), "mm"); assert(/ Q5\.105 F\d+$/.test(e.lines[2]), e.lines[2]); assert.equal(e.lines[0], "G21 (MM)");
});

// --- Round 1 features
t("tap change time: cut $58.00 (wear $14.83) ; form $20.10 (wear $8.06) at 3 min", () => {
  const c = D.DEMO_COST, sh = { partValue: c.partValue, lostMin: c.lostMin, shopRate: c.shopRate, changeMin: c.changeMin };
  assert.equal(c.changeMin, 3);
  const cut = C.per1000(c.cut, sh), form = C.per1000(c.form, sh);
  near(cut.wear, 14.83, 0.005, "cut wear"); near(cut.breaks, 43.17, 0.005, "cut breaks"); near(cut.total, 58.00, 0.005, "cut total");
  near(form.wear, 8.06, 0.005, "form wear"); near(form.breaks, 12.04, 0.005, "form breaks"); near(form.total, 20.10, 0.005, "form total");
});
t("thread class minor limits match ASME B1.1 / ISO 965-1", () => {
  const L = (id, c) => C.minorLimits(th(id), c);
  const chk = (id, c, lo, hi) => { const l = L(id, c); near(l.minIn, lo, 0.00051, id + " " + c + " min"); near(l.maxIn, hi, 0.00051, id + " " + c + " max"); };
  chk("UNC-1/4-20", "2B", 0.196, 0.207); chk("UNC-1/4-20", "3B", 0.1959, 0.2067);
  chk("UNF-#10-32", "2B", 0.156, 0.164); chk("UNC-#4-40", "2B", 0.0849, 0.0939);
  chk("UNC-1/2-13", "2B", 0.417, 0.434); chk("UNC-1/2-13", "3B", 0.4167, 0.4284);
  chk("UNF-1-12", "2B", 0.910, 0.928); chk("UNF-1-12", "3B", 0.9098, 0.9198);
  chk("UNC-1-8", "3B", 0.8647, 0.8797); chk("UNF-#0-80", "2B", 0.0465, 0.0514);
  chk("UNF-1/4-28", "2B", 0.211, 0.220); chk("UNF-3/8-24", "2B", 0.330, 0.340);
  const m6 = L("M6x1"); assert.equal(m6.cls, "6H"); near(m6.minIn * 25.4, 4.917, 0.001, "M6 min"); near(m6.maxIn * 25.4, 5.153, 0.001, "M6 max");
  const m8 = L("M8x1.25"); near(m8.minIn * 25.4, 6.647, 0.001, "M8 min"); near(m8.maxIn * 25.4, 6.912, 0.001, "M8 max");
  assert.equal(L("M1x0.25").cls, "5H"); assert.equal(L("NPT-1/2"), null);
  const l = L("UNC-1/4-20", "2B");
  assert.equal(C.classCheck(l, 0.201, "cut").level, "green"); assert.equal(C.classCheck(l, 0.1935, "cut").level, "amber");
  assert.equal(C.classCheck(l, 0.209, "cut").level, "red"); assert.equal(C.classCheck(l, 0.2189, "form").level, "amber");
});
t("clearance drills: #10 #9/#7, 1/4 F/H, M8 8.4/9 mm, none past 1\" or for pipe", () => {
  const a = C.clearance(th("UNC-#10-24")); assert.equal(a.close.label, "#9"); assert.equal(a.free.label, "#7"); near(a.free.dIn, 0.201, 1e-6, "#7");
  const b = C.clearance(th("UNF-1/4-28")); assert.equal(b.close.label, "F"); assert.equal(b.free.label, "H");
  const m = C.clearance(th("M8x1.25")); near(m.close.dIn * 25.4, 8.4, 1e-9, "M8 close"); near(m.free.dIn * 25.4, 9, 1e-9, "M8 free");
  assert.equal(C.clearance(th("UNC-2-4.5")), null); assert.equal(C.clearance(th("NPT-1/2")), null);
});
t("drill point + hole depth chain + Z words in both blocks", () => {
  near(C.pointLen(0.201, 118), 0.0604, 0.0001, "118 point"); near(C.pointLen(0.201, 135), 0.0416, 0.0001, "135 point");
  const h = C.holeChain({ mode: "blind", depthIn: 0.5, pitchIn: 0.05, drillIn: 0.201, pointDeg: 118, chamfer: "plug" });
  near(h.tapZ, 0.7, 1e-9, "tapZ"); near(h.drillZ, 0.8104, 0.0001, "drillZ");
  const th2 = C.holeChain({ mode: "through", depthIn: 0.5, pitchIn: 0.05, drillIn: 0.201, pointDeg: 118, chamfer: "bottoming" });
  near(th2.tapZ, 0.65, 1e-9, "thru tapZ"); near(th2.drillZ, 0.5804, 0.0001, "thru drillZ");
  assert.equal(C.zWord(0.7, "in"), "Z-0.7000"); assert.equal(C.zWord(0.81039, "in"), "Z-0.8104"); assert.equal(C.zWord(0.5, "mm"), "Z-12.700");
  const fb = C.fanucBlock(800, th("UNC-1/4-20"), "in", 0.7); assert(fb.lines.some((l) => /^G84 .*Z-0\.7000 /.test(l)), fb.lines.join("|"));
  const db = C.drillBlock(C.drillStart("low_c", "hss", 126, 0.201, 0.81), "in", 0.8104); assert(/ Z-0\.8104 /.test(db.lines[2]), db.lines[2]);
  assert(/Z\?/.test(C.drillBlock(C.drillStart("low_c", "hss", 126, 0.201, 0.5), "in").lines[2]));
});
t("NPS straight pipe 1/8-2: Allied drill primary, NPSC alternate", () => {
  const n = D.THREAD_LIST.filter((x) => x.series === "NPS (straight pipe)"); assert.equal(n.length, 9);
  assert(D.THREAD_SERIES.indexOf("NPS (straight pipe)") >= 0);
  const r = C.tapDrill(th("NPS-1/2"), "cut", 0, "in"); assert.equal(r.rec.label, "47/64"); assert.equal(r.table[1].label, "23/32");
  assert.equal(r.taper, false); assert(/NPS/.test(r.status.text));
  assert.equal(C.tapDrill(th("NPS-1/8"), "cut", 0, "in").rec.label, "S");
});

// ------------------------------------------------------------ troubleshoot checks (Jenny)
// Builds the same ctx app.js puts in DT_STATE.tc (inches, SFM), from the app's defaults unless overridden.
function tcCtx(o) {
  o = Object.assign({ thread: "UNC-1/4-20", tapType: "cut", pct: null, cls: "2B", hole: "blind", depthIn: 0.375, chamf: "plug", pt: 118,
    mat: "low_c", tapMat: "hss", drillMat: "hss", hb: null, tapStyle: "spiralFlute", holder: "rigid", units: "in", tapSfm: 0 }, o);
  const t = th(o.thread), hb = o.hb || C.material(o.mat).defaultHB;
  const pct = o.pct || (o.tapType === "form" ? 65 : 75);
  const r = C.tapDrill(t, o.tapType, pct, o.units), rec = r.rec;
  const lim = C.minorLimits(t, o.cls), chk = lim ? C.classCheck(lim, rec.dIn, o.tapType) : null;
  const h = C.holeChain({ mode: o.hole, depthIn: o.depthIn, pitchIn: C.pitchIn(t), drillIn: rec.dIn, pointDeg: o.pt, chamfer: o.chamf });
  const ts = C.tapStart(o.mat, o.tapType, o.tapMat, hb, t, o.tapSfm), pub = o.tapSfm > 0 ? C.tapStart(o.mat, o.tapType, o.tapMat, hb, t, 0) : ts;
  const fb = ts.ok ? C.fanucBlock(ts.rpm, t, o.units, h.tapZ) : null;
  const ds = C.drillStart(o.mat, o.drillMat, hb, rec.dIn, o.depthIn > 0 ? h.drillZ : 0);
  const db = ds.ok ? C.drillBlock(ds, o.units, h.drillZ) : null;
  return { units: o.units, thread: t, tapType: o.tapType, pipe: false, pct: rec.pct, pctLimit: C.PCT_LIMIT[o.tapType], cls: lim && lim.cls, drillIn: rec.dIn,
    hole: o.hole, depthIn: o.depthIn, majorIn: C.majorIn(t), pitchIn: C.pitchIn(t), tapZ: h.tapZ, drillFull: h.drillFull, chamf: o.chamf, pt: o.pt,
    tapStyle: o.tapStyle, holder: o.holder, matIso: C.material(o.mat).iso,
    tapOwn: !!ts.override, tapSfm: ts.ok ? ts.sfm : null, tapSfmHi: pub.ok ? pub.sfmHi : null, tsBlocked: !!(ts.blocked || pub.blocked), tsReason: ts.reason || pub.reason,
    classCheckLevel: chk && chk.level, classCheck: chk && chk.text, fanucExact: fb ? fb.exact : null, fanucLines: fb ? fb.lines : null,
    dsBlocked: !!ds.blocked, dsReason: ds.reason, dsDerated: !!ds.derated, dsNotes: ds.notes,
    drillSfm: ds.ok ? ds.sfm : null, drillSfmHi: ds.ok ? ds.sfmHi : null, drillIpr: ds.ok ? ds.ipr : null, drillIprHi: ds.ok ? ds.iprHi : null, drillIprLo: ds.ok ? ds.ipr : null,
    drillOwnIpr: false, ld: ds.ok ? ds.ld : null, peckText: ds.ok ? ds.peck.text : null, peckCycle: db ? db.cycle : null };
}
const chk = (list, id) => list.find((c) => c.id === id);
const IDS = new Set(require("fs").readFileSync(require("path").join(__dirname, "..", "troubledata.js"), "utf8").match(/"id": "[a-z]+-\d+"/g).map((s) => s.slice(7, -1)));

t("troubleChecks: 1/4-20 cut default blind → no red, every id is a real card, shape matches the panel", () => {
  const out = C.troubleChecks(tcCtx({}));
  assert(out.length > 10, "expected many checks");
  assert(!out.some((c) => c.sev === "red"), "no red expected: " + out.filter((c) => c.sev === "red").map((c) => c.id));
  out.forEach((c) => {
    assert(IDS.has(c.id), "unknown card id " + c.id);
    assert(c.level === (c.sev === "green" ? "ok" : "live") && c.you === c.text && c.symptom === c.id.split("-")[0] && D.TROUBLE_SRC[c.sourceKey], "shape " + c.id);
  });
  assert.strictEqual(chk(out, "broke-1").sev, "green");
  assert.strictEqual(chk(out, "broke-2").sev, "green", "20 TPI: one pitch = .050, meets Haas");
  assert.strictEqual(chk(out, "fanuc-2").sev, "green");
});
t("troubleChecks: accepts DT_STATE (reads .tc) and junk input", () => {
  assert.deepStrictEqual(C.troubleChecks({ S: {}, tc: tcCtx({}) }), C.troubleChecks(tcCtx({})));
  assert.deepStrictEqual(C.troubleChecks(null), []); assert.deepStrictEqual(C.troubleChecks({}), []);
});
t("troubleChecks: 80% cut → broke-1 amber with the user's % and a next drill that stays in 2B", () => {
  const c = tcCtx({ pct: 80 }); assert(c.pct > 75 && c.pct <= 85, "rec pct " + c.pct);
  const k = chk(C.troubleChecks(c), "broke-1");
  assert.strictEqual(k.sev, "amber"); assert.strictEqual(k.level, "live");
  assert(k.text.indexOf(c.pct.toFixed(1) + "%") >= 0, k.text);
  assert(/Next drill up: #7 \(\.2010"\)/.test(k.text), k.text);
});
t("nextDrillUp: 1/4-20 from #8 → #7 (in 2B); from #3 → null (over 2B max)", () => {
  const t1 = th("UNC-1/4-20");
  assert.strictEqual(C.nextDrillUp(t1, "cut", 0.199, "2B", "in").label, "#7");
  assert.strictEqual(C.nextDrillUp(t1, "cut", 0.213, "2B", "in"), null);
});
t("troubleChecks: form tap at 80% → red (broke-1 and tight-3)", () => {
  const out = C.troubleChecks(Object.assign(tcCtx({ tapType: "form" }), { pct: 80 }));
  assert.strictEqual(chk(out, "broke-1").sev, "red"); assert.strictEqual(chk(out, "tight-3").sev, "red");
  assert(chk(out, "broke-1").text.indexOf("80.0%") >= 0);
});
t("troubleChecks: blind + spiral point → red packing cards; through + spiral point → green", () => {
  const out = C.troubleChecks(tcCtx({ tapStyle: "spiralPoint" }));
  ["broke-4", "packing-1", "oversize-4", "finish-3"].forEach((id) => assert.strictEqual(chk(out, id).sev, "red", id));
  const thru = C.troubleChecks(tcCtx({ tapStyle: "spiralPoint", hole: "through" }));
  assert.strictEqual(chk(thru, "broke-4").sev, "green");
});
t("troubleChecks: blind + straight flute deeper than 1.5×D → amber; straight in steel → packing-2 amber", () => {
  const out = C.troubleChecks(tcCtx({ tapStyle: "straight", depthIn: 0.5 }));
  assert.strictEqual(chk(out, "broke-4").sev, "amber"); assert.strictEqual(chk(out, "broke-3").sev, "amber");
  assert.strictEqual(chk(out, "packing-2").sev, "amber");
  assert.strictEqual(chk(C.troubleChecks(tcCtx({ tapStyle: "straight", mat: "ci_gray" })), "packing-2").sev, "green");
});
t("blind clearance = max(1 pitch, .050\"): 1/4-20 keeps 1P (drill Z .6854), 1/4-28 and M6x1 get .050\"", () => {
  const z = (id, d) => { const t1 = th(id); return C.holeChain({ mode: "blind", depthIn: d, pitchIn: C.pitchIn(t1), drillIn: C.tapDrill(t1, "cut", 75, "in").rec.dIn, pointDeg: 118, chamfer: "plug" }); };
  const a = z("UNC-1/4-20", 0.375); near(a.clearIn, 0.05, 1e-12, "1/4-20 1P"); assert.equal(C.zWord(a.drillZ, "in"), "Z-0.6854"); assert(a.clearByPitch);
  const b = z("UNF-1/4-28", 0.375); near(b.clearIn, 0.05, 1e-12, "1/4-28 min"); near(b.drillFull - b.tapZ, 0.05, 1e-12); assert(!b.clearByPitch);
  const m = z("M6x1", 0.375); near(m.clearIn, 0.05, 1e-12, "M6x1 min (1 mm < 1.27 mm)"); near(m.clearIn * 25.4, 1.27, 1e-9);
  const big = z("UNC-1/2-13", 0.75); near(big.clearIn, 1 / 13, 1e-12, "coarse pitch keeps 1P");
  const thru = C.holeChain({ mode: "through", depthIn: 0.5, pitchIn: 1 / 28, drillIn: 0.213, pointDeg: 118, chamfer: "plug" });
  near(thru.tapZ, 0.5 + 5 / 28, 1e-12, "through holes unchanged");
});
t("troubleChecks: broke-2 green for app values (1/4-28 now leaves .050\"); amber only for a hand-built ctx under .050\"", () => {
  const c = tcCtx({ thread: "UNF-1/4-28" });
  const k = chk(C.troubleChecks(c), "broke-2"); assert.strictEqual(k.sev, "green"); assert(k.text.indexOf('.0500"') >= 0, k.text);
  const k2 = chk(C.troubleChecks(Object.assign({}, c, { drillFull: c.tapZ + 1 / 28 })), "broke-2");
  assert.strictEqual(k2.sev, "amber"); assert(k2.text.indexOf('.0357"') >= 0, k2.text);
});
t("troubleChecks: F not exact → amber fanuc-1 / oversize-1; exact → green", () => {
  const out = C.troubleChecks(Object.assign(tcCtx({}), { fanucExact: false }));
  assert.strictEqual(chk(out, "fanuc-1").sev, "amber"); assert.strictEqual(chk(out, "oversize-1").sev, "amber");
  assert(/G95/.test(chk(out, "fanuc-1").text));
  assert.strictEqual(chk(C.troubleChecks(Object.assign(tcCtx({}), { fanucExact: true })), "fanuc-1").sev, "green");
});
t("troubleChecks: ld ≥ 3 → green peck note naming the cycle; ld > 3 → coolant amber", () => {
  const c = tcCtx({ depthIn: 0.75 }); assert(c.ld >= 3, "ld " + c.ld);
  const out = C.troubleChecks(c), k = chk(out, "packing-5");
  assert.strictEqual(k.sev, "green"); assert(k.text.indexOf(c.peckCycle) >= 0 && /G73|G83/.test(k.text), k.text);
  assert.strictEqual(chk(out, "packing-6").sev, "amber");
  const sh = tcCtx({ depthIn: 0.15 }); assert(sh.ld < 3, "ld " + sh.ld); assert(!chk(C.troubleChecks(sh), "packing-5"), "under 3×D: no peck card");
});
t("troubleChecks: tap blocked (HSS over 327 HB) → broke-8 red, even with a typed speed", () => {
  const c = tcCtx({ hb: 400, mat: "alloy_ph" }); assert(c.tsBlocked);
  assert.strictEqual(chk(C.troubleChecks(c), "broke-8").sev, "red");
  const c2 = tcCtx({ hb: 400, mat: "alloy_ph", tapSfm: 30 }); assert(c2.tsBlocked, "override must not hide the block");
  assert.strictEqual(chk(C.troubleChecks(c2), "broke-8").sev, "red");
});
t("troubleChecks: typed tap SFM over the published top → amber with both numbers", () => {
  const out = C.troubleChecks(tcCtx({ tapSfm: 80 })), k = chk(out, "broke-5");
  assert.strictEqual(k.sev, "amber"); assert(/80 SFM/.test(k.text) && /50 SFM/.test(k.text), k.text);
});
t("troubleChecks: tension/compression holder → amber; class over max → oversize-8 red; bottoming chamfer → amber", () => {
  assert.strictEqual(chk(C.troubleChecks(tcCtx({ holder: "tensionComp" })), "fanuc-7").sev, "amber");
  const o = C.troubleChecks(Object.assign(tcCtx({}), { classCheckLevel: "red", classCheck: "Over max for 2B", drillIn: 0.213 }));
  assert.strictEqual(chk(o, "oversize-8").sev, "red");
  assert.strictEqual(chk(C.troubleChecks(tcCtx({ chamf: "bottoming" })), "finish-4").sev, "amber");
});
console.log("\n" + n + " tests passed");

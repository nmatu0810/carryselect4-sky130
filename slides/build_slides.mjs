// Build slides/CarrySelect4_BaoVe.pptx: Vietnamese 16:9 defense deck (12 slides, same structure as the report).
// Every measured number is read from results/metrics.json through m(key); a missing key aborts
// the build. Figures come from docs/figures/*.png. Theme colors are written into the package
// after pptxgenjs saves it (pptxgenjs itself always writes the stock Office palette).
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import pptxgen from "pptxgenjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const FIG = path.join(ROOT, "docs", "figures");
const OUT = path.join(HERE, "CarrySelect4_BaoVe.pptx");

// ---------- metrics ----------
const METRICS = JSON.parse(fs.readFileSync(path.join(ROOT, "results", "metrics.json"), "utf8"));
// wording that depends on the 5 ns result comes from scripts/pnr5_text.py (PASS/FAIL aware)
Object.assign(METRICS, JSON.parse(execFileSync("python3", [path.join(ROOT, "scripts", "pnr5_text.py")], { encoding: "utf8" })));
function fmt(v) {
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v !== "number") return String(v);
  if (Number.isInteger(v)) return String(v);
  if (v === 0 || !Number.isFinite(v)) return String(v);
  // 3 significant figures, at most 3 decimals; same rule as scripts/metrics_to_tex.py
  const d = Math.min(3 - Math.floor(Math.log10(Math.abs(v))) - 1, 3);
  if (d <= 0) return String(Math.round(v / 10 ** -d) * 10 ** -d);
  return v.toFixed(d);
}
function m(key) {
  if (!(key in METRICS)) throw new Error(`missing metric: ${key}`);
  return fmt(METRICS[key]);
}
// chart values use the same rounding as the text, so labels match the report and paper
const num = (key) => Number(m(key));

// ---------- theme ----------
const THEME = {
  name: "CarrySelect4 Silicon",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1B1F23", lt1: "FFFFFF", dk2: "0B3C49", lt2: "EEF4F5",
    accent1: "0E7C86", accent2: "C8742B", accent3: "5B6B73", accent4: "2E9E6B",
    accent5: "8FB8BE", accent6: "D9A441", hlink: "0E7C86", folHlink: "5B6B73",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.author = "Nhóm 7 – Ngụy Quốc Trung, Nguyễn Minh Anh Tú";
pres.title = "CarrySelect-4 – bảo vệ đồ án CE2032";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

// ---------- layouts ----------
pres.defineSlideMaster({
  title: "DARK",
  background: { color: HEX.dk2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.35, w: 8.8, h: 1.6, fontSize: 36,
      bold: true, color: C.background1, valign: "bottom", align: "left", fontFace: THEME.headFontFace }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 3.1, w: 8.8, h: 1.8, fontSize: 16,
      color: "CADCDF", valign: "top" }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: HEX.lt1 },
  margin: [0.5, 0.5, 0.45, 0.5],
  slideNumber: { x: 9.2, y: 5.22, w: 0.5, h: 0.3, fontSize: 10, color: HEX.accent3, align: "right" },
  objects: [
    { text: { text: "CarrySelect-4 · Nhóm 7 · CE2032", options: { x: 0.5, y: 5.22, w: 5, h: 0.3, fontSize: 10,
      color: HEX.accent3 } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.25, w: 9, h: 0.7, fontSize: 28,
      bold: true, color: C.text2, valign: "middle", fontFace: THEME.headFontFace }, text: "" } },
  ],
});

// ---------- helpers ----------
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
/** place an image inside a box, keeping its aspect ratio, centred */
function image(slide, name, x, y, w, h, alt) {
  const file = path.join(FIG, name);
  if (!fs.existsSync(file)) throw new Error(`missing figure ${file}`);
  const s = pngSize(file);
  let iw = w, ih = (w * s.h) / s.w;
  if (ih > h) { ih = h; iw = (h * s.w) / s.h; }
  slide.addImage({ path: file, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih, altText: alt,
    objectName: `fig-${name}` });
}
function bullets(slide, items, x, y, w, h, size = 16) {
  slide.addText(items.map((t, i) => ({
    text: t, options: { bullet: { indent: 16 }, breakLine: i < items.length - 1, paraSpaceAfter: 8 },
  })), { x, y, w, h, fontSize: size, color: C.text1, valign: "top", isTextBox: true, margin: 0 });
}
/** big number callout card */
function stat(slide, x, y, w, h, value, unit, label, accent = C.accent1) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: C.background2 }, rectRadius: 0.1,
    line: { type: "none" }, objectName: `card-${label}` });
  slide.addText([
    { text: value, options: { fontSize: 30, bold: true, color: accent, fontFace: THEME.headFontFace } },
    { text: unit ? ` ${unit}` : "", options: { fontSize: 14, color: accent } },
  ], { x: x + 0.15, y: y + 0.1, w: w - 0.3, h: h * 0.55, valign: "bottom", isTextBox: true, margin: 0 });
  slide.addText(label, { x: x + 0.15, y: y + h * 0.62, w: w - 0.3, h: h * 0.33, fontSize: 12, color: C.text1,
    valign: "top", isTextBox: true, margin: 0 });
}
function table(slide, rows, x, y, w, colW, size = 13) {
  const head = { bold: true, color: C.background1, fill: { color: C.accent1 } };
  slide.addTable(rows.map((r, i) => r.map((c) => ({ text: c, options: i === 0 ? head : {} }))), {
    x, y, w, colW, fontSize: size, color: HEX.dk1, border: { type: "solid", pt: 0.75, color: "C9D6D9" },
    fill: { color: HEX.lt1 }, valign: "middle", margin: 0.06, objectName: "table",
  });
}
const sections = new Set();
function slideIn(section, master = "CONTENT") {
  if (!sections.has(section)) { pres.addSection({ title: section }); sections.add(section); }
  return pres.addSlide({ masterName: master, sectionTitle: section });
}
const chartText = { catAxisLabelColor: HEX.accent3, valAxisLabelColor: HEX.accent3, catAxisLabelFontFace: "+mn-lt",
  valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt", catAxisLabelFontSize: 11,
  valAxisLabelFontSize: 10, dataLabelFontSize: 11, dataLabelColor: HEX.dk1, titleFontSize: 13, titleColor: HEX.dk1,
  valGridLine: { color: "E4E3DF", size: 0.75 }, catGridLine: { style: "none" } };

// ================= slides =================
// Structure follows the report: Mở đầu, Chương 1-4, Kết luận.
const META = JSON.parse(fs.readFileSync(path.join(ROOT, "report", "vi", "00_meta.json"), "utf8"));

// x_sub -> subscript, x^(sup) -> superscript (same notation as the report markdown)
const MATH = /_([\p{L}\p{N}]+(?:[-,][\p{L}\p{N}+]+)*)|\^\(([^)]*)\)/gu;
function formulaRuns(text, base, breakAfter) {
  const out = [];
  let last = 0;
  for (const mm of text.matchAll(MATH)) {
    if (mm.index > last) out.push({ text: text.slice(last, mm.index), options: { ...base } });
    out.push(mm[1] !== undefined ? { text: mm[1], options: { ...base, subscript: true } }
      : { text: mm[2], options: { ...base, superscript: true } });
    last = mm.index + mm[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), options: { ...base } });
  if (breakAfter) out[out.length - 1].options.breakLine = true;
  return out;
}

/** card with a heading and one line of text (formula cards use Cambria italic) */
function card(slide, x, y, w, h, head, body, opts = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: C.background2 }, rectRadius: 0.1,
    line: { type: "none" }, objectName: `card-${head}` });
  slide.addText([
    { text: head, options: { bold: true, fontSize: 15, color: opts.accent ?? C.accent1, breakLine: true } },
    ...(opts.formula ? formulaRuns(body, { fontSize: opts.size ?? 14, color: C.text1, italic: true, fontFace: "Cambria" }, !!opts.note)
      : [{ text: body, options: { fontSize: opts.size ?? 14, color: C.text1,
        fontFace: opts.mono ? "Courier New" : undefined, breakLine: !!opts.note } }]),
    ...(opts.note ? [{ text: opts.note, options: { fontSize: 12, color: C.accent3 } }] : []),
  ], { x: x + 0.18, y: y + 0.1, w: w - 0.36, h: h - 0.2, valign: "middle", isTextBox: true, margin: 0, paraSpaceAfter: 4 });
}
function caption(slide, text, x, y, w) {
  slide.addText(text, { x, y, w, h: 0.35, fontSize: 12, color: C.accent3, align: "center", isTextBox: true, margin: 0 });
}

// 1. cover
let s = slideIn("Mở đầu", "DARK");
s.addText("CarrySelect-4: Bộ cộng carry-select 4 bit từ RTL đến GDSII trên SKY130", { placeholder: "title" });
s.addText([
  { text: "Đồ án cuối kỳ CE2032 – Thiết kế VLSI · Nhóm 7", options: { breakLine: true } },
  { text: "Ngụy Quốc Trung (23CE.B026) · Nguyễn Minh Anh Tú (23CE085)", options: { breakLine: true } },
  { text: `Người hướng dẫn: TS. ${META["GVHD"]}`, options: { breakLine: true } },
  { text: "Khoa Kỹ thuật Máy tính và Điện tử – VKU · Đà Nẵng, 2026" },
], { placeholder: "body" });
s.addNotes("Giới thiệu nhóm và đề tài: lõi cộng carry-select 4 bit đi hết luồng RTL→GDSII trên SKY130, kèm một Full Adder vẽ tay và phân tích Logical Effort.");

// 2. Mở đầu: context & goals
s = slideIn("Mở đầu");
s.addText("Bối cảnh và mục tiêu", { placeholder: "title" });
bullets(s, [
  "Bộ cộng có mặt trong ALU và khối tính địa chỉ",
  "RCA: nhớ lan qua từng bit, trễ tăng theo O(n)",
  "CSLA: tính trước bit cao cho nhớ 0 và 1, MUX chọn khi có nhớ thật",
  "Mục tiêu: đi hết luồng mã nguồn mở trên SKY130, kèm một leaf cell vẽ tay",
], 0.5, 1.15, 4.6, 3.6);
stat(s, 5.4, 1.15, 2.0, 1.45, "100", "MHz", "đóng timing sau route, mọi corner");
stat(s, 7.6, 1.15, 1.9, 1.45, "≤ 500", "", "NAND2 tương đương");
stat(s, 5.4, 2.85, 2.0, 1.45, "512/512", "", "tổ hợp khớp mô hình tham chiếu", C.accent2);
stat(s, 7.6, 2.85, 1.9, 1.45, "0", "", "lỗi DRC / LVS", C.accent2);
s.addNotes("Bốn con số bên phải là bốn mục tiêu của đề cương: tần số, diện tích, kiểm chứng và sign-off. Phạm vi: không có backpressure ở đầu ra (D-3); FA vẽ tay là bài nghiên cứu leaf cell, không đưa vào luồng OpenLane (D-8).");

// 3. Chương 1: theory
s = slideIn("Chương 1");
s.addText("Chương 1 · Cơ sở lý thuyết", { placeholder: "title" });
card(s, 0.5, 1.15, 4.35, 1.75, "Bộ cộng nối tiếp nhớ (RCA)", "t_RCA ≈ (n − 1)·t_c + t_s", { formula: true, size: 18, note: "nhớ lan qua từng FA, trễ tăng tuyến tính theo n" });
card(s, 5.15, 1.15, 4.35, 1.75, "Carry-select 2+2 (CSLA)", "t_CSLA ≈ t_RCA2 + t_MUX", { formula: true, size: 18, note: "khối cao tính sẵn cho nhớ 0 và 1, đổi diện tích lấy tốc độ", accent: C.accent2 });
card(s, 0.5, 3.1, 4.35, 1.85, "Phân tích thời gian tĩnh", "t_clk-q + t_logic,max + t_setup ≤ T − t_unc", { formula: true, size: 15, note: "setup và hold kiểm ở 9 corner (ss/tt/ff × RC min/nom/max)" });
card(s, 5.15, 3.1, 4.35, 1.85, "Logical Effort", "d = g·h + p,   D = N·F^(1/N) + P", { formula: true, size: 17, note: "F = G·B·H; trễ nhỏ nhất khi mọi tầng có cùng effort f̂", accent: C.accent2 });
s.addNotes("Chương 1 nhắc lại các khái niệm dùng trong bài: RCA và CSLA, STA với corner PVT, và Logical Effort. Cũng gồm valid/ready, FSM Moore, mirror adder, Euler path và luồng RTL→GDSII trên SKY130.");

// 4. Chương 2: architecture + CSLA datapath
s = slideIn("Chương 2");
s.addText("Chương 2 · Kiến trúc và datapath CSLA 2+2", { placeholder: "title" });
image(s, "block_diagram.png", 0.4, 1.05, 4.6, 3.3, "Sơ đồ khối datapath và FSM");
image(s, "csla_struct.png", 5.1, 1.05, 4.5, 3.3, "Cấu trúc CSLA 2+2");
caption(s, `Thanh ghi vào 9 bit, ra 5 bit, FSM 2 bit: ${m("synth.top.ff_count")} FF, reset bất đồng bộ`, 0.4, 4.4, 4.6);
caption(s, "c2 từ khối low chọn sum[3:2] và cout qua 3 MUX", 5.1, 4.4, 4.5);
s.addNotes("Datapath: 6 Full Adder chia thành 3 RCA 2 bit (low, hi0 với cin = 0, hi1 với cin = 1) và 3 MUX 2:1. Module fa và mux2 giữ phân cấp (keep_hierarchy) để bộ tổng hợp không xóa cấu trúc carry-select (D-6).");

// 5. Chương 2: FSM + handshake
s = slideIn("Chương 2");
s.addText("Chương 2 · FSM Moore và giao thức valid/ready", { placeholder: "title" });
image(s, "fsm.png", 0.4, 1.05, 4.5, 2.7, "Sơ đồ trạng thái FSM");
image(s, "wave_case2.png", 5.0, 1.05, 4.6, 2.7, "Dạng sóng case 2");
bullets(s, [
  "IDLE 00, COMPUTE 01, DONE 10; trạng thái 11 tự về IDLE",
  "ld_en = valid_in & ready_out; DONE + valid_in → COMPUTE, không có chu kỳ chết",
  `Nhận tại cạnh k → valid_out tại k + 2: độ trễ ${m("sim.latency_cycles")} chu kỳ, ${m("sim.cycles_per_result")} chu kỳ / kết quả`,
], 0.5, 3.95, 9.0, 1.2, 14);
s.addNotes("Ngõ ra chỉ phụ thuộc trạng thái (Moore): ready_out ở IDLE và DONE, valid_out ở DONE, out_en ở COMPUTE. Hình bên phải là 12 chu kỳ đầu của case 2.");

// 6. Chương 2: verification
s = slideIn("Chương 2");
s.addText("Chương 2 · Kiểm chứng chức năng", { placeholder: "title" });
table(s, [
  ["Case", "Kịch bản", "Kết quả"],
  ["1", "Vector có hướng sau reset", m("sim.case1.status")],
  ["2", "Giao dịch liên tiếp: độ trễ, thông lượng", m("sim.case2.status")],
  ["3", "Bong bóng ngẫu nhiên 30% trên valid_in", m("sim.case3.status")],
  ["4", "Reset bất đồng bộ ở COMPUTE và DONE", m("sim.case4.status")],
  ["5", `Vét cạn ${m("sim.exhaustive.checked")} tổ hợp, ${m("sim.exhaustive.errors")} lỗi`, m("sim.case5.status")],
  ["illegal", "Trạng thái 2'b11 → IDLE", m("sim.case_illegal.status")],
], 0.5, 1.15, 5.9, [0.9, 3.9, 1.1], 13);
bullets(s, [
  "Verilator, testbench tự kiểm tra, scoreboard",
  "Vector từ mô hình Python độc lập",
  "Mutation test: 6 đột biến đều bị bắt; 1 đột biến tương đương không quan sát được",
], 6.7, 1.2, 2.8, 3.6, 14);
s.addNotes("Mỗi kịch bản in một dòng RESULT, Makefile đọc dòng này và ghi vào metrics.json. Mutation test chứng minh testbench thực sự phát hiện lỗi: sửa sai RTL rồi chạy lại.");

// 7. Chương 3: synthesis, STA, CSLA vs RCA
s = slideIn("Chương 3");
s.addText("Chương 3 · Tổng hợp, STA và so sánh CSLA/RCA", { placeholder: "title" });
stat(s, 0.5, 1.05, 2.05, 1.1, m("synth.top.cell_count"), "cell", "sau tổng hợp");
stat(s, 2.75, 1.05, 2.05, 1.1, m("synth.top.area_um2"), "µm²", "diện tích cell");
stat(s, 5.0, 1.05, 2.05, 1.1, m("synth.top.nand2_eq"), "", "NAND2 tđ (ngân sách 500)", C.accent2);
stat(s, 7.25, 1.05, 2.25, 1.1, m("sta.synth.wns_setup_ns"), "ns", "setup slack, tt, 10 ns");
const variants = ["CSLA phân cấp", "RCA phân cấp", "CSLA flatten", "RCA flatten"];
const vk = ["csla4", "rca4", "csla4_flat", "rca4_flat"];
s.addChart(pres.charts.BAR, [{ name: "Diện tích (µm²)", labels: variants, values: vk.map((k) => num(`cmp.${k}.area_um2`)) }], {
  x: 0.4, y: 2.3, w: 4.5, h: 2.8, barDir: "col", showTitle: true, title: "Diện tích (µm²)", showValue: true,
  dataLabelPosition: "outEnd", dataLabelFormatCode: "0", chartColors: [HEX.accent1], showLegend: false, ...chartText,
});
s.addChart(pres.charts.BAR, [{ name: "Trễ (ns)", labels: variants, values: vk.map((k) => num(`cmp.${k}.delay_ns`)) }], {
  x: 5.1, y: 2.3, w: 4.5, h: 2.8, barDir: "col", showTitle: true, title: "Độ trễ tổ hợp (ns)", showValue: true,
  dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", chartColors: [HEX.accent2], showLegend: false, ...chartText,
});
s.addNotes(`Đường tới hạn thanh ghi–thanh ghi ${m("sta.synth.crit_path")} đến sau ${m("sta.synth.crit_arrival_ns")} ns, đi qua hai cổng maj3 của khối low rồi chân chọn MUX. `
  + `Giữ phân cấp: CSLA nhanh hơn RCA (${m("cmp.csla4.delay_ns")} so với ${m("cmp.rca4.delay_ns")} ns) nhưng ADP kém hơn (${m("cmp.csla4.adp")} so với ${m("cmp.rca4.adp")}). `
  + "Thứ hạng của bản flatten phụ thuộc phiên bản công cụ (D6).");

// 8. Chương 3: physical design & sign-off
s = slideIn("Chương 3");
s.addText("Chương 3 · Thiết kế vật lý và sign-off", { placeholder: "title" });
image(s, "layout_top.png", 0.4, 1.0, 3.6, 4.1, "Layout sau đi dây");
table(s, [
  ["Chỉ số", "Giá trị"],
  ["Die (µm²) / số cell", `${m("pnr.die_area_um2")} / ${m("pnr.cell_count")}`],
  ["Setup slack tt / xấu nhất (ns)", `${m("pnr.wns_setup_ns")} / ${m("pnr.wns_setup_worst_corner_ns")}`],
  ["Hold slack tt / xấu nhất (ns)", `${m("pnr.wns_hold_ns")} / ${m("pnr.wns_hold_worst_corner_ns")}`],
  ["fmax ước lượng, tt (MHz)", m("pnr.fmax_mhz")],
  ["DRC Magic / KLayout / LVS", `${m("pnr.drc_magic")} / ${m("pnr.drc_klayout")} / ${m("pnr.lvs_errors")}`],
  ["Antenna, công suất (mW)", `${m("pnr.antenna_violations")}, ${m("pnr.power_total_mw")}`],
  [`5 ns: ${m("pnr5.status")}`, m("pnr5.slide_value")],
], 4.3, 1.1, 5.2, [3.1, 2.1], 13);
s.addNotes("LibreLane 3.0.16 chạy trong Docker: floorplan util 55%, tỷ lệ 1:1, PDN, placement, CTS, routing, rồi sign-off với STA 9 corner, DRC Magic và KLayout, LVS Netgen. Utilization cuối cao hơn 55% vì bước sửa timing chèn thêm buffer.");

// 9. Chương 4: FA 28T layout + Euler path
s = slideIn("Chương 4");
s.addText("Chương 4 · Full Adder 28T: layout và Euler path", { placeholder: "title" });
image(s, "fa_layout.png", 0.4, 1.05, 5.0, 3.5, "Layout Full Adder");
const orders = [["Dải inverter", "S | Sb | VPWR | COb | CO"],
  ["Sum gate (Euler circuit)", "A · COb · CI · B · A · B · CI"], ["Carry gate (Euler path)", "B · A · A · B · CI"]];
orders.forEach(([h, d], i) => card(s, 5.6, 1.05 + i * 1.18, 3.9, 1.05, h, d, { mono: true, size: 13 }));
caption(s, `${m("fa.ntrans")} transistor · ${m("fa.width_um")} × ${m("fa.height_um")} µm · DRC ${m("fa.drc_errors")} · LVS khớp · ${m("fa.taps")} dải tap`, 0.4, 4.65, 9.1);
s.addNotes(`Mirror adder: carry gate 10T tạo COb, sum gate 14T tạo Sb, hai inverter. PDN là ảnh gương của PUN nên một thứ tự cổng dùng cho cả hai hàng, mỗi hàng chỉ một chỗ ngắt diffusion. Sizing chọn ${m("fa.sizing_chosen")}. Layout sinh bằng script, DRC drc(full) sạch, LVS Netgen khớp, PEX ${m("fa.pex_cap_count")} tụ ký sinh khác 0.`);

// 10. Chương 4: Logical Effort vs SPICE
s = slideIn("Chương 4");
s.addText("Chương 4 · Logical Effort và SPICE", { placeholder: "title" });
s.addChart(pres.charts.BAR, [{ name: "Trễ (ps)", labels: ["Logical Effort", "SPICE trước layout", "SPICE sau layout"],
  values: [num("le.D_est_ps"), num("spice.D_pre_ps"), num("spice.D_post_ps")] }], {
  x: 0.4, y: 1.0, w: 5.2, h: 3.9, barDir: "col", showTitle: true, title: "Trễ đường a0 → c2 (ps)", showValue: true,
  dataLabelPosition: "outEnd", dataLabelFormatCode: "0", chartColors: [HEX.accent1, HEX.accent3, HEX.accent2],
  showLegend: false, ...chartText,
});
table(s, [
  ["Đại lượng", "Giá trị"],
  ["τ (ps) / FO4 (ps)", `${m("le.tau_ps")} / ${m("le.fo4_ps")}`],
  ["G · B · H", `${m("le.G")} · ${m("le.B")} · ${m("le.H")}`],
  ["F, f̂ (N = 4)", `${m("le.F")}, ${m("le.fhat")}`],
  ["D ước lượng", `${m("le.D_est_tau")} τ = ${m("le.D_est_ps")} ps`],
  ["Sai số so với trước / sau", `${m("le.err_pre_pct")}% / ${m("le.err_post_pct")}%`],
], 5.9, 1.1, 3.6, [1.9, 1.7], 12);
s.addText("Netlist schematic không có ad/as/pd/ps nên khoảng cách trước/sau layout bị phóng đại; PEX thêm cả điện dung dây",
  { x: 5.9, y: 3.85, w: 3.6, h: 1.0, fontSize: 13, color: C.text1, isTextBox: true, margin: 0, valign: "top" });
s.addNotes("Logical Effort chọn đúng phương án kích thước nhanh hơn và cho ước lượng nằm giữa kết quả trước và sau layout. Muốn dự đoán chính xác độ trễ tuyệt đối thì phải tính thêm ký sinh của layout.");

// 11. Kết luận: results vs goals + future work
s = slideIn("Kết luận");
s.addText("Kết luận và hướng phát triển", { placeholder: "title" });
table(s, [
  ["Mục tiêu", "Kết quả", "Đánh giá"],
  ["512/512 khớp tham chiếu", `${m("sim.exhaustive.checked")} tổ hợp, ${m("sim.exhaustive.errors")} lỗi`, "Đạt"],
  ["≤ 500 NAND2 tđ", `${m("synth.top.nand2_eq")}`, "Đạt"],
  ["10 ns, mọi corner", `setup ${m("pnr.wns_setup_worst_corner_ns")} ns, hold ${m("pnr.wns_hold_worst_corner_ns")} ns`, "Đạt"],
  ["5 ns (mở rộng)", m("pnr5.slide_value"), m("pnr5.grade_vi")],
  ["DRC = 0, LVS khớp", `${m("pnr.drc_magic")} / ${m("pnr.drc_klayout")} / ${m("pnr.lvs_errors")}`, "Đạt"],
  ["FA 28T DRC/LVS", `DRC ${m("fa.drc_errors")}, LVS ${m("fa.lvs_match")}`, "Đạt"],
  ["LE so với SPICE", `${m("le.D_est_ps")} ps, giữa ${m("spice.D_pre_ps")} và ${m("spice.D_post_ps")} ps`, "Đạt"],
], 0.4, 1.1, 6.0, [2.0, 3.0, 1.0], 12);
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.65, y: 1.1, w: 2.95, h: 3.85, rectRadius: 0.1,
  fill: { color: C.background2 }, line: { type: "none" }, objectName: "card-future" });
s.addText("Hướng phát triển", { x: 6.85, y: 1.25, w: 2.6, h: 0.4, fontSize: 15, bold: true, color: C.accent2, isTextBox: true, margin: 0 });
bullets(s, [
  "Đưa FA custom vào flow thành macro",
  "Mở rộng 16/32 bit, square-root CSLA",
  "Thu gọn layout FA, đưa ký sinh vào LE",
  "Thêm ready_in cho đầu ra",
], 6.85, 1.8, 2.6, 3.0, 13);
s.addNotes("Ở 4 bit, CSLA nhanh hơn RCA nhưng tốn gần gấp đôi diện tích, nên ADP kém hơn khi giữ phân cấp. Demo nếu cần: make sim TEST=case2, make wave TEST=case2, klayout pnr/final/carryselect4_top.gds.");

// 12. Q&A
s = slideIn("Kết luận", "DARK");
s.addText("Cảm ơn thầy cô và các bạn đã lắng nghe", { placeholder: "title" });
s.addText("Hỏi & đáp", { placeholder: "body" });

// ---------- write + theme ----------
await pres.writeFile({ fileName: OUT });
const zip = await JSZip.loadAsync(fs.readFileSync(OUT));
const themePath = Object.keys(zip.files).find((f) => /^ppt\/theme\/theme\d+\.xml$/.test(f));
let xml = await zip.file(themePath).async("string");
for (const [k, v] of Object.entries(THEME.colors)) {
  const re = new RegExp(`(<a:${k}>)[\\s\\S]*?(</a:${k}>)`);
  if (!re.test(xml)) throw new Error(`theme slot ${k} not found`);
  xml = xml.replace(re, `$1<a:srgbClr val="${v}"/>$2`);
}
xml = xml.replace(/(<a:clrScheme name=")[^"]*(")/, `$1${THEME.name}$2`);
zip.file(themePath, xml);
fs.writeFileSync(OUT, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
console.log(`wrote ${path.relative(ROOT, OUT)} (${pres.slides.length} slides)`);

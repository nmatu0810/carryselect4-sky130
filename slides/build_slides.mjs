// Build slides/CarrySelect4_BaoVe.pptx: Vietnamese 16:9 defense deck (18 slides).
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
// 1. cover
let s = slideIn("Mở đầu", "DARK");
s.addText("CarrySelect-4: Bộ cộng carry-select 4 bit từ RTL đến GDSII trên SKY130", { placeholder: "title" });
s.addText([
  { text: "Đồ án cuối kỳ CE2032 – Thiết kế VLSI · Nhóm 7", options: { breakLine: true } },
  { text: "Ngụy Quốc Trung (23CE.B026) · Nguyễn Minh Anh Tú (23CE085)", options: { breakLine: true } },
  { text: "Khoa Kỹ thuật Máy tính và Điện tử – VKU · Đà Nẵng, 2026" },
], { placeholder: "body" });
s.addNotes("Giới thiệu nhóm và đề tài: lõi cộng CSLA 4 bit đi hết luồng RTL→GDSII, kèm nghiên cứu full-custom Full Adder và Logical Effort.");

// 2. context & goals
s = slideIn("Mở đầu");
s.addText("Bối cảnh và mục tiêu", { placeholder: "title" });
bullets(s, [
  "Bộ cộng nằm trong ALU, khối tính địa chỉ, bộ tăng tốc DSP của SoC biên",
  "RCA: nhớ lan qua từng bit, trễ O(n)",
  "CSLA: tính trước phần bit cao cho cả nhớ 0 và 1, dùng MUX chọn",
  "Mục tiêu: luồng mã nguồn mở đầy đủ trên SKY130 và leaf cell full-custom",
], 0.5, 1.15, 4.6, 3.6);
stat(s, 5.4, 1.15, 2.0, 1.45, "100", "MHz", "đóng timing sau route, mọi corner");
stat(s, 7.6, 1.15, 1.9, 1.45, "≤ 500", "", "NAND2 tương đương");
stat(s, 5.4, 2.85, 2.0, 1.45, "512/512", "", "tổ hợp khớp mô hình tham chiếu", C.accent2);
stat(s, 7.6, 2.85, 1.9, 1.45, "0", "", "lỗi DRC / LVS", C.accent2);
s.addNotes("Bốn mục tiêu chính lấy từ đề cương: tần số, diện tích, kiểm chứng và sign-off.");

// 3. architecture
s = slideIn("Thiết kế");
s.addText("Kiến trúc tổng thể", { placeholder: "title" });
image(s, "block_diagram.png", 0.5, 1.05, 5.9, 3.9, "Sơ đồ khối datapath và FSM");
bullets(s, [
  `Thanh ghi vào 9 bit, thanh ghi ra 5 bit, FSM 2 bit: ${m("synth.top.ff_count")} FF`,
  "Reset bất đồng bộ tích cực thấp, xóa cả 16 FF",
  "ld_en = valid_in & ready_out",
  "Không có latch",
], 6.6, 1.2, 2.9, 3.6, 14);

// 4. CSLA
s = slideIn("Thiết kế");
s.addText("Datapath CSLA 2+2", { placeholder: "title" });
image(s, "csla_struct.png", 0.5, 1.05, 5.7, 3.9, "Cấu trúc CSLA 2+2");
bullets(s, [
  "6 FA trong 3 RCA 2 bit: low, hi0 (cin = 0), hi1 (cin = 1)",
  "c2 từ khối low chọn sum[3:2] và cout qua 3 MUX",
  "t_CSLA ≈ t_RCA2 + t_MUX",
  "fa, mux2 giữ phân cấp (keep_hierarchy)",
], 6.4, 1.2, 3.1, 3.6, 14);

// 5. FSM
s = slideIn("Thiết kế");
s.addText("FSM Moore và giao tiếp valid/ready", { placeholder: "title" });
image(s, "fsm.png", 0.5, 1.1, 5.6, 3.3, "Sơ đồ trạng thái FSM");
bullets(s, [
  "IDLE 00, COMPUTE 01, DONE 10; 11 về IDLE",
  "ready_out ở IDLE và DONE; valid_out ở DONE",
  "DONE + valid_in → COMPUTE: không có chu kỳ chết",
  `Độ trễ ${m("sim.latency_cycles")} chu kỳ, ${m("sim.cycles_per_result")} chu kỳ / kết quả`,
], 6.3, 1.2, 3.2, 3.6, 14);

// 6. verification matrix
s = slideIn("Kiểm chứng");
s.addText("Kiểm chứng: ma trận kịch bản", { placeholder: "title" });
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
  "Mutation test: 6 lỗi cố ý đều bị bắt (1 đột biến tương đương)",
], 6.7, 1.2, 2.8, 3.6, 14);

// 7. waveforms
s = slideIn("Kiểm chứng");
s.addText("Dạng sóng case 2 và case 4", { placeholder: "title" });
image(s, "wave_case2.png", 0.4, 1.2, 4.5, 2.7, "Dạng sóng case 2");
image(s, "wave_case4.png", 5.1, 1.2, 4.5, 2.7, "Dạng sóng case 4");
s.addText("Nhận tại cạnh k → valid_out tại k + 2", { x: 0.4, y: 4.05, w: 4.5, h: 0.4, fontSize: 12, color: C.accent3,
  align: "center", isTextBox: true, margin: 0 });
s.addText("Reset ở COMPUTE và DONE: không có valid_out giả", { x: 5.1, y: 4.05, w: 4.5, h: 0.4, fontSize: 12,
  color: C.accent3, align: "center", isTextBox: true, margin: 0 });

// 8. synthesis & STA
s = slideIn("Tổng hợp và vật lý");
s.addText("Tổng hợp Yosys và STA", { placeholder: "title" });
stat(s, 0.5, 1.15, 2.05, 1.45, m("synth.top.cell_count"), "cell", "sau tổng hợp, sky130_fd_sc_hd");
stat(s, 2.75, 1.15, 2.05, 1.45, m("synth.top.area_um2"), "µm²", "diện tích cell");
stat(s, 5.0, 1.15, 2.05, 1.45, m("synth.top.nand2_eq"), "", "NAND2 tương đương (ngân sách 500)", C.accent2);
stat(s, 7.25, 1.15, 2.25, 1.45, m("sta.synth.wns_setup_ns"), "ns", "setup slack xấu nhất, tt, 10 ns");
bullets(s, [
  `Đường tới hạn thanh ghi–thanh ghi: ${m("sta.synth.crit_path")}, đến sau ${m("sta.synth.crit_arrival_ns")} ns`,
  "Đi qua 2 cổng maj3 của khối low (tạo c2) rồi chân chọn MUX: đúng cấu trúc CSLA",
  `Hold slack xấu nhất ${m("sta.synth.wns_hold_ns")} ns; SDC dùng chung cho LibreLane`,
], 0.5, 2.95, 9.0, 2.0, 14);

// 9. CSLA vs RCA (native charts, one measure per chart)
s = slideIn("Tổng hợp và vật lý");
s.addText("So sánh CSLA-4 và RCA-4", { placeholder: "title" });
const variants = ["CSLA phân cấp", "RCA phân cấp", "CSLA flatten", "RCA flatten"];
const vk = ["csla4", "rca4", "csla4_flat", "rca4_flat"];
s.addChart(pres.charts.BAR, [{ name: "Diện tích (µm²)", labels: variants, values: vk.map((k) => num(`cmp.${k}.area_um2`)) }], {
  x: 0.4, y: 1.05, w: 4.5, h: 3.1, barDir: "col", showTitle: true, title: "Diện tích (µm²)", showValue: true,
  dataLabelPosition: "outEnd", dataLabelFormatCode: "0", chartColors: [HEX.accent1], showLegend: false, ...chartText,
});
s.addChart(pres.charts.BAR, [{ name: "Trễ (ns)", labels: variants, values: vk.map((k) => num(`cmp.${k}.delay_ns`)) }], {
  x: 5.1, y: 1.05, w: 4.5, h: 3.1, barDir: "col", showTitle: true, title: "Độ trễ tổ hợp (ns)", showValue: true,
  dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", chartColors: [HEX.accent2], showLegend: false, ...chartText,
});
s.addText(`Giữ phân cấp: CSLA nhanh hơn (${m("cmp.csla4.delay_ns")} so với ${m("cmp.rca4.delay_ns")} ns) nhưng ADP kém hơn `
  + `(${m("cmp.csla4.adp")} so với ${m("cmp.rca4.adp")}). Flatten: CSLA vẫn nhanh hơn và có ADP tốt nhất (${m("cmp.csla4_flat.adp")}).`,
{ x: 0.5, y: 4.3, w: 9, h: 0.75, fontSize: 14, color: C.text1, isTextBox: true, margin: 0 });

// 10. OpenLane flow
s = slideIn("Tổng hợp và vật lý");
s.addText("Luồng OpenLane 2 / LibreLane", { placeholder: "title" });
const steps = [["Tổng hợp", "Yosys, lint"], ["Floorplan", "util 55%, 1:1"], ["PDN", "VPWR/VGND"],
  ["Placement", "global + detail"], ["CTS", "cây clock, sửa timing"], ["Routing", "antenna, fill"],
  ["Sign-off", "STA 9 corner, DRC, LVS"]];
const bw = 1.18, gap = 0.1;
steps.forEach(([h, d], i) => {
  const x = 0.5 + i * (bw + gap);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.4, w: bw, h: 1.6, rectRadius: 0.08,
    fill: { color: i === steps.length - 1 ? C.accent2 : C.accent1 }, line: { type: "none" }, objectName: `step-${i}` });
  s.addText([{ text: `${i + 1}`, options: { fontSize: 22, bold: true, breakLine: true } },
    { text: h, options: { fontSize: 13, bold: true, breakLine: true } }, { text: d, options: { fontSize: 11 } }],
  { x: x + 0.05, y: 1.45, w: bw - 0.1, h: 1.5, color: C.background1, align: "center", valign: "middle",
    isTextBox: true, margin: 0 });
});
bullets(s, [
  "LibreLane 3.0.16, SYNTH_HIERARCHY_MODE = keep, SDC chung với tổng hợp",
  "Lệnh: make pnr (10 ns) và make pnr5 (5 ns)",
  `Chạy trong Docker (image LibreLane 3.0.16), PDK sky130A ${m("env.pdk_hash").slice(0, 8)}`,
], 0.5, 3.35, 9, 1.6, 14);

// 11. layout & sign-off
s = slideIn("Tổng hợp và vật lý");
s.addText("Layout và sign-off ở 100 MHz", { placeholder: "title" });
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

// 12. FA 28T & Euler
s = slideIn("Full-custom");
s.addText("Full Adder 28T và Euler path", { placeholder: "title" });
bullets(s, [
  "Mirror adder: carry gate 10T → COb, sum gate 14T → Sb, 2 inverter",
  "PDN là ảnh gương của PUN: một thứ tự cổng cho cả hàng p và n",
  "Carry gate: Euler path (2 nút bậc lẻ); sum gate: Euler circuit",
  "Chỉ 1 chỗ ngắt diffusion mỗi hàng",
  `Sizing chọn ${m("fa.sizing_chosen")}: inverter CO theo optimal_sizes`,
], 0.5, 1.15, 4.7, 3.8, 14);
const orders = [["Dải 1 (inverter)", "S | Sb | VPWR | COb | CO"],
  ["Sum gate", "A · COb · CI · B · A · B · CI"], ["Carry gate", "B · A · A · B · CI"]];
orders.forEach(([h, d], i) => {
  const y = 1.15 + i * 1.25;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.5, y, w: 4.0, h: 1.05, rectRadius: 0.08,
    fill: { color: C.background2 }, line: { type: "none" }, objectName: `euler-${i}` });
  s.addText([{ text: h, options: { bold: true, fontSize: 13, color: C.accent1, breakLine: true } },
    { text: d, options: { fontSize: 14, fontFace: "Courier New", color: C.text1 } }],
  { x: 5.65, y: y + 0.08, w: 3.7, h: 0.9, valign: "middle", isTextBox: true, margin: 0 });
});

// 13. FA layout
s = slideIn("Full-custom");
s.addText("Layout FA trên Magic: DRC, LVS, PEX", { placeholder: "title" });
image(s, "fa_layout.png", 0.4, 1.0, 5.3, 4.0, "Layout Full Adder");
stat(s, 6.0, 1.05, 1.65, 1.2, m("fa.ntrans"), "", "transistor sau trích");
stat(s, 7.85, 1.05, 1.65, 1.2, m("fa.area_um2"), "µm²", `${m("fa.width_um")} × ${m("fa.height_um")} µm`);
stat(s, 6.0, 2.45, 1.65, 1.2, m("fa.drc_errors"), "", "lỗi DRC (drc full)", C.accent2);
stat(s, 7.85, 2.45, 1.65, 1.2, m("fa.taps"), "", "dải tap (LU < 15 µm)", C.accent2);
s.addText(`LVS Netgen: match uniquely (${m("fa.lvs_match")}). PEX: ${m("fa.pex_cap_count")} tụ ký sinh khác 0.`,
  { x: 6.0, y: 3.85, w: 3.5, h: 1.0, fontSize: 13, color: C.text1, isTextBox: true, margin: 0, valign: "top" });

// 14. LE vs SPICE
s = slideIn("Full-custom");
s.addText("Logical Effort và SPICE", { placeholder: "title" });
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
s.addText("Sau layout chậm hơn: điện dung tiếp giáp (ad/as) và dây không có trong netlist schematic",
  { x: 5.9, y: 3.85, w: 3.6, h: 1.0, fontSize: 13, color: C.text1, isTextBox: true, margin: 0, valign: "top" });

// 15. results vs goals
s = slideIn("Kết luận");
s.addText("Kết quả so với mục tiêu", { placeholder: "title" });
table(s, [
  ["Mục tiêu", "Kết quả", "Đánh giá"],
  ["512/512 khớp tham chiếu", `${m("sim.exhaustive.checked")} tổ hợp, ${m("sim.exhaustive.errors")} lỗi`, "Đạt"],
  ["≤ 500 NAND2 tđ", `${m("synth.top.nand2_eq")}`, "Đạt"],
  ["10 ns, mọi corner", `setup ${m("pnr.wns_setup_worst_corner_ns")} ns, hold ${m("pnr.wns_hold_worst_corner_ns")} ns`, "Đạt"],
  ["5 ns (mở rộng)", m("pnr5.slide_value"), m("pnr5.grade_vi")],
  ["DRC = 0, LVS khớp", `${m("pnr.drc_magic")} / ${m("pnr.drc_klayout")} / ${m("pnr.lvs_errors")}`, "Đạt"],
  ["FA 28T DRC/LVS", `DRC ${m("fa.drc_errors")}, LVS ${m("fa.lvs_match")}`, "Đạt"],
  ["LE so với SPICE", `${m("le.D_est_ps")} ps nằm giữa ${m("spice.D_pre_ps")} và ${m("spice.D_post_ps")} ps`, "Đạt"],
], 0.5, 1.1, 9.0, [3.0, 4.6, 1.4], 13);

// 16. conclusion & future work
s = slideIn("Kết luận");
s.addText("Kết luận và hướng phát triển", { placeholder: "title" });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.15, w: 4.35, h: 2.7, rectRadius: 0.1,
  fill: { color: C.background2 }, line: { type: "none" }, objectName: "card-conclusion" });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.15, y: 1.15, w: 4.35, h: 2.7, rectRadius: 0.1,
  fill: { color: C.background2 }, line: { type: "none" }, objectName: "card-future" });
s.addText("Kết luận", { x: 0.7, y: 1.3, w: 4, h: 0.4, fontSize: 18, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
s.addText("Hướng phát triển", { x: 5.35, y: 1.3, w: 4, h: 0.4, fontSize: 18, bold: true, color: C.accent2, isTextBox: true, margin: 0 });
bullets(s, [
  "Đạt mọi mục tiêu chính ở 100 MHz",
  "Ở 4 bit, CSLA nhanh hơn nhưng ADP kém khi giữ phân cấp",
  "LE chọn đúng sizing; cần tính ký sinh layout",
], 0.7, 1.85, 3.95, 1.9, 14);
bullets(s, [
  "Ghép FA custom vào flow dưới dạng macro",
  "Mở rộng 16/32 bit, square-root CSLA",
  "Thu gọn layout FA, thêm ready_in",
], 5.35, 1.85, 3.95, 1.9, 14);

s.addText(`Nhóm 7 · ${m("sim.exhaustive.checked")}/${m("sim.exhaustive.checked")} vector · ${m("pnr.fmax_mhz")} MHz ước lượng · FA ${m("fa.ntrans")}T DRC/LVS sạch`,
  { x: 0.5, y: 4.15, w: 9.0, h: 0.5, fontSize: 14, color: C.accent3, align: "center", isTextBox: true, margin: 0 });

// 17. demo
s = slideIn("Kết luận");
s.addText("Demo", { placeholder: "title" });
const cmds = [["Mô phỏng case 2", "make sim TEST=case2"], ["Xem sóng", "make wave TEST=case2"],
  ["Sinh lại số liệu FA", "make fa-layout fa-lvs fa-pex"], ["Mở GDS", "klayout pnr/final/carryselect4_top.gds"]];
cmds.forEach(([h, c], i) => {
  const y = 1.15 + i * 0.95;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y, w: 9.0, h: 0.8, rectRadius: 0.08,
    fill: { color: C.background2 }, line: { type: "none" }, objectName: `demo-${i}` });
  s.addText(h, { x: 0.7, y, w: 2.6, h: 0.8, fontSize: 15, bold: true, color: C.accent1, valign: "middle",
    isTextBox: true, margin: 0 });
  s.addText(c, { x: 3.4, y, w: 5.9, h: 0.8, fontSize: 15, fontFace: "Courier New", color: C.text1,
    valign: "middle", isTextBox: true, margin: 0 });
});

// 18. Q&A
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

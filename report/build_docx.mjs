// Build report/baocao_CarrySelect4.docx from report/vi/*.md (sorted by file name).
// Layout follows the faculty report template (BaoCao_DACN2): framed cover + inner cover, then
// pages numbered i, ii, ... (supervisor's assessment, table of contents, list of figures, list of
// tables), then the body numbered "Trang 1, 2, ..." with a ruled footer.
//
// Supported markdown (only these):
//   # Title                 -> chapter "CHƯƠNG N. TITLE" (new page)
//   # Title {-}             -> unnumbered part "TITLE" (Mở đầu, Kết luận, Tài liệu tham khảo, Phụ lục)
//   ## / ###                -> "N.M. TITLE" / "N.M.K. Title"; inside an unnumbered part "## X" -> "k. X",
//                              "## X {-}" -> "X"
//   plain paragraphs        (consecutive lines are joined)
//   "- item"                -> dash list;  "1. item" -> numbered list (restarts per list); in the
//                              references part a numbered list becomes "[n] ..." with a hanging indent
//   pipe table              -> caption "Bảng N.k. ..." above (from a "Bảng: <caption>" line just above);
//                              column widths follow the content, rows never split across pages,
//                              tables of up to 12 rows are kept on one page
//   ![Hình: caption](path)  -> image at most 15 cm x 11 cm, caption "Hình N.k. ..." below
//   **bold**, *italic*, `code` (Consolas)
//   inside *italic*: x_sub -> subscript, x^(sup) -> superscript; a paragraph that is only one
//                              *italic* span is a display formula (centred)
//   "Hình n" / "Bảng n" in the text -> renumbered to the per-chapter label of the n-th figure/table
//   {{key}}                 -> value from results/metrics.json; unknown key => exit code 1
// Optional report/vi/00_loicamon.md (plain paragraphs) adds a "LỜI CẢM ƠN" page before the assessment.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, LeaderType, LevelFormat, LineRuleType,
  NumberFormat, Packer, PageBorderDisplay, PageBorderOffsetFrom, PageBreak, PageNumber, Paragraph, ShadingType,
  StyleLevel, Tab, Table, TableCell, TableOfContents, TableRow, TabStopType, TextRun, VerticalAlign, WidthType,
} from "docx";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SRC = path.join(HERE, "vi");
const OUT = path.join(HERE, "baocao_CarrySelect4.docx");
const LOGO = path.join(HERE, "assets", "vku_logo.png");

const FONT = "Times New Roman";
const CM = 567; // DXA per cm
const TEXT_WIDTH = 11906 - 3 * CM - 2 * CM; // A4 width minus left 3 cm / right 2 cm
const PX_PER_CM = 96 / 2.54;
const IMG_MAX_W_PX = Math.round(15 * PX_PER_CM);
const IMG_MAX_H_PX = Math.round(11 * PX_PER_CM);
const LINE = 360; // 1.5 lines
const INDENT = 720; // 1.27 cm first-line indent
const HEADER_FILL = "D9E2F3";
const FRAME = "1F3864";

// ---------- metrics / placeholders ----------
const metrics = JSON.parse(fs.readFileSync(path.join(ROOT, "results", "metrics.json"), "utf8"));
// wording that depends on the 5 ns result comes from scripts/pnr5_text.py (PASS/FAIL aware)
Object.assign(metrics, JSON.parse(execFileSync("python3", [path.join(ROOT, "scripts", "pnr5_text.py")], { encoding: "utf8" })));

function sig3(v) {
  if (v === 0 || !Number.isFinite(v)) return String(v);
  // 3 significant figures, at most 3 decimals; same rule as scripts/metrics_to_tex.py
  const digits = Math.min(3 - Math.floor(Math.log10(Math.abs(v))) - 1, 3);
  if (digits <= 0) return String(Math.round(v / 10 ** -digits) * 10 ** -digits);
  return v.toFixed(digits);
}
function fmtMetric(v) {
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : sig3(v);
  return String(v);
}
const missing = new Set();
function substitute(text) {
  return text.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_, key) => {
    if (!(key in metrics)) { missing.add(key); return `{{${key}}}`; }
    return fmtMetric(metrics[key]);
  });
}

// ---------- inline formatting ----------
// Subscript after "_": letters/digits, joined by "-" or "," (t_clk-q, C_in,i+1), and continuing over
// further plain words until an operator, bracket or the end (C_trên đường + ...). Superscript: ^(...) or ^word.
const MATH = /_([\p{L}\p{N}]+(?:[-,][\p{L}\p{N}+]+)*(?: [\p{L}]+(?=$|[ )]))*)|\^\(([^)]*)\)|\^([\p{L}\p{N}]+)/gu;
function mathRuns(text, base) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(MATH)) {
    if (m.index > last) out.push(new TextRun({ ...base, text: text.slice(last, m.index) }));
    if (m[1] !== undefined) out.push(new TextRun({ ...base, text: m[1], subScript: true }));
    else out.push(new TextRun({ ...base, text: m[2] ?? m[3], superScript: true }));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(new TextRun({ ...base, text: text.slice(last) }));
  return out;
}
function runs(text, baseIn = {}) {
  const base = { font: FONT, ...baseIn };
  const out = [];
  let last = 0;
  for (const m of text.matchAll(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)) {
    if (m.index > last) out.push(new TextRun({ ...base, text: text.slice(last, m.index) }));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(new TextRun({ ...base, text: tok.slice(2, -2), bold: true }));
    else if (tok.startsWith("`")) out.push(new TextRun({ ...base, text: tok.slice(1, -1), font: "Consolas", size: 22 }));
    else out.push(...mathRuns(tok.slice(1, -1), { ...base, italics: true }));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new TextRun({ ...base, text: text.slice(last) }));
  return out;
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(12) !== 0x49484452) throw new Error(`not a PNG: ${file}`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), data: b };
}

// ---------- markdown -> blocks ----------
function parseFile(file) {
  const lines = substitute(fs.readFileSync(file, "utf8")).split(/\r?\n/);
  const dir = path.dirname(file);
  const blocks = [];
  let caption = null;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*?)\s*(\{-\})?\s*$/))) {
      blocks.push({ t: "h", level: m[1].length, title: m[2], numbered: !m[3] }); i++; continue;
    }
    if ((m = line.match(/^Bảng:\s*(.*)$/))) { caption = m[1]; i++; continue; }
    if ((m = line.match(/^!\[Hình:\s*(.*?)\]\((.*?)\)\s*$/))) {
      blocks.push({ t: "img", caption: m[1], file: path.resolve(dir, m[2]) }); i++; continue;
    }
    if (line.trim().startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        if (!/^\s*\|?\s*:?-{3,}/.test(lines[i])) rows.push(lines[i]);
        i++;
      }
      // split on unescaped "|"; "\|" inside a cell is a literal pipe
      const cells = rows.map((r) => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split(/(?<!\\)\|/)
        .map((c) => c.trim().replace(/\\\|/g, "|")));
      blocks.push({ t: "table", cells, caption: caption ?? "" });
      caption = null;
      continue;
    }
    if (/^- /.test(line)) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2).trim());
      blocks.push({ t: "list", ordered: false, items }); continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s+/, "").trim());
      blocks.push({ t: "list", ordered: true, items }); continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|- |\d+\.\s|\||!\[|Bảng:)/.test(lines[i])) para.push(lines[i++].trim());
    blocks.push({ t: "p", text: para.join(" ") });
  }
  return blocks;
}

/** caption prefix of an unnumbered part */
function partPrefix(title) {
  const t = title.toLocaleLowerCase("vi");
  if (t.startsWith("mở đầu")) return "MĐ";
  if (t.startsWith("kết luận")) return "KL";
  if (t.startsWith("phụ lục")) return "PL";
  return "TL";
}

// pass 1: per-chapter labels of every figure and table, in document order
function assignLabels(blocks) {
  let chapter = 0, prefix = "", fig = 0, tab = 0;
  const figs = [], tabs = [];
  for (const b of blocks) {
    if (b.t === "h" && b.level === 1) {
      if (b.numbered) { chapter += 1; prefix = String(chapter); } else prefix = partPrefix(b.title);
      fig = 0; tab = 0;
    } else if (b.t === "img") { fig += 1; b.label = `${prefix}.${fig}`; figs.push(b.label); }
    else if (b.t === "table") { tab += 1; b.label = `${prefix}.${tab}`; tabs.push(b.label); }
  }
  return { figs, tabs };
}

// "Hình 3" / "Bảng 2" in the text referred to document-wide numbers; map them to the new labels
function relabel(text, labels) {
  return text.replace(/\b(Hình|Bảng) (\d+)(?![\d.,]\d)/g, (all, kind, n) => {
    const l = (kind === "Hình" ? labels.figs : labels.tabs)[Number(n) - 1];
    return l ? `${kind} ${l}` : all;
  });
}

// ---------- block rendering ----------
const listRefs = [];
function para(text, opts = {}) {
  return new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: INDENT }, children: runs(text), ...opts });
}

function cellLen(c) {
  const code = (c.match(/`[^`]+`/g) || []).join("").length;
  return c.replace(/\*\*|`|\*/g, "").length + 0.25 * code;
}
/** width (DXA) the longest unbreakable word of a cell needs, so no word is split mid-way */
function wordWidth(c, header) {
  let best = 0;
  for (const m of c.matchAll(/`([^`]+)`|([^\s`]+)/g)) {
    const isCode = m[1] !== undefined;
    for (const word of (m[1] ?? m[2]).replace(/\*\*|\*/g, "").split(/\s+/)) {
      best = Math.max(best, word.length * (isCode ? 0.22 : 0.2) * (header ? 1.08 : 1));
    }
  }
  return Math.round((best + 0.4) * CM);
}
/** column widths in DXA: every column fits its longest word; the rest is shared by content length */
function columnWidths(cells) {
  const ncol = cells[0].length;
  const minW = Array.from({ length: ncol }, (_, j) =>
    Math.max(Math.round(1.4 * CM), ...cells.map((r, i) => wordWidth(r[j] ?? "", i === 0))));
  const want = Array.from({ length: ncol }, (_, j) =>
    Math.min(Math.max(...cells.map((r) => cellLen(r[j] ?? ""))), 42) + 3);
  const fixed = new Set();
  let w = [];
  for (let iter = 0; iter < ncol; iter++) {
    const free = TEXT_WIDTH - [...fixed].reduce((a, j) => a + minW[j], 0);
    const share = want.reduce((a, x, j) => a + (fixed.has(j) ? 0 : x), 0);
    w = want.map((x, j) => (fixed.has(j) ? minW[j] : Math.floor((free * x) / share)));
    const low = w.findIndex((x, j) => !fixed.has(j) && x < minW[j]);
    if (low < 0) break;
    fixed.add(low);
  }
  w[ncol - 1] += TEXT_WIDTH - w.reduce((a, b) => a + b, 0);
  return w;
}

function tableBlock(b, out) {
  const { cells } = b;
  const ncol = cells[0].length;
  const colW = columnWidths(cells);
  const keepTogether = cells.length <= 12; // short tables move to the next page as a whole
  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };
  out.push(new Paragraph({ style: "BangCaption", keepNext: true, keepLines: true,
    children: runs(`Bảng ${b.label}. ${b.caption}`.trim(), { italics: true }) }));
  out.push(new Table({
    width: { size: TEXT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: cells.map((r, i) => new TableRow({
      tableHeader: i === 0,
      cantSplit: true,
      children: Array.from({ length: ncol }, (_, j) => new TableCell({
        borders,
        width: { size: colW[j], type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        shading: i === 0 ? { fill: HEADER_FILL, type: ShadingType.CLEAR, color: "auto" } : undefined,
        margins: { top: 40, bottom: 40, left: 100, right: 100 },
        children: [new Paragraph({ alignment: i === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
          keepNext: i === 0 || (keepTogether && i < cells.length - 1),
          spacing: { before: 0, after: 0, line: 252, lineRule: LineRuleType.AUTO },
          children: runs(r[j] ?? "", { size: 24, bold: i === 0 }) })],
      })),
    })),
  }));
  out.push(new Paragraph({ spacing: { before: 0, after: 120, line: 240, lineRule: LineRuleType.AUTO }, children: [] }));
}

function imageBlock(b, out) {
  if (!fs.existsSync(b.file)) { console.error(`missing image ${b.file}`); process.exit(1); }
  const { w, h, data } = pngSize(b.file);
  const scale = Math.min(IMG_MAX_W_PX / w, IMG_MAX_H_PX / h);
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true,
    spacing: { line: 240, lineRule: LineRuleType.AUTO, before: 120, after: 0 },
    children: [new ImageRun({ type: "png", data, transformation: { width: Math.round(w * scale), height: Math.round(h * scale) } })] }));
  out.push(new Paragraph({ style: "HinhCaption", keepLines: true, children: runs(`Hình ${b.label}. ${b.caption}`, { italics: true }) }));
}

function renderBody(blocks, labels) {
  const out = [];
  let chapter = 0, numberedPart = false, refsPart = false, first = true;
  const h = [0, 0, 0];
  for (const b of blocks) {
    if (b.t === "h") {
      if (b.level === 1) {
        numberedPart = b.numbered;
        refsPart = /tài liệu tham khảo/i.test(b.title);
        if (b.numbered) chapter += 1;
        h[1] = 0; h[2] = 0;
        const text = b.numbered ? `CHƯƠNG ${chapter}. ${b.title.toLocaleUpperCase("vi")}` : b.title.toLocaleUpperCase("vi");
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: !first, children: [new TextRun({ text, font: FONT })] }));
        first = false;
      } else if (b.level === 2) {
        h[1] += 1; h[2] = 0;
        let text = b.title;
        if (numberedPart) text = `${chapter}.${h[1]}. ${b.title}`;
        else if (b.numbered) text = `${h[1]}. ${b.title}`;
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: FONT, allCaps: numberedPart })] }));
      } else {
        h[2] += 1;
        const text = numberedPart ? `${chapter}.${h[1]}.${h[2]}. ${b.title}` : b.title;
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: FONT })] }));
      }
      continue;
    }
    if (b.t === "p") {
      const text = relabel(b.text, labels);
      if (/^\*[^*]+\*$/.test(text)) { // display formula
        out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 120 }, children: runs(text) }));
      } else out.push(para(text));
      continue;
    }
    if (b.t === "list") {
      if (refsPart && b.ordered) { // references: "[n] ..." with a hanging indent
        b.items.forEach((it, k) => out.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED,
          indent: { left: 567, hanging: 567 }, children: runs(`[${k + 1}] ${relabel(it, labels)}`) })));
        continue;
      }
      let ref = "dash";
      if (b.ordered) { ref = `num-${listRefs.length + 1}`; listRefs.push(ref); }
      for (const it of b.items) {
        // items that are mostly code (file lists) are left-aligned: justifying them leaves wide gaps
        const code = (it.match(/`[^`]+`/g) || []).join("").length;
        const align = code > 0.5 * it.length ? AlignmentType.LEFT : AlignmentType.JUSTIFIED;
        out.push(new Paragraph({ alignment: align, numbering: { reference: ref, level: 0 }, children: runs(relabel(it, labels)) }));
      }
      continue;
    }
    if (b.t === "table") { tableBlock(b, out); continue; }
    if (b.t === "img") imageBlock(b, out);
  }
  return out;
}

// ---------- cover, inner cover, front matter ----------
function cover(meta) {
  const c = (text, opt = {}, para = {}) => new Paragraph({ alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0, line: 276, lineRule: LineRuleType.AUTO }, ...para,
    children: [new TextRun({ font: FONT, size: 28, text, ...opt })] });
  const logo = pngSize(LOGO);
  const lw = Math.round(6.3 * PX_PER_CM);
  const course = meta["hoc_phan"];
  const info = (label, value) => new Paragraph({ indent: { left: Math.round(2.6 * CM) },
    tabStops: [{ type: TabStopType.LEFT, position: Math.round(8.2 * CM) }],
    spacing: { before: 0, after: 0, line: 276, lineRule: LineRuleType.AUTO },
    children: [new TextRun({ font: FONT, size: 28, bold: true, text: label }), new TextRun({ children: [new Tab()] }),
      new TextRun({ font: FONT, size: 28, italics: true, text: value })] });
  return [
    c(meta["truong"].toLocaleUpperCase("vi")),
    c(meta["khoa"].toLocaleUpperCase("vi"), { bold: true }),
    new Paragraph({ indent: { left: Math.round(4.6 * CM), right: Math.round(4.6 * CM) }, spacing: { before: 0, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } }, children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 720, after: 480 }, children: [new ImageRun({
      type: "png", data: logo.data, transformation: { width: lw, height: Math.round((lw * logo.h) / logo.w) } })] }),
    c("BÁO CÁO ĐỒ ÁN CUỐI KỲ", { bold: true, size: 52 }, { spacing: { before: 360, after: 120 } }),
    c(`HỌC PHẦN ${course.toLocaleUpperCase("vi")}`, { bold: true }, { spacing: { before: 0, after: 240 } }),
    c(meta["de_tai"].toLocaleUpperCase("vi"), { bold: true }, { spacing: { before: 0, after: 0, line: 360, lineRule: LineRuleType.AUTO } }),
    new Paragraph({ spacing: { before: 1300 }, children: [] }),
    info("Nhóm:", meta["nhom"]),
    ...meta["sinh_vien"].map((sv, k) => info(k === 0 ? "Sinh viên:" : "", sv)),
    info("Người hướng dẫn:", meta["GVHD"] || ""),
    new Paragraph({ spacing: { before: 1400 }, children: [] }),
    c(meta["noi_nam"], { bold: true }),
  ];
}

const frontTitle = (text, extra = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 240 },
  ...extra, children: [new TextRun({ text, bold: true, size: 28, font: FONT })] });

function frontMatter(meta) {
  const out = [];
  const thanks = path.join(SRC, "00_loicamon.md");
  if (fs.existsSync(thanks)) {
    out.push(frontTitle("LỜI CẢM ƠN"));
    for (const b of parseFile(thanks)) if (b.t === "p") out.push(para(b.text));
    out.push(new Paragraph({ children: [new PageBreak()] }));
  }
  // supervisor's assessment
  out.push(frontTitle("NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN"));
  for (let k = 0; k < 14; k++) {
    out.push(new Paragraph({ spacing: { before: 0, after: 0, line: 360, lineRule: LineRuleType.AUTO },
      tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH, leader: LeaderType.DOT }],
      children: [new TextRun({ children: [new Tab()], font: FONT })] }));
  }
  const sign = (text, opt) => new Paragraph({ alignment: AlignmentType.CENTER, indent: { left: Math.round(8.5 * CM) },
    spacing: { before: 0, after: 0 }, children: [new TextRun({ font: FONT, text, ...opt })] });
  out.push(sign("Đà Nẵng, …/…/2026", { italics: true }));
  out.push(sign("Giảng viên hướng dẫn", { bold: true }));
  out.push(new Paragraph({ spacing: { before: 1100 }, children: [] }));
  out.push(sign(meta["GVHD"] || "", { bold: true }));
  // table of contents and the two caption lists
  out.push(frontTitle("MỤC LỤC", { pageBreakBefore: true }));
  out.push(new TableOfContents("Mục lục", { hyperlink: true, headingStyleRange: "1-3" }));
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text: "DANH MỤC HÌNH ẢNH", font: FONT })] }));
  out.push(new TableOfContents("Danh mục hình ảnh", { hyperlink: true, stylesWithLevels: [new StyleLevel("HinhCaption", 4)] }));
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text: "DANH MỤC BẢNG", font: FONT })] }));
  out.push(new TableOfContents("Danh mục bảng", { hyperlink: true, stylesWithLevels: [new StyleLevel("BangCaption", 4)] }));
  return out;
}

// ---------- main ----------
const meta = JSON.parse(fs.readFileSync(path.join(SRC, "00_meta.json"), "utf8"));
const files = fs.readdirSync(SRC).filter((f) => /\.md$/.test(f) && f !== "00_loicamon.md").sort();
if (!files.length) { console.error("no markdown chapters in report/vi"); process.exit(1); }
const blocks = files.flatMap((f) => parseFile(path.join(SRC, f)));
if (missing.size) {
  console.error(`missing metric(s): ${[...missing].join(", ")}`);
  process.exit(1);
}
const labels = assignLabels(blocks);
const body = renderBody(blocks, labels);

const numbering = {
  config: [
    { reference: "dash", levels: [{ level: 0, format: LevelFormat.BULLET, text: "-", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }] },
    ...listRefs.map((ref) => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }] })),
  ],
};

const pstyle = (id, name, run, paragraph) => ({ id, name, basedOn: "Normal", next: "Normal", quickFormat: true,
  run: { font: FONT, color: "000000", ...run }, paragraph });
const tocStyle = (id, name, left, run = {}) => ({ id, name, basedOn: "Normal", next: "Normal",
  run: { font: FONT, size: 26, ...run },
  paragraph: { indent: { left }, spacing: { before: 0, after: 60, line: 300, lineRule: LineRuleType.AUTO },
    tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH, leader: LeaderType.DOT }] } });

const pageSetup = { margin: { top: 2 * CM, bottom: 2 * CM, left: 3 * CM, right: 2 * CM, footer: Math.round(1.0 * CM) } };
const romanFooter = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
  children: [new TextRun({ children: [PageNumber.CURRENT], size: 24, font: FONT })] })] });
const footerLabel = `${meta["nhom"]} – ${meta["hoc_phan"].split(" – ")[0]}`;
const bodyFooter = () => new Footer({ children: [new Paragraph({
  border: { top: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 2 } },
  tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH }],
  children: [new TextRun({ text: footerLabel, italics: true, size: 24, font: FONT }), new TextRun({ children: [new Tab()] }),
    new TextRun({ children: ["Trang ", PageNumber.CURRENT], italics: true, size: 26, font: FONT })] })] });
const frame = { style: BorderStyle.THICK_THIN_SMALL_GAP, size: 24, color: FRAME, space: 20 };

const doc = new Document({
  creator: meta["nhom"],
  title: meta["de_tai"],
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 26 },
      paragraph: { spacing: { before: 0, after: 120, line: LINE, lineRule: LineRuleType.AUTO } } } },
    paragraphStyles: [
      pstyle("Heading1", "Heading 1", { size: 28, bold: true },
        { alignment: AlignmentType.CENTER, keepNext: true, keepLines: true, outlineLevel: 0,
          spacing: { before: 0, after: 240, line: LINE, lineRule: LineRuleType.AUTO } }),
      pstyle("Heading2", "Heading 2", { size: 26, bold: true },
        { keepNext: true, keepLines: true, outlineLevel: 1, spacing: { before: 120, after: 120, line: LINE, lineRule: LineRuleType.AUTO } }),
      pstyle("Heading3", "Heading 3", { size: 26, bold: true },
        { keepNext: true, keepLines: true, outlineLevel: 2, spacing: { before: 120, after: 120, line: LINE, lineRule: LineRuleType.AUTO } }),
      pstyle("HinhCaption", "HinhCaption", { size: 26, italics: true },
        { alignment: AlignmentType.CENTER, spacing: { before: 60, after: 200, line: 300, lineRule: LineRuleType.AUTO } }),
      pstyle("BangCaption", "BangCaption", { size: 26, italics: true },
        { alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 160, after: 60, line: 300, lineRule: LineRuleType.AUTO } }),
      tocStyle("TOC1", "toc 1", 0, { bold: true }),
      tocStyle("TOC2", "toc 2", 283),
      tocStyle("TOC3", "toc 3", 567, { italics: true }),
      tocStyle("TOC4", "toc 4", 0),
    ],
  },
  numbering,
  sections: [
    { // cover: framed, no page number
      properties: { page: { ...pageSetup, borders: {
        pageBorders: { display: PageBorderDisplay.ALL_PAGES, offsetFrom: PageBorderOffsetFrom.TEXT },
        pageBorderTop: frame, pageBorderBottom: frame, pageBorderLeft: frame, pageBorderRight: frame,
      } } },
      children: cover(meta),
    },
    { properties: { page: pageSetup }, children: cover(meta) }, // inner cover
    { // assessment, contents, lists: i, ii, ...
      properties: { page: { ...pageSetup, pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } } },
      footers: { default: romanFooter() },
      children: frontMatter(meta),
    },
    { // body: Trang 1, 2, ...
      properties: { page: { ...pageSetup, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      footers: { default: bodyFooter() },
      children: body,
    },
  ],
});

fs.writeFileSync(OUT, await Packer.toBuffer(doc));
console.log(`wrote ${path.relative(ROOT, OUT)} (${files.length} files, ${labels.figs.length} figures, ${labels.tabs.length} tables)`);

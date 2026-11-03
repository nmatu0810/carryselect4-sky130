// Build report/baocao_CarrySelect4.docx from report/vi/*.md (sorted by file name).
//
// Supported markdown (only these):
//   # / ## / ###            -> Heading 1/2/3, numbered "Chương N." / "N.M" / "N.M.K"
//   plain paragraphs        (consecutive lines are joined)
//   "- item"                -> bullet list;  "1. item" -> numbered list (restarts per list)
//   pipe table              -> bordered table; caption from a "Bảng: <caption>" line just above;
//                              column widths follow the content, rows never split across pages,
//                              tables of up to 12 rows are kept on one page
//   ![Hình: caption](path)  -> image at most 15 cm wide and 11 cm tall, numbered caption "Hình n." below
//   **bold**, *italic*, `code` (Consolas)
//   inside *italic*: x_sub -> subscript, x^(sup) -> superscript; a paragraph that is only one
//                              *italic* span is a display formula (centred)
//   {{key}}                 -> value from results/metrics.json; unknown key => exit code 1
// Sections: cover (page border, no page number) | table of contents (i, ii, ...) | chapters (1, 2, ...).
// Layout: A4, margins T/B/L/R = 2/2/3/2 cm, Times New Roman 13 pt, line spacing 1.3, body paragraphs
// justified with a 1 cm first-line indent, chapter titles centred in capitals.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, LevelFormat, LineRuleType, NumberFormat,
  Packer, PageBorderDisplay, PageBorderOffsetFrom, PageNumber, Paragraph, ShadingType, Table, TableCell,
  TableOfContents, TableRow, TextRun, VerticalAlign, WidthType,
} from "docx";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SRC = path.join(HERE, "vi");
const OUT = path.join(HERE, "baocao_CarrySelect4.docx");

const FONT = "Times New Roman";
const CM = 567; // DXA per cm
const TEXT_WIDTH = 11906 - 3 * CM - 2 * CM; // A4 width minus left/right margins
const PX_PER_CM = 96 / 2.54;
const IMG_MAX_W_PX = Math.round(15 * PX_PER_CM); // images at most 15 cm wide ...
const IMG_MAX_H_PX = Math.round(11 * PX_PER_CM); // ... and 11 cm tall
const INDENT = CM; // first-line indent of body paragraphs

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
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(new TextRun({ ...base, text: tok.slice(2, -2), bold: true }));
    else if (tok.startsWith("`")) out.push(new TextRun({ ...base, text: tok.slice(1, -1), font: "Consolas", size: 22 }));
    else out.push(...mathRuns(tok.slice(1, -1), { ...base, italics: true }));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}

// ---------- images ----------
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(12) !== 0x49484452) throw new Error(`not a PNG: ${file}`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), data: b };
}

// ---------- block parser ----------
const counters = { h: [0, 0, 0], fig: 0, tab: 0, list: 0 };
const body = [];
const listInstances = [];

function heading(level, title) {
  counters.h[level - 1] += 1;
  for (let i = level; i < 3; i++) counters.h[i] = 0;
  const [a, b, c] = counters.h;
  const text = level === 1 ? `CHƯƠNG ${a}. ${title.toLocaleUpperCase("vi")}`
    : level === 2 ? `${a}.${b} ${title}` : `${a}.${b}.${c} ${title}`;
  const hl = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][level - 1];
  body.push(new Paragraph({ heading: hl, pageBreakBefore: level === 1 && counters.h[0] > 1,
    children: [new TextRun({ text, font: FONT })] }));
}

function paragraph(text) {
  if (/^\*[^*]+\*$/.test(text)) { // display formula
    body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 180 },
      children: runs(text) }));
    return;
  }
  body.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: INDENT }, children: runs(text) }));
}

function list(items, ordered) {
  let ref = "bullets";
  if (ordered) {
    counters.list += 1;
    ref = `numbered-${counters.list}`;
    listInstances.push(ref);
  }
  for (const it of items) body.push(new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(it) }));
}

function caption(text, keepNext = false) {
  return new Paragraph({ alignment: AlignmentType.CENTER, keepNext, keepLines: true,
    spacing: { before: keepNext ? 200 : 60, after: keepNext ? 80 : 240 },
    children: runs(text, { size: 24, italics: false }) });
}

/** visible length of a markdown cell (markup removed; code counts wider) */
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
      const cm = word.length * (isCode ? 0.22 : 0.2) * (header ? 1.08 : 1);
      best = Math.max(best, cm);
    }
  }
  return Math.round((best + 0.4) * CM); // + cell margins
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

function table(rows, cap) {
  // split on unescaped "|"; "\|" inside a cell is a literal pipe
  const cells = rows.map((r) => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|")));
  const ncol = cells[0].length;
  const colW = columnWidths(cells);
  const keepTogether = cells.length <= 12; // short tables move to the next page as a whole
  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };
  counters.tab += 1;
  body.push(caption(`**Bảng ${counters.tab}.** ${cap ?? ""}`.trim(), true));
  body.push(new Table({
    width: { size: TEXT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: cells.map((r, i) => new TableRow({
      tableHeader: i === 0,
      cantSplit: true,
      children: Array.from({ length: ncol }, (_, j) => new TableCell({
        borders,
        width: { size: colW[j], type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        shading: i === 0 ? { fill: "E7E6E6", type: ShadingType.CLEAR, color: "auto" } : undefined,
        margins: { top: 50, bottom: 50, left: 90, right: 90 },
        children: [new Paragraph({ alignment: i === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
          keepNext: i === 0 || (keepTogether && i < cells.length - 1), spacing: { before: 0, after: 0, line: 264, lineRule: LineRuleType.AUTO },
          children: runs(r[j] ?? "", { size: 24, bold: i === 0 }) })],
      })),
    })),
  }));
  body.push(new Paragraph({ spacing: { before: 0, after: 120, line: 240, lineRule: LineRuleType.AUTO }, children: [] }));
}

function image(cap, rel, mdDir) {
  const file = path.resolve(mdDir, rel);
  if (!fs.existsSync(file)) { console.error(`missing image ${file}`); process.exit(1); }
  const { w, h, data } = pngSize(file);
  const scale = Math.min(IMG_MAX_W_PX / w, IMG_MAX_H_PX / h);
  counters.fig += 1;
  body.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true,
    spacing: { line: 240, lineRule: LineRuleType.AUTO, before: 160, after: 0 }, children: [new ImageRun({
    type: "png", data, transformation: { width: Math.round(w * scale), height: Math.round(h * scale) },
  })] }));
  body.push(caption(`**Hình ${counters.fig}.** ${cap}`));
}

function parseFile(file) {
  const lines = substitute(fs.readFileSync(file, "utf8")).split(/\r?\n/);
  const mdDir = path.dirname(file);
  let i = 0;
  let pendingCaption = null;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { heading(m[1].length, m[2].trim()); i++; continue; }
    if ((m = line.match(/^Bảng:\s*(.*)$/))) { pendingCaption = m[1]; i++; continue; }
    if ((m = line.match(/^!\[Hình:\s*(.*?)\]\((.*?)\)\s*$/))) { image(m[1], m[2], mdDir); i++; continue; }
    if (line.trim().startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        if (!/^\s*\|?\s*:?-{3,}/.test(lines[i])) rows.push(lines[i]);
        i++;
      }
      table(rows, pendingCaption);
      pendingCaption = null;
      continue;
    }
    if (/^- /.test(line)) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2).trim());
      list(items, false);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s+/, "").trim());
      list(items, true);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|- |\d+\.\s|\||!\[|Bảng:)/.test(lines[i])) para.push(lines[i++].trim());
    paragraph(para.join(" "));
  }
}

// ---------- cover ----------
function cover(meta) {
  const c = (text, opt = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ font: FONT, text, ...opt })] });
  const out = [
    c(meta["truong"].toUpperCase(), { bold: true, size: 28 }),
    c(meta["khoa"].toUpperCase(), { bold: true, size: 28 }),
    c("──────────", {}),
    new Paragraph({ spacing: { before: 1200 }, children: [] }),
    c("BÁO CÁO ĐỒ ÁN CUỐI KỲ", { bold: true, size: 32 }),
    c(`Học phần: ${meta["hoc_phan"]}`, { size: 28 }),
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    c("ĐỀ TÀI", { bold: true, size: 28 }),
    c(meta["de_tai"], { bold: true, size: 34 }),
    new Paragraph({ spacing: { before: 1000 }, children: [] }),
  ];
  const left = (label, value) => new Paragraph({ indent: { left: label ? 2600 : 3830 }, spacing: { after: 80 },
    children: label ? [new TextRun({ text: `${label}: `, bold: true, font: FONT }), new TextRun({ text: value, font: FONT })]
      : [new TextRun({ text: value, font: FONT })] });
  out.push(left("Nhóm", meta["nhom"]));
  meta["sinh_vien"].forEach((sv, k) => out.push(left(k === 0 ? "Sinh viên" : "", sv)));
  out.push(left("GVHD", meta["GVHD"] || ""));
  out.push(new Paragraph({ spacing: { before: 1600 }, children: [] }));
  out.push(c(meta["noi_nam"], { italics: true, bold: true }));
  return out;
}

// ---------- main ----------
const meta = JSON.parse(fs.readFileSync(path.join(SRC, "00_meta.json"), "utf8"));
const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".md")).sort();
if (!files.length) { console.error("no markdown chapters in report/vi"); process.exit(1); }
for (const f of files) parseFile(path.join(SRC, f));
if (missing.size) {
  console.error(`missing metric(s): ${[...missing].join(", ")}`);
  process.exit(1);
}

const toc = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 },
    children: [new TextRun({ text: "MỤC LỤC", bold: true, size: 32, font: FONT })] }),
  new TableOfContents("Mục lục", { hyperlink: true, headingStyleRange: "1-3" }),
];

const numbering = {
  config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ...listInstances.map((ref) => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] })),
  ],
};

const hstyle = (id, name, size, extra = {}, para = {}) => ({
  id, name, basedOn: "Normal", next: "Normal", quickFormat: true,
  run: { font: FONT, size, bold: true, color: "000000", ...extra },
  paragraph: { spacing: { before: 240, after: 120, line: 312, lineRule: LineRuleType.AUTO }, keepNext: true,
    keepLines: true, outlineLevel: Number(id.slice(-1)) - 1, ...para },
});

const pageSetup = { margin: { top: 2 * CM, bottom: 2 * CM, left: 3 * CM, right: 2 * CM } };
const footer = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
  children: [new TextRun({ children: [PageNumber.CURRENT], size: 24, font: FONT })] })] });
const coverBorder = { style: BorderStyle.THICK_THIN_MEDIUM_GAP, size: 24, color: "000000", space: 24 };

const doc = new Document({
  creator: meta["nhom"],
  title: meta["de_tai"],
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 26 }, paragraph: { spacing: { line: 312, lineRule: LineRuleType.AUTO, after: 120 } } } },
    paragraphStyles: [
      hstyle("Heading1", "Heading 1", 32, {}, { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 360, line: 312, lineRule: LineRuleType.AUTO } }),
      hstyle("Heading2", "Heading 2", 28, {}, { spacing: { before: 280, after: 120, line: 312, lineRule: LineRuleType.AUTO } }),
      hstyle("Heading3", "Heading 3", 26, { italics: true }),
    ],
  },
  numbering,
  sections: [
    { // cover: framed, no page number
      properties: { page: { ...pageSetup, borders: {
        pageBorders: { display: PageBorderDisplay.ALL_PAGES, offsetFrom: PageBorderOffsetFrom.TEXT },
        pageBorderTop: coverBorder, pageBorderBottom: coverBorder, pageBorderLeft: coverBorder, pageBorderRight: coverBorder,
      } } },
      children: cover(meta),
    },
    { // table of contents: i, ii, ...
      properties: { page: { ...pageSetup, pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } } },
      footers: { default: footer() },
      children: toc,
    },
    { // chapters: 1, 2, ...
      properties: { page: { ...pageSetup, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      footers: { default: footer() },
      children: body,
    },
  ],
});

fs.writeFileSync(OUT, await Packer.toBuffer(doc));
console.log(`wrote ${path.relative(ROOT, OUT)} (${files.length} files, ${counters.fig} figures, ${counters.tab} tables)`);

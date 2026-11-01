// Build report/baocao_CarrySelect4.docx from report/vi/*.md (sorted by file name).
//
// Supported markdown (only these):
//   # / ## / ###            -> Heading 1/2/3, numbered "Chương N." / "N.M" / "N.M.K"
//   plain paragraphs        (consecutive lines are joined)
//   "- item"                -> bullet list;  "1. item" -> numbered list (restarts per list)
//   pipe table              -> bordered table; caption from a "Bảng: <caption>" line just above
//   ![Hình: caption](path)  -> image 15 cm wide, numbered caption "Hình n." below
//   **bold**, *italic*, `code` (Consolas)
//   {{key}}                 -> value from results/metrics.json; unknown key => exit code 1
// Cover page from report/vi/00_meta.json, then a table of contents field, then the chapters.
// Layout: A4, margins T/B/L/R = 2/2/3/2 cm, Times New Roman 13 pt, line spacing 1.3, page number footer.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, LevelFormat, LineRuleType, Packer, PageBreak,
  PageNumber, Paragraph, ShadingType, Table, TableCell, TableOfContents, TableRow, TextRun, WidthType,
} from "docx";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SRC = path.join(HERE, "vi");
const OUT = path.join(HERE, "baocao_CarrySelect4.docx");

const FONT = "Times New Roman";
const CM = 567; // DXA per cm
const TEXT_WIDTH = 11906 - 3 * CM - 2 * CM; // A4 width minus left/right margins
const IMG_WIDTH_PX = Math.round((15 / 2.54) * 96); // 15 cm at 96 dpi

// ---------- metrics / placeholders ----------
const metrics = JSON.parse(fs.readFileSync(path.join(ROOT, "results", "metrics.json"), "utf8"));

function sig3(v) {
  if (v === 0 || !Number.isFinite(v)) return String(v);
  const digits = 3 - Math.floor(Math.log10(Math.abs(v))) - 1;
  if (digits <= 0) return String(Math.round(v / 10 ** -digits) * 10 ** -digits);
  let s = v.toFixed(digits);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
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
    else out.push(new TextRun({ ...base, text: tok.slice(1, -1), italics: true }));
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
  const num = level === 1 ? `Chương ${a}.` : level === 2 ? `${a}.${b}` : `${a}.${b}.${c}`;
  const hl = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][level - 1];
  if (level === 1 && counters.h[0] > 1) body.push(new Paragraph({ children: [new PageBreak()] }));
  body.push(new Paragraph({ heading: hl, children: [new TextRun({ text: `${num} ${title}`, font: FONT })] }));
}

function paragraph(text) {
  body.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: runs(text) }));
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

function caption(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 200 },
    children: runs(text, { size: 24, italics: false }) });
}

function table(rows, cap) {
  const cells = rows.map((r) => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim()));
  const ncol = cells[0].length;
  const colW = Array(ncol).fill(Math.floor(TEXT_WIDTH / ncol));
  colW[ncol - 1] += TEXT_WIDTH - colW.reduce((a, b) => a + b, 0);
  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };
  counters.tab += 1;
  body.push(caption(`**Bảng ${counters.tab}.** ${cap ?? ""}`.trim()));
  body.push(new Table({
    width: { size: TEXT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: cells.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: Array.from({ length: ncol }, (_, j) => new TableCell({
        borders,
        width: { size: colW[j], type: WidthType.DXA },
        shading: i === 0 ? { fill: "E7E6E6", type: ShadingType.CLEAR, color: "auto" } : undefined,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({ spacing: { line: 276, lineRule: LineRuleType.AUTO }, children: runs(r[j] ?? "", { size: 24, bold: i === 0 }) })],
      })),
    })),
  }));
  body.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
}

function image(cap, rel, mdDir) {
  const file = path.resolve(mdDir, rel);
  if (!fs.existsSync(file)) { console.error(`missing image ${file}`); process.exit(1); }
  const { w, h, data } = pngSize(file);
  counters.fig += 1;
  body.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true,
    spacing: { line: 240, lineRule: LineRuleType.AUTO, before: 120, after: 0 }, children: [new ImageRun({
    type: "png", data, transformation: { width: IMG_WIDTH_PX, height: Math.round((IMG_WIDTH_PX * h) / w) },
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
  out.push(c(meta["noi_nam"], { italics: true }));
  out.push(new Paragraph({ children: [new PageBreak()] }));
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

const front = [
  ...cover(meta),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [new TextRun({ text: "MỤC LỤC", bold: true, size: 32, font: FONT })] }),
  new TableOfContents("Mục lục", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({ children: [new PageBreak()] }),
];

const numbering = {
  config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ...listInstances.map((ref) => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] })),
  ],
};

const hstyle = (id, name, size, extra = {}) => ({
  id, name, basedOn: "Normal", next: "Normal", quickFormat: true,
  run: { font: FONT, size, bold: true, color: "000000", ...extra },
  paragraph: { spacing: { before: 240, after: 120, line: 312, lineRule: LineRuleType.AUTO }, keepNext: true,
    outlineLevel: Number(id.slice(-1)) - 1 },
});

const doc = new Document({
  creator: meta["nhom"],
  title: meta["de_tai"],
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 26 }, paragraph: { spacing: { line: 312, lineRule: LineRuleType.AUTO, after: 120 } } } },
    paragraphStyles: [
      hstyle("Heading1", "Heading 1", 32),
      hstyle("Heading2", "Heading 2", 28),
      hstyle("Heading3", "Heading 3", 26, { italics: true }),
    ],
  },
  numbering,
  sections: [{
    properties: { page: { margin: { top: 2 * CM, bottom: 2 * CM, left: 3 * CM, right: 2 * CM } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 24, font: FONT })] })] }) },
    children: [...front, ...body],
  }],
});

fs.writeFileSync(OUT, await Packer.toBuffer(doc));
console.log(`wrote ${path.relative(ROOT, OUT)} (${files.length} files, ${counters.fig} figures, ${counters.tab} tables)`);

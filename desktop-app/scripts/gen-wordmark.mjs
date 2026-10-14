import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import opentype from "opentype.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadFont(file) {
  const buf = fs.readFileSync(file);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function cleanPath(pathObj) {
  const p = new opentype.Path();
  for (const c of pathObj.commands) {
    const nums = Object.entries(c)
      .filter(([k]) => k !== "type")
      .map(([, v]) => v);
    if (nums.some((v) => typeof v === "number" && !Number.isFinite(v))) continue;
    p.commands.push({ ...c });
  }
  return p;
}

function pathFor(font, text, x, y, size, tracking = 0) {
  let cursor = x;
  const parts = [];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const ch of text) {
    const g = font.charToGlyph(ch);
    const gp = cleanPath(g.getPath(cursor, y, size));
    const d = gp.toPathData(3).replace(/NaN/g, "0");
    if (d && d.length > 2) parts.push(d);
    const bb = gp.getBoundingBox();
    if (Number.isFinite(bb.x1)) {
      minX = Math.min(minX, bb.x1);
      minY = Math.min(minY, bb.y1);
      maxX = Math.max(maxX, bb.x2);
      maxY = Math.max(maxY, bb.y2);
    }
    const adv =
      typeof g.advanceWidth === "number"
        ? (g.advanceWidth * size) / font.unitsPerEm
        : font.getAdvanceWidth(ch, size);
    cursor += adv + tracking;
  }

  return {
    d: parts.join(" "),
    box: { x1: minX, y1: minY, x2: maxX, y2: maxY },
    endX: cursor,
  };
}

const font = loadFont(path.join(root, "public/fonts/allura.ttf"));
const size = 96;
const padX = 4;
const padY = 8;

// Signature script: Smart + Write as one flowing lockup
const smartProbe = pathFor(font, "Smart", 0, 0, size, -1.5);
const writeProbe = pathFor(font, "Write", 0, 0, size, -1.5);
const top = Math.min(smartProbe.box.y1, writeProbe.box.y1);

const smart = pathFor(font, "Smart", padX - smartProbe.box.x1, padY - top, size, -1.5);
const write = pathFor(
  font,
  "Write",
  smart.endX - 10 - writeProbe.box.x1,
  padY - top + 1,
  size,
  -1.5
);

const width = Math.max(smart.box.x2, write.box.x2) + padX + 8;
const height = Math.max(smart.box.y2, write.box.y2) + padY + 14;

const fx1 = write.box.x1 + 4;
const fx2 = write.box.x2 + 2;
const fy = write.box.y2 + 5;
const flourish = `M${fx1.toFixed(1)} ${fy.toFixed(1)} C${(fx1 + (fx2 - fx1) * 0.35).toFixed(1)} ${(fy - 6).toFixed(1)}, ${(fx1 + (fx2 - fx1) * 0.7).toFixed(1)} ${(fy + 4).toFixed(1)}, ${fx2.toFixed(1)} ${(fy - 5).toFixed(1)}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(1)} ${height.toFixed(1)}" fill="none" role="img" aria-label="SmartWrite">
  <defs>
    <linearGradient id="swWriteGrad" x1="${write.box.x1.toFixed(1)}" y1="${write.box.y1.toFixed(1)}" x2="${write.box.x2.toFixed(1)}" y2="${write.box.y2.toFixed(1)}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2DD4BF"/>
      <stop offset="0.45" stop-color="#14B8A6"/>
      <stop offset="1" stop-color="#0F766E"/>
    </linearGradient>
    <linearGradient id="swFlourish" x1="${fx1.toFixed(1)}" y1="${fy.toFixed(1)}" x2="${fx2.toFixed(1)}" y2="${fy.toFixed(1)}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#14B8A6" stop-opacity="0.2"/>
      <stop offset="0.4" stop-color="#14B8A6"/>
      <stop offset="1" stop-color="#0F766E" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <path d="${smart.d}" fill="#141A18"/>
  <path d="${write.d}" fill="url(#swWriteGrad)"/>
  <path d="${flourish}" stroke="url(#swFlourish)" stroke-width="2.4" stroke-linecap="round" fill="none"/>
</svg>
`;

if (svg.includes("NaN")) {
  console.error("NaN in SVG");
  process.exit(1);
}

const out = path.join(root, "public/images/smartwrite-wordmark.svg");
fs.writeFileSync(out, svg);
console.log("Wrote", out, { width: +width.toFixed(1), height: +height.toFixed(1) });

export type FontFamily = "sans" | "display" | "serif" | "editorial";
export type TextAlign = "left" | "center" | "right";
export type TextBaseline = "top" | "middle" | "alphabetic" | "bottom";
export type FontWeight = "regular" | "medium" | "bold" | "black" | number;
export type ColorInput =
  | string
  | readonly [number, number, number]
  | readonly [number, number, number, number]
  | { r: number; g: number; b: number; a?: number };

export interface SurfaceLike {
  width: number;
  height: number;
  data?: Uint8Array | Uint8ClampedArray;
  pixels?: Uint8Array | Uint8ClampedArray;
  buf?: Uint8Array | Uint8ClampedArray;
  blendPixel?: (x: number, y: number, r: number, g: number, b: number, a: number) => void;
}

export interface TextShadow {
  dx: number;
  dy: number;
  color: ColorInput;
  alpha?: number;
}

export interface TextStyle {
  size: number;
  family?: FontFamily;
  weight?: FontWeight;
  color?: ColorInput;
  align?: TextAlign;
  baseline?: TextBaseline;
  tracking?: number;
  letterSpacing?: number;
  lineHeight?: number;
  alpha?: number;
  maxWidth?: number;
  italic?: boolean;
  shadow?: TextShadow;
}

export interface TextMetrics {
  width: number;
  height: number;
  ascent: number;
  descent: number;
  lineCount: number;
  lines: string[];
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  r: number;
}

interface Dot {
  cx: number;
  cy: number;
  r: number;
}

interface GlyphBitmap {
  ox: number;
  oy: number;
  w: number;
  h: number;
  alpha: Uint8Array;
}

type GlyphDef = readonly [number, string];

const GLYPHS: Record<string, GlyphDef> = {
  " ": [3.4, ""],
  A: [6.8, "M 0.5 10 L 3.4 0 L 6.3 10 M 1.5 6.8 L 5.3 6.8"],
  B: [6.5, "M 1 0 L 1 10 M 1 0 L 3.7 0 A 3.7 2.4 2 2.4 -90 90 L 1 4.8 M 1 4.8 L 3.9 4.8 A 3.9 7.4 2.1 2.6 -90 90 L 1 10"],
  C: [6.6, "A 3.6 5 2.7 5 -38 -322"],
  D: [6.8, "M 1 0 L 1 10 M 1 0 L 2.8 0 A 2.8 5 3.2 5 -90 90 L 1 10"],
  E: [5.8, "M 1 0 L 1 10 M 1 0 L 5.1 0 M 1 4.8 L 4.5 4.8 M 1 10 L 5.2 10"],
  F: [5.5, "M 1 0 L 1 10 M 1 0 L 5.0 0 M 1 4.9 L 4.3 4.9"],
  G: [7.0, "A 3.6 5 2.7 5 -35 -360 M 3.7 5.2 L 6.3 5.2 L 6.3 10"],
  H: [6.8, "M 1 0 L 1 10 M 5.8 0 L 5.8 10 M 1 4.9 L 5.8 4.9"],
  I: [2.6, "M 1.3 0 L 1.3 10"],
  J: [5.2, "M 4.1 0 L 4.1 7.4 A 2.4 7.4 1.7 2.6 0 165"],
  K: [6.4, "M 1 0 L 1 10 M 5.5 0 L 1 5.4 M 2.5 3.6 L 5.7 10"],
  L: [5.4, "M 1 0 L 1 10 L 5.0 10"],
  M: [8.2, "M 1 10 L 1 0 L 4.1 6.8 L 7.2 0 L 7.2 10"],
  N: [7.0, "M 1 10 L 1 0 L 6.0 10 L 6.0 0"],
  O: [7.2, "A 3.6 5 2.8 5 0 360"],
  P: [6.2, "M 1 0 L 1 10 M 1 0 L 3.6 0 A 3.6 2.8 2.1 2.8 -90 90 L 1 5.6"],
  Q: [7.2, "A 3.6 5 2.8 5 0 360 M 4.3 7.6 L 6.5 10.6"],
  R: [6.5, "M 1 0 L 1 10 M 1 0 L 3.6 0 A 3.6 2.7 2.1 2.7 -90 90 L 1 5.4 M 3.5 5.4 L 5.8 10"],
  S: [6.2, "A 3.1 2.5 2.1 2.5 -28 -270 A 3.1 7.5 2.3 2.5 -90 152"],
  T: [6.0, "M 0.4 0 L 5.6 0 M 3.0 0 L 3.0 10"],
  U: [6.8, "M 1 0 L 1 7.2 A 3.4 7.2 2.4 2.8 180 0 L 5.8 0"],
  V: [6.6, "M 0.5 0 L 3.3 10 L 6.1 0"],
  W: [8.8, "M 0.5 0 L 2.3 10 L 4.4 2.6 L 6.5 10 L 8.3 0"],
  X: [6.4, "M 0.7 0 L 5.7 10 M 5.7 0 L 0.7 10"],
  Y: [6.2, "M 0.5 0 L 3.1 5.0 L 5.7 0 M 3.1 5.0 L 3.1 10"],
  Z: [6.0, "M 0.7 0 L 5.3 0 L 0.7 10 L 5.4 10"],
  a: [5.5, "A 2.7 5.2 1.9 1.6 -150 0 L 4.6 10 M 4.6 6.8 L 2.4 6.8 A 2.4 8.4 1.8 1.6 -90 -270 L 4.6 10"],
  b: [5.8, "M 1 0 L 1 10 A 3.1 6.8 2.1 3.2 0 360"],
  c: [5.4, "A 2.9 6.8 2.1 3.2 -35 -325"],
  d: [5.8, "M 4.8 0 L 4.8 10 A 2.7 6.8 2.1 3.2 0 360"],
  e: [5.6, "M 0.7 6.8 L 4.9 6.8 A 2.8 6.8 2.1 3.2 0 -325"],
  f: [3.8, "A 3.0 1.6 1.4 1.6 -180 -45 M 1.6 1.6 L 1.6 10 M 0.4 4.0 L 3.6 4.0"],
  g: [5.8, "A 2.8 6.8 2.1 3.2 0 360 M 4.9 3.6 L 4.9 10.2 A 2.8 10.2 2.1 2.4 0 150"],
  h: [5.6, "M 1 0 L 1 10 A 2.8 5.8 1.8 2.2 180 360 L 4.6 10"],
  i: [2.4, "D 1.2 1.2 0.62 M 1.2 3.6 L 1.2 10"],
  j: [2.8, "D 1.8 1.2 0.62 M 1.8 3.6 L 1.8 10.6 A 0.6 10.6 1.2 2.0 0 115"],
  k: [5.2, "M 1 0 L 1 10 M 4.4 3.6 L 1 7.2 M 2.3 5.9 L 4.6 10"],
  l: [2.4, "M 1.2 0 L 1.2 10"],
  m: [8.0, "M 0.9 3.6 L 0.9 10 A 2.4 5.6 1.5 2.0 180 360 L 3.9 10 A 5.4 5.6 1.5 2.0 180 360 L 6.9 10"],
  n: [5.6, "M 1 3.6 L 1 10 A 2.8 5.8 1.8 2.2 180 360 L 4.6 10"],
  o: [5.8, "A 2.9 6.8 2.1 3.2 0 360"],
  p: [5.8, "M 1 3.6 L 1 12.6 A 3.1 6.8 2.1 3.2 0 360"],
  q: [5.8, "M 4.8 3.6 L 4.8 12.6 A 2.7 6.8 2.1 3.2 0 360"],
  r: [3.8, "M 1.1 3.6 L 1.1 10 A 2.8 5.6 1.7 2.0 180 290"],
  s: [5.0, "A 2.5 5.2 1.7 1.6 -25 -270 A 2.5 8.4 1.8 1.6 -90 155"],
  t: [3.8, "M 1.8 1.2 L 1.8 8.4 A 3.0 8.4 1.2 1.6 180 75 M 0.5 4.0 L 3.5 4.0"],
  u: [5.6, "M 1 3.6 L 1 7.8 A 2.8 7.8 1.8 2.2 180 0 L 4.6 3.6 M 4.6 3.6 L 4.6 10"],
  v: [5.2, "M 0.5 3.6 L 2.6 10 L 4.7 3.6"],
  w: [7.6, "M 0.5 3.6 L 2.0 10 L 3.8 4.4 L 5.6 10 L 7.1 3.6"],
  x: [5.2, "M 0.7 3.6 L 4.5 10 M 4.5 3.6 L 0.7 10"],
  y: [5.2, "M 0.6 3.6 L 2.7 10 M 4.6 3.6 L 1.5 12.6"],
  z: [5.0, "M 0.7 3.6 L 4.3 3.6 L 0.7 10 L 4.4 10"],
  "0": [6.2, "A 3.1 5 2.3 5 0 360"],
  "1": [4.4, "M 0.9 1.9 L 2.6 0 L 2.6 10 M 1.0 10 L 4.0 10"],
  "2": [6.0, "A 3.0 2.6 2.1 2.6 -160 35 L 0.9 10 L 5.2 10"],
  "3": [6.0, "A 2.9 2.4 2.0 2.4 -145 90 A 3.0 7.4 2.2 2.6 -90 145"],
  "4": [6.2, "M 4.5 10 L 4.5 0 L 0.7 6.8 L 5.5 6.8"],
  "5": [6.0, "M 5.0 0 L 1.3 0 L 1.1 4.4 L 3.0 4.4 A 3.0 7.2 2.2 2.8 -90 145"],
  "6": [6.2, "A 3.2 5 2.3 5 -45 -180 L 0.9 7.2 A 3.1 7.2 2.2 2.8 0 360"],
  "7": [5.8, "M 0.7 0 L 5.2 0 L 2.1 10"],
  "8": [6.2, "A 3.1 2.4 2.0 2.4 0 360 A 3.1 7.4 2.3 2.6 0 360"],
  "9": [6.2, "A 3.1 2.8 2.2 2.8 0 360 M 5.3 2.8 L 5.3 5 A 3.0 5 2.3 5 0 135"],
  ".": [2.4, "D 1.2 9.4 0.65"],
  ",": [2.6, "D 1.3 9.3 0.62 M 1.5 9.5 Q 1.5 11.2 0.7 11.8"],
  ":": [2.4, "D 1.2 4.2 0.62 D 1.2 9.4 0.62"],
  ";": [2.6, "D 1.3 4.2 0.62 D 1.3 9.3 0.62 M 1.5 9.5 Q 1.5 11.2 0.7 11.8"],
  "!": [2.6, "M 1.3 0 L 1.3 7.2 D 1.3 9.4 0.65"],
  "?": [5.6, "A 2.8 2.4 2.0 2.4 -165 45 Q 2.8 5.6 2.8 7.2 D 2.8 9.4 0.65"],
  "-": [3.8, "M 0.6 5.6 L 3.2 5.6"],
  "–": [5.4, "M 0.6 5.6 L 4.8 5.6"],
  "—": [7.8, "M 0.5 5.6 L 7.3 5.6"],
  "/": [4.4, "M 3.7 0 L 0.7 10.4"],
  "\\": [4.4, "M 0.7 0 L 3.7 10.4"],
  "|": [2.4, "M 1.2 -0.6 L 1.2 11.2"],
  "(": [3.4, "A 3.4 5.2 2.3 5.8 -125 -235"],
  ")": [3.4, "A 0.0 5.2 2.3 5.8 -55 55"],
  "[": [3.4, "M 2.8 -0.4 L 1.0 -0.4 L 1.0 11.0 L 2.8 11.0"],
  "]": [3.4, "M 0.6 -0.4 L 2.4 -0.4 L 2.4 11.0 L 0.6 11.0"],
  "'": [2.2, "M 1.1 0.2 L 1.1 2.8"],
  "’": [2.4, "D 1.2 1.2 0.52 M 1.4 1.4 Q 1.4 2.8 0.7 3.3"],
  "‘": [2.4, "D 1.2 2.6 0.52 M 1.0 2.4 Q 1.0 1.0 1.7 0.5"],
  "\"": [4.0, "M 1.2 0.2 L 1.2 2.8 M 2.8 0.2 L 2.8 2.8"],
  "“": [4.4, "D 1.3 2.6 0.5 M 1.1 2.4 Q 1.1 1.0 1.8 0.5 D 3.1 2.6 0.5 M 2.9 2.4 Q 2.9 1.0 3.6 0.5"],
  "”": [4.4, "D 1.3 1.2 0.5 M 1.5 1.4 Q 1.5 2.8 0.8 3.3 D 3.1 1.2 0.5 M 3.3 1.4 Q 3.3 2.8 2.6 3.3"],
  "&": [6.8, "A 3.0 2.2 1.5 2.2 -30 -270 L 5.8 10 M 3.0 4.4 A 2.8 7.2 2.1 2.8 -90 -350 L 5.6 5.6"],
  "%": [7.6, "A 2.0 2.1 1.2 1.8 0 360 A 5.6 7.9 1.2 1.8 0 360 M 6.0 0.2 L 1.6 10"],
  "$": [6.2, "A 3.1 2.5 2.1 2.3 -25 -270 A 3.1 7.3 2.2 2.4 -90 155 M 3.1 -0.8 L 3.1 10.8"],
  "€": [6.4, "A 3.8 5 2.6 5 -38 -322 M 0.5 3.9 L 4.5 3.9 M 0.5 6.1 L 4.1 6.1"],
  "£": [6.2, "A 3.5 2.2 1.9 2.2 -20 -180 L 1.6 8.2 Q 1.6 9.8 0.8 10 L 5.4 10 M 0.7 5.2 L 4.5 5.2"],
  "+": [5.8, "M 2.9 2.2 L 2.9 8.4 M 0.6 5.3 L 5.2 5.3"],
  "=": [5.8, "M 0.6 3.8 L 5.2 3.8 M 0.6 6.8 L 5.2 6.8"],
  "*": [4.8, "M 2.4 0.8 L 2.4 4.8 M 0.7 1.8 L 4.1 3.8 M 4.1 1.8 L 0.7 3.8"],
  "#": [6.6, "M 2.3 0.4 L 1.5 9.8 M 5.1 0.4 L 4.3 9.8 M 0.6 3.4 L 6.0 3.4 M 0.4 6.8 L 5.8 6.8"],
  "@": [8.0, "A 4.0 5.4 3.2 4.6 -20 -310 A 4.0 5.4 1.6 2.1 0 360 M 5.6 3.3 L 5.4 7.0 A 6.3 7.0 0.9 1.1 180 0"],
  "°": [3.8, "A 1.9 1.8 1.1 1.3 0 360"],
  "·": [2.8, "D 1.4 5.4 0.68"],
  "•": [3.8, "D 1.9 5.4 1.25"],
};

const KERNING: Record<string, number> = {
  AV: -0.75, AW: -0.6, AY: -0.75, AT: -0.65, FA: -0.65, LT: -0.65, LV: -0.7, LW: -0.55,
  LY: -0.75, PA: -0.65, TA: -0.65, TO: -0.35, Tr: -0.45, Tu: -0.4, Ty: -0.45, To: -0.45,
  Te: -0.45, Ta: -0.5, VA: -0.75, Ve: -0.4, Vo: -0.45, Va: -0.5, WA: -0.6, We: -0.35,
  Wo: -0.35, Wa: -0.4, YA: -0.75, Yo: -0.5, Ye: -0.45, Ya: -0.5, "11": -0.35, "1.": -0.3,
  "7.": -0.65, "F.": -0.75, "P.": -0.75, "T.": -0.65, "V.": -0.7, "W.": -0.55, "Y.": -0.75,
  "r.": -0.55, "r,": -0.55, "v.": -0.45, "w.": -0.35, "y.": -0.45, "f.": -0.3, "A'": -0.5,
};

const bitmapCache = new Map<string, GlyphBitmap>();

export function hasGlyph(ch: string): boolean {
  return Object.prototype.hasOwnProperty.call(GLYPHS, ch);
}

export function parseColor(input: ColorInput | undefined): [number, number, number, number] {
  if (!input) return [255, 255, 255, 255];
  if (typeof input === "string") {
    const h = input.trim().replace(/^#/, "");
    if (h.length === 3 || h.length === 4) {
      const r = parseInt(h[0] + h[0], 16) || 0;
      const g = parseInt(h[1] + h[1], 16) || 0;
      const b = parseInt(h[2] + h[2], 16) || 0;
      const a = h.length === 4 ? parseInt(h[3] + h[3], 16) : 255;
      return [r, g, b, Number.isNaN(a) ? 255 : a];
    }
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16) || 0;
      const g = parseInt(h.slice(2, 4), 16) || 0;
      const b = parseInt(h.slice(4, 6), 16) || 0;
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255;
      return [r, g, b, Number.isNaN(a) ? 255 : a];
    }
    return [255, 255, 255, 255];
  }
  if (Array.isArray(input)) {
    return [
      Math.max(0, Math.min(255, input[0] ?? 255)),
      Math.max(0, Math.min(255, input[1] ?? 255)),
      Math.max(0, Math.min(255, input[2] ?? 255)),
      Math.max(0, Math.min(255, input[3] ?? 255)),
    ];
  }
  return [
    Math.max(0, Math.min(255, input.r)),
    Math.max(0, Math.min(255, input.g)),
    Math.max(0, Math.min(255, input.b)),
    Math.max(0, Math.min(255, input.a ?? 255)),
  ];
}

function isDisplayFamily(family?: FontFamily): boolean {
  return family === "display" || family === "serif" || family === "editorial";
}

function normalizeWeight(weight?: FontWeight): number {
  if (typeof weight === "number") return Math.max(0.65, Math.min(1.85, weight / 500));
  if (weight === "black") return 1.55;
  if (weight === "bold") return 1.28;
  if (weight === "medium") return 1.08;
  return 0.92;
}

function resolveGlyph(ch: string): GlyphDef {
  return GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? GLYPHS[" "]!;
}

export function getKerning(left: string, right: string, size: number, family?: FontFamily): number {
  const k = KERNING[left + right] ?? 0;
  if (k === 0) return 0;
  const mult = isDisplayFamily(family) ? 1.1 : 1.0;
  return (k / 10) * size * mult;
}

function compileGlyph(
  ch: string,
  size: number,
  family: FontFamily,
  weightMul: number,
  italic: boolean,
): GlyphBitmap {
  const key = `${ch}|${isDisplayFamily(family) ? "d" : "s"}|${size.toFixed(1)}|${weightMul.toFixed(2)}|${italic ? 1 : 0}`;
  const cached = bitmapCache.get(key);
  if (cached) return cached;

  const [, path] = resolveGlyph(ch);
  const scale = size / 10;
  const display = isDisplayFamily(family);
  const baseR = Math.max(0.55, size * 0.044 * weightMul);
  const shear = italic ? 0.16 : 0;
  const tx = (x: number, y: number): number => (x + (10 - y) * shear) * scale;
  const ty = (y: number): number => y * scale;

  const segs: Segment[] = [];
  const dots: Dot[] = [];
  const addSeg = (x1: number, y1: number, x2: number, y2: number, rOverride?: number): void => {
    const sx1 = tx(x1, y1), sy1 = ty(y1), sx2 = tx(x2, y2), sy2 = ty(y2);
    if (Math.hypot(sx2 - sx1, sy2 - sy1) < 1e-4) return;
    let r = rOverride ?? baseR;
    if (display && rOverride === undefined) {
      const ang = Math.atan2(sy2 - sy1, sx2 - sx1);
      const vert = Math.abs(Math.sin(ang));
      r = baseR * (0.46 + 0.96 * vert);
    }
    segs.push({ x1: sx1, y1: sy1, x2: sx2, y2: sy2, r });
  };

  const tokens = path.trim() ? path.trim().split(/\s+/) : [];
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === "M") {
      cx = Number(tokens[i++]); cy = Number(tokens[i++]);
      sx = cx; sy = cy;
    } else if (cmd === "L") {
      const nx = Number(tokens[i++]), ny = Number(tokens[i++]);
      addSeg(cx, cy, nx, ny);
      if (display && Math.abs(nx - cx) < 0.35 && Math.abs(ny - cy) > 2.2) {
        const sr = baseR * 0.42;
        const sl = Math.max(0.45, (baseR * 2.15) / scale);
        for (const endY of [cy, ny]) {
          if (Math.abs(endY) < 0.25 || Math.abs(endY - 10) < 0.25 || Math.abs(endY - 3.6) < 0.25) {
            addSeg(cx - sl, endY, cx + sl, endY, sr);
          }
        }
      }
      cx = nx; cy = ny;
    } else if (cmd === "Q") {
      const qx = Number(tokens[i++]), qy = Number(tokens[i++]);
      const nx = Number(tokens[i++]), ny = Number(tokens[i++]);
      const steps = 10;
      let px = cx, py = cy;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps, u = 1 - t;
        const bx = u * u * cx + 2 * u * t * qx + t * t * nx;
        const by = u * u * cy + 2 * u * t * qy + t * t * ny;
        addSeg(px, py, bx, by);
        px = bx; py = by;
      }
      cx = nx; cy = ny;
    } else if (cmd === "A") {
      const acx = Number(tokens[i++]), acy = Number(tokens[i++]);
      const rx = Number(tokens[i++]), ry = Number(tokens[i++]);
      const a0 = (Number(tokens[i++]) * Math.PI) / 180;
      const a1 = (Number(tokens[i++]) * Math.PI) / 180;
      const steps = Math.max(10, Math.ceil((Math.abs(a1 - a0) / (Math.PI * 2)) * 28));
      let px = acx + Math.cos(a0) * rx, py = acy + Math.sin(a0) * ry;
      for (let s = 1; s <= steps; s++) {
        const a = a0 + ((a1 - a0) * s) / steps;
        const nx = acx + Math.cos(a) * rx, ny = acy + Math.sin(a) * ry;
        addSeg(px, py, nx, ny);
        px = nx; py = ny;
      }
      cx = px; cy = py;
    } else if (cmd === "D") {
      const dx = Number(tokens[i++]), dy = Number(tokens[i++]), dr = Number(tokens[i++]);
      dots.push({ cx: tx(dx, dy), cy: ty(dy), r: Math.max(baseR * 1.05, dr * scale) });
    } else if (cmd === "Z") {
      addSeg(cx, cy, sx, sy);
      cx = sx; cy = sy;
    }
  }

  if (segs.length === 0 && dots.length === 0) {
    const empty: GlyphBitmap = { ox: 0, oy: 0, w: 0, h: 0, alpha: new Uint8Array(0) };
    bitmapCache.set(key, empty);
    return empty;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of segs) {
    const pad = s.r + 1.5;
    minX = Math.min(minX, s.x1 - pad, s.x2 - pad);
    minY = Math.min(minY, s.y1 - pad, s.y2 - pad);
    maxX = Math.max(maxX, s.x1 + pad, s.x2 + pad);
    maxY = Math.max(maxY, s.y1 + pad, s.y2 + pad);
  }
  for (const d of dots) {
    const pad = d.r + 1.5;
    minX = Math.min(minX, d.cx - pad); minY = Math.min(minY, d.cy - pad);
    maxX = Math.max(maxX, d.cx + pad); maxY = Math.max(maxY, d.cy + pad);
  }

  const ox = Math.floor(minX), oy = Math.floor(minY);
  const w = Math.max(1, Math.ceil(maxX) - ox);
  const h = Math.max(1, Math.ceil(maxY) - oy);
  const alpha = new Uint8Array(w * h);
  const sharp = size < 20 ? 1.18 : 1.02;

  for (let y = 0; y < h; y++) {
    const py = oy + y + 0.5;
    for (let x = 0; x < w; x++) {
      const px = ox + x + 0.5;
      let sd = Infinity;
      for (let k = 0; k < segs.length; k++) {
        const s = segs[k]!;
        const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
        const l2 = dx * dx + dy * dy;
        let t = ((px - s.x1) * dx + (py - s.y1) * dy) / l2;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const dist = Math.hypot(px - (s.x1 + t * dx), py - (s.y1 + t * dy)) - s.r;
        if (dist < sd) sd = dist;
      }
      for (let k = 0; k < dots.length; k++) {
        const d = dots[k]!;
        const dist = Math.hypot(px - d.cx, py - d.cy) - d.r;
        if (dist < sd) sd = dist;
      }
      const cov = Math.max(0, Math.min(1, 0.5 - sd * sharp));
      if (cov > 0.004) alpha[y * w + x] = Math.round(cov * 255);
    }
  }

  if (bitmapCache.size >= 1024) bitmapCache.clear();
  const bmp: GlyphBitmap = { ox, oy, w, h, alpha };
  bitmapCache.set(key, bmp);
  return bmp;
}

function getBuffer(surface: SurfaceLike): Uint8Array | Uint8ClampedArray | null {
  return surface.data ?? surface.pixels ?? surface.buf ?? null;
}

function blitGlyph(
  surface: SurfaceLike,
  bmp: GlyphBitmap,
  dx: number,
  dy: number,
  rgba: [number, number, number, number],
  opacity: number,
): void {
  if (bmp.w === 0 || bmp.h === 0 || opacity <= 0) return;
  const buf = getBuffer(surface);
  const bx = Math.round(dx) + bmp.ox;
  const by = Math.round(dy) + bmp.oy;
  const [r, g, b, a] = rgba;
  const baseA = (a / 255) * opacity;

  for (let y = 0; y < bmp.h; y++) {
    const py = by + y;
    if (py < 0 || py >= surface.height) continue;
    const row = y * bmp.w;
    for (let x = 0; x < bmp.w; x++) {
      const cov = bmp.alpha[row + x]!;
      if (cov === 0) continue;
      const px = bx + x;
      if (px < 0 || px >= surface.width) continue;
      const sa = baseA * (cov / 255);
      if (sa <= 0) continue;
      if (buf) {
        const idx = (py * surface.width + px) * 4;
        const da = buf[idx + 3]! / 255;
        const outA = sa + da * (1 - sa);
        if (outA <= 0) continue;
        const inv = da * (1 - sa);
        buf[idx] = Math.round((r * sa + buf[idx]! * inv) / outA);
        buf[idx + 1] = Math.round((g * sa + buf[idx + 1]! * inv) / outA);
        buf[idx + 2] = Math.round((b * sa + buf[idx + 2]! * inv) / outA);
        buf[idx + 3] = Math.round(outA * 255);
      } else if (surface.blendPixel) {
        surface.blendPixel(px, py, r, g, b, Math.round(sa * 255));
      }
    }
  }
}

export function measureText(
  text: string,
  opts: Pick<TextStyle, "size" | "family" | "weight" | "tracking" | "letterSpacing">,
): { width: number; height: number; ascent: number; descent: number } {
  const size = Math.max(1, opts.size);
  const family = opts.family ?? "sans";
  const track = (opts.tracking ?? opts.letterSpacing ?? 0) + (isDisplayFamily(family) ? size * 0.025 : size * 0.035);
  const scale = size / 10;
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (i > 0) width += getKerning(text[i - 1]!, ch, size, family) + track;
    width += resolveGlyph(ch)[0] * scale;
  }
  return { width, height: size * 1.26, ascent: size, descent: size * 0.26 };
}

export function wrapText(
  text: string,
  maxWidth: number,
  opts: Pick<TextStyle, "size" | "family" | "weight" | "tracking" | "letterSpacing">,
): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let cur = words[0]!;
    for (let i = 1; i < words.length; i++) {
      const next = `${cur} ${words[i]!}`;
      if (measureText(next, opts).width <= maxWidth) cur = next;
      else {
        lines.push(cur);
        cur = words[i]!;
      }
    }
    lines.push(cur);
  }
  return lines;
}

export function measureWrappedText(text: string, maxWidth: number, opts: TextStyle): TextMetrics {
  const lines = maxWidth > 0 ? wrapText(text, maxWidth, opts) : text.split("\n");
  const lineStep = opts.size * (opts.lineHeight ?? 1.28);
  let maxW = 0;
  for (const line of lines) maxW = Math.max(maxW, measureText(line, opts).width);
  const height = lines.length > 0 ? opts.size + (lines.length - 1) * lineStep + opts.size * 0.26 : 0;
  return { width: maxW, height, ascent: opts.size, descent: opts.size * 0.26, lineCount: lines.length, lines };
}

function drawSingleLine(
  surface: SurfaceLike,
  line: string,
  x: number,
  topY: number,
  opts: TextStyle,
  rgba: [number, number, number, number],
  opacity: number,
): number {
  const size = Math.max(1, opts.size);
  const family = opts.family ?? "sans";
  const weightMul = normalizeWeight(opts.weight);
  const italic = Boolean(opts.italic);
  const track = (opts.tracking ?? opts.letterSpacing ?? 0) + (isDisplayFamily(family) ? size * 0.025 : size * 0.035);
  const scale = size / 10;
  const lineW = measureText(line, opts).width;
  let penX = x;
  if (opts.align === "center") penX -= lineW * 0.5;
  else if (opts.align === "right") penX -= lineW;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (i > 0) penX += getKerning(line[i - 1]!, ch, size, family) + track;
    if (ch !== " ") {
      const bmp = compileGlyph(ch, size, family, weightMul, italic);
      blitGlyph(surface, bmp, penX, topY, rgba, opacity);
    }
    penX += resolveGlyph(ch)[0] * scale;
  }
  return lineW;
}

export function drawText(
  surface: SurfaceLike,
  text: string,
  x: number,
  y: number,
  opts: TextStyle,
): TextMetrics {
  const lines = opts.maxWidth && opts.maxWidth > 0 ? wrapText(text, opts.maxWidth, opts) : text.split("\n");
  const size = Math.max(1, opts.size);
  const lineStep = size * (opts.lineHeight ?? 1.28);
  const totalH = lines.length > 0 ? size + (lines.length - 1) * lineStep : 0;
  const baseline = opts.baseline ?? "top";
  let startY = y;
  if (baseline === "alphabetic") startY = y - size;
  else if (baseline === "middle") startY = y - totalH * 0.5;
  else if (baseline === "bottom") startY = y - totalH;

  const rgba = parseColor(opts.color);
  const opacity = opts.alpha ?? 1;
  const shadowRgba = opts.shadow ? parseColor(opts.shadow.color) : null;
  const shadowAlpha = opts.shadow ? (opts.shadow.alpha ?? 0.6) * opacity : 0;

  let maxW = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineY = startY + i * lineStep;
    if (opts.shadow && shadowRgba) {
      drawSingleLine(surface, lines[i]!, x + opts.shadow.dx, lineY + opts.shadow.dy, opts, shadowRgba, shadowAlpha);
    }
    const w = drawSingleLine(surface, lines[i]!, x, lineY, opts, rgba, opacity);
    if (w > maxW) maxW = w;
  }
  return {
    width: maxW,
    height: totalH + size * 0.26,
    ascent: size,
    descent: size * 0.26,
    lineCount: lines.length,
    lines,
  };
}

export function drawWrappedText(
  surface: SurfaceLike,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  opts: TextStyle,
): TextMetrics {
  return drawText(surface, text, x, y, { ...opts, maxWidth });
}
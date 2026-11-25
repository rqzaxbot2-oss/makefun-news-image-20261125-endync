import { deflateSync } from "node:zlib";

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ColorStop {
  offset: number;
  color: RGBA;
}

export interface TextOptions {
  scale?: number;
  align?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  bold?: boolean;
  shadowColor?: RGBA;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function rgba(r: number, g: number, b: number, a = 255): RGBA {
  return {
    r: clamp(Math.round(r), 0, 255),
    g: clamp(Math.round(g), 0, 255),
    b: clamp(Math.round(b), 0, 255),
    a: clamp(Math.round(a), 0, 255),
  };
}

export function hex(code: string, alpha = 255): RGBA {
  const s = code.startsWith("#") ? code.slice(1) : code;
  if (s.length === 3) {
    return rgba(
      parseInt(s[0] + s[0], 16),
      parseInt(s[1] + s[1], 16),
      parseInt(s[2] + s[2], 16),
      alpha,
    );
  }
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  const a = s.length >= 8 ? parseInt(s.slice(6, 8), 16) : alpha;
  return rgba(r, g, b, a);
}

export function lerpColor(c1: RGBA, c2: RGBA, t: number): RGBA {
  const k = clamp(t, 0, 1);
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * k),
    g: Math.round(c1.g + (c2.g - c1.g) * k),
    b: Math.round(c1.b + (c2.b - c1.b) * k),
    a: Math.round(c1.a + (c2.a - c1.a) * k),
  };
}

export function sampleGradient(stops: ColorStop[], t: number): RGBA {
  if (stops.length === 0) return { r: 0, g: 0, b: 0, a: 255 };
  if (stops.length === 1 || t <= stops[0].offset) return stops[0].color;
  const last = stops[stops.length - 1];
  if (t >= last.offset) return last.color;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.offset && t <= b.offset) {
      const span = b.offset - a.offset;
      return lerpColor(a.color, b.color, span > 0 ? (t - a.offset) / span : 0);
    }
  }
  return last.color;
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, payload: Uint8Array): Buffer {
  const out = Buffer.allocUnsafe(12 + payload.length);
  out.writeUInt32BE(payload.length, 0);
  out.write(type, 4, 4, "ascii");
  out.set(payload, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + payload.length)), 8 + payload.length);
  return out;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function encodePng(width: number, height: number, pixels: Uint8Array): Buffer {
  if (pixels.length !== width * height * 4) {
    throw new Error(`Expected ${width * height * 4} RGBA bytes, got ${pixels.length}`);
  }
  let opaque = true;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] !== 255) {
      opaque = false;
      break;
    }
  }
  const bpp = opaque ? 3 : 4;
  const rowBytes = width * bpp;
  const raw = new Uint8Array(height * rowBytes);
  if (opaque) {
    for (let s = 0, d = 0; s < pixels.length; s += 4, d += 3) {
      raw[d] = pixels[s];
      raw[d + 1] = pixels[s + 1];
      raw[d + 2] = pixels[s + 2];
    }
  } else {
    raw.set(pixels);
  }

  const filtered = new Uint8Array(height * (rowBytes + 1));
  const cand = new Uint8Array(rowBytes);
  const best = new Uint8Array(rowBytes);
  for (let y = 0; y < height; y++) {
    const rowOff = y * rowBytes;
    const prevOff = (y - 1) * rowBytes;
    let bestType = 0;
    let bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      let score = 0;
      for (let i = 0; i < rowBytes; i++) {
        const cur = raw[rowOff + i];
        const a = i >= bpp ? raw[rowOff + i - bpp] : 0;
        const b = y > 0 ? raw[prevOff + i] : 0;
        const c = y > 0 && i >= bpp ? raw[prevOff + i - bpp] : 0;
        let v = cur;
        if (f === 1) v = (cur - a) & 0xff;
        else if (f === 2) v = (cur - b) & 0xff;
        else if (f === 3) v = (cur - ((a + b) >> 1)) & 0xff;
        else if (f === 4) v = (cur - paeth(a, b, c)) & 0xff;
        cand[i] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        bestType = f;
        best.set(cand);
      }
    }
    const outOff = y * (rowBytes + 1);
    filtered[outOff] = bestType;
    filtered.set(best, outOff + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = opaque ? 2 : 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = deflateSync(filtered, { level: 9 });
  return Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", Buffer.alloc(0))]);
}

// 5x7 crisp bitmap font for printable ASCII 32..126; each char is 7 base-32 rows (5 bits each).
const FONT_5X7: string[] = [
  "0000000", "4444404", "aa00000", "aavavaa", "4fke5u4", "pq48bj0", "cikclid", "4480000",
  "2488842", "8422248", "04lel40", "044v440", "0000cc8", "000v000", "00000cc", "122488g",
  "ejllphe", "4c4444e", "eh168gv", "eh161he", "26aiv22", "vgu11he", "68guhhe", "v124888",
  "ehhehhe", "ehhf12c", "00c00c0", "00c00c8", "248g842", "00v0v00", "8421248", "eh12404",
  "ehjnmgf", "ehhvhhh", "uhhuhhu", "ehggghe", "uhhhhhu", "vgguggv", "vgguggg", "ehggjhf",
  "hhhvhhh", "e44444e", "72222ic", "hikokih", "ggggggv", "hrllhhh", "hhpljhh", "ehhhhhe",
  "uhhuggg", "ehhhlid", "uhhukih", "ehge1he", "v444444", "hhhhhhe", "hhhhha4", "hhhllla",
  "hha4ahh", "hha4444", "v1248gv", "e88888e", "g884221", "e22222e", "4ah0000", "000000v",
  "8400000", "00e1fhf", "gguhhhu", "00egghe", "11fhhhf", "00ehvge", "68u8888", "00fhf1e",
  "gguhhhh", "40c444e", "20622ic", "ggikoki", "c44444e", "00qlllh", "00uhhhh", "00ehhhe",
  "00uhhug", "00fhhf1", "00moggg", "00fge1u", "88u8886", "00hhhhf", "00hhha4", "00hhlla",
  "00ha4ah", "00hhf1e", "00v248v", "6448446", "4444444", "c44244c", "00di000",
];

function glyphRows(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= 32 && code <= 126) return FONT_5X7[code - 32];
  if (ch === "\u2014" || ch === "\u2013") return FONT_5X7[45 - 32];
  if (ch === "\u2018" || ch === "\u2019") return FONT_5X7[39 - 32];
  if (ch === "\u201c" || ch === "\u201d") return FONT_5X7[34 - 32];
  if (ch === "\u2022") return "004e400";
  return FONT_5X7[63 - 32];
}

export class Canvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  constructor(width: number, height: number, bg?: RGBA) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.data = new Uint8Array(this.width * this.height * 4);
    if (bg) this.clear(bg);
  }

  clear(c: RGBA): void {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = c.r;
      this.data[i + 1] = c.g;
      this.data[i + 2] = c.b;
      this.data[i + 3] = c.a;
    }
  }

  setPixel(x: number, y: number, c: RGBA): void {
    const ix = x | 0;
    const iy = y | 0;
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    const idx = (iy * this.width + ix) * 4;
    this.data[idx] = c.r;
    this.data[idx + 1] = c.g;
    this.data[idx + 2] = c.b;
    this.data[idx + 3] = c.a;
  }

  getPixel(x: number, y: number): RGBA {
    const ix = clamp(x | 0, 0, this.width - 1);
    const iy = clamp(y | 0, 0, this.height - 1);
    const idx = (iy * this.width + ix) * 4;
    return { r: this.data[idx], g: this.data[idx + 1], b: this.data[idx + 2], a: this.data[idx + 3] };
  }

  blendPixel(x: number, y: number, c: RGBA, alphaScale = 1): void {
    const ix = x | 0;
    const iy = y | 0;
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    const sa = (c.a / 255) * clamp(alphaScale, 0, 1);
    if (sa <= 0) return;
    const idx = (iy * this.width + ix) * 4;
    if (sa >= 0.999) {
      this.data[idx] = c.r;
      this.data[idx + 1] = c.g;
      this.data[idx + 2] = c.b;
      this.data[idx + 3] = 255;
      return;
    }
    const da = this.data[idx + 3] / 255;
    const outA = sa + da * (1 - sa);
    if (outA <= 0) return;
    const inv = 1 / outA;
    this.data[idx] = Math.round((c.r * sa + this.data[idx] * da * (1 - sa)) * inv);
    this.data[idx + 1] = Math.round((c.g * sa + this.data[idx + 1] * da * (1 - sa)) * inv);
    this.data[idx + 2] = Math.round((c.b * sa + this.data[idx + 2] * da * (1 - sa)) * inv);
    this.data[idx + 3] = Math.round(outA * 255);
  }

  fillRect(x: number, y: number, w: number, h: number, c: RGBA): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) this.blendPixel(px, py, c);
    }
  }

  strokeRect(x: number, y: number, w: number, h: number, c: RGBA, thickness = 1): void {
    const t = Math.max(1, thickness);
    this.fillRect(x, y, w, t, c);
    this.fillRect(x, y + h - t, w, t, c);
    this.fillRect(x, y + t, t, Math.max(0, h - 2 * t), c);
    this.fillRect(x + w - t, y + t, t, Math.max(0, h - 2 * t), c);
  }

  fillRoundedRect(x: number, y: number, w: number, h: number, radius: number, c: RGBA): void {
    const r = clamp(radius, 0, Math.min(w, h) * 0.5);
    const x0 = Math.max(0, Math.floor(x - 1));
    const y0 = Math.max(0, Math.floor(y - 1));
    const x1 = Math.min(this.width - 1, Math.ceil(x + w + 1));
    const y1 = Math.min(this.height - 1, Math.ceil(y + h + 1));
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;
    const hx = w * 0.5 - r;
    const hy = h * 0.5 - r;
    for (let py = y0; py <= y1; py++) {
      const qy = Math.abs(py + 0.5 - cy) - hy;
      for (let px = x0; px <= x1; px++) {
        const qx = Math.abs(px + 0.5 - cx) - hx;
        const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
        if (d <= -0.5) this.blendPixel(px, py, c);
        else if (d < 0.5) this.blendPixel(px, py, c, 0.5 - d);
      }
    }
  }

  strokeRoundedRect(x: number, y: number, w: number, h: number, radius: number, c: RGBA, thickness = 1): void {
    const r = clamp(radius, 0, Math.min(w, h) * 0.5);
    const half = Math.max(0.5, thickness * 0.5);
    const pad = Math.ceil(half + 1);
    const x0 = Math.max(0, Math.floor(x - pad));
    const y0 = Math.max(0, Math.floor(y - pad));
    const x1 = Math.min(this.width - 1, Math.ceil(x + w + pad));
    const y1 = Math.min(this.height - 1, Math.ceil(y + h + pad));
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;
    const hx = w * 0.5 - r;
    const hy = h * 0.5 - r;
    for (let py = y0; py <= y1; py++) {
      const qy = Math.abs(py + 0.5 - cy) - hy;
      for (let px = x0; px <= x1; px++) {
        const qx = Math.abs(px + 0.5 - cx) - hx;
        const sdf = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
        const d = Math.abs(sdf) - half;
        if (d <= -0.5) this.blendPixel(px, py, c);
        else if (d < 0.5) this.blendPixel(px, py, c, 0.5 - d);
      }
    }
  }

  fillCircle(cx: number, cy: number, r: number, c: RGBA): void {
    const x0 = Math.max(0, Math.floor(cx - r - 1));
    const y0 = Math.max(0, Math.floor(cy - r - 1));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + r + 1));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + r + 1));
    for (let py = y0; py <= y1; py++) {
      const dy = py + 0.5 - cy;
      for (let px = x0; px <= x1; px++) {
        const d = Math.hypot(px + 0.5 - cx, dy) - r;
        if (d <= -0.5) this.blendPixel(px, py, c);
        else if (d < 0.5) this.blendPixel(px, py, c, 0.5 - d);
      }
    }
  }

  strokeCircle(cx: number, cy: number, r: number, c: RGBA, thickness = 1): void {
    const half = Math.max(0.5, thickness * 0.5);
    const pad = r + half + 1;
    const x0 = Math.max(0, Math.floor(cx - pad));
    const y0 = Math.max(0, Math.floor(cy - pad));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + pad));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + pad));
    for (let py = y0; py <= y1; py++) {
      const dy = py + 0.5 - cy;
      for (let px = x0; px <= x1; px++) {
        const d = Math.abs(Math.hypot(px + 0.5 - cx, dy) - r) - half;
        if (d <= -0.5) this.blendPixel(px, py, c);
        else if (d < 0.5) this.blendPixel(px, py, c, 0.5 - d);
      }
    }
  }

  fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGBA): void {
    if (rx <= 0 || ry <= 0) return;
    const x0 = Math.max(0, Math.floor(cx - rx - 1));
    const y0 = Math.max(0, Math.floor(cy - ry - 1));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + rx + 1));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + ry + 1));
    const minR = Math.min(rx, ry);
    for (let py = y0; py <= y1; py++) {
      const ny = (py + 0.5 - cy) / ry;
      for (let px = x0; px <= x1; px++) {
        const nx = (px + 0.5 - cx) / rx;
        const d = (Math.hypot(nx, ny) - 1) * minR;
        if (d <= -0.5) this.blendPixel(px, py, c);
        else if (d < 0.5) this.blendPixel(px, py, c, 0.5 - d);
      }
    }
  }

  drawLine(x0: number, y0: number, x1: number, y1: number, c: RGBA, thickness = 1): void {
    const half = Math.max(0.5, thickness * 0.5);
    const pad = half + 1;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - pad));
    const maxX = Math.min(this.width - 1, Math.ceil(Math.max(x0, x1) + pad));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - pad));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(y0, y1) + pad));
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenSq = dx * dx + dy * dy;
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const rx = px + 0.5 - x0;
        const ry = py + 0.5 - y0;
        const t = lenSq > 0 ? clamp((rx * dx + ry * dy) / lenSq, 0, 1) : 0;
        const d = Math.hypot(rx - dx * t, ry - dy * t) - half;
        if (d <= -0.5) this.blendPixel(px, py, c);
        else if (d < 0.5) this.blendPixel(px, py, c, 0.5 - d);
      }
    }
  }

  drawPolyline(points: Array<[number, number]>, c: RGBA, thickness = 1, closed = false): void {
    if (points.length < 2) return;
    for (let i = 0; i < points.length - 1; i++) {
      this.drawLine(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], c, thickness);
    }
    if (closed && points.length > 2) {
      const last = points[points.length - 1];
      this.drawLine(last[0], last[1], points[0][0], points[0][1], c, thickness);
    }
  }

  drawArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, c: RGBA, thickness = 1): void {
    const span = Math.abs(endAngle - startAngle);
    const steps = Math.max(8, Math.ceil((span * Math.max(r, 8)) / 4));
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + ((endAngle - startAngle) * i) / steps;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    this.drawPolyline(pts, c, thickness, false);
  }

  fillPolygon(points: Array<[number, number]>, c: RGBA): void {
    const n = points.length;
    if (n < 3) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const [px, py] = points[i];
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    const x0 = Math.max(0, Math.floor(minX));
    const x1 = Math.min(this.width - 1, Math.ceil(maxX));
    const y0 = Math.max(0, Math.floor(minY));
    const y1 = Math.min(this.height - 1, Math.ceil(maxY));
    const sub = [0.25, 0.75];
    const xs: number[] = [];
    for (let py = y0; py <= y1; py++) {
      const counts = new Uint8Array(x1 - x0 + 1);
      for (let sy = 0; sy < 2; sy++) {
        const y = py + sub[sy];
        xs.length = 0;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const [xi, yi] = points[i];
          const [xj, yj] = points[j];
          if ((yi > y) !== (yj > y)) {
            xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
          }
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const left = xs[k];
          const right = xs[k + 1];
          const sx0 = Math.max(x0, Math.floor(left));
          const sx1 = Math.min(x1, Math.ceil(right));
          for (let px = sx0; px <= sx1; px++) {
            if (px + 0.25 >= left && px + 0.25 < right) counts[px - x0]++;
            if (px + 0.75 >= left && px + 0.75 < right) counts[px - x0]++;
          }
        }
      }
      for (let px = x0; px <= x1; px++) {
        const hits = counts[px - x0];
        if (hits > 0) this.blendPixel(px, py, c, hits * 0.25);
      }
    }
  }

  fillLinearGradient(
    x: number, y: number, w: number, h: number,
    x0: number, y0: number, x1: number, y1: number, stops: ColorStop[],
  ): void {
    const rx0 = Math.max(0, Math.floor(x));
    const ry0 = Math.max(0, Math.floor(y));
    const rx1 = Math.min(this.width, Math.ceil(x + w));
    const ry1 = Math.min(this.height, Math.ceil(y + h));
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenSq = dx * dx + dy * dy || 1;
    for (let py = ry0; py < ry1; py++) {
      const uy = py + 0.5 - y0;
      for (let px = rx0; px < rx1; px++) {
        const t = ((px + 0.5 - x0) * dx + uy * dy) / lenSq;
        this.blendPixel(px, py, sampleGradient(stops, t));
      }
    }
  }

  fillRadialGradient(
    cx: number, cy: number, r0: number, r1: number, stops: ColorStop[],
    bounds?: { x: number; y: number; w: number; h: number },
  ): void {
    const x0 = bounds ? Math.max(0, Math.floor(bounds.x)) : Math.max(0, Math.floor(cx - r1));
    const y0 = bounds ? Math.max(0, Math.floor(bounds.y)) : Math.max(0, Math.floor(cy - r1));
    const x1 = bounds ? Math.min(this.width, Math.ceil(bounds.x + bounds.w)) : Math.min(this.width, Math.ceil(cx + r1));
    const y1 = bounds ? Math.min(this.height, Math.ceil(bounds.y + bounds.h)) : Math.min(this.height, Math.ceil(cy + r1));
    const span = Math.max(1e-6, r1 - r0);
    for (let py = y0; py < y1; py++) {
      const dy = py + 0.5 - cy;
      for (let px = x0; px < x1; px++) {
        const d = Math.hypot(px + 0.5 - cx, dy);
        if (d <= r1) this.blendPixel(px, py, sampleGradient(stops, (d - r0) / span));
      }
    }
  }

  measureText(text: string, scale = 1, letterSpacing = 1): { width: number; height: number } {
    const s = Math.max(1, Math.round(scale));
    const step = (5 + letterSpacing) * s;
    const width = text.length > 0 ? text.length * step - letterSpacing * s : 0;
    return { width, height: 7 * s };
  }

  drawText(text: string, x: number, y: number, c: RGBA, opts: TextOptions = {}): void {
    const s = Math.max(1, Math.round(opts.scale ?? 1));
    const spacing = opts.letterSpacing ?? 1;
    const { width } = this.measureText(text, s, spacing);
    let ox = Math.round(x);
    if (opts.align === "center") ox = Math.round(x - width * 0.5);
    else if (opts.align === "right") ox = Math.round(x - width);
    const oy = Math.round(y);
    if (opts.shadowColor) {
      this.drawText(text, ox + (opts.shadowOffsetX ?? s), oy + (opts.shadowOffsetY ?? s), opts.shadowColor, {
        ...opts, align: "left", shadowColor: undefined,
      });
    }
    const step = (5 + spacing) * s;
    for (let i = 0; i < text.length; i++) {
      const rows = glyphRows(text[i]);
      const gx = ox + i * step;
      for (let r = 0; r < 7; r++) {
        const bits = parseInt(rows[r], 32);
        for (let col = 0; col < 5; col++) {
          if (((bits >> (4 - col)) & 1) !== 0) {
            this.fillRect(gx + col * s, oy + r * s, opts.bold ? s + 1 : s, s, c);
          }
        }
      }
    }
  }

  drawWrappedText(text: string, x: number, y: number, maxWidth: number, c: RGBA, opts: TextOptions = {}): number {
    const s = Math.max(1, Math.round(opts.scale ?? 1));
    const spacing = opts.letterSpacing ?? 1;
    const lineH = opts.lineHeight ?? Math.round(10 * s);
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (cur && this.measureText(next, s, spacing).width > maxWidth) {
        lines.push(cur);
        cur = w;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);
    let cy = y;
    for (const line of lines) {
      this.drawText(line, x, cy, c, opts);
      cy += lineH;
    }
    return cy;
  }

  toPng(): Buffer {
    return encodePng(this.width, this.height, this.data);
  }
}
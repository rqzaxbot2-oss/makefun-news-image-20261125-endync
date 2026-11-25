import { deflateSync } from "node:zlib";

export type RGBA = readonly [number, number, number, number];
export type Point = readonly [number, number] | { readonly x: number; readonly y: number };
export interface ColorStop {
  readonly offset: number;
  readonly color: RGBA;
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c >>> 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function clampByte(v: number): number {
  return v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v);
}

function ptX(p: Point): number {
  return Array.isArray(p) ? p[0] : (p as { readonly x: number }).x;
}

function ptY(p: Point): number {
  return Array.isArray(p) ? p[1] : (p as { readonly y: number }).y;
}

export function rgba(r: number, g: number, b: number, a = 255): RGBA {
  return [clampByte(r), clampByte(g), clampByte(b), clampByte(a)];
}

export function hex(input: string, alpha?: number): RGBA {
  const s = input.startsWith("#") ? input.slice(1) : input;
  if (s.length === 3) {
    const r = parseInt(s[0] + s[0], 16);
    const g = parseInt(s[1] + s[1], 16);
    const b = parseInt(s[2] + s[2], 16);
    return [r, g, b, alpha === undefined ? 255 : clampByte(alpha)];
  }
  const r = parseInt(s.slice(0, 2), 16) || 0;
  const g = parseInt(s.slice(2, 4), 16) || 0;
  const b = parseInt(s.slice(4, 6), 16) || 0;
  const a = alpha !== undefined ? clampByte(alpha) : s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255;
  return [r, g, b, a];
}

export function lerpColor(c0: RGBA, c1: RGBA, t: number): RGBA {
  const u = clamp(t, 0, 1);
  return [
    clampByte(c0[0] + (c1[0] - c0[0]) * u),
    clampByte(c0[1] + (c1[1] - c0[1]) * u),
    clampByte(c0[2] + (c1[2] - c0[2]) * u),
    clampByte(c0[3] + (c1[3] - c0[3]) * u),
  ];
}

export function sampleStops(stops: readonly ColorStop[], t: number): RGBA {
  if (stops.length === 0) return [0, 0, 0, 0];
  const u = clamp(t, 0, 1);
  if (u <= stops[0].offset) return stops[0].color;
  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1];
    const curr = stops[i];
    if (u <= curr.offset) {
      const span = curr.offset - prev.offset;
      return lerpColor(prev.color, curr.color, span > 1e-9 ? (u - prev.offset) / span : 1);
    }
  }
  return stops[stops.length - 1].color;
}

function crc32(buf: Uint8Array, start: number, end: number): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, payload: Uint8Array): Buffer {
  const out = Buffer.allocUnsafe(12 + payload.length);
  out.writeUInt32BE(payload.length, 0);
  out.write(type, 4, 4, "ascii");
  if (payload.length > 0) out.set(payload, 8);
  out.writeUInt32BE(crc32(out, 4, 8 + payload.length), 8 + payload.length);
  return out;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function encodePNG(width: number, height: number, pixels: Uint8Array): Buffer {
  if (pixels.length < width * height * 4) {
    throw new Error(`Pixel buffer too small: expected ${width * height * 4}, got ${pixels.length}`);
  }
  let opaque = true;
  for (let i = 3; i < width * height * 4; i += 4) {
    if (pixels[i] !== 255) {
      opaque = false;
      break;
    }
  }
  const bpp = opaque ? 3 : 4;
  const colorType = opaque ? 2 : 6;
  const stride = width * bpp;
  const filtered = Buffer.allocUnsafe(height * (stride + 1));
  const cur = new Uint8Array(stride);
  const prev = new Uint8Array(stride);
  const cand = [
    new Uint8Array(stride),
    new Uint8Array(stride),
    new Uint8Array(stride),
    new Uint8Array(stride),
    new Uint8Array(stride),
  ];

  for (let y = 0; y < height; y++) {
    const srcRow = y * width * 4;
    if (opaque) {
      for (let x = 0, si = srcRow, di = 0; x < width; x++, si += 4, di += 3) {
        cur[di] = pixels[si];
        cur[di + 1] = pixels[si + 1];
        cur[di + 2] = pixels[si + 2];
      }
    } else {
      cur.set(pixels.subarray(srcRow, srcRow + stride));
    }

    let bestF = 0;
    let bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      const dst = cand[f];
      let score = 0;
      for (let i = 0; i < stride; i++) {
        const raw = cur[i];
        const a = i >= bpp ? cur[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        let v = raw;
        if (f === 1) v = (raw - a) & 0xff;
        else if (f === 2) v = (raw - b) & 0xff;
        else if (f === 3) v = (raw - ((a + b) >> 1)) & 0xff;
        else if (f === 4) v = (raw - paeth(a, b, c)) & 0xff;
        dst[i] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        bestF = f;
      }
    }

    const rowOut = y * (stride + 1);
    filtered[rowOut] = bestF;
    filtered.set(cand[bestF], rowOut + 1);
    prev.set(cur);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = deflateSync(filtered, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, makeChunk("IHDR", ihdr), makeChunk("IDAT", compressed), makeChunk("IEND", Buffer.alloc(0))]);
}

export const encodePng = encodePNG;

export class Canvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  constructor(width: number, height: number, bg: RGBA = [0, 0, 0, 255]) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
    this.clear(bg);
  }

  clear(color: RGBA): void {
    const [r, g, b, a] = color;
    const d = this.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = a;
    }
  }

  setPixel(x: number, y: number, color: RGBA): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    this.data[i] = color[0];
    this.data[i + 1] = color[1];
    this.data[i + 2] = color[2];
    this.data[i + 3] = color[3];
  }

  getPixel(x: number, y: number): RGBA {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return [0, 0, 0, 0];
    const i = (y * this.width + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  blendPixel(x: number, y: number, color: RGBA, coverage = 1): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || coverage <= 0) return;
    const sa = (color[3] / 255) * (coverage >= 1 ? 1 : coverage);
    if (sa <= 0) return;
    const i = (y * this.width + x) * 4;
    const d = this.data;
    if (sa >= 0.9999) {
      d[i] = color[0];
      d[i + 1] = color[1];
      d[i + 2] = color[2];
      d[i + 3] = 255;
      return;
    }
    const da = d[i + 3] / 255;
    const invSa = 1 - sa;
    const oa = sa + da * invSa;
    if (oa <= 0) return;
    const invOa = 1 / oa;
    d[i] = clampByte((color[0] * sa + d[i] * da * invSa) * invOa);
    d[i + 1] = clampByte((color[1] * sa + d[i + 1] * da * invSa) * invOa);
    d[i + 2] = clampByte((color[2] * sa + d[i + 2] * da * invSa) * invOa);
    d[i + 3] = clampByte(oa * 255);
  }

  fillRect(x: number, y: number, w: number, h: number, color: RGBA): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width - 1, Math.ceil(x + w) - 1);
    const y1 = Math.min(this.height - 1, Math.ceil(y + h) - 1);
    for (let py = y0; py <= y1; py++) {
      const cy = clamp(Math.min(py + 1, y + h) - Math.max(py, y), 0, 1);
      for (let px = x0; px <= x1; px++) {
        const cx = clamp(Math.min(px + 1, x + w) - Math.max(px, x), 0, 1);
        this.blendPixel(px, py, color, cx * cy);
      }
    }
  }

  strokeRect(x: number, y: number, w: number, h: number, lineWidth: number, color: RGBA): void {
    this.strokeRoundedRect(x, y, w, h, 0, lineWidth, color);
  }

  fillRoundedRect(x: number, y: number, w: number, h: number, radius: number, color: RGBA): void {
    const r = clamp(radius, 0, Math.min(w, h) * 0.5);
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;
    const bx = w * 0.5 - r;
    const by = h * 0.5 - r;
    const x0 = Math.max(0, Math.floor(x - 1));
    const y0 = Math.max(0, Math.floor(y - 1));
    const x1 = Math.min(this.width - 1, Math.ceil(x + w + 1));
    const y1 = Math.min(this.height - 1, Math.ceil(y + h + 1));
    for (let py = y0; py <= y1; py++) {
      const qy = Math.abs(py + 0.5 - cy) - by;
      const my = qy > 0 ? qy : 0;
      for (let px = x0; px <= x1; px++) {
        const qx = Math.abs(px + 0.5 - cx) - bx;
        const mx = qx > 0 ? qx : 0;
        const dist = Math.hypot(mx, my) + Math.min(Math.max(qx, qy), 0) - r;
        const cov = clamp(0.5 - dist, 0, 1);
        if (cov > 0) this.blendPixel(px, py, color, cov);
      }
    }
  }

  strokeRoundedRect(x: number, y: number, w: number, h: number, radius: number, lineWidth: number, color: RGBA): void {
    const r = clamp(radius, 0, Math.min(w, h) * 0.5);
    const hw = lineWidth * 0.5;
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;
    const bx = w * 0.5 - r;
    const by = h * 0.5 - r;
    const pad = Math.ceil(hw + 1);
    const x0 = Math.max(0, Math.floor(x - pad));
    const y0 = Math.max(0, Math.floor(y - pad));
    const x1 = Math.min(this.width - 1, Math.ceil(x + w + pad));
    const y1 = Math.min(this.height - 1, Math.ceil(y + h + pad));
    for (let py = y0; py <= y1; py++) {
      const qy = Math.abs(py + 0.5 - cy) - by;
      const my = qy > 0 ? qy : 0;
      for (let px = x0; px <= x1; px++) {
        const qx = Math.abs(px + 0.5 - cx) - bx;
        const mx = qx > 0 ? qx : 0;
        const dist = Math.hypot(mx, my) + Math.min(Math.max(qx, qy), 0) - r;
        const cov = clamp(0.5 - (Math.abs(dist) - hw), 0, 1);
        if (cov > 0) this.blendPixel(px, py, color, cov);
      }
    }
  }

  fillCircle(cx: number, cy: number, r: number, color: RGBA): void {
    const x0 = Math.max(0, Math.floor(cx - r - 1));
    const y0 = Math.max(0, Math.floor(cy - r - 1));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + r + 1));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + r + 1));
    for (let py = y0; py <= y1; py++) {
      const dy = py + 0.5 - cy;
      for (let px = x0; px <= x1; px++) {
        const dist = Math.hypot(px + 0.5 - cx, dy) - r;
        const cov = clamp(0.5 - dist, 0, 1);
        if (cov > 0) this.blendPixel(px, py, color, cov);
      }
    }
  }

  strokeCircle(cx: number, cy: number, r: number, lineWidth: number, color: RGBA): void {
    const hw = lineWidth * 0.5;
    const x0 = Math.max(0, Math.floor(cx - r - hw - 1));
    const y0 = Math.max(0, Math.floor(cy - r - hw - 1));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + r + hw + 1));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + r + hw + 1));
    for (let py = y0; py <= y1; py++) {
      const dy = py + 0.5 - cy;
      for (let px = x0; px <= x1; px++) {
        const dist = Math.abs(Math.hypot(px + 0.5 - cx, dy) - r) - hw;
        const cov = clamp(0.5 - dist, 0, 1);
        if (cov > 0) this.blendPixel(px, py, color, cov);
      }
    }
  }

  fillEllipse(cx: number, cy: number, rx: number, ry: number, color: RGBA): void {
    if (rx <= 0 || ry <= 0) return;
    const x0 = Math.max(0, Math.floor(cx - rx - 1));
    const y0 = Math.max(0, Math.floor(cy - ry - 1));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + rx + 1));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + ry + 1));
    const invRx = 1 / rx;
    const invRy = 1 / ry;
    for (let py = y0; py <= y1; py++) {
      const ny = (py + 0.5 - cy) * invRy;
      for (let px = x0; px <= x1; px++) {
        const nx = (px + 0.5 - cx) * invRx;
        const k = Math.hypot(nx, ny);
        if (k < 1e-6) {
          this.blendPixel(px, py, color, 1);
          continue;
        }
        const grad = Math.hypot(nx * invRx, ny * invRy) / k;
        const dist = (k - 1) / grad;
        const cov = clamp(0.5 - dist, 0, 1);
        if (cov > 0) this.blendPixel(px, py, color, cov);
      }
    }
  }

  strokeEllipse(cx: number, cy: number, rx: number, ry: number, lineWidth: number, color: RGBA): void {
    if (rx <= 0 || ry <= 0) return;
    const hw = lineWidth * 0.5;
    const x0 = Math.max(0, Math.floor(cx - rx - hw - 1));
    const y0 = Math.max(0, Math.floor(cy - ry - hw - 1));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + rx + hw + 1));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + ry + hw + 1));
    const invRx = 1 / rx;
    const invRy = 1 / ry;
    for (let py = y0; py <= y1; py++) {
      const ny = (py + 0.5 - cy) * invRy;
      for (let px = x0; px <= x1; px++) {
        const nx = (px + 0.5 - cx) * invRx;
        const k = Math.hypot(nx, ny);
        if (k < 1e-6) continue;
        const grad = Math.hypot(nx * invRx, ny * invRy) / k;
        const dist = Math.abs((k - 1) / grad) - hw;
        const cov = clamp(0.5 - dist, 0, 1);
        if (cov > 0) this.blendPixel(px, py, color, cov);
      }
    }
  }

  drawLine(x0: number, y0: number, x1: number, y1: number, lineWidth: number, color: RGBA): void {
    const rad = lineWidth * 0.5;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - rad - 1));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - rad - 1));
    const maxX = Math.min(this.width - 1, Math.ceil(Math.max(x0, x1) + rad + 1));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(y0, y1) + rad + 1));
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    for (let py = minY; py <= maxY; py++) {
      const ry = py + 0.5 - y0;
      for (let px = minX; px <= maxX; px++) {
        const rx = px + 0.5 - x0;
        const t = len2 > 1e-8 ? clamp((rx * dx + ry * dy) / len2, 0, 1) : 0;
        const dist = Math.hypot(rx - t * dx, ry - t * dy) - rad;
        const cov = clamp(0.5 - dist, 0, 1);
        if (cov > 0) this.blendPixel(px, py, color, cov);
      }
    }
  }

  drawPolyline(points: readonly Point[], lineWidth: number, color: RGBA, closed = false): void {
    if (points.length < 2) return;
    for (let i = 0; i < points.length - 1; i++) {
      this.drawLine(ptX(points[i]), ptY(points[i]), ptX(points[i + 1]), ptY(points[i + 1]), lineWidth, color);
    }
    if (closed && points.length > 2) {
      const last = points[points.length - 1];
      this.drawLine(ptX(last), ptY(last), ptX(points[0]), ptY(points[0]), lineWidth, color);
    }
  }

  drawArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, lineWidth: number, color: RGBA): void {
    const span = endAngle - startAngle;
    const steps = Math.max(8, Math.ceil((Math.abs(span) * Math.max(r, 1)) / 2));
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (span * i) / steps;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    this.drawPolyline(pts, lineWidth, color, false);
  }

  drawQuadBezier(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, lineWidth: number, color: RGBA): void {
    const approx = Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy);
    const steps = Math.max(8, Math.ceil(approx / 2.5));
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      pts.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]);
    }
    this.drawPolyline(pts, lineWidth, color, false);
  }

  drawCubicBezier(
    x0: number,
    y0: number,
    cx0: number,
    cy0: number,
    cx1: number,
    cy1: number,
    x1: number,
    y1: number,
    lineWidth: number,
    color: RGBA,
  ): void {
    const approx = Math.hypot(cx0 - x0, cy0 - y0) + Math.hypot(cx1 - cx0, cy1 - cy0) + Math.hypot(x1 - cx1, y1 - cy1);
    const steps = Math.max(10, Math.ceil(approx / 2.5));
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * cx0 + 3 * u * t * t * cx1 + t * t * t * x1;
      const y = u * u * u * y0 + 3 * u * u * t * cy0 + 3 * u * t * t * cy1 + t * t * t * y1;
      pts.push([x, y]);
    }
    this.drawPolyline(pts, lineWidth, color, false);
  }

  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: RGBA): void {
    this.fillPolygon([[x0, y0], [x1, y1], [x2, y2]], color);
  }

  fillPolygon(points: readonly Point[], color: RGBA): void {
    const n = points.length;
    if (n < 3) return;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = ptX(points[i]);
      const y = ptY(points[i]);
      xs[i] = x;
      ys[i] = y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const x0 = Math.max(0, Math.floor(minX));
    const y0 = Math.max(0, Math.floor(minY));
    const x1 = Math.min(this.width - 1, Math.ceil(maxX));
    const y1 = Math.min(this.height - 1, Math.ceil(maxY));
    if (x0 > x1 || y0 > y1) return;
    const spanW = x1 - x0 + 1;
    const covRow = new Uint8Array(spanW);
    const nodes: number[] = [];

    for (let py = y0; py <= y1; py++) {
      covRow.fill(0);
      for (let sy = 0; sy < 4; sy++) {
        const y = py + (sy + 0.5) * 0.25;
        nodes.length = 0;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const yi = ys[i];
          const yj = ys[j];
          if ((yi <= y && yj > y) || (yj <= y && yi > y)) {
            nodes.push(xs[i] + ((y - yi) * (xs[j] - xs[i])) / (yj - yi));
          }
        }
        nodes.sort((a, b) => a - b);
        for (let k = 0; k + 1 < nodes.length; k += 2) {
          const xa = nodes[k];
          const xb = nodes[k + 1];
          const pxStart = Math.max(x0, Math.floor(xa));
          const pxEnd = Math.min(x1, Math.floor(xb));
          for (let px = pxStart; px <= pxEnd; px++) {
            let hits = 0;
            if (px + 0.125 >= xa && px + 0.125 < xb) hits++;
            if (px + 0.375 >= xa && px + 0.375 < xb) hits++;
            if (px + 0.625 >= xa && px + 0.625 < xb) hits++;
            if (px + 0.875 >= xa && px + 0.875 < xb) hits++;
            covRow[px - x0] += hits;
          }
        }
      }
      for (let dx = 0; dx < spanW; dx++) {
        const c = covRow[dx];
        if (c > 0) this.blendPixel(x0 + dx, py, color, c / 16);
      }
    }
  }

  strokePolygon(points: readonly Point[], lineWidth: number, color: RGBA): void {
    this.drawPolyline(points, lineWidth, color, true);
  }

  fillLinearGradient(
    x: number,
    y: number,
    w: number,
    h: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    stops: readonly ColorStop[],
  ): void {
    const px0 = Math.max(0, Math.floor(x));
    const py0 = Math.max(0, Math.floor(y));
    const px1 = Math.min(this.width - 1, Math.ceil(x + w) - 1);
    const py1 = Math.min(this.height - 1, Math.ceil(y + h) - 1);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    const invLen2 = len2 > 1e-8 ? 1 / len2 : 0;
    for (let py = py0; py <= py1; py++) {
      const ry = py + 0.5 - y0;
      for (let px = px0; px <= px1; px++) {
        const t = ((px + 0.5 - x0) * dx + ry * dy) * invLen2;
        this.blendPixel(px, py, sampleStops(stops, t), 1);
      }
    }
  }

  fillRadialGradient(cx: number, cy: number, r0: number, r1: number, stops: readonly ColorStop[]): void {
    const maxR = Math.max(r0, r1);
    const x0 = Math.max(0, Math.floor(cx - maxR - 1));
    const y0 = Math.max(0, Math.floor(cy - maxR - 1));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + maxR + 1));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + maxR + 1));
    const span = r1 - r0;
    const invSpan = Math.abs(span) > 1e-8 ? 1 / span : 0;
    for (let py = y0; py <= y1; py++) {
      const dy = py + 0.5 - cy;
      for (let px = x0; px <= x1; px++) {
        const d = Math.hypot(px + 0.5 - cx, dy);
        if (d > maxR) continue;
        const t = invSpan !== 0 ? (d - r0) * invSpan : 1;
        this.blendPixel(px, py, sampleStops(stops, t), 1);
      }
    }
  }

  drawGlow(cx: number, cy: number, radius: number, color: RGBA, power = 2): void {
    if (radius <= 0) return;
    const x0 = Math.max(0, Math.floor(cx - radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + radius));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + radius));
    const invR = 1 / radius;
    for (let py = y0; py <= y1; py++) {
      const dy = py + 0.5 - cy;
      for (let px = x0; px <= x1; px++) {
        const u = 1 - Math.hypot(px + 0.5 - cx, dy) * invR;
        if (u > 0) this.blendPixel(px, py, color, Math.pow(u, power));
      }
    }
  }

  toPNG(): Buffer {
    return encodePNG(this.width, this.height, this.data);
  }

  toPng(): Buffer {
    return this.toPNG();
  }
}
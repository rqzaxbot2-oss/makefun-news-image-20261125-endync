import { deflateSync } from "node:zlib";

export const ARTWORK_WIDTH = 1024;
export const ARTWORK_HEIGHT = 1024;

export interface ArtworkSurface {
  width: number;
  height: number;
  data: Uint8Array;
  pixels: Uint8Array;
  rgba: Uint8Array;
}

export interface NewsStory {
  id: number;
  kicker: string;
  title1: string;
  title2: string;
  body1: string;
  body2: string;
  accent: [number, number, number];
  lat: number;
  lon: number;
  icon: "treaty" | "market" | "chip" | "orbit" | "grid" | "health";
}

export interface ArtworkOptions {
  width?: number;
  height?: number;
  target?: Uint8Array | { data?: Uint8Array; pixels?: Uint8Array; rgba?: Uint8Array; setPixel?: (x: number, y: number, r: number, g: number, b: number, a?: number) => void };
}

export const WORLD_STORIES: NewsStory[] = [
  { id: 1, kicker: "1. CLIMATE & TRADE", title1: "GLOBAL CLEAN GRID", title2: "ACCORD SIGNED", body1: "142 NATIONS SIGN", body2: "TARIFF & GRID PACT", accent: [184, 50, 39], lat: 46, lon: 6, icon: "treaty" },
  { id: 2, kicker: "2. WORLD MARKETS", title1: "CENTRAL BANKS", title2: "HOLD RATES STEADY", body1: "INFLATION COOLS", body2: "ACROSS G20 IN Q4", accent: [181, 132, 37], lat: 39, lon: -54, icon: "market" },
  { id: 3, kicker: "3. TECH & AI", title1: "OPEN AI SAFETY", title2: "AUDIT STANDARD", body1: "GLOBAL LABS ADOPT SHARED", body2: "FRONTIER MODEL BENCHMARKS", accent: [30, 96, 145], lat: 13, lon: 77, icon: "chip" },
  { id: 4, kicker: "4. SPACE & SCIENCE", title1: "LUNAR RELAY NET", title2: "ENTERS FULL ORBIT", body1: "NEW SATELLITE RING LINKS", body2: "SOUTH POLE GROUND BASES", accent: [107, 63, 160], lat: 45, lon: 62, icon: "orbit" },
  { id: 5, kicker: "5. ENERGY & TRANSIT", title1: "NORTH SEA HVDC", title2: "CORRIDOR ONLINE", body1: "OFFSHORE WIND GRID LINK", body2: "POWERS 4M EUROPEAN HOMES", accent: [27, 127, 110], lat: 58, lon: 3, icon: "grid" },
  { id: 6, kicker: "6. PUBLIC HEALTH", title1: "SOLAR COLD-CHAIN", title2: "CLINIC ROLLOUT", body1: "RAPID VACCINE MICRO-HUBS", body2: "OPEN ACROSS 18 COUNTRIES", accent: [196, 90, 44], lat: -2, lon: 37, icon: "health" },
];

const FONT: Record<string, string> = {
  A: "0E11111F111111", B: "1E11111E11111E", C: "0E11101010110E", D: "1E11111111111E",
  E: "1F10101E10101F", F: "1F10101E101010", G: "0E11101711110F", H: "1111111F111111",
  I: "0E04040404040E", J: "0702020212120C", K: "11121418141211", L: "1010101010101F",
  M: "111B1515111111", N: "11191513111111", O: "0E11111111110E", P: "1E11111E101010",
  Q: "0E11111115120D", R: "1E11111E141211", S: "0F10100E01011E", T: "1F040404040404",
  U: "1111111111110E", V: "11111111110A04", W: "11111115151B11", X: "11110A040A1111",
  Y: "11110A04040404", Z: "1F01020408101F", "0": "0E11131519110E", "1": "040C040404040E",
  "2": "0E11010608101F", "3": "1E01010E01011E", "4": "02060A121F0202", "5": "1F101E0101110E",
  "6": "0E101E1111110E", "7": "1F010204080808", "8": "0E11110E11110E", "9": "0E11110F01021C",
  "-": "0000001F000000", ".": "00000000000C0C", ",": "00000000000408", ":": "00040400040400",
  "/": "01020204080810", "&": "0C12140815120D", "|": "04040404040404", "+": "0004041F040400",
  " ": "00000000000000",
};

type RGB = [number, number, number];

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

class Painter {
  w: number;
  h: number;
  buf: Uint8Array;

  constructor(w: number, h: number, buf: Uint8Array) {
    this.w = w;
    this.h = h;
    this.buf = buf;
  }

  blend(x: number, y: number, c: RGB, a = 1): void {
    const ix = x | 0;
    const iy = y | 0;
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h || a <= 0) return;
    const i = (iy * this.w + ix) * 4;
    if (a >= 0.999) {
      this.buf[i] = c[0];
      this.buf[i + 1] = c[1];
      this.buf[i + 2] = c[2];
      this.buf[i + 3] = 255;
      return;
    }
    const inv = 1 - a;
    this.buf[i] = (this.buf[i] * inv + c[0] * a + 0.5) | 0;
    this.buf[i + 1] = (this.buf[i + 1] * inv + c[1] * a + 0.5) | 0;
    this.buf[i + 2] = (this.buf[i + 2] * inv + c[2] * a + 0.5) | 0;
    this.buf[i + 3] = 255;
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, a = 1): void {
    const x0 = clamp(x | 0, 0, this.w);
    const y0 = clamp(y | 0, 0, this.h);
    const x1 = clamp((x + w) | 0, 0, this.w);
    const y1 = clamp((y + h) | 0, 0, this.h);
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) this.blend(px, py, c, a);
    }
  }

  frame(x: number, y: number, w: number, h: number, t: number, c: RGB, a = 1): void {
    this.rect(x, y, w, t, c, a);
    this.rect(x, y + h - t, w, t, c, a);
    this.rect(x, y + t, t, h - 2 * t, c, a);
    this.rect(x + w - t, y + t, t, h - 2 * t, c, a);
  }

  circle(cx: number, cy: number, r: number, c: RGB, a = 1): void {
    const x0 = Math.max(0, Math.floor(cx - r - 1));
    const x1 = Math.min(this.w - 1, Math.ceil(cx + r + 1));
    const y0 = Math.max(0, Math.floor(cy - r - 1));
    const y1 = Math.min(this.h - 1, Math.ceil(cy + r + 1));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const d = Math.hypot(px - cx, py - cy);
        if (d <= r + 0.8) {
          const cov = clamp(r + 0.6 - d, 0, 1);
          this.blend(px, py, c, a * cov);
        }
      }
    }
  }

  ring(cx: number, cy: number, r: number, thick: number, c: RGB, a = 1): void {
    const x0 = Math.max(0, Math.floor(cx - r - thick - 1));
    const x1 = Math.min(this.w - 1, Math.ceil(cx + r + thick + 1));
    const y0 = Math.max(0, Math.floor(cy - r - thick - 1));
    const y1 = Math.min(this.h - 1, Math.ceil(cy + r + thick + 1));
    const half = thick * 0.5;
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dist = Math.abs(Math.hypot(px - cx, py - cy) - r);
        if (dist <= half + 0.8) {
          const cov = clamp(half + 0.6 - dist, 0, 1);
          this.blend(px, py, c, a * cov);
        }
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, thick: number, c: RGB, a = 1): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5));
    const r = Math.max(0.6, thick * 0.5);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, c, a);
    }
  }

  text(str: string, x: number, y: number, scale: number, c: RGB, center = false): void {
    const up = str.toUpperCase();
    const totalW = up.length * 6 * scale - scale;
    let cx = center ? Math.round(x - totalW * 0.5) : Math.round(x);
    const cy = Math.round(y);
    for (let k = 0; k < up.length; k++) {
      const hex = FONT[up[k]] || FONT[" "];
      for (let row = 0; row < 7; row++) {
        const bits = parseInt(hex.slice(row * 2, row * 2 + 2), 16);
        for (let col = 0; col < 5; col++) {
          if ((bits >> (4 - col)) & 1) {
            this.rect(cx + col * scale, cy + row * scale, scale, scale, c);
          }
        }
      }
      cx += 6 * scale;
    }
  }
}

const LAND_BLOBS: Array<[number, number, number, number, number]> = [
  [0.82, -1.65, 0.34, 0.52, 1.0], [0.48, -1.45, 0.24, 0.26, 0.85], [-0.28, -1.05, 0.42, 0.22, 1.0],
  [1.24, -0.68, 0.16, 0.22, 0.85], [0.88, 0.22, 0.2, 0.34, 0.9], [1.06, 0.28, 0.16, 0.22, 0.78],
  [0.24, 0.32, 0.34, 0.38, 1.05], [-0.32, 0.42, 0.28, 0.18, 0.92], [0.46, 0.78, 0.18, 0.22, 0.88],
  [0.98, 1.35, 0.28, 0.82, 1.05], [0.42, 1.38, 0.22, 0.18, 0.9], [0.58, 1.85, 0.28, 0.42, 1.0],
  [0.16, 1.82, 0.18, 0.24, 0.72], [-0.44, 2.34, 0.22, 0.32, 0.92], [-1.42, 0.2, 0.18, 3.14, 0.95],
];

function landElevation(lat: number, lon: number): number {
  let e = 0;
  for (let i = 0; i < LAND_BLOBS.length; i++) {
    const [blat, blon, rlat, rlon, wt] = LAND_BLOBS[i];
    let dl = lon - blon;
    if (dl > Math.PI) dl -= 2 * Math.PI;
    if (dl < -Math.PI) dl += 2 * Math.PI;
    const d2 = ((lat - blat) / rlat) ** 2 + (dl / rlon) ** 2;
    if (d2 < 6) e += wt * Math.exp(-d2 * 1.15);
  }
  const detail = Math.sin(lat * 11 + lon * 7) * 0.08 + Math.cos(lat * 19 - lon * 13) * 0.045 + Math.sin(lat * 29 + lon * 23) * 0.025;
  return e + detail;
}

function drawGlobe(p: Painter, x: number, y: number, w: number, h: number): void {
  const cx = x + w * 0.5;
  const cy = y + h * 0.5 - 4;
  const r = 154;
  const centerLon = 0.24;

  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const dist = Math.hypot(px - cx, py - cy);
      const glow = Math.exp(-((dist - r) * (dist - r)) / 950) * 0.45;
      const vig = clamp(1 - dist / 340, 0, 1);
      const r0 = clamp(10 + vig * 14 + glow * 55, 0, 255) | 0;
      const g0 = clamp(21 + vig * 24 + glow * 115, 0, 255) | 0;
      const b0 = clamp(38 + vig * 38 + glow * 195, 0, 255) | 0;
      p.blend(px, py, [r0, g0, b0]);
    }
  }

  for (let s = 0; s < 54; s++) {
    const sx = x + 16 + ((s * 97 + 31) % (w - 32));
    const sy = y + 32 + ((s * 67 + 19) % (h - 64));
    if (Math.hypot(sx - cx, sy - cy) > r + 16) {
      p.circle(sx, sy, (s % 3 === 0 ? 1.3 : 0.8), [195, 220, 250], 0.45);
    }
  }

  const lx = -0.45;
  const ly = -0.42;
  const lz = 0.788;
  for (let py = Math.floor(cy - r - 1); py <= Math.ceil(cy + r + 1); py++) {
    for (let px = Math.floor(cx - r - 1); px <= Math.ceil(cx + r + 1); px++) {
      const dx = (px - cx) / r;
      const dy = (py - cy) / r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1.015) continue;
      const edge = clamp((1.0 - Math.sqrt(d2)) * r * 0.85 + 0.5, 0, 1);
      const dz = Math.sqrt(Math.max(0, 1 - d2));
      const lat = Math.asin(clamp(-dy, -1, 1));
      const lon = Math.atan2(dx, dz) + centerLon;
      const elev = landElevation(lat, lon);
      const ndotl = clamp(dx * lx + dy * ly + dz * lz, 0.16, 1.0);
      const rim = Math.pow(1 - dz, 2.7);
      let cr: number, cg: number, cb: number;
      if (elev > 0.48) {
        const polar = clamp((Math.abs(lat) - 1.12) * 3.8, 0, 1);
        const arid = clamp(1 - Math.abs(lat - 0.34) * 2.2, 0, 1) * clamp(1 - Math.abs(lon - 0.55) * 1.4, 0, 1);
        const hi = clamp((elev - 0.48) * 1.6, 0, 1);
        cr = 58 + hi * 46 + arid * 68;
        cg = 114 + hi * 28 + arid * 22;
        cb = 76 + hi * 14 - arid * 12;
        cr = cr * (1 - polar) + 228 * polar;
        cg = cg * (1 - polar) + 236 * polar;
        cb = cb * (1 - polar) + 244 * polar;
      } else {
        const shelf = clamp((elev - 0.28) * 4.5, 0, 1);
        const spec = Math.pow(clamp(dx * -0.22 + dy * -0.2 + dz * 0.95, 0, 1), 22) * 0.35;
        cr = 18 + shelf * 24 + spec * 180;
        cg = 52 + shelf * 46 + spec * 210;
        cb = 96 + shelf * 52 + spec * 240;
      }
      const grid = Math.abs(Math.sin(lat * 6)) < 0.022 || Math.abs(Math.sin((lon - centerLon) * 6)) < 0.022 ? 0.12 : 0;
      const rr = clamp(cr * ndotl + rim * 92 + grid * 160, 0, 255) | 0;
      const gg = clamp(cg * ndotl + rim * 165 + grid * 200, 0, 255) | 0;
      const bb = clamp(cb * ndotl + rim * 240 + grid * 235, 0, 255) | 0;
      p.blend(px, py, [rr, gg, bb], edge);
    }
  }

  const pts: Array<[number, number, NewsStory]> = [];
  for (const st of WORLD_STORIES) {
    const la = (st.lat * Math.PI) / 180;
    const lo = (st.lon * Math.PI) / 180 - centerLon;
    const pz = Math.cos(la) * Math.cos(lo);
    if (pz <= 0.05) continue;
    const px = cx + r * Math.cos(la) * Math.sin(lo);
    const py = cy - r * Math.sin(la);
    pts.push([px, py, st]);
  }
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const mx = (x0 + x1) * 0.5;
    const my = (y0 + y1) * 0.5 - 24;
    for (let s = 0; s < 24; s++) {
      const t0 = s / 24;
      const t1 = (s + 1) / 24;
      const ax = (1 - t0) ** 2 * x0 + 2 * (1 - t0) * t0 * mx + t0 ** 2 * x1;
      const ay = (1 - t0) ** 2 * y0 + 2 * (1 - t0) * t0 * my + t0 ** 2 * y1;
      const bx = (1 - t1) ** 2 * x0 + 2 * (1 - t1) * t1 * mx + t1 ** 2 * x1;
      const by = (1 - t1) ** 2 * y0 + 2 * (1 - t1) * t1 * my + t1 ** 2 * y1;
      p.line(ax, ay, bx, by, 1.4, [238, 204, 120], 0.42);
    }
  }
  for (const [px, py, st] of pts) {
    p.circle(px, py, 10, st.accent, 0.35);
    p.circle(px, py, 6.5, [250, 248, 240], 0.95);
    p.circle(px, py, 4.4, st.accent, 1);
  }

  p.frame(x, y, w, h, 2, [34, 58, 86]);
  p.text("GLOBAL FRONT PAGE - 6 DISPATCHES", cx, y + 12, 2, [225, 232, 242], true);
  p.text("UTC 18:00  |  PLANETARY BRIEFING", cx, y + h - 26, 2, [216, 184, 108], true);
}

function drawIcon(p: Painter, kind: NewsStory["icon"], x: number, y: number, w: number, h: number, acc: RGB): void {
  p.rect(x, y, w, h, [236, 231, 220]);
  p.frame(x, y, w, h, 1, [205, 198, 184]);
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  const dark: RGB = [26, 42, 64];
  if (kind === "treaty") {
    const heights = [26, 42, 34, 52];
    for (let i = 0; i < 4; i++) {
      const bx = x + 14 + i * 20;
      p.rect(bx, y + h - 14 - heights[i], 13, heights[i], i % 2 === 0 ? acc : dark);
    }
    p.line(x + 12, y + 20, x + w - 12, y + 12, 2.5, acc);
    p.circle(x + w - 14, y + 12, 4, acc);
  } else if (kind === "market") {
    for (let g = 1; g <= 3; g++) p.rect(x + 8, y + (h * g) / 4, w - 16, 1, [212, 206, 194]);
    const ys = [0.74, 0.62, 0.68, 0.44, 0.5, 0.28];
    for (let i = 0; i < ys.length - 1; i++) {
      const x0 = x + 12 + (i * (w - 24)) / (ys.length - 1);
      const x1 = x + 12 + ((i + 1) * (w - 24)) / (ys.length - 1);
      p.line(x0, y + h * ys[i], x1, y + h * ys[i + 1], 3, acc);
      p.circle(x1, y + h * ys[i + 1], 3.2, dark);
    }
  } else if (kind === "chip") {
    p.rect(cx - 20, cy - 20, 40, 40, dark);
    p.rect(cx - 12, cy - 12, 24, 24, acc);
    p.rect(cx - 5, cy - 5, 10, 10, [245, 241, 232]);
    for (let i = -14; i <= 14; i += 7) {
      p.rect(cx + i - 1, cy - 30, 3, 10, dark);
      p.rect(cx + i - 1, cy + 20, 3, 10, dark);
      p.rect(cx - 30, cy + i - 1, 10, 3, dark);
      p.rect(cx + 20, cy + i - 1, 10, 3, dark);
    }
  } else if (kind === "orbit") {
    p.circle(cx, cy, 16, dark);
    p.circle(cx - 4, cy - 4, 6, [180, 190, 210], 0.55);
    p.ring(cx, cy, 30, 2.5, acc);
    p.ring(cx, cy, 40, 1.5, [130, 120, 160], 0.7);
    p.circle(cx + 22, cy - 20, 5.5, acc);
    p.circle(cx - 30, cy + 26, 4.5, dark);
  } else if (kind === "grid") {
    for (let i = 0; i < 3; i++) {
      const px = x + 22 + i * 28;
      p.rect(px - 2, y + 34, 4, h - 46, dark);
      p.line(px, y + 34, px - 14, y + 20, 3, acc);
      p.line(px, y + 34, px + 16, y + 26, 3, acc);
      p.line(px, y + 34, px - 2, y + 50, 3, acc);
      p.circle(px, y + 34, 4, dark);
    }
    p.line(x + 12, y + h - 16, x + w - 12, y + h - 16, 3, acc);
  } else {
    p.circle(cx, cy - 4, 28, acc, 0.16);
    p.rect(cx - 7, cy - 24, 14, 40, acc);
    p.rect(cx - 20, cy - 11, 40, 14, acc);
    p.line(x + 10, y + h - 18, x + 32, y + h - 18, 2.5, dark);
    p.line(x + 32, y + h - 18, x + 44, y + h - 32, 2.5, dark);
    p.line(x + 44, y + h - 32, x + 56, y + h - 10, 2.5, dark);
    p.line(x + 56, y + h - 10, x + 68, y + h - 18, 2.5, dark);
    p.line(x + 68, y + h - 18, x + w - 10, y + h - 18, 2.5, dark);
  }
}

function drawHeroCard(p: Painter, st: NewsStory, x: number, y: number, w: number, h: number): void {
  p.rect(x + 3, y + 3, w, h, [215, 209, 196]);
  p.rect(x, y, w, h, [252, 249, 242]);
  p.rect(x, y, w, 7, st.accent);
  p.frame(x, y, w, h, 1, [196, 189, 175]);
  p.text(st.kicker, x + 16, y + 18, 2, st.accent);
  p.text(st.title1, x + 16, y + 42, 3, [18, 32, 51]);
  p.text(st.title2, x + 16, y + 70, 3, [18, 32, 51]);
  p.rect(x + 16, y + 98, w - 32, 1, [216, 210, 198]);
  p.text(st.body1, x + 16, y + 114, 2, [64, 74, 88]);
  p.text(st.body2, x + 16, y + 136, 2, [64, 74, 88]);
  p.text("DISPATCH VERIFIED", x + 16, y + h - 26, 2, st.accent);
  drawIcon(p, st.icon, x + w - 118, y + 106, 102, h - 118, st.accent);
}

function drawGridCard(p: Painter, st: NewsStory, x: number, y: number, w: number, h: number): void {
  p.rect(x + 3, y + 3, w, h, [215, 209, 196]);
  p.rect(x, y, w, h, [252, 249, 242]);
  p.rect(x, y, w, 7, st.accent);
  p.frame(x, y, w, h, 1, [196, 189, 175]);
  drawIcon(p, st.icon, x + 16, y + 22, 104, h - 38, st.accent);
  const tx = x + 136;
  p.text(st.kicker, tx, y + 20, 2, st.accent);
  p.text(st.title1, tx, y + 44, 3, [18, 32, 51]);
  p.text(st.title2, tx, y + 72, 3, [18, 32, 51]);
  p.rect(tx, y + 102, w - 154, 1, [216, 210, 198]);
  p.text(st.body1, tx, y + 114, 2, [64, 74, 88]);
  p.text(st.body2, tx, y + 136, 2, [64, 74, 88]);
}

export function composeArtwork(options?: ArtworkOptions | Uint8Array): ArtworkSurface {
  const opts = options instanceof Uint8Array ? { target: options } : options || {};
  const w = opts.width || ARTWORK_WIDTH;
  const h = opts.height || ARTWORK_HEIGHT;
  const t = opts.target;
  const targetBuf = t instanceof Uint8Array ? t : t && (t.rgba || t.data || t.pixels);
  const rgba = targetBuf && targetBuf.length >= w * h * 4 ? targetBuf : new Uint8Array(w * h * 4);
  const p = new Painter(w, h, rgba);

  p.rect(0, 0, w, h, [243, 238, 228]);
  p.frame(10, 10, w - 20, h - 20, 3, [24, 36, 54]);
  p.frame(16, 16, w - 32, h - 32, 1, [160, 148, 128]);

  p.rect(24, 24, w - 48, 112, [18, 32, 51]);
  p.rect(24, 136, w - 48, 4, [201, 154, 59]);
  p.rect(24, 140, w - 48, 3, [184, 50, 39]);
  p.text("GLOBAL EDITION", 40, 36, 2, [178, 192, 210]);
  p.text("NO. 2026-329", w - 188, 36, 2, [178, 192, 210]);
  p.text("WORLD NEWS DIGEST", w * 0.5, 58, 5, [250, 247, 240], true);
  p.text("WEDNESDAY  25 NOVEMBER 2026", w * 0.5, 108, 2, [232, 198, 112], true);

  drawGlobe(p, 24, 154, 560, 400);
  drawHeroCard(p, WORLD_STORIES[0], 598, 154, 402, 194);
  drawHeroCard(p, WORLD_STORIES[1], 598, 360, 402, 194);

  drawGridCard(p, WORLD_STORIES[2], 24, 568, 480, 178);
  drawGridCard(p, WORLD_STORIES[3], 520, 568, 480, 178);
  drawGridCard(p, WORLD_STORIES[4], 24, 758, 480, 178);
  drawGridCard(p, WORLD_STORIES[5], 520, 758, 480, 178);

  p.rect(24, 948, w - 48, 52, [18, 32, 51]);
  p.rect(24, 948, w - 48, 3, [201, 154, 59]);
  p.text("25 NOV 2026  |  DIPLOMACY  MARKETS  AI  SPACE  ENERGY  HEALTH", w * 0.5, 969, 2, [232, 236, 242], true);

  if (t && !(t instanceof Uint8Array) && typeof t.setPixel === "function") {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        t.setPixel(x, y, rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]);
      }
    }
  }
  return { width: w, height: h, data: rgba, pixels: rgba, rgba };
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let b = 0; b < 8; b++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length, false);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)), false);
  return out;
}

export function renderArtworkPng(options?: ArtworkOptions): Uint8Array {
  const { width, height, rgba } = composeArtwork(options);
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width, false);
  dv.setUint32(4, height, false);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, part) => n + part.length, 0);
  const png = new Uint8Array(total);
  let off = 0;
  for (const part of parts) {
    png.set(part, off);
    off += part.length;
  }
  return png;
}

export const renderArtwork = composeArtwork;
export const buildArtwork = composeArtwork;
export const createArtwork = composeArtwork;
export const drawArtwork = composeArtwork;
export default composeArtwork;
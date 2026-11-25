import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const W = 1024;
const H = 1024;
const MAX_BYTES = 1048576;
const img = new Uint8ClampedArray(W * H * 3);

type Pt = [number, number];
type RGB = [number, number, number];

const P = {
  ink: [246, 241, 231] as RGB,
  white: [255, 250, 242] as RGB,
  muted: [160, 184, 214] as RGB,
  navy0: [14, 24, 40] as RGB,
  navy1: [10, 18, 30] as RGB,
  hero0: [10, 19, 34] as RGB,
  hero1: [18, 34, 58] as RGB,
  panel: [16, 30, 51] as RGB,
  inset: [11, 21, 37] as RGB,
  bdr: [46, 74, 108] as RGB,
  bdrD: [36, 58, 88] as RGB,
  red: [200, 50, 43] as RGB,
  org: [226, 102, 28] as RGB,
  gold: [246, 158, 56] as RGB,
  teal: [40, 174, 174] as RGB,
  tealL: [82, 220, 214] as RGB,
  paper0: [244, 237, 225] as RGB,
  paper1: [236, 228, 214] as RGB,
  card: [250, 246, 238] as RGB,
  cardB: [214, 204, 186] as RGB,
  dark: [20, 28, 42] as RGB,
  body: [54, 66, 84] as RGB,
};

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

function blend(x: number, y: number, r: number, g: number, b: number, a = 1): void {
  if (x < 0 || x >= W || y < 0 || y >= H || a <= 0) return;
  const i = (y * W + x) * 3;
  if (a >= 1) { img[i] = r; img[i + 1] = g; img[i + 2] = b; return; }
  const ia = 1 - a;
  img[i] = img[i] * ia + r * a;
  img[i + 1] = img[i + 1] * ia + g * a;
  img[i + 2] = img[i + 2] * ia + b * a;
}

function rect(x: number, y: number, w: number, h: number, c: RGB, a = 1): void {
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w)), y1 = Math.min(H, Math.ceil(y + h));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) blend(px, py, c[0], c[1], c[2], a);
  }
}

function gradV(x: number, y: number, w: number, h: number, c0: RGB, c1: RGB): void {
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w)), y1 = Math.min(H, Math.ceil(y + h));
  const den = h > 1 ? h - 1 : 1;
  for (let py = y0; py < y1; py++) {
    const t = clamp((py - y) / den, 0, 1);
    const r = c0[0] + (c1[0] - c0[0]) * t;
    const g = c0[1] + (c1[1] - c0[1]) * t;
    const b = c0[2] + (c1[2] - c0[2]) * t;
    for (let px = x0; px < x1; px++) blend(px, py, r, g, b, 1);
  }
}

function drawRR(x: number, y: number, w: number, h: number, rad: number, c: RGB, a = 1, sw = 0): void {
  const hx = w * 0.5, hy = h * 0.5, cx = x + hx, cy = y + hy;
  const cr = Math.min(rad, hx, hy), hw = sw * 0.5, pad = sw > 0 ? sw + 1 : 1;
  const x0 = Math.max(0, Math.floor(x - pad)), y0 = Math.max(0, Math.floor(y - pad));
  const x1 = Math.min(W, Math.ceil(x + w + pad)), y1 = Math.min(H, Math.ceil(y + h + pad));
  for (let py = y0; py < y1; py++) {
    const qy = Math.abs(py + 0.5 - cy) - (hy - cr);
    const oy = Math.max(qy, 0);
    for (let px = x0; px < x1; px++) {
      const qx = Math.abs(px + 0.5 - cx) - (hx - cr);
      const s = Math.hypot(Math.max(qx, 0), oy) + Math.min(Math.max(qx, qy), 0) - cr;
      const cov = clamp(0.5 - (sw > 0 ? Math.abs(s) - hw : s), 0, 1);
      if (cov > 0) blend(px, py, c[0], c[1], c[2], a * cov);
    }
  }
}

function circ(cx: number, cy: number, rad: number, c: RGB, a = 1): void {
  const x0 = Math.max(0, Math.floor(cx - rad - 1)), y0 = Math.max(0, Math.floor(cy - rad - 1));
  const x1 = Math.min(W, Math.ceil(cx + rad + 1)), y1 = Math.min(H, Math.ceil(cy + rad + 1));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const cov = clamp(0.5 - (Math.hypot(px + 0.5 - cx, py + 0.5 - cy) - rad), 0, 1);
      if (cov > 0) blend(px, py, c[0], c[1], c[2], a * cov);
    }
  }
}

function line(x0: number, y0: number, x1: number, y1: number, sw: number, c: RGB, a = 1): void {
  const pad = sw + 2;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1) - pad));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1) + pad));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1) - pad));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1) + pad));
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy, hw = sw * 0.5;
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const t = l2 > 1e-6 ? clamp(((px + 0.5 - x0) * dx + (py + 0.5 - y0) * dy) / l2, 0, 1) : 0;
      const cov = clamp(0.5 - (Math.hypot(px + 0.5 - (x0 + t * dx), py + 0.5 - (y0 + t * dy)) - hw), 0, 1);
      if (cov > 0) blend(px, py, c[0], c[1], c[2], a * cov);
    }
  }
}

const FONT: Record<string, string> = {
  "0": "ehjlphe", "1": "4c4444e", "2": "eh168gv", "3": "eh161he", "4": "26aiv22",
  "5": "vgu11he", "6": "eguhhhe", "7": "v124888", "8": "ehhehhe", "9": "ehhf12c",
  A: "4ahvhhh", B: "uhhuhhu", C: "ehggghe", D: "sihhhis", E: "vgguggv", F: "vgguggg",
  G: "ehggnhe", H: "hhhvhhh", I: "e44444e", J: "7222iic", K: "hikokih", L: "ggggggv",
  M: "hrlhhhh", N: "hppljjh", O: "ehhhhhe", P: "uhhuggg", Q: "ehhhlid", R: "uhhukih",
  S: "ehge1he", T: "v444444", U: "hhhhhhe", V: "hhhhaa4", W: "hhhhlrh", X: "hha4ahh",
  Y: "hha4444", Z: "v1248gv", " ": "0000000", "-": "000e000", ".": "0000066",
  ":": "0040040", "/": "01248g0", "+": "004e400", "&": "cicliid", "%": "op248j3",
  ",": "0000448", "*": "00eee00",
};

function text(str: string, x: number, y: number, s: number, c: RGB, align: "l" | "c" | "r" = "l", a = 1): void {
  const up = str.toUpperCase();
  const adv = 6 * s, tw = up.length * adv - s;
  let sx = align === "c" ? Math.round(x - tw * 0.5) : align === "r" ? Math.round(x - tw) : Math.round(x);
  const sy = Math.round(y);
  for (let i = 0; i < up.length; i++) {
    const gl = FONT[up[i]] ?? FONT[" "];
    for (let row = 0; row < 7; row++) {
      const bits = parseInt(gl[row], 32);
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) rect(sx + col * s, sy + row * s, s, s, c, a);
      }
    }
    sx += adv;
  }
}

const LAND: Pt[][] = [
  [[-130, 55], [-105, 68], [-78, 62], [-55, 50], [-67, 44], [-80, 25], [-88, 18], [-97, 22], [-105, 20], [-117, 32], [-125, 48]],
  [[-52, 60], [-42, 60], [-20, 72], [-25, 82], [-55, 80], [-58, 70]],
  [[-24, 64], [-14, 64], [-15, 66], [-23, 66]],
  [[-79, 9], [-62, 10], [-50, 0], [-35, -6], [-38, -18], [-48, -26], [-58, -38], [-68, -54], [-74, -46], [-71, -18], [-81, -4]],
  [[-9, 37], [0, 39], [5, 43], [14, 45], [22, 38], [28, 41], [35, 46], [44, 54], [32, 68], [18, 69], [5, 61], [8, 54], [2, 51], [-5, 48], [-9, 43]],
  [[-6, 50], [2, 51], [1, 56], [-5, 58], [-8, 54]],
  [[-17, 15], [-12, 28], [-6, 36], [10, 37], [25, 31], [33, 31], [43, 12], [51, 11], [41, -2], [40, -16], [33, -26], [20, -35], [15, -28], [12, -14], [9, 4], [-8, 5], [-16, 11]],
  [[44, -25], [47, -25], [50, -13], [48, -12], [44, -18]],
  [[27, 41], [36, 36], [35, 31], [44, 13], [59, 22], [56, 26], [50, 30], [60, 25], [72, 22], [78, 8], [88, 22], [92, 40], [80, 58], [60, 68], [42, 66], [36, 47]],
];

function isLand(lon: number, lat: number): boolean {
  for (let p = 0; p < LAND.length; p++) {
    const poly = LAND[p];
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}

function drawGlobe(cx: number, cy: number, R: number): void {
  const d2r = Math.PI / 180, lon0 = -16 * d2r, tilt = 18 * d2r;
  const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
  const lx = -0.46, ly = 0.42, lz = 0.78, hl = Math.hypot(lx, ly, lz + 1);
  const pad = 34;
  const y0 = Math.max(0, Math.floor(cy - R - pad)), y1 = Math.min(H - 1, Math.ceil(cy + R + pad));
  const x0 = Math.max(0, Math.floor(cx - R - pad)), x1 = Math.min(W - 1, Math.ceil(cx + R + pad));

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const nx = (px + 0.5 - cx) / R, ny = (py + 0.5 - cy) / R, d2 = nx * nx + ny * ny;
      if (d2 > 1) {
        const halo = Math.exp(-(Math.sqrt(d2) - 1) * 14) * 0.58;
        if (halo > 0.004) {
          const sun = clamp(0.5 - nx * 0.55 - ny * 0.45, 0, 1);
          blend(px, py, 34 + sun * 95, 118 + sun * 72, 198 + sun * 44, halo);
        }
        continue;
      }
      const nz = Math.sqrt(1 - d2), sy = -ny;
      const y1p = sy * cosT + nz * sinT, z1p = -sy * sinT + nz * cosT;
      const lat = Math.asin(clamp(y1p, -1, 1)) / d2r;
      let lon = (Math.atan2(nx, z1p) + lon0) / d2r;
      if (lon < -180) lon += 360;
      else if (lon >= 180) lon -= 360;

      const n1 = Math.sin(lon * 0.19 + lat * 0.13) * Math.cos(lat * 0.21 - lon * 0.08);
      const n2 = Math.sin(lon * 0.43 - lat * 0.37) * 0.5;
      const land = isLand(lon, lat);
      const diff = clamp(nx * lx + sy * ly + nz * lz, 0, 1);
      const shade = 0.16 + 0.84 * Math.pow(diff, 0.82);

      let r: number, g: number, b: number;
      if (land) {
        const arid = clamp(1 - Math.abs(Math.abs(lat) - 24) / 17, 0, 1);
        const polar = clamp((Math.abs(lat) - 58) / 18, 0, 1);
        r = (58 + arid * 96 + n1 * 18) * (1 - polar) + 216 * polar;
        g = (106 + arid * 42 + n1 * 14) * (1 - polar) + 224 * polar;
        b = (68 + arid * 12 + n2 * 12) * (1 - polar) + 232 * polar;
      } else {
        const sh = clamp(0.5 + n1 * 0.35 + n2 * 0.2, 0, 1);
        r = 12 + sh * 16; g = 48 + sh * 38; b = 92 + sh * 46;
        const mLat = (((lat + 90) % 30) + 30) % 30, mLon = (((lon + 180) % 30) + 30) % 30;
        if (Math.abs(mLat - 15) > 14.45 || Math.abs(mLon - 15) > 14.45) {
          r = r * 0.72 + 34; g = g * 0.72 + 50; b = b * 0.72 + 62;
        }
      }
      r *= shade; g *= shade; b *= shade;

      if (!land) {
        const spec = Math.pow(clamp((nx * lx + sy * ly + nz * (lz + 1)) / hl, 0, 1), 24) * 0.36;
        r += spec * 200; g += spec * 225; b += spec * 255;
      } else if (diff < 0.28 && Math.abs(lat) < 58) {
        const city = Math.sin(lon * 1.9 + lat * 2.7) * Math.cos(lat * 3.3 - lon * 1.4);
        if (city > 0.62) {
          const glow = (0.28 - diff) * 3.2;
          r += 245 * glow; g += 172 * glow; b += 68 * glow;
        }
      }

      const cloud = clamp(Math.sin(lon * 0.12 + 0.9) * Math.cos(lat * 0.16 - 0.5) + n2 * 0.65 - 0.42, 0, 1);
      if (cloud > 0) {
        const ca = cloud * 0.34 * (0.35 + 0.65 * diff);
        r = r * (1 - ca) + 242 * ca; g = g * (1 - ca) + 246 * ca; b = b * (1 - ca) + 252 * ca;
      }

      const rim = Math.pow(1 - nz, 3.2);
      const edge = clamp((1 - Math.sqrt(d2)) * R, 0, 1);
      blend(px, py, r + rim * (68 + 80 * diff), g + rim * (148 + 56 * diff), b + rim * 235, edge);
    }
  }

  const proj = (latD: number, lonD: number, alt = 1): [number, number, number] => {
    const la = latD * d2r, lo = lonD * d2r - lon0;
    const x3 = Math.cos(la) * Math.sin(lo), y3 = Math.sin(la), z3 = Math.cos(la) * Math.cos(lo);
    const sy = y3 * cosT - z3 * sinT, sz = y3 * sinT + z3 * cosT;
    return [cx + x3 * R * alt, cy - sy * R * alt, sz];
  };
  const vis = (p: [number, number, number]): boolean => p[2] > 0 || (p[0] - cx) ** 2 + (p[1] - cy) ** 2 > R * R;

  const hubs: [number, number, RGB][] = [
    [40.7, -74, P.gold], [25.8, -80.2, P.gold], [51.5, -0.1, P.tealL],
    [36.9, 30.7, P.tealL], [6.5, 3.4, P.gold], [-23.5, -46.6, P.gold], [30, 31.2, P.tealL],
  ];
  const links: [number, number, RGB][] = [
    [0, 2, P.gold], [1, 5, P.gold], [2, 3, P.tealL], [0, 1, [245, 96, 78]],
    [2, 4, P.gold], [4, 6, P.tealL], [5, 4, P.gold],
  ];
  for (const [ai, bi, col] of links) {
    const a = hubs[ai], b = hubs[bi];
    let prev: [number, number, number] | null = null;
    for (let s = 0; s <= 24; s++) {
      const t = s / 24;
      const cur = proj(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 1 + 0.11 * Math.sin(Math.PI * t));
      if (prev && vis(prev) && vis(cur)) {
        line(prev[0], prev[1], cur[0], cur[1], 4.5, col, 0.22);
        line(prev[0], prev[1], cur[0], cur[1], 1.8, col, 0.92);
      }
      prev = cur;
    }
  }
  for (const [lat, lon, col] of hubs) {
    const p = proj(lat, lon, 1.005);
    if (p[2] > 0) {
      circ(p[0], p[1], 8, col, 0.28);
      circ(p[0], p[1], 3.8, col, 1);
      circ(p[0], p[1], 1.8, P.white, 1);
    }
  }
}

function drawCardIcon(kind: number, x: number, y: number, w: number, h: number): void {
  drawRR(x, y, w, h, 8, P.paper1, 1);
  const cx = x + w * 0.5, cy = y + h * 0.5;
  if (kind === 0) {
    for (let i = 0; i < 3; i++) line(x + 18, y + 54 - i * 14, x + 84, y + 36 - i * 10, 2.2, [42, 108, 168], 0.45 + i * 0.18);
    line(cx - 8, cy + 4, cx + 52, cy - 12, 4.5, P.red, 1);
    line(cx + 8, cy, cx + 22, cy - 22, 4, P.red, 1);
    line(cx + 8, cy, cx + 28, cy + 16, 4, P.red, 1);
    line(cx - 4, cy + 3, cx - 12, cy - 10, 3, P.red, 1);
    circ(x + 28, y + 54, 4, P.org, 1);
    circ(x + 164, y + 22, 4, P.red, 1);
  } else if (kind === 1) {
    circ(cx + 42, y + 48, 18, [238, 152, 54], 0.85);
    rect(x + 12, y + 52, w - 24, 16, [26, 118, 122], 0.85);
    for (const tx of [cx - 46, cx - 8]) {
      line(tx, y + 54, tx, y + 24, 3, [24, 42, 66], 1);
      for (let a = 0; a < 3; a++) {
        const ang = -Math.PI * 0.5 + (a * Math.PI * 2) / 3 + 0.35;
        line(tx, y + 24, tx + Math.cos(ang) * 16, y + 24 + Math.sin(ang) * 16, 2.4, [24, 42, 66], 1);
      }
      circ(tx, y + 24, 3, P.org, 1);
    }
  } else if (kind === 2) {
    drawRR(x + 24, y + 18, 42, 42, 6, [22, 38, 62], 1);
    drawRR(x + 33, y + 27, 24, 24, 3, [230, 134, 38], 1);
    for (let i = 0; i < 4; i++) {
      const p = 24 + i * 10;
      line(x + 16, y + p, x + 24, y + p, 2.5, [160, 120, 48], 1);
      line(x + 66, y + p, x + 74, y + p, 2.5, [160, 120, 48], 1);
    }
    rect(x + 92, y + 44, 78, 14, [24, 48, 78], 1);
    rect(x + 98, y + 32, 18, 12, P.red, 1);
    rect(x + 119, y + 32, 18, 12, P.teal, 1);
    rect(x + 140, y + 32, 18, 12, [230, 118, 34], 1);
    line(x + 86, y + 62, x + 178, y + 62, 3, P.teal, 0.9);
  } else {
    const bars = [20, 28, 25, 36, 44, 52];
    for (let i = 0; i < bars.length; i++) {
      drawRR(x + 22 + i * 18, y + 64 - bars[i], 11, bars[i], 2, i >= 4 ? P.org : [30, 62, 98], 1);
    }
    const rx = x + 156;
    circ(rx, y + 29, 14, P.org, 1);
    circ(rx, y + 29, 7.5, P.paper1, 1);
    line(rx + 9, y + 36, rx - 11, y + 64, 5.5, P.org, 1);
    line(rx - 9, y + 36, rx + 11, y + 64, 5.5, [204, 86, 22], 1);
  }
}

function render(): void {
  rect(0, 0, W, 6, P.red);
  gradV(0, 6, W, 100, P.navy0, P.navy1);
  text("WORLD DISPATCH", 34, 24, 5, P.ink);
  text("THE DAILY VISUAL FRONT PAGE", 36, 72, 2, P.muted);
  drawRR(686, 20, 306, 68, 8, [20, 34, 56], 1);
  drawRR(686, 20, 306, 68, 8, [52, 80, 118], 1, 1.5);
  drawRR(692, 28, 4, 52, 2, P.org, 1);
  text("WED 25 NOV 2026", 708, 32, 3, P.ink);
  text("EDITION 329 * GLOBAL", 708, 64, 2, P.gold);
  rect(0, 106, W, 2, P.bdr);

  gradV(0, 108, W, 502, P.hero0, P.hero1);
  for (let i = 0; i < 22; i++) {
    circ(((i * 197 + 41) % 500) + 12, ((i * 131 + 29) % 450) + 120, 1.2 + (i % 2) * 0.6, [196, 218, 245], 0.35);
  }
  drawGlobe(274, 356, 204);
  text("GLOBAL CORRIDORS * 25 NOV 2026", 274, 580, 2, P.muted, "c");

  drawRR(524, 126, 468, 466, 12, P.panel, 0.96);
  drawRR(524, 126, 468, 466, 12, P.bdr, 1, 1.5);
  drawRR(546, 144, 268, 26, 5, P.org, 1);
  text("NOV 25 * KEY SIGNALS", 558, 150, 2, P.white);
  text("CLIMATE, TRADE", 546, 184, 4, P.ink);
  text("& WINTER SURGE", 546, 220, 4, P.ink);
  rect(546, 260, 424, 1, P.bdr);

  drawRR(546, 272, 424, 122, 8, P.inset, 1);
  drawRR(546, 272, 424, 122, 8, P.bdrD, 1, 1);
  text("MARKETS & AI GRID INDEX", 560, 284, 2, [192, 210, 234]);
  text("+14.2%", 956, 284, 2, P.gold, "r");
  circ(565, 309, 3.5, P.gold);
  text("TECH", 574, 303, 2, P.gold);
  circ(641, 309, 3.5, P.tealL);
  text("GRID", 650, 303, 2, P.tealL);
  for (let g = 0; g < 3; g++) rect(560, 322 + g * 22, 396, 1, [30, 50, 76]);

  const s1 = [0.22, 0.28, 0.25, 0.38, 0.44, 0.41, 0.56, 0.64, 0.61, 0.78, 0.86, 0.92];
  const s2 = [0.16, 0.19, 0.24, 0.26, 0.31, 0.35, 0.39, 0.44, 0.51, 0.55, 0.62, 0.68];
  const plot = (arr: number[], col: RGB, fa: number): void => {
    const n = arr.length - 1;
    for (let i = 0; i < n; i++) {
      const x0 = 564 + (i * 388) / n, x1 = 564 + ((i + 1) * 388) / n;
      const y0 = 380 - arr[i] * 64, y1 = 380 - arr[i + 1] * 64;
      const px0 = Math.round(x0), px1 = Math.round(x1);
      for (let px = px0; px < px1; px++) {
        const t = clamp((px - x0) / (x1 - x0 || 1), 0, 1);
        const yy = y0 + (y1 - y0) * t, span = Math.max(1, 384 - yy);
        for (let py = Math.floor(yy); py < 382; py++) {
          blend(px, py, col[0], col[1], col[2], fa * clamp(1 - (py - yy) / span, 0, 1));
        }
      }
      line(x0, y0, x1, y1, 2.8, col, 1);
    }
    circ(952, 380 - arr[n] * 64, 4.5, col, 1);
  };
  plot(s2, [58, 198, 192], 0.18);
  plot(s1, P.gold, 0.26);

  drawRR(546, 406, 424, 84, 8, P.inset, 1);
  drawRR(546, 406, 424, 84, 8, P.bdrD, 1, 1);
  text("COP31 POWER TRANSITION", 560, 418, 2, [192, 210, 234]);
  drawRR(560, 444, 174, 16, 4, P.teal, 1);
  drawRR(738, 444, 124, 16, 4, P.gold, 1);
  drawRR(866, 444, 90, 16, 4, [84, 108, 138], 1);
  text("CLEAN 44%", 560, 468, 2, P.tealL);
  text("MIX 32%", 738, 468, 2, P.gold);
  text("COAL 24%", 862, 468, 2, P.muted);

  const kpis: [string, string, RGB][] = [
    ["US TRAVEL", "80M EVE", P.red],
    ["COP31 DEAL", "FINANCE", P.teal],
    ["UN NOV 25", "16 DAYS", P.org],
  ];
  for (let i = 0; i < 3; i++) {
    const kx = 546 + i * 146;
    drawRR(kx, 502, 132, 72, 8, P.inset, 1);
    drawRR(kx, 502, 132, 72, 8, P.bdrD, 1, 1);
    rect(kx + 8, 502, 116, 4, kpis[i][2]);
    text(kpis[i][0], kx + 66, 518, 2, P.muted, "c");
    text(kpis[i][1], kx + 66, 544, 2, P.ink, "c");
  }

  rect(0, 610, W, 44, P.org);
  circ(44, 632, 11, P.white);
  circ(44, 632, 6, P.org);
  text("UN DAY: ORANGE THE WORLD * 16 DAYS OF ACTIVISM BEGINS", 68, 625, 2, P.white);
  drawRR(844, 618, 148, 28, 5, P.panel, 1);
  text("25 NOV 2026", 918, 625, 2, P.gold, "c");

  gradV(0, 654, W, 320, P.paper0, P.paper1);
  const cards: [string, string, string[], string, RGB][] = [
    ["AMERICAS", "HOLIDAY RUSH", ["PEAK TRAVEL EVE", "WINTER FRONTS", "POST-MIDTERMS"], "80M+ TRANSIT", P.red],
    ["EUROPE / MENA", "CLIMATE & GRID", ["COP31 PLEDGES", "WINTER RESERVES", "TRADE LANES"], "CLEAN +44% MIX", P.teal],
    ["ASIA-PACIFIC", "AI & MARITIME", ["CHIP CAPEX BOOM", "PACIFIC FREIGHT", "SOLAR CAPACITY"], "TECH +28% YOY", P.org],
    ["GLOBAL PULSE", "RIGHTS & DEBT", ["UN ORANGE DAY", "CENTRAL BANKS", "DIGITAL INFRA"], "193 NATIONS", [28, 54, 92]],
  ];
  for (let i = 0; i < 4; i++) {
    const [tag, title, lines, stat, col] = cards[i];
    const cx = 32 + i * 244, cy = 670;
    drawRR(cx, cy, 228, 288, 10, P.card, 1);
    drawRR(cx, cy, 228, 288, 10, P.cardB, 1, 1.5);
    rect(cx + 12, cy, 204, 6, col);
    text(tag, cx + 16, cy + 18, 2, col);
    drawCardIcon(i, cx + 16, cy + 42, 196, 76);
    text(title, cx + 16, cy + 130, 2, P.dark);
    rect(cx + 16, cy + 152, 196, 1, P.cardB);
    for (let li = 0; li < lines.length; li++) {
      circ(cx + 21, cy + 170 + li * 24, 2.6, col);
      text(lines[li], cx + 32, cy + 164 + li * 24, 2, P.body);
    }
    drawRR(cx + 16, cy + 244, 196, 30, 6, [18, 30, 50], 1);
    text(stat, cx + 114, cy + 252, 2, P.ink, "c");
  }

  rect(0, 974, W, 2, P.org);
  rect(0, 976, W, 48, P.navy0);
  text("NYC 09:00   LON 14:00   ANT 17:00   SGP 22:00   TYO 23:00", 34, 993, 2, P.muted);
  text("25 NOV 2026 * BRIEF", 990, 993, 2, P.gold, "r");
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  let c = 0xffffffff;
  for (let i = 4; i < 8 + data.length; i++) c = crcTable[(c ^ out[i]) & 0xff] ^ (c >>> 8);
  out.writeUInt32BE((c ^ 0xffffffff) >>> 0, 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const stride = W * 3;
  const raw = Buffer.alloc((stride + 1) * H);
  const fTypes = [0, 1, 2, 4];
  const rows = fTypes.map(() => new Uint8Array(stride));
  for (let y = 0; y < H; y++) {
    const src = y * stride, prev = src - stride;
    const score = [0, 0, 0, 0];
    for (let x = 0; x < stride; x++) {
      const cur = img[src + x];
      const a = x >= 3 ? img[src + x - 3] : 0;
      const b = y > 0 ? img[prev + x] : 0;
      const c = y > 0 && x >= 3 ? img[prev + x - 3] : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      const vals = [cur, (cur - a) & 0xff, (cur - b) & 0xff, (cur - pr) & 0xff];
      for (let f = 0; f < 4; f++) {
        const v = vals[f];
        rows[f][x] = v;
        score[f] += v < 128 ? v : 256 - v;
      }
    }
    let best = 0;
    for (let f = 1; f < 4; f++) if (score[f] < score[best]) best = f;
    const off = y * (stride + 1);
    raw[off] = fTypes[best];
    raw.set(rows[best], off + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
  if (png.length > MAX_BYTES) throw new Error(`PNG exceeds 1 MiB (${png.length} bytes)`);
  return png;
}

render();
const outDir = process.env.MAKEFUN_OUTPUT_DIR?.trim() || "/output";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "entry.png"), encodePng());
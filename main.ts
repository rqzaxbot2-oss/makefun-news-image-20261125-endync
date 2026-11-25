import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

type RGB = readonly [number, number, number];

const W = 1024;
const H = 1024;
const MAX_PNG_BYTES = 1024 * 1024;
const buf = new Uint8Array(W * H * 3);

let cx0 = 0;
let cy0 = 0;
let cx1 = W;
let cy1 = H;

const C = {
  paperTop: [247, 242, 232], paperBot: [239, 232, 218], card: [252, 249, 243],
  ink: [22, 27, 34], muted: [74, 85, 100], rule: [198, 189, 173],
  red: [184, 41, 47], redBright: [228, 86, 78], blue: [30, 78, 110],
  blueDeep: [18, 36, 54], cyan: [98, 184, 218], gold: [198, 134, 38],
  goldBright: [242, 192, 86], green: [40, 114, 78], greenBright: [96, 178, 126],
  land: [225, 215, 194], coast: [152, 142, 122], white: [252, 250, 246],
  dark: [20, 28, 39], seaTop: [19, 39, 57], seaBot: [31, 63, 88],
} as const;

function withClip(x: number, y: number, w: number, h: number, fn: () => void): void {
  const px0 = cx0, py0 = cy0, px1 = cx1, py1 = cy1;
  cx0 = Math.max(cx0, Math.round(x));
  cy0 = Math.max(cy0, Math.round(y));
  cx1 = Math.min(cx1, Math.round(x + w));
  cy1 = Math.min(cy1, Math.round(y + h));
  try {
    if (cx0 < cx1 && cy0 < cy1) fn();
  } finally {
    cx0 = px0; cy0 = py0; cx1 = px1; cy1 = py1;
  }
}

function blend(x: number, y: number, col: RGB, a = 1): void {
  const ix = x | 0;
  const iy = y | 0;
  if (ix < cx0 || ix >= cx1 || iy < cy0 || iy >= cy1 || a <= 0) return;
  const i = (iy * W + ix) * 3;
  if (a >= 1) {
    buf[i] = col[0];
    buf[i + 1] = col[1];
    buf[i + 2] = col[2];
    return;
  }
  const ia = 1 - a;
  buf[i] = (buf[i] * ia + col[0] * a + 0.5) | 0;
  buf[i + 1] = (buf[i + 1] * ia + col[1] * a + 0.5) | 0;
  buf[i + 2] = (buf[i + 2] * ia + col[2] * a + 0.5) | 0;
}

function rect(x: number, y: number, w: number, h: number, col: RGB, a = 1): void {
  if (w <= 0 || h <= 0 || a <= 0) return;
  const x0 = Math.max(cx0, Math.round(x));
  const y0 = Math.max(cy0, Math.round(y));
  const x1 = Math.min(cx1, Math.round(x + w));
  const y1 = Math.min(cy1, Math.round(y + h));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) blend(px, py, col, a);
  }
}

function gradRect(x: number, y: number, w: number, h: number, c1: RGB, c2: RGB): void {
  if (w <= 0 || h <= 0) return;
  const ry0 = Math.round(y);
  const ry1 = Math.round(y + h);
  const x0 = Math.max(cx0, Math.round(x));
  const y0 = Math.max(cy0, ry0);
  const x1 = Math.min(cx1, Math.round(x + w));
  const y1 = Math.min(cy1, ry1);
  const dh = Math.max(1, ry1 - ry0 - 1);
  for (let py = y0; py < y1; py++) {
    const t = Math.max(0, Math.min(1, (py - ry0) / dh));
    const col: RGB = [
      (c1[0] + (c2[0] - c1[0]) * t + 0.5) | 0,
      (c1[1] + (c2[1] - c1[1]) * t + 0.5) | 0,
      (c1[2] + (c2[2] - c1[2]) * t + 0.5) | 0,
    ];
    for (let px = x0; px < x1; px++) blend(px, py, col, 1);
  }
}

function rrect(x: number, y: number, w: number, h: number, rad: number, col: RGB, a = 1): void {
  if (w <= 0 || h <= 0 || a <= 0) return;
  const rr = Math.max(0, Math.min(rad, w / 2, h / 2));
  const cx = x + w / 2;
  const cy = y + h / 2;
  const hw = w / 2 - rr;
  const hh = h / 2 - rr;
  const x0 = Math.max(cx0, Math.floor(x) - 1);
  const y0 = Math.max(cy0, Math.floor(y) - 1);
  const x1 = Math.min(cx1 - 1, Math.ceil(x + w) + 1);
  const y1 = Math.min(cy1 - 1, Math.ceil(y + h) + 1);
  for (let py = y0; py <= y1; py++) {
    const qy = Math.abs(py - cy) - hh;
    for (let px = x0; px <= x1; px++) {
      const qx = Math.abs(px - cx) - hw;
      const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
      const cov = Math.max(0, Math.min(1, 0.5 - d));
      if (cov > 0) blend(px, py, col, a * cov);
    }
  }
}

function strokeRect(x: number, y: number, w: number, h: number, col: RGB, t = 1): void {
  if (w <= 0 || h <= 0 || t <= 0) return;
  rect(x, y, w, t, col);
  rect(x, y + h - t, w, t, col);
  rect(x, y, t, h, col);
  rect(x + w - t, y, t, h, col);
}

function circle(cx: number, cy: number, r: number, col: RGB, a = 1): void {
  if (r <= 0 || a <= 0) return;
  const x0 = Math.max(cx0, Math.floor(cx - r - 1));
  const y0 = Math.max(cy0, Math.floor(cy - r - 1));
  const x1 = Math.min(cx1 - 1, Math.ceil(cx + r + 1));
  const y1 = Math.min(cy1 - 1, Math.ceil(cy + r + 1));
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const cov = Math.max(0, Math.min(1, r + 0.5 - Math.hypot(px - cx, py - cy)));
      if (cov > 0) blend(px, py, col, a * cov);
    }
  }
}

function ring(cx: number, cy: number, r: number, t: number, col: RGB, a = 1): void {
  if (r <= 0 || t <= 0 || a <= 0) return;
  const hr = t / 2;
  const x0 = Math.max(cx0, Math.floor(cx - r - hr - 1));
  const y0 = Math.max(cy0, Math.floor(cy - r - hr - 1));
  const x1 = Math.min(cx1 - 1, Math.ceil(cx + r + hr + 1));
  const y1 = Math.min(cy1 - 1, Math.ceil(cy + r + hr + 1));
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const d = Math.abs(Math.hypot(px - cx, py - cy) - r);
      const cov = Math.max(0, Math.min(1, hr + 0.5 - d));
      if (cov > 0) blend(px, py, col, a * cov);
    }
  }
}

function line(x0: number, y0: number, x1: number, y1: number, t: number, col: RGB, a = 1): void {
  if (t <= 0 || a <= 0) return;
  const r = t / 2;
  const bx0 = Math.max(cx0, Math.floor(Math.min(x0, x1) - r - 1));
  const by0 = Math.max(cy0, Math.floor(Math.min(y0, y1) - r - 1));
  const bx1 = Math.min(cx1 - 1, Math.ceil(Math.max(x0, x1) + r + 1));
  const by1 = Math.min(cy1 - 1, Math.ceil(Math.max(y0, y1) + r + 1));
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l2 = dx * dx + dy * dy;
  for (let py = by0; py <= by1; py++) {
    for (let px = bx0; px <= bx1; px++) {
      const u = l2 > 0 ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2)) : 0;
      const d = Math.hypot(px - (x0 + u * dx), py - (y0 + u * dy));
      const cov = Math.max(0, Math.min(1, r + 0.5 - d));
      if (cov > 0) blend(px, py, col, a * cov);
    }
  }
}

function quad(
  x0: number, y0: number, qx: number, qy: number, x1: number, y1: number,
  t: number, col: RGB, a = 1, steps = 28
): void {
  const n = Math.max(1, Math.round(steps));
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const m = 1 - u;
    const nx = m * m * x0 + 2 * m * u * qx + u * u * x1;
    const ny = m * m * y0 + 2 * m * u * qy + u * u * y1;
    line(px, py, nx, ny, t, col, a);
    px = nx;
    py = ny;
  }
}

function poly(pts: number[], col: RGB, a = 1, outline?: RGB): void {
  const n = pts.length >> 1;
  if (n < 3 || a <= 0) return;
  let minY = cy1, maxY = cy0;
  for (let i = 1; i < n * 2; i += 2) {
    if (pts[i] < minY) minY = pts[i];
    if (pts[i] > maxY) maxY = pts[i];
  }
  const y0 = Math.max(cy0, Math.floor(minY));
  const y1 = Math.min(cy1 - 1, Math.ceil(maxY));
  for (let py = y0; py <= y1; py++) {
    const y = py + 0.5;
    const xs: number[] = [];
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const ax = pts[i * 2], ay = pts[i * 2 + 1];
      const bx = pts[j * 2], by = pts[j * 2 + 1];
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    xs.sort((u, v) => u - v);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const lx = Math.max(cx0, Math.ceil(xs[i]));
      const rx = Math.min(cx1 - 1, Math.floor(xs[i + 1]));
      for (let px = lx; px <= rx; px++) blend(px, py, col, a);
    }
  }
  if (outline || a >= 1) {
    const oc = outline ?? col;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      line(pts[i * 2], pts[i * 2 + 1], pts[j * 2], pts[j * 2 + 1], 1.1, oc, a);
    }
  }
}

const FONT: Record<string, string> = {
  A: "ehhvhhh", B: "uhhuhhu", C: "ehggghe", D: "uhhhhhu", E: "vgguggv", F: "vgguggg",
  G: "ehgnhhe", H: "hhhvhhh", I: "e44444e", J: "7222iic", K: "hikokih", L: "ggggggv",
  M: "hrllhhh", N: "hpljhhh", O: "ehhhhhe", P: "uhhuggg", Q: "ehhhlid", R: "uhhukih",
  S: "fgge11u", T: "v444444", U: "hhhhhhe", V: "hhhhha4", W: "hhhllrh", X: "hha4ahh",
  Y: "hha4444", Z: "v1248gv", "0": "ehjlphe", "1": "4c4444e", "2": "eh168gv", "3": "u11e11u",
  "4": "26aiv22", "5": "vgu11he", "6": "eguhhhe", "7": "v124888", "8": "ehhehhe", "9": "ehhf12c",
  " ": "0000000", ".": "00000cc", ",": "0000448", ":": "0400040", "-": "000e000", "+": "044v440",
  "%": "op248j3", "$": "4fke5u4", "&": "cik8lid", "/": "12448g0", "*": "004e400",
};

function textW(str: string, s = 2, gap = 1): number {
  return str.length ? str.length * (5 * s + gap) - gap : 0;
}

function drawText(str: string, x: number, y: number, col: RGB, s = 2, gap = 1, bold = false): void {
  let px = Math.round(x);
  const py = Math.round(y);
  for (const ch of str.toUpperCase()) {
    const g = FONT[ch] ?? FONT[" "];
    for (let r = 0; r < 7; r++) {
      const bits = parseInt(g[r], 32);
      for (let c = 0; c < 5; c++) {
        if ((bits >> (4 - c)) & 1) rect(px + c * s, py + r * s, s + (bold ? 1 : 0), s, col);
      }
    }
    px += 5 * s + gap;
  }
}

function drawCenter(str: string, cx: number, y: number, col: RGB, s = 2, gap = 1, bold = false): void {
  drawText(str, cx - textW(str, s, gap) / 2, y, col, s, gap, bold);
}

function drawMasthead(): void {
  gradRect(0, 0, W, H, C.paperTop, C.paperBot);
  for (let y = 0; y < H; y += 6) rect(0, y, W, 1, C.rule, 0.08);
  strokeRect(18, 16, W - 36, H - 32, C.rule, 1);

  drawText("GLOBAL EDITION", 34, 30, C.muted);
  drawCenter("WEDNESDAY, 25 NOVEMBER 2026", W / 2, 30, C.ink, 2, 1, true);
  drawText("WORLD BRIEFING", W - 34 - textW("WORLD BRIEFING"), 30, C.muted);

  rect(32, 50, W - 64, 1, C.rule);
  rect(32, 54, W - 64, 3, C.red);

  drawCenter("THE WORLD DISPATCH", W / 2, 68, C.ink, 6, 6, true);
  rect(32, 85, 134, 2, C.ink);
  rect(32, 91, 134, 1, C.rule);
  rect(172, 84, 8, 8, C.red);
  rect(W - 180, 84, 8, 8, C.red);
  rect(W - 166, 85, 134, 2, C.ink);
  rect(W - 166, 91, 134, 1, C.rule);

  rect(32, 122, W - 64, 1, C.rule);
  drawCenter("SIX CONTINENTS * 24 HOURS IN REVIEW * GLOBAL VISUAL DIGEST", W / 2, 131, C.muted);
  rect(32, 151, W - 64, 2, C.ink);
  rect(32, 155, W - 64, 1, C.rule);
}

const CONTINENTS: readonly (readonly number[])[] = [
  [-164,65,-140,70,-115,69,-95,68,-80,62,-64,58,-55,50,-66,44,-75,36,-81,25,-88,21,-97,22,-105,20,-112,28,-117,33,-124,42,-130,54,-152,60],
  [-52,60,-42,60,-22,72,-30,78,-52,77,-56,70],
  [-80,9,-72,11,-60,8,-50,0,-35,-6,-38,-18,-48,-26,-56,-36,-66,-53,-73,-51,-72,-35,-71,-18,-81,-5],
  [-9,37,-9,43,-2,44,2,49,8,54,10,58,18,68,30,70,42,66,40,52,30,46,24,38,14,40,4,43],
  [-6,50,1,51,0,58,-5,57],
  [-16,15,-12,28,-6,36,10,37,25,32,33,31,43,12,51,11,41,-4,38,-18,32,-28,20,-35,15,-24,12,-6,8,4,-8,5,-17,14],
  [32,42,44,44,58,52,66,68,95,73,135,70,164,65,158,54,140,48,130,40,122,31,116,22,108,16,102,8,98,16,90,22,78,8,68,24,56,26,48,30,36,36],
  [131,32,136,35,141,40,144,44,140,44,136,37,130,33],
  [96,4,105,-6,118,-8,126,-4,118,2,106,-1],
  [114,-22,124,-16,136,-12,144,-15,153,-28,148,-38,136,-35,122,-34,114,-30],
  [167,-46,172,-43,176,-37,174,-36,170,-42],
];

function drawHeroMap(): void {
  const x = 32, y = 166, w = 644, mh = 352;
  withClip(x, y, w, mh, () => {
    gradRect(x, y, w, mh, C.seaTop, C.seaBot);
    const mx = (lon: number) => x + ((lon + 168) / 346) * w;
    const my = (lat: number) => y + ((78 - lat) / 133) * mh;

    for (let lon = -150; lon <= 150; lon += 30) rect(mx(lon), y, 1, mh, C.cyan, 0.12);
    for (let lat = -30; lat <= 60; lat += 30) rect(x, my(lat), w, 1, C.cyan, lat === 0 ? 0.24 : 0.12);

    for (const c of CONTINENTS) {
      const pts: number[] = [];
      for (let i = 0; i < c.length; i += 2) pts.push(mx(c[i]), my(c[i + 1]));
      poly(pts, C.land, 0.96, C.coast);
    }

    const hubs: readonly [number, number][] = [
      [-122, 38], [-74, 41], [-46, -23], [0, 51], [6, 46],
      [31, 30], [37, -1], [73, 19], [104, 1], [140, 36], [151, -34],
    ];
    const arcs: readonly [number, number, number, RGB][] = [
      [0, 1, -24, C.goldBright], [1, 3, -46, C.redBright], [1, 2, 26, C.goldBright],
      [3, 5, -20, C.cyan], [4, 7, -38, C.goldBright], [5, 6, 18, C.greenBright],
      [7, 9, -34, C.redBright], [8, 10, 24, C.cyan], [6, 7, -18, C.goldBright],
      [2, 6, 36, C.cyan], [7, 8, 12, C.goldBright], [9, 10, 28, C.goldBright],
    ];
    for (const [a, b, lift, col] of arcs) {
      const ax = mx(hubs[a][0]), ay = my(hubs[a][1]);
      const bx = mx(hubs[b][0]), by = my(hubs[b][1]);
      quad(ax, ay, (ax + bx) / 2, (ay + by) / 2 + lift, bx, by, 2.2, col, 0.85);
    }
    for (let i = 0; i < hubs.length; i++) {
      const hx = mx(hubs[i][0]), hy = my(hubs[i][1]);
      ring(hx, hy, 8, 1.3, C.goldBright, 0.45);
      circle(hx, hy, 4.2, i % 3 === 1 ? C.redBright : C.goldBright, 0.95);
      circle(hx, hy, 1.8, C.white);
    }

    const rx = 74, ry = 468;
    ring(rx, ry, 22, 1.2, C.cyan, 0.45);
    line(rx, ry - 26, rx, ry + 26, 1.2, C.cyan, 0.55);
    line(rx - 26, ry, rx + 26, ry, 1.2, C.cyan, 0.55);
    poly([rx, ry - 18, rx + 5, ry, rx, ry + 4, rx - 5, ry], C.goldBright, 0.9);
    drawCenter("N", rx, ry - 38, C.goldBright, 1, 1);

    rrect(x + 12, y + 12, 306, 28, 4, C.dark, 0.82);
    circle(x + 26, y + 26, 4.5, C.redBright);
    drawText("GLOBAL PULSE * 25 NOV 2026", x + 38, y + 19, C.white);
  });

  const by = y + mh;
  rect(x, by, w, 86, C.dark);
  rect(x, by, w, 3, C.red);
  rrect(x + 14, by + 11, 128, 22, 3, C.red);
  drawCenter("LEAD STORY", x + 78, by + 15, C.white, 2, 1, true);
  drawText("WORLD EDITION * FRONT PAGE", x + 156, by + 15, C.goldBright);
  drawText("GLOBAL SUMMITS, MARKETS & CLIMATE CONVERGE", x + 14, by + 41, C.white, 2, 1, true);
  drawText("ENVOYS PRESS TRADE, ENERGY & AI ACCORDS AS WINTER NEARS", x + 14, by + 62, C.land);
  strokeRect(x, y, w, mh + 86, C.ink, 1);
}

function drawCardFrame(x: number, y: number, w: number, h: number, accent: RGB): void {
  rect(x, y, w, h, C.card);
  rect(x, y, w, 4, accent);
  strokeRect(x, y, w, h, C.rule, 1);
}

function drawSidebar(): void {
  const x = 696, w = 296;

  drawCardFrame(x, 166, w, 136, C.gold);
  circle(x + 18, 184, 4, C.gold);
  drawText("MARKETS & TRADE", x + 28, 177, C.ink, 2, 1, true);
  const gx = x + 14, gy = 200, gw = w - 28, gh = 54;
  withClip(gx, gy, gw, gh, () => {
    rect(gx, gy, gw, gh, C.paperTop);
    for (let i = 1; i < 4; i++) rect(gx, gy + (gh * i) / 4, gw, 1, C.rule, 0.5);
    const vals = [0.42, 0.36, 0.45, 0.52, 0.48, 0.62, 0.58, 0.72, 0.68, 0.84, 0.88];
    const spPts: number[] = [gx, gy + gh];
    for (let i = 0; i < vals.length; i++) {
      spPts.push(gx + (i / (vals.length - 1)) * gw, gy + gh - vals[i] * (gh - 8) - 4);
    }
    spPts.push(gx + gw, gy + gh);
    poly(spPts, C.goldBright, 0.28);
    for (let i = 0; i < vals.length - 1; i++) {
      const x0 = gx + (i / (vals.length - 1)) * gw;
      const y0 = gy + gh - vals[i] * (gh - 8) - 4;
      const x1 = gx + ((i + 1) / (vals.length - 1)) * gw;
      const y1 = gy + gh - vals[i + 1] * (gh - 8) - 4;
      line(x0, y0, x1, y1, 2.4, C.gold);
    }
    circle(gx + gw - 3, gy + gh - vals[vals.length - 1] * (gh - 8) - 4, 3.8, C.green);
  });
  strokeRect(gx, gy, gw, gh, C.rule, 1);
  drawText("EQUITIES +0.8%  VOL LOW", x + 14, 263, C.ink);
  drawText("BRENT $74  GOLD $2,680", x + 14, 281, C.muted);

  drawCardFrame(x, 316, w, 136, C.green);
  circle(x + 18, 334, 4, C.green);
  drawText("CLIMATE & GRID", x + 28, 327, C.ink, 2, 1, true);
  const bx = x + 14, by = 354, bw = w - 28;
  const w1 = Math.round(bw * 0.42), w2 = Math.round(bw * 0.53) - w1;
  rect(bx, by, w1, 22, C.green);
  rect(bx + w1, by, w2, 22, C.blue);
  rect(bx + w1 + w2, by, bw - w1 - w2, 22, C.muted);
  rect(bx + w1, by, 1, 22, C.card);
  rect(bx + w1 + w2, by, 1, 22, C.card);
  strokeRect(bx, by, bw, 22, C.rule, 1);
  drawText("CLEAN 53%  LEGACY 47%", x + 14, 388, C.ink);
  drawText("COP31 FOLLOW-UP PACT", x + 14, 408, C.muted);
  drawText("RECORD GRID BUILD-OUT", x + 14, 428, C.green);

  drawCardFrame(x, 466, w, 138, C.blue);
  circle(x + 18, 484, 4, C.blue);
  drawText("TECH & AI POLICY", x + 28, 477, C.ink, 2, 1, true);
  const tx = x + 14, ty = 504;
  rrect(tx, ty, 78, 84, 6, C.blueDeep);
  const ccx = tx + 39, ccy = ty + 42;
  for (let d = -18; d <= 18; d += 12) {
    line(ccx + d, ccy - 28, ccx + d, ccy + 28, 1.5, C.cyan, 0.7);
    line(ccx - 28, ccy + d, ccx + 28, ccy + d, 1.5, C.cyan, 0.7);
  }
  rrect(ccx - 16, ccy - 16, 32, 32, 4, C.blue);
  strokeRect(ccx - 16, ccy - 16, 32, 32, C.goldBright, 2);
  circle(ccx, ccy, 6, C.goldBright);
  for (const [dx, dy] of [[-24, -24], [24, -24], [-24, 24], [24, 24]]) {
    circle(ccx + dx, ccy + dy, 3.2, C.cyan);
  }
  drawText("AI SAFETY PACT", x + 104, 506, C.ink, 2, 1, true);
  drawText("COMPUTE RULES", x + 104, 526, C.muted);
  drawText("ORBITAL RELAY", x + 104, 550, C.blue, 2, 1, true);
  drawText("MISSION LIVE", x + 104, 570, C.muted);
}

function drawRegionalCards(): void {
  rect(32, 614, W - 64, 1, C.rule);
  const cy = 626, ch = 330, cw = 228, aw = cw - 20, ah = 140;
  const xs = [32, 276, 520, 764];

  drawCardFrame(xs[0], cy, cw, ch, C.red);
  const ax = xs[0] + 10, ay = cy + 14;
  withClip(ax, ay, aw, ah, () => {
    gradRect(ax, ay, aw, ah, [48, 28, 44], [202, 108, 66]);
    circle(ax + 154, ay + 48, 18, C.goldBright, 0.85);
    quad(ax + 12, ay + 66, ax + 90, ay + 14, ax + 194, ay + 38, 2, C.goldBright, 0.9);
    quad(ax + 24, ay + 96, ax + 114, ay + 44, ax + 196, ay + 62, 1.5, C.white, 0.75);
    const capX = ax + 104, capY = ay + 110;
    circle(capX, capY - 22, 24, C.dark);
    rect(capX - 4, capY - 56, 8, 14, C.dark);
    rect(capX - 58, capY - 14, 116, 26, C.dark);
    rect(capX - 28, capY - 26, 56, 16, C.dark);
    for (let i = -46; i <= 46; i += 10) rect(capX + i, capY - 8, 4, 14, C.goldBright, 0.55);
    rect(ax, ay + 116, aw, 24, C.ink);
  });
  strokeRect(ax, ay, aw, ah, C.rule, 1);

  drawCardFrame(xs[1], cy, cw, ch, C.blue);
  const ex = xs[1] + 10, ey = cy + 14;
  withClip(ex, ey, aw, ah, () => {
    gradRect(ex, ey, aw, ah, [18, 40, 76], [46, 98, 142]);
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      circle(ex + 104 + Math.cos(ang) * 34, ey + 52 + Math.sin(ang) * 34, 2.5, C.goldBright, 0.95);
    }
    poly([ex, ey + 140, ex, ey + 112, ex + 74, ey + 98, ex + 146, ey + 108, ex + aw, ey + 96, ex + aw, ey + 140], [26, 56, 58]);
    for (const [tx, ty, r] of [[ex + 46, ey + 66, 24], [ex + 104, ey + 58, 28], [ex + 162, ey + 70, 22]]) {
      line(tx, ty, tx, ey + 118, 2.6, C.white, 0.92);
      for (let k = 0; k < 3; k++) {
        const a = k * ((Math.PI * 2) / 3) - 0.5;
        line(tx, ty, tx + Math.cos(a) * r, ty + Math.sin(a) * r, 2.2, C.white, 0.95);
      }
      circle(tx, ty, 3, C.goldBright);
    }
  });
  strokeRect(ex, ey, aw, ah, C.rule, 1);

  drawCardFrame(xs[2], cy, cw, ch, C.gold);
  const px = xs[2] + 10, py = cy + 14;
  withClip(px, py, aw, ah, () => {
    gradRect(px, py, aw, 92, [196, 86, 62], [244, 194, 96]);
    circle(px + 104, py + 72, 28, C.white, 0.85);
    gradRect(px, py + 92, aw, 48, [22, 68, 96], [16, 44, 68]);
    for (let i = 0; i < 4; i++) rect(px + 34 + i * 26, py + 106 + (i % 2) * 14, 34, 2, C.goldBright, 0.55);
    poly([px + 20, py + 94, px + 140, py + 94, px + 128, py + 110, px + 30, py + 110], C.ink);
    rect(px + 38, py + 78, 22, 16, C.red);
    rect(px + 62, py + 78, 22, 16, C.blue);
    rect(px + 86, py + 78, 22, 16, C.green);
    rect(px + 50, py + 64, 22, 14, C.gold);
    rect(px + 114, py + 66, 14, 28, C.white);
    line(px + 178, py + 102, px + 178, py + 42, 3, C.ink, 0.9);
    line(px + 148, py + 48, px + 198, py + 48, 2.5, C.ink, 0.9);
    line(px + 178, py + 42, px + 154, py + 48, 1.5, C.ink, 0.8);
  });
  strokeRect(px, py, aw, ah, C.rule, 1);

  drawCardFrame(xs[3], cy, cw, ch, C.green);
  const sx = xs[3] + 10, sy = cy + 14;
  withClip(sx, sy, aw, ah, () => {
    gradRect(sx, sy, aw, ah, [12, 18, 36], [20, 42, 68]);
    for (let i = 0; i < 24; i++) {
      const stx = sx + ((i * 53 + 17) % (aw - 12)) + 6;
      const sty = sy + ((i * 37 + 11) % 86) + 6;
      circle(stx, sty, i % 4 === 0 ? 1.8 : 1.1, C.white, 0.8);
    }
    const ex0 = sx + 104, ey0 = sy + 236;
    ring(ex0, ey0, 144, 8, C.cyan, 0.35);
    circle(ex0, ey0, 140, C.blue);
    circle(ex0 - 20, ey0 - 2, 128, C.green, 0.85);
    quad(sx + 16, sy + 104, sx + 96, sy + 20, sx + 188, sy + 44, 2, C.goldBright, 0.92);
    circle(sx + 156, sy + 38, 5, C.white);
    ring(sx + 156, sy + 38, 11, 1.4, C.goldBright, 0.7);
    rect(sx + 144, sy + 36, 7, 4, C.cyan);
    rect(sx + 161, sy + 36, 7, 4, C.cyan);
  });
  strokeRect(sx, sy, aw, ah, C.rule, 1);

  const meta: readonly [string, RGB, readonly string[], readonly string[]][] = [
    ["AMERICAS", C.red, ["HOLIDAY TRAVEL", "HITS RECORD PEAK"], ["AIRPORTS AT MAX", "FLOW ON EVE OF", "THANKSGIVING"]],
    ["EUROPE", C.blue, ["WINTER ENERGY &", "DEFENSE BUDGETS"], ["BRUSSELS TALKS", "ON GRID RESERVE", "& AI STANDARDS"]],
    ["ASIA-PACIFIC", C.gold, ["CHIP EXPORTS &", "MARITIME TRADE"], ["TOKYO & SEOUL", "LEAD SEMICON", "SUPPLY SURGE"]],
    ["AFRICA & SPACE", C.green, ["SOLAR CORRIDORS", "& ORBITAL RELAY"], ["CLIMATE FINANCE", "BACKS CLEAN", "GRID & COMMS"]],
  ];
  for (let i = 0; i < 4; i++) {
    const [tag, col, heads, body] = meta[i];
    const x = xs[i] + 12;
    rrect(x, cy + 164, textW(tag) + 16, 22, 3, col);
    drawText(tag, x + 8, cy + 168, C.white, 2, 1, true);
    drawText(heads[0], x, cy + 196, C.ink, 2, 1, true);
    drawText(heads[1], x, cy + 216, C.ink, 2, 1, true);
    rect(x, cy + 240, 44, 2, col);
    drawText(body[0], x, cy + 252, C.muted);
    drawText(body[1], x, cy + 272, C.muted);
    drawText(body[2], x, cy + 292, C.muted);
  }
}

function drawFooter(): void {
  rect(32, 968, W - 64, 1, C.rule);
  drawText("25 NOV 2026", 34, 978, C.muted);
  drawCenter("WORLD NEWS VISUAL DIGEST", W / 2, 978, C.ink, 2, 1, true);
  const right = "EDITION 2026-329";
  drawText(right, W - 34 - textW(right), 978, C.muted);
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  if (type.length !== 4) throw new Error(`Invalid PNG chunk type: ${type}`);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  out.set(data, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const rowOut = y * (1 + W * 3);
    const rowIn = y * W * 3;
    raw[rowOut] = 1;
    for (let x = 0; x < W * 3; x++) {
      const left = x >= 3 ? buf[rowIn + x - 3] : 0;
      raw[rowOut + 1 + x] = (buf[rowIn + x] - left) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function main(): void {
  drawMasthead();
  drawHeroMap();
  drawSidebar();
  drawRegionalCards();
  drawFooter();

  const png = encodePng();
  if (png.length > MAX_PNG_BYTES) {
    throw new Error(`Encoded PNG (${png.length} bytes) exceeds ${MAX_PNG_BYTES} byte limit`);
  }
  const envDir = process.env.MAKEFUN_OUTPUT_DIR?.trim();
  const outDir = envDir && envDir.length > 0 ? envDir : "/output";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}

main();
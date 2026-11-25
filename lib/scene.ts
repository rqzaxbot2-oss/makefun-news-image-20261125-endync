export const SCENE_WIDTH = 1024;
export const SCENE_HEIGHT = 1024;

export interface SceneCanvas {
  width: number;
  height: number;
  data: Uint8Array;
  pixels: Uint8Array;
  rgba: Uint8Array;
}

type RGB = readonly [number, number, number];

const W = SCENE_WIDTH;
const H = SCENE_HEIGHT;

const C = {
  paper: [244, 239, 227] as RGB,
  card: [250, 246, 236] as RGB,
  ink: [20, 27, 36] as RGB,
  muted: [88, 96, 108] as RGB,
  rule: [188, 178, 158] as RGB,
  crimson: [184, 41, 47] as RGB,
  navy: [21, 41, 62] as RGB,
  navyDeep: [14, 28, 43] as RGB,
  oceanHi: [34, 65, 92] as RGB,
  land: [214, 204, 174] as RGB,
  landHi: [236, 228, 204] as RGB,
  gold: [204, 142, 46] as RGB,
  amber: [235, 178, 68] as RGB,
  teal: [44, 122, 114] as RGB,
  tealHi: [82, 184, 168] as RGB,
  white: [252, 250, 244] as RGB,
};

const GLYPHS: Record<string, string> = {
  A: "ehhvhhh", B: "uhhuhhu", C: "ehggghe", D: "sihhhis", E: "vgguggv",
  F: "vgguggg", G: "ehgnhhf", H: "hhhvhhh", I: "e44444e", J: "7222iic",
  K: "hikokih", L: "ggggggv", M: "hrllhhh", N: "hpljhhh", O: "ehhhhhe",
  P: "uhhuggg", Q: "ehhhlid", R: "uhhukih", S: "fgge11u", T: "v444444",
  U: "hhhhhhe", V: "hhhhha4", W: "hhhllrh", X: "hha4ahh", Y: "hha4444",
  Z: "v1248gv", 0: "ehjlphe", 1: "4c4444e", 2: "eh168gv", 3: "u11e11u",
  4: "26aiv22", 5: "vgu11he", 6: "eguhhhe", 7: "v124888", 8: "ehhehhe",
  9: "ehhf12c", " ": "0000000", ".": "00000cc", ",": "0000448",
  ":": "0440440", "-": "000v000", "+": "044v440", "/": "122488g",
  "%": "pq248bj", $: "4fke5u4", "&": "cik8lid", "'": "4480000",
  "|": "4444444", "\u00b7": "004e400",
};

function blend(b: Uint8Array, x: number, y: number, c: RGB, a = 1): void {
  const ix = x | 0;
  const iy = y | 0;
  if (ix < 0 || ix >= W || iy < 0 || iy >= H || a <= 0) return;
  const i = (iy * W + ix) * 4;
  if (a >= 0.999) {
    b[i] = c[0];
    b[i + 1] = c[1];
    b[i + 2] = c[2];
    b[i + 3] = 255;
    return;
  }
  const inv = 1 - a;
  b[i] = (b[i] * inv + c[0] * a + 0.5) | 0;
  b[i + 1] = (b[i + 1] * inv + c[1] * a + 0.5) | 0;
  b[i + 2] = (b[i + 2] * inv + c[2] * a + 0.5) | 0;
  b[i + 3] = 255;
}

function rect(b: Uint8Array, x: number, y: number, w: number, h: number, c: RGB, a = 1): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) blend(b, px, py, c, a);
  }
}

function gradRect(b: Uint8Array, x: number, y: number, w: number, h: number, top: RGB, bot: RGB): void {
  const x0 = Math.max(0, x | 0);
  const y0 = Math.max(0, y | 0);
  const x1 = Math.min(W, (x + w) | 0);
  const y1 = Math.min(H, (y + h) | 0);
  const span = Math.max(1, y1 - y0 - 1);
  for (let py = y0; py < y1; py++) {
    const t = (py - y0) / span;
    const col: RGB = [
      (top[0] + (bot[0] - top[0]) * t) | 0,
      (top[1] + (bot[1] - top[1]) * t) | 0,
      (top[2] + (bot[2] - top[2]) * t) | 0,
    ];
    for (let px = x0; px < x1; px++) blend(b, px, py, col, 1);
  }
}

function box(b: Uint8Array, x: number, y: number, w: number, h: number, c: RGB, t = 1, a = 1): void {
  rect(b, x, y, w, t, c, a);
  rect(b, x, y + h - t, w, t, c, a);
  rect(b, x, y, t, h, c, a);
  rect(b, x + w - t, y, t, h, c, a);
}

function circle(b: Uint8Array, cx: number, cy: number, r: number, c: RGB, a = 1): void {
  const x0 = Math.max(0, Math.floor(cx - r - 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1));
  const x1 = Math.min(W - 1, Math.ceil(cx + r + 1));
  const y1 = Math.min(H - 1, Math.ceil(cy + r + 1));
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const d = Math.hypot(px - cx, py - cy);
      if (d < r + 0.8) {
        const cov = Math.min(1, Math.max(0, r + 0.6 - d));
        blend(b, px, py, c, a * cov);
      }
    }
  }
}

function ring(b: Uint8Array, cx: number, cy: number, r: number, th: number, c: RGB, a = 1): void {
  const half = th * 0.5;
  const x0 = Math.max(0, Math.floor(cx - r - half - 1));
  const y0 = Math.max(0, Math.floor(cy - r - half - 1));
  const x1 = Math.min(W - 1, Math.ceil(cx + r + half + 1));
  const y1 = Math.min(H - 1, Math.ceil(cy + r + half + 1));
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const d = Math.abs(Math.hypot(px - cx, py - cy) - r);
      if (d < half + 0.8) {
        const cov = Math.min(1, Math.max(0, half + 0.6 - d));
        blend(b, px, py, c, a * cov);
      }
    }
  }
}

function line(b: Uint8Array, x0: number, y0: number, x1: number, y1: number, th: number, c: RGB, a = 1): void {
  const half = th * 0.5;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1) - half - 1));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1) + half + 1));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1) - half - 1));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1) + half + 1));
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy || 1;
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
      const d = Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
      if (d < half + 0.8) {
        const cov = Math.min(1, Math.max(0, half + 0.6 - d));
        blend(b, px, py, c, a * cov);
      }
    }
  }
}

function arc(b: Uint8Array, cx: number, cy: number, r: number, th: number, a0: number, a1: number, c: RGB, a = 1): void {
  const steps = Math.max(12, Math.ceil(Math.abs(a1 - a0) * r * 0.25));
  let px = cx + Math.cos(a0) * r;
  let py = cy + Math.sin(a0) * r;
  for (let i = 1; i <= steps; i++) {
    const ang = a0 + ((a1 - a0) * i) / steps;
    const nx = cx + Math.cos(ang) * r;
    const ny = cy + Math.sin(ang) * r;
    line(b, px, py, nx, ny, th, c, a);
    px = nx;
    py = ny;
  }
}

function bezier(b: Uint8Array, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, c: RGB, a = 0.85): void {
  const steps = 42;
  let px = x0;
  let py = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const nx = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const ny = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
    if (i % 3 !== 0) line(b, px, py, nx, ny, 2, c, a);
    px = nx;
    py = ny;
  }
}

function poly(b: Uint8Array, pts: readonly [number, number][], c: RGB, a = 1): void {
  let minY = H;
  let maxY = 0;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(H - 1, Math.ceil(maxY));
  const n = pts.length;
  for (let y = y0; y <= y1; y++) {
    const xs: number[] = [];
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y)) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
    }
    xs.sort((u, v) => u - v);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const sx = Math.max(0, Math.ceil(xs[k]));
      const ex = Math.min(W - 1, Math.floor(xs[k + 1]));
      for (let x = sx; x <= ex; x++) blend(b, x, y, c, a);
    }
  }
}

function text(b: Uint8Array, s: string, x: number, y: number, sc: number, c: RGB, align: "l" | "c" | "r" = "l", a = 1): void {
  const up = s.toUpperCase();
  const adv = 6 * sc;
  const tw = up.length * adv - sc;
  let cx = align === "c" ? x - tw * 0.5 : align === "r" ? x - tw : x;
  for (let i = 0; i < up.length; i++) {
    const g = GLYPHS[up[i]] ?? GLYPHS[" "];
    for (let row = 0; row < 7; row++) {
      const bits = parseInt(g[row], 32);
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) rect(b, cx + col * sc, y + row * sc, sc, sc, c, a);
      }
    }
    cx += adv;
  }
}

function drawPaper(b: Uint8Array): void {
  for (let y = 0; y < H; y++) {
    const rowTint = ((y & 3) === 0 ? -2 : 0);
    for (let x = 0; x < W; x++) {
      let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      const n = (((h ^ (h >>> 16)) & 7) - 3) + rowTint;
      const i = (y * W + x) * 4;
      b[i] = Math.max(0, Math.min(255, C.paper[0] + n));
      b[i + 1] = Math.max(0, Math.min(255, C.paper[1] + n));
      b[i + 2] = Math.max(0, Math.min(255, C.paper[2] + n));
      b[i + 3] = 255;
    }
  }
  box(b, 16, 16, W - 32, H - 32, C.rule, 2);
  box(b, 22, 22, W - 44, H - 44, C.ink, 1, 0.35);
}

const CONTINENTS: readonly (readonly [number, number][])[] = [
  [[0.06,0.20],[0.15,0.16],[0.26,0.17],[0.31,0.25],[0.27,0.34],[0.23,0.41],[0.20,0.47],[0.23,0.52],[0.19,0.53],[0.15,0.45],[0.11,0.34],[0.09,0.26]],
  [[0.33,0.09],[0.42,0.09],[0.41,0.20],[0.35,0.22]],
  [[0.24,0.54],[0.31,0.55],[0.37,0.64],[0.35,0.74],[0.29,0.88],[0.26,0.88],[0.25,0.73],[0.22,0.61]],
  [[0.45,0.22],[0.52,0.16],[0.59,0.18],[0.60,0.28],[0.56,0.35],[0.50,0.36],[0.45,0.33],[0.47,0.28]],
  [[0.45,0.25],[0.47,0.25],[0.47,0.30],[0.45,0.30]],
  [[0.46,0.39],[0.54,0.39],[0.60,0.45],[0.63,0.54],[0.59,0.68],[0.55,0.81],[0.51,0.80],[0.49,0.64],[0.44,0.53],[0.44,0.45]],
  [[0.60,0.16],[0.75,0.15],[0.90,0.19],[0.92,0.28],[0.86,0.38],[0.83,0.48],[0.78,0.52],[0.74,0.45],[0.70,0.52],[0.66,0.45],[0.61,0.43],[0.59,0.35],[0.60,0.26]],
  [[0.88,0.34],[0.90,0.34],[0.89,0.41],[0.87,0.40]],
  [[0.77,0.57],[0.86,0.58],[0.85,0.62],[0.77,0.61]],
  [[0.80,0.67],[0.91,0.67],[0.93,0.77],[0.88,0.84],[0.80,0.81],[0.78,0.73]],
];

function drawMapPanel(b: Uint8Array): void {
  const mx = 34, my = 200, mw = 644, mh = 384;
  gradRect(b, mx, my, mw, mh, C.navy, C.oceanHi);
  for (let gx = mx + 64; gx < mx + mw; gx += 64) rect(b, gx, my, 1, mh, C.white, 0.12);
  for (let gy = my + 64; gy < my + mh; gy += 64) rect(b, mx, gy, mw, 1, C.white, 0.12);
  rect(b, mx, my + Math.round(mh * 0.55), mw, 1, C.gold, 0.28);

  for (const shape of CONTINENTS) {
    const sh = shape.map(([u, v]): [number, number] => [mx + u * mw + 3, my + v * mh + 3]);
    const fg = shape.map(([u, v]): [number, number] => [mx + u * mw, my + v * mh]);
    poly(b, sh, C.navyDeep, 0.55);
    poly(b, fg, C.land, 0.96);
    for (let i = 0; i < fg.length; i++) {
      const [x0, y0] = fg[i];
      const [x1, y1] = fg[(i + 1) % fg.length];
      line(b, x0, y0, x1, y1, 1.3, C.landHi, 0.85);
    }
  }

  const pts: [number, number, string][] = [
    [mx + 0.51 * mw, my + 0.31 * mh, "1"],
    [mx + 0.34 * mw, my + 0.60 * mh, "2"],
    [mx + 0.81 * mw, my + 0.36 * mh, "3"],
    [mx + 0.59 * mw, my + 0.59 * mh, "4"],
    [mx + 0.24 * mw, my + 0.37 * mh, "5"],
  ];

  const arcs: [number, number, number][] = [
    [4, 0, -52], [0, 2, -46], [0, 3, 24], [4, 1, -24], [2, 3, 38],
  ];
  for (const [i, j, bend] of arcs) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[j];
    bezier(b, x0, y0, (x0 + x1) * 0.5, (y0 + y1) * 0.5 + bend, x1, y1, C.amber, 0.82);
  }

  for (const [px, py, num] of pts) {
    circle(b, px, py, 19, C.crimson, 0.22);
    ring(b, px, py, 14, 1.6, C.amber, 0.85);
    circle(b, px, py, 10, C.crimson, 1);
    text(b, num, px + 1, py - 7, 2, C.white, "c");
  }

  rect(b, mx + 12, my + 12, 354, 28, C.navyDeep, 0.86);
  box(b, mx + 12, my + 12, 354, 28, C.gold, 1, 0.8);
  text(b, "GLOBAL FRONTS \u00b7 25 NOV 2026", mx + 24, my + 19, 2, C.amber, "l");

  rect(b, mx, my + mh, mw, 70, C.navyDeep, 1);
  rect(b, mx, my + mh, mw, 3, C.gold, 1);
  text(b, "1 GENEVA: TRUCE   2 BELEM: CLIMATE FUND", mx + 18, my + mh + 14, 2, C.white, "l");
  text(b, "3 ASIA: AI PACT   4 AFRICA: RAIL   5 US: RATES", mx + 18, my + mh + 40, 2, C.landHi, "l");
  box(b, mx, my, mw, mh + 70, C.ink, 2);
}

function drawSidebar(b: Uint8Array): void {
  const sx = 706, sw = 284;
  rect(b, sx, 200, sw, 28, C.crimson, 1);
  text(b, "THE DAY IN DATA", sx + sw * 0.5, 207, 2, C.white, "c");

  // Widget 1: Markets pulse sparkline
  rect(b, sx, 238, sw, 128, C.card, 1);
  box(b, sx, 238, sw, 128, C.rule, 1);
  text(b, "MARKETS PULSE", sx + 12, 248, 2, C.ink, "l");
  for (let i = 0; i < 4; i++) rect(b, sx + 12, 274 + i * 18, sw - 24, 1, C.rule, 0.5);
  const vals = [0.62, 0.55, 0.68, 0.48, 0.52, 0.36, 0.42, 0.25, 0.18];
  const sp: [number, number][] = vals.map((v, i) => [sx + 16 + i * 31, 272 + v * 58]);
  poly(b, [[sp[0][0], 332], ...sp, [sp[sp.length - 1][0], 332]], C.teal, 0.22);
  for (let i = 0; i + 1 < sp.length; i++) {
    line(b, sp[i][0], sp[i][1], sp[i + 1][0], sp[i + 1][1], 2.5, C.teal, 1);
  }
  const last = sp[sp.length - 1];
  circle(b, last[0], last[1], 4.5, C.crimson, 1);
  text(b, "GLOBAL +0.7% OIL $74", sx + 12, 344, 2, C.muted, "l");

  // Widget 2: Clean energy bars
  rect(b, sx, 378, sw, 128, C.card, 1);
  box(b, sx, 378, sw, 128, C.rule, 1);
  text(b, "ENERGY TRANSITION", sx + 12, 388, 2, C.ink, "l");
  const bars: [string, number, RGB][] = [
    ["SOLAR 31%", 0.68, C.gold],
    ["WIND  24%", 0.54, C.teal],
    ["GRID  45%", 0.88, C.navy],
  ];
  bars.forEach(([lbl, frac, col], idx) => {
    const by = 414 + idx * 24;
    text(b, lbl, sx + 12, by, 2, C.muted, "l");
    rect(b, sx + 126, by + 2, 144, 10, C.rule, 0.4);
    rect(b, sx + 126, by + 2, Math.round(144 * frac), 10, col, 1);
  });
  text(b, "RECORD Q4 CAPACITY", sx + 12, 486, 2, C.teal, "l");

  // Widget 3: Diplomatic index dial
  rect(b, sx, 518, sw, 136, C.card, 1);
  box(b, sx, 518, sw, 136, C.rule, 1);
  text(b, "DIPLOMATIC INDEX", sx + 12, 528, 2, C.ink, "l");
  const gcx = sx + sw * 0.5, gcy = 612, gr = 48;
  arc(b, gcx, gcy, gr, 10, Math.PI, Math.PI * 1.35, C.teal, 1);
  arc(b, gcx, gcy, gr, 10, Math.PI * 1.35, Math.PI * 1.68, C.gold, 1);
  arc(b, gcx, gcy, gr, 10, Math.PI * 1.68, Math.PI * 2, C.crimson, 1);
  const ang = Math.PI * 1.46;
  line(b, gcx, gcy, gcx + Math.cos(ang) * 40, gcy + Math.sin(ang) * 40, 3, C.ink, 1);
  circle(b, gcx, gcy, 6, C.ink, 1);
  circle(b, gcx, gcy, 2.5, C.amber, 1);
  text(b, "5 REGIONS IN TALKS", sx + sw * 0.5, 632, 2, C.muted, "c");
}

function drawCardArt(b: Uint8Array, kind: number, x: number, y: number, w: number, h: number): void {
  if (kind === 0) {
    gradRect(b, x, y, w, h, C.navyDeep, C.oceanHi);
    circle(b, x + w * 0.5, y + 62, 44, C.amber, 0.16);
    arc(b, x + w * 0.5, y + 72, 48, 2.5, Math.PI * 1.1, Math.PI * 1.9, C.amber, 0.8);
    circle(b, x + w * 0.5, y + 72, 28, C.landHi, 0.95);
    rect(b, x + w * 0.5 - 64, y + 72, 128, 44, C.land, 1);
    rect(b, x + w * 0.5 - 74, y + 66, 148, 8, C.landHi, 1);
    for (let i = -3; i <= 3; i++) rect(b, x + w * 0.5 + i * 18 - 3, y + 76, 6, 36, C.navyDeep, 0.72);
    rect(b, x, y + 114, w, 16, C.navyDeep, 0.92);
  } else if (kind === 1) {
    gradRect(b, x, y, w, h, C.navyDeep, [26, 48, 66]);
    const cx = x + w * 0.5, cy = y + h * 0.5;
    for (let i = -2; i <= 2; i++) {
      line(b, cx - 110, cy + i * 18, cx + 110, cy + i * 18, 1.5, C.tealHi, 0.55);
      line(b, cx + i * 32, y + 10, cx + i * 32, y + h - 10, 1.5, C.tealHi, 0.4);
    }
    const nodes: [number, number][] = [
      [cx - 98, cy - 36], [cx + 98, cy - 36], [cx - 98, cy + 36], [cx + 98, cy + 36],
      [cx - 64, cy], [cx + 64, cy],
    ];
    for (const [nx, ny] of nodes) {
      line(b, cx, cy, nx, ny, 2, C.amber, 0.75);
      circle(b, nx, ny, 6, C.tealHi, 1);
      circle(b, nx, ny, 3, C.navyDeep, 1);
    }
    rect(b, cx - 32, cy - 32, 64, 64, C.navy, 1);
    box(b, cx - 32, cy - 32, 64, 64, C.amber, 3);
    rect(b, cx - 16, cy - 16, 32, 32, C.teal, 0.9);
    text(b, "AI", cx, cy - 7, 2, C.white, "c");
  } else {
    gradRect(b, x, y, w, h, [42, 86, 118], [228, 174, 96]);
    circle(b, x + 216, y + 48, 22, C.white, 0.85);
    poly(b, [[x, y + h], [x, y + 86], [x + 90, y + 66], [x + 190, y + 82], [x + w, y + 62], [x + w, y + h]], C.teal, 0.92);
    poly(b, [[x, y + h], [x, y + 100], [x + 140, y + 88], [x + w, y + 96], [x + w, y + h]], [30, 82, 74], 1);
    for (const [tx, ty, sc] of [[x + 68, y + 42, 26], [x + 132, y + 34, 32], [x + 194, y + 48, 22]]) {
      line(b, tx, ty, tx, ty + sc * 2, 2.6, C.white, 0.95);
      for (let k = 0; k < 3; k++) {
        const a = -0.5 + (k * Math.PI * 2) / 3;
        line(b, tx, ty, tx + Math.cos(a) * sc, ty + Math.sin(a) * sc, 2.2, C.white, 0.95);
      }
      circle(b, tx, ty, 3, C.amber, 1);
    }
    for (let i = 0; i < 4; i++) {
      const px = x + 150 + i * 30;
      poly(b, [[px, y + 122], [px + 24, y + 122], [px + 20, y + 108], [px + 4, y + 108]], C.navy, 0.92);
    }
  }
  box(b, x, y, w, h, C.ink, 1, 0.5);
}

function drawBottomCards(b: Uint8Array): void {
  const cards: [string, string, string, string][] = [
    ["DIPLOMACY", "GENEVA ENVOYS WEIGH", "WINTER TRUCE PLAN", "ENERGY ROUTES PRIORITY"],
    ["TECH & AI", "GLOBAL AI AUDIT AND", "CHIP SUPPLY ACCORD", "CROSS-BORDER STANDARDS"],
    ["CLIMATE", "CLEAN GRID FUNDING", "HITS RECORD HIGH", "EMERGING GRIDS EXPAND"],
  ];
  cards.forEach(([kicker, h1, h2, sub], i) => {
    const cx = 34 + i * 325;
    const cw = 306;
    rect(b, cx, 678, cw, 268, C.card, 1);
    box(b, cx, 678, cw, 268, C.rule, 1);
    rect(b, cx, 678, cw, 4, C.crimson, 1);
    drawCardArt(b, i, cx + 12, 694, cw - 24, 130);
    text(b, kicker, cx + 14, 834, 2, C.crimson, "l");
    text(b, h1, cx + 14, 858, 2, C.ink, "l");
    text(b, h2, cx + 14, 880, 2, C.ink, "l");
    rect(b, cx + 14, 904, cw - 28, 1, C.rule, 0.8);
    text(b, sub, cx + 14, 914, 2, C.muted, "l");
  });
}

export function renderScene(target?: unknown): Uint8Array & SceneCanvas {
  const b = new Uint8Array(W * H * 4);
  drawPaper(b);

  // Top folio
  text(b, "VOL. CCXXVI NO. 329", 34, 30, 2, C.muted, "l");
  text(b, "WORLD EDITION", 512, 30, 2, C.ink, "c");
  text(b, "WED 25 NOVEMBER 2026", 990, 30, 2, C.crimson, "r");
  rect(b, 34, 52, 956, 2, C.ink, 1);
  rect(b, 34, 56, 956, 1, C.ink, 0.6);

  // Masthead
  rect(b, 34, 78, 166, 24, C.navy, 1);
  text(b, "FRONT PAGE", 117, 83, 2, C.amber, "c");
  rect(b, 824, 78, 166, 24, C.crimson, 1);
  text(b, "25 NOV 2026", 907, 83, 2, C.white, "c");
  text(b, "THE GLOBAL DISPATCH", 514, 73, 5, C.rule, "c", 0.55);
  text(b, "THE GLOBAL DISPATCH", 512, 71, 5, C.ink, "c");
  rect(b, 34, 118, 956, 4, C.crimson, 1);
  rect(b, 34, 125, 956, 1, C.ink, 0.8);

  // Lead headline
  text(b, "CLIMATE, AI & TRADE TALKS DEFINE PIVOTAL DAY", 512, 136, 3, C.ink, "c");
  text(b, "GENEVA ENVOYS, CLEAN GRIDS & COMPUTE ACCORDS ANCHOR WEDNESDAY BRIEFING", 512, 166, 2, C.muted, "c");
  rect(b, 34, 189, 956, 1, C.rule, 1);

  // Hero map + sidebar
  drawMapPanel(b);
  rect(b, 692, 200, 1, 454, C.rule, 1);
  drawSidebar(b);

  // Section divider & bottom editorial cards
  rect(b, 34, 664, 956, 2, C.ink, 0.85);
  rect(b, 34, 668, 956, 1, C.rule, 1);
  drawBottomCards(b);

  // Bottom dateline bar
  rect(b, 34, 958, 956, 34, C.navyDeep, 1);
  box(b, 34, 958, 956, 34, C.gold, 1, 0.85);
  text(b, "LONDON \u00b7 GENEVA \u00b7 NAIROBI \u00b7 BEIJING \u00b7 NEW YORK \u00b7 25 NOV 2026", 512, 968, 2, C.landHi, "c");

  if (target instanceof Uint8Array && target.length >= b.length) {
    target.set(b);
    return Object.assign(target, { width: W, height: H, data: target, pixels: target, rgba: target }) as Uint8Array & SceneCanvas;
  }
  if (target && typeof target === "object") {
    const t = target as Record<string, unknown>;
    for (const k of ["data", "pixels", "rgba", "buf"]) {
      const arr = t[k];
      if (arr instanceof Uint8Array && arr.length >= b.length) {
        arr.set(b);
        return target as Uint8Array & SceneCanvas;
      }
    }
    if (typeof t.setPixel === "function") {
      const fn = t.setPixel as (x: number, y: number, r: number, g: number, bl: number, a: number) => void;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          fn.call(target, x, y, b[i], b[i + 1], b[i + 2], b[i + 3]);
        }
      }
      return target as Uint8Array & SceneCanvas;
    }
  }
  return Object.assign(b, { width: W, height: H, data: b, pixels: b, rgba: b }) as Uint8Array & SceneCanvas;
}

export const composeScene = renderScene;
export const buildScene = renderScene;
export const drawScene = renderScene;
export const renderEditorial = renderScene;
export const renderBroadsheet = renderScene;
export const render = renderScene;
export default renderScene;
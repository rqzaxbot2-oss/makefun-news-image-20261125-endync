export type RGBA = readonly [number, number, number, number];
export type LonLat = readonly [number, number];
export type Point2D = { x: number; y: number };
export type ProjectionKind = "robinson" | "equirectangular" | "mercator";

export interface MapBuffer {
  width: number;
  height: number;
  data?: Uint8Array | Uint8ClampedArray;
  pixels?: Uint8Array | Uint8ClampedArray;
  buf?: Uint8Array | Uint8ClampedArray;
}

export interface MapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContinentPoly {
  id: string;
  region: string;
  points: readonly LonLat[];
}

export interface TradeArc {
  id?: string;
  from: LonLat;
  to: LonLat;
  color: RGBA;
  glowColor?: RGBA;
  width?: number;
  dashed?: boolean;
  curvature?: number;
  arrow?: boolean;
}

export interface RegionalMarker {
  id: string;
  label: string;
  lon: number;
  lat: number;
  color: RGBA;
  ringColor?: RGBA;
  radius?: number;
  rings?: number;
  priority?: number;
}

export interface MapTheme {
  oceanFill?: RGBA;
  oceanBorder?: RGBA;
  gridColor?: RGBA;
  equatorColor?: RGBA;
  tropicColor?: RGBA;
  landFill?: RGBA;
  landShade?: RGBA;
  landStroke?: RGBA;
  coastGlow?: RGBA;
  projection?: ProjectionKind;
  gridStepLon?: number;
  gridStepLat?: number;
}

export interface GlobalMapOptions extends MapTheme {
  drawOcean?: boolean;
  drawGraticule?: boolean;
  drawLand?: boolean;
  drawArcs?: boolean;
  drawMarkers?: boolean;
  arcs?: readonly TradeArc[];
  markers?: readonly RegionalMarker[];
}

export const DEFAULT_MAP_THEME: Required<MapTheme> = {
  oceanFill: [12, 24, 42, 255],
  oceanBorder: [56, 86, 122, 180],
  gridColor: [64, 98, 136, 70],
  equatorColor: [110, 158, 206, 120],
  tropicColor: [84, 124, 166, 85],
  landFill: [34, 58, 86, 255],
  landShade: [46, 76, 110, 120],
  landStroke: [118, 166, 212, 190],
  coastGlow: [74, 134, 192, 55],
  projection: "robinson",
  gridStepLon: 30,
  gridStepLat: 30,
};

export const WORLD_CONTINENTS: readonly ContinentPoly[] = [
  {
    id: "north-america",
    region: "americas",
    points: [
      [-168, 66], [-160, 70], [-140, 70], [-124, 70], [-108, 68], [-94, 69],
      [-82, 66], [-78, 61], [-64, 60], [-56, 52], [-60, 46], [-67, 44],
      [-71, 41], [-76, 35], [-81, 31], [-80, 25], [-83, 25], [-84, 30],
      [-90, 29], [-97, 26], [-96, 19], [-88, 21], [-87, 16], [-83, 10],
      [-78, 8], [-82, 9], [-88, 13], [-95, 16], [-105, 20], [-110, 24],
      [-114, 31], [-118, 34], [-124, 41], [-125, 49], [-135, 57], [-148, 60],
      [-158, 57], [-166, 60],
    ],
  },
  {
    id: "greenland",
    region: "arctic",
    points: [
      [-44, 60], [-35, 66], [-22, 72], [-18, 80], [-35, 83], [-55, 82],
      [-68, 77], [-58, 70], [-52, 64],
    ],
  },
  {
    id: "caribbean",
    region: "americas",
    points: [[-84, 22], [-79, 23], [-75, 20], [-79, 21]],
  },
  {
    id: "south-america",
    region: "americas",
    points: [
      [-78, 9], [-72, 12], [-62, 10], [-50, 1], [-35, -6], [-38, -14],
      [-41, -22], [-48, -28], [-54, -35], [-62, -40], [-66, -48], [-68, -55],
      [-73, -52], [-74, -42], [-71, -30], [-70, -18], [-78, -12], [-81, -5],
      [-79, 2],
    ],
  },
  {
    id: "eurasia",
    region: "eurasia",
    points: [
      [-9, 37], [-9, 43], [-2, 43], [-4, 48], [2, 51], [8, 54], [10, 57],
      [5, 61], [12, 67], [24, 71], [42, 68], [60, 70], [80, 73], [105, 76],
      [130, 72], [160, 69], [176, 66], [162, 60], [156, 51], [142, 54],
      [136, 44], [129, 35], [126, 38], [121, 40], [122, 31], [117, 23],
      [109, 20], [108, 12], [103, 2], [100, 8], [98, 16], [90, 22],
      [80, 10], [77, 8], [72, 20], [67, 25], [58, 25], [51, 26], [56, 24],
      [59, 22], [52, 16], [44, 13], [39, 21], [35, 28], [36, 36], [27, 37],
      [23, 37], [20, 40], [14, 45], [16, 40], [14, 38], [10, 44], [4, 43],
      [0, 38], [-6, 36],
    ],
  },
  {
    id: "uk",
    region: "europe",
    points: [[-6, 50], [-5, 55], [-3, 58], [0, 56], [2, 52], [-2, 50]],
  },
  {
    id: "iceland",
    region: "europe",
    points: [[-24, 64], [-18, 66], [-14, 65], [-18, 63]],
  },
  {
    id: "africa",
    region: "africa",
    points: [
      [-17, 15], [-15, 21], [-10, 30], [-6, 35], [3, 37], [10, 37], [12, 33],
      [20, 32], [25, 31], [32, 31], [35, 26], [39, 18], [43, 12], [51, 11],
      [48, 4], [41, -2], [40, -11], [35, -20], [32, -27], [26, -34], [18, -34],
      [15, -26], [12, -16], [9, -4], [9, 4], [2, 6], [-8, 5], [-14, 10],
    ],
  },
  {
    id: "madagascar",
    region: "africa",
    points: [[44, -25], [46, -18], [49, -13], [50, -16], [47, -24]],
  },
  {
    id: "japan",
    region: "asia",
    points: [[130, 32], [136, 34], [141, 38], [144, 44], [141, 43], [138, 37], [132, 34]],
  },
  {
    id: "sumatra-java",
    region: "asia",
    points: [[96, 5], [101, 1], [106, -6], [114, -8], [112, -7], [104, -5], [99, 0], [95, 4]],
  },
  {
    id: "borneo",
    region: "asia",
    points: [[109, 1], [114, 5], [118, 5], [117, -3], [111, -3]],
  },
  {
    id: "philippines",
    region: "asia",
    points: [[120, 18], [123, 14], [126, 8], [123, 7], [120, 14]],
  },
  {
    id: "new-guinea",
    region: "oceania",
    points: [[132, -2], [141, -3], [150, -10], [146, -9], [138, -6], [132, -4]],
  },
  {
    id: "australia",
    region: "oceania",
    points: [
      [114, -22], [122, -17], [130, -12], [136, -12], [142, -11], [146, -19],
      [153, -27], [150, -37], [141, -38], [135, -34], [128, -32], [115, -34],
      [113, -27],
    ],
  },
  {
    id: "new-zealand",
    region: "oceania",
    points: [[173, -35], [178, -38], [174, -42], [168, -46], [167, -44], [173, -39]],
  },
];

export const DEFAULT_TRADE_ARCS: readonly TradeArc[] = [
  { id: "transatlantic", from: [-74, 40.7], to: [-0.1, 51.5], color: [244, 188, 76, 225], width: 2.1, curvature: 0.28, arrow: true },
  { id: "eu-mena", from: [4.3, 50.8], to: [35.2, 31.8], color: [236, 112, 86, 210], width: 1.8, curvature: 0.24, dashed: true },
  { id: "suez-asia", from: [32.3, 30.6], to: [103.8, 1.3], color: [88, 210, 228, 225], width: 2.1, curvature: -0.22, arrow: true },
  { id: "east-asia", from: [103.8, 1.3], to: [139.7, 35.7], color: [88, 210, 228, 215], width: 1.9, curvature: 0.2, arrow: true },
  { id: "americas-latam", from: [-77.0, 38.9], to: [-46.6, -23.5], color: [130, 214, 146, 200], width: 1.7, curvature: -0.18, dashed: true },
  { id: "gulf-india", from: [46.7, 24.7], to: [77.2, 28.6], color: [244, 188, 76, 200], width: 1.7, curvature: 0.22, arrow: true },
  { id: "africa-eu", from: [36.8, -1.3], to: [12.5, 41.9], color: [158, 192, 244, 185], width: 1.5, curvature: -0.18, dashed: true },
  { id: "pacific-south", from: [116.4, 39.9], to: [151.2, -33.9], color: [106, 198, 232, 190], width: 1.6, curvature: 0.2, dashed: true },
];

export const DEFAULT_REGIONAL_MARKERS: readonly RegionalMarker[] = [
  { id: "dc", label: "WASHINGTON", lon: -77.0, lat: 38.9, color: [248, 196, 84, 255], radius: 5, rings: 2, priority: 3 },
  { id: "brussels", label: "BRUSSELS", lon: 4.3, lat: 50.8, color: [110, 196, 248, 255], radius: 4.5, rings: 2, priority: 3 },
  { id: "kyiv", label: "KYIV", lon: 30.5, lat: 50.4, color: [242, 114, 92, 255], radius: 4.5, rings: 2, priority: 3 },
  { id: "levant", label: "LEVANT", lon: 35.2, lat: 31.8, color: [242, 114, 92, 255], radius: 4.5, rings: 2, priority: 3 },
  { id: "delhi", label: "NEW DELHI", lon: 77.2, lat: 28.6, color: [248, 196, 84, 255], radius: 4.2, rings: 1, priority: 2 },
  { id: "beijing", label: "BEIJING", lon: 116.4, lat: 39.9, color: [96, 214, 230, 255], radius: 4.8, rings: 2, priority: 3 },
  { id: "tokyo", label: "TOKYO", lon: 139.7, lat: 35.7, color: [96, 214, 230, 255], radius: 4.2, rings: 1, priority: 2 },
  { id: "singapore", label: "SINGAPORE", lon: 103.8, lat: 1.3, color: [130, 224, 154, 255], radius: 4.0, rings: 1, priority: 2 },
  { id: "saopaulo", label: "SAO PAULO", lon: -46.6, lat: -23.5, color: [130, 224, 154, 255], radius: 4.0, rings: 1, priority: 2 },
  { id: "nairobi", label: "NAIROBI", lon: 36.8, lat: -1.3, color: [164, 198, 248, 255], radius: 3.8, rings: 1, priority: 1 },
  { id: "sydney", label: "SYDNEY", lon: 151.2, lat: -33.9, color: [110, 196, 248, 255], radius: 3.8, rings: 1, priority: 1 },
];

function getData(target: MapBuffer): Uint8Array | Uint8ClampedArray {
  const arr = target.data ?? target.pixels ?? target.buf;
  if (!arr) throw new Error("MapBuffer must provide data, pixels, or buf");
  return arr;
}

export function blendPixel(
  target: MapBuffer,
  x: number,
  y: number,
  color: RGBA,
  alphaScale = 1,
): void {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= target.width || iy >= target.height) return;
  const a = (color[3] / 255) * alphaScale;
  if (a <= 0.002) return;
  const data = getData(target);
  const idx = (iy * target.width + ix) * 4;
  const inv = 1 - a;
  data[idx] = Math.round(color[0] * a + data[idx] * inv);
  data[idx + 1] = Math.round(color[1] * a + data[idx + 1] * inv);
  data[idx + 2] = Math.round(color[2] * a + data[idx + 2] * inv);
  data[idx + 3] = Math.min(255, Math.round(data[idx + 3] + (255 - data[idx + 3]) * a));
}

export function projectPoint(
  lon: number,
  lat: number,
  rect: MapRect,
  projection: ProjectionKind = "robinson",
): Point2D {
  const clampedLon = Math.max(-180, Math.min(180, lon));
  const clampedLat = Math.max(-85, Math.min(85, lat));
  if (projection === "equirectangular") {
    return {
      x: rect.x + ((clampedLon + 180) / 360) * rect.width,
      y: rect.y + ((90 - clampedLat) / 180) * rect.height,
    };
  }
  if (projection === "mercator") {
    const latClip = Math.max(-72, Math.min(78, clampedLat));
    const rad = (latClip * Math.PI) / 180;
    const mercY = Math.log(Math.tan(Math.PI / 4 + rad / 2));
    const maxY = Math.log(Math.tan(Math.PI / 4 + (78 * Math.PI) / 360));
    const minY = Math.log(Math.tan(Math.PI / 4 - (72 * Math.PI) / 360));
    return {
      x: rect.x + ((clampedLon + 180) / 360) * rect.width,
      y: rect.y + ((maxY - mercY) / (maxY - minY)) * rect.height,
    };
  }
  const latRad = (clampedLat * Math.PI) / 180;
  const lonScale = 0.8487 + 0.1513 * Math.cos(latRad * 1.12) - 0.14 * Math.pow(Math.abs(clampedLat) / 90, 2.6);
  const nx = 0.5 + (clampedLon / 360) * Math.max(0.52, lonScale);
  const ny = 0.52 - (clampedLat / 168) * (0.94 + 0.06 * Math.cos(latRad * 1.6));
  return { x: rect.x + nx * rect.width, y: rect.y + ny * rect.height };
}

function drawBrushDisc(target: MapBuffer, cx: number, cy: number, radius: number, color: RGBA, alphaScale = 1): void {
  const r = Math.max(0.5, radius);
  const minX = Math.floor(cx - r - 1);
  const maxX = Math.ceil(cx + r + 1);
  const minY = Math.floor(cy - r - 1);
  const maxY = Math.ceil(cy + r + 1);
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const dist = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
      const cov = Math.max(0, Math.min(1, r + 0.65 - dist));
      if (cov > 0) blendPixel(target, px, py, color, cov * alphaScale);
    }
  }
}

export function drawLine(
  target: MapBuffer,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: RGBA,
  thickness = 1.2,
  dashed = false,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return;
  const steps = Math.max(1, Math.ceil(dist * 1.6));
  const rad = thickness * 0.5;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (dashed && Math.floor((t * dist) / 7) % 2 === 1) continue;
    drawBrushDisc(target, x0 + dx * t, y0 + dy * t, rad, color);
  }
}

export function fillPolygon(target: MapBuffer, points: readonly Point2D[], color: RGBA): void {
  if (points.length < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const yStart = Math.max(0, Math.floor(minY));
  const yEnd = Math.min(target.height - 1, Math.ceil(maxY));
  const nodes: number[] = [];
  for (let y = yStart; y <= yEnd; y++) {
    const sy = y + 0.5;
    nodes.length = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const pi = points[i];
      const pj = points[j];
      if ((pi.y < sy && pj.y >= sy) || (pj.y < sy && pi.y >= sy)) {
        nodes.push(pi.x + ((sy - pi.y) / (pj.y - pi.y)) * (pj.x - pi.x));
      }
    }
    nodes.sort((a, b) => a - b);
    for (let k = 0; k + 1 < nodes.length; k += 2) {
      const x0 = Math.max(0, Math.ceil(nodes[k] - 0.5));
      const x1 = Math.min(target.width - 1, Math.floor(nodes[k + 1] - 0.5));
      for (let x = x0; x <= x1; x++) blendPixel(target, x, y, color);
    }
  }
}

export function strokePolygon(target: MapBuffer, points: readonly Point2D[], color: RGBA, thickness = 1.2): void {
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    drawLine(target, a.x, a.y, b.x, b.y, color, thickness, false);
  }
}

export function drawCircleRing(
  target: MapBuffer,
  cx: number,
  cy: number,
  radius: number,
  color: RGBA,
  thickness = 1.2,
): void {
  const segs = Math.max(20, Math.ceil(radius * 3.5));
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    drawLine(
      target,
      cx + Math.cos(a0) * radius,
      cy + Math.sin(a0) * radius,
      cx + Math.cos(a1) * radius,
      cy + Math.sin(a1) * radius,
      color,
      thickness,
    );
  }
}

export function drawOceanBackdrop(target: MapBuffer, rect: MapRect, theme: MapTheme = {}): void {
  const t = { ...DEFAULT_MAP_THEME, ...theme };
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(target.width - 1, Math.floor(rect.x + rect.width));
  const y1 = Math.min(target.height - 1, Math.floor(rect.y + rect.height));
  const cx = rect.x + rect.width * 0.5;
  const cy = rect.y + rect.height * 0.5;
  const rx = Math.max(1, rect.width * 0.52);
  const ry = Math.max(1, rect.height * 0.52);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      const lift = Math.max(0, 1 - d * 0.72);
      const c: RGBA = [
        Math.min(255, Math.round(t.oceanFill[0] + lift * 14)),
        Math.min(255, Math.round(t.oceanFill[1] + lift * 22)),
        Math.min(255, Math.round(t.oceanFill[2] + lift * 30)),
        t.oceanFill[3],
      ];
      blendPixel(target, x, y, c);
    }
  }
}

export function drawGraticule(target: MapBuffer, rect: MapRect, theme: MapTheme = {}): void {
  const t = { ...DEFAULT_MAP_THEME, ...theme };
  const proj = t.projection;
  const drawCurve = (pts: Point2D[], color: RGBA, width: number, dashed = false) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      drawLine(target, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, color, width, dashed);
    }
  };
  for (let lon = -180; lon <= 180; lon += t.gridStepLon) {
    const pts: Point2D[] = [];
    for (let lat = -75; lat <= 80; lat += 5) pts.push(projectPoint(lon, lat, rect, proj));
    const isPrime = lon === 0;
    const isEdge = lon === -180 || lon === 180;
    drawCurve(pts, isEdge ? t.oceanBorder : isPrime ? t.equatorColor : t.gridColor, isEdge ? 1.5 : 0.9);
  }
  for (let lat = -60; lat <= 75; lat += t.gridStepLat) {
    const pts: Point2D[] = [];
    for (let lon = -180; lon <= 180; lon += 6) pts.push(projectPoint(lon, lat, rect, proj));
    drawCurve(pts, lat === 0 ? t.equatorColor : t.gridColor, lat === 0 ? 1.25 : 0.9);
  }
  for (const tropic of [-23.4, 23.4]) {
    const pts: Point2D[] = [];
    for (let lon = -180; lon <= 180; lon += 8) pts.push(projectPoint(lon, tropic, rect, proj));
    drawCurve(pts, t.tropicColor, 0.9, true);
  }
}

export function drawWorldMap(
  target: MapBuffer,
  rect: MapRect,
  theme: MapTheme = {},
  continents: readonly ContinentPoly[] = WORLD_CONTINENTS,
): void {
  const t = { ...DEFAULT_MAP_THEME, ...theme };
  for (const poly of continents) {
    const pts = poly.points.map(([lon, lat]) => projectPoint(lon, lat, rect, t.projection));
    strokePolygon(target, pts, t.coastGlow, 4.2);
    fillPolygon(target, pts, t.landFill);
    const shifted = pts.map((p) => ({ x: p.x - 1.2, y: p.y - 1.2 }));
    fillPolygon(target, shifted, t.landShade);
    strokePolygon(target, pts, t.landStroke, 1.3);
  }
}

export function drawTradeArcs(
  target: MapBuffer,
  rect: MapRect,
  arcs: readonly TradeArc[] = DEFAULT_TRADE_ARCS,
  projection: ProjectionKind = "robinson",
): void {
  for (const arc of arcs) {
    const p0 = projectPoint(arc.from[0], arc.from[1], rect, projection);
    const p2 = projectPoint(arc.to[0], arc.to[1], rect, projection);
    const dx = p2.x - p0.x;
    const dy = p2.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len < 2) continue;
    const curve = (arc.curvature ?? 0.22) * len;
    const nx = -dy / len;
    const ny = dx / len;
    const cx = (p0.x + p2.x) * 0.5 + nx * curve;
    const cy = (p0.y + p2.y) * 0.5 + ny * curve;
    const steps = Math.max(24, Math.ceil(len * 1.1));
    const width = arc.width ?? 1.8;
    const glow: RGBA = arc.glowColor ?? [arc.color[0], arc.color[1], arc.color[2], Math.round(arc.color[3] * 0.26)];
    let prev = p0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const cur: Point2D = {
        x: mt * mt * p0.x + 2 * mt * t * cx + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * cy + t * t * p2.y,
      };
      if (!arc.dashed || Math.floor(i / 4) % 2 === 0) {
        drawLine(target, prev.x, prev.y, cur.x, cur.y, glow, width * 2.5, false);
        drawLine(target, prev.x, prev.y, cur.x, cur.y, arc.color, width, false);
      }
      prev = cur;
    }
    if (arc.arrow) {
      const tx = p2.x - cx;
      const ty = p2.y - cy;
      const tl = Math.max(1, Math.hypot(tx, ty));
      const ux = tx / tl;
      const uy = ty / tl;
      const head = 6.5;
      const wing = 3.2;
      const ax = p2.x - ux * head - uy * wing;
      const ay = p2.y - uy * head + ux * wing;
      const bx = p2.x - ux * head + uy * wing;
      const by = p2.y - uy * head - ux * wing;
      drawLine(target, p2.x, p2.y, ax, ay, arc.color, width);
      drawLine(target, p2.x, p2.y, bx, by, arc.color, width);
    }
  }
}

export function drawRegionalMarkers(
  target: MapBuffer,
  rect: MapRect,
  markers: readonly RegionalMarker[] = DEFAULT_REGIONAL_MARKERS,
  projection: ProjectionKind = "robinson",
): Point2D[] {
  const projected: Point2D[] = [];
  for (const m of markers) {
    const p = projectPoint(m.lon, m.lat, rect, projection);
    projected.push(p);
    const baseR = m.radius ?? 4.2;
    const rings = m.rings ?? 1;
    const ringBase: RGBA = m.ringColor ?? [m.color[0], m.color[1], m.color[2], 145];
    drawBrushDisc(target, p.x, p.y, baseR * 2.4, [m.color[0], m.color[1], m.color[2], 52]);
    for (let r = 1; r <= rings; r++) {
      const alpha = Math.max(40, Math.round(ringBase[3] / r));
      drawCircleRing(target, p.x, p.y, baseR + r * 4.5, [ringBase[0], ringBase[1], ringBase[2], alpha], 1.1);
    }
    drawBrushDisc(target, p.x, p.y, baseR, m.color);
    drawBrushDisc(target, p.x, p.y, Math.max(1.4, baseR * 0.42), [255, 255, 255, 235]);
  }
  return projected;
}

export function renderGlobalMapLayer(
  target: MapBuffer,
  rect: MapRect,
  options: GlobalMapOptions = {},
): { markers: Array<RegionalMarker & Point2D> } {
  const theme: MapTheme = { ...DEFAULT_MAP_THEME, ...options };
  const proj = theme.projection ?? "robinson";
  if (options.drawOcean !== false) drawOceanBackdrop(target, rect, theme);
  if (options.drawGraticule !== false) drawGraticule(target, rect, theme);
  if (options.drawLand !== false) drawWorldMap(target, rect, theme);
  if (options.drawArcs !== false) drawTradeArcs(target, rect, options.arcs ?? DEFAULT_TRADE_ARCS, proj);
  const markerList = options.markers ?? DEFAULT_REGIONAL_MARKERS;
  const pts = options.drawMarkers !== false
    ? drawRegionalMarkers(target, rect, markerList, proj)
    : markerList.map((m) => projectPoint(m.lon, m.lat, rect, proj));
  return {
    markers: markerList.map((m, i) => ({ ...m, x: pts[i].x, y: pts[i].y })),
  };
}

export const renderMap = renderGlobalMapLayer;
export const drawMap = renderGlobalMapLayer;
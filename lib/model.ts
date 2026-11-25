export type RadarSector =
  | "geopolitics"
  | "economy"
  | "climate"
  | "technology"
  | "society"
  | "security";

export type RadarRing = "core" | "inner" | "mid" | "outer";

export interface SnapshotItem {
  id: string;
  title: string;
  summary: string;
  sector: RadarSector;
  region: string;
  impact: number;
  urgency: number;
  reach: number;
  momentum: number;
  confidence: number;
  sources: number;
  tags: string[];
  timestamp: string;
  lat?: number;
  lon?: number;
}

export interface NewsSnapshot {
  date: string;
  edition: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  items: SnapshotItem[];
  stories: SnapshotItem[];
  meta: Record<string, unknown>;
}

export interface RadarWeights {
  impact: number;
  urgency: number;
  reach: number;
  momentum: number;
  corroboration: number;
}

export interface RadarOptions {
  weights?: Partial<RadarWeights>;
  maxBlips?: number;
  diversityDamping?: number;
  minAngleGapDeg?: number;
}

export interface RadarBlip extends SnapshotItem {
  rank: number;
  score: number;
  rawScore: number;
  ring: RadarRing;
  ringIndex: number;
  sectorIndex: number;
  angleDeg: number;
  angleRad: number;
  radius: number;
  x: number;
  y: number;
  size: number;
}

export interface SectorSummary {
  sector: RadarSector;
  label: string;
  count: number;
  avgScore: number;
  maxScore: number;
  momentum: number;
  share: number;
  startAngleDeg: number;
  endAngleDeg: number;
  topItemId: string | null;
}

export interface RegionSummary {
  region: string;
  count: number;
  avgScore: number;
  maxScore: number;
  share: number;
}

export interface RadarMetrics {
  totalItems: number;
  intensityIndex: number;
  diversityIndex: number;
  averageConfidence: number;
  netMomentum: number;
  topSector: RadarSector;
  topRegion: string;
  ringCounts: Record<RadarRing, number>;
}

export interface RadarModel {
  date: string;
  edition: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  weights: RadarWeights;
  lead: RadarBlip | null;
  blips: RadarBlip[];
  ranked: RadarBlip[];
  items: RadarBlip[];
  sectors: SectorSummary[];
  regions: RegionSummary[];
  metrics: RadarMetrics;
}

export interface BoardIssueOptions {
  masthead?: string;
  featuredCount?: number;
  briefCount?: number;
  tickerCount?: number;
}

export interface BoardIssue {
  issueId: string;
  date: string;
  edition: string;
  masthead: string;
  headline: string;
  deck: string;
  lead: RadarBlip | null;
  featured: RadarBlip[];
  briefs: RadarBlip[];
  tickers: string[];
  sectorHighlights: Array<{ sector: RadarSector; label: string; headline: string; score: number }>;
  metrics: RadarMetrics;
  status: "ready" | "degraded" | "empty";
  warnings: string[];
}

const DEFAULT_DATE = "2026-11-25";
const DEFAULT_EDITION = "Wednesday, 25 November 2026";
const DEFAULT_TIMESTAMP = "2026-11-25T12:00:00Z";

const SECTORS: readonly RadarSector[] = [
  "geopolitics",
  "economy",
  "climate",
  "technology",
  "society",
  "security",
];

const SECTOR_LABELS: Record<RadarSector, string> = {
  geopolitics: "Geopolitics",
  economy: "Economy",
  climate: "Climate & Energy",
  technology: "Tech & Science",
  society: "Society",
  security: "Security",
};

const DEFAULT_WEIGHTS: RadarWeights = {
  impact: 0.34,
  urgency: 0.24,
  reach: 0.2,
  momentum: 0.12,
  corroboration: 0.1,
};

const RING_BANDS: Record<RadarRing, [number, number]> = {
  core: [0.18, 0.34],
  inner: [0.38, 0.56],
  mid: [0.6, 0.76],
  outer: [0.8, 0.94],
};

const DEFAULT_ITEMS: readonly SnapshotItem[] = [
  {
    id: "nov25-diplomacy-accord",
    title: "Envoys advance maritime and trade corridor framework in Geneva",
    summary: "Multilateral negotiators publish draft transit guarantees linking Red Sea, Mediterranean, and Indo-Pacific ports.",
    sector: "geopolitics",
    region: "Global",
    impact: 91,
    urgency: 86,
    reach: 92,
    momentum: 64,
    confidence: 0.92,
    sources: 18,
    tags: ["diplomacy", "shipping", "geneva"],
    timestamp: "2026-11-25T08:30:00Z",
    lat: 46.2,
    lon: 6.14,
  },
  {
    id: "nov25-central-banks",
    title: "Central banks coordinate liquidity guidance ahead of year-end",
    summary: "Sovereign bond yields steady after synchronized statements from Frankfurt, Tokyo, and Washington on credit buffers.",
    sector: "economy",
    region: "Americas",
    impact: 88,
    urgency: 82,
    reach: 89,
    momentum: 48,
    confidence: 0.95,
    sources: 21,
    tags: ["markets", "rates", "liquidity"],
    timestamp: "2026-11-25T10:15:00Z",
    lat: 38.9,
    lon: -77.03,
  },
  {
    id: "nov25-grid-climate",
    title: "Southern Hemisphere heatwave tests regional power grids",
    summary: "Grid operators activate battery reserves and cross-border interconnects as early-summer temperatures set records.",
    sector: "climate",
    region: "Asia-Pacific",
    impact: 84,
    urgency: 89,
    reach: 80,
    momentum: 72,
    confidence: 0.9,
    sources: 14,
    tags: ["heatwave", "energy", "grid"],
    timestamp: "2026-11-25T06:40:00Z",
    lat: -33.86,
    lon: 151.2,
  },
  {
    id: "nov25-ai-safety-audit",
    title: "Cross-border compute and model audit standard enters phase two",
    summary: "Regulators and frontier labs adopt shared cryptographic verification benchmarks for critical-infrastructure systems.",
    sector: "technology",
    region: "Europe",
    impact: 82,
    urgency: 75,
    reach: 84,
    momentum: 58,
    confidence: 0.89,
    sources: 16,
    tags: ["ai", "standards", "compute"],
    timestamp: "2026-11-25T09:05:00Z",
    lat: 50.85,
    lon: 4.35,
  },
  {
    id: "nov25-regional-ceasefire",
    title: "Monitors review humanitarian convoy access along contested borders",
    summary: "Aid agencies report partial reopening of overland supply routes while diplomatic talks continue on buffer zones.",
    sector: "security",
    region: "Middle East",
    impact: 86,
    urgency: 88,
    reach: 83,
    momentum: 34,
    confidence: 0.86,
    sources: 15,
    tags: ["humanitarian", "ceasefire", "security"],
    timestamp: "2026-11-25T07:50:00Z",
    lat: 31.95,
    lon: 35.91,
  },
  {
    id: "nov25-health-vaccines",
    title: "African Union expands regional cold-chain manufacturing pact",
    summary: "New financing unlocks three modular vaccine and diagnostics hubs aimed at cutting import dependence.",
    sector: "society",
    region: "Africa",
    impact: 77,
    urgency: 68,
    reach: 76,
    momentum: 52,
    confidence: 0.91,
    sources: 11,
    tags: ["health", "infrastructure", "africa"],
    timestamp: "2026-11-25T11:10:00Z",
    lat: 9.03,
    lon: 38.74,
  },
];

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return v < min ? min : v > max ? max : v;
}

function round(v: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(v * factor) / factor;
}

function toNum(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toStr(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : fallback;
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function normalizeSector(raw: unknown): RadarSector {
  const s = toStr(raw, "geopolitics").toLowerCase();
  if (s === "geopolitics" || s.includes("diplom") || s.includes("polit") || s.includes("world") || s.includes("foreign")) return "geopolitics";
  if (s === "economy" || s.includes("econ") || s.includes("market") || s.includes("finan") || s.includes("trade") || s.includes("biz")) return "economy";
  if (s === "climate" || s.includes("clim") || s.includes("energ") || s.includes("envir") || s.includes("weather")) return "climate";
  if (s === "technology" || s.includes("tech") || s.includes("ai") || s.includes("cyber") || s.includes("scien") || s.includes("space")) return "technology";
  if (s === "society" || s.includes("soc") || s.includes("health") || s.includes("cultur") || s.includes("human")) return "society";
  if (s === "security" || s.includes("secur") || s.includes("defen") || s.includes("confl") || s.includes("milit") || s.includes("war")) return "security";
  return SECTORS[fnv1a(s) % SECTORS.length];
}

function normUnit100(v: unknown, fallback: number): number {
  const n = toNum(v, fallback);
  return clamp(n > 0 && n <= 1 ? n * 100 : n, 0, 100);
}

function normalizeItem(raw: unknown, idx: number, defaultTs: string): SnapshotItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = toStr(r.title ?? r.headline ?? r.name);
  if (!title) return null;
  const sector = normalizeSector(r.sector ?? r.category ?? r.topic ?? r.theme ?? r.quadrant);
  const region = toStr(r.region ?? r.location ?? r.geo, "Global");
  const summary = toStr(r.summary ?? r.deck ?? r.blurb ?? r.description, title);
  const id = toStr(r.id, `item-${idx + 1}-${fnv1a(`${sector}:${title}`).toString(16)}`);
  const impact = normUnit100(r.impact ?? r.severity ?? r.importance ?? r.weight, 65);
  const urgency = normUnit100(r.urgency ?? r.recency ?? r.timeliness, 60);
  const reach = normUnit100(r.reach ?? r.breadth ?? r.coverage, 60);
  const rawMom = toNum(r.momentum ?? r.velocity ?? r.trend ?? r.delta, 20);
  const momentum = clamp(Math.abs(rawMom) > 0 && Math.abs(rawMom) < 1 ? rawMom * 100 : rawMom, -100, 100);
  const rawConf = toNum(r.confidence ?? r.verified, 0.85);
  const confidence = clamp(rawConf > 1 ? rawConf / 100 : rawConf, 0, 1);
  const sources = Math.max(1, Math.round(toNum(r.sources ?? r.sourceCount, 3)));
  const tags = Array.isArray(r.tags)
    ? r.tags.map((t) => toStr(t)).filter(Boolean)
    : Array.isArray(r.keywords)
      ? r.keywords.map((t) => toStr(t)).filter(Boolean)
      : [sector];
  const timestamp = toStr(r.timestamp ?? r.publishedAt ?? r.date, defaultTs);
  const item: SnapshotItem = {
    id,
    title,
    summary,
    sector,
    region,
    impact: round(impact, 2),
    urgency: round(urgency, 2),
    reach: round(reach, 2),
    momentum: round(momentum, 2),
    confidence: round(confidence, 3),
    sources,
    tags,
    timestamp,
  };
  if (typeof r.lat === "number" && Number.isFinite(r.lat)) item.lat = r.lat;
  if (typeof r.lon === "number" && Number.isFinite(r.lon)) item.lon = r.lon;
  return item;
}

function parseLinesToItems(text: string, defaultTs: string): SnapshotItem[] {
  const out: SnapshotItem[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split("|").map((p) => p.trim());
    const item = normalizeItem(
      parts.length >= 2
        ? { sector: parts[0], title: parts[1], summary: parts[2] ?? parts[1], region: parts[3] ?? "Global" }
        : { title: parts[0] },
      i,
      defaultTs,
    );
    if (item) out.push(item);
  }
  return out;
}

export function parseSnapshot(input?: unknown): NewsSnapshot {
  let raw: unknown = input;
  if (raw instanceof Uint8Array) {
    raw = new TextDecoder("utf-8").decode(raw);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      raw = undefined;
    } else {
      try {
        raw = JSON.parse(trimmed);
      } catch {
        const items = parseLinesToItems(trimmed, DEFAULT_TIMESTAMP);
        raw = { items };
      }
    }
  }

  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const date = toStr(obj.date, DEFAULT_DATE);
  const edition = toStr(obj.edition, date === DEFAULT_DATE ? DEFAULT_EDITION : `Edition ${date}`);
  const title = toStr(obj.title, "World News Radar");
  const subtitle = toStr(obj.subtitle, `Global signal synthesis for ${edition}`);
  const generatedAt = toStr(obj.generatedAt, `${date}T12:00:00Z`);

  const rawList = Array.isArray(raw)
    ? raw
    : Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.stories)
        ? obj.stories
        : Array.isArray(obj.signals)
          ? obj.signals
          : Array.isArray(obj.events)
            ? obj.events
            : null;

  const parsed = rawList
    ? rawList.map((entry, i) => normalizeItem(entry, i, generatedAt)).filter((x): x is SnapshotItem => x !== null)
    : DEFAULT_ITEMS.map((item) => ({ ...item, tags: [...item.tags] }));

  const seen = new Set<string>();
  const items: SnapshotItem[] = [];
  for (const item of parsed) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  }

  const meta = obj.meta && typeof obj.meta === "object" && !Array.isArray(obj.meta)
    ? { ...(obj.meta as Record<string, unknown>) }
    : {};

  return { date, edition, title, subtitle, generatedAt, items, stories: items, meta };
}

function resolveWeights(custom?: Partial<RadarWeights>): RadarWeights {
  const merged: RadarWeights = {
    impact: Math.max(0, toNum(custom?.impact, DEFAULT_WEIGHTS.impact)),
    urgency: Math.max(0, toNum(custom?.urgency, DEFAULT_WEIGHTS.urgency)),
    reach: Math.max(0, toNum(custom?.reach, DEFAULT_WEIGHTS.reach)),
    momentum: Math.max(0, toNum(custom?.momentum, DEFAULT_WEIGHTS.momentum)),
    corroboration: Math.max(0, toNum(custom?.corroboration, DEFAULT_WEIGHTS.corroboration)),
  };
  const sum = merged.impact + merged.urgency + merged.reach + merged.momentum + merged.corroboration;
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  return {
    impact: round(merged.impact / sum, 4),
    urgency: round(merged.urgency / sum, 4),
    reach: round(merged.reach / sum, 4),
    momentum: round(merged.momentum / sum, 4),
    corroboration: round(merged.corroboration / sum, 4),
  };
}

function ringForScore(score: number): { ring: RadarRing; ringIndex: number } {
  if (score >= 78) return { ring: "core", ringIndex: 0 };
  if (score >= 62) return { ring: "inner", ringIndex: 1 };
  if (score >= 46) return { ring: "mid", ringIndex: 2 };
  return { ring: "outer", ringIndex: 3 };
}

export function buildRadar(input?: NewsSnapshot | unknown, options: RadarOptions = {}): RadarModel {
  const snap: NewsSnapshot =
    input && typeof input === "object" && Array.isArray((input as NewsSnapshot).items) && typeof (input as NewsSnapshot).date === "string"
      ? (input as NewsSnapshot)
      : parseSnapshot(input);

  const weights = resolveWeights(options.weights);
  const damping = clamp(toNum(options.diversityDamping, 0.045), 0, 0.25);
  const minGap = clamp(toNum(options.minAngleGapDeg, 8), 2, 24);
  const maxBlips = Math.max(1, Math.round(toNum(options.maxBlips, Math.max(snap.items.length, 24))));

  const preliminary = snap.items.map((item) => {
    const momNorm = clamp((item.momentum + 100) / 2, 0, 100);
    const corrob = clamp((Math.log2(item.sources + 1) / Math.log2(25)) * 100, 0, 100);
    const base =
      item.impact * weights.impact +
      item.urgency * weights.urgency +
      item.reach * weights.reach +
      momNorm * weights.momentum +
      corrob * weights.corroboration;
    const rawScore = clamp(base * (0.76 + 0.24 * item.confidence), 0, 100);
    return { item, rawScore };
  });

  preliminary.sort((a, b) =>
    b.rawScore - a.rawScore || a.item.id.localeCompare(b.item.id) || a.item.title.localeCompare(b.item.title),
  );

  const sectorSeen = new Map<RadarSector, number>();
  const scored = preliminary.map(({ item, rawScore }, idx) => {
    const prior = sectorSeen.get(item.sector) ?? 0;
    sectorSeen.set(item.sector, prior + 1);
    const dampFactor = idx === 0 ? 1 : Math.max(0.72, 1 - prior * damping);
    return { item, rawScore: round(rawScore, 2), score: round(clamp(rawScore * dampFactor, 0, 100), 2) };
  });

  scored.sort((a, b) =>
    b.score - a.score || b.rawScore - a.rawScore || a.item.id.localeCompare(b.item.id),
  );

  const sliceDeg = 360 / SECTORS.length;
  const placedAngles = new Map<string, number[]>();
  const blips: RadarBlip[] = scored.slice(0, maxBlips).map((entry, idx) => {
    const { item, score, rawScore } = entry;
    const sectorIndex = SECTORS.indexOf(item.sector);
    const { ring, ringIndex } = ringForScore(score);
    const [rMin, rMax] = RING_BANDS[ring];
    const hash = fnv1a(`${item.id}:${item.sector}`);
    const jitter = (hash % 1000) / 1000;
    const start = sectorIndex * sliceDeg + 6;
    const span = sliceDeg - 12;
    let angleDeg = start + jitter * span;

    const bucketKey = `${item.sector}:${ring}`;
    const used = placedAngles.get(bucketKey) ?? [];
    for (let attempt = 0; attempt < 12; attempt++) {
      if (used.every((a) => Math.abs(a - angleDeg) >= minGap)) break;
      angleDeg = start + ((angleDeg - start + minGap) % span);
    }
    used.push(angleDeg);
    placedAngles.set(bucketKey, used);

    const scoreRatio = clamp(1 - score / 100, 0, 1);
    const radius = round(rMin + (rMax - rMin) * clamp(scoreRatio * 0.7 + ((hash >>> 10) % 100) / 333, 0, 1), 4);
    const angleRad = round(((angleDeg - 90) * Math.PI) / 180, 5);
    return {
      ...item,
      rank: idx + 1,
      score,
      rawScore,
      ring,
      ringIndex,
      sectorIndex,
      angleDeg: round(angleDeg, 2),
      angleRad,
      radius,
      x: round(Math.cos(angleRad) * radius, 4),
      y: round(Math.sin(angleRad) * radius, 4),
      size: round(clamp(0.45 + (score / 100) * 0.85, 0.45, 1.3), 3),
    };
  });

  const total = blips.length;
  const sectors: SectorSummary[] = SECTORS.map((sector, idx) => {
    const group = blips.filter((b) => b.sector === sector);
    const count = group.length;
    const avgScore = count ? round(group.reduce((s, b) => s + b.score, 0) / count, 2) : 0;
    const maxScore = count ? group[0].score : 0;
    const momentum = count ? round(group.reduce((s, b) => s + b.momentum, 0) / count, 2) : 0;
    return {
      sector,
      label: SECTOR_LABELS[sector],
      count,
      avgScore,
      maxScore,
      momentum,
      share: total ? round(count / total, 4) : 0,
      startAngleDeg: round(idx * sliceDeg, 2),
      endAngleDeg: round((idx + 1) * sliceDeg, 2),
      topItemId: group[0]?.id ?? null,
    };
  });

  const regionMap = new Map<string, RadarBlip[]>();
  for (const b of blips) {
    const arr = regionMap.get(b.region) ?? [];
    arr.push(b);
    regionMap.set(b.region, arr);
  }
  const regions: RegionSummary[] = [...regionMap.entries()]
    .map(([region, group]) => ({
      region,
      count: group.length,
      avgScore: round(group.reduce((s, b) => s + b.score, 0) / group.length, 2),
      maxScore: Math.max(...group.map((b) => b.score)),
      share: total ? round(group.length / total, 4) : 0,
    }))
    .sort((a, b) => b.maxScore - a.maxScore || b.count - a.count || a.region.localeCompare(b.region));

  const ringCounts: Record<RadarRing, number> = { core: 0, inner: 0, mid: 0, outer: 0 };
  for (const b of blips) ringCounts[b.ring]++;

  let entropy = 0;
  for (const s of sectors) {
    if (s.share > 0) entropy -= s.share * Math.log2(s.share);
  }
  const diversityIndex = round(clamp(entropy / Math.log2(SECTORS.length), 0, 1), 3);
  const intensityIndex = total
    ? round(clamp(blips.slice(0, 5).reduce((s, b) => s + b.score, 0) / Math.min(5, total), 0, 100), 2)
    : 0;
  const averageConfidence = total ? round(blips.reduce((s, b) => s + b.confidence, 0) / total, 3) : 0;
  const netMomentum = total ? round(blips.reduce((s, b) => s + b.momentum, 0) / total, 2) : 0;
  const topSector = [...sectors].sort((a, b) => b.maxScore - a.maxScore || b.count - a.count)[0]?.sector ?? "geopolitics";
  const topRegion = regions[0]?.region ?? "Global";

  return {
    date: snap.date,
    edition: snap.edition,
    title: snap.title,
    subtitle: snap.subtitle,
    generatedAt: snap.generatedAt,
    weights,
    lead: blips[0] ?? null,
    blips,
    ranked: blips,
    items: blips,
    sectors,
    regions,
    metrics: {
      totalItems: total,
      intensityIndex,
      diversityIndex,
      averageConfidence,
      netMomentum,
      topSector,
      topRegion,
      ringCounts,
    },
  };
}

export function boardIssue(input?: RadarModel | NewsSnapshot | unknown, options: BoardIssueOptions = {}): BoardIssue {
  const radar: RadarModel =
    input && typeof input === "object" && Array.isArray((input as RadarModel).blips) && (input as RadarModel).metrics
      ? (input as RadarModel)
      : buildRadar(input);

  const featuredCount = Math.max(1, Math.round(toNum(options.featuredCount, 3)));
  const briefCount = Math.max(0, Math.round(toNum(options.briefCount, 6)));
  const tickerCount = Math.max(1, Math.round(toNum(options.tickerCount, 6)));

  const lead = radar.lead;
  const featured = radar.blips.slice(1, 1 + featuredCount);
  const briefs = radar.blips.slice(1 + featuredCount, 1 + featuredCount + briefCount);
  const tickers = radar.blips
    .slice(0, tickerCount)
    .map((b) => `[${SECTOR_LABELS[b.sector].toUpperCase()}] ${b.region}: ${b.title}`);

  const sectorHighlights = radar.sectors
    .filter((s) => s.topItemId !== null)
    .map((s) => {
      const top = radar.blips.find((b) => b.id === s.topItemId);
      return {
        sector: s.sector,
        label: s.label,
        headline: top ? top.title : "",
        score: s.maxScore,
      };
    })
    .sort((a, b) => b.score - a.score || a.sector.localeCompare(b.sector));

  const warnings: string[] = [];
  if (radar.blips.length === 0) warnings.push("No news signals available in snapshot.");
  if (radar.metrics.diversityIndex < 0.45 && radar.blips.length > 0) {
    warnings.push("Low sector diversity across ranked stories.");
  }
  if (radar.metrics.averageConfidence < 0.65 && radar.blips.length > 0) {
    warnings.push("Average source confidence is below editorial threshold.");
  }

  const status: BoardIssue["status"] =
    radar.blips.length === 0 ? "empty" : warnings.length > 0 ? "degraded" : "ready";

  return {
    issueId: `issue-${radar.date}`,
    date: radar.date,
    edition: radar.edition,
    masthead: toStr(options.masthead, "GLOBAL NEWS RADAR"),
    headline: lead ? lead.title : radar.title,
    deck: lead ? lead.summary : radar.subtitle,
    lead,
    featured,
    briefs,
    tickers,
    sectorHighlights,
    metrics: radar.metrics,
    status,
    warnings,
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const src = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(src).sort()) {
      const v = src[key];
      if (v !== undefined) sorted[key] = canonicalize(v);
    }
    return sorted;
  }
  return value;
}

export function dataScript(first: unknown, second?: unknown): string {
  const hasExplicitId = typeof first === "string" && second !== undefined;
  const rawId = hasExplicitId ? first : typeof second === "string" ? second : "radar-data";
  const payload = hasExplicitId ? second : first;
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, "-") || "radar-data";
  const json = JSON.stringify(canonicalize(payload))
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `<script id="${safeId}" type="application/json">${json}</script>`;
}
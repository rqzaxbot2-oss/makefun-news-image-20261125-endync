export type DeskCategory =
  | "geopolitics"
  | "economy"
  | "climate"
  | "science"
  | "technology"
  | "society";

export type RegionCode = "AMER" | "EMEA" | "APAC" | "GLOB";

export interface StorySignal {
  id: string;
  slug: string;
  desk: DeskCategory;
  region: RegionCode;
  headline: string;
  deck: string;
  dateline: string;
  impact: number;
  urgency: number;
  reach: number;
  confidence: number;
  coordinates: { lat: number; lon: number };
  tags: readonly string[];
}

export interface TickerQuote {
  symbol: string;
  label: string;
  value: string;
  delta: number;
  unit: string;
}

export interface EditorialIssue {
  issueId: string;
  editionDate: string;
  weekday: string;
  datelineLabel: string;
  editionNumber: number;
  bannerHeadline: string;
  subBanner: string;
  leadStoryId: string;
  stories: readonly StorySignal[];
  tickers: readonly TickerQuote[];
}

export interface RankedStory extends StorySignal {
  editorialScore: number;
  rank: number;
  tier: "lead" | "featured" | "brief";
}

export interface RadarAxis {
  axis: DeskCategory;
  label: string;
  score: number;
  normalized: number;
  storyCount: number;
  topStoryId: string;
  angleRad: number;
  x: number;
  y: number;
}

export interface RadarModel {
  issueId: string;
  editionDate: string;
  compositeIndex: number;
  dominantDesk: DeskCategory;
  axes: readonly RadarAxis[];
  polygonPoints: readonly { x: number; y: number }[];
  regionalHeat: Record<RegionCode, number>;
}

export interface NewsSnapshot {
  format: "editorial-snapshot/1";
  issueId: string;
  editionDate: string;
  bannerHeadline: string;
  leadStory: RankedStory;
  rankedStories: readonly RankedStory[];
  radar: RadarModel;
  tickers: readonly TickerQuote[];
  checksum: string;
}

const DESK_ORDER: readonly DeskCategory[] = [
  "geopolitics",
  "economy",
  "climate",
  "science",
  "technology",
  "society",
];

const DESK_LABELS: Record<DeskCategory, string> = {
  geopolitics: "Geopolitics",
  economy: "Economy",
  climate: "Climate",
  science: "Science",
  technology: "Technology",
  society: "Society",
};

const REGION_ORDER: readonly RegionCode[] = ["AMER", "EMEA", "APAC", "GLOB"];

export const boardIssue: EditorialIssue = {
  issueId: "2026-11-25-WORLD",
  editionDate: "2026-11-25",
  weekday: "Wednesday",
  datelineLabel: "WEDNESDAY, 25 NOVEMBER 2026",
  editionNumber: 329,
  bannerHeadline: "CLIMATE FINANCE, GRID SECURITY AND TRADE CORRIDORS DEFINE GLOBAL AGENDA",
  subBanner:
    "World Desk Synthesis: adaptation compacts advance as central banks hold steady and winter energy grids brace for peak load.",
  leadStoryId: "clim-compact-2026",
  stories: [
    {
      id: "clim-compact-2026",
      slug: "global-climate-adaptation-compact",
      desk: "climate",
      region: "GLOB",
      headline: "Climate Finance Compact Clears New Adaptation Funding Threshold",
      deck: "Multilateral lenders and sovereign funds lock in multi-year disbursements for coastal resilience and grid hardening.",
      dateline: "GENEVA / BELEM",
      impact: 95,
      urgency: 89,
      reach: 94,
      confidence: 0.96,
      coordinates: { lat: 46.2044, lon: 6.1432 },
      tags: ["climate", "finance", "adaptation", "multilateral"],
    },
    {
      id: "econ-rates-hold",
      slug: "central-banks-synchronized-hold",
      desk: "economy",
      region: "AMER",
      headline: "Major Central Banks Signal Synchronized Rate Hold Into Year-End",
      deck: "Cooling goods inflation balances sticky services prices as industrial output stabilizes across Atlantic economies.",
      dateline: "WASHINGTON / FRANKFURT",
      impact: 91,
      urgency: 86,
      reach: 92,
      confidence: 0.95,
      coordinates: { lat: 38.9072, lon: -77.0369 },
      tags: ["rates", "inflation", "markets", "macro"],
    },
    {
      id: "geo-maritime-lanes",
      slug: "winter-maritime-corridor-accord",
      desk: "geopolitics",
      region: "EMEA",
      headline: "Maritime States Draft Joint Risk Framework for Winter Trade Lanes",
      deck: "Port authorities and insurers coordinate transit telemetry to curb bottlenecks along key chokepoints.",
      dateline: "ROTTERDAM / SUEZ",
      impact: 88,
      urgency: 87,
      reach: 85,
      confidence: 0.93,
      coordinates: { lat: 51.9244, lon: 4.4777 },
      tags: ["shipping", "diplomacy", "trade", "logistics"],
    },
    {
      id: "tech-compute-grid",
      slug: "apac-ai-compute-power-benchmark",
      desk: "technology",
      region: "APAC",
      headline: "Regional Compute Accord Sets Power-Efficiency Rules for Data Centers",
      deck: "Grid operators across East Asia adopt real-time load shifting to pair hyperscale workloads with clean generation.",
      dateline: "TOKYO / SINGAPORE",
      impact: 86,
      urgency: 81,
      reach: 88,
      confidence: 0.94,
      coordinates: { lat: 35.6762, lon: 139.6503 },
      tags: ["ai", "energy", "datacenter", "standards"],
    },
    {
      id: "sci-ocean-array",
      slug: "deep-ocean-thermal-sensor-array",
      desk: "science",
      region: "GLOB",
      headline: "Autonomous Deep-Ocean Array Maps Sub-Surface Thermal Shifts",
      deck: "Three-basin telemetry network returns continuous profiles showing sharper winter boundary-current gradients.",
      dateline: "WOODS HOLE / HOBART",
      impact: 82,
      urgency: 74,
      reach: 84,
      confidence: 0.97,
      coordinates: { lat: -42.8821, lon: 147.3272 },
      tags: ["oceanography", "sensors", "climate-science"],
    },
    {
      id: "soc-urban-winter",
      slug: "megacities-winter-transit-resilience",
      desk: "society",
      region: "EMEA",
      headline: "Northern Megacities Expand District Heating and Storm Transit Plans",
      deck: "Municipal utilities deploy battery-backed substations ahead of early December cold fronts.",
      dateline: "HELSINKI / WARSAW",
      impact: 78,
      urgency: 80,
      reach: 79,
      confidence: 0.92,
      coordinates: { lat: 60.1699, lon: 24.9384 },
      tags: ["cities", "transit", "energy-resilience"],
    },
    {
      id: "tech-media-provenance",
      slug: "broadcast-cryptographic-provenance",
      desk: "technology",
      region: "AMER",
      headline: "Newsrooms Adopt Cryptographic Provenance Standard for Field Imagery",
      deck: "Wire services integrate hardware-signed capture metadata to verify front-page photojournalism at scale.",
      dateline: "NEW YORK / TORONTO",
      impact: 80,
      urgency: 77,
      reach: 83,
      confidence: 0.91,
      coordinates: { lat: 40.7128, lon: -74.006 },
      tags: ["media", "verification", "cryptography"],
    },
    {
      id: "econ-minerals-refining",
      slug: "critical-mineral-refining-alliances",
      desk: "economy",
      region: "APAC",
      headline: "Refining Alliances Diversify Battery and Grid-Metal Supply Chains",
      deck: "Long-term offtake contracts expand processing capacity in Australia, Southeast Asia, and South America.",
      dateline: "PERTH / SEOUL",
      impact: 83,
      urgency: 75,
      reach: 81,
      confidence: 0.92,
      coordinates: { lat: -31.9505, lon: 115.8605 },
      tags: ["minerals", "supply-chain", "industry"],
    },
  ],
  tickers: [
    { symbol: "GLB-EQ", label: "World Equity", value: "3842.6", delta: 0.42, unit: "pts" },
    { symbol: "BRENT", label: "North Sea Crude", value: "74.18", delta: -0.65, unit: "USD/bbl" },
    { symbol: "EU-GAS", label: "Winter Gas Hub", value: "38.40", delta: 1.15, unit: "EUR/MWh" },
    { symbol: "US10Y", label: "10Y Treasury", value: "4.12", delta: -0.04, unit: "%" },
    { symbol: "BDI", label: "Dry Freight", value: "1648", delta: 0.94, unit: "idx" },
    { symbol: "CO2-EU", label: "Carbon Permit", value: "71.90", delta: 0.88, unit: "EUR/t" },
  ],
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function computeChecksum(payload: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function scoreStory(story: StorySignal): number {
  const impact = clamp(story.impact, 0, 100);
  const urgency = clamp(story.urgency, 0, 100);
  const reach = clamp(story.reach, 0, 100);
  const confidence = clamp(story.confidence, 0.5, 1);
  const base = impact * 0.45 + urgency * 0.3 + reach * 0.25;
  return roundTo(base * (0.85 + 0.15 * confidence), 2);
}

export function rankStories(stories: readonly StorySignal[]): RankedStory[] {
  const sorted = [...stories].sort((a, b) => {
    const diff = scoreStory(b) - scoreStory(a);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  return sorted.map((story, idx) => ({
    ...story,
    editorialScore: scoreStory(story),
    rank: idx + 1,
    tier: idx === 0 ? "lead" : idx < 4 ? "featured" : "brief",
  }));
}

export function buildRadar(
  issue: EditorialIssue = boardIssue,
  radius = 1,
): RadarModel {
  const safeRadius = clamp(radius, 0.01, 10000);
  const ranked = rankStories(issue.stories);

  const axes: RadarAxis[] = DESK_ORDER.map((desk, idx) => {
    const deskStories = ranked.filter((s) => s.desk === desk);
    const angleRad = roundTo(-Math.PI / 2 + (idx * 2 * Math.PI) / DESK_ORDER.length, 6);
    const score =
      deskStories.length === 0
        ? 0
        : roundTo(
            deskStories[0].editorialScore * 0.72 +
              (deskStories.reduce((acc, s) => acc + s.editorialScore, 0) / deskStories.length) *
                0.28,
            2,
          );
    const normalized = roundTo(clamp(score / 100, 0, 1), 4);
    const r = normalized * safeRadius;
    return {
      axis: desk,
      label: DESK_LABELS[desk],
      score,
      normalized,
      storyCount: deskStories.length,
      topStoryId: deskStories[0]?.id ?? "",
      angleRad,
      x: roundTo(Math.cos(angleRad) * r, 4),
      y: roundTo(Math.sin(angleRad) * r, 4),
    };
  });

  const nonZero = axes.filter((a) => a.storyCount > 0);
  const compositeIndex =
    nonZero.length === 0
      ? 0
      : roundTo(nonZero.reduce((sum, a) => sum + a.score, 0) / nonZero.length, 2);

  let dominantDesk: DeskCategory = DESK_ORDER[0];
  let bestScore = -1;
  for (const axis of axes) {
    if (axis.score > bestScore) {
      bestScore = axis.score;
      dominantDesk = axis.axis;
    }
  }

  const regionalHeat: Record<RegionCode, number> = {
    AMER: 0,
    EMEA: 0,
    APAC: 0,
    GLOB: 0,
  };
  for (const region of REGION_ORDER) {
    const items = ranked.filter((s) => s.region === region);
    regionalHeat[region] =
      items.length === 0
        ? 0
        : roundTo(items.reduce((sum, s) => sum + s.editorialScore, 0) / items.length, 2);
  }

  return {
    issueId: issue.issueId,
    editionDate: issue.editionDate,
    compositeIndex,
    dominantDesk,
    axes,
    polygonPoints: axes.map((a) => ({ x: a.x, y: a.y })),
    regionalHeat,
  };
}

function buildSnapshotObject(issue: EditorialIssue): NewsSnapshot {
  const rankedStories = rankStories(issue.stories);
  if (rankedStories.length === 0) {
    throw new Error("Editorial issue must contain at least one story");
  }
  const radar = buildRadar(issue, 1);
  const core = {
    format: "editorial-snapshot/1" as const,
    issueId: issue.issueId,
    editionDate: issue.editionDate,
    bannerHeadline: issue.bannerHeadline,
    leadStory: rankedStories[0],
    rankedStories,
    radar,
    tickers: [...issue.tickers],
  };
  const checksum = computeChecksum(JSON.stringify(core));
  return { ...core, checksum };
}

export function dataScript(issue: EditorialIssue = boardIssue): string {
  const snapshot = buildSnapshotObject(issue);
  return JSON.stringify(snapshot, null, 2);
}

function isDesk(value: unknown): value is DeskCategory {
  return typeof value === "string" && (DESK_ORDER as readonly string[]).includes(value);
}

function isRegion(value: unknown): value is RegionCode {
  return typeof value === "string" && (REGION_ORDER as readonly string[]).includes(value);
}

function normalizeStory(raw: unknown, index: number): StorySignal {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid story entry at index ${index}`);
  }
  const s = raw as Record<string, unknown>;
  const id = typeof s.id === "string" && s.id.trim() ? s.id.trim() : `story-${index + 1}`;
  const headline = typeof s.headline === "string" ? s.headline.trim() : "";
  if (!headline) {
    throw new Error(`Story "${id}" is missing a headline`);
  }
  const coords =
    s.coordinates && typeof s.coordinates === "object"
      ? (s.coordinates as Record<string, unknown>)
      : {};
  return {
    id,
    slug: typeof s.slug === "string" && s.slug.trim() ? s.slug.trim() : id,
    desk: isDesk(s.desk) ? s.desk : "geopolitics",
    region: isRegion(s.region) ? s.region : "GLOB",
    headline,
    deck: typeof s.deck === "string" ? s.deck.trim() : "",
    dateline: typeof s.dateline === "string" ? s.dateline.trim() : "WORLD DESK",
    impact: clamp(Number(s.impact ?? 75), 0, 100),
    urgency: clamp(Number(s.urgency ?? 75), 0, 100),
    reach: clamp(Number(s.reach ?? 75), 0, 100),
    confidence: clamp(Number(s.confidence ?? 0.9), 0.5, 1),
    coordinates: {
      lat: clamp(Number(coords.lat ?? 0), -90, 90),
      lon: clamp(Number(coords.lon ?? 0), -180, 180),
    },
    tags: Array.isArray(s.tags)
      ? s.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      : [],
  };
}

function normalizeTicker(raw: unknown): TickerQuote | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.symbol !== "string" || typeof t.value !== "string") return null;
  return {
    symbol: t.symbol.trim(),
    label: typeof t.label === "string" ? t.label.trim() : t.symbol.trim(),
    value: t.value.trim(),
    delta: roundTo(clamp(Number(t.delta ?? 0), -1000, 1000), 4),
    unit: typeof t.unit === "string" ? t.unit.trim() : "",
  };
}

export function parseSnapshot(
  input: string | Record<string, unknown> = dataScript(boardIssue),
): NewsSnapshot {
  let parsed: unknown = input;
  if (typeof input === "string") {
    const trimmed = input
      .trim()
      .replace(/^(?:export\s+const|const|var|let|window\.[A-Za-z0-9_$]+)\s+[A-Za-z0-9_$]*\s*=\s*/u, "")
      .replace(/;\s*$/u, "");
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse news snapshot JSON: ${msg}`);
    }
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Snapshot payload must be an object");
  }
  const obj = parsed as Record<string, unknown>;
  const rawStories = Array.isArray(obj.rankedStories)
    ? obj.rankedStories
    : Array.isArray(obj.stories)
      ? obj.stories
      : null;

  if (!rawStories || rawStories.length === 0) {
    throw new Error("Snapshot payload contains no stories");
  }

  const stories = rawStories.map((entry, idx) => normalizeStory(entry, idx));
  const rawTickers = Array.isArray(obj.tickers) ? obj.tickers : boardIssue.tickers;
  const tickers = rawTickers
    .map((entry) => normalizeTicker(entry))
    .filter((entry): entry is TickerQuote => entry !== null);

  const issue: EditorialIssue = {
    issueId:
      typeof obj.issueId === "string" && obj.issueId.trim()
        ? obj.issueId.trim()
        : boardIssue.issueId,
    editionDate:
      typeof obj.editionDate === "string" && obj.editionDate.trim()
        ? obj.editionDate.trim()
        : boardIssue.editionDate,
    weekday: typeof obj.weekday === "string" ? obj.weekday : boardIssue.weekday,
    datelineLabel:
      typeof obj.datelineLabel === "string" ? obj.datelineLabel : boardIssue.datelineLabel,
    editionNumber: Number.isFinite(Number(obj.editionNumber))
      ? Math.trunc(Number(obj.editionNumber))
      : boardIssue.editionNumber,
    bannerHeadline:
      typeof obj.bannerHeadline === "string" && obj.bannerHeadline.trim()
        ? obj.bannerHeadline.trim()
        : boardIssue.bannerHeadline,
    subBanner: typeof obj.subBanner === "string" ? obj.subBanner : boardIssue.subBanner,
    leadStoryId: stories[0].id,
    stories,
    tickers,
  };

  return buildSnapshotObject(issue);
}
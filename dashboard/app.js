(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var FALLBACK_DATA = {
    meta: {
      title: "Global News Front Page — 25 November 2026",
      edition: "Wednesday, 25 November 2026",
      slug: "news-image-20261125",
      imagePath: "../output/entry.png",
      width: 1024,
      height: 1024,
      bytes: 0,
      sha256: "deterministic-build",
      deterministic: true,
      palette: ["#0d1b2a", "#1b263b", "#415a77", "#e07a5f", "#f2cc8f", "#f4f1de"]
    },
    regions: [
      { id: "americas", name: "Americas", score: 86, trend: "+4", tone: "high", summary: "Trade, energy transition, and fiscal policy signals." },
      { id: "europe", name: "Europe", score: 82, trend: "+2", tone: "high", summary: "Grid resilience, industrial coordination, and winter supply." },
      { id: "apac", name: "Asia-Pacific", score: 89, trend: "+6", tone: "peak", summary: "Semiconductor logistics, maritime corridors, and AI governance." },
      { id: "mea", name: "Middle East & Africa", score: 74, trend: "-1", tone: "elevated", summary: "Infrastructure corridors, diplomatic talks, and solar buildout." },
      { id: "global", name: "Global Systems", score: 91, trend: "+5", tone: "peak", summary: "Climate summit accords, orbital telecoms, and cross-border markets." }
    ],
    briefs: [
      {
        id: "brief-1",
        rank: 1,
        region: "global",
        regionLabel: "Global Systems",
        category: "Climate & Energy",
        headline: "Post-summit clean grid financing compact enters implementation phase",
        summary: "Multilateral lenders and regional grid operators outline joint storage and transmission benchmarks for 2027.",
        impact: 94,
        tags: ["energy", "grid", "accord"]
      },
      {
        id: "brief-2",
        rank: 2,
        region: "apac",
        regionLabel: "Asia-Pacific",
        category: "Technology",
        headline: "Cross-border compute and semiconductor supply corridors expand capacity",
        summary: "New fabrication and packaging hubs synchronize export verification and automated port throughput.",
        impact: 89,
        tags: ["chips", "logistics", "ai"]
      },
      {
        id: "brief-3",
        rank: 3,
        region: "americas",
        regionLabel: "Americas",
        category: "Economy",
        headline: "Central banks calibrate rate guidance ahead of year-end liquidity cycle",
        summary: "Treasury yields stabilize as trade balances reflect resilient services and lower freight inflation.",
        impact: 85,
        tags: ["markets", "rates", "trade"]
      },
      {
        id: "brief-4",
        rank: 4,
        region: "europe",
        regionLabel: "Europe",
        category: "Infrastructure",
        headline: "Continental interconnectors balance peak autumn wind generation",
        summary: "High-voltage subsea cables cut curtailment while industrial storage pilots scale across northern hubs.",
        impact: 81,
        tags: ["power", "wind", "interconnect"]
      },
      {
        id: "brief-5",
        rank: 5,
        region: "mea",
        regionLabel: "Middle East & Africa",
        category: "Diplomacy & Trade",
        headline: "Red Sea and East African port modernization pacts draw sovereign capital",
        summary: "Rail-to-port corridors and desalination investments anchor regional commerce agendas.",
        impact: 76,
        tags: ["ports", "water", "rail"]
      }
    ]
  };

  var state = {
    region: "all",
    category: "all",
    query: "",
    sortBy: "rank",
    selectedBriefId: null,
    gridOverlay: false,
    zoomed: false
  };

  function clamp(value, min, max) {
    var num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function formatBytes(bytes) {
    var num = Number(bytes);
    if (!Number.isFinite(num) || num <= 0) return "—";
    if (num < 1024) return num + " B";
    if (num < 1024 * 1024) return (num / 1024).toFixed(1) + " KiB";
    return (num / (1024 * 1024)).toFixed(2) + " MiB";
  }

  function pick(obj, keys, fallback) {
    if (!obj || typeof obj !== "object") return fallback;
    for (var i = 0; i < keys.length; i++) {
      var val = obj[keys[i]];
      if (val !== undefined && val !== null && val !== "") return val;
    }
    return fallback;
  }

  function q(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var node = document.querySelector(selectors[i]);
      if (node) return node;
    }
    return null;
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var val = attrs[key];
        if (val === undefined || val === null) return;
        if (key === "className") {
          node.className = val;
        } else if (key === "text") {
          node.textContent = String(val);
        } else if (key === "dataset" && typeof val === "object") {
          Object.keys(val).forEach(function (dk) {
            node.dataset[dk] = String(val[dk]);
          });
        } else if (key.indexOf("on") === 0 && typeof val === "function") {
          node.addEventListener(key.slice(2).toLowerCase(), val);
        } else {
          node.setAttribute(key, String(val));
        }
      });
    }
    if (Array.isArray(children)) {
      children.forEach(function (child) {
        if (child === null || child === undefined) return;
        if (typeof child === "string" || typeof child === "number") {
          node.appendChild(document.createTextNode(String(child)));
        } else {
          node.appendChild(child);
        }
      });
    }
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        node.setAttribute(k, String(attrs[k]));
      });
    }
    return node;
  }

  function resolveRawData() {
    var candidates = [
      window.NEWS_DOSSIER,
      window.DOSSIER_DATA,
      window.NEWS_DATA,
      window.BRIEF_DATA,
      window.DASHBOARD_DATA,
      window.ENTRY_DATA,
      window.__DATA__,
      window.DATA
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] && typeof candidates[i] === "object") {
        return candidates[i];
      }
    }
    return null;
  }

  function normalizeData(raw) {
    var src = raw || FALLBACK_DATA;
    var rawMeta = pick(src, ["meta", "dossier", "edition", "metadata"], src);
    var meta = {
      title: pick(rawMeta, ["title", "name", "headline"], FALLBACK_DATA.meta.title),
      edition: pick(rawMeta, ["edition", "dateLabel", "date", "published"], FALLBACK_DATA.meta.edition),
      slug: pick(rawMeta, ["slug", "id", "bountyId"], FALLBACK_DATA.meta.slug),
      imagePath: pick(rawMeta, ["imagePath", "image", "artwork", "entryImage"], FALLBACK_DATA.meta.imagePath),
      width: Number(pick(rawMeta, ["width", "imageWidth"], FALLBACK_DATA.meta.width)) || 1024,
      height: Number(pick(rawMeta, ["height", "imageHeight"], FALLBACK_DATA.meta.height)) || 1024,
      bytes: Number(pick(rawMeta, ["bytes", "sizeBytes", "fileSize"], 0)) || 0,
      sha256: pick(rawMeta, ["sha256", "hash", "digest", "checksum"], FALLBACK_DATA.meta.sha256),
      deterministic: pick(rawMeta, ["deterministic", "verified"], true) !== false,
      palette: Array.isArray(rawMeta.palette) ? rawMeta.palette : FALLBACK_DATA.meta.palette
    };

    var rawRegions = pick(src, ["regions", "gauges", "signals", "regionalSignals"], FALLBACK_DATA.regions);
    var regions = (Array.isArray(rawRegions) ? rawRegions : FALLBACK_DATA.regions).map(function (r, idx) {
      var name = pick(r, ["name", "label", "region", "title"], "Region " + (idx + 1));
      var score = clamp(pick(r, ["score", "signal", "index", "value", "intensity"], 70), 0, 100);
      return {
        id: slugify(pick(r, ["id", "key", "code"], name)),
        name: name,
        score: Math.round(score),
        trend: String(pick(r, ["trend", "delta", "change"], "0")),
        tone: pick(r, ["tone", "level", "status"], score >= 88 ? "peak" : score >= 78 ? "high" : "elevated"),
        summary: pick(r, ["summary", "note", "description"], "")
      };
    });

    var rawBriefs = pick(src, ["briefs", "stories", "items", "headlines", "rankedBriefs"], FALLBACK_DATA.briefs);
    var briefs = (Array.isArray(rawBriefs) ? rawBriefs : FALLBACK_DATA.briefs).map(function (b, idx) {
      var regionLabel = pick(b, ["regionLabel", "regionName", "region"], "Global");
      var regionId = slugify(pick(b, ["regionId", "regionKey", "region"], regionLabel));
      var impact = clamp(pick(b, ["impact", "score", "signal", "weight", "priority"], 80 - idx * 3), 0, 100);
      var rawTags = pick(b, ["tags", "keywords", "topics"], []);
      return {
        id: String(pick(b, ["id", "slug"], "brief-" + (idx + 1))),
        rank: Number(pick(b, ["rank", "order"], idx + 1)) || idx + 1,
        region: regionId,
        regionLabel: regionLabel,
        category: pick(b, ["category", "beat", "section", "desk"], "World"),
        headline: pick(b, ["headline", "title", "name"], "Untitled Brief"),
        summary: pick(b, ["summary", "dek", "body", "description"], ""),
        impact: Math.round(impact),
        tags: Array.isArray(rawTags) ? rawTags.map(String) : []
      };
    });

    briefs.sort(function (a, b) {
      return a.rank - b.rank || b.impact - a.impact;
    });

    return { meta: meta, regions: regions, briefs: briefs };
  }

  function createGaugeSvg(score) {
    var radius = 34;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference * (1 - clamp(score, 0, 100) / 100);

    var svg = svgEl("svg", {
      class: "gauge-ring",
      viewBox: "0 0 84 84",
      width: "84",
      height: "84",
      role: "img",
      "aria-label": "Signal index " + score + " out of 100"
    });

    svg.appendChild(svgEl("circle", {
      class: "gauge-track",
      cx: "42",
      cy: "42",
      r: String(radius),
      fill: "none",
      "stroke-width": "7"
    }));

    svg.appendChild(svgEl("circle", {
      class: "gauge-arc",
      cx: "42",
      cy: "42",
      r: String(radius),
      fill: "none",
      "stroke-width": "7",
      "stroke-linecap": "round",
      "stroke-dasharray": circumference.toFixed(2),
      "stroke-dashoffset": offset.toFixed(2),
      transform: "rotate(-90 42 42)"
    }));

    var valueText = svgEl("text", {
      class: "gauge-value",
      x: "42",
      y: "46",
      "text-anchor": "middle"
    });
    valueText.textContent = String(score);
    svg.appendChild(valueText);

    return svg;
  }

  function setText(selectors, value) {
    var node = q(selectors);
    if (node) node.textContent = String(value);
  }

  function renderMetadata(data) {
    var m = data.meta;
    setText(["#dossier-title", "[data-meta='title']", ".dossier-title"], m.title);
    setText(["#dossier-edition", "#edition-date", "[data-meta='edition']", ".edition-date"], m.edition);
    setText(["#dossier-slug", "[data-meta='slug']"], m.slug);
    setText(["#dossier-dimensions", "[data-meta='dimensions']"], m.width + " × " + m.height + " px");
    setText(["#dossier-size", "[data-meta='bytes']"], formatBytes(m.bytes));
    setText(["#dossier-sha", "[data-meta='sha256']"], m.sha256.length > 16 ? m.sha256.slice(0, 16) + "…" : m.sha256);
    setText(["#dossier-status", "[data-meta='deterministic']"], m.deterministic ? "Deterministic · Verified" : "Unverified");
    setText(["#brief-count", "[data-meta='briefCount']"], data.briefs.length + " briefs");

    var img = q(["#entry-preview", "#artwork-image", "[data-role='preview']", ".artwork-preview img"]);
    if (img && img.tagName === "IMG") {
      if (!img.getAttribute("src") && m.imagePath) {
        img.setAttribute("src", m.imagePath);
      }
      img.setAttribute("alt", m.title);
    }

    var metaList = q(["#dossier-metadata", "#metadata-grid", "[data-slot='metadata']"]);
    if (metaList) {
      metaList.textContent = "";
      var rows = [
        ["Edition", m.edition],
        ["Bounty", m.slug],
        ["Canvas", m.width + " × " + m.height + " PNG"],
        ["Payload", formatBytes(m.bytes)],
        ["Digest", m.sha256.length > 20 ? m.sha256.slice(0, 20) + "…" : m.sha256],
        ["Determinism", m.deterministic ? "Byte-identical" : "Pending"]
      ];
      rows.forEach(function (pair) {
        metaList.appendChild(
          el("div", { className: "meta-item" }, [
            el("span", { className: "meta-label", text: pair[0] }),
            el("strong", { className: "meta-value", text: pair[1] })
          ])
        );
      });
    }

    var paletteBox = q(["#palette-swatches", "[data-slot='palette']"]);
    if (paletteBox && Array.isArray(m.palette)) {
      paletteBox.textContent = "";
      m.palette.forEach(function (hex) {
        var chip = el("span", {
          className: "palette-swatch",
          title: hex,
          "aria-label": "Color " + hex
        });
        chip.style.backgroundColor = hex;
        paletteBox.appendChild(chip);
      });
    }
  }

  function renderGauges(data, onUpdate) {
    var container = q(["#regional-gauges", "#signal-gauges", "[data-slot='gauges']", ".gauges-grid"]);
    if (!container) return;
    container.textContent = "";

    data.regions.forEach(function (region) {
      var active = state.region === region.id;
      var count = data.briefs.filter(function (b) { return b.region === region.id; }).length;
      var card = el("button", {
        type: "button",
        className: "gauge-card tone-" + region.tone + (active ? " is-active" : ""),
        "aria-pressed": active ? "true" : "false",
        dataset: { region: region.id },
        onClick: function () {
          state.region = state.region === region.id ? "all" : region.id;
          onUpdate();
        }
      }, [
        createGaugeSvg(region.score),
        el("div", { className: "gauge-body" }, [
          el("div", { className: "gauge-head" }, [
            el("span", { className: "gauge-name", text: region.name }),
            el("span", { className: "gauge-trend", text: region.trend })
          ]),
          el("p", { className: "gauge-summary", text: region.summary }),
          el("span", { className: "gauge-meta", text: count + (count === 1 ? " brief" : " briefs") })
        ])
      ]);
      container.appendChild(card);
    });
  }

  function renderFilterControls(data, onUpdate) {
    var bar = q(["#filter-bar", "#category-filters", "[data-slot='filters']"]);
    if (!bar) return;
    bar.textContent = "";

    var categories = ["all"];
    data.briefs.forEach(function (b) {
      if (categories.indexOf(b.category) === -1) categories.push(b.category);
    });

    categories.forEach(function (cat) {
      var isActive = state.category === cat;
      bar.appendChild(
        el("button", {
          type: "button",
          className: "filter-pill" + (isActive ? " is-active" : ""),
          "aria-pressed": isActive ? "true" : "false",
          text: cat === "all" ? "All Desks" : cat,
          onClick: function () {
            state.category = cat;
            onUpdate();
          }
        })
      );
    });

    if (state.region !== "all") {
      bar.appendChild(
        el("button", {
          type: "button",
          className: "filter-pill filter-reset",
          text: "Clear Region (" + state.region + ") ×",
          onClick: function () {
            state.region = "all";
            onUpdate();
          }
        })
      );
    }
  }

  function getVisibleBriefs(data) {
    var qText = state.query.trim().toLowerCase();
    var list = data.briefs.filter(function (b) {
      if (state.region !== "all" && b.region !== state.region) return false;
      if (state.category !== "all" && b.category !== state.category) return false;
      if (qText) {
        var hay = (b.headline + " " + b.summary + " " + b.category + " " + b.regionLabel + " " + b.tags.join(" ")).toLowerCase();
        if (hay.indexOf(qText) === -1) return false;
      }
      return true;
    });

    return list.slice().sort(function (a, b) {
      if (state.sortBy === "impact") return b.impact - a.impact || a.rank - b.rank;
      return a.rank - b.rank || b.impact - a.impact;
    });
  }

  function renderInspector(brief) {
    var panel = q(["#brief-inspector", "#dossier-inspector", "[data-slot='inspector']"]);
    if (!panel) return;
    panel.textContent = "";

    if (!brief) {
      panel.appendChild(el("p", { className: "empty-state", text: "Select a brief to inspect its dossier telemetry." }));
      return;
    }

    var meterFill = el("span", { className: "impact-fill" });
    meterFill.style.width = brief.impact + "%";

    panel.appendChild(
      el("article", { className: "inspector-card" }, [
        el("div", { className: "inspector-kicker" }, [
          el("span", { className: "rank-badge", text: "RANK #" + brief.rank }),
          el("span", { className: "desk-badge", text: brief.category }),
          el("span", { className: "region-badge", text: brief.regionLabel })
        ]),
        el("h3", { className: "inspector-headline", text: brief.headline }),
        el("p", { className: "inspector-summary", text: brief.summary }),
        el("div", { className: "impact-row" }, [
          el("span", { text: "Editorial Impact Index" }),
          el("strong", { text: brief.impact + " / 100" })
        ]),
        el("div", { className: "impact-meter" }, [meterFill]),
        el("div", { className: "tag-list" }, brief.tags.map(function (t) {
          return el("span", { className: "tag-chip", text: "#" + t });
        }))
      ])
    );
  }

  function renderBriefs(data, onUpdate) {
    var listEl = q(["#ranked-briefs", "#briefs-list", "[data-slot='briefs']", ".briefs-list"]);
    var visible = getVisibleBriefs(data);

    setText(["#visible-brief-count", "[data-slot='visibleCount']"], visible.length + " / " + data.briefs.length);

    if (!state.selectedBriefId || !visible.some(function (b) { return b.id === state.selectedBriefId; })) {
      state.selectedBriefId = visible.length ? visible[0].id : null;
    }

    var selected = visible.find(function (b) { return b.id === state.selectedBriefId; }) || null;
    renderInspector(selected);

    if (!listEl) return;
    listEl.textContent = "";

    if (!visible.length) {
      listEl.appendChild(
        el("div", { className: "empty-state" }, [
          el("p", { text: "No briefs match the active filters." }),
          el("button", {
            type: "button",
            className: "filter-pill",
            text: "Reset Filters",
            onClick: function () {
              state.region = "all";
              state.category = "all";
              state.query = "";
              var search = q(["#brief-search", "[data-role='search']"]);
              if (search) search.value = "";
              onUpdate();
            }
          })
        ])
      );
      return;
    }

    visible.forEach(function (brief) {
      var isSelected = brief.id === state.selectedBriefId;
      var barFill = el("span", { className: "brief-meter-fill" });
      barFill.style.width = brief.impact + "%";

      var card = el("article", {
        className: "brief-card" + (isSelected ? " is-selected" : ""),
        tabIndex: "0",
        role: "button",
        "aria-pressed": isSelected ? "true" : "false",
        dataset: { briefId: brief.id, region: brief.region },
        onClick: function () {
          state.selectedBriefId = brief.id;
          onUpdate();
        },
        onKeydown: function (ev) {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            state.selectedBriefId = brief.id;
            onUpdate();
          }
        }
      }, [
        el("div", { className: "brief-header" }, [
          el("span", { className: "rank-badge", text: String(brief.rank).padStart(2, "0") }),
          el("span", { className: "brief-desk", text: brief.category }),
          el("span", { className: "brief-region", text: brief.regionLabel }),
          el("span", { className: "brief-score", text: brief.impact + " pts" })
        ]),
        el("h3", { className: "brief-headline", text: brief.headline }),
        el("p", { className: "brief-summary", text: brief.summary }),
        el("div", { className: "brief-meter" }, [barFill]),
        brief.tags.length
          ? el("div", { className: "tag-list" }, brief.tags.map(function (t) {
              return el("span", { className: "tag-chip", text: "#" + t });
            }))
          : null
      ]);
      listEl.appendChild(card);
    });
  }

  function bindControls(data, onUpdate) {
    var search = q(["#brief-search", "[data-role='search']", "input[type='search']"]);
    if (search) {
      search.addEventListener("input", function (ev) {
        state.query = ev.target.value || "";
        onUpdate();
      });
    }

    var sortSelect = q(["#brief-sort", "[data-role='sort']"]);
    if (sortSelect) {
      sortSelect.addEventListener("change", function (ev) {
        state.sortBy = ev.target.value === "impact" ? "impact" : "rank";
        onUpdate();
      });
    }

    var gridBtn = q(["#toggle-grid", "[data-action='toggle-grid']"]);
    var frame = q(["#artwork-frame", ".artwork-frame", ".artwork-preview"]);
    if (gridBtn && frame) {
      gridBtn.addEventListener("click", function () {
        state.gridOverlay = !state.gridOverlay;
        frame.classList.toggle("show-grid", state.gridOverlay);
        gridBtn.setAttribute("aria-pressed", state.gridOverlay ? "true" : "false");
      });
    }

    var zoomBtn = q(["#toggle-zoom", "[data-action='toggle-zoom']"]);
    if (zoomBtn && frame) {
      zoomBtn.addEventListener("click", function () {
        state.zoomed = !state.zoomed;
        frame.classList.toggle("is-zoomed", state.zoomed);
        zoomBtn.setAttribute("aria-pressed", state.zoomed ? "true" : "false");
      });
    }

    var copyBtn = q(["#copy-digest", "[data-action='copy-digest']"]);
    if (copyBtn && navigator.clipboard) {
      copyBtn.addEventListener("click", function () {
        navigator.clipboard.writeText(data.meta.sha256).then(function () {
          var original = copyBtn.textContent;
          copyBtn.textContent = "Copied";
          window.setTimeout(function () {
            copyBtn.textContent = original;
          }, 1200);
        }).catch(function () {});
      });
    }
  }

  function ensureFallbackMount() {
    var hasSlots = q(["#ranked-briefs", "#briefs-list", "#regional-gauges", "#dossier-metadata"]);
    if (hasSlots) return;
    var root = q(["#app", "main", "body"]);
    if (!root) return;
    root.appendChild(
      el("div", { className: "dossier-shell" }, [
        el("section", { id: "dossier-metadata", className: "meta-grid" }),
        el("section", { id: "regional-gauges", className: "gauges-grid" }),
        el("div", { id: "filter-bar", className: "filter-bar" }),
        el("section", { id: "ranked-briefs", className: "briefs-list" }),
        el("aside", { id: "brief-inspector", className: "inspector-panel" })
      ])
    );
  }

  function boot() {
    ensureFallbackMount();
    var data = normalizeData(resolveRawData());

    function renderAll() {
      renderMetadata(data);
      renderGauges(data, renderAll);
      renderFilterControls(data, renderAll);
      renderBriefs(data, renderAll);
    }

    bindControls(data, renderAll);
    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
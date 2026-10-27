import { DATA_URLS, MAPBOX_TOKEN } from "./config.js";
import {
  highlightFeatures,
  zoomToFeatures,
  clearHighlight,
  showResultPopup
} from "./map-actions.js";

const LOCAL_SOURCES = [
  {
    key: "cities",
    url: DATA_URLS.cities,
    icon: "●",
    group: "Bandar DPN3",
    name: (p) => p.nama_bandar,
    subtitle: (p) => `${p.hierarki || "Bandar"} · ${p.daerah || "Selangor"}`
  },
  {
    key: "pbt",
    url: DATA_URLS.pbt,
    icon: "▱",
    group: "Sempadan PBT",
    name: (p) => p.web_name,
    subtitle: (p) => p.web_type || "PBT"
  },
  {
    key: "districts",
    url: DATA_URLS.districts,
    icon: "◇",
    group: "Sempadan Daerah",
    name: (p) => `Daerah ${p.web_name}`,
    subtitle: (p) => `Kod ${p.web_code || "-"}`
  },
  {
    key: "health",
    url: DATA_URLS.health,
    icon: "■",
    group: "Kesihatan",
    name: (p) => p.web_name,
    subtitle: (p) => `${p.web_category || "Kemudahan Kesihatan"} · ${p.web_district || "Selangor"}`
  },
  {
    key: "schools",
    url: DATA_URLS.schools,
    icon: "◆",
    group: "Pendidikan",
    name: (p) => p.web_name,
    subtitle: (p) => `${p.web_level || "Sekolah"} · ${p.web_district || "Selangor"}`
  },
  {
    key: "police",
    url: DATA_URLS.police,
    icon: "▣",
    group: "Keselamatan",
    name: (p) => p.web_name,
    subtitle: (p) => `${p.web_hierarchy || "PDRM"} · ${p.web_district || "Selangor"}`
  }
];

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchText(properties = {}) {
  return normalize(Object.values(properties).join(" "));
}

function scoreMatch(query, name, properties) {
  const q = normalize(query);
  const n = normalize(name);
  const all = searchText(properties);

  if (!q) return 0;
  if (n === q) return 120;
  if (n.startsWith(q)) return 100;
  if (n.includes(q)) return 80;

  const words = q.split(" ").filter(Boolean);
  const matched = words.filter((word) => all.includes(word)).length;

  if (matched === words.length) return 60 + matched;
  if (matched > 0) return 20 + matched;
  return 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function areaText(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number.toLocaleString("ms-MY", {
    maximumFractionDigits: 2
  })} hektar`;
}

export class SmartSearch {
  constructor({ map, viewModeProvider }) {
    this.map = map;
    this.viewModeProvider = viewModeProvider;
    this.form = document.getElementById("searchForm");
    this.input = document.getElementById("searchInput");
    this.results = document.getElementById("searchResults");
    this.clearButton = document.getElementById("clearSearchBtn");
    this.localIndex = [];
    this.activeIndex = -1;
    this.currentResults = [];
    this.debounceTimer = null;
    this.loaded = false;

    this.bind();
    this.loadLocalIndex();
  }

  bind() {
    this.input.addEventListener("input", () => {
      const hasValue = Boolean(this.input.value.trim());
      this.clearButton.hidden = !hasValue;

      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.run(this.input.value.trim(), { includeMapbox: false });
      }, 180);
    });

    this.input.addEventListener("keydown", (event) => {
      if (this.results.hidden || !this.currentResults.length) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        this.setActive(Math.min(
          this.activeIndex + 1,
          this.currentResults.length - 1
        ));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        this.setActive(Math.max(this.activeIndex - 1, 0));
      } else if (event.key === "Enter" && this.activeIndex >= 0) {
        event.preventDefault();
        this.select(this.currentResults[this.activeIndex]);
      } else if (event.key === "Escape") {
        this.hide();
      }
    });

    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.run(this.input.value.trim(), { includeMapbox: true });
    });

    this.clearButton.addEventListener("click", () => {
      this.input.value = "";
      this.clearButton.hidden = true;
      this.hide();
      clearHighlight(this.map);
      this.input.focus();
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".search-panel")) {
        this.hide();
      }
    });
  }

  async loadLocalIndex() {
    const responses = await Promise.allSettled(
      LOCAL_SOURCES.map(async (source) => {
        const response = await fetch(source.url, { cache: "no-store" });
        if (!response.ok) throw new Error(source.key);
        const data = await response.json();

        return (data.features || []).map((feature) => {
          const properties = feature.properties || {};
          const name = source.name(properties) || source.group;

          return {
            type: "local",
            sourceKey: source.key,
            group: source.group,
            icon: source.icon,
            name,
            subtitle: source.subtitle(properties),
            feature,
            score: 0
          };
        });
      })
    );

    this.localIndex = responses
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);

    this.loaded = true;
  }

  localResults(query) {
    return this.localIndex
      .map((item) => ({
        ...item,
        score: scoreMatch(
          query,
          item.name,
          item.feature.properties || {}
        )
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) =>
        b.score - a.score ||
        a.group.localeCompare(b.group) ||
        a.name.localeCompare(b.name)
      )
      .slice(0, 12);
  }

  async mapboxResults(query) {
    const url = new URL(
      "https://api.mapbox.com/search/geocode/v6/forward"
    );
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", MAPBOX_TOKEN);
    url.searchParams.set("limit", "5");
    url.searchParams.set("country", "MY");
    url.searchParams.set("language", "ms,en");
    url.searchParams.set("proximity", "101.5183,3.0738");

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();

    return (data.features || []).map((feature) => ({
      type: "mapbox",
      sourceKey: "mapbox",
      group: "Lokasi Umum",
      icon: "⌖",
      name:
        feature.properties?.name ||
        feature.properties?.full_address ||
        "Lokasi",
      subtitle:
        feature.properties?.full_address ||
        feature.properties?.place_formatted ||
        "Mapbox",
      feature,
      score: 1
    }));
  }

  async run(query, { includeMapbox = false } = {}) {
    if (!query) {
      this.hide();
      return;
    }

    this.results.hidden = false;
    this.input.setAttribute("aria-expanded", "true");
    this.results.innerHTML =
      '<div class="smart-search-status">Mencari dalam data SUO...</div>';

    if (!this.loaded) {
      await this.loadLocalIndex();
    }

    const local = this.localResults(query);
    let external = [];

    if (includeMapbox || local.length < 3) {
      try {
        external = await this.mapboxResults(query);
      } catch (_) {
        external = [];
      }
    }

    this.currentResults = [...local, ...external];
    this.activeIndex = this.currentResults.length ? 0 : -1;
    this.render(query);
  }

  render(query) {
    if (!this.currentResults.length) {
      this.results.innerHTML = `
        <div class="smart-search-empty">
          Tiada hasil untuk “${escapeHtml(query)}”.
        </div>
      `;
      return;
    }

    const grouped = new Map();

    this.currentResults.forEach((item, index) => {
      if (!grouped.has(item.group)) grouped.set(item.group, []);
      grouped.get(item.group).push({ item, index });
    });

    this.results.innerHTML = "";

    grouped.forEach((entries, group) => {
      const section = document.createElement("section");
      section.className = "smart-search-group";

      const heading = document.createElement("div");
      heading.className = "smart-search-group-title";
      heading.textContent = group;
      section.appendChild(heading);

      entries.forEach(({ item, index }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "smart-search-result";
        button.dataset.index = String(index);
        button.setAttribute("role", "option");
        button.setAttribute(
          "aria-selected",
          String(index === this.activeIndex)
        );

        button.innerHTML = `
          <span class="smart-result-icon">${escapeHtml(item.icon)}</span>
          <span class="smart-result-copy">
            <strong>${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(item.subtitle)}</small>
          </span>
          <span class="smart-result-arrow">›</span>
        `;

        if (index === this.activeIndex) {
          button.classList.add("active");
        }

        button.addEventListener("mouseenter", () => {
          this.setActive(index);
        });

        button.addEventListener("click", () => {
          this.select(item);
        });

        section.appendChild(button);
      });

      this.results.appendChild(section);
    });
  }

  setActive(index) {
    this.activeIndex = index;

    this.results
      .querySelectorAll(".smart-search-result")
      .forEach((button) => {
        const selected =
          Number(button.dataset.index) === this.activeIndex;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-selected", String(selected));
        if (selected) {
          button.scrollIntoView({ block: "nearest" });
        }
      });
  }

  select(item) {
    this.input.value = item.name;
    this.clearButton.hidden = false;

    if (item.type === "mapbox") {
      const coordinates = item.feature.geometry?.coordinates;
      if (!coordinates) return;

      clearHighlight(this.map);
      this.map.flyTo({
        center: coordinates,
        zoom: 16,
        pitch: this.viewModeProvider() === "3d" ? 60 : 0,
        bearing: 0,
        duration: 1400
      });

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <strong>${escapeHtml(item.name)}</strong><br>
          ${escapeHtml(item.subtitle)}
        `)
        .addTo(this.map);

      this.hide();
      return;
    }

    const feature = item.feature;
    highlightFeatures(this.map, [feature]);
    zoomToFeatures(this.map, [feature], {
      maxZoom: feature.geometry?.type === "Point" ? 16 : 11.5,
      padding: 90
    });

    showResultPopup(
      this.map,
      feature,
      this.popupHtml(item)
    );

    this.hide();
  }

  popupHtml(item) {
    const p = item.feature.properties || {};

    if (item.sourceKey === "cities") {
      return `<strong>${escapeHtml(p.nama_bandar)}</strong><br>
        Hierarki: ${escapeHtml(p.hierarki || "-")}<br>
        Daerah: ${escapeHtml(p.daerah || "-")}`;
    }

    if (item.sourceKey === "pbt") {
      return `<strong>${escapeHtml(p.web_name)}</strong><br>
        Kategori: ${escapeHtml(p.web_type || "-")}<br>
        Keluasan: ${escapeHtml(areaText(p.web_area))}`;
    }

    if (item.sourceKey === "districts") {
      return `<strong>Daerah ${escapeHtml(p.web_name)}</strong><br>
        Kod: ${escapeHtml(p.web_code || "-")}<br>
        Keluasan: ${escapeHtml(areaText(p.web_area))}`;
    }

    if (item.sourceKey === "health") {
      return `<strong>${escapeHtml(p.web_name)}</strong><br>
        Kategori: ${escapeHtml(p.web_category || "-")}<br>
        Daerah: ${escapeHtml(p.web_district || "-")}<br>
        Operator: ${escapeHtml(p.web_operator || "-")}`;
    }

    if (item.sourceKey === "schools") {
      return `<strong>${escapeHtml(p.web_name)}</strong><br>
        Tahap: ${escapeHtml(p.web_level || "-")}<br>
        PPD: ${escapeHtml(p.web_ppd || "-")}<br>
        Daerah: ${escapeHtml(p.web_district || "-")}<br>
        PBT: ${escapeHtml(p.web_pbt || "-")}`;
    }

    if (item.sourceKey === "police") {
      return `<strong>${escapeHtml(p.web_name)}</strong><br>
        Hierarki: ${escapeHtml(p.web_hierarchy || "-")}<br>
        Daerah: ${escapeHtml(p.web_district || "-")}<br>
        Telefon: ${escapeHtml(p.web_phone || "-")}`;
    }

    return `<strong>${escapeHtml(item.name)}</strong>`;
  }

  hide() {
    this.results.hidden = true;
    this.input.setAttribute("aria-expanded", "false");
    this.activeIndex = -1;
  }
}

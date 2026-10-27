import { DATA_URLS } from "./config.js";
import { layerState } from "./layers.js";
import { addLayerCompat } from "./utils.js";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const FLOOD_WARNING_URL = "https://api.data.gov.my/flood-warning";

const RAIN_SOURCE_ID = "flood-rain-forecast";
const RAIN_CIRCLE_ID = "flood-rain-circle";
const RAIN_LABEL_ID = "flood-rain-label";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value = new Date()) {
  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function rainLevel(mm) {
  if (mm >= 60) return "Sangat Tinggi";
  if (mm >= 30) return "Tinggi";
  if (mm >= 10) return "Sederhana";
  return "Rendah";
}

function normaliseRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function getFirst(record, keys, fallback = "-") {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function recordMentionsSelangor(record) {
  const text = JSON.stringify(record).toLowerCase();
  return text.includes("selangor");
}

export class FloodIntelligence {
  constructor(map) {
    this.map = map;
    this.panel = document.getElementById("floodPanel");
    this.loading = document.getElementById("floodLoading");
    this.content = document.getElementById("floodContent");
    this.error = document.getElementById("floodError");
    this.latestRainGeoJSON = {
      type: "FeatureCollection",
      features: []
    };
    this.compareMaps = new Map();

    document.getElementById("openFloodBtn")
      .addEventListener("click", () => this.open());

    document.getElementById("floodCloseBtn")
      .addEventListener("click", () => this.close());

    document.getElementById("floodRefreshBtn")
      .addEventListener("click", () => this.load());

    window.addEventListener("suo:compare-map-ready", (event) => {
      const compareMap = event.detail?.map;
      const prefix = event.detail?.prefix ?? "compare-";
      if (!compareMap) return;
      this.compareMaps.set(compareMap, prefix);
      this.addRainLayer(compareMap, prefix);
    });

    this.rainInteractionsBound = false;
    this.rankingInteractionsBound = false;
    this.rainMarkers = [];
    this.activeRainPopup = null;
    this.load();
  }

  open() {
    this.panel.hidden = false;
    requestAnimationFrame(() => this.panel.classList.add("visible"));
  }

  close() {
    this.panel.classList.remove("visible");

    setTimeout(() => {
      this.panel.hidden = true;
    }, 180);
  }

  async load() {
    this.showLoading();

    try {
      const [rainResult, warningResult] = await Promise.allSettled([
        this.loadRainForecast(),
        this.loadFloodWarnings()
      ]);

      if (rainResult.status !== "fulfilled") {
        throw rainResult.reason;
      }

      this.renderRainSummary(rainResult.value);

      if (warningResult.status === "fulfilled") {
        this.renderWarnings(warningResult.value);
      } else {
        this.renderWarnings([], true);
      }

      this.showContent();
    } catch (error) {
      this.showError(
        error?.message ||
        "Flood Intelligence gagal dimuatkan."
      );
    }
  }

  showLoading() {
    this.loading.hidden = false;
    this.content.hidden = true;
    this.error.hidden = true;
  }

  showContent() {
    this.loading.hidden = true;
    this.content.hidden = false;
    this.error.hidden = true;
  }

  showError(message) {
    this.loading.hidden = true;
    this.content.hidden = true;
    this.error.hidden = false;
    this.error.textContent = message;
  }

  async loadCities() {
    const response = await fetch(DATA_URLS.urbanConfig, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Senarai bandar DPN2 tidak dapat dimuatkan.");
    }

    const config = await response.json();
    const cities = [];

    for (const group of config.groups || []) {
      for (const city of group.cities || []) {
        if (!Array.isArray(city.center)) continue;

        cities.push({
          name: city.name,
          hierarchy: group.name,
          longitude: Number(city.center[0]),
          latitude: Number(city.center[1])
        });
      }
    }

    return cities;
  }

  async loadRainForecast() {
    const cities = await this.loadCities();

    const url = new URL(OPEN_METEO_URL);
    url.searchParams.set(
      "latitude",
      cities.map((city) => city.latitude).join(",")
    );
    url.searchParams.set(
      "longitude",
      cities.map((city) => city.longitude).join(",")
    );
    url.searchParams.set("timezone", "Asia/Kuala_Lumpur");
    url.searchParams.set("forecast_days", "2");
    url.searchParams.set("hourly", "precipitation");

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Ramalan hujan tidak dapat dimuatkan.");
    }

    const payload = await response.json();
    const forecasts = Array.isArray(payload) ? payload : [payload];
    // Open-Meteo timestamps are local to Asia/Kuala_Lumpur; compare local
    // wall-clock hours instead of interpreting them as browser/UTC instants.
    const nowMY = new Intl.DateTimeFormat("sv-SE", {
      timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit",day:"2-digit",
      hour:"2-digit",minute:"2-digit",hourCycle:"h23"
    }).format(new Date()).replace(" ","T");
    const untilMY = new Date(Date.parse(nowMY + "+08:00") + 24*3600*1000);
    const untilKey = new Intl.DateTimeFormat("sv-SE", {
      timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit",day:"2-digit",
      hour:"2-digit",minute:"2-digit",hourCycle:"h23"
    }).format(untilMY).replace(" ","T");

    const features = cities.map((city, index) => {
      const forecast = forecasts[index] || forecasts[0] || {};
      const times = forecast.hourly?.time || [];
      const precipitation = forecast.hourly?.precipitation || [];

      let total = 0;

      times.forEach((time, timeIndex) => {
        if (time >= nowMY && time < untilKey) {
          total += Number(precipitation[timeIndex] || 0);
        }
      });

      return {
        type: "Feature",
        properties: {
          name: city.name,
          hierarchy: city.hierarchy,
          rain_mm: Number(total.toFixed(1)),
          level: rainLevel(total)
        },
        geometry: {
          type: "Point",
          coordinates: [city.longitude, city.latitude]
        }
      };
    });

    this.latestRainGeoJSON = {
      type: "FeatureCollection",
      features
    };

    this.addRainLayer(this.map);
    this.renderRainMarkers();

    for (const [compareMap, prefix] of this.compareMaps) {
      this.addRainLayer(compareMap, prefix);
    }

    return features;
  }

  // DOM markers remain visible across Mapbox style changes and 3D basemaps.
  // They show point forecasts, NOT flood inundation polygons.
  renderRainMarkers() {
    this.rainMarkers.forEach(marker => marker.remove());
    this.rainMarkers = [];
    if (typeof mapboxgl === "undefined") return;
    for (const feature of this.latestRainGeoJSON.features) {
      const {name,rain_mm,level} = feature.properties;
      const mm = Number(rain_mm);
      const color = mm >= 60 ? "#DC2626" : mm >= 30 ? "#F97316" : mm >= 10 ? "#FACC15" : "#38BDF8";
      const element = document.createElement("button");
      element.type = "button";
      element.className = "suo-rain-marker";
      element.style.setProperty("--rain-color",color);
      element.setAttribute("aria-label", `${name}: ramalan hujan 24 jam ${mm.toFixed(1)} mm`);
      element.innerHTML = `<svg class="suo-rain-weather-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M8 21a6 6 0 0 1-.3-12A9 9 0 0 1 25 11a5 5 0 0 1-.5 10H8Z" fill="#D9ECFF" stroke="#23548A" stroke-width="2" stroke-linejoin="round"/><path d="M10 24l-1.5 3M17 24l-1.5 3M24 24l-1.5 3" stroke="#1687E0" stroke-width="2.5" stroke-linecap="round"/></svg><span class="suo-rain-marker-value">${mm.toFixed(1)} mm</span>`;
      element.addEventListener("click", event => {
        event.stopPropagation();
        this.showRainPopup(feature);
      });
      const marker = new mapboxgl.Marker({element,anchor:"center"})
        .setLngLat(feature.geometry.coordinates).addTo(this.map);
      this.rainMarkers.push(marker);
    }
    this.setRainMarkersVisibility();
  }

  setRainMarkersVisibility() {
    for (const marker of this.rainMarkers) {
      marker.getElement().style.display = layerState.floodRain ? "" : "none";
    }
  }

  showRainPopup(feature) {
    if (this.activeRainPopup) this.activeRainPopup.remove();
    const p = feature.properties;
    this.activeRainPopup = new mapboxgl.Popup({offset:22,maxWidth:"290px"})
      .setLngLat(feature.geometry.coordinates)
      .setHTML(`<div class="suo-rain-popup"><strong>${escapeHtml(p.name)}</strong><div>Ramalan hujan 24 jam: <b>${Number(p.rain_mm).toFixed(1)} mm</b></div><div>Intensiti terkumpul: ${escapeHtml(p.level)}</div><small>Sumber: Open-Meteo · Anggaran pada titik lokasi, bukan peta bahaya banjir.</small></div>`)
      .addTo(this.map);
  }

  addRainLayer(targetMap, prefix = "") {
    const sourceId = `${prefix}${RAIN_SOURCE_ID}`;
    const circleId = `${prefix}${RAIN_CIRCLE_ID}`;
    const labelId = `${prefix}${RAIN_LABEL_ID}`;

    if (!targetMap.isStyleLoaded()) {
      targetMap.once("style.load", () => {
        this.addRainLayer(targetMap, prefix);
      });
      return;
    }

    if (targetMap.getSource(sourceId)) {
      targetMap.getSource(sourceId).setData(this.latestRainGeoJSON);
    } else {
      targetMap.addSource(sourceId, {
        type: "geojson",
        data: this.latestRainGeoJSON
      });
    }

    if (!targetMap.getLayer(circleId)) {
      addLayerCompat(targetMap, {
        id: circleId,
        type: "circle",
        source: sourceId,
        slot: "top",
        minzoom: 7,
        layout: {
          visibility: layerState.floodRain ? "visible" : "none"
        },
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7, [
              "interpolate",
              ["linear"],
              ["get", "rain_mm"],
              0, 9,
              60, 18
            ],
            14, [
              "interpolate",
              ["linear"],
              ["get", "rain_mm"],
              0, 12,
              60, 25
            ]
          ],
          "circle-color": [
            "step",
            ["get", "rain_mm"],
            "#38BDF8",
            10, "#FACC15",
            30, "#F97316",
            60, "#DC2626"
          ],
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2.5,
          "circle-opacity": 0.98
        }
      });
    }

    if (!targetMap.getLayer(labelId)) {
      addLayerCompat(targetMap, {
        id: labelId,
        type: "symbol",
        source: sourceId,
        slot: "top",
        minzoom: 6,
        layout: {
          visibility: layerState.floodRain ? "visible" : "none",
          "text-field": [
            "concat",
            ["get", "name"],
            "\n",
            ["to-string", ["get", "rain_mm"]],
            " mm"
          ],
          "text-size": 10,
          "text-offset": [0, 1.65],
          "text-anchor": "top",
          "text-allow-overlap": false
        },
        paint: {
          "text-color": "#FFFFFF",
          "text-halo-color": "rgba(7,17,31,0.96)",
          "text-halo-width": 1.5
        }
      });
    }

    this.setRainVisibility(targetMap, prefix);

    if (targetMap === this.map && !this.rainInteractionsBound) {
      this.bindRainInteractions();
    }
  }

  bindRainInteractions() {
    this.rainInteractionsBound = true;

    this.map.on("click", RAIN_CIRCLE_ID, (event) => {
      const feature = event.features?.[0];
      if (!feature) return;

      const properties = feature.properties || {};

      new mapboxgl.Popup()
        .setLngLat(feature.geometry.coordinates)
        .setHTML(`
          <strong>${escapeHtml(properties.name)}</strong><br>
          Ramalan hujan 24 jam: ${Number(properties.rain_mm).toFixed(1)} mm<br>
          Tahap hujan: ${escapeHtml(properties.level)}<br>
          <em>Indikator hujan, bukan ramalan banjir.</em>
        `)
        .addTo(this.map);
    });

    this.map.on("mouseenter", RAIN_CIRCLE_ID, () => {
      this.map.getCanvas().style.cursor = "pointer";
    });

    this.map.on("mouseleave", RAIN_CIRCLE_ID, () => {
      this.map.getCanvas().style.cursor = "";
    });
  }

  setRainVisibility(targetMap, prefix = "") {
    const visibility = layerState.floodRain ? "visible" : "none";

    [
      `${prefix}${RAIN_CIRCLE_ID}`,
      `${prefix}${RAIN_LABEL_ID}`
    ].forEach((layerId) => {
      if (targetMap.getLayer(layerId)) {
        targetMap.setLayoutProperty(
          layerId,
          "visibility",
          visibility
        );
      }
    });
  }

  setVisible(visible) {
    layerState.floodRain = visible;
    this.setRainVisibility(this.map);
    this.setRainMarkersVisibility();
    if (!visible && this.activeRainPopup) this.activeRainPopup.remove();

    for (const [compareMap, prefix] of this.compareMaps) {
      this.setRainVisibility(compareMap, prefix);
    }
  }

  renderRainSummary(features) {
    const sorted = [...features].sort(
      (a, b) => b.properties.rain_mm - a.properties.rain_mm
    );

    const maxFeature = sorted[0];
    const highCount = sorted.filter(
      (feature) => feature.properties.rain_mm >= 30
    ).length;

    document.getElementById("floodMaxRain").textContent =
      `${Number(maxFeature?.properties.rain_mm || 0).toFixed(1)} mm`;

    document.getElementById("floodMaxRainLocation").textContent =
      maxFeature?.properties.name || "Bandar DPN2";

    document.getElementById("floodHighRainCities").textContent =
      String(highCount);

    document.getElementById("floodRainUpdated").textContent =
      `Dikemas kini ${formatDateTime()}`;

    document.getElementById("floodQuickRisk").textContent =
      maxFeature?.properties.level || "Rendah";

    document.getElementById("floodQuickSummary").textContent =
      maxFeature
        ? `${maxFeature.properties.name}: ${Number(maxFeature.properties.rain_mm).toFixed(1)} mm`
        : "Tiada data ramalan";

    document.getElementById("floodQuickUpdated").textContent =
      `Dikemas kini ${formatDateTime()}`;

    const ranking = document.getElementById("floodRainRanking");
    ranking.innerHTML = sorted.map((feature, index) => {
      const properties = feature.properties;

      return `
        <button type="button" class="flood-rain-row flood-rain-focus" data-flood-lng="${Number(feature.geometry.coordinates[0])}" data-flood-lat="${Number(feature.geometry.coordinates[1])}" data-flood-name="${escapeHtml(properties.name)}" title="Fokus lokasi pada peta">
          <span class="flood-rain-rank">${index + 1}</span>
          <div>
            <strong>${escapeHtml(properties.name)}</strong>
            <small>${escapeHtml(properties.hierarchy)}</small>
          </div>
          <div class="flood-rain-value">
            <b>${Number(properties.rain_mm).toFixed(1)} mm</b>
            <span class="flood-level-${escapeHtml(properties.level.toLowerCase().replaceAll(" ", "-"))}">
              ${escapeHtml(properties.level)}
            </span>
          </div>
        </button>
      `;
    }).join("");
    if (!this.rankingInteractionsBound) {
      this.rankingInteractionsBound = true;
      ranking.addEventListener("click", (event) => {
        const button = event.target.closest("[data-flood-lng][data-flood-lat]");
        if (!button) return;
        const lng = Number(button.dataset.floodLng);
        const lat = Number(button.dataset.floodLat);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
        if (!layerState.floodRain) {
          const toggle = document.getElementById("floodRainToggle");
          if (toggle) toggle.checked = true;
          this.setVisible(true);
        }
        const feature = this.latestRainGeoJSON.features.find(item => item.geometry.coordinates[0] === lng && item.geometry.coordinates[1] === lat);
        this.map.flyTo({center:[lng,lat],zoom:Math.max(this.map.getZoom(),11),essential:true});
        if (feature) this.showRainPopup(feature);
        this.close();
      });
    }
  }

  async loadFloodWarnings() {
    const response = await fetch(`${FLOOD_WARNING_URL}?limit=100`);

    if (!response.ok) {
      throw new Error("API amaran banjir tidak tersedia.");
    }

    const payload = await response.json();
    return normaliseRecords(payload).filter(recordMentionsSelangor);
  }

  renderWarnings(records, unavailable = false) {
    const count = records.length;

    document.getElementById("floodWarningCount").textContent =
      unavailable ? "N/A" : String(count);

    document.getElementById("floodWarningStatus").textContent =
      unavailable
        ? "API tidak dapat dicapai"
        : count
          ? "Amaran Selangor ditemui"
          : "Tiada amaran Selangor";

    const list = document.getElementById("floodWarningList");

    if (unavailable) {
      list.innerHTML = `
        <div class="flood-warning-empty">
          API amaran banjir tidak dapat dicapai. Gunakan pautan Public InfoBanjir untuk semakan operasi.
        </div>
      `;
      return;
    }

    if (!records.length) {
      list.innerHTML = `
        <div class="flood-warning-empty">
          Tiada amaran banjir aktif bagi Selangor dalam respons API semasa.
        </div>
      `;
      return;
    }

    list.innerHTML = records.map((record) => {
      const title = getFirst(
        record,
        ["title", "warning_title", "headline", "station_name", "district"],
        "Amaran Banjir"
      );

      const location = getFirst(
        record,
        ["location", "district", "area", "state", "station_name"],
        "Selangor"
      );

      const level = getFirst(
        record,
        ["level", "warning_level", "status", "severity"],
        "Amaran"
      );

      const updated = getFirst(
        record,
        ["updated_at", "datetime", "issued_at", "date", "timestamp"],
        ""
      );

      const description = getFirst(
        record,
        ["description", "message", "warning_text", "remarks", "content"],
        "Rujuk sumber rasmi untuk butiran lanjut."
      );

      return `
        <article class="flood-warning-card">
          <div class="flood-warning-icon">!</div>
          <div>
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(level)} · ${escapeHtml(location)}</span>
            <p>${escapeHtml(description)}</p>
            <small>${updated ? `Dikemas kini ${escapeHtml(updated)}` : "data.gov.my"}</small>
          </div>
        </article>
      `;
    }).join("");
  }
}

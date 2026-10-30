import { MAPBOX_TOKEN, DATA_URLS } from "./config.js";
import { summarizePlanningCoverage } from "./planning-coverage.js?v=1.0";
import { addLayerCompat } from "./utils.js";

let activeInstance = null;

function featureCollection(features = []) {
  return {
    type: "FeatureCollection",
    features
  };
}

function haversine(a, b) {
  const radius = 6371008.8;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(dLng / 2) ** 2;

  return 2 * radius * Math.asin(Math.sqrt(value));
}

function formatDistance(metres) {
  return metres >= 1000
    ? `${(metres / 1000).toLocaleString("ms-MY", {
        maximumFractionDigits: 2
      })} km`
    : `${metres.toLocaleString("ms-MY", {
        maximumFractionDigits: 0
      })} m`;
}

function pointCoordinate(feature) {
  return feature?.geometry?.type === "Point"
    ? feature.geometry.coordinates
    : null;
}

function escapeHtml(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function isNetworkIntelligenceActive() {
  return Boolean(activeInstance?.mode);
}

export class NetworkIntelligence {
  constructor(map, spatialTools) {
    this.map = map;
    this.spatialTools = spatialTools;
    this.mode = null;
    this.origin = null;
    this.popup = null;
    this.datasets = new Map();

    this.status = document.getElementById("networkStatus");
    this.clearButton = document.getElementById("clearNetworkBtn");
    this.driveTimeButton = document.getElementById("driveTimeBtn");
    this.nearestButton = document.getElementById("nearestFacilityBtn");
    this.nearestResult = document.getElementById("nearestFacilityResult");
    this.planningResult = document.getElementById("planningResult");
    this.mapGuide = document.getElementById("planningMapGuide");
    this.opacityControl = document.getElementById("planningOpacity");
    this.opacityOutput = document.getElementById("planningOpacityValue");
    this.markerToggle = document.getElementById("planningMarkerToggle");
    this.focusPlanningButton = document.getElementById("planningFocusBtn");
    this.lastPlanningPolygon = null;
    this.planningAction = null;
    this.requestSerial = 0;
    this.lastNetworkFeatures = [];

    activeInstance = this;

    this.bind();
    this.ensureLayers();
  }

  bind() {
    document.querySelectorAll("[data-network-tab]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const tab = button.dataset.networkTab;

          document.querySelectorAll("[data-network-tab]")
            .forEach((item) => {
              item.classList.toggle("active", item === button);
            });

          document.querySelectorAll("[data-network-panel]")
            .forEach((panel) => {
              const selected =
                panel.dataset.networkPanel === tab;

              panel.hidden = !selected;
              panel.classList.toggle("active", selected);
            });
        });
      });

    document.querySelectorAll("[data-route-mode]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          document.querySelectorAll("[data-route-mode]")
            .forEach((item) => {
              item.classList.toggle("active", item === button);
            });

          this.spatialTools.setRouteTravelMode(
            button.dataset.routeMode
          );
        });
      });

    this.driveTimeButton.addEventListener("click", () => {
      this.planningAction = null;
      this.toggleMode("isochrone");
    });

    this.nearestButton.addEventListener("click", () => {
      this.toggleMode("nearest");
    });

    this.clearButton.addEventListener("click", () => {
      this.clear();
    });
    this.opacityControl?.addEventListener("input", () => {
      if (this.opacityOutput) this.opacityOutput.textContent = this.opacityControl.value + "%";
      this.applyPlanningAppearance();
    });
    this.markerToggle?.addEventListener("change", () => this.applyPlanningAppearance());
    this.focusPlanningButton?.addEventListener("click", () => {
      if (this.lastPlanningPolygon) this.fitPlanningArea(this.lastPlanningPolygon);
    });
    document.getElementById("planningClearBtn")
      ?.addEventListener("click", () => this.clear());

    document.getElementById("serviceAreaBtn")
      .addEventListener("click", () => this.startPlanning("service"));

    document.getElementById("coverageBtn")
      .addEventListener("click", () => this.startPlanning("coverage"));

    document.getElementById("gapAnalysisBtn")
      .addEventListener("click", () => {
        ++this.requestSerial;
        this.stopMode();
        this.planningResult.textContent = "Gap Analysis Fasa 2 memerlukan grid penduduk dan takrif kawasan perkhidmatan. Tiada jurang akses penduduk dikira dalam Fasa 1.";
        this.setStatus("Gap Analysis: menunggu data permintaan yang disahkan.");
      });

    document.getElementById("accessibilityScoreBtn")
      .addEventListener("click", () => {
        ++this.requestSerial;
        this.stopMode();
        this.planningResult.textContent = "Accessibility Score Fasa 2 memerlukan data penduduk dan piawaian perkhidmatan. Tiada skor andaian ditunjukkan.";
        this.setStatus("Accessibility Score: metodologi dan data perlu disahkan.");
      });

    document.querySelectorAll("[data-emergency-type]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const type = button.dataset.emergencyType;

          if (type === "police") {
            document.getElementById("nearestFacilityType").value = "police";
            this.activateTab("facility");
            this.toggleMode("nearest");
            this.setStatus(
              "Klik lokasi kecemasan untuk mencari IPK/IPD paling hampir."
            );
            return;
          }

          this.setStatus(
            `${button.textContent.trim()}: data kemudahan khusus diperlukan untuk analisis penuh.`
          );
        });
      });

    this.map.on("style.load", () => {
      this.ensureLayers();
      this.map.getSource("network-intelligence-source")?.setData(featureCollection(this.lastNetworkFeatures));
    });

    this.map.on("click", "network-intelligence-points", (event) => {
      if (this.mode) return;
      const facility = event.features?.[0];
      if (facility?.properties?.role !== "facility" ||
          !facility.properties?.name) return;
      const details = facility.properties;
      const coords = facility.geometry?.coordinates;
      if (!Array.isArray(coords)) return;
      this.popup?.remove();
      this.popup = new mapboxgl.Popup({ closeOnClick: false })
        .setLngLat(coords)
        .setHTML(
          '<div class="planning-facility-popup">' +
          '<strong>' + escapeHtml(details.name) + '</strong>' +
          '<span>' + escapeHtml(details.groupLabel || "Kemudahan") +
          ' · ' + escapeHtml(details.typeLabel || "Jenis tidak dinyatakan") + '</span>' +
          '<small>Rekod titik dalam kawasan capaian, bukan pengesahan jarak jalan ke kemudahan.</small>' +
          '</div>'
        ).addTo(this.map);
    });
    this.map.on("mouseenter", "network-intelligence-points", (event) => {
      if (!this.mode && event.features?.some(f => f.properties?.role === "facility")) {
        this.map.getCanvas().style.cursor = "pointer";
      }
    });
    this.map.on("mouseleave", "network-intelligence-points", () => {
      if (!this.mode) this.map.getCanvas().style.cursor = "";
    });
    this.map.on("click", (event) => {
      if (!this.mode) return;

      const origin = [
        event.lngLat.lng,
        event.lngLat.lat
      ];

      if (this.mode === "isochrone") {
        this.runIsochrone(origin);
      } else if (this.mode === "nearest") {
        this.runNearestFacility(origin);
      }
    });
  }

  ensureLayers() {
    if (!this.map.isStyleLoaded()) return;

    const sourceId = "network-intelligence-source";
    if (!this.map.getSource(sourceId)) {
      this.map.addSource(sourceId, { type: "geojson", data: featureCollection() });
    }
    // Mapbox Standard draws later portal layers above earlier layers unless
    // overlays use the top slot and are promoted after addPortalLayers().
    const polygonFilter = ["==", ["geometry-type"], "Polygon"];
    const pointFilter = ["==", ["geometry-type"], "Point"];
    const layers = [
      {
        id: "network-intelligence-fill", type: "fill", source: sourceId,
        slot: "top", filter: polygonFilter,
        paint: {
          "fill-color": ["match", ["get", "analysis"],
            "planning", "#F3BC3A", "#38BDF8"],
          "fill-opacity": ["match", ["get", "analysis"],
            "planning", 0.38, 0.22]
        }
      },
      {
        // Dark outer casing guarantees the golden contour remains legible on
        // satellite, green topography, roads and white buildings.
        id: "network-intelligence-outline-casing", type: "line",
        source: sourceId, slot: "top",
        filter: ["all", polygonFilter, ["==", ["get", "analysis"], "planning"]],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#552B2B", "line-width": 8, "line-opacity": 0.92 }
      },
      {
        id: "network-intelligence-outline", type: "line",
        source: sourceId, slot: "top", filter: polygonFilter,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["match", ["get", "analysis"],
            "planning", "#FFCD48", "#38BDF8"],
          "line-width": ["match", ["get", "analysis"],
            "planning", 4.4, 2.4]
        }
      },
      {
        id: "network-intelligence-point-halo", type: "circle",
        source: sourceId, slot: "top", filter: pointFilter,
        paint: {
          "circle-radius": ["match", ["get", "role"], "origin", 15, 9],
          "circle-color": "#FFFFFF",
          "circle-opacity": 0.95,
          "circle-stroke-color": "#4A3027",
          "circle-stroke-width": 1.8
        }
      },
      {
        id: "network-intelligence-points", type: "circle",
        source: sourceId, slot: "top", filter: pointFilter,
        paint: {
          "circle-radius": ["match", ["get", "role"], "origin", 10, "facility", 5.5, 5],
          "circle-color": [
            "match", ["get", "role"],
            "origin", "#B53B43",
            "facility", ["match", ["get", "group"],
              "school", "#E5A523", "health", "#D9434B", "safety", "#2866BC",
              "#1B9B64"],
            "#38BDF8"
          ],
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 1.5
        }
      }
    ];
    for (const layer of layers) {
      if (!this.map.getLayer(layer.id)) addLayerCompat(this.map, layer);
    }
  }

  promoteLayers() {
    if (!this.map.isStyleLoaded()) return;
    this.ensureLayers();
    // Only the network overlays are rearranged. Keep the order:
    // fill -> casing -> outline -> marker halos -> markers.
    for (const id of [
      "network-intelligence-fill",
      "network-intelligence-outline-casing",
      "network-intelligence-outline",
      "network-intelligence-point-halo",
      "network-intelligence-points"
    ]) {
      if (this.map.getLayer(id)) {
        try { this.map.moveLayer(id); }
        catch (error) { console.info("Network overlay layer order:", id, error); }
      }
    }
    this.applyPlanningAppearance();
  }

  applyPlanningAppearance() {
    if (!this.map.isStyleLoaded()) return;
    const opacityPercent = Math.min(65, Math.max(12, Number(this.opacityControl?.value) || 38));
    if (this.map.getLayer("network-intelligence-fill")) {
      this.map.setPaintProperty("network-intelligence-fill", "fill-opacity",
        ["match", ["get", "analysis"], "planning", opacityPercent / 100, 0.22]);
    }
    const displayMarkers = this.markerToggle?.checked !== false;
    const pointsFilter = displayMarkers
      ? ["==", ["geometry-type"], "Point"]
      : ["all", ["==", ["geometry-type"], "Point"],
         ["!=", ["get", "role"], "facility"]];
    for (const id of ["network-intelligence-point-halo", "network-intelligence-points"]) {
      if (this.map.getLayer(id)) this.map.setFilter(id, pointsFilter);
    }
  }

  showMapGuide(title, description, completed = false) {
    if (!this.mapGuide) return;
    this.mapGuide.hidden = false;
    this.mapGuide.classList.toggle("complete", completed);
    const legend = this.mapGuide.querySelector("[data-planning-guide-legend]");
    if (legend) legend.hidden = !completed || !title.startsWith("Coverage Analysis");
    const heading = this.mapGuide.querySelector("[data-planning-guide-title]");
    const body = this.mapGuide.querySelector("[data-planning-guide-body]");
    if (heading) heading.textContent = title;
    if (body) body.textContent = description;
  }

  fitPlanningArea(polygon) {
    const bounds = [Infinity, Infinity, -Infinity, -Infinity];
    const visit = coords => {
      if (!Array.isArray(coords)) return;
      if (coords.length >= 2 && Number.isFinite(coords[0]) &&
          Number.isFinite(coords[1])) {
        bounds[0] = Math.min(bounds[0], coords[0]);
        bounds[1] = Math.min(bounds[1], coords[1]);
        bounds[2] = Math.max(bounds[2], coords[0]);
        bounds[3] = Math.max(bounds[3], coords[1]);
      } else coords.forEach(visit);
    };
    visit(polygon.geometry?.coordinates);
    if (!bounds.every(Number.isFinite)) return;
    this.map.fitBounds(
      [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
      {
        padding: 45, maxZoom: 13.5, duration: 750,
        pitch: Math.min(this.map.getPitch?.() || 0, 32)
      }
    );
  }

  activateTab(tab) {
    const button = document.querySelector(
      `[data-network-tab="${tab}"]`
    );

    button?.click();
  }

  startPlanning(action) {
    if (!["service", "coverage"].includes(action)) return;
    if (this.spatialTools?.mode) this.spatialTools.stopMode();
    ++this.requestSerial;
    this.planningAction = action;
    this.mode = "isochrone";
    this.origin = null;
    this.lastPlanningPolygon = null;
    if (this.focusPlanningButton) this.focusPlanningButton.disabled = true;
    this.lastNetworkFeatures = [];
    this.map.getSource("network-intelligence-source")?.setData(featureCollection());
    this.popup?.remove();
    this.popup = null;
    this.map.getCanvas().classList.add("spatial-tool-cursor");
    this.driveTimeButton.classList.add("active");
    this.nearestButton.classList.remove("active");
    const label = action === "coverage" ? "Coverage Analysis" : "Service Area";
    this.planningResult.textContent = label + " aktif. Klik pusat analisis pada peta.";
    this.showMapGuide(label, "Klik satu lokasi pada peta untuk menjana kawasan capaian.", false);
    for (const name of ["serviceAreaBtn", "coverageBtn"]) {
      const button = document.getElementById(name);
      button?.classList.toggle("is-planning-active", name === (action === "service" ? "serviceAreaBtn" : "coverageBtn"));
      button?.classList.remove("has-planning-result");
    }
    this.setStatus(label + ": klik lokasi pusat pada peta.");
  }

  toggleMode(mode) {
    ++this.requestSerial;
    this.planningAction = null;
    if (this.mapGuide) this.mapGuide.hidden = true;
    if (this.spatialTools?.mode) this.spatialTools.stopMode();
    if (this.mode === mode) {
      this.stopMode();
      return;
    }

    this.mode = mode;
    this.origin = null;
    this.lastPlanningPolygon = null;
    if (this.focusPlanningButton) this.focusPlanningButton.disabled = true;
    this.lastNetworkFeatures = [];
    this.map.getSource("network-intelligence-source")?.setData(featureCollection());
    for (const name of ["serviceAreaBtn", "coverageBtn"]) {
      document.getElementById(name)?.classList.remove("has-planning-result", "is-planning-active");
    }
    this.map.getCanvas().classList.add("spatial-tool-cursor");

    this.driveTimeButton.classList.toggle(
      "active",
      mode === "isochrone"
    );

    this.nearestButton.classList.toggle(
      "active",
      mode === "nearest"
    );

    if (mode === "isochrone") {
      this.setStatus(
        "Drive-Time aktif. Klik titik pusat pada peta."
      );
    } else {
      this.setStatus(
        "Nearest Facility aktif. Klik lokasi asal pada peta."
      );
    }
  }

  stopMode() {
    this.mode = null;
    this.planningAction = null;
    for (const name of ["serviceAreaBtn", "coverageBtn"]) {
      document.getElementById(name)?.classList.remove("is-planning-active");
    }
    this.map.getCanvas().classList.remove("spatial-tool-cursor");
    this.driveTimeButton.classList.remove("active");
    this.nearestButton.classList.remove("active");
  }

  async runIsochrone(origin) {
    const action = this.planningAction;
    const planning = Boolean(action);
    const minutes = Number(document.getElementById(
      planning ? "planningMinutes" : "isochroneMinutes"
    ).value);
    const profile = document.getElementById(
      planning ? "planningProfile" : "isochroneProfile"
    ).value;
    const facilityType = planning
      ? document.getElementById("planningFacilityType").value
      : null;

    if (![5, 10, 15, 20, 30].includes(minutes) ||
        !["driving", "walking", "cycling"].includes(profile)) {
      this.setStatus("Tetapan masa atau mod perjalanan tidak sah.");
      return;
    }

    const requestId = ++this.requestSerial;
    this.setStatus("Menjana kawasan capaian berdasarkan rangkaian jalan...");
    if (planning) this.planningResult.textContent = "Mendapatkan poligon Isochrone Mapbox...";

    const url = new URL(
      "https://api.mapbox.com/isochrone/v1/mapbox/" +
      profile + "/" + origin[0] + "," + origin[1]
    );
    url.searchParams.set("contours_minutes", String(minutes));
    url.searchParams.set("polygons", "true");
    url.searchParams.set("denoise", "1");
    url.searchParams.set("generalize", "30");
    url.searchParams.set("access_token", MAPBOX_TOKEN);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Isochrone API " + response.status);

      const data = await response.json();
      const polygon = data.features?.find(f =>
        ["Polygon", "MultiPolygon"].includes(f.geometry?.type)
      );
      if (!polygon) throw new Error("Tiada poligon perjalanan yang sah.");
      if (requestId !== this.requestSerial) return;

      let coverage = null;
      if (action === "coverage") {
        this.planningResult.textContent = "Mengira titik kemudahan dalam kawasan perjalanan...";
        coverage = await summarizePlanningCoverage(polygon, facilityType);
        if (requestId !== this.requestSerial) return;
      }

      this.origin = origin;
      this.lastPlanningPolygon = planning ? polygon : null;
      if (this.focusPlanningButton) this.focusPlanningButton.disabled = !planning;
      this.lastNetworkFeatures = [
        { ...polygon, properties: { ...(polygon.properties || {}), analysis: planning ? "planning" : "network" } },
        { type: "Feature", properties: { role: "origin" },
          geometry: { type: "Point", coordinates: origin } },
        ...(coverage?.visibleFacilities || [])
      ];
      this.map.getSource("network-intelligence-source")?.setData(
        featureCollection(this.lastNetworkFeatures)
      );
      // Re-promote results over all SUO layers and focus the actual contour.
      this.promoteLayers();
      if (planning) {
        try { this.fitPlanningArea(polygon); }
        catch (error) { console.warn("Planning map framing:", error); }
      }

      this.popup?.remove();
      this.popup = new mapboxgl.Popup({ closeOnClick: false })
        .setLngLat(origin)
        .setHTML(
          "<strong>" + (planning ? "Planning Intelligence" : "Drive-Time Isochrone") +
          "</strong><br>Masa: " + minutes + " minit<br>Mod: " + escapeHtml(profile)
        )
        .addTo(this.map);

      if (planning) {
        const modeLabel = {
          driving: "Memandu", walking: "Berjalan kaki", cycling: "Berbasikal"
        }[profile];
        const heading = action === "coverage" ? "Coverage Analysis" : "Service Area";
        const mainStat = coverage
          ? '<div class="planning-stat"><span>Rekod kemudahan dalam kawasan capaian</span><strong>' +
            coverage.insideCount.toLocaleString("ms-MY") +
            '</strong><small>Daripada ' + coverage.totalRecords.toLocaleString("ms-MY") +
            ' rekod kategori terpilih dalam dataset seluruh Selangor</small></div>'
          : "";
        const groups = coverage
          ? coverage.groups.map(g => {
              const fraction = coverage.insideCount > 0
                ? Math.min(100, (100 * g.insideCount / coverage.insideCount))
                : 0;
              const categoryDetails = g.categories?.length
                ? '<details class="planning-breakdown"><summary>Lihat kategori utama</summary>' +
                  g.categories.map(category =>
                    '<div class="planning-breakdown-row"><span>' +
                    escapeHtml(category.label) + '</span><b>' +
                    category.count.toLocaleString("ms-MY") +
                    '</b></div>').join("") + '</details>'
                : "";
              const composition = coverage.groups.length > 1
                ? '<div class="planning-group-meter" role="img" aria-label="' +
                  escapeHtml(g.label) + ': ' + g.insideCount +
                  ' daripada ' + coverage.insideCount + ' rekod dalam kawasan">' +
                  '<span style="width:' + fraction.toFixed(1) + '%"></span></div>'
                : "";
              return '<div class="planning-group-block planning-group-' + g.key + '">' +
                '<div class="planning-group-row"><span>' + escapeHtml(g.label) +
                '</span><strong>' + g.insideCount.toLocaleString("ms-MY") +
                '</strong></div>' + composition +
                categoryDetails + '</div>';
            }).join("")
          : "";
        const interpretation = coverage
          ? "Bilangan ini ialah lokasi titik kemudahan dalam poligon perjalanan dari satu pusat. Ia bukan liputan penduduk, masa perjalanan ke setiap kemudahan atau tahap kecukupan perkhidmatan."
          : "Poligon menunjukkan anggaran kawasan yang boleh dicapai dari titik pusat melalui rangkaian jalan Mapbox, bukan sempadan perkhidmatan rasmi.";
        const markerNote = coverage
          ? '<p class="planning-source-note">Sumber: dataset titik SUO. Maksimum 80 penanda bagi setiap kategori dipaparkan, tetapi kiraan menggunakan semua rekod. Klik titik berwarna untuk butiran; gunakan Penampilan Peta untuk menyembunyikannya.</p>'
          : "";
        this.planningResult.innerHTML =
          '<div class="planning-result-heading"><strong>' + heading +
          '</strong><span>' + minutes + ' min · ' + escapeHtml(modeLabel) +
          '</span></div>' + mainStat + groups +
          (coverage?.groups.length > 1
            ? '<p class="planning-composition-note">Bar menunjukkan komposisi rekod dalam poligon, bukan kadar liputan penduduk.</p>'
            : "") +
          '<p class="planning-interpretation">' + interpretation + '</p>' + markerNote;
      }

      if (planning) {
        const label = action === "coverage" ? "Coverage Analysis" : "Service Area";
        const detail = coverage
          ? coverage.insideCount.toLocaleString("ms-MY") + " rekod kemudahan dalam kawasan " + minutes + " minit."
          : "Kawasan perjalanan " + minutes + " minit dipaparkan dengan sempadan kuning.";
        this.showMapGuide(label + " · " + minutes + " min", detail, true);
        document.getElementById(action === "coverage" ? "coverageBtn" : "serviceAreaBtn")
          ?.classList.add("has-planning-result");
      }
      this.setStatus(
        (planning ? (action === "coverage" ? "Coverage Analysis" : "Service Area") : "Drive-Time") +
        ": kawasan " + minutes + " minit berjaya dijana."
      );
      this.stopMode();
    } catch (error) {
      if (requestId !== this.requestSerial) return;
      console.error("Isochrone/Planning:", error);
      if (planning) {
        this.planningResult.textContent =
          "Analisis tidak dapat disiapkan. Semak sambungan Mapbox dan dataset kemudahan. Tiada keputusan separa dilaporkan.";
        if (this.mapGuide) this.mapGuide.hidden = true;
      }
      this.setStatus(
        "Isochrone atau data kemudahan gagal dimuatkan. Semak sambungan dan had API."
      );
      this.stopMode();
    }
  }

  async loadDataset(type) {
    if (this.datasets.has(type)) {
      return this.datasets.get(type);
    }

    const url =
      type === "school"
        ? DATA_URLS.schools
        : type === "police"
          ? DATA_URLS.police
          : DATA_URLS.health;

    const response = await fetch(url, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Gagal memuatkan data ${type}.`);
    }

    const data = await response.json();
    this.datasets.set(type, data.features || []);
    return data.features || [];
  }

  filterFacilities(type, features) {
    if (type === "hospital") {
      return features.filter((feature) =>
        String(
          feature.properties?.web_category || ""
        ).toLowerCase().includes("hospital")
      );
    }

    if (type === "health") {
      return features.filter((feature) =>
        !String(
          feature.properties?.web_category || ""
        ).toLowerCase().includes("hospital")
      );
    }

    return features;
  }

  async runNearestFacility(origin) {
    const requestId = ++this.requestSerial;
    const type = document.getElementById(
      "nearestFacilityType"
    ).value;

    this.setStatus("Mencari kemudahan paling hampir...");

    try {
      const rawFeatures = await this.loadDataset(type);
      const features = this.filterFacilities(type, rawFeatures)
        .filter((feature) => pointCoordinate(feature));

      const ranked = features
        .map((feature) => ({
          feature,
          coordinate: pointCoordinate(feature),
          distance: haversine(
            origin,
            pointCoordinate(feature)
          )
        }))
        .sort((a, b) => a.distance - b.distance);

      if (requestId !== this.requestSerial) return;
      const nearest = ranked[0];

      if (!nearest) {
        throw new Error("Tiada kemudahan ditemui.");
      }

      const properties = nearest.feature.properties || {};
      const name =
        properties.web_name ||
        properties.Nama_Sekol ||
        "Kemudahan";

      const source = this.map.getSource(
        "network-intelligence-source"
      );

      this.lastNetworkFeatures = [
        {
          type: "Feature",
          properties: { role: "origin" },
          geometry: {
            type: "Point",
            coordinates: origin
          }
        },
        {
          type: "Feature",
          properties: {
            role: "facility",
            name
          },
          geometry: {
            type: "Point",
            coordinates: nearest.coordinate
          }
        }
      ];
      source?.setData(featureCollection(this.lastNetworkFeatures));

      this.nearestResult.innerHTML = `
        <strong>${escapeHtml(name)}</strong>
        <span>Jarak garis awal: ${formatDistance(nearest.distance)}</span>
        <small>Tekan Route untuk laluan jalan sebenar.</small>
      `;

      this.popup?.remove();
      this.popup = new mapboxgl.Popup({
        closeOnClick: false
      })
        .setLngLat(nearest.coordinate)
        .setHTML(
          `<strong>${escapeHtml(name)}</strong><br>
           Anggaran jarak terus: ${formatDistance(nearest.distance)}`
        )
        .addTo(this.map);

      this.map.fitBounds(
        new mapboxgl.LngLatBounds()
          .extend(origin)
          .extend(nearest.coordinate),
        {
          padding: 90,
          maxZoom: 15
        }
      );

      this.setStatus(
        `Kemudahan terdekat: ${name} (${formatDistance(nearest.distance)}).`
      );
      this.stopMode();
    } catch (error) {
      console.error(error);
      this.setStatus("Carian kemudahan terdekat gagal.");
    }
  }

  clear() {
    ++this.requestSerial;
    this.stopMode();
    this.lastNetworkFeatures = [];
    this.origin = null;
    this.lastPlanningPolygon = null;
    if (this.focusPlanningButton) this.focusPlanningButton.disabled = true;
    if (this.mapGuide) this.mapGuide.hidden = true;
    for (const name of ["serviceAreaBtn", "coverageBtn"]) {
      document.getElementById(name)?.classList.remove("has-planning-result", "is-planning-active");
    }
    if (this.planningResult) this.planningResult.textContent = "Pilih fungsi Service Area atau Coverage Analysis, kemudian klik lokasi pusat pada peta.";
    this.popup?.remove();
    this.popup = null;

    this.map.getSource("network-intelligence-source")
      ?.setData(featureCollection());

    this.nearestResult.textContent = "Belum ada analisis.";
    this.setStatus(
      "Semua hasil Network Intelligence telah dipadam."
    );
  }

  setStatus(message) {
    this.status.textContent = message;
  }
}

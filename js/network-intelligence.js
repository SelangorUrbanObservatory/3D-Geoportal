import { MAPBOX_TOKEN, DATA_URLS } from "./config.js";
import { summarizePlanningCoverage } from "./planning-coverage.js?v=1.0";

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

    document.getElementById("serviceAreaBtn")
      .addEventListener("click", () => this.startPlanning("service"));

    document.getElementById("coverageBtn")
      .addEventListener("click", () => this.startPlanning("coverage"));

    document.getElementById("gapAnalysisBtn")
      .addEventListener("click", () => {
        this.planningResult.textContent = "Gap Analysis Fasa 2 memerlukan grid penduduk dan takrif kawasan perkhidmatan. Tiada jurang akses penduduk dikira dalam Fasa 1.";
        this.setStatus("Gap Analysis: menunggu data permintaan yang disahkan.");
      });

    document.getElementById("accessibilityScoreBtn")
      .addEventListener("click", () => {
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

    if (!this.map.getSource("network-intelligence-source")) {
      this.map.addSource("network-intelligence-source", {
        type: "geojson",
        data: featureCollection()
      });
    }

    if (!this.map.getLayer("network-intelligence-fill")) {
      this.map.addLayer({
        id: "network-intelligence-fill",
        type: "fill",
        source: "network-intelligence-source",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": "#38BDF8",
          "fill-opacity": 0.22
        }
      });
    }

    if (!this.map.getLayer("network-intelligence-outline")) {
      this.map.addLayer({
        id: "network-intelligence-outline",
        type: "line",
        source: "network-intelligence-source",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "line-color": "#38BDF8",
          "line-width": 2.4
        }
      });
    }

    if (!this.map.getLayer("network-intelligence-points")) {
      this.map.addLayer({
        id: "network-intelligence-points",
        type: "circle",
        source: "network-intelligence-source",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": [
            "match",
            ["get", "role"],
            "origin", 7,
            "facility", 8,
            5
          ],
          "circle-color": [
            "match",
            ["get", "role"],
            "origin", "#FACC15",
            "facility", "#22C55E",
            "#38BDF8"
          ],
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2
        }
      });
    }
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
    this.map.getCanvas().classList.add("spatial-tool-cursor");
    this.driveTimeButton.classList.add("active");
    this.nearestButton.classList.remove("active");
    const label = action === "coverage" ? "Coverage Analysis" : "Service Area";
    this.planningResult.textContent = label + " aktif. Klik pusat analisis pada peta.";
    this.setStatus(label + ": klik lokasi pusat pada peta.");
  }

  toggleMode(mode) {
    ++this.requestSerial;
    this.planningAction = null;
    if (this.spatialTools?.mode) this.spatialTools.stopMode();
    if (this.mode === mode) {
      this.stopMode();
      return;
    }

    this.mode = mode;
    this.origin = null;
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
    this.map.getCanvas().classList.remove("spatial-tool-cursor");
    this.driveTimeButton.classList.remove("active");
    this.nearestButton.classList.remove("active");
  }

  async runIsochrone(origin) {
    const minutes = Number(
      document.getElementById("isochroneMinutes").value
    );

    const profile = document.getElementById(
      "isochroneProfile"
    ).value;

    this.setStatus("Menjana kawasan capaian perjalanan...");

    const url = new URL(
      `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${origin[0]},${origin[1]}`
    );

    url.searchParams.set("contours_minutes", String(minutes));
    url.searchParams.set("polygons", "true");
    url.searchParams.set("denoise", "1");
    url.searchParams.set("generalize", "30");
    url.searchParams.set("access_token", MAPBOX_TOKEN);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Isochrone API ${response.status}`);
      }

      const data = await response.json();
      const polygon = data.features?.[0];

      if (!polygon) {
        throw new Error("Tiada polygon isochrone.");
      }

      const source = this.map.getSource(
        "network-intelligence-source"
      );

      source?.setData(featureCollection([
        polygon,
        {
          type: "Feature",
          properties: { role: "origin" },
          geometry: {
            type: "Point",
            coordinates: origin
          }
        }
      ]));

      this.popup?.remove();
      this.popup = new mapboxgl.Popup({
        closeOnClick: false
      })
        .setLngLat(origin)
        .setHTML(
          `<strong>Drive-Time Isochrone</strong><br>
           Masa: ${minutes} minit<br>
           Mod: ${escapeHtml(profile)}`
        )
        .addTo(this.map);

      this.setStatus(
        `Kawasan capaian ${minutes} minit berjaya dijana.`
      );
      this.stopMode();
    } catch (error) {
      console.error(error);
      this.setStatus(
        "Isochrone gagal dijana. Semak token Mapbox atau had penggunaan API."
      );
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

      source?.setData(featureCollection([
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
      ]));

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

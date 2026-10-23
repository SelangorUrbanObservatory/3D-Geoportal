import { sync3DBuildings } from "./3d-buildings.js";
import { BASEMAPS } from "./config.js";
import {
  addPortalLayers,
  applyLayerVisibility,
  applyLayerRenderOrder,
  enableTerrain,
  disableTerrain,
  layerState
} from "./layers.js";
import { initUrbanExplorer } from "./urban-explorer.js";
import { UrbanTour } from "./urban-tour.js";
import { CompareEngine } from "./compare.js";
import { ComparePanelUI } from "./compare-panel-ui.js";
import {
  SpatialTools,
  isSpatialToolActive
} from "./spatial-tools.js";
import {
  NetworkIntelligence,
  isNetworkIntelligenceActive
} from "./network-intelligence.js";
import { SpatialAssistant } from "./ai-assistant.js";
import { SmartSearch } from "./smart-search.js";
import { createMainMap } from "./core/map-engine.js";
import { WorkspaceController } from "./ui/workspace-controller.js";
import {
  initializeIntelligenceHub
} from "./intelligence/intelligence-hub.js";
import {
  addCadastralLayer,
  cadastralPopupHtml,
  getCadastralConfig
} from "./cadastral.js";

const map = createMainMap();
window.__SUO_MAIN_MAP__ = map;

const compare = new CompareEngine(map);
const comparePanelUI = new ComparePanelUI();
const spatialTools = new SpatialTools(map);
const networkIntelligence = new NetworkIntelligence(
  map,
  spatialTools
);

const {
  weather,
  flood
} = initializeIntelligenceHub(map);

let viewMode = "3d";
let nightMode = false;
let activeMarker = null;
let cityLookup = new Map();

const deepLinkParams = new URLSearchParams(window.location.search);
const rawDeepLinkFocus = (deepLinkParams.get("focus") || deepLinkParams.get("theme") || "")
  .trim()
  .toLowerCase();

const DEEP_LINK_ALIASES = {
  hospital: "health",
  hospitals: "health",
  klinik: "health",
  healthcare: "health",
  school: "schools",
  sekolah: "schools",
  ipk: "police",
  ipd: "police",
  pdrm: "police",
  bomba: "fire",
  firestation: "fire",
  rail: "mobility",
  railway: "mobility",
  station: "mobility",
  stations: "mobility",
  kadaster: "cadastral",
  lot: "cadastral",
  boundary: "pbt",
  daerah: "districts",
  district: "districts",
  banjir: "environment",
  flood: "environment",
  traffic: "traffic",
  trafik: "traffic"
};

const deepLinkFocus = DEEP_LINK_ALIASES[rawDeepLinkFocus] || rawDeepLinkFocus;

const DEEP_LINK_PRESETS = {
  health: {
    view: { center: [101.48, 3.18], zoom: 9.6, pitch: 48, bearing: 0 },
    state: {
      cityHierarchy: false, pbt: true, districts: true, cadastral: false,
      healthFacilities: true, liveTraffic: false, police: false, fireStations: false,
      schools: false, rail: false, railStations: false, floodRain: false,
      terrain: true, buildings: true
    }
  },
  schools: {
    view: { center: [101.48, 3.18], zoom: 9.7, pitch: 48, bearing: 0 },
    state: {
      cityHierarchy: false, pbt: true, districts: true, cadastral: false,
      healthFacilities: false, liveTraffic: false, police: false, fireStations: false,
      schools: true, rail: false, railStations: false, floodRain: false,
      terrain: true, buildings: true
    }
  },
  police: {
    view: { center: [101.48, 3.18], zoom: 9.7, pitch: 48, bearing: 0 },
    state: {
      cityHierarchy: false, pbt: true, districts: true, cadastral: false,
      healthFacilities: false, liveTraffic: false, police: true, fireStations: false,
      schools: false, rail: false, railStations: false, floodRain: false,
      terrain: true, buildings: true
    }
  },
  fire: {
    view: { center: [101.48, 3.18], zoom: 9.7, pitch: 48, bearing: 0 },
    state: {
      cityHierarchy: false, pbt: true, districts: true, cadastral: false,
      healthFacilities: false, liveTraffic: false, police: false, fireStations: true,
      schools: false, rail: false, railStations: false, floodRain: false,
      terrain: true, buildings: true
    }
  },
  mobility: {
    view: { center: [101.53, 3.08], zoom: 9.7, pitch: 48, bearing: 0 },
    state: {
      cityHierarchy: false, pbt: true, districts: true, cadastral: false,
      healthFacilities: false, liveTraffic: false, police: false, fireStations: false,
      schools: false, rail: true, railStations: true, floodRain: false,
      terrain: true, buildings: true
    }
  },
  cadastral: {
    view: { center: [101.53, 3.08], zoom: 11.5, pitch: 38, bearing: 0 },
    state: {
      cityHierarchy: false, pbt: true, districts: true, cadastral: true,
      healthFacilities: false, liveTraffic: false, police: false, fireStations: false,
      schools: false, rail: false, railStations: false, floodRain: false,
      terrain: false, buildings: true
    }
  },
  pbt: {
    view: { center: [101.48, 3.18], zoom: 9.4, pitch: 35, bearing: 0 },
    state: {
      cityHierarchy: false, pbt: true, districts: false, cadastral: false,
      healthFacilities: false, liveTraffic: false, police: false, fireStations: false,
      schools: false, rail: false, railStations: false, floodRain: false,
      terrain: false, buildings: false
    }
  },
  districts: {
    view: { center: [101.48, 3.18], zoom: 9.2, pitch: 35, bearing: 0 },
    state: {
      cityHierarchy: false, pbt: false, districts: true, cadastral: false,
      healthFacilities: false, liveTraffic: false, police: false, fireStations: false,
      schools: false, rail: false, railStations: false, floodRain: false,
      terrain: false, buildings: false
    }
  },
  environment: {
    view: { center: [101.48, 3.18], zoom: 9.5, pitch: 45, bearing: 0 },
    state: {
      cityHierarchy: false, pbt: true, districts: true, cadastral: false,
      healthFacilities: false, liveTraffic: false, police: false, fireStations: false,
      schools: false, rail: false, railStations: false, floodRain: true,
      terrain: true, buildings: true
    }
  },
  traffic: {
    view: { center: [101.53, 3.08], zoom: 10.2, pitch: 48, bearing: 0 },
    state: {
      cityHierarchy: false, pbt: true, districts: true, cadastral: false,
      healthFacilities: false, liveTraffic: true, police: false, fireStations: false,
      schools: false, rail: false, railStations: false, floodRain: false,
      terrain: true, buildings: true
    }
  }
};

const deepLinkPreset = DEEP_LINK_PRESETS[deepLinkFocus] || null;
let deepLinkApplied = false;

if (deepLinkPreset) {
  Object.assign(layerState, deepLinkPreset.state);
}

function syncDeepLinkToggles() {
  const toggleMap = {
    cityHierarchy: "cityHierarchyToggle",
    pbt: "pbtToggle",
    districts: "districtToggle",
    cadastral: "cadastralToggle",
    healthFacilities: "healthFacilityToggle",
    liveTraffic: "trafficToggle",
    police: "policeToggle",
    fireStations: "fireStationToggle",
    schools: "schoolToggle",
    rail: "railToggle",
    railStations: "railStationToggle",
    floodRain: "floodRainToggle",
    terrain: "terrainToggle",
    buildings: "buildingToggle"
  };

  Object.entries(toggleMap).forEach(([key, id]) => {
    const toggle = document.getElementById(id);
    if (toggle) toggle.checked = Boolean(layerState[key]);
  });
}

function applyDeepLinkView() {
  if (!deepLinkPreset) return;

  syncDeepLinkToggles();
  applyLayerVisibility(map);
  flood.setVisible(layerState.floodRain);

  if (layerState.terrain && viewMode === "3d") {
    enableTerrain(map);
  } else {
    disableTerrain(map);
  }

  try {
    map.setConfigProperty("basemap", "show3dObjects", layerState.buildings);
  } catch (_) {}

  map.flyTo({
    ...deepLinkPreset.view,
    duration: 1200,
    essential: true
  });

  updateLayerCount();

  const labels = {
    health: "Kemudahan Kesihatan",
    schools: "Pendidikan",
    police: "Polis Diraja Malaysia",
    fire: "Balai Bomba & Penyelamat",
    mobility: "Rangkaian Rel & Stesen",
    cadastral: "Lot Kadaster",
    pbt: "Sempadan PBT",
    districts: "Sempadan Daerah",
    environment: "Flood Intelligence",
    traffic: "Live Traffic"
  };

  const label = labels[deepLinkFocus];
  if (label) {
    showStartupWarning("Paparan fokus SUO: " + label);
  }
}


function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loadingScreen");
  if (loadingScreen) {
    loadingScreen.classList.add("hidden");
  }
}

function showStartupWarning(message) {
  console.warn(message);

  let notice = document.getElementById("startupWarning");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "startupWarning";
    notice.className = "startup-warning";
    document.body.appendChild(notice);
  }

  notice.textContent = message;
  notice.hidden = false;

  window.setTimeout(() => {
    notice.hidden = true;
  }, 9000);
}

map.on("style.load", async () => {
  if (window.__SUO_BOOT_TIMER__) {
    window.clearTimeout(window.__SUO_BOOT_TIMER__);
    window.__SUO_BOOT_TIMER__ = null;
  }

  try {
    await addPortalLayers(map);
    applyLayerRenderOrder(map);
    sync3DBuildings(map, { enabled: layerState.buildings, mode: viewMode, basemap: document.getElementById("basemapSelect")?.value || "standard" });

    if (deepLinkPreset && !deepLinkApplied) {
      deepLinkApplied = true;
      applyDeepLinkView();
    }

    if (viewMode === "3d" && layerState.terrain) {
      enableTerrain(map);
    }
  } catch (error) {
    console.error("Sebahagian layer portal gagal dimuatkan:", error);
    showStartupWarning(
      "Portal dibuka, tetapi sebahagian layer gagal dimuatkan. Semak Console untuk butiran."
    );
  } finally {
    hideLoadingScreen();
  }
});

map.on("error", (event) => {
  console.error("Mapbox map error:", event?.error || event);
});

// Startup failsafe: loading overlay tidak boleh mengunci portal.
window.setTimeout(() => {
  const loadingScreen = document.getElementById("loadingScreen");
  if (loadingScreen && !loadingScreen.classList.contains("hidden")) {
    hideLoadingScreen();
    showStartupWarning(
      "Portal dibuka dalam mod pemulihan kerana proses startup mengambil masa terlalu lama."
    );
  }
}, 12000);

map.on("mousemove", (event) => {
  document.getElementById("coordinateStatus").textContent =
    `Lat: ${event.lngLat.lat.toFixed(5)}, Lng: ${event.lngLat.lng.toFixed(5)}`;
});

map.on("zoom", () => {
  document.getElementById("zoomStatus").textContent =
    `Zoom: ${map.getZoom().toFixed(1)}`;
});

map.on("click", async (event) => {
  if (
    isSpatialToolActive() ||
    isNetworkIntelligenceActive()
  ) return;
  const layerIds = ["cadastral-fill", "district-fill", "pbt-fill", "school-symbol", "fire-station-point", "police-symbol", "health-symbol", "city-circle"]
    .filter((id) => map.getLayer(id));

  const features = map.queryRenderedFeatures(event.point, {
    layers: layerIds
  });

  if (!features.length) return;

  const feature = features[0];
  const properties = feature.properties || {};

  let html;

  if (feature.layer.id === "cadastral-fill") {
    const config = await getCadastralConfig();
    html = cadastralPopupHtml(properties, config);
  } else if (feature.layer.id === "district-fill") {
    const area = Number(properties.web_area);
    const areaText = Number.isFinite(area)
      ? `${area.toLocaleString("ms-MY", { maximumFractionDigits: 2 })} hektar`
      : "-";

    html = `<strong>Daerah ${properties.web_name || "-"}</strong><br>
      Kod Daerah: ${properties.web_code || "-"}<br>
      Keluasan: ${areaText}<br>
      Tahun data: 2024`;
  } else if (feature.layer.id === "pbt-fill") {
    const area = Number(properties.web_area);
    const areaText = Number.isFinite(area)
      ? `${area.toLocaleString("ms-MY", { maximumFractionDigits: 2 })} hektar`
      : "-";

    html = `<strong>${properties.web_name || "PBT"}</strong><br>
      Kategori: ${properties.web_type || "-"}<br>
      Keluasan: ${areaText}<br>
      Tahun data: 2024`;
  } else if (feature.layer.id === "school-symbol") {
    html = `<strong>${properties.web_name || "Sekolah"}</strong><br>
      Tahap: ${properties.web_level || "-"}<br>
      PPD: ${properties.web_ppd || "-"}<br>
      Daerah: ${properties.web_district || "-"}<br>
      PBT: ${properties.web_pbt || "-"}<br>
      Jenis Warta: ${properties.web_type || "-"}`;
  } else if (feature.layer.id === "police-symbol") {
    html = `<strong>${properties.web_name || "PDRM"}</strong><br>
      Hierarki: ${properties.web_hierarchy || "-"}<br>
      Daerah: ${properties.web_district || "-"}<br>
      Alamat: ${properties.web_address || "-"}<br>
      Telefon: ${properties.web_phone || "-"}`;
  } else if (feature.layer.id === "fire-station-point") {
    html = `<strong>${properties.NAMA_BBP || "Balai Bomba & Penyelamat"}</strong><br>
      Zon: ${properties.ZON || "-"} — ${properties.NAMA_ZON || "-"}<br>
      Kategori: ${properties.KATEGORI || "-"}`;
  } else if (feature.layer.id === "health-symbol") {
    html = `<strong>${properties.web_name || "Kemudahan Kesihatan"}</strong><br>
      Kategori: ${properties.web_category || "-"}<br>
      Daerah: ${properties.web_district || "-"}<br>
      Operator: ${properties.web_operator || "-"}`;
  } else {
    html = `<strong>${properties.nama_bandar || "Bandar"}</strong><br>
      Hierarki: ${properties.hierarki || "-"}<br>
      Daerah: ${properties.daerah || "-"}`;
  }

  new mapboxgl.Popup()
    .setLngLat(feature.geometry.coordinates)
    .setHTML(html)
    .addTo(map);

  document.getElementById("featureInfo").innerHTML = html;
});

function flyToCity(city, duration = 1800) {
  map.flyTo({
    center: city.center,
    zoom: city.zoom ?? 14.2,
    pitch: viewMode === "3d" ? 64 : 0,
    bearing: 0,
    duration,
    essential: true
  });

  window.dispatchEvent(new CustomEvent("suo:location-change", {
    detail: {
      name: city.name,
      center: city.center
    }
  }));
}

const cities = await initUrbanExplorer((city) => flyToCity(city));

for (const city of cities) {
  cityLookup.set(city.name.toLowerCase(), city);

  for (const alias of city.aliases || []) {
    cityLookup.set(alias.toLowerCase(), city);
  }
}

const urbanTour = new UrbanTour(map, cities, flyToCity);

document.getElementById("tourBtn").addEventListener("click", () => {
  urbanTour.start();
});

function setViewMode(mode) {
  viewMode = mode;
  const is3D = mode === "3d";

  map.easeTo({
    pitch: is3D ? 60 : 0,
    bearing: 0,
    duration: 800
  });

  if (is3D && layerState.terrain) {
    enableTerrain(map);
  } else {
    disableTerrain(map);
  }

  try {
    map.setConfigProperty(
      "basemap",
      "show3dObjects",
      is3D && layerState.buildings
    );
  } catch (_) {}

  sync3DBuildings(map, { enabled: layerState.buildings, mode, basemap: document.getElementById("basemapSelect")?.value || "standard" });

  document.getElementById("view2DBtn").classList.toggle("active", !is3D);
  document.getElementById("view3DBtn").classList.toggle("active", is3D);
  document.getElementById("left2DBtn").classList.toggle("active", !is3D);
  document.getElementById("left3DBtn").classList.toggle("active", is3D);
}

document.getElementById("view2DBtn")
  .addEventListener("click", () => setViewMode("2d"));

document.getElementById("view3DBtn")
  .addEventListener("click", () => setViewMode("3d"));

document.getElementById("left2DBtn")
  .addEventListener("click", () => setViewMode("2d"));

document.getElementById("left3DBtn")
  .addEventListener("click", () => setViewMode("3d"));

document.getElementById("basemapSelect").addEventListener("change", (event) => {
  const selected = event.target.value;
  const style = BASEMAPS[selected];
  if (!style) {
    showStartupWarning("Pilihan basemap tidak dikenali.");
    return;
  }
  // The existing style.load handler restores SUO GIS layers after setStyle.
  try {
    map.setStyle(style);
  } catch (error) {
    console.error("Pertukaran basemap gagal:", error);
    showStartupWarning("Basemap gagal ditukar. Sila cuba pilihan lain.");
  }
});

document.getElementById("cityHierarchyToggle").addEventListener("change", (event) => {
  layerState.cityHierarchy = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("cadastralToggle").addEventListener("change", async (event) => {
  const status = document.getElementById("cadastralStatus");

  if (event.target.checked) {
    const result = await addCadastralLayer(map);

    if (!result.configured) {
      event.target.checked = false;
      layerState.cadastral = false;
      status.textContent =
        "Vector Tile belum dikonfigurasi. Isi URL dalam config/cadastral-layer.json.";
      status.classList.add("warning");
      updateLayerCount();
      return;
    }

    status.textContent = "Lot Kadaster aktif. Paparan bermula pada zoom 11.";
    status.classList.remove("warning");
  }

  layerState.cadastral = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("pbtToggle").addEventListener("change", (event) => {
  layerState.pbt = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("districtToggle").addEventListener("change", (event) => {
  layerState.districts = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("healthFacilityToggle").addEventListener("change", (event) => {
  layerState.healthFacilities = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("trafficToggle").addEventListener("change", (event) => {
  layerState.liveTraffic = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("policeToggle").addEventListener("change", (event) => {
  layerState.police = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("fireStationToggle").addEventListener("change", (event) => {
  layerState.fireStations = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("schoolToggle").addEventListener("change", (event) => {
  layerState.schools = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("railToggle").addEventListener("change", (event) => {
  layerState.rail = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("railStationToggle").addEventListener("change", (event) => {
  layerState.railStations = event.target.checked;
  applyLayerVisibility(map);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("floodRainToggle").addEventListener("change", (event) => {
  flood.setVisible(event.target.checked);
  compare.refreshLayers();
  updateLayerCount();
});

document.getElementById("terrainToggle").addEventListener("change", (event) => {
  layerState.terrain = event.target.checked;

  if (event.target.checked && viewMode === "3d") {
    enableTerrain(map);
  } else {
    disableTerrain(map);
  }

  updateLayerCount();
});

document.getElementById("buildingToggle").addEventListener("change", (event) => {
  layerState.buildings = event.target.checked;

  try {
    map.setConfigProperty(
      "basemap",
      "show3dObjects",
      event.target.checked && viewMode === "3d"
    );
  } catch (_) {}

  sync3DBuildings(map, { enabled: layerState.buildings, mode: viewMode, basemap: document.getElementById("basemapSelect")?.value || "standard" });
  updateLayerCount();
});

document.getElementById("toggleAllLayers").addEventListener("click", () => {
  const allOn = !Object.values(layerState).every(Boolean);

  Object.keys(layerState).forEach((key) => {
    layerState[key] = allOn;
  });

  document.getElementById("cityHierarchyToggle").checked = allOn;
  document.getElementById("pbtToggle").checked = allOn;
  document.getElementById("districtToggle").checked = allOn;
  document.getElementById("healthFacilityToggle").checked = allOn;
  document.getElementById("trafficToggle").checked = allOn;
  document.getElementById("policeToggle").checked = allOn;
  document.getElementById("fireStationToggle").checked = allOn;
  document.getElementById("schoolToggle").checked = allOn;
  document.getElementById("railToggle").checked = allOn;
  document.getElementById("railStationToggle").checked = allOn;
  document.getElementById("floodRainToggle").checked = allOn;
  document.getElementById("terrainToggle").checked = allOn;
  document.getElementById("buildingToggle").checked = allOn;

  applyLayerVisibility(map);
  compare.refreshLayers();
  flood.setVisible(allOn);

  if (allOn && viewMode === "3d") {
    enableTerrain(map);
  } else if (!allOn) {
    disableTerrain(map);
  }

  updateLayerCount();
});

function updateLayerCount() {
  document.getElementById("activeLayerCount").textContent =
    String(Object.values(layerState).filter(Boolean).length);
}

document.getElementById("healthLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("healthLegendBtn");
  const panel = document.getElementById("healthLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("railLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("railLegendBtn");
  const panel = document.getElementById("railLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("railStationLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("railStationLegendBtn");
  const panel = document.getElementById("railStationLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("cadastralLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("cadastralLegendBtn");
  const panel = document.getElementById("cadastralLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("pbtLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("pbtLegendBtn");
  const panel = document.getElementById("pbtLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("districtLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("districtLegendBtn");
  const panel = document.getElementById("districtLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("trafficLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("trafficLegendBtn");
  const panel = document.getElementById("trafficLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("policeLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("policeLegendBtn");
  const panel = document.getElementById("policeLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("schoolLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("schoolLegendBtn");
  const panel = document.getElementById("schoolLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("floodLegendBtn").addEventListener("click", () => {
  const button = document.getElementById("floodLegendBtn");
  const panel = document.getElementById("floodLegendPanel");
  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));
  button.classList.toggle("open", !expanded);
  panel.hidden = expanded;
});

document.getElementById("resetBtn").addEventListener("click", () => {
  map.flyTo({
    ...START_VIEW,
    pitch: viewMode === "3d" ? START_VIEW.pitch : 0,
    bearing: 0,
    duration: 1600
  });
});

document.getElementById("fullscreenBtn").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

document.getElementById("nightBtn").addEventListener("click", () => {
  nightMode = !nightMode;

  try {
    map.setConfigProperty(
      "basemap",
      "lightPreset",
      nightMode ? "night" : "day"
    );
  } catch (_) {
    map.setStyle(nightMode ? BASEMAPS.dark : BASEMAPS.standard);
  }
});


map.on("click", "rail-station-circle", (event) => {
  const feature = event.features?.[0];
  if (!feature) return;

  const p = feature.properties || {};
  const coord = feature.geometry?.coordinates;
  if (!coord) return;

  const html = `
    <div class="standard-popup-content">
      <div class="popup-kicker">STESEN REL</div>
      <h3>${p.station_name || "-"}</h3>
      <div class="popup-info-grid">
        <span>Kod</span><strong>${p.station_code || "-"}</strong>
        <span>Line</span><strong>${p.line_name || "-"}</strong>
        <span>Mode</span><strong>${p.mode || "-"}</strong>
        <span>Operator</span><strong>${p.operator || "-"}</strong>
        <span>Status</span><strong>${p.status || "-"}</strong>
      </div>
    </div>`;

  new mapboxgl.Popup({ closeButton: true, maxWidth: "310px" })
    .setLngLat(coord)
    .setHTML(html)
    .addTo(map);
});

map.on("mouseenter", "rail-station-circle", () => {
  map.getCanvas().style.cursor = "pointer";
});

map.on("mouseleave", "rail-station-circle", () => {
  map.getCanvas().style.cursor = "";
});

document.getElementById("locateBtn").addEventListener("click", () => {
  navigator.geolocation?.getCurrentPosition((position) => {
    const center = [
      position.coords.longitude,
      position.coords.latitude
    ];

    map.flyTo({
      center,
      zoom: 16,
      pitch: viewMode === "3d" ? 55 : 0,
      bearing: 0
    });

    activeMarker?.remove();
    activeMarker = new mapboxgl.Marker({ color: "#2dd4bf" })
      .setLngLat(center)
      .addTo(map);
  });
});

function addChatBubble(text, type, options = {}) {
  const container = document.getElementById("chatMessages");
  const bubble = document.createElement("div");

  bubble.className = `chat-bubble ${type}`;

  if (options.loading) {
    bubble.classList.add("chat-loading");
  }

  bubble.textContent = text;

  if (type === "bot") {
    const row = document.createElement("div");
    row.className = "chat-row bot-row";

    const avatar = document.createElement("div");
    avatar.className = "chat-mini-avatar";

    const image = document.createElement("img");
    image.src = "assets/avatar/mr-tpr-suo.png";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");

    avatar.appendChild(image);
    row.appendChild(avatar);
    row.appendChild(bubble);
    container.appendChild(row);
  } else {
    const row = document.createElement("div");
    row.className = "chat-row user-row";
    row.appendChild(bubble);
    container.appendChild(row);
  }

  container.scrollTop = container.scrollHeight;
  return bubble;
}



document.querySelectorAll("[data-layer-category]").forEach((button) => {
  button.addEventListener("click", () => {
    const category = button.dataset.layerCategory;
    const content = document.querySelector(
      `[data-layer-category-content="${category}"]`
    );

    if (!content) return;

    const expanded = button.getAttribute("aria-expanded") === "true";

    button.setAttribute("aria-expanded", String(!expanded));
    button.classList.toggle("collapsed", expanded);
    content.hidden = expanded;
  });
});



const workspaceController = new WorkspaceController({
  map,
  compare
});

const smartSearch = new SmartSearch({
  map,
  viewModeProvider: () => viewMode
});

const ASSISTANT_LAYER_LABELS = {
  traffic: "Live Traffic",
  floodRain: "Flood Intelligence Fasa 1",
  cadastral: "Lot Kadaster Selangor 2023",
  pbt: "Sempadan PBT",
  districts: "Sempadan Daerah",
  healthFacilities: "Kemudahan Kesihatan",
  police: "Polis Diraja Malaysia",
  fireStations: "Balai Bomba & Penyelamat",
  schools: "Pendidikan",
  cityHierarchy: "Hierarki Bandar DPN2",
  terrain: "Terrain 3D",
  buildings: "Bangunan 3D"
};

function setAssistantLayerVisibility(layer, visible) {
  const toggleMap = {
    traffic: "trafficToggle",
    floodRain: "floodRainToggle",
    cadastral: "cadastralToggle",
    pbt: "pbtToggle",
    districts: "districtToggle",
    healthFacilities: "healthFacilityToggle",
    police: "policeToggle",
    fireStations: "fireStationToggle",
    schools: "schoolToggle",
    cityHierarchy: "cityHierarchyToggle",
    terrain: "terrainToggle",
    buildings: "buildingToggle"
  };

  const toggleId = toggleMap[layer];
  if (!toggleId) return false;

  const toggle = document.getElementById(toggleId);
  if (!toggle) return false;

  toggle.checked = visible;
  toggle.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

const spatialAssistant = new SpatialAssistant({
  map,
  addBubble: addChatBubble,
  cityLookup,
  actions: {
    setViewMode,
    flyToCity,
    openSplit: () => compare.open(),
    focusMap: () =>
      document.getElementById("focusMapBtn")?.click(),
    setLeftPanel: (open) =>
      workspaceController.setLeft(open),
    setRightPanel: (open) =>
      workspaceController.setRight(open),
    setLayerVisibility: setAssistantLayerVisibility,
    getLayerLabel: (layer) => ASSISTANT_LAYER_LABELS[layer] || layer
  }
});

spatialAssistant.bindForm(
  document.getElementById("chatForm"),
  document.getElementById("chatInput")
);

document.querySelectorAll("[data-assistant-example]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById("chatInput");
    input.value = button.dataset.assistantExample || "";
    input.focus();
    document.getElementById("chatForm").requestSubmit();
  });
});



window.addEventListener("load", () => {
  window.setTimeout(() => {
    try {
      map.resize();
    } catch (error) {
      console.warn("Map resize selepas load gagal:", error);
    }
  }, 250);
});

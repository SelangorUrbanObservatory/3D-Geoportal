import { sync3DBuildings } from "./3d-buildings.js";
import { MAPBOX_TOKEN, BASEMAPS } from "./config.js";
import {
  addPortalLayers,
  enableTerrain,
  disableTerrain,
  layerState
} from "./layers.js";
import { enableMiddleMousePan, cameraFrom } from "./utils.js";

const STORAGE_KEY = "suoCompareStateV602";

const DEFAULT_LAYERS = {
  cityHierarchy: true,
  healthFacilities: true,
  schools: true,
  police: true,
  floodRain: true,
  traffic: true,
  cadastral: false,
  districts: true,
  pbt: true
};

const LAYER_IDS = {
  cityHierarchy: ["city-circle", "city-label"],
  healthFacilities: ["health-symbol", "health-label"],
  schools: ["school-symbol", "school-label"],
  police: ["police-symbol", "police-label"],
  floodRain: ["flood-rain-circle", "flood-rain-label"],
  traffic: ["traffic-casing", "traffic-line"],
  cadastral: ["cadastral-fill", "cadastral-line", "cadastral-label"],
  districts: ["district-fill", "district-line", "district-label"],
  pbt: ["pbt-fill", "pbt-line", "pbt-label"]
};

const SUO_SYMBOL_SUFFIXES = new Set([
  "city-label",
  "health-symbol",
  "health-label",
  "school-symbol",
  "school-label",
  "police-symbol",
  "police-label",
  "flood-rain-label",
  "district-label",
  "pbt-label"
]);

const NON_3D_BASEMAPS = new Set(["osm"]);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readSavedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (_) {
    return null;
  }
}

function createInitialState() {
  const saved = readSavedState();

  return {
    left: {
      basemap: saved?.left?.basemap || "standard",
      mode: saved?.left?.mode || "3d",
      labels: saved?.left?.labels ?? true,
      layers: {
        ...DEFAULT_LAYERS,
        ...(saved?.left?.layers || {})
      }
    },
    right: {
      basemap: saved?.right?.basemap || "satellite",
      mode: saved?.right?.mode || "3d",
      labels: saved?.right?.labels ?? true,
      layers: {
        ...DEFAULT_LAYERS,
        ...(saved?.right?.layers || {})
      }
    },
    sync: {
      pan: saved?.sync?.pan ?? true,
      zoom: saved?.sync?.zoom ?? true,
      bearing: saved?.sync?.bearing ?? true,
      pitch: saved?.sync?.pitch ?? true
    }
  };
}

function waitForEvent(target, eventName, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    let timeoutId;

    const cleanup = () => {
      target.off(eventName, handler);
      clearTimeout(timeoutId);
    };

    const handler = () => {
      cleanup();
      resolve();
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout menunggu ${eventName}.`));
    }, timeoutMs);

    target.on(eventName, handler);
  });
}

function waitForMapStable(map) {
  if (map.loaded() && map.isStyleLoaded()) {
    return Promise.resolve();
  }

  return waitForEvent(map, "idle").catch(() =>
    new Promise((resolve) => setTimeout(resolve, 250))
  );
}

export class CompareEngine {
  constructor(mainMap) {
    this.mainMap = mainMap;
    this.compareMap = null;
    this.active = false;
    this.syncing = false;
    this.state = createInitialState();
    this.mainSnapshot = null;
    this.styleSequence = {
      left: 0,
      right: 0
    };

    this.shell = document.querySelector(".map-shell");
    this.panel = document.getElementById("comparePanel");
    this.status = document.getElementById("compareStatus");

    this.bindUI();
    this.correctUnsupportedModes();
    this.renderUI();
  }

  bindUI() {
    document.getElementById("splitBtn")
      .addEventListener("click", () => this.toggle());

    document.getElementById("closeSplitBtn")
      .addEventListener("click", () => this.close());

    document.querySelectorAll("[data-compare-tab]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const tab = button.dataset.compareTab;

          document.querySelectorAll("[data-compare-tab]")
            .forEach((item) => {
              const selected = item === button;
              item.classList.toggle("active", selected);
              item.setAttribute("aria-selected", String(selected));
              item.tabIndex = selected ? 0 : -1;
            });

          document.querySelectorAll("[data-compare-panel]")
            .forEach((panel) => {
              const selected =
                panel.dataset.comparePanel === tab;

              panel.hidden = !selected;
              panel.classList.toggle("active", selected);
            });
        });
      });

    // Keyboard-accessible tab navigation; keeps existing data selectors unchanged.
    document.querySelector(".compare-tabs")?.addEventListener("keydown", (event) => {
      const current = event.target.closest?.("[data-compare-tab]");
      if (!current || !["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
      const tabs = [...document.querySelectorAll("[data-compare-tab]")];
      const index = tabs.indexOf(current);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 :
        (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click();
      tabs[next].focus();
    });

    document.querySelectorAll("[data-compare-layer]")
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const side = checkbox.dataset.compareSide;
          const layer = checkbox.dataset.compareLayer;

          this.state[side].layers[layer] = checkbox.checked;
          this.save();
          this.applyLayerState(side);
        });
      });

    document.querySelectorAll("[data-select-all]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const side = button.dataset.selectAll;
          const current = Object.values(
            this.state[side].layers
          );
          const turnOn = !current.every(Boolean);

          Object.keys(this.state[side].layers)
            .forEach((key) => {
              this.state[side].layers[key] = turnOn;
            });

          this.renderUI();
          this.save();
          this.applyLayerState(side);
        });
      });

    document.getElementById("leftBasemapSelect")
      .addEventListener("change", (event) =>
        this.setBasemap("left", event.target.value)
      );

    document.getElementById("rightBasemapSelect")
      .addEventListener("change", (event) =>
        this.setBasemap("right", event.target.value)
      );

    document.getElementById("swapMapsBtn")
      .addEventListener("click", async () => {
        const leftBasemap = this.state.left.basemap;

        this.state.left.basemap =
          this.state.right.basemap;
        this.state.right.basemap = leftBasemap;

        this.correctUnsupportedModes();
        this.renderUI();
        this.save();

        if (this.active) {
          await Promise.all([
            this.reloadSide("left"),
            this.reloadSide("right")
          ]);
        }
      });

    document.getElementById("left2DBtn")
      .addEventListener("click", () =>
        this.setMode("left", "2d")
      );

    document.getElementById("left3DBtn")
      .addEventListener("click", () =>
        this.setMode("left", "3d")
      );

    document.getElementById("right2DBtn")
      .addEventListener("click", () =>
        this.setMode("right", "2d")
      );

    document.getElementById("right3DBtn")
      .addEventListener("click", () =>
        this.setMode("right", "3d")
      );

    document.getElementById("leftLabelsToggle")
      .addEventListener("change", (event) => {
        this.state.left.labels = event.target.checked;
        this.save();
        this.applyBasemapLabels("left");
      });

    document.getElementById("rightLabelsToggle")
      .addEventListener("change", (event) => {
        this.state.right.labels = event.target.checked;
        this.save();
        this.applyBasemapLabels("right");
      });

    const syncInputs = {
      syncPanToggle: "pan",
      syncZoomToggle: "zoom",
      syncBearingToggle: "bearing",
      syncPitchToggle: "pitch"
    };

    Object.entries(syncInputs).forEach(([id, key]) => {
      document.getElementById(id)
        .addEventListener("change", (event) => {
          this.state.sync[key] = event.target.checked;
          this.save();
          this.updateStatus();
        });
    });
  }

  correctUnsupportedModes() {
    for (const side of ["left", "right"]) {
      if (
        NON_3D_BASEMAPS.has(this.state[side].basemap) &&
        this.state[side].mode === "3d"
      ) {
        this.state[side].mode = "2d";
      }
    }
  }

  renderUI() {
    document.getElementById("leftBasemapSelect").value =
      this.state.left.basemap;

    document.getElementById("rightBasemapSelect").value =
      this.state.right.basemap;

    for (const side of ["left", "right"]) {
      document.querySelectorAll(
        `[data-compare-side="${side}"][data-compare-layer]`
      ).forEach((checkbox) => {
        checkbox.checked = Boolean(
          this.state[side].layers[
            checkbox.dataset.compareLayer
          ]
        );
      });

      const is3D = this.state[side].mode === "3d";
      const supports3D = !NON_3D_BASEMAPS.has(
        this.state[side].basemap
      );

      document.getElementById(`${side}2DBtn`)
        .classList.toggle("active", !is3D);

      const button3D =
        document.getElementById(`${side}3DBtn`);

      button3D.classList.toggle("active", is3D);
      button3D.disabled = !supports3D;
      button3D.title = supports3D
        ? "Aktifkan paparan 3D"
        : "OpenStreetMap raster hanya disokong dalam 2D";

      document.getElementById(
        `${side}LabelsToggle`
      ).checked = this.state[side].labels;
    }

    document.getElementById("syncPanToggle").checked =
      this.state.sync.pan;
    document.getElementById("syncZoomToggle").checked =
      this.state.sync.zoom;
    document.getElementById("syncBearingToggle").checked =
      this.state.sync.bearing;
    document.getElementById("syncPitchToggle").checked =
      this.state.sync.pitch;

    this.updateStatus();
  }

  save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.state)
      );
    } catch (_) {}
  }

  mapFor(side) {
    return side === "left"
      ? this.mainMap
      : this.compareMap;
  }

  prefixFor(side) {
    return side === "left"
      ? ""
      : "compare-";
  }

  takeMainSnapshot() {
    this.mainSnapshot = {
      basemap:
        document.getElementById("basemapSelect")?.value ||
        "standard",
      camera: cameraFrom(this.mainMap),
      layerState: deepClone(layerState)
    };
  }

  async ensureMap() {
    if (this.compareMap) {
      return this.compareMap;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const camera = cameraFrom(this.mainMap);

    this.compareMap = new mapboxgl.Map({
      container: "compareMap",
      style: BASEMAPS[this.state.right.basemap],
      center: camera.center,
      zoom: camera.zoom,
      pitch:
        this.state.right.mode === "3d"
          ? camera.pitch
          : 0,
      bearing: camera.bearing,
      antialias: true
    });

    this.compareMap.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true
      }),
      "top-right"
    );

    enableMiddleMousePan(this.compareMap);

    this.mainMap.on("move", () =>
      this.syncCamera("left", "right")
    );

    this.compareMap.on("move", () =>
      this.syncCamera("right", "left")
    );

    await waitForMapStable(this.compareMap);
    await this.prepareSide("right");

    return this.compareMap;
  }

  async open() {
    if (this.active) return;

    this.takeMainSnapshot();
    this.active = true;

    this.shell.classList.add("split-active");
    this.panel.classList.add("visible");

    await this.ensureMap();

    await Promise.all([
      this.reloadSide("left"),
      this.reloadSide("right")
    ]);

    requestAnimationFrame(() => {
      this.mainMap.resize();
      this.compareMap.resize();
      this.syncCamera("left", "right", true);
    });
  }

  async close() {
    if (!this.active) return;

    this.active = false;
    this.shell.classList.remove("split-active");
    this.panel.classList.remove("visible");

    if (!this.mainSnapshot) {
      requestAnimationFrame(() =>
        this.mainMap.resize()
      );
      return;
    }

    const snapshot = this.mainSnapshot;

    document.getElementById("basemapSelect").value =
      snapshot.basemap;

    await this.setStyleAndWait(
      this.mainMap,
      BASEMAPS[snapshot.basemap]
    );

    Object.assign(layerState, snapshot.layerState);

    await waitForMapStable(this.mainMap);
    await addPortalLayers(this.mainMap);

    this.applyGlobalVisibility();

    if (snapshot.layerState.terrain) {
      enableTerrain(this.mainMap);
    } else {
      disableTerrain(this.mainMap);
    }

    this.mainMap.jumpTo(snapshot.camera);
    this.mainMap.resize();
  }

  toggle() {
    return this.active
      ? this.close()
      : this.open();
  }

  async setBasemap(side, basemap) {
    this.state[side].basemap = basemap;

    if (NON_3D_BASEMAPS.has(basemap)) {
      this.state[side].mode = "2d";
      this.status.textContent =
        `${side === "left" ? "Left" : "Right"} Map: ` +
        "OpenStreetMap dipaparkan dalam 2D untuk mengelakkan distorsi raster.";
    }

    this.renderUI();
    this.save();

    if (this.active) {
      await this.reloadSide(side);
    }
  }

  async reloadSide(side) {
    const map =
      side === "right"
        ? await this.ensureMap()
        : this.mainMap;

    const sequence = ++this.styleSequence[side];

    await this.setStyleAndWait(
      map,
      BASEMAPS[this.state[side].basemap]
    );

    if (sequence !== this.styleSequence[side]) {
      return;
    }

    await waitForMapStable(map);
    await this.prepareSide(side);
  }

  setStyleAndWait(map, style) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(
          "Basemap mengambil masa terlalu lama untuk dimuatkan."
        ));
      }, 15000);

      const handleStyleLoad = () => {
        clearTimeout(timeout);
        resolve();
      };

      map.once("style.load", handleStyleLoad);
      map.setStyle(style);
    });
  }

  async prepareSide(side) {
    const map = this.mapFor(side);
    const prefix = this.prefixFor(side);

    if (!map || !map.isStyleLoaded()) {
      return;
    }

    try {
      await addPortalLayers(map, prefix);
    } catch (error) {
      console.warn(
        `Percubaan pertama memasang layer ${side} gagal.`,
        error
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 250)
      );

      await addPortalLayers(map, prefix);
    }

    this.applyLayerState(side);
    this.applyBasemapLabels(side);
    this.applyTerrain(side);
    sync3DBuildings(map, {
      enabled: layerState.buildings,
      mode: this.state[side].mode,
      basemap: this.state[side].basemap,
      prefix
    });

    window.dispatchEvent(new CustomEvent(
      "suo:compare-map-ready",
      {
        detail: {
          map,
          prefix
        }
      }
    ));

    // Flood Intelligence is inserted asynchronously.
    // Reapply state after the event has added its layers.
    setTimeout(() => {
      if (!this.active) return;

      this.applyLayerState(side);
      this.applyBasemapLabels(side);
      map.resize();
    }, 450);
  }

  async setMode(side, mode) {
    if (
      mode === "3d" &&
      NON_3D_BASEMAPS.has(this.state[side].basemap)
    ) {
      this.state[side].mode = "2d";
      this.renderUI();
      this.save();

      this.status.textContent =
        "OpenStreetMap ialah raster 2D dan tidak dipaksa ke terrain 3D.";
      return;
    }

    if (side === "right") {
      await this.ensureMap();
    }

    this.state[side].mode = mode;
    this.renderUI();
    this.save();

    const map = this.mapFor(side);
    const is3D = mode === "3d";

    map.easeTo({
      pitch: is3D ? 58 : 0,
      bearing: is3D ? map.getBearing() : 0,
      duration: 650
    });

    this.applyTerrain(side);
  }

  applyTerrain(side) {
    const map = this.mapFor(side);

    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const canUse3D =
      !NON_3D_BASEMAPS.has(
        this.state[side].basemap
      );

    const is3D =
      this.state[side].mode === "3d" &&
      canUse3D;

    if (is3D) {
      enableTerrain(
        map,
        side === "left"
          ? "compare-left-dem"
          : "compare-right-dem"
      );
    } else {
      disableTerrain(map);

      if (map.getPitch() !== 0) {
        map.jumpTo({
          pitch: 0,
          bearing: 0
        });
      }
    }

    try {
      map.setConfigProperty(
        "basemap",
        "show3dObjects",
        is3D
      );
    } catch (_) {}
    sync3DBuildings(map, {
      enabled: layerState.buildings,
      mode: this.state[side].mode,
      basemap: this.state[side].basemap,
      prefix: this.prefixFor(side)
    });
  }

  applyLayerState(side) {
    const map = this.mapFor(side);

    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const prefix = this.prefixFor(side);
    const states = this.state[side].layers;

    Object.entries(LAYER_IDS)
      .forEach(([key, suffixes]) => {
        const visibility =
          states[key] ? "visible" : "none";

        suffixes.forEach((suffix) => {
          const id = `${prefix}${suffix}`;

          if (map.getLayer(id)) {
            map.setLayoutProperty(
              id,
              "visibility",
              visibility
            );
          }
        });
      });
  }

  applyGlobalVisibility() {
    const globalState = {
      cityHierarchy: layerState.cityHierarchy,
      healthFacilities: layerState.healthFacilities,
      schools: layerState.schools,
      police: layerState.police,
      floodRain: layerState.floodRain,
      traffic: layerState.liveTraffic,
      cadastral: layerState.cadastral,
      districts: layerState.districts,
      pbt: layerState.pbt
    };

    Object.entries(LAYER_IDS)
      .forEach(([key, suffixes]) => {
        const visibility =
          globalState[key] ? "visible" : "none";

        suffixes.forEach((id) => {
          if (this.mainMap.getLayer(id)) {
            this.mainMap.setLayoutProperty(
              id,
              "visibility",
              visibility
            );
          }
        });
      });
  }

  applyBasemapLabels(side) {
    const map = this.mapFor(side);

    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const visible = this.state[side].labels;
    const prefix = this.prefixFor(side);

    try {
      map.setConfigProperty(
        "basemap",
        "showPointOfInterestLabels",
        visible
      );
      map.setConfigProperty(
        "basemap",
        "showPlaceLabels",
        visible
      );
      map.setConfigProperty(
        "basemap",
        "showTransitLabels",
        visible
      );
      map.setConfigProperty(
        "basemap",
        "showRoadLabels",
        visible
      );
    } catch (_) {}

    const styleLayers = map.getStyle()?.layers || [];

    styleLayers.forEach((layer) => {
      if (layer.type !== "symbol") return;

      const suffix =
        prefix && layer.id.startsWith(prefix)
          ? layer.id.slice(prefix.length)
          : layer.id;

      if (SUO_SYMBOL_SUFFIXES.has(suffix)) {
        return;
      }

      try {
        map.setLayoutProperty(
          layer.id,
          "visibility",
          visible ? "visible" : "none"
        );
      } catch (_) {}
    });
  }

  syncCamera(fromSide, toSide, force = false) {
    if (
      !this.active ||
      this.syncing ||
      !this.compareMap
    ) {
      return;
    }

    const anySync =
      Object.values(this.state.sync).some(Boolean);

    if (!anySync && !force) return;

    const source = this.mapFor(fromSide);
    const target = this.mapFor(toSide);
    const options = {};

    if (this.state.sync.pan || force) {
      options.center = source.getCenter();
    }

    if (this.state.sync.zoom || force) {
      options.zoom = source.getZoom();
    }

    if (this.state.sync.bearing || force) {
      options.bearing = source.getBearing();
    }

    if (this.state.sync.pitch || force) {
      const targetCanUse3D =
        this.state[toSide].mode === "3d" &&
        !NON_3D_BASEMAPS.has(
          this.state[toSide].basemap
        );

      options.pitch =
        targetCanUse3D
          ? source.getPitch()
          : 0;
    }

    this.syncing = true;
    target.jumpTo(options);

    requestAnimationFrame(() => {
      this.syncing = false;
    });
  }

  updateStatus() {
    const activeSync = Object.entries(this.state.sync)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);

    const labels = {
      pan: "gerakan peta",
      zoom: "zum",
      bearing: "putaran",
      pitch: "kecondongan"
    };
    this.status.textContent = activeSync.length
      ? `Penyegerakan aktif: ${activeSync.map(key => labels[key] || key).join(", ")}`
      : "Penyegerakan dimatikan — peta kiri dan kanan bergerak secara bebas.";
  }

  refreshLayers() {
    if (!this.active) return;

    this.applyLayerState("left");
    this.applyLayerState("right");
  }
}

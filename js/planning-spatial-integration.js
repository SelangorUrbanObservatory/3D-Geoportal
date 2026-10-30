// P3 spatial data bridge — deliberately fail-closed until SUO publishes
// a governed, server-side PostGIS API. No parcel counts from map tiles.
const INTEGRATION_CONFIG = "config/planning-spatial-integration.json";
const CADASTRAL_CONFIG = "config/cadastral-layer.json";
const LANDUSE_SUMMARY = "config/landuse-intelligence.json";

async function readJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error("Konfigurasi tidak dapat dimuatkan: " + path);
  return response.json();
}

export function cadastralDisplayConfigured(config) {
  if (!config?.enabled) return false;
  if (config.sourceType === "mapboxTileset") {
    return typeof config.url === "string" && config.url.trim().length > 0;
  }
  if (config.sourceType === "vectorTiles") {
    return Array.isArray(config.tiles) && config.tiles.some(v => typeof v === "string" && v.trim());
  }
  if (config.sourceType === "geojson") {
    return typeof config.url === "string" && config.url.trim().length > 0;
  }
  return false;
}

export function planningQueryCapabilities(integration) {
  const api = integration?.analysisApi;
  const available = api?.enabled === true &&
    typeof api.endpoint === "string" && api.endpoint.trim().length > 0;
  return {
    cadastral: available && integration?.cadastral?.queryEnabled === true,
    landUse: available && integration?.landUse?.queryEnabled === true
  };
}

function nonnegative(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("Jawapan API tidak sah: " + field);
  }
  return value;
}

export function validatePlanningSpatialSummary(payload, requested) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Jawapan API spatial kosong.");
  }
  const summary = {};
  if (requested.includes("cadastral")) {
    const p = payload.cadastral;
    if (!p) throw new Error("Jawapan API tidak mengandungi analisis lot.");
    const count = nonnegative(p.parcelCount, "bilangan lot");
    if (!Number.isSafeInteger(count)) throw new Error("Bilangan lot bukan integer yang sah.");
    const partialCount = nonnegative(p.partialParcelCount, "lot separa");
    if (!Number.isSafeInteger(partialCount) || partialCount > count) {
      throw new Error("Bilangan lot separa tidak sah.");
    }
    const year = nonnegative(p.sourceYear, "tahun sumber lot");
    if (!Number.isSafeInteger(year) || year < 2000) {
      throw new Error("Tahun data lot tidak sah.");
    }
    summary.cadastral = {
      sourceYear: year,
      parcelCount: count,
      partialParcelCount: partialCount,
      intersectedAreaHa: nonnegative(p.intersectedAreaHa, "keluasan pertindihan lot")
    };
  }
  if (requested.includes("landUse")) {
    const p = payload.landUse;
    if (!p || !Array.isArray(p.categories)) {
      throw new Error("Jawapan API tidak mengandungi kategori guna tanah.");
    }
    const categories = p.categories.slice(0, 40).map(item => ({
      label: String(item?.label || "Tidak dinyatakan").slice(0, 110),
      areaHa: nonnegative(item?.areaHa, "keluasan kategori")
    }));
    const year = nonnegative(p.sourceYear, "tahun data guna tanah");
    if (!Number.isSafeInteger(year) || year < 2000) {
      throw new Error("Tahun data guna tanah tidak sah.");
    }
    summary.landUse = {
      sourceYear: year,
      totalAreaHa: nonnegative(p.totalAreaHa, "keluasan guna tanah"),
      categories: categories.sort((a, b) => b.areaHa - a.areaHa)
    };
  }
  if (!Object.keys(summary).length) throw new Error("Tiada dataset spatial tersedia.");
  return summary;
}

function valueLine(label, text) {
  const row = document.createElement("div");
  row.className = "planning-spatial-result-row";
  const left = document.createElement("span");
  left.textContent = label;
  const right = document.createElement("strong");
  right.textContent = text;
  row.append(left, right);
  return row;
}

function heading(text) {
  const el = document.createElement("strong");
  el.className = "planning-spatial-result-heading";
  el.textContent = text;
  return el;
}

export class PlanningSpatialIntegration {
  constructor({ getPolygon }) {
    this.getPolygon = getPolygon;
    this.config = null;
    this.displayReady = false;
    this.capabilities = { cadastral: false, landUse: false };
    this.sequence = 0;

    this.lotStatus = document.getElementById("planningSpatialLotStatus");
    this.landUseStatus = document.getElementById("planningSpatialLandUseStatus");
    this.apiStatus = document.getElementById("planningSpatialBackendStatus");
    this.result = document.getElementById("planningSpatialResult");
    this.status = document.getElementById("planningSpatialStatus");
    this.visualButton = document.getElementById("planningSpatialShowLotBtn");
    this.analyzeButton = document.getElementById("planningSpatialAnalyzeBtn");

    document.getElementById("planningSpatialRefreshBtn")
      ?.addEventListener("click", () => this.refresh());
    this.visualButton?.addEventListener("click", () => this.showLot());
    this.analyzeButton?.addEventListener("click", () => this.analyze());

    this.updatePolygon();
    this.refresh();
  }

  setStatus(message) {
    if (this.status) this.status.textContent = message;
  }

  updatePolygon() {
    ++this.sequence;
    if (this.analyzeButton) {
      this.analyzeButton.disabled =
        !this.getPolygon?.() ||
        !(this.capabilities.cadastral || this.capabilities.landUse);
    }
    // Any earlier result belongs to a different analysis origin.
    if (this.result) this.result.replaceChildren();
    this.setStatus(this.getPolygon?.()
      ? "Poligon P3 sedia. Analisis lot memerlukan sambungan API spatial."
      : "Jana Service Area, Coverage Analysis atau Perbandingan Masa terlebih dahulu.");
  }

  async refresh() {
    const serial = ++this.sequence;
    if (this.analyzeButton) this.analyzeButton.disabled = true;
    if (this.visualButton) this.visualButton.disabled = true;
    this.setStatus("Menyemak sumber Lot Kadaster dan Guna Tanah...");
    try {
      const [integration, cadastral, landuse] = await Promise.all([
        readJson(INTEGRATION_CONFIG), readJson(CADASTRAL_CONFIG), readJson(LANDUSE_SUMMARY)
      ]);
      if (serial !== this.sequence) return;
      this.config = integration;
      this.displayReady = cadastralDisplayConfigured(cadastral);
      this.capabilities = planningQueryCapabilities(integration);
      if (this.lotStatus) {
        this.lotStatus.textContent = this.displayReady
          ? "Sumber peta tersedia" : "Belum tersedia · Vector Tile belum dikonfigurasi";
      }
      if (this.landUseStatus) {
        this.landUseStatus.textContent = this.capabilities.landUse
          ? "API poligon tersedia" :
          "Ringkasan negeri " + (landuse.year || "2024") + " sahaja · belum ada poligon";
      }
      if (this.apiStatus) {
        this.apiStatus.textContent = this.capabilities.cadastral || this.capabilities.landUse
          ? "API analisis telah dikonfigurasi · tertakluk pada ujian sambungan"
          : "Belum dikonfigurasi · kiraan lot/poligon tidak tersedia";
      }
      if (this.visualButton) this.visualButton.disabled = !this.displayReady;
      if (this.analyzeButton) {
        this.analyzeButton.disabled = !this.getPolygon?.() ||
          !(this.capabilities.cadastral || this.capabilities.landUse);
      }
      this.setStatus("Semakan konfigurasi selesai. Tiada angka lot atau guna tanah diandaikan.");
    } catch (error) {
      if (serial !== this.sequence) return;
      console.warn("P3 spatial source readiness:", error);
      this.config = null;
      this.displayReady = false;
      this.capabilities = { cadastral: false, landUse: false };
      if (this.lotStatus) this.lotStatus.textContent = "Gagal menyemak sumber";
      if (this.landUseStatus) this.landUseStatus.textContent = "Gagal menyemak sumber";
      if (this.apiStatus) this.apiStatus.textContent = "Tidak dapat mengesahkan API";
      this.setStatus("Konfigurasi spatial gagal dimuatkan. Analisis lot dimatikan.");
    }
  }

  showLot() {
    if (!this.displayReady) {
      this.setStatus("Lot Kadaster belum dikonfigurasi dalam config/cadastral-layer.json.");
      return;
    }
    const toggle = document.getElementById("cadastralToggle");
    if (!toggle) return;
    if (!toggle.checked) toggle.click(); // Use existing GeoPortal layer handler.
    this.setStatus("Permintaan paparan lot dihantar. Semak status Lot Kadaster di panel kiri.");
  }

  async analyze() {
    const polygon = this.getPolygon?.();
    const integration = this.config;
    const requested = [
      ...(this.capabilities.cadastral ? ["cadastral"] : []),
      ...(this.capabilities.landUse ? ["landUse"] : [])
    ];
    if (!polygon || !requested.length || !integration) {
      this.setStatus("Poligon atau API lot/guna tanah belum tersedia.");
      return;
    }
    if (!["Polygon", "MultiPolygon"].includes(polygon.geometry?.type)) {
      this.setStatus("Poligon analisis bukan geometri yang sah.");
      return;
    }

    const base = new URL(integration.analysisApi.endpoint, window.location.href);
    const safeTransport = base.protocol === "https:" ||
      (base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname));
    if (!safeTransport) {
      this.setStatus("API mesti menggunakan HTTPS atau localhost untuk ujian.");
      return;
    }

    const request = JSON.stringify({
      version: "1.0",
      spatialReference: "EPSG:4326",
      source: "SUO-P3",
      requested,
      geometry: polygon.geometry
    });
    const maxBytes = Number(integration.analysisApi.maxGeometryBytes) || 250000;
    if (new TextEncoder().encode(request).length > maxBytes) {
      this.setStatus("Poligon terlalu besar untuk API. Jana semula geometri ringkas.");
      return;
    }

    const serial = ++this.sequence;
    this.analyzeButton.disabled = true;
    this.setStatus("Menjalankan overlay spatial pada API SUO...");
    try {
      const response = await fetch(base.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: request,
        credentials: "omit",
        cache: "no-store"
      });
      if (!response.ok) throw new Error("API spatial HTTP " + response.status);
      const summary = validatePlanningSpatialSummary(await response.json(), requested);
      if (serial !== this.sequence) return;
      this.renderResult(summary, integration);
      this.setStatus("Analisis lot/guna tanah diterima daripada API sumber. Sila semak tahun data.");
    } catch (error) {
      if (serial !== this.sequence) return;
      console.error("SUO Planning Spatial API:", error);
      if (this.result) this.result.replaceChildren();
      this.setStatus("API spatial tidak dapat memberikan keputusan yang sah. Tiada angka dipaparkan.");
    } finally {
      if (serial === this.sequence && this.analyzeButton) {
        this.analyzeButton.disabled = false;
      }
    }
  }

  renderResult(summary, integration) {
    if (!this.result) return;
    this.result.replaceChildren();
    if (summary.cadastral) {
      this.result.append(heading("Lot Kadaster · " + summary.cadastral.sourceYear));
      this.result.append(valueLine("Lot berpotongan (UPI unik)",
        summary.cadastral.parcelCount.toLocaleString("ms-MY")));
      this.result.append(valueLine("Lot bersilang separa",
        summary.cadastral.partialParcelCount.toLocaleString("ms-MY")));
      this.result.append(valueLine("Keluasan pertindihan",
        summary.cadastral.intersectedAreaHa.toLocaleString("ms-MY",
          { maximumFractionDigits: 2 }) + " ha"));
    }
    if (summary.landUse) {
      this.result.append(heading("Guna Tanah · " + summary.landUse.sourceYear));
      this.result.append(valueLine("Keluasan terklasifikasi",
        summary.landUse.totalAreaHa.toLocaleString("ms-MY",
          { maximumFractionDigits: 2 }) + " ha"));
      for (const category of summary.landUse.categories.slice(0, 12)) {
        this.result.append(valueLine(category.label,
          category.areaHa.toLocaleString("ms-MY", { maximumFractionDigits: 2 }) + " ha"));
      }
    }
    const expectedYears = [];
    if (summary.cadastral && summary.cadastral.sourceYear !== Number(integration.cadastral.year)) {
      expectedYears.push("Lot: tahun API tidak sama dengan konfigurasi.");
    }
    if (summary.landUse && summary.landUse.sourceYear !== Number(integration.landUse.year)) {
      expectedYears.push("Guna tanah: tahun API tidak sama dengan konfigurasi.");
    }
    const note = document.createElement("p");
    note.className = "planning-spatial-source-note";
    note.textContent = "Kiraan daripada API spatial SUO menggunakan pertindihan geometri; " +
      "bukan jumlah lot yang kelihatan pada skrin. " +
      (expectedYears.length ? "AMARAN: " + expectedYears.join(" ") :
        "Tahun dataset disahkan daripada metadata API.");
    this.result.append(note);
  }
}

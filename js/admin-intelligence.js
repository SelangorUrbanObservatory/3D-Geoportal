import { DATA_URLS } from "./config.js";
import { loadGeoJSON, pointInFeature } from "./spatial-query.js";
import { addLayerCompat } from "./utils.js";

const ADMIN_SOURCE = "suo-admin-selection-source";
const ADMIN_FILL = "suo-admin-selection-fill";
const ADMIN_OUTLINE = "suo-admin-selection-outline";

const PBT_ORDER = ["MBSA", "MBPJ", "MBSJ", "MBDK", "MPS", "MPAJ", "MPKJ", "MPSp", "MPKL", "MPKS", "MPHS", "MDSB"];
const DISTRICT_ORDER = ["Petaling", "Klang", "Gombak", "Hulu Langat", "Sepang", "Kuala Langat", "Kuala Selangor", "Hulu Selangor", "Sabak Bernam"];

// Rujukan keluasan PBT yang dibekalkan untuk SUO (JUPEM 2024), dalam hektar.
// Tidak diambil daripada web_area poligon kerana keluasan dan vintaj sumber berbeza.
export const PBT_REFERENCE = Object.freeze({
  "Majlis Bandaraya Shah Alam": { code: "MBSA", areaHa: 30144.60 },
  "Majlis Bandaraya Petaling Jaya": { code: "MBPJ", areaHa: 9810.73 },
  "Majlis Bandaraya Subang Jaya": { code: "MBSJ", areaHa: 16283.80 },
  "Majlis Bandaraya Diraja Klang": { code: "MBDK", areaHa: 74762.02 },
  "Majlis Perbandaran Selayang": { code: "MPS", areaHa: 52385.78 },
  "Majlis Perbandaran Ampang Jaya": { code: "MPAJ", areaHa: 13905.78 },
  "Majlis Perbandaran Kajang": { code: "MPKJ", areaHa: 80601.53 },
  "Majlis Perbandaran Sepang": { code: "MPSp", areaHa: 56344.59 },
  "Majlis Perbandaran Kuala Langat": { code: "MPKL", areaHa: 89998.13 },
  "Majlis Perbandaran Kuala Selangor": { code: "MPKS", areaHa: 126487.69 },
  "Majlis Perbandaran Hulu Selangor": { code: "MPHS", areaHa: 175185.57 },
  "Majlis Daerah Sabak Bernam": { code: "MDSB", areaHa: 107810.51 }
});

const SOURCES = [
  { key: "schools", url: DATA_URLS.schools, title: "Pendidikan", property: "web_level",
    types: ["Sekolah Rendah", "Sekolah Menengah", "Sekolah Agama"] },
  { key: "health", url: DATA_URLS.health, title: "Kesihatan", property: "web_category",
    types: ["Hospital", "Klinik Kesihatan", "Klinik Ibu dan Anak", "Klinik Desa"] },
  { key: "safety", url: DATA_URLS.police, title: "Keselamatan", property: "AGENSI",
    types: ["PDRM", "JBPM", "APM"] }
];

const numberMY = (n, decimal = 0) => Number(n).toLocaleString("ms-MY", {
  minimumFractionDigits: decimal, maximumFractionDigits: decimal
});
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
);

function boundsOf(feature) {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  function walk(node) {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && Number.isFinite(node[0]) && Number.isFinite(node[1])) {
      const [x, y] = node;
      bounds[0] = Math.min(bounds[0], x);
      bounds[1] = Math.min(bounds[1], y);
      bounds[2] = Math.max(bounds[2], x);
      bounds[3] = Math.max(bounds[3], y);
    } else node.forEach(walk);
  }
  walk(feature.geometry?.coordinates);
  return bounds.every(Number.isFinite) ? bounds : null;
}

function countPointsInArea(features, boundary, bbox) {
  if (!bbox) return [];
  const [minX, minY, maxX, maxY] = bbox;
  return features.filter(f => {
    if (f.geometry?.type !== "Point") return false;
    const point = f.geometry.coordinates;
    if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return false;
    if (point[0] < minX || point[0] > maxX || point[1] < minY || point[1] > maxY) return false;
    return pointInFeature(point, boundary);
  });
}

function selectedFeatureCollection(feature = null) {
  return { type: "FeatureCollection", features: feature ? [feature] : [] };
}

export class AdminIntelligence {
  constructor({ map, onAreaSelected } = {}) {
    this.map = map;
    this.onAreaSelected = onAreaSelected;
    this.root = document.getElementById("adminIntelligencePanel");
    this.pbtBtn = document.getElementById("adminTypePbt");
    this.districtBtn = document.getElementById("adminTypeDistrict");
    this.selectEl = document.getElementById("adminAreaSelect");
    this.status = document.getElementById("adminIntelligenceStatus");
    this.details = document.getElementById("adminIntelligenceDetails");
    this.clearBtn = document.getElementById("adminClearSelection");
    this.type = "pbt";
    this.boundaries = { pbt: [], district: [] };
    this.errors = { pbt: null, district: null };
    this.selected = null;
    this.serial = 0;

    if (!this.root || !this.map || !this.selectEl || !this.status || !this.details) return;

    this.pbtBtn?.addEventListener("click", () => this.setType("pbt"));
    this.districtBtn?.addEventListener("click", () => this.setType("district"));
    this.selectEl.addEventListener("change", () => {
      if (this.selectEl.value) this.select(this.type, this.selectEl.value);
      else this.clear();
    });
    this.clearBtn?.addEventListener("click", () => this.clear());
    this.map.on("style.load", () => this.drawSelection());
    this.loadBoundaries();
  }

  async loadBoundaries() {
    const results = await Promise.allSettled([
      loadGeoJSON("pbt", DATA_URLS.pbt),
      loadGeoJSON("districts", DATA_URLS.districts)
    ]);
    for (let i = 0; i < results.length; i++) {
      const type = i === 0 ? "pbt" : "district";
      const result = results[i];
      if (result.status === "fulfilled") {
        this.boundaries[type] = result.value.features || [];
      } else {
        this.errors[type] = result.reason;
        console.warn("P2: Sempadan", type, "gagal dimuatkan", result.reason);
      }
    }
    this.populate();
    if (!this.selected) this.status.textContent = "Pilih PBT atau daerah untuk melihat profil spatial.";
  }

  setType(type) {
    if (!["pbt", "district"].includes(type)) return;
    this.type = type;
    this.clear({ keepType: true });
    this.populate();
  }

  populate() {
    const isPbt = this.type === "pbt";
    this.pbtBtn?.setAttribute("aria-pressed", String(isPbt));
    this.districtBtn?.setAttribute("aria-pressed", String(!isPbt));
    this.pbtBtn?.classList.toggle("active", isPbt);
    this.districtBtn?.classList.toggle("active", !isPbt);

    const list = [...this.boundaries[this.type]];
    const pbtIndex = name => PBT_ORDER.indexOf(PBT_REFERENCE[name]?.code);
    const districtIndex = name => DISTRICT_ORDER.indexOf(name);
    const rank = name => {
      const id = isPbt ? pbtIndex(name) : districtIndex(name);
      return id === -1 ? 999 : id;
    };
    list.sort((a, b) => rank(a.properties?.web_name) - rank(b.properties?.web_name));
    this.selectEl.replaceChildren(new Option(
      isPbt ? "Pilih PBT (12 kawasan)" : "Pilih Daerah (9 kawasan)", ""
    ));
    for (const f of list) {
      const name = String(f.properties?.web_name || "").trim();
      if (!name) continue;
      const code = isPbt ? PBT_REFERENCE[name]?.code : null;
      this.selectEl.add(new Option(code ? code + " — " + name : name, name));
    }
    this.selectEl.disabled = !list.length;
    if (this.selected?.type === this.type) this.selectEl.value = this.selected.name;
    if (!list.length && this.errors[this.type]) {
      this.status.textContent = "Data sempadan tidak dapat dimuatkan. Cuba muat semula portal.";
    }
  }

  async selectFromMap(renderedFeature) {
    const layer = renderedFeature?.layer?.id;
    const type = layer === "pbt-fill" ? "pbt" : layer === "district-fill" ? "district" : null;
    const name = renderedFeature?.properties?.web_name;
    if (!type || !name) return false;
    if (!this.boundaries[type].length) {
      await this.loadBoundaries();
    }
    return this.select(type, name, { focus: false });
  }

  async select(type, name, { focus = true } = {}) {
    if (!["pbt", "district"].includes(type)) return false;
    const feature = this.boundaries[type].find(f =>
      String(f.properties?.web_name || "").trim().toLowerCase() === String(name).trim().toLowerCase()
    );
    if (!feature) {
      this.status.textContent = "Kawasan tidak ditemui dalam dataset sempadan portal.";
      return false;
    }
    const id = ++this.serial;
    this.type = type;
    this.selected = { type, name: String(feature.properties.web_name), feature };
    this.populate();
    this.status.textContent = "Mengira taburan kemudahan dalam sempadan kawasan…";
    this.details.hidden = false;
    this.details.innerHTML = '<p class="admin-intel-loading">Mengira statistik geospatial…</p>';
    try { this.drawSelection(); } catch (e) { console.warn("Highlight P2:", e); }
    this.onAreaSelected?.();
    if (focus) {
      requestAnimationFrame(() => {
        if (id !== this.serial) return;
        const bbox = boundsOf(feature);
        if (bbox) this.map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], {
          padding: 45, maxZoom: 11, duration: 850, bearing: 0
        });
      });
    }

    const bbox = boundsOf(feature);
    const groups = await Promise.all(SOURCES.map(async source => {
      try {
        const geo = await loadGeoJSON(source.key === "safety" ? "police" : source.key, source.url);
        const inside = countPointsInArea(geo.features || [], feature, bbox);
        const breakdown = source.types.map(label => ({
          label, total: inside.filter(f =>
            String(f.properties?.[source.property] || "").trim().toLowerCase() === label.toLowerCase()
          ).length
        }));
        return { ...source, total: inside.length, breakdown, failed: false };
      } catch (error) {
        console.warn("P2 dataset gagal:", source.key, error);
        return { ...source, total: null, breakdown: [], failed: true };
      }
    }));
    if (id !== this.serial) return true;
    this.renderProfile(feature, type, groups);
    return true;
  }

  renderProfile(feature, type, groups) {
    const name = feature.properties?.web_name || "Kawasan";
    const info = type === "pbt" ? PBT_REFERENCE[name] : null;
    const sourceArea = Number(feature.properties?.web_area);
    const area = type === "pbt" ? info?.areaHa : (Number.isFinite(sourceArea) && sourceArea > 0 ? sourceArea : null);
    const areaSource = type === "pbt" ? "JUPEM 2024" : "Dataset Sempadan Daerah";
    const total = groups.every(x => !x.failed) ? groups.reduce((n, g) => n + g.total, 0) : null;
    const missing = groups.some(x => x.failed);

    this.status.textContent = "Profil kawasan berdasarkan spatial join titik dalam sempadan GIS.";
    this.details.innerHTML = [
      '<div class="admin-intel-selected">',
      '<span class="admin-intel-type">' + esc(type === "pbt" ? (info?.code || "PBT") : "DAERAH") + '</span>',
      '<h3>' + esc(type === "district" ? "Daerah " + name : name) + '</h3>',
      type === "pbt" ? '<small>' + esc(feature.properties?.web_type || "") + '</small>' : '',
      '</div>',
      '<div class="admin-intel-stats">',
      '<div class="admin-intel-stat"><span>Keluasan kawasan</span><strong>' + (Number.isFinite(area) ? numberMY(area, 2) + ' ha' : '—') + '</strong><small>' + esc(areaSource) + '</small></div>',
      '<div class="admin-intel-stat"><span>Jumlah kemudahan direkod</span><strong>' + (total === null ? '—' : numberMY(total)) + '</strong><small>' + (missing ? 'Sebahagian data tidak tersedia' : 'Pendidikan · Kesihatan · Keselamatan') + '</small></div>',
      '</div>',
      '<div class="admin-intel-groups">',
      ...groups.map(g =>
        '<div class="admin-intel-group">' +
          '<div class="admin-intel-group-head"><strong>' + esc(g.title) + '</strong><b>' + (g.failed ? '—' : numberMY(g.total)) + '</b></div>' +
          (g.failed ? '<p class="admin-intel-missing">Data tidak tersedia</p>' :
            '<div class="admin-intel-breakdown">' + g.breakdown.map(row =>
              '<div><span>' + esc(row.label) + '</span><strong>' + numberMY(row.total) + '</strong></div>'
            ).join("") + '</div>') +
        '</div>'
      ),
      '</div>',
      '<p class="admin-intel-note">Bilangan dikira daripada lokasi titik dalam poligon sempadan GIS, bukan statistik agregat rasmi agensi. Set data boleh mengandungi koordinat anggaran atau rekod yang memerlukan semakan. ' +
      (type === "pbt" ? 'Keluasan rujukan JUPEM 2024 mungkin berbeza daripada keluasan geometri poligon yang digunakan bagi analisis.' : 'Keluasan daerah mengikut atribut data sempadan GIS portal.') +
      '</p>'
    ].join("");
  }

  drawSelection() {
    if (!this.map?.getStyle()?.layers) return;
    if (!this.map.getSource(ADMIN_SOURCE)) {
      this.map.addSource(ADMIN_SOURCE, { type: "geojson", data: selectedFeatureCollection() });
    }
    if (!this.map.getLayer(ADMIN_FILL)) {
      addLayerCompat(this.map, {
        id: ADMIN_FILL, type: "fill", source: ADMIN_SOURCE, slot: "top",
        paint: { "fill-color": "#F4B82E", "fill-opacity": 0.14 }
      });
    }
    if (!this.map.getLayer(ADMIN_OUTLINE)) {
      addLayerCompat(this.map, {
        id: ADMIN_OUTLINE, type: "line", source: ADMIN_SOURCE, slot: "top",
        paint: { "line-color": "#B3383C", "line-width": 3.5, "line-opacity": 0.96 }
      });
    }
    this.map.getSource(ADMIN_SOURCE).setData(selectedFeatureCollection(this.selected?.feature));
  }

  clear({ keepType = false } = {}) {
    ++this.serial;
    this.selected = null;
    if (!keepType) this.type = "pbt";
    this.details.hidden = true;
    this.details.replaceChildren();
    this.status.textContent = "Pilih PBT atau daerah untuk melihat profil spatial.";
    if (this.map.getSource(ADMIN_SOURCE)) {
      this.map.getSource(ADMIN_SOURCE).setData(selectedFeatureCollection());
    }
    this.populate();
  }
}

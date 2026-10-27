import { parseIntent } from "./intent-parser.js";
import {
  inferAttributeQuery,
  executeAttributeQuery,
  formatAttributeFilters,
  attributeQueryExplanation
} from "./attribute-query.js";
import {
  queryHealth,
  querySchools,
  queryPolice,
  getPbtFeatures,
  findPbtByName,
  getDistrictFeatures,
  findDistrictByName,
  getCities
} from "./spatial-query.js";
import {
  highlightFeatures,
  zoomToFeatures,
  clearHighlight,
  showResultPopup
} from "./map-actions.js";

function pluralLabel(category, count) {
  const label = category || "kemudahan kesihatan";
  return `${count} ${label}`;
}

function formatArea(value) {
  const area = Number(value);
  if (!Number.isFinite(area)) return "-";
  return `${area.toLocaleString("ms-MY", {
    maximumFractionDigits: 2
  })} hektar`;
}

function createLoadingBubble(addBubble) {
  const bubble = addBubble("Sedang menyemak data spatial...", "bot", {
    loading: true
  });
  return bubble;
}

function removeBubble(bubble) {
  bubble?.remove();
}

export class SpatialAssistant {
  constructor({
    map,
    addBubble,
    actions,
    cityLookup
  }) {
    this.map = map;
    this.addBubble = addBubble;
    this.actions = actions;
    this.cityLookup = cityLookup;
  }

  async handle(message) {
    const query = parseIntent(message);
    const attributeQuery = inferAttributeQuery(query);

    if (
      attributeQuery.supported &&
      ["count", "show", "unknown"].includes(query.intent) &&
      (
        attributeQuery.hasFilters ||
        ["schools", "health", "police", "cities"].includes(query.layer)
      )
    ) {
      return this.handleAttributeQuery(query, attributeQuery);
    }

    if (query.intent === "count") {
      return this.handleCount(query);
    }

    if (query.intent === "area") {
      return this.handleArea(query);
    }

    if (query.intent === "compareArea") {
      return this.handleAreaComparison(query);
    }

    if (query.intent === "show") {
      return this.handleShow(query);
    }

    if (query.intent === "open" || query.intent === "close") {
      return this.handleLayerCommand(query);
    }

    if (query.intent === "view2d") {
      this.actions.setViewMode("2d");
      return "Paparan 2D telah diaktifkan.";
    }

    if (query.intent === "view3d") {
      this.actions.setViewMode("3d");
      return "Paparan 3D telah diaktifkan.";
    }

    if (query.intent === "split") {
      await this.actions.openSplit();
      return "Split screen telah dibuka.";
    }

    if (query.intent === "focusMap") {
      this.actions.focusMap();
      return "Focus Map telah diaktifkan.";
    }

    if (query.intent === "openLeftPanel") {
      this.actions.setLeftPanel(true);
      return "Kolum kiri telah dibuka.";
    }

    if (query.intent === "closeLeftPanel") {
      this.actions.setLeftPanel(false);
      return "Kolum kiri telah disimpan.";
    }

    if (query.intent === "openRightPanel") {
      this.actions.setRightPanel(true);
      return "Kolum kanan telah dibuka.";
    }

    if (query.intent === "closeRightPanel") {
      this.actions.setRightPanel(false);
      return "Kolum kanan telah disimpan.";
    }

    if (query.intent === "navigate") {
      return this.handleNavigation(query);
    }

    // Questions mentioning a data subject should be treated as queries
    // rather than immediately navigating to a city.
    if (query.layer === "health") {
      return this.handleCount({ ...query, intent: "count" });
    }


    if (query.layer === "schools") {
      return this.handleCount({ ...query, intent: "count" });
    }

    if (query.layer === "police") {
      return this.handleCount({ ...query, intent: "count" });
    }

    if (query.location?.type === "pbt") {
      return this.handleArea({ ...query, intent: "area", layer: "pbt" });
    }

    if (query.location?.type === "district") {
      return this.handleArea({
        ...query,
        intent: "area",
        layer: "districts"
      });
    }

    // Only use city navigation as a final fallback.
    const cityMatch = [...this.cityLookup.entries()]
      .find(([name]) => query.text.includes(name));

    if (cityMatch) {
      this.actions.flyToCity(cityMatch[1]);
      return `Peta dizum ke ${cityMatch[1].name}.`;
    }

    return [
      "Saya belum memahami arahan itu.",
      "Cuba: “Berapa hospital di daerah Klang?”,",
      "“Berapa IPD di Selangor?”, “Keluasan MBSA”,",
      "“Tunjukkan semua hospital”, atau “Buka Live Traffic”."
    ].join(" ");
  }

  async handleAttributeQuery(query, attributeQuery) {
    const features = await executeAttributeQuery(attributeQuery);

    highlightFeatures(this.map, features);
    zoomToFeatures(this.map, features, {
      maxZoom: features.length === 1 ? 16 : 14.5
    });

    const filterSummary = formatAttributeFilters(
      attributeQuery.filters
    );

    const subject = attributeQuery.layerLabel;
    const actionText =
      query.intent === "show" || query.schoolSearchTerm
        ? "ditemui"
        : "terdapat";

    if (!features.length) {
      return `Tiada ${subject} ditemui bagi penapis: ${filterSummary}.`;
    }

    const explanation = attributeQueryExplanation(attributeQuery);

    return [
      `${actionText === "terdapat" ? "Terdapat" : "Ditemui"} ${features.length} ${subject}.`,
      `Penapis: ${explanation.filters}.`,
      `Kaedah: ${explanation.method}.`,
      "Hasil telah di-highlight pada peta."
    ].join(" ");
  }

  async handleCount(query) {
    if (query.layer === "health") {
      const district = query.location?.type === "district"
        ? query.location.name
        : null;

      const pbtName = query.location?.type === "pbt"
        ? query.location.name
        : null;

      const sector = query.asksGovernment
        ? "Kerajaan"
        : query.asksPrivate
          ? "Swasta"
          : null;

      const features = await queryHealth({
        category: query.category,
        district,
        pbtName,
        sector
      });

      highlightFeatures(this.map, features);
      zoomToFeatures(this.map, features);

      const place = district
        ? `di Daerah ${district}`
        : pbtName
          ? `dalam ${query.location.alias || pbtName}`
          : "di Negeri Selangor";

      const sectorText = sector ? ` ${sector.toLowerCase()}` : "";

      return features.length
        ? `Terdapat ${pluralLabel(query.category, features.length)}${sectorText} ${place}. Hasil telah di-highlight pada peta.`
        : `Tiada ${query.category || "kemudahan kesihatan"}${sectorText} ditemui ${place}.`;
    }

    if (query.layer === "police") {
      const district = query.location?.type === "district"
        ? query.location.name
        : null;

      const features = await queryPolice({
        hierarchy: query.category,
        district
      });

      highlightFeatures(this.map, features);
      zoomToFeatures(this.map, features);

      const subject = query.category || "lokasi IPK/IPD";
      const place = district
        ? `di Daerah ${district}`
        : "di Negeri Selangor";

      return `Terdapat ${features.length} ${subject} ${place}. Hasil telah di-highlight pada peta.`;
    }

    if (query.layer === "pbt") {
      const features = await getPbtFeatures();
      highlightFeatures(this.map, features);
      zoomToFeatures(this.map, features, { maxZoom: 9.5 });
      return `Terdapat ${features.length} PBT dalam layer Sempadan PBT Negeri Selangor 2024.`;
    }

    if (query.layer === "districts") {
      const features = await getDistrictFeatures();
      highlightFeatures(this.map, features);
      zoomToFeatures(this.map, features, { maxZoom: 9.5 });
      return `Terdapat ${features.length} daerah dalam layer Sempadan Daerah Selangor.`;
    }

    if (query.layer === "cities") {
      const features = await getCities();
      highlightFeatures(this.map, features);
      zoomToFeatures(this.map, features, { maxZoom: 9.5 });
      return `Terdapat ${features.length} bandar dalam layer Hierarki Bandar DPN3 Selangor.`;
    }

    return "Sila nyatakan layer yang hendak dikira, contohnya hospital, IPD, PBT atau bandar DPN3.";
  }

  async handleArea(query) {
    if (query.location?.type === "district") {
      const feature = await findDistrictByName(query.location.name);

      if (!feature) {
        return `Daerah ${query.location.name} tidak ditemui.`;
      }

      highlightFeatures(this.map, [feature]);
      zoomToFeatures(this.map, [feature], { maxZoom: 10.5 });

      const area = formatArea(feature.properties?.web_area);

      showResultPopup(
        this.map,
        feature,
        `<strong>Daerah ${feature.properties?.web_name}</strong><br>
         Kod Daerah: ${feature.properties?.web_code || "-"}<br>
         Keluasan: ${area}`
      );

      return `Keluasan Daerah ${feature.properties?.web_name} ialah ${area} berdasarkan layer Sempadan Daerah Selangor.`;
    }

    if (query.location?.type !== "pbt") {
      return "Sila nyatakan PBT atau daerah, contohnya “Keluasan MBSA” atau “Keluasan Daerah Klang”.";
    }

    const feature = await findPbtByName(query.location.name);

    if (!feature) {
      return `PBT ${query.location.alias || query.location.name} tidak ditemui.`;
    }

    highlightFeatures(this.map, [feature]);
    zoomToFeatures(this.map, [feature], { maxZoom: 11.5 });

    const area = formatArea(feature.properties?.web_area);
    const label = query.location.alias || feature.properties?.web_name;

    showResultPopup(
      this.map,
      feature,
      `<strong>${feature.properties?.web_name}</strong><br>
       Kategori: ${feature.properties?.web_type || "-"}<br>
       Keluasan: ${area}`
    );

    return `Keluasan ${label} ialah ${area} berdasarkan atribut layer Sempadan PBT Selangor 2024.`;
  }

  async handleAreaComparison(query) {
    const districtLocation = query.comparisonLocations?.district;
    const pbtLocation = query.comparisonLocations?.pbt;

    if (!districtLocation || !pbtLocation) {
      return [
        "Sila nyatakan satu daerah dan satu PBT untuk dibandingkan.",
        "Contoh: “Beza luas Daerah Sabak Bernam dan Majlis Daerah Sabak Bernam”."
      ].join(" ");
    }

    const [districtFeature, pbtFeature] = await Promise.all([
      findDistrictByName(districtLocation.name),
      findPbtByName(pbtLocation.name)
    ]);

    if (!districtFeature) {
      return `Daerah ${districtLocation.name} tidak ditemui.`;
    }

    if (!pbtFeature) {
      return `PBT ${pbtLocation.alias || pbtLocation.name} tidak ditemui.`;
    }

    const districtArea = Number(
      districtFeature.properties?.web_area
    );

    const pbtArea = Number(
      pbtFeature.properties?.web_area
    );

    if (
      !Number.isFinite(districtArea) ||
      !Number.isFinite(pbtArea)
    ) {
      return "Atribut keluasan bagi salah satu layer tidak sah.";
    }

    const difference = Math.abs(districtArea - pbtArea);
    const largerFeature =
      districtArea >= pbtArea
        ? `Daerah ${districtFeature.properties?.web_name}`
        : pbtFeature.properties?.web_name;

    const largerArea = Math.max(districtArea, pbtArea);
    const smallerArea = Math.min(districtArea, pbtArea);
    const percentageDifference =
      smallerArea > 0
        ? (difference / smallerArea) * 100
        : 0;

    highlightFeatures(
      this.map,
      [districtFeature, pbtFeature]
    );

    zoomToFeatures(
      this.map,
      [districtFeature, pbtFeature],
      { maxZoom: 10.5 }
    );

    const districtLabel =
      `Daerah ${districtFeature.properties?.web_name}`;

    const pbtLabel =
      pbtLocation.alias ||
      pbtFeature.properties?.web_name;

    return [
      `${districtLabel}: ${formatArea(districtArea)}.`,
      `${pbtLabel}: ${formatArea(pbtArea)}.`,
      `Perbezaannya ialah ${formatArea(difference)}.`,
      `${largerFeature} lebih besar sebanyak`,
      `${percentageDifference.toLocaleString("ms-MY", {
        maximumFractionDigits: 2
      })}% berbanding kawasan yang lebih kecil.`
    ].join(" ");
  }

  async handleShow(query) {
    if (query.layer === "health") {
      return this.handleCount({ ...query, intent: "count" });
    }

    if (query.layer === "schools") {
      return this.handleCount({ ...query, intent: "count" });
    }

    if (query.layer === "police") {
      return this.handleCount({ ...query, intent: "count" });
    }

    if (query.layer === "pbt") {
      if (query.location?.type === "pbt") {
        return this.handleArea({ ...query, intent: "area" });
      }

      const features = await getPbtFeatures();
      highlightFeatures(this.map, features);
      zoomToFeatures(this.map, features, { maxZoom: 9.5 });
      return "Semua sempadan PBT telah di-highlight.";
    }

    if (query.layer === "districts") {
      if (query.location?.type === "district") {
        return this.handleArea({ ...query, intent: "area" });
      }

      const features = await getDistrictFeatures();
      highlightFeatures(this.map, features);
      zoomToFeatures(this.map, features, { maxZoom: 9.5 });
      return "Semua sempadan daerah telah di-highlight.";
    }

    if (query.layer === "cities") {
      const features = await getCities();
      highlightFeatures(this.map, features);
      zoomToFeatures(this.map, features, { maxZoom: 9.5 });
      return "Semua bandar DPN3 telah di-highlight.";
    }

    return "Sila nyatakan data yang hendak dipaparkan.";
  }

  handleLayerCommand(query) {
    const layer = query.layerCommand || query.layer;

    if (!layer) {
      return "Sila nyatakan layer yang hendak dibuka atau ditutup.";
    }

    const visible = query.intent === "open";
    const success = this.actions.setLayerVisibility(layer, visible);

    if (!success) {
      return "Layer tersebut belum disokong oleh arahan Ask Mr. TPr. SUO.";
    }

    const action = visible ? "dibuka" : "ditutup";
    return `Layer ${this.actions.getLayerLabel(layer)} telah ${action}.`;
  }

  async handleNavigation(query) {
    if (query.location?.type === "pbt") {
      return this.handleArea({ ...query, intent: "area", layer: "pbt" });
    }

    if (query.location?.type === "district") {
      const feature = await findDistrictByName(query.location.name);

      if (!feature) {
        return `Daerah ${query.location.name} tidak ditemui.`;
      }

      highlightFeatures(this.map, [feature]);
      zoomToFeatures(this.map, [feature], { maxZoom: 10.5 });
      return `Peta dizum ke Daerah ${query.location.name}.`;
    }

    const cityMatch = [...this.cityLookup.entries()]
      .find(([name]) => query.text.includes(name));

    if (!cityMatch) {
      return "Lokasi navigasi tidak ditemui dalam senarai bandar DPN3.";
    }

    clearHighlight(this.map);
    this.actions.flyToCity(cityMatch[1]);
    return `Peta dizum ke ${cityMatch[1].name}.`;
  }

  bindForm(form, input) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const message = input.value.trim();
      if (!message) return;

      this.addBubble(message, "user");
      input.value = "";

      const loadingBubble = createLoadingBubble(this.addBubble);

      try {
        const response = await this.handle(message);
        removeBubble(loadingBubble);
        this.addBubble(response, "bot");
      } catch (error) {
        removeBubble(loadingBubble);
        this.addBubble(
          "Maaf, pertanyaan itu tidak dapat diproses. Semak data atau cuba ayat yang lebih khusus.",
          "bot"
        );
        console.error("Spatial Assistant error:", error);
      }
    });
  }
}

import { DATA_URLS } from "./config.js";

export async function initUrbanExplorer(onSelect) {
  const explorer = document.getElementById("urbanExplorer");
  const status = document.getElementById("urbanPolicyStatus");
  const count = document.getElementById("urbanLocationCount");

  const response = await fetch(DATA_URLS.urbanConfig, { cache: "no-store" });
  if (!response.ok) throw new Error("Gagal memuatkan hierarki bandar");

  const config = await response.json();
  const cities = [];
  explorer.innerHTML = "";

  for (const group of config.groups || []) {
    const section = document.createElement("section");
    section.className = "urban-group";
    section.innerHTML = `<h3>${group.name}</h3>`;

    const grid = document.createElement("div");
    grid.className = "quick-grid";

    for (const city of group.cities || []) {
      const item = { ...city, hierarchy: group.name };
      cities.push(item);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = city.name;
      button.addEventListener("click", () => onSelect(item));
      grid.appendChild(button);
    }

    section.appendChild(grid);
    explorer.appendChild(section);
  }

  count.textContent = String(cities.length);
  status.className = "policy-status ready";
  status.textContent = `${cities.length} bandar DPN3 (Tier 1–3) dimuatkan. Senarai semakan awal; pengesahan akhir dokumen DPN3 diperlukan.`;
  return cities;
}

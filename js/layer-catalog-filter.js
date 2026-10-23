/* SUO v9: Layer catalogue quick filter. Presentation-only; no Mapbox state changes. */
(() => {
  const input = document.getElementById("layerFilterInput");
  const list = document.querySelector(".enterprise-layer-list");
  const status = document.getElementById("layerFilterStatus");
  const clear = document.getElementById("layerFilterClear");
  if (!input || !list || !status || !clear) return;
  const categories = [...list.querySelectorAll(":scope > .layer-category")];
  const normalise = value => (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ms").trim();
  function filter() {
    const query = normalise(input.value);
    let visible = 0;
    for (const category of categories) {
      const match = !query || normalise(category.textContent).includes(query);
      category.hidden = !match;
      if (match) visible++;
    }
    status.textContent = query
      ? visible ? `${visible} daripada ${categories.length} kategori ditemui` : "Tiada kategori sepadan"
      : `${categories.length} kategori layer tersedia`;
    clear.hidden = !input.value;
  }
  input.addEventListener("input", filter);
  clear.addEventListener("click", () => { input.value = ""; filter(); input.focus(); });
  input.addEventListener("keydown", event => {
    if (event.key === "Escape" && input.value) { input.value = ""; filter(); }
  });
  filter();
})();

export const RIGHT_PANEL_COMPONENTS = [
  "urban-intelligence",
  "selangor-summary-heading",
  "selangor-summary",
  "pbt-district-intelligence",
  "network-intelligence",
  "flood-intelligence",
  "weather-intelligence",
  "executive-landuse",
  "urban-planning-ai",
  "feature-info"
];

export function applyRightPanelRegistry(container) {
  if (!container) return;

  const componentMap = new Map(
    [...container.querySelectorAll("[data-right-component]")]
      .map((element) => [
        element.dataset.rightComponent,
        element
      ])
  );

  RIGHT_PANEL_COMPONENTS.forEach((componentId) => {
    const component = componentMap.get(componentId);

    if (component) {
      container.appendChild(component);
    }
  });
}

export function validateRightPanelRegistry(container) {
  if (!container) {
    return {
      valid: false,
      missing: RIGHT_PANEL_COMPONENTS
    };
  }

  const available = new Set(
    [...container.querySelectorAll("[data-right-component]")]
      .map((element) => element.dataset.rightComponent)
  );

  const missing = RIGHT_PANEL_COMPONENTS.filter(
    (componentId) => !available.has(componentId)
  );

  return {
    valid: missing.length === 0,
    missing
  };
}

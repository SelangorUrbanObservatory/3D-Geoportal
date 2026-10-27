import {
  applyRightPanelRegistry,
  validateRightPanelRegistry
} from "../component-registry.js";
import {
  ExecutiveLanduseIntelligence
} from "../executive-landuse.js";
import {
  WeatherIntelligence
} from "../weather.js";
import {
  FloodIntelligence
} from "../flood.js?v=9.6.5";

export function initializeIntelligenceHub(map) {
  const result = {
    weather: null,
    flood: null,
    executiveLanduse: null
  };

  const rightSidebar =
    document.getElementById("rightSidebar");

  try {
    applyRightPanelRegistry(rightSidebar);

    const status =
      validateRightPanelRegistry(rightSidebar);

    if (!status.valid) {
      console.warn(
        "Right Panel Component Registry tidak lengkap:",
        status.missing
      );
    }
  } catch (error) {
    console.error(
      "Component Registry gagal dimulakan:",
      error
    );
  }

  try {
    result.executiveLanduse =
      new ExecutiveLanduseIntelligence();
  } catch (error) {
    console.error(
      "Executive Landuse gagal dimulakan:",
      error
    );
  }

  try {
    result.weather =
      new WeatherIntelligence(map);
  } catch (error) {
    console.error(
      "Weather Intelligence gagal dimulakan:",
      error
    );
  }

  try {
    result.flood =
      new FloodIntelligence(map);
  } catch (error) {
    console.error(
      "Flood Intelligence gagal dimulakan:",
      error
    );
  }

  return result;
}
